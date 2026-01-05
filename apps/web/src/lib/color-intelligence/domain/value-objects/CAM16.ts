// ============================================
// CAM16 Color Appearance Model
// CIE 248:2022 / CIECAM16 Implementation
// ============================================
//
// Reference Implementation based on:
// - CIE 248:2022 "The CIE 2016 Colour Appearance Model for Colour Management Systems"
// - Li, C., et al. (2017). "Comprehensive color solutions: CAM16, CAT16, and CAM16-UCS"
//   Color Research & Application, 42(6), 703-718. DOI: 10.1002/col.22131
// - Material Design Color Utilities: github.com/material-foundation/material-color-utilities
// - Observable: observablehq.com/@jrus/cam16
//
// @immutable
// ============================================

import type {
  Cam16Hue,
  Cam16Chroma,
  Cam16Lightness,
  Cam16Brightness,
  Cam16Colorfulness,
  Cam16Saturation,
  ArgbInt,
} from '../types/branded';

import {
  cam16Hue,
  cam16Chroma,
  cam16Lightness,
  cam16Brightness,
  cam16Colorfulness,
  cam16Saturation,
  argbInt,
} from '../types/branded';

// ============================================
// CAM16 Viewing Conditions
// ============================================

/**
 * Viewing conditions that affect color appearance
 * Default values correspond to sRGB standard viewing conditions
 */
export interface ViewingConditions {
  /** Adapting luminance (cd/m²), typically 64 for sRGB */
  readonly adaptingLuminance: number;
  /** Background relative luminance (Y_b / Y_w), typically 0.2 */
  readonly backgroundLuminance: number;
  /** Surround: 'dark' | 'dim' | 'average' */
  readonly surround: 'dark' | 'dim' | 'average';
  /** Degree of chromatic adaptation (0-1), null = auto-compute */
  readonly discounting: number | null;
}

/**
 * Pre-computed viewing condition parameters
 * Computed once for efficiency in repeated conversions
 */
export interface ViewingConditionParams {
  readonly n: number;
  readonly aw: number;
  readonly nbb: number;
  readonly ncb: number;
  readonly c: number;
  readonly nc: number;
  readonly fl: number;
  readonly flRoot: number;
  readonly z: number;
  readonly rgbD: readonly [number, number, number];
}

// ============================================
// CAM16 Constants (CIE 2016)
// ============================================

/**
 * CAT16 chromatic adaptation matrix (M16)
 * Transforms XYZ to 'sharpened' cone responses
 * From Li et al. 2017, Table 1
 */
const M16: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
] = [
  [0.401288, 0.650173, -0.051461],
  [-0.250268, 1.204414, 0.045854],
  [-0.002079, 0.048952, 0.953127],
];

/**
 * Inverse CAT16 matrix (M16^-1)
 * High precision for round-trip accuracy
 */
const M16_INV: readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number]
] = [
  [1.8620678550535, -1.0112546305316, 0.14918677544446],
  [0.38752654323828, 0.62144744540696, -0.0089739860070771],
  [-0.015841498849333, -0.034122939407376, 1.0499644368778],
];

/**
 * D65 white point XYZ values (2° observer)
 */
const WHITE_POINT_D65 = {
  X: 95.047,
  Y: 100.0,
  Z: 108.883,
} as const;

/**
 * Surround condition coefficients
 * From CIE 248:2022, Table 1
 */
const SURROUND_COEFFICIENTS = {
  dark: { c: 0.525, Nc: 0.8, F: 0.8 },
  dim: { c: 0.59, Nc: 0.9, F: 0.9 },
  average: { c: 0.69, Nc: 1.0, F: 1.0 },
} as const;

// ============================================
// CAM16 Perceptual Correlates Interface
// ============================================

/**
 * Complete set of CAM16 perceptual correlates
 */
export interface CAM16Correlates {
  /** Hue angle (0-360°) */
  readonly h: Cam16Hue;
  /** Chroma (colorfulness relative to white) */
  readonly C: Cam16Chroma;
  /** Lightness (0-100) */
  readonly J: Cam16Lightness;
  /** Brightness (absolute) */
  readonly Q: Cam16Brightness;
  /** Colorfulness (absolute) */
  readonly M: Cam16Colorfulness;
  /** Saturation (chroma relative to brightness) */
  readonly s: Cam16Saturation;
}

/**
 * CAM16-UCS coordinates for uniform color space
 */
export interface CAM16UCS {
  /** UCS Lightness (J') */
  readonly Jstar: number;
  /** UCS a* (red-green) */
  readonly astar: number;
  /** UCS b* (yellow-blue) */
  readonly bstar: number;
}

// ============================================
// CAM16 Value Object
// ============================================

/**
 * CAM16 Color Appearance Model Value Object
 *
 * Represents a color's appearance under specific viewing conditions.
 * Provides all perceptual correlates defined by CIE 2016.
 *
 * Key Features:
 * - Perceptually uniform hue (fixes CIECAM02 blue/purple problems)
 * - Accurate lightness and chroma correlates
 * - CAM16-UCS for color difference calculations
 * - Viewing condition adaptation
 *
 * @example
 * ```typescript
 * // From ARGB
 * const cam16 = CAM16.fromArgb(0xFF0088FF);
 *
 * // From hex
 * const cam16 = CAM16.fromHex('#0088FF');
 *
 * // From JCh
 * const cam16 = CAM16.fromJCh(50, 60, 240);
 *
 * // Get correlates
 * console.log(cam16.h, cam16.C, cam16.J);
 *
 * // Color difference
 * const dE = cam16.deltaE(otherCam16);
 * ```
 *
 * @immutable
 */
export class CAM16 {
  // Core correlates
  private readonly _h: Cam16Hue;
  private readonly _C: Cam16Chroma;
  private readonly _J: Cam16Lightness;
  private readonly _Q: Cam16Brightness;
  private readonly _M: Cam16Colorfulness;
  private readonly _s: Cam16Saturation;

  // UCS coordinates (lazy computed)
  private _ucs: CAM16UCS | null = null;

  // Viewing conditions used
  private readonly _vc: ViewingConditionParams;

  // ============================================
  // Constructor (Private)
  // ============================================

  private constructor(
    h: number,
    C: number,
    J: number,
    Q: number,
    M: number,
    s: number,
    vc: ViewingConditionParams
  ) {
    this._h = cam16Hue.create(h);
    this._C = cam16Chroma.create(C);
    this._J = cam16Lightness.clamp(J);
    this._Q = cam16Brightness.create(Q);
    this._M = cam16Colorfulness.create(M);
    this._s = cam16Saturation.clamp(s);
    this._vc = vc;
  }

  // ============================================
  // Getters
  // ============================================

  /** Hue angle (0-360°) */
  get h(): Cam16Hue { return this._h; }

  /** Chroma (colorfulness relative to white, 0-~150) */
  get C(): Cam16Chroma { return this._C; }

  /** Lightness (0-100) */
  get J(): Cam16Lightness { return this._J; }

  /** Brightness (absolute, viewing-condition dependent) */
  get Q(): Cam16Brightness { return this._Q; }

  /** Colorfulness (absolute, 0-~150) */
  get M(): Cam16Colorfulness { return this._M; }

  /** Saturation (0-100) */
  get s(): Cam16Saturation { return this._s; }

  /** All correlates as object */
  get correlates(): CAM16Correlates {
    return {
      h: this._h,
      C: this._C,
      J: this._J,
      Q: this._Q,
      M: this._M,
      s: this._s,
    };
  }

  /** CAM16-UCS coordinates */
  get ucs(): CAM16UCS {
    if (!this._ucs) {
      this._ucs = this.computeUCS();
    }
    return this._ucs;
  }

  /** Viewing condition parameters used */
  get viewingConditions(): ViewingConditionParams {
    return this._vc;
  }

  // ============================================
  // Factory Methods: From Color Spaces
  // ============================================

  /**
   * Create CAM16 from ARGB integer
   * @param argb 32-bit ARGB color (alpha in high byte)
   * @param vc Optional viewing conditions (defaults to sRGB standard)
   */
  static fromArgb(
    argb: number | ArgbInt,
    vc?: Partial<ViewingConditions>
  ): CAM16 {
    const vcParams = computeViewingConditionParams(vc);
    const { r, g, b } = argbInt.toRgb(argb as ArgbInt);

    // sRGB to linear RGB
    const linR = srgbToLinear(r / 255);
    const linG = srgbToLinear(g / 255);
    const linB = srgbToLinear(b / 255);

    // Linear RGB to XYZ (sRGB matrix)
    const X = linR * 41.23865632529916 + linG * 35.75914909206253 + linB * 18.04517108472749;
    const Y = linR * 21.26368216773238 + linG * 71.51829818412506 + linB * 7.218019648142547;
    const Z = linR * 1.9330620152483982 + linG * 11.919716364020843 + linB * 95.03725870054352;

    return CAM16.fromXyz(X, Y, Z, vcParams);
  }

  /**
   * Create CAM16 from hex string
   */
  static fromHex(hex: string, vc?: Partial<ViewingConditions>): CAM16 | null {
    try {
      const argb = argbInt.fromHex(hex);
      return CAM16.fromArgb(argb, vc);
    } catch {
      return null;
    }
  }

  /**
   * Create CAM16 from XYZ tristimulus values
   * Core forward transform implementation
   */
  static fromXyz(
    X: number,
    Y: number,
    Z: number,
    vcParams?: ViewingConditionParams
  ): CAM16 {
    const vc = vcParams ?? computeViewingConditionParams();

    // Step 1: XYZ to cone responses via CAT16 (M16 matrix)
    const rC = M16[0][0] * X + M16[0][1] * Y + M16[0][2] * Z;
    const gC = M16[1][0] * X + M16[1][1] * Y + M16[1][2] * Z;
    const bC = M16[2][0] * X + M16[2][1] * Y + M16[2][2] * Z;

    // Step 2: Chromatic adaptation
    const rD = vc.rgbD[0] * rC;
    const gD = vc.rgbD[1] * gC;
    const bD = vc.rgbD[2] * bC;

    // Step 3: Nonlinear response compression (Hunt-Pointer-Estevez)
    const rA = adaptResponse(rD, vc.fl);
    const gA = adaptResponse(gD, vc.fl);
    const bA = adaptResponse(bD, vc.fl);

    // Step 4: Calculate preliminary quantities
    const a = rA + (-12 * gA + bA) / 11;
    const b = (rA + gA - 2 * bA) / 9;

    // Step 5: Hue angle
    let h = Math.atan2(b, a) * (180 / Math.PI);
    if (h < 0) h += 360;

    // Step 6: Eccentricity factor and hue quadrature (simplified)
    const hRad = h * (Math.PI / 180);
    const et = 0.25 * (Math.cos(hRad + 2) + 3.8);

    // Step 7: Achromatic response
    const A = vc.nbb * (2 * rA + gA + 0.05 * bA);

    // Step 8: Lightness (J)
    const J = 100 * Math.pow(A / vc.aw, vc.c * vc.z);

    // Step 9: Brightness (Q)
    const Q = (4 / vc.c) * Math.sqrt(J / 100) * (vc.aw + 4) * vc.flRoot;

    // Step 10: Chroma (C) via t
    const t = (50000 / 13) * vc.nc * vc.ncb * et * Math.sqrt(a * a + b * b) / (rA + gA + 21 * bA / 20);
    const alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, vc.n), 0.73);
    const C = alpha * Math.sqrt(J / 100);

    // Step 11: Colorfulness (M)
    const M = C * vc.flRoot;

    // Step 12: Saturation (s)
    const s = 50 * Math.sqrt((vc.c * alpha) / (vc.aw + 4));

    return new CAM16(h, C, J, Q, M, s, vc);
  }

  /**
   * Create CAM16 from JCh (Lightness, Chroma, Hue)
   * Inverse transform from perceptual coordinates
   */
  static fromJCh(
    J: number,
    C: number,
    h: number,
    vc?: Partial<ViewingConditions>
  ): CAM16 {
    const vcParams = computeViewingConditionParams(vc);

    // Clamp inputs
    J = Math.max(0, Math.min(100, J));
    C = Math.max(0, C);
    h = ((h % 360) + 360) % 360;

    // Handle achromatic case
    if (C < 0.0001 || J < 0.0001) {
      return new CAM16(h, 0, J, 0, 0, 0, vcParams);
    }

    // Derive other correlates
    const alpha = C / Math.sqrt(J / 100);
    const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, vcParams.n), 0.73), 1 / 0.9);

    const Q = (4 / vcParams.c) * Math.sqrt(J / 100) * (vcParams.aw + 4) * vcParams.flRoot;
    const M = C * vcParams.flRoot;
    const s = 50 * Math.sqrt((vcParams.c * alpha) / (vcParams.aw + 4));

    return new CAM16(h, C, J, Q, M, s, vcParams);
  }

  /**
   * Create CAM16 from CAM16-UCS coordinates
   */
  static fromUcs(
    Jstar: number,
    astar: number,
    bstar: number,
    vc?: Partial<ViewingConditions>
  ): CAM16 {
    const vcParams = computeViewingConditionParams(vc);

    // Inverse UCS transform
    const J = Jstar / (1 + (100 - Jstar) * 0.007);

    // Handle achromatic
    if (Math.abs(astar) < 0.0001 && Math.abs(bstar) < 0.0001) {
      return CAM16.fromJCh(J, 0, 0, vc);
    }

    // Hue from UCS coordinates
    let h = Math.atan2(bstar, astar) * (180 / Math.PI);
    if (h < 0) h += 360;

    // M from UCS
    const Mstar = Math.sqrt(astar * astar + bstar * bstar);
    const M = (Math.exp(0.0228 * Mstar) - 1) / 0.0228;

    // C from M
    const C = M / vcParams.flRoot;

    return CAM16.fromJCh(J, C, h, vc);
  }

  // ============================================
  // Conversion Methods: To Color Spaces
  // ============================================

  /**
   * Convert to ARGB integer
   * Inverse CAM16 transform
   */
  toArgb(): ArgbInt {
    // Handle black
    if (this._J < 0.0001) {
      return 0xff000000 as ArgbInt;
    }

    // Handle achromatic
    const hRad = (this._h as number) * (Math.PI / 180);

    // Compute t from alpha
    const alpha = this._C / Math.sqrt(this._J / 100);

    // Handle near-achromatic
    if (alpha < 0.0001) {
      // Achromatic color
      const gray = jToY(this._J, this._vc) * 255;
      const g = Math.round(Math.max(0, Math.min(255, gray)));
      return argbInt.fromRgb(g as any, g as any, g as any);
    }

    const t = Math.pow(alpha / Math.pow(1.64 - Math.pow(0.29, this._vc.n), 0.73), 1 / 0.9);

    // Eccentricity
    const et = 0.25 * (Math.cos(hRad + 2) + 3.8);

    // Achromatic response
    const A = this._vc.aw * Math.pow(this._J / 100, 1 / (this._vc.c * this._vc.z));

    // p1, p2 for cone response calculation
    const p1 = (50000 / 13) * this._vc.nc * this._vc.ncb * et / t;
    const p2 = A / this._vc.nbb;

    const cos_h = Math.cos(hRad);
    const sin_h = Math.sin(hRad);

    // Solve for rA, gA, bA
    const gamma = 23 * (p2 + 0.305) * t / (23 * p1 + 11 * t * cos_h + 108 * t * sin_h);
    const a = gamma * cos_h;
    const b = gamma * sin_h;

    const rA = (460 * p2 + 451 * a + 288 * b) / 1403;
    const gA = (460 * p2 - 891 * a - 261 * b) / 1403;
    const bA = (460 * p2 - 220 * a - 6300 * b) / 1403;

    // Inverse adaptation
    const rD = unadaptResponse(rA, this._vc.fl);
    const gD = unadaptResponse(gA, this._vc.fl);
    const bD = unadaptResponse(bA, this._vc.fl);

    // Inverse chromatic adaptation
    const rC = rD / this._vc.rgbD[0];
    const gC = gD / this._vc.rgbD[1];
    const bC = bD / this._vc.rgbD[2];

    // Cone responses to XYZ (inverse M16)
    const X = M16_INV[0][0] * rC + M16_INV[0][1] * gC + M16_INV[0][2] * bC;
    const Y = M16_INV[1][0] * rC + M16_INV[1][1] * gC + M16_INV[1][2] * bC;
    const Z = M16_INV[2][0] * rC + M16_INV[2][1] * gC + M16_INV[2][2] * bC;

    // XYZ to linear RGB
    const linR = X * 0.032404541621141 + Y * -0.015371385940258 + Z * -0.004985314095560;
    const linG = X * -0.009692660305051 + Y * 0.018760108454466 + Z * 0.000415560175303;
    const linB = X * 0.000556434224848 + Y * -0.002040259135167 + Z * 0.010572251882231;

    // Linear to sRGB
    const r = Math.round(linearToSrgb(linR) * 255);
    const g = Math.round(linearToSrgb(linG) * 255);
    const bVal = Math.round(linearToSrgb(linB) * 255);

    // Clamp to valid range
    const rClamped = Math.max(0, Math.min(255, r));
    const gClamped = Math.max(0, Math.min(255, g));
    const bClamped = Math.max(0, Math.min(255, bVal));

    return argbInt.fromRgb(rClamped as any, gClamped as any, bClamped as any);
  }

  /**
   * Convert to hex string
   */
  toHex(): string {
    return argbInt.toHex(this.toArgb());
  }

  /**
   * Convert to XYZ
   */
  toXyz(): { X: number; Y: number; Z: number } {
    const argb = this.toArgb();
    const { r, g, b } = argbInt.toRgb(argb);

    const linR = srgbToLinear(r / 255);
    const linG = srgbToLinear(g / 255);
    const linB = srgbToLinear(b / 255);

    return {
      X: linR * 41.23865632529916 + linG * 35.75914909206253 + linB * 18.04517108472749,
      Y: linR * 21.26368216773238 + linG * 71.51829818412506 + linB * 7.218019648142547,
      Z: linR * 1.9330620152483982 + linG * 11.919716364020843 + linB * 95.03725870054352,
    };
  }

  // ============================================
  // CAM16-UCS Operations
  // ============================================

  /**
   * Compute CAM16-UCS coordinates
   */
  private computeUCS(): CAM16UCS {
    // UCS Lightness
    const Jstar = (1 + 100 * 0.007) * this._J / (1 + 0.007 * this._J);

    // UCS Colorfulness
    const Mstar = (1 / 0.0228) * Math.log(1 + 0.0228 * this._M);

    // UCS a*, b*
    const hRad = (this._h as number) * (Math.PI / 180);
    const astar = Mstar * Math.cos(hRad);
    const bstar = Mstar * Math.sin(hRad);

    return { Jstar, astar, bstar };
  }

  /**
   * Calculate CAM16-UCS color difference (ΔE)
   * Based on Li et al. 2017, Eq. 9
   */
  deltaE(other: CAM16): number {
    const ucs1 = this.ucs;
    const ucs2 = other.ucs;

    const dJ = ucs1.Jstar - ucs2.Jstar;
    const da = ucs1.astar - ucs2.astar;
    const db = ucs1.bstar - ucs2.bstar;

    const dEPrime = Math.sqrt(dJ * dJ + da * da + db * db);

    // Apply power function for perceptual uniformity
    return 1.41 * Math.pow(dEPrime, 0.63);
  }

  /**
   * Check if two colors are perceptually similar
   * @param threshold Default 2.3 (just noticeable difference)
   */
  isSimilar(other: CAM16, threshold: number = 2.3): boolean {
    return this.deltaE(other) <= threshold;
  }

  // ============================================
  // Transformations
  // ============================================

  /**
   * Create variant with new lightness
   */
  withLightness(J: number): CAM16 {
    return CAM16.fromJCh(J, this._C, this._h, undefined);
  }

  /**
   * Create variant with new chroma
   */
  withChroma(C: number): CAM16 {
    return CAM16.fromJCh(this._J, C, this._h, undefined);
  }

  /**
   * Create variant with new hue
   */
  withHue(h: number): CAM16 {
    return CAM16.fromJCh(this._J, this._C, h, undefined);
  }

  /**
   * Adjust chroma while maintaining gamut
   * Uses binary search to find maximum achievable chroma
   */
  maximizeChroma(): CAM16 {
    let low = 0;
    let high = 200;
    let best = this._C as number;

    for (let i = 0; i < 16; i++) {
      const mid = (low + high) / 2;
      const test = CAM16.fromJCh(this._J, mid, this._h);
      const argb = test.toArgb();
      const { r, g, b } = argbInt.toRgb(argb);

      // Check if in gamut
      const inGamut = r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;

      // Verify round-trip accuracy
      const roundTrip = CAM16.fromArgb(argb);
      const accurate = Math.abs(roundTrip.J - test.J) < 2;

      if (inGamut && accurate) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    return CAM16.fromJCh(this._J, best, this._h);
  }

  /**
   * View this color under different conditions
   */
  viewed(newVc: Partial<ViewingConditions>): CAM16 {
    // Get XYZ of current color
    const xyz = this.toXyz();

    // Recompute under new viewing conditions
    const vcParams = computeViewingConditionParams(newVc);
    return CAM16.fromXyz(xyz.X, xyz.Y, xyz.Z, vcParams);
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Interpolate between two CAM16 colors
   * Uses CAM16-UCS for perceptual uniformity
   */
  static interpolate(c1: CAM16, c2: CAM16, t: number): CAM16 {
    t = Math.max(0, Math.min(1, t));

    const ucs1 = c1.ucs;
    const ucs2 = c2.ucs;

    const Jstar = ucs1.Jstar + t * (ucs2.Jstar - ucs1.Jstar);
    const astar = ucs1.astar + t * (ucs2.astar - ucs1.astar);
    const bstar = ucs1.bstar + t * (ucs2.bstar - ucs1.bstar);

    return CAM16.fromUcs(Jstar, astar, bstar);
  }

  /**
   * Get standard sRGB viewing conditions
   */
  static get standardViewingConditions(): ViewingConditionParams {
    return computeViewingConditionParams();
  }

  /**
   * Compute viewing condition parameters
   */
  static computeViewingConditions(vc?: Partial<ViewingConditions>): ViewingConditionParams {
    return computeViewingConditionParams(vc);
  }
}

// ============================================
// Internal Helper Functions
// ============================================

/**
 * Compute viewing condition parameters from user input
 */
function computeViewingConditionParams(
  vc?: Partial<ViewingConditions>
): ViewingConditionParams {
  // Defaults: sRGB standard viewing conditions
  const La = vc?.adaptingLuminance ?? 64;
  const Yb = vc?.backgroundLuminance ?? 0.2;
  const surround = vc?.surround ?? 'average';
  const discounting = vc?.discounting ?? null;

  const surroundCoeff = SURROUND_COEFFICIENTS[surround];
  const c = surroundCoeff.c;
  const Nc = surroundCoeff.Nc;
  const F = surroundCoeff.F;

  // Compute degree of adaptation D
  let D: number;
  if (discounting !== null) {
    D = discounting;
  } else {
    D = F * (1 - (1 / 3.6) * Math.exp((-La - 42) / 92));
    D = Math.max(0, Math.min(1, D));
  }

  // White point cone responses
  const rwC = M16[0][0] * WHITE_POINT_D65.X + M16[0][1] * WHITE_POINT_D65.Y + M16[0][2] * WHITE_POINT_D65.Z;
  const gwC = M16[1][0] * WHITE_POINT_D65.X + M16[1][1] * WHITE_POINT_D65.Y + M16[1][2] * WHITE_POINT_D65.Z;
  const bwC = M16[2][0] * WHITE_POINT_D65.X + M16[2][1] * WHITE_POINT_D65.Y + M16[2][2] * WHITE_POINT_D65.Z;

  // Chromatic adaptation factors
  const rgbD: [number, number, number] = [
    D * (WHITE_POINT_D65.Y / rwC) + 1 - D,
    D * (WHITE_POINT_D65.Y / gwC) + 1 - D,
    D * (WHITE_POINT_D65.Y / bwC) + 1 - D,
  ];

  // Luminance adaptation
  const k = 1 / (5 * La + 1);
  const k4 = k * k * k * k;
  const fl = k4 * La + 0.1 * (1 - k4) * (1 - k4) * Math.cbrt(5 * La);
  const flRoot = Math.pow(fl, 0.25);

  // Background n factor
  const n = Yb / WHITE_POINT_D65.Y;
  const z = 1.48 + Math.sqrt(n);

  // Nbb, Ncb factors
  const nbb = 0.725 * Math.pow(1 / n, 0.2);
  const ncb = nbb;

  // Achromatic response of white
  const rwD = rgbD[0] * rwC;
  const gwD = rgbD[1] * gwC;
  const bwD = rgbD[2] * bwC;

  const rwA = adaptResponse(rwD, fl);
  const gwA = adaptResponse(gwD, fl);
  const bwA = adaptResponse(bwD, fl);

  const aw = nbb * (2 * rwA + gwA + 0.05 * bwA);

  return {
    n,
    aw,
    nbb,
    ncb,
    c,
    nc: Nc,
    fl,
    flRoot,
    z,
    rgbD,
  };
}

/**
 * Nonlinear response compression (forward)
 */
function adaptResponse(component: number, fl: number): number {
  const abs = Math.abs(component);
  const x = Math.pow(fl * abs / 100, 0.42);
  return Math.sign(component) * 400 * x / (x + 27.13);
}

/**
 * Inverse of nonlinear response compression
 */
function unadaptResponse(adapted: number, fl: number): number {
  const abs = Math.abs(adapted);
  const x = 27.13 * abs / (400 - abs);
  return Math.sign(adapted) * 100 / fl * Math.pow(x, 1 / 0.42);
}

/**
 * Convert J (CAM16 lightness) to Y (luminance)
 */
function jToY(J: number, vc: ViewingConditionParams): number {
  return 100 * Math.pow(J / 100, 1 / (vc.c * vc.z));
}

/**
 * sRGB to linear RGB (gamma decode)
 */
function srgbToLinear(v: number): number {
  if (v <= 0.04045) {
    return v / 12.92;
  }
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Linear RGB to sRGB (gamma encode)
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

export default CAM16;
