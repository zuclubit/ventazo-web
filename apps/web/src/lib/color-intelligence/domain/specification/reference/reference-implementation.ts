// ============================================
// Reference Implementation - Canonical Algorithms
// Phase 5: Standardization Layer
// ============================================

/**
 * Reference Implementations
 *
 * These are canonical, well-documented implementations of core algorithms.
 * Third-party implementations MUST produce identical results to these
 * within specified tolerances to achieve conformance certification.
 *
 * IMPORTANT: These implementations prioritize clarity and correctness
 * over performance. Production implementations may optimize but MUST
 * maintain identical outputs.
 */

// ============================================
// APCA Reference Implementation
// ============================================

/**
 * APCA (Accessible Perceptual Contrast Algorithm) Reference
 *
 * Based on: APCA 0.1.9 (2024)
 * Specification: https://github.com/Myndex/SAPC-APCA
 *
 * This is the canonical reference for APCA Lc calculations.
 */
export const APCAReferenceImplementation = {
  version: '0.1.9',

  // sRGB coefficients for relative luminance
  COEFFICIENTS: {
    R: 0.2126729,
    G: 0.7151522,
    B: 0.0721750,
  } as const,

  // APCA power curve exponents
  POWER_CURVES: {
    BLACK_BG_THRESHOLD: 0.022,
    BLACK_CLAMP: 1.414,
    NORMAL_BG_EXPONENT: 0.56,
    NORMAL_TEXT_EXPONENT: 0.57,
    REVERSE_BG_EXPONENT: 0.62,
    REVERSE_TEXT_EXPONENT: 0.65,
    LOW_CLIP: 0.001,
    OUTPUT_SCALE: 1.14,
    OUTPUT_OFFSET: 0.027,
    LOW_BOUND_THRESHOLD: 0.1,
    LOW_BOUND_FACTOR: 0,
  } as const,

  /**
   * Convert sRGB component (0-255) to linear light value
   */
  sRGBtoLinear(channel: number): number {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  },

  /**
   * Calculate relative luminance from sRGB
   * Per WCAG 2.x relative luminance definition
   */
  relativeLuminance(r: number, g: number, b: number): number {
    const Rlin = this.sRGBtoLinear(r);
    const Glin = this.sRGBtoLinear(g);
    const Blin = this.sRGBtoLinear(b);

    return (
      Rlin * this.COEFFICIENTS.R +
      Glin * this.COEFFICIENTS.G +
      Blin * this.COEFFICIENTS.B
    );
  },

  /**
   * Soft clamp function for very dark colors
   */
  softClamp(luminance: number): number {
    if (luminance < this.POWER_CURVES.BLACK_BG_THRESHOLD) {
      return (
        luminance +
        Math.pow(
          this.POWER_CURVES.BLACK_BG_THRESHOLD - luminance,
          this.POWER_CURVES.BLACK_CLAMP
        )
      );
    }
    return luminance;
  },

  /**
   * Calculate APCA Lc (Lightness Contrast) value
   *
   * @param textR - Text color red (0-255)
   * @param textG - Text color green (0-255)
   * @param textB - Text color blue (0-255)
   * @param bgR - Background color red (0-255)
   * @param bgG - Background color green (0-255)
   * @param bgB - Background color blue (0-255)
   * @returns Lc value (positive for light bg, negative for dark bg)
   */
  calculateLc(
    textR: number,
    textG: number,
    textB: number,
    bgR: number,
    bgG: number,
    bgB: number
  ): number {
    // Step 1: Get relative luminance
    const Ytext = this.relativeLuminance(textR, textG, textB);
    const Ybg = this.relativeLuminance(bgR, bgG, bgB);

    // Step 2: Soft clamp very dark colors
    const YtextC = this.softClamp(Ytext);
    const YbgC = this.softClamp(Ybg);

    // Step 3: Determine polarity and calculate SAPC
    let SAPC: number;

    if (YbgC >= YtextC) {
      // Light background, dark text (normal polarity)
      SAPC =
        (Math.pow(YbgC, this.POWER_CURVES.NORMAL_BG_EXPONENT) -
          Math.pow(YtextC, this.POWER_CURVES.NORMAL_TEXT_EXPONENT)) *
        this.POWER_CURVES.OUTPUT_SCALE;
    } else {
      // Dark background, light text (reverse polarity)
      SAPC =
        (Math.pow(YbgC, this.POWER_CURVES.REVERSE_BG_EXPONENT) -
          Math.pow(YtextC, this.POWER_CURVES.REVERSE_TEXT_EXPONENT)) *
        this.POWER_CURVES.OUTPUT_SCALE;
    }

    // Step 4: Apply output clipping and offset
    if (Math.abs(SAPC) < this.POWER_CURVES.LOW_CLIP) {
      return 0;
    }

    if (SAPC > this.POWER_CURVES.LOW_BOUND_THRESHOLD) {
      return (SAPC - this.POWER_CURVES.OUTPUT_OFFSET) * 100;
    } else if (SAPC < -this.POWER_CURVES.LOW_BOUND_THRESHOLD) {
      return (SAPC + this.POWER_CURVES.OUTPUT_OFFSET) * 100;
    }

    return SAPC * 100 - SAPC * this.POWER_CURVES.LOW_BOUND_FACTOR;
  },
};

// ============================================
// OKLCH Reference Implementation
// ============================================

/**
 * OKLCH Color Space Reference Implementation
 *
 * Based on: Oklab perceptual color space by Björn Ottosson
 * Specification: https://bottosson.github.io/posts/oklab/
 */
export const OKLCHReferenceImplementation = {
  version: '1.0.0',

  // XYZ D65 to LMS matrix
  XYZ_TO_LMS: [
    [0.8189330101, 0.3618667424, -0.1288597137],
    [0.0329845436, 0.9293118715, 0.0361456387],
    [0.0482003018, 0.2643662691, 0.6338517070],
  ] as const,

  // LMS to Oklab matrix
  LMS_TO_OKLAB: [
    [0.2104542553, 0.7936177850, -0.0040720468],
    [1.9779984951, -2.4285922050, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.8086757660],
  ] as const,

  /**
   * Convert sRGB to linear RGB
   */
  sRGBToLinear(channel: number): number {
    const normalized = channel / 255;
    if (normalized <= 0.04045) {
      return normalized / 12.92;
    }
    return Math.pow((normalized + 0.055) / 1.055, 2.4);
  },

  /**
   * Convert linear RGB to XYZ D65
   */
  linearRGBToXYZ(r: number, g: number, b: number): [number, number, number] {
    return [
      0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
      0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
      0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
    ];
  },

  /**
   * Convert XYZ to LMS (cone responses)
   */
  xyzToLMS(x: number, y: number, z: number): [number, number, number] {
    const M = this.XYZ_TO_LMS;
    return [
      M[0][0] * x + M[0][1] * y + M[0][2] * z,
      M[1][0] * x + M[1][1] * y + M[1][2] * z,
      M[2][0] * x + M[2][1] * y + M[2][2] * z,
    ];
  },

  /**
   * Convert LMS to Oklab
   */
  lmsToOklab(l: number, m: number, s: number): [number, number, number] {
    // Apply cube root
    const lp = Math.cbrt(l);
    const mp = Math.cbrt(m);
    const sp = Math.cbrt(s);

    const M = this.LMS_TO_OKLAB;
    return [
      M[0][0] * lp + M[0][1] * mp + M[0][2] * sp,
      M[1][0] * lp + M[1][1] * mp + M[1][2] * sp,
      M[2][0] * lp + M[2][1] * mp + M[2][2] * sp,
    ];
  },

  /**
   * Convert Oklab to OKLCH
   */
  oklabToOklch(L: number, a: number, b: number): { l: number; c: number; h: number } {
    const C = Math.sqrt(a * a + b * b);
    let H = Math.atan2(b, a) * (180 / Math.PI);
    if (H < 0) H += 360;

    return {
      l: L,
      c: C,
      h: C < 0.0001 ? 0 : H, // Achromatic colors have undefined hue
    };
  },

  /**
   * Convert sRGB to OKLCH
   *
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   * @returns OKLCH values { l: [0-1], c: [0-0.4], h: [0-360] }
   */
  sRGBToOKLCH(r: number, g: number, b: number): { l: number; c: number; h: number } {
    // Step 1: sRGB to linear
    const rLin = this.sRGBToLinear(r);
    const gLin = this.sRGBToLinear(g);
    const bLin = this.sRGBToLinear(b);

    // Step 2: Linear RGB to XYZ
    const [x, y, z] = this.linearRGBToXYZ(rLin, gLin, bLin);

    // Step 3: XYZ to LMS
    const [l, m, s] = this.xyzToLMS(x, y, z);

    // Step 4: LMS to Oklab
    const [L, A, B] = this.lmsToOklab(l, m, s);

    // Step 5: Oklab to OKLCH
    return this.oklabToOklch(L, A, B);
  },
};

// ============================================
// HCT Reference Implementation
// ============================================

/**
 * HCT Color Space Reference Implementation
 *
 * Based on: Material Design 3 HCT color science
 * Specification: https://material.io/blog/science-of-color-design
 *
 * HCT = Hue-Chroma-Tone (combines CAM16 hue/chroma with ZCAM tone)
 */
export const HCTReferenceImplementation = {
  version: '1.0.0',

  // CAM16 viewing conditions (standard)
  VIEWING_CONDITIONS: {
    WHITE_POINT_Y: 100,
    ADAPTING_LUMINANCE: 11.725,
    BACKGROUND_LSTAR: 50,
    SURROUND: 2,
    DISCOUNT_ILLUMINANT: false,
  } as const,

  /**
   * Calculate Y (luminance) from L* (CIELAB lightness)
   */
  yFromLstar(lstar: number): number {
    const ke = 216 / 24389; // κε
    const kappa = 24389 / 27; // κ

    if (lstar > 8) {
      return Math.pow((lstar + 16) / 116, 3) * 100;
    }
    return (lstar / kappa) * 100;
  },

  /**
   * Calculate L* (CIELAB lightness) from Y (luminance)
   */
  lstarFromY(y: number): number {
    const yNormalized = y / 100;
    const ke = 216 / 24389;
    const kappa = 24389 / 27;

    if (yNormalized > ke) {
      return 116 * Math.cbrt(yNormalized) - 16;
    }
    return kappa * yNormalized;
  },

  /**
   * Simplified tone calculation from sRGB
   * Tone in HCT corresponds to perceived lightness (0-100)
   */
  toneFromRGB(r: number, g: number, b: number): number {
    // Calculate relative luminance
    const toLinear = (c: number) => {
      const n = c / 255;
      return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };

    const Y =
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    return this.lstarFromY(Y * 100);
  },

  /**
   * Simplified chroma calculation
   * Full implementation requires CAM16, this is approximate
   */
  chromaFromRGB(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Approximate chroma based on saturation and luminance
    const luminance =
      0.299 * (r / 255) + 0.587 * (g / 255) + 0.114 * (b / 255);
    const saturation = max === 0 ? 0 : delta / max;

    // Scale to approximate CAM16 chroma range
    return saturation * luminance * 150;
  },

  /**
   * Calculate hue from sRGB
   */
  hueFromRGB(r: number, g: number, b: number): number {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    if (delta === 0) return 0;

    let h: number;
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h = h * 60;
    if (h < 0) h += 360;

    return h;
  },

  /**
   * Convert sRGB to HCT
   *
   * @param r - Red (0-255)
   * @param g - Green (0-255)
   * @param b - Blue (0-255)
   * @returns HCT values { h: [0-360], c: [0-150], t: [0-100] }
   */
  sRGBToHCT(
    r: number,
    g: number,
    b: number
  ): { h: number; c: number; t: number } {
    return {
      h: this.hueFromRGB(r, g, b),
      c: this.chromaFromRGB(r, g, b),
      t: this.toneFromRGB(r, g, b),
    };
  },
};

// ============================================
// WCAG 2.1 Contrast Reference Implementation
// ============================================

/**
 * WCAG 2.1 Contrast Ratio Reference Implementation
 *
 * Based on: WCAG 2.1 Success Criterion 1.4.3 & 1.4.6
 * Specification: https://www.w3.org/TR/WCAG21/
 */
export const WCAG21ReferenceImplementation = {
  version: '2.1',

  THRESHOLDS: {
    AA_NORMAL: 4.5,
    AA_LARGE: 3.0,
    AAA_NORMAL: 7.0,
    AAA_LARGE: 4.5,
    LARGE_TEXT_SIZE: 18, // px (or 14px bold)
    LARGE_TEXT_SIZE_BOLD: 14,
  } as const,

  /**
   * Calculate relative luminance
   */
  relativeLuminance(r: number, g: number, b: number): number {
    const toLinear = (c: number) => {
      const n = c / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    };

    return (
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
    );
  },

  /**
   * Calculate contrast ratio
   * @returns Contrast ratio (1-21)
   */
  contrastRatio(
    fgR: number,
    fgG: number,
    fgB: number,
    bgR: number,
    bgG: number,
    bgB: number
  ): number {
    const L1 = this.relativeLuminance(fgR, fgG, fgB);
    const L2 = this.relativeLuminance(bgR, bgG, bgB);

    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);

    return (lighter + 0.05) / (darker + 0.05);
  },

  /**
   * Check WCAG 2.1 compliance
   */
  checkCompliance(
    contrastRatio: number,
    fontSize: number,
    fontWeight: number
  ): { aa: boolean; aaa: boolean } {
    const isLargeText =
      fontSize >= this.THRESHOLDS.LARGE_TEXT_SIZE ||
      (fontSize >= this.THRESHOLDS.LARGE_TEXT_SIZE_BOLD && fontWeight >= 700);

    return {
      aa: contrastRatio >= (isLargeText ? this.THRESHOLDS.AA_LARGE : this.THRESHOLDS.AA_NORMAL),
      aaa: contrastRatio >= (isLargeText ? this.THRESHOLDS.AAA_LARGE : this.THRESHOLDS.AAA_NORMAL),
    };
  },
};

// ============================================
// Exports
// ============================================

export const REFERENCE_IMPLEMENTATIONS = {
  apca: APCAReferenceImplementation,
  oklch: OKLCHReferenceImplementation,
  hct: HCTReferenceImplementation,
  wcag21: WCAG21ReferenceImplementation,
} as const;

export type ReferenceImplementationType = keyof typeof REFERENCE_IMPLEMENTATIONS;
