// ============================================
// Contract JSON Schema Definitions
// Phase 4: Governance & Adoption Layer
// ============================================
//
// JSON Schema definitions for AI action contracts.
// Used for validating contract structure and agent actions.
//
// Features:
// - Complete JSON Schema for AIActionContract
// - Action parameter schemas
// - Validation utilities
// - Schema versioning
//
// ============================================

import type {
  JSONSchemaObject,
  JSONSchemaProperty,
  AIActionContract,
  AIActionType,
} from './types';

// ============================================
// Constants
// ============================================

const SCHEMA_VERSION = 'http://json-schema.org/draft-07/schema#';
const SCHEMA_ID_BASE = 'https://color-intelligence.dev/schemas';

// ============================================
// Core Schema Definitions
// ============================================

/**
 * JSON Schema for ContractVersion
 */
export const contractVersionSchema: JSONSchemaProperty = {
  type: 'string',
  description: 'Contract version following SemVer',
  pattern: '^\\d+\\.\\d+\\.\\d+$',
  enum: ['1.0.0'],
};

/**
 * JSON Schema for ContractId
 */
export const contractIdSchema: JSONSchemaProperty = {
  type: 'string',
  description: 'Unique contract identifier',
  pattern: '^contract-[a-f0-9]{8}$',
};

/**
 * JSON Schema for WCAG3Tier
 */
export const wcag3TierSchema: JSONSchemaProperty = {
  type: 'string',
  description: 'WCAG 3.0 conformance tier',
  enum: ['bronze', 'silver', 'gold', 'platinum'],
};

/**
 * JSON Schema for WCAGLevel
 */
export const wcagLevelSchema: JSONSchemaProperty = {
  type: 'string',
  description: 'WCAG 2.1 conformance level',
  enum: ['A', 'AA', 'AAA'],
};

/**
 * JSON Schema for AIActionType
 */
export const actionTypeSchema: JSONSchemaProperty = {
  type: 'string',
  description: 'Type of AI action',
  enum: [
    'adjust-lightness',
    'adjust-chroma',
    'adjust-hue',
    'adjust-tone',
    'set-color',
    'generate-palette',
    'create-variant',
    'suggest-alternative',
    'validate-accessibility',
    'optimize-contrast',
  ],
};

/**
 * JSON Schema for NumericBounds
 */
export const numericBoundsSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Numeric bounds with optional step size',
  properties: {
    min: { type: 'number', description: 'Minimum allowed value' },
    max: { type: 'number', description: 'Maximum allowed value' },
    step: { type: 'number', description: 'Step size for adjustments' },
    unit: { type: 'string', description: 'Unit of measurement' },
  },
  required: ['min', 'max', 'step'],
};

/**
 * JSON Schema for ProtectedColor
 */
export const protectedColorSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'A color that should not be modified',
  properties: {
    name: { type: 'string', description: 'Color name' },
    hex: { type: 'string', description: 'Hex color value', pattern: '^#[0-9A-Fa-f]{6}$' },
    deltaTolerance: { type: 'number', description: 'Maximum allowed delta E', minimum: 0 },
    reason: { type: 'string', description: 'Reason for protection' },
  },
  required: ['name', 'hex', 'deltaTolerance', 'reason'],
};

/**
 * JSON Schema for PerceptualConstraints
 */
export const perceptualConstraintsSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Perceptual constraints for color adjustments',
  properties: {
    preserveHue: { type: 'boolean', description: 'Whether to preserve hue' },
    hueToleranceDegrees: { type: 'number', description: 'Hue tolerance in degrees', minimum: 0, maximum: 180 },
    preserveChroma: { type: 'boolean', description: 'Whether to preserve chroma' },
    chromaTolerancePercent: { type: 'number', description: 'Chroma tolerance as percentage', minimum: 0, maximum: 100 },
    minLightnessContrast: { type: 'number', description: 'Minimum lightness contrast', minimum: 0 },
    maxToneShift: { type: 'number', description: 'Maximum tone shift', minimum: 0 },
    maintainPerceptualUniformity: { type: 'boolean', description: 'Maintain perceptual uniformity' },
    uniformityTolerance: { type: 'number', description: 'Uniformity tolerance', minimum: 0 },
    stayInGamut: { type: 'boolean', description: 'Stay within sRGB gamut' },
    gamutMappingMethod: {
      type: 'string',
      description: 'Method for gamut mapping',
      enum: ['clip', 'compress', 'preserve-lightness'],
    },
    protectedColors: {
      type: 'array',
      description: 'Colors that should not be modified',
      items: protectedColorSchema,
    },
  },
  required: [
    'preserveHue',
    'hueToleranceDegrees',
    'preserveChroma',
    'chromaTolerancePercent',
    'minLightnessContrast',
    'maxToneShift',
    'maintainPerceptualUniformity',
    'uniformityTolerance',
    'stayInGamut',
    'gamutMappingMethod',
  ],
};

/**
 * JSON Schema for AdjustmentBounds
 */
export const adjustmentBoundsSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Bounds for color adjustments',
  properties: {
    tone: numericBoundsSchema,
    chroma: numericBoundsSchema,
    lightness: numericBoundsSchema,
    hue: {
      ...numericBoundsSchema,
      description: 'Hue bounds (null if hue changes forbidden)',
    },
    apcaLc: numericBoundsSchema,
    contrastRatio: numericBoundsSchema,
    fontSize: numericBoundsSchema,
    alpha: numericBoundsSchema,
  },
  required: ['tone', 'chroma', 'lightness', 'apcaLc', 'contrastRatio', 'fontSize', 'alpha'],
};

/**
 * JSON Schema for ActionParameter
 */
export const actionParameterSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Parameter for an AI action',
  properties: {
    name: { type: 'string', description: 'Parameter name' },
    type: {
      type: 'string',
      description: 'Parameter type',
      enum: ['number', 'string', 'boolean', 'color', 'array'],
    },
    description: { type: 'string', description: 'Parameter description' },
    required: { type: 'boolean', description: 'Whether parameter is required' },
    default: { type: 'string', description: 'Default value' },
    validation: {
      type: 'object',
      description: 'Validation rules',
      properties: {
        min: { type: 'number' },
        max: { type: 'number' },
        step: { type: 'number' },
        pattern: { type: 'string' },
        enum: { type: 'array' },
        format: {
          type: 'string',
          enum: ['hex', 'rgb', 'hsl', 'oklch', 'hct'],
        },
      },
    },
  },
  required: ['name', 'type', 'description', 'required'],
};

/**
 * JSON Schema for ActionExample
 */
export const actionExampleSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Example usage of an action',
  properties: {
    description: { type: 'string', description: 'Example description' },
    input: { type: 'object', description: 'Example input' },
    expectedOutput: { type: 'object', description: 'Expected output' },
    explanation: { type: 'string', description: 'Explanation of the example' },
  },
  required: ['description', 'input', 'expectedOutput'],
};

/**
 * JSON Schema for AIAction
 */
export const aiActionSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'AI action definition',
  properties: {
    type: actionTypeSchema,
    description: { type: 'string', description: 'Action description' },
    parameters: {
      type: 'array',
      description: 'Action parameters',
      items: actionParameterSchema,
    },
    constraints: {
      type: 'object',
      description: 'Action constraints',
      properties: {
        requiresAccessibilityCheck: { type: 'boolean' },
        preservesHue: { type: 'boolean' },
        preservesChroma: { type: 'boolean' },
        maintainsContrast: { type: 'boolean' },
        minContrastRatio: { type: 'number' },
        maxIterations: { type: 'integer' },
      },
    },
    examples: {
      type: 'array',
      description: 'Usage examples',
      items: actionExampleSchema,
    },
  },
  required: ['type', 'description'],
};

/**
 * JSON Schema for ContractMetadata
 */
export const contractMetadataSchema: JSONSchemaProperty = {
  type: 'object',
  description: 'Contract metadata',
  properties: {
    generator: { type: 'string', description: 'Generator name' },
    generatorVersion: { type: 'string', description: 'Generator version' },
    colorSpaces: {
      type: 'array',
      description: 'Supported color spaces',
      items: { type: 'string', enum: ['oklch', 'hct', 'srgb', 'p3'] },
    },
    accessibilityStandards: {
      type: 'array',
      description: 'Accessibility standards used',
      items: { type: 'string', enum: ['wcag21', 'wcag30', 'apca'] },
    },
    tags: {
      type: 'array',
      description: 'Contract tags',
      items: { type: 'string' },
    },
    author: { type: 'string', description: 'Contract author' },
    organization: { type: 'string', description: 'Organization' },
  },
  required: ['generator', 'generatorVersion', 'colorSpaces', 'accessibilityStandards', 'tags'],
};

// ============================================
// Complete Contract Schema
// ============================================

/**
 * Complete JSON Schema for AIActionContract
 */
export const aiActionContractSchema: JSONSchemaObject = {
  $schema: SCHEMA_VERSION,
  $id: `${SCHEMA_ID_BASE}/ai-action-contract.json`,
  type: 'object',
  title: 'AI Action Contract',
  description: 'Complete schema for an AI action contract that defines what an AI agent can and cannot do when manipulating colors.',
  properties: {
    version: contractVersionSchema,
    contractId: contractIdSchema,
    name: { type: 'string', description: 'Contract name', minLength: 1 },
    description: { type: 'string', description: 'Contract description' },
    generatedAt: {
      type: 'string',
      description: 'ISO 8601 timestamp of generation',
      format: 'date-time',
    },
    expiresAt: {
      type: ['string', 'null'],
      description: 'ISO 8601 timestamp of expiration',
      format: 'date-time',
    },
    allowedActions: {
      type: 'array',
      description: 'Actions the agent CAN perform',
      items: aiActionSchema,
    },
    forbiddenActions: {
      type: 'array',
      description: 'Actions the agent CANNOT perform',
      items: aiActionSchema,
    },
    targetAccessibilityTier: wcag3TierSchema,
    targetWcagLevel: wcagLevelSchema,
    perceptualConstraints: perceptualConstraintsSchema,
    adjustmentBounds: adjustmentBoundsSchema,
    instructions: {
      type: 'array',
      description: 'Human-readable instructions for the LLM',
      items: { type: 'string' },
    },
    jsonSchema: {
      type: 'object',
      description: 'Machine-readable JSON Schema',
    },
    sourcePolicyId: {
      type: 'string',
      description: 'Source policy ID if generated from governance',
    },
    sourcePolicyVersion: {
      type: 'string',
      description: 'Source policy version',
    },
    metadata: contractMetadataSchema,
  },
  required: [
    'version',
    'contractId',
    'name',
    'description',
    'generatedAt',
    'allowedActions',
    'forbiddenActions',
    'targetAccessibilityTier',
    'targetWcagLevel',
    'perceptualConstraints',
    'adjustmentBounds',
    'instructions',
    'jsonSchema',
    'metadata',
  ],
  additionalProperties: false,
};

// ============================================
// Action-Specific Schemas
// ============================================

/**
 * Schema for adjust-lightness action
 */
export const adjustLightnessSchema: JSONSchemaObject = {
  $schema: SCHEMA_VERSION,
  $id: `${SCHEMA_ID_BASE}/actions/adjust-lightness.json`,
  type: 'object',
  title: 'Adjust Lightness Action',
  description: 'Schema for adjusting the lightness of a color',
  properties: {
    type: { type: 'string', const: 'adjust-lightness' },
    parameters: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'The color to adjust (hex, rgb, oklch)',
        },
        amount: {
          type: 'number',
          description: 'Amount to adjust lightness (-100 to 100)',
          minimum: -100,
          maximum: 100,
        },
        targetLightness: {
          type: 'number',
          description: 'Target lightness value (0-100)',
          minimum: 0,
          maximum: 100,
        },
      },
      oneOf: [
        { required: ['color', 'amount'] },
        { required: ['color', 'targetLightness'] },
      ],
    },
  },
  required: ['type', 'parameters'],
};

/**
 * Schema for adjust-chroma action
 */
export const adjustChromaSchema: JSONSchemaObject = {
  $schema: SCHEMA_VERSION,
  $id: `${SCHEMA_ID_BASE}/actions/adjust-chroma.json`,
  type: 'object',
  title: 'Adjust Chroma Action',
  description: 'Schema for adjusting the chroma/saturation of a color',
  properties: {
    type: { type: 'string', const: 'adjust-chroma' },
    parameters: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'The color to adjust',
        },
        amount: {
          type: 'number',
          description: 'Amount to adjust chroma (-100 to 100)',
          minimum: -100,
          maximum: 100,
        },
        targetChroma: {
          type: 'number',
          description: 'Target chroma value (0-150)',
          minimum: 0,
          maximum: 150,
        },
      },
      oneOf: [
        { required: ['color', 'amount'] },
        { required: ['color', 'targetChroma'] },
      ],
    },
  },
  required: ['type', 'parameters'],
};

/**
 * Schema for optimize-contrast action
 */
export const optimizeContrastSchema: JSONSchemaObject = {
  $schema: SCHEMA_VERSION,
  $id: `${SCHEMA_ID_BASE}/actions/optimize-contrast.json`,
  type: 'object',
  title: 'Optimize Contrast Action',
  description: 'Schema for optimizing contrast between foreground and background',
  properties: {
    type: { type: 'string', const: 'optimize-contrast' },
    parameters: {
      type: 'object',
      properties: {
        foreground: {
          type: 'string',
          description: 'Foreground color',
        },
        background: {
          type: 'string',
          description: 'Background color',
        },
        targetRatio: {
          type: 'number',
          description: 'Target contrast ratio',
          minimum: 1,
          maximum: 21,
        },
        targetApcaLc: {
          type: 'number',
          description: 'Target APCA Lc value',
          minimum: 0,
          maximum: 108,
        },
        adjustTarget: {
          type: 'string',
          description: 'Which color to adjust',
          enum: ['foreground', 'background', 'both'],
          default: 'foreground',
        },
        preserveHue: {
          type: 'boolean',
          description: 'Preserve the hue of the adjusted color',
          default: true,
        },
      },
      required: ['foreground', 'background'],
      oneOf: [
        { required: ['targetRatio'] },
        { required: ['targetApcaLc'] },
      ],
    },
  },
  required: ['type', 'parameters'],
};

/**
 * Schema for generate-palette action
 */
export const generatePaletteSchema: JSONSchemaObject = {
  $schema: SCHEMA_VERSION,
  $id: `${SCHEMA_ID_BASE}/actions/generate-palette.json`,
  type: 'object',
  title: 'Generate Palette Action',
  description: 'Schema for generating an accessible color palette',
  properties: {
    type: { type: 'string', const: 'generate-palette' },
    parameters: {
      type: 'object',
      properties: {
        baseColor: {
          type: 'string',
          description: 'Base color for the palette',
        },
        steps: {
          type: 'integer',
          description: 'Number of shades to generate',
          minimum: 3,
          maximum: 15,
          default: 10,
        },
        algorithm: {
          type: 'string',
          description: 'Algorithm for generating shades',
          enum: ['linear', 'perceptual', 'material', 'tailwind'],
          default: 'perceptual',
        },
        accessibilityTier: wcag3TierSchema,
      },
      required: ['baseColor'],
    },
  },
  required: ['type', 'parameters'],
};

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate a contract against the schema
 */
export function validateContractSchema(contract: unknown): SchemaValidationResult {
  const errors: SchemaValidationError[] = [];
  const warnings: string[] = [];

  if (typeof contract !== 'object' || contract === null) {
    errors.push({
      path: '',
      message: 'Contract must be an object',
      schemaPath: '#/type',
    });
    return { valid: false, errors, warnings };
  }

  const obj = contract as Record<string, unknown>;

  // Check required fields
  const requiredFields = aiActionContractSchema.required as string[];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      errors.push({
        path: field,
        message: `Missing required field: ${field}`,
        schemaPath: `#/required`,
      });
    }
  }

  // Extract values with bracket notation (TS4111 compliance)
  const versionValue = obj['version'];
  const contractIdValue = obj['contractId'];
  const targetAccessibilityTierValue = obj['targetAccessibilityTier'];
  const targetWcagLevelValue = obj['targetWcagLevel'];
  const allowedActionsValue = obj['allowedActions'];
  const forbiddenActionsValue = obj['forbiddenActions'];

  // Validate version
  if (versionValue !== '1.0.0') {
    errors.push({
      path: 'version',
      message: `Invalid version: ${versionValue}. Expected: 1.0.0`,
      schemaPath: '#/properties/version',
    });
  }

  // Validate contractId format
  if (typeof contractIdValue === 'string') {
    if (!/^contract-[a-f0-9]{8}$/.test(contractIdValue)) {
      warnings.push(`Contract ID "${contractIdValue}" does not match expected format`);
    }
  }

  // Validate targetAccessibilityTier
  if (targetAccessibilityTierValue) {
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (!validTiers.includes(targetAccessibilityTierValue as string)) {
      errors.push({
        path: 'targetAccessibilityTier',
        message: `Invalid tier: ${targetAccessibilityTierValue}. Must be one of: ${validTiers.join(', ')}`,
        schemaPath: '#/properties/targetAccessibilityTier',
      });
    }
  }

  // Validate targetWcagLevel
  if (targetWcagLevelValue) {
    const validLevels = ['A', 'AA', 'AAA'];
    if (!validLevels.includes(targetWcagLevelValue as string)) {
      errors.push({
        path: 'targetWcagLevel',
        message: `Invalid level: ${targetWcagLevelValue}. Must be one of: ${validLevels.join(', ')}`,
        schemaPath: '#/properties/targetWcagLevel',
      });
    }
  }

  // Validate allowedActions
  if (Array.isArray(allowedActionsValue)) {
    for (let i = 0; i < allowedActionsValue.length; i++) {
      const actionErrors = validateAction(allowedActionsValue[i], `allowedActions[${i}]`);
      errors.push(...actionErrors);
    }
  }

  // Validate forbiddenActions
  if (Array.isArray(forbiddenActionsValue)) {
    for (let i = 0; i < forbiddenActionsValue.length; i++) {
      const actionErrors = validateAction(forbiddenActionsValue[i], `forbiddenActions[${i}]`);
      errors.push(...actionErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate an action object
 */
function validateAction(action: unknown, path: string): SchemaValidationError[] {
  const errors: SchemaValidationError[] = [];

  if (typeof action !== 'object' || action === null) {
    errors.push({
      path,
      message: 'Action must be an object',
      schemaPath: '#/definitions/AIAction/type',
    });
    return errors;
  }

  const obj = action as Record<string, unknown>;

  // Extract values with bracket notation (TS4111 compliance)
  const typeValue = obj['type'];
  const descriptionValue = obj['description'];

  // Check required fields
  if (!typeValue) {
    errors.push({
      path: `${path}.type`,
      message: 'Action type is required',
      schemaPath: '#/definitions/AIAction/required',
    });
  }

  if (!descriptionValue) {
    errors.push({
      path: `${path}.description`,
      message: 'Action description is required',
      schemaPath: '#/definitions/AIAction/required',
    });
  }

  // Validate action type
  const validTypes: AIActionType[] = [
    'adjust-lightness',
    'adjust-chroma',
    'adjust-hue',
    'adjust-tone',
    'set-color',
    'generate-palette',
    'create-variant',
    'suggest-alternative',
    'validate-accessibility',
    'optimize-contrast',
  ];

  if (typeValue && !validTypes.includes(typeValue as AIActionType)) {
    errors.push({
      path: `${path}.type`,
      message: `Invalid action type: ${typeValue}. Must be one of: ${validTypes.join(', ')}`,
      schemaPath: '#/definitions/AIAction/properties/type',
    });
  }

  return errors;
}

/**
 * Get the schema for a specific action type
 */
export function getActionSchema(actionType: AIActionType): JSONSchemaObject | null {
  const schemas: Partial<Record<AIActionType, JSONSchemaObject>> = {
    'adjust-lightness': adjustLightnessSchema,
    'adjust-chroma': adjustChromaSchema,
    'optimize-contrast': optimizeContrastSchema,
    'generate-palette': generatePaletteSchema,
  };

  return schemas[actionType] ?? null;
}

/**
 * Get all available action schemas
 */
export function getAllActionSchemas(): ReadonlyArray<JSONSchemaObject> {
  return [
    adjustLightnessSchema,
    adjustChromaSchema,
    optimizeContrastSchema,
    generatePaletteSchema,
  ];
}

// ============================================
// Types
// ============================================

/**
 * Result of schema validation
 */
export interface SchemaValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<SchemaValidationError>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  readonly path: string;
  readonly message: string;
  readonly schemaPath: string;
}

// ============================================
// Schema Registry
// ============================================

/**
 * Registry of all available schemas
 */
export const schemaRegistry = {
  contract: aiActionContractSchema,
  actions: {
    'adjust-lightness': adjustLightnessSchema,
    'adjust-chroma': adjustChromaSchema,
    'optimize-contrast': optimizeContrastSchema,
    'generate-palette': generatePaletteSchema,
  },
  components: {
    version: contractVersionSchema,
    contractId: contractIdSchema,
    wcag3Tier: wcag3TierSchema,
    wcagLevel: wcagLevelSchema,
    actionType: actionTypeSchema,
    numericBounds: numericBoundsSchema,
    protectedColor: protectedColorSchema,
    perceptualConstraints: perceptualConstraintsSchema,
    adjustmentBounds: adjustmentBoundsSchema,
    actionParameter: actionParameterSchema,
    actionExample: actionExampleSchema,
    aiAction: aiActionSchema,
    contractMetadata: contractMetadataSchema,
  },
} as const;

/**
 * Get a schema by path
 */
export function getSchemaByPath(path: string): JSONSchemaProperty | JSONSchemaObject | null {
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) {
    return aiActionContractSchema;
  }

  let current: unknown = schemaRegistry;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return null;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as JSONSchemaProperty | JSONSchemaObject | null;
}
