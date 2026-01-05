// ============================================
// Material Design 3 Adapter
// Implements Google's Material You color system
// Uses HCT for perceptually accurate tonal palettes
// ============================================

import OKLCH from '../../domain/value-objects/OKLCH';
import HCT from '../../domain/value-objects/HCT';
import {
  BaseDesignSystemAdapter,
  ColorRole,
  ColorScheme,
  ColorSchemeOutput,
  DesignSystemConfig,
  DesignSystemToken,
  SurfaceLevel,
  ThemeGenerationOptions,
  TonalPalette,
  ColorVariant,
} from './DesignSystemAdapter';

// ============================================
// Material Design 3 Specific Types
// ============================================

/**
 * Material Design 3 color roles
 */
export type MD3ColorRole =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'neutral'
  | 'neutralVariant';

/**
 * Material Design 3 scheme tokens
 */
export interface MD3SchemeTokens {
  // Primary
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  primaryFixed: string;
  primaryFixedDim: string;
  onPrimaryFixed: string;
  onPrimaryFixedVariant: string;

  // Secondary
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  secondaryFixed: string;
  secondaryFixedDim: string;
  onSecondaryFixed: string;
  onSecondaryFixedVariant: string;

  // Tertiary
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  tertiaryFixed: string;
  tertiaryFixedDim: string;
  onTertiaryFixed: string;
  onTertiaryFixedVariant: string;

  // Error
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Surface
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceDim: string;
  surfaceBright: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Background
  background: string;
  onBackground: string;

  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Other
  shadow: string;
  scrim: string;
}

/**
 * Surface tint configuration
 */
export interface SurfaceTintConfig {
  readonly tintColor: OKLCH;
  readonly elevations: ReadonlyArray<{
    readonly level: SurfaceLevel;
    readonly opacity: number;
  }>;
}

// ============================================
// Material Design 3 Constants
// ============================================

/**
 * Standard Material Design 3 tones
 */
const MD3_TONES = [0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100];

/**
 * Light scheme tone mappings (based on Material Design 3 spec)
 */
const LIGHT_SCHEME_TONES: Record<string, number> = {
  primary: 40,
  onPrimary: 100,
  primaryContainer: 90,
  onPrimaryContainer: 10,
  primaryFixed: 90,
  primaryFixedDim: 80,
  onPrimaryFixed: 10,
  onPrimaryFixedVariant: 30,

  secondary: 40,
  onSecondary: 100,
  secondaryContainer: 90,
  onSecondaryContainer: 10,
  secondaryFixed: 90,
  secondaryFixedDim: 80,
  onSecondaryFixed: 10,
  onSecondaryFixedVariant: 30,

  tertiary: 40,
  onTertiary: 100,
  tertiaryContainer: 90,
  onTertiaryContainer: 10,
  tertiaryFixed: 90,
  tertiaryFixedDim: 80,
  onTertiaryFixed: 10,
  onTertiaryFixedVariant: 30,

  error: 40,
  onError: 100,
  errorContainer: 90,
  onErrorContainer: 10,

  surface: 98,
  onSurface: 10,
  surfaceVariant: 90,
  onSurfaceVariant: 30,
  surfaceContainerLowest: 100,
  surfaceContainerLow: 96,
  surfaceContainer: 94,
  surfaceContainerHigh: 92,
  surfaceContainerHighest: 90,
  surfaceDim: 87,
  surfaceBright: 98,

  outline: 50,
  outlineVariant: 80,

  background: 98,
  onBackground: 10,

  inverseSurface: 20,
  inverseOnSurface: 95,
  inversePrimary: 80,

  shadow: 0,
  scrim: 0,
};

/**
 * Dark scheme tone mappings
 */
const DARK_SCHEME_TONES: Record<string, number> = {
  primary: 80,
  onPrimary: 20,
  primaryContainer: 30,
  onPrimaryContainer: 90,
  primaryFixed: 90,
  primaryFixedDim: 80,
  onPrimaryFixed: 10,
  onPrimaryFixedVariant: 30,

  secondary: 80,
  onSecondary: 20,
  secondaryContainer: 30,
  onSecondaryContainer: 90,
  secondaryFixed: 90,
  secondaryFixedDim: 80,
  onSecondaryFixed: 10,
  onSecondaryFixedVariant: 30,

  tertiary: 80,
  onTertiary: 20,
  tertiaryContainer: 30,
  onTertiaryContainer: 90,
  tertiaryFixed: 90,
  tertiaryFixedDim: 80,
  onTertiaryFixed: 10,
  onTertiaryFixedVariant: 30,

  error: 80,
  onError: 20,
  errorContainer: 30,
  onErrorContainer: 90,

  surface: 6,
  onSurface: 90,
  surfaceVariant: 30,
  onSurfaceVariant: 80,
  surfaceContainerLowest: 4,
  surfaceContainerLow: 10,
  surfaceContainer: 12,
  surfaceContainerHigh: 17,
  surfaceContainerHighest: 22,
  surfaceDim: 6,
  surfaceBright: 24,

  outline: 60,
  outlineVariant: 30,

  background: 6,
  onBackground: 90,

  inverseSurface: 90,
  inverseOnSurface: 20,
  inversePrimary: 40,

  shadow: 0,
  scrim: 0,
};

/**
 * Role-to-palette mapping
 */
const ROLE_PALETTE_MAP: Record<string, MD3ColorRole> = {
  primary: 'primary',
  onPrimary: 'primary',
  primaryContainer: 'primary',
  onPrimaryContainer: 'primary',
  primaryFixed: 'primary',
  primaryFixedDim: 'primary',
  onPrimaryFixed: 'primary',
  onPrimaryFixedVariant: 'primary',

  secondary: 'secondary',
  onSecondary: 'secondary',
  secondaryContainer: 'secondary',
  onSecondaryContainer: 'secondary',
  secondaryFixed: 'secondary',
  secondaryFixedDim: 'secondary',
  onSecondaryFixed: 'secondary',
  onSecondaryFixedVariant: 'secondary',

  tertiary: 'tertiary',
  onTertiary: 'tertiary',
  tertiaryContainer: 'tertiary',
  onTertiaryContainer: 'tertiary',
  tertiaryFixed: 'tertiary',
  tertiaryFixedDim: 'tertiary',
  onTertiaryFixed: 'tertiary',
  onTertiaryFixedVariant: 'tertiary',

  error: 'error',
  onError: 'error',
  errorContainer: 'error',
  onErrorContainer: 'error',

  surface: 'neutral',
  onSurface: 'neutral',
  background: 'neutral',
  onBackground: 'neutral',
  inverseSurface: 'neutral',
  inverseOnSurface: 'neutral',
  shadow: 'neutral',
  scrim: 'neutral',
  surfaceDim: 'neutral',
  surfaceBright: 'neutral',
  surfaceContainerLowest: 'neutral',
  surfaceContainerLow: 'neutral',
  surfaceContainer: 'neutral',
  surfaceContainerHigh: 'neutral',
  surfaceContainerHighest: 'neutral',

  surfaceVariant: 'neutralVariant',
  onSurfaceVariant: 'neutralVariant',
  outline: 'neutralVariant',
  outlineVariant: 'neutralVariant',
};

// ============================================
// Material Design 3 Adapter Implementation
// ============================================

export class MaterialDesign3Adapter extends BaseDesignSystemAdapter {
  readonly config: DesignSystemConfig = {
    name: 'Material Design 3',
    version: '1.0.0',
    prefix: 'md',
    surfaceLevels: 5,
    tonalSteps: MD3_TONES,
    contrastRequirements: {
      text: 4.5,
      largeText: 3.0,
      ui: 3.0,
    },
  };

  private readonly palettes: Map<MD3ColorRole, TonalPalette> = new Map();

  // ============================================
  // Tonal Palette Generation
  // ============================================

  /**
   * Generate a tonal palette using HCT color space
   * Material Design 3 uses HCT for perceptually uniform tones
   */
  generateTonalPalette(keyColor: string | OKLCH, role: ColorRole): TonalPalette {
    const color = this.normalizeColor(keyColor);
    const hct = HCT.fromOKLCH(color);

    const tones: Record<number, OKLCH> = {};

    for (const tone of MD3_TONES) {
      // Generate HCT color at this tone
      const toneHct = HCT.create(hct.h, hct.c, tone);
      tones[tone] = toneHct.toOKLCH();
    }

    const palette: TonalPalette = {
      role,
      keyColor: color,
      tones,
      hue: hct.h,
      chroma: hct.c,
    };

    this.palettes.set(role as MD3ColorRole, palette);
    return palette;
  }

  /**
   * Generate neutral palette with reduced chroma
   */
  private generateNeutralPalette(keyColor: OKLCH): TonalPalette {
    const hct = HCT.fromOKLCH(keyColor);
    const neutralChroma = Math.min(hct.c * 0.1, 4);

    const tones: Record<number, OKLCH> = {};

    for (const tone of MD3_TONES) {
      const toneHct = HCT.create(hct.h, neutralChroma, tone);
      tones[tone] = toneHct.toOKLCH();
    }

    return {
      role: 'neutral',
      keyColor,
      tones,
      hue: hct.h,
      chroma: neutralChroma,
    };
  }

  /**
   * Generate neutral variant palette (slightly more chromatic)
   */
  private generateNeutralVariantPalette(keyColor: OKLCH): TonalPalette {
    const hct = HCT.fromOKLCH(keyColor);
    const variantChroma = Math.min(hct.c * 0.15, 8);

    const tones: Record<number, OKLCH> = {};

    for (const tone of MD3_TONES) {
      const toneHct = HCT.create(hct.h, variantChroma, tone);
      tones[tone] = toneHct.toOKLCH();
    }

    return {
      role: 'neutral' as ColorRole,
      keyColor,
      tones,
      hue: hct.h,
      chroma: variantChroma,
    };
  }

  // ============================================
  // Token Generation
  // ============================================

  /**
   * Generate complete Material Design 3 color scheme
   */
  generateTokens(options: ThemeGenerationOptions): ColorSchemeOutput {
    const primary = this.normalizeColor(options.primaryColor);
    const primaryHct = HCT.fromOKLCH(primary);

    // Generate secondary color (complementary reduced chroma)
    const secondaryHue = (primaryHct.h + 60) % 360;
    const secondaryColor = options.secondaryColor
      ? this.normalizeColor(options.secondaryColor)
      : HCT.create(secondaryHue, primaryHct.c * 0.4, 40).toOKLCH();

    // Generate tertiary color (analogous)
    const tertiaryHue = (primaryHct.h + 120) % 360;
    const tertiaryColor = options.tertiaryColor
      ? this.normalizeColor(options.tertiaryColor)
      : HCT.create(tertiaryHue, primaryHct.c * 0.6, 40).toOKLCH();

    // Error color (red)
    const errorColor = options.errorColor
      ? this.normalizeColor(options.errorColor)
      : HCT.create(25, 84, 40).toOKLCH();

    // Generate all palettes
    const primaryPalette = this.generateTonalPalette(primary, 'primary');
    const secondaryPalette = this.generateTonalPalette(secondaryColor, 'secondary');
    const tertiaryPalette = this.generateTonalPalette(tertiaryColor, 'tertiary');
    const errorPalette = this.generateTonalPalette(errorColor, 'error');
    const neutralPalette = this.generateNeutralPalette(primary);
    const neutralVariantPalette = this.generateNeutralVariantPalette(primary);

    // Store palettes
    this.palettes.set('primary', primaryPalette);
    this.palettes.set('secondary', secondaryPalette);
    this.palettes.set('tertiary', tertiaryPalette);
    this.palettes.set('error', errorPalette);
    this.palettes.set('neutral', neutralPalette);
    this.palettes.set('neutralVariant', neutralVariantPalette);

    // Generate tokens for requested scheme(s)
    if (options.scheme === 'both') {
      // For dual mode, return light scheme (caller would request dark separately)
      return this.generateSchemeTokens('light', options.contrastLevel);
    }

    return this.generateSchemeTokens(options.scheme, options.contrastLevel);
  }

  /**
   * Generate tokens for a specific color scheme
   */
  private generateSchemeTokens(
    scheme: ColorScheme,
    contrastLevel: 'standard' | 'medium' | 'high' = 'standard'
  ): ColorSchemeOutput {
    const toneMappings = scheme === 'light' ? LIGHT_SCHEME_TONES : DARK_SCHEME_TONES;
    const tokens: DesignSystemToken[] = [];

    // Apply contrast adjustments
    const contrastAdjustment = this.getContrastAdjustment(contrastLevel);

    for (const [tokenName, baseTone] of Object.entries(toneMappings)) {
      const paletteRole = ROLE_PALETTE_MAP[tokenName] || 'neutral';
      const palette = this.palettes.get(paletteRole);

      if (!palette) continue;

      // Adjust tone for contrast level
      const adjustedTone = this.adjustToneForContrast(
        baseTone,
        tokenName,
        scheme,
        contrastAdjustment
      );

      // Find closest available tone
      const closestTone = this.findClosestTone(adjustedTone);
      const color = palette.tones[closestTone];

      if (!color) continue;

      const token: DesignSystemToken = {
        name: tokenName,
        role: this.tokenNameToRole(tokenName),
        variant: this.tokenNameToVariant(tokenName),
        value: color,
        hex: color.toHex(),
        cssVariable: `--md-sys-color-${this.camelToKebab(tokenName)}`,
        description: this.generateTokenDescription(tokenName, scheme),
        contrastRatio: this.calculateTokenContrastRatio(tokenName, closestTone, palette, toneMappings),
        wcagLevel: this.determineWcagLevel(tokenName, closestTone, palette, toneMappings),
        usage: this.getTokenUsage(tokenName),
      };

      tokens.push(token);
    }

    const palettes = Array.from(this.palettes.values());

    return {
      scheme,
      tokens,
      palettes,
      cssVariables: this.toCssVariables(tokens),
      tailwindConfig: this.toTailwindConfig(tokens),
      figmaTokens: this.toFigmaTokens(tokens),
    };
  }

  // ============================================
  // Surface Calculations
  // ============================================

  /**
   * Calculate surface color at elevation level
   * Material Design 3 uses tonal elevation instead of shadow/overlay
   */
  calculateSurface(
    baseColor: OKLCH,
    elevation: SurfaceLevel,
    scheme: ColorScheme
  ): OKLCH {
    const hct = HCT.fromOKLCH(baseColor);

    // Map elevation to surface container tones
    const elevationTones: Record<ColorScheme, number[]> = {
      light: [98, 96, 94, 92, 90, 87], // surface through surfaceDim
      dark: [6, 10, 12, 17, 22, 24],   // surface through surfaceBright
    };

    const tones = elevationTones[scheme];
    const targetTone = tones[Math.min(elevation, tones.length - 1)] ?? tones[0] ?? 98;

    return HCT.create(hct.h, hct.c * 0.05, targetTone).toOKLCH();
  }

  /**
   * Calculate surface with primary tint overlay (legacy elevation style)
   */
  calculateSurfaceWithTint(
    surfaceColor: OKLCH,
    primaryColor: OKLCH,
    elevation: SurfaceLevel
  ): OKLCH {
    // Tint opacity based on elevation
    const tintOpacities = [0, 0.05, 0.08, 0.11, 0.12, 0.14] as const;
    const tintOpacity = tintOpacities[elevation] ?? 0.14;

    // Blend surface with primary tint
    const blendedL = surfaceColor.l + (primaryColor.l - surfaceColor.l) * tintOpacity;
    const blendedC = surfaceColor.c + (primaryColor.c - surfaceColor.c) * tintOpacity * 0.5;
    const blendedH = surfaceColor.h; // Keep surface hue

    return OKLCH.create(blendedL, blendedC, blendedH);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getContrastAdjustment(level: 'standard' | 'medium' | 'high'): number {
    switch (level) {
      case 'high': return 10;
      case 'medium': return 5;
      default: return 0;
    }
  }

  private adjustToneForContrast(
    baseTone: number,
    tokenName: string,
    scheme: ColorScheme,
    adjustment: number
  ): number {
    if (adjustment === 0) return baseTone;

    // Adjust "on" colors for more contrast
    if (tokenName.startsWith('on')) {
      if (scheme === 'light') {
        return Math.max(0, baseTone - adjustment);
      } else {
        return Math.min(100, baseTone + adjustment);
      }
    }

    return baseTone;
  }

  private findClosestTone(targetTone: number): number {
    return MD3_TONES.reduce((prev, curr) =>
      Math.abs(curr - targetTone) < Math.abs(prev - targetTone) ? curr : prev
    );
  }

  private tokenNameToRole(name: string): ColorRole {
    if (name.includes('primary') || name.includes('Primary')) return 'primary';
    if (name.includes('secondary') || name.includes('Secondary')) return 'secondary';
    if (name.includes('tertiary') || name.includes('Tertiary')) return 'tertiary';
    if (name.includes('error') || name.includes('Error')) return 'error';
    if (name.includes('surface') || name.includes('Surface')) return 'surface';
    if (name.includes('background') || name.includes('Background')) return 'surface';
    if (name.includes('outline') || name.includes('Outline')) return 'outline';
    if (name.includes('shadow') || name.includes('scrim')) return 'shadow';
    return 'neutral';
  }

  private tokenNameToVariant(name: string): ColorVariant {
    if (name.startsWith('on') && name.includes('Container')) return 'onContainer';
    if (name.startsWith('on') && name.includes('Fixed') && name.includes('Variant')) return 'onFixedVariant';
    if (name.startsWith('on') && name.includes('Fixed')) return 'onFixed';
    if (name.startsWith('on')) return 'on';
    if (name.includes('Container')) return 'container';
    if (name.includes('FixedDim')) return 'fixedDim';
    if (name.includes('Fixed')) return 'fixed';
    return 'main';
  }

  private calculateTokenContrastRatio(
    tokenName: string,
    tone: number,
    palette: TonalPalette,
    toneMappings: Record<string, number>
  ): number {
    // Find the paired token
    let pairedTokenName: string | null = null;

    if (tokenName.startsWith('on')) {
      pairedTokenName = tokenName.replace(/^on/, '').replace(/^[A-Z]/, c => c.toLowerCase());
    } else {
      pairedTokenName = `on${tokenName.charAt(0).toUpperCase()}${tokenName.slice(1)}`;
    }

    const pairedTone = toneMappings[pairedTokenName];
    if (pairedTone === undefined) return 0;

    const color = palette.tones[tone];
    const pairedColor = palette.tones[pairedTone];

    if (!color || !pairedColor) return 0;

    return this.calculateContrastRatio(color, pairedColor);
  }

  private determineWcagLevel(
    tokenName: string,
    tone: number,
    palette: TonalPalette,
    toneMappings: Record<string, number>
  ): 'Fail' | 'AA' | 'AAA' {
    const ratio = this.calculateTokenContrastRatio(tokenName, tone, palette, toneMappings);
    if (ratio >= 7) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'Fail';
  }

  private generateTokenDescription(tokenName: string, scheme: ColorScheme): string {
    const descriptions: Record<string, string> = {
      primary: 'Main brand color for key components',
      onPrimary: 'Text/icons on primary color',
      primaryContainer: 'Container for prominent surfaces',
      onPrimaryContainer: 'Text/icons on primary container',
      secondary: 'Supporting color for less prominent components',
      tertiary: 'Accent color for contrast and interest',
      error: 'Indicates errors and destructive actions',
      surface: 'Default background for screens',
      onSurface: 'Main content text color',
      outline: 'Borders and dividers',
    };

    const base = descriptions[tokenName.replace(/^(on|inverse)/, '').replace(/^[A-Z]/, c => c.toLowerCase())];
    return base || `${scheme} scheme ${tokenName} color`;
  }

  private getTokenUsage(tokenName: string): ReadonlyArray<string> {
    const usages: Record<string, string[]> = {
      primary: ['FABs', 'Primary buttons', 'Active states'],
      onPrimary: ['Text on FABs', 'Primary button labels'],
      primaryContainer: ['Card backgrounds', 'Chip backgrounds'],
      secondary: ['Secondary buttons', 'Toggle buttons'],
      tertiary: ['Accent highlights', 'Badges'],
      error: ['Error messages', 'Delete buttons'],
      surface: ['Screen backgrounds', 'Card surfaces'],
      onSurface: ['Body text', 'Headlines'],
      outline: ['Text fields', 'Dividers'],
    };

    return usages[tokenName] || ['General UI'];
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // ============================================
  // Export Overrides
  // ============================================

  /**
   * Material Design 3 specific CSS output with color scheme support
   */
  override toCssVariables(tokens: ReadonlyArray<DesignSystemToken>): string {
    const lines: string[] = [
      `/* Material Design 3 Color Tokens */`,
      `/* Generated by Color Intelligence */`,
      ``,
      `:root {`,
    ];

    for (const token of tokens) {
      lines.push(`  ${token.cssVariable}: ${token.hex};`);
    }

    lines.push(`}`);
    lines.push(``);
    lines.push(`/* Use with color-scheme: light dark; for automatic theme switching */`);

    return lines.join('\n');
  }

  /**
   * Material Design 3 specific Tailwind config
   */
  override toTailwindConfig(tokens: ReadonlyArray<DesignSystemToken>): object {
    const colors: Record<string, string> = {};

    for (const token of tokens) {
      colors[this.camelToKebab(token.name)] = `var(${token.cssVariable})`;
    }

    return {
      theme: {
        extend: {
          colors: {
            md: colors,
          },
        },
      },
    };
  }
}

// ============================================
// Factory Function
// ============================================

export function createMaterialDesign3Adapter(): MaterialDesign3Adapter {
  return new MaterialDesign3Adapter();
}

export default MaterialDesign3Adapter;
