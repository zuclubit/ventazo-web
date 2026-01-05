// ============================================
// AI Action Contracts Module
// Phase 4: Governance & Adoption Layer
// ============================================
//
// AI action contracts define explicit bounds for what
// AI agents CAN and CANNOT do when manipulating colors.
//
// Features:
// - Contract generation from policies
// - Contract generation from decisions
// - LLM-ready prompt instructions
// - JSON Schema validation
// - Action validation against contracts
//
// Usage:
// ```typescript
// import {
//   AIActionContractGenerator,
//   generateDefaultContract,
//   validateAction,
// } from './application/ai-contracts';
//
// const generator = new AIActionContractGenerator();
// const contract = generator.generateFromPolicy(policy);
//
// const prompt = generator.toSystemPrompt(contract);
// const validation = generator.validateAgentAction(action, contract);
// ```
//
// ============================================

// ============================================
// Type Exports
// ============================================

export type {
  // Core contract types
  AIActionContract,
  ContractVersion,
  ContractId,
  ContractMetadata,
  ContractGenerationOptions,

  // Action types
  AIActionType,
  AIAction,
  ActionParameter,
  ParameterValidation,
  ActionConstraints,
  ActionExample,

  // Constraint types
  PerceptualConstraints,
  ProtectedColor,
  AdjustmentBounds,
  NumericBounds,

  // Validation types
  ActionValidationResult,
  ActionViolation,

  // Prompt generation types
  PromptFormat,
  PromptGenerationOptions,
  GeneratedPrompt,

  // JSON Schema types
  JSONSchemaObject,
  JSONSchemaProperty,

  // Factory interfaces
  IContractFactory,
  IContractValidator,
  IPromptGenerator,
} from './types';

// ============================================
// Type Guards & Utilities
// ============================================

export {
  createContractId,
  isAIActionContract,
  isAIAction,
} from './types';

// ============================================
// Contract Generator
// ============================================

export {
  AIActionContractGenerator,
  createContractGenerator,
  generateContractFromPolicy,
  generateDefaultContract,
  validateAction,
} from './AIActionContract';

// ============================================
// Constraint Generator
// ============================================

export {
  ConstraintGenerator,
  createConstraintGenerator,
} from './ConstraintGenerator';

// ============================================
// JSON Schema
// ============================================

export {
  // Complete contract schema
  aiActionContractSchema,

  // Component schemas
  contractVersionSchema,
  contractIdSchema,
  wcag3TierSchema,
  wcagLevelSchema,
  actionTypeSchema,
  numericBoundsSchema,
  protectedColorSchema,
  perceptualConstraintsSchema,
  adjustmentBoundsSchema,
  actionParameterSchema,
  actionExampleSchema,
  aiActionSchema,
  contractMetadataSchema,

  // Action schemas
  adjustLightnessSchema,
  adjustChromaSchema,
  optimizeContrastSchema,
  generatePaletteSchema,

  // Validation utilities
  validateContractSchema,
  getActionSchema,
  getAllActionSchemas,
  getSchemaByPath,

  // Schema registry
  schemaRegistry,

  // Types
  type SchemaValidationResult,
  type SchemaValidationError,
} from './ContractSchema';

// ============================================
// Constants
// ============================================

/**
 * Current version of the AI contracts module
 */
export const AI_CONTRACTS_VERSION = '1.0.0';

/**
 * Supported contract version
 */
export const SUPPORTED_CONTRACT_VERSION = '1.0.0';

/**
 * Default WCAG 3.0 tier for contracts
 */
export const DEFAULT_WCAG3_TIER: WCAG3Tier = 'Silver';

/**
 * Default WCAG 2.1 level for contracts
 */
export const DEFAULT_WCAG_LEVEL = 'AA' as const;

/**
 * APCA Lc thresholds for each WCAG 3.0 tier
 */
export const APCA_TIER_THRESHOLDS = {
  bronze: 45,
  silver: 60,
  gold: 75,
  platinum: 90,
} as const;

/**
 * WCAG 2.1 contrast ratio requirements
 */
export const WCAG_CONTRAST_REQUIREMENTS = {
  A: { normal: 3.0, large: 2.0 },
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
} as const;

// ============================================
// Factory Functions
// ============================================

import { AIActionContractGenerator } from './AIActionContract';
import { ConstraintGenerator } from './ConstraintGenerator';
import type { PerceptualPolicy, WCAG3Tier, WCAGLevel } from '../../domain/governance/types/policy';
import type { AIActionContract, ContractGenerationOptions } from './types';

/**
 * Create a quick contract with minimal configuration
 *
 * @example
 * ```typescript
 * const contract = createQuickContract('gold', 'AAA');
 * ```
 */
export function createQuickContract(
  tier: WCAG3Tier = 'Silver',
  level: WCAGLevel = 'AA',
  options?: Partial<ContractGenerationOptions>
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateDefault({
    targetTier: tier,
    targetLevel: level,
    ...options,
  });
}

/**
 * Create a strict contract that enforces high accessibility standards
 *
 * @example
 * ```typescript
 * const contract = createStrictContract();
 * // Enforces WCAG AAA / Gold tier with strict mode
 * ```
 */
export function createStrictContract(
  options?: Partial<ContractGenerationOptions>
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateDefault({
    targetTier: 'Gold',
    targetLevel: 'AAA',
    strictMode: true,
    allowHueChanges: false,
    ...options,
    name: options?.name ?? 'Strict Accessibility Contract',
    description: options?.description ?? 'High-accessibility contract with strict enforcement (WCAG AAA / Gold tier)',
  });
}

/**
 * Create a lenient contract for creative flexibility
 *
 * @example
 * ```typescript
 * const contract = createLenientContract();
 * // Allows more flexibility while maintaining WCAG AA
 * ```
 */
export function createLenientContract(
  options?: Partial<ContractGenerationOptions>
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateDefault({
    targetTier: 'Bronze',
    targetLevel: 'AA',
    strictMode: false,
    allowHueChanges: true,
    ...options,
    name: options?.name ?? 'Lenient Design Contract',
    description: options?.description ?? 'Flexible contract for creative exploration (WCAG AA / Bronze tier)',
  });
}

/**
 * Create a brand-preserving contract
 *
 * @example
 * ```typescript
 * const contract = createBrandContract([
 *   { name: 'Primary', hex: '#1E40AF', deltaTolerance: 5, reason: 'Brand primary' },
 *   { name: 'Secondary', hex: '#9333EA', deltaTolerance: 5, reason: 'Brand secondary' },
 * ]);
 * ```
 */
export function createBrandContract(
  protectedColors: ReadonlyArray<{
    name: string;
    hex: string;
    deltaTolerance: number;
    reason: string;
  }>,
  options?: Partial<ContractGenerationOptions>
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateDefault({
    targetTier: 'Silver',
    targetLevel: 'AA',
    strictMode: false,
    allowHueChanges: true,
    protectedColors,
    ...options,
    name: options?.name ?? 'Brand-Preserving Contract',
    description: options?.description ?? `Contract that protects ${protectedColors.length} brand colors while ensuring accessibility`,
    tags: [...(options?.tags ?? []), 'brand', 'protected-colors'],
  });
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a contract is expired
 */
export function isContractExpired(contract: AIActionContract): boolean {
  if (!contract.expiresAt) return false;
  return new Date(contract.expiresAt) < new Date();
}

/**
 * Get remaining validity time in milliseconds
 */
export function getContractValidityRemaining(contract: AIActionContract): number | null {
  if (!contract.expiresAt) return null;
  const remaining = new Date(contract.expiresAt).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

/**
 * Format contract validity as human-readable string
 */
export function formatContractValidity(contract: AIActionContract): string {
  if (!contract.expiresAt) return 'No expiration';

  const remaining = getContractValidityRemaining(contract);
  if (remaining === null || remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} remaining`;
  }

  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min remaining`;
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'} remaining`;
}

/**
 * Merge two contracts (second takes precedence)
 */
export function mergeContracts(
  base: AIActionContract,
  override: Partial<AIActionContract>
): AIActionContract {
  return {
    ...base,
    ...override,
    allowedActions: override.allowedActions ?? base.allowedActions,
    forbiddenActions: override.forbiddenActions ?? base.forbiddenActions,
    perceptualConstraints: {
      ...base.perceptualConstraints,
      ...override.perceptualConstraints,
    },
    adjustmentBounds: {
      ...base.adjustmentBounds,
      ...override.adjustmentBounds,
    },
    instructions: override.instructions ?? base.instructions,
    metadata: {
      ...base.metadata,
      ...override.metadata,
    },
  } as AIActionContract;
}
