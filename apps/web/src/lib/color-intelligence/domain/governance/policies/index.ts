// ============================================
// Built-in Policies - Public Exports
// Phase 4: Governance & Adoption Layer
// ============================================
//
// This module exports all built-in policies for
// the Color Intelligence governance system.
//
// Policy Categories:
// - WCAG 2.1: Traditional contrast ratio policies
// - WCAG 3.0: APCA-based perceptual contrast
// - Brand: Color preservation during adjustments
// - Accessibility: Enhanced modes and CVD support
//
// ============================================

// ============================================
// WCAG 2.1 Policies
// ============================================

export {
  // Individual policies
  WCAG21_A_POLICY,
  WCAG21_AA_POLICY,
  WCAG21_AAA_POLICY,
  WCAG21_NON_TEXT_POLICY,

  // Collection
  WCAG21_POLICIES,

  // Utility
  getWcag21Policy,
} from './wcag21';

// ============================================
// WCAG 3.0 (APCA) Policies
// ============================================

export {
  // Individual policies
  WCAG30_BRONZE_POLICY,
  WCAG30_SILVER_POLICY,
  WCAG30_GOLD_POLICY,
  WCAG30_PLATINUM_POLICY,
  WCAG30_FONT_SCALED_POLICY,
  WCAG30_SPOT_TEXT_POLICY,

  // Collection
  WCAG30_POLICIES,

  // Utilities
  getWcag30Policy,
  getRecommendedLcForFont,
} from './wcag30';

// ============================================
// Brand Preservation Policies
// ============================================

export {
  // Individual policies
  BRAND_HUE_PRESERVATION_POLICY,
  BRAND_CHROMA_PRESERVATION_POLICY,
  BRAND_ACCESSIBILITY_BALANCED_POLICY,
  BRAND_PRIMARY_COLOR_POLICY,
  BRAND_SECONDARY_COLOR_POLICY,

  // Collection
  BRAND_POLICIES,

  // Factory
  createBrandPolicy,
} from './brand';

// ============================================
// Accessibility Mode Policies
// ============================================

export {
  // Individual policies
  HIGH_CONTRAST_MODE_POLICY,
  FOCUS_VISIBILITY_POLICY,
  COLOR_BLINDNESS_SAFE_POLICY,
  DARK_MODE_ACCESSIBILITY_POLICY,
  LIGHT_MODE_ACCESSIBILITY_POLICY,
  REDUCED_MOTION_POLICY,
  ERROR_STATE_VISIBILITY_POLICY,

  // Collection
  ACCESSIBILITY_POLICIES,

  // Utilities
  getAccessibilityPoliciesForMode,
  getAccessibilityPoliciesForColorScheme,
} from './accessibility';

// ============================================
// All Built-in Policies
// ============================================

import { WCAG21_POLICIES } from './wcag21';
import { WCAG30_POLICIES } from './wcag30';
import { BRAND_POLICIES } from './brand';
import { ACCESSIBILITY_POLICIES } from './accessibility';
import type { PerceptualPolicy } from '../types/policy';
import type { CompositePolicy } from '../types/policy-composition';

/**
 * All built-in policies combined
 */
export const ALL_BUILTIN_POLICIES: ReadonlyArray<PerceptualPolicy | CompositePolicy> = [
  ...WCAG21_POLICIES,
  ...WCAG30_POLICIES,
  ...BRAND_POLICIES,
  ...ACCESSIBILITY_POLICIES,
] as const;

/**
 * Policy lookup by ID
 */
const POLICY_MAP = new Map<string, PerceptualPolicy | CompositePolicy>(
  ALL_BUILTIN_POLICIES.map((p) => [p.id, p])
);

/**
 * Get a built-in policy by ID
 *
 * @param id - Policy ID (e.g., 'wcag21-aa', 'wcag30-silver')
 * @returns The policy or undefined if not found
 */
export function getBuiltinPolicy(id: string): PerceptualPolicy | CompositePolicy | undefined {
  return POLICY_MAP.get(id);
}

/**
 * Check if a policy ID refers to a built-in policy
 */
export function isBuiltinPolicy(id: string): boolean {
  return POLICY_MAP.has(id);
}

/**
 * Get all policies for a given category
 */
export function getPoliciesByCategory(
  category: 'accessibility' | 'brand'
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  return ALL_BUILTIN_POLICIES.filter((p) => p.category === category);
}

/**
 * Get all policies with a specific tag
 */
export function getPoliciesByTag(
  tag: string
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  return ALL_BUILTIN_POLICIES.filter((p) => p.tags.includes(tag));
}

/**
 * Get policies suitable for a given WCAG level
 */
export function getPoliciesForWcagLevel(
  level: 'A' | 'AA' | 'AAA'
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  const levelPolicies: string[] = [];

  switch (level) {
    case 'AAA':
      levelPolicies.push('wcag21-aaa');
    // Fall through
    case 'AA':
      levelPolicies.push('wcag21-aa');
    // Fall through
    case 'A':
      levelPolicies.push('wcag21-a', 'wcag21-non-text');
      break;
  }

  return levelPolicies
    .map((id) => POLICY_MAP.get(id))
    .filter((p): p is PerceptualPolicy | CompositePolicy => p !== undefined);
}

/**
 * Get policies suitable for a given WCAG 3.0 tier
 */
export function getPoliciesForWcag3Tier(
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  const tierPolicies: string[] = [];

  switch (tier) {
    case 'Platinum':
      tierPolicies.push('wcag30-platinum');
    // Fall through
    case 'Gold':
      tierPolicies.push('wcag30-gold');
    // Fall through
    case 'Silver':
      tierPolicies.push('wcag30-silver');
    // Fall through
    case 'Bronze':
      tierPolicies.push('wcag30-bronze', 'wcag30-font-scaled', 'wcag30-spot-text');
      break;
  }

  return tierPolicies
    .map((id) => POLICY_MAP.get(id))
    .filter((p): p is PerceptualPolicy | CompositePolicy => p !== undefined);
}

// ============================================
// Policy Presets
// ============================================

/**
 * Common policy presets for quick setup
 */
export const POLICY_PRESETS = {
  /**
   * Basic web accessibility (WCAG 2.1 AA)
   */
  webBasic: ['wcag21-aa', 'wcag21-non-text', 'focus-visibility'],

  /**
   * Enhanced web accessibility (WCAG 2.1 AAA)
   */
  webEnhanced: ['wcag21-aaa', 'wcag21-non-text', 'focus-visibility', 'color-blindness-safe'],

  /**
   * Modern APCA-based accessibility (WCAG 3.0 Silver)
   */
  modernApca: ['wcag30-silver', 'wcag30-font-scaled', 'focus-visibility'],

  /**
   * Brand-conscious accessibility
   */
  brandAware: ['brand-accessibility-balanced', 'focus-visibility', 'error-state-visibility'],

  /**
   * High contrast mode support
   */
  highContrast: ['high-contrast-mode', 'focus-visibility', 'error-state-visibility'],

  /**
   * Full accessibility coverage
   */
  comprehensive: [
    'wcag21-aa',
    'wcag30-silver',
    'focus-visibility',
    'color-blindness-safe',
    'error-state-visibility',
    'dark-mode-accessibility',
    'light-mode-accessibility',
  ],
} as const;

/**
 * Get policies for a preset
 */
export function getPoliciesForPreset(
  preset: keyof typeof POLICY_PRESETS
): ReadonlyArray<PerceptualPolicy | CompositePolicy> {
  const policyIds = POLICY_PRESETS[preset];
  return policyIds
    .map((id) => POLICY_MAP.get(id))
    .filter((p): p is PerceptualPolicy | CompositePolicy => p !== undefined);
}

// ============================================
// Module Documentation
// ============================================

/**
 * @module domain/governance/policies
 *
 * Built-in policies for the Color Intelligence governance system.
 *
 * ## Policy Categories
 *
 * ### WCAG 2.1 Policies
 * Traditional contrast ratio-based policies:
 * - `WCAG21_A_POLICY` - Level A (3:1 large text)
 * - `WCAG21_AA_POLICY` - Level AA (4.5:1 normal, 3:1 large)
 * - `WCAG21_AAA_POLICY` - Level AAA (7:1 normal, 4.5:1 large)
 * - `WCAG21_NON_TEXT_POLICY` - UI components (3:1)
 *
 * ### WCAG 3.0 (APCA) Policies
 * Perceptual contrast-based policies:
 * - `WCAG30_BRONZE_POLICY` - Lc ≥ 60
 * - `WCAG30_SILVER_POLICY` - Lc ≥ 75
 * - `WCAG30_GOLD_POLICY` - Lc ≥ 90
 * - `WCAG30_PLATINUM_POLICY` - Lc ≥ 105
 * - `WCAG30_FONT_SCALED_POLICY` - Dynamic Lc by font
 * - `WCAG30_SPOT_TEXT_POLICY` - Headlines/labels
 *
 * ### Brand Policies
 * Color preservation during adjustments:
 * - `BRAND_HUE_PRESERVATION_POLICY` - ±15° hue
 * - `BRAND_CHROMA_PRESERVATION_POLICY` - 30% chroma
 * - `BRAND_ACCESSIBILITY_BALANCED_POLICY` - AA + brand
 * - `BRAND_PRIMARY_COLOR_POLICY` - Strict for logos
 * - `BRAND_SECONDARY_COLOR_POLICY` - Relaxed for accents
 *
 * ### Accessibility Mode Policies
 * Enhanced accessibility support:
 * - `HIGH_CONTRAST_MODE_POLICY` - OS high contrast
 * - `FOCUS_VISIBILITY_POLICY` - Focus indicators
 * - `COLOR_BLINDNESS_SAFE_POLICY` - CVD support
 * - `DARK_MODE_ACCESSIBILITY_POLICY` - Dark mode
 * - `LIGHT_MODE_ACCESSIBILITY_POLICY` - Light mode
 * - `REDUCED_MOTION_POLICY` - Motion considerations
 * - `ERROR_STATE_VISIBILITY_POLICY` - Error states
 *
 * ## Usage
 *
 * ```typescript
 * import {
 *   WCAG21_AA_POLICY,
 *   getBuiltinPolicy,
 *   getPoliciesForPreset,
 * } from './policies';
 *
 * // Use a specific policy
 * registry.register(WCAG21_AA_POLICY);
 *
 * // Look up by ID
 * const policy = getBuiltinPolicy('wcag30-silver');
 *
 * // Use a preset
 * const policies = getPoliciesForPreset('webBasic');
 * policies.forEach(p => registry.register(p));
 * ```
 */
