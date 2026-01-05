// ============================================
// Golden Set Types
// Phase 5: Standardization Layer
// ============================================
//
// Types for canonical test vectors (Golden Sets) used to
// validate Color Intelligence implementations.
//
// Golden Sets provide:
// - Reference values for contrast calculations
// - Color space conversion test vectors
// - Token generation validation
// - Governance evaluation test cases
//
// ============================================

// ============================================
// GoldenSetId Branded Type
// ============================================

declare const GoldenSetIdBrand: unique symbol;

/**
 * Branded type for Golden Set identifiers
 */
export type GoldenSetId = string & { readonly [GoldenSetIdBrand]: never };

/**
 * Create a validated GoldenSetId
 */
export function createGoldenSetId(id: string): GoldenSetId {
  return id as GoldenSetId;
}

// ============================================
// Test Case Category
// ============================================

/**
 * Categories of golden set test cases
 *
 * - contrast: APCA and WCAG contrast calculations
 * - colorspace: Color space conversions (OKLCH, HCT, etc.)
 * - token-generation: Design token generation validation
 * - governance: Policy evaluation test cases
 */
export type TestCaseCategory =
  | 'contrast'
  | 'colorspace'
  | 'token-generation'
  | 'governance';

// ============================================
// WCAG 3.0 Tier (lowercase for golden sets)
// ============================================

/**
 * WCAG 3.0 tier in lowercase format for golden set compatibility
 */
export type WCAG3TierLowercase =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | null;

// ============================================
// Color Input Types
// ============================================

/**
 * sRGB color input
 */
export interface SRGBInput {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * OKLCH color values
 */
export interface OKLCHValues {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/**
 * HCT color values (Material Design 3)
 */
export interface HCTValues {
  readonly h: number;
  readonly c: number;
  readonly t: number;
}

// ============================================
// Test Case Input Types
// ============================================

/**
 * Contrast test input
 */
export interface ContrastTestInput {
  readonly foreground: SRGBInput;
  readonly background: SRGBInput;
  readonly fontSize?: number;
  readonly fontWeight?: number;
}

/**
 * Color space conversion test input
 */
export interface ColorSpaceTestInput {
  readonly srgb?: SRGBInput;
  readonly oklch?: OKLCHValues;
  readonly hct?: HCTValues;
}

/**
 * Token generation test input
 */
export interface TokenGenerationTestInput {
  readonly seedColor: SRGBInput;
  readonly steps?: number;
  readonly mode?: 'tonal' | 'chromatic' | 'neutral';
  readonly semanticRole?: string;
}

/**
 * Governance evaluation test input
 */
export interface GovernanceTestInput {
  readonly decision: {
    readonly foreground: SRGBInput;
    readonly background: SRGBInput;
    readonly fontSize?: number;
  };
  readonly policyId: string;
  readonly brandConstraints?: {
    readonly preserveHue?: boolean;
    readonly hueTolerance?: number;
  };
}

/**
 * Union type for all test inputs
 */
export type GoldenTestInput =
  | ContrastTestInput
  | ColorSpaceTestInput
  | TokenGenerationTestInput
  | GovernanceTestInput
  | Record<string, unknown>;

// ============================================
// Expected Result Types
// ============================================

/**
 * Expected result for contrast tests
 */
export interface ContrastExpectedResult {
  readonly lcValue: number;
  readonly tolerance: number;
  readonly wcag3Tier: WCAG3TierLowercase;
  readonly passes: boolean;
}

/**
 * Expected result for OKLCH conversion tests
 */
export interface OKLCHExpectedResult {
  readonly oklch: OKLCHValues;
  readonly tolerance: number;
}

/**
 * Expected result for HCT conversion tests
 */
export interface HCTExpectedResult {
  readonly hct?: HCTValues;
  readonly srgb?: SRGBInput;
  readonly tolerance: number;
}

/**
 * Expected result for token generation tests
 */
export interface TokenGenerationExpectedResult {
  readonly tokenCount?: number;
  readonly preservesHue?: boolean;
  readonly hueTolerance?: number;
  readonly contrastProgression?: 'monotonic' | 'non-monotonic';
  readonly derivedTokens?: ReadonlyArray<string>;
  readonly accessibilityCompliant?: boolean;
}

/**
 * Expected result for governance tests
 */
export interface GovernanceExpectedResult {
  readonly outcome: 'approved' | 'adjusted' | 'rejected';
  readonly violations?: ReadonlyArray<string>;
  readonly violationCount?: number;
  readonly adjustments?: ReadonlyArray<string>;
  readonly adjustmentApplied?: boolean;
  readonly huePreserved?: boolean;
}

/**
 * Union type for all expected results
 */
export type ExpectedResult =
  | ContrastExpectedResult
  | OKLCHExpectedResult
  | HCTExpectedResult
  | TokenGenerationExpectedResult
  | GovernanceExpectedResult
  | Record<string, unknown>;

// ============================================
// Golden Test Case
// ============================================

/**
 * Individual golden test case
 *
 * Represents a single canonical test vector with:
 * - Unique identifier
 * - Human-readable name
 * - Category classification
 * - Input parameters
 * - Expected output values
 * - Metadata tags
 */
export interface GoldenTestCase {
  /** Unique test case identifier */
  readonly id: string;

  /** Human-readable test case name */
  readonly name: string;

  /** Test category */
  readonly category: TestCaseCategory;

  /** Input parameters for the test */
  readonly input: GoldenTestInput;

  /** Expected output values */
  readonly expected: ExpectedResult;

  /** Classification tags for filtering */
  readonly tags: ReadonlyArray<string>;
}

// ============================================
// Golden Set
// ============================================

/**
 * Golden Set - Collection of canonical test vectors
 *
 * A Golden Set is a versioned collection of test cases
 * that serve as the authoritative reference for validating
 * Color Intelligence implementations.
 *
 * Properties:
 * - Immutable after publication
 * - Versioned for compatibility tracking
 * - Categorized by functionality
 * - Contains tolerance specifications
 */
export interface GoldenSet {
  /** Unique golden set identifier (branded type) */
  readonly id: GoldenSetId;

  /** Human-readable name */
  readonly name: string;

  /** Semantic version of this golden set */
  readonly version: string;

  /** Primary category of test cases */
  readonly category: TestCaseCategory;

  /** Description of what this golden set validates */
  readonly description: string;

  /** ISO 8601 creation timestamp */
  readonly createdAt: string;

  /** ISO 8601 last update timestamp */
  readonly updatedAt: string;

  /** Collection of test cases */
  readonly testCases: ReadonlyArray<GoldenTestCase>;
}

// ============================================
// Golden Set Validation
// ============================================

/**
 * Result of validating against a golden test case
 */
export interface GoldenTestValidationResult {
  /** Test case that was validated */
  readonly testCase: GoldenTestCase;

  /** Whether the test passed */
  readonly passed: boolean;

  /** Actual value produced */
  readonly actualValue: unknown;

  /** Expected value from golden set */
  readonly expectedValue: unknown;

  /** Difference from expected (if numeric) */
  readonly difference?: number;

  /** Whether within tolerance */
  readonly withinTolerance?: boolean;

  /** Error message if failed */
  readonly errorMessage?: string;
}

/**
 * Result of validating against a complete golden set
 */
export interface GoldenSetValidationResult {
  /** Golden set that was validated */
  readonly goldenSet: GoldenSet;

  /** Overall pass/fail status */
  readonly passed: boolean;

  /** Individual test results */
  readonly testResults: ReadonlyArray<GoldenTestValidationResult>;

  /** Count of passed tests */
  readonly passedCount: number;

  /** Count of failed tests */
  readonly failedCount: number;

  /** Count of skipped tests */
  readonly skippedCount: number;

  /** Validation timestamp */
  readonly validatedAt: string;
}

// ============================================
// Type Guards
// ============================================

/**
 * Type guard for GoldenSet
 */
export function isGoldenSet(value: unknown): value is GoldenSet {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['version'] === 'string' &&
    typeof obj['category'] === 'string' &&
    Array.isArray(obj['testCases'])
  );
}

/**
 * Type guard for GoldenTestCase
 */
export function isGoldenTestCase(value: unknown): value is GoldenTestCase {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    typeof obj['category'] === 'string' &&
    typeof obj['input'] === 'object' &&
    typeof obj['expected'] === 'object' &&
    Array.isArray(obj['tags'])
  );
}

/**
 * Type guard for TestCaseCategory
 */
export function isTestCaseCategory(value: unknown): value is TestCaseCategory {
  return (
    value === 'contrast' ||
    value === 'colorspace' ||
    value === 'token-generation' ||
    value === 'governance'
  );
}
