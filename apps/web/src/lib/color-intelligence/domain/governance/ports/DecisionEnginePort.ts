// ============================================
// Decision Engine Port
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Port interface for the Governance Layer to communicate
// with the Phase 3 Decision Engine.
//
// This follows hexagonal architecture: the port defines
// WHAT the Governance needs, and an adapter implements HOW.
//
// ============================================

import type {
  ContrastDecision,
  ContrastDecisionRequest,
  ViewingConditions,
  ReadabilityContext,
  WCAGLevel,
  WCAG3Tier,
} from '../../types/decision';
import type {
  AdjustmentDelegation,
  AdjustmentDelegationResult,
} from '../contracts/GovernanceBoundary';

// ============================================
// Decision Engine Port Interface
// ============================================

/**
 * Port to the Decision Engine (Phase 3)
 *
 * The Governance layer uses this port to:
 * 1. Request contrast evaluations
 * 2. Delegate color adjustments
 * 3. Query for target values
 *
 * IMPORTANT: The Governance layer NEVER performs color
 * calculations directly. All color operations go through
 * this port to maintain clean architecture boundaries.
 */
export interface IDecisionEnginePort {
  /**
   * Evaluate a color pair for contrast
   *
   * This is a pure read operation - it only evaluates,
   * does not modify anything.
   */
  evaluate(request: ContrastDecisionRequest): ContrastDecision;

  /**
   * Apply an adjustment specification
   *
   * The Governance layer specifies WHAT to adjust,
   * and this method performs the HOW.
   */
  applyAdjustment(delegation: AdjustmentDelegation): AdjustmentDelegationResult;

  /**
   * Calculate what foreground color would meet a target
   *
   * Returns the adjusted foreground hex color, or null
   * if the target cannot be met with constraints.
   */
  findForegroundForTarget(
    background: string,
    target: AdjustmentTarget,
    constraints: AdjustmentConstraintsInput
  ): AdjustmentSuggestion | null;

  /**
   * Calculate what background color would meet a target
   */
  findBackgroundForTarget(
    foreground: string,
    target: AdjustmentTarget,
    constraints: AdjustmentConstraintsInput
  ): AdjustmentSuggestion | null;

  /**
   * Get the minimum APCA Lc for a given font configuration
   *
   * This encapsulates APCA lookup tables within the Decision Engine.
   */
  getMinimumLcForFont(fontSizePx: number, fontWeight: number): number;

  /**
   * Check if a decision meets a specific WCAG level
   */
  meetsWcagLevel(decision: ContrastDecision, level: WCAGLevel): boolean;

  /**
   * Check if a decision meets a specific WCAG 3.0 tier
   */
  meetsWcag3Tier(decision: ContrastDecision, tier: WCAG3Tier): boolean;

  /**
   * Get engine version for compatibility checks
   */
  getVersion(): string;

  /**
   * Check if the engine supports a specific feature
   */
  supportsFeature(feature: DecisionEngineFeature): boolean;
}

// ============================================
// Supporting Types
// ============================================

/**
 * Target for color adjustment
 */
export interface AdjustmentTarget {
  /** Target APCA Lc value */
  readonly targetApcaLc?: number;

  /** Target WCAG level */
  readonly targetWcagLevel?: WCAGLevel;

  /** Target WCAG 3.0 tier */
  readonly targetWcag3Tier?: WCAG3Tier;

  /** Font context for threshold lookup */
  readonly fontSizePx?: number;
  readonly fontWeight?: number;
}

/**
 * Constraints for adjustment calculations
 */
export interface AdjustmentConstraintsInput {
  /** Preserve original hue */
  readonly preserveHue?: boolean;

  /** Maximum hue shift in degrees */
  readonly maxHueShift?: number;

  /** Maximum chroma reduction (percentage) */
  readonly maxChromaReduction?: number;

  /** Lightness bounds */
  readonly minLightness?: number;
  readonly maxLightness?: number;

  /** Reference color to match hue from */
  readonly referenceHue?: string;
}

/**
 * Suggestion for adjusted color
 */
export interface AdjustmentSuggestion {
  /** Suggested color in hex */
  readonly color: string;

  /** Achieved APCA Lc with this color */
  readonly achievedApcaLc: number;

  /** Achieved WCAG level */
  readonly achievedWcagLevel: WCAGLevel;

  /** Achieved WCAG 3.0 tier */
  readonly achievedWcag3Tier: WCAG3Tier;

  /** How much the hue shifted (degrees) */
  readonly hueShift: number;

  /** How much chroma was reduced (percentage) */
  readonly chromaReduction: number;

  /** How much lightness changed */
  readonly lightnessChange: number;

  /** Confidence in this suggestion */
  readonly confidence: number;

  /** Number of iterations to find this */
  readonly iterations: number;
}

/**
 * Features that the decision engine may or may not support
 */
export type DecisionEngineFeature =
  | 'apca-contrast'         // APCA contrast calculation
  | 'wcag21-ratio'          // WCAG 2.1 contrast ratio
  | 'wcag3-tiers'           // WCAG 3.0 tier evaluation
  | 'auto-adjustment'       // Automatic color adjustment
  | 'hue-preservation'      // Preserve hue during adjustment
  | 'viewing-conditions'    // Viewing condition modeling
  | 'font-scaling'          // Font-based threshold scaling
  | 'polarity-detection';   // Dark/light polarity detection

// ============================================
// Port Event Types
// ============================================

/**
 * Events emitted by the Decision Engine Port
 * These can be used for monitoring and debugging
 */
export interface DecisionEngineEvent {
  readonly type: DecisionEngineEventType;
  readonly timestamp: string;
  readonly payload: unknown;
}

export type DecisionEngineEventType =
  | 'evaluation-started'
  | 'evaluation-completed'
  | 'adjustment-started'
  | 'adjustment-completed'
  | 'adjustment-failed'
  | 'target-search-started'
  | 'target-search-completed';

/**
 * Event listener for port events
 */
export type DecisionEngineEventListener = (event: DecisionEngineEvent) => void;

/**
 * Extended port with event support
 */
export interface IDecisionEnginePortWithEvents extends IDecisionEnginePort {
  /**
   * Subscribe to port events
   */
  addEventListener(listener: DecisionEngineEventListener): void;

  /**
   * Unsubscribe from port events
   */
  removeEventListener(listener: DecisionEngineEventListener): void;
}

// ============================================
// Port Error Types
// ============================================

/**
 * Error thrown by the Decision Engine Port
 */
export class DecisionEnginePortError extends Error {
  constructor(
    message: string,
    public readonly code: DecisionEngineErrorCode,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DecisionEnginePortError';
  }
}

/**
 * Error codes from the Decision Engine
 */
export type DecisionEngineErrorCode =
  | 'INVALID_COLOR'           // Color string is not valid hex
  | 'INVALID_FONT_CONFIG'     // Font configuration is invalid
  | 'ADJUSTMENT_IMPOSSIBLE'   // Cannot meet target with constraints
  | 'FEATURE_NOT_SUPPORTED'   // Requested feature not available
  | 'ITERATION_LIMIT'         // Hit iteration limit during adjustment
  | 'ENGINE_ERROR';           // Internal engine error

/**
 * Create a port error
 */
export function createPortError(
  code: DecisionEngineErrorCode,
  message: string,
  details?: Record<string, unknown>
): DecisionEnginePortError {
  return new DecisionEnginePortError(message, code, details);
}

// ============================================
// Port Metrics
// ============================================

/**
 * Metrics collected from the port
 */
export interface DecisionEngineMetrics {
  /** Total evaluations performed */
  readonly totalEvaluations: number;

  /** Total adjustments attempted */
  readonly totalAdjustments: number;

  /** Successful adjustments */
  readonly successfulAdjustments: number;

  /** Failed adjustments */
  readonly failedAdjustments: number;

  /** Average evaluation time (ms) */
  readonly avgEvaluationTimeMs: number;

  /** Average adjustment time (ms) */
  readonly avgAdjustmentTimeMs: number;

  /** P95 evaluation time (ms) */
  readonly p95EvaluationTimeMs: number;
}

/**
 * Port with metrics support
 */
export interface IDecisionEnginePortWithMetrics extends IDecisionEnginePort {
  /**
   * Get current metrics
   */
  getMetrics(): DecisionEngineMetrics;

  /**
   * Reset metrics
   */
  resetMetrics(): void;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Create a basic adjustment target
 */
export function createAdjustmentTarget(
  options: Partial<AdjustmentTarget>
): AdjustmentTarget {
  return {
    targetApcaLc: options.targetApcaLc,
    targetWcagLevel: options.targetWcagLevel,
    targetWcag3Tier: options.targetWcag3Tier,
    fontSizePx: options.fontSizePx,
    fontWeight: options.fontWeight,
  };
}

/**
 * Create adjustment constraints with defaults
 */
export function createAdjustmentConstraints(
  options?: Partial<AdjustmentConstraintsInput>
): AdjustmentConstraintsInput {
  return {
    preserveHue: options?.preserveHue ?? true,
    maxHueShift: options?.maxHueShift ?? 10,
    maxChromaReduction: options?.maxChromaReduction ?? 25,
    minLightness: options?.minLightness ?? 5,
    maxLightness: options?.maxLightness ?? 95,
    referenceHue: options?.referenceHue,
  };
}

/**
 * Check if an error is a DecisionEnginePortError
 */
export function isDecisionEnginePortError(
  error: unknown
): error is DecisionEnginePortError {
  return error instanceof DecisionEnginePortError;
}

/**
 * Validate that a port implements required methods
 */
export function validatePort(port: unknown): port is IDecisionEnginePort {
  if (!port || typeof port !== 'object') return false;

  const requiredMethods = [
    'evaluate',
    'applyAdjustment',
    'findForegroundForTarget',
    'findBackgroundForTarget',
    'getMinimumLcForFont',
    'meetsWcagLevel',
    'meetsWcag3Tier',
    'getVersion',
    'supportsFeature',
  ];

  return requiredMethods.every(
    method => typeof (port as Record<string, unknown>)[method] === 'function'
  );
}
