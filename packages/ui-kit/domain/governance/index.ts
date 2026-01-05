/**
 * @fileoverview Governance Domain Module
 *
 * Enterprise governance domain layer for enforcing design policies
 * across all products and teams.
 *
 * @module ui-kit/domain/governance
 * @version 1.0.0
 */

// ============================================================================
// VALUE OBJECTS
// ============================================================================

export {
  EnterprisePolicy,
  PolicySet,
  type EnterprisePolicyConfig,
  type PolicyRule,
  type PolicyCondition,
  type AccessibilityCondition,
  type ColorCondition,
  type TokenCondition,
  type ThemeCondition,
  type CustomCondition,
  type PolicyContext,
  type PolicySeverity,
  type PolicyScope,
  type PolicyViolationDetail,
  type PolicyEvaluationResult,
} from './value-objects/EnterprisePolicy';

// ============================================================================
// SERVICES
// ============================================================================

export {
  GovernanceEvaluator,
  governanceEvaluator,
  type GovernanceEvaluationInput,
  type AggregatedEvaluationResult,
  type CustomEvaluatorFn,
} from './services/GovernanceEvaluator';

// ============================================================================
// PREBUILT POLICIES
// ============================================================================

import {
  EnterprisePolicy,
  PolicySet,
  type EnterprisePolicyConfig,
} from './value-objects/EnterprisePolicy';

/**
 * Pre-built enterprise policy configurations.
 */
export const ENTERPRISE_POLICIES: Record<string, EnterprisePolicyConfig> = {
  /**
   * WCAG AA Accessibility Policy
   */
  'accessibility-wcag-aa': {
    id: 'accessibility-wcag-aa',
    name: 'WCAG AA Compliance',
    description: 'Ensures all text meets WCAG 2.1 AA contrast requirements (4.5:1 for normal text)',
    category: 'accessibility',
    scope: 'accessibility',
    enforcement: 'required',
    severity: 'critical',
    version: '1.0.0',
    rules: [
      {
        id: 'wcag-aa-contrast',
        name: 'WCAG AA Contrast Ratio',
        condition: { type: 'accessibility', standard: 'wcag-aa', minContrast: 4.5 },
        message: 'Text contrast ratio must be at least 4.5:1 for WCAG AA compliance',
        suggestion: 'Increase the lightness difference between text and background colors',
        autoFixable: true,
      },
    ],
  },

  /**
   * APCA Body Text Policy
   */
  'accessibility-apca-body': {
    id: 'accessibility-apca-body',
    name: 'APCA Body Text Compliance',
    description: 'Ensures body text meets APCA perceptual contrast standards (Lc 60+)',
    category: 'accessibility',
    scope: 'accessibility',
    enforcement: 'recommended',
    severity: 'high',
    version: '1.0.0',
    rules: [
      {
        id: 'apca-body-contrast',
        name: 'APCA Body Text Contrast',
        condition: { type: 'accessibility', standard: 'apca-body', minContrast: 60 },
        message: 'Body text should have APCA contrast of at least Lc 60',
        suggestion: 'Adjust text or background color for better perceptual contrast',
        autoFixable: true,
      },
    ],
  },

  /**
   * Theme Coverage Policy
   */
  'theme-mode-coverage': {
    id: 'theme-mode-coverage',
    name: 'Light/Dark Mode Coverage',
    description: 'Ensures themes support both light and dark modes',
    category: 'custom',
    scope: 'theme',
    enforcement: 'required',
    severity: 'high',
    version: '1.0.0',
    rules: [
      {
        id: 'dual-mode',
        name: 'Dual Mode Support',
        condition: { type: 'theme', check: 'mode-coverage', modes: ['light', 'dark'] },
        message: 'Theme must support both light and dark modes',
        suggestion: 'Generate theme tokens for both light and dark modes',
        autoFixable: false,
      },
    ],
  },

  /**
   * Token Naming Convention Policy
   */
  'token-naming-convention': {
    id: 'token-naming-convention',
    name: 'Token Naming Convention',
    description: 'Enforces consistent token naming patterns (kebab-case)',
    category: 'custom',
    scope: 'token',
    enforcement: 'required',
    severity: 'medium',
    version: '1.0.0',
    rules: [
      {
        id: 'kebab-case',
        name: 'Kebab Case Naming',
        condition: {
          type: 'token',
          check: 'naming-convention',
          pattern: '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
        },
        message: 'Token names must use kebab-case format',
        suggestion: 'Rename tokens to use lowercase with hyphens (e.g., "primary-color")',
        autoFixable: true,
      },
    ],
  },

  /**
   * Brand Color Saturation Policy
   */
  'color-minimum-saturation': {
    id: 'color-minimum-saturation',
    name: 'Minimum Color Saturation',
    description: 'Ensures brand colors have sufficient saturation for visual impact',
    category: 'brand-consistency',
    scope: 'component',
    enforcement: 'recommended',
    severity: 'low',
    version: '1.0.0',
    rules: [
      {
        id: 'min-saturation',
        name: 'Minimum Saturation Check',
        condition: { type: 'color', check: 'saturation', threshold: 15 },
        message: 'Brand colors should have at least 15% saturation',
        suggestion: 'Increase the chroma/saturation of the color',
        autoFixable: true,
      },
    ],
  },
};

/**
 * Creates the default enterprise policy set.
 */
export function createDefaultPolicySet(): PolicySet {
  const policies: EnterprisePolicy[] = [];

  for (const config of Object.values(ENTERPRISE_POLICIES)) {
    const result = EnterprisePolicy.create(config);
    if (result.success) {
      policies.push(result.value);
    }
  }

  return new PolicySet(policies);
}

/**
 * Creates a strict enterprise policy set (all required, critical).
 */
export function createStrictPolicySet(): PolicySet {
  const policies: EnterprisePolicy[] = [];

  for (const config of Object.values(ENTERPRISE_POLICIES)) {
    const strictConfig: EnterprisePolicyConfig = {
      ...config,
      enforcement: 'required',
      severity: config.severity === 'info' ? 'low' : config.severity,
    };

    const result = EnterprisePolicy.create(strictConfig);
    if (result.success) {
      policies.push(result.value);
    }
  }

  return new PolicySet(policies);
}

/**
 * Creates a lenient enterprise policy set (all optional).
 */
export function createLenientPolicySet(): PolicySet {
  const policies: EnterprisePolicy[] = [];

  for (const config of Object.values(ENTERPRISE_POLICIES)) {
    const lenientConfig: EnterprisePolicyConfig = {
      ...config,
      enforcement: 'optional',
    };

    const result = EnterprisePolicy.create(lenientConfig);
    if (result.success) {
      policies.push(result.value);
    }
  }

  return new PolicySet(policies);
}
