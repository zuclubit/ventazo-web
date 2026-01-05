// ============================================
// CSS Variables Exporter
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Exports tokens as plain CSS custom properties.
// Ideal for vanilla CSS or CSS-in-JS integration.
//
// Features:
// - Pure CSS output
// - Selector customization
// - Media query support (light/dark themes)
// - Fallback values
// - SCSS variable output option
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
  CSSVariable,
  CSSVariablesBlock,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORTER_VERSION = '1.0.0';

// ============================================
// CSS Variables Exporter
// ============================================

/**
 * CSS Custom Properties (Variables) exporter
 *
 * Exports tokens as native CSS custom properties
 * with optional SCSS variable output.
 */
export class CSSVariablesExporter extends BaseExporter {
  readonly format: ExportFormat = 'css-variables';
  readonly version = EXPORTER_VERSION;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport> {
    return ['hex', 'rgb', 'hsl', 'oklch'] as const;
  }

  /**
   * Export tokens to CSS variables
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult {
    const mergedOptions = this.mergeOptions(options);
    const metadata = this.generateMetadata(palette, mergedOptions);

    // Check for empty palette
    if (palette.groups.length === 0) {
      return this.createEmptyResult(metadata, 'No token groups to export');
    }

    // Build CSS variable blocks
    const blocks = this.buildCSSBlocks(palette, mergedOptions);

    // Generate CSS content
    const cssContent = this.generateCSS(blocks, metadata, mergedOptions);

    // Generate SCSS content
    const scssContent = this.generateSCSS(palette, metadata, mergedOptions);

    // Create files
    const files: ExportFile[] = [];

    // Main CSS file
    files.push(this.createFile(
      options?.extension || 'tokens.css',
      cssContent,
      'css'
    ));

    // SCSS variables file
    files.push(this.createFile('_tokens.scss', scssContent, 'scss'));

    // CSS with :root only (no media queries)
    const simpleCSS = this.generateSimpleCSS(blocks, metadata, mergedOptions);
    files.push(this.createFile('tokens.simple.css', simpleCSS, 'css'));

    return {
      format: this.format,
      content: cssContent,
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

    // For CSS validation, we expect an object with variable definitions
    if (typeof tokens !== 'object' || tokens === null) {
      return {
        valid: false,
        errors: [this.createValidationError('', 'Tokens must be an object', 'INVALID_TYPE')],
        warnings: [],
      };
    }

    const tokenObj = tokens as Record<string, unknown>;

    // Validate each entry
    for (const [key, value] of Object.entries(tokenObj)) {
      // Keys should be valid CSS custom property names
      if (!key.startsWith('--')) {
        warnings.push(
          this.createValidationWarning(key, 'CSS variable names should start with --', 'INVALID_NAME')
        );
      }

      // Values should be strings
      if (typeof value !== 'string' && typeof value !== 'number') {
        errors.push(
          this.createValidationError(key, 'CSS variable values must be strings or numbers', 'INVALID_VALUE')
        );
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
   * Build CSS variable blocks
   */
  private buildCSSBlocks(
    palette: TokenPalette,
    options: Required<ExportOptions>
  ): CSSVariablesBlock[] {
    const blocks: CSSVariablesBlock[] = [];
    const prefix = options.platform?.web?.cssPrefix || '';

    // Main :root block
    const rootVariables: CSSVariable[] = [];
    for (const group of palette.groups) {
      this.collectVariables(group, prefix, options, rootVariables);
    }

    blocks.push({
      selector: ':root',
      variables: rootVariables,
    });

    // Check for light/dark mode tokens and create media query blocks
    const lightVariables = this.filterVariablesByScheme(rootVariables, 'light');
    const darkVariables = this.filterVariablesByScheme(rootVariables, 'dark');

    if (lightVariables.length > 0) {
      blocks.push({
        selector: ':root',
        variables: lightVariables,
        mediaQuery: '(prefers-color-scheme: light)',
      });
    }

    if (darkVariables.length > 0) {
      blocks.push({
        selector: ':root',
        variables: darkVariables,
        mediaQuery: '(prefers-color-scheme: dark)',
      });

      // Also add .dark class for manual toggle
      blocks.push({
        selector: '.dark',
        variables: darkVariables,
      });
    }

    return blocks;
  }

  /**
   * Collect variables from a group
   */
  private collectVariables(
    group: TokenGroup,
    prefix: string,
    options: Required<ExportOptions>,
    variables: CSSVariable[]
  ): void {
    const groupName = this.convertCase(group.name, 'kebab');

    for (const token of group.tokens) {
      // Skip deprecated if not included
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenName = this.convertCase(token.name, 'kebab');
      const varName = prefix
        ? `${prefix}-${groupName}-${tokenName}`
        : `${groupName}-${tokenName}`;

      const variable = this.createVariable(varName, token, options);
      if (variable) {
        variables.push(variable);
      }
    }

    // Process subgroups
    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        this.collectVariables(subgroup, prefix, options, variables);
      }
    }
  }

  /**
   * Create a CSS variable from a token
   */
  private createVariable(
    name: string,
    token: Token,
    options: Required<ExportOptions>
  ): CSSVariable | null {
    let value: string;
    let fallback: string | undefined;

    switch (token.type) {
      case 'color':
        value = this.formatColor(token, options.colorSpace || 'hex');
        // Add fallback for modern color spaces
        if (options.colorSpace === 'oklch' && options.platform?.web?.fallbackColors) {
          fallback = this.formatColor(token, 'hex');
        }
        break;

      case 'dimension':
        value = `${token.value}${token.unit}`;
        break;

      case 'shadow':
        const { offsetX, offsetY, blur, spread, color, inset } = token.value;
        value = `${inset ? 'inset ' : ''}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
        break;

      case 'typography':
        // Typography is complex, we create multiple variables
        // This is handled separately
        return null;

      default:
        return null;
    }

    return {
      name,
      value,
      fallback,
      comment: token.description,
    };
  }

  /**
   * Filter variables by color scheme
   */
  private filterVariablesByScheme(
    variables: CSSVariable[],
    scheme: 'light' | 'dark'
  ): CSSVariable[] {
    return variables.filter(v =>
      v.name.includes(`-${scheme}-`) || v.name.includes(`${scheme}-`)
    );
  }

  /**
   * Generate CSS output
   */
  private generateCSS(
    blocks: CSSVariablesBlock[],
    metadata: unknown,
    options: Required<ExportOptions>
  ): string {
    const lines: string[] = [];

    // Add header
    if (options.includeHeaders) {
      lines.push(this.generateCSSHeader(metadata));
      lines.push('');
    }

    // Generate each block
    for (const block of blocks) {
      if (block.mediaQuery) {
        lines.push(`@media ${block.mediaQuery} {`);
        lines.push(`  ${block.selector} {`);
        for (const variable of block.variables) {
          lines.push(this.formatCSSVariable(variable, '    '));
        }
        lines.push('  }');
        lines.push('}');
      } else {
        lines.push(`${block.selector} {`);
        for (const variable of block.variables) {
          lines.push(this.formatCSSVariable(variable, '  '));
        }
        lines.push('}');
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate simple CSS (just :root)
   */
  private generateSimpleCSS(
    blocks: CSSVariablesBlock[],
    metadata: unknown,
    options: Required<ExportOptions>
  ): string {
    const rootBlock = blocks.find(b => b.selector === ':root' && !b.mediaQuery);
    if (!rootBlock) {
      return '';
    }

    const lines: string[] = [];

    if (options.includeHeaders) {
      lines.push(this.generateCSSHeader(metadata));
      lines.push('');
    }

    lines.push(':root {');
    for (const variable of rootBlock.variables) {
      lines.push(this.formatCSSVariable(variable, '  '));
    }
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate SCSS output
   */
  private generateSCSS(
    palette: TokenPalette,
    metadata: unknown,
    options: Required<ExportOptions>
  ): string {
    const lines: string[] = [];

    // Add header
    if (options.includeHeaders) {
      lines.push(this.generateSCSSHeader(metadata));
      lines.push('');
    }

    // Generate SCSS variables
    for (const group of palette.groups) {
      lines.push(`// ${group.name}`);
      this.generateSCSSVariables(group, options, lines);
      lines.push('');
    }

    // Generate map of all colors for easy iteration
    lines.push('// Color map for iteration');
    lines.push('$color-tokens: (');
    for (const group of palette.groups) {
      this.generateSCSSMap(group, options, lines, '  ');
    }
    lines.push(');');
    lines.push('');

    // Generate utility function
    lines.push('// Utility function to get token value');
    lines.push('@function token($path...) {');
    lines.push('  $map: $color-tokens;');
    lines.push('  @each $key in $path {');
    lines.push('    $map: map-get($map, $key);');
    lines.push('  }');
    lines.push('  @return $map;');
    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Generate SCSS variables for a group
   */
  private generateSCSSVariables(
    group: TokenGroup,
    options: Required<ExportOptions>,
    lines: string[]
  ): void {
    const groupName = this.convertCase(group.name, 'kebab');

    for (const token of group.tokens) {
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }

      const tokenName = this.convertCase(token.name, 'kebab');
      const varName = `$${groupName}-${tokenName}`;

      let value: string;
      switch (token.type) {
        case 'color':
          value = this.formatColor(token, 'hex');
          break;
        case 'dimension':
          value = `${token.value}${token.unit}`;
          break;
        case 'shadow':
          const { offsetX, offsetY, blur, spread, color, inset } = token.value;
          value = `${inset ? 'inset ' : ''}${offsetX} ${offsetY} ${blur} ${spread} ${color}`;
          break;
        default:
          continue;
      }

      if (token.description) {
        lines.push(`// ${token.description}`);
      }
      lines.push(`${varName}: ${value};`);
    }

    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        this.generateSCSSVariables(subgroup, options, lines);
      }
    }
  }

  /**
   * Generate SCSS map entries
   */
  private generateSCSSMap(
    group: TokenGroup,
    options: Required<ExportOptions>,
    lines: string[],
    indent: string
  ): void {
    const groupName = this.convertCase(group.name, 'kebab');
    lines.push(`${indent}'${groupName}': (`);

    for (const token of group.tokens) {
      if (token.deprecated && !options.includeDeprecated) {
        continue;
      }
      if (token.type !== 'color') {
        continue;
      }

      const tokenName = this.convertCase(token.name, 'kebab');
      const value = this.formatColor(token, 'hex');
      lines.push(`${indent}  '${tokenName}': ${value},`);
    }

    if (group.subgroups) {
      for (const subgroup of group.subgroups) {
        this.generateSCSSMap(subgroup, options, lines, indent + '  ');
      }
    }

    lines.push(`${indent}),`);
  }

  /**
   * Format a CSS variable line
   */
  private formatCSSVariable(variable: CSSVariable, indent: string): string {
    const comment = variable.comment ? ` /* ${variable.comment} */` : '';

    if (variable.fallback) {
      return `${indent}--${variable.name}: ${variable.value};${comment}`;
    }

    return `${indent}--${variable.name}: ${variable.value};${comment}`;
  }

  /**
   * Generate CSS header comment
   */
  private generateCSSHeader(metadata: unknown): string {
    const m = metadata as Record<string, unknown>;
    return `/**
 * CSS Custom Properties (Variables)
 * Generated by Color Intelligence v${EXPORTER_VERSION}
 *
 * @generated ${m['generatedAt'] || new Date().toISOString()}
 * @tokenCount ${m['tokenCount'] || 'unknown'}
 */`;
  }

  /**
   * Generate SCSS header comment
   */
  private generateSCSSHeader(metadata: unknown): string {
    const m = metadata as Record<string, unknown>;
    return `//
// SCSS Token Variables
// Generated by Color Intelligence v${EXPORTER_VERSION}
//
// @generated ${m['generatedAt'] || new Date().toISOString()}
// @tokenCount ${m['tokenCount'] || 'unknown'}
//`;
  }
}

/**
 * Factory function
 */
export function createCSSVariablesExporter(): CSSVariablesExporter {
  return new CSSVariablesExporter();
}
