/**
 * @fileoverview Outbound Ports Index
 *
 * Puertos de salida - interfaces que el dominio requiere
 * y que son implementadas por adaptadores de infraestructura.
 *
 * @module ui-kit/application/ports/outbound
 */

export type { TokenRepositoryPort } from './TokenRepositoryPort';

export type { AuditPort } from './AuditPort';
export type {
  AuditEntry,
  AuditSeverity,
  AuditCategory,
  AuditFilter,
  AuditReport,
  AuditStats,
  AccessibilityAudit,
  ColorDecisionAudit,
  TokenGenerationAudit,
} from './AuditPort';

export type { ThemeAdapterPort } from './ThemeAdapterPort';
export type {
  ThemeConfig,
  ThemeState,
  ThemeChangeOptions,
  ThemePreferences,
  SystemPreferences,
} from './ThemeAdapterPort';

export type { ExporterPort } from './ExporterPort';
export type {
  ExportResult,
  ExportDestination,
  ExportToDestinationResult,
  BaseExportOptions,
  CssExportOptions,
  ScssExportOptions,
  TailwindExportOptions,
  W3cExportOptions,
  FigmaExportOptions,
  TypeScriptExportOptions,
} from './ExporterPort';

// NOTE: ExportFormat and ExportOptions union type are NOT re-exported here to avoid
// ambiguity with domain/types definitions. Import from domain/types for canonical types,
// or directly from './ExporterPort' if you need the port-specific types.
