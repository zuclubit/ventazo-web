// ============================================
// Branded Types for Color Intelligence Domain
// Nominal Typing for Type-Safe Color Values
// ============================================
//
// Reference: TypeScript Nominal Typing Patterns
// @see https://basarat.gitbook.io/typescript/main-1/nominaltyping
// @see https://effect.website/docs/code-style/branded-types/
//
// Purpose: Prevent accidental mixing of structurally identical
// but semantically different color values (e.g., Lightness vs Tone)
// ============================================

/**
 * Brand symbol for nominal typing
 * Uses unique symbol to ensure type uniqueness at compile time
 */
declare const BRAND: unique symbol;

/**
 * Generic Brand type
 * Creates a branded type from a base type K with brand T
 */
export type Brand<K, T extends string> = K & { readonly [BRAND]: T };

// ============================================
// OKLCH Color Space Branded Types
// ============================================

/**
 * OKLCH Lightness (L)
 * - Range: 0.0 - 1.0
 * - 0 = black, 1 = white
 * - Perceptually uniform scale
 */
export type OklchLightness = Brand<number, 'OklchLightness'>;

/**
 * OKLCH Chroma (C)
 * - Range: 0.0 - ~0.4 (in gamut for sRGB)
 * - 0 = achromatic (gray), higher = more colorful
 * - Maximum varies by hue and lightness
 */
export type OklchChroma = Brand<number, 'OklchChroma'>;

/**
 * OKLCH Hue (H)
 * - Range: 0 - 360 degrees
 * - Perceptually uniform hue circle
 * - 0/360 = magenta-red
 */
export type OklchHue = Brand<number, 'OklchHue'>;

// ============================================
// HCT Color Space Branded Types
// ============================================

/**
 * HCT/CAM16 Hue
 * - Range: 0 - 360 degrees
 * - Perceptually uniform (CAM16-derived)
 * - Similar to OKLCH hue but CAM16-based
 */
export type Cam16Hue = Brand<number, 'Cam16Hue'>;

/**
 * HCT/CAM16 Chroma
 * - Range: 0 - ~150 (varies significantly by hue)
 * - Higher values than OKLCH due to different scaling
 */
export type Cam16Chroma = Brand<number, 'Cam16Chroma'>;

/**
 * HCT Tone (T) - CIE L* derived
 * - Range: 0 - 100
 * - 0 = black, 100 = white
 * - Key property: tone difference predicts contrast ratio
 *   - ΔT ≥ 40 → WCAG AA guaranteed
 *   - ΔT ≥ 50 → WCAG AAA approximately guaranteed
 */
export type HctTone = Brand<number, 'HctTone'>;

// ============================================
// CAM16 Perceptual Correlates
// ============================================

/**
 * CAM16 Lightness (J)
 * - Range: 0 - 100
 * - Perceptual lightness correlate
 */
export type Cam16Lightness = Brand<number, 'Cam16Lightness'>;

/**
 * CAM16 Brightness (Q)
 * - Range: 0 - ~300 (viewing condition dependent)
 * - Absolute brightness correlate
 */
export type Cam16Brightness = Brand<number, 'Cam16Brightness'>;

/**
 * CAM16 Colorfulness (M)
 * - Range: 0 - ~150
 * - Absolute colorfulness (not relative to white)
 */
export type Cam16Colorfulness = Brand<number, 'Cam16Colorfulness'>;

/**
 * CAM16 Saturation (s)
 * - Range: 0 - 100
 * - Chroma relative to brightness
 */
export type Cam16Saturation = Brand<number, 'Cam16Saturation'>;

// ============================================
// CIE Lab Branded Types
// ============================================

/**
 * CIE L* (Lightness)
 * - Range: 0 - 100
 * - Perceptually uniform lightness
 * - Used as 'Tone' in HCT
 */
export type CieLabL = Brand<number, 'CieLabL'>;

/**
 * CIE a* (Green-Red axis)
 * - Range: ~-128 to +128
 * - Negative = green, Positive = red
 */
export type CieLabA = Brand<number, 'CieLabA'>;

/**
 * CIE b* (Blue-Yellow axis)
 * - Range: ~-128 to +128
 * - Negative = blue, Positive = yellow
 */
export type CieLabB = Brand<number, 'CieLabB'>;

// ============================================
// Contrast/Accessibility Branded Types
// ============================================

/**
 * WCAG 2.1 Contrast Ratio
 * - Range: 1 - 21
 * - 1:1 = no contrast, 21:1 = maximum (black/white)
 */
export type WcagContrastRatio = Brand<number, 'WcagContrastRatio'>;

/**
 * APCA Lightness Contrast (Lc)
 * - Range: -108 to +106
 * - Sign indicates polarity (dark on light vs light on dark)
 * - |Lc| ≥ 60 recommended for body text
 */
export type ApcaLc = Brand<number, 'ApcaLc'>;

/**
 * APCA Absolute Lc (unsigned)
 * - Range: 0 - 108
 * - Absolute value of APCA Lc
 */
export type ApcaAbsoluteLc = Brand<number, 'ApcaAbsoluteLc'>;

// ============================================
// Color Component Branded Types (Generic)
// ============================================

/**
 * Normalized value (0-1 range)
 */
export type Normalized = Brand<number, 'Normalized'>;

/**
 * Percentage value (0-100 range)
 */
export type Percentage = Brand<number, 'Percentage'>;

/**
 * Degrees (0-360 range)
 */
export type Degrees = Brand<number, 'Degrees'>;

/**
 * sRGB channel value (0-255 range)
 */
export type SrgbChannel = Brand<number, 'SrgbChannel'>;

/**
 * Linear RGB channel value (0-1 range, gamma decoded)
 */
export type LinearRgbChannel = Brand<number, 'LinearRgbChannel'>;

/**
 * ARGB integer (32-bit packed color)
 */
export type ArgbInt = Brand<number, 'ArgbInt'>;

// ============================================
// Factory Functions (Runtime Branding)
// ============================================

/**
 * Create branded type with validation
 */
function createBranded<T extends number>(
  value: number,
  validate: (v: number) => boolean,
  name: string
): T {
  if (!validate(value)) {
    throw new RangeError(`Invalid ${name}: ${value}`);
  }
  return value as T;
}

/**
 * Create branded type with clamping (no throw)
 */
function createBrandedClamped<T extends number>(
  value: number,
  min: number,
  max: number
): T {
  return Math.max(min, Math.min(max, value)) as T;
}

// ============================================
// OKLCH Factory Functions
// ============================================

export const oklchLightness = {
  /**
   * Create with validation (throws on invalid)
   */
  create(value: number): OklchLightness {
    return createBranded<OklchLightness>(
      value,
      v => v >= 0 && v <= 1,
      'OklchLightness'
    );
  },

  /**
   * Create with clamping (never throws)
   */
  clamp(value: number): OklchLightness {
    return createBrandedClamped<OklchLightness>(value, 0, 1);
  },

  /**
   * Unsafe cast (for internal use when validity is guaranteed)
   */
  unsafe(value: number): OklchLightness {
    return value as OklchLightness;
  },

  /**
   * Check if value is valid
   */
  isValid(value: number): boolean {
    return value >= 0 && value <= 1;
  },
};

export const oklchChroma = {
  create(value: number): OklchChroma {
    return createBranded<OklchChroma>(
      value,
      v => v >= 0,
      'OklchChroma'
    );
  },

  clamp(value: number): OklchChroma {
    return Math.max(0, value) as OklchChroma;
  },

  unsafe(value: number): OklchChroma {
    return value as OklchChroma;
  },

  isValid(value: number): boolean {
    return value >= 0;
  },
};

export const oklchHue = {
  create(value: number): OklchHue {
    // Normalize to 0-360 range
    const normalized = ((value % 360) + 360) % 360;
    return normalized as OklchHue;
  },

  unsafe(value: number): OklchHue {
    return value as OklchHue;
  },

  /**
   * Normalize hue to 0-360 range
   */
  normalize(value: number): OklchHue {
    return ((value % 360) + 360) % 360 as OklchHue;
  },
};

// ============================================
// HCT Factory Functions
// ============================================

export const hctTone = {
  create(value: number): HctTone {
    return createBranded<HctTone>(
      value,
      v => v >= 0 && v <= 100,
      'HctTone'
    );
  },

  clamp(value: number): HctTone {
    return createBrandedClamped<HctTone>(value, 0, 100);
  },

  unsafe(value: number): HctTone {
    return value as HctTone;
  },

  isValid(value: number): boolean {
    return value >= 0 && value <= 100;
  },

  /**
   * Calculate tone difference
   * Key property of HCT: predicts contrast ratio
   */
  difference(a: HctTone, b: HctTone): number {
    return Math.abs(a - b);
  },

  /**
   * Check if tone difference meets WCAG AA
   */
  meetsAA(a: HctTone, b: HctTone): boolean {
    return Math.abs(a - b) >= 40;
  },

  /**
   * Check if tone difference meets WCAG AAA
   */
  meetsAAA(a: HctTone, b: HctTone): boolean {
    return Math.abs(a - b) >= 50;
  },
};

export const cam16Hue = {
  create(value: number): Cam16Hue {
    const normalized = ((value % 360) + 360) % 360;
    return normalized as Cam16Hue;
  },

  unsafe(value: number): Cam16Hue {
    return value as Cam16Hue;
  },

  normalize(value: number): Cam16Hue {
    return ((value % 360) + 360) % 360 as Cam16Hue;
  },
};

export const cam16Chroma = {
  create(value: number): Cam16Chroma {
    return createBranded<Cam16Chroma>(
      value,
      v => v >= 0,
      'Cam16Chroma'
    );
  },

  clamp(value: number): Cam16Chroma {
    return Math.max(0, value) as Cam16Chroma;
  },

  unsafe(value: number): Cam16Chroma {
    return value as Cam16Chroma;
  },
};

// ============================================
// CAM16 Correlate Factory Functions
// ============================================

export const cam16Lightness = {
  create(value: number): Cam16Lightness {
    return createBranded<Cam16Lightness>(
      value,
      v => v >= 0 && v <= 100,
      'Cam16Lightness'
    );
  },

  clamp(value: number): Cam16Lightness {
    return createBrandedClamped<Cam16Lightness>(value, 0, 100);
  },

  unsafe(value: number): Cam16Lightness {
    return value as Cam16Lightness;
  },
};

export const cam16Brightness = {
  create(value: number): Cam16Brightness {
    return createBranded<Cam16Brightness>(
      value,
      v => v >= 0,
      'Cam16Brightness'
    );
  },

  unsafe(value: number): Cam16Brightness {
    return value as Cam16Brightness;
  },
};

export const cam16Colorfulness = {
  create(value: number): Cam16Colorfulness {
    return createBranded<Cam16Colorfulness>(
      value,
      v => v >= 0,
      'Cam16Colorfulness'
    );
  },

  unsafe(value: number): Cam16Colorfulness {
    return value as Cam16Colorfulness;
  },
};

export const cam16Saturation = {
  create(value: number): Cam16Saturation {
    return createBranded<Cam16Saturation>(
      value,
      v => v >= 0 && v <= 100,
      'Cam16Saturation'
    );
  },

  clamp(value: number): Cam16Saturation {
    return createBrandedClamped<Cam16Saturation>(value, 0, 100);
  },

  unsafe(value: number): Cam16Saturation {
    return value as Cam16Saturation;
  },
};

// ============================================
// APCA Factory Functions
// ============================================

export const apcaLc = {
  create(value: number): ApcaLc {
    return createBranded<ApcaLc>(
      value,
      v => v >= -108 && v <= 106,
      'ApcaLc'
    );
  },

  unsafe(value: number): ApcaLc {
    return value as ApcaLc;
  },

  /**
   * Get absolute value
   */
  absolute(value: ApcaLc): ApcaAbsoluteLc {
    return Math.abs(value) as ApcaAbsoluteLc;
  },

  /**
   * Check if meets body text requirement (|Lc| >= 60)
   */
  meetsBodyText(value: ApcaLc): boolean {
    return Math.abs(value) >= 60;
  },

  /**
   * Check if meets large text requirement (|Lc| >= 45)
   */
  meetsLargeText(value: ApcaLc): boolean {
    return Math.abs(value) >= 45;
  },
};

export const apcaAbsoluteLc = {
  create(value: number): ApcaAbsoluteLc {
    return createBranded<ApcaAbsoluteLc>(
      value,
      v => v >= 0 && v <= 108,
      'ApcaAbsoluteLc'
    );
  },

  unsafe(value: number): ApcaAbsoluteLc {
    return value as ApcaAbsoluteLc;
  },
};

// ============================================
// WCAG Factory Functions
// ============================================

export const wcagContrastRatio = {
  create(value: number): WcagContrastRatio {
    return createBranded<WcagContrastRatio>(
      value,
      v => v >= 1 && v <= 21,
      'WcagContrastRatio'
    );
  },

  unsafe(value: number): WcagContrastRatio {
    return value as WcagContrastRatio;
  },

  meetsAA(value: WcagContrastRatio): boolean {
    return value >= 4.5;
  },

  meetsAALarge(value: WcagContrastRatio): boolean {
    return value >= 3.0;
  },

  meetsAAA(value: WcagContrastRatio): boolean {
    return value >= 7.0;
  },

  meetsAAALarge(value: WcagContrastRatio): boolean {
    return value >= 4.5;
  },
};

// ============================================
// Utility Factory Functions
// ============================================

export const normalized = {
  create(value: number): Normalized {
    return createBranded<Normalized>(value, v => v >= 0 && v <= 1, 'Normalized');
  },

  clamp(value: number): Normalized {
    return createBrandedClamped<Normalized>(value, 0, 1);
  },

  unsafe(value: number): Normalized {
    return value as Normalized;
  },
};

export const percentage = {
  create(value: number): Percentage {
    return createBranded<Percentage>(value, v => v >= 0 && v <= 100, 'Percentage');
  },

  clamp(value: number): Percentage {
    return createBrandedClamped<Percentage>(value, 0, 100);
  },

  unsafe(value: number): Percentage {
    return value as Percentage;
  },

  toNormalized(value: Percentage): Normalized {
    return (value / 100) as Normalized;
  },

  fromNormalized(value: Normalized): Percentage {
    return (value * 100) as Percentage;
  },
};

export const srgbChannel = {
  create(value: number): SrgbChannel {
    return createBranded<SrgbChannel>(
      Math.round(value),
      v => v >= 0 && v <= 255 && Number.isInteger(v),
      'SrgbChannel'
    );
  },

  clamp(value: number): SrgbChannel {
    return Math.round(createBrandedClamped<SrgbChannel>(value, 0, 255)) as SrgbChannel;
  },

  unsafe(value: number): SrgbChannel {
    return value as SrgbChannel;
  },
};

export const argbInt = {
  fromRgb(r: SrgbChannel, g: SrgbChannel, b: SrgbChannel, a: SrgbChannel = 255 as SrgbChannel): ArgbInt {
    return ((a << 24) | (r << 16) | (g << 8) | b) >>> 0 as ArgbInt;
  },

  toRgb(argb: ArgbInt): { r: SrgbChannel; g: SrgbChannel; b: SrgbChannel; a: SrgbChannel } {
    return {
      a: ((argb >> 24) & 0xff) as SrgbChannel,
      r: ((argb >> 16) & 0xff) as SrgbChannel,
      g: ((argb >> 8) & 0xff) as SrgbChannel,
      b: (argb & 0xff) as SrgbChannel,
    };
  },

  toHex(argb: ArgbInt): string {
    const r = (argb >> 16) & 0xff;
    const g = (argb >> 8) & 0xff;
    const b = argb & 0xff;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  },

  fromHex(hex: string): ArgbInt {
    let normalized = hex.replace('#', '');
    if (normalized.length === 3) {
      normalized = normalized.split('').map(c => c + c).join('');
    }
    const num = parseInt(normalized, 16);
    return (0xff000000 | num) >>> 0 as ArgbInt;
  },

  unsafe(value: number): ArgbInt {
    return value as ArgbInt;
  },
};

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for branded number types
 * Note: At runtime, branded types are just numbers
 * This validates the range constraints
 */
export function isValidOklchLightness(value: unknown): value is OklchLightness {
  return typeof value === 'number' && value >= 0 && value <= 1;
}

export function isValidHctTone(value: unknown): value is HctTone {
  return typeof value === 'number' && value >= 0 && value <= 100;
}

export function isValidCam16Hue(value: unknown): value is Cam16Hue {
  return typeof value === 'number' && value >= 0 && value < 360;
}

export function isValidArgbInt(value: unknown): value is ArgbInt {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

// ============================================
// Exports
// ============================================

export default {
  // OKLCH
  oklchLightness,
  oklchChroma,
  oklchHue,
  // HCT
  hctTone,
  cam16Hue,
  cam16Chroma,
  // CAM16 correlates
  cam16Lightness,
  cam16Brightness,
  cam16Colorfulness,
  cam16Saturation,
  // APCA
  apcaLc,
  apcaAbsoluteLc,
  // WCAG
  wcagContrastRatio,
  // Utilities
  normalized,
  percentage,
  srgbChannel,
  argbInt,
};
