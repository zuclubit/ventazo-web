// ============================================
// Governance Evaluation Types
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Types for policy evaluation results, violations,
// adjustments, and governance decisions.
// ============================================

import type { ContrastDecision } from '../../types/decision';
import type {
  PolicyId,
  PolicyVersion,
  PolicyPriority,
  PolicyEnforcement,
  PolicyContext,
} from './policy';
import type { PolicyRule, RuleId } from './policy-composition';

// ============================================
// Governance Outcome
// ============================================

/**
 * Possible outcomes from governance evaluation
 */
export type GovernanceOutcome =
  | 'approved'      // Passes all applicable policies
  | 'adjusted'      // Modified to comply (auto-fix applied)
  | 'rejected'      // Fails critical policies, cannot auto-fix
  | 'conditional';  // Passes with warnings (advisory violations)

/**
 * Numeric values for outcome comparison
 */
export const OUTCOME_SEVERITY: Record<GovernanceOutcome, number> = {
  approved: 0,
  conditional: 1,
  adjusted: 2,
  rejected: 3,
};

// ============================================
// Policy Violation
// ============================================

/**
 * A single policy violation
 */
export interface PolicyViolation {
  /** ID of the violated policy */
  readonly policyId: PolicyId;

  /** Version of the policy that was violated */
  readonly policyVersion: PolicyVersion;

  /** Name of the policy for display */
  readonly policyName: string;

  /** ID of the specific rule that was violated (if composite) */
  readonly ruleId?: RuleId;

  /** Rule name for display */
  readonly ruleName?: string;

  /** Severity of this violation */
  readonly severity: 'error' | 'warning' | 'info';

  /** Human-readable violation message */
  readonly message: string;

  /** What was expected */
  readonly expected: string;

  /** What was found */
  readonly actual: string;

  /** Remediation suggestion */
  readonly remediationSuggestion?: string;

  /** Context where violation occurred */
  readonly context: PolicyContext;

  /** ISO timestamp of when violation was detected */
  readonly detectedAt: string;
}

/**
 * Create a policy violation
 */
export function createViolation(
  policy: { id: PolicyId; version: PolicyVersion; name: string },
  severity: 'error' | 'warning' | 'info',
  message: string,
  expected: string,
  actual: string,
  context: PolicyContext,
  options?: {
    ruleId?: RuleId;
    ruleName?: string;
    remediationSuggestion?: string;
  }
): PolicyViolation {
  return {
    policyId: policy.id,
    policyVersion: policy.version,
    policyName: policy.name,
    ruleId: options?.ruleId,
    ruleName: options?.ruleName,
    severity,
    message,
    expected,
    actual,
    remediationSuggestion: options?.remediationSuggestion,
    context,
    detectedAt: new Date().toISOString(),
  };
}

// ============================================
// Decision Adjustment
// ============================================

/**
 * Properties that can be adjusted
 */
export type AdjustmentTarget = 'foreground' | 'background' | 'fontSize' | 'fontWeight';

/**
 * Adjustment operations
 */
export type AdjustmentOperation =
  | 'increase'     // Increase value
  | 'decrease'     // Decrease value
  | 'setMinimum'   // Set to minimum required
  | 'setMaximum'   // Set to maximum allowed
  | 'replace';     // Replace with specific value

/**
 * Units for adjustment magnitude
 */
export type AdjustmentUnit = 'Lc' | 'percentage' | 'px' | 'ratio' | 'absolute';

/**
 * Specification for an adjustment (WHAT to adjust, not HOW)
 *
 * The governance layer specifies adjustments but does NOT
 * perform color calculations. The decision engine port
 * applies these specifications.
 */
export interface AdjustmentSpecification {
  /** Which property to adjust */
  readonly target: AdjustmentTarget;

  /** What operation to perform */
  readonly operation: AdjustmentOperation;

  /** Magnitude of adjustment */
  readonly magnitude: number;

  /** Unit of the magnitude */
  readonly unit: AdjustmentUnit;

  /** Constraints on the adjustment */
  readonly constraints?: AdjustmentConstraints;

  /** Reason for this adjustment */
  readonly reason: string;
}

/**
 * Constraints on adjustments
 */
export interface AdjustmentConstraints {
  /** Preserve original hue */
  readonly preserveHue?: boolean;

  /** Maximum chroma reduction (percentage) */
  readonly maxChromaReduction?: number;

  /** Maximum hue shift (degrees) */
  readonly maxHueShift?: number;

  /** Minimum lightness */
  readonly minLightness?: number;

  /** Maximum lightness */
  readonly maxLightness?: number;
}

/**
 * Record of an applied adjustment
 */
export interface AppliedAdjustment {
  /** The specification that was applied */
  readonly specification: AdjustmentSpecification;

  /** Original value before adjustment */
  readonly originalValue: string | number;

  /** New value after adjustment */
  readonly adjustedValue: string | number;

  /** Whether the adjustment was successful */
  readonly success: boolean;

  /** Error message if unsuccessful */
  readonly error?: string;

  /** How many iterations were needed */
  readonly iterations: number;
}

// ============================================
// Policy Evaluation Result
// ============================================

/**
 * Result of evaluating a single policy
 */
export interface PolicyEvaluationResult {
  /** Policy that was evaluated */
  readonly policyId: PolicyId;

  /** Policy version */
  readonly policyVersion: PolicyVersion;

  /** Policy name */
  readonly policyName: string;

  /** Whether the policy passed */
  readonly passed: boolean;

  /** Violations found (empty if passed) */
  readonly violations: ReadonlyArray<PolicyViolation>;

  /** Warnings (non-blocking issues) */
  readonly warnings: ReadonlyArray<string>;

  /** Score for this policy (0-100) */
  readonly score: number;

  /** Enforcement mode of the policy */
  readonly enforcement: PolicyEnforcement;

  /** Priority of the policy */
  readonly priority: PolicyPriority;

  /** Individual rule results (for composite policies) */
  readonly ruleResults?: ReadonlyArray<RuleEvaluationResult>;

  /** Time taken to evaluate (ms) */
  readonly evaluationTimeMs: number;
}

/**
 * Result of evaluating a single rule
 */
export interface RuleEvaluationResult {
  /** Rule that was evaluated */
  readonly ruleId: RuleId;

  /** Rule name */
  readonly ruleName: string;

  /** Whether the rule passed */
  readonly passed: boolean;

  /** Actual value that was checked */
  readonly actualValue: unknown;

  /** Expected value/condition */
  readonly expectedCondition: string;

  /** Violation if rule failed */
  readonly violation?: PolicyViolation;
}

// ============================================
// Governance Evaluation
// ============================================

/**
 * Complete governance evaluation result
 *
 * This is the main output of the Governance Engine.
 * It wraps a ContrastDecision with policy evaluation,
 * adjustments, and audit information.
 */
export interface GovernanceEvaluation {
  // ===== Core Results =====

  /** Original decision before any adjustments */
  readonly originalDecision: ContrastDecision;

  /** Final decision after any adjustments */
  readonly finalDecision: ContrastDecision;

  /** Overall outcome */
  readonly outcome: GovernanceOutcome;

  // ===== Policy Details =====

  /** Results for each evaluated policy */
  readonly evaluatedPolicies: ReadonlyArray<PolicyEvaluationResult>;

  /** Total number of policies evaluated */
  readonly policyCount: number;

  /** Number of policies passed */
  readonly passedCount: number;

  /** Number of policies failed */
  readonly failedCount: number;

  // ===== Adjustments =====

  /** Adjustments that were applied */
  readonly adjustments: ReadonlyArray<AppliedAdjustment>;

  /** Whether any adjustments were made */
  readonly wasAdjusted: boolean;

  // ===== Messages =====

  /** All violations across all policies */
  readonly violations: ReadonlyArray<PolicyViolation>;

  /** Warnings (advisory, non-blocking) */
  readonly warnings: ReadonlyArray<string>;

  /** Informational messages */
  readonly info: ReadonlyArray<string>;

  // ===== Context =====

  /** Context used for evaluation */
  readonly context: PolicyContext;

  /** Audit entry for this evaluation */
  readonly auditEntry: AuditEntry;

  // ===== Metadata =====

  /** ISO timestamp of evaluation */
  readonly evaluatedAt: string;

  /** Total evaluation time (ms) */
  readonly totalEvaluationTimeMs: number;

  /** Governance engine version */
  readonly engineVersion: string;
}

// ============================================
// Audit Entry
// ============================================

/**
 * Audit entry for compliance tracking
 */
export interface AuditEntry {
  /** Unique audit ID */
  readonly id: string;

  /** Type of action audited */
  readonly action: 'evaluate' | 'adjust' | 'reject' | 'approve';

  /** ISO timestamp */
  readonly timestamp: string;

  /** Input colors */
  readonly input: {
    readonly foreground: string;
    readonly background: string;
    readonly fontSizePx?: number;
    readonly fontWeight?: number;
  };

  /** Output summary */
  readonly output: {
    readonly outcome: GovernanceOutcome;
    readonly score: number;
    readonly wcagLevel: string;
    readonly wcag3Tier: string;
    readonly wasAdjusted: boolean;
  };

  /** Policies that were checked */
  readonly policiesChecked: ReadonlyArray<{
    readonly id: PolicyId;
    readonly version: PolicyVersion;
    readonly passed: boolean;
  }>;

  /** Violations found */
  readonly violationCount: number;

  /** Adjustments made */
  readonly adjustmentCount: number;

  /** Session/user context (optional) */
  readonly sessionContext?: {
    readonly userId?: string;
    readonly sessionId?: string;
    readonly applicationId?: string;
  };

  /** Hash for tamper detection */
  readonly integrityHash: string;
}

/**
 * Generate a simple integrity hash for an audit entry
 * In production, use a proper HMAC
 */
export function generateAuditHash(entry: Omit<AuditEntry, 'integrityHash'>): string {
  const content = JSON.stringify({
    id: entry.id,
    action: entry.action,
    timestamp: entry.timestamp,
    input: entry.input,
    output: entry.output,
    policiesChecked: entry.policiesChecked,
    violationCount: entry.violationCount,
    adjustmentCount: entry.adjustmentCount,
  });

  // Simple hash for demo - use crypto in production
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create an audit entry
 */
export function createAuditEntry(
  action: AuditEntry['action'],
  input: AuditEntry['input'],
  output: AuditEntry['output'],
  policiesChecked: AuditEntry['policiesChecked'],
  options?: {
    violationCount?: number;
    adjustmentCount?: number;
    sessionContext?: AuditEntry['sessionContext'];
  }
): AuditEntry {
  const baseEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    action,
    timestamp: new Date().toISOString(),
    input,
    output,
    policiesChecked,
    violationCount: options?.violationCount ?? 0,
    adjustmentCount: options?.adjustmentCount ?? 0,
    sessionContext: options?.sessionContext,
  };

  return {
    ...baseEntry,
    integrityHash: generateAuditHash(baseEntry),
  };
}

// ============================================
// Governance Decision Summary
// ============================================

/**
 * Simplified summary for display/logging
 */
export interface GovernanceSummary {
  readonly outcome: GovernanceOutcome;
  readonly score: number;
  readonly passed: boolean;
  readonly policyCount: number;
  readonly passedCount: number;
  readonly failedCount: number;
  readonly violationCount: number;
  readonly warningCount: number;
  readonly wasAdjusted: boolean;
  readonly evaluationTimeMs: number;
}

/**
 * Extract summary from evaluation
 */
export function extractSummary(evaluation: GovernanceEvaluation): GovernanceSummary {
  return {
    outcome: evaluation.outcome,
    score: evaluation.finalDecision.score as number,
    passed: evaluation.outcome === 'approved' || evaluation.outcome === 'adjusted',
    policyCount: evaluation.policyCount,
    passedCount: evaluation.passedCount,
    failedCount: evaluation.failedCount,
    violationCount: evaluation.violations.length,
    warningCount: evaluation.warnings.length,
    wasAdjusted: evaluation.wasAdjusted,
    evaluationTimeMs: evaluation.totalEvaluationTimeMs,
  };
}

// ============================================
// Evaluation Request
// ============================================

/**
 * Request for governance evaluation
 */
export interface GovernanceEvaluationRequest {
  /** Foreground color (hex) */
  readonly foreground: string;

  /** Background color (hex) */
  readonly background: string;

  /** Font size in pixels */
  readonly fontSizePx?: number;

  /** Font weight (100-900) */
  readonly fontWeight?: number;

  /** Context for policy matching */
  readonly context?: PolicyContext;

  /** Specific policy IDs to evaluate (empty = all applicable) */
  readonly policyIds?: ReadonlyArray<PolicyId>;

  /** Whether to attempt auto-fix on violations */
  readonly autoFix?: boolean;

  /** Maximum auto-fix iterations */
  readonly maxAutoFixIterations?: number;

  /** Session context for audit */
  readonly sessionContext?: AuditEntry['sessionContext'];
}

/**
 * Create a governance evaluation request
 */
export function createEvaluationRequest(
  foreground: string,
  background: string,
  options?: Partial<Omit<GovernanceEvaluationRequest, 'foreground' | 'background'>>
): GovernanceEvaluationRequest {
  return {
    foreground,
    background,
    fontSizePx: options?.fontSizePx,
    fontWeight: options?.fontWeight,
    context: options?.context ?? {},
    policyIds: options?.policyIds,
    autoFix: options?.autoFix ?? false,
    maxAutoFixIterations: options?.maxAutoFixIterations ?? 5,
    sessionContext: options?.sessionContext,
  };
}
