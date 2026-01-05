/**
 * @fileoverview EnterpriseGovernancePort - Inbound Port
 *
 * Defines the inbound port (driving port) for enterprise governance.
 * This is the contract that external adapters (React, CLI, etc.) use
 * to interact with the governance system.
 *
 * @module ui-kit/application/ports/inbound/EnterpriseGovernancePort
 * @version 1.0.0
 */

import type {
  EnterprisePolicy,
  PolicySet,
  PolicyContext,
  PolicyScope,
} from '../../../domain/governance';
import type { TokenCollection } from '../../../domain/tokens';

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * EnterpriseGovernancePort - Inbound port for governance operations.
 *
 * This port defines all operations available to external consumers
 * for enforcing enterprise design governance.
 *
 * Implementations:
 * - Direct use case invocation (application layer)
 * - React hooks/providers (adapter layer)
 * - CLI commands (adapter layer)
 * - REST API handlers (adapter layer)
 */
export interface EnterpriseGovernancePort {
  // ─────────────────────────────────────────────────────────────────────────
  // CORE ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Enforces governance on a color decision.
   */
  enforceColorGovernance(input: ColorGovernanceInput): Promise<GovernanceResult>;

  /**
   * Enforces governance on an accessibility decision.
   */
  enforceAccessibilityGovernance(input: AccessibilityGovernanceInput): Promise<GovernanceResult>;

  /**
   * Enforces governance on a token collection.
   */
  enforceTokenGovernance(input: TokenGovernanceInput): Promise<GovernanceResult>;

  /**
   * Enforces governance on a theme configuration.
   */
  enforceThemeGovernance(input: ThemeGovernanceInput): Promise<GovernanceResult>;

  /**
   * Enforces governance on a component configuration.
   */
  enforceComponentGovernance(input: ComponentGovernanceInput): Promise<GovernanceResult>;

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK CHECKS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Quick check - returns only compliance status.
   */
  isCompliant(input: QuickCheckInput): Promise<boolean>;

  /**
   * Gets compliance score (0-100).
   */
  getComplianceScore(input: QuickCheckInput): Promise<number>;

  // ─────────────────────────────────────────────────────────────────────────
  // POLICY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Gets the current policy set.
   */
  getPolicySet(): PolicySet;

  /**
   * Gets policies by scope.
   */
  getPoliciesByScope(scope: PolicyScope): readonly EnterprisePolicy[];

  /**
   * Enables a policy.
   */
  enablePolicy(policyId: string): void;

  /**
   * Disables a policy.
   */
  disablePolicy(policyId: string): void;

  /**
   * Adds a custom policy.
   */
  addPolicy(policy: EnterprisePolicy): void;

  /**
   * Removes a policy.
   */
  removePolicy(policyId: string): void;

  // ─────────────────────────────────────────────────────────────────────────
  // REPORTING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates a governance report.
   */
  generateReport(input: ReportInput): Promise<GovernanceReport>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface ColorGovernanceInput {
  readonly colorHex: string;
  readonly purpose?: 'brand' | 'text' | 'background' | 'border';
  readonly context?: Partial<PolicyContext>;
}

export interface AccessibilityGovernanceInput {
  readonly foregroundHex: string;
  readonly backgroundHex: string;
  readonly textSize?: 'normal' | 'large';
  readonly context?: Partial<PolicyContext>;
}

export interface TokenGovernanceInput {
  readonly tokens: TokenCollection;
  readonly namespace?: string;
  readonly context?: Partial<PolicyContext>;
}

export interface ThemeGovernanceInput {
  readonly hasLightMode: boolean;
  readonly hasDarkMode: boolean;
  readonly brandColorHex?: string;
  readonly context?: Partial<PolicyContext>;
}

export interface ComponentGovernanceInput {
  readonly componentName: string;
  readonly tokens?: TokenCollection;
  readonly brandColorHex?: string;
  readonly context?: Partial<PolicyContext>;
}

export interface QuickCheckInput {
  readonly type: 'color' | 'accessibility' | 'tokens' | 'theme' | 'component';
  readonly data: Record<string, unknown>;
}

export interface ReportInput {
  readonly scope?: PolicyScope;
  readonly format?: 'json' | 'markdown' | 'html';
  readonly includeDetails?: boolean;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface GovernanceResult {
  readonly success: boolean;
  readonly compliant: boolean;
  readonly complianceScore: number;
  readonly summary: {
    readonly status: 'pass' | 'fail' | 'warning';
    readonly headline: string;
    readonly details: string[];
    readonly recommendations: string[];
  };
  readonly violations: readonly GovernanceViolation[];
  readonly warnings: readonly GovernanceViolation[];
  readonly auditId?: string;
}

export interface GovernanceViolation {
  readonly policyId: string;
  readonly policyName: string;
  readonly severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  readonly message: string;
  readonly suggestion?: string;
  readonly autoFixable: boolean;
}

export interface GovernanceReport {
  readonly generatedAt: Date;
  readonly scope: PolicyScope | 'all';
  readonly totalPolicies: number;
  readonly enabledPolicies: number;
  readonly policyBreakdown: Record<string, number>;
  readonly content: string;
}

// ============================================================================
// FACTORY TYPE
// ============================================================================

/**
 * Factory function type for creating governance port instances.
 */
export type EnterpriseGovernancePortFactory = (config?: {
  strict?: boolean;
  customPolicies?: EnterprisePolicy[];
}) => EnterpriseGovernancePort;

// ============================================================================
// EXPORTS
// ============================================================================

export type { EnterpriseGovernancePort as default };
