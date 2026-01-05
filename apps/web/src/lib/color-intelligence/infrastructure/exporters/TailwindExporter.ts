// ============================================
// Tailwind CSS Exporter
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Exports tokens as Tailwind CSS configuration.
// Documentation: https://tailwindcss.com/docs/configuration
//
// Features:
// - Tailwind v3 compatible config
// - Theme extend structure
// - Color palette with shades
// - Spacing, typography, and shadow tokens
// - TypeScript and JavaScript output
//
// ============================================

import { BaseExporter } from './BaseExporter';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportFile,
  ValidationResult,
  ColorSpaceExport,
  TokenPalette,
  TokenGroup,
  Token,
  ColorToken,
  TailwindColorConfig,
  TailwindThemeExtend,
  TailwindConfig,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORTER_VERSION = '1.0.0';
const TAILWIND_VERSION = '3.x';

// ============================================
// Tailwind CSS Exporter
// ============================================

/**
 * Tailwind CSS configuration exporter
 *
 * Exports tokens as a Tailwind CSS theme configuration
 * that can be merged into tailwind.config.js.
 */
export class TailwindExporter extends BaseExporter {
  readonly format: ExportFormat = 'tailwind';
  readonly version = EXPORTER_VERSION;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport> {
    // Tailwind CSS supports all CSS color formats
    return ['hex', 'rgb', 'hsl', 'oklch'] as const;
  }

  /**
   * Export tokens to Tailwind CSS format
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult {
    const mergedOptions = this.mergeOptions(options);
    const metadata = this.generateMetadata(palette, mergedOptions);

    // Check for empty palette
    if (palette.groups.length === 0) {
      return this.createEmptyResult(metadata, 'No token groups to export');
    }

    // Build theme extend
    const themeExtend = this.buildThemeExtend(palette, mergedOptions);

    // Build full config
    const config: TailwindConfig = {
      theme: {
        extend: themeExtend,
      },
    };

    // Generate content based on output format
    const files: ExportFile[] = [];

    // JavaScript config (default)
    const jsContent = this.generateJavaScriptConfig(config, metadata, mergedOptions);
    files.push(this.createFile('tailwind.tokens.js', jsContent, 'js'));

    // TypeScript config
    const tsContent = this.generateTypeScriptConfig(config, metadata, mergedOptions);
    files.push(this.createFile('tailwind.tokens.ts', tsContent, 'ts'));

    // CSS variables version (for CSS-in-JS or custom properties)
    const cssContent = this.generateCSSVariables(palette, mergedOptions);
    files.push(this.createFile('tailwind.tokens.css', cssContent, 'css'));

    // JSON export for tooling
    const jsonContent = JSON.stringify(config, null, 2);
    files.push(this.createFile('tailwind.tokens.json', jsonContent, 'json'));

    return {
      format: this.format,
      content: jsContent, // Primary content is JS
      metadata,
      files,
      warnings: [],
    };
  }

  /**
   * Validate token structure
   */
  validate(tokens: unknown): ValidationResult {
    const errors: Array<{ path: string; message: string; code: string }> = [];
    const warnings: Array<{ path: string; message: string; code: string }> = [];

    // Basic type check
    if (typeof tokens !== 'object' || tokens === null) {
      return {
        valid: false,
        errors: [this.createValidationError('', 'Tokens must be an object', 'INVALID_TYPE')],
        warnings: [],
      };
    }

    const tokenObj = tokens as Record<string, unknown>;

    // Validate theme structure
    if ('theme' in tokenObj) {
      const theme = tokenObj['theme'] as Record<string, unknown>;
      if ('extend' in theme) {
        this.validateThemeExtend(theme['extend'] as Record<string, unknown>, errors, warnings);
      }
    }

    // Validate colors if present at root
    if ('colors' in tokenObj) {
      this.validateColors(tokenObj['colors'] as Record<string, unknown>, 'colors', errors, warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Build Tailwind theme extend
   */
  private buildThemeExtend(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): TailwindThemeExtend {
    const extend: Record<string, unknown> = {};

    // Categorize tokens (use mutable Record type for local processing)
    const colors: Record<string, string | Record<string, string>> = {};
    const spacing: Record<string, string> = {};
    const fontSize: Record<string, string | [string, object]> = {};
    const fontFamily: Record<string, string[]> = {};
    const boxShadow: Record<string, string> = {};

    // Process all groups
    for (const group of palette.groups) {
      this.processGroup(group, options, {
        colors,
        spacing,
        fontSize,
        fontFamily,
        boxShadow,
      });
    }

    // Only add non-empty categories
    if (Object.keys(colors).length > 0) {
      extend['colors'] = colors;
    }
    if (Object.keys(spacing).length > 0) {
      extend['spacing'] = spacing;
    }
    if (Object.keys(fontSize).length > 0) {
      extend['fontSize'] = fontSize;
    }
    if (Object.keys(fontFamily).length > 0) {
      extend['fontFamily'] = fontFamily;
    }
    if (Object.keys(boxShadow).length > 0) {
      extend['boxShadow'] = boxShadow;
    }

    return extend as TailwindThemeExtend;
  }

  /**
   * Process a token group
   */
  private processGroup(
    group: TokenGroup,
    options: Required<ExportOptions>,
    categories: {
      colors: Record<string, string | Record<string, string>>;
      spacing: Record<string, string>;
      fontSize: Record<string, string | [string, object]>;
      fontFamily: Record<string, string[]>;
      boxShadow: Record<string, string>;
    }
  ): void {
    const groupKey = this.convertCase(group.name, 'kebab');

    // Group colors together
    const groupColors: Record<string, string> = {};

    for (const token of group.tokens) {
      // Skip deprecated if not included
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenKey = this.convertCase(token.name, 'kebab');

      switch (token.type) {
        case 'color':
          groupColors[tokenKey] = this.formatColor(token, options.colorSpace || 'hex');
          break;

        case 'dimension':
          categories.spacing[`${groupKey}-${tokenKey}`] = `${token.value}${token.unit}`;
          break;

        case 'typography':
          // Add font family
          if (token.value.fontFamily) {
            const familyKey = `${groupKey}-${tokenKey}`;
            categories.fontFamily[familyKey] = [token.value.fontFamily];
          }
          // Add font size with line height
          if (token.value.fontSize) {
            const sizeKey = `${groupKey}-${tokenKey}`;
            categories.fontSize[sizeKey] = [
              token.value.fontSize,
              {
                lineHeight: String(token.value.lineHeight),
                ...(token.value.letterSpacing && { letterSpacing: token.value.letterSpacing }),
              },
            ];
          }
          break;

        case 'shadow':
          const { offsetX, offsetY, blur, spread, color, inset } = token.value;
          const shadowValue = `${inset ? 'inset ' : ''}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
          categories.boxShadow[`${groupKey}-${tokenKey}`] = shadowValue;
          break;
      }
    }

    // Add grouped colors
    if (Object.keys(groupColors).length > 0) {
      // If only one color in group, flatten it
      if (Object.keys(groupColors).length === 1) {
        const firstEntry = Object.entries(groupColors)[0];
        if (firstEntry) {
          const [key, value] = firstEntry;
          categories.colors[`${groupKey}-${key}`] = value;
        }
      } else {
        // Create color scale
        categories.colors[groupKey] = groupColors;
      }
    }

    // Process subgroups recursively
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        this.processGroup(subgroup, options, categories);
      }
    }
  }

  /**
   * Generate JavaScript config
   */
  private generateJavaScriptConfig(
    config: TailwindConfig,
    metadata: unknown,
    options: Required<ExportOptions>
  ): string {
    const header = options.includeHeaders
      ? this.generateJSHeader(metadata)
      : '';

    const configJson = JSON.stringify(config, null, 2)
      // Convert JSON to JS object syntax
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");

    return `${header}
/** @type {import('tailwindcss').Config} */
module.exports = ${configJson};
`;
  }

  /**
   * Generate TypeScript config
   */
  private generateTypeScriptConfig(
    config: TailwindConfig,
    metadata: unknown,
    options: Required<ExportOptions>
  ): string {
    const header = options.includeHeaders
      ? this.generateJSHeader(metadata)
      : '';

    const configJson = JSON.stringify(config, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");

    return `${header}
import type { Config } from 'tailwindcss';

const config: Partial<Config> = ${configJson};

export default config;
`;
  }

  /**
   * Generate CSS variables
   */
  private generateCSSVariables(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): string {
    const prefix = options.platform?.web?.cssPrefix || 'tw';
    const lines: string[] = [':root {'];

    for (const group of palette.groups) {
      this.generateCSSVariablesForGroup(group, prefix, options, lines);
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate CSS variables for a group
   */
  private generateCSSVariablesForGroup(
    group: TokenGroup,
    prefix: string,
    options: Required<ExportOptions>,
    lines: string[]
  ): void {
    const groupName = this.convertCase(group.name, 'kebab');

    // Add group comment
    lines.push(`  /* ${group.name} */`);

    for (const token of group.tokens) {
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenName = this.convertCase(token.name, 'kebab');
      const varName = `--${prefix}-${groupName}-${tokenName}`;

      let value: string;
      switch (token.type) {
        case 'color':
          value = this.formatColor(token, options.colorSpace || 'hex');
          break;
        case 'dimension':
          value = `${token.value}${token.unit}`;
          break;
        case 'shadow':
          const { offsetX, offsetY, blur, spread, color, inset } = token.value;
          value = `${inset ? 'inset ' : ''}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
          break;
        default:
          continue; // Skip typography for CSS vars
      }

      lines.push(`  ${varName}: ${value};`);
    }

    // Process subgroups
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        this.generateCSSVariablesForGroup(subgroup, prefix, options, lines);
      }
    }
  }

  /**
   * Generate JS/TS header comment
   */
  private generateJSHeader(metadata: unknown): string {
    const m = metadata as Record<string, unknown>;
    return `/**
 * Tailwind CSS Token Configuration
 * Generated by Color Intelligence v${EXPORTER_VERSION}
 *
 * @generated ${m['generatedAt'] || new Date().toISOString()}
 * @tailwindVersion ${TAILWIND_VERSION}
 * @tokenCount ${m['tokenCount'] || 'unknown'}
 */
`;
  }

  /**
   * Validate theme extend structure
   */
  private validateThemeExtend(
    extend: Record<string, unknown>,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    const validKeys = [
      'colors', 'spacing', 'fontSize', 'fontFamily', 'fontWeight',
      'lineHeight', 'letterSpacing', 'borderRadius', 'borderWidth',
      'boxShadow', 'dropShadow', 'opacity', 'zIndex', 'screens',
      'container', 'extend'
    ];

    for (const key of Object.keys(extend)) {
      if (!validKeys.includes(key)) {
        warnings.push(
          this.createValidationWarning(`theme.extend.${key}`, `Unknown theme key: ${key}`, 'UNKNOWN_KEY')
        );
      }
    }

    // Validate colors if present
    if ('colors' in extend) {
      this.validateColors(extend['colors'] as Record<string, unknown>, 'theme.extend.colors', errors, warnings);
    }
  }

  /**
   * Validate colors object
   */
  private validateColors(
    colors: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    for (const [key, value] of Object.entries(colors)) {
      const colorPath = `${path}.${key}`;

      if (typeof value === 'string') {
        // Validate color value
        if (!this.isValidColorValue(value)) {
          errors.push(
            this.createValidationError(colorPath, `Invalid color value: ${value}`, 'INVALID_COLOR')
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        // Nested color object (color scale)
        this.validateColors(value as Record<string, unknown>, colorPath, errors, warnings);
      } else {
        errors.push(
          this.createValidationError(colorPath, 'Color must be a string or object', 'INVALID_COLOR_TYPE')
        );
      }
    }
  }

  /**
   * Check if a color value is valid
   */
  private isValidColorValue(value: string): boolean {
    // Check various color formats
    const patterns = [
      /^#[0-9A-Fa-f]{3,8}$/,                              // Hex
      /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/,           // RGB
      /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/, // RGBA
      /^hsl\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)$/,  // HSL
      /^hsla\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*,\s*[\d.]+\s*\)$/, // HSLA
      /^oklch\([\d.]+%?\s+[\d.]+\s+[\d.]+\)$/,           // OKLCH
      /^var\(--[\w-]+\)$/,                                // CSS variable
      /^transparent$/,                                     // Transparent
      /^currentColor$/i,                                   // currentColor
      /^inherit$/,                                         // inherit
    ];

    return patterns.some(pattern => pattern.test(value));
  }
}

/**
 * Factory function
 */
export function createTailwindExporter(): TailwindExporter {
  return new TailwindExporter();
}
