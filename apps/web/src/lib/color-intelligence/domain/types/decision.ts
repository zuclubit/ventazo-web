// ============================================
// Decision Layer Types
// Multi-Factor Contrast Decision System
// ============================================

import type { APCAPolarity, APCALevel } from '../value-objects/APCAContrast';
import type { ContrastMode } from '../../application/DetectContrastMode';

// Re-export APCAPolarity as ContrastPolarity for semantic clarity in Governance layer
export type ContrastPolarity = APCAPolarity;

// ============================================
// Branded Types for Type Safety
// ============================================

declare const BRAND: unique symbol;
type Brand<K, T extends string> = K & { readonly [BRAND]: T };

/** Font size in pixels (14-72 range typical) */
export type FontSizePx = Brand<number, 'FontSizePx'>;

/** Font weight (100-900 scale) */
export type FontWeight = Brand<number, 'FontWeight'>;

/** Ambient luminance in cd/m² */
export type AmbientLuminance = Brand<number, 'AmbientLuminance'>;

/** Confidence score 0-1 */
export type ConfidenceScore = Brand<number, 'ConfidenceScore'>;

/** Perceptual score 0-100 */
export type PerceptualScore = Brand<number, 'PerceptualScore'>;

// ============================================
// Constructors for Branded Types
// ============================================

export function createFontSizePx(value: number): FontSizePx {
  if (value < 1 || value > 1000) {
    throw new RangeError(`FontSizePx must be 1-1000, got ${value}`);
  }
  return value as FontSizePx;
}

export function createFontWeight(value: number): FontWeight {
  if (value < 100 || value > 900 || value % 100 !== 0) {
    throw new RangeError(`FontWeight must be 100-900 in steps of 100, got ${value}`);
  }
  return value as FontWeight;
}

export function createAmbientLuminance(value: number): AmbientLuminance {
  if (value < 0 || value > 100000) {
    throw new RangeError(`AmbientLuminance must be 0-100000 cd/m², got ${value}`);
  }
  return value as AmbientLuminance;
}

export function createConfidenceScore(value: number): ConfidenceScore {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped as ConfidenceScore;
}

export function createPerceptualScore(value: number): PerceptualScore {
  const clamped = Math.max(0, Math.min(100, value));
  return clamped as PerceptualScore;
}

// ============================================
// Viewing Conditions
// ============================================

/**
 * Environment lighting conditions
 * Affects how contrast is perceived
 */
export type LightingEnvironment =
  | 'dark-room'       // < 20 cd/m² - cinema, dark mode preference
  | 'dim'             // 20-80 cd/m² - evening indoor, low light
  | 'average'         // 80-250 cd/m² - typical office
  | 'bright'          // 250-1000 cd/m² - well-lit office, daylight
  | 'outdoor';        // > 1000 cd/m² - direct sunlight

/**
 * Device/display type affects perception
 */
export type DisplayType =
  | 'srgb-standard'   // Typical sRGB display
  | 'wide-gamut'      // P3 or wider gamut
  | 'hdr'             // HDR-capable display
  | 'eink'            // E-ink (high contrast, slow refresh)
  | 'projector';      // Projector (lower contrast ratio)

/**
 * Viewing conditions for contrast evaluation
 * Based on CAM16 and CIECAM02 viewing condition parameters
 */
export interface ViewingConditions {
  /** Ambient luminance in cd/m² */
  readonly ambientLuminance: AmbientLuminance;

  /** Background luminance relative to the reference white (0.2 typical) */
  readonly backgroundRelativeLuminance: number;

  /** Surround type */
  readonly surround: 'dark' | 'dim' | 'average';

  /** Display type affects perception */
  readonly displayType: DisplayType;

  /** User viewing distance factor (1.0 = typical arm's length) */
  readonly viewingDistanceFactor: number;
}

/**
 * Create viewing conditions from environment preset
 */
export function createViewingConditions(
  environment: LightingEnvironment,
  displayType: DisplayType = 'srgb-standard'
): ViewingConditions {
  const presets: Record<LightingEnvironment, Omit<ViewingConditions, 'displayType'>> = {
    'dark-room': {
      ambientLuminance: createAmbientLuminance(10),
      backgroundRelativeLuminance: 0.15,
      surround: 'dark',
      viewingDistanceFactor: 1.0,
    },
    'dim': {
      ambientLuminance: createAmbientLuminance(50),
      backgroundRelativeLuminance: 0.18,
      surround: 'dim',
      viewingDistanceFactor: 1.0,
    },
    'average': {
      ambientLuminance: createAmbientLuminance(150),
      backgroundRelativeLuminance: 0.20,
      surround: 'average',
      viewingDistanceFactor: 1.0,
    },
    'bright': {
      ambientLuminance: createAmbientLuminance(500),
      backgroundRelativeLuminance: 0.22,
      surround: 'average',
      viewingDistanceFactor: 1.0,
    },
    'outdoor': {
      ambientLuminance: createAmbientLuminance(2000),
      backgroundRelativeLuminance: 0.25,
      surround: 'average',
      viewingDistanceFactor: 1.2,
    },
  };

  return {
    ...presets[environment],
    displayType,
  };
}

// ============================================
// Readability Context
// ============================================

/**
 * Text rendering context for readability assessment
 */
export interface ReadabilityContext {
  /** Font size in pixels */
  readonly fontSize: FontSizePx;

  /** Font weight (100-900) */
  readonly fontWeight: FontWeight;

  /** Is the font antialiased? Affects small text legibility */
  readonly antialiased: boolean;

  /** Is this a monospace font? Different spatial frequency */
  readonly isMonospace: boolean;

  /** x-height ratio (typical 0.45-0.55). Higher = more legible */
  readonly xHeightRatio: number;

  /** Letter spacing adjustment (em units, 0 = normal) */
  readonly letterSpacing: number;
}

/**
 * Create readability context with defaults
 */
export function createReadabilityContext(
  fontSize: number,
  fontWeight: number = 400,
  options?: Partial<Omit<ReadabilityContext, 'fontSize' | 'fontWeight'>>
): ReadabilityContext {
  return {
    fontSize: createFontSizePx(fontSize),
    fontWeight: createFontWeight(fontWeight),
    antialiased: options?.antialiased ?? true,
    isMonospace: options?.isMonospace ?? false,
    xHeightRatio: options?.xHeightRatio ?? 0.5,
    letterSpacing: options?.letterSpacing ?? 0,
  };
}

// ============================================
// Decision Levels
// ============================================

/**
 * WCAG 3.0 inspired bronze/silver/gold + fail/enhanced
 */
export type ContrastLevel =
  | 'fail'        // Does not meet minimum threshold
  | 'minimum'     // Meets minimum (AA equivalent for context)
  | 'standard'    // Meets standard (AAA equivalent for context)
  | 'enhanced';   // Exceeds requirements

/**
 * Mapping to WCAG 2.1 for compatibility
 * Includes all conformance levels: A, AA, AAA, and Enhanced
 */
export type WCAGLevel = 'Fail' | 'A' | 'AA' | 'AAA' | 'Enhanced';

/**
 * WCAG 3.0 progressive scoring tiers
 */
export type WCAG3Tier = 'Fail' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

/**
 * Convert ContrastLevel to WCAGLevel
 */
export function toWCAGLevel(level: ContrastLevel): WCAGLevel {
  const mapping: Record<ContrastLevel, WCAGLevel> = {
    fail: 'Fail',
    minimum: 'AA',
    standard: 'AAA',
    enhanced: 'Enhanced',
  };
  return mapping[level];
}

/**
 * Convert ContrastLevel to WCAG3Tier
 */
export function toWCAG3Tier(level: ContrastLevel, score: number): WCAG3Tier {
  if (level === 'fail') return 'Fail';
  if (score >= 95) return 'Platinum';
  if (score >= 80) return 'Gold';
  if (score >= 65) return 'Silver';
  return 'Bronze';
}

// ============================================
// Decision Factors
// ============================================

/**
 * Individual factor contributing to the decision
 */
export interface DecisionFactor {
  /** Factor identifier */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Weight in the final calculation (0-1) */
  readonly weight: number;

  /** Raw value before normalization */
  readonly rawValue: number;

  /** Normalized contribution (0-1) */
  readonly normalizedValue: number;

  /** Impact on final score */
  readonly impact: 'positive' | 'negative' | 'neutral';

  /** Explanation for this factor */
  readonly explanation: string;
}

// ============================================
// Contrast Decision Result
// ============================================

/**
 * Complete contrast decision with full reasoning
 *
 * This is the main output of the Decision Engine.
 * It provides not just a pass/fail, but a comprehensive
 * analysis with confidence and reasoning.
 */
export interface ContrastDecision {
  // ===== Core Metrics =====

  /** Perceptual readability score (0-100) */
  readonly score: PerceptualScore;

  /** Simplified level classification */
  readonly level: ContrastLevel;

  /** WCAG 2.1 equivalent level for backwards compatibility */
  readonly wcagLevel: WCAGLevel;

  /** WCAG 3.0 tier for forward compatibility */
  readonly wcag3Tier: WCAG3Tier;

  // ===== Raw Measurements =====

  /** APCA Lightness Contrast value (-108 to +108) */
  readonly apcaLc: number;

  /** APCA absolute value */
  readonly apcaAbsolute: number;

  /** WCAG 2.1 contrast ratio (for reference) */
  readonly wcag21Ratio: number;

  /** Detected polarity */
  readonly polarity: APCAPolarity;

  // ===== Confidence & Context =====

  /** Decision confidence (0-1) */
  readonly confidence: ConfidenceScore;

  /** Viewing conditions used */
  readonly viewingConditions: ViewingConditions;

  /** Readability context used */
  readonly readabilityContext: ReadabilityContext;

  // ===== Reasoning =====

  /** Individual factors that contributed to the decision */
  readonly factors: ReadonlyArray<DecisionFactor>;

  /** Human-readable reasoning strings */
  readonly reasoning: ReadonlyArray<string>;

  /** Warnings about potential issues */
  readonly warnings: ReadonlyArray<string>;

  /** Improvement suggestions if not optimal */
  readonly suggestions: ReadonlyArray<string>;

  // ===== Metadata =====

  /** ISO timestamp of when decision was made */
  readonly timestamp: string;

  /** Algorithm version for reproducibility */
  readonly algorithmVersion: string;

  /** Source colors */
  readonly colors: {
    readonly foreground: string;
    readonly background: string;
  };
}

/**
 * Serializable version for storage/transmission
 */
export type ContrastDecisionDTO = Omit<ContrastDecision, 'factors'> & {
  factors: Array<{
    id: string;
    name: string;
    weight: number;
    rawValue: number;
    normalizedValue: number;
    impact: 'positive' | 'negative' | 'neutral';
    explanation: string;
  }>;
};

// ============================================
// Decision Request
// ============================================

/**
 * Input for requesting a contrast decision
 */
export interface ContrastDecisionRequest {
  /** Foreground (text) color in hex */
  readonly foreground: string;

  /** Background color in hex */
  readonly background: string;

  /** Text/element context */
  readonly readabilityContext?: ReadabilityContext;

  /** Viewing environment */
  readonly viewingConditions?: ViewingConditions;

  /** Override default thresholds */
  readonly thresholdOverrides?: Partial<ThresholdConfiguration>;
}

// ============================================
// Threshold Configuration
// ============================================

/**
 * Configurable thresholds for different contexts
 * These can be adjusted based on use case without
 * hardcoding in the algorithm itself.
 */
export interface ThresholdConfiguration {
  // ===== Base APCA Thresholds =====
  /** Minimum Lc for any readable text */
  readonly minimumLc: number;

  /** Lc for body text (14px+) */
  readonly bodyTextLc: number;

  /** Lc for large text (24px+) */
  readonly largeTextLc: number;

  /** Lc for headlines (32px+) */
  readonly headlineLc: number;

  /** Lc for spot text/UI elements */
  readonly spotTextLc: number;

  // ===== Font Size Modifiers =====
  /** Font size below which penalties apply */
  readonly smallFontSizeThreshold: number;

  /** Font size above which bonuses apply */
  readonly largeFontSizeThreshold: number;

  /** Extra-large font bonus threshold */
  readonly extraLargeFontSizeThreshold: number;

  // ===== Font Weight Modifiers =====
  /** Weight below which is considered light (penalties) */
  readonly lightWeightThreshold: number;

  /** Weight above which is considered bold (bonuses) */
  readonly boldWeightThreshold: number;

  // ===== Environment Modifiers =====
  /** Ambient luminance threshold for bright environment */
  readonly brightEnvironmentLuminance: number;

  /** Ambient luminance threshold for dark environment */
  readonly darkEnvironmentLuminance: number;

  // ===== Confidence Thresholds =====
  /** Score delta from threshold below which confidence is reduced */
  readonly uncertaintyWindow: number;
}

/**
 * Default threshold configuration
 * Based on APCA research and WCAG 3.0 draft recommendations
 */
export const DEFAULT_THRESHOLDS: ThresholdConfiguration = {
  // Base APCA (from APCA lookup tables)
  minimumLc: 15,
  bodyTextLc: 75,
  largeTextLc: 60,
  headlineLc: 45,
  spotTextLc: 30,

  // Font size thresholds (px)
  smallFontSizeThreshold: 14,
  largeFontSizeThreshold: 24,
  extraLargeFontSizeThreshold: 48,

  // Font weight (CSS scale)
  lightWeightThreshold: 300,
  boldWeightThreshold: 600,

  // Environment (cd/m²)
  brightEnvironmentLuminance: 500,
  darkEnvironmentLuminance: 50,

  // Confidence
  uncertaintyWindow: 10,
};

/**
 * Create custom threshold configuration
 */
export function createThresholdConfig(
  overrides?: Partial<ThresholdConfiguration>
): ThresholdConfiguration {
  return {
    ...DEFAULT_THRESHOLDS,
    ...overrides,
  };
}

// ============================================
// AI-Readable Contract
// ============================================

/**
 * Machine-readable decision contract for AI/LLM interpretation
 * Follows a strict schema that can be parsed without ambiguity
 */
export interface AIReadableContract {
  /** Contract version */
  readonly version: '1.0.0';

  /** Decision type */
  readonly type: 'contrast-decision';

  /** Unique decision ID */
  readonly id: string;

  /** Input specification */
  readonly input: {
    foregroundColor: string;
    backgroundColor: string;
    fontSizePx: number;
    fontWeight: number;
    environment: LightingEnvironment;
  };

  /** Primary output */
  readonly output: {
    passesAccessibility: boolean;
    level: WCAGLevel;
    score: number;
    confidence: number;
  };

  /** Deterministic factors (for reproducibility) */
  readonly computation: {
    apcaLc: number;
    wcag21Ratio: number;
    fontSizeModifier: number;
    fontWeightModifier: number;
    environmentModifier: number;
    finalScore: number;
  };

  /** Natural language explanation */
  readonly explanation: string;

  /** Actionable recommendations */
  readonly actions: Array<{
    type: 'increase-font-size' | 'increase-font-weight' | 'adjust-foreground' | 'adjust-background' | 'accept';
    priority: 'required' | 'recommended' | 'optional';
    description: string;
    suggestedValue?: string | number;
  }>;
}

/**
 * Create AI-readable contract from decision
 */
export function toAIReadableContract(
  decision: ContrastDecision,
  id: string
): AIReadableContract {
  // Determine environment from viewing conditions
  const ambient = decision.viewingConditions.ambientLuminance as number;
  let environment: LightingEnvironment = 'average';
  if (ambient < 20) environment = 'dark-room';
  else if (ambient < 80) environment = 'dim';
  else if (ambient < 250) environment = 'average';
  else if (ambient < 1000) environment = 'bright';
  else environment = 'outdoor';

  // Calculate modifiers from factors
  const fontSizeFactor = decision.factors.find(f => f.id === 'font-size');
  const fontWeightFactor = decision.factors.find(f => f.id === 'font-weight');
  const envFactor = decision.factors.find(f => f.id === 'environment');

  // Build actions
  const actions: AIReadableContract['actions'] = [];

  if (decision.level === 'fail') {
    actions.push({
      type: 'adjust-foreground',
      priority: 'required',
      description: 'Increase contrast by adjusting foreground color',
    });
  }

  if ((decision.readabilityContext.fontSize as number) < 16 && decision.level !== 'enhanced') {
    actions.push({
      type: 'increase-font-size',
      priority: 'recommended',
      description: 'Increase font size for better legibility',
      suggestedValue: 16,
    });
  }

  if (decision.level === 'enhanced') {
    actions.push({
      type: 'accept',
      priority: 'optional',
      description: 'Current combination exceeds accessibility requirements',
    });
  }

  return {
    version: '1.0.0',
    type: 'contrast-decision',
    id,
    input: {
      foregroundColor: decision.colors.foreground,
      backgroundColor: decision.colors.background,
      fontSizePx: decision.readabilityContext.fontSize as number,
      fontWeight: decision.readabilityContext.fontWeight as number,
      environment,
    },
    output: {
      passesAccessibility: decision.level !== 'fail',
      level: decision.wcagLevel,
      score: decision.score as number,
      confidence: decision.confidence as number,
    },
    computation: {
      apcaLc: decision.apcaLc,
      wcag21Ratio: decision.wcag21Ratio,
      fontSizeModifier: fontSizeFactor?.normalizedValue ?? 1,
      fontWeightModifier: fontWeightFactor?.normalizedValue ?? 1,
      environmentModifier: envFactor?.normalizedValue ?? 1,
      finalScore: decision.score as number,
    },
    explanation: decision.reasoning.join(' '),
    actions,
  };
}
