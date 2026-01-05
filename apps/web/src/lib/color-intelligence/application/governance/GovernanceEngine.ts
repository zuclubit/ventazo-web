// ============================================
// Governance Engine
// Phase 4: Governance & Adoption Layer
// ============================================
//
// The GovernanceEngine is the main orchestrator for policy
// evaluation and enforcement. It coordinates between:
// - PolicyRegistry (policy management)
// - DecisionEnginePort (color operations)
// - Audit logging
//
// CRITICAL PRINCIPLE:
// Governance NEVER performs color calculations. It only:
// 1. Evaluates decisions against policies
// 2. Specifies what adjustments are needed
// 3. Delegates color operations to the Decision Engine
//
// ============================================

import type { ContrastDecision } from '../../domain/types/decision';
import type {
  IGovernanceBoundary,
  GovernanceBoundaryRequest,
  GovernanceBoundaryResponse,
  GovernanceCheckResult,
  PolicyValidationResult,
  AdjustmentDelegation,
  AdjustmentDelegationResult,
  AppliedAdjustmentRecord,
  GovernanceMetadata,
  AdjustmentConstraints,
} from '../../domain/governance/contracts/GovernanceBoundary';
import {
  validateBoundaryRequest,
  createAdjustmentDelegation,
  DEFAULT_ADJUSTMENT_CONSTRAINTS,
  GovernanceBoundaryError,
} from '../../domain/governance/contracts/GovernanceBoundary';
import type {
  IDecisionEnginePort,
  AdjustmentTarget,
  AdjustmentConstraintsInput,
} from '../../domain/governance/ports/DecisionEnginePort';
import type {
  PerceptualPolicy,
  PolicyContext,
  PolicyId,
  PolicyPriority,
  AccessibilityRequirements,
} from '../../domain/governance/types/policy';
import {
  PRIORITY_ORDER,
  validatePolicy,
  contextMatches,
  policyVersion,
} from '../../domain/governance/types/policy';
import type {
  CompositePolicy,
  PolicyRule,
  ResolvedPolicy,
} from '../../domain/governance/types/policy-composition';
import { isCompositePolicy } from '../../domain/governance/types/policy-composition';
import type {
  GovernanceOutcome,
  GovernanceEvaluation,
  PolicyEvaluationResult,
  RuleEvaluationResult,
  PolicyViolation,
  AdjustmentSpecification,
  AppliedAdjustment,
  AuditEntry,
  GovernanceSummary,
  GovernanceEvaluationRequest,
} from '../../domain/governance/types/evaluation';
import {
  OUTCOME_SEVERITY,
  createViolation,
  createAuditEntry,
  generateAuditHash,
  extractSummary,
} from '../../domain/governance/types/evaluation';
import type { PolicyRegistry } from './PolicyRegistry';

// ============================================
// Engine Configuration
// ============================================

export interface GovernanceEngineConfig {
  /** Engine version for audit trail */
  readonly version: string;

  /** Default maximum adjustment iterations */
  readonly defaultMaxIterations: number;

  /** Default adjustment constraints */
  readonly defaultConstraints: AdjustmentConstraints;

  /** Whether to enable detailed audit logging */
  readonly enableDetailedAudit: boolean;

  /** Whether to cache evaluation results */
  readonly enableEvaluationCache: boolean;

  /** Evaluation cache TTL in milliseconds */
  readonly evaluationCacheTtlMs: number;

  /** Maximum cached evaluations */
  readonly maxCachedEvaluations: number;

  /** Whether to emit events */
  readonly enableEvents: boolean;

  /** Strategy for handling multiple violations */
  readonly violationStrategy: 'first' | 'all' | 'priority';

  /** Whether to allow partial adjustments */
  readonly allowPartialAdjustments: boolean;
}

const DEFAULT_ENGINE_CONFIG: GovernanceEngineConfig = {
  version: '1.0.0',
  defaultMaxIterations: 5,
  defaultConstraints: DEFAULT_ADJUSTMENT_CONSTRAINTS,
  enableDetailedAudit: true,
  enableEvaluationCache: true,
  evaluationCacheTtlMs: 60_000, // 1 minute
  maxCachedEvaluations: 500,
  enableEvents: true,
  violationStrategy: 'all',
  allowPartialAdjustments: true,
};

// ============================================
// Event Types
// ============================================

export type GovernanceEngineEventType =
  | 'evaluation-started'
  | 'evaluation-completed'
  | 'policy-evaluated'
  | 'violation-detected'
  | 'adjustment-started'
  | 'adjustment-completed'
  | 'adjustment-failed'
  | 'cache-hit'
  | 'cache-miss';

export interface GovernanceEngineEvent {
  readonly type: GovernanceEngineEventType;
  readonly timestamp: string;
  readonly payload: unknown;
}

export type GovernanceEngineEventListener = (event: GovernanceEngineEvent) => void;

// ============================================
// Metrics Types
// ============================================

export interface GovernanceEngineMetrics {
  readonly totalEvaluations: number;
  readonly approvedCount: number;
  readonly adjustedCount: number;
  readonly rejectedCount: number;
  readonly conditionalCount: number;
  readonly totalAdjustmentAttempts: number;
  readonly successfulAdjustments: number;
  readonly failedAdjustments: number;
  readonly avgEvaluationTimeMs: number;
  readonly avgAdjustmentTimeMs: number;
  readonly cacheHitRate: number;
  readonly violationsByPolicy: Readonly<Record<string, number>>;
}

// ============================================
// Evaluation Cache Entry
// ============================================

interface EvaluationCacheEntry {
  readonly evaluation: GovernanceEvaluation;
  readonly cachedAt: number;
  readonly expiresAt: number;
}

// ============================================
// Governance Engine Class
// ============================================

/**
 * GovernanceEngine - Main orchestrator for policy enforcement
 *
 * Implements IGovernanceBoundary to provide governance services.
 *
 * Flow:
 * 1. Receive request with decision and context
 * 2. Find applicable policies from registry
 * 3. Evaluate decision against each policy (priority order)
 * 4. If violations found and autoAdjust enabled:
 *    a. Create adjustment specifications
 *    b. Delegate adjustments to Decision Engine
 *    c. Re-evaluate adjusted decision
 * 5. Return GovernanceEvaluation with full audit trail
 *
 * @example
 * ```typescript
 * const engine = new GovernanceEngine(
 *   policyRegistry,
 *   decisionEnginePort,
 *   { enableDetailedAudit: true }
 * );
 *
 * await engine.initialize();
 *
 * const result = await engine.evaluate({
 *   decision: contrastDecision,
 *   context: { colorScheme: 'dark', component: 'Button' },
 *   autoAdjust: true,
 *   maxIterations: 5,
 * });
 *
 * if (result.outcome === 'approved') {
 *   // Use result.finalDecision
 * }
 * ```
 */
export class GovernanceEngine implements IGovernanceBoundary {
  private readonly config: GovernanceEngineConfig;
  private readonly evaluationCache: Map<string, EvaluationCacheEntry> = new Map();
  private readonly eventListeners: Set<GovernanceEngineEventListener> = new Set();
  private readonly metrics: {
    totalEvaluations: number;
    approvedCount: number;
    adjustedCount: number;
    rejectedCount: number;
    conditionalCount: number;
    totalAdjustmentAttempts: number;
    successfulAdjustments: number;
    failedAdjustments: number;
    evaluationTimes: number[];
    adjustmentTimes: number[];
    cacheHits: number;
    cacheMisses: number;
    violationsByPolicy: Map<string, number>;
  };

  private initialized = false;

  constructor(
    private readonly policyRegistry: PolicyRegistry,
    private readonly decisionEngine: IDecisionEnginePort,
    config: Partial<GovernanceEngineConfig> = {}
  ) {
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    this.metrics = {
      totalEvaluations: 0,
      approvedCount: 0,
      adjustedCount: 0,
      rejectedCount: 0,
      conditionalCount: 0,
      totalAdjustmentAttempts: 0,
      successfulAdjustments: 0,
      failedAdjustments: 0,
      evaluationTimes: [],
      adjustmentTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      violationsByPolicy: new Map(),
    };
  }

  // ===== Lifecycle =====

  /**
   * Initialize the governance engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure policy registry is ready
    if (!this.policyRegistry.isReady()) {
      await this.policyRegistry.initialize();
    }

    this.initialized = true;
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.initialized && this.policyRegistry.isReady();
  }

  /**
   * Get engine version
   */
  getVersion(): string {
    return this.config.version;
  }

  // ===== IGovernanceBoundary Implementation =====

  /**
   * Evaluate a decision against governance policies
   */
  async evaluate(request: GovernanceBoundaryRequest): Promise<GovernanceBoundaryResponse> {
    const startTime = performance.now();

    // Validate request
    const validation = validateBoundaryRequest(request);
    if (!validation.valid) {
      throw new GovernanceBoundaryError(
        `Invalid request: ${validation.errors.join(', ')}`,
        'INVALID_REQUEST',
        { errors: validation.errors }
      );
    }

    // Check cache
    const cacheKey = this.generateCacheKey(request);
    if (this.config.enableEvaluationCache && !request.autoAdjust) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.emitEvent('cache-hit', { cacheKey });
        return this.evaluationToResponse(cached, request.decision);
      }
      this.emitEvent('cache-miss', { cacheKey });
    }

    this.emitEvent('evaluation-started', {
      context: request.context,
      autoAdjust: request.autoAdjust,
    });

    // Find applicable policies
    const policies = await this.findApplicablePolicies(request);
    if (policies.length === 0) {
      // No policies apply - auto-approve
      const evaluation = this.createApprovedEvaluation(request.decision, request.context);
      this.cacheEvaluation(cacheKey, evaluation);
      return this.evaluationToResponse(evaluation, request.decision);
    }

    // Sort policies by priority
    const sortedPolicies = this.sortPoliciesByPriority(policies);

    // Evaluate against each policy
    let currentDecision = request.decision;
    const policyResults: PolicyEvaluationResult[] = [];
    const allViolations: PolicyViolation[] = [];
    const allAdjustments: AppliedAdjustment[] = [];
    const appliedRecords: AppliedAdjustmentRecord[] = [];
    let wasAdjusted = false;

    for (const policy of sortedPolicies) {
      const policyResult = await this.evaluatePolicy(currentDecision, policy, request.context);
      policyResults.push(policyResult);

      this.emitEvent('policy-evaluated', {
        policyId: policy.id,
        passed: policyResult.passed,
        violationCount: policyResult.violations.length,
      });

      if (!policyResult.passed) {
        allViolations.push(...policyResult.violations);

        // Track violations by policy
        const count = this.metrics.violationsByPolicy.get(policy.id as string) || 0;
        this.metrics.violationsByPolicy.set(policy.id as string, count + 1);

        for (const violation of policyResult.violations) {
          this.emitEvent('violation-detected', { violation });
        }

        // Attempt adjustment if enabled and policy allows
        if (request.autoAdjust && policy.enforcement !== 'monitoring') {
          const adjustmentResult = await this.attemptAdjustment(
            currentDecision,
            policyResult.violations,
            request.maxIterations,
            request.context
          );

          if (adjustmentResult.success && adjustmentResult.adjustedDecision) {
            currentDecision = adjustmentResult.adjustedDecision;
            wasAdjusted = true;
            allAdjustments.push(...adjustmentResult.appliedAdjustments);
            appliedRecords.push(...adjustmentResult.records);
          }
        }
      }
    }

    // Determine final outcome
    const outcome = this.determineOutcome(
      policyResults,
      allViolations,
      wasAdjusted,
      sortedPolicies
    );

    // Create evaluation
    const evaluationTime = performance.now() - startTime;
    const evaluation = this.createEvaluation(
      request.decision,
      currentDecision,
      outcome,
      policyResults,
      allAdjustments,
      allViolations,
      request.context,
      evaluationTime
    );

    // Update metrics
    this.updateMetrics(outcome, evaluationTime, wasAdjusted);

    // Cache if not adjusted
    if (!wasAdjusted) {
      this.cacheEvaluation(cacheKey, evaluation);
    }

    this.emitEvent('evaluation-completed', {
      outcome,
      evaluationTimeMs: evaluationTime,
      policyCount: policies.length,
      violationCount: allViolations.length,
      wasAdjusted,
    });

    return {
      outcome,
      originalDecision: request.decision,
      finalDecision: currentDecision,
      wasAdjusted,
      appliedAdjustments: appliedRecords,
      violations: allViolations,
      warnings: this.extractWarnings(policyResults),
      metadata: this.createMetadata(policyResults, evaluationTime),
    };
  }

  /**
   * Check if a decision would pass governance (without adjustments)
   */
  async check(
    decision: ContrastDecision,
    context: PolicyContext
  ): Promise<GovernanceCheckResult> {
    const policies = await this.policyRegistry.findForContext(context);
    const violations: PolicyViolation[] = [];
    const suggestedAdjustments: AdjustmentSpecification[] = [];

    for (const policy of policies) {
      const result = await this.evaluatePolicy(decision, policy, context);
      if (!result.passed) {
        violations.push(...result.violations);
        // Extract adjustments from violations' remediation suggestions
        for (const v of result.violations) {
          if (v.remediationSuggestion) {
            suggestedAdjustments.push({
              target: 'foreground',
              operation: 'increase',
              magnitude: 10,
              unit: 'Lc',
              reason: v.remediationSuggestion,
            });
          }
        }
      }
    }

    return {
      wouldPass: violations.length === 0,
      violations,
      suggestedAdjustments,
    };
  }

  /**
   * Delegate an adjustment to the Decision Engine
   */
  async delegateAdjustment(
    delegation: AdjustmentDelegation
  ): Promise<AdjustmentDelegationResult> {
    const startTime = performance.now();

    this.emitEvent('adjustment-started', {
      delegationId: delegation.delegationId,
      specificationCount: delegation.specifications.length,
    });

    this.metrics.totalAdjustmentAttempts++;

    try {
      // Apply the delegation through the decision engine
      const result = this.decisionEngine.applyAdjustment(delegation);

      const adjustmentTime = performance.now() - startTime;
      this.metrics.adjustmentTimes.push(adjustmentTime);

      if (result.success) {
        this.metrics.successfulAdjustments++;
        this.emitEvent('adjustment-completed', {
          delegationId: delegation.delegationId,
          adjustmentTimeMs: adjustmentTime,
        });
      } else {
        this.metrics.failedAdjustments++;
        this.emitEvent('adjustment-failed', {
          delegationId: delegation.delegationId,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      this.metrics.failedAdjustments++;
      this.emitEvent('adjustment-failed', {
        delegationId: delegation.delegationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        delegationId: delegation.delegationId,
        success: false,
        adjustedDecision: null,
        error: error instanceof Error ? error.message : 'Adjustment failed',
        iterations: 0,
        appliedSpecifications: delegation.specifications.map(spec => ({
          specification: spec,
          applied: false,
          reason: 'Adjustment delegation failed',
        })),
      };
    }
  }

  /**
   * Get applicable policies for a context
   */
  getApplicablePolicies(context: PolicyContext): ReadonlyArray<PerceptualPolicy> {
    // Sync version - returns cached policies
    // For full resolution, use findApplicablePolicies (async)
    const allPolicies = this.policyRegistry.getAllSync();
    return allPolicies.filter(policy =>
      policy.enabled && contextMatches(context, policy.applicableContexts)
    );
  }

  /**
   * Validate a policy configuration
   */
  validatePolicy(policy: PerceptualPolicy): PolicyValidationResult {
    const result = validatePolicy(policy);
    return {
      valid: result.valid,
      errors: result.errors.map(e => ({
        field: e.field,
        message: e.message,
        code: e.code,
      })),
      warnings: result.warnings.map(w => ({
        field: w.field,
        message: w.message,
      })),
    };
  }

  // ===== Additional Public Methods =====

  /**
   * Get governance summary for a decision
   */
  async getSummary(
    decision: ContrastDecision,
    context: PolicyContext
  ): Promise<GovernanceSummary> {
    const checkResult = await this.check(decision, context);
    const policies = await this.policyRegistry.findForContext(context);
    const passedCount = policies.length - checkResult.violations.length;
    const warningCount = checkResult.violations.filter(v => v.severity === 'warning').length;

    return {
      outcome: checkResult.wouldPass ? 'approved' : 'rejected',
      score: decision.score as number,
      passed: checkResult.wouldPass,
      policyCount: policies.length,
      passedCount,
      failedCount: policies.length - passedCount,
      violationCount: checkResult.violations.length,
      warningCount,
      wasAdjusted: false,
      evaluationTimeMs: 0,
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): GovernanceEngineMetrics {
    const evaluationTimes = this.metrics.evaluationTimes;
    const adjustmentTimes = this.metrics.adjustmentTimes;
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;

    return {
      totalEvaluations: this.metrics.totalEvaluations,
      approvedCount: this.metrics.approvedCount,
      adjustedCount: this.metrics.adjustedCount,
      rejectedCount: this.metrics.rejectedCount,
      conditionalCount: this.metrics.conditionalCount,
      totalAdjustmentAttempts: this.metrics.totalAdjustmentAttempts,
      successfulAdjustments: this.metrics.successfulAdjustments,
      failedAdjustments: this.metrics.failedAdjustments,
      avgEvaluationTimeMs:
        evaluationTimes.length > 0
          ? evaluationTimes.reduce((a, b) => a + b, 0) / evaluationTimes.length
          : 0,
      avgAdjustmentTimeMs:
        adjustmentTimes.length > 0
          ? adjustmentTimes.reduce((a, b) => a + b, 0) / adjustmentTimes.length
          : 0,
      cacheHitRate: totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0,
      violationsByPolicy: Object.fromEntries(this.metrics.violationsByPolicy),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics.totalEvaluations = 0;
    this.metrics.approvedCount = 0;
    this.metrics.adjustedCount = 0;
    this.metrics.rejectedCount = 0;
    this.metrics.conditionalCount = 0;
    this.metrics.totalAdjustmentAttempts = 0;
    this.metrics.successfulAdjustments = 0;
    this.metrics.failedAdjustments = 0;
    this.metrics.evaluationTimes = [];
    this.metrics.adjustmentTimes = [];
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
    this.metrics.violationsByPolicy.clear();
  }

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  // ===== Event Handling =====

  /**
   * Add event listener
   */
  addEventListener(listener: GovernanceEngineEventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: GovernanceEngineEventListener): void {
    this.eventListeners.delete(listener);
  }

  // ===== Private Methods =====

  private async findApplicablePolicies(
    request: GovernanceBoundaryRequest
  ): Promise<ReadonlyArray<PerceptualPolicy>> {
    // If specific policies requested, fetch them
    if (request.policyIds && request.policyIds.length > 0) {
      const policies: PerceptualPolicy[] = [];
      for (const id of request.policyIds) {
        const policy = await this.policyRegistry.get(id);
        if (policy && policy.enabled) {
          policies.push(policy);
        }
      }
      return policies;
    }

    // Otherwise, find by context
    return this.policyRegistry.findForContext(request.context);
  }

  private sortPoliciesByPriority(
    policies: ReadonlyArray<PerceptualPolicy>
  ): ReadonlyArray<PerceptualPolicy> {
    return [...policies].sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      // Secondary sort by enforcement (strict first)
      const enforcementOrder = { strict: 0, advisory: 1, monitoring: 2 };
      return enforcementOrder[a.enforcement] - enforcementOrder[b.enforcement];
    });
  }

  private async evaluatePolicy(
    decision: ContrastDecision,
    policy: PerceptualPolicy,
    context: PolicyContext
  ): Promise<PolicyEvaluationResult> {
    const startTime = performance.now();
    const violations: PolicyViolation[] = [];
    const ruleResults: RuleEvaluationResult[] = [];
    const suggestedAdjustments: AdjustmentSpecification[] = [];

    // Get resolved policy (with inheritance applied)
    const resolved = await this.policyRegistry.getResolved(policy.id);
    const requirements = resolved?.mergedRequirements || policy.requirements;

    // Evaluate requirements
    this.evaluateRequirements(decision, requirements, policy.id, violations, suggestedAdjustments);

    // Evaluate rules if composite policy
    if (isCompositePolicy(policy)) {
      const compositePolicy = policy as CompositePolicy;
      for (const rule of compositePolicy.rules) {
        if (rule.enabled) {
          const ruleResult = this.evaluateRule(decision, rule, policy, context);
          ruleResults.push(ruleResult);
          if (!ruleResult.passed && ruleResult.violation) {
            violations.push(ruleResult.violation);
          }
        }
      }
    }

    const evaluationTime = performance.now() - startTime;

    return {
      policyId: policy.id,
      policyVersion: policy.version,
      policyName: policy.name,
      passed: violations.length === 0,
      violations,
      warnings: [],
      score: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 20),
      enforcement: policy.enforcement,
      priority: policy.priority,
      ruleResults,
      evaluationTimeMs: evaluationTime,
    };
  }

  private evaluateRequirements(
    decision: ContrastDecision,
    requirements: AccessibilityRequirements,
    policyId: PolicyId,
    violations: PolicyViolation[],
    adjustments: AdjustmentSpecification[]
  ): void {
    // Stub policy info for createViolation
    const policyInfo = { id: policyId, version: policyVersion.unsafe('1.0.0'), name: 'Policy' };
    const emptyContext: PolicyContext = {};

    // Check minimum APCA Lc
    if (requirements.minApcaLc !== undefined) {
      const actualLc = Math.abs(decision.apcaLc);
      if (actualLc < requirements.minApcaLc) {
        violations.push(createViolation(
          policyInfo,
          'error',
          `APCA Lc (${actualLc.toFixed(1)}) is below minimum (${requirements.minApcaLc})`,
          `>= ${requirements.minApcaLc}`,
          actualLc.toString(),
          emptyContext,
          {
            ruleId: 'min-apca-lc' as any,
            remediationSuggestion: `Increase contrast by adjusting foreground or background lightness`,
          }
        ));

        adjustments.push({
          target: 'foreground',
          operation: 'increase',
          magnitude: requirements.minApcaLc - actualLc,
          unit: 'Lc',
          reason: `Increase APCA Lc to meet minimum of ${requirements.minApcaLc}`,
        });
      }
    }

    // Check minimum contrast ratio
    if (requirements.minContrastRatio !== undefined) {
      const actualRatio = decision.wcag21Ratio;
      if (actualRatio < requirements.minContrastRatio) {
        violations.push(createViolation(
          policyInfo,
          'error',
          `Contrast ratio (${actualRatio.toFixed(2)}:1) is below minimum (${requirements.minContrastRatio}:1)`,
          `>= ${requirements.minContrastRatio}:1`,
          `${actualRatio.toFixed(2)}:1`,
          emptyContext,
          {
            ruleId: 'min-contrast-ratio' as any,
            remediationSuggestion: 'Increase contrast between foreground and background',
          }
        ));
      }
    }

    // Check WCAG level
    if (requirements.minWcagLevel !== undefined) {
      if (!this.decisionEngine.meetsWcagLevel(decision, requirements.minWcagLevel)) {
        violations.push(createViolation(
          policyInfo,
          'error',
          `Decision does not meet WCAG ${requirements.minWcagLevel} level`,
          requirements.minWcagLevel,
          decision.wcagLevel,
          emptyContext,
          {
            ruleId: 'min-wcag-level' as any,
            remediationSuggestion: `Adjust colors to meet WCAG ${requirements.minWcagLevel}`,
          }
        ));
      }
    }

    // Check WCAG 3.0 tier
    if (requirements.minWcag3Tier !== undefined) {
      if (!this.decisionEngine.meetsWcag3Tier(decision, requirements.minWcag3Tier)) {
        violations.push(createViolation(
          policyInfo,
          'error',
          `Decision does not meet WCAG 3.0 ${requirements.minWcag3Tier} tier`,
          requirements.minWcag3Tier,
          decision.wcag3Tier,
          emptyContext,
          {
            ruleId: 'min-wcag3-tier' as any,
            remediationSuggestion: `Adjust colors to meet WCAG 3.0 ${requirements.minWcag3Tier}`,
          }
        ));
      }
    }

    // Check font size
    if (requirements.minFontSizePx !== undefined) {
      const readability = decision.readabilityContext;
      if (readability && (readability.fontSize as number) < requirements.minFontSizePx) {
        violations.push(createViolation(
          policyInfo,
          'warning',
          `Font size (${readability.fontSize}px) is below minimum (${requirements.minFontSizePx}px)`,
          `>= ${requirements.minFontSizePx}px`,
          `${readability.fontSize}px`,
          emptyContext,
          {
            ruleId: 'min-font-size' as any,
            remediationSuggestion: `Increase font size to at least ${requirements.minFontSizePx}px`,
          }
        ));

        adjustments.push({
          target: 'fontSize',
          operation: 'setMinimum',
          magnitude: requirements.minFontSizePx,
          unit: 'px',
          reason: `Set font size to minimum of ${requirements.minFontSizePx}px`,
        });
      }
    }
  }

  private evaluateRule(
    decision: ContrastDecision,
    rule: PolicyRule,
    policy: PerceptualPolicy,
    context: PolicyContext
  ): RuleEvaluationResult {
    const condition = rule.condition;
    let passed = false;
    let actualValue: unknown = '';
    let expectedCondition = '';

    // Evaluate based on condition target and operator
    switch (condition.target) {
      case 'apcaLc': {
        const value = Math.abs(decision.apcaLc);
        actualValue = value;
        expectedCondition = `${condition.operator} ${condition.value}`;
        passed = this.evaluateCondition(value, condition.operator, condition.value as number);
        break;
      }
      case 'contrastRatio': {
        const value = decision.wcag21Ratio;
        actualValue = value;
        expectedCondition = `${condition.operator} ${condition.value}`;
        passed = this.evaluateCondition(value, condition.operator, condition.value as number);
        break;
      }
      case 'wcagLevel': {
        const levels = ['Fail', 'A', 'AA', 'AAA'];
        const actualIndex = levels.indexOf(decision.wcagLevel);
        const expectedIndex = levels.indexOf(condition.value as string);
        actualValue = decision.wcagLevel;
        expectedCondition = `${condition.operator} ${condition.value}`;
        passed = this.evaluateCondition(actualIndex, condition.operator, expectedIndex);
        break;
      }
      case 'wcag3Tier': {
        const tiers = ['Fail', 'Bronze', 'Silver', 'Gold', 'Platinum'];
        const actualIndex = tiers.indexOf(decision.wcag3Tier);
        const expectedIndex = tiers.indexOf(condition.value as string);
        actualValue = decision.wcag3Tier;
        expectedCondition = `${condition.operator} ${condition.value}`;
        passed = this.evaluateCondition(actualIndex, condition.operator, expectedIndex);
        break;
      }
      default:
        // Unknown target - pass by default with warning
        passed = true;
        actualValue = 'unknown';
        expectedCondition = 'unknown';
    }

    // Build violation if rule failed
    let violation: PolicyViolation | undefined;
    if (!passed) {
      violation = createViolation(
        { id: policy.id, version: policy.version, name: policy.name },
        rule.severity,
        rule.message.replace('{value}', String(actualValue)).replace('{expected}', String(condition.value)),
        expectedCondition,
        String(actualValue),
        context,
        {
          ruleId: rule.id,
          ruleName: rule.name,
          remediationSuggestion: `Adjust to satisfy ${expectedCondition}`,
        }
      );
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      passed,
      actualValue,
      expectedCondition,
      violation,
    };
  }

  private evaluateCondition(
    actual: number,
    operator: string,
    expected: number
  ): boolean {
    switch (operator) {
      case 'gte':
      case '>=':
        return actual >= expected;
      case 'gt':
      case '>':
        return actual > expected;
      case 'lte':
      case '<=':
        return actual <= expected;
      case 'lt':
      case '<':
        return actual < expected;
      case 'eq':
      case '===':
        return actual === expected;
      case 'neq':
      case '!==':
        return actual !== expected;
      default:
        return true;
    }
  }

  private async attemptAdjustment(
    decision: ContrastDecision,
    violations: ReadonlyArray<PolicyViolation>,
    maxIterations: number,
    _context: PolicyContext
  ): Promise<{
    success: boolean;
    adjustedDecision: ContrastDecision | null;
    appliedAdjustments: AppliedAdjustment[];
    records: AppliedAdjustmentRecord[];
  }> {
    // Create adjustment specifications from violations
    const specifications: AdjustmentSpecification[] = [];

    for (const violation of violations) {
      // Find the appropriate adjustment based on violation
      const spec = this.violationToAdjustmentSpec(violation);
      if (spec) {
        specifications.push(spec);
      }
    }

    if (specifications.length === 0) {
      return {
        success: false,
        adjustedDecision: null,
        appliedAdjustments: [],
        records: [],
      };
    }

    // Create delegation
    const delegation = createAdjustmentDelegation(decision, specifications, {
      targetRequirements: this.extractTargetRequirements(violations),
      constraints: this.config.defaultConstraints,
    });

    // Delegate to decision engine
    const result = await this.delegateAdjustment(delegation);

    // Convert to applied adjustments
    const appliedAdjustments: AppliedAdjustment[] = result.appliedSpecifications
      .filter(s => s.applied)
      .map(s => ({
        specification: s.specification,
        originalValue: this.getValueForTarget(decision, s.specification.target),
        adjustedValue: result.adjustedDecision
          ? this.getValueForTarget(result.adjustedDecision, s.specification.target)
          : 'N/A',
        success: true,
        iterations: result.iterations,
      }));

    const records: AppliedAdjustmentRecord[] = result.appliedSpecifications.map(s => ({
      specification: s.specification,
      success: s.applied,
      error: s.reason,
      before: this.getValueForTarget(decision, s.specification.target),
      after: result.adjustedDecision
        ? this.getValueForTarget(result.adjustedDecision, s.specification.target)
        : 'N/A',
      iterations: result.iterations,
    }));

    return {
      success: result.success,
      adjustedDecision: result.adjustedDecision,
      appliedAdjustments,
      records,
    };
  }

  private violationToAdjustmentSpec(violation: PolicyViolation): AdjustmentSpecification | null {
    // Parse violation to determine adjustment
    if (violation.ruleId === 'min-apca-lc') {
      const expected = parseFloat(violation.expected.replace('>= ', ''));
      const actual = parseFloat(violation.actual);
      if (!isNaN(expected) && !isNaN(actual)) {
        return {
          target: 'foreground',
          operation: 'increase',
          magnitude: expected - actual,
          unit: 'Lc',
          constraints: { preserveHue: true },
          reason: violation.message,
        };
      }
    }

    if (violation.ruleId === 'min-font-size') {
      const expected = parseFloat(violation.expected.replace('>= ', '').replace('px', ''));
      if (!isNaN(expected)) {
        return {
          target: 'fontSize',
          operation: 'setMinimum',
          magnitude: expected,
          unit: 'px',
          reason: violation.message,
        };
      }
    }

    return null;
  }

  private extractTargetRequirements(
    violations: ReadonlyArray<PolicyViolation>
  ): AdjustmentDelegation['targetRequirements'] {
    // Build mutable object then return as readonly
    const requirements: {
      minApcaLc?: number;
      minWcagLevel?: string;
      minWcag3Tier?: string;
    } = {};

    for (const violation of violations) {
      if (violation.ruleId === 'min-apca-lc') {
        const match = violation.expected.match(/>= (\d+\.?\d*)/);
        if (match && match[1]) {
          requirements.minApcaLc = parseFloat(match[1]);
        }
      }
      if (violation.ruleId === 'min-wcag-level') {
        requirements.minWcagLevel = violation.expected;
      }
      if (violation.ruleId === 'min-wcag3-tier') {
        requirements.minWcag3Tier = violation.expected;
      }
    }

    return requirements as AdjustmentDelegation['targetRequirements'];
  }

  private getValueForTarget(
    decision: ContrastDecision,
    target: string
  ): string | number {
    switch (target) {
      case 'foreground':
        return decision.foreground;
      case 'background':
        return decision.background;
      case 'fontSize':
        return (decision.readabilityContext?.fontSize as number) ?? 'N/A';
      case 'fontWeight':
        return (decision.readabilityContext?.fontWeight as number) ?? 'N/A';
      default:
        return 'N/A';
    }
  }

  private determineOutcome(
    policyResults: ReadonlyArray<PolicyEvaluationResult>,
    violations: ReadonlyArray<PolicyViolation>,
    wasAdjusted: boolean,
    policies: ReadonlyArray<PerceptualPolicy>
  ): GovernanceOutcome {
    // If no violations, approved
    if (violations.length === 0) {
      return wasAdjusted ? 'adjusted' : 'approved';
    }

    // Check if any critical policy with strict enforcement failed
    const criticalFailures = violations.filter(v => {
      const policy = policies.find(p => p.id === v.policyId);
      return policy?.priority === 'critical' && policy?.enforcement === 'strict';
    });

    if (criticalFailures.length > 0) {
      return 'rejected';
    }

    // Check if only warnings remain
    const errorViolations = violations.filter(v => v.severity === 'error');
    if (errorViolations.length === 0) {
      return wasAdjusted ? 'adjusted' : 'conditional';
    }

    // Has errors but not critical - conditional
    return 'conditional';
  }

  private createEvaluation(
    originalDecision: ContrastDecision,
    finalDecision: ContrastDecision,
    outcome: GovernanceOutcome,
    policyResults: ReadonlyArray<PolicyEvaluationResult>,
    adjustments: ReadonlyArray<AppliedAdjustment>,
    violations: ReadonlyArray<PolicyViolation>,
    context: PolicyContext,
    evaluationTimeMs: number
  ): GovernanceEvaluation {
    // Build audit entry with correct signature
    const passedCount = policyResults.filter(p => p.passed).length;
    const failedCount = policyResults.length - passedCount;

    const auditEntry = createAuditEntry(
      adjustments.length > 0 ? 'adjust' : (violations.length > 0 ? 'reject' : 'approve'),
      {
        foreground: originalDecision.foreground,
        background: originalDecision.background,
        fontSizePx: originalDecision.readabilityContext?.fontSize as number | undefined,
        fontWeight: originalDecision.readabilityContext?.fontWeight as number | undefined,
      },
      {
        outcome,
        score: finalDecision.score as number,
        wcagLevel: finalDecision.wcagLevel,
        wcag3Tier: finalDecision.wcag3Tier,
        wasAdjusted: adjustments.length > 0,
      },
      policyResults.map(r => ({
        id: r.policyId,
        version: r.policyVersion,
        passed: r.passed,
      })),
      {
        violationCount: violations.length,
        adjustmentCount: adjustments.length,
      }
    );

    // Extract warnings from policy results
    const warnings: string[] = policyResults.flatMap(r => [...r.warnings]);

    return {
      originalDecision,
      finalDecision,
      outcome,
      evaluatedPolicies: policyResults,
      policyCount: policyResults.length,
      passedCount,
      failedCount,
      adjustments,
      wasAdjusted: adjustments.length > 0,
      violations,
      warnings,
      info: [],
      context,
      auditEntry,
      evaluatedAt: new Date().toISOString(),
      totalEvaluationTimeMs: evaluationTimeMs,
      engineVersion: this.config.version,
    };
  }

  private createApprovedEvaluation(
    decision: ContrastDecision,
    context: PolicyContext
  ): GovernanceEvaluation {
    return this.createEvaluation(
      decision,
      decision,
      'approved',
      [],
      [],
      [],
      context,
      0
    );
  }

  private evaluationToResponse(
    evaluation: GovernanceEvaluation,
    originalDecision: ContrastDecision
  ): GovernanceBoundaryResponse {
    return {
      outcome: evaluation.outcome,
      originalDecision,
      finalDecision: evaluation.finalDecision,
      wasAdjusted: evaluation.originalDecision !== evaluation.finalDecision,
      appliedAdjustments: evaluation.adjustments.map(a => ({
        specification: a.specification,
        success: a.success,
        error: a.error,
        before: a.originalValue ?? 'N/A',
        after: a.adjustedValue ?? 'N/A',
        iterations: a.iterations,
      })),
      violations: evaluation.violations,
      warnings: this.extractWarnings(evaluation.evaluatedPolicies),
      metadata: this.createMetadata(
        evaluation.evaluatedPolicies,
        evaluation.totalEvaluationTimeMs
      ),
    };
  }

  private extractWarnings(
    policyResults: ReadonlyArray<PolicyEvaluationResult>
  ): ReadonlyArray<string> {
    const warnings: string[] = [];

    for (const result of policyResults) {
      for (const violation of result.violations) {
        if (violation.severity === 'warning') {
          warnings.push(violation.message);
        }
      }
    }

    return warnings;
  }

  private createMetadata(
    policyResults: ReadonlyArray<PolicyEvaluationResult>,
    evaluationTimeMs: number
  ): GovernanceMetadata {
    return {
      evaluatedPolicies: policyResults.map(r => ({
        id: r.policyId,
        name: r.policyName,
        passed: r.passed,
      })),
      evaluationTimeMs,
      engineVersion: this.config.version,
      timestamp: new Date().toISOString(),
    };
  }

  private updateMetrics(
    outcome: GovernanceOutcome,
    evaluationTime: number,
    wasAdjusted: boolean
  ): void {
    this.metrics.totalEvaluations++;
    this.metrics.evaluationTimes.push(evaluationTime);

    // Keep only last 1000 times for average calculation
    if (this.metrics.evaluationTimes.length > 1000) {
      this.metrics.evaluationTimes.shift();
    }

    switch (outcome) {
      case 'approved':
        this.metrics.approvedCount++;
        break;
      case 'adjusted':
        this.metrics.adjustedCount++;
        break;
      case 'rejected':
        this.metrics.rejectedCount++;
        break;
      case 'conditional':
        this.metrics.conditionalCount++;
        break;
    }
  }

  private generateCacheKey(request: GovernanceBoundaryRequest): string {
    const decision = request.decision;
    const context = request.context;
    const policyIds = request.policyIds?.join(',') || 'all';

    return `${decision.foreground}:${decision.background}:${JSON.stringify(context)}:${policyIds}`;
  }

  private getFromCache(key: string): GovernanceEvaluation | null {
    const entry = this.evaluationCache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.evaluationCache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return entry.evaluation;
  }

  private cacheEvaluation(key: string, evaluation: GovernanceEvaluation): void {
    if (!this.config.enableEvaluationCache) return;

    // Enforce max cache size
    if (this.evaluationCache.size >= this.config.maxCachedEvaluations) {
      // Remove oldest entry
      const firstKey = this.evaluationCache.keys().next().value;
      if (firstKey) {
        this.evaluationCache.delete(firstKey);
      }
    }

    const now = Date.now();
    this.evaluationCache.set(key, {
      evaluation,
      cachedAt: now,
      expiresAt: now + this.config.evaluationCacheTtlMs,
    });
  }

  private emitEvent(type: GovernanceEngineEventType, payload: unknown): void {
    if (!this.config.enableEvents) return;

    const event: GovernanceEngineEvent = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    for (const listener of Array.from(this.eventListeners)) {
      try {
        listener(event);
      } catch (error) {
        // Ignore listener errors
        console.error('Event listener error:', error);
      }
    }
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a GovernanceEngine with default configuration
 */
export function createGovernanceEngine(
  policyRegistry: PolicyRegistry,
  decisionEngine: IDecisionEnginePort,
  config?: Partial<GovernanceEngineConfig>
): GovernanceEngine {
  return new GovernanceEngine(policyRegistry, decisionEngine, config);
}

/**
 * Create engine configuration with defaults
 */
export function createEngineConfig(
  overrides?: Partial<GovernanceEngineConfig>
): GovernanceEngineConfig {
  return { ...DEFAULT_ENGINE_CONFIG, ...overrides };
}
