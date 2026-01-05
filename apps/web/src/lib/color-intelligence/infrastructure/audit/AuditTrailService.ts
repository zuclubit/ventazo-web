// ============================================
// Audit Trail Service
// Phase 5: Regulatory & Compliance Layer
// ============================================

import type {
  AuditEntry,
  AuditEntryType,
  AuditSeverity,
  AuditMetadata,
  AuditQuery,
  AuditReport,
  AuditCategory,
  ComplianceFramework,
  ComplianceStatus,
  RetentionPolicy,
} from '../../domain/specification/types';

import {
  type AuditEntryId,
  createAuditEntryId,
} from '../../domain/specification/types';

// ============================================
// Audit Storage Port (Interface for adapters)
// ============================================

export interface IAuditStoragePort {
  write(entry: AuditEntry): Promise<void>;
  query(query: AuditQuery): Promise<ReadonlyArray<AuditEntry>>;
  count(query: Omit<AuditQuery, 'pagination'>): Promise<number>;
  getById(id: AuditEntryId): Promise<AuditEntry | null>;
  purge(retentionPolicy: RetentionPolicy): Promise<number>;
}

// ============================================
// Audit Trail Service Configuration
// ============================================

export interface AuditTrailConfig {
  readonly enabled: boolean;
  readonly storageAdapter: IAuditStoragePort;
  readonly retentionPolicy: RetentionPolicy;
  readonly complianceFrameworks: ReadonlyArray<ComplianceFramework>;
  readonly includeMetadata: boolean;
  readonly hashAlgorithm: 'sha256' | 'sha384' | 'sha512';
  readonly signEntries: boolean;
  readonly encryptPII: boolean;
}

const DEFAULT_CONFIG: Omit<AuditTrailConfig, 'storageAdapter'> = {
  enabled: true,
  retentionPolicy: {
    minRetentionDays: 365,
    maxRetentionDays: 2555, // 7 years
    autoArchive: true,
    archiveAfterDays: 90,
  },
  complianceFrameworks: ['wcag', 'section508', 'en301549'],
  includeMetadata: true,
  hashAlgorithm: 'sha256',
  signEntries: false,
  encryptPII: true,
};

// ============================================
// Audit Trail Service Implementation
// ============================================

export class AuditTrailService {
  private readonly config: AuditTrailConfig;
  private readonly entryBuffer: AuditEntry[] = [];
  private readonly bufferFlushInterval: number = 5000; // 5 seconds
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<AuditTrailConfig> & { storageAdapter: IAuditStoragePort }) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.enabled) {
      this.startBufferFlush();
    }
  }

  // ============================================
  // Core Audit Methods
  // ============================================

  /**
   * Log a decision event
   */
  async logDecision(params: {
    decisionId: string;
    decisionType: 'contrast' | 'token' | 'governance' | 'conformance';
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    return this.createEntry({
      type: 'decision',
      severity: 'info',
      action: `${params.decisionType}_decision`,
      actor: {
        type: 'system',
        id: 'color-intelligence-engine',
      },
      resource: {
        type: 'decision',
        id: params.decisionId,
      },
      details: {
        decisionType: params.decisionType,
        input: params.input,
        output: params.output,
      },
      metadata: params.metadata,
    });
  }

  /**
   * Log a policy evaluation event
   */
  async logPolicyEvaluation(params: {
    policyId: string;
    decisionId: string;
    outcome: 'approved' | 'rejected' | 'adjusted' | 'conditional';
    violations?: ReadonlyArray<{ ruleId: string; message: string }>;
    adjustments?: ReadonlyArray<{ property: string; before: unknown; after: unknown }>;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    return this.createEntry({
      type: 'policy_evaluation',
      severity: params.outcome === 'rejected' ? 'warning' : 'info',
      action: 'policy_evaluation',
      actor: {
        type: 'system',
        id: 'governance-engine',
      },
      resource: {
        type: 'policy',
        id: params.policyId,
      },
      details: {
        decisionId: params.decisionId,
        outcome: params.outcome,
        violations: params.violations ?? [],
        adjustments: params.adjustments ?? [],
      },
      metadata: params.metadata,
    });
  }

  /**
   * Log a conformance test event
   */
  async logConformanceTest(params: {
    testSuiteId: string;
    subjectId: string;
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    passed: boolean;
    score: number;
    failedTests?: ReadonlyArray<string>;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    return this.createEntry({
      type: 'conformance_test',
      severity: params.passed ? 'info' : 'warning',
      action: 'conformance_evaluation',
      actor: {
        type: 'system',
        id: 'conformance-engine',
      },
      resource: {
        type: 'test_suite',
        id: params.testSuiteId,
      },
      details: {
        subjectId: params.subjectId,
        targetLevel: params.level,
        passed: params.passed,
        score: params.score,
        failedTests: params.failedTests ?? [],
      },
      metadata: params.metadata,
    });
  }

  /**
   * Log a certification event
   */
  async logCertification(params: {
    certificateId: string;
    subjectId: string;
    level: 'bronze' | 'silver' | 'gold' | 'platinum';
    issuedAt: string;
    expiresAt: string;
    issuer: string;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    return this.createEntry({
      type: 'certification',
      severity: 'info',
      action: 'certificate_issued',
      actor: {
        type: 'system',
        id: params.issuer,
      },
      resource: {
        type: 'certificate',
        id: params.certificateId,
      },
      details: {
        subjectId: params.subjectId,
        level: params.level,
        issuedAt: params.issuedAt,
        expiresAt: params.expiresAt,
      },
      metadata: params.metadata,
    });
  }

  /**
   * Log a plugin lifecycle event
   */
  async logPluginEvent(params: {
    pluginId: string;
    event: 'registered' | 'loaded' | 'unloaded' | 'error' | 'suspended';
    version: string;
    error?: string;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    return this.createEntry({
      type: 'plugin_lifecycle',
      severity: params.event === 'error' ? 'error' : 'info',
      action: `plugin_${params.event}`,
      actor: {
        type: 'system',
        id: 'plugin-manager',
      },
      resource: {
        type: 'plugin',
        id: params.pluginId,
      },
      details: {
        event: params.event,
        version: params.version,
        error: params.error,
      },
      metadata: params.metadata,
    });
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(params: {
    eventType: 'access_granted' | 'access_denied' | 'token_validated' | 'token_expired' | 'threat_detected';
    resourceId: string;
    resourceType: string;
    actorId?: string;
    actorType?: 'user' | 'system' | 'plugin';
    threatLevel?: 'low' | 'medium' | 'high' | 'critical';
    details?: Record<string, unknown>;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    const severity: AuditSeverity =
      params.eventType === 'threat_detected'
        ? params.threatLevel === 'critical' || params.threatLevel === 'high'
          ? 'critical'
          : 'warning'
        : params.eventType === 'access_denied'
          ? 'warning'
          : 'info';

    return this.createEntry({
      type: 'security',
      severity,
      action: params.eventType,
      actor: {
        type: params.actorType ?? 'system',
        id: params.actorId ?? 'unknown',
      },
      resource: {
        type: params.resourceType,
        id: params.resourceId,
      },
      details: {
        eventType: params.eventType,
        threatLevel: params.threatLevel,
        ...params.details,
      },
      metadata: params.metadata,
    });
  }

  // ============================================
  // Query & Reporting Methods
  // ============================================

  /**
   * Query audit entries
   */
  async query(query: AuditQuery): Promise<{
    entries: ReadonlyArray<AuditEntry>;
    total: number;
    hasMore: boolean;
  }> {
    if (!this.config.enabled) {
      return { entries: [], total: 0, hasMore: false };
    }

    // Flush buffer before querying
    await this.flushBuffer();

    const entries = await this.config.storageAdapter.query(query);
    const total = await this.config.storageAdapter.count(query);

    const limit = query.pagination?.limit ?? 100;
    const offset = query.pagination?.offset ?? 0;

    return {
      entries,
      total,
      hasMore: offset + entries.length < total,
    };
  }

  /**
   * Get a single audit entry by ID
   */
  async getEntry(id: AuditEntryId): Promise<AuditEntry | null> {
    if (!this.config.enabled) return null;
    return this.config.storageAdapter.getById(id);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    framework: ComplianceFramework;
    dateRange: { from: string; to: string };
    includeEvidence?: boolean;
  }): Promise<AuditReport> {
    const entries = await this.config.storageAdapter.query({
      dateRange: params.dateRange,
    });

    const frameworkChecks = this.getFrameworkChecks(params.framework);
    const evidence: AuditEntry[] = [];

    let passedChecks = 0;
    let failedChecks = 0;
    const findings: Array<{
      checkId: string;
      status: 'passed' | 'failed' | 'not_applicable';
      evidence: string[];
    }> = [];

    for (const check of frameworkChecks) {
      const matchingEntries = entries.filter(entry =>
        this.entryMatchesCheck(entry, check)
      );

      const passed = check.validate(matchingEntries);

      if (passed) {
        passedChecks++;
      } else {
        failedChecks++;
      }

      findings.push({
        checkId: check.id,
        status: passed ? 'passed' : 'failed',
        evidence: params.includeEvidence
          ? matchingEntries.slice(0, 5).map(e => e.id)
          : [],
      });

      if (params.includeEvidence) {
        evidence.push(...matchingEntries.slice(0, 3));
      }
    }

    const overallStatus: ComplianceStatus =
      failedChecks === 0
        ? 'compliant'
        : failedChecks > frameworkChecks.length / 2
          ? 'non_compliant'
          : 'partially_compliant';

    // Build category and severity counts from evidence
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const entry of evidence) {
      const cat = entry.type ?? entry.category ?? 'system';
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;
    }

    // Build report entries from findings for AuditReport compatibility
    const reportEntries: AuditEntry[] = findings.map((finding) => ({
      id: finding.checkId as AuditEntryId,
      timestamp: new Date().toISOString(),
      category: 'compliance' as AuditCategory,
      action: `compliance-check-${finding.status}`,
      severity: (finding.status === 'failed' ? 'error' : 'info') as AuditSeverity,
    } as AuditEntry));

    return {
      id: `report-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period: {
        start: params.dateRange.from,
        end: params.dateRange.to,
      },
      summary: {
        totalEntries: evidence.length,
        byCategory: byCategory as Record<AuditCategory, number>,
        bySeverity: bySeverity as Record<AuditSeverity, number>,
        complianceStatus: overallStatus,
        totalChecks: frameworkChecks.length,
        passedChecks,
        failedChecks,
        complianceRate: Math.round(
          (passedChecks / frameworkChecks.length) * 100
        ),
      },
      entries: reportEntries,
      metadata: {
        custom: {
          framework: params.framework,
          includesEvidence: params.includeEvidence,
          recommendations: this.generateRecommendations(findings, params.framework),
        },
      },
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(dateRange: { from: string; to: string }): Promise<{
    totalEntries: number;
    byType: Record<AuditEntryType, number>;
    bySeverity: Record<AuditSeverity, number>;
    decisionsPerDay: Array<{ date: string; count: number }>;
  }> {
    const entries = await this.config.storageAdapter.query({ dateRange });

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const decisionsPerDay: Record<string, number> = {};

    for (const entry of entries) {
      // Count by type (use type or category, fallback to 'unknown')
      const entryType = entry.type ?? entry.category ?? 'system';
      byType[entryType] = (byType[entryType] ?? 0) + 1;

      // Count by severity
      bySeverity[entry.severity] = (bySeverity[entry.severity] ?? 0) + 1;

      // Count decisions per day
      const day = entry.timestamp.split('T')[0] ?? entry.timestamp.slice(0, 10);
      if (entryType === 'decision' && day) {
        decisionsPerDay[day] = (decisionsPerDay[day] ?? 0) + 1;
      }
    }

    return {
      totalEntries: entries.length,
      byType: byType as Record<AuditEntryType, number>,
      bySeverity: bySeverity as Record<AuditSeverity, number>,
      decisionsPerDay: Object.entries(decisionsPerDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // ============================================
  // Retention & Maintenance
  // ============================================

  /**
   * Apply retention policy and purge old entries
   */
  async applyRetentionPolicy(): Promise<{
    purgedCount: number;
    archivedCount: number;
  }> {
    if (!this.config.enabled) {
      return { purgedCount: 0, archivedCount: 0 };
    }

    const purgedCount = await this.config.storageAdapter.purge(
      this.config.retentionPolicy
    );

    return { purgedCount, archivedCount: 0 };
  }

  /**
   * Export audit log for external analysis
   */
  async export(params: {
    format: 'json' | 'csv' | 'ndjson';
    dateRange: { from: string; to: string };
    types?: ReadonlyArray<AuditEntryType>;
  }): Promise<string> {
    const query: AuditQuery = {
      dateRange: params.dateRange,
      types: params.types as AuditEntryType[],
    };

    const entries = await this.config.storageAdapter.query(query);

    switch (params.format) {
      case 'json':
        return JSON.stringify(entries, null, 2);

      case 'ndjson':
        return entries.map(e => JSON.stringify(e)).join('\n');

      case 'csv':
        return this.entriesToCSV(entries);

      default:
        throw new Error(`Unsupported export format: ${params.format}`);
    }
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  /**
   * Gracefully shutdown the audit service
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushBuffer();
  }

  // ============================================
  // Private Methods
  // ============================================

  private async createEntry(params: {
    type: AuditEntryType;
    severity: AuditSeverity;
    action: string;
    actor: { type: string; id: string };
    resource: { type: string; id: string };
    details: Record<string, unknown>;
    metadata?: AuditMetadata;
  }): Promise<AuditEntryId> {
    const id = createAuditEntryId();
    const timestamp = new Date().toISOString();

    // Create entry base data (without hash for computation)
    const entryBase = {
      id,
      timestamp,
      type: params.type,
      severity: params.severity,
      action: params.action,
      actor: params.actor,
      resource: params.resource,
      details: params.details,
      metadata: this.config.includeMetadata
        ? {
            version: '5.0.0',
            environment: typeof process !== 'undefined' ? process.env.NODE_ENV : 'browser',
            ...params.metadata,
          }
        : undefined,
      correlationId: params.metadata?.correlationId,
    };

    // Compute entry hash for integrity verification
    const hash = await this.computeHash(entryBase as AuditEntry);

    // Create final entry with hash
    const entry: AuditEntry = { ...entryBase, hash };

    // Add to buffer for batch writing
    this.entryBuffer.push(entry);

    // Immediate flush for critical entries
    if (params.severity === 'critical' || params.severity === 'error') {
      await this.flushBuffer();
    }

    return id;
  }

  private async computeHash(entry: AuditEntry): Promise<string> {
    const content = JSON.stringify({
      id: entry.id,
      timestamp: entry.timestamp,
      type: entry.type,
      action: entry.action,
      actor: entry.actor,
      resource: entry.resource,
      details: entry.details,
    });

    // Use Web Crypto API if available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: simple hash for non-browser environments
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private startBufferFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flushBuffer();
    }, this.bufferFlushInterval);
  }

  private async flushBuffer(): Promise<void> {
    if (this.entryBuffer.length === 0) return;

    const entries = [...this.entryBuffer];
    this.entryBuffer.length = 0;

    for (const entry of entries) {
      await this.config.storageAdapter.write(entry);
    }
  }

  private getFrameworkChecks(
    framework: ComplianceFramework
  ): Array<{
    id: string;
    validate: (entries: ReadonlyArray<AuditEntry>) => boolean;
  }> {
    // Framework-specific compliance checks
    const checks = {
      wcag: [
        {
          id: 'wcag-contrast-decisions',
          validate: (entries: ReadonlyArray<AuditEntry>) =>
            entries.some(e => e.type === 'decision'),
        },
        {
          id: 'wcag-policy-enforcement',
          validate: (entries: ReadonlyArray<AuditEntry>) =>
            entries.some(e => e.type === 'policy_evaluation'),
        },
      ],
      section508: [
        {
          id: '508-accessibility-testing',
          validate: (entries: ReadonlyArray<AuditEntry>) =>
            entries.some(e => e.type === 'conformance_test'),
        },
      ],
      en301549: [
        {
          id: 'en301549-conformance',
          validate: (entries: ReadonlyArray<AuditEntry>) =>
            entries.some(e => e.type === 'certification'),
        },
      ],
      aoda: [],
      ada: [],
      internal: [],
    };

    return checks[framework] ?? [];
  }

  private entryMatchesCheck(
    entry: AuditEntry,
    _check: { id: string }
  ): boolean {
    // Simple matching logic - can be extended
    return true;
  }

  private generateRecommendations(
    findings: ReadonlyArray<{
      checkId: string;
      status: 'passed' | 'failed' | 'not_applicable';
    }>,
    _framework: ComplianceFramework
  ): string[] {
    const recommendations: string[] = [];

    const failedChecks = findings.filter(f => f.status === 'failed');

    if (failedChecks.length > 0) {
      recommendations.push(
        'Review and address failed compliance checks before next audit.'
      );
    }

    if (failedChecks.some(f => f.checkId.includes('contrast'))) {
      recommendations.push(
        'Ensure all color contrast decisions meet minimum WCAG requirements.'
      );
    }

    if (failedChecks.some(f => f.checkId.includes('policy'))) {
      recommendations.push(
        'Review governance policies and ensure proper enforcement configuration.'
      );
    }

    return recommendations;
  }

  private entriesToCSV(entries: ReadonlyArray<AuditEntry>): string {
    const headers = [
      'id',
      'timestamp',
      'type',
      'severity',
      'action',
      'actor_type',
      'actor_id',
      'resource_type',
      'resource_id',
    ];

    const rows = entries.map(entry => [
      entry.id,
      entry.timestamp,
      entry.type ?? entry.category ?? '',
      entry.severity,
      entry.action ?? '',
      entry.actor?.type ?? '',
      entry.actor?.id ?? '',
      entry.resource?.type ?? '',
      entry.resource?.id ?? '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// ============================================
// Factory Function
// ============================================

export function createAuditTrailService(
  config: Partial<AuditTrailConfig> & { storageAdapter: IAuditStoragePort }
): AuditTrailService {
  return new AuditTrailService(config);
}
