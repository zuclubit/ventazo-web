// ============================================
// Fluent UI Adapter
// Implements Microsoft's Fluent Design System
// Uses perceptual color algorithms for accessible palettes
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
// Fluent UI Specific Types
// ============================================

/**
 * Fluent UI color slots
 */
export type FluentColorSlot =
  | 'themeDarker'
  | 'themeDark'
  | 'themeDarkAlt'
  | 'themePrimary'
  | 'themeSecondary'
  | 'themeTertiary'
  | 'themeLight'
  | 'themeLighter'
  | 'themeLighterAlt';

/**
 * Fluent UI neutral slots
 */
export type FluentNeutralSlot =
  | 'black'
  | 'neutralDark'
  | 'neutralPrimary'
  | 'neutralPrimaryAlt'
  | 'neutralSecondary'
  | 'neutralSecondaryAlt'
  | 'neutralTertiary'
  | 'neutralTertiaryAlt'
  | 'neutralQuaternary'
  | 'neutralQuaternaryAlt'
  | 'neutralLight'
  | 'neutralLighter'
  | 'neutralLighterAlt'
  | 'white';

/**
 * Fluent UI semantic slots
 */
export type FluentSemanticSlot =
  | 'bodyBackground'
  | 'bodyStandoutBackground'
  | 'bodyFrameBackground'
  | 'bodyFrameDivider'
  | 'bodyText'
  | 'bodyTextChecked'
  | 'subText'
  | 'bodyDivider'
  | 'disabledBackground'
  | 'disabledText'
  | 'disabledBodyText'
  | 'focusBorder'
  | 'errorText'
  | 'warningText'
  | 'successText'
  | 'inputBorder'
  | 'inputBorderHovered'
  | 'inputBackground'
  | 'inputBackgroundChecked'
  | 'inputForegroundChecked'
  | 'inputText'
  | 'inputTextHovered'
  | 'inputPlaceholderText'
  | 'buttonBackground'
  | 'buttonBackgroundChecked'
  | 'buttonBackgroundHovered'
  | 'buttonBackgroundCheckedHovered'
  | 'buttonBackgroundPressed'
  | 'buttonBackgroundDisabled'
  | 'buttonBorder'
  | 'buttonText'
  | 'buttonTextHovered'
  | 'buttonTextChecked'
  | 'buttonTextCheckedHovered'
  | 'buttonTextPressed'
  | 'buttonTextDisabled'
  | 'buttonBorderDisabled'
  | 'primaryButtonBackground'
  | 'primaryButtonBackgroundHovered'
  | 'primaryButtonBackgroundPressed'
  | 'primaryButtonBackgroundDisabled'
  | 'primaryButtonBorder'
  | 'primaryButtonText'
  | 'primaryButtonTextHovered'
  | 'primaryButtonTextPressed'
  | 'primaryButtonTextDisabled'
  | 'accentButtonBackground'
  | 'accentButtonText'
  | 'menuBackground'
  | 'menuDivider'
  | 'menuIcon'
  | 'menuHeader'
  | 'menuItemBackgroundHovered'
  | 'menuItemBackgroundPressed'
  | 'menuItemText'
  | 'menuItemTextHovered'
  | 'listBackground'
  | 'listText'
  | 'listItemBackgroundHovered'
  | 'listItemBackgroundChecked'
  | 'listItemBackgroundCheckedHovered';

/**
 * Complete Fluent UI palette
 */
export interface FluentPalette {
  readonly themeColors: Readonly<Record<FluentColorSlot, string>>;
  readonly neutralColors: Readonly<Record<FluentNeutralSlot, string>>;
  readonly semanticColors: Partial<Readonly<Record<FluentSemanticSlot, string>>>;
}

// ============================================
// Fluent UI Constants
// ============================================

/**
 * Fluent shade mapping (lightness adjustments from primary)
 */
const FLUENT_SHADE_MAP: Record<FluentColorSlot, number> = {
  themeDarker: -0.28,
  themeDark: -0.20,
  themeDarkAlt: -0.12,
  themePrimary: 0,
  themeSecondary: 0.08,
  themeTertiary: 0.24,
  themeLight: 0.42,
  themeLighter: 0.54,
  themeLighterAlt: 0.68,
};

/**
 * Fluent neutral shade values (absolute lightness)
 */
const FLUENT_NEUTRAL_LIGHT: Record<FluentNeutralSlot, number> = {
  black: 0.00,
  neutralDark: 0.13,
  neutralPrimary: 0.20,
  neutralPrimaryAlt: 0.24,
  neutralSecondary: 0.40,
  neutralSecondaryAlt: 0.52,
  neutralTertiary: 0.60,
  neutralTertiaryAlt: 0.72,
  neutralQuaternary: 0.82,
  neutralQuaternaryAlt: 0.87,
  neutralLight: 0.92,
  neutralLighter: 0.96,
  neutralLighterAlt: 0.98,
  white: 1.00,
};

const FLUENT_NEUTRAL_DARK: Record<FluentNeutralSlot, number> = {
  black: 0.00,
  neutralDark: 0.95,
  neutralPrimary: 0.90,
  neutralPrimaryAlt: 0.85,
  neutralSecondary: 0.70,
  neutralSecondaryAlt: 0.55,
  neutralTertiary: 0.45,
  neutralTertiaryAlt: 0.35,
  neutralQuaternary: 0.25,
  neutralQuaternaryAlt: 0.20,
  neutralLight: 0.15,
  neutralLighter: 0.10,
  neutralLighterAlt: 0.06,
  white: 0.04,
};

// ============================================
// Fluent UI Adapter Implementation
// ============================================

export class FluentUIAdapter extends BaseDesignSystemAdapter {
  readonly config: DesignSystemConfig = {
    name: 'Fluent UI',
    version: '9.0.0',
    prefix: 'fluent',
    surfaceLevels: 5,
    tonalSteps: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    contrastRequirements: {
      text: 4.5,
      largeText: 3.0,
      ui: 3.0,
    },
  };

  private primaryColor: OKLCH | null = null;
  private readonly cachedPalettes: Map<string, TonalPalette> = new Map();

  // ============================================
  // Tonal Palette Generation
  // ============================================

  /**
   * Generate Fluent-style tonal palette
   * Uses OKLCH for perceptual uniformity
   */
  generateTonalPalette(keyColor: string | OKLCH, role: ColorRole): TonalPalette {
    const cacheKey = `${typeof keyColor === 'string' ? keyColor : keyColor.toHex()}-${role}`;

    if (this.cachedPalettes.has(cacheKey)) {
      return this.cachedPalettes.get(cacheKey)!;
    }

    const color = this.normalizeColor(keyColor);
    const tones: Record<number, OKLCH> = {};

    // Generate 11 tones (0-100 in steps of 10)
    for (let tone = 0; tone <= 100; tone += 10) {
      const lightness = tone / 100;

      // Fluent adjusts chroma based on lightness
      // Higher chroma at midtones, lower at extremes
      const chromaMultiplier = 1 - Math.abs(lightness - 0.5) * 0.6;
      const adjustedChroma = color.c * chromaMultiplier;

      tones[tone] = OKLCH.create(lightness, adjustedChroma, color.h);
    }

    const palette: TonalPalette = {
      role,
      keyColor: color,
      tones,
      hue: color.h,
      chroma: color.c,
    };

    this.cachedPalettes.set(cacheKey, palette);
    return palette;
  }

  // ============================================
  // Fluent Palette Generation
  // ============================================

  /**
   * Generate Fluent UI theme colors from primary
   */
  private generateThemeColors(primary: OKLCH): Record<FluentColorSlot, OKLCH> {
    const colors: Partial<Record<FluentColorSlot, OKLCH>> = {};

    for (const [slot, adjustment] of Object.entries(FLUENT_SHADE_MAP) as [FluentColorSlot, number][]) {
      const newLightness = Math.max(0, Math.min(1, primary.l + adjustment));

      // Adjust chroma based on lightness (Fluent desaturates at extremes)
      const chromaScale = 1 - Math.abs(adjustment) * 0.3;
      const newChroma = primary.c * chromaScale;

      colors[slot] = OKLCH.create(newLightness, newChroma, primary.h);
    }

    return colors as Record<FluentColorSlot, OKLCH>;
  }

  /**
   * Generate Fluent UI neutral colors
   */
  private generateNeutralColors(
    primary: OKLCH,
    scheme: ColorScheme
  ): Record<FluentNeutralSlot, OKLCH> {
    const neutralMap = scheme === 'light' ? FLUENT_NEUTRAL_LIGHT : FLUENT_NEUTRAL_DARK;
    const colors: Partial<Record<FluentNeutralSlot, OKLCH>> = {};

    // Fluent neutrals have a subtle tint from the primary color
    const neutralChroma = Math.min(primary.c * 0.04, 0.01);

    for (const [slot, lightness] of Object.entries(neutralMap) as [FluentNeutralSlot, number][]) {
      colors[slot] = OKLCH.create(lightness, neutralChroma, primary.h);
    }

    return colors as Record<FluentNeutralSlot, OKLCH>;
  }

  /**
   * Generate semantic colors based on theme and neutrals
   */
  private generateSemanticColors(
    themeColors: Record<FluentColorSlot, OKLCH>,
    neutralColors: Record<FluentNeutralSlot, OKLCH>,
    scheme: ColorScheme
  ): Partial<Record<FluentSemanticSlot, OKLCH>> {
    const isLight = scheme === 'light';

    // Status colors
    const errorRed = OKLCH.create(isLight ? 0.5 : 0.7, 0.2, 25);
    const warningYellow = OKLCH.create(isLight ? 0.6 : 0.75, 0.15, 85);
    const successGreen = OKLCH.create(isLight ? 0.5 : 0.7, 0.15, 145);

    return {
      // Backgrounds
      bodyBackground: neutralColors.white,
      bodyStandoutBackground: neutralColors.neutralLighterAlt,
      bodyFrameBackground: neutralColors.neutralLighter,
      bodyFrameDivider: neutralColors.neutralLight,

      // Text
      bodyText: neutralColors.neutralPrimary,
      bodyTextChecked: neutralColors.neutralDark,
      subText: neutralColors.neutralSecondary,
      bodyDivider: neutralColors.neutralLight,

      // Disabled
      disabledBackground: neutralColors.neutralLighter,
      disabledText: neutralColors.neutralTertiary,
      disabledBodyText: neutralColors.neutralTertiary,

      // Focus
      focusBorder: themeColors.themePrimary,

      // Status
      errorText: errorRed,
      warningText: warningYellow,
      successText: successGreen,

      // Input
      inputBorder: neutralColors.neutralTertiary,
      inputBorderHovered: neutralColors.neutralPrimary,
      inputBackground: neutralColors.white,
      inputBackgroundChecked: themeColors.themePrimary,
      inputForegroundChecked: neutralColors.white,
      inputText: neutralColors.neutralPrimary,
      inputTextHovered: neutralColors.neutralDark,
      inputPlaceholderText: neutralColors.neutralSecondary,

      // Button
      buttonBackground: neutralColors.white,
      buttonBackgroundChecked: neutralColors.neutralLighter,
      buttonBackgroundHovered: neutralColors.neutralLighter,
      buttonBackgroundCheckedHovered: neutralColors.neutralLight,
      buttonBackgroundPressed: neutralColors.neutralLight,
      buttonBackgroundDisabled: neutralColors.neutralLighter,
      buttonBorder: neutralColors.neutralSecondaryAlt,
      buttonText: neutralColors.neutralPrimary,
      buttonTextHovered: neutralColors.neutralDark,
      buttonTextChecked: neutralColors.neutralDark,
      buttonTextCheckedHovered: neutralColors.black,
      buttonTextPressed: neutralColors.neutralDark,
      buttonTextDisabled: neutralColors.neutralTertiary,
      buttonBorderDisabled: neutralColors.neutralLighter,

      // Primary button
      primaryButtonBackground: themeColors.themePrimary,
      primaryButtonBackgroundHovered: themeColors.themeDarkAlt,
      primaryButtonBackgroundPressed: themeColors.themeDark,
      primaryButtonBackgroundDisabled: neutralColors.neutralLighter,
      primaryButtonBorder: themeColors.themePrimary,
      primaryButtonText: neutralColors.white,
      primaryButtonTextHovered: neutralColors.white,
      primaryButtonTextPressed: neutralColors.white,
      primaryButtonTextDisabled: neutralColors.neutralQuaternary,

      // Accent button
      accentButtonBackground: themeColors.themePrimary,
      accentButtonText: neutralColors.white,

      // Menu
      menuBackground: neutralColors.white,
      menuDivider: neutralColors.neutralLight,
      menuIcon: themeColors.themePrimary,
      menuHeader: themeColors.themePrimary,
      menuItemBackgroundHovered: neutralColors.neutralLighter,
      menuItemBackgroundPressed: neutralColors.neutralLight,
      menuItemText: neutralColors.neutralPrimary,
      menuItemTextHovered: neutralColors.neutralDark,

      // List
      listBackground: neutralColors.white,
      listText: neutralColors.neutralPrimary,
      listItemBackgroundHovered: neutralColors.neutralLighter,
      listItemBackgroundChecked: neutralColors.neutralLight,
      listItemBackgroundCheckedHovered: neutralColors.neutralQuaternaryAlt,
    };
  }

  // ============================================
  // Token Generation
  // ============================================

  /**
   * Generate complete Fluent UI tokens
   */
  generateTokens(options: ThemeGenerationOptions): ColorSchemeOutput {
    const primary = this.normalizeColor(options.primaryColor);
    this.primaryColor = primary;

    const scheme = options.scheme === 'both' ? 'light' : options.scheme;

    // Generate color sets
    const themeColors = this.generateThemeColors(primary);
    const neutralColors = this.generateNeutralColors(primary, scheme);
    const semanticColors = this.generateSemanticColors(themeColors, neutralColors, scheme);

    // Convert to tokens
    const tokens: DesignSystemToken[] = [];

    // Theme color tokens
    for (const [slot, color] of Object.entries(themeColors) as [FluentColorSlot, OKLCH][]) {
      tokens.push(this.createToken(slot, 'primary', color, 'Theme color'));
    }

    // Neutral color tokens
    for (const [slot, color] of Object.entries(neutralColors) as [FluentNeutralSlot, OKLCH][]) {
      tokens.push(this.createToken(slot, 'neutral', color, 'Neutral color'));
    }

    // Semantic color tokens
    for (const [slot, color] of Object.entries(semanticColors) as [FluentSemanticSlot, OKLCH][]) {
      if (color) {
        const role = this.semanticSlotToRole(slot);
        tokens.push(this.createToken(slot, role, color, 'Semantic color'));
      }
    }

    // Generate tonal palette for reference
    const primaryPalette = this.generateTonalPalette(primary, 'primary');
    const neutralPalette = this.generateTonalPalette(
      OKLCH.create(0.5, 0.01, primary.h),
      'neutral'
    );

    return {
      scheme,
      tokens,
      palettes: [primaryPalette, neutralPalette],
      cssVariables: this.toCssVariables(tokens),
      tailwindConfig: this.toTailwindConfig(tokens),
      figmaTokens: this.toFigmaTokens(tokens),
    };
  }

  /**
   * Create a single token
   */
  private createToken(
    name: string,
    role: ColorRole,
    color: OKLCH,
    description: string
  ): DesignSystemToken {
    return {
      name,
      role,
      variant: this.slotToVariant(name),
      value: color,
      hex: color.toHex(),
      cssVariable: `--${this.camelToKebab(name)}`,
      description,
      contrastRatio: 0, // Calculated in validation
      wcagLevel: 'AA' as const,
      usage: this.getSlotUsage(name),
    };
  }

  private semanticSlotToRole(slot: string): ColorRole {
    if (slot.includes('primary') || slot.includes('Primary')) return 'primary';
    if (slot.includes('accent') || slot.includes('Accent')) return 'secondary';
    if (slot.includes('error') || slot.includes('Error')) return 'error';
    if (slot.includes('warning') || slot.includes('Warning')) return 'warning';
    if (slot.includes('success') || slot.includes('Success')) return 'success';
    return 'neutral';
  }

  private slotToVariant(slot: string): ColorVariant {
    if (slot.includes('Darker') || slot.includes('Dark')) return 'main';
    if (slot.includes('Light')) return 'container';
    if (slot.includes('Hovered')) return 'main';
    if (slot.includes('Pressed')) return 'main';
    return 'main';
  }

  private getSlotUsage(slot: string): ReadonlyArray<string> {
    if (slot.includes('button') || slot.includes('Button')) {
      return ['Buttons', 'Interactive elements'];
    }
    if (slot.includes('input') || slot.includes('Input')) {
      return ['Text fields', 'Form controls'];
    }
    if (slot.includes('menu') || slot.includes('Menu')) {
      return ['Menus', 'Dropdowns'];
    }
    if (slot.includes('list') || slot.includes('List')) {
      return ['Lists', 'Tables'];
    }
    if (slot.includes('body') || slot.includes('Body')) {
      return ['Page backgrounds', 'Content areas'];
    }
    return ['General UI'];
  }

  // ============================================
  // Surface Calculations
  // ============================================

  /**
   * Calculate surface at elevation level
   * Fluent uses subtle gradations for depth
   */
  calculateSurface(
    baseColor: OKLCH,
    elevation: SurfaceLevel,
    scheme: ColorScheme
  ): OKLCH {
    const isLight = scheme === 'light';

    // Fluent elevation increases darkness in light mode, lightness in dark mode
    const elevationStep = 0.02;
    const adjustment = elevation * elevationStep * (isLight ? -1 : 1);

    const newLightness = Math.max(0, Math.min(1, baseColor.l + adjustment));

    return OKLCH.create(newLightness, baseColor.c, baseColor.h);
  }

  // ============================================
  // Export Formats
  // ============================================

  /**
   * Generate Fluent UI CSS custom properties
   */
  override toCssVariables(tokens: ReadonlyArray<DesignSystemToken>): string {
    const lines: string[] = [
      `/* Fluent UI Theme */`,
      `/* Generated by Color Intelligence */`,
      ``,
      `:root {`,
    ];

    // Group by category
    const themeTokens = tokens.filter(t => t.name.startsWith('theme'));
    const neutralTokens = tokens.filter(t => t.name.startsWith('neutral') || t.name === 'black' || t.name === 'white');
    const semanticTokens = tokens.filter(t => !themeTokens.includes(t) && !neutralTokens.includes(t));

    lines.push(`  /* Theme Colors */`);
    for (const token of themeTokens) {
      lines.push(`  ${token.cssVariable}: ${token.hex};`);
    }

    lines.push(``);
    lines.push(`  /* Neutral Colors */`);
    for (const token of neutralTokens) {
      lines.push(`  ${token.cssVariable}: ${token.hex};`);
    }

    lines.push(``);
    lines.push(`  /* Semantic Colors */`);
    for (const token of semanticTokens) {
      lines.push(`  ${token.cssVariable}: ${token.hex};`);
    }

    lines.push(`}`);

    return lines.join('\n');
  }

  /**
   * Generate Tailwind config for Fluent UI
   */
  override toTailwindConfig(tokens: ReadonlyArray<DesignSystemToken>): object {
    const theme: Record<string, Record<string, string>> = {};
    const neutral: Record<string, string> = {};
    const semantic: Record<string, string> = {};

    for (const token of tokens) {
      const varRef = `var(${token.cssVariable})`;

      if (token.name.startsWith('theme')) {
        const key = this.camelToKebab(token.name.replace('theme', ''));
        if (!theme['theme']) theme['theme'] = {};
        theme['theme'][key || 'DEFAULT'] = varRef;
      } else if (token.name.startsWith('neutral') || token.name === 'black' || token.name === 'white') {
        const key = this.camelToKebab(token.name.replace('neutral', ''));
        neutral[key || 'DEFAULT'] = varRef;
      } else {
        const key = this.camelToKebab(token.name);
        semantic[key] = varRef;
      }
    }

    return {
      theme: {
        extend: {
          colors: {
            fluent: {
              ...theme,
              neutral,
              ...semantic,
            },
          },
        },
      },
    };
  }

  /**
   * Generate Figma-compatible tokens
   */
  override toFigmaTokens(tokens: ReadonlyArray<DesignSystemToken>): object {
    const figmaTokens: Record<string, object> = {
      color: {
        theme: {},
        neutral: {},
        semantic: {},
      },
    };

    for (const token of tokens) {
      const tokenData = {
        value: token.hex,
        type: 'color',
        description: token.description,
      };

      const colorObj = figmaTokens['color'] as Record<string, Record<string, object>>;
      if (token.name.startsWith('theme')) {
        colorObj['theme']![token.name] = tokenData;
      } else if (token.name.startsWith('neutral') || token.name === 'black' || token.name === 'white') {
        colorObj['neutral']![token.name] = tokenData;
      } else {
        colorObj['semantic']![token.name] = tokenData;
      }
    }

    return figmaTokens;
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }
}

// ============================================
// Factory Function
// ============================================

export function createFluentUIAdapter(): FluentUIAdapter {
  return new FluentUIAdapter();
}

export default FluentUIAdapter;
