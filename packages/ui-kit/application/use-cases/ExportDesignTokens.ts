/**
 * @fileoverview ExportDesignTokens Use Case
 *
 * Use case para exportar tokens de diseño a múltiples formatos
 * con soporte para transformaciones, validación y destinos múltiples.
 *
 * @module ui-kit/application/use-cases/ExportDesignTokens
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import { TokenCollection } from '../../domain/tokens';
import type {
  ExporterPort,
  ExportFormat,
  ExportOptions,
  ExportDestination,
  ExportResult,
} from '../ports/outbound/ExporterPort';
import type { AuditPort } from '../ports/outbound/AuditPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Transformación a aplicar antes de exportar.
 */
export interface TokenTransformation {
  /** Tipo de transformación */
  readonly type:
    | 'prefix'
    | 'suffix'
    | 'rename'
    | 'filter'
    | 'map'
    | 'sort'
    | 'group';
  /** Configuración de la transformación */
  readonly config: Record<string, unknown>;
}

/**
 * Preset de exportación.
 */
export interface ExportPreset {
  /** Nombre del preset */
  readonly name: string;
  /** Formatos a generar */
  readonly formats: ExportFormat[];
  /** Destinos */
  readonly destinations?: ExportDestination[];
  /** Transformaciones a aplicar */
  readonly transformations?: TokenTransformation[];
  /** Opciones específicas por formato */
  readonly formatOptions?: Partial<Record<ExportFormat, Partial<ExportOptions>>>;
}

/**
 * Input para el use case.
 */
export interface ExportDesignTokensInput {
  /** Colección de tokens a exportar */
  readonly collection: TokenCollection;
  /** Formatos de exportación */
  readonly formats: ExportFormat[];
  /** Destinos de exportación */
  readonly destinations?: ExportDestination[];
  /** Transformaciones a aplicar */
  readonly transformations?: TokenTransformation[];
  /** Opciones de exportación */
  readonly options?: Partial<ExportOptions>;
  /** Opciones específicas por formato */
  readonly formatOptions?: Partial<Record<ExportFormat, Partial<ExportOptions>>>;
  /** Si validar antes de exportar */
  readonly validateBeforeExport?: boolean;
  /** Si generar manifest */
  readonly generateManifest?: boolean;
  /** Preset a usar */
  readonly preset?: string;
}

/**
 * Resultado individual de exportación.
 */
export interface FormatExportResult {
  /** Formato */
  readonly format: ExportFormat;
  /** Si tuvo éxito */
  readonly success: boolean;
  /** Resultado si éxito */
  readonly result?: ExportResult;
  /** Error si falló */
  readonly error?: Error;
  /** Destinos a los que se exportó */
  readonly destinations?: Array<{
    type: ExportDestination['type'];
    location?: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * Manifest de exportación.
 */
export interface ExportManifest {
  /** Timestamp de exportación */
  readonly exportedAt: Date;
  /** Versión del exportador */
  readonly version: string;
  /** Nombre de la colección */
  readonly collectionName: string;
  /** Total de tokens */
  readonly tokenCount: number;
  /** Formatos generados */
  readonly formats: ExportFormat[];
  /** Destinos */
  readonly destinations: string[];
  /** Checksum del contenido */
  readonly checksum: string;
  /** Metadata adicional */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Output del use case.
 */
export interface ExportDesignTokensOutput {
  /** Si todas las exportaciones fueron exitosas */
  readonly success: boolean;
  /** Resultados por formato */
  readonly results: FormatExportResult[];
  /** Manifest si se solicitó */
  readonly manifest?: ExportManifest;
  /** Resumen */
  readonly summary: {
    readonly totalFormats: number;
    readonly successfulFormats: number;
    readonly failedFormats: number;
    readonly totalDestinations: number;
    readonly successfulDestinations: number;
    readonly totalTokensExported: number;
    readonly totalSizeBytes: number;
    readonly executionTimeMs: number;
  };
  /** Warnings */
  readonly warnings: string[];
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Presets de exportación predefinidos.
 */
export const EXPORT_PRESETS: Record<string, ExportPreset> = {
  /** Preset para desarrollo web */
  web: {
    name: 'Web Development',
    formats: ['css', 'scss', 'typescript'],
    formatOptions: {
      css: { rootSelector: ':root', includeFallbacks: true } as Partial<ExportOptions>,
      scss: { generateMaps: true, generateMixins: true } as Partial<ExportOptions>,
      typescript: { generateTypes: true, constAssertions: true } as Partial<ExportOptions>,
    },
  },

  /** Preset para Tailwind */
  tailwind: {
    name: 'Tailwind CSS',
    formats: ['tailwind', 'css'],
    formatOptions: {
      tailwind: {
        mode: 'extend',
        sections: ['colors', 'spacing', 'fontSize', 'boxShadow', 'borderRadius'],
        generatePlugin: true,
      } as Partial<ExportOptions>,
    },
  },

  /** Preset para design tools */
  designTools: {
    name: 'Design Tools',
    formats: ['w3c', 'figma', 'json'],
    formatOptions: {
      w3c: { specVersion: '1.0', includeExtensions: true } as Partial<ExportOptions>,
    },
  },

  /** Preset para apps nativas */
  native: {
    name: 'Native Apps',
    formats: ['swift', 'kotlin', 'android-xml'],
  },

  /** Preset para CI/CD */
  ci: {
    name: 'CI/CD Pipeline',
    formats: ['json', 'w3c'],
    transformations: [
      { type: 'sort', config: { by: 'name' } },
    ],
  },

  /** Preset completo */
  full: {
    name: 'Full Export',
    formats: ['css', 'scss', 'tailwind', 'w3c', 'json', 'typescript'],
  },
};

// ============================================================================
// USE CASE
// ============================================================================

/**
 * ExportDesignTokens - Exporta tokens de diseño a múltiples formatos.
 *
 * Este use case orquesta la exportación de tokens a diferentes formatos
 * y destinos, aplicando transformaciones y validaciones.
 *
 * @example
 * ```typescript
 * const useCase = new ExportDesignTokens(exporter, auditService);
 *
 * const result = await useCase.execute({
 *   collection: tokenCollection,
 *   formats: ['css', 'tailwind', 'w3c'],
 *   destinations: [
 *     { type: 'file', path: './tokens' },
 *   ],
 *   validateBeforeExport: true,
 *   generateManifest: true,
 * });
 *
 * if (result.success) {
 *   console.log(`Exported ${result.value.summary.totalTokensExported} tokens`);
 *   console.log(`Total size: ${result.value.summary.totalSizeBytes} bytes`);
 * }
 * ```
 */
export class ExportDesignTokens {
  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly exporterPort: ExporterPort;
  private readonly auditPort?: AuditPort;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(exporterPort: ExporterPort, auditPort?: AuditPort) {
    this.exporterPort = exporterPort;
    this.auditPort = auditPort;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ejecuta el use case.
   */
  async execute(
    input: ExportDesignTokensInput
  ): Promise<Result<ExportDesignTokensOutput, Error>> {
    const startTime = Date.now();

    try {
      // 1. Resolver preset si se especifica
      const resolvedInput = this.resolvePreset(input);

      // 2. Validar input
      const validationResult = this.validateInput(resolvedInput);
      if (!validationResult.success) {
        return failure(validationResult.error);
      }

      // 3. Aplicar transformaciones
      const transformedCollection = await this.applyTransformations(
        resolvedInput.collection,
        resolvedInput.transformations
      );

      // 4. Validar colección si se solicita
      if (resolvedInput.validateBeforeExport) {
        const collectionValidation = transformedCollection.validate();
        if (!collectionValidation.valid) {
          return failure(
            new Error(`Token collection validation failed: ${collectionValidation.errors.join(', ')}`)
          );
        }
      }

      // 5. Exportar a cada formato
      const results: FormatExportResult[] = [];
      const warnings: string[] = [];

      for (const format of resolvedInput.formats) {
        const formatResult = await this.exportFormat(
          transformedCollection,
          format,
          resolvedInput
        );
        results.push(formatResult);

        if (!formatResult.success && formatResult.error) {
          warnings.push(`Format ${format}: ${formatResult.error.message}`);
        }
      }

      // 6. Calcular resumen
      const summary = this.calculateSummary(results, startTime);

      // 7. Generar manifest si se solicita
      let manifest: ExportManifest | undefined;
      if (resolvedInput.generateManifest) {
        manifest = this.generateManifest(transformedCollection, resolvedInput.formats, results);
      }

      // 8. Registrar en auditoría
      if (this.auditPort) {
        await this.auditPort.log({
          category: 'export',
          severity: summary.failedFormats > 0 ? 'warning' : 'info',
          message: `Exported ${summary.totalTokensExported} tokens to ${summary.successfulFormats} formats`,
          data: {
            formats: resolvedInput.formats,
            tokenCount: summary.totalTokensExported,
            sizeBytes: summary.totalSizeBytes,
            executionTimeMs: summary.executionTimeMs,
          },
        });
      }

      return success({
        success: summary.failedFormats === 0,
        results,
        manifest,
        summary,
        warnings,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Unknown error during token export')
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resuelve preset si se especifica.
   */
  private resolvePreset(input: ExportDesignTokensInput): ExportDesignTokensInput {
    if (!input.preset || !EXPORT_PRESETS[input.preset]) {
      return input;
    }

    const preset = EXPORT_PRESETS[input.preset];
    return {
      ...input,
      formats: input.formats.length > 0 ? input.formats : preset.formats,
      destinations: input.destinations || preset.destinations,
      transformations: [...(preset.transformations || []), ...(input.transformations || [])],
      formatOptions: { ...preset.formatOptions, ...input.formatOptions },
    };
  }

  /**
   * Valida el input.
   */
  private validateInput(input: ExportDesignTokensInput): Result<void, Error> {
    if (!input.collection) {
      return failure(new Error('Token collection is required'));
    }

    if (!input.formats || input.formats.length === 0) {
      return failure(new Error('At least one export format is required'));
    }

    for (const format of input.formats) {
      if (!this.exporterPort.supportsFormat(format)) {
        return failure(new Error(`Unsupported export format: ${format}`));
      }
    }

    return success(undefined);
  }

  /**
   * Aplica transformaciones a la colección.
   */
  private async applyTransformations(
    collection: TokenCollection,
    transformations?: TokenTransformation[]
  ): Promise<TokenCollection> {
    if (!transformations || transformations.length === 0) {
      return collection;
    }

    let result = collection;

    for (const transform of transformations) {
      result = this.applyTransformation(result, transform);
    }

    return result;
  }

  /**
   * Aplica una transformación individual.
   */
  private applyTransformation(
    collection: TokenCollection,
    transform: TokenTransformation
  ): TokenCollection {
    switch (transform.type) {
      case 'filter':
        return this.applyFilterTransform(collection, transform.config);
      case 'sort':
        return this.applySortTransform(collection, transform.config);
      default:
        return collection;
    }
  }

  /**
   * Aplica transformación de filtro.
   */
  private applyFilterTransform(
    collection: TokenCollection,
    config: Record<string, unknown>
  ): TokenCollection {
    const tokens = collection.filter(config as Parameters<typeof collection.filter>[0]);
    // Use from() to create collection with filtered tokens (immutable pattern)
    return TokenCollection.from(`${collection.name}-filtered`, [...tokens], collection.description);
  }

  /**
   * Aplica transformación de ordenamiento.
   */
  private applySortTransform(
    collection: TokenCollection,
    _config: Record<string, unknown>
  ): TokenCollection {
    // Simplified - would implement actual sorting based on config
    return collection;
  }

  /**
   * Exporta a un formato específico.
   */
  private async exportFormat(
    collection: TokenCollection,
    format: ExportFormat,
    input: ExportDesignTokensInput
  ): Promise<FormatExportResult> {
    try {
      const options = this.buildExportOptions(format, input);
      const exportResult = await this.exporterPort.export(collection, options);

      if (!exportResult.success) {
        return {
          format,
          success: false,
          error: exportResult.error,
        };
      }

      // Export to destinations if specified
      const destinations = input.destinations || [];
      const destinationResults: FormatExportResult['destinations'] = [];

      for (const dest of destinations) {
        try {
          const destResult = await this.exporterPort.exportTo(collection, options, dest);
          destinationResults.push({
            type: dest.type,
            location: destResult.success ? destResult.value.location : undefined,
            success: destResult.success,
            error: destResult.success ? undefined : destResult.error.message,
          });
        } catch (e) {
          destinationResults.push({
            type: dest.type,
            success: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }

      return {
        format,
        success: true,
        result: exportResult.value,
        destinations: destinationResults.length > 0 ? destinationResults : undefined,
      };
    } catch (error) {
      return {
        format,
        success: false,
        error: error instanceof Error ? error : new Error('Unknown export error'),
      };
    }
  }

  /**
   * Construye opciones de exportación.
   */
  private buildExportOptions(
    format: ExportFormat,
    input: ExportDesignTokensInput
  ): ExportOptions {
    const baseOptions = input.options || {};
    const formatSpecificOptions = input.formatOptions?.[format] || {};

    return {
      format,
      ...baseOptions,
      ...formatSpecificOptions,
    } as ExportOptions;
  }

  /**
   * Calcula resumen de exportación.
   */
  private calculateSummary(
    results: FormatExportResult[],
    startTime: number
  ): ExportDesignTokensOutput['summary'] {
    const successfulFormats = results.filter(r => r.success).length;
    const failedFormats = results.length - successfulFormats;

    const totalTokensExported = results
      .filter(r => r.success && r.result)
      .reduce((sum, r) => sum + (r.result?.tokenCount || 0), 0) / Math.max(successfulFormats, 1);

    const totalSizeBytes = results
      .filter(r => r.success && r.result)
      .reduce((sum, r) => sum + (r.result?.sizeBytes || 0), 0);

    const destinations = results.flatMap(r => r.destinations || []);
    const successfulDestinations = destinations.filter(d => d.success).length;

    return {
      totalFormats: results.length,
      successfulFormats,
      failedFormats,
      totalDestinations: destinations.length,
      successfulDestinations,
      totalTokensExported: Math.round(totalTokensExported),
      totalSizeBytes,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Genera manifest de exportación.
   */
  private generateManifest(
    collection: TokenCollection,
    formats: ExportFormat[],
    results: FormatExportResult[]
  ): ExportManifest {
    const destinations = results
      .flatMap(r => r.destinations || [])
      .filter(d => d.success && d.location)
      .map(d => d.location!);

    return {
      exportedAt: new Date(),
      version: '1.0.0',
      collectionName: collection.name,
      tokenCount: collection.all().length,
      formats,
      destinations,
      checksum: this.generateChecksum(collection),
    };
  }

  /**
   * Genera checksum de la colección.
   */
  private generateChecksum(collection: TokenCollection): string {
    // Simplified checksum - would use proper hashing
    const content = collection.export({ format: 'json' });
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ExportDesignTokens;
