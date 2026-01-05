/**
 * @fileoverview GovernanceEvaluator Domain Service
 *
 * Pure domain service for evaluating design decisions against enterprise policies.
 * No external dependencies - operates solely on domain types.
 *
 * @module ui-kit/domain/governance/services/GovernanceEvaluator
 * @version 1.0.0
 */

import type {
  EnterprisePolicy,
  PolicySet,
  PolicyContext,
  PolicyEvaluationResult,
  PolicyViolationDetail,
  PolicyRule,
  AccessibilityCondition,
  ColorCondition,
  TokenCondition,
  ThemeCondition,
} from '../value-objects/EnterprisePolicy';
import type { PerceptualColor } from '../../perceptual';
import type { TokenCollection } from '../../tokens';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input for governance evaluation.
 */
export interface GovernanceEvaluationInput {
  readonly context: PolicyContext;
  readonly color?: PerceptualColor;
  readonly tokens?: TokenCollection;
  readonly contrastRatio?: number;
  readonly apcaValue?: number;
  readonly tokenNames?: string[];
  readonly themeHasLightMode?: boolean;
  readonly themeHasDarkMode?: boolean;
}

/**
 * Aggregated evaluation result across all policies.
 */
export interface AggregatedEvaluationResult {
  readonly overallPassed: boolean;
  readonly overallScore: number;
  readonly totalPolicies: number;
  readonly passedPolicies: number;
  readonly failedPolicies: number;
  readonly criticalViolations: readonly PolicyViolationDetail[];
  readonly allViolations: readonly PolicyViolationDetail[];
  readonly allWarnings: readonly PolicyViolationDetail[];
  readonly byCategory: Map<string, PolicyEvaluationResult>;
  readonly evaluatedAt: Date;
  readonly blockingViolations: boolean;
}

/**
 * Custom evaluator function type.
 */
export type CustomEvaluatorFn = (
  input: GovernanceEvaluationInput,
  params?: Record<string, unknown>
) => { passed: boolean; message?: string };

// ============================================================================
// GOVERNANCE EVALUATOR SERVICE
// ============================================================================

/**
 * GovernanceEvaluator - Domain service for policy evaluation.
 *
 * Stateless service that evaluates design decisions against a set of policies.
 * Uses pure functions and domain types only.
 *
 * @example
 * ```typescript
 * const evaluator = new GovernanceEvaluator();
 *
 * const result = evaluator.evaluate(policySet, {
 *   context: { scope: 'accessibility' },
 *   contrastRatio: 4.2,
 * });
 *
 * if (!result.overallPassed) {
 *   console.log('Violations:', result.criticalViolations);
 * }
 * ```
 */
export class GovernanceEvaluator {
  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOM EVALUATORS REGISTRY
  // ─────────────────────────────────────────────────────────────────────────

  private readonly customEvaluators: Map<string, CustomEvaluatorFn> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Registers a custom evaluator function.
   */
  registerCustomEvaluator(name: string, evaluator: CustomEvaluatorFn): void {
    this.customEvaluators.set(name, evaluator);
  }

  /**
   * Evaluates input against all applicable policies.
   */
  evaluate(policySet: PolicySet, input: GovernanceEvaluationInput): AggregatedEvaluationResult {
    const applicablePolicies = policySet.applicableTo(input.context);
    const evaluatedAt = new Date();

    const results: Array<{ policy: EnterprisePolicy; result: PolicyEvaluationResult }> = [];

    for (const policy of applicablePolicies) {
      const result = this.evaluatePolicy(policy, input);
      results.push({ policy, result });
    }

    return this.aggregateResults(results, evaluatedAt);
  }

  /**
   * Evaluates a single policy.
   */
  evaluatePolicy(policy: EnterprisePolicy, input: GovernanceEvaluationInput): PolicyEvaluationResult {
    const violations: PolicyViolationDetail[] = [];
    const warnings: PolicyViolationDetail[] = [];

    for (const rule of policy.rules) {
      const ruleResult = this.evaluateRule(policy, rule, input);

      if (!ruleResult.passed) {
        const violation: PolicyViolationDetail = {
          policyId: policy.id,
          policyName: policy.name,
          severity: policy.severity,
          message: ruleResult.message || rule.message,
          context: input.context,
          suggestion: rule.suggestion,
          autoFixable: rule.autoFixable,
        };

        if (policy.isAdvisory()) {
          warnings.push(violation);
        } else {
          violations.push(violation);
        }
      }
    }

    const totalRules = policy.rules.length;
    const passedRules = totalRules - violations.length - warnings.length;
    const score = totalRules > 0 ? (passedRules / totalRules) * 100 : 100;

    return Object.freeze({
      passed: violations.length === 0,
      violations: Object.freeze(violations),
      warnings: Object.freeze(warnings),
      score,
      evaluatedAt: new Date(),
    });
  }

  /**
   * Quickly checks if all blocking policies pass.
   */
  passesBlockingPolicies(policySet: PolicySet, input: GovernanceEvaluationInput): boolean {
    const blockingPolicies = policySet.blocking();

    for (const policy of blockingPolicies) {
      if (!policy.appliesTo(input.context)) continue;

      const result = this.evaluatePolicy(policy, input);
      if (!result.passed) return false;
    }

    return true;
  }

  /**
   * Gets all auto-fixable violations.
   */
  getAutoFixableViolations(result: AggregatedEvaluationResult): readonly PolicyViolationDetail[] {
    return result.allViolations.filter(v => v.autoFixable);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RULE EVALUATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evaluates a single rule.
   */
  private evaluateRule(
    _policy: EnterprisePolicy,
    rule: PolicyRule,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const condition = rule.condition;

    switch (condition.type) {
      case 'accessibility':
        return this.evaluateAccessibilityCondition(condition, input);
      case 'color':
        return this.evaluateColorCondition(condition, input);
      case 'token':
        return this.evaluateTokenCondition(condition, input);
      case 'theme':
        return this.evaluateThemeCondition(condition, input);
      case 'custom':
        return this.evaluateCustomCondition(condition.evaluator, condition.params, input);
      default:
        return { passed: true };
    }
  }

  /**
   * Evaluates accessibility conditions.
   */
  private evaluateAccessibilityCondition(
    condition: AccessibilityCondition,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const { contrastRatio, apcaValue } = input;

    switch (condition.standard) {
      case 'wcag-aa':
        if (contrastRatio === undefined) return { passed: true }; // Skip if no data
        const aaThreshold = condition.minContrast ?? 4.5;
        if (contrastRatio < aaThreshold) {
          return {
            passed: false,
            message: `WCAG AA requires contrast ratio >= ${aaThreshold}:1, got ${contrastRatio.toFixed(2)}:1`,
          };
        }
        return { passed: true };

      case 'wcag-aaa':
        if (contrastRatio === undefined) return { passed: true };
        const aaaThreshold = condition.minContrast ?? 7;
        if (contrastRatio < aaaThreshold) {
          return {
            passed: false,
            message: `WCAG AAA requires contrast ratio >= ${aaaThreshold}:1, got ${contrastRatio.toFixed(2)}:1`,
          };
        }
        return { passed: true };

      case 'apca-body':
        if (apcaValue === undefined) return { passed: true };
        const bodyThreshold = condition.minContrast ?? 60;
        if (Math.abs(apcaValue) < bodyThreshold) {
          return {
            passed: false,
            message: `APCA body text requires Lc >= ${bodyThreshold}, got Lc ${Math.abs(apcaValue).toFixed(1)}`,
          };
        }
        return { passed: true };

      case 'apca-ui':
        if (apcaValue === undefined) return { passed: true };
        const uiThreshold = condition.minContrast ?? 30;
        if (Math.abs(apcaValue) < uiThreshold) {
          return {
            passed: false,
            message: `APCA UI elements require Lc >= ${uiThreshold}, got Lc ${Math.abs(apcaValue).toFixed(1)}`,
          };
        }
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * Evaluates color conditions.
   */
  private evaluateColorCondition(
    condition: ColorCondition,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const { color } = input;
    if (!color) return { passed: true }; // Skip if no color data

    switch (condition.check) {
      case 'saturation': {
        const threshold = condition.threshold ?? 20;
        const chroma = color.oklch.c * 100;
        if (chroma < threshold) {
          return {
            passed: false,
            message: `Color saturation (${chroma.toFixed(1)}) is below minimum (${threshold})`,
          };
        }
        return { passed: true };
      }

      case 'lightness': {
        const threshold = condition.threshold ?? 50;
        const tolerance = condition.tolerance ?? 30;
        const lightness = color.oklch.l * 100;
        if (Math.abs(lightness - threshold) > tolerance) {
          return {
            passed: false,
            message: `Color lightness (${lightness.toFixed(1)}) is outside acceptable range (${threshold} ± ${tolerance})`,
          };
        }
        return { passed: true };
      }

      case 'brand-alignment':
      case 'harmony':
        // These would require brand color comparison - return passed for now
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * Evaluates token conditions.
   */
  private evaluateTokenCondition(
    condition: TokenCondition,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const { tokens: _tokens, tokenNames } = input;

    switch (condition.check) {
      case 'naming-convention': {
        if (!condition.pattern || !tokenNames) return { passed: true };
        const regex = new RegExp(condition.pattern);
        const invalidNames = tokenNames.filter(name => !regex.test(name));
        if (invalidNames.length > 0) {
          return {
            passed: false,
            message: `Invalid token names: ${invalidNames.slice(0, 3).join(', ')}${invalidNames.length > 3 ? '...' : ''}`,
          };
        }
        return { passed: true };
      }

      case 'completeness': {
        if (!condition.requiredTokens || !tokenNames) return { passed: true };
        const missing = condition.requiredTokens.filter(t => !tokenNames.includes(t));
        if (missing.length > 0) {
          return {
            passed: false,
            message: `Missing required tokens: ${missing.join(', ')}`,
          };
        }
        return { passed: true };
      }

      case 'hierarchy':
      case 'consistency':
        // Complex checks - return passed for now
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * Evaluates theme conditions.
   */
  private evaluateThemeCondition(
    condition: ThemeCondition,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const { themeHasLightMode, themeHasDarkMode } = input;

    switch (condition.check) {
      case 'mode-coverage': {
        const modes = condition.modes ?? ['light', 'dark'];
        const missingModes: string[] = [];

        if (modes.includes('light') && !themeHasLightMode) {
          missingModes.push('light');
        }
        if (modes.includes('dark') && !themeHasDarkMode) {
          missingModes.push('dark');
        }

        if (missingModes.length > 0) {
          return {
            passed: false,
            message: `Theme is missing required modes: ${missingModes.join(', ')}`,
          };
        }
        return { passed: true };
      }

      case 'semantic-mapping':
      case 'scale-consistency':
        // Complex checks - return passed for now
        return { passed: true };

      default:
        return { passed: true };
    }
  }

  /**
   * Evaluates custom conditions.
   */
  private evaluateCustomCondition(
    evaluatorName: string,
    params: Record<string, unknown> | undefined,
    input: GovernanceEvaluationInput
  ): { passed: boolean; message?: string } {
    const evaluator = this.customEvaluators.get(evaluatorName);
    if (!evaluator) {
      return { passed: true }; // Skip unknown evaluators
    }
    return evaluator(input, params);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGGREGATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Aggregates individual policy results into overall result.
   */
  private aggregateResults(
    results: Array<{ policy: EnterprisePolicy; result: PolicyEvaluationResult }>,
    evaluatedAt: Date
  ): AggregatedEvaluationResult {
    const allViolations: PolicyViolationDetail[] = [];
    const allWarnings: PolicyViolationDetail[] = [];
    const criticalViolations: PolicyViolationDetail[] = [];
    const byCategory = new Map<string, PolicyEvaluationResult>();

    let totalWeight = 0;
    let weightedScore = 0;
    let passedCount = 0;
    let failedCount = 0;
    let hasBlockingViolation = false;

    for (const { policy, result } of results) {
      allViolations.push(...result.violations);
      allWarnings.push(...result.warnings);

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;

        if (policy.isBlocking()) {
          hasBlockingViolation = true;
          criticalViolations.push(...result.violations);
        }
      }

      const weight = policy.getWeight();
      totalWeight += weight;
      weightedScore += result.score * weight;

      // Group by category
      const existing = byCategory.get(policy.category);
      if (!existing || result.score < existing.score) {
        byCategory.set(policy.category, result);
      }
    }

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 100;

    return Object.freeze({
      overallPassed: !hasBlockingViolation && allViolations.length === 0,
      overallScore,
      totalPolicies: results.length,
      passedPolicies: passedCount,
      failedPolicies: failedCount,
      criticalViolations: Object.freeze(criticalViolations),
      allViolations: Object.freeze(allViolations),
      allWarnings: Object.freeze(allWarnings),
      byCategory,
      evaluatedAt,
      blockingViolations: hasBlockingViolation,
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default evaluator instance.
 */
export const governanceEvaluator = new GovernanceEvaluator();

// ============================================================================
// EXPORTS
// ============================================================================

export default GovernanceEvaluator;
