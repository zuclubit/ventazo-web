// ============================================
// Governance Boundary Contract
// Phase 4: Governance & Adoption Layer
// ============================================
//
// This contract defines the strict boundary between the
// Governance Layer and the Decision Engine (Phase 3).
//
// CRITICAL PRINCIPLE:
// Governance NEVER performs color calculations. It only:
// 1. Evaluates decisions against policies
// 2. Specifies what adjustments are needed
// 3. Delegates color operations to the Decision Engine
//
// ============================================

import type { ContrastDecision } from '../../types/decision';
import type {
  GovernanceOutcome,
  GovernanceEvaluation,
  AdjustmentSpecification,
  PolicyViolation,
} from '../types/evaluation';
import type {
  PerceptualPolicy,
  PolicyContext,
  PolicyId,
} from '../types/policy';

// ============================================
// Governance Boundary Types
// ============================================

/**
 * Request to the governance boundary
 * Contains everything needed to evaluate a decision
 */
export interface GovernanceBoundaryRequest {
  /** The decision to evaluate (from Phase 3) */
  readonly decision: ContrastDecision;

  /** Context for policy matching */
  readonly context: PolicyContext;

  /** Specific policies to apply (empty = all applicable) */
  readonly policyIds?: ReadonlyArray<PolicyId>;

  /** Whether to attempt automatic adjustments */
  readonly autoAdjust: boolean;

  /** Maximum adjustment iterations */
  readonly maxIterations: number;
}

/**
 * Response from the governance boundary
 */
export interface GovernanceBoundaryResponse {
  /** Overall outcome */
  readonly outcome: GovernanceOutcome;

  /** Original decision */
  readonly originalDecision: ContrastDecision;

  /** Final decision (may be adjusted) */
  readonly finalDecision: ContrastDecision;

  /** Whether adjustments were made */
  readonly wasAdjusted: boolean;

  /** Adjustments that were applied */
  readonly appliedAdjustments: ReadonlyArray<AppliedAdjustmentRecord>;

  /** Violations found */
  readonly violations: ReadonlyArray<PolicyViolation>;

  /** Warning messages */
  readonly warnings: ReadonlyArray<string>;

  /** Evaluation metadata */
  readonly metadata: GovernanceMetadata;
}

/**
 * Record of an adjustment that was applied
 */
export interface AppliedAdjustmentRecord {
  /** The specification that was requested */
  readonly specification: AdjustmentSpecification;

  /** Whether it was successfully applied */
  readonly success: boolean;

  /** Error message if failed */
  readonly error?: string;

  /** Value before adjustment */
  readonly before: string | number;

  /** Value after adjustment */
  readonly after: string | number;

  /** Number of iterations needed */
  readonly iterations: number;
}

/**
 * Metadata about the governance evaluation
 */
export interface GovernanceMetadata {
  /** Policies that were evaluated */
  readonly evaluatedPolicies: ReadonlyArray<{
    readonly id: PolicyId;
    readonly name: string;
    readonly passed: boolean;
  }>;

  /** Total evaluation time (ms) */
  readonly evaluationTimeMs: number;

  /** Governance engine version */
  readonly engineVersion: string;

  /** ISO timestamp */
  readonly timestamp: string;
}

// ============================================
// Adjustment Delegation Contract
// ============================================

/**
 * Delegation request for color adjustments
 *
 * The Governance Engine creates these to delegate
 * actual color calculations to the Decision Engine.
 *
 * This enforces the boundary: Governance specifies
 * WHAT to adjust, Decision Engine performs HOW.
 */
export interface AdjustmentDelegation {
  /** Unique delegation ID for tracking */
  readonly delegationId: string;

  /** The current decision to adjust */
  readonly currentDecision: ContrastDecision;

  /** Adjustment specifications to apply */
  readonly specifications: ReadonlyArray<AdjustmentSpecification>;

  /** Target accessibility requirements */
  readonly targetRequirements: {
    readonly minApcaLc?: number;
    readonly minWcagLevel?: string;
    readonly minWcag3Tier?: string;
  };

  /** Constraints on the adjustment */
  readonly constraints: AdjustmentConstraints;
}

/**
 * Constraints that must be respected during adjustment
 */
export interface AdjustmentConstraints {
  /** Preserve original hue */
  readonly preserveHue: boolean;

  /** Maximum hue shift in degrees */
  readonly maxHueShift: number;

  /** Maximum chroma reduction (percentage) */
  readonly maxChromaReduction: number;

  /** Minimum lightness value */
  readonly minLightness: number;

  /** Maximum lightness value */
  readonly maxLightness: number;

  /** Prefer adjusting foreground over background */
  readonly preferForegroundAdjustment: boolean;
}

/**
 * Default adjustment constraints
 */
export const DEFAULT_ADJUSTMENT_CONSTRAINTS: AdjustmentConstraints = {
  preserveHue: true,
  maxHueShift: 10,
  maxChromaReduction: 25,
  minLightness: 5,
  maxLightness: 95,
  preferForegroundAdjustment: true,
};

/**
 * Result of an adjustment delegation
 */
export interface AdjustmentDelegationResult {
  /** Delegation ID (matches request) */
  readonly delegationId: string;

  /** Whether adjustment succeeded */
  readonly success: boolean;

  /** Adjusted decision (null if failed) */
  readonly adjustedDecision: ContrastDecision | null;

  /** Error message if failed */
  readonly error?: string;

  /** Number of iterations performed */
  readonly iterations: number;

  /** Which specifications were applied */
  readonly appliedSpecifications: ReadonlyArray<{
    readonly specification: AdjustmentSpecification;
    readonly applied: boolean;
    readonly reason?: string;
  }>;
}

// ============================================
// Governance Boundary Interface
// ============================================

/**
 * The Governance Boundary Interface
 *
 * This is the primary contract between the Governance Layer
 * and the rest of the system. All governance operations
 * go through this interface.
 *
 * BOUNDARY RULES:
 * 1. Input decisions come from the Decision Engine
 * 2. Output decisions may be adjusted versions
 * 3. Adjustments are delegated, not performed directly
 * 4. All operations are auditable
 */
export interface IGovernanceBoundary {
  /**
   * Evaluate a decision against governance policies
   */
  evaluate(request: GovernanceBoundaryRequest): Promise<GovernanceBoundaryResponse>;

  /**
   * Check if a decision would pass governance
   * (without performing adjustments)
   */
  check(
    decision: ContrastDecision,
    context: PolicyContext
  ): Promise<GovernanceCheckResult>;

  /**
   * Delegate an adjustment to the Decision Engine
   */
  delegateAdjustment(
    delegation: AdjustmentDelegation
  ): Promise<AdjustmentDelegationResult>;

  /**
   * Get applicable policies for a context
   */
  getApplicablePolicies(context: PolicyContext): ReadonlyArray<PerceptualPolicy>;

  /**
   * Validate a policy configuration
   */
  validatePolicy(policy: PerceptualPolicy): PolicyValidationResult;
}

/**
 * Result of a governance check (without adjustment)
 */
export interface GovernanceCheckResult {
  /** Would the decision pass? */
  readonly wouldPass: boolean;

  /** Violations that would occur */
  readonly violations: ReadonlyArray<PolicyViolation>;

  /** Suggested adjustments to pass */
  readonly suggestedAdjustments: ReadonlyArray<AdjustmentSpecification>;
}

/**
 * Result of policy validation
 */
export interface PolicyValidationResult {
  /** Is the policy valid? */
  readonly valid: boolean;

  /** Validation errors */
  readonly errors: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
    readonly code: string;
  }>;

  /** Validation warnings */
  readonly warnings: ReadonlyArray<{
    readonly field: string;
    readonly message: string;
  }>;
}

// ============================================
// Boundary Enforcement Utilities
// ============================================

/**
 * Validate that a request respects governance boundaries
 */
export function validateBoundaryRequest(
  request: GovernanceBoundaryRequest
): BoundaryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Decision must exist
  if (!request.decision) {
    errors.push('Decision is required');
  }

  // Context must exist
  if (!request.context) {
    errors.push('Policy context is required');
  }

  // Max iterations must be reasonable
  if (request.maxIterations < 1) {
    errors.push('maxIterations must be at least 1');
  }
  if (request.maxIterations > 20) {
    warnings.push('High maxIterations (>20) may impact performance');
  }

  // Policy IDs should be valid
  if (request.policyIds) {
    for (const id of request.policyIds) {
      if (!id || typeof id !== 'string') {
        errors.push(`Invalid policy ID: ${id}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Result of boundary validation
 */
export interface BoundaryValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Create a governance boundary request
 */
export function createBoundaryRequest(
  decision: ContrastDecision,
  context: PolicyContext,
  options?: {
    policyIds?: ReadonlyArray<PolicyId>;
    autoAdjust?: boolean;
    maxIterations?: number;
  }
): GovernanceBoundaryRequest {
  return {
    decision,
    context,
    policyIds: options?.policyIds,
    autoAdjust: options?.autoAdjust ?? false,
    maxIterations: options?.maxIterations ?? 5,
  };
}

/**
 * Create an adjustment delegation
 */
export function createAdjustmentDelegation(
  currentDecision: ContrastDecision,
  specifications: ReadonlyArray<AdjustmentSpecification>,
  options?: {
    targetRequirements?: AdjustmentDelegation['targetRequirements'];
    constraints?: Partial<AdjustmentConstraints>;
  }
): AdjustmentDelegation {
  return {
    delegationId: `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentDecision,
    specifications,
    targetRequirements: options?.targetRequirements ?? {},
    constraints: {
      ...DEFAULT_ADJUSTMENT_CONSTRAINTS,
      ...options?.constraints,
    },
  };
}

// ============================================
// Boundary Error Types
// ============================================

/**
 * Error thrown when governance boundary is violated
 */
export class GovernanceBoundaryError extends Error {
  constructor(
    message: string,
    public readonly code: GovernanceBoundaryErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GovernanceBoundaryError';
  }
}

/**
 * Error codes for boundary violations
 */
export type GovernanceBoundaryErrorCode =
  | 'INVALID_REQUEST'        // Request doesn't meet contract
  | 'POLICY_NOT_FOUND'       // Referenced policy doesn't exist
  | 'DELEGATION_FAILED'      // Adjustment delegation failed
  | 'MAX_ITERATIONS'         // Exceeded maximum adjustment iterations
  | 'CONSTRAINT_VIOLATION'   // Adjustment would violate constraints
  | 'AUDIT_FAILURE';         // Failed to create audit record

/**
 * Create a boundary error
 */
export function createBoundaryError(
  code: GovernanceBoundaryErrorCode,
  message: string,
  details?: Record<string, unknown>
): GovernanceBoundaryError {
  return new GovernanceBoundaryError(message, code, details);
}
