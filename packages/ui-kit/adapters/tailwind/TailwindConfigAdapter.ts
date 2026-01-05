/**
 * @fileoverview Tailwind Config Adapter
 *
 * Adaptador para generar configuración de Tailwind CSS desde tokens de diseño.
 * Convierte TokenCollection a formato compatible con tailwind.config.js.
 *
 * @module ui-kit/adapters/tailwind/TailwindConfigAdapter
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import type { TokenCollection, DesignToken } from '../../domain/tokens';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opciones de configuración del adaptador Tailwind.
 */
export interface TailwindAdapterOptions {
  /** Prefijo para clases generadas */
  readonly prefix?: string;
  /** Si usar CSS variables en lugar de valores directos */
  readonly useCssVariables?: boolean;
  /** Prefijo de CSS variables */
  readonly cssVariablePrefix?: string;
  /** Si extender la configuración existente o reemplazar */
  readonly extend?: boolean;
  /** Namespaces de tokens a incluir */
  readonly includeNamespaces?: string[];
  /** Namespaces de tokens a excluir */
  readonly excludeNamespaces?: string[];
  /** Formato de salida */
  readonly outputFormat?: 'js' | 'ts' | 'json' | 'esm' | 'cjs';
  /** Si incluir tipos TypeScript */
  readonly includeTypes?: boolean;
  /** Configuración personalizada de mapeo */
  readonly customMappings?: Record<string, string>;
}

/**
 * Resultado de la generación de configuración.
 */
export interface TailwindConfigResult {
  /** Configuración generada */
  readonly config: TailwindThemeConfig;
  /** Contenido exportable como string */
  readonly content: string;
  /** Estadísticas de generación */
  readonly stats: {
    readonly totalTokens: number;
    readonly colorTokens: number;
    readonly spacingTokens: number;
    readonly typographyTokens: number;
    readonly otherTokens: number;
  };
}

/**
 * Configuración de tema de Tailwind.
 */
export interface TailwindThemeConfig {
  colors?: Record<string, string | Record<string, string>>;
  spacing?: Record<string, string>;
  fontSize?: Record<string, string | [string, { lineHeight?: string; letterSpacing?: string; fontWeight?: string }]>;
  fontFamily?: Record<string, string[]>;
  fontWeight?: Record<string, string>;
  lineHeight?: Record<string, string>;
  letterSpacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  borderWidth?: Record<string, string>;
  boxShadow?: Record<string, string>;
  opacity?: Record<string, string>;
  zIndex?: Record<string, string>;
  transitionDuration?: Record<string, string>;
  transitionTimingFunction?: Record<string, string>;
  animation?: Record<string, string>;
  keyframes?: Record<string, Record<string, Record<string, string>>>;
}

/**
 * Configuración completa de Tailwind.
 */
export interface FullTailwindConfig {
  content?: string[];
  theme?: {
    extend?: TailwindThemeConfig;
  } & TailwindThemeConfig;
  plugins?: unknown[];
  darkMode?: 'media' | 'class' | ['class', string];
  prefix?: string;
}

/**
 * Opciones por defecto.
 */
const DEFAULT_OPTIONS: Required<TailwindAdapterOptions> = {
  prefix: '',
  useCssVariables: true,
  cssVariablePrefix: '',
  extend: true,
  includeNamespaces: [],
  excludeNamespaces: [],
  outputFormat: 'js',
  includeTypes: false,
  customMappings: {},
};

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * TailwindConfigAdapter - Adaptador de tokens a configuración de Tailwind.
 *
 * Convierte una colección de tokens de diseño en configuración compatible
 * con Tailwind CSS, con soporte para CSS variables y extensiones.
 *
 * @example
 * ```typescript
 * const adapter = new TailwindConfigAdapter({
 *   useCssVariables: true,
 *   cssVariablePrefix: 'color',
 *   extend: true,
 *   outputFormat: 'ts',
 * });
 *
 * const result = await adapter.generate(tokenCollection);
 *
 * if (result.success) {
 *   console.log(result.value.content);
 *   // Output: module.exports = { theme: { extend: { colors: { ... } } } }
 * }
 * ```
 */
export class TailwindConfigAdapter {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly options: Required<TailwindAdapterOptions>;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(options: TailwindAdapterOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera configuración de Tailwind desde tokens.
   */
  async generate(collection: TokenCollection): Promise<Result<TailwindConfigResult, Error>> {
    try {
      const tokens = this.filterTokens(collection);
      const themeConfig = this.buildThemeConfig(tokens);
      const content = this.formatOutput(themeConfig);
      const stats = this.calculateStats(tokens);

      return success({
        config: themeConfig,
        content,
        stats,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate Tailwind config')
      );
    }
  }

  /**
   * Genera configuración completa de Tailwind incluyendo plugins y dark mode.
   */
  async generateFull(
    collection: TokenCollection,
    baseConfig?: Partial<FullTailwindConfig>
  ): Promise<Result<{ config: FullTailwindConfig; content: string }, Error>> {
    try {
      const themeResult = await this.generate(collection);
      if (!themeResult.success) {
        return failure(themeResult.error);
      }

      const fullConfig: FullTailwindConfig = {
        content: baseConfig?.content ?? ['./src/**/*.{js,ts,jsx,tsx}'],
        darkMode: baseConfig?.darkMode ?? 'class',
        prefix: this.options.prefix || baseConfig?.prefix || '',
        theme: this.options.extend
          ? { extend: themeResult.value.config }
          : themeResult.value.config,
        plugins: baseConfig?.plugins ?? [],
      };

      const content = this.formatFullConfig(fullConfig);

      return success({ config: fullConfig, content });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate full Tailwind config')
      );
    }
  }

  /**
   * Genera solo la sección de colores.
   */
  async generateColors(
    collection: TokenCollection
  ): Promise<Result<Record<string, string | Record<string, string>>, Error>> {
    try {
      const tokens = this.filterTokens(collection);
      const colorTokens = tokens.filter((t) => this.isColorToken(t));
      const colors = this.buildColorConfig(colorTokens);
      return success(colors);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate colors')
      );
    }
  }

  /**
   * Genera una escala de colores para un nombre base.
   */
  async generateColorScale(
    collection: TokenCollection,
    baseName: string
  ): Promise<Result<Record<string, string>, Error>> {
    try {
      const tokens = collection.getByPath(`${baseName}.`);
      const scale: Record<string, string> = {};

      for (const token of tokens) {
        const parts = token.path;  // path is already string[]
        const key = parts[parts.length - 1];
        scale[key] = this.formatTokenValue(token);
      }

      return success(scale);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate color scale')
      );
    }
  }

  /**
   * Genera el plugin de Tailwind para los tokens.
   */
  async generatePlugin(
    collection: TokenCollection
  ): Promise<Result<string, Error>> {
    try {
      const tokens = this.filterTokens(collection);
      const colorTokens = tokens.filter((t) => this.isColorToken(t));

      let plugin = `const plugin = require('tailwindcss/plugin');\n\n`;
      plugin += `module.exports = plugin(function({ addBase, addUtilities, theme }) {\n`;
      plugin += `  // Add CSS variables to :root\n`;
      plugin += `  addBase({\n`;
      plugin += `    ':root': {\n`;

      for (const token of colorTokens) {
        const varName = this.tokenToVariableName(token);
        const value = this.getTokenRawValue(token);
        plugin += `      '${varName}': '${value}',\n`;
      }

      plugin += `    },\n`;
      plugin += `    '.dark': {\n`;
      plugin += `      // Dark mode overrides go here\n`;
      plugin += `    },\n`;
      plugin += `  });\n`;
      plugin += `});\n`;

      return success(plugin);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate plugin')
      );
    }
  }

  /**
   * Valida si una configuración es compatible.
   */
  async validate(
    config: TailwindThemeConfig
  ): Promise<Result<{ valid: boolean; warnings: string[] }, Error>> {
    const warnings: string[] = [];

    // Check for potential issues
    if (config.colors) {
      for (const [key, value] of Object.entries(config.colors)) {
        if (typeof value === 'string' && !this.isValidColorValue(value)) {
          warnings.push(`Color "${key}" has potentially invalid value: ${value}`);
        }
      }
    }

    if (config.spacing) {
      for (const [key, value] of Object.entries(config.spacing)) {
        if (!this.isValidSpacingValue(value)) {
          warnings.push(`Spacing "${key}" has potentially invalid value: ${value}`);
        }
      }
    }

    return success({ valid: warnings.length === 0, warnings });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private filterTokens(collection: TokenCollection): DesignToken[] {
    let tokens = collection.getAll();

    if (this.options.includeNamespaces.length > 0) {
      tokens = tokens.filter((t) =>
        this.options.includeNamespaces.some((ns) => t.name.startsWith(ns))
      );
    }

    if (this.options.excludeNamespaces.length > 0) {
      tokens = tokens.filter((t) =>
        !this.options.excludeNamespaces.some((ns) => t.name.startsWith(ns))
      );
    }

    return [...tokens];  // Convert readonly to mutable array
  }

  private buildThemeConfig(tokens: DesignToken[]): TailwindThemeConfig {
    const config: TailwindThemeConfig = {};

    // Group tokens by type
    const colorTokens = tokens.filter((t) => this.isColorToken(t));
    const spacingTokens = tokens.filter((t) => this.isSpacingToken(t));
    const typographyTokens = tokens.filter((t) => this.isTypographyToken(t));
    const shadowTokens = tokens.filter((t) => this.isShadowToken(t));
    const borderTokens = tokens.filter((t) => this.isBorderToken(t));

    // Build color config
    if (colorTokens.length > 0) {
      config.colors = this.buildColorConfig(colorTokens);
    }

    // Build spacing config
    if (spacingTokens.length > 0) {
      config.spacing = this.buildSpacingConfig(spacingTokens);
    }

    // Build typography config
    if (typographyTokens.length > 0) {
      const typo = this.buildTypographyConfig(typographyTokens);
      if (typo.fontSize && Object.keys(typo.fontSize).length > 0) {
        config.fontSize = typo.fontSize;
      }
      if (typo.fontFamily && Object.keys(typo.fontFamily).length > 0) {
        config.fontFamily = typo.fontFamily;
      }
      if (typo.fontWeight && Object.keys(typo.fontWeight).length > 0) {
        config.fontWeight = typo.fontWeight;
      }
      if (typo.lineHeight && Object.keys(typo.lineHeight).length > 0) {
        config.lineHeight = typo.lineHeight;
      }
      if (typo.letterSpacing && Object.keys(typo.letterSpacing).length > 0) {
        config.letterSpacing = typo.letterSpacing;
      }
    }

    // Build shadow config
    if (shadowTokens.length > 0) {
      config.boxShadow = this.buildShadowConfig(shadowTokens);
    }

    // Build border config
    if (borderTokens.length > 0) {
      const border = this.buildBorderConfig(borderTokens);
      if (border.borderRadius && Object.keys(border.borderRadius).length > 0) {
        config.borderRadius = border.borderRadius;
      }
      if (border.borderWidth && Object.keys(border.borderWidth).length > 0) {
        config.borderWidth = border.borderWidth;
      }
    }

    return config;
  }

  private buildColorConfig(
    tokens: DesignToken[]
  ): Record<string, string | Record<string, string>> {
    const colors: Record<string, string | Record<string, string>> = {};

    // Group by base name
    const grouped = new Map<string, DesignToken[]>();

    for (const token of tokens) {
      const parts = token.path;  // path is already string[]
      // Remove 'color' prefix if present
      const relevantParts = parts[0] === 'color' ? parts.slice(1) : parts;

      if (relevantParts.length >= 2) {
        const baseName = relevantParts[0];
        if (!grouped.has(baseName)) {
          grouped.set(baseName, []);
        }
        grouped.get(baseName)!.push(token);
      } else if (relevantParts.length === 1) {
        colors[relevantParts[0]] = this.formatTokenValue(token);
      }
    }

    // Build nested colors
    for (const [baseName, groupTokens] of grouped) {
      if (groupTokens.length === 1) {
        colors[baseName] = this.formatTokenValue(groupTokens[0]);
      } else {
        const scale: Record<string, string> = {};
        for (const token of groupTokens) {
          const parts = token.path;  // path is already string[]
          const relevantParts = parts[0] === 'color' ? parts.slice(1) : parts;
          const key = relevantParts.slice(1).join('-') || 'DEFAULT';
          scale[key] = this.formatTokenValue(token);
        }
        colors[baseName] = scale;
      }
    }

    return colors;
  }

  private buildSpacingConfig(tokens: DesignToken[]): Record<string, string> {
    const spacing: Record<string, string> = {};

    for (const token of tokens) {
      const key = this.tokenToKey(token, 'spacing');
      spacing[key] = this.formatTokenValue(token);
    }

    return spacing;
  }

  private buildTypographyConfig(tokens: DesignToken[]): {
    fontSize?: Record<string, string>;
    fontFamily?: Record<string, string[]>;
    fontWeight?: Record<string, string>;
    lineHeight?: Record<string, string>;
    letterSpacing?: Record<string, string>;
  } {
    const result: {
      fontSize?: Record<string, string>;
      fontFamily?: Record<string, string[]>;
      fontWeight?: Record<string, string>;
      lineHeight?: Record<string, string>;
      letterSpacing?: Record<string, string>;
    } = {};

    for (const token of tokens) {
      const pathStr = token.name.toLowerCase();

      if (pathStr.includes('size') || pathStr.includes('fontsize')) {
        result.fontSize = result.fontSize ?? {};
        const key = this.tokenToKey(token, 'fontSize');
        result.fontSize[key] = this.formatTokenValue(token);
      } else if (pathStr.includes('family') || pathStr.includes('fontfamily')) {
        result.fontFamily = result.fontFamily ?? {};
        const key = this.tokenToKey(token, 'fontFamily');
        const value = this.getTokenRawValue(token);
        result.fontFamily[key] = typeof value === 'string' ? [value] : value as string[];
      } else if (pathStr.includes('weight') || pathStr.includes('fontweight')) {
        result.fontWeight = result.fontWeight ?? {};
        const key = this.tokenToKey(token, 'fontWeight');
        result.fontWeight[key] = this.formatTokenValue(token);
      } else if (pathStr.includes('lineheight') || pathStr.includes('line-height')) {
        result.lineHeight = result.lineHeight ?? {};
        const key = this.tokenToKey(token, 'lineHeight');
        result.lineHeight[key] = this.formatTokenValue(token);
      } else if (pathStr.includes('letterspacing') || pathStr.includes('letter-spacing')) {
        result.letterSpacing = result.letterSpacing ?? {};
        const key = this.tokenToKey(token, 'letterSpacing');
        result.letterSpacing[key] = this.formatTokenValue(token);
      }
    }

    return result;
  }

  private buildShadowConfig(tokens: DesignToken[]): Record<string, string> {
    const shadows: Record<string, string> = {};

    for (const token of tokens) {
      const key = this.tokenToKey(token, 'shadow');
      shadows[key] = this.formatTokenValue(token);
    }

    return shadows;
  }

  private buildBorderConfig(tokens: DesignToken[]): {
    borderRadius?: Record<string, string>;
    borderWidth?: Record<string, string>;
  } {
    const result: {
      borderRadius?: Record<string, string>;
      borderWidth?: Record<string, string>;
    } = {};

    for (const token of tokens) {
      const pathStr = token.name.toLowerCase();

      if (pathStr.includes('radius')) {
        result.borderRadius = result.borderRadius ?? {};
        const key = this.tokenToKey(token, 'borderRadius');
        result.borderRadius[key] = this.formatTokenValue(token);
      } else if (pathStr.includes('width')) {
        result.borderWidth = result.borderWidth ?? {};
        const key = this.tokenToKey(token, 'borderWidth');
        result.borderWidth[key] = this.formatTokenValue(token);
      }
    }

    return result;
  }

  private formatTokenValue(token: DesignToken): string {
    if (this.options.useCssVariables) {
      return `var(${this.tokenToVariableName(token)})`;
    }
    return String(this.getTokenRawValue(token));
  }

  private tokenToVariableName(token: DesignToken): string {
    const prefix = this.options.cssVariablePrefix
      ? `--${this.options.cssVariablePrefix}-`
      : '--';
    return `${prefix}${token.name.replace(/\./g, '-')}`;
  }

  private tokenToKey(token: DesignToken, type: string): string {
    const parts = token.path;  // path is already string[]

    // Remove type prefix if matches
    const typePrefix = type.toLowerCase();
    const relevantParts = parts[0].toLowerCase().includes(typePrefix)
      ? parts.slice(1)
      : parts;

    return relevantParts.join('-') || 'DEFAULT';
  }

  private getTokenRawValue(token: DesignToken): unknown {
    return (token as unknown as { value: unknown }).value;
  }

  private isColorToken(token: DesignToken): boolean {
    const pathStr = token.name.toLowerCase();
    return (
      pathStr.includes('color') ||
      pathStr.includes('background') ||
      pathStr.includes('foreground') ||
      pathStr.includes('border') ||
      pathStr.includes('text') ||
      pathStr.includes('brand') ||
      pathStr.includes('surface') ||
      pathStr.includes('accent') ||
      pathStr.includes('primary') ||
      pathStr.includes('secondary') ||
      pathStr.includes('success') ||
      pathStr.includes('warning') ||
      pathStr.includes('error') ||
      pathStr.includes('info')
    );
  }

  private isSpacingToken(token: DesignToken): boolean {
    const pathStr = token.name.toLowerCase();
    return (
      pathStr.includes('spacing') ||
      pathStr.includes('space') ||
      pathStr.includes('gap') ||
      pathStr.includes('margin') ||
      pathStr.includes('padding')
    );
  }

  private isTypographyToken(token: DesignToken): boolean {
    const pathStr = token.name.toLowerCase();
    return (
      pathStr.includes('font') ||
      pathStr.includes('text') ||
      pathStr.includes('typography') ||
      pathStr.includes('lineheight') ||
      pathStr.includes('letterspacing')
    );
  }

  private isShadowToken(token: DesignToken): boolean {
    const pathStr = token.name.toLowerCase();
    return pathStr.includes('shadow') || pathStr.includes('elevation');
  }

  private isBorderToken(token: DesignToken): boolean {
    const pathStr = token.name.toLowerCase();
    return pathStr.includes('radius') || pathStr.includes('border');
  }

  private formatOutput(config: TailwindThemeConfig): string {
    const wrapper = this.options.extend
      ? { theme: { extend: config } }
      : { theme: config };

    switch (this.options.outputFormat) {
      case 'json':
        return JSON.stringify(wrapper, null, 2);

      case 'ts':
        return this.formatTypeScript(wrapper);

      case 'esm':
        return `export default ${JSON.stringify(wrapper, null, 2)};`;

      case 'cjs':
      case 'js':
      default:
        return `module.exports = ${JSON.stringify(wrapper, null, 2)};`;
    }
  }

  private formatFullConfig(config: FullTailwindConfig): string {
    switch (this.options.outputFormat) {
      case 'json':
        return JSON.stringify(config, null, 2);

      case 'ts':
        return this.formatTypeScript(config);

      case 'esm':
        return `export default ${JSON.stringify(config, null, 2)};`;

      case 'cjs':
      case 'js':
      default:
        return `module.exports = ${JSON.stringify(config, null, 2)};`;
    }
  }

  private formatTypeScript(config: unknown): string {
    let output = '';

    if (this.options.includeTypes) {
      output += `import type { Config } from 'tailwindcss';\n\n`;
      output += `const config: Config = ${JSON.stringify(config, null, 2)};\n\n`;
      output += `export default config;\n`;
    } else {
      output += `export default ${JSON.stringify(config, null, 2)} as const;\n`;
    }

    return output;
  }

  private calculateStats(tokens: DesignToken[]): TailwindConfigResult['stats'] {
    return {
      totalTokens: tokens.length,
      colorTokens: tokens.filter((t) => this.isColorToken(t)).length,
      spacingTokens: tokens.filter((t) => this.isSpacingToken(t)).length,
      typographyTokens: tokens.filter((t) => this.isTypographyToken(t)).length,
      otherTokens: tokens.filter(
        (t) =>
          !this.isColorToken(t) &&
          !this.isSpacingToken(t) &&
          !this.isTypographyToken(t)
      ).length,
    };
  }

  private isValidColorValue(value: string): boolean {
    // Basic validation for color values
    return (
      value.startsWith('#') ||
      value.startsWith('rgb') ||
      value.startsWith('hsl') ||
      value.startsWith('oklch') ||
      value.startsWith('var(') ||
      /^[a-z]+$/i.test(value) // Named colors
    );
  }

  private isValidSpacingValue(value: string): boolean {
    // Basic validation for spacing values
    return (
      value.endsWith('px') ||
      value.endsWith('rem') ||
      value.endsWith('em') ||
      value.endsWith('%') ||
      value === '0' ||
      value.startsWith('var(')
    );
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TailwindConfigAdapter;
