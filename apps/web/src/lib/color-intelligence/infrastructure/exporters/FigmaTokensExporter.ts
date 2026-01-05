// ============================================
// Figma Tokens Exporter
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Exports tokens in Figma Tokens plugin format.
// Compatible with Tokens Studio for Figma.
// Documentation: https://tokens.studio/
//
// Features:
// - Tokens Studio format compatibility
// - Theme/set support
// - Token references ($syntax)
// - Modifier extensions
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
  FigmaToken,
  FigmaTokenSet,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORTER_VERSION = '1.0.0';

// ============================================
// Figma Tokens Exporter
// ============================================

/**
 * Figma Tokens (Tokens Studio) exporter
 *
 * Exports tokens in the format compatible with
 * Tokens Studio for Figma plugin.
 */
export class FigmaTokensExporter extends BaseExporter {
  readonly format: ExportFormat = 'figma-tokens';
  readonly version = EXPORTER_VERSION;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport> {
    // Figma primarily uses hex colors
    return ['hex', 'rgb', 'hsl'] as const;
  }

  /**
   * Export tokens to Figma Tokens format
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult {
    const mergedOptions = this.mergeOptions(options);
    const metadata = this.generateMetadata(palette, mergedOptions);

    // Check for empty palette
    if (palette.groups.length === 0) {
      return this.createEmptyResult(metadata, 'No token groups to export');
    }

    // Build Figma Tokens structure
    // Figma Tokens uses a root object with token sets
    const tokenSets = this.buildTokenSets(palette, mergedOptions);

    // Build $themes array (optional but recommended)
    const themes = this.buildThemes(palette);

    // Build $metadata
    const figmaMetadata = this.buildFigmaMetadata(metadata);

    // Combine into final structure
    const output: Record<string, unknown> = {
      ...tokenSets,
      $themes: themes,
      $metadata: figmaMetadata,
    };

    // Generate content
    const content = mergedOptions.minify
      ? JSON.stringify(output)
      : JSON.stringify(output, null, 2);

    // Create files
    const files: ExportFile[] = [];

    // Main tokens file
    const tokensFile = this.createFile(
      options?.extension || 'tokens.json',
      content,
      'json'
    );
    files.push(tokensFile);

    // Individual set files
    for (const [setName, setTokens] of Object.entries(tokenSets)) {
      if (setName.startsWith('$')) continue; // Skip metadata keys

      const setContent = JSON.stringify(setTokens, null, 2);
      const setFile = this.createFile(
        `${this.convertCase(setName, 'kebab')}.json`,
        setContent,
        'json'
      );
      files.push(setFile);
    }

    return {
      format: this.format,
      content,
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

    // Check for required $metadata
    if (!tokenObj['$metadata']) {
      warnings.push(
        this.createValidationWarning('', 'Missing $metadata property', 'MISSING_METADATA')
      );
    }

    // Validate each token set
    for (const [key, value] of Object.entries(tokenObj)) {
      if (key.startsWith('$')) continue; // Skip special keys

      if (typeof value === 'object' && value !== null) {
        this.validateTokenSet(value as Record<string, unknown>, key, errors, warnings);
      }
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
   * Build token sets from palette
   */
  private buildTokenSets(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): Record<string, FigmaTokenSet> {
    const tokenSets: Record<string, FigmaTokenSet> = {};

    // Create a token set for each top-level group
    for (const group of palette.groups) {
      const setName = this.convertCase(group.name, 'camel');
      tokenSets[setName] = this.buildTokenSet(group, options);
    }

    // Also create a "global" set with all tokens flattened
    const globalSet: Record<string, FigmaToken | FigmaTokenSet> = {};
    for (const group of palette.groups) {
      const groupTokens = this.buildTokenSet(group, options);
      Object.assign(globalSet, groupTokens);
    }
    tokenSets['global'] = globalSet as FigmaTokenSet;

    return tokenSets;
  }

  /**
   * Build a single token set
   */
  private buildTokenSet(
    group: TokenGroup,
    options: Required<ExportOptions>
  ): FigmaTokenSet {
    const tokenSet: Record<string, FigmaToken | FigmaTokenSet> = {};

    // Process tokens
    for (const token of group.tokens) {
      // Skip deprecated if not included
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenKey = this.convertCase(token.name, 'camel');
      tokenSet[tokenKey] = this.buildToken(token, options);
    }

    // Process subgroups recursively
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        const subgroupKey = this.convertCase(subgroup.name, 'camel');
        tokenSet[subgroupKey] = this.buildTokenSet(subgroup, options);
      }
    }

    return tokenSet as FigmaTokenSet;
  }

  /**
   * Build a Figma token
   */
  private buildToken(token: Token, options: Required<ExportOptions>): FigmaToken {
    const figmaToken: Record<string, unknown> = {};

    // Set value
    figmaToken['value'] = this.formatTokenValue(token, options);

    // Set type (Figma uses specific type names)
    figmaToken['type'] = this.mapTokenType(token.type);

    // Add description
    if (token.description) {
      figmaToken['description'] = token.description;
    }

    // Add extensions
    const extensions = this.buildExtensions(token, options);
    if (Object.keys(extensions).length > 0) {
      figmaToken['extensions'] = extensions;
    }

    return figmaToken as unknown as FigmaToken;
  }

  /**
   * Map token type to Figma type
   */
  private mapTokenType(type: Token['type']): string {
    const typeMap: Record<Token['type'], string> = {
      color: 'color',
      dimension: 'dimension',
      typography: 'typography',
      shadow: 'boxShadow',
    };
    return typeMap[type];
  }

  /**
   * Format token value for Figma Tokens
   */
  private formatTokenValue(token: Token, options: Required<ExportOptions>): unknown {
    switch (token.type) {
      case 'color':
        return this.formatColor(token, options.colorSpace || 'hex');

      case 'dimension':
        return `${token.value}${token.unit}`;

      case 'typography':
        // Figma typography value format
        return {
          fontFamily: token.value.fontFamily,
          fontSize: token.value.fontSize,
          fontWeight: String(token.value.fontWeight),
          lineHeight: token.value.lineHeight,
          ...(token.value.letterSpacing && { letterSpacing: token.value.letterSpacing }),
        };

      case 'shadow':
        // Figma boxShadow value format (can be array for multiple shadows)
        return {
          x: token.value.offsetX,
          y: token.value.offsetY,
          blur: token.value.blur,
          spread: token.value.spread,
          color: token.value.color,
          type: token.value.inset ? 'innerShadow' : 'dropShadow',
        };

      default:
        return '';
    }
  }

  /**
   * Build extensions for token
   */
  private buildExtensions(
    token: Token,
    options: Required<ExportOptions>
  ): Record<string, unknown> {
    const extensions: Record<string, unknown> = {};

    // Tokens Studio extension
    const tokensStudioExt: Record<string, unknown> = {};

    // Add deprecated modifier
    if (token.deprecated) {
      tokensStudioExt['modify'] = {
        type: 'deprecated',
        value: 'true',
      };
    }

    // Add accessibility metadata for colors
    if (token.type === 'color' && options.includeAccessibility) {
      const colorToken = token as ColorToken;
      if (colorToken.accessibility) {
        tokensStudioExt['accessibility'] = {
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

      // Add color space data
      if (colorToken.value.oklch) {
        tokensStudioExt['oklch'] = colorToken.value.oklch;
      }
      if (colorToken.value.hct) {
        tokensStudioExt['hct'] = colorToken.value.hct;
      }
    }

    if (Object.keys(tokensStudioExt).length > 0) {
      extensions['org.tokens.studio'] = tokensStudioExt;
    }

    // Merge custom extensions
    if (token.extensions) {
      Object.assign(extensions, token.extensions);
    }

    return extensions;
  }

  /**
   * Build themes array
   */
  private buildThemes(palette: TokenPalette): ReadonlyArray<Record<string, unknown>> {
    // Create a default theme that includes all token sets
    const defaultTheme: Record<string, unknown> = {
      id: 'default',
      name: palette.name || 'Default Theme',
      selectedTokenSets: {},
    };

    // Mark all groups as enabled
    for (const group of palette.groups) {
      const setName = this.convertCase(group.name, 'camel');
      (defaultTheme['selectedTokenSets'] as Record<string, string>)[setName] = 'enabled';
    }
    (defaultTheme['selectedTokenSets'] as Record<string, string>)['global'] = 'source';

    return [defaultTheme];
  }

  /**
   * Build Figma-specific metadata
   */
  private buildFigmaMetadata(metadata: unknown): Record<string, unknown> {
    const m = metadata as Record<string, unknown>;
    return {
      tokenSetOrder: ['global'],
      generator: 'color-intelligence',
      generatorVersion: EXPORTER_VERSION,
      ...(m as Record<string, unknown>),
    };
  }

  /**
   * Validate a token set
   */
  private validateTokenSet(
    tokenSet: Record<string, unknown>,
    path: string,
    errors: Array<{ path: string; message: string; code: string }>,
    warnings: Array<{ path: string; message: string; code: string }>
  ): void {
    for (const [key, value] of Object.entries(tokenSet)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value !== 'object' || value === null) {
        continue;
      }

      const valueObj = value as Record<string, unknown>;

      // Check if this is a token (has 'value' and 'type')
      if ('value' in valueObj && 'type' in valueObj) {
        this.validateToken(valueObj, currentPath, errors, warnings);
      } else {
        // This is a nested group, recurse
        this.validateTokenSet(valueObj, currentPath, errors, warnings);
      }
    }
  }

  /**
   * Validate a Figma token
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

    // 'type' is required for Figma Tokens
    if (!('type' in token)) {
      errors.push(
        this.createValidationError(path, 'Token must have a type property', 'MISSING_TYPE')
      );
    } else {
      // Validate type is a known Figma type
      const validTypes = [
        'color', 'dimension', 'spacing', 'sizing', 'borderRadius', 'borderWidth',
        'opacity', 'fontFamilies', 'fontWeights', 'fontSizes', 'lineHeights',
        'letterSpacing', 'paragraphSpacing', 'textCase', 'textDecoration',
        'typography', 'boxShadow', 'composition', 'other'
      ];
      if (!validTypes.includes(token['type'] as string)) {
        warnings.push(
          this.createValidationWarning(path, `Unknown token type: ${token['type']}`, 'UNKNOWN_TYPE')
        );
      }
    }

    // Validate extensions if present
    if ('extensions' in token && typeof token['extensions'] !== 'object') {
      errors.push(
        this.createValidationError(path, 'Token extensions must be an object', 'INVALID_EXTENSIONS')
      );
    }
  }
}

/**
 * Factory function
 */
export function createFigmaTokensExporter(): FigmaTokensExporter {
  return new FigmaTokensExporter();
}
