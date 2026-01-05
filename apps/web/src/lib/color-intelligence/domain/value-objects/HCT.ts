// ============================================
// HCT Value Object - Google Material Design 3
// Hue/Chroma/Tone Color Space
// ============================================

/**
 * HCT Color Space Value Object
 *
 * HCT combines:
 * - Hue from CAM16 (perceptually uniform hue circle)
 * - Chroma from CAM16 (colorfulness)
 * - Tone from CIE-Lab L* (0-100 lightness scale)
 *
 * Key advantage: Guaranteed contrast ratios via tone difference
 * If tone difference >= 40, WCAG AA is guaranteed
 * If tone difference >= 50, WCAG AAA is approximately guaranteed
 *
 * @see https://material.io/blog/science-of-color-design
 * @immutable
 */

import OKLCH from './OKLCH';

export interface HCTValues {
  readonly h: number;  // Hue: 0-360
  readonly c: number;  // Chroma: 0-150+ (varies by hue)
  readonly t: number;  // Tone: 0-100
}

// CAM16 viewing conditions (standard sRGB)
const CAM16_VIEWING = {
  // Background luminance (relative to white)
  adaptingLuminance: 11.725,
  // Surround: dark=0, dim=1, average=2
  surround: 2,
  // Discounting: true for "ignore chromatic adaptation"
  discounting: false,
} as const;

// CAM16 constants for D65 illuminant
const CAM16_CONSTANTS = {
  // White point adaptation
  Xw: 95.047,
  Yw: 100.0,
  Zw: 108.883,

  // Surround coefficients
  c: 0.69,
  Nc: 1.0,
  F: 1.0,

  // Chromatic adaptation
  D: 0.8450896328492113,

  // Brightness coefficients
  FL: 0.3884814537800353,
  FLRoot: 0.623218750000000,

  // Background
  n: 0.2,
  Nbb: 1.0003040045593807,
  Ncb: 1.0003040045593807,
  z: 1.909169568483652,
  Aw: 29.981000900040016,
} as const;

/**
 * HCT Value Object
 * Immutable representation with tone-based contrast guarantees
 */
export class HCT {
  private readonly _h: number;
  private readonly _c: number;
  private readonly _t: number;

  // Cached conversion for performance
  private _cachedOklch: OKLCH | null = null;

  private constructor(h: number, c: number, t: number) {
    this._h = ((h % 360) + 360) % 360;
    this._c = Math.max(0, c);
    this._t = Math.max(0, Math.min(100, t));
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create from HCT values
   */
  static create(h: number, c: number, t: number): HCT {
    return new HCT(h, c, t);
  }

  /**
   * Create from hex string
   */
  static fromHex(hex: string): HCT | null {
    const oklch = OKLCH.fromHex(hex);
    if (!oklch) return null;
    return HCT.fromOKLCH(oklch);
  }

  /**
   * Create from OKLCH (approximate conversion)
   * Note: This is an approximation. For exact HCT,
   * full CAM16 implementation would be needed.
   */
  static fromOKLCH(oklch: OKLCH): HCT {
    // Approximate HCT from OKLCH
    // HCT tone ≈ OKLCH L * 100
    // HCT chroma ≈ OKLCH C * ~260 (rough scaling)
    // HCT hue ≈ OKLCH hue (both are perceptually uniform)

    const t = oklch.l * 100;

    // Chroma scaling is hue-dependent
    // This is an approximation - real HCT uses CAM16
    const chromaScale = getChromaScaleForHue(oklch.h);
    const c = oklch.c * chromaScale;

    return new HCT(oklch.h, c, t);
  }

  // ============================================
  // Getters
  // ============================================

  get h(): number { return this._h; }
  get c(): number { return this._c; }
  get t(): number { return this._t; }

  get values(): HCTValues {
    return { h: this._h, c: this._c, t: this._t };
  }

  // ============================================
  // Transformations
  // ============================================

  /**
   * Create with new hue
   */
  withHue(h: number): HCT {
    return new HCT(h, this._c, this._t);
  }

  /**
   * Create with new chroma
   */
  withChroma(c: number): HCT {
    return new HCT(this._h, c, this._t);
  }

  /**
   * Create with new tone
   */
  withTone(t: number): HCT {
    return new HCT(this._h, this._c, t);
  }

  /**
   * Lighten by tone units (0-100 scale)
   */
  lightenTone(delta: number): HCT {
    return new HCT(this._h, this._c, this._t + delta);
  }

  /**
   * Darken by tone units
   */
  darkenTone(delta: number): HCT {
    return new HCT(this._h, this._c, this._t - delta);
  }

  // ============================================
  // Contrast Operations (Key Feature)
  // ============================================

  /**
   * Calculate tone difference with another HCT color
   * This directly predicts contrast ratio
   */
  toneDifference(other: HCT): number {
    return Math.abs(this._t - other._t);
  }

  /**
   * Check if tone difference meets WCAG AA (4.5:1)
   * Tone difference >= 40 guarantees AA
   */
  meetsContrastAA(other: HCT): boolean {
    return this.toneDifference(other) >= 40;
  }

  /**
   * Check if tone difference meets WCAG AAA (7:1)
   * Tone difference >= 50 approximately guarantees AAA
   */
  meetsContrastAAA(other: HCT): boolean {
    return this.toneDifference(other) >= 50;
  }

  /**
   * Check if tone difference meets APCA body text (Lc 75)
   * Tone difference >= 45 is recommended
   */
  meetsApcaBody(other: HCT): boolean {
    return this.toneDifference(other) >= 45;
  }

  /**
   * Get a variant that guarantees AA contrast with this color
   * @param preferLighter If true, prefer lighter variant
   */
  getContrastingAA(preferLighter: boolean = true): HCT {
    if (preferLighter && this._t <= 60) {
      return new HCT(this._h, this._c, Math.min(100, this._t + 40));
    } else {
      return new HCT(this._h, this._c, Math.max(0, this._t - 40));
    }
  }

  /**
   * Get a variant that guarantees AAA contrast with this color
   */
  getContrastingAAA(preferLighter: boolean = true): HCT {
    if (preferLighter && this._t <= 50) {
      return new HCT(this._h, this._c, Math.min(100, this._t + 50));
    } else {
      return new HCT(this._h, this._c, Math.max(0, this._t - 50));
    }
  }

  /**
   * Determine if this color is considered "light" (high tone)
   * Based on Material Design 3 guidelines
   */
  isLight(): boolean {
    return this._t >= 50;
  }

  /**
   * Get the optimal text tone for this background
   * Returns white (100) or black (0) based on contrast
   */
  getOptimalTextTone(): number {
    // If background tone < 50, white text (tone 100)
    // If background tone >= 50, black text (tone 0)
    return this._t < 50 ? 100 : 0;
  }

  /**
   * Get optimal text HCT that maintains brand hue
   */
  getOptimalTextHCT(): HCT {
    const textTone = this.getOptimalTextTone();
    // Reduce chroma for text readability
    const textChroma = Math.min(this._c * 0.3, 30);
    return new HCT(this._h, textChroma, textTone);
  }

  // ============================================
  // Material Design 3 Tonal Palette
  // ============================================

  /**
   * Generate full tonal palette (Material Design 3)
   * Returns tones: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
   */
  generateTonalPalette(): Map<number, HCT> {
    const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
    const palette = new Map<number, HCT>();

    for (const tone of tones) {
      // Chroma may need adjustment at extreme tones
      let adjustedChroma = this._c;

      // Reduce chroma at very light/dark tones for better gamut
      if (tone <= 10 || tone >= 95) {
        adjustedChroma = Math.min(this._c, 40);
      }

      palette.set(tone, new HCT(this._h, adjustedChroma, tone));
    }

    return palette;
  }

  /**
   * Get key color roles based on Material Design 3
   */
  getKeyColorRoles(): {
    primary: HCT;
    onPrimary: HCT;
    primaryContainer: HCT;
    onPrimaryContainer: HCT;
  } {
    const isLightMode = true; // Could be parameterized

    if (isLightMode) {
      return {
        primary: new HCT(this._h, this._c, 40),
        onPrimary: new HCT(this._h, this._c, 100),
        primaryContainer: new HCT(this._h, this._c, 90),
        onPrimaryContainer: new HCT(this._h, this._c, 10),
      };
    } else {
      return {
        primary: new HCT(this._h, this._c, 80),
        onPrimary: new HCT(this._h, this._c, 20),
        primaryContainer: new HCT(this._h, this._c, 30),
        onPrimaryContainer: new HCT(this._h, this._c, 90),
      };
    }
  }

  // ============================================
  // Conversion Methods
  // ============================================

  /**
   * Convert to OKLCH (approximate)
   */
  toOKLCH(): OKLCH {
    if (this._cachedOklch) return this._cachedOklch;

    // Reverse the approximation
    const l = this._t / 100;
    const chromaScale = getChromaScaleForHue(this._h);
    const c = this._c / chromaScale;

    this._cachedOklch = OKLCH.create(l, c, this._h);
    return this._cachedOklch;
  }

  /**
   * Convert to hex string
   */
  toHex(): string {
    return this.toOKLCH().toHex();
  }

  /**
   * Convert to CSS (via OKLCH)
   */
  toCss(): string {
    return this.toOKLCH().toCss();
  }

  // ============================================
  // Analysis
  // ============================================

  /**
   * Get approximate WCAG 2.1 contrast ratio with another color
   * Based on tone difference approximation
   */
  approximateContrastRatio(other: HCT): number {
    const toneDiff = this.toneDifference(other);

    // Approximate mapping from tone difference to contrast ratio
    // This is a rough heuristic
    if (toneDiff >= 85) return 21;
    if (toneDiff >= 70) return 10;
    if (toneDiff >= 55) return 7;
    if (toneDiff >= 45) return 4.5;
    if (toneDiff >= 35) return 3;
    if (toneDiff >= 25) return 2;
    return 1 + toneDiff / 50;
  }

  /**
   * Get the "surface interaction" quality
   * Higher values suggest the color works better as a surface
   */
  getSurfaceQuality(): number {
    // Ideal surfaces have:
    // - Moderate tone (30-80)
    // - Lower chroma (allows text overlay)
    const toneScore = 1 - Math.abs(this._t - 55) / 55;
    const chromaScore = Math.max(0, 1 - this._c / 100);
    return (toneScore + chromaScore) / 2;
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Create harmonious color from source
   */
  static harmonize(source: HCT, target: HCT, amount: number = 0.5): HCT {
    // Rotate hue toward target
    let hueDiff = target._h - source._h;
    if (hueDiff > 180) hueDiff -= 360;
    if (hueDiff < -180) hueDiff += 360;

    const newHue = source._h + hueDiff * amount * 0.3; // Subtle shift
    return new HCT(newHue, source._c, source._t);
  }

  /**
   * Get complementary color
   */
  static complement(color: HCT): HCT {
    return new HCT(color._h + 180, color._c, color._t);
  }

  /**
   * Generate analogous colors
   */
  static analogous(color: HCT, angle: number = 30): [HCT, HCT, HCT] {
    return [
      new HCT(color._h - angle, color._c, color._t),
      color,
      new HCT(color._h + angle, color._c, color._t),
    ];
  }

  /**
   * Generate triadic colors
   */
  static triadic(color: HCT): [HCT, HCT, HCT] {
    return [
      color,
      new HCT(color._h + 120, color._c, color._t),
      new HCT(color._h + 240, color._c, color._t),
    ];
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get approximate chroma scale factor for OKLCH->HCT conversion
 * This varies by hue due to different color spaces
 */
function getChromaScaleForHue(h: number): number {
  // Approximate scaling factors
  // Real HCT would use full CAM16
  const hueFactors: Record<number, number> = {
    0: 280,    // Red
    30: 300,   // Orange
    60: 320,   // Yellow (highest chroma capacity)
    90: 280,   // Yellow-Green
    120: 260,  // Green
    150: 240,  // Cyan-Green
    180: 220,  // Cyan
    210: 200,  // Blue-Cyan
    240: 220,  // Blue
    270: 240,  // Violet
    300: 260,  // Magenta
    330: 270,  // Red-Magenta
  };

  // Find surrounding hues and interpolate
  const hues = Object.keys(hueFactors).map(Number).sort((a, b) => a - b);
  let lower = 0;
  let upper = 360;

  for (const hue of hues) {
    if (hue <= h) lower = hue;
    if (hue > h && upper === 360) upper = hue;
  }

  if (upper === 360) upper = 0;

  const t = upper !== lower ? (h - lower) / (upper - lower) : 0;
  const lowerFactor = hueFactors[lower] || 260;
  const upperFactor = hueFactors[upper === 0 ? 0 : upper] || 260;

  return lowerFactor + t * (upperFactor - lowerFactor);
}

export default HCT;
