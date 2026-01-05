// ============================================
// Audit & Regulatory Readiness Types
// Phase 5: Standardization Layer
// ============================================
//
// Types for deterministic auditing, reproducibility, and
// regulatory compliance. Every decision must be traceable.
//
// Features:
// - Complete audit trail for all perceptual decisions
// - Reproducible decision chains
// - Explainable AI-ready output
// - Regulatory compliance support
//
// ============================================

import type { SpecificationId } from './specification';
import type { ConformanceLevel, ConformanceViolation } from './conformance';

// ============================================
// Audit Trail Types
// ============================================

/**
 * Unique identifier for an audit entry
 */
export type AuditEntryId = string & { readonly __brand: 'AuditEntryId' };

/**
 * Create an audit entry ID
 */
export function createAuditEntryId(): AuditEntryId {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `AE-${timestamp}-${random}` as AuditEntryId;
}

/**
 * Category of audit event
 */
export type AuditCategory =
  | 'decision'          // Color decision made
  | 'governance'        // Policy evaluation
  | 'adjustment'        // Color adjustment performed
  | 'validation'        // Accessibility validation
  | 'export'            // Token export
  | 'certification'     // Conformance certification
  | 'system'            // System event
  | 'policy_evaluation' // Policy evaluation event
  | 'conformance_test'  // Conformance testing
  | 'plugin_lifecycle'  // Plugin events
  | 'security';         // Security events

/**
 * Audit event severity
 */
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * A single audit trail entry
 *
 * Note: Some fields are optional for backward compatibility with
 * service layer implementations. For full conformance, all optional
 * fields should be provided.
 */
export interface AuditEntry {
  // Identity (required)
  readonly id: AuditEntryId;
  readonly timestamp: string;
  readonly sequence?: number; // For ordering (optional for service compat)

  // Context
  readonly category?: AuditCategory; // Optional: use `type` for service compat
  readonly action?: string; // Optional for service layer
  readonly severity: AuditSeverity;

  // Input/Output (optional for service layer compat)
  readonly input?: AuditInput;
  readonly output?: AuditOutput;

  // Policy context
  readonly policy?: AuditPolicyContext;

  // Decision explanation
  readonly decision?: DecisionExplanation;

  // Traceability
  readonly correlationId?: string; // Links related entries
  readonly parentEntryId?: AuditEntryId;
  readonly childEntryIds?: ReadonlyArray<AuditEntryId>;

  // Version information
  readonly systemVersion?: string;
  readonly specificationVersion?: string;

  // Metadata
  readonly metadata?: AuditMetadata;

  // Service layer extensions (for infrastructure usage)
  readonly type?: AuditCategory; // Alias for category
  readonly actor?: {
    readonly id: string;
    readonly type: string;
    readonly name?: string;
  };
  readonly resource?: {
    readonly type: string;
    readonly id: string;
    readonly name?: string;
  };
  readonly details?: Record<string, unknown>;
  readonly hash?: string;
}

/**
 * Input recorded in audit
 */
export interface AuditInput {
  readonly type: string;
  readonly data: unknown;
  readonly hash: string; // For reproducibility verification
  readonly source?: string;
}

/**
 * Output recorded in audit
 */
export interface AuditOutput {
  readonly type: string;
  readonly data: unknown;
  readonly hash: string;
  readonly status: 'success' | 'failure' | 'partial';
}

/**
 * Policy context in audit
 */
export interface AuditPolicyContext {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly policyName: string;
  readonly enforcement: 'strict' | 'advisory' | 'monitoring';
  readonly result: 'approved' | 'adjusted' | 'rejected' | 'warning';
}

/**
 * Decision explanation for audit (explainable AI)
 */
export interface DecisionExplanation {
  readonly summary: string;
  readonly factors: ReadonlyArray<DecisionFactor>;
  readonly alternatives: ReadonlyArray<DecisionAlternative>;
  readonly confidence: number; // 0-1
  readonly reasoning: string;
}

/**
 * A factor that influenced a decision
 */
export interface DecisionFactor {
  readonly name: string;
  readonly value: string | number;
  readonly weight: number;
  readonly impact: 'positive' | 'negative' | 'neutral';
  readonly explanation: string;
}

/**
 * An alternative that was considered
 */
export interface DecisionAlternative {
  readonly description: string;
  readonly rejected: boolean;
  readonly reason: string;
  readonly score?: number;
}

/**
 * Audit metadata
 */
export interface AuditMetadata {
  readonly environment?: string;
  readonly userAgent?: string;
  readonly sessionId?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly custom?: Record<string, unknown>;
  readonly version?: string;
  readonly correlationId?: string;
}

// ============================================
// Service Layer Types (Infrastructure Support)
// ============================================

/**
 * Type alias for backward compatibility
 */
export type AuditEntryType = AuditCategory;

/**
 * Type alias for backward compatibility
 */
export type AuditQuery = AuditQueryFilter;

/**
 * Compliance framework identifiers
 */
export type ComplianceFramework =
  | 'wcag'
  | 'section508'
  | 'en301549'
  | 'aoda'
  | 'ada'
  | 'internal';

/**
 * Compliance status for audit
 */
export type ComplianceStatus =
  | 'compliant'
  | 'non-compliant'
  | 'non_compliant'
  | 'partially-compliant'
  | 'partially_compliant'
  | 'pending-review'
  | 'pending_review'
  | 'exempt';

/**
 * Retention policy for audit entries
 */
export interface RetentionPolicy {
  readonly minRetentionDays: number;
  readonly maxRetentionDays: number;
  readonly autoArchive: boolean;
  readonly archiveAfterDays: number;
}

/**
 * Audit report summary
 */
export interface AuditReport {
  readonly id: string;
  readonly generatedAt: string;
  readonly period: {
    readonly start: string;
    readonly end: string;
  };
  readonly summary: {
    readonly totalEntries: number;
    readonly byCategory: Record<AuditCategory, number>;
    readonly bySeverity: Record<AuditSeverity, number>;
    readonly complianceStatus: ComplianceStatus;
    // Service layer extensions
    readonly totalChecks?: number;
    readonly passedChecks?: number;
    readonly failedChecks?: number;
    readonly complianceRate?: number;
  };
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly metadata?: AuditMetadata;
}

/**
 * Extended AuditEntry with service-layer fields
 * For backward compatibility with infrastructure services
 */
export interface ExtendedAuditEntry extends AuditEntry {
  readonly type?: AuditCategory;
  readonly actor?: {
    readonly id: string;
    readonly type: string;
    readonly name?: string;
  };
  readonly resource?: {
    readonly type: string;
    readonly id: string;
    readonly name?: string;
  };
  readonly details?: Record<string, unknown>;
  readonly hash?: string;
}

// ============================================
// Audit Trail Management
// ============================================

/**
 * Audit trail (collection of entries)
 */
export interface AuditTrail {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly entries: ReadonlyArray<AuditEntry>;
  readonly startedAt: string;
  readonly endedAt?: string;
  readonly metadata: AuditTrailMetadata;
}

/**
 * Audit trail metadata
 */
export interface AuditTrailMetadata {
  readonly systemVersion: string;
  readonly specificationId?: SpecificationId;
  readonly conformanceLevel?: ConformanceLevel;
  readonly entryCount: number;
  readonly hasViolations: boolean;
  readonly violationCount: number;
}

/**
 * Interface for audit trail manager
 */
export interface IAuditTrailManager {
  /**
   * Start a new audit trail
   */
  startTrail(name?: string): AuditTrail;

  /**
   * End the current trail
   */
  endTrail(): AuditTrail;

  /**
   * Record an audit entry
   */
  record(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'sequence'>): AuditEntryId;

  /**
   * Get the current trail
   */
  getCurrentTrail(): AuditTrail | null;

  /**
   * Get entry by ID
   */
  getEntry(id: AuditEntryId): AuditEntry | null;

  /**
   * Query entries
   */
  query(filter: AuditQueryFilter): ReadonlyArray<AuditEntry>;

  /**
   * Export trail for external audit
   */
  export(format: AuditExportFormat): string;

  /**
   * Verify trail integrity
   */
  verify(): AuditVerificationResult;
}

/**
 * Filter for querying audit entries
 */
export interface AuditQueryFilter {
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly policyId?: string;
  readonly correlationId?: string;
  readonly limit?: number;
  readonly offset?: number;
  // Extended query options for service layer
  readonly types?: ReadonlyArray<AuditCategory>;
  readonly dateRange?: {
    readonly start?: string;
    readonly end?: string;
    // Alias for start/end (service layer compat)
    readonly from?: string;
    readonly to?: string;
  };
  readonly pagination?: {
    readonly page?: number;
    readonly pageSize?: number;
    // Alias for page/pageSize (service layer compat)
    readonly offset?: number;
    readonly limit?: number;
  };
  // Service layer query extensions
  readonly severityLevels?: ReadonlyArray<AuditSeverity>;
  readonly actorId?: string;
  readonly resourceId?: string;
  readonly searchText?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Export format for audit trails
 */
export type AuditExportFormat = 'json' | 'csv' | 'xml' | 'ndjson';

/**
 * Result of audit trail verification
 */
export interface AuditVerificationResult {
  readonly valid: boolean;
  readonly entriesVerified: number;
  readonly entriesFailed: number;
  readonly issues: ReadonlyArray<AuditVerificationIssue>;
  readonly verifiedAt: string;
}

/**
 * Issue found during verification
 */
export interface AuditVerificationIssue {
  readonly entryId: AuditEntryId;
  readonly type: 'hash-mismatch' | 'sequence-gap' | 'timestamp-inconsistent' | 'data-corruption';
  readonly message: string;
  readonly severity: AuditSeverity;
}

// ============================================
// Reproducibility Types
// ============================================

/**
 * Reproducibility record for a decision
 */
export interface ReproducibilityRecord {
  readonly decisionId: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly configHash: string;
  readonly systemVersion: string;
  readonly timestamp: string;
  readonly verified: boolean;
  readonly verifiedAt?: string;
}

/**
 * Interface for reproducibility checker
 */
export interface IReproducibilityChecker {
  /**
   * Create a reproducibility record
   */
  createRecord(
    decisionId: string,
    input: unknown,
    output: unknown,
    config: unknown
  ): ReproducibilityRecord;

  /**
   * Verify that a decision can be reproduced
   */
  verify(record: ReproducibilityRecord, input: unknown): Promise<boolean>;

  /**
   * Replay a decision from a record
   */
  replay(record: ReproducibilityRecord): Promise<unknown>;
}

// ============================================
// Regulatory Compliance Types
// ============================================

/**
 * Regulatory framework reference
 */
export interface RegulatoryFramework {
  readonly id: string;
  readonly name: string;
  readonly jurisdiction: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly requirements: ReadonlyArray<RegulatoryRequirement>;
  readonly documentationUrl: string;
}

/**
 * A regulatory requirement
 */
export interface RegulatoryRequirement {
  readonly id: string;
  readonly section: string;
  readonly description: string;
  readonly mandatory: boolean;
  readonly mappedToConformance?: ConformanceLevel;
  readonly auditableProperties: ReadonlyArray<string>;
}

/**
 * Regulatory compliance report
 */
export interface RegulatoryComplianceReport {
  readonly framework: RegulatoryFramework;
  readonly evaluatedAt: string;
  readonly compliant: boolean;
  readonly requirements: ReadonlyArray<RegulatoryRequirementResult>;
  readonly auditTrailId: string;
  readonly certificationStatus?: string;
}

/**
 * Result for a regulatory requirement
 */
export interface RegulatoryRequirementResult {
  readonly requirementId: string;
  readonly met: boolean;
  readonly evidence: ReadonlyArray<string>;
  readonly gaps: ReadonlyArray<string>;
  readonly recommendations: ReadonlyArray<string>;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create an audit entry
 */
export function createAuditEntry(
  category: AuditCategory,
  action: string,
  input: unknown,
  output: unknown,
  options?: Partial<Omit<AuditEntry, 'id' | 'timestamp' | 'sequence' | 'input' | 'output' | 'category' | 'action'>>
): Omit<AuditEntry, 'id' | 'timestamp' | 'sequence'> {
  return {
    category,
    action,
    severity: options?.severity ?? 'info',
    input: {
      type: typeof input,
      data: input,
      hash: computeHash(input),
      source: (options?.metadata?.custom?.['source'] as string | undefined),
    },
    output: {
      type: typeof output,
      data: output,
      hash: computeHash(output),
      status: 'success',
    },
    policy: options?.policy,
    decision: options?.decision,
    correlationId: options?.correlationId,
    parentEntryId: options?.parentEntryId,
    childEntryIds: options?.childEntryIds,
    systemVersion: options?.systemVersion ?? '5.0.0',
    specificationVersion: options?.specificationVersion,
    metadata: options?.metadata,
  };
}

/**
 * Create a decision explanation
 */
export function createDecisionExplanation(
  summary: string,
  reasoning: string,
  factors: ReadonlyArray<DecisionFactor>,
  options?: {
    alternatives?: ReadonlyArray<DecisionAlternative>;
    confidence?: number;
  }
): DecisionExplanation {
  return {
    summary,
    reasoning,
    factors,
    alternatives: options?.alternatives ?? [],
    confidence: options?.confidence ?? 1.0,
  };
}

/**
 * Create a decision factor
 */
export function createDecisionFactor(
  name: string,
  value: string | number,
  weight: number,
  impact: DecisionFactor['impact'],
  explanation: string
): DecisionFactor {
  return { name, value, weight, impact, explanation };
}

/**
 * Compute a deterministic hash for reproducibility
 */
export function computeHash(data: unknown): string {
  const str = JSON.stringify(data, Object.keys(data as object).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for AuditEntry
 */
export function isAuditEntry(value: unknown): value is AuditEntry {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['timestamp'] === 'string' &&
    typeof obj['category'] === 'string' &&
    typeof obj['action'] === 'string' &&
    typeof obj['input'] === 'object' &&
    typeof obj['output'] === 'object'
  );
}

/**
 * Type guard for AuditTrail
 */
export function isAuditTrail(value: unknown): value is AuditTrail {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    Array.isArray(obj['entries']) &&
    typeof obj['startedAt'] === 'string' &&
    typeof obj['metadata'] === 'object'
  );
}

/**
 * Type guard for DecisionExplanation
 */
export function isDecisionExplanation(
  value: unknown
): value is DecisionExplanation {
  if (typeof value !== 'object' || value === null) return false;

  const obj = value as Record<string, unknown>;
  return (
    typeof obj['summary'] === 'string' &&
    typeof obj['reasoning'] === 'string' &&
    Array.isArray(obj['factors']) &&
    Array.isArray(obj['alternatives'])
  );
}
