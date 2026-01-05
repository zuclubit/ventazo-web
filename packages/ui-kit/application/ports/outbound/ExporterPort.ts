/**
 * @fileoverview ExporterPort - Outbound Port for Token Export
 *
 * Puerto de salida que define el contrato para exportar tokens de diseño
 * a diferentes formatos y destinos.
 *
 * Formatos soportados:
 * - CSS Custom Properties
 * - SCSS Variables
 * - W3C Design Tokens (DTCG)
 * - Tailwind Config
 * - Figma Tokens
 * - Style Dictionary
 * - JSON/YAML
 *
 * @module ui-kit/application/ports/outbound/ExporterPort
 * @version 1.0.0
 */

import type { Result } from '../../../domain/types';
import type { TokenCollection, DesignToken } from '../../../domain/tokens';

// ============================================================================
// EXPORT TYPES
// ============================================================================

/**
 * Formatos de exportación soportados.
 */
export type ExportFormat =
  | 'css'
  | 'scss'
  | 'less'
  | 'w3c'
  | 'tailwind'
  | 'figma'
  | 'style-dictionary'
  | 'json'
  | 'yaml'
  | 'typescript'
  | 'swift'
  | 'kotlin'
  | 'android-xml';

/**
 * Destinos de exportación.
 */
export type ExportDestination =
  | { type: 'file'; path: string }
  | { type: 'stdout' }
  | { type: 'clipboard' }
  | { type: 'api'; url: string; method?: 'POST' | 'PUT'; headers?: Record<string, string> }
  | { type: 'figma'; fileKey: string; nodeId?: string }
  | { type: 'memory' };

/**
 * Opciones base de exportación.
 */
export interface BaseExportOptions {
  /** Prefijo para nombres de tokens */
  readonly prefix?: string;
  /** Sufijo para nombres de tokens */
  readonly suffix?: string;
  /** Si incluir comentarios/descripciones */
  readonly includeComments?: boolean;
  /** Si minificar output */
  readonly minify?: boolean;
  /** Filtro de tokens a incluir */
  readonly filter?: {
    readonly types?: string[];
    readonly categories?: string[];
    readonly components?: string[];
    readonly tags?: string[];
  };
  /** Transformadores de nombres */
  readonly nameTransform?: 'camelCase' | 'kebab-case' | 'snake_case' | 'PascalCase';
}

/**
 * Opciones específicas para CSS.
 */
export interface CssExportOptions extends BaseExportOptions {
  readonly format: 'css';
  /** Selector raíz */
  readonly rootSelector?: string;
  /** Si incluir fallbacks */
  readonly includeFallbacks?: boolean;
  /** Media queries para modo oscuro */
  readonly darkModeMediaQuery?: boolean;
  /** Clase para modo oscuro */
  readonly darkModeClass?: string;
}

/**
 * Opciones específicas para SCSS.
 */
export interface ScssExportOptions extends BaseExportOptions {
  readonly format: 'scss';
  /** Si generar mapas */
  readonly generateMaps?: boolean;
  /** Si generar mixins */
  readonly generateMixins?: boolean;
  /** Si generar funciones */
  readonly generateFunctions?: boolean;
}

/**
 * Opciones específicas para Tailwind.
 */
export interface TailwindExportOptions extends BaseExportOptions {
  readonly format: 'tailwind';
  /** Si extender o sobrescribir tema */
  readonly mode?: 'extend' | 'override';
  /** Secciones a generar */
  readonly sections?: ('colors' | 'spacing' | 'fontSize' | 'boxShadow' | 'borderRadius')[];
  /** Si generar plugin */
  readonly generatePlugin?: boolean;
}

/**
 * Opciones específicas para W3C DTCG.
 */
export interface W3cExportOptions extends BaseExportOptions {
  readonly format: 'w3c';
  /** Versión del spec */
  readonly specVersion?: '1.0' | 'draft';
  /** Si incluir $extensions */
  readonly includeExtensions?: boolean;
  /** Grupos de tokens */
  readonly groups?: string[];
}

/**
 * Opciones específicas para Figma.
 */
export interface FigmaExportOptions extends BaseExportOptions {
  readonly format: 'figma';
  /** Token del API de Figma */
  readonly apiToken: string;
  /** Si crear estilos en Figma */
  readonly createStyles?: boolean;
  /** Si actualizar estilos existentes */
  readonly updateExisting?: boolean;
  /** Colección de variables */
  readonly variableCollection?: string;
}

/**
 * Opciones específicas para TypeScript.
 */
export interface TypeScriptExportOptions extends BaseExportOptions {
  readonly format: 'typescript';
  /** Si generar types */
  readonly generateTypes?: boolean;
  /** Si generar const assertions */
  readonly constAssertions?: boolean;
  /** Si generar enums */
  readonly generateEnums?: boolean;
  /** Nombre del módulo */
  readonly moduleName?: string;
}

/**
 * Unión de todas las opciones de exportación.
 */
export type ExportOptions =
  | CssExportOptions
  | ScssExportOptions
  | TailwindExportOptions
  | W3cExportOptions
  | FigmaExportOptions
  | TypeScriptExportOptions
  | (BaseExportOptions & { readonly format: Exclude<ExportFormat, 'css' | 'scss' | 'tailwind' | 'w3c' | 'figma' | 'typescript'> });

/**
 * Resultado de exportación.
 */
export interface ExportResult {
  /** Formato usado */
  readonly format: ExportFormat;
  /** Contenido generado */
  readonly content: string;
  /** Número de tokens exportados */
  readonly tokenCount: number;
  /** Tamaño en bytes */
  readonly sizeBytes: number;
  /** Timestamp de exportación */
  readonly exportedAt: Date;
  /** Advertencias durante exportación */
  readonly warnings: string[];
  /** Metadata adicional */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Resultado de exportación a destino.
 */
export interface ExportToDestinationResult extends ExportResult {
  /** Destino usado */
  readonly destination: ExportDestination;
  /** URL o path resultante si aplica */
  readonly location?: string;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * ExporterPort - Puerto de salida para exportación de tokens.
 *
 * Define el contrato para exportar tokens de diseño a diferentes
 * formatos y destinos.
 *
 * @example
 * ```typescript
 * class FileExporter implements ExporterPort {
 *   async export(collection: TokenCollection, options: ExportOptions): Promise<Result<ExportResult, Error>> {
 *     const content = this.formatters[options.format](collection, options);
 *     return success({
 *       format: options.format,
 *       content,
 *       tokenCount: collection.all().length,
 *       sizeBytes: Buffer.byteLength(content),
 *       exportedAt: new Date(),
 *       warnings: [],
 *     });
 *   }
 * }
 * ```
 */
export interface ExporterPort {
  // ─────────────────────────────────────────────────────────────────────────
  // EXPORT OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exporta una colección de tokens a un formato.
   *
   * @param collection - Colección a exportar
   * @param options - Opciones de exportación
   */
  export(collection: TokenCollection, options: ExportOptions): Promise<Result<ExportResult, Error>>;

  /**
   * Exporta a un destino específico.
   *
   * @param collection - Colección a exportar
   * @param options - Opciones de exportación
   * @param destination - Destino de exportación
   */
  exportTo(
    collection: TokenCollection,
    options: ExportOptions,
    destination: ExportDestination
  ): Promise<Result<ExportToDestinationResult, Error>>;

  /**
   * Exporta tokens individuales.
   *
   * @param tokens - Tokens a exportar
   * @param options - Opciones de exportación
   */
  exportTokens(tokens: DesignToken[], options: ExportOptions): Promise<Result<ExportResult, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT SUPPORT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lista los formatos soportados.
   */
  getSupportedFormats(): ExportFormat[];

  /**
   * Verifica si un formato está soportado.
   *
   * @param format - Formato a verificar
   */
  supportsFormat(format: string): format is ExportFormat;

  /**
   * Obtiene las opciones por defecto para un formato.
   *
   * @param format - Formato
   */
  getDefaultOptions(format: ExportFormat): BaseExportOptions;

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida opciones de exportación.
   *
   * @param options - Opciones a validar
   */
  validateOptions(options: ExportOptions): Result<void, Error>;

  /**
   * Valida que un destino está disponible.
   *
   * @param destination - Destino a validar
   */
  validateDestination(destination: ExportDestination): Promise<Result<void, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // PREVIEW
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera una preview de la exportación sin ejecutarla.
   *
   * @param collection - Colección a previsualizar
   * @param options - Opciones de exportación
   * @param maxLines - Máximo de líneas en preview
   */
  preview(
    collection: TokenCollection,
    options: ExportOptions,
    maxLines?: number
  ): Promise<Result<{ preview: string; truncated: boolean; totalLines: number }, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exporta a múltiples formatos simultáneamente.
   *
   * @param collection - Colección a exportar
   * @param formats - Lista de configuraciones de formato
   */
  exportMultiple(
    collection: TokenCollection,
    formats: ExportOptions[]
  ): Promise<Result<Map<ExportFormat, ExportResult>, Error>>;

  /**
   * Exporta a múltiples destinos simultáneamente.
   *
   * @param collection - Colección a exportar
   * @param destinations - Lista de destinos con sus opciones
   */
  exportToMultiple(
    collection: TokenCollection,
    destinations: Array<{ options: ExportOptions; destination: ExportDestination }>
  ): Promise<Result<ExportToDestinationResult[], Error>>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ExporterPort;
