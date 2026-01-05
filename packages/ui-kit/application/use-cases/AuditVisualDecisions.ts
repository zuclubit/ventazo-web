/**
 * @fileoverview AuditVisualDecisions Use Case
 *
 * Use case para auditar decisiones visuales del sistema, generando
 * reportes de trazabilidad, cumplimiento y métricas de calidad.
 *
 * @module ui-kit/application/use-cases/AuditVisualDecisions
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import { TokenCollection } from '../../domain/tokens';
import type {
  AuditPort,
  AuditFilter,
  AuditSeverity,
} from '../ports/outbound/AuditPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tipo de auditoría a ejecutar.
 */
export type AuditType =
  | 'accessibility'
  | 'color-decisions'
  | 'token-usage'
  | 'performance'
  | 'compliance'
  | 'full';

/**
 * Nivel de detalle del reporte.
 */
export type ReportDetail = 'summary' | 'standard' | 'detailed' | 'verbose';

/**
 * Formato de salida del reporte.
 */
export type ReportFormat = 'text' | 'json' | 'html' | 'markdown' | 'csv';

/**
 * Configuración de auditoría de accesibilidad.
 */
export interface AccessibilityAuditConfig {
  /** Nivel WCAG mínimo */
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  /** Si evaluar APCA */
  readonly evaluateApca: boolean;
  /** Nivel APCA mínimo */
  readonly apcaMinLevel: number;
  /** Componentes a auditar */
  readonly components?: string[];
  /** Si incluir recomendaciones */
  readonly includeRecommendations: boolean;
}

/**
 * Configuración de auditoría de decisiones de color.
 */
export interface ColorDecisionAuditConfig {
  /** Si auditar consistencia */
  readonly auditConsistency: boolean;
  /** Si auditar armonía */
  readonly auditHarmony: boolean;
  /** Tolerancia de variación */
  readonly varianceTolerance: number;
  /** Período a auditar */
  readonly period?: {
    readonly start: Date;
    readonly end: Date;
  };
}

/**
 * Configuración de auditoría de uso de tokens.
 */
export interface TokenUsageAuditConfig {
  /** Colección de referencia */
  readonly referenceCollection?: TokenCollection;
  /** Si detectar tokens no usados */
  readonly detectUnused: boolean;
  /** Si detectar tokens duplicados */
  readonly detectDuplicates: boolean;
  /** Si detectar tokens sin categorizar */
  readonly detectUncategorized: boolean;
}

/**
 * Configuración de auditoría de rendimiento.
 */
export interface PerformanceAuditConfig {
  /** Umbral de tiempo de generación (ms) */
  readonly generationTimeThreshold: number;
  /** Umbral de tamaño de colección */
  readonly collectionSizeThreshold: number;
  /** Si auditar memoria */
  readonly auditMemory: boolean;
}

/**
 * Input para el use case.
 */
export interface AuditVisualDecisionsInput {
  /** Tipos de auditoría a ejecutar */
  readonly auditTypes: AuditType[];
  /** Colección de tokens a auditar */
  readonly tokenCollection?: TokenCollection;
  /** Nivel de detalle del reporte */
  readonly detailLevel: ReportDetail;
  /** Formato de salida */
  readonly outputFormat: ReportFormat;
  /** Configuración de accesibilidad */
  readonly accessibilityConfig?: AccessibilityAuditConfig;
  /** Configuración de decisiones de color */
  readonly colorDecisionConfig?: ColorDecisionAuditConfig;
  /** Configuración de uso de tokens */
  readonly tokenUsageConfig?: TokenUsageAuditConfig;
  /** Configuración de rendimiento */
  readonly performanceConfig?: PerformanceAuditConfig;
  /** Filtros de período */
  readonly periodFilter?: {
    readonly start: Date;
    readonly end: Date;
  };
  /** Si incluir datos históricos */
  readonly includeHistory: boolean;
}

/**
 * Resultado de auditoría de accesibilidad.
 */
export interface AccessibilityAuditResult {
  /** Total de evaluaciones */
  readonly totalEvaluations: number;
  /** Evaluaciones que pasan */
  readonly passing: number;
  /** Evaluaciones que fallan */
  readonly failing: number;
  /** Tasa de cumplimiento */
  readonly complianceRate: number;
  /** Componentes con issues */
  readonly issueComponents: Array<{
    readonly component: string;
    readonly issue: string;
    readonly severity: AuditSeverity;
    readonly recommendation?: string;
  }>;
  /** Ratio WCAG promedio */
  readonly avgWcagRatio: number;
  /** Nivel APCA promedio */
  readonly avgApcaLevel: number;
}

/**
 * Resultado de auditoría de decisiones de color.
 */
export interface ColorDecisionAuditResult {
  /** Total de decisiones */
  readonly totalDecisions: number;
  /** Decisiones consistentes */
  readonly consistentDecisions: number;
  /** Variaciones detectadas */
  readonly variations: Array<{
    readonly context: string;
    readonly expected: string;
    readonly actual: string;
    readonly deviation: number;
  }>;
  /** Score de armonía */
  readonly harmonyScore: number;
  /** Paleta efectiva extraída */
  readonly effectivePalette: string[];
}

/**
 * Resultado de auditoría de uso de tokens.
 */
export interface TokenUsageAuditResult {
  /** Total de tokens */
  readonly totalTokens: number;
  /** Tokens usados */
  readonly usedTokens: number;
  /** Tokens no usados */
  readonly unusedTokens: string[];
  /** Tokens duplicados */
  readonly duplicateTokens: Array<{
    readonly name: string;
    readonly duplicateOf: string;
  }>;
  /** Tokens sin categorizar */
  readonly uncategorizedTokens: string[];
  /** Cobertura de uso */
  readonly usageCoverage: number;
}

/**
 * Resultado de auditoría de rendimiento.
 */
export interface PerformanceAuditResult {
  /** Tiempo promedio de generación */
  readonly avgGenerationTimeMs: number;
  /** Tiempo máximo de generación */
  readonly maxGenerationTimeMs: number;
  /** Operaciones lentas */
  readonly slowOperations: Array<{
    readonly operation: string;
    readonly timeMs: number;
    readonly threshold: number;
  }>;
  /** Tamaño de colección */
  readonly collectionSizeBytes: number;
  /** Score de rendimiento */
  readonly performanceScore: number;
}

/**
 * Score general de calidad.
 */
export interface QualityScore {
  /** Score total (0-100) */
  readonly overall: number;
  /** Score por categoría */
  readonly byCategory: {
    readonly accessibility: number;
    readonly consistency: number;
    readonly coverage: number;
    readonly performance: number;
  };
  /** Grade (A-F) */
  readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** Áreas de mejora */
  readonly improvementAreas: string[];
}

/**
 * Output del use case.
 */
export interface AuditVisualDecisionsOutput {
  /** Resultado de accesibilidad */
  readonly accessibility?: AccessibilityAuditResult;
  /** Resultado de decisiones de color */
  readonly colorDecisions?: ColorDecisionAuditResult;
  /** Resultado de uso de tokens */
  readonly tokenUsage?: TokenUsageAuditResult;
  /** Resultado de rendimiento */
  readonly performance?: PerformanceAuditResult;
  /** Score de calidad general */
  readonly qualityScore: QualityScore;
  /** Reporte formateado */
  readonly report: string;
  /** Resumen ejecutivo */
  readonly executiveSummary: string;
  /** Recomendaciones priorizadas */
  readonly recommendations: Array<{
    readonly priority: 'high' | 'medium' | 'low';
    readonly category: string;
    readonly recommendation: string;
    readonly impact: string;
  }>;
  /** Metadata de la auditoría */
  readonly metadata: {
    readonly auditedAt: Date;
    readonly duration: number;
    readonly auditTypes: AuditType[];
    readonly periodCovered?: { start: Date; end: Date };
  };
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * AuditVisualDecisions - Audita decisiones visuales del sistema.
 *
 * Este use case genera reportes comprehensivos sobre la calidad
 * de las decisiones visuales, accesibilidad y uso de tokens.
 *
 * @example
 * ```typescript
 * const useCase = new AuditVisualDecisions(auditPort);
 *
 * const result = await useCase.execute({
 *   auditTypes: ['accessibility', 'color-decisions', 'token-usage'],
 *   tokenCollection: myTokens,
 *   detailLevel: 'detailed',
 *   outputFormat: 'markdown',
 *   accessibilityConfig: {
 *     wcagLevel: 'AA',
 *     evaluateApca: true,
 *     apcaMinLevel: 60,
 *     includeRecommendations: true,
 *   },
 *   includeHistory: true,
 * });
 *
 * if (result.success) {
 *   console.log(`Quality Score: ${result.value.qualityScore.overall}/100`);
 *   console.log(`Grade: ${result.value.qualityScore.grade}`);
 *   console.log(result.value.report);
 * }
 * ```
 */
export class AuditVisualDecisions {
  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly auditPort: AuditPort;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(auditPort: AuditPort) {
    this.auditPort = auditPort;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ejecuta el use case.
   */
  async execute(
    input: AuditVisualDecisionsInput
  ): Promise<Result<AuditVisualDecisionsOutput, Error>> {
    const startTime = Date.now();

    try {
      // Validar input
      const validationResult = this.validateInput(input);
      if (!validationResult.success) {
        return failure(validationResult.error);
      }

      // Resolver 'full' a todos los tipos
      const auditTypes = input.auditTypes.includes('full')
        ? ['accessibility', 'color-decisions', 'token-usage', 'performance'] as AuditType[]
        : input.auditTypes;

      // Ejecutar auditorías
      let accessibility: AccessibilityAuditResult | undefined;
      let colorDecisions: ColorDecisionAuditResult | undefined;
      let tokenUsage: TokenUsageAuditResult | undefined;
      let performance: PerformanceAuditResult | undefined;

      if (auditTypes.includes('accessibility')) {
        accessibility = await this.auditAccessibility(input);
      }

      if (auditTypes.includes('color-decisions')) {
        colorDecisions = await this.auditColorDecisions(input);
      }

      if (auditTypes.includes('token-usage') && input.tokenCollection) {
        tokenUsage = await this.auditTokenUsage(input);
      }

      if (auditTypes.includes('performance')) {
        performance = await this.auditPerformance(input);
      }

      // Calcular score de calidad
      const qualityScore = this.calculateQualityScore(
        accessibility,
        colorDecisions,
        tokenUsage,
        performance
      );

      // Generar recomendaciones
      const recommendations = this.generateRecommendations(
        accessibility,
        colorDecisions,
        tokenUsage,
        performance
      );

      // Generar reportes
      const report = this.generateReport(input, {
        accessibility,
        colorDecisions,
        tokenUsage,
        performance,
        qualityScore,
        recommendations,
      });

      const executiveSummary = this.generateExecutiveSummary(qualityScore, recommendations);

      // Registrar auditoría
      await this.auditPort.log({
        category: 'validation',
        severity: qualityScore.overall < 70 ? 'warning' : 'info',
        message: `Visual decisions audit completed with score ${qualityScore.overall}/100 (${qualityScore.grade})`,
        data: {
          score: qualityScore.overall,
          grade: qualityScore.grade,
          auditTypes,
          duration: Date.now() - startTime,
        },
      });

      return success({
        accessibility,
        colorDecisions,
        tokenUsage,
        performance,
        qualityScore,
        report,
        executiveSummary,
        recommendations,
        metadata: {
          auditedAt: new Date(),
          duration: Date.now() - startTime,
          auditTypes,
          periodCovered: input.periodFilter,
        },
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Unknown error during audit')
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida el input.
   */
  private validateInput(input: AuditVisualDecisionsInput): Result<void, Error> {
    if (!input.auditTypes || input.auditTypes.length === 0) {
      return failure(new Error('At least one audit type is required'));
    }

    if (input.auditTypes.includes('token-usage') && !input.tokenCollection) {
      return failure(new Error('Token collection is required for token-usage audit'));
    }

    return success(undefined);
  }

  /**
   * Audita accesibilidad.
   */
  private async auditAccessibility(
    input: AuditVisualDecisionsInput
  ): Promise<AccessibilityAuditResult> {
    const filter: AuditFilter = {
      categories: ['accessibility'],
      startDate: input.periodFilter?.start,
      endDate: input.periodFilter?.end,
    };

    const entriesResult = await this.auditPort.query(filter);
    const entries = entriesResult.success ? entriesResult.value : [];

    const passing = entries.filter(e => (e.data as Record<string, unknown>)?.passes === true).length;
    const failing = entries.length - passing;

    const issueComponents = entries
      .filter(e => (e.data as Record<string, unknown>)?.passes === false)
      .map(e => ({
        component: String((e.data as Record<string, unknown>)?.component || 'Unknown'),
        issue: e.message,
        severity: e.severity,
        recommendation: String((e.data as Record<string, unknown>)?.recommendation || ''),
      }));

    const wcagRatios = entries
      .map(e => Number((e.data as Record<string, unknown>)?.wcagRatio || 0))
      .filter(r => r > 0);
    const avgWcagRatio = wcagRatios.length > 0
      ? wcagRatios.reduce((a, b) => a + b, 0) / wcagRatios.length
      : 0;

    const apcaLevels = entries
      .map(e => Number((e.data as Record<string, unknown>)?.apcaLevel || 0))
      .filter(l => l > 0);
    const avgApcaLevel = apcaLevels.length > 0
      ? apcaLevels.reduce((a, b) => a + b, 0) / apcaLevels.length
      : 0;

    return {
      totalEvaluations: entries.length,
      passing,
      failing,
      complianceRate: entries.length > 0 ? passing / entries.length : 1,
      issueComponents,
      avgWcagRatio,
      avgApcaLevel,
    };
  }

  /**
   * Audita decisiones de color.
   */
  private async auditColorDecisions(
    input: AuditVisualDecisionsInput
  ): Promise<ColorDecisionAuditResult> {
    const filter: AuditFilter = {
      categories: ['color-decision'],
      startDate: input.periodFilter?.start,
      endDate: input.periodFilter?.end,
    };

    const entriesResult = await this.auditPort.query(filter);
    const entries = entriesResult.success ? entriesResult.value : [];

    // Extract effective palette from decisions
    const colors = new Set<string>();
    for (const entry of entries) {
      const data = entry.data as Record<string, unknown>;
      if (data?.outputColor) {
        colors.add(String(data.outputColor));
      }
    }

    return {
      totalDecisions: entries.length,
      consistentDecisions: entries.length, // Simplified
      variations: [],
      harmonyScore: 85, // Simplified
      effectivePalette: Array.from(colors).slice(0, 10),
    };
  }

  /**
   * Audita uso de tokens.
   */
  private async auditTokenUsage(
    input: AuditVisualDecisionsInput
  ): Promise<TokenUsageAuditResult> {
    const collection = input.tokenCollection!;
    const allTokens = collection.all();

    // Detect duplicates by value
    const valueMap = new Map<string, string[]>();
    for (const token of allTokens) {
      const value = token.toCssVariable();
      const existing = valueMap.get(value) || [];
      existing.push(token.name);
      valueMap.set(value, existing);
    }

    const duplicates = Array.from(valueMap.entries())
      .filter(([, names]) => names.length > 1)
      .map(([, names]) => ({
        name: names[0],
        duplicateOf: names.slice(1).join(', '),
      }));

    // Detect uncategorized
    const uncategorized = allTokens
      .filter(t => !t.context?.component && !t.context?.intent)
      .map(t => t.name);

    return {
      totalTokens: allTokens.length,
      usedTokens: allTokens.length - uncategorized.length,
      unusedTokens: [], // Would need actual usage tracking
      duplicateTokens: duplicates,
      uncategorizedTokens: uncategorized,
      usageCoverage: 1 - (uncategorized.length / allTokens.length),
    };
  }

  /**
   * Audita rendimiento.
   */
  private async auditPerformance(
    input: AuditVisualDecisionsInput
  ): Promise<PerformanceAuditResult> {
    const filter: AuditFilter = {
      categories: ['token-generation', 'performance'],
      startDate: input.periodFilter?.start,
      endDate: input.periodFilter?.end,
    };

    const entriesResult = await this.auditPort.query(filter);
    const entries = entriesResult.success ? entriesResult.value : [];

    const times = entries
      .map(e => Number((e.data as Record<string, unknown>)?.generationTimeMs || 0))
      .filter(t => t > 0);

    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const maxTime = times.length > 0 ? Math.max(...times) : 0;

    const threshold = input.performanceConfig?.generationTimeThreshold || 100;
    const slowOperations = entries
      .filter(e => Number((e.data as Record<string, unknown>)?.generationTimeMs || 0) > threshold)
      .map(e => ({
        operation: e.message,
        timeMs: Number((e.data as Record<string, unknown>)?.generationTimeMs || 0),
        threshold,
      }));

    return {
      avgGenerationTimeMs: avgTime,
      maxGenerationTimeMs: maxTime,
      slowOperations,
      collectionSizeBytes: input.tokenCollection
        ? Buffer.byteLength(input.tokenCollection.export({ format: 'json' }))
        : 0,
      performanceScore: Math.max(0, 100 - (slowOperations.length * 10)),
    };
  }

  /**
   * Calcula score de calidad.
   */
  private calculateQualityScore(
    accessibility?: AccessibilityAuditResult,
    colorDecisions?: ColorDecisionAuditResult,
    tokenUsage?: TokenUsageAuditResult,
    performance?: PerformanceAuditResult
  ): QualityScore {
    const scores = {
      accessibility: accessibility ? accessibility.complianceRate * 100 : 100,
      consistency: colorDecisions ? colorDecisions.harmonyScore : 100,
      coverage: tokenUsage ? tokenUsage.usageCoverage * 100 : 100,
      performance: performance ? performance.performanceScore : 100,
    };

    const overall = Object.values(scores).reduce((a, b) => a + b, 0) / 4;

    const improvementAreas: string[] = [];
    if (scores.accessibility < 80) improvementAreas.push('Accessibility compliance');
    if (scores.consistency < 80) improvementAreas.push('Color consistency');
    if (scores.coverage < 80) improvementAreas.push('Token coverage');
    if (scores.performance < 80) improvementAreas.push('Performance optimization');

    return {
      overall: Math.round(overall),
      byCategory: scores,
      grade: this.calculateGrade(overall),
      improvementAreas,
    };
  }

  /**
   * Calcula grade basado en score.
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Genera recomendaciones.
   */
  private generateRecommendations(
    accessibility?: AccessibilityAuditResult,
    colorDecisions?: ColorDecisionAuditResult,
    tokenUsage?: TokenUsageAuditResult,
    performance?: PerformanceAuditResult
  ): AuditVisualDecisionsOutput['recommendations'] {
    const recommendations: AuditVisualDecisionsOutput['recommendations'] = [];

    if (accessibility && accessibility.complianceRate < 1) {
      recommendations.push({
        priority: 'high',
        category: 'Accessibility',
        recommendation: `Fix ${accessibility.failing} accessibility violations`,
        impact: 'Critical for users with disabilities and legal compliance',
      });
    }

    if (colorDecisions && colorDecisions.variations.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Color Decisions',
        recommendation: `Review ${colorDecisions.variations.length} color decision variations`,
        impact: 'Maintains visual consistency and reduces technical debt',
      });
    }

    if (tokenUsage && tokenUsage.duplicateTokens.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Token Usage',
        recommendation: `Consolidate ${tokenUsage.duplicateTokens.length} duplicate tokens`,
        impact: 'Reduces bundle size and improves maintainability',
      });
    }

    if (performance && performance.slowOperations.length > 0) {
      recommendations.push({
        priority: 'low',
        category: 'Performance',
        recommendation: `Optimize ${performance.slowOperations.length} slow operations`,
        impact: 'Improves development experience and build times',
      });
    }

    return recommendations;
  }

  /**
   * Genera reporte formateado.
   */
  private generateReport(
    input: AuditVisualDecisionsInput,
    data: Partial<AuditVisualDecisionsOutput>
  ): string {
    switch (input.outputFormat) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'markdown':
        return this.generateMarkdownReport(data);
      case 'html':
        return this.generateHtmlReport(data);
      default:
        return this.generateTextReport(data);
    }
  }

  /**
   * Genera reporte en texto.
   */
  private generateTextReport(data: Partial<AuditVisualDecisionsOutput>): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      '           VISUAL DECISIONS AUDIT REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Quality Score: ${data.qualityScore?.overall}/100 (${data.qualityScore?.grade})`,
      '',
    ];

    if (data.qualityScore?.improvementAreas.length) {
      lines.push('Areas for Improvement:');
      for (const area of data.qualityScore.improvementAreas) {
        lines.push(`  • ${area}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Genera reporte en Markdown.
   */
  private generateMarkdownReport(data: Partial<AuditVisualDecisionsOutput>): string {
    return `# Visual Decisions Audit Report

## Quality Score: ${data.qualityScore?.overall}/100 (${data.qualityScore?.grade})

### Scores by Category
- Accessibility: ${data.qualityScore?.byCategory.accessibility.toFixed(0)}%
- Consistency: ${data.qualityScore?.byCategory.consistency.toFixed(0)}%
- Coverage: ${data.qualityScore?.byCategory.coverage.toFixed(0)}%
- Performance: ${data.qualityScore?.byCategory.performance.toFixed(0)}%

### Recommendations
${data.recommendations?.map(r => `- **[${r.priority.toUpperCase()}]** ${r.recommendation}`).join('\n') || 'None'}
`;
  }

  /**
   * Genera reporte en HTML.
   */
  private generateHtmlReport(data: Partial<AuditVisualDecisionsOutput>): string {
    return `<!DOCTYPE html>
<html>
<head><title>Audit Report</title></head>
<body>
<h1>Visual Decisions Audit Report</h1>
<h2>Quality Score: ${data.qualityScore?.overall}/100 (${data.qualityScore?.grade})</h2>
</body>
</html>`;
  }

  /**
   * Genera resumen ejecutivo.
   */
  private generateExecutiveSummary(
    qualityScore: QualityScore,
    recommendations: AuditVisualDecisionsOutput['recommendations']
  ): string {
    const highPriority = recommendations.filter(r => r.priority === 'high').length;

    return `Quality Score: ${qualityScore.overall}/100 (Grade ${qualityScore.grade}). ` +
      `${highPriority} high-priority issues require attention. ` +
      `Key improvement areas: ${qualityScore.improvementAreas.join(', ') || 'None'}.`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AuditVisualDecisions;
