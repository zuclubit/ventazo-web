// ============================================
// Golden Sets - Canonical Test Vectors
// Phase 5: Standardization Layer
// ============================================

import type {
  GoldenSet,
  GoldenTestCase,
  TestCaseCategory,
  ExpectedResult,
  GoldenSetId,
} from '../types';

import { createGoldenSetId } from '../types';

// Re-export for backward compatibility
export type { GoldenSetId } from '../types';
export { createGoldenSetId } from '../types';

// ============================================
// Core Contrast Golden Sets
// ============================================

/**
 * APCA Lc Value Reference Cases
 * These are canonical test vectors for APCA contrast calculations.
 * Any conformant implementation MUST produce these exact values (±0.1).
 */
export const APCA_CONTRAST_GOLDEN_SET: GoldenSet = {
  id: createGoldenSetId('apca-contrast-v1.0'),
  name: 'APCA Contrast Calculation Reference',
  version: '1.0.0',
  category: 'contrast',
  description: 'Canonical APCA Lc value test vectors for contrast calculations',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  testCases: [
    // Black on White (maximum contrast)
    {
      id: 'apca-001',
      name: 'Black text on white background',
      category: 'contrast',
      input: {
        foreground: { r: 0, g: 0, b: 0 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: 106.04,
        tolerance: 0.1,
        wcag3Tier: 'platinum',
        passes: true,
      },
      tags: ['essential', 'maximum-contrast'],
    },
    // White on Black (polarity reversal)
    {
      id: 'apca-002',
      name: 'White text on black background',
      category: 'contrast',
      input: {
        foreground: { r: 255, g: 255, b: 255 },
        background: { r: 0, g: 0, b: 0 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: -107.89,
        tolerance: 0.1,
        wcag3Tier: 'platinum',
        passes: true,
      },
      tags: ['essential', 'polarity-reversal'],
    },
    // Minimum readable (body text threshold)
    {
      id: 'apca-003',
      name: 'Gray on white - minimum readable',
      category: 'contrast',
      input: {
        foreground: { r: 119, g: 119, b: 119 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: 63.06,
        tolerance: 0.5,
        wcag3Tier: 'silver',
        passes: true,
      },
      tags: ['threshold', 'body-text'],
    },
    // Large text threshold
    {
      id: 'apca-004',
      name: 'Gray on white - large text',
      category: 'contrast',
      input: {
        foreground: { r: 150, g: 150, b: 150 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 24,
        fontWeight: 700,
      },
      expected: {
        lcValue: 47.12,
        tolerance: 0.5,
        wcag3Tier: 'bronze',
        passes: true,
      },
      tags: ['large-text', 'threshold'],
    },
    // Near-white on white (should fail)
    {
      id: 'apca-005',
      name: 'Near-white on white - fails',
      category: 'contrast',
      input: {
        foreground: { r: 240, g: 240, b: 240 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: 7.5,
        tolerance: 1.0,
        wcag3Tier: null,
        passes: false,
      },
      tags: ['failure-case', 'low-contrast'],
    },
    // Blue on white (chromatic test)
    {
      id: 'apca-006',
      name: 'Blue text on white background',
      category: 'contrast',
      input: {
        foreground: { r: 0, g: 0, b: 255 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: 54.62,
        tolerance: 0.5,
        wcag3Tier: 'bronze',
        passes: true,
      },
      tags: ['chromatic', 'blue'],
    },
    // Brand color test (typical brand blue)
    {
      id: 'apca-007',
      name: 'Brand blue on white',
      category: 'contrast',
      input: {
        foreground: { r: 59, g: 130, b: 246 },
        background: { r: 255, g: 255, b: 255 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: 48.23,
        tolerance: 0.5,
        wcag3Tier: 'bronze',
        passes: true,
      },
      tags: ['brand', 'chromatic'],
    },
    // Dark mode essential
    {
      id: 'apca-008',
      name: 'Light gray on dark slate',
      category: 'contrast',
      input: {
        foreground: { r: 226, g: 232, b: 240 },
        background: { r: 15, g: 23, b: 42 },
        fontSize: 16,
        fontWeight: 400,
      },
      expected: {
        lcValue: -91.5,
        tolerance: 1.0,
        wcag3Tier: 'gold',
        passes: true,
      },
      tags: ['dark-mode', 'essential'],
    },
  ],
};

// ============================================
// OKLCH Color Space Golden Sets
// ============================================

export const OKLCH_CONVERSION_GOLDEN_SET: GoldenSet = {
  id: createGoldenSetId('oklch-conversion-v1.0'),
  name: 'OKLCH Color Space Conversion Reference',
  version: '1.0.0',
  category: 'colorspace',
  description: 'Canonical OKLCH ↔ sRGB conversion test vectors',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  testCases: [
    {
      id: 'oklch-001',
      name: 'Pure white conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 255, g: 255, b: 255 },
      },
      expected: {
        oklch: { l: 1.0, c: 0.0, h: 0 },
        tolerance: 0.001,
      },
      tags: ['essential', 'achromatic'],
    },
    {
      id: 'oklch-002',
      name: 'Pure black conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 0, g: 0, b: 0 },
      },
      expected: {
        oklch: { l: 0.0, c: 0.0, h: 0 },
        tolerance: 0.001,
      },
      tags: ['essential', 'achromatic'],
    },
    {
      id: 'oklch-003',
      name: 'Pure red conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 255, g: 0, b: 0 },
      },
      expected: {
        oklch: { l: 0.6279, c: 0.2577, h: 29.23 },
        tolerance: 0.01,
      },
      tags: ['primary', 'chromatic'],
    },
    {
      id: 'oklch-004',
      name: 'Pure green conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 0, g: 255, b: 0 },
      },
      expected: {
        oklch: { l: 0.8664, c: 0.2948, h: 142.5 },
        tolerance: 0.01,
      },
      tags: ['primary', 'chromatic'],
    },
    {
      id: 'oklch-005',
      name: 'Pure blue conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 0, g: 0, b: 255 },
      },
      expected: {
        oklch: { l: 0.4520, c: 0.3132, h: 264.05 },
        tolerance: 0.01,
      },
      tags: ['primary', 'chromatic'],
    },
    {
      id: 'oklch-006',
      name: 'Mid gray conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 128, g: 128, b: 128 },
      },
      expected: {
        oklch: { l: 0.5998, c: 0.0, h: 0 },
        tolerance: 0.01,
      },
      tags: ['achromatic', 'midtone'],
    },
    {
      id: 'oklch-007',
      name: 'Brand blue conversion',
      category: 'colorspace',
      input: {
        srgb: { r: 59, g: 130, b: 246 },
      },
      expected: {
        oklch: { l: 0.6234, c: 0.1856, h: 259.8 },
        tolerance: 0.01,
      },
      tags: ['brand', 'chromatic'],
    },
  ],
};

// ============================================
// HCT Color Space Golden Sets
// ============================================

export const HCT_CONVERSION_GOLDEN_SET: GoldenSet = {
  id: createGoldenSetId('hct-conversion-v1.0'),
  name: 'HCT Color Space Conversion Reference',
  version: '1.0.0',
  category: 'colorspace',
  description: 'Canonical HCT ↔ sRGB conversion test vectors (Material Design 3)',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  testCases: [
    {
      id: 'hct-001',
      name: 'Pure white HCT',
      category: 'colorspace',
      input: {
        srgb: { r: 255, g: 255, b: 255 },
      },
      expected: {
        hct: { h: 209, c: 2.87, t: 100 },
        tolerance: 1.0,
      },
      tags: ['essential', 'achromatic'],
    },
    {
      id: 'hct-002',
      name: 'Pure black HCT',
      category: 'colorspace',
      input: {
        srgb: { r: 0, g: 0, b: 0 },
      },
      expected: {
        hct: { h: 0, c: 0, t: 0 },
        tolerance: 0.1,
      },
      tags: ['essential', 'achromatic'],
    },
    {
      id: 'hct-003',
      name: 'Google Blue (Material)',
      category: 'colorspace',
      input: {
        srgb: { r: 66, g: 133, b: 244 },
      },
      expected: {
        hct: { h: 252, c: 87.5, t: 56 },
        tolerance: 2.0,
      },
      tags: ['material', 'brand'],
    },
    {
      id: 'hct-004',
      name: 'Material Tonal Palette T50',
      category: 'colorspace',
      input: {
        hct: { h: 252, c: 48, t: 50 },
      },
      expected: {
        srgb: { r: 80, g: 121, b: 196 },
        tolerance: 5,
      },
      tags: ['material', 'tonal-palette'],
    },
  ],
};

// ============================================
// Token Generation Golden Sets
// ============================================

export const TOKEN_GENERATION_GOLDEN_SET: GoldenSet = {
  id: createGoldenSetId('token-generation-v1.0'),
  name: 'Token Generation Reference',
  version: '1.0.0',
  category: 'token-generation',
  description: 'Canonical token generation test vectors',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  testCases: [
    {
      id: 'token-001',
      name: 'Primary color scale generation',
      category: 'token-generation',
      input: {
        seedColor: { r: 59, g: 130, b: 246 },
        steps: 10,
        mode: 'tonal',
      },
      expected: {
        tokenCount: 10,
        preservesHue: true,
        hueTolerance: 5,
        contrastProgression: 'monotonic',
      },
      tags: ['essential', 'tonal-scale'],
    },
    {
      id: 'token-002',
      name: 'Semantic color derivation',
      category: 'token-generation',
      input: {
        seedColor: { r: 59, g: 130, b: 246 },
        semanticRole: 'primary',
      },
      expected: {
        derivedTokens: [
          'primary-default',
          'primary-hover',
          'primary-active',
          'primary-disabled',
          'on-primary',
        ],
        accessibilityCompliant: true,
      },
      tags: ['semantic', 'accessibility'],
    },
  ],
};

// ============================================
// Governance Evaluation Golden Sets
// ============================================

export const GOVERNANCE_GOLDEN_SET: GoldenSet = {
  id: createGoldenSetId('governance-v1.0'),
  name: 'Governance Evaluation Reference',
  version: '1.0.0',
  category: 'governance',
  description: 'Canonical governance evaluation test vectors',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  testCases: [
    {
      id: 'gov-001',
      name: 'WCAG 2.1 AA policy - pass',
      category: 'governance',
      input: {
        decision: {
          foreground: { r: 0, g: 0, b: 0 },
          background: { r: 255, g: 255, b: 255 },
          fontSize: 16,
        },
        policyId: 'wcag21-aa',
      },
      expected: {
        outcome: 'approved',
        violations: [],
        adjustments: [],
      },
      tags: ['policy', 'wcag21'],
    },
    {
      id: 'gov-002',
      name: 'WCAG 2.1 AA policy - fail with auto-fix',
      category: 'governance',
      input: {
        decision: {
          foreground: { r: 150, g: 150, b: 150 },
          background: { r: 255, g: 255, b: 255 },
          fontSize: 14,
        },
        policyId: 'wcag21-aa',
      },
      expected: {
        outcome: 'adjusted',
        violationCount: 1,
        adjustmentApplied: true,
      },
      tags: ['policy', 'auto-fix'],
    },
    {
      id: 'gov-003',
      name: 'Brand policy - color preservation',
      category: 'governance',
      input: {
        decision: {
          foreground: { r: 59, g: 130, b: 246 },
          background: { r: 255, g: 255, b: 255 },
        },
        policyId: 'brand-blue',
        brandConstraints: {
          preserveHue: true,
          hueTolerance: 10,
        },
      },
      expected: {
        outcome: 'approved',
        huePreserved: true,
      },
      tags: ['brand', 'preservation'],
    },
  ],
};

// ============================================
// All Golden Sets Collection
// ============================================

export const ALL_GOLDEN_SETS: ReadonlyArray<GoldenSet> = [
  APCA_CONTRAST_GOLDEN_SET,
  OKLCH_CONVERSION_GOLDEN_SET,
  HCT_CONVERSION_GOLDEN_SET,
  TOKEN_GENERATION_GOLDEN_SET,
  GOVERNANCE_GOLDEN_SET,
] as const;

// ============================================
// Golden Set Utilities
// ============================================

export function getGoldenSet(id: GoldenSetId): GoldenSet | undefined {
  return ALL_GOLDEN_SETS.find(set => set.id === id);
}

export function getGoldenSetsByCategory(
  category: TestCaseCategory
): ReadonlyArray<GoldenSet> {
  return ALL_GOLDEN_SETS.filter(set => set.category === category);
}

export function getTotalTestCaseCount(): number {
  return ALL_GOLDEN_SETS.reduce(
    (total, set) => total + set.testCases.length,
    0
  );
}

export function getEssentialTestCases(): ReadonlyArray<GoldenTestCase> {
  return ALL_GOLDEN_SETS.flatMap(set =>
    set.testCases.filter(tc => tc.tags.includes('essential'))
  );
}

// ============================================
// Reference Palette Definitions
// ============================================

export interface ReferencePalette {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly colors: ReadonlyArray<{
    readonly name: string;
    readonly srgb: { r: number; g: number; b: number };
    readonly oklch: { l: number; c: number; h: number };
    readonly semanticRole?: string;
  }>;
  readonly expectedAccessibility: {
    readonly wcag21Level: 'A' | 'AA' | 'AAA';
    readonly wcag3Tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
}

export const REFERENCE_PALETTES: ReadonlyArray<ReferencePalette> = [
  {
    id: 'neutral-light',
    name: 'Neutral Light Mode',
    description: 'Reference neutral palette for light mode interfaces',
    colors: [
      { name: 'background', srgb: { r: 255, g: 255, b: 255 }, oklch: { l: 1.0, c: 0, h: 0 } },
      { name: 'foreground', srgb: { r: 15, g: 23, b: 42 }, oklch: { l: 0.17, c: 0.03, h: 265 }, semanticRole: 'text' },
      { name: 'muted', srgb: { r: 100, g: 116, b: 139 }, oklch: { l: 0.54, c: 0.04, h: 257 } },
      { name: 'accent', srgb: { r: 59, g: 130, b: 246 }, oklch: { l: 0.62, c: 0.19, h: 260 }, semanticRole: 'primary' },
    ],
    expectedAccessibility: {
      wcag21Level: 'AAA',
      wcag3Tier: 'gold',
    },
  },
  {
    id: 'neutral-dark',
    name: 'Neutral Dark Mode',
    description: 'Reference neutral palette for dark mode interfaces',
    colors: [
      { name: 'background', srgb: { r: 15, g: 23, b: 42 }, oklch: { l: 0.17, c: 0.03, h: 265 } },
      { name: 'foreground', srgb: { r: 248, g: 250, b: 252 }, oklch: { l: 0.98, c: 0.005, h: 247 }, semanticRole: 'text' },
      { name: 'muted', srgb: { r: 148, g: 163, b: 184 }, oklch: { l: 0.71, c: 0.03, h: 254 } },
      { name: 'accent', srgb: { r: 96, g: 165, b: 250 }, oklch: { l: 0.72, c: 0.15, h: 253 }, semanticRole: 'primary' },
    ],
    expectedAccessibility: {
      wcag21Level: 'AAA',
      wcag3Tier: 'gold',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast Mode',
    description: 'Reference palette for high contrast accessibility mode',
    colors: [
      { name: 'background', srgb: { r: 0, g: 0, b: 0 }, oklch: { l: 0, c: 0, h: 0 } },
      { name: 'foreground', srgb: { r: 255, g: 255, b: 255 }, oklch: { l: 1.0, c: 0, h: 0 }, semanticRole: 'text' },
      { name: 'accent', srgb: { r: 255, g: 255, b: 0 }, oklch: { l: 0.97, c: 0.21, h: 110 }, semanticRole: 'primary' },
      { name: 'link', srgb: { r: 0, g: 255, b: 255 }, oklch: { l: 0.91, c: 0.15, h: 194 } },
    ],
    expectedAccessibility: {
      wcag21Level: 'AAA',
      wcag3Tier: 'platinum',
    },
  },
];
