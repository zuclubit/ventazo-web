/**
 * @fileoverview W3C Design Tokens Exporter
 *
 * Implementación del ExporterPort para exportar tokens en formato W3C DTCG.
 * Cumple con la especificación del Design Tokens Community Group.
 *
 * @see https://design-tokens.github.io/community-group/format/
 *
 * @module ui-kit/infrastructure/exporters/W3CTokenExporter
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import type { TokenCollection, DesignToken } from '../../domain/tokens';
import type {
  ExporterPort,
  ExportOptions,
  ExportResult,
  ExportDestination,
  ExportToDestinationResult,
  ExportFormat,
  BaseExportOptions,
} from '../../application/ports/outbound/ExporterPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Token W3C DTCG format.
 */
interface W3CToken {
  $value: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, unknown>;
}

/**
 * Grupo de tokens W3C.
 */
interface W3CTokenGroup {
  [key: string]: W3CToken | W3CTokenGroup;
}

/**
 * Opciones específicas del exportador W3C.
 */
export interface W3CExporterOptions {
  /** Si incluir $type en todos los tokens */
  readonly includeType?: boolean;
  /** Si incluir $description cuando esté disponible */
  readonly includeDescription?: boolean;
  /** Si incluir $extensions con metadatos adicionales */
  readonly includeExtensions?: boolean;
  /** Namespace para extensions propias */
  readonly extensionNamespace?: string;
  /** Si agrupar tokens por path */
  readonly groupByPath?: boolean;
  /** Si incluir metadatos del archivo */
  readonly includeFileMetadata?: boolean;
}

/**
 * Opciones por defecto.
 */
const DEFAULT_W3C_OPTIONS: Required<W3CExporterOptions> = {
  includeType: true,
  includeDescription: true,
  includeExtensions: false,
  extensionNamespace: 'zuclubit',
  groupByPath: true,
  includeFileMetadata: true,
};

/**
 * Formatos soportados por este exporter.
 */
const SUPPORTED_FORMATS: readonly ExportFormat[] = [
  'w3c',
  'json',
  'css',
  'scss',
  'typescript',
];

// ============================================================================
// EXPORTER
// ============================================================================

/**
 * W3CTokenExporter - Exportador de tokens en formato W3C DTCG.
 *
 * Genera archivos JSON compatibles con la especificación del
 * Design Tokens Community Group, listos para ser consumidos por
 * herramientas como Style Dictionary, Figma Tokens, o cualquier
 * otra herramienta compatible.
 *
 * @example
 * ```typescript
 * const exporter = new W3CTokenExporter({
 *   includeType: true,
 *   includeDescription: true,
 *   groupByPath: true,
 * });
 *
 * const result = await exporter.export(tokenCollection, {
 *   format: 'w3c',
 * });
 *
 * if (result.success) {
 *   console.log(result.value.content);
 * }
 * ```
 */
export class W3CTokenExporter implements ExporterPort {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly options: Required<W3CExporterOptions>;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(options: W3CExporterOptions = {}) {
    this.options = { ...DEFAULT_W3C_OPTIONS, ...options };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async export(
    collection: TokenCollection,
    options: ExportOptions
  ): Promise<Result<ExportResult, Error>> {
    try {
      const tokens = [...collection.getAll()]; // Convert to mutable array
      return this.exportTokens(tokens, options);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Export failed')
      );
    }
  }

  async exportTokens(
    tokens: DesignToken[],
    options: ExportOptions
  ): Promise<Result<ExportResult, Error>> {
    try {
      const format = options.format ?? 'w3c';

      // Route to appropriate format
      switch (format) {
        case 'w3c':
        case 'json':
          return this.exportW3C(tokens, options);
        case 'css':
          return this.exportCSS(tokens, options);
        case 'scss':
          return this.exportSCSS(tokens, options);
        case 'typescript':
          return this.exportTypeScript(tokens, options);
        default:
          return failure(new Error(`Unsupported format: ${format}`));
      }
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Export failed')
      );
    }
  }

  async exportTo(
    collection: TokenCollection,
    options: ExportOptions,
    destination: ExportDestination
  ): Promise<Result<ExportToDestinationResult, Error>> {
    const exportResult = await this.export(collection, options);
    if (!exportResult.success) {
      return failure(exportResult.error);
    }

    // Determine location from destination
    let location: string | undefined;
    if (destination.type === 'file') {
      location = destination.path;
    } else if (destination.type === 'api') {
      location = destination.url;
    }

    // Note: En un ambiente real, aquí se escribiría al filesystem/API
    // Por ahora, solo retornamos el resultado con metadata adicional
    return success({
      ...exportResult.value,
      destination,
      location,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  getSupportedFormats(): ExportFormat[] {
    return [...SUPPORTED_FORMATS];
  }

  supportsFormat(format: string): format is ExportFormat {
    return SUPPORTED_FORMATS.includes(format as ExportFormat);
  }

  getDefaultOptions(format: ExportFormat): BaseExportOptions {
    const baseDefaults: BaseExportOptions = {
      prefix: '',
      suffix: '',
      includeComments: true,
      minify: false,
      nameTransform: 'kebab-case',
    };

    // Format-specific defaults
    switch (format) {
      case 'css':
        return { ...baseDefaults };
      case 'scss':
        return { ...baseDefaults };
      case 'typescript':
        return { ...baseDefaults, nameTransform: 'camelCase' };
      default:
        return baseDefaults;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  validateOptions(options: ExportOptions): Result<void, Error> {
    if (!options.format) {
      return failure(new Error('Export format is required'));
    }

    if (!this.supportsFormat(options.format)) {
      return failure(new Error(`Unsupported format: ${options.format}`));
    }

    return success(undefined);
  }

  async validateDestination(destination: ExportDestination): Promise<Result<void, Error>> {
    switch (destination.type) {
      case 'file':
        if (!destination.path) {
          return failure(new Error('File path is required'));
        }
        break;
      case 'api':
        if (!destination.url) {
          return failure(new Error('API URL is required'));
        }
        try {
          new URL(destination.url);
        } catch {
          return failure(new Error('Invalid API URL'));
        }
        break;
      case 'figma':
        if (!destination.fileKey) {
          return failure(new Error('Figma file key is required'));
        }
        break;
    }

    return success(undefined);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────────────────────────────────────────

  async preview(
    collection: TokenCollection,
    options: ExportOptions,
    maxLines = 50
  ): Promise<Result<{ preview: string; truncated: boolean; totalLines: number }, Error>> {
    const exportResult = await this.export(collection, options);
    if (!exportResult.success) {
      return failure(exportResult.error);
    }

    const lines = exportResult.value.content.split('\n');
    const totalLines = lines.length;
    const truncated = totalLines > maxLines;
    const preview = truncated
      ? lines.slice(0, maxLines).join('\n') + '\n... (truncated)'
      : exportResult.value.content;

    return success({ preview, truncated, totalLines });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  async exportMultiple(
    collection: TokenCollection,
    formats: ExportOptions[]
  ): Promise<Result<Map<ExportFormat, ExportResult>, Error>> {
    const results = new Map<ExportFormat, ExportResult>();
    const errors: string[] = [];

    for (const options of formats) {
      const result = await this.export(collection, options);
      if (result.success) {
        results.set(options.format, result.value);
      } else {
        errors.push(`${options.format}: ${result.error.message}`);
      }
    }

    if (errors.length > 0 && results.size === 0) {
      return failure(new Error(`All exports failed: ${errors.join('; ')}`));
    }

    return success(results);
  }

  async exportToMultiple(
    collection: TokenCollection,
    destinations: Array<{ options: ExportOptions; destination: ExportDestination }>
  ): Promise<Result<ExportToDestinationResult[], Error>> {
    const results: ExportToDestinationResult[] = [];
    const errors: string[] = [];

    for (const { options, destination } of destinations) {
      const result = await this.exportTo(collection, options, destination);
      if (result.success) {
        results.push(result.value);
      } else {
        errors.push(`${options.format} to ${destination.type}: ${result.error.message}`);
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return failure(new Error(`All exports failed: ${errors.join('; ')}`));
    }

    return success(results);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE EXPORT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private exportW3C(
    tokens: DesignToken[],
    options: ExportOptions
  ): Result<ExportResult, Error> {
    const output: W3CTokenGroup = {};
    const warnings: string[] = [];

    // Add file metadata if enabled
    if (this.options.includeFileMetadata) {
      (output as Record<string, unknown>)['$schema'] =
        'https://design-tokens.github.io/community-group/format/';
      (output as Record<string, unknown>)['$metadata'] = {
        name: 'tokens',
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generator: '@zuclubit/ui-kit',
      };
    }

    // Process tokens
    for (const token of tokens) {
      const w3cToken = this.tokenToW3C(token);
      const pathParts = this.getTokenPath(token);

      if (this.options.groupByPath) {
        this.setNestedValue(output, pathParts, w3cToken);
      } else {
        output[pathParts.join('.')] = w3cToken;
      }
    }

    const content = JSON.stringify(output, null, options.minify ? 0 : 2);

    return success({
      format: 'w3c',
      content,
      tokenCount: tokens.length,
      sizeBytes: new TextEncoder().encode(content).length,
      exportedAt: new Date(),
      warnings,
      metadata: {
        generatedAt: new Date(),
        version: '1.0.0',
      },
    });
  }

  private exportCSS(
    tokens: DesignToken[],
    options: ExportOptions
  ): Result<ExportResult, Error> {
    const prefix = options.prefix ?? '';
    const warnings: string[] = [];
    const lines: string[] = [
      '/* Generated by @zuclubit/ui-kit */',
      '/* W3C Design Tokens to CSS Custom Properties */',
      '',
      ':root {',
    ];

    for (const token of tokens) {
      const pathParts = this.getTokenPath(token);
      const varName = `--${prefix}${pathParts.join('-')}`;
      const value = this.getTokenValue(token);
      lines.push(`  ${varName}: ${value};`);
    }

    lines.push('}');

    const content = lines.join('\n');

    return success({
      format: 'css',
      content,
      tokenCount: tokens.length,
      sizeBytes: new TextEncoder().encode(content).length,
      exportedAt: new Date(),
      warnings,
    });
  }

  private exportSCSS(
    tokens: DesignToken[],
    options: ExportOptions
  ): Result<ExportResult, Error> {
    const prefix = options.prefix ?? '';
    const warnings: string[] = [];
    const lines: string[] = [
      '// Generated by @zuclubit/ui-kit',
      '// W3C Design Tokens to SCSS Variables',
      '',
    ];

    for (const token of tokens) {
      const pathParts = this.getTokenPath(token);
      const varName = `$${prefix}${pathParts.join('-')}`;
      const value = this.getTokenValue(token);
      lines.push(`${varName}: ${value};`);
    }

    // Add CSS custom properties map
    lines.push('');
    lines.push('// CSS Custom Properties');
    lines.push(':root {');

    for (const token of tokens) {
      const pathParts = this.getTokenPath(token);
      const varName = `--${prefix}${pathParts.join('-')}`;
      const scssVar = `$${prefix}${pathParts.join('-')}`;
      lines.push(`  ${varName}: #{${scssVar}};`);
    }

    lines.push('}');

    const content = lines.join('\n');

    return success({
      format: 'scss',
      content,
      tokenCount: tokens.length,
      sizeBytes: new TextEncoder().encode(content).length,
      exportedAt: new Date(),
      warnings,
    });
  }

  private exportTypeScript(
    tokens: DesignToken[],
    _options: ExportOptions
  ): Result<ExportResult, Error> {
    const warnings: string[] = [];
    const lines: string[] = [
      '/**',
      ' * Generated by @zuclubit/ui-kit',
      ' * W3C Design Tokens to TypeScript',
      ' */',
      '',
      'export const tokens = {',
    ];

    // Build nested object
    const obj: Record<string, unknown> = {};
    for (const token of tokens) {
      const pathParts = this.getTokenPath(token);
      this.setNestedValue(obj, pathParts, this.getTokenValue(token));
    }

    // Convert to TypeScript
    const jsonStr = JSON.stringify(obj, null, 2);
    // Replace quotes with proper TS syntax
    const tsContent = jsonStr.replace(/"([^"]+)":/g, '$1:');
    lines.push(tsContent.slice(1, -1)); // Remove outer braces
    lines.push('} as const;');
    lines.push('');
    lines.push('export type TokenPath = keyof typeof tokens;');
    lines.push('export default tokens;');

    const content = lines.join('\n');

    return success({
      format: 'typescript',
      content,
      tokenCount: tokens.length,
      sizeBytes: new TextEncoder().encode(content).length,
      exportedAt: new Date(),
      warnings,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the token path as an array of strings.
   * DesignToken.path is always string[], so this is a simple accessor.
   */
  private getTokenPath(token: DesignToken): string[] {
    return token.path.length > 0 ? token.path : ['unknown'];
  }

  private tokenToW3C(token: DesignToken): W3CToken {
    const tokenData = token as unknown as {
      value: unknown;
      type?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    };

    const w3cToken: W3CToken = {
      $value: tokenData.value,
    };

    if (this.options.includeType && tokenData.type) {
      w3cToken.$type = this.mapToW3CType(tokenData.type);
    }

    if (this.options.includeDescription && tokenData.description) {
      w3cToken.$description = tokenData.description;
    }

    if (this.options.includeExtensions && tokenData.metadata) {
      w3cToken.$extensions = {
        [this.options.extensionNamespace]: tokenData.metadata,
      };
    }

    return w3cToken;
  }

  private mapToW3CType(type: string): string {
    const typeMap: Record<string, string> = {
      color: 'color',
      dimension: 'dimension',
      fontFamily: 'fontFamily',
      fontWeight: 'fontWeight',
      duration: 'duration',
      cubicBezier: 'cubicBezier',
      number: 'number',
      string: 'string',
      shadow: 'shadow',
      strokeStyle: 'strokeStyle',
      border: 'border',
      transition: 'transition',
      gradient: 'gradient',
      typography: 'typography',
    };

    return typeMap[type] ?? type;
  }

  private getTokenValue(token: DesignToken): string {
    const tokenData = token as unknown as { value: unknown };
    const value = tokenData.value;

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private setNestedValue(
    obj: Record<string, unknown>,
    path: string[],
    value: unknown
  ): void {
    let current = obj;

    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default W3CTokenExporter;
