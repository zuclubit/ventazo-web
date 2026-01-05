/**
 * @fileoverview Infrastructure Layer - UI Kit
 *
 * Capa de infraestructura del sistema de diseño gobernado por Color Intelligence.
 *
 * Esta capa contiene implementaciones concretas de los outbound ports:
 *
 * ## Audit Adapters
 * Implementaciones para auditoría y logging:
 * - InMemoryAuditAdapter: Para desarrollo y testing
 *
 * ## Token Exporters
 * Implementaciones para exportación de tokens:
 * - W3CTokenExporter: Formato W3C DTCG
 *
 * ## Token Repositories (futuro)
 * - FileSystemRepository: Persistencia en archivos
 * - ApiRepository: Persistencia vía API
 *
 * @module ui-kit/infrastructure
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   InMemoryAuditAdapter,
 *   W3CTokenExporter,
 * } from '@zuclubit/ui-kit/infrastructure';
 *
 * // Setup audit
 * const auditAdapter = new InMemoryAuditAdapter({
 *   consoleLogging: true,
 *   logLevel: 'info',
 * });
 *
 * // Setup exporter
 * const exporter = new W3CTokenExporter({
 *   includeType: true,
 *   groupByPath: true,
 * });
 *
 * // Use in use cases
 * const exportUseCase = new ExportDesignTokens(exporter, auditAdapter);
 * ```
 */

// ============================================================================
// AUDIT
// ============================================================================

export {
  InMemoryAuditAdapter,
  type InMemoryAuditOptions,
} from './audit';

// ============================================================================
// EXPORTERS
// ============================================================================

export {
  W3CTokenExporter,
  type W3CExporterOptions,
} from './exporters';
