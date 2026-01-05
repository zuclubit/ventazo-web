// ============================================
// AI Action Contract Types
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Type definitions for AI agent action contracts.
// These contracts define what AI agents CAN and CANNOT do
// when manipulating colors in the design system.
//
// Purpose:
// - Provide explicit bounds for LLM color adjustments
// - Enable machine-readable constraint validation
// - Generate human-readable instructions for prompts
//
// ============================================

import type { WCAGLevel, WCAG3Tier } from '../../domain/governance/types/policy';

// ============================================
// Core Contract Types
// ============================================

/**
 * Contract version following SemVer
 */
export type ContractVersion = '1.0.0';

/**
 * Unique contract identifier
 */
export type ContractId = string & { readonly __brand: 'ContractId' };

/**
 * AI Action Contract
 *
 * Defines the complete set of constraints and permissions
 * for an AI agent performing color operations.
 */
export interface AIActionContract {
  readonly version: ContractVersion;
  readonly contractId: ContractId;
  readonly name: string;
  readonly description: string;
  readonly generatedAt: string;
  readonly expiresAt: string | null;

  // What the agent CAN do
  readonly allowedActions: ReadonlyArray<AIAction>;

  // What the agent CANNOT do
  readonly forbiddenActions: ReadonlyArray<AIAction>;

  // Target outcomes
  readonly targetAccessibilityTier: WCAG3Tier;
  readonly targetWcagLevel: WCAGLevel;

  // Perceptual constraints
  readonly perceptualConstraints: PerceptualConstraints;

  // Bounds for numerical adjustments
  readonly adjustmentBounds: AdjustmentBounds;

  // Human-readable instructions for LLM
  readonly instructions: ReadonlyArray<string>;

  // Machine-readable schema
  readonly jsonSchema: JSONSchemaObject;

  // Source policy (if generated from governance)
  readonly sourcePolicyId?: string;
  readonly sourcePolicyVersion?: string;

  // Metadata
  readonly metadata: ContractMetadata;
}

// ============================================
// Action Types
// ============================================

/**
 * Types of actions an AI agent can perform
 */
export type AIActionType =
  | 'adjust-lightness'
  | 'adjust-chroma'
  | 'adjust-hue'
  | 'adjust-tone'
  | 'set-color'
  | 'generate-palette'
  | 'create-variant'
  | 'suggest-alternative'
  | 'validate-accessibility'
  | 'optimize-contrast';

/**
 * AI Action definition
 */
export interface AIAction {
  readonly type: AIActionType;
  readonly description: string;
  readonly parameters?: ReadonlyArray<ActionParameter>;
  readonly constraints?: ActionConstraints;
  readonly examples?: ReadonlyArray<ActionExample>;
}

/**
 * Parameter for an action
 */
export interface ActionParameter {
  readonly name: string;
  readonly type: 'number' | 'string' | 'boolean' | 'color' | 'array';
  readonly description: string;
  readonly required: boolean;
  readonly default?: unknown;
  readonly validation?: ParameterValidation;
}

/**
 * Parameter validation rules
 */
export interface ParameterValidation {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly pattern?: string;
  readonly enum?: ReadonlyArray<string | number>;
  readonly format?: 'hex' | 'rgb' | 'hsl' | 'oklch' | 'hct';
}

/**
 * Constraints for an action
 */
export interface ActionConstraints {
  readonly requiresAccessibilityCheck?: boolean;
  readonly preservesHue?: boolean;
  readonly preservesChroma?: boolean;
  readonly maintainsContrast?: boolean;
  readonly minContrastRatio?: number;
  readonly maxIterations?: number;
}

/**
 * Example usage of an action
 */
export interface ActionExample {
  readonly description: string;
  readonly input: Record<string, unknown>;
  readonly expectedOutput: Record<string, unknown>;
  readonly explanation?: string;
}

// ============================================
// Perceptual Constraints
// ============================================

/**
 * Perceptual constraints for color adjustments
 *
 * These constraints ensure that AI agents maintain
 * perceptual coherence when modifying colors.
 */
export interface PerceptualConstraints {
  // Hue preservation
  readonly preserveHue: boolean;
  readonly hueToleranceDegrees: number;

  // Chroma preservation
  readonly preserveChroma: boolean;
  readonly chromaTolerancePercent: number;

  // Lightness/tone constraints
  readonly minLightnessContrast: number;
  readonly maxToneShift: number;

  // Perceptual uniformity
  readonly maintainPerceptualUniformity: boolean;
  readonly uniformityTolerance: number;

  // Gamut constraints
  readonly stayInGamut: boolean;
  readonly gamutMappingMethod: 'clip' | 'compress' | 'preserve-lightness';

  // Brand color protection
  readonly protectedColors?: ReadonlyArray<ProtectedColor>;
}

/**
 * A color that should not be modified beyond tolerance
 */
export interface ProtectedColor {
  readonly name: string;
  readonly hex: string;
  readonly deltaTolerance: number;
  readonly reason: string;
}

// ============================================
// Adjustment Bounds
// ============================================

/**
 * Numerical bounds for color adjustments
 *
 * These define the valid ranges for each adjustable property.
 */
export interface AdjustmentBounds {
  readonly tone: NumericBounds;
  readonly chroma: NumericBounds;
  readonly lightness: NumericBounds;
  readonly hue: NumericBounds | null; // null if hue changes forbidden

  // APCA-specific
  readonly apcaLc: NumericBounds;

  // Contrast ratio
  readonly contrastRatio: NumericBounds;

  // Font size (for accessibility)
  readonly fontSize: NumericBounds;

  // Alpha/opacity
  readonly alpha: NumericBounds;
}

/**
 * Numeric bounds with optional step size
 */
export interface NumericBounds {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly unit?: string;
}

// ============================================
// Contract Metadata
// ============================================

/**
 * Metadata about the contract
 */
export interface ContractMetadata {
  readonly generator: string;
  readonly generatorVersion: string;
  readonly colorSpaces: ReadonlyArray<'oklch' | 'hct' | 'srgb' | 'p3'>;
  readonly accessibilityStandards: ReadonlyArray<'wcag21' | 'wcag30' | 'apca'>;
  readonly tags: ReadonlyArray<string>;
  readonly author?: string;
  readonly organization?: string;
}

// ============================================
// JSON Schema Types
// ============================================

/**
 * JSON Schema object (simplified for contract generation)
 */
export interface JSONSchemaObject {
  readonly $schema?: string;
  readonly $id?: string;
  readonly type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  readonly title?: string;
  readonly description?: string;
  readonly properties?: Record<string, JSONSchemaProperty>;
  readonly required?: ReadonlyArray<string>;
  readonly additionalProperties?: boolean;
  readonly definitions?: Record<string, JSONSchemaProperty>;
}

/**
 * JSON Schema property
 */
export interface JSONSchemaProperty {
  readonly type?: string | ReadonlyArray<string>;
  readonly description?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly enum?: ReadonlyArray<unknown>;
  readonly default?: unknown;
  readonly format?: string;
  readonly items?: JSONSchemaProperty;
  readonly properties?: Record<string, JSONSchemaProperty>;
  readonly required?: ReadonlyArray<string>;
  readonly $ref?: string;
  // JSON Schema Draft-07 keywords
  readonly const?: unknown;
  readonly oneOf?: ReadonlyArray<JSONSchemaProperty>;
  readonly anyOf?: ReadonlyArray<JSONSchemaProperty>;
  readonly allOf?: ReadonlyArray<JSONSchemaProperty>;
  readonly additionalProperties?: boolean | JSONSchemaProperty;
  readonly if?: JSONSchemaProperty;
  readonly then?: JSONSchemaProperty;
  readonly else?: JSONSchemaProperty;
}

// ============================================
// Contract Generation Options
// ============================================

/**
 * Options for generating an AI action contract
 */
export interface ContractGenerationOptions {
  // Base configuration
  readonly name?: string;
  readonly description?: string;

  // Target accessibility
  readonly targetTier?: WCAG3Tier;
  readonly targetLevel?: WCAGLevel;

  // Strictness
  readonly strictMode?: boolean;
  readonly allowHueChanges?: boolean;

  // Protected colors
  readonly protectedColors?: ReadonlyArray<ProtectedColor>;

  // Custom bounds
  readonly customBounds?: Partial<AdjustmentBounds>;

  // Include examples
  readonly includeExamples?: boolean;

  // Expiration
  readonly expiresInHours?: number;

  // Tags
  readonly tags?: ReadonlyArray<string>;
}

// ============================================
// Validation Types
// ============================================

/**
 * Result of validating an agent action against a contract
 */
export interface ActionValidationResult {
  readonly valid: boolean;
  readonly action: AIAction;
  readonly contract: ContractId;
  readonly violations: ReadonlyArray<ActionViolation>;
  readonly warnings: ReadonlyArray<string>;
  readonly adjustedAction?: AIAction;
}

/**
 * Violation of a contract constraint
 */
export interface ActionViolation {
  readonly constraintType: 'bound' | 'forbidden' | 'perceptual' | 'accessibility';
  readonly property: string;
  readonly expectedRange?: string;
  readonly actualValue: unknown;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

// ============================================
// Prompt Generation Types
// ============================================

/**
 * Format for prompt output
 */
export type PromptFormat = 'markdown' | 'plain' | 'structured';

/**
 * Options for generating prompt instructions
 */
export interface PromptGenerationOptions {
  readonly format?: PromptFormat;
  readonly includeExamples?: boolean;
  readonly includeSchema?: boolean;
  readonly maxLength?: number;
  readonly language?: 'en' | 'es';
}

/**
 * Generated prompt content
 */
export interface GeneratedPrompt {
  readonly instructions: string;
  readonly schema?: string;
  readonly examples?: string;
  readonly fullPrompt: string;
  readonly tokenEstimate: number;
}

// ============================================
// Factory Types
// ============================================

/**
 * Factory for creating contracts
 */
export interface IContractFactory {
  createFromPolicy(policyId: string, options?: ContractGenerationOptions): AIActionContract;
  createFromDecision(decision: unknown, options?: ContractGenerationOptions): AIActionContract;
  createDefault(options?: ContractGenerationOptions): AIActionContract;
}

/**
 * Validator for contracts
 */
export interface IContractValidator {
  validate(action: unknown, contract: AIActionContract): ActionValidationResult;
  validateBatch(actions: ReadonlyArray<unknown>, contract: AIActionContract): ReadonlyArray<ActionValidationResult>;
}

/**
 * Generator for prompts
 */
export interface IPromptGenerator {
  toPromptInstructions(contract: AIActionContract, options?: PromptGenerationOptions): GeneratedPrompt;
  toJsonSchema(contract: AIActionContract): JSONSchemaObject;
  toSystemPrompt(contract: AIActionContract): string;
}

// ============================================
// Utility Types
// ============================================

/**
 * Create a branded ContractId
 */
export function createContractId(id: string): ContractId {
  return id as ContractId;
}

/**
 * Type guard for AIActionContract
 */
export function isAIActionContract(value: unknown): value is AIActionContract {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return (
    obj['version'] === '1.0.0' &&
    typeof obj['contractId'] === 'string' &&
    Array.isArray(obj['allowedActions']) &&
    Array.isArray(obj['forbiddenActions']) &&
    typeof obj['perceptualConstraints'] === 'object' &&
    typeof obj['adjustmentBounds'] === 'object'
  );
}

/**
 * Type guard for AIAction
 */
export function isAIAction(value: unknown): value is AIAction {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  return typeof obj['type'] === 'string' && typeof obj['description'] === 'string';
}
