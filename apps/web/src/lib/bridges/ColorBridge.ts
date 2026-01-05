/**
 * @fileoverview ColorBridge - Adapter connecting @zuclubit/ui-kit with web app color systems
 *
 * This bridge provides seamless integration between:
 * - @zuclubit/ui-kit's PerceptualColor (domain-driven, immutable)
 * - @/lib/color-intelligence (OKLCH, APCA, governance)
 * - @/lib/theme/color-utils (legacy hex/RGB/HSL utilities)
 *
 * Architecture: Adapter Pattern (Hexagonal Architecture)
 *
 * @module bridges/ColorBridge
 * @version 1.0.0
 */

import { PerceptualColor, type PerceptualAnalysis } from '@zuclubit/ui-kit/domain';
import type { RGB, HSL, ColorValidation } from '@/lib/theme/types';
import {
  hexToRgb,
  hexToHsl,
  rgbToHex,
  hslToRgb,
  getContrastRatio,
  getOptimalForeground,
  generatePalette,
  generateSemanticVariants,
  validateColor,
  lighten as legacyLighten,
  darken as legacyDarken,
} from '@/lib/theme/color-utils';
import {
  getColorCache,
  detectContrastMode,
  APCAContrast,
  type ContrastMode,
} from '@/lib/color-intelligence';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended color validation with perceptual data
 */
export interface PerceptualColorValidation extends ColorValidation {
  /** Perceptual analysis from UI-Kit */
  perceptual: PerceptualAnalysis;
  /** APCA contrast values */
  apca: {
    onWhite: number;
    onBlack: number;
    optimalForeground: string;
  };
  /** Recommended content mode */
  contrastMode: ContrastMode;
  /** Confidence level of contrast detection */
  contrastConfidence: number;
}

/**
 * Options for palette generation
 */
export interface PaletteOptions {
  /** Use perceptually uniform interpolation */
  perceptual?: boolean;
  /** Number of shades (default: 11 - matching Tailwind) */
  shadeCount?: number;
  /** Include state variants (hover, active, disabled) */
  includeStates?: boolean;
}

/**
 * Extended palette with perceptual data
 */
export interface PerceptualPalette {
  /** Shade values (50-950) */
  shades: Record<string, string>;
  /** State variants */
  states?: {
    hover: string;
    active: string;
    disabled: string;
  };
  /** Perceptual source color */
  source: PerceptualColor;
  /** Optimal text colors per shade */
  textColors: Record<string, string>;
}

// ============================================================================
// COLOR BRIDGE ADAPTER
// ============================================================================

/**
 * ColorBridge - Bidirectional adapter between UI-Kit domain and web app utilities
 *
 * @example
 * ```typescript
 * // Create from hex (returns UI-Kit PerceptualColor)
 * const color = ColorBridge.fromHex('#3B82F6');
 *
 * // Use UI-Kit perceptual operations
 * const lighter = color.lighten(0.1);
 * const analysis = color.analyze();
 *
 * // Bridge to legacy utilities
 * const rgb = ColorBridge.toRgb(color);
 * const hsl = ColorBridge.toHsl(color);
 *
 * // Enhanced validation with perceptual data
 * const validation = ColorBridge.validateWithPerceptual('#3B82F6');
 *
 * // Generate perceptually uniform palette
 * const palette = ColorBridge.generatePerceptualPalette('#3B82F6');
 * ```
 */
export class ColorBridge {
  // ─────────────────────────────────────────────────────────────────────────
  // CREATION METHODS (Hex → PerceptualColor)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Create PerceptualColor from hex string.
   * Uses UI-Kit's domain-driven color model.
   */
  static fromHex(hex: string): PerceptualColor {
    return PerceptualColor.fromHex(hex);
  }

  /**
   * Create PerceptualColor from RGB values.
   */
  static fromRgb(r: number, g: number, b: number): PerceptualColor {
    return PerceptualColor.fromRgb(r, g, b);
  }

  /**
   * Create PerceptualColor from RGB object.
   */
  static fromRgbObject(rgb: RGB): PerceptualColor {
    return PerceptualColor.fromRgb(rgb.r, rgb.g, rgb.b);
  }

  /**
   * Create PerceptualColor from OKLCH coordinates.
   */
  static fromOklch(l: number, c: number, h: number): PerceptualColor {
    return PerceptualColor.fromOklch(l, c, h);
  }

  /**
   * Safe creation with Result pattern.
   */
  static tryFromHex(hex: string): { success: true; value: PerceptualColor } | { success: false; error: Error } {
    return PerceptualColor.tryFromHex(hex);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONVERSION METHODS (PerceptualColor → Legacy)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convert PerceptualColor to hex string.
   */
  static toHex(color: PerceptualColor): string {
    return color.hex;
  }

  /**
   * Convert PerceptualColor to RGB object.
   */
  static toRgb(color: PerceptualColor): RGB {
    const rgb = color.rgb;
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }

  /**
   * Convert PerceptualColor to HSL object.
   */
  static toHsl(color: PerceptualColor): HSL {
    const hsl = color.hsl;
    return { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) };
  }

  /**
   * Convert PerceptualColor to CSS OKLCH string.
   */
  static toCssOklch(color: PerceptualColor): string {
    return color.toCssOklch();
  }

  /**
   * Convert PerceptualColor to CSS RGB string.
   */
  static toCssRgb(color: PerceptualColor): string {
    return color.toCssRgb();
  }

  /**
   * Convert PerceptualColor to CSS HSL string.
   */
  static toCssHsl(color: PerceptualColor): string {
    return color.toCssHsl();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Enhanced color validation with perceptual analysis.
   * Combines legacy validation with UI-Kit perceptual data.
   */
  static validateWithPerceptual(hex: string): PerceptualColorValidation {
    // Get legacy validation
    const legacyValidation = validateColor(hex);

    // Create perceptual color for analysis
    const color = PerceptualColor.fromHex(hex);
    const analysis = color.analyze();

    // Get Color Intelligence data
    const cache = getColorCache();
    const apcaWhite = cache.getApca(hex, '#FFFFFF');
    const apcaBlack = cache.getApca(hex, '#000000');
    const contrastResult = detectContrastMode(hex);

    // Find optimal foreground using APCA
    const optimalResult = APCAContrast.findOptimalTextColor(hex, {
      preferDark: contrastResult.mode === 'dark-content',
      minLc: 60,
    });

    return {
      ...legacyValidation,
      perceptual: analysis,
      apca: {
        onWhite: apcaWhite.absoluteLc,
        onBlack: apcaBlack.absoluteLc,
        optimalForeground: optimalResult.color,
      },
      contrastMode: contrastResult.mode,
      contrastConfidence: contrastResult.confidence,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONTRAST METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get WCAG 2.1 contrast ratio between two PerceptualColors.
   */
  static getContrastRatio(color1: PerceptualColor, color2: PerceptualColor): number {
    return getContrastRatio(color1.hex, color2.hex);
  }

  /**
   * Get APCA contrast (Lc value) between two PerceptualColors.
   */
  static getApcaContrast(text: PerceptualColor, background: PerceptualColor): number {
    const cache = getColorCache();
    return cache.getApca(text.hex, background.hex).lc;
  }

  /**
   * Get optimal foreground color for a background.
   */
  static getOptimalForeground(background: PerceptualColor): PerceptualColor {
    const optimalHex = getOptimalForeground(background.hex);
    return PerceptualColor.fromHex(optimalHex);
  }

  /**
   * Get optimal foreground using APCA with contrast target.
   */
  static getOptimalForegroundApca(
    background: PerceptualColor,
    options?: { preferDark?: boolean; minLc?: number }
  ): { color: PerceptualColor; contrast: number } {
    const result = APCAContrast.findOptimalTextColor(background.hex, {
      preferDark: options?.preferDark,
      minLc: options?.minLc ?? 60,
    });

    return {
      color: PerceptualColor.fromHex(result.color),
      contrast: result.contrast.absoluteLc,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COLOR MANIPULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lighten color using perceptually uniform OKLCH.
   * More accurate than legacy HSL-based lightening.
   *
   * @param color - Source color
   * @param amount - Amount to lighten (0-1 in OKLCH L scale)
   */
  static lighten(color: PerceptualColor, amount: number): PerceptualColor {
    return color.lighten(amount);
  }

  /**
   * Darken color using perceptually uniform OKLCH.
   *
   * @param color - Source color
   * @param amount - Amount to darken (0-1 in OKLCH L scale)
   */
  static darken(color: PerceptualColor, amount: number): PerceptualColor {
    return color.darken(amount);
  }

  /**
   * Saturate color using OKLCH chroma.
   *
   * @param color - Source color
   * @param amount - Amount to increase chroma
   */
  static saturate(color: PerceptualColor, amount: number): PerceptualColor {
    return color.saturate(amount);
  }

  /**
   * Desaturate color using OKLCH chroma.
   *
   * @param color - Source color
   * @param amount - Amount to decrease chroma
   */
  static desaturate(color: PerceptualColor, amount: number): PerceptualColor {
    return color.desaturate(amount);
  }

  /**
   * Rotate hue by degrees.
   */
  static rotateHue(color: PerceptualColor, degrees: number): PerceptualColor {
    return color.rotateHue(degrees);
  }

  /**
   * Get complementary color.
   */
  static complement(color: PerceptualColor): PerceptualColor {
    return color.complement();
  }

  /**
   * Get analogous colors.
   */
  static analogous(color: PerceptualColor, angle = 30): [PerceptualColor, PerceptualColor] {
    return color.analogous(angle);
  }

  /**
   * Get triadic colors.
   */
  static triadic(color: PerceptualColor): [PerceptualColor, PerceptualColor] {
    return color.triadic();
  }

  /**
   * Interpolate between two colors using OKLCH.
   * More accurate than RGB/HSL interpolation.
   */
  static interpolate(
    start: PerceptualColor,
    end: PerceptualColor,
    t: number
  ): PerceptualColor {
    return start.interpolate(end, t);
  }

  /**
   * Generate gradient between two colors.
   */
  static gradient(
    start: PerceptualColor,
    end: PerceptualColor,
    steps: number
  ): PerceptualColor[] {
    return start.gradient(end, steps);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PALETTE GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generate a perceptually uniform color palette.
   * Uses OKLCH for better visual consistency than HSL.
   */
  static generatePerceptualPalette(
    baseHex: string,
    options: PaletteOptions = {}
  ): PerceptualPalette {
    const { perceptual = true, includeStates = true } = options;
    const source = PerceptualColor.fromHex(baseHex);

    // Target OKLCH lightness values for each shade
    const shadeLightness: Record<string, number> = {
      '50': 0.97,
      '100': 0.94,
      '200': 0.86,
      '300': 0.76,
      '400': 0.64,
      '500': 0.50,
      '600': 0.40,
      '700': 0.32,
      '800': 0.24,
      '900': 0.18,
      '950': 0.10,
    };

    const shades: Record<string, string> = {};
    const textColors: Record<string, string> = {};

    if (perceptual) {
      // Generate using OKLCH for perceptual uniformity
      for (const [shade, targetL] of Object.entries(shadeLightness)) {
        const delta = targetL - source.oklch.l;
        const newColor = delta >= 0
          ? source.lighten(delta)
          : source.darken(Math.abs(delta));

        shades[shade] = newColor.hex;

        // Calculate optimal text color for each shade
        const optimal = this.getOptimalForegroundApca(newColor);
        textColors[shade] = optimal.color.hex;
      }
    } else {
      // Fall back to legacy HSL-based palette
      const legacyPalette = generatePalette(baseHex);
      Object.assign(shades, legacyPalette);

      for (const shade of Object.keys(legacyPalette)) {
        textColors[shade] = getOptimalForeground(legacyPalette[shade]!);
      }
    }

    // Generate state variants
    const states = includeStates
      ? {
          hover: this.darken(source, 0.08).hex,
          active: this.darken(source, 0.12).hex,
          disabled: this.desaturate(this.lighten(source, 0.2), 0.04).hex,
        }
      : undefined;

    return {
      shades,
      states,
      source,
      textColors,
    };
  }

  /**
   * Generate semantic variants (hover, active, disabled, light, dark).
   * Uses perceptually uniform adjustments.
   */
  static generateSemanticVariants(color: PerceptualColor): {
    base: PerceptualColor;
    hover: PerceptualColor;
    active: PerceptualColor;
    disabled: PerceptualColor;
    light: PerceptualColor;
    dark: PerceptualColor;
  } {
    return {
      base: color,
      hover: color.darken(0.08),
      active: color.darken(0.12),
      disabled: color.lighten(0.2).desaturate(0.04),
      light: color.lighten(0.35),
      dark: color.darken(0.2),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANALYSIS METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get perceptual analysis of a color.
   */
  static analyze(color: PerceptualColor): PerceptualAnalysis {
    return color.analyze();
  }

  /**
   * Calculate perceptual difference (Delta E) between two colors.
   */
  static deltaE(color1: PerceptualColor, color2: PerceptualColor): number {
    return color1.deltaE(color2);
  }

  /**
   * Check if two colors are perceptually similar.
   */
  static isSimilar(
    color1: PerceptualColor,
    color2: PerceptualColor,
    threshold = 0.02
  ): boolean {
    return color1.isSimilarTo(color2, threshold);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEGACY BRIDGE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply legacy lighten operation to PerceptualColor.
   * Use ColorBridge.lighten() for perceptually uniform result.
   *
   * @deprecated Use ColorBridge.lighten() instead
   */
  static legacyLighten(color: PerceptualColor, amount: number): PerceptualColor {
    const lightened = legacyLighten(color.hex, amount);
    return PerceptualColor.fromHex(lightened);
  }

  /**
   * Apply legacy darken operation to PerceptualColor.
   * Use ColorBridge.darken() for perceptually uniform result.
   *
   * @deprecated Use ColorBridge.darken() instead
   */
  static legacyDarken(color: PerceptualColor, amount: number): PerceptualColor {
    const darkened = legacyDarken(color.hex, amount);
    return PerceptualColor.fromHex(darkened);
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick hex to PerceptualColor conversion.
 */
export function createPerceptualColor(hex: string): PerceptualColor {
  return ColorBridge.fromHex(hex);
}

/**
 * Quick perceptual palette generation.
 */
export function createPalette(hex: string): PerceptualPalette {
  return ColorBridge.generatePerceptualPalette(hex);
}

/**
 * Quick color validation with full perceptual data.
 */
export function validateWithPerceptual(hex: string): PerceptualColorValidation {
  return ColorBridge.validateWithPerceptual(hex);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default ColorBridge;
