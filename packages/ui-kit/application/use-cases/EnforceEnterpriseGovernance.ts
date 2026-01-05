/**
 * @fileoverview EnforceEnterpriseGovernance Use Case
 *
 * Application layer orchestrator for enterprise design governance.
 * Coordinates policy evaluation across all design decisions and provides
 * a unified interface for governance enforcement.
 *
 * This is the "golden path" use case that teams should use for all
 * design decisions to ensure enterprise compliance.
 *
 * @module ui-kit/application/use-cases/EnforceEnterpriseGovernance
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import {
  GovernanceEvaluator,
  PolicySet,
  EnterprisePolicy,
  createDefaultPolicySet,
  type PolicyContext,
  type PolicyScope,
  type AggregatedEvaluationResult,
  type GovernanceEvaluationInput,
  type PolicyViolationDetail,
  type CustomEvaluatorFn,
} from '../../domain/governance';
import { PerceptualColor } from '../../domain/perceptual';
import type { TokenCollection } from '../../domain/tokens';
import type { GovernanceAuditPort } from '../../application/ports/outbound/GovernanceAuditPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration for the governance orchestrator.
 */
export interface GovernanceConfig {
  /** Policy set to use (default: createDefaultPolicySet()) */
  readonly policySet?: PolicySet;
  /** Whether to fail fast on blocking violations */
  readonly failFast?: boolean;
  /** Whether to auto-fix fixable violations */
  readonly autoFix?: boolean;
  /** Audit port for logging decisions */
  readonly auditPort?: GovernanceAuditPort;
  /** Custom evaluators to register */
  readonly customEvaluators?: Record<string, CustomEvaluatorFn>;
}

/**
 * Input for governance enforcement.
 */
export interface GovernanceEnforcementInput {
  /** What is being evaluated */
  readonly subject: GovernanceSubject;
  /** Context for evaluation */
  readonly context?: Partial<PolicyContext>;
  /** Optional override policies (adds to default set) */
  readonly additionalPolicies?: EnterprisePolicy[];
  /** Whether this is a validation-only check (no side effects) */
  readonly validationOnly?: boolean;
}

/**
 * Subject of governance enforcement.
 */
export type GovernanceSubject =
  | ColorSubject
  | TokenSubject
  | ThemeSubject
  | ComponentSubject
  | AccessibilitySubject;

export interface ColorSubject {
  readonly type: 'color';
  readonly color: PerceptualColor;
  readonly purpose?: 'brand' | 'text' | 'background' | 'border';
}

export interface TokenSubject {
  readonly type: 'tokens';
  readonly tokens: TokenCollection;
}

export interface ThemeSubject {
  readonly type: 'theme';
  readonly hasLightMode: boolean;
  readonly hasDarkMode: boolean;
  readonly brandColor?: PerceptualColor;
}

export interface ComponentSubject {
  readonly type: 'component';
  readonly componentName: string;
  readonly tokens?: TokenCollection;
  readonly brandColor?: PerceptualColor;
}

export interface AccessibilitySubject {
  readonly type: 'accessibility';
  readonly foreground: PerceptualColor;
  readonly background: PerceptualColor;
  readonly contrastRatio: number;
  readonly apcaValue: number;
}

/**
 * Output of governance enforcement.
 */
export interface GovernanceEnforcementOutput {
  /** Whether all required policies passed */
  readonly compliant: boolean;
  /** Overall compliance score (0-100) */
  readonly complianceScore: number;
  /** Detailed evaluation result */
  readonly evaluation: AggregatedEvaluationResult;
  /** Human-readable summary */
  readonly summary: GovernanceSummary;
  /** Auto-fix results if enabled */
  readonly fixes?: GovernanceFixes;
  /** Audit ID for traceability */
  readonly auditId?: string;
}

/**
 * Human-readable governance summary.
 */
export interface GovernanceSummary {
  readonly status: 'pass' | 'fail' | 'warning';
  readonly headline: string;
  readonly details: string[];
  readonly recommendations: string[];
}

/**
 * Auto-fix results.
 */
export interface GovernanceFixes {
  readonly attempted: number;
  readonly successful: number;
  readonly failed: number;
  readonly details: Array<{
    readonly violation: PolicyViolationDetail;
    readonly fixed: boolean;
    readonly fixDescription?: string;
  }>;
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * EnforceEnterpriseGovernance - Application orchestrator for governance.
 *
 * This is the primary entry point for teams to ensure their design decisions
 * comply with enterprise policies. It provides:
 *
 * - Unified interface for all governance checks
 * - Automatic policy set management
 * - Human-readable feedback
 * - Optional auto-fixing
 * - Audit trail integration
 *
 * @example
 * ```typescript
 * const governance = new EnforceEnterpriseGovernance();
 *
 * // Check a color
 * const colorResult = await governance.execute({
 *   subject: {
 *     type: 'color',
 *     color: PerceptualColor.fromHex('#3B82F6'),
 *     purpose: 'brand',
 *   },
 * });
 *
 * if (!colorResult.value.compliant) {
 *   console.log(colorResult.value.summary.headline);
 *   console.log(colorResult.value.summary.recommendations);
 * }
 *
 * // Check accessibility
 * const a11yResult = await governance.execute({
 *   subject: {
 *     type: 'accessibility',
 *     foreground: PerceptualColor.fromHex('#000000'),
 *     background: PerceptualColor.fromHex('#FFFFFF'),
 *     contrastRatio: 21,
 *     apcaValue: 106,
 *   },
 * });
 * ```
 */
export class EnforceEnterpriseGovernance {
  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly evaluator: GovernanceEvaluator;
  private readonly policySet: PolicySet;
  private readonly config: GovernanceConfig;
  private readonly auditPort?: GovernanceAuditPort;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(config: GovernanceConfig = {}) {
    this.config = config;
    this.evaluator = new GovernanceEvaluator();
    this.policySet = config.policySet ?? createDefaultPolicySet();
    this.auditPort = config.auditPort;

    // Register custom evaluators
    if (config.customEvaluators) {
      for (const [name, evaluator] of Object.entries(config.customEvaluators)) {
        this.evaluator.registerCustomEvaluator(name, evaluator);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Executes governance enforcement on a subject.
   */
  async execute(input: GovernanceEnforcementInput): Promise<Result<GovernanceEnforcementOutput, Error>> {
    try {
      // 1. Build evaluation input
      const evalInput = this.buildEvaluationInput(input);

      // 2. Get applicable policy set
      const policies = this.getApplicablePolicies(input);

      // 3. Evaluate
      const evaluation = this.evaluator.evaluate(policies, evalInput);

      // 4. Generate summary
      const summary = this.generateSummary(evaluation, input.subject);

      // 5. Auto-fix if enabled
      let fixes: GovernanceFixes | undefined;
      if (this.config.autoFix && !input.validationOnly) {
        fixes = this.attemptAutoFixes(evaluation);
      }

      // 6. Audit if port available
      let auditId: string | undefined;
      if (this.auditPort && !input.validationOnly) {
        auditId = await this.auditPort.logGovernanceDecision({
          subject: input.subject as unknown as { readonly type: string; readonly [key: string]: unknown },
          evaluation,
          summary,
          fixes,
          timestamp: new Date(),
        });
      }

      // 7. Build output
      const output: GovernanceEnforcementOutput = {
        compliant: evaluation.overallPassed,
        complianceScore: evaluation.overallScore,
        evaluation,
        summary,
        fixes,
        auditId,
      };

      return success(output);
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Unknown error during governance enforcement')
      );
    }
  }

  /**
   * Quick check - returns only pass/fail.
   */
  async quickCheck(input: GovernanceEnforcementInput): Promise<boolean> {
    const result = await this.execute({ ...input, validationOnly: true });
    return result.success && result.value.compliant;
  }

  /**
   * Gets the current policy set.
   */
  getPolicySet(): PolicySet {
    return this.policySet;
  }

  /**
   * Creates a new instance with additional policies.
   */
  withPolicies(policies: EnterprisePolicy[]): EnforceEnterpriseGovernance {
    let newSet = this.policySet;
    for (const policy of policies) {
      newSet = newSet.add(policy);
    }
    return new EnforceEnterpriseGovernance({
      ...this.config,
      policySet: newSet,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Builds evaluation input from enforcement input.
   */
  private buildEvaluationInput(input: GovernanceEnforcementInput): GovernanceEvaluationInput {
    const subject = input.subject;
    const baseContext: PolicyContext = {
      scope: this.inferScope(subject),
      ...input.context,
    };

    switch (subject.type) {
      case 'color':
        return {
          context: { ...baseContext, componentName: subject.purpose },
          color: subject.color,
        };

      case 'tokens':
        return {
          context: baseContext,
          tokens: subject.tokens,
          tokenNames: subject.tokens.all().map(t => t.name),
        };

      case 'theme':
        return {
          context: baseContext,
          color: subject.brandColor,
          themeHasLightMode: subject.hasLightMode,
          themeHasDarkMode: subject.hasDarkMode,
        };

      case 'component':
        return {
          context: { ...baseContext, componentName: subject.componentName },
          color: subject.brandColor,
          tokens: subject.tokens,
          tokenNames: subject.tokens?.all().map(t => t.name),
        };

      case 'accessibility':
        return {
          context: baseContext,
          color: subject.foreground,
          contrastRatio: subject.contrastRatio,
          apcaValue: subject.apcaValue,
        };
    }
  }

  /**
   * Infers scope from subject type.
   */
  private inferScope(subject: GovernanceSubject): PolicyScope {
    switch (subject.type) {
      case 'color':
        return 'component';
      case 'tokens':
        return 'token';
      case 'theme':
        return 'theme';
      case 'component':
        return 'component';
      case 'accessibility':
        return 'accessibility';
    }
  }

  /**
   * Gets applicable policy set with any additional policies.
   */
  private getApplicablePolicies(input: GovernanceEnforcementInput): PolicySet {
    let policies = this.policySet;

    if (input.additionalPolicies) {
      for (const policy of input.additionalPolicies) {
        policies = policies.add(policy);
      }
    }

    return policies;
  }

  /**
   * Generates human-readable summary.
   */
  private generateSummary(
    evaluation: AggregatedEvaluationResult,
    subject: GovernanceSubject
  ): GovernanceSummary {
    const status: 'pass' | 'fail' | 'warning' =
      evaluation.overallPassed ? 'pass' :
      evaluation.blockingViolations ? 'fail' : 'warning';

    const subjectLabel = this.getSubjectLabel(subject);

    let headline: string;
    if (status === 'pass') {
      headline = `${subjectLabel} passes all governance checks (score: ${evaluation.overallScore.toFixed(0)}%)`;
    } else if (status === 'fail') {
      headline = `${subjectLabel} has ${evaluation.criticalViolations.length} critical violations`;
    } else {
      headline = `${subjectLabel} has ${evaluation.allViolations.length} non-critical issues`;
    }

    const details: string[] = [];
    details.push(`Evaluated ${evaluation.totalPolicies} policies`);
    details.push(`Passed: ${evaluation.passedPolicies}, Failed: ${evaluation.failedPolicies}`);

    if (evaluation.allViolations.length > 0) {
      details.push('Violations:');
      for (const v of evaluation.allViolations.slice(0, 5)) {
        details.push(`  - [${v.severity}] ${v.message}`);
      }
      if (evaluation.allViolations.length > 5) {
        details.push(`  ... and ${evaluation.allViolations.length - 5} more`);
      }
    }

    if (evaluation.allWarnings.length > 0) {
      details.push(`Warnings: ${evaluation.allWarnings.length}`);
    }

    const recommendations: string[] = [];
    for (const v of evaluation.allViolations) {
      if (v.suggestion && !recommendations.includes(v.suggestion)) {
        recommendations.push(v.suggestion);
      }
    }

    return {
      status,
      headline,
      details,
      recommendations: recommendations.slice(0, 5),
    };
  }

  /**
   * Gets a human-readable label for the subject.
   */
  private getSubjectLabel(subject: GovernanceSubject): string {
    switch (subject.type) {
      case 'color':
        return `Color (${subject.purpose ?? 'general'})`;
      case 'tokens':
        return 'Token collection';
      case 'theme':
        return 'Theme configuration';
      case 'component':
        return `Component "${subject.componentName}"`;
      case 'accessibility':
        return 'Accessibility check';
    }
  }

  /**
   * Attempts to auto-fix fixable violations.
   */
  private attemptAutoFixes(evaluation: AggregatedEvaluationResult): GovernanceFixes {
    const fixable = this.evaluator.getAutoFixableViolations(evaluation);
    const details: GovernanceFixes['details'] = [];

    let successful = 0;

    for (const violation of fixable) {
      // In a real implementation, this would invoke specific fix strategies
      // For now, we just mark them as acknowledged
      details.push({
        violation,
        fixed: false,
        fixDescription: 'Auto-fix not yet implemented for this violation type',
      });
    }

    return {
      attempted: fixable.length,
      successful,
      failed: fixable.length - successful,
      details,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick governance check for a color.
 */
export async function checkColorGovernance(
  colorHex: string,
  purpose?: 'brand' | 'text' | 'background' | 'border'
): Promise<Result<GovernanceEnforcementOutput, Error>> {
  const colorResult = PerceptualColor.tryFromHex(colorHex);
  if (!colorResult.success) {
    return failure(new Error(`Invalid color: ${colorResult.error.message}`));
  }

  const governance = new EnforceEnterpriseGovernance();
  return governance.execute({
    subject: {
      type: 'color',
      color: colorResult.value,
      purpose,
    },
  });
}

/**
 * Quick governance check for accessibility.
 */
export async function checkAccessibilityGovernance(
  foregroundHex: string,
  backgroundHex: string
): Promise<Result<GovernanceEnforcementOutput, Error>> {
  const fgResult = PerceptualColor.tryFromHex(foregroundHex);
  const bgResult = PerceptualColor.tryFromHex(backgroundHex);

  if (!fgResult.success) {
    return failure(new Error(`Invalid foreground color: ${fgResult.error.message}`));
  }
  if (!bgResult.success) {
    return failure(new Error(`Invalid background color: ${bgResult.error.message}`));
  }

  const fg = fgResult.value;
  const bg = bgResult.value;

  // Calculate contrast (simplified)
  const fgLum = fg.oklch.l;
  const bgLum = bg.oklch.l;
  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);
  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  // Simplified APCA calculation
  const apcaValue = Math.abs(bgLum - fgLum) * 100;

  const governance = new EnforceEnterpriseGovernance();
  return governance.execute({
    subject: {
      type: 'accessibility',
      foreground: fg,
      background: bg,
      contrastRatio,
      apcaValue,
    },
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EnforceEnterpriseGovernance;
