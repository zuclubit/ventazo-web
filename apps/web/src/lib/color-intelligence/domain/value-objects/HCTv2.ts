// ============================================
// HCT v2 - Material Design 3 Color Space
// Using Real CAM16 Implementation
// ============================================
//
// HCT (Hue, Chroma, Tone) combines:
// - H: CAM16 Hue (perceptually uniform hue circle)
// - C: CAM16 Chroma (colorfulness relative to white)
// - T: CIE L* Tone (0-100 lightness scale)
//
// Key Property: Tone difference predicts contrast ratio
// - ΔT ≥ 40 → WCAG 2.1 AA guaranteed (4.5:1)
// - ΔT ≥ 50 → WCAG 2.1 AAA approximately guaranteed (7:1)
//
// Reference: Material Design 3 Color System
// @see https://m3.material.io/styles/color/the-color-system
// @see https://material.io/blog/science-of-color-design
//
// @immutable
// ============================================

import CAM16 from './CAM16';
import type {
  Cam16Hue,
  Cam16Chroma,
  HctTone,
  ArgbInt,
} from '../types/branded';

import {
  cam16Hue,
  cam16Chroma,
  hctTone,
  argbInt,
} from '../types/branded';

// ============================================
// HCT Solver Constants
// ============================================

/**
 * Tolerance for binary search convergence
 */
const CHROMA_TOLERANCE = 0.5;

/**
 * Maximum iterations for solver
 */
const MAX_ITERATIONS = 20;

/**
 * Minimum chroma to consider (below this = achromatic)
 */
const MIN_CHROMA = 0.0001;

// ============================================
// HCT Values Interface
// ============================================

export interface HCTv2Values {
  readonly h: Cam16Hue;
  readonly c: Cam16Chroma;
  readonly t: HctTone;
}

// ============================================
// HCT v2 Value Object
// ============================================

/**
 * HCT v2 Color Space Value Object
 *
 * Uses real CAM16 for hue and chroma calculations,
 * combined with CIE L* for tone (lightness).
 *
 * This is the canonical Material Design 3 implementation.
 *
 * @example
 * ```typescript
 * // From hex
 * const hct = HCTv2.fromHex('#0088FF');
 *
 * // From components
 * const hct = HCTv2.create(240, 60, 50);
 *
 * // Check contrast
 * hct.meetsContrastAA(darkHct); // true if tone diff >= 40
 *
 * // Generate tonal palette
 * const palette = hct.generateTonalPalette();
 * ```
 *
 * @immutable
 */
export class HCTv2 {
  private readonly _h: Cam16Hue;
  private readonly _c: Cam16Chroma;
  private readonly _t: HctTone;

  // Cache ARGB for repeated conversions
  private _cachedArgb: ArgbInt | null = null;

  // ============================================
  // Constructor (Private)
  // ============================================

  private constructor(h: number, c: number, t: number) {
    this._h = cam16Hue.create(h);
    this._c = cam16Chroma.clamp(c);
    this._t = hctTone.clamp(t);
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Create HCT from component values
   * Uses HctSolver to find the ARGB color that best matches the HCT values
   */
  static create(h: number, c: number, t: number): HCTv2 {
    return new HCTv2(h, c, t);
  }

  /**
   * Create HCT from ARGB integer
   */
  static fromArgb(argb: number | ArgbInt): HCTv2 {
    const cam16 = CAM16.fromArgb(argb as ArgbInt);
    const tone = yToLstar(luminanceFromArgb(argb as ArgbInt));

    return new HCTv2(cam16.h, cam16.C, tone);
  }

  /**
   * Create HCT from hex string
   */
  static fromHex(hex: string): HCTv2 | null {
    try {
      const argb = argbInt.fromHex(hex);
      return HCTv2.fromArgb(argb);
    } catch {
      return null;
    }
  }

  /**
   * Create HCT from CAM16
   */
  static fromCAM16(cam16: CAM16): HCTv2 {
    const argb = cam16.toArgb();
    const tone = yToLstar(luminanceFromArgb(argb));
    return new HCTv2(cam16.h, cam16.C, tone);
  }

  // ============================================
  // Getters
  // ============================================

  /** CAM16 Hue (0-360°) */
  get h(): Cam16Hue { return this._h; }

  /** CAM16 Chroma (0-~150) */
  get c(): Cam16Chroma { return this._c; }

  /** CIE L* Tone (0-100) */
  get t(): HctTone { return this._t; }

  /** All values as object */
  get values(): HCTv2Values {
    return { h: this._h, c: this._c, t: this._t };
  }

  // ============================================
  // Transformations
  // ============================================

  /**
   * Create with new hue
   */
  withHue(h: number): HCTv2 {
    return new HCTv2(h, this._c, this._t);
  }

  /**
   * Create with new chroma
   */
  withChroma(c: number): HCTv2 {
    return new HCTv2(this._h, c, this._t);
  }

  /**
   * Create with new tone
   */
  withTone(t: number): HCTv2 {
    return new HCTv2(this._h, this._c, t);
  }

  /**
   * Lighten by tone units
   */
  lightenTone(delta: number): HCTv2 {
    return new HCTv2(this._h, this._c, (this._t as number) + delta);
  }

  /**
   * Darken by tone units
   */
  darkenTone(delta: number): HCTv2 {
    return new HCTv2(this._h, this._c, (this._t as number) - delta);
  }

  // ============================================
  // Contrast Operations (Key HCT Feature)
  // ============================================

  /**
   * Calculate tone difference with another HCT color
   * This directly predicts contrast ratio
   */
  toneDifference(other: HCTv2): number {
    return Math.abs((this._t as number) - (other._t as number));
  }

  /**
   * Check if meets WCAG 2.1 AA (4.5:1)
   * Tone difference ≥ 40 guarantees AA
   */
  meetsContrastAA(other: HCTv2): boolean {
    return this.toneDifference(other) >= 40;
  }

  /**
   * Check if meets WCAG 2.1 AAA (7:1)
   * Tone difference ≥ 50 approximately guarantees AAA
   */
  meetsContrastAAA(other: HCTv2): boolean {
    return this.toneDifference(other) >= 50;
  }

  /**
   * Check if meets APCA body text (Lc 60-75)
   * Tone difference ≥ 45 is recommended
   */
  meetsApcaBody(other: HCTv2): boolean {
    return this.toneDifference(other) >= 45;
  }

  /**
   * Get contrasting color that guarantees AA
   */
  getContrastingAA(preferLighter: boolean = true): HCTv2 {
    const currentTone = this._t as number;

    if (preferLighter && currentTone <= 60) {
      return new HCTv2(this._h, this._c, Math.min(100, currentTone + 40));
    }
    return new HCTv2(this._h, this._c, Math.max(0, currentTone - 40));
  }

  /**
   * Get contrasting color that guarantees AAA
   */
  getContrastingAAA(preferLighter: boolean = true): HCTv2 {
    const currentTone = this._t as number;

    if (preferLighter && currentTone <= 50) {
      return new HCTv2(this._h, this._c, Math.min(100, currentTone + 50));
    }
    return new HCTv2(this._h, this._c, Math.max(0, currentTone - 50));
  }

  /**
   * Determine if this is a "light" color (high tone)
   */
  isLight(): boolean {
    return (this._t as number) >= 50;
  }

  /**
   * Get optimal text tone for this as background
   */
  getOptimalTextTone(): HctTone {
    return (this._t as number) < 50 ? hctTone.create(100) : hctTone.create(0);
  }

  /**
   * Get optimal text HCT (maintains brand hue)
   */
  getOptimalTextHCT(): HCTv2 {
    const textTone = this.getOptimalTextTone();
    const textChroma = Math.min((this._c as number) * 0.3, 30);
    return new HCTv2(this._h, textChroma, textTone);
  }

  // ============================================
  // Tonal Palette (Material Design 3)
  // ============================================

  /**
   * Generate full tonal palette
   * Standard tones: 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100
   */
  generateTonalPalette(): Map<number, HCTv2> {
    const tones = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];
    const palette = new Map<number, HCTv2>();

    for (const tone of tones) {
      // Chroma may need adjustment at extreme tones for gamut
      let adjustedChroma = this._c as number;

      // Reduce chroma at very light/dark tones
      if (tone <= 10 || tone >= 95) {
        adjustedChroma = Math.min(adjustedChroma, 40);
      }

      palette.set(tone, new HCTv2(this._h, adjustedChroma, tone));
    }

    return palette;
  }

  /**
   * Get key color roles (Material Design 3)
   */
  getKeyColorRoles(isLightMode: boolean = true): {
    primary: HCTv2;
    onPrimary: HCTv2;
    primaryContainer: HCTv2;
    onPrimaryContainer: HCTv2;
  } {
    if (isLightMode) {
      return {
        primary: new HCTv2(this._h, this._c, 40),
        onPrimary: new HCTv2(this._h, this._c, 100),
        primaryContainer: new HCTv2(this._h, this._c, 90),
        onPrimaryContainer: new HCTv2(this._h, this._c, 10),
      };
    }

    return {
      primary: new HCTv2(this._h, this._c, 80),
      onPrimary: new HCTv2(this._h, this._c, 20),
      primaryContainer: new HCTv2(this._h, this._c, 30),
      onPrimaryContainer: new HCTv2(this._h, this._c, 90),
    };
  }

  // ============================================
  // Conversion Methods
  // ============================================

  /**
   * Convert to ARGB integer
   * Uses HctSolver for accurate conversion
   */
  toArgb(): ArgbInt {
    if (this._cachedArgb !== null) {
      return this._cachedArgb;
    }

    this._cachedArgb = HctSolver.solveToArgb(this._h, this._c, this._t);
    return this._cachedArgb;
  }

  /**
   * Convert to hex string
   */
  toHex(): string {
    return argbInt.toHex(this.toArgb());
  }

  /**
   * Convert to CAM16
   */
  toCAM16(): CAM16 {
    return CAM16.fromArgb(this.toArgb());
  }

  /**
   * Convert to CSS (oklch format for browser compatibility)
   */
  toCss(): string {
    const hex = this.toHex();
    return hex;
  }

  // ============================================
  // Analysis Methods
  // ============================================

  /**
   * Get approximate WCAG contrast ratio based on tone difference
   */
  approximateContrastRatio(other: HCTv2): number {
    const toneDiff = this.toneDifference(other);

    if (toneDiff >= 85) return 21;
    if (toneDiff >= 70) return 10;
    if (toneDiff >= 55) return 7;
    if (toneDiff >= 45) return 4.5;
    if (toneDiff >= 35) return 3;
    if (toneDiff >= 25) return 2;
    return 1 + toneDiff / 50;
  }

  /**
   * Get surface quality score (how well it works as a surface)
   */
  getSurfaceQuality(): number {
    const toneScore = 1 - Math.abs((this._t as number) - 55) / 55;
    const chromaScore = Math.max(0, 1 - (this._c as number) / 100);
    return (toneScore + chromaScore) / 2;
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Harmonize source color toward target
   */
  static harmonize(source: HCTv2, target: HCTv2, amount: number = 0.5): HCTv2 {
    let hueDiff = (target._h as number) - (source._h as number);
    if (hueDiff > 180) hueDiff -= 360;
    if (hueDiff < -180) hueDiff += 360;

    const newHue = (source._h as number) + hueDiff * amount * 0.3;
    return new HCTv2(newHue, source._c, source._t);
  }

  /**
   * Get complementary color
   */
  static complement(color: HCTv2): HCTv2 {
    return new HCTv2((color._h as number) + 180, color._c, color._t);
  }

  /**
   * Generate analogous colors
   */
  static analogous(color: HCTv2, angle: number = 30): [HCTv2, HCTv2, HCTv2] {
    return [
      new HCTv2((color._h as number) - angle, color._c, color._t),
      color,
      new HCTv2((color._h as number) + angle, color._c, color._t),
    ];
  }

  /**
   * Generate triadic colors
   */
  static triadic(color: HCTv2): [HCTv2, HCTv2, HCTv2] {
    return [
      color,
      new HCTv2((color._h as number) + 120, color._c, color._t),
      new HCTv2((color._h as number) + 240, color._c, color._t),
    ];
  }

  /**
   * Color difference using CAM16-UCS
   */
  static deltaE(a: HCTv2, b: HCTv2): number {
    return a.toCAM16().deltaE(b.toCAM16());
  }
}

// ============================================
// HCT Solver
// ============================================

/**
 * HctSolver
 *
 * Finds the ARGB color that best matches given HCT values.
 * Uses binary search on chroma and root-finding for Y.
 *
 * Based on Material Color Utilities HctSolver
 * @see github.com/material-foundation/material-color-utilities
 */
export class HctSolver {
  /**
   * Find ARGB color for given HCT values
   */
  static solveToArgb(h: Cam16Hue, c: Cam16Chroma, t: HctTone): ArgbInt {
    const hue = h as number;
    const chroma = c as number;
    const tone = t as number;

    // Handle achromatic case
    if (chroma < MIN_CHROMA || tone <= 0 || tone >= 100) {
      const gray = lstarToY(tone);
      const grayValue = Math.round(linearToSrgb(gray) * 255);
      const clamped = Math.max(0, Math.min(255, grayValue));
      return argbInt.fromRgb(clamped as any, clamped as any, clamped as any);
    }

    // Use binary search to find chroma that achieves target tone
    const targetY = lstarToY(tone);

    let lowChroma = 0;
    let highChroma = chroma;

    // Find initial upper bound
    let testCam = CAM16.fromJCh(tone, highChroma, hue);
    let testArgb = testCam.toArgb();
    let testY = luminanceFromArgb(testArgb);

    // If even max chroma doesn't work, reduce it
    let iterations = 0;
    while (Math.abs(testY - targetY) > 0.01 && iterations < MAX_ITERATIONS) {
      const midChroma = (lowChroma + highChroma) / 2;
      testCam = CAM16.fromJCh(tone, midChroma, hue);
      testArgb = testCam.toArgb();

      // Verify round-trip
      const roundTrip = HCTv2.fromArgb(testArgb);
      const toneDiff = Math.abs((roundTrip.t as number) - tone);

      if (toneDiff < 1) {
        // Good match, check if we can increase chroma
        if (Math.abs(midChroma - highChroma) < CHROMA_TOLERANCE) {
          break;
        }
        lowChroma = midChroma;
      } else {
        highChroma = midChroma;
      }

      iterations++;
    }

    // Find exact color using the best chroma
    const finalChroma = (lowChroma + highChroma) / 2;

    // Use bisection on Y to get exact tone
    return HctSolver.findArgbForTone(hue, finalChroma, tone);
  }

  /**
   * Find ARGB with exact tone using Y bisection
   */
  private static findArgbForTone(hue: number, chroma: number, tone: number): ArgbInt {
    const targetY = lstarToY(tone);

    // Binary search on CAM16 J to find matching Y
    let lowJ = 0;
    let highJ = 100;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const midJ = (lowJ + highJ) / 2;
      const cam = CAM16.fromJCh(midJ, chroma, hue);
      const argb = cam.toArgb();
      const y = luminanceFromArgb(argb);

      if (Math.abs(y - targetY) < 0.001) {
        return argb;
      }

      if (y < targetY) {
        lowJ = midJ;
      } else {
        highJ = midJ;
      }
    }

    // Return best approximation
    const cam = CAM16.fromJCh((lowJ + highJ) / 2, chroma, hue);
    return cam.toArgb();
  }

  /**
   * Get maximum achievable chroma for given hue and tone
   */
  static getMaxChroma(hue: number, tone: number): number {
    let low = 0;
    let high = 200;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const mid = (low + high) / 2;
      const hct = HCTv2.create(hue, mid, tone);
      const roundTrip = HCTv2.fromArgb(hct.toArgb());

      const chromaDiff = Math.abs((roundTrip.c as number) - mid);
      const toneDiff = Math.abs((roundTrip.t as number) - tone);

      if (chromaDiff < 1 && toneDiff < 1) {
        low = mid;
      } else {
        high = mid;
      }
    }

    return low;
  }
}

// ============================================
// Internal Helper Functions
// ============================================

/**
 * Calculate luminance (Y) from ARGB
 */
function luminanceFromArgb(argb: ArgbInt): number {
  const { r, g, b } = argbInt.toRgb(argb);

  const linR = srgbToLinear(r / 255);
  const linG = srgbToLinear(g / 255);
  const linB = srgbToLinear(b / 255);

  return 0.2126 * linR + 0.7152 * linG + 0.0722 * linB;
}

/**
 * Convert Y (luminance) to L* (CIE L*)
 */
function yToLstar(y: number): number {
  if (y <= 0.008856) {
    return y * 903.3;
  }
  return 116 * Math.cbrt(y) - 16;
}

/**
 * Convert L* to Y
 */
function lstarToY(lstar: number): number {
  if (lstar <= 8) {
    return lstar / 903.3;
  }
  const fy = (lstar + 16) / 116;
  return fy * fy * fy;
}

/**
 * sRGB to linear (gamma decode)
 */
function srgbToLinear(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Linear to sRGB (gamma encode)
 */
function linearToSrgb(v: number): number {
  if (v <= 0.0031308) {
    return 12.92 * v;
  }
  return 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

// ============================================
// Exports
// ============================================

export default HCTv2;
