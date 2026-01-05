// ============================================
// WCAG 2.1 Built-in Policies
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Pre-defined policies for WCAG 2.1 compliance levels.
// These policies evaluate contrast ratio requirements.
//
// ============================================

import type { PerceptualPolicy } from '../../types/policy';
import type { CompositePolicy, PolicyRule } from '../../types/policy-composition';
import { createPolicy, policyId, policyVersion, ruleId } from '../../types/policy';
import { createRule } from '../../types/policy-composition';

// ============================================
// WCAG 2.1 Level A Policy
// ============================================

/**
 * WCAG 2.1 Level A - Minimum Accessibility
 *
 * Requires:
 * - 3:1 contrast ratio for large text (18pt+ or 14pt+ bold)
 * - No specific ratio for normal text at Level A
 *
 * Note: Level A is rarely used alone; AA is the minimum
 * for most accessibility regulations.
 */
export const WCAG21_A_POLICY: PerceptualPolicy = createPolicy({
  id: 'wcag21-a',
  name: 'WCAG 2.1 Level A',
  description: 'Minimum accessibility level for WCAG 2.1. Requires 3:1 contrast for large text only.',
  version: '1.0.0',
  priority: 'medium',
  enforcement: 'advisory',
  category: 'accessibility',
  applicableContexts: [],
  enabled: true,
  expiresAt: null,
  tags: ['wcag', 'wcag21', 'accessibility', 'level-a'],
  requirements: {
    minWcagLevel: 'A',
    minContrastRatio: 3.0, // For large text
  },
});

// ============================================
// WCAG 2.1 Level AA Policy
// ============================================

/**
 * WCAG 2.1 Level AA - Standard Accessibility
 *
 * Requires:
 * - 4.5:1 contrast ratio for normal text (<18pt)
 * - 3:1 contrast ratio for large text (18pt+ or 14pt+ bold)
 *
 * This is the most commonly required level for:
 * - Section 508 (US Federal)
 * - ADA compliance
 * - EN 301 549 (EU)
 * - Many organizational standards
 */
export const WCAG21_AA_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag21-aa',
    name: 'WCAG 2.1 Level AA',
    description: 'Standard accessibility level. Requires 4.5:1 for normal text, 3:1 for large text.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag21', 'accessibility', 'level-aa', 'ada', 'section508'],
    requirements: {
      minWcagLevel: 'AA',
      minContrastRatio: 4.5, // Normal text
    },
  }),
  rules: [
    createRule({
      id: 'normal-text-contrast',
      name: 'Normal Text Contrast',
      description: 'Text smaller than 18pt (or 14pt bold) requires 4.5:1 ratio',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 4.5,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Contrast ratio {value}:1 is below WCAG 2.1 AA minimum 4.5:1 for normal text',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'large-text-contrast',
      name: 'Large Text Contrast',
      description: 'Text 18pt+ (or 14pt+ bold) requires 3:1 ratio',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 3.0,
      },
      severity: 'error',
      priority: 'high',
      message: 'Contrast ratio {value}:1 is below WCAG 2.1 AA minimum 3:1 for large text (18pt+)',
      enabled: true,
      // This rule applies when font is large (18pt ≈ 24px)
      applicableContexts: [{ textSize: 'large' }],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 2.1 Level AAA Policy
// ============================================

/**
 * WCAG 2.1 Level AAA - Enhanced Accessibility
 *
 * Requires:
 * - 7:1 contrast ratio for normal text
 * - 4.5:1 contrast ratio for large text
 *
 * This is the highest WCAG 2.1 level and may not be
 * achievable for all content. Use for:
 * - Critical UI elements
 * - Government/healthcare applications
 * - Maximum accessibility requirements
 */
export const WCAG21_AAA_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag21-aaa',
    name: 'WCAG 2.1 Level AAA',
    description: 'Enhanced accessibility level. Requires 7:1 for normal text, 4.5:1 for large text.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag21', 'accessibility', 'level-aaa', 'enhanced'],
    requirements: {
      minWcagLevel: 'AAA',
      minContrastRatio: 7.0, // Normal text
    },
  }),
  rules: [
    createRule({
      id: 'normal-text-contrast-aaa',
      name: 'Normal Text Contrast (AAA)',
      description: 'Text smaller than 18pt requires 7:1 ratio for AAA',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 7.0,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Contrast ratio {value}:1 is below WCAG 2.1 AAA minimum 7:1 for normal text',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'large-text-contrast-aaa',
      name: 'Large Text Contrast (AAA)',
      description: 'Text 18pt+ requires 4.5:1 ratio for AAA',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 4.5,
      },
      severity: 'error',
      priority: 'high',
      message: 'Contrast ratio {value}:1 is below WCAG 2.1 AAA minimum 4.5:1 for large text (18pt+)',
      enabled: true,
      // This rule applies when font is large (18pt ≈ 24px)
      applicableContexts: [{ textSize: 'large' }],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 2.1 Non-Text Policy
// ============================================

/**
 * WCAG 2.1 Non-Text Contrast
 *
 * For UI components and graphical objects (not text):
 * - 3:1 contrast ratio against adjacent colors
 *
 * Applies to:
 * - Form field boundaries
 * - Icon outlines
 * - Chart elements
 * - Focus indicators
 */
export const WCAG21_NON_TEXT_POLICY: PerceptualPolicy = createPolicy({
  id: 'wcag21-non-text',
  name: 'WCAG 2.1 Non-Text Contrast',
  description: 'UI components and graphical objects require 3:1 contrast (SC 1.4.11)',
  version: '1.0.0',
  priority: 'high',
  enforcement: 'strict',
  category: 'accessibility',
  applicableContexts: [
    { component: 'icon' },
    { component: 'chart' },
    { component: 'form-field' },
    { component: 'focus-indicator' },
  ],
  enabled: true,
  expiresAt: null,
  tags: ['wcag', 'wcag21', 'non-text', 'ui-components', '1.4.11'],
  requirements: {
    minContrastRatio: 3.0,
  },
});

// ============================================
// All WCAG 2.1 Policies
// ============================================

export const WCAG21_POLICIES: ReadonlyArray<PerceptualPolicy | CompositePolicy> = [
  WCAG21_A_POLICY,
  WCAG21_AA_POLICY,
  WCAG21_AAA_POLICY,
  WCAG21_NON_TEXT_POLICY,
];

/**
 * Get a WCAG 2.1 policy by level
 */
export function getWcag21Policy(
  level: 'A' | 'AA' | 'AAA'
): PerceptualPolicy | CompositePolicy {
  switch (level) {
    case 'A':
      return WCAG21_A_POLICY;
    case 'AA':
      return WCAG21_AA_POLICY;
    case 'AAA':
      return WCAG21_AAA_POLICY;
  }
}
