// ============================================
// WCAG 3.0 Built-in Policies (APCA-based)
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Pre-defined policies for WCAG 3.0 accessibility tiers.
// These policies use APCA Lc (Lightness Contrast) values.
//
// APCA Reference Table (body text, 400 weight):
// - Bronze: Lc ≥ 60 (minimum readable)
// - Silver: Lc ≥ 75 (preferred)
// - Gold: Lc ≥ 90 (enhanced)
// - Platinum: Lc ≥ 105 (maximum)
//
// ============================================

import type { PerceptualPolicy } from '../../types/policy';
import type { CompositePolicy, PolicyRule } from '../../types/policy-composition';
import { createPolicy, policyId, policyVersion, ruleId } from '../../types/policy';
import { createRule, createMinApcaLcRule } from '../../types/policy-composition';

// ============================================
// WCAG 3.0 Bronze Tier Policy
// ============================================

/**
 * WCAG 3.0 Bronze - Minimum Readability
 *
 * Requires APCA Lc ≥ 60 for body text.
 *
 * This is the minimum for:
 * - Body text (14-16px, 400 weight)
 * - Functional text that must be readable
 *
 * Note: Bronze is NOT sufficient for:
 * - Small text (<14px)
 * - Thin fonts (< 400 weight)
 * - Critical UI elements
 */
export const WCAG30_BRONZE_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-bronze',
    name: 'WCAG 3.0 Bronze Tier',
    description: 'Minimum readability tier. Requires APCA Lc ≥ 60 for body text.',
    version: '1.0.0',
    priority: 'medium',
    enforcement: 'advisory',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'bronze', 'accessibility'],
    requirements: {
      minWcag3Tier: 'Bronze',
      minApcaLc: 60,
    },
  }),
  rules: [
    createMinApcaLcRule('bronze-min-lc', 60, {
      name: 'Bronze Minimum Lc',
      severity: 'error',
      priority: 'high',
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 3.0 Silver Tier Policy
// ============================================

/**
 * WCAG 3.0 Silver - Preferred Readability
 *
 * Requires APCA Lc ≥ 75 for body text.
 *
 * This is the preferred level for:
 * - Body text (14-18px, 400-500 weight)
 * - Content that users will read for extended periods
 * - Most UI text elements
 *
 * Roughly equivalent to WCAG 2.1 AA for most text.
 */
export const WCAG30_SILVER_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-silver',
    name: 'WCAG 3.0 Silver Tier',
    description: 'Preferred readability tier. Requires APCA Lc ≥ 75 for body text.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'silver', 'accessibility', 'preferred'],
    requirements: {
      minWcag3Tier: 'Silver',
      minApcaLc: 75,
    },
  }),
  rules: [
    createMinApcaLcRule('silver-min-lc', 75, {
      name: 'Silver Minimum Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'silver-font-size',
      name: 'Silver Font Size Recommendation',
      description: 'Font size should be at least 14px for Silver tier',
      condition: {
        target: 'fontSize',
        operator: 'gte',
        value: 14,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Font size {value}px is below recommended 14px for Silver tier',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 3.0 Gold Tier Policy
// ============================================

/**
 * WCAG 3.0 Gold - Enhanced Readability
 *
 * Requires APCA Lc ≥ 90 for body text.
 *
 * This tier provides:
 * - Excellent readability across conditions
 * - Better support for users with mild vision impairments
 * - Comfortable reading in suboptimal lighting
 *
 * Recommended for:
 * - Long-form content
 * - Educational materials
 * - Healthcare/government applications
 */
export const WCAG30_GOLD_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-gold',
    name: 'WCAG 3.0 Gold Tier',
    description: 'Enhanced readability tier. Requires APCA Lc ≥ 90 for body text.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'gold', 'accessibility', 'enhanced'],
    requirements: {
      minWcag3Tier: 'Gold',
      minApcaLc: 90,
    },
  }),
  rules: [
    createMinApcaLcRule('gold-min-lc', 90, {
      name: 'Gold Minimum Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'gold-font-size',
      name: 'Gold Font Size Recommendation',
      description: 'Font size should be at least 16px for Gold tier',
      condition: {
        target: 'fontSize',
        operator: 'gte',
        value: 16,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Font size {value}px is below recommended 16px for Gold tier',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 3.0 Platinum Tier Policy
// ============================================

/**
 * WCAG 3.0 Platinum - Maximum Readability
 *
 * Requires APCA Lc ≥ 105 for body text.
 *
 * This is the highest tier, providing:
 * - Maximum contrast for any condition
 * - Support for users with significant vision impairments
 * - Readability in poor viewing conditions
 *
 * Note: May require near-black/white color pairs.
 * Not always achievable with brand colors.
 */
export const WCAG30_PLATINUM_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-platinum',
    name: 'WCAG 3.0 Platinum Tier',
    description: 'Maximum readability tier. Requires APCA Lc ≥ 105 for body text.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'platinum', 'accessibility', 'maximum'],
    requirements: {
      minWcag3Tier: 'Platinum',
      minApcaLc: 105,
    },
  }),
  rules: [
    createMinApcaLcRule('platinum-min-lc', 105, {
      name: 'Platinum Minimum Lc',
      severity: 'error',
      priority: 'critical',
    }),
    createRule({
      id: 'platinum-font-weight',
      name: 'Platinum Font Weight Recommendation',
      description: 'Font weight should be at least 400 for Platinum tier',
      condition: {
        target: 'fontWeight',
        operator: 'gte',
        value: 400,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Font weight {value} is below recommended 400 for Platinum tier',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 3.0 Font-Scaled Policies
// ============================================

/**
 * WCAG 3.0 Font-Scaled Policy
 *
 * Uses APCA font lookup tables to determine
 * minimum Lc based on font size and weight.
 *
 * Reference thresholds (weight 400):
 * - 12px: Lc 100
 * - 14px: Lc 90
 * - 16px: Lc 75
 * - 18px: Lc 70
 * - 24px: Lc 60
 * - 36px: Lc 50
 */
export const WCAG30_FONT_SCALED_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-font-scaled',
    name: 'WCAG 3.0 Font-Scaled',
    description: 'Dynamic Lc requirements based on font size and weight per APCA tables.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'font-scaled', 'dynamic'],
    requirements: {
      // Base requirement - will be overridden by font lookup
      minApcaLc: 60,
      useFontScaling: true,
    },
  }),
  rules: [
    createRule({
      id: 'font-scaled-lc',
      name: 'Font-Scaled Lc Requirement',
      description: 'Lc requirement varies by font size and weight',
      condition: {
        target: 'apcaLc',
        operator: 'gte',
        value: 60, // Minimum; actual value from lookup
        dynamic: true,
      },
      severity: 'error',
      priority: 'critical',
      message: 'APCA Lc {value} is below font-scaled minimum requirement',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// WCAG 3.0 Spot/Non-Body Text Policy
// ============================================

/**
 * WCAG 3.0 Spot Text Policy
 *
 * For non-body text (headlines, labels, icons):
 * - Lower Lc requirements
 * - Font size must be larger
 *
 * Reference (weight 700):
 * - 24px+: Lc 45
 * - 36px+: Lc 35
 */
export const WCAG30_SPOT_TEXT_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'wcag30-spot-text',
    name: 'WCAG 3.0 Spot Text',
    description: 'Requirements for headlines, labels, and other non-body text.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'accessibility',
    applicableContexts: [
      { component: 'heading' },
      { component: 'label' },
      { component: 'badge' },
      { component: 'button' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['wcag', 'wcag3', 'apca', 'spot-text', 'headlines'],
    requirements: {
      minApcaLc: 45,
      minFontSizePx: 24,
    },
  }),
  rules: [
    createMinApcaLcRule('spot-min-lc', 45, {
      name: 'Spot Text Minimum Lc',
      severity: 'error',
      priority: 'high',
    }),
    createRule({
      id: 'spot-font-size',
      name: 'Spot Text Font Size',
      description: 'Spot text requires minimum 24px font',
      condition: {
        target: 'fontSize',
        operator: 'gte',
        value: 24,
      },
      severity: 'error',
      priority: 'high',
      message: 'Font size {value}px is below minimum 24px for spot text',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// All WCAG 3.0 Policies
// ============================================

export const WCAG30_POLICIES: ReadonlyArray<PerceptualPolicy | CompositePolicy> = [
  WCAG30_BRONZE_POLICY,
  WCAG30_SILVER_POLICY,
  WCAG30_GOLD_POLICY,
  WCAG30_PLATINUM_POLICY,
  WCAG30_FONT_SCALED_POLICY,
  WCAG30_SPOT_TEXT_POLICY,
];

/**
 * Get a WCAG 3.0 policy by tier
 */
export function getWcag30Policy(
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'
): PerceptualPolicy | CompositePolicy {
  switch (tier) {
    case 'Bronze':
      return WCAG30_BRONZE_POLICY;
    case 'Silver':
      return WCAG30_SILVER_POLICY;
    case 'Gold':
      return WCAG30_GOLD_POLICY;
    case 'Platinum':
      return WCAG30_PLATINUM_POLICY;
  }
}

/**
 * Get recommended minimum Lc for a font configuration
 * Based on APCA lookup tables
 */
export function getRecommendedLcForFont(fontSizePx: number, fontWeight: number): number {
  // Simplified APCA lookup table
  // Full implementation would use complete APCA reference tables
  const baseLc = getLcForFontSize(fontSizePx);
  const weightAdjustment = getWeightAdjustment(fontWeight);
  return Math.max(30, baseLc - weightAdjustment);
}

function getLcForFontSize(sizePx: number): number {
  if (sizePx >= 96) return 30;
  if (sizePx >= 72) return 35;
  if (sizePx >= 48) return 40;
  if (sizePx >= 36) return 50;
  if (sizePx >= 24) return 60;
  if (sizePx >= 18) return 70;
  if (sizePx >= 16) return 75;
  if (sizePx >= 14) return 90;
  if (sizePx >= 12) return 100;
  return 110; // Very small text
}

function getWeightAdjustment(weight: number): number {
  if (weight >= 900) return 15;
  if (weight >= 700) return 10;
  if (weight >= 600) return 5;
  if (weight >= 500) return 2;
  if (weight >= 400) return 0;
  if (weight >= 300) return -5;
  return -10; // Light weights need MORE contrast
}
