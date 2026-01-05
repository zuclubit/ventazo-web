// ============================================
// Design System Adapter - Base Interface
// Hexagonal Architecture Port for Design Systems
// ============================================

import OKLCH from '../../domain/value-objects/OKLCH';
import HCT from '../../domain/value-objects/HCT';
import { ContrastDecision } from '../../domain/types/decision';

// ============================================
// Core Types
// ============================================

/**
 * Design system color role definitions
 */
export type ColorRole =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'neutral'
  | 'surface'
  | 'outline'
  | 'shadow';

/**
 * Color variant intensities
 */
export type ColorVariant =
  | 'main'
  | 'on'
  | 'container'
  | 'onContainer'
  | 'fixed'
  | 'fixedDim'
  | 'onFixed'
  | 'onFixedVariant';

/**
 * Surface elevation levels
 */
export type SurfaceLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Color scheme mode
 */
export type ColorScheme = 'light' | 'dark';

/**
 * Design token with full metadata
 */
export interface DesignSystemToken {
  readonly name: string;
  readonly role: ColorRole;
  readonly variant: ColorVariant;
  readonly value: OKLCH;
  readonly hex: string;
  readonly cssVariable: string;
  readonly description: string;
  readonly contrastRatio: number;
  readonly wcagLevel: 'Fail' | 'AA' | 'AAA';
  readonly usage: ReadonlyArray<string>;
}

/**
 * Tonal palette with 13 tones (0-100)
 */
export interface TonalPalette {
  readonly role: ColorRole;
  readonly keyColor: OKLCH;
  readonly tones: Readonly<Record<number, OKLCH>>;
  readonly hue: number;
  readonly chroma: number;
}

/**
 * Complete color scheme output
 */
export interface ColorSchemeOutput {
  readonly scheme: ColorScheme;
  readonly tokens: ReadonlyArray<DesignSystemToken>;
  readonly palettes: ReadonlyArray<TonalPalette>;
  readonly cssVariables: string;
  readonly tailwindConfig: object;
  readonly figmaTokens: object;
}

/**
 * Design system configuration
 */
export interface DesignSystemConfig {
  readonly name: string;
  readonly version: string;
  readonly prefix: string;
  readonly surfaceLevels: number;
  readonly tonalSteps: ReadonlyArray<number>;
  readonly contrastRequirements: {
    readonly text: number;
    readonly largeText: number;
    readonly ui: number;
  };
}

/**
 * Accessibility validation result
 */
export interface AccessibilityValidation {
  readonly token: DesignSystemToken;
  readonly background: OKLCH;
  readonly decision: ContrastDecision;
  readonly passes: boolean;
  readonly recommendations: ReadonlyArray<string>;
}

/**
 * Theme generation options
 */
export interface ThemeGenerationOptions {
  readonly primaryColor: string;
  readonly secondaryColor?: string;
  readonly tertiaryColor?: string;
  readonly errorColor?: string;
  readonly neutralColor?: string;
  readonly scheme: ColorScheme | 'both';
  readonly contrastLevel?: 'standard' | 'medium' | 'high';
  readonly customBrandColors?: Record<string, string>;
}

// ============================================
// Base Adapter Interface
// ============================================

/**
 * Design System Adapter Interface
 *
 * Provides a standardized interface for adapting the Color Intelligence
 * domain to different design systems. Implementations must provide:
 *
 * 1. Tonal palette generation from key colors
 * 2. Semantic token generation
 * 3. Surface color calculations
 * 4. Accessibility validation
 * 5. Output format transformations
 */
export interface IDesignSystemAdapter {
  /**
   * Configuration for this design system
   */
  readonly config: DesignSystemConfig;

  /**
   * Generate a complete tonal palette from a key color
   */
  generateTonalPalette(keyColor: string | OKLCH, role: ColorRole): TonalPalette;

  /**
   * Generate all semantic tokens for a color scheme
   */
  generateTokens(options: ThemeGenerationOptions): ColorSchemeOutput;

  /**
   * Calculate surface colors at different elevation levels
   */
  calculateSurface(
    baseColor: OKLCH,
    elevation: SurfaceLevel,
    scheme: ColorScheme
  ): OKLCH;

  /**
   * Get the optimal "on" color for a given color
   */
  getOnColor(color: OKLCH, scheme: ColorScheme): OKLCH;

  /**
   * Validate accessibility for all tokens
   */
  validateAccessibility(
    tokens: ReadonlyArray<DesignSystemToken>,
    scheme: ColorScheme
  ): ReadonlyArray<AccessibilityValidation>;

  /**
   * Export tokens to CSS custom properties
   */
  toCssVariables(tokens: ReadonlyArray<DesignSystemToken>): string;

  /**
   * Export tokens to Tailwind configuration
   */
  toTailwindConfig(tokens: ReadonlyArray<DesignSystemToken>): object;

  /**
   * Export tokens to Figma format
   */
  toFigmaTokens(tokens: ReadonlyArray<DesignSystemToken>): object;
}

// ============================================
// Abstract Base Implementation
// ============================================

/**
 * Abstract base class for design system adapters
 * Provides common functionality and enforces contract
 */
export abstract class BaseDesignSystemAdapter implements IDesignSystemAdapter {
  abstract readonly config: DesignSystemConfig;

  // Standard tonal steps used in most design systems
  protected readonly STANDARD_TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

  /**
   * Generate tonal palette - implemented by subclasses
   */
  abstract generateTonalPalette(keyColor: string | OKLCH, role: ColorRole): TonalPalette;

  /**
   * Generate tokens - implemented by subclasses
   */
  abstract generateTokens(options: ThemeGenerationOptions): ColorSchemeOutput;

  /**
   * Calculate surface color at elevation - implemented by subclasses
   */
  abstract calculateSurface(
    baseColor: OKLCH,
    elevation: SurfaceLevel,
    scheme: ColorScheme
  ): OKLCH;

  /**
   * Get optimal "on" color for a background
   */
  getOnColor(color: OKLCH, _scheme: ColorScheme): OKLCH {
    // Use lightness to determine if light or dark text is needed
    const isLight = color.l > 0.6;

    return isLight
      ? OKLCH.create(0.15, Math.min(0.02, color.c * 0.1), color.h)
      : OKLCH.create(0.95, Math.min(0.01, color.c * 0.05), color.h);
  }

  /**
   * Validate accessibility for token set
   */
  validateAccessibility(
    tokens: ReadonlyArray<DesignSystemToken>,
    scheme: ColorScheme
  ): ReadonlyArray<AccessibilityValidation> {
    const validations: AccessibilityValidation[] = [];

    for (const token of tokens) {
      // Find corresponding background token
      const bgToken = this.findBackgroundToken(tokens, token, scheme);
      if (!bgToken) continue;

      const contrastRatio = this.calculateContrastRatio(token.value, bgToken.value);
      const passes = contrastRatio >= this.config.contrastRequirements.text;

      validations.push({
        token,
        background: bgToken.value,
        decision: this.createContrastDecision(token.value, bgToken.value, contrastRatio),
        passes,
        recommendations: passes
          ? []
          : this.generateRecommendations(token, bgToken, contrastRatio),
      });
    }

    return validations;
  }

  /**
   * Export to CSS custom properties
   */
  toCssVariables(tokens: ReadonlyArray<DesignSystemToken>): string {
    const lines: string[] = [
      `/* ${this.config.name} v${this.config.version} */`,
      `:root {`,
    ];

    for (const token of tokens) {
      lines.push(`  ${token.cssVariable}: ${token.hex};`);
    }

    lines.push(`}`);
    return lines.join('\n');
  }

  /**
   * Export to Tailwind configuration
   */
  toTailwindConfig(tokens: ReadonlyArray<DesignSystemToken>): object {
    const colors: Record<string, Record<string, string>> = {};

    for (const token of tokens) {
      const [role, variant] = this.parseTokenName(token.name);

      if (!colors[role]) {
        colors[role] = {};
      }

      colors[role][variant || 'DEFAULT'] = `var(${token.cssVariable})`;
    }

    return {
      theme: {
        extend: {
          colors,
        },
      },
    };
  }

  /**
   * Export to Figma token format
   */
  toFigmaTokens(tokens: ReadonlyArray<DesignSystemToken>): object {
    const figmaTokens: Record<string, object> = {};

    for (const token of tokens) {
      figmaTokens[token.name] = {
        value: token.hex,
        type: 'color',
        description: token.description,
        extensions: {
          'org.figma.plugin.designSystems': {
            role: token.role,
            variant: token.variant,
          },
        },
      };
    }

    return figmaTokens;
  }

  // ============================================
  // Protected Helpers
  // ============================================

  protected normalizeColor(input: string | OKLCH): OKLCH {
    if (input instanceof OKLCH) {
      return input;
    }
    const color = OKLCH.fromHex(input);
    if (!color) {
      throw new Error(`Invalid color: ${input}`);
    }
    return color;
  }

  protected calculateContrastRatio(fg: OKLCH, bg: OKLCH): number {
    const fgLum = this.relativeLuminance(fg);
    const bgLum = this.relativeLuminance(bg);
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    return (lighter + 0.05) / (darker + 0.05);
  }

  protected relativeLuminance(color: OKLCH): number {
    // OKLCH l is perceptual, convert to relative luminance
    // This is an approximation; real implementation would use sRGB conversion
    return color.l * color.l;
  }

  protected findBackgroundToken(
    tokens: ReadonlyArray<DesignSystemToken>,
    foreground: DesignSystemToken,
    _scheme: ColorScheme
  ): DesignSystemToken | null {
    // Match "on" tokens to their containers
    if (foreground.variant === 'on' || foreground.variant.startsWith('on')) {
      const containerVariant = foreground.variant === 'on'
        ? 'main'
        : foreground.variant.replace('on', '').toLowerCase();

      return tokens.find(
        t => t.role === foreground.role && t.variant.toLowerCase() === containerVariant
      ) ?? null;
    }

    // Default to surface token
    return tokens.find(t => t.role === 'surface' && t.variant === 'main') ?? null;
  }

  protected createContrastDecision(
    fg: OKLCH,
    bg: OKLCH,
    ratio: number
  ): ContrastDecision {
    // Determine polarity based on lightness comparison
    const polarity: 'dark-on-light' | 'light-on-dark' = fg.l < bg.l ? 'dark-on-light' : 'light-on-dark';

    // Estimate APCA Lc from WCAG ratio (approximation)
    const apcaLc = ratio >= 7 ? 90 : ratio >= 4.5 ? 75 : ratio >= 3 ? 60 : ratio * 15;

    return {
      score: (ratio * 10) as unknown as any, // Normalized score
      level: (ratio >= 7 ? 'Enhanced' : ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'Fail') as unknown as any,
      wcagLevel: ratio >= 4.5 ? 'AAA' : ratio >= 3 ? 'AA' : 'Fail',
      wcag3Tier: ratio >= 7 ? 'Gold' : ratio >= 4.5 ? 'Silver' : ratio >= 3 ? 'Bronze' : 'Fail',
      apcaLc,
      apcaAbsolute: Math.abs(apcaLc),
      wcag21Ratio: ratio,
      polarity,
      confidence: 0.9 as unknown as any,
      viewingConditions: { surround: 'average', adaptingLuminance: 64 } as unknown as any,
      readabilityContext: { fontSize: 16 as unknown as any, fontWeight: 400 as unknown as any } as unknown as any,
      factors: [],
      reasoning: [`Contrast ratio: ${ratio.toFixed(2)}:1`],
      warnings: ratio < 4.5 ? ['Does not meet WCAG AA for normal text'] : [],
      suggestions: [],
      timestamp: new Date().toISOString(),
      algorithmVersion: '1.0.0',
      colors: {
        foreground: fg.toHex(),
        background: bg.toHex(),
      },
    };
  }

  protected generateRecommendations(
    token: DesignSystemToken,
    bgToken: DesignSystemToken,
    currentRatio: number
  ): string[] {
    const recommendations: string[] = [];
    const needed = this.config.contrastRequirements.text;

    recommendations.push(
      `Current ratio ${currentRatio.toFixed(2)}:1 does not meet ${needed}:1 requirement`
    );

    // Suggest lightness adjustments
    if (token.value.l > bgToken.value.l) {
      recommendations.push(`Increase ${token.name} lightness or decrease ${bgToken.name} lightness`);
    } else {
      recommendations.push(`Decrease ${token.name} lightness or increase ${bgToken.name} lightness`);
    }

    return recommendations;
  }

  protected parseTokenName(name: string): [string, string] {
    const parts = name.split('-');
    if (parts.length >= 2) {
      return [parts[0]!, parts.slice(1).join('-')];
    }
    return [parts[0]!, ''];
  }

  protected toneToLightness(tone: number): number {
    // Convert Material tone (0-100) to OKLCH lightness (0-1)
    // Non-linear mapping for perceptual uniformity
    const normalized = tone / 100;
    return Math.pow(normalized, 0.7);
  }

  protected lightnessToTone(lightness: number): number {
    // Inverse of toneToLightness
    return Math.pow(lightness, 1 / 0.7) * 100;
  }
}

export default BaseDesignSystemAdapter;
