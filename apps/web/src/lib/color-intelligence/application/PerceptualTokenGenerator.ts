// ============================================
// Perceptual Token Generator
// Generate Design Tokens from Brand Colors
// ============================================
//
// Generates semantically meaningful design tokens based on
// perceptual color science. Uses HCT/OKLCH for perceptual
// uniformity and ensures accessibility compliance.
//
// Token Categories:
// - Background surfaces (light/dark mode)
// - Text colors (primary, secondary, muted)
// - Accent variations (hover, active, disabled)
// - Semantic colors (success, warning, error, info)
//
// ============================================

import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast from '../domain/value-objects/APCAContrast';
import { detectContrastMode, ContrastMode } from './DetectContrastMode';

// ============================================
// Token Types
// ============================================

/**
 * Color scheme preference
 */
export type ColorScheme = 'light' | 'dark' | 'auto';

/**
 * A single design token
 */
export interface DesignToken {
  /** Token name (CSS variable name without --) */
  readonly name: string;

  /** Token value in hex */
  readonly hex: string;

  /** OKLCH representation */
  readonly oklch: {
    l: number;
    c: number;
    h: number;
  };

  /** HCT representation */
  readonly hct: {
    h: number;
    c: number;
    t: number;
  };

  /** CSS value (oklch format) */
  readonly cssValue: string;

  /** Semantic role */
  readonly role:
    | 'background'
    | 'surface'
    | 'text-primary'
    | 'text-secondary'
    | 'text-muted'
    | 'accent'
    | 'accent-hover'
    | 'accent-active'
    | 'accent-disabled'
    | 'border'
    | 'border-subtle'
    | 'success'
    | 'warning'
    | 'error'
    | 'info';

  /** APCA contrast against its typical background */
  readonly contrastRatio?: number;

  /** Accessibility notes */
  readonly a11yNotes?: string;
}

/**
 * Complete token palette
 */
export interface TokenPalette {
  /** Color scheme this palette is for */
  readonly scheme: 'light' | 'dark';

  /** Source brand color */
  readonly brandColor: string;

  /** All tokens in the palette */
  readonly tokens: ReadonlyArray<DesignToken>;

  /** Tokens indexed by name for quick access */
  readonly byName: Readonly<Record<string, DesignToken>>;

  /** Tokens indexed by role */
  readonly byRole: Readonly<Record<string, DesignToken>>;

  /** CSS custom properties output */
  readonly cssVariables: string;

  /** Tailwind config-compatible output */
  readonly tailwindConfig: object;
}

/**
 * Dual-mode token set (light + dark)
 */
export interface DualModeTokens {
  readonly light: TokenPalette;
  readonly dark: TokenPalette;
  readonly brandColor: string;
  readonly cssVariablesWithMediaQuery: string;
}

/**
 * Generation options
 */
export interface TokenGeneratorOptions {
  /** Prefix for CSS variable names */
  readonly prefix?: string;

  /** Include semantic colors */
  readonly includeSemantics?: boolean;

  /** Chroma reduction for backgrounds (0-1) */
  readonly backgroundChromaReduction?: number;

  /** Contrast target for text (APCA Lc) */
  readonly textContrastTarget?: number;

  /** Custom hue shift for accents */
  readonly accentHueShift?: number;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_OPTIONS: Required<TokenGeneratorOptions> = {
  prefix: 'color',
  includeSemantics: true,
  backgroundChromaReduction: 0.85,
  textContrastTarget: 75,
  accentHueShift: 0,
};

// ============================================
// Perceptual Token Generator Class
// ============================================

/**
 * PerceptualTokenGenerator
 *
 * Generates a complete design token palette from a brand color
 * using perceptual color science principles.
 *
 * @example
 * ```typescript
 * const generator = new PerceptualTokenGenerator();
 *
 * const tokens = generator.generate('#0EB58C', 'light');
 * // Returns TokenPalette with background, text, accent tokens
 *
 * const dualMode = generator.generateDualMode('#0EB58C');
 * // Returns both light and dark mode palettes
 * ```
 */
export class PerceptualTokenGenerator {
  private readonly options: Required<TokenGeneratorOptions>;

  constructor(options?: TokenGeneratorOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ============================================
  // Main Generation Methods
  // ============================================

  /**
   * Generate tokens for a single color scheme
   */
  generate(brandColor: string, scheme: 'light' | 'dark'): TokenPalette {
    const brand = OKLCH.fromHex(brandColor);
    if (!brand) {
      throw new Error(`Invalid brand color: ${brandColor}`);
    }

    const tokens: DesignToken[] = [];

    // ===== Background Tokens =====
    tokens.push(...this.generateBackgroundTokens(brand, scheme));

    // ===== Text Tokens =====
    tokens.push(...this.generateTextTokens(brand, scheme));

    // ===== Accent Tokens =====
    tokens.push(...this.generateAccentTokens(brand, scheme));

    // ===== Border Tokens =====
    tokens.push(...this.generateBorderTokens(brand, scheme));

    // ===== Semantic Tokens =====
    if (this.options.includeSemantics) {
      tokens.push(...this.generateSemanticTokens(brand, scheme));
    }

    // Build indexed maps
    const byName: Record<string, DesignToken> = {};
    const byRole: Record<string, DesignToken> = {};

    for (const token of tokens) {
      byName[token.name] = token;
      byRole[token.role] = token;
    }

    // Generate CSS
    const cssVariables = this.generateCSSVariables(tokens);

    // Generate Tailwind config
    const tailwindConfig = this.generateTailwindConfig(tokens);

    return {
      scheme,
      brandColor,
      tokens,
      byName,
      byRole,
      cssVariables,
      tailwindConfig,
    };
  }

  /**
   * Generate tokens for both light and dark modes
   */
  generateDualMode(brandColor: string): DualModeTokens {
    const light = this.generate(brandColor, 'light');
    const dark = this.generate(brandColor, 'dark');

    const cssVariablesWithMediaQuery = this.generateDualModeCss(light, dark);

    return {
      light,
      dark,
      brandColor,
      cssVariablesWithMediaQuery,
    };
  }

  // ============================================
  // Background Token Generation
  // ============================================

  private generateBackgroundTokens(brand: OKLCH, scheme: 'light' | 'dark'): DesignToken[] {
    const tokens: DesignToken[] = [];
    const hue = brand.h;
    const chromaReduction = this.options.backgroundChromaReduction;

    if (scheme === 'light') {
      // Light mode backgrounds
      tokens.push(this.createToken(
        'background',
        OKLCH.create(0.99, brand.c * 0.02, hue),
        'background',
        'Main page background'
      ));

      tokens.push(this.createToken(
        'surface',
        OKLCH.create(0.97, brand.c * 0.03, hue),
        'surface',
        'Card and component surfaces'
      ));
    } else {
      // Dark mode backgrounds
      tokens.push(this.createToken(
        'background',
        OKLCH.create(0.12, brand.c * 0.02, hue),
        'background',
        'Main page background'
      ));

      tokens.push(this.createToken(
        'surface',
        OKLCH.create(0.18, brand.c * 0.03, hue),
        'surface',
        'Card and component surfaces'
      ));
    }

    return tokens;
  }

  // ============================================
  // Text Token Generation
  // ============================================

  private generateTextTokens(brand: OKLCH, scheme: 'light' | 'dark'): DesignToken[] {
    const tokens: DesignToken[] = [];
    const hue = brand.h;

    // Get background for contrast calculation
    const bgLightness = scheme === 'light' ? 0.99 : 0.12;

    if (scheme === 'light') {
      // Dark text on light background
      tokens.push(this.createToken(
        'text-primary',
        OKLCH.create(0.15, 0.01, hue),
        'text-primary',
        'Primary body text',
        bgLightness
      ));

      tokens.push(this.createToken(
        'text-secondary',
        OKLCH.create(0.35, 0.015, hue),
        'text-secondary',
        'Secondary/supporting text',
        bgLightness
      ));

      tokens.push(this.createToken(
        'text-muted',
        OKLCH.create(0.55, 0.02, hue),
        'text-muted',
        'Muted/placeholder text',
        bgLightness
      ));
    } else {
      // Light text on dark background
      tokens.push(this.createToken(
        'text-primary',
        OKLCH.create(0.95, 0.01, hue),
        'text-primary',
        'Primary body text',
        bgLightness
      ));

      tokens.push(this.createToken(
        'text-secondary',
        OKLCH.create(0.80, 0.015, hue),
        'text-secondary',
        'Secondary/supporting text',
        bgLightness
      ));

      tokens.push(this.createToken(
        'text-muted',
        OKLCH.create(0.55, 0.02, hue),
        'text-muted',
        'Muted/placeholder text',
        bgLightness
      ));
    }

    return tokens;
  }

  // ============================================
  // Accent Token Generation
  // ============================================

  private generateAccentTokens(brand: OKLCH, scheme: 'light' | 'dark'): DesignToken[] {
    const tokens: DesignToken[] = [];
    const hueShift = this.options.accentHueShift;

    // Adjust brand for scheme
    let accentBase = brand;
    if (scheme === 'dark' && brand.l < 0.5) {
      // Lighten dark brand colors in dark mode
      accentBase = brand.withLightness(Math.min(0.7, brand.l + 0.2));
    } else if (scheme === 'light' && brand.l > 0.7) {
      // Darken light brand colors in light mode
      accentBase = brand.withLightness(Math.max(0.4, brand.l - 0.2));
    }

    // Main accent
    tokens.push(this.createToken(
      'accent',
      OKLCH.create(accentBase.l, accentBase.c, accentBase.h + hueShift),
      'accent',
      'Primary accent/brand color'
    ));

    // Hover state (slightly lighter/more saturated)
    const hoverL = scheme === 'light'
      ? Math.max(0.3, accentBase.l - 0.08)
      : Math.min(0.85, accentBase.l + 0.08);

    tokens.push(this.createToken(
      'accent-hover',
      OKLCH.create(hoverL, Math.min(0.4, accentBase.c * 1.1), accentBase.h + hueShift),
      'accent-hover',
      'Accent hover state'
    ));

    // Active state (more contrast)
    const activeL = scheme === 'light'
      ? Math.max(0.25, accentBase.l - 0.12)
      : Math.min(0.9, accentBase.l + 0.12);

    tokens.push(this.createToken(
      'accent-active',
      OKLCH.create(activeL, accentBase.c, accentBase.h + hueShift),
      'accent-active',
      'Accent active/pressed state'
    ));

    // Disabled state (desaturated)
    tokens.push(this.createToken(
      'accent-disabled',
      OKLCH.create(
        scheme === 'light' ? 0.65 : 0.45,
        accentBase.c * 0.3,
        accentBase.h + hueShift
      ),
      'accent-disabled',
      'Accent disabled state'
    ));

    return tokens;
  }

  // ============================================
  // Border Token Generation
  // ============================================

  private generateBorderTokens(brand: OKLCH, scheme: 'light' | 'dark'): DesignToken[] {
    const tokens: DesignToken[] = [];
    const hue = brand.h;

    if (scheme === 'light') {
      tokens.push(this.createToken(
        'border',
        OKLCH.create(0.80, 0.01, hue),
        'border',
        'Standard border color'
      ));

      tokens.push(this.createToken(
        'border-subtle',
        OKLCH.create(0.90, 0.005, hue),
        'border-subtle',
        'Subtle/soft border'
      ));
    } else {
      tokens.push(this.createToken(
        'border',
        OKLCH.create(0.35, 0.01, hue),
        'border',
        'Standard border color'
      ));

      tokens.push(this.createToken(
        'border-subtle',
        OKLCH.create(0.25, 0.005, hue),
        'border-subtle',
        'Subtle/soft border'
      ));
    }

    return tokens;
  }

  // ============================================
  // Semantic Token Generation
  // ============================================

  private generateSemanticTokens(brand: OKLCH, scheme: 'light' | 'dark'): DesignToken[] {
    const tokens: DesignToken[] = [];

    // Semantic hues (Material Design 3 inspired)
    const semanticHues = {
      success: 145, // Green
      warning: 45,  // Orange/Yellow
      error: 25,    // Red
      info: 230,    // Blue
    };

    const chromaBase = 0.18;
    const lightnessBase = scheme === 'light' ? 0.45 : 0.65;

    for (const [name, hue] of Object.entries(semanticHues)) {
      tokens.push(this.createToken(
        name,
        OKLCH.create(lightnessBase, chromaBase, hue),
        name as DesignToken['role'],
        `Semantic ${name} color`
      ));
    }

    return tokens;
  }

  // ============================================
  // Token Creation Helper
  // ============================================

  private createToken(
    name: string,
    oklch: OKLCH,
    role: DesignToken['role'],
    notes?: string,
    bgLightness?: number
  ): DesignToken {
    const hex = oklch.toHex();
    const hct = HCT.fromOKLCH(oklch);

    // Calculate contrast if background lightness provided
    let contrastRatio: number | undefined;
    let a11yNotes: string | undefined;

    if (bgLightness !== undefined) {
      const bgOklch = OKLCH.create(bgLightness, 0, 0);
      const apca = APCAContrast.calculate(hex, bgOklch.toHex());
      contrastRatio = apca.absoluteLc;

      if (contrastRatio >= 75) {
        a11yNotes = 'Excellent contrast for body text';
      } else if (contrastRatio >= 60) {
        a11yNotes = 'Good contrast for large text';
      } else if (contrastRatio >= 45) {
        a11yNotes = 'Suitable for headlines only';
      } else {
        a11yNotes = 'Low contrast - use for decorative purposes only';
      }
    }

    return {
      name: `${this.options.prefix}-${name}`,
      hex,
      oklch: { l: oklch.l, c: oklch.c, h: oklch.h },
      hct: { h: hct.h, c: hct.c, t: hct.t },
      cssValue: oklch.toCss(),
      role,
      contrastRatio,
      a11yNotes: a11yNotes ?? notes,
    };
  }

  // ============================================
  // Output Formatters
  // ============================================

  private generateCSSVariables(tokens: DesignToken[]): string {
    const lines = tokens.map(token =>
      `  --${token.name}: ${token.cssValue};`
    );

    return `:root {\n${lines.join('\n')}\n}`;
  }

  private generateDualModeCss(light: TokenPalette, dark: TokenPalette): string {
    const lightLines = light.tokens.map(token =>
      `  --${token.name}: ${token.cssValue};`
    );

    const darkLines = dark.tokens.map(token =>
      `  --${token.name}: ${token.cssValue};`
    );

    return `/* Light mode (default) */
:root {
${lightLines.join('\n')}
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
${darkLines.join('\n')}
  }
}

/* Dark mode class override */
.dark {
${darkLines.join('\n')}
}`;
  }

  private generateTailwindConfig(tokens: DesignToken[]): object {
    const colors: Record<string, string> = {};

    for (const token of tokens) {
      // Convert token name to Tailwind format
      const tailwindName = token.name
        .replace(`${this.options.prefix}-`, '')
        .replace(/-/g, '.');

      colors[tailwindName] = `var(--${token.name})`;
    }

    return {
      theme: {
        extend: {
          colors,
        },
      },
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get a specific token by role
   */
  getTokenByRole(palette: TokenPalette, role: DesignToken['role']): DesignToken | undefined {
    return palette.byRole[role];
  }

  /**
   * Validate palette accessibility
   */
  validatePalette(palette: TokenPalette): {
    valid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let totalScore = 0;
    let count = 0;

    const textTokens = palette.tokens.filter(t =>
      t.role.startsWith('text-')
    );

    const background = palette.byRole['background'];

    for (const token of textTokens) {
      if (background) {
        const apca = APCAContrast.calculate(token.hex, background.hex);

        if (apca.absoluteLc < 60) {
          issues.push(
            `${token.name} has low contrast (Lc ${apca.absoluteLc.toFixed(1)}) against background`
          );
        }

        totalScore += Math.min(100, apca.absoluteLc);
        count++;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      score: count > 0 ? totalScore / count : 0,
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a token generator with options
 */
export function createTokenGenerator(
  options?: TokenGeneratorOptions
): PerceptualTokenGenerator {
  return new PerceptualTokenGenerator(options);
}

/**
 * Quick generation of tokens
 */
export function generateTokens(
  brandColor: string,
  scheme: 'light' | 'dark' = 'light'
): TokenPalette {
  return new PerceptualTokenGenerator().generate(brandColor, scheme);
}

/**
 * Generate both light and dark mode tokens
 */
export function generateDualModeTokens(brandColor: string): DualModeTokens {
  return new PerceptualTokenGenerator().generateDualMode(brandColor);
}

export default PerceptualTokenGenerator;
