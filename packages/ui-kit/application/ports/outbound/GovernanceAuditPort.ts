/**
 * @fileoverview GovernanceAuditPort - Outbound Port
 *
 * Defines the outbound port (driven port) for governance auditing.
 * This is the contract that the governance system uses to log
 * decisions for traceability and compliance reporting.
 *
 * @module ui-kit/application/ports/outbound/GovernanceAuditPort
 * @version 1.0.0
 */

import type {
  AggregatedEvaluationResult,
  PolicyViolationDetail,
} from '../../../domain/governance';

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * GovernanceAuditPort - Outbound port for audit logging.
 *
 * Implementations:
 * - ConsoleAuditAdapter: Logs to console (development)
 * - FileAuditAdapter: Logs to file system
 * - APIAuditAdapter: Sends to remote audit service
 * - NoOpAuditAdapter: Disables auditing
 */
export interface GovernanceAuditPort {
  /**
   * Logs a governance decision.
   * Returns an audit ID for traceability.
   */
  logGovernanceDecision(decision: GovernanceDecision): Promise<string>;

  /**
   * Logs a policy violation.
   */
  logViolation(violation: PolicyViolationDetail, context: AuditContext): Promise<void>;

  /**
   * Logs an auto-fix attempt.
   */
  logAutoFix(fix: AutoFixAttempt): Promise<void>;

  /**
   * Retrieves audit history.
   */
  getAuditHistory(filter: AuditFilter): Promise<AuditEntry[]>;

  /**
   * Generates an audit report.
   */
  generateAuditReport(options: AuditReportOptions): Promise<AuditReport>;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * A governance decision record.
 */
export interface GovernanceDecision {
  readonly subject: {
    readonly type: string;
    readonly [key: string]: unknown;
  };
  readonly evaluation: AggregatedEvaluationResult;
  readonly summary: {
    readonly status: 'pass' | 'fail' | 'warning';
    readonly headline: string;
    readonly details: string[];
    readonly recommendations: string[];
  };
  readonly fixes?: {
    readonly attempted: number;
    readonly successful: number;
    readonly failed: number;
    readonly details: Array<{
      readonly violation: PolicyViolationDetail;
      readonly fixed: boolean;
      readonly fixDescription?: string;
    }>;
  };
  readonly timestamp: Date;
}

/**
 * Context for audit logging.
 */
export interface AuditContext {
  readonly sessionId?: string;
  readonly userId?: string;
  readonly applicationId?: string;
  readonly componentPath?: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Auto-fix attempt record.
 */
export interface AutoFixAttempt {
  readonly violation: PolicyViolationDetail;
  readonly attempted: boolean;
  readonly successful: boolean;
  readonly fixDescription?: string;
  readonly beforeValue?: unknown;
  readonly afterValue?: unknown;
  readonly timestamp: Date;
}

/**
 * Filter for retrieving audit history.
 */
export interface AuditFilter {
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly status?: 'pass' | 'fail' | 'warning';
  readonly policyId?: string;
  readonly severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * An audit entry.
 */
export interface AuditEntry {
  readonly id: string;
  readonly type: 'decision' | 'violation' | 'autofix';
  readonly timestamp: Date;
  readonly data: GovernanceDecision | PolicyViolationDetail | AutoFixAttempt;
  readonly context?: AuditContext;
}

/**
 * Options for generating audit reports.
 */
export interface AuditReportOptions {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly groupBy?: 'policy' | 'severity' | 'day' | 'week';
  readonly format?: 'json' | 'csv' | 'markdown';
  readonly includeDetails?: boolean;
}

/**
 * An audit report.
 */
export interface AuditReport {
  readonly generatedAt: Date;
  readonly period: {
    readonly start: Date;
    readonly end: Date;
  };
  readonly summary: {
    readonly totalDecisions: number;
    readonly compliantDecisions: number;
    readonly nonCompliantDecisions: number;
    readonly complianceRate: number;
    readonly totalViolations: number;
    readonly autoFixAttempts: number;
    readonly autoFixSuccesses: number;
  };
  readonly breakdowns: {
    readonly byPolicy: Record<string, { pass: number; fail: number }>;
    readonly bySeverity: Record<string, number>;
    readonly byDate?: Record<string, number>;
  };
  readonly content: string;
}

// ============================================================================
// NO-OP IMPLEMENTATION
// ============================================================================

/**
 * No-op audit adapter for when auditing is disabled.
 */
export class NoOpAuditAdapter implements GovernanceAuditPort {
  async logGovernanceDecision(): Promise<string> {
    return `audit-${Date.now()}`;
  }

  async logViolation(): Promise<void> {
    // No-op
  }

  async logAutoFix(): Promise<void> {
    // No-op
  }

  async getAuditHistory(): Promise<AuditEntry[]> {
    return [];
  }

  async generateAuditReport(options: AuditReportOptions): Promise<AuditReport> {
    return {
      generatedAt: new Date(),
      period: { start: options.startDate, end: options.endDate },
      summary: {
        totalDecisions: 0,
        compliantDecisions: 0,
        nonCompliantDecisions: 0,
        complianceRate: 100,
        totalViolations: 0,
        autoFixAttempts: 0,
        autoFixSuccesses: 0,
      },
      breakdowns: {
        byPolicy: {},
        bySeverity: {},
      },
      content: 'No audit data available',
    };
  }
}

/**
 * Console audit adapter for development.
 */
export class ConsoleAuditAdapter implements GovernanceAuditPort {
  private entries: AuditEntry[] = [];

  async logGovernanceDecision(decision: GovernanceDecision): Promise<string> {
    const id = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.group(`[Governance Audit] ${decision.summary.status.toUpperCase()}`);
    console.log('ID:', id);
    console.log('Subject:', decision.subject.type);
    console.log('Score:', decision.evaluation.overallScore.toFixed(1) + '%');
    console.log('Violations:', decision.evaluation.allViolations.length);
    console.log('Headline:', decision.summary.headline);
    console.groupEnd();

    this.entries.push({
      id,
      type: 'decision',
      timestamp: decision.timestamp,
      data: decision,
    });

    return id;
  }

  async logViolation(violation: PolicyViolationDetail, context: AuditContext): Promise<void> {
    console.warn(
      `[Governance Violation] [${violation.severity}] ${violation.policyName}: ${violation.message}`
    );

    this.entries.push({
      id: `violation-${Date.now()}`,
      type: 'violation',
      timestamp: context.timestamp,
      data: violation,
      context,
    });
  }

  async logAutoFix(fix: AutoFixAttempt): Promise<void> {
    console.info(
      `[Governance AutoFix] ${fix.successful ? '✓' : '✗'} ${fix.fixDescription || 'No description'}`
    );

    this.entries.push({
      id: `fix-${Date.now()}`,
      type: 'autofix',
      timestamp: fix.timestamp,
      data: fix,
    });
  }

  async getAuditHistory(filter: AuditFilter): Promise<AuditEntry[]> {
    let filtered = [...this.entries];

    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate!);
    }
    if (filter.limit) {
      filtered = filtered.slice(filter.offset || 0, (filter.offset || 0) + filter.limit);
    }

    return filtered;
  }

  async generateAuditReport(options: AuditReportOptions): Promise<AuditReport> {
    const decisions = this.entries.filter(e => e.type === 'decision') as Array<
      AuditEntry & { data: GovernanceDecision }
    >;

    const compliant = decisions.filter(d => d.data.evaluation.overallPassed).length;
    const totalViolations = decisions.reduce(
      (sum, d) => sum + d.data.evaluation.allViolations.length,
      0
    );

    return {
      generatedAt: new Date(),
      period: { start: options.startDate, end: options.endDate },
      summary: {
        totalDecisions: decisions.length,
        compliantDecisions: compliant,
        nonCompliantDecisions: decisions.length - compliant,
        complianceRate: decisions.length > 0 ? (compliant / decisions.length) * 100 : 100,
        totalViolations,
        autoFixAttempts: this.entries.filter(e => e.type === 'autofix').length,
        autoFixSuccesses: this.entries.filter(
          e => e.type === 'autofix' && (e.data as AutoFixAttempt).successful
        ).length,
      },
      breakdowns: {
        byPolicy: {},
        bySeverity: {},
      },
      content: `Audit report for ${decisions.length} governance decisions`,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const noOpAuditAdapter = new NoOpAuditAdapter();
export const consoleAuditAdapter = new ConsoleAuditAdapter();

export type { GovernanceAuditPort as default };
