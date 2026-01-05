// ============================================
// Gradient Entity - Perceptually Uniform Gradients
// Solves the "muddy middle" problem in color transitions
// ============================================

import OKLCH from '../value-objects/OKLCH';
import HCT from '../value-objects/HCT';
import APCAContrast from '../value-objects/APCAContrast';

/**
 * Gradient color stop
 */
export interface ColorStop {
  readonly color: OKLCH;
  readonly position: number; // 0-1
}

/**
 * Hue interpolation path strategy
 */
export type HuePath =
  | 'shorter'      // Take the shorter arc on the color wheel
  | 'longer'       // Take the longer arc
  | 'increasing'   // Always increase hue (0 → 360)
  | 'decreasing'   // Always decrease hue (360 → 0)
  | 'none';        // Linear interpolation (may cross 0/360)

/**
 * Gamut mapping strategy for out-of-sRGB colors
 */
export type GamutStrategy =
  | 'clamp'              // Simple RGB clamping (may cause banding)
  | 'reduce-chroma'      // Reduce chroma until in-gamut (preserves hue)
  | 'adjust-lightness'   // Adjust L to bring into gamut (preserves chroma)
  | 'project'            // Project toward gray (good for smooth gradients)
  | 'adaptive';          // Choose best strategy per color

/**
 * Lightness curve for gradient transitions
 */
export type LightnessCurve =
  | 'linear'       // Constant rate of change
  | 'ease'         // Cubic bezier ease
  | 'ease-in'      // Accelerating
  | 'ease-out'     // Decelerating
  | 'ease-in-out'  // Symmetric ease
  | 'preserve';    // Maintain perceptual mid-point brightness

/**
 * Chroma behavior during interpolation
 */
export type ChromaBehavior =
  | 'linear'       // Linear interpolation
  | 'preserve-max' // Maintain higher chroma through middle
  | 'preserve-min' // Maintain lower chroma through middle
  | 'constant';    // Use fixed chroma from start

/**
 * Gradient generation options
 */
export interface GradientOptions {
  steps?: number;
  huePath?: HuePath;
  gamutStrategy?: GamutStrategy;
  lightnessCurve?: LightnessCurve;
  chromaBehavior?: ChromaBehavior;
  powerCurve?: number;  // For ease curves, 1 = linear, 2 = quadratic, etc.
}

const DEFAULT_OPTIONS: Required<GradientOptions> = {
  steps: 10,
  huePath: 'shorter',
  gamutStrategy: 'reduce-chroma',
  lightnessCurve: 'linear',
  chromaBehavior: 'linear',
  powerCurve: 2,
};

/**
 * Gradient Entity
 *
 * Represents a perceptually uniform color gradient with advanced features:
 * - OKLCH interpolation (no muddy middle)
 * - Hue path optimization (avoiding brown from blue→yellow)
 * - Gamut mapping (keeping all colors displayable)
 * - Lightness curve control (natural brightness transitions)
 * - Contrast validation (ensuring accessibility along gradient)
 *
 * @immutable
 */
export class Gradient {
  private readonly _stops: readonly ColorStop[];
  private readonly _options: Required<GradientOptions>;

  private constructor(
    stops: readonly ColorStop[],
    options: Required<GradientOptions>
  ) {
    // Sort stops by position
    this._stops = [...stops].sort((a, b) => a.position - b.position);
    this._options = options;
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create a two-color gradient
   */
  static create(
    start: OKLCH | string,
    end: OKLCH | string,
    options?: GradientOptions
  ): Gradient {
    const startColor = typeof start === 'string' ? OKLCH.fromHex(start) : start;
    const endColor = typeof end === 'string' ? OKLCH.fromHex(end) : end;

    if (!startColor || !endColor) {
      throw new Error('Invalid color provided to Gradient.create');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const stops: ColorStop[] = [
      { color: startColor, position: 0 },
      { color: endColor, position: 1 },
    ];

    return new Gradient(stops, opts);
  }

  /**
   * Create gradient from multiple color stops
   */
  static fromStops(
    stops: Array<{ color: OKLCH | string; position?: number }>,
    options?: GradientOptions
  ): Gradient {
    if (stops.length < 2) {
      throw new Error('Gradient requires at least 2 color stops');
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };

    const processedStops: ColorStop[] = stops.map((stop, i) => {
      const color = typeof stop.color === 'string'
        ? OKLCH.fromHex(stop.color)
        : stop.color;

      if (!color) {
        throw new Error(`Invalid color at stop ${i}`);
      }

      const position = stop.position ?? (i / (stops.length - 1));

      return { color, position };
    });

    return new Gradient(processedStops, opts);
  }

  /**
   * Create gradient from HCT values (Material Design 3 compatible)
   */
  static fromHCT(
    start: HCT,
    end: HCT,
    options?: GradientOptions
  ): Gradient {
    return Gradient.create(start.toOKLCH(), end.toOKLCH(), options);
  }

  // ============================================
  // Getters
  // ============================================

  get stops(): readonly ColorStop[] {
    return this._stops;
  }

  get startColor(): OKLCH {
    const firstStop = this._stops[0];
    if (!firstStop) {
      throw new Error('Gradient invariant violated: no start stop');
    }
    return firstStop.color;
  }

  get endColor(): OKLCH {
    const lastStop = this._stops[this._stops.length - 1];
    if (!lastStop) {
      throw new Error('Gradient invariant violated: no end stop');
    }
    return lastStop.color;
  }

  get options(): Required<GradientOptions> {
    return { ...this._options };
  }

  // ============================================
  // Core Interpolation
  // ============================================

  /**
   * Get color at a specific position (0-1)
   */
  colorAt(t: number): OKLCH {
    // Clamp t to valid range
    t = Math.max(0, Math.min(1, t));

    // Invariant: Gradient always has at least 2 stops
    const firstStop = this._stops[0];
    const lastStop = this._stops[this._stops.length - 1];
    if (!firstStop || !lastStop) {
      throw new Error('Gradient invariant violated: insufficient stops');
    }

    // Find surrounding stops
    let startStop: ColorStop = firstStop;
    let endStop: ColorStop = lastStop;

    for (let i = 0; i < this._stops.length - 1; i++) {
      const currentStop = this._stops[i];
      const nextStop = this._stops[i + 1];
      if (currentStop && nextStop && t >= currentStop.position && t <= nextStop.position) {
        startStop = currentStop;
        endStop = nextStop;
        break;
      }
    }

    // Calculate local t within segment
    const segmentLength = endStop.position - startStop.position;
    const localT = segmentLength > 0
      ? (t - startStop.position) / segmentLength
      : 0;

    // Apply easing curve
    const easedT = this.applyEasing(localT);

    // Interpolate color
    return this.interpolateColor(startStop.color, endStop.color, easedT);
  }

  /**
   * Generate array of colors at equal intervals
   */
  generate(): OKLCH[] {
    const { steps } = this._options;
    const colors: OKLCH[] = [];

    for (let i = 0; i < steps; i++) {
      const t = steps > 1 ? i / (steps - 1) : 0;
      colors.push(this.colorAt(t));
    }

    return colors;
  }

  /**
   * Generate as hex strings
   */
  generateHex(): string[] {
    return this.generate().map(c => c.toHex());
  }

  /**
   * Generate as CSS gradient string
   */
  toCss(direction: string = 'to right'): string {
    const colors = this.generate();
    const colorStops = colors.map((c, i) => {
      const position = (i / (colors.length - 1)) * 100;
      return `${c.toCss()} ${position.toFixed(1)}%`;
    });

    return `linear-gradient(${direction}, ${colorStops.join(', ')})`;
  }

  /**
   * Generate as OKLCH CSS gradient (modern browsers)
   */
  toCssOklch(direction: string = 'to right'): string {
    const start = this.startColor;
    const end = this.endColor;

    // Use CSS native OKLCH interpolation
    const hueInterp = this._options.huePath === 'longer'
      ? 'longer hue'
      : 'shorter hue';

    return `linear-gradient(in oklch ${hueInterp} ${direction}, ${start.toCss()}, ${end.toCss()})`;
  }

  /**
   * Generate CSS gradient with hex fallback for legacy browsers
   */
  toCssWithFallback(direction: string = 'to right'): string {
    const colors = this.generate();
    const colorStops = colors.map((c, i) => {
      const position = (i / (colors.length - 1)) * 100;
      return `${c.toHex()} ${position.toFixed(1)}%`;
    });

    return `linear-gradient(${direction}, ${colorStops.join(', ')})`;
  }

  // ============================================
  // Color Interpolation (Private)
  // ============================================

  private interpolateColor(a: OKLCH, b: OKLCH, t: number): OKLCH {
    // Lightness interpolation with curve
    const l = this.interpolateLightness(a.l, b.l, t);

    // Chroma interpolation with behavior
    const c = this.interpolateChroma(a.c, b.c, t);

    // Hue interpolation with path
    const h = this.interpolateHue(a.h, b.h, t);

    // Create intermediate color
    let result = OKLCH.create(l, c, h);

    // Apply gamut mapping
    result = this.applyGamutMapping(result);

    return result;
  }

  private interpolateLightness(a: number, b: number, t: number): number {
    const { lightnessCurve } = this._options;

    switch (lightnessCurve) {
      case 'preserve': {
        // Preserve perceptual mid-point by using cubic interpolation
        // This prevents the middle from appearing darker than expected
        const mid = (a + b) / 2;
        const boost = Math.sin(t * Math.PI) * 0.05; // Slight mid-point boost
        return a + (b - a) * t + boost * (1 - Math.abs(2 * t - 1));
      }
      default:
        return a + (b - a) * t;
    }
  }

  private interpolateChroma(a: number, b: number, t: number): number {
    const { chromaBehavior } = this._options;

    switch (chromaBehavior) {
      case 'preserve-max': {
        // Boost chroma in the middle to prevent desaturation
        const baseChroma = a + (b - a) * t;
        const maxChroma = Math.max(a, b);
        const boost = Math.sin(t * Math.PI) * (maxChroma - baseChroma) * 0.5;
        return baseChroma + boost;
      }
      case 'preserve-min': {
        // Use minimum chroma through transition
        const minChroma = Math.min(a, b);
        return minChroma + Math.abs(b - a) * t * 0.5;
      }
      case 'constant':
        return a;
      default:
        return a + (b - a) * t;
    }
  }

  private interpolateHue(a: number, b: number, t: number): number {
    const { huePath } = this._options;

    let diff = b - a;

    switch (huePath) {
      case 'shorter':
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        break;

      case 'longer':
        if (diff > 0 && diff < 180) diff -= 360;
        if (diff < 0 && diff > -180) diff += 360;
        break;

      case 'increasing':
        if (diff < 0) diff += 360;
        break;

      case 'decreasing':
        if (diff > 0) diff -= 360;
        break;

      case 'none':
      default:
        // Linear (may cross 0/360)
        break;
    }

    let h = a + diff * t;

    // Normalize to 0-360
    while (h < 0) h += 360;
    while (h >= 360) h -= 360;

    return h;
  }

  private applyEasing(t: number): number {
    const { lightnessCurve, powerCurve } = this._options;
    const p = powerCurve;

    switch (lightnessCurve) {
      case 'ease-in':
        return Math.pow(t, p);

      case 'ease-out':
        return 1 - Math.pow(1 - t, p);

      case 'ease-in-out':
        return t < 0.5
          ? Math.pow(2, p - 1) * Math.pow(t, p)
          : 1 - Math.pow(-2 * t + 2, p) / 2;

      case 'ease':
        // Cubic bezier approximation
        return t * t * (3 - 2 * t);

      default:
        return t;
    }
  }

  private applyGamutMapping(color: OKLCH): OKLCH {
    const { gamutStrategy } = this._options;

    switch (gamutStrategy) {
      case 'reduce-chroma':
        return color.mapToGamut('reduce-chroma');

      case 'adjust-lightness':
        return color.mapToGamut('adjust-lightness');

      case 'project': {
        // Project toward neutral gray
        if (!color.isInGamut()) {
          const gray = OKLCH.create(color.l, 0, color.h);
          // Binary search for in-gamut point on line to gray
          let low = 0;
          let high = 1;
          for (let i = 0; i < 15; i++) {
            const mid = (low + high) / 2;
            const test = OKLCH.interpolate(color, gray, mid, 'shorter');
            if (test.isInGamut()) {
              high = mid;
            } else {
              low = mid;
            }
          }
          return OKLCH.interpolate(color, gray, high, 'shorter');
        }
        return color;
      }

      case 'adaptive': {
        // Choose based on color properties
        if (color.c > 0.2) {
          // High chroma - prefer reducing chroma
          return color.mapToGamut('reduce-chroma');
        } else {
          // Low chroma - can adjust lightness
          return color.mapToGamut('adjust-lightness');
        }
      }

      case 'clamp':
      default:
        return color.clampToGamut();
    }
  }

  // ============================================
  // Analysis & Validation
  // ============================================

  /**
   * Check if gradient has any out-of-gamut colors
   * (before gamut mapping is applied)
   */
  hasGamutIssues(): boolean {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const color = this.colorAtRaw(t);
      if (!color.isInGamut()) return true;
    }
    return false;
  }

  /**
   * Get color at position without gamut mapping
   */
  private colorAtRaw(t: number): OKLCH {
    const startStop = this._stops[0];
    const endStop = this._stops[this._stops.length - 1];

    if (!startStop || !endStop) {
      throw new Error('Gradient invariant violated: insufficient stops');
    }

    const l = startStop.color.l + (endStop.color.l - startStop.color.l) * t;
    const c = startStop.color.c + (endStop.color.c - startStop.color.c) * t;
    const h = this.interpolateHue(startStop.color.h, endStop.color.h, t);

    return OKLCH.create(l, c, h);
  }

  /**
   * Calculate contrast range along gradient against a background
   */
  getContrastRange(bgHex: string): { min: APCAContrast; max: APCAContrast } {
    const colors = this.generate();
    const firstColor = colors[0];
    if (!firstColor) {
      throw new Error('Gradient must produce at least one color');
    }

    let min = APCAContrast.calculate(firstColor.toHex(), bgHex);
    let max = min;

    for (const color of colors) {
      const contrast = APCAContrast.calculate(color.toHex(), bgHex);
      if (contrast.absoluteLc < min.absoluteLc) min = contrast;
      if (contrast.absoluteLc > max.absoluteLc) max = contrast;
    }

    return { min, max };
  }

  /**
   * Check if all gradient colors pass contrast requirement
   */
  validateContrast(bgHex: string, minLc: number = 45): boolean {
    const { min } = this.getContrastRange(bgHex);
    return min.absoluteLc >= minLc;
  }

  /**
   * Get perceptual uniformity score (0-1)
   * Higher = more uniform perceived steps
   */
  getUniformityScore(): number {
    const colors = this.generate();
    if (colors.length < 3) return 1;

    const deltas: number[] = [];
    for (let i = 1; i < colors.length; i++) {
      const prevColor = colors[i - 1];
      const currColor = colors[i];
      if (prevColor && currColor) {
        deltas.push(prevColor.deltaE(currColor));
      }
    }

    // Calculate coefficient of variation
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0;

    // Convert to 0-1 score (lower CV = more uniform)
    return Math.max(0, 1 - cv);
  }

  /**
   * Identify potential problem areas in the gradient
   */
  analyzeProblemAreas(): Array<{
    position: number;
    issue: 'out-of-gamut' | 'low-contrast' | 'muddy' | 'banding';
    severity: 'low' | 'medium' | 'high';
  }> {
    const problems: Array<{
      position: number;
      issue: 'out-of-gamut' | 'low-contrast' | 'muddy' | 'banding';
      severity: 'low' | 'medium' | 'high';
    }> = [];

    const steps = 20;
    let prevColor: OKLCH | null = null;

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const rawColor = this.colorAtRaw(t);
      const color = this.colorAt(t);

      // Check gamut
      if (!rawColor.isInGamut()) {
        const severity = rawColor.c - rawColor.estimateMaxChroma() > 0.1 ? 'high' : 'medium';
        problems.push({ position: t, issue: 'out-of-gamut', severity });
      }

      // Check for muddy colors (low chroma + mid lightness)
      if (color.c < 0.05 && color.l > 0.3 && color.l < 0.7) {
        const startC = this.startColor.c;
        const endC = this.endColor.c;
        if (startC > 0.1 || endC > 0.1) {
          problems.push({ position: t, issue: 'muddy', severity: 'medium' });
        }
      }

      // Check for banding (sudden changes)
      if (prevColor) {
        const delta = color.deltaE(prevColor);
        const expectedDelta = 1 / steps;
        if (delta > expectedDelta * 3) {
          problems.push({ position: t, issue: 'banding', severity: 'high' });
        }
      }

      prevColor = color;
    }

    return problems;
  }

  // ============================================
  // Transformations
  // ============================================

  /**
   * Create reversed gradient
   */
  reverse(): Gradient {
    const reversedStops = this._stops.map(stop => ({
      color: stop.color,
      position: 1 - stop.position,
    }));

    return new Gradient(reversedStops, this._options);
  }

  /**
   * Create gradient with different options
   */
  withOptions(options: Partial<GradientOptions>): Gradient {
    return new Gradient(this._stops, { ...this._options, ...options });
  }

  /**
   * Add a color stop
   */
  addStop(color: OKLCH | string, position: number): Gradient {
    const colorObj = typeof color === 'string' ? OKLCH.fromHex(color) : color;
    if (!colorObj) throw new Error('Invalid color');

    const newStops = [...this._stops, { color: colorObj, position }];
    return new Gradient(newStops, this._options);
  }
}

export default Gradient;
