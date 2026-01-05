/**
 * @fileoverview AuditPort - Outbound Port for Visual Decision Auditing
 *
 * Puerto de salida que define el contrato para auditar, registrar y reportar
 * decisiones visuales tomadas por el sistema Color Intelligence.
 *
 * Permite trazabilidad completa de:
 * - Decisiones de color
 * - Evaluaciones de accesibilidad
 * - Generación de tokens
 * - Cambios en el sistema de diseño
 *
 * @module ui-kit/application/ports/outbound/AuditPort
 * @version 1.0.0
 */

import type { Result, UIState } from '../../../domain/types';
import type { PerceptualColor } from '../../../domain/perceptual';
import type { UIRole, ComponentIntent } from '../../../domain/ux';
import type { DesignToken } from '../../../domain/tokens';

// ============================================================================
// AUDIT TYPES
// ============================================================================

/**
 * Niveles de severidad para eventos de auditoría.
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Categorías de eventos de auditoría.
 */
export type AuditCategory =
  | 'color-decision'
  | 'accessibility'
  | 'token-generation'
  | 'token-modification'
  | 'theme-change'
  | 'export'
  | 'import'
  | 'validation'
  | 'performance';

/**
 * Entrada de auditoría base.
 */
export interface AuditEntry {
  /** ID único del evento */
  readonly id: string;
  /** Timestamp del evento */
  readonly timestamp: Date;
  /** Categoría del evento */
  readonly category: AuditCategory;
  /** Severidad del evento */
  readonly severity: AuditSeverity;
  /** Mensaje descriptivo */
  readonly message: string;
  /** Datos adicionales del evento */
  readonly data?: Record<string, unknown>;
  /** Usuario o sistema que originó el evento */
  readonly source?: string;
  /** ID de correlación para trazar eventos relacionados */
  readonly correlationId?: string;
  /** Tags para búsqueda */
  readonly tags?: string[];
}

/**
 * Auditoría de decisión de color.
 */
export interface ColorDecisionAudit extends AuditEntry {
  readonly category: 'color-decision';
  readonly data: {
    /** Color de entrada */
    readonly inputColor: string;
    /** Color resultante */
    readonly outputColor: string;
    /** Contexto de la decisión */
    readonly context: {
      readonly role?: string;
      readonly state?: string;
      readonly intent?: string;
      readonly variant?: string;
    };
    /** Justificación */
    readonly rationale: string;
    /** Transformaciones aplicadas */
    readonly transformations: string[];
  };
}

/**
 * Auditoría de accesibilidad.
 */
export interface AccessibilityAudit extends AuditEntry {
  readonly category: 'accessibility';
  readonly data: {
    /** Color de primer plano */
    readonly foreground: string;
    /** Color de fondo */
    readonly background: string;
    /** Ratio de contraste WCAG */
    readonly wcagRatio: number;
    /** Nivel APCA */
    readonly apcaLevel: number;
    /** Nivel requerido */
    readonly requiredLevel: string;
    /** Si pasa */
    readonly passes: boolean;
    /** Recomendación si falla */
    readonly recommendation?: string;
    /** Componente afectado */
    readonly component?: string;
  };
}

/**
 * Auditoría de generación de tokens.
 */
export interface TokenGenerationAudit extends AuditEntry {
  readonly category: 'token-generation';
  readonly data: {
    /** Nombre del componente o tema */
    readonly name: string;
    /** Número de tokens generados */
    readonly tokenCount: number;
    /** Tipos de tokens generados */
    readonly tokenTypes: string[];
    /** Tiempo de generación (ms) */
    readonly generationTimeMs: number;
    /** Configuración usada */
    readonly config?: Record<string, unknown>;
  };
}

/**
 * Filtros para búsqueda de auditoría.
 */
export interface AuditFilter {
  /** Categorías a incluir */
  readonly categories?: AuditCategory[];
  /** Severidades a incluir */
  readonly severities?: AuditSeverity[];
  /** Rango de fechas */
  readonly startDate?: Date;
  readonly endDate?: Date;
  /** Texto a buscar */
  readonly searchText?: string;
  /** Tags requeridos */
  readonly tags?: string[];
  /** ID de correlación */
  readonly correlationId?: string;
  /** Límite de resultados */
  readonly limit?: number;
  /** Offset para paginación */
  readonly offset?: number;
}

/**
 * Reporte de auditoría.
 */
export interface AuditReport {
  /** Período del reporte */
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
  /** Resumen de eventos */
  readonly summary: {
    readonly totalEvents: number;
    readonly byCategory: Record<AuditCategory, number>;
    readonly bySeverity: Record<AuditSeverity, number>;
    readonly uniqueCorrelations: number;
  };
  /** Métricas de accesibilidad */
  readonly accessibility: {
    readonly totalEvaluations: number;
    readonly passRate: number;
    readonly failedComponents: string[];
    readonly avgWcagRatio: number;
    readonly avgApcaLevel: number;
  };
  /** Métricas de tokens */
  readonly tokens: {
    readonly totalGenerated: number;
    readonly avgGenerationTimeMs: number;
    readonly byType: Record<string, number>;
  };
  /** Issues destacados */
  readonly highlightedIssues: AuditEntry[];
  /** Recomendaciones */
  readonly recommendations: string[];
}

/**
 * Estadísticas de auditoría en tiempo real.
 */
export interface AuditStats {
  /** Eventos en la última hora */
  readonly lastHour: {
    readonly total: number;
    readonly errors: number;
    readonly warnings: number;
  };
  /** Eventos hoy */
  readonly today: {
    readonly total: number;
    readonly byCategory: Record<AuditCategory, number>;
  };
  /** Tasa de éxito de accesibilidad */
  readonly accessibilityPassRate: number;
  /** Componentes con más issues */
  readonly topIssueComponents: Array<{ name: string; count: number }>;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * AuditPort - Puerto de salida para auditoría visual.
 *
 * Define el contrato para registrar y consultar decisiones visuales
 * para trazabilidad, debugging y reporting.
 *
 * @example
 * ```typescript
 * class ConsoleAuditAdapter implements AuditPort {
 *   async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<Result<string, Error>> {
 *     const id = crypto.randomUUID();
 *     console.log(`[${entry.severity}] ${entry.message}`, entry.data);
 *     return success(id);
 *   }
 * }
 * ```
 */
export interface AuditPort {
  // ─────────────────────────────────────────────────────────────────────────
  // LOGGING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Registra un evento de auditoría.
   *
   * @param entry - Datos del evento (sin id ni timestamp)
   * @returns ID del evento creado
   */
  log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<Result<string, Error>>;

  /**
   * Registra una decisión de color.
   *
   * @param decision - Datos de la decisión
   * @param correlationId - ID para correlacionar eventos
   */
  logColorDecision(
    decision: {
      inputColor: PerceptualColor;
      outputColor: PerceptualColor;
      role?: UIRole;
      state?: UIState;
      intent?: ComponentIntent;
      rationale: string;
    },
    correlationId?: string
  ): Promise<Result<string, Error>>;

  /**
   * Registra una evaluación de accesibilidad.
   *
   * @param evaluation - Datos de la evaluación
   * @param correlationId - ID para correlacionar eventos
   */
  logAccessibilityEvaluation(
    evaluation: {
      foreground: PerceptualColor;
      background: PerceptualColor;
      wcagRatio: number;
      apcaLevel: number;
      requiredLevel: string;
      passes: boolean;
      component?: string;
    },
    correlationId?: string
  ): Promise<Result<string, Error>>;

  /**
   * Registra generación de tokens.
   *
   * @param generation - Datos de la generación
   * @param correlationId - ID para correlacionar eventos
   */
  logTokenGeneration(
    generation: {
      name: string;
      tokens: DesignToken[];
      generationTimeMs: number;
      config?: Record<string, unknown>;
    },
    correlationId?: string
  ): Promise<Result<string, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // QUERYING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Busca eventos de auditoría.
   *
   * @param filter - Filtros de búsqueda
   */
  query(filter: AuditFilter): Promise<Result<AuditEntry[], Error>>;

  /**
   * Obtiene un evento por ID.
   *
   * @param id - ID del evento
   */
  getById(id: string): Promise<Result<AuditEntry | null, Error>>;

  /**
   * Obtiene eventos por ID de correlación.
   *
   * @param correlationId - ID de correlación
   */
  getByCorrelation(correlationId: string): Promise<Result<AuditEntry[], Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera un reporte de auditoría para un período.
   *
   * @param startDate - Fecha de inicio
   * @param endDate - Fecha de fin
   */
  generateReport(startDate: Date, endDate: Date): Promise<Result<AuditReport, Error>>;

  /**
   * Obtiene estadísticas en tiempo real.
   */
  getStats(): Promise<Result<AuditStats, Error>>;

  /**
   * Exporta eventos de auditoría.
   *
   * @param filter - Filtros para los eventos a exportar
   * @param format - Formato de exportación
   */
  export(
    filter: AuditFilter,
    format: 'json' | 'csv' | 'html'
  ): Promise<Result<string, Error>>;

  // ─────────────────────────────────────────────────────────────────────────
  // MAINTENANCE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Elimina eventos antiguos.
   *
   * @param olderThan - Fecha límite
   */
  purge(olderThan: Date): Promise<Result<number, Error>>;

  /**
   * Archiva eventos a almacenamiento de largo plazo.
   *
   * @param olderThan - Fecha límite para archivar
   */
  archive(olderThan: Date): Promise<Result<number, Error>>;

  /**
   * Verifica si el sistema de auditoría está disponible.
   */
  isAvailable(): Promise<boolean>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AuditPort;
