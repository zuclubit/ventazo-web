// ============================================
// Accessibility Mode Policies
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Policies for enhanced accessibility modes:
// - High-contrast mode
// - Reduced motion considerations
// - Color blindness accommodations
// - Focus visibility requirements
//
// ============================================

import type { PerceptualPolicy } from '../../types/policy';
import type { CompositePolicy, PolicyRule } from '../../types/policy-composition';
import { createPolicy, policyId, policyVersion, ruleId } from '../../types/policy';
import { createRule, createMinApcaLcRule, createMinContrastRatioRule } from '../../types/policy-composition';

// ============================================
// High Contrast Mode Policy
// ============================================

/**
 * High Contrast Mode Policy
 *
 * For users who enable high contrast mode in their OS
 * or browser settings.
 *
 * Requirements:
 * - APCA Lc ≥ 100 for all text
 * - Contrast ratio ≥ 7:1 for text
 * - Contrast ratio ≥ 4.5:1 for UI elements
 *
 * Typically used with:
 * - Windows High Contrast Mode
 * - macOS Increase Contrast
 * - CSS prefers-contrast: more
 */
export const HIGH_CONTRAST_MODE_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'high-contrast-mode',
    name: 'High Contrast Mode',
    description: 'Enhanced contrast for high contrast mode users. Requires Lc ≥ 100 / 7:1 ratio.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { accessibilityMode: 'enhanced' },
      { colorScheme: 'high-contrast' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'high-contrast', 'enhanced', 'a11y'],
    requirements: {
      minApcaLc: 100,
      minContrastRatio: 7.0,
      minWcagLevel: 'AAA',
    },
  }),
  rules: [
    createMinApcaLcRule('high-contrast-lc', 100, {
      name: 'High Contrast APCA Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createMinContrastRatioRule('high-contrast-ratio', 7.0, {
      name: 'High Contrast Ratio',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'high-contrast-ui-elements',
      name: 'High Contrast UI Elements',
      description: 'UI elements require 4.5:1 contrast in high contrast mode',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 4.5,
      },
      severity: 'error',
      priority: 'high',
      message: 'UI element contrast {value}:1 is below minimum 4.5:1 required for high contrast mode',
      enabled: true,
      applicableContexts: [
        { component: 'button' },
        { component: 'input' },
        { component: 'icon' },
        { component: 'border' },
      ],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Focus Visibility Policy
// ============================================

/**
 * Focus Visibility Policy
 *
 * Ensures focus indicators are visible and meet
 * accessibility requirements.
 *
 * Per WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Appearance):
 * - Focus indicators must be visible
 * - 3:1 contrast against adjacent colors
 * - Sufficient area/perimeter
 */
export const FOCUS_VISIBILITY_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'focus-visibility',
    name: 'Focus Visibility',
    description: 'Ensures focus indicators meet WCAG 2.4.7 and 2.4.11 requirements.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { component: 'focus-indicator' },
      { component: 'focus-ring' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'focus', 'keyboard', 'wcag', '2.4.7', '2.4.11'],
    requirements: {
      minContrastRatio: 3.0,
    },
  }),
  rules: [
    createRule({
      id: 'focus-contrast',
      name: 'Focus Indicator Contrast',
      description: 'Focus indicators require 3:1 contrast against adjacent colors',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 3.0,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Focus indicator contrast {value}:1 is below minimum 3:1 required',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'focus-not-color-only',
      name: 'Focus Not Color Only',
      description: 'Focus indication should not rely on color alone',
      condition: {
        target: 'hasNonColorIndicator',
        operator: 'eq',
        value: true,
      },
      severity: 'warning',
      priority: 'high',
      message: 'Focus indication relies on color alone, add non-color indicator',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Color Blindness Safe Policy
// ============================================

/**
 * Color Blindness Safe Policy
 *
 * Ensures colors are distinguishable for users with
 * common forms of color blindness.
 *
 * Covers:
 * - Protanopia (red-blind)
 * - Deuteranopia (green-blind)
 * - Tritanopia (blue-blind)
 *
 * Key principle: Don't rely on color alone.
 */
export const COLOR_BLINDNESS_SAFE_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'color-blindness-safe',
    name: 'Color Blindness Safe',
    description: 'Ensures colors are distinguishable for color blind users.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'color-blindness', 'cvd', 'a11y'],
    requirements: {
      colorBlindnessSafe: true,
    },
  }),
  rules: [
    createRule({
      id: 'not-color-only',
      name: 'Not Color Only',
      description: 'Information should not be conveyed by color alone (WCAG 1.4.1)',
      condition: {
        target: 'hasNonColorIndicator',
        operator: 'eq',
        value: true,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Information is conveyed by color alone, add non-color indicator (WCAG 1.4.1)',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'cvd-distinguishable',
      name: 'CVD Distinguishable',
      description: 'Colors should be distinguishable under CVD simulation',
      condition: {
        target: 'cvdDistinguishable',
        operator: 'eq',
        value: true,
      },
      severity: 'warning',
      priority: 'high',
      message: 'Colors are not distinguishable under color vision deficiency simulation',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'lightness-difference',
      name: 'Lightness Difference',
      description: 'Adjacent colors should differ by at least 30 lightness units',
      condition: {
        target: 'lightnessDifference',
        operator: 'gte',
        value: 30,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Lightness difference {value} is below recommended 30 units for CVD accessibility',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Dark Mode Accessibility Policy
// ============================================

/**
 * Dark Mode Accessibility Policy
 *
 * Ensures dark mode implementations remain accessible.
 *
 * Common issues in dark mode:
 * - Insufficient contrast on dark backgrounds
 * - Text that's too bright (causing halation)
 * - Lost focus indicators
 */
export const DARK_MODE_ACCESSIBILITY_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'dark-mode-accessibility',
    name: 'Dark Mode Accessibility',
    description: 'Ensures dark mode maintains accessibility standards.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { colorScheme: 'dark' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'dark-mode', 'contrast'],
    requirements: {
      minApcaLc: 75,
      minContrastRatio: 4.5,
    },
  }),
  rules: [
    createMinApcaLcRule('dark-mode-lc', 75, {
      name: 'Dark Mode APCA Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'dark-mode-max-lightness',
      name: 'Dark Mode Max Text Lightness',
      description: 'Text should not be pure white (causes halation); max L* 95',
      condition: {
        target: 'foregroundLightness',
        operator: 'lte',
        value: 95,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Text lightness {value} exceeds 95, may cause halation on dark backgrounds',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'dark-mode-min-bg-lightness',
      name: 'Dark Mode Min Background',
      description: 'Background should be sufficiently dark; max L* 25',
      condition: {
        target: 'backgroundLightness',
        operator: 'lte',
        value: 25,
      },
      severity: 'info',
      priority: 'low',
      message: 'Background lightness {value} exceeds 25, may not be dark enough for dark mode',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Light Mode Accessibility Policy
// ============================================

/**
 * Light Mode Accessibility Policy
 *
 * Ensures light mode implementations remain accessible.
 *
 * Common issues in light mode:
 * - Text that's too light
 * - Low contrast on white backgrounds
 */
export const LIGHT_MODE_ACCESSIBILITY_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'light-mode-accessibility',
    name: 'Light Mode Accessibility',
    description: 'Ensures light mode maintains accessibility standards.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { colorScheme: 'light' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'light-mode', 'contrast'],
    requirements: {
      minApcaLc: 75,
      minContrastRatio: 4.5,
    },
  }),
  rules: [
    createMinApcaLcRule('light-mode-lc', 75, {
      name: 'Light Mode APCA Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'light-mode-min-text-darkness',
      name: 'Light Mode Min Text Darkness',
      description: 'Text should be sufficiently dark; max L* 45 on light backgrounds',
      condition: {
        target: 'foregroundLightness',
        operator: 'lte',
        value: 45,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Text lightness {value} exceeds 45, may not be dark enough on light backgrounds',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Reduced Motion Considerations Policy
// ============================================

/**
 * Reduced Motion Considerations
 *
 * While primarily about animation, this policy
 * includes color considerations for motion-reduced
 * experiences.
 *
 * When animations are disabled, color changes
 * may need to be more pronounced to indicate
 * state changes.
 */
export const REDUCED_MOTION_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'reduced-motion',
    name: 'Reduced Motion Considerations',
    description: 'Color considerations when animations are disabled.',
    version: '1.0.0',
    priority: 'medium',
    enforcement: 'advisory',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'reduced-motion', 'vestibular'],
    requirements: {},
  }),
  rules: [
    createRule({
      id: 'state-change-contrast',
      name: 'State Change Contrast',
      description: 'State changes should have clear color differentiation when animation is reduced',
      condition: {
        target: 'stateChangeContrast',
        operator: 'gte',
        value: 3.0,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'State change contrast {value}:1 is below 3:1 recommended when animation is disabled',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Error State Visibility Policy
// ============================================

/**
 * Error State Visibility Policy
 *
 * Ensures error states are clearly visible
 * and don't rely on color alone.
 */
export const ERROR_STATE_VISIBILITY_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'error-state-visibility',
    name: 'Error State Visibility',
    description: 'Ensures error states are visible and accessible.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { component: 'error' },
      { component: 'validation-error' },
      { component: 'alert-error' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['accessibility', 'error', 'validation', 'visibility'],
    requirements: {
      minContrastRatio: 4.5,
    },
  }),
  rules: [
    createRule({
      id: 'error-contrast',
      name: 'Error State Contrast',
      description: 'Error indicators must have 4.5:1 contrast',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 4.5,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Error indicator contrast {value}:1 is below minimum 4.5:1 required',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'error-not-color-only',
      name: 'Error Not Color Only',
      description: 'Error indication must not rely on color alone',
      condition: {
        target: 'hasNonColorIndicator',
        operator: 'eq',
        value: true,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Error indication relies on color alone, add icon or text indicator',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// All Accessibility Policies
// ============================================

export const ACCESSIBILITY_POLICIES: ReadonlyArray<PerceptualPolicy | CompositePolicy> = [
  HIGH_CONTRAST_MODE_POLICY,
  FOCUS_VISIBILITY_POLICY,
  COLOR_BLINDNESS_SAFE_POLICY,
  DARK_MODE_ACCESSIBILITY_POLICY,
  LIGHT_MODE_ACCESSIBILITY_POLICY,
  REDUCED_MOTION_POLICY,
  ERROR_STATE_VISIBILITY_POLICY,
];

/**
 * Get policies for a specific accessibility mode
 */
export function getAccessibilityPoliciesForMode(
  mode: 'standard' | 'enhanced' | 'high-contrast'
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  switch (mode) {
    case 'standard':
      return [
        FOCUS_VISIBILITY_POLICY,
        COLOR_BLINDNESS_SAFE_POLICY,
        ERROR_STATE_VISIBILITY_POLICY,
      ];
    case 'enhanced':
    case 'high-contrast':
      return [
        HIGH_CONTRAST_MODE_POLICY,
        FOCUS_VISIBILITY_POLICY,
        COLOR_BLINDNESS_SAFE_POLICY,
        ERROR_STATE_VISIBILITY_POLICY,
      ];
  }
}

/**
 * Get policies for a specific color scheme
 */
export function getAccessibilityPoliciesForColorScheme(
  scheme: 'light' | 'dark' | 'high-contrast'
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  switch (scheme) {
    case 'light':
      return [
        LIGHT_MODE_ACCESSIBILITY_POLICY,
        FOCUS_VISIBILITY_POLICY,
        ERROR_STATE_VISIBILITY_POLICY,
      ];
    case 'dark':
      return [
        DARK_MODE_ACCESSIBILITY_POLICY,
        FOCUS_VISIBILITY_POLICY,
        ERROR_STATE_VISIBILITY_POLICY,
      ];
    case 'high-contrast':
      return [
        HIGH_CONTRAST_MODE_POLICY,
        FOCUS_VISIBILITY_POLICY,
        ERROR_STATE_VISIBILITY_POLICY,
      ];
  }
}
