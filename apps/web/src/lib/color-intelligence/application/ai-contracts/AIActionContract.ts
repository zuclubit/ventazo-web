// ============================================
// AI Action Contract Generator
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Main contract generation class for AI agent guidance.
// Creates structured contracts that define what AI agents
// CAN and CANNOT do when manipulating colors.
//
// Features:
// - Generate from PerceptualPolicy
// - Generate from GovernedDecision
// - Convert to LLM-ready prompt instructions
// - Export as JSON Schema for validation
// - Validate agent actions against contracts
//
// ============================================

import { ConstraintGenerator } from './ConstraintGenerator';
import type {
  AIActionContract,
  AIAction,
  ContractId,
  ContractVersion,
  ContractMetadata,
  ContractGenerationOptions,
  ActionValidationResult,
  ActionViolation,
  PromptGenerationOptions,
  GeneratedPrompt,
  JSONSchemaObject,
  JSONSchemaProperty,
  PerceptualConstraints,
  AdjustmentBounds,
  createContractId,
} from './types';
import type { PerceptualPolicy, WCAG3Tier, WCAGLevel } from '../../domain/governance/types/policy';

// ============================================
// Constants
// ============================================

const CONTRACT_VERSION: ContractVersion = '1.0.0';
const GENERATOR_NAME = 'color-intelligence';
const GENERATOR_VERSION = '4.0.0';

// ============================================
// Contract Generator Class
// ============================================

/**
 * AI Action Contract Generator
 *
 * Generates structured contracts that guide AI agents
 * in making accessible color decisions.
 */
export class AIActionContractGenerator {
  private readonly constraintGenerator: ConstraintGenerator;

  constructor() {
    this.constraintGenerator = new ConstraintGenerator();
  }

  // ============================================
  // Contract Generation
  // ============================================

  /**
   * Generate a contract from a PerceptualPolicy
   */
  generateFromPolicy(
    policy: PerceptualPolicy,
    options?: ContractGenerationOptions
  ): AIActionContract {
    const targetTier = options?.targetTier ?? this.extractTierFromPolicy(policy);
    const targetLevel = options?.targetLevel ?? this.extractLevelFromPolicy(policy);

    const perceptualConstraints = this.constraintGenerator.generatePerceptualConstraints(
      targetTier,
      {
        strictMode: options?.strictMode ?? policy.enforcement === 'strict',
        allowHueChanges: options?.allowHueChanges ?? true,
        protectedColors: options?.protectedColors,
      }
    );

    const adjustmentBounds = this.constraintGenerator.generateAdjustmentBounds(
      targetTier,
      targetLevel,
      {
        restrictHue: !(options?.allowHueChanges ?? true),
        customBounds: options?.customBounds,
      }
    );

    const allowedActions = this.constraintGenerator.generateAllowedActions(targetTier, {
      allowHueChanges: options?.allowHueChanges ?? true,
      allowPaletteGeneration: true,
    });

    const forbiddenActions = this.constraintGenerator.generateForbiddenActions({
      forbidHueChanges: !(options?.allowHueChanges ?? true),
      forbidPaletteGeneration: false,
    });

    const instructions = this.constraintGenerator.generateInstructions(
      targetTier,
      targetLevel,
      perceptualConstraints,
      adjustmentBounds
    );

    const jsonSchema = this.generateJsonSchema(
      allowedActions,
      perceptualConstraints,
      adjustmentBounds
    );

    const contractId = this.generateContractId(policy.id);
    const now = new Date().toISOString();
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    return {
      version: CONTRACT_VERSION,
      contractId,
      name: options?.name ?? `Contract for ${policy.name}`,
      description: options?.description ?? `AI action contract generated from policy: ${policy.description}`,
      generatedAt: now,
      expiresAt,
      allowedActions,
      forbiddenActions,
      targetAccessibilityTier: targetTier,
      targetWcagLevel: targetLevel,
      perceptualConstraints,
      adjustmentBounds,
      instructions,
      jsonSchema,
      sourcePolicyId: policy.id,
      sourcePolicyVersion: policy.version,
      metadata: this.generateMetadata(options?.tags),
    };
  }

  /**
   * Generate a contract from a GovernedDecision
   */
  generateFromDecision(
    decision: GovernedDecisionLike,
    options?: ContractGenerationOptions
  ): AIActionContract {
    const targetTier = options?.targetTier ?? decision.wcag3Tier ?? 'Silver';
    const targetLevel = options?.targetLevel ?? decision.wcagLevel ?? 'AA';

    const perceptualConstraints = this.constraintGenerator.generatePerceptualConstraints(
      targetTier,
      {
        strictMode: options?.strictMode ?? false,
        allowHueChanges: options?.allowHueChanges ?? true,
        protectedColors: options?.protectedColors,
      }
    );

    const adjustmentBounds = this.constraintGenerator.generateAdjustmentBounds(
      targetTier,
      targetLevel,
      {
        restrictHue: !(options?.allowHueChanges ?? true),
        customBounds: options?.customBounds,
      }
    );

    const allowedActions = this.constraintGenerator.generateAllowedActions(targetTier, {
      allowHueChanges: options?.allowHueChanges ?? true,
      allowPaletteGeneration: true,
    });

    const forbiddenActions = this.constraintGenerator.generateForbiddenActions({
      forbidHueChanges: !(options?.allowHueChanges ?? true),
      forbidPaletteGeneration: false,
    });

    const instructions = this.constraintGenerator.generateInstructions(
      targetTier,
      targetLevel,
      perceptualConstraints,
      adjustmentBounds
    );

    const jsonSchema = this.generateJsonSchema(
      allowedActions,
      perceptualConstraints,
      adjustmentBounds
    );

    const contractId = this.generateContractId(`decision-${Date.now()}`);
    const now = new Date().toISOString();
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    return {
      version: CONTRACT_VERSION,
      contractId,
      name: options?.name ?? `Contract for Decision`,
      description: options?.description ?? `AI action contract generated from contrast decision`,
      generatedAt: now,
      expiresAt,
      allowedActions,
      forbiddenActions,
      targetAccessibilityTier: targetTier,
      targetWcagLevel: targetLevel,
      perceptualConstraints,
      adjustmentBounds,
      instructions,
      jsonSchema,
      metadata: this.generateMetadata(options?.tags),
    };
  }

  /**
   * Generate a default contract
   */
  generateDefault(options?: ContractGenerationOptions): AIActionContract {
    const targetTier = options?.targetTier ?? 'Silver';
    const targetLevel = options?.targetLevel ?? 'AA';

    const perceptualConstraints = this.constraintGenerator.generatePerceptualConstraints(
      targetTier,
      {
        strictMode: options?.strictMode ?? false,
        allowHueChanges: options?.allowHueChanges ?? true,
        protectedColors: options?.protectedColors,
      }
    );

    const adjustmentBounds = this.constraintGenerator.generateAdjustmentBounds(
      targetTier,
      targetLevel,
      {
        restrictHue: !(options?.allowHueChanges ?? true),
        customBounds: options?.customBounds,
      }
    );

    const allowedActions = this.constraintGenerator.generateAllowedActions(targetTier, {
      allowHueChanges: options?.allowHueChanges ?? true,
      allowPaletteGeneration: true,
    });

    const forbiddenActions = this.constraintGenerator.generateForbiddenActions({
      forbidHueChanges: !(options?.allowHueChanges ?? true),
      forbidPaletteGeneration: false,
    });

    const instructions = this.constraintGenerator.generateInstructions(
      targetTier,
      targetLevel,
      perceptualConstraints,
      adjustmentBounds
    );

    const jsonSchema = this.generateJsonSchema(
      allowedActions,
      perceptualConstraints,
      adjustmentBounds
    );

    const contractId = this.generateContractId(`default-${Date.now()}`);
    const now = new Date().toISOString();
    const expiresAt = options?.expiresInHours
      ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;

    return {
      version: CONTRACT_VERSION,
      contractId,
      name: options?.name ?? 'Default AI Action Contract',
      description: options?.description ?? 'Default contract for AI color operations with WCAG AA / Silver tier compliance',
      generatedAt: now,
      expiresAt,
      allowedActions,
      forbiddenActions,
      targetAccessibilityTier: targetTier,
      targetWcagLevel: targetLevel,
      perceptualConstraints,
      adjustmentBounds,
      instructions,
      jsonSchema,
      metadata: this.generateMetadata(options?.tags),
    };
  }

  // ============================================
  // Prompt Generation
  // ============================================

  /**
   * Convert contract to LLM-ready prompt instructions
   */
  toPromptInstructions(
    contract: AIActionContract,
    options?: PromptGenerationOptions
  ): GeneratedPrompt {
    const format = options?.format ?? 'markdown';
    const includeExamples = options?.includeExamples ?? true;
    const includeSchema = options?.includeSchema ?? false;
    const language = options?.language ?? 'en';

    let instructions = '';
    let schema = '';
    let examples = '';

    // Generate instructions based on format
    if (format === 'markdown') {
      instructions = this.generateMarkdownInstructions(contract, language);
    } else if (format === 'structured') {
      instructions = this.generateStructuredInstructions(contract, language);
    } else {
      instructions = this.generatePlainInstructions(contract, language);
    }

    // Add examples if requested
    if (includeExamples) {
      examples = this.generateExamplesSection(contract, format, language);
    }

    // Add schema if requested
    if (includeSchema) {
      schema = JSON.stringify(contract.jsonSchema, null, 2);
    }

    // Combine into full prompt
    const parts = [instructions];
    if (examples) parts.push(examples);
    if (schema) parts.push(`## JSON Schema\n\`\`\`json\n${schema}\n\`\`\``);

    const fullPrompt = parts.join('\n\n');

    // Estimate token count (rough approximation: ~4 chars per token)
    const tokenEstimate = Math.ceil(fullPrompt.length / 4);

    return {
      instructions,
      schema: schema || undefined,
      examples: examples || undefined,
      fullPrompt,
      tokenEstimate,
    };
  }

  /**
   * Convert contract to system prompt for LLM
   */
  toSystemPrompt(contract: AIActionContract): string {
    const { fullPrompt } = this.toPromptInstructions(contract, {
      format: 'markdown',
      includeExamples: true,
      includeSchema: false,
    });

    return `You are a color accessibility assistant. Your role is to help users create accessible color combinations that meet accessibility standards.

${fullPrompt}

Always prioritize accessibility over aesthetics. When in doubt, choose higher contrast values.`;
  }

  // ============================================
  // Action Validation
  // ============================================

  /**
   * Validate an agent action against a contract
   */
  validateAgentAction(
    action: unknown,
    contract: AIActionContract
  ): ActionValidationResult {
    const violations: ActionViolation[] = [];
    const warnings: string[] = [];

    // Check if action is valid object
    if (typeof action !== 'object' || action === null) {
      violations.push({
        constraintType: 'forbidden',
        property: 'action',
        actualValue: action,
        message: 'Action must be an object',
        severity: 'error',
      });

      return {
        valid: false,
        action: action as AIAction,
        contract: contract.contractId,
        violations,
        warnings,
      };
    }

    const actionObj = action as Record<string, unknown>;
    const actionType = actionObj['type'] as string;

    // Check if action type is allowed
    const isAllowed = contract.allowedActions.some(a => a.type === actionType);
    const isForbidden = contract.forbiddenActions.some(a => a.type === actionType);

    if (isForbidden) {
      violations.push({
        constraintType: 'forbidden',
        property: 'type',
        actualValue: actionType,
        message: `Action type "${actionType}" is forbidden by this contract`,
        severity: 'error',
      });
    } else if (!isAllowed) {
      warnings.push(`Action type "${actionType}" is not in the allowed actions list`);
    }

    // Validate parameters against bounds
    this.validateActionParameters(actionObj, contract, violations, warnings);

    // Check perceptual constraints
    this.validatePerceptualConstraints(actionObj, contract, violations, warnings);

    return {
      valid: violations.length === 0,
      action: action as AIAction,
      contract: contract.contractId,
      violations,
      warnings,
    };
  }

  /**
   * Validate multiple actions
   */
  validateBatch(
    actions: ReadonlyArray<unknown>,
    contract: AIActionContract
  ): ReadonlyArray<ActionValidationResult> {
    return actions.map(action => this.validateAgentAction(action, contract));
  }

  // ============================================
  // Private Helpers
  // ============================================

  private generateContractId(seed: string): ContractId {
    const hash = this.simpleHash(seed + Date.now().toString());
    return `contract-${hash}` as ContractId;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateMetadata(tags?: ReadonlyArray<string>): ContractMetadata {
    return {
      generator: GENERATOR_NAME,
      generatorVersion: GENERATOR_VERSION,
      colorSpaces: ['oklch', 'hct', 'srgb'],
      accessibilityStandards: ['wcag21', 'wcag30', 'apca'],
      tags: tags ?? [],
    };
  }

  private extractTierFromPolicy(policy: PerceptualPolicy): WCAG3Tier {
    // Extract tier from policy rules or tags
    const tierTags = policy.tags.filter(t =>
      ['bronze', 'silver', 'gold', 'platinum'].includes(t.toLowerCase())
    );
    const firstTierTag = tierTags[0];
    if (firstTierTag !== undefined) {
      // Capitalize first letter for WCAG3Tier format
      const tier = firstTierTag.toLowerCase();
      return (tier.charAt(0).toUpperCase() + tier.slice(1)) as WCAG3Tier;
    }
    // Default based on enforcement level
    switch (policy.enforcement) {
      case 'strict': return 'Gold';
      case 'advisory': return 'Silver';
      case 'monitoring': return 'Bronze';
      default: return 'Silver';
    }
  }

  private extractLevelFromPolicy(policy: PerceptualPolicy): WCAGLevel {
    // Extract level from policy rules or tags
    // Valid WCAGLevel values: 'Fail' | 'AA' | 'AAA' | 'Enhanced'
    const levelTags = policy.tags.filter(t => {
      const lower = t.toLowerCase();
      return ['aaa', 'aa', 'enhanced', 'fail'].includes(lower);
    });
    const firstLevelTag = levelTags[0];
    if (firstLevelTag !== undefined) {
      const tag = firstLevelTag.toLowerCase();
      // Map to proper WCAGLevel format
      if (tag === 'aaa') return 'AAA';
      if (tag === 'aa') return 'AA';
      if (tag === 'enhanced') return 'Enhanced';
      return 'Fail';
    }
    // Default based on enforcement level
    switch (policy.enforcement) {
      case 'strict': return 'AAA';
      case 'advisory': return 'AA';
      case 'monitoring': return 'Fail';
      default: return 'AA';
    }
  }

  private generateJsonSchema(
    allowedActions: ReadonlyArray<AIAction>,
    constraints: PerceptualConstraints,
    bounds: AdjustmentBounds
  ): JSONSchemaObject {
    const actionSchemas: Record<string, JSONSchemaProperty> = {};

    for (const action of allowedActions) {
      const properties: Record<string, JSONSchemaProperty> = {};
      const required: string[] = [];

      if (action.parameters) {
        for (const param of action.parameters) {
          properties[param.name] = {
            type: param.type === 'color' ? 'string' : param.type,
            description: param.description,
            ...(param.validation?.min !== undefined && { minimum: param.validation.min }),
            ...(param.validation?.max !== undefined && { maximum: param.validation.max }),
            ...(param.validation?.pattern && { pattern: param.validation.pattern }),
            ...(param.validation?.enum && { enum: [...param.validation.enum] }),
            ...(param.default !== undefined && { default: param.default }),
          };

          if (param.required) {
            required.push(param.name);
          }
        }
      }

      actionSchemas[action.type] = {
        type: 'object',
        description: action.description,
        properties,
        required,
      };
    }

    return {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: 'https://color-intelligence.dev/schemas/ai-action-contract.json',
      type: 'object',
      title: 'AI Action Contract Schema',
      description: 'Schema for validating AI agent color manipulation actions',
      properties: {
        type: {
          type: 'string',
          description: 'The type of action to perform',
          enum: allowedActions.map(a => a.type),
        },
        parameters: {
          type: 'object',
          description: 'Action-specific parameters',
        },
      },
      required: ['type'],
      definitions: actionSchemas,
    };
  }

  private generateMarkdownInstructions(
    contract: AIActionContract,
    language: string
  ): string {
    const lines: string[] = [];

    lines.push(`# ${contract.name}`);
    lines.push('');
    lines.push(contract.description);
    lines.push('');

    // Target accessibility
    lines.push('## Target Accessibility');
    lines.push(`- **WCAG 3.0 Tier**: ${contract.targetAccessibilityTier.toUpperCase()}`);
    lines.push(`- **WCAG 2.1 Level**: ${contract.targetWcagLevel}`);
    lines.push('');

    // Instructions
    lines.push('## Instructions');
    for (const instruction of contract.instructions) {
      lines.push(`- ${instruction}`);
    }
    lines.push('');

    // Allowed actions
    lines.push('## Allowed Actions');
    for (const action of contract.allowedActions) {
      lines.push(`### ${action.type}`);
      lines.push(action.description);
      if (action.parameters && action.parameters.length > 0) {
        lines.push('**Parameters:**');
        for (const param of action.parameters) {
          const required = param.required ? '(required)' : '(optional)';
          lines.push(`- \`${param.name}\` ${required}: ${param.description}`);
        }
      }
      lines.push('');
    }

    // Forbidden actions
    lines.push('## Forbidden Actions');
    for (const action of contract.forbiddenActions) {
      lines.push(`- **${action.type}**: ${action.description}`);
    }
    lines.push('');

    // Perceptual constraints
    lines.push('## Perceptual Constraints');
    const pc = contract.perceptualConstraints;
    lines.push(`- Preserve hue: ${pc.preserveHue ? 'Yes' : 'No'} (tolerance: ${pc.hueToleranceDegrees}°)`);
    lines.push(`- Preserve chroma: ${pc.preserveChroma ? 'Yes' : 'No'} (tolerance: ${pc.chromaTolerancePercent}%)`);
    lines.push(`- Minimum lightness contrast: ${pc.minLightnessContrast}`);
    lines.push(`- Maximum tone shift: ${pc.maxToneShift}`);
    lines.push(`- Stay in gamut: ${pc.stayInGamut ? 'Yes' : 'No'}`);
    lines.push('');

    // Adjustment bounds
    lines.push('## Adjustment Bounds');
    const ab = contract.adjustmentBounds;
    lines.push(`- Tone: ${ab.tone.min} to ${ab.tone.max} (step: ${ab.tone.step})`);
    lines.push(`- Chroma: ${ab.chroma.min} to ${ab.chroma.max} (step: ${ab.chroma.step})`);
    lines.push(`- Lightness: ${ab.lightness.min} to ${ab.lightness.max} (step: ${ab.lightness.step})`);
    if (ab.hue) {
      lines.push(`- Hue: ${ab.hue.min}° to ${ab.hue.max}° (step: ${ab.hue.step}°)`);
    } else {
      lines.push('- Hue: Changes not allowed');
    }
    lines.push(`- APCA Lc: ${ab.apcaLc.min} to ${ab.apcaLc.max} (step: ${ab.apcaLc.step})`);
    lines.push(`- Contrast ratio: ${ab.contrastRatio.min}:1 to ${ab.contrastRatio.max}:1`);

    return lines.join('\n');
  }

  private generateStructuredInstructions(
    contract: AIActionContract,
    language: string
  ): string {
    const structure = {
      contract: {
        name: contract.name,
        description: contract.description,
        version: contract.version,
      },
      accessibility: {
        wcag3Tier: contract.targetAccessibilityTier,
        wcagLevel: contract.targetWcagLevel,
      },
      instructions: contract.instructions,
      allowedActions: contract.allowedActions.map(a => ({
        type: a.type,
        description: a.description,
        parameters: a.parameters,
      })),
      forbiddenActions: contract.forbiddenActions.map(a => ({
        type: a.type,
        description: a.description,
      })),
      constraints: contract.perceptualConstraints,
      bounds: contract.adjustmentBounds,
    };

    return JSON.stringify(structure, null, 2);
  }

  private generatePlainInstructions(
    contract: AIActionContract,
    language: string
  ): string {
    const lines: string[] = [];

    lines.push(`CONTRACT: ${contract.name}`);
    lines.push(contract.description);
    lines.push('');
    lines.push(`Target: WCAG 3.0 ${contract.targetAccessibilityTier.toUpperCase()}, WCAG 2.1 ${contract.targetWcagLevel}`);
    lines.push('');
    lines.push('INSTRUCTIONS:');
    contract.instructions.forEach((i, idx) => {
      lines.push(`${idx + 1}. ${i}`);
    });
    lines.push('');
    lines.push('ALLOWED:');
    contract.allowedActions.forEach(a => {
      lines.push(`- ${a.type}: ${a.description}`);
    });
    lines.push('');
    lines.push('FORBIDDEN:');
    contract.forbiddenActions.forEach(a => {
      lines.push(`- ${a.type}: ${a.description}`);
    });

    return lines.join('\n');
  }

  private generateExamplesSection(
    contract: AIActionContract,
    format: string,
    language: string
  ): string {
    const examples: string[] = [];

    if (format === 'markdown') {
      examples.push('## Examples');
      examples.push('');
    } else {
      examples.push('EXAMPLES:');
      examples.push('');
    }

    for (const action of contract.allowedActions) {
      if (action.examples && action.examples.length > 0) {
        for (const example of action.examples) {
          if (format === 'markdown') {
            examples.push(`### ${example.description}`);
            examples.push('```json');
            examples.push(JSON.stringify({ type: action.type, ...example.input }, null, 2));
            examples.push('```');
            if (example.explanation) {
              examples.push(`> ${example.explanation}`);
            }
            examples.push('');
          } else {
            examples.push(`${example.description}:`);
            examples.push(JSON.stringify({ type: action.type, ...example.input }));
            examples.push('');
          }
        }
      }
    }

    return examples.join('\n');
  }

  private validateActionParameters(
    action: Record<string, unknown>,
    contract: AIActionContract,
    violations: ActionViolation[],
    _warnings: string[]
  ): void {
    const bounds = contract.adjustmentBounds;
    const params = action['parameters'] as Record<string, unknown> | undefined;

    if (!params) return;

    // Extract parameter values with bracket notation (TS4111 compliance)
    const toneValue = params['tone'];
    const chromaValue = params['chroma'];
    const lightnessValue = params['lightness'];
    const hueValue = params['hue'];
    const contrastRatioValue = params['contrastRatio'];
    const apcaLcValue = params['apcaLc'];

    // Check tone bounds
    if (typeof toneValue === 'number') {
      if (toneValue < bounds.tone.min || toneValue > bounds.tone.max) {
        violations.push({
          constraintType: 'bound',
          property: 'tone',
          expectedRange: `${bounds.tone.min} to ${bounds.tone.max}`,
          actualValue: toneValue,
          message: `Tone value ${toneValue} is outside allowed range`,
          severity: 'error',
        });
      }
    }

    // Check chroma bounds
    if (typeof chromaValue === 'number') {
      if (chromaValue < bounds.chroma.min || chromaValue > bounds.chroma.max) {
        violations.push({
          constraintType: 'bound',
          property: 'chroma',
          expectedRange: `${bounds.chroma.min} to ${bounds.chroma.max}`,
          actualValue: chromaValue,
          message: `Chroma value ${chromaValue} is outside allowed range`,
          severity: 'error',
        });
      }
    }

    // Check lightness bounds
    if (typeof lightnessValue === 'number') {
      if (lightnessValue < bounds.lightness.min || lightnessValue > bounds.lightness.max) {
        violations.push({
          constraintType: 'bound',
          property: 'lightness',
          expectedRange: `${bounds.lightness.min} to ${bounds.lightness.max}`,
          actualValue: lightnessValue,
          message: `Lightness value ${lightnessValue} is outside allowed range`,
          severity: 'error',
        });
      }
    }

    // Check hue bounds (if allowed)
    if (typeof hueValue === 'number') {
      if (!bounds.hue) {
        violations.push({
          constraintType: 'forbidden',
          property: 'hue',
          actualValue: hueValue,
          message: 'Hue changes are not allowed by this contract',
          severity: 'error',
        });
      } else if (hueValue < bounds.hue.min || hueValue > bounds.hue.max) {
        violations.push({
          constraintType: 'bound',
          property: 'hue',
          expectedRange: `${bounds.hue.min} to ${bounds.hue.max}`,
          actualValue: hueValue,
          message: `Hue value ${hueValue} is outside allowed range`,
          severity: 'error',
        });
      }
    }

    // Check contrast ratio
    if (typeof contrastRatioValue === 'number') {
      if (contrastRatioValue < bounds.contrastRatio.min) {
        violations.push({
          constraintType: 'accessibility',
          property: 'contrastRatio',
          expectedRange: `>= ${bounds.contrastRatio.min}`,
          actualValue: contrastRatioValue,
          message: `Contrast ratio ${contrastRatioValue} does not meet minimum requirement`,
          severity: 'error',
        });
      }
    }

    // Check APCA Lc
    if (typeof apcaLcValue === 'number') {
      if (Math.abs(apcaLcValue) < bounds.apcaLc.min) {
        violations.push({
          constraintType: 'accessibility',
          property: 'apcaLc',
          expectedRange: `|Lc| >= ${bounds.apcaLc.min}`,
          actualValue: apcaLcValue,
          message: `APCA Lc value ${apcaLcValue} does not meet minimum requirement`,
          severity: 'error',
        });
      }
    }
  }

  private validatePerceptualConstraints(
    action: Record<string, unknown>,
    contract: AIActionContract,
    violations: ActionViolation[],
    warnings: string[]
  ): void {
    const constraints = contract.perceptualConstraints;
    const params = action['parameters'] as Record<string, unknown> | undefined;

    if (!params) return;

    // Extract parameter values with bracket notation (TS4111 compliance)
    const hueShiftValue = params['hueShift'];
    const chromaChangeValue = params['chromaChange'];
    const modifiedColorsValue = params['modifiedColors'];

    // Check hue preservation
    if (constraints.preserveHue && typeof hueShiftValue === 'number') {
      if (Math.abs(hueShiftValue) > constraints.hueToleranceDegrees) {
        violations.push({
          constraintType: 'perceptual',
          property: 'hueShift',
          expectedRange: `±${constraints.hueToleranceDegrees}°`,
          actualValue: hueShiftValue,
          message: `Hue shift of ${hueShiftValue}° exceeds tolerance`,
          severity: 'error',
        });
      }
    }

    // Check chroma preservation
    if (constraints.preserveChroma && typeof chromaChangeValue === 'number') {
      if (Math.abs(chromaChangeValue) > constraints.chromaTolerancePercent) {
        violations.push({
          constraintType: 'perceptual',
          property: 'chromaChange',
          expectedRange: `±${constraints.chromaTolerancePercent}%`,
          actualValue: chromaChangeValue,
          message: `Chroma change of ${chromaChangeValue}% exceeds tolerance`,
          severity: 'error',
        });
      }
    }

    // Check protected colors
    if (constraints.protectedColors && Array.isArray(modifiedColorsValue)) {
      for (const protectedColor of constraints.protectedColors) {
        const modified = (modifiedColorsValue as string[]).includes(protectedColor.hex);
        if (modified) {
          warnings.push(
            `Protected color ${protectedColor.name} (${protectedColor.hex}) was modified. ` +
            `Reason for protection: ${protectedColor.reason}`
          );
        }
      }
    }
  }
}

// ============================================
// Type for GovernedDecision (simplified)
// ============================================

interface GovernedDecisionLike {
  readonly wcag3Tier?: WCAG3Tier;
  readonly wcagLevel?: WCAGLevel;
  readonly foregroundColor?: string;
  readonly backgroundColor?: string;
  readonly contrastRatio?: number;
  readonly apcaLc?: number;
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new contract generator
 */
export function createContractGenerator(): AIActionContractGenerator {
  return new AIActionContractGenerator();
}

/**
 * Generate a contract from policy (convenience function)
 */
export function generateContractFromPolicy(
  policy: PerceptualPolicy,
  options?: ContractGenerationOptions
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateFromPolicy(policy, options);
}

/**
 * Generate a default contract (convenience function)
 */
export function generateDefaultContract(
  options?: ContractGenerationOptions
): AIActionContract {
  const generator = new AIActionContractGenerator();
  return generator.generateDefault(options);
}

/**
 * Validate an action against a contract (convenience function)
 */
export function validateAction(
  action: unknown,
  contract: AIActionContract
): ActionValidationResult {
  const generator = new AIActionContractGenerator();
  return generator.validateAgentAction(action, contract);
}
