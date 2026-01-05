// ============================================
// Design Tokens Exporter (W3C DTCG)
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Exports tokens in W3C Design Token Community Group format.
// Specification: https://design-tokens.github.io/community-group/format/
//
// Features:
// - Full DTCG compliance
// - Nested group structure
// - $value, $type, $description format
// - Extensions for accessibility metadata
//
// ============================================

import { BaseExporter } from './BaseExporter';
import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ValidationResult,
  ColorSpaceExport,
  TokenPalette,
  TokenGroup,
  Token,
  ColorToken,
  DTCGRoot,
  DTCGToken,
  DTCGTokenGroup,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORTER_VERSION = '1.0.0';
const DTCG_SPEC_VERSION = '0.0.1'; // Draft spec version

// ============================================
// Design Tokens Exporter
// ============================================

/**
 * W3C Design Token Community Group (DTCG) exporter
 *
 * Exports tokens in the standardized DTCG format for
 * interoperability with design tools and token transformers.
 */
export class DesignTokensExporter extends BaseExporter {
  readonly format: ExportFormat = 'design-tokens';
  readonly version = EXPORTER_VERSION;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport> {
    // DTCG primarily supports hex and rgb
    // oklch is included for modern color support
    return ['hex', 'rgb', 'hsl', 'oklch'] as const;
  }

  /**
   * Export tokens to DTCG format
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult {
    const mergedOptions = this.mergeOptions(options);
    const metadata = this.generateMetadata(palette, mergedOptions);

    // Check for empty palette
    if (palette.groups.length === 0) {
      return this.createEmptyResult(metadata, 'No token groups to export');
    }

    // Build DTCG structure
    const dtcgRoot = this.buildDTCGRoot(palette, mergedOptions);

    // Generate content
    const content = mergedOptions.minify
      ? JSON.stringify(dtcgRoot)
      : JSON.stringify(dtcgRoot, null, 2);

    // Generate header comment if enabled
    const finalContent = mergedOptions.includeHeaders
      ? this.generateJsonWithHeader(content, metadata)
      : content;

    // Create file
    const extension = options?.extension || 'tokens.json';
    const files = [this.createFile(extension, finalContent, 'json')];

    return {
      format: this.format,
      content: finalContent,
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

    // Validate root properties
    this.validateDTCGObject(tokenObj, '', errors, warnings);

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
   * Build DTCG root structure
   */
  private buildDTCGRoot(palette: TokenPalette, options: Required<ExportOptions>): DTCGRoot {
    const root: Record<string, DTCGToken | DTCGTokenGroup | string | undefined> = {};

    // Add palette metadata
    if (palette.name) {
      root['$name'] = palette.name;
    }
    if (palette.description) {
      root['$description'] = palette.description;
    }

    // Process each group
    for (const group of palette.groups) {
      const groupKey = this.convertCase(group.name, 'camel');
      root[groupKey] = this.buildDTCGGroup(group, options);
    }

    return root as DTCGRoot;
  }

  /**
   * Build DTCG group structure
   */
  private buildDTCGGroup(
    group: TokenGroup,
    options: Required<ExportOptions>
  ): DTCGTokenGroup {
    const dtcgGroup: Record<string, DTCGToken | DTCGTokenGroup | string | undefined> = {};

    // Add group description
    if (group.description) {
      dtcgGroup['$description'] = group.description;
    }

    // Process tokens
    for (const token of group.tokens) {
      // Skip deprecated if not included
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenKey = this.convertCase(token.name, 'camel');
      dtcgGroup[tokenKey] = this.buildDTCGToken(token, options);
    }

    // Process subgroups recursively
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        const subgroupKey = this.convertCase(subgroup.name, 'camel');
        dtcgGroup[subgroupKey] = this.buildDTCGGroup(subgroup, options);
      }
    }

    return dtcgGroup as DTCGTokenGroup;
  }

  /**
   * Build DTCG token
   */
  private buildDTCGToken(token: Token, options: Required<ExportOptions>): DTCGToken {
    const dtcgToken: Record<string, unknown> = {};

    // Set type
    dtcgToken['$type'] = this.mapTokenType(token.type);

    // Set value based on type
    dtcgToken['$value'] = this.formatTokenValue(token, options);

    // Add description
    if (token.description) {
      dtcgToken['$description'] = token.description;
    }

    // Add extensions
    const extensions = this.buildExtensions(token, options);
    if (Object.keys(extensions).length > 0) {
      dtcgToken['$extensions'] = extensions;
    }

    return dtcgToken as unknown as DTCGToken;
  }

  /**
   * Map internal token type to DTCG type
   */
  private mapTokenType(type: Token['type']): string {
    const typeMap: Record<Token['type'], string> = {
      color: 'color',
      dimension: 'dimension',
      typography: 'typography',
      shadow: 'shadow',
    };
    return typeMap[type];
  }

  /**
   * Format token value for DTCG
   */
  private formatTokenValue(token: Token, options: Required<ExportOptions>): unknown {
    switch (token.type) {
      case 'color':
        return this.formatColor(token, options.colorSpace || 'hex');

      case 'dimension':
        return `${token.value}${token.unit}`;

      case 'typography':
        return {
          fontFamily: token.value.fontFamily,
          fontSize: token.value.fontSize,
          fontWeight: token.value.fontWeight,
          lineHeight: token.value.lineHeight,
          ...(token.value.letterSpacing && { letterSpacing: token.value.letterSpacing }),
        };

      case 'shadow':
        return {
          offsetX: token.value.offsetX,
          offsetY: token.value.offsetY,
          blur: token.value.blur,
          spread: token.value.spread,
          color: token.value.color,
          ...(token.value.inset && { inset: token.value.inset }),
        };

      default:
        return '';
    }
  }

  /**
   * Build extensions object
   */
  private buildExtensions(token: Token, options: Required<ExportOptions>): Record<string, unknown> {
    const extensions: Record<string, unknown> = {};

    // Add deprecated flag
    if (token.deprecated) {
      extensions['com.color-intelligence.deprecated'] = true;
    }

    // Add accessibility metadata for color tokens
    if (token.type === 'color' && options.includeAccessibility) {
      const colorToken = token as ColorToken;
      if (colorToken.accessibility) {
        extensions['com.color-intelligence.accessibility'] = {
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
          ...(colorToken.accessibility.pairedWith && {
            pairedWith: colorToken.accessibility.pairedWith,
          }),
        };
      }

      // Add color space values
      if (colorToken.value.oklch) {
        extensions['com.color-intelligence.oklch'] = colorToken.value.oklch;
      }
      if (colorToken.value.hct) {
        extensions['com.color-intelligence.hct'] = colorToken.value.hct;
      }
    }

    // Merge custom extensions
    if (token.extensions) {
      Object.assign(extensions, token.extensions);
    }

    return extensions;
  }

  /**
   * Generate JSON content with header comment
   * Note: JSON doesn't support comments, so we prepend a metadata object
   */
  private generateJsonWithHeader(content: string, metadata: unknown): string {
    // For JSON, we can't add comments, but we can add a _metadata property
    try {
      const parsed = JSON.parse(content);
      const withMetadata = {
        _generated: {
          format: 'DTCG',
          specVersion: DTCG_SPEC_VERSION,
          generatorVersion: EXPORTER_VERSION,
          ...(metadata as Record<string, unknown>),
        },
        ...parsed,
      };
      return JSON.stringify(withMetadata, null, 2);
    } catch {
      return content;
    }
  }

  /**
   * Validate DTCG object recursively
   */
  private validateDTCGObject(
    obj: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Skip special DTCG properties
      if (key.startsWith('$')) {
        this.validateDTCGProperty(key, value, currentPath, errors, warnings);
        continue;
      }

      // Check if this is a token (has $value) or a group
      if (typeof value === 'object' && value !== null) {
        const valueObj = value as Record<string, unknown>;

        if ('$value' in valueObj) {
          // This is a token
          this.validateDTCGToken(valueObj, currentPath, errors, warnings);
        } else {
          // This is a group, recurse
          this.validateDTCGObject(valueObj, currentPath, errors, warnings);
        }
      }
    }
  }

  /**
   * Validate DTCG special properties
   */
  private validateDTCGProperty(
    key: string,
    value: unknown,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    switch (key) {
      case '$name':
      case '$description':
        if (typeof value !== 'string') {
          errors.push(
            this.createValidationError(path, `${key} must be a string`, 'INVALID_PROPERTY_TYPE')
          );
        }
        break;

      case '$type':
        if (typeof value !== 'string') {
          errors.push(
            this.createValidationError(path, '$type must be a string', 'INVALID_TYPE_TYPE')
          );
        } else {
          const validTypes = ['color', 'dimension', 'typography', 'shadow', 'fontFamily', 'fontWeight', 'duration', 'cubicBezier'];
          if (!validTypes.includes(value)) {
            warnings.push(
              this.createValidationWarning(path, `Unknown token type: ${value}`, 'UNKNOWN_TYPE')
            );
          }
        }
        break;

      case '$value':
        if (value === undefined || value === null) {
          errors.push(
            this.createValidationError(path, '$value cannot be null or undefined', 'MISSING_VALUE')
          );
        }
        break;

      case '$extensions':
        if (typeof value !== 'object' || value === null) {
          errors.push(
            this.createValidationError(path, '$extensions must be an object', 'INVALID_EXTENSIONS')
          );
        }
        break;
    }
  }

  /**
   * Validate a DTCG token
   */
  private validateDTCGToken(
    token: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    // $value is required
    if (!('$value' in token)) {
      errors.push(
        this.createValidationError(path, 'Token must have a $value property', 'MISSING_VALUE')
      );
    }

    // $type is recommended
    if (!('$type' in token)) {
      warnings.push(
        this.createValidationWarning(path, 'Token should have a $type property', 'MISSING_TYPE')
      );
    }

    // Validate all $ properties
    for (const [key, value] of Object.entries(token)) {
      if (key.startsWith('$')) {
        this.validateDTCGProperty(key, value, `${path}.${key}`, errors, warnings);
      }
    }
  }
}

/**
 * Factory function
 */
export function createDesignTokensExporter(): DesignTokensExporter {
  return new DesignTokensExporter();
}
