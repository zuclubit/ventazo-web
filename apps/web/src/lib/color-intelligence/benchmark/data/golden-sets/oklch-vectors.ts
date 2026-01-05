/**
 * OKLCH Golden Test Vectors
 *
 * Source: Björn Ottosson's OKLCH Reference Implementation
 * Reference: https://bottosson.github.io/posts/oklab/
 *
 * These vectors are canonical and should not be modified.
 */

export interface OKLCHTestVector {
  readonly name: string;
  readonly description: string;
  readonly srgb: {
    readonly hex: string;
    readonly rgb: readonly [number, number, number];
  };
  readonly oklch: {
    readonly l: number; // Lightness 0-1
    readonly c: number; // Chroma 0-0.4+
    readonly h: number; // Hue 0-360
  };
  readonly tolerance: {
    readonly l: number;
    readonly c: number;
    readonly h: number;
  };
  readonly category: 'primary' | 'secondary' | 'neutral' | 'edge-case';
}

export const OKLCH_GOLDEN_VECTORS: readonly OKLCHTestVector[] = [
  // sRGB Primaries
  {
    name: 'Pure Red',
    description: 'sRGB primary red',
    srgb: { hex: '#FF0000', rgb: [255, 0, 0] },
    oklch: { l: 0.6279, c: 0.2577, h: 29.23 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'primary',
  },
  {
    name: 'Pure Green',
    description: 'sRGB primary green',
    srgb: { hex: '#00FF00', rgb: [0, 255, 0] },
    oklch: { l: 0.8664, c: 0.2948, h: 142.50 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'primary',
  },
  {
    name: 'Pure Blue',
    description: 'sRGB primary blue',
    srgb: { hex: '#0000FF', rgb: [0, 0, 255] },
    oklch: { l: 0.4520, c: 0.3132, h: 264.05 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'primary',
  },

  // sRGB Secondaries
  {
    name: 'Cyan',
    description: 'sRGB secondary cyan',
    srgb: { hex: '#00FFFF', rgb: [0, 255, 255] },
    oklch: { l: 0.9054, c: 0.1546, h: 194.77 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'secondary',
  },
  {
    name: 'Magenta',
    description: 'sRGB secondary magenta',
    srgb: { hex: '#FF00FF', rgb: [255, 0, 255] },
    oklch: { l: 0.7017, c: 0.3225, h: 328.36 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'secondary',
  },
  {
    name: 'Yellow',
    description: 'sRGB secondary yellow',
    srgb: { hex: '#FFFF00', rgb: [255, 255, 0] },
    oklch: { l: 0.9679, c: 0.2111, h: 109.77 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'secondary',
  },

  // Neutrals
  {
    name: 'White',
    description: 'Pure white - achromatic',
    srgb: { hex: '#FFFFFF', rgb: [255, 255, 255] },
    oklch: { l: 1.0, c: 0.0, h: 0 },
    tolerance: { l: 0.001, c: 0.001, h: 360 }, // Hue undefined for achromatic
    category: 'neutral',
  },
  {
    name: 'Black',
    description: 'Pure black - achromatic',
    srgb: { hex: '#000000', rgb: [0, 0, 0] },
    oklch: { l: 0.0, c: 0.0, h: 0 },
    tolerance: { l: 0.001, c: 0.001, h: 360 },
    category: 'neutral',
  },
  {
    name: 'Mid Gray',
    description: '50% gray - achromatic',
    srgb: { hex: '#808080', rgb: [128, 128, 128] },
    oklch: { l: 0.5998, c: 0.0, h: 0 },
    tolerance: { l: 0.001, c: 0.001, h: 360 },
    category: 'neutral',
  },
  {
    name: 'Light Gray',
    description: '75% luminance gray',
    srgb: { hex: '#C0C0C0', rgb: [192, 192, 192] },
    oklch: { l: 0.8035, c: 0.0, h: 0 },
    tolerance: { l: 0.001, c: 0.001, h: 360 },
    category: 'neutral',
  },
  {
    name: 'Dark Gray',
    description: '25% luminance gray',
    srgb: { hex: '#404040', rgb: [64, 64, 64] },
    oklch: { l: 0.3729, c: 0.0, h: 0 },
    tolerance: { l: 0.001, c: 0.001, h: 360 },
    category: 'neutral',
  },

  // Real-world brand colors
  {
    name: 'Tailwind Blue 500',
    description: 'Common UI color',
    srgb: { hex: '#3B82F6', rgb: [59, 130, 246] },
    oklch: { l: 0.6232, c: 0.1908, h: 259.00 },
    tolerance: { l: 0.002, c: 0.002, h: 1.0 },
    category: 'edge-case',
  },
  {
    name: 'Material Red 500',
    description: 'Material Design primary red',
    srgb: { hex: '#F44336', rgb: [244, 67, 54] },
    oklch: { l: 0.6044, c: 0.2248, h: 27.91 },
    tolerance: { l: 0.002, c: 0.002, h: 1.0 },
    category: 'edge-case',
  },

  // Edge cases - near gamut boundary
  {
    name: 'High Chroma Blue',
    description: 'Near sRGB gamut boundary',
    srgb: { hex: '#0066FF', rgb: [0, 102, 255] },
    oklch: { l: 0.5512, c: 0.2457, h: 260.02 },
    tolerance: { l: 0.002, c: 0.002, h: 1.0 },
    category: 'edge-case',
  },
  {
    name: 'High Chroma Green',
    description: 'Maximum green chroma in sRGB',
    srgb: { hex: '#00FF00', rgb: [0, 255, 0] },
    oklch: { l: 0.8664, c: 0.2948, h: 142.50 },
    tolerance: { l: 0.001, c: 0.001, h: 0.5 },
    category: 'edge-case',
  },
] as const;

/**
 * OKLCH Matrix Constants
 * From Björn Ottosson's original implementation
 */
export const OKLCH_MATRICES = {
  /** sRGB to Linear RGB (inverse gamma) */
  srgbToLinear: (c: number): number => {
    const abs = Math.abs(c);
    return abs <= 0.04045
      ? c / 12.92
      : Math.sign(c) * Math.pow((abs + 0.055) / 1.055, 2.4);
  },

  /** Linear RGB to sRGB (gamma) */
  linearToSrgb: (c: number): number => {
    const abs = Math.abs(c);
    return abs <= 0.0031308
      ? c * 12.92
      : Math.sign(c) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
  },

  /** M1 matrix: Linear RGB to LMS */
  m1: [
    [0.4122214708, 0.5363325363, 0.0514459929],
    [0.2119034982, 0.6806995451, 0.1073969566],
    [0.0883024619, 0.2817188376, 0.6299787005],
  ] as const,

  /** M2 matrix: LMS to Oklab */
  m2: [
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766],
  ] as const,
} as const;

/**
 * Round-trip tolerance specification
 * For sRGB → OKLCH → sRGB conversion
 */
export const OKLCH_ROUNDTRIP_TOLERANCE = {
  /** Maximum acceptable Delta E (CIEDE2000) for round-trip */
  maxDeltaE: 0.01,
  /** Maximum RGB component deviation (0-255 scale) */
  maxRgbDeviation: 1,
  /** Maximum normalized component deviation (0-1 scale) */
  maxNormalizedDeviation: 0.004,
} as const;

export default OKLCH_GOLDEN_VECTORS;
