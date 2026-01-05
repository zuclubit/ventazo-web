// ============================================
// Style Dictionary Exporter
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Exports tokens in Amazon Style Dictionary format.
// Documentation: https://amzn.github.io/style-dictionary/
//
// Features:
// - Full Style Dictionary v3 compatibility
// - Nested property structure
// - Attribute metadata
// - Platform-specific transforms
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
  StyleDictionaryToken,
  StyleDictionaryProperties,
  StyleDictionaryConfig,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORTER_VERSION = '1.0.0';
const STYLE_DICTIONARY_VERSION = '3.x';

// ============================================
// Style Dictionary Exporter
// ============================================

/**
 * Amazon Style Dictionary exporter
 *
 * Exports tokens in Style Dictionary format for
 * multi-platform design token transformation.
 */
export class StyleDictionaryExporter extends BaseExporter {
  readonly format: ExportFormat = 'style-dictionary';
  readonly version = EXPORTER_VERSION;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport> {
    return ['hex', 'rgb', 'hsl'] as const;
  }

  /**
   * Export tokens to Style Dictionary format
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult {
    const mergedOptions = this.mergeOptions(options);
    const metadata = this.generateMetadata(palette, mergedOptions);

    // Check for empty palette
    if (palette.groups.length === 0) {
      return this.createEmptyResult(metadata, 'No token groups to export');
    }

    // Build Style Dictionary properties
    const properties = this.buildProperties(palette, mergedOptions);

    // Generate content
    const content = mergedOptions.minify
      ? JSON.stringify(properties)
      : JSON.stringify(properties, null, 2);

    // Generate header
    const header = mergedOptions.includeHeaders ? this.generateHeader(metadata) : '';

    // Create files
    const files: ExportFile[] = [];

    // Main tokens file
    const tokensFile = this.createFile(
      options?.extension || 'tokens.json',
      content,
      'json'
    );
    files.push(tokensFile);

    // Optional: Generate config file
    const config = this.generateConfig(palette, mergedOptions);
    const configContent = JSON.stringify(config, null, 2);
    const configFile = this.createFile('config.json', configContent, 'json');
    files.push(configFile);

    // Optional: Generate per-category files
    if (palette.groups.length > 1) {
      for (const group of palette.groups) {
        const groupProperties = this.buildGroupProperties(group, mergedOptions);
        const groupContent = JSON.stringify(groupProperties, null, 2);
        const groupFile = this.createFile(
          `${this.convertCase(group.name, 'kebab')}.json`,
          groupContent,
          'json'
        );
        files.push(groupFile);
      }
    }

    return {
      format: this.format,
      content: header ? `${header}\n\n${content}` : content,
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

    // Validate recursively
    this.validateStyleDictionaryObject(tokenObj, '', errors, warnings);

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
   * Build Style Dictionary properties structure
   */
  private buildProperties(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): StyleDictionaryProperties {
    const properties: Record<string, StyleDictionaryToken | StyleDictionaryProperties> = {};

    for (const group of palette.groups) {
      const groupKey = this.convertCase(group.name, 'camel');
      properties[groupKey] = this.buildGroupProperties(group, options);
    }

    return properties;
  }

  /**
   * Build properties for a single group
   */
  private buildGroupProperties(
    group: TokenGroup,
    options: Required<ExportOptions>
  ): StyleDictionaryProperties {
    const properties: Record<string, StyleDictionaryToken | StyleDictionaryProperties> = {};

    // Process tokens
    for (const token of group.tokens) {
      // Skip deprecated if not included
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenKey = this.convertCase(token.name, 'camel');
      properties[tokenKey] = this.buildToken(token, options);
    }

    // Process subgroups recursively
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        const subgroupKey = this.convertCase(subgroup.name, 'camel');
        properties[subgroupKey] = this.buildGroupProperties(subgroup, options);
      }
    }

    return properties;
  }

  /**
   * Build Style Dictionary token
   */
  private buildToken(token: Token, options: Required<ExportOptions>): StyleDictionaryToken {
    const sdToken: Record<string, unknown> = {};

    // Set value based on type
    sdToken['value'] = this.formatTokenValue(token, options);

    // Set type (optional but recommended)
    sdToken['type'] = token.type;

    // Add comment/description
    if (token.description) {
      sdToken['comment'] = token.description;
    }

    // Add attributes
    const attributes = this.buildAttributes(token, options);
    if (Object.keys(attributes).length > 0) {
      sdToken['attributes'] = attributes;
    }

    // Store original value for transforms
    if (token.type === 'color') {
      const colorToken = token as ColorToken;
      sdToken['original'] = {
        hex: colorToken.value.hex,
        ...(colorToken.value.rgb && { rgb: colorToken.value.rgb }),
        ...(colorToken.value.hsl && { hsl: colorToken.value.hsl }),
        ...(colorToken.value.oklch && { oklch: colorToken.value.oklch }),
        ...(colorToken.value.hct && { hct: colorToken.value.hct }),
      };
    }

    return sdToken as unknown as StyleDictionaryToken;
  }

  /**
   * Format token value for Style Dictionary
   */
  private formatTokenValue(token: Token, options: Required<ExportOptions>): unknown {
    switch (token.type) {
      case 'color':
        return this.formatColor(token, options.colorSpace || 'hex');

      case 'dimension':
        return `${token.value}${token.unit}`;

      case 'typography':
        // Style Dictionary typically uses separate tokens for typography
        // But we can return a composite value
        return {
          fontFamily: token.value.fontFamily,
          fontSize: token.value.fontSize,
          fontWeight: String(token.value.fontWeight),
          lineHeight: String(token.value.lineHeight),
          ...(token.value.letterSpacing && { letterSpacing: token.value.letterSpacing }),
        };

      case 'shadow':
        // Return as string for CSS
        const { offsetX, offsetY, blur, spread, color, inset } = token.value;
        return `${inset ? 'inset ' : ''}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;

      default:
        return '';
    }
  }

  /**
   * Build attributes for token
   */
  private buildAttributes(
    token: Token,
    options: Required<ExportOptions>
  ): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};

    // Category based on type
    attributes['category'] = token.type;

    // Add deprecated flag
    if (token.deprecated) {
      attributes['deprecated'] = true;
    }

    // Add accessibility metadata for color tokens
    if (token.type === 'color' && options.includeAccessibility) {
      const colorToken = token as ColorToken;
      if (colorToken.accessibility) {
        attributes['accessibility'] = {
          ...(colorToken.accessibility.contrastRatio !== undefined && {
            contrastRatio: colorToken.accessibility.contrastRatio,
          }),
          ...(colorToken.accessibility.apcaLc !== undefined && {
            apcaLc: colorToken.accessibility.apcaLc,
          }),
          ...(colorToken.accessibility.wcagLevel && {
            wcagLevel: colorToken.accessibility.wcagLevel,
          }),
          ...(colorToken.accessibility.wcag3Tier && {
            wcag3Tier: colorToken.accessibility.wcag3Tier,
          }),
        };
      }
    }

    // Merge custom extensions as attributes
    if (token.extensions) {
      Object.assign(attributes, token.extensions);
    }

    return attributes;
  }

  /**
   * Generate Style Dictionary config
   */
  private generateConfig(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): StyleDictionaryConfig {
    const platforms: Record<string, unknown> = {};

    // Web platform
    if (options.platform?.web) {
      platforms['web'] = {
        transformGroup: 'web',
        buildPath: 'build/web/',
        files: [
          {
            destination: 'tokens.css',
            format: 'css/variables',
            options: {
              outputReferences: true,
            },
          },
          {
            destination: 'tokens.scss',
            format: 'scss/variables',
          },
          {
            destination: 'tokens.js',
            format: 'javascript/es6',
          },
        ],
      };
    }

    // iOS platform
    if (options.platform?.ios) {
      platforms['ios'] = {
        transformGroup: 'ios-swift',
        buildPath: 'build/ios/',
        files: [
          {
            destination: 'Tokens.swift',
            format: 'ios-swift/class.swift',
            options: {
              accessControl: 'public',
            },
          },
        ],
      };
    }

    // Android platform
    if (options.platform?.android) {
      platforms['android'] = {
        transformGroup: 'android',
        buildPath: 'build/android/',
        files: [
          {
            destination: 'colors.xml',
            format: 'android/colors',
            filter: { attributes: { category: 'color' } },
          },
          {
            destination: 'dimens.xml',
            format: 'android/dimens',
            filter: { attributes: { category: 'dimension' } },
          },
        ],
      };
    }

    // Default: at least web platform
    if (Object.keys(platforms).length === 0) {
      platforms['css'] = {
        transformGroup: 'css',
        buildPath: 'build/',
        files: [
          {
            destination: 'variables.css',
            format: 'css/variables',
          },
        ],
      };
    }

    return {
      source: ['tokens/**/*.json'],
      platforms: platforms as StyleDictionaryConfig['platforms'],
    };
  }

  /**
   * Validate Style Dictionary object recursively
   */
  private validateStyleDictionaryObject(
    obj: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value !== 'object' || value === null) {
        continue;
      }

      const valueObj = value as Record<string, unknown>;

      // Check if this is a token (has 'value' property)
      if ('value' in valueObj) {
        this.validateToken(valueObj, currentPath, errors, warnings);
      } else {
        // This is a group, recurse
        this.validateStyleDictionaryObject(valueObj, currentPath, errors, warnings);
      }
    }
  }

  /**
   * Validate a Style Dictionary token
   */
  private validateToken(
    token: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    // 'value' is required
    if (token['value'] === undefined || token['value'] === null) {
      errors.push(
        this.createValidationError(path, 'Token must have a value property', 'MISSING_VALUE')
      );
    }

    // 'type' is recommended
    if (!('type' in token)) {
      warnings.push(
        this.createValidationWarning(path, 'Token should have a type property', 'MISSING_TYPE')
      );
    }

    // Validate attributes if present
    if ('attributes' in token && typeof token['attributes'] !== 'object') {
      errors.push(
        this.createValidationError(path, 'Token attributes must be an object', 'INVALID_ATTRIBUTES')
      );
    }
  }
}

/**
 * Factory function
 */
export function createStyleDictionaryExporter(): StyleDictionaryExporter {
  return new StyleDictionaryExporter();
}
