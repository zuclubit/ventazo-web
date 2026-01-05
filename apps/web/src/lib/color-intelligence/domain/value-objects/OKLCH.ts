// ============================================
// OKLCH Value Object - Immutable Color Representation
// Perceptually Uniform Color Space by Björn Ottosson
// ============================================

/**
 * OKLCH Color Space Value Object
 *
 * Properties:
 * - L (Lightness): 0-1 where 0=black, 1=white
 * - C (Chroma): 0-0.4 (practical max varies by hue)
 * - H (Hue): 0-360 degrees
 *
 * @immutable
 */
export interface OKLCHValues {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/**
 * OKLab intermediate representation
 * Used for conversion between OKLCH and RGB
 */
export interface OKLabValues {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

/**
 * sRGB representation (0-255)
 */
export interface RGBValues {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

// Gamut boundary approximation coefficients for sRGB
// Pre-calculated for common hues to enable fast gamut checking
const GAMUT_COEFFICIENTS = {
  // Approximate max chroma for given L at specific hues
  // Format: [h_degrees]: [a, b] where max_c ≈ a * L * (1 - L) + b
  0: [0.28, 0.02],    // Red
  30: [0.30, 0.02],   // Orange
  60: [0.32, 0.02],   // Yellow
  90: [0.24, 0.02],   // Yellow-Green
  120: [0.22, 0.02],  // Green
  150: [0.18, 0.02],  // Cyan-Green
  180: [0.16, 0.02],  // Cyan
  210: [0.14, 0.02],  // Blue-Cyan
  240: [0.16, 0.02],  // Blue
  270: [0.20, 0.02],  // Violet
  300: [0.24, 0.02],  // Magenta
  330: [0.26, 0.02],  // Red-Magenta
} as const;

/**
 * OKLCH Value Object
 * Immutable representation with validation and transformations
 */
export class OKLCH {
  private readonly _l: number;
  private readonly _c: number;
  private readonly _h: number;

  private constructor(l: number, c: number, h: number) {
    // Clamp values to valid ranges
    this._l = Math.max(0, Math.min(1, l));
    this._c = Math.max(0, c); // No upper limit, but practical max ~0.4
    this._h = ((h % 360) + 360) % 360; // Normalize to 0-360
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create from LCH values
   */
  static create(l: number, c: number, h: number): OKLCH {
    return new OKLCH(l, c, h);
  }

  /**
   * Create from hex string
   */
  static fromHex(hex: string): OKLCH | null {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    return OKLCH.fromRGB(rgb);
  }

  /**
   * Create from RGB values (0-255)
   */
  static fromRGB(rgb: RGBValues): OKLCH {
    const lab = rgbToOklab(rgb);
    return OKLCH.fromOKLab(lab);
  }

  /**
   * Create from OKLab values
   */
  static fromOKLab(lab: OKLabValues): OKLCH {
    const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
    let h = Math.atan2(lab.b, lab.a) * (180 / Math.PI);
    if (h < 0) h += 360;
    return new OKLCH(lab.L, c, h);
  }

  // ============================================
  // Getters (Immutability)
  // ============================================

  get l(): number { return this._l; }
  get c(): number { return this._c; }
  get h(): number { return this._h; }

  get values(): OKLCHValues {
    return { l: this._l, c: this._c, h: this._h };
  }

  // ============================================
  // Transformations (Return new instances)
  // ============================================

  /**
   * Create new OKLCH with modified lightness
   */
  withLightness(l: number): OKLCH {
    return new OKLCH(l, this._c, this._h);
  }

  /**
   * Create new OKLCH with modified chroma
   */
  withChroma(c: number): OKLCH {
    return new OKLCH(this._l, c, this._h);
  }

  /**
   * Create new OKLCH with modified hue
   */
  withHue(h: number): OKLCH {
    return new OKLCH(this._l, this._c, h);
  }

  /**
   * Lighten by delta (additive)
   */
  lighten(delta: number): OKLCH {
    return new OKLCH(this._l + delta, this._c, this._h);
  }

  /**
   * Darken by delta (subtractive)
   */
  darken(delta: number): OKLCH {
    return new OKLCH(this._l - delta, this._c, this._h);
  }

  /**
   * Saturate by factor (multiplicative)
   */
  saturate(factor: number): OKLCH {
    return new OKLCH(this._l, this._c * factor, this._h);
  }

  /**
   * Desaturate by factor (multiplicative)
   */
  desaturate(factor: number): OKLCH {
    return new OKLCH(this._l, this._c / factor, this._h);
  }

  /**
   * Rotate hue by degrees
   */
  rotateHue(degrees: number): OKLCH {
    return new OKLCH(this._l, this._c, this._h + degrees);
  }

  // ============================================
  // Gamut Operations
  // ============================================

  /**
   * Estimate maximum chroma for current L and H in sRGB gamut
   * Uses interpolated coefficients for speed
   */
  estimateMaxChroma(): number {
    // Find surrounding coefficients
    const hKeys = Object.keys(GAMUT_COEFFICIENTS).map(Number);
    const h = this._h;

    let lower = 0;
    let upper = 360;

    for (const key of hKeys) {
      if (key <= h && key > lower) lower = key;
      if (key > h && key < upper) upper = key;
    }

    if (upper === 360) upper = 0;

    // Interpolate coefficients
    const t = upper !== lower ? (h - lower) / (upper - lower) : 0;
    const lowerCoeff = GAMUT_COEFFICIENTS[lower as keyof typeof GAMUT_COEFFICIENTS];
    const upperCoeff = GAMUT_COEFFICIENTS[(upper === 360 ? 0 : upper) as keyof typeof GAMUT_COEFFICIENTS];

    const a = lowerCoeff[0] + t * (upperCoeff[0] - lowerCoeff[0]);
    const b = lowerCoeff[1] + t * (upperCoeff[1] - lowerCoeff[1]);

    // Parabolic approximation: max_c = a * L * (1 - L) + b
    return a * this._l * (1 - this._l) + b;
  }

  /**
   * Check if color is approximately within sRGB gamut
   * Uses fast estimation - for precise checking, convert to RGB
   */
  isInGamut(): boolean {
    if (this._l <= 0 || this._l >= 1) return this._c < 0.001;
    return this._c <= this.estimateMaxChroma() * 1.1; // 10% tolerance
  }

  /**
   * Clamp to sRGB gamut by reducing chroma
   * Preserves hue and lightness
   */
  clampToGamut(): OKLCH {
    const maxC = this.estimateMaxChroma();
    if (this._c <= maxC) return this;
    return new OKLCH(this._l, maxC, this._h);
  }

  /**
   * Map to gamut using OKLCH chroma reduction
   * More sophisticated than simple clamping
   */
  mapToGamut(strategy: 'reduce-chroma' | 'adjust-lightness' = 'reduce-chroma'): OKLCH {
    // First check if already in gamut via RGB conversion
    const rgb = this.toRGB();
    const isInGamut = rgb.r >= 0 && rgb.r <= 255 &&
                       rgb.g >= 0 && rgb.g <= 255 &&
                       rgb.b >= 0 && rgb.b <= 255;

    if (isInGamut) return this;

    if (strategy === 'reduce-chroma') {
      // Binary search for maximum in-gamut chroma
      let low = 0;
      let high = this._c;
      let result = new OKLCH(this._l, 0, this._h);

      for (let i = 0; i < 15; i++) { // 15 iterations for precision
        const mid = (low + high) / 2;
        const test = new OKLCH(this._l, mid, this._h);
        const testRgb = test.toRGB();

        const testInGamut = testRgb.r >= 0 && testRgb.r <= 255 &&
                            testRgb.g >= 0 && testRgb.g <= 255 &&
                            testRgb.b >= 0 && testRgb.b <= 255;

        if (testInGamut) {
          result = test;
          low = mid;
        } else {
          high = mid;
        }
      }

      return result;
    } else {
      // Adjust lightness strategy - preserve chroma if possible
      let l = this._l;
      let direction = l > 0.5 ? -1 : 1;

      for (let i = 0; i < 50; i++) {
        const test = new OKLCH(l, this._c, this._h);
        const testRgb = test.toRGB();

        const testInGamut = testRgb.r >= 0 && testRgb.r <= 255 &&
                            testRgb.g >= 0 && testRgb.g <= 255 &&
                            testRgb.b >= 0 && testRgb.b <= 255;

        if (testInGamut) return test;

        l += direction * 0.02;
        if (l <= 0 || l >= 1) {
          // Flip direction and reduce chroma
          direction *= -1;
          return this.withChroma(this._c * 0.9).mapToGamut(strategy);
        }
      }

      // Fallback to chroma reduction
      return this.mapToGamut('reduce-chroma');
    }
  }

  // ============================================
  // Conversion Methods
  // ============================================

  /**
   * Convert to OKLab
   */
  toOKLab(): OKLabValues {
    const hRad = (this._h * Math.PI) / 180;
    return {
      L: this._l,
      a: this._c * Math.cos(hRad),
      b: this._c * Math.sin(hRad),
    };
  }

  /**
   * Convert to RGB (0-255)
   * May return out-of-gamut values - use mapToGamut() first if needed
   */
  toRGB(): RGBValues {
    const lab = this.toOKLab();
    return oklabToRgb(lab);
  }

  /**
   * Convert to hex string
   * Automatically clamps to sRGB gamut
   */
  toHex(): string {
    const rgb = this.mapToGamut().toRGB();
    return rgbToHex(rgb);
  }

  /**
   * Convert to CSS oklch() string
   */
  toCss(): string {
    return `oklch(${(this._l * 100).toFixed(1)}% ${this._c.toFixed(4)} ${this._h.toFixed(1)})`;
  }

  /**
   * Convert to CSS oklch() string with alpha
   */
  toCssAlpha(alpha: number): string {
    return `oklch(${(this._l * 100).toFixed(1)}% ${this._c.toFixed(4)} ${this._h.toFixed(1)} / ${alpha.toFixed(2)})`;
  }

  // ============================================
  // Comparison & Analysis
  // ============================================

  /**
   * Calculate perceptual difference (Delta E in OKLCH)
   * Lower is more similar
   */
  deltaE(other: OKLCH): number {
    const dL = this._l - other._l;

    // Chroma difference with hue consideration
    const dC = this._c - other._c;

    // Hue difference (handling wraparound)
    let dH = other._h - this._h;
    if (dH > 180) dH -= 360;
    if (dH < -180) dH += 360;

    // Convert hue difference to cartesian
    const avgC = (this._c + other._c) / 2;
    const dHRad = (dH * Math.PI) / 180;
    const dHCart = 2 * Math.sqrt(this._c * other._c) * Math.sin(dHRad / 2);

    return Math.sqrt(dL * dL + dC * dC + dHCart * dHCart);
  }

  /**
   * Check if colors are perceptually similar
   */
  isSimilarTo(other: OKLCH, threshold: number = 0.05): boolean {
    return this.deltaE(other) < threshold;
  }

  /**
   * Calculate perceived "warmth" of color
   * Returns -1 (cold/blue) to +1 (warm/orange)
   */
  getWarmth(): number {
    // Warm hues: ~30 (orange) to ~60 (yellow)
    // Cold hues: ~180 (cyan) to ~270 (blue)
    const h = this._h;

    if (h >= 0 && h <= 90) {
      // Red to yellow-green: warm
      return Math.cos((h - 30) * Math.PI / 90) * this._c * 2;
    } else if (h >= 90 && h <= 180) {
      // Yellow-green to cyan: cooling
      return Math.cos((h - 30) * Math.PI / 90) * this._c * 2;
    } else if (h >= 180 && h <= 270) {
      // Cyan to blue: cold
      return -Math.cos((h - 210) * Math.PI / 90) * this._c * 2;
    } else {
      // Blue to red: warming
      return -Math.cos((h - 210) * Math.PI / 90) * this._c * 2;
    }
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Interpolate between two OKLCH colors
   * @param a Start color
   * @param b End color
   * @param t Interpolation factor (0-1)
   * @param huePath 'shorter' | 'longer' | 'increasing' | 'decreasing'
   */
  static interpolate(
    a: OKLCH,
    b: OKLCH,
    t: number,
    huePath: 'shorter' | 'longer' | 'increasing' | 'decreasing' = 'shorter'
  ): OKLCH {
    // Linear interpolation for L and C
    const l = a._l + t * (b._l - a._l);
    const c = a._c + t * (b._c - a._c);

    // Hue interpolation with path selection
    let h: number;
    let hDiff = b._h - a._h;

    // Normalize difference
    if (hDiff > 180) hDiff -= 360;
    if (hDiff < -180) hDiff += 360;

    switch (huePath) {
      case 'shorter':
        h = a._h + t * hDiff;
        break;
      case 'longer':
        if (hDiff > 0) hDiff -= 360;
        else hDiff += 360;
        h = a._h + t * hDiff;
        break;
      case 'increasing':
        if (hDiff < 0) hDiff += 360;
        h = a._h + t * hDiff;
        break;
      case 'decreasing':
        if (hDiff > 0) hDiff -= 360;
        h = a._h + t * hDiff;
        break;
    }

    return new OKLCH(l, c, h);
  }

  /**
   * Generate gradient stops between two colors
   */
  static gradient(
    a: OKLCH,
    b: OKLCH,
    steps: number,
    options: {
      huePath?: 'shorter' | 'longer' | 'increasing' | 'decreasing';
      gamutMap?: boolean;
    } = {}
  ): OKLCH[] {
    const { huePath = 'shorter', gamutMap = true } = options;

    const result: OKLCH[] = [];

    for (let i = 0; i < steps; i++) {
      const t = steps > 1 ? i / (steps - 1) : 0;
      let color = OKLCH.interpolate(a, b, t, huePath);
      if (gamutMap) color = color.mapToGamut();
      result.push(color);
    }

    return result;
  }
}

// ============================================
// Helper Functions (Internal)
// ============================================

function hexToRgb(hex: string): RGBValues | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

function rgbToHex(rgb: RGBValues): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
  const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
  const b = Math.max(0, Math.min(255, Math.round(rgb.b)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function srgbToLinear(c: number): number {
  const abs = Math.abs(c);
  return abs <= 0.04045
    ? c / 12.92
    : Math.sign(c) * Math.pow((abs + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const abs = Math.abs(c);
  return abs <= 0.0031308
    ? c * 12.92
    : Math.sign(c) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

function rgbToOklab(rgb: RGBValues): OKLabValues {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabToRgb(lab: OKLabValues): RGBValues {
  const l_ = lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b;
  const m_ = lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b;
  const s_ = lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return {
    r: linearToSrgb(r) * 255,
    g: linearToSrgb(g) * 255,
    b: linearToSrgb(b) * 255,
  };
}

export default OKLCH;
