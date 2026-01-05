/**
 * @fileoverview In-Memory Audit Adapter
 *
 * Implementación en memoria del AuditPort para desarrollo y testing.
 * Almacena entradas de auditoría en memoria con capacidad limitada.
 *
 * @module ui-kit/infrastructure/audit/InMemoryAuditAdapter
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import type {
  AuditPort,
  AuditEntry,
  AuditFilter,
  AuditReport,
  AuditStats,
  AuditCategory,
  AuditSeverity,
} from '../../application/ports/outbound/AuditPort';
import type { PerceptualColor } from '../../domain/perceptual';
import type { DesignToken } from '../../domain/tokens';
import type { UIRole, ComponentIntent } from '../../domain/ux';
import type { UIState } from '../../domain/types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Opciones de configuración del adaptador.
 */
export interface InMemoryAuditOptions {
  /** Número máximo de entradas a mantener */
  readonly maxEntries?: number;
  /** Si habilitar logging a consola */
  readonly consoleLogging?: boolean;
  /** Nivel de logging */
  readonly logLevel?: 'info' | 'warning' | 'error' | 'critical';
  /** Callback para cada entrada nueva */
  readonly onEntry?: (entry: AuditEntry) => void;
}

/**
 * Opciones por defecto.
 */
const DEFAULT_OPTIONS: Required<InMemoryAuditOptions> = {
  maxEntries: 10000,
  consoleLogging: false,
  logLevel: 'info',
  onEntry: () => {},
};

// ============================================================================
// ADAPTER
// ============================================================================

/**
 * InMemoryAuditAdapter - Adaptador de auditoría en memoria.
 *
 * Ideal para:
 * - Desarrollo local
 * - Testing
 * - Debugging
 * - Demos
 *
 * NO recomendado para producción (datos se pierden al reiniciar).
 *
 * @example
 * ```typescript
 * const auditAdapter = new InMemoryAuditAdapter({
 *   maxEntries: 1000,
 *   consoleLogging: true,
 *   logLevel: 'info',
 * });
 *
 * // Log a color decision
 * await auditAdapter.logColorDecision({
 *   inputColor: PerceptualColor.fromHex('#3B82F6'),
 *   outputColor: PerceptualColor.fromHex('#2563EB'),
 *   rationale: 'Adjusted for WCAG AA compliance',
 * });
 * ```
 */
export class InMemoryAuditAdapter implements AuditPort {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly options: Required<InMemoryAuditOptions>;
  private entries: AuditEntry[] = [];
  private archivedEntries: AuditEntry[] = [];
  private entryCounter = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(options: InMemoryAuditOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGGING METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<Result<string, Error>> {
    try {
      const id = this.generateId();
      const fullEntry: AuditEntry = {
        id,
        timestamp: new Date(),
        category: entry.category,
        severity: entry.severity,
        message: entry.message,
        data: entry.data,
        source: entry.source,
        correlationId: entry.correlationId,
        tags: entry.tags,
      };

      this.addEntry(fullEntry);

      return success(id);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to log entry')
      );
    }
  }

  async logColorDecision(
    decision: {
      inputColor: PerceptualColor;
      outputColor: PerceptualColor;
      role?: UIRole;
      state?: UIState;
      intent?: ComponentIntent;
      rationale: string;
    },
    correlationId?: string
  ): Promise<Result<string, Error>> {
    return this.log({
      category: 'color-decision',
      severity: 'info',
      message: `Color decision: ${decision.rationale}`,
      correlationId,
      source: 'color-intelligence',
      data: {
        inputColor: decision.inputColor.hex,
        outputColor: decision.outputColor.hex,
        context: {
          role: decision.role,
          state: decision.state,
          intent: decision.intent,
        },
        rationale: decision.rationale,
        transformations: [],
      },
    });
  }

  async logAccessibilityEvaluation(
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
  ): Promise<Result<string, Error>> {
    return this.log({
      category: 'accessibility',
      severity: evaluation.passes ? 'info' : 'warning',
      message: evaluation.passes
        ? `Accessibility check passed for ${evaluation.component ?? 'component'}`
        : `Accessibility check failed for ${evaluation.component ?? 'component'}`,
      correlationId,
      source: 'accessibility-checker',
      data: {
        foreground: evaluation.foreground.hex,
        background: evaluation.background.hex,
        wcagRatio: evaluation.wcagRatio,
        apcaLevel: evaluation.apcaLevel,
        requiredLevel: evaluation.requiredLevel,
        passes: evaluation.passes,
        component: evaluation.component,
      },
    });
  }

  async logTokenGeneration(
    generation: {
      name: string;
      tokens: DesignToken[];
      generationTimeMs: number;
      config?: Record<string, unknown>;
    },
    correlationId?: string
  ): Promise<Result<string, Error>> {
    const tokenTypes = [...new Set(generation.tokens.map((t) => t.type))];

    return this.log({
      category: 'token-generation',
      severity: 'info',
      message: `Generated ${generation.tokens.length} tokens for ${generation.name}`,
      correlationId,
      source: 'token-derivation-service',
      data: {
        name: generation.name,
        tokenCount: generation.tokens.length,
        tokenTypes,
        generationTimeMs: generation.generationTimeMs,
        config: generation.config,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async query(filter: AuditFilter): Promise<Result<AuditEntry[], Error>> {
    try {
      let results = [...this.entries];

      // Apply category filter (array of categories)
      if (filter.categories && filter.categories.length > 0) {
        results = results.filter((e) => filter.categories!.includes(e.category));
      }

      // Apply severity filter (array of severities)
      if (filter.severities && filter.severities.length > 0) {
        results = results.filter((e) => filter.severities!.includes(e.severity));
      }

      if (filter.startDate) {
        results = results.filter((e) => e.timestamp >= filter.startDate!);
      }

      if (filter.endDate) {
        results = results.filter((e) => e.timestamp <= filter.endDate!);
      }

      if (filter.correlationId) {
        results = results.filter((e) => e.correlationId === filter.correlationId);
      }

      if (filter.tags && filter.tags.length > 0) {
        results = results.filter((e) =>
          e.tags && filter.tags!.some((t) => e.tags!.includes(t))
        );
      }

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        results = results.filter(
          (e) =>
            e.message.toLowerCase().includes(searchLower) ||
            JSON.stringify(e.data).toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? 100;
      results = results.slice(offset, offset + limit);

      return success(results);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to query entries')
      );
    }
  }

  async getById(id: string): Promise<Result<AuditEntry | null, Error>> {
    const entry = this.entries.find((e) => e.id === id);
    return success(entry ?? null);
  }

  async getByCorrelation(correlationId: string): Promise<Result<AuditEntry[], Error>> {
    const entries = this.entries.filter((e) => e.correlationId === correlationId);
    return success(entries);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // REPORT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async generateReport(startDate: Date, endDate: Date): Promise<Result<AuditReport, Error>> {
    try {
      const periodEntries = this.entries.filter(
        (e) => e.timestamp >= startDate && e.timestamp <= endDate
      );

      // Calculate statistics by category
      const byCategory = this.initializeCategoryRecord();
      for (const entry of periodEntries) {
        byCategory[entry.category]++;
      }

      // Calculate statistics by severity
      const bySeverity = this.initializeSeverityRecord();
      for (const entry of periodEntries) {
        bySeverity[entry.severity]++;
      }

      // Count unique correlations
      const correlations = new Set(
        periodEntries.filter((e) => e.correlationId).map((e) => e.correlationId)
      );

      // Accessibility metrics
      const accessibilityEntries = periodEntries.filter(
        (e) => e.category === 'accessibility'
      );
      const passedAccessibility = accessibilityEntries.filter(
        (e) => (e.data as { passes?: boolean })?.passes === true
      );
      const wcagRatios = accessibilityEntries
        .map((e) => (e.data as { wcagRatio?: number })?.wcagRatio)
        .filter((r): r is number => typeof r === 'number');
      const apcaLevels = accessibilityEntries
        .map((e) => (e.data as { apcaLevel?: number })?.apcaLevel)
        .filter((l): l is number => typeof l === 'number');
      const failedComponents = [
        ...new Set(
          accessibilityEntries
            .filter((e) => (e.data as { passes?: boolean })?.passes === false)
            .map((e) => (e.data as { component?: string })?.component)
            .filter((c): c is string => typeof c === 'string')
        ),
      ];

      // Token metrics
      const tokenEntries = periodEntries.filter(
        (e) => e.category === 'token-generation'
      );
      const tokenCounts = tokenEntries
        .map((e) => (e.data as { tokenCount?: number })?.tokenCount)
        .filter((c): c is number => typeof c === 'number');
      const generationTimes = tokenEntries
        .map((e) => (e.data as { generationTimeMs?: number })?.generationTimeMs)
        .filter((t): t is number => typeof t === 'number');
      const tokenTypeEntries = tokenEntries.flatMap((e) =>
        ((e.data as { tokenTypes?: string[] })?.tokenTypes ?? [])
      );
      const tokenByType: Record<string, number> = {};
      for (const type of tokenTypeEntries) {
        tokenByType[type] = (tokenByType[type] ?? 0) + 1;
      }

      // Highlighted issues (errors and critical)
      const highlightedIssues = periodEntries.filter(
        (e) => e.severity === 'error' || e.severity === 'critical'
      );

      // Recommendations
      const recommendations = this.generateRecommendations(periodEntries);

      const report: AuditReport = {
        period: {
          start: startDate,
          end: endDate,
        },
        summary: {
          totalEvents: periodEntries.length,
          byCategory,
          bySeverity,
          uniqueCorrelations: correlations.size,
        },
        accessibility: {
          totalEvaluations: accessibilityEntries.length,
          passRate:
            accessibilityEntries.length > 0
              ? passedAccessibility.length / accessibilityEntries.length
              : 1,
          failedComponents,
          avgWcagRatio:
            wcagRatios.length > 0
              ? wcagRatios.reduce((a, b) => a + b, 0) / wcagRatios.length
              : 0,
          avgApcaLevel:
            apcaLevels.length > 0
              ? apcaLevels.reduce((a, b) => a + b, 0) / apcaLevels.length
              : 0,
        },
        tokens: {
          totalGenerated: tokenCounts.reduce((a, b) => a + b, 0),
          avgGenerationTimeMs:
            generationTimes.length > 0
              ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length
              : 0,
          byType: tokenByType,
        },
        highlightedIssues,
        recommendations,
      };

      return success(report);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to generate report')
      );
    }
  }

  async getStats(): Promise<Result<AuditStats, Error>> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const lastHourEntries = this.entries.filter((e) => e.timestamp >= oneHourAgo);
      const todayEntries = this.entries.filter((e) => e.timestamp >= todayStart);

      // Today by category
      const todayByCategory = this.initializeCategoryRecord();
      for (const entry of todayEntries) {
        todayByCategory[entry.category]++;
      }

      // Accessibility pass rate
      const accessibilityEntries = this.entries.filter(
        (e) => e.category === 'accessibility'
      );
      const passedCount = accessibilityEntries.filter(
        (e) => (e.data as { passes?: boolean })?.passes === true
      ).length;
      const accessibilityPassRate =
        accessibilityEntries.length > 0
          ? passedCount / accessibilityEntries.length
          : 1;

      // Top issue components
      const componentIssues: Record<string, number> = {};
      const issueEntries = this.entries.filter(
        (e) => e.severity === 'error' || e.severity === 'warning'
      );
      for (const entry of issueEntries) {
        const component =
          (entry.data as { component?: string })?.component ?? 'unknown';
        componentIssues[component] = (componentIssues[component] ?? 0) + 1;
      }
      const topIssueComponents = Object.entries(componentIssues)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const stats: AuditStats = {
        lastHour: {
          total: lastHourEntries.length,
          errors: lastHourEntries.filter((e) => e.severity === 'error').length,
          warnings: lastHourEntries.filter((e) => e.severity === 'warning').length,
        },
        today: {
          total: todayEntries.length,
          byCategory: todayByCategory,
        },
        accessibilityPassRate,
        topIssueComponents,
      };

      return success(stats);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to get stats')
      );
    }
  }

  async export(
    filter: AuditFilter,
    format: 'json' | 'csv' | 'html'
  ): Promise<Result<string, Error>> {
    const queryResult = await this.query(filter);
    if (!queryResult.success) {
      return failure(queryResult.error);
    }

    const entries = queryResult.value;

    switch (format) {
      case 'json':
        return success(JSON.stringify(entries, null, 2));

      case 'csv': {
        if (entries.length === 0) {
          return success('id,timestamp,category,severity,message,correlationId\n');
        }
        const headers = ['id', 'timestamp', 'category', 'severity', 'message', 'correlationId'];
        const rows = entries.map((e) => [
          e.id,
          e.timestamp.toISOString(),
          e.category,
          e.severity,
          e.message.replace(/"/g, '""'),
          e.correlationId ?? '',
        ]);
        const csv = [
          headers.join(','),
          ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
        ].join('\n');
        return success(csv);
      }

      case 'html': {
        const rows = entries
          .map(
            (e) => `
          <tr>
            <td>${e.timestamp.toISOString()}</td>
            <td>${e.category}</td>
            <td class="severity-${e.severity}">${e.severity}</td>
            <td>${e.message}</td>
          </tr>`
          )
          .join('');

        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Audit Report</title>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .severity-info { color: #2196F3; }
    .severity-warning { color: #FF9800; }
    .severity-error { color: #F44336; }
    .severity-critical { color: #9C27B0; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Audit Report</h1>
  <p>Total entries: ${entries.length}</p>
  <table>
    <thead>
      <tr><th>Timestamp</th><th>Category</th><th>Severity</th><th>Message</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
        return success(html);
      }

      default:
        return failure(new Error(`Unsupported format: ${format}`));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAINTENANCE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  async purge(olderThan: Date): Promise<Result<number, Error>> {
    try {
      const initialCount = this.entries.length;
      this.entries = this.entries.filter((e) => e.timestamp >= olderThan);
      const purgedCount = initialCount - this.entries.length;
      return success(purgedCount);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to purge entries')
      );
    }
  }

  async archive(olderThan: Date): Promise<Result<number, Error>> {
    try {
      const toArchive = this.entries.filter((e) => e.timestamp < olderThan);
      this.archivedEntries.push(...toArchive);
      this.entries = this.entries.filter((e) => e.timestamp >= olderThan);
      return success(toArchive.length);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Failed to archive entries')
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADDITIONAL PUBLIC METHODS (not in port, for testing)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clears all entries. For testing purposes.
   */
  async clear(): Promise<Result<void, Error>> {
    this.entries = [];
    this.archivedEntries = [];
    this.entryCounter = 0;
    return success(undefined);
  }

  /**
   * Gets archived entries. For testing purposes.
   */
  getArchivedEntries(): readonly AuditEntry[] {
    return this.archivedEntries;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private generateId(): string {
    this.entryCounter++;
    return `audit-${Date.now()}-${this.entryCounter}`;
  }

  private addEntry(entry: AuditEntry): void {
    // Console logging if enabled
    if (this.options.consoleLogging) {
      this.logToConsole(entry);
    }

    // Callback
    this.options.onEntry(entry);

    // Add to entries
    this.entries.push(entry);

    // Enforce max entries limit
    if (this.entries.length > this.options.maxEntries) {
      this.entries = this.entries.slice(-this.options.maxEntries);
    }
  }

  private logToConsole(entry: AuditEntry): void {
    const severityLevels: Record<AuditSeverity, number> = {
      info: 0,
      warning: 1,
      error: 2,
      critical: 3,
    };

    const configLevel = severityLevels[this.options.logLevel];
    const entryLevel = severityLevels[entry.severity];

    if (entryLevel < configLevel) return;

    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.category}] [${entry.severity.toUpperCase()}]`;

    switch (entry.severity) {
      case 'critical':
      case 'error':
        console.error(`${prefix} ${entry.message}`, entry.data);
        break;
      case 'warning':
        console.warn(`${prefix} ${entry.message}`, entry.data);
        break;
      default:
        console.log(`${prefix} ${entry.message}`, entry.data);
    }
  }

  private initializeCategoryRecord(): Record<AuditCategory, number> {
    return {
      'color-decision': 0,
      accessibility: 0,
      'token-generation': 0,
      'token-modification': 0,
      'theme-change': 0,
      export: 0,
      import: 0,
      validation: 0,
      performance: 0,
    };
  }

  private initializeSeverityRecord(): Record<AuditSeverity, number> {
    return {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
  }

  private generateRecommendations(entries: AuditEntry[]): string[] {
    const recommendations: string[] = [];

    // Check for critical issues
    const criticalCount = entries.filter((e) => e.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical issues immediately`);
    }

    // Check accessibility
    const accessibilityFails = entries.filter(
      (e) =>
        e.category === 'accessibility' &&
        (e.data as { passes?: boolean })?.passes === false
    ).length;
    if (accessibilityFails > 5) {
      recommendations.push(
        'Review color contrast ratios for accessibility compliance'
      );
    }

    // Check color consistency
    const colorDecisions = entries.filter((e) => e.category === 'color-decision');
    if (colorDecisions.length > 100) {
      recommendations.push(
        'Consider consolidating color tokens to reduce complexity'
      );
    }

    // Check performance
    const slowOps = entries.filter(
      (e) => e.category === 'performance' && e.severity === 'warning'
    ).length;
    if (slowOps > 10) {
      recommendations.push('Optimize slow operations to improve performance');
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate actions required');
    }

    return recommendations;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default InMemoryAuditAdapter;
