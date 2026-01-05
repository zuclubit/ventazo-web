/**
 * @fileoverview TokenRepositoryPort - Outbound Port for Token Persistence
 *
 * Puerto de salida que define el contrato para persistir y recuperar
 * tokens de diseño desde diferentes almacenes (archivos, bases de datos, APIs).
 *
 * @module ui-kit/application/ports/outbound/TokenRepositoryPort
 * @version 1.0.0
 */

import type { Result } from '../../../domain/types';
import type { DesignToken, TokenCollection } from '../../../domain/tokens';

// ============================================================================
// REPOSITORY TYPES
// ============================================================================

/**
 * Criterios de búsqueda para tokens.
 */
export interface TokenSearchCriteria {
  /** Nombre o patrón de nombre */
  readonly name?: string | RegExp;
  /** Tipo de token */
  readonly type?: 'color' | 'dimension' | 'shadow' | 'gradient' | 'composite';
  /** Categoría del token */
  readonly category?: 'primitive' | 'semantic' | 'component';
  /** Componente asociado */
  readonly component?: string;
  /** Estado asociado */
  readonly state?: string;
  /** Tags que debe tener */
  readonly tags?: string[];
  /** Rango de fechas de creación */
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  /** Límite de resultados */
  readonly limit?: number;
  /** Offset para paginación */
  readonly offset?: number;
}

/**
 * Resultado paginado de búsqueda.
 */
export interface PaginatedResult<T> {
  /** Items en esta página */
  readonly items: T[];
  /** Total de items que coinciden */
  readonly total: number;
  /** Página actual (0-indexed) */
  readonly page: number;
  /** Items por página */
  readonly pageSize: number;
  /** Si hay más páginas */
  readonly hasMore: boolean;
}

/**
 * Opciones de guardado.
 */
export interface SaveOptions {
  /** Si sobrescribir tokens existentes */
  readonly overwrite?: boolean;
  /** Si crear backup antes de sobrescribir */
  readonly backup?: boolean;
  /** Namespace para los tokens */
  readonly namespace?: string;
  /** Metadata adicional */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Información de versión de tokens.
 */
export interface TokenVersion {
  /** ID de la versión */
  readonly id: string;
  /** Timestamp de la versión */
  readonly timestamp: Date;
  /** Autor del cambio */
  readonly author?: string;
  /** Descripción del cambio */
  readonly description?: string;
  /** Hash del contenido */
  readonly contentHash: string;
}

/**
 * Resultado de comparación entre versiones.
 */
export interface TokenDiff {
  /** Tokens añadidos */
  readonly added: DesignToken[];
  /** Tokens eliminados */
  readonly removed: DesignToken[];
  /** Tokens modificados */
  readonly modified: Array<{
    readonly name: string;
    readonly before: DesignToken;
    readonly after: DesignToken;
    readonly changes: string[];
  }>;
  /** Resumen de cambios */
  readonly summary: {
    readonly addedCount: number;
    readonly removedCount: number;
    readonly modifiedCount: number;
    readonly unchangedCount: number;
  };
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * TokenRepositoryPort - Puerto de salida para persistencia de tokens.
 *
 * Define el contrato para almacenar y recuperar tokens de diseño.
 * Los adaptadores implementan este puerto para diferentes backends:
 * - Sistema de archivos (JSON, YAML)
 * - Base de datos
 * - APIs remotas (Figma, Design System APIs)
 * - Local Storage / IndexedDB
 *
 * @example
 * ```typescript
 * class FileTokenRepository implements TokenRepositoryPort {
 *   async save(collection: TokenCollection, options?: SaveOptions): Promise<Result<void, Error>> {
 *     const json = collection.export({ format: 'w3c' });
 *     await fs.writeFile(this.path, json);
 *     return success(undefined);
 *   }
 * }
 * ```
 */
export interface TokenRepositoryPort {
  // ─────────────────────────────────────────────────────────────────────────
  // CRUD OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Guarda una colección de tokens.
   *
   * @param collection - Colección a guardar
   * @param options - Opciones de guardado
   */
  save(collection: TokenCollection, options?: SaveOptions): Promise<Result<void, Error>>;

  /**
   * Carga todos los tokens del repositorio.
   *
   * @param namespace - Namespace opcional para filtrar
   */
  load(namespace?: string): Promise<Result<TokenCollection, Error>>;

  /**
   * Busca tokens según criterios.
   *
   * @param criteria - Criterios de búsqueda
   */
  search(criteria: TokenSearchCriteria): Promise<Result<PaginatedResult<DesignToken>, Error>>;

  /**
   * Obtiene un token por nombre.
   *
   * @param name - Nombre del token
   */
  getByName(name: string): Promise<Result<DesignToken | null, Error>>;

  /**
   * Elimina tokens según criterios.
   *
   * @param criteria - Criterios para eliminar
   */
  delete(criteria: TokenSearchCriteria): Promise<Result<number, Error>>;

  /**
   * Actualiza un token existente.
   *
   * @param name - Nombre del token a actualizar
   * @param token - Nuevo valor del token
   */
  update(name: string, token: DesignToken): Promise<Result<void, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // VERSIONING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Lista las versiones disponibles.
   *
   * @param limit - Número máximo de versiones
   */
  listVersions(limit?: number): Promise<Result<TokenVersion[], Error>>;

  /**
   * Carga una versión específica.
   *
   * @param versionId - ID de la versión
   */
  loadVersion(versionId: string): Promise<Result<TokenCollection, Error>>;

  /**
   * Compara dos versiones.
   *
   * @param versionA - Primera versión
   * @param versionB - Segunda versión
   */
  compareVersions(versionA: string, versionB: string): Promise<Result<TokenDiff, Error>>;

  /**
   * Restaura una versión anterior.
   *
   * @param versionId - ID de la versión a restaurar
   */
  restoreVersion(versionId: string): Promise<Result<void, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // IMPORT/EXPORT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Importa tokens desde un formato externo.
   *
   * @param data - Datos a importar
   * @param format - Formato de los datos
   */
  import(
    data: string,
    format: 'w3c' | 'figma' | 'style-dictionary' | 'tailwind'
  ): Promise<Result<TokenCollection, Error>>;

  /**
   * Exporta tokens a un formato específico.
   *
   * @param format - Formato de exportación
   * @param options - Opciones adicionales
   */
  export(
    format: 'w3c' | 'figma' | 'style-dictionary' | 'tailwind' | 'css' | 'scss',
    options?: { namespace?: string; minify?: boolean }
  ): Promise<Result<string, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si el repositorio está disponible.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Obtiene estadísticas del repositorio.
   */
  getStats(): Promise<Result<{
    totalTokens: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    lastModified: Date;
    sizeBytes: number;
  }, Error>>;

  /**
   * Limpia el repositorio.
   *
   * @param keepVersions - Si mantener el historial de versiones
   */
  clear(keepVersions?: boolean): Promise<Result<void, Error>>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TokenRepositoryPort;
