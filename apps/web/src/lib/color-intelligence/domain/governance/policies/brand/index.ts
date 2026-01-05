// ============================================
// Brand Preservation Policies
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Policies for preserving brand identity while meeting
// accessibility requirements.
//
// These policies balance:
// - Brand color preservation (hue, chroma)
// - Accessibility compliance
// - Perceptual consistency
//
// ============================================

import type { PerceptualPolicy } from '../../types/policy';
import type { CompositePolicy, PolicyRule } from '../../types/policy-composition';
import { createPolicy, policyId, policyVersion, ruleId } from '../../types/policy';
import { createRule, createMinApcaLcRule } from '../../types/policy-composition';

// ============================================
// Brand Hue Preservation Policy
// ============================================

/**
 * Brand Hue Preservation Policy
 *
 * Ensures brand colors maintain their hue identity
 * during accessibility adjustments.
 *
 * Allows:
 * - Tone/lightness adjustments
 * - Minor chroma adjustments
 *
 * Restricts:
 * - Hue shifts beyond tolerance
 * - Complete desaturation
 */
export const BRAND_HUE_PRESERVATION_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'brand-hue-preservation',
    name: 'Brand Hue Preservation',
    description: 'Maintains brand color hue during accessibility adjustments. Max ±15° hue shift.',
    version: '1.0.0',
    priority: 'high',
    enforcement: 'strict',
    category: 'brand',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['brand', 'hue', 'preservation', 'identity'],
    requirements: {
      preserveHue: true,
      maxHueShift: 15, // degrees
    },
  }),
  rules: [
    createRule({
      id: 'max-hue-shift',
      name: 'Maximum Hue Shift',
      description: 'Hue adjustments must stay within ±15° of original',
      condition: {
        target: 'hueShift',
        operator: 'lte',
        value: 15,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Hue shift {value}° exceeds maximum allowed ±15°',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'min-saturation',
      name: 'Minimum Saturation',
      description: 'Color must retain at least 20% of original chroma',
      condition: {
        target: 'chromaRetention',
        operator: 'gte',
        value: 0.2,
      },
      severity: 'warning',
      priority: 'high',
      message: 'Chroma retention {value} is below minimum 20%',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Brand Chroma Preservation Policy
// ============================================

/**
 * Brand Chroma Preservation Policy
 *
 * Prevents over-desaturation of brand colors.
 *
 * Some accessibility adjustments may reduce chroma,
 * but brand colors should remain recognizable.
 */
export const BRAND_CHROMA_PRESERVATION_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'brand-chroma-preservation',
    name: 'Brand Chroma Preservation',
    description: 'Prevents excessive desaturation of brand colors. Min 30% chroma retention.',
    version: '1.0.0',
    priority: 'medium',
    enforcement: 'advisory',
    category: 'brand',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['brand', 'chroma', 'saturation', 'preservation'],
    requirements: {
      preserveChroma: true,
      minChromaRetention: 0.3, // 30%
    },
  }),
  rules: [
    createRule({
      id: 'min-chroma-retention',
      name: 'Minimum Chroma Retention',
      description: 'Adjusted color must retain at least 30% of original chroma',
      condition: {
        target: 'chromaRetention',
        operator: 'gte',
        value: 0.3,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Chroma retention {value} is below minimum 30%',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'max-chroma-reduction',
      name: 'Maximum Chroma Reduction',
      description: 'Single adjustment should not reduce chroma by more than 40%',
      condition: {
        target: 'chromaReduction',
        operator: 'lte',
        value: 0.4,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Chroma reduction {value} exceeds maximum allowed 40%',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Brand + Accessibility Balanced Policy
// ============================================

/**
 * Brand + Accessibility Balanced Policy
 *
 * A balanced policy that:
 * - Requires WCAG 2.1 AA accessibility (4.5:1)
 * - Preserves brand hue (±20° tolerance)
 * - Allows chroma reduction up to 50%
 *
 * Use this for typical brand-aware accessibility.
 */
export const BRAND_ACCESSIBILITY_BALANCED_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'brand-accessibility-balanced',
    name: 'Brand + Accessibility Balanced',
    description: 'Balances WCAG 2.1 AA compliance with brand color preservation.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'brand',
    applicableContexts: [],
    enabled: true,
    expiresAt: null,
    tags: ['brand', 'accessibility', 'balanced', 'wcag', 'aa'],
    requirements: {
      minWcagLevel: 'AA',
      minContrastRatio: 4.5,
      preserveHue: true,
      maxHueShift: 20,
      maxChromaReduction: 0.5,
    },
  }),
  rules: [
    createRule({
      id: 'contrast-ratio-aa',
      name: 'WCAG AA Contrast',
      description: 'Must meet WCAG 2.1 AA contrast ratio (4.5:1)',
      condition: {
        target: 'contrastRatio',
        operator: 'gte',
        value: 4.5,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Contrast ratio {value}:1 is below WCAG AA minimum 4.5:1',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'hue-preservation',
      name: 'Hue Preservation',
      description: 'Hue must stay within ±20° of brand color',
      condition: {
        target: 'hueShift',
        operator: 'lte',
        value: 20,
      },
      severity: 'error',
      priority: 'high',
      message: 'Hue shift {value}° exceeds maximum allowed ±20°',
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'chroma-preservation',
      name: 'Chroma Preservation',
      description: 'Chroma reduction limited to 50%',
      condition: {
        target: 'chromaReduction',
        operator: 'lte',
        value: 0.5,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Chroma reduction {value} exceeds maximum allowed 50%',
      enabled: true,
      applicableContexts: [],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Brand Primary Color Policy
// ============================================

/**
 * Brand Primary Color Policy
 *
 * Strict preservation for primary brand colors.
 *
 * For logo colors, hero elements, and primary
 * brand touchpoints where color is critical.
 *
 * Very tight tolerances:
 * - ±10° hue
 * - 70% chroma retention
 */
export const BRAND_PRIMARY_COLOR_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'brand-primary-color',
    name: 'Brand Primary Color',
    description: 'Strict preservation for primary brand colors. Tight tolerances.',
    version: '1.0.0',
    priority: 'critical',
    enforcement: 'strict',
    category: 'brand',
    applicableContexts: [
      { component: 'logo' },
      { component: 'hero' },
      { component: 'brand-primary' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['brand', 'primary', 'logo', 'strict'],
    requirements: {
      preserveHue: true,
      maxHueShift: 10,
      minChromaRetention: 0.7,
    },
  }),
  rules: [
    createRule({
      id: 'strict-hue-preservation',
      name: 'Strict Hue Preservation',
      description: 'Primary brand colors: max ±10° hue shift',
      condition: {
        target: 'hueShift',
        operator: 'lte',
        value: 10,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Hue shift {value}° exceeds strict maximum ±10° for primary brand colors',
      enabled: true,
      applicableContexts: [
        { component: 'logo' },
        { component: 'hero' },
        { component: 'brand-primary' },
      ],
    }),
    createRule({
      id: 'high-chroma-retention',
      name: 'High Chroma Retention',
      description: 'Primary brand colors: min 70% chroma retention',
      condition: {
        target: 'chromaRetention',
        operator: 'gte',
        value: 0.7,
      },
      severity: 'error',
      priority: 'critical',
      message: 'Chroma retention {value} is below minimum 70% for primary brand colors',
      enabled: true,
      applicableContexts: [
        { component: 'logo' },
        { component: 'hero' },
        { component: 'brand-primary' },
      ],
    }),
  ],
  combinator: 'all',
};

// ============================================
// Brand Secondary Color Policy
// ============================================

/**
 * Brand Secondary Color Policy
 *
 * More relaxed preservation for secondary brand colors.
 *
 * For supporting elements where accessibility
 * can take precedence over exact color match.
 */
export const BRAND_SECONDARY_COLOR_POLICY: CompositePolicy = {
  ...createPolicy({
    id: 'brand-secondary-color',
    name: 'Brand Secondary Color',
    description: 'Relaxed preservation for secondary brand colors.',
    version: '1.0.0',
    priority: 'medium',
    enforcement: 'advisory',
    category: 'brand',
    applicableContexts: [
      { component: 'brand-secondary' },
      { component: 'accent' },
    ],
    enabled: true,
    expiresAt: null,
    tags: ['brand', 'secondary', 'accent', 'relaxed'],
    requirements: {
      preserveHue: true,
      maxHueShift: 30,
      minChromaRetention: 0.4,
    },
  }),
  rules: [
    createRule({
      id: 'relaxed-hue-preservation',
      name: 'Relaxed Hue Preservation',
      description: 'Secondary colors: max ±30° hue shift allowed',
      condition: {
        target: 'hueShift',
        operator: 'lte',
        value: 30,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Hue shift {value}° exceeds relaxed maximum ±30° for secondary colors',
      enabled: true,
      applicableContexts: [
        { component: 'brand-secondary' },
        { component: 'accent' },
      ],
    }),
    createRule({
      id: 'moderate-chroma-retention',
      name: 'Moderate Chroma Retention',
      description: 'Secondary colors: min 40% chroma retention',
      condition: {
        target: 'chromaRetention',
        operator: 'gte',
        value: 0.4,
      },
      severity: 'warning',
      priority: 'medium',
      message: 'Chroma retention {value} is below moderate minimum 40% for secondary colors',
      enabled: true,
      applicableContexts: [
        { component: 'brand-secondary' },
        { component: 'accent' },
      ],
    }),
  ],
  combinator: 'all',
};

// ============================================
// All Brand Policies
// ============================================

export const BRAND_POLICIES: ReadonlyArray<PerceptualPolicy | CompositePolicy> = [
  BRAND_HUE_PRESERVATION_POLICY,
  BRAND_CHROMA_PRESERVATION_POLICY,
  BRAND_ACCESSIBILITY_BALANCED_POLICY,
  BRAND_PRIMARY_COLOR_POLICY,
  BRAND_SECONDARY_COLOR_POLICY,
];

/**
 * Create a custom brand preservation policy
 */
export function createBrandPolicy(options: {
  name: string;
  maxHueShift: number;
  minChromaRetention: number;
  minContrastRatio?: number;
  enforcement?: 'strict' | 'advisory' | 'monitoring';
}): CompositePolicy {
  const rules: PolicyRule[] = [
    createRule({
      id: 'custom-hue-shift',
      name: 'Custom Hue Shift Limit',
      description: `Max ±${options.maxHueShift}° hue shift`,
      condition: {
        target: 'hueShift',
        operator: 'lte',
        value: options.maxHueShift,
      },
      severity: 'error',
      priority: 'high',
      message: `Hue shift exceeds custom maximum ±${options.maxHueShift}°`,
      enabled: true,
      applicableContexts: [],
    }),
    createRule({
      id: 'custom-chroma-retention',
      name: 'Custom Chroma Retention',
      description: `Min ${options.minChromaRetention * 100}% chroma retention`,
      condition: {
        target: 'chromaRetention',
        operator: 'gte',
        value: options.minChromaRetention,
      },
      severity: 'warning',
      priority: 'medium',
      message: `Chroma retention below custom minimum ${options.minChromaRetention * 100}%`,
      enabled: true,
      applicableContexts: [],
    }),
  ];

  if (options.minContrastRatio) {
    rules.push(
      createRule({
        id: 'custom-contrast-ratio',
        name: 'Custom Contrast Ratio',
        description: `Min ${options.minContrastRatio}:1 contrast ratio`,
        condition: {
          target: 'contrastRatio',
          operator: 'gte',
          value: options.minContrastRatio,
        },
        severity: 'error',
        priority: 'critical',
        message: `Contrast ratio below custom minimum ${options.minContrastRatio}:1`,
        enabled: true,
        applicableContexts: [],
      })
    );
  }

  return {
    ...createPolicy({
      id: `brand-custom-${options.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: options.name,
      description: `Custom brand policy: ±${options.maxHueShift}° hue, ${options.minChromaRetention * 100}% chroma`,
      version: '1.0.0',
      priority: 'high',
      enforcement: options.enforcement ?? 'strict',
      category: 'brand',
      applicableContexts: [],
      enabled: true,
      expiresAt: null,
      tags: ['brand', 'custom'],
      requirements: {
        preserveHue: true,
        maxHueShift: options.maxHueShift,
        minChromaRetention: options.minChromaRetention,
        ...(options.minContrastRatio && { minContrastRatio: options.minContrastRatio }),
      },
    }),
    rules,
    combinator: 'all',
  };
}
