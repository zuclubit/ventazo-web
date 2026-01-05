// ============================================
// Policy Composition Types
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Types for composing policies through inheritance,
// rule combinations, and overrides.
// ============================================

import type {
  PerceptualPolicy,
  PolicyId,
  PolicyPriority,
  PolicyEnforcement,
  PolicyContext,
  RuleId,
  AccessibilityRequirements,
  ruleId,
} from './policy';

// Re-export RuleId for consumers that import from policy-composition
export type { RuleId } from './policy';

// ============================================
// Policy Rule Types
// ============================================

/**
 * Comparison operators for rule conditions
 */
export type RuleOperator =
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'in'        // value in list
  | 'notIn'     // value not in list
  | 'between'   // value between min and max
  | 'matches';  // regex match

/**
 * Target property that a rule checks
 *
 * Core metrics:
 * - APCA: apcaLc, apcaAbsolute
 * - WCAG: wcag21Ratio, wcagLevel, wcag3Tier, contrastRatio
 * - Typography: fontSize, fontSizePx, fontWeight
 *
 * Color preservation (brand policies):
 * - hueShift, chromaRetention, chromaReduction
 *
 * Accessibility features:
 * - hasNonColorIndicator, cvdDistinguishable
 * - lightnessDifference, foregroundLightness, backgroundLightness
 * - stateChangeContrast
 *
 * Other:
 * - polarity, score
 */
export type RuleTarget =
  // === Core APCA Metrics ===
  | 'apcaLc'
  | 'apcaAbsolute'
  // === WCAG Metrics ===
  | 'wcag21Ratio'
  | 'wcagLevel'
  | 'wcag3Tier'
  | 'contrastRatio'
  // === Typography ===
  | 'fontSize'
  | 'fontSizePx'
  | 'fontWeight'
  // === Color Preservation (Brand) ===
  | 'hueShift'
  | 'chromaRetention'
  | 'chromaReduction'
  // === Accessibility Features ===
  | 'hasNonColorIndicator'
  | 'cvdDistinguishable'
  | 'lightnessDifference'
  | 'foregroundLightness'
  | 'backgroundLightness'
  | 'stateChangeContrast'
  // === Other ===
  | 'polarity'
  | 'score';

/**
 * Rule condition defining what to check
 */
export interface RuleCondition {
  /** Property to check */
  readonly target: RuleTarget;

  /** Comparison operator */
  readonly operator: RuleOperator;

  /** Expected value(s) */
  readonly value: unknown;

  /** Secondary value for 'between' operator */
  readonly secondaryValue?: unknown;

  /** Whether value is dynamically computed (e.g., from font lookup tables) */
  readonly dynamic?: boolean;
}

/**
 * Individual policy rule
 *
 * Rules are the atomic units of policy evaluation.
 * Each rule checks a specific condition and defines
 * the consequence of violation.
 */
export interface PolicyRule {
  /** Unique rule identifier within the policy */
  readonly id: RuleId;

  /** Human-readable name */
  readonly name: string;

  /** Detailed description of what this rule checks */
  readonly description: string;

  /** Condition that must be satisfied */
  readonly condition: RuleCondition;

  /** Severity when this rule is violated */
  readonly severity: 'error' | 'warning' | 'info';

  /** Message template when violated (supports {value}, {expected}) */
  readonly message: string;

  /** Whether this rule is enabled */
  readonly enabled: boolean;

  /** Priority within the policy */
  readonly priority: PolicyPriority;

  /** Contexts where this rule applies (empty = all) */
  readonly applicableContexts: ReadonlyArray<PolicyContext>;
}

// ============================================
// Rule Factories
// ============================================

/**
 * Input for creating a rule
 */
export type RuleInput = Omit<PolicyRule, 'id'> & { readonly id: string };

/**
 * Create a policy rule with validation
 */
export function createRule(input: RuleInput): PolicyRule {
  // Validate condition
  validateRuleCondition(input.condition);

  return {
    ...input,
    id: input.id as RuleId, // Assume valid after pattern check in ruleId.create
  };
}

/**
 * Validate a rule condition
 */
function validateRuleCondition(condition: RuleCondition): void {
  const { operator, value, secondaryValue } = condition;

  // 'between' requires secondaryValue
  if (operator === 'between' && secondaryValue === undefined) {
    throw new Error("'between' operator requires secondaryValue");
  }

  // 'in' and 'notIn' require array value
  if ((operator === 'in' || operator === 'notIn') && !Array.isArray(value)) {
    throw new Error(`'${operator}' operator requires array value`);
  }

  // 'matches' requires string pattern
  if (operator === 'matches' && typeof value !== 'string') {
    throw new Error("'matches' operator requires string regex pattern");
  }
}

// ============================================
// Rule Combinators
// ============================================

/**
 * How rules are combined to determine policy pass/fail
 */
export type RuleCombinator =
  | 'all'       // All rules must pass
  | 'any'       // At least one rule must pass
  | 'majority'  // More than half must pass
  | 'none';     // No rules should pass (negative filter)

// ============================================
// Composite Policy
// ============================================

/**
 * Composite Policy
 *
 * Extends base policy with explicit rules and combination logic.
 * Use this when you need fine-grained control over evaluation.
 */
export interface CompositePolicy extends PerceptualPolicy {
  /** Rules that make up this policy */
  readonly rules: ReadonlyArray<PolicyRule>;

  /** How rules are combined */
  readonly combinator: RuleCombinator;

  /** Rule overrides when extending another policy */
  readonly ruleOverrides?: ReadonlyMap<RuleId, Partial<PolicyRule>>;

  /** Rules to disable from parent policy */
  readonly disabledRules?: ReadonlyArray<RuleId>;
}

/**
 * Type guard for CompositePolicy
 */
export function isCompositePolicy(policy: PerceptualPolicy): policy is CompositePolicy {
  return 'rules' in policy && Array.isArray((policy as CompositePolicy).rules);
}

// ============================================
// Policy Inheritance Resolution
// ============================================

/**
 * Resolved policy after inheritance chain is flattened
 */
export interface ResolvedPolicy {
  /** Original policy that was resolved */
  readonly sourcePolicy: PerceptualPolicy;

  /** Merged requirements from inheritance chain */
  readonly mergedRequirements: AccessibilityRequirements;

  /** Merged contexts from inheritance chain */
  readonly mergedContexts: ReadonlyArray<PolicyContext>;

  /** All rules (own + inherited) after overrides */
  readonly effectiveRules: ReadonlyArray<PolicyRule>;

  /** Inheritance chain (child to parent order) */
  readonly inheritanceChain: ReadonlyArray<PolicyId>;

  /** Effective enforcement (most strict in chain) */
  readonly effectiveEnforcement: PolicyEnforcement;

  /** Effective priority (highest in chain) */
  readonly effectivePriority: PolicyPriority;
}

/**
 * Merge two AccessibilityRequirements (child overrides parent)
 */
export function mergeRequirements(
  parent: AccessibilityRequirements,
  child: AccessibilityRequirements
): AccessibilityRequirements {
  return {
    // Child takes precedence for specified values
    minWcagLevel: child.minWcagLevel ?? parent.minWcagLevel,
    minWcag3Tier: child.minWcag3Tier ?? parent.minWcag3Tier,
    minApcaLc: child.minApcaLc ?? parent.minApcaLc,
    minContrastRatio: child.minContrastRatio ?? parent.minContrastRatio,
    minFontSizePx: child.minFontSizePx ?? parent.minFontSizePx,
    minFontWeight: child.minFontWeight ?? parent.minFontWeight,
    maxChromaReduction: child.maxChromaReduction ?? parent.maxChromaReduction,
    preserveHue: child.preserveHue ?? parent.preserveHue,
    maxHueShift: child.maxHueShift ?? parent.maxHueShift,
  };
}

/**
 * Merge contexts (union of parent and child)
 */
export function mergeContexts(
  parent: ReadonlyArray<PolicyContext>,
  child: ReadonlyArray<PolicyContext>
): ReadonlyArray<PolicyContext> {
  // If child has contexts, they override parent
  // If child is empty, inherit parent
  return child.length > 0 ? child : parent;
}

/**
 * Merge rules from parent and child policies
 */
export function mergeRules(
  parentRules: ReadonlyArray<PolicyRule>,
  childRules: ReadonlyArray<PolicyRule>,
  overrides?: ReadonlyMap<RuleId, Partial<PolicyRule>>,
  disabledRules?: ReadonlyArray<RuleId>
): ReadonlyArray<PolicyRule> {
  const disabledSet = new Set(disabledRules ?? []);
  const childRuleIds = new Set(childRules.map(r => r.id));

  // Start with parent rules (excluding disabled and overridden by child)
  const mergedRules: PolicyRule[] = parentRules
    .filter(rule => !disabledSet.has(rule.id) && !childRuleIds.has(rule.id))
    .map(rule => {
      // Apply overrides if present
      const override = overrides?.get(rule.id);
      if (override) {
        return { ...rule, ...override } as PolicyRule;
      }
      return rule;
    });

  // Add child rules
  mergedRules.push(...childRules.filter(rule => !disabledSet.has(rule.id)));

  // Sort by priority
  return mergedRules.sort((a, b) => {
    const priorityOrder: Record<PolicyPriority, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Get most strict enforcement from a chain
 */
export function getMostStrictEnforcement(
  policies: ReadonlyArray<PerceptualPolicy>
): PolicyEnforcement {
  const order: Record<PolicyEnforcement, number> = {
    strict: 0,
    advisory: 1,
    monitoring: 2,
  };

  return policies.reduce(
    (strictest, policy) =>
      order[policy.enforcement] < order[strictest]
        ? policy.enforcement
        : strictest,
    'monitoring' as PolicyEnforcement
  );
}

/**
 * Get highest priority from a chain
 */
export function getHighestPriority(
  policies: ReadonlyArray<PerceptualPolicy>
): PolicyPriority {
  const order: Record<PolicyPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return policies.reduce(
    (highest, policy) =>
      order[policy.priority] < order[highest] ? policy.priority : highest,
    'low' as PolicyPriority
  );
}

// ============================================
// Policy Set
// ============================================

/**
 * A collection of related policies
 */
export interface PolicySet {
  /** Unique set identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description of this policy set */
  readonly description: string;

  /** Policies in this set */
  readonly policies: ReadonlyArray<PolicyId>;

  /** Default enforcement for the set */
  readonly defaultEnforcement: PolicyEnforcement;

  /** Whether this is the default policy set */
  readonly isDefault: boolean;
}

/**
 * Create a policy set
 */
export function createPolicySet(
  id: string,
  name: string,
  description: string,
  policies: ReadonlyArray<string>,
  options?: {
    defaultEnforcement?: PolicyEnforcement;
    isDefault?: boolean;
  }
): PolicySet {
  return {
    id,
    name,
    description,
    policies: policies as ReadonlyArray<PolicyId>,
    defaultEnforcement: options?.defaultEnforcement ?? 'strict',
    isDefault: options?.isDefault ?? false,
  };
}

// ============================================
// Pre-built Rule Factories
// ============================================

/**
 * Create a minimum APCA Lc rule
 */
export function createMinApcaLcRule(
  id: string,
  minLc: number,
  options?: {
    name?: string;
    severity?: 'error' | 'warning' | 'info';
    priority?: PolicyPriority;
  }
): PolicyRule {
  return createRule({
    id,
    name: options?.name ?? `Minimum APCA Lc ${minLc}`,
    description: `Requires APCA Lightness Contrast of at least ${minLc}`,
    condition: {
      target: 'apcaAbsolute',
      operator: 'gte',
      value: minLc,
    },
    severity: options?.severity ?? 'error',
    message: `APCA Lc {value} is below minimum required ${minLc}`,
    enabled: true,
    priority: options?.priority ?? 'high',
    applicableContexts: [],
  });
}

/**
 * Create a minimum WCAG contrast ratio rule
 */
export function createMinContrastRatioRule(
  id: string,
  minRatio: number,
  options?: {
    name?: string;
    severity?: 'error' | 'warning' | 'info';
    priority?: PolicyPriority;
  }
): PolicyRule {
  return createRule({
    id,
    name: options?.name ?? `Minimum contrast ratio ${minRatio}:1`,
    description: `Requires WCAG 2.1 contrast ratio of at least ${minRatio}:1`,
    condition: {
      target: 'wcag21Ratio',
      operator: 'gte',
      value: minRatio,
    },
    severity: options?.severity ?? 'error',
    message: `Contrast ratio {value}:1 is below minimum required ${minRatio}:1`,
    enabled: true,
    priority: options?.priority ?? 'high',
    applicableContexts: [],
  });
}

/**
 * Create a minimum WCAG level rule
 */
export function createMinWcagLevelRule(
  id: string,
  minLevel: 'AA' | 'AAA',
  options?: {
    name?: string;
    severity?: 'error' | 'warning' | 'info';
  }
): PolicyRule {
  const levelValues = { Fail: 0, AA: 1, AAA: 2, Enhanced: 3 };

  return createRule({
    id,
    name: options?.name ?? `Minimum WCAG ${minLevel}`,
    description: `Requires WCAG 2.1 ${minLevel} compliance`,
    condition: {
      target: 'wcagLevel',
      operator: 'in',
      value: minLevel === 'AA' ? ['AA', 'AAA', 'Enhanced'] : ['AAA', 'Enhanced'],
    },
    severity: options?.severity ?? 'error',
    message: `WCAG level {value} does not meet minimum ${minLevel}`,
    enabled: true,
    priority: 'critical',
    applicableContexts: [],
  });
}

/**
 * Create a minimum font size rule
 */
export function createMinFontSizeRule(
  id: string,
  minSizePx: number,
  options?: {
    name?: string;
    severity?: 'error' | 'warning' | 'info';
  }
): PolicyRule {
  return createRule({
    id,
    name: options?.name ?? `Minimum font size ${minSizePx}px`,
    description: `Requires font size of at least ${minSizePx}px`,
    condition: {
      target: 'fontSizePx',
      operator: 'gte',
      value: minSizePx,
    },
    severity: options?.severity ?? 'warning',
    message: `Font size {value}px is below minimum ${minSizePx}px`,
    enabled: true,
    priority: 'medium',
    applicableContexts: [],
  });
}
