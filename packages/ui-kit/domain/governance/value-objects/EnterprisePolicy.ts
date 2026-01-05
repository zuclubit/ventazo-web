/**
 * @fileoverview EnterprisePolicy Value Object
 *
 * Immutable value object representing an enterprise-wide design policy.
 * Policies define rules that must be enforced across all products.
 *
 * Cross-cutting concerns addressed:
 * - Accessibility compliance (WCAG/APCA)
 * - Brand color governance
 * - Token naming conventions
 * - Theme consistency rules
 * - Audit/traceability requirements
 *
 * @module ui-kit/domain/governance/value-objects/EnterprisePolicy
 * @version 1.0.0
 */

import type { Result, PolicyEnforcement, PolicyCategory } from '../../types';
import { success, failure } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Severity level for policy violations.
 */
export type PolicySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Policy scope defines where the policy applies.
 */
export type PolicyScope =
  | 'global'           // Applies everywhere
  | 'component'        // Applies to specific components
  | 'token'            // Applies to token generation
  | 'theme'            // Applies to theme composition
  | 'accessibility';   // Applies to accessibility checks

/**
 * Policy evaluation context.
 */
export interface PolicyContext {
  readonly scope: PolicyScope;
  readonly componentName?: string;
  readonly tokenPath?: string[];
  readonly themeMode?: 'light' | 'dark';
  readonly brandColor?: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Policy violation details.
 */
export interface PolicyViolationDetail {
  readonly policyId: string;
  readonly policyName: string;
  readonly severity: PolicySeverity;
  readonly message: string;
  readonly context: PolicyContext;
  readonly suggestion?: string;
  readonly autoFixable: boolean;
}

/**
 * Policy evaluation result.
 */
export interface PolicyEvaluationResult {
  readonly passed: boolean;
  readonly violations: readonly PolicyViolationDetail[];
  readonly warnings: readonly PolicyViolationDetail[];
  readonly score: number; // 0-100 compliance score
  readonly evaluatedAt: Date;
}

/**
 * Configuration for creating an EnterprisePolicy.
 */
export interface EnterprisePolicyConfig {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: PolicyCategory;
  readonly scope: PolicyScope;
  readonly enforcement: PolicyEnforcement;
  readonly severity: PolicySeverity;
  readonly version: string;
  readonly rules: readonly PolicyRule[];
  readonly enabled?: boolean;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Individual policy rule.
 */
export interface PolicyRule {
  readonly id: string;
  readonly name: string;
  readonly condition: PolicyCondition;
  readonly message: string;
  readonly suggestion?: string;
  readonly autoFixable: boolean;
}

/**
 * Policy condition types.
 */
export type PolicyCondition =
  | AccessibilityCondition
  | ColorCondition
  | TokenCondition
  | ThemeCondition
  | CustomCondition;

export interface AccessibilityCondition {
  readonly type: 'accessibility';
  readonly standard: 'wcag-aa' | 'wcag-aaa' | 'apca-body' | 'apca-ui';
  readonly minContrast?: number;
}

export interface ColorCondition {
  readonly type: 'color';
  readonly check: 'brand-alignment' | 'harmony' | 'saturation' | 'lightness';
  readonly threshold?: number;
  readonly tolerance?: number;
}

export interface TokenCondition {
  readonly type: 'token';
  readonly check: 'naming-convention' | 'hierarchy' | 'completeness' | 'consistency';
  readonly pattern?: string;
  readonly requiredTokens?: string[];
}

export interface ThemeCondition {
  readonly type: 'theme';
  readonly check: 'mode-coverage' | 'semantic-mapping' | 'scale-consistency';
  readonly modes?: ('light' | 'dark')[];
}

export interface CustomCondition {
  readonly type: 'custom';
  readonly evaluator: string; // Reference to a registered evaluator function
  readonly params?: Record<string, unknown>;
}

// ============================================================================
// VALUE OBJECT
// ============================================================================

/**
 * EnterprisePolicy - Immutable value object for enterprise design policies.
 *
 * Represents a single governance rule that can be evaluated against
 * design decisions, tokens, themes, or components.
 *
 * @example
 * ```typescript
 * const policy = EnterprisePolicy.create({
 *   id: 'accessibility-wcag-aa',
 *   name: 'WCAG AA Compliance',
 *   description: 'All text must meet WCAG AA contrast requirements',
 *   category: 'accessibility',
 *   scope: 'accessibility',
 *   enforcement: 'required',
 *   severity: 'critical',
 *   version: '1.0.0',
 *   rules: [{
 *     id: 'min-contrast',
 *     name: 'Minimum Contrast',
 *     condition: { type: 'accessibility', standard: 'wcag-aa', minContrast: 4.5 },
 *     message: 'Text contrast ratio must be at least 4.5:1',
 *     suggestion: 'Increase color difference between text and background',
 *     autoFixable: true,
 *   }],
 * });
 * ```
 */
export class EnterprisePolicy {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: PolicyCategory;
  readonly scope: PolicyScope;
  readonly enforcement: PolicyEnforcement;
  readonly severity: PolicySeverity;
  readonly version: string;
  readonly rules: readonly PolicyRule[];
  readonly enabled: boolean;
  readonly metadata: Readonly<Record<string, unknown>>;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(config: EnterprisePolicyConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.scope = config.scope;
    this.enforcement = config.enforcement;
    this.severity = config.severity;
    this.version = config.version;
    this.rules = Object.freeze([...config.rules]);
    this.enabled = config.enabled ?? true;
    this.metadata = Object.freeze({ ...config.metadata });
    Object.freeze(this);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FACTORY METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new EnterprisePolicy from configuration.
   */
  static create(config: EnterprisePolicyConfig): Result<EnterprisePolicy, Error> {
    const validation = EnterprisePolicy.validate(config);
    if (!validation.valid) {
      return failure(new Error(validation.errors.join('; ')));
    }
    return success(new EnterprisePolicy(config));
  }

  /**
   * Creates a policy without validation (for internal use).
   */
  static unsafe(config: EnterprisePolicyConfig): EnterprisePolicy {
    return new EnterprisePolicy(config);
  }

  /**
   * Validates policy configuration.
   */
  static validate(config: EnterprisePolicyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.id || config.id.trim().length === 0) {
      errors.push('Policy ID is required');
    }
    if (!config.name || config.name.trim().length === 0) {
      errors.push('Policy name is required');
    }
    if (!config.description || config.description.trim().length === 0) {
      errors.push('Policy description is required');
    }
    if (!config.rules || config.rules.length === 0) {
      errors.push('Policy must have at least one rule');
    }
    if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
      errors.push('Policy version must be in semver format (x.y.z)');
    }

    return { valid: errors.length === 0, errors };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INSTANCE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Checks if this policy applies to a given context.
   */
  appliesTo(context: PolicyContext): boolean {
    if (!this.enabled) return false;
    if (this.scope === 'global') return true;
    return this.scope === context.scope;
  }

  /**
   * Returns a new policy with enabled state toggled.
   */
  withEnabled(enabled: boolean): EnterprisePolicy {
    return new EnterprisePolicy({
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      scope: this.scope,
      enforcement: this.enforcement,
      severity: this.severity,
      version: this.version,
      rules: this.rules,
      enabled,
      metadata: this.metadata,
    });
  }

  /**
   * Returns a new policy with updated metadata.
   */
  withMetadata(metadata: Record<string, unknown>): EnterprisePolicy {
    return new EnterprisePolicy({
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      scope: this.scope,
      enforcement: this.enforcement,
      severity: this.severity,
      version: this.version,
      rules: this.rules,
      enabled: this.enabled,
      metadata: { ...this.metadata, ...metadata },
    });
  }

  /**
   * Checks if policy is blocking (must pass for operation to proceed).
   */
  isBlocking(): boolean {
    return this.enforcement === 'required' && this.severity === 'critical';
  }

  /**
   * Checks if policy is advisory only (warnings, not errors).
   */
  isAdvisory(): boolean {
    return this.enforcement === 'optional' || this.severity === 'info';
  }

  /**
   * Gets the weight of this policy for scoring.
   */
  getWeight(): number {
    const severityWeights: Record<PolicySeverity, number> = {
      critical: 10,
      high: 7,
      medium: 5,
      low: 3,
      info: 1,
    };

    const enforcementMultiplier: Record<PolicyEnforcement, number> = {
      required: 2.0,
      recommended: 1.5,
      optional: 1.0,
    };

    return severityWeights[this.severity] * enforcementMultiplier[this.enforcement];
  }

  /**
   * Serializes policy to plain object.
   */
  toJSON(): EnterprisePolicyConfig {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      scope: this.scope,
      enforcement: this.enforcement,
      severity: this.severity,
      version: this.version,
      rules: [...this.rules],
      enabled: this.enabled,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Checks equality with another policy.
   */
  equals(other: EnterprisePolicy): boolean {
    return this.id === other.id && this.version === other.version;
  }
}

// ============================================================================
// POLICY COLLECTION
// ============================================================================

/**
 * PolicySet - Collection of enterprise policies.
 */
export class PolicySet {
  private readonly policies: Map<string, EnterprisePolicy>;

  constructor(policies: EnterprisePolicy[] = []) {
    this.policies = new Map(policies.map(p => [p.id, p]));
    Object.freeze(this);
  }

  /**
   * Gets a policy by ID.
   */
  get(id: string): EnterprisePolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Gets all policies.
   */
  all(): readonly EnterprisePolicy[] {
    return Object.freeze([...this.policies.values()]);
  }

  /**
   * Filters policies by scope.
   */
  byScope(scope: PolicyScope): readonly EnterprisePolicy[] {
    return this.all().filter(p => p.scope === scope || p.scope === 'global');
  }

  /**
   * Filters policies by category.
   */
  byCategory(category: PolicyCategory): readonly EnterprisePolicy[] {
    return this.all().filter(p => p.category === category);
  }

  /**
   * Filters policies by enforcement level.
   */
  byEnforcement(enforcement: PolicyEnforcement): readonly EnterprisePolicy[] {
    return this.all().filter(p => p.enforcement === enforcement);
  }

  /**
   * Gets only enabled policies.
   */
  enabled(): readonly EnterprisePolicy[] {
    return this.all().filter(p => p.enabled);
  }

  /**
   * Gets blocking policies (must pass).
   */
  blocking(): readonly EnterprisePolicy[] {
    return this.all().filter(p => p.isBlocking());
  }

  /**
   * Adds a policy and returns new set.
   */
  add(policy: EnterprisePolicy): PolicySet {
    const newPolicies = [...this.policies.values(), policy];
    return new PolicySet(newPolicies);
  }

  /**
   * Removes a policy and returns new set.
   */
  remove(id: string): PolicySet {
    const newPolicies = [...this.policies.values()].filter(p => p.id !== id);
    return new PolicySet(newPolicies);
  }

  /**
   * Gets policies that apply to a context.
   */
  applicableTo(context: PolicyContext): readonly EnterprisePolicy[] {
    return this.enabled().filter(p => p.appliesTo(context));
  }

  /**
   * Returns count of policies.
   */
  get size(): number {
    return this.policies.size;
  }

  /**
   * Checks if set is empty.
   */
  isEmpty(): boolean {
    return this.policies.size === 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EnterprisePolicy;
