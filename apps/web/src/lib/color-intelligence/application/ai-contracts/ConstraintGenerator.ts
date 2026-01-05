// ============================================
// Constraint Generator
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Generates perceptual constraints and adjustment bounds
// from governance policies and accessibility requirements.
//
// ============================================

import type { WCAGLevel, WCAG3Tier } from '../../domain/governance/types/policy';
import type {
  PerceptualConstraints,
  AdjustmentBounds,
  NumericBounds,
  ProtectedColor,
  AIAction,
  AIActionType,
  ActionParameter,
  ActionConstraints,
  ActionExample,
} from './types';

// ============================================
// Constants
// ============================================

/**
 * APCA Lc thresholds for different WCAG 3.0 tiers
 * Keys use lowercase for consistency with WCAG3Tier type normalization
 */
const APCA_THRESHOLDS: Record<string, number> = {
  fail: 0,
  bronze: 45,
  silver: 60,
  gold: 75,
  platinum: 90,
} as const;

/**
 * WCAG 2.x contrast ratio thresholds
 * Keys use lowercase for consistency with WCAGLevel type normalization
 */
const WCAG_CONTRAST_THRESHOLDS: Record<string, { normal: number; large: number }> = {
  fail: { normal: 1.0, large: 1.0 },
  a: { normal: 3.0, large: 2.0 },
  aa: { normal: 4.5, large: 3.0 },
  aaa: { normal: 7.0, large: 4.5 },
  enhanced: { normal: 7.0, large: 4.5 },
} as const;

/**
 * Normalize tier to lowercase for lookup
 */
function normalizeTier(tier: WCAG3Tier): string {
  return tier.toLowerCase();
}

/**
 * Normalize WCAG level to lowercase for lookup
 */
function normalizeLevel(level: WCAGLevel): string {
  return level.toLowerCase();
}

/**
 * Default adjustment bounds
 */
const DEFAULT_BOUNDS: AdjustmentBounds = {
  tone: { min: 0, max: 100, step: 1, unit: 'T' },
  chroma: { min: 0, max: 150, step: 1 },
  lightness: { min: 0, max: 100, step: 0.5, unit: '%' },
  hue: { min: 0, max: 360, step: 1, unit: '°' },
  apcaLc: { min: -108, max: 106, step: 1, unit: 'Lc' },
  contrastRatio: { min: 1, max: 21, step: 0.1, unit: ':1' },
  fontSize: { min: 12, max: 72, step: 1, unit: 'px' },
  alpha: { min: 0, max: 1, step: 0.01 },
};

// ============================================
// Constraint Generator Class
// ============================================

/**
 * Generates constraints for AI action contracts
 */
export class ConstraintGenerator {
  /**
   * Generate perceptual constraints based on target tier
   */
  generatePerceptualConstraints(
    targetTier: WCAG3Tier,
    options?: {
      strictMode?: boolean;
      allowHueChanges?: boolean;
      protectedColors?: ReadonlyArray<ProtectedColor>;
    }
  ): PerceptualConstraints {
    const strict = options?.strictMode ?? false;
    const allowHue = options?.allowHueChanges ?? true;

    // Base tolerances vary by tier
    const tolerances = this.getTolerancesForTier(targetTier, strict);

    return {
      // Hue preservation
      preserveHue: !allowHue,
      hueToleranceDegrees: allowHue ? tolerances.hueTolerance : 0,

      // Chroma preservation
      preserveChroma: strict,
      chromaTolerancePercent: tolerances.chromaTolerance,

      // Lightness/tone constraints
      minLightnessContrast: this.getMinContrastForTier(targetTier),
      maxToneShift: tolerances.maxToneShift,

      // Perceptual uniformity
      maintainPerceptualUniformity: true,
      uniformityTolerance: tolerances.uniformityTolerance,

      // Gamut constraints
      stayInGamut: true,
      gamutMappingMethod: strict ? 'preserve-lightness' : 'compress',

      // Protected colors
      protectedColors: options?.protectedColors,
    };
  }

  /**
   * Generate adjustment bounds based on target accessibility
   */
  generateAdjustmentBounds(
    targetTier: WCAG3Tier,
    targetLevel: WCAGLevel,
    options?: {
      customBounds?: Partial<AdjustmentBounds>;
      restrictHue?: boolean;
    }
  ): AdjustmentBounds {
    const minApcaLc = APCA_THRESHOLDS[normalizeTier(targetTier)] ?? 60;
    const wcagThreshold = WCAG_CONTRAST_THRESHOLDS[normalizeLevel(targetLevel)] ?? { normal: 4.5, large: 3.0 };

    const bounds: AdjustmentBounds = {
      tone: {
        min: 0,
        max: 100,
        step: this.getStepForTier(targetTier, 'tone'),
        unit: 'T',
      },
      chroma: {
        min: 0,
        max: this.getMaxChromaForTier(targetTier),
        step: this.getStepForTier(targetTier, 'chroma'),
      },
      lightness: {
        min: 0,
        max: 100,
        step: this.getStepForTier(targetTier, 'lightness'),
        unit: '%',
      },
      hue: options?.restrictHue
        ? null
        : {
            min: 0,
            max: 360,
            step: this.getStepForTier(targetTier, 'hue'),
            unit: '°',
          },
      apcaLc: {
        min: minApcaLc,
        max: 106, // Max APCA Lc
        step: 1,
        unit: 'Lc',
      },
      contrastRatio: {
        min: wcagThreshold.normal,
        max: 21,
        step: 0.1,
        unit: ':1',
      },
      fontSize: {
        min: this.getMinFontSizeForTier(targetTier),
        max: 72,
        step: 1,
        unit: 'px',
      },
      alpha: {
        min: 1, // Require full opacity for accessibility
        max: 1,
        step: 0.01,
      },
    };

    // Apply custom overrides
    if (options?.customBounds) {
      return this.mergeAdjustmentBounds(bounds, options.customBounds);
    }

    return bounds;
  }

  /**
   * Generate allowed actions for a tier
   */
  generateAllowedActions(
    targetTier: WCAG3Tier,
    options?: {
      allowHueChanges?: boolean;
      allowPaletteGeneration?: boolean;
    }
  ): ReadonlyArray<AIAction> {
    const actions: AIAction[] = [];

    // Lightness adjustment (always allowed)
    actions.push(this.createLightnessAction(targetTier));

    // Chroma adjustment
    actions.push(this.createChromaAction(targetTier));

    // Tone adjustment
    actions.push(this.createToneAction(targetTier));

    // Hue adjustment (if allowed)
    if (options?.allowHueChanges !== false) {
      actions.push(this.createHueAction(targetTier));
    }

    // Variant creation
    actions.push(this.createVariantAction(targetTier));

    // Alternative suggestions
    actions.push(this.createSuggestionAction(targetTier));

    // Accessibility validation
    actions.push(this.createValidationAction(targetTier));

    // Contrast optimization
    actions.push(this.createOptimizeAction(targetTier));

    // Palette generation (if allowed)
    if (options?.allowPaletteGeneration !== false) {
      actions.push(this.createPaletteAction(targetTier));
    }

    return actions;
  }

  /**
   * Generate forbidden actions
   */
  generateForbiddenActions(
    options?: {
      forbidHueChanges?: boolean;
      forbidPaletteGeneration?: boolean;
      additionalForbidden?: ReadonlyArray<AIActionType>;
    }
  ): ReadonlyArray<AIAction> {
    const actions: AIAction[] = [];

    // Setting arbitrary colors without validation
    actions.push({
      type: 'set-color',
      description: 'Setting a color without accessibility validation is forbidden',
      constraints: {
        requiresAccessibilityCheck: true,
      },
    });

    if (options?.forbidHueChanges) {
      actions.push({
        type: 'adjust-hue',
        description: 'Hue changes are forbidden to preserve brand identity',
      });
    }

    if (options?.forbidPaletteGeneration) {
      actions.push({
        type: 'generate-palette',
        description: 'Palette generation is forbidden in this context',
      });
    }

    // Add any additional forbidden actions
    if (options?.additionalForbidden) {
      for (const type of options.additionalForbidden) {
        actions.push({
          type,
          description: `Action "${type}" is explicitly forbidden by policy`,
        });
      }
    }

    return actions;
  }

  /**
   * Generate human-readable instructions
   */
  generateInstructions(
    targetTier: WCAG3Tier,
    targetLevel: WCAGLevel,
    constraints: PerceptualConstraints,
    bounds: AdjustmentBounds
  ): ReadonlyArray<string> {
    const instructions: string[] = [];

    // Header instruction
    instructions.push(
      `You are adjusting colors to meet WCAG 3.0 ${targetTier.toUpperCase()} tier and WCAG 2.1 Level ${targetLevel.toUpperCase()} requirements.`
    );

    // APCA requirement
    const minApca = APCA_THRESHOLDS[normalizeTier(targetTier)] ?? 60;
    instructions.push(
      `All text must have a minimum APCA Lc value of ${minApca} for ${targetTier} tier compliance.`
    );

    // Contrast ratio requirement
    const wcagReq = WCAG_CONTRAST_THRESHOLDS[normalizeLevel(targetLevel)] ?? { normal: 4.5, large: 3.0 };
    instructions.push(
      `WCAG 2.1 requires a minimum contrast ratio of ${wcagReq.normal}:1 for normal text and ${wcagReq.large}:1 for large text.`
    );

    // Hue preservation
    if (constraints.preserveHue) {
      instructions.push(
        `Preserve the original hue. Do not shift hue beyond ${constraints.hueToleranceDegrees}°.`
      );
    } else if (constraints.hueToleranceDegrees < 360) {
      instructions.push(
        `Hue can be adjusted within ±${constraints.hueToleranceDegrees}° of the original.`
      );
    }

    // Chroma preservation
    if (constraints.preserveChroma) {
      instructions.push(
        `Maintain the original chroma level within ${constraints.chromaTolerancePercent}% tolerance.`
      );
    }

    // Gamut
    if (constraints.stayInGamut) {
      instructions.push(
        `All colors must be within the sRGB gamut. Use ${constraints.gamutMappingMethod} mapping for out-of-gamut colors.`
      );
    }

    // Protected colors
    if (constraints.protectedColors && constraints.protectedColors.length > 0) {
      instructions.push('The following brand colors are protected and should not be modified:');
      for (const color of constraints.protectedColors) {
        instructions.push(`  - ${color.name} (${color.hex}): ${color.reason}`);
      }
    }

    // Adjustment bounds
    if (bounds.hue === null) {
      instructions.push('Hue adjustments are not permitted.');
    }

    instructions.push(
      `Minimum font size for accessibility is ${bounds.fontSize.min}px.`
    );

    return instructions;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private getTolerancesForTier(
    tier: WCAG3Tier,
    strict: boolean
  ): {
    hueTolerance: number;
    chromaTolerance: number;
    maxToneShift: number;
    uniformityTolerance: number;
  } {
    const silverDefaults = { hueTolerance: 20, chromaTolerance: 15, maxToneShift: 25, uniformityTolerance: 8 };
    const baseTolerances: Record<string, { hueTolerance: number; chromaTolerance: number; maxToneShift: number; uniformityTolerance: number }> = {
      bronze: { hueTolerance: 30, chromaTolerance: 20, maxToneShift: 30, uniformityTolerance: 10 },
      silver: silverDefaults,
      gold: { hueTolerance: 15, chromaTolerance: 10, maxToneShift: 20, uniformityTolerance: 5 },
      platinum: { hueTolerance: 10, chromaTolerance: 5, maxToneShift: 15, uniformityTolerance: 3 },
    };

    const tolerances = baseTolerances[normalizeTier(tier)] ?? silverDefaults;

    // Reduce tolerances in strict mode
    if (strict) {
      return {
        hueTolerance: Math.floor(tolerances.hueTolerance * 0.5),
        chromaTolerance: Math.floor(tolerances.chromaTolerance * 0.5),
        maxToneShift: Math.floor(tolerances.maxToneShift * 0.5),
        uniformityTolerance: Math.floor(tolerances.uniformityTolerance * 0.5),
      };
    }

    return tolerances;
  }

  private getMinContrastForTier(tier: WCAG3Tier): number {
    return APCA_THRESHOLDS[normalizeTier(tier)] ?? 60;
  }

  private getStepForTier(tier: WCAG3Tier, property: 'tone' | 'chroma' | 'lightness' | 'hue'): number {
    // Higher tiers require finer adjustments
    const silverSteps = { tone: 3, chroma: 3, lightness: 1, hue: 3 };
    const steps: Record<string, { tone: number; chroma: number; lightness: number; hue: number }> = {
      fail: { tone: 10, chroma: 10, lightness: 5, hue: 10 },
      bronze: { tone: 5, chroma: 5, lightness: 2, hue: 5 },
      silver: silverSteps,
      gold: { tone: 2, chroma: 2, lightness: 0.5, hue: 2 },
      platinum: { tone: 1, chroma: 1, lightness: 0.25, hue: 1 },
    };
    const normalized = normalizeTier(tier);
    const tierSteps = steps[normalized] ?? silverSteps;
    return tierSteps[property];
  }

  private getMaxChromaForTier(tier: WCAG3Tier): number {
    // Higher tiers may restrict chroma for legibility
    const maxChroma: Record<string, number> = {
      bronze: 150,
      silver: 130,
      gold: 110,
      platinum: 100,
    };
    return maxChroma[normalizeTier(tier)] ?? 130;
  }

  private getMinFontSizeForTier(tier: WCAG3Tier): number {
    const minFontSize: Record<string, number> = {
      bronze: 12,
      silver: 14,
      gold: 14,
      platinum: 16,
    };
    return minFontSize[normalizeTier(tier)] ?? 14;
  }

  private mergeAdjustmentBounds(
    base: AdjustmentBounds,
    overrides: Partial<AdjustmentBounds>
  ): AdjustmentBounds {
    const merged = { ...base };

    for (const key of Object.keys(overrides) as Array<keyof AdjustmentBounds>) {
      if (overrides[key] !== undefined) {
        if (key === 'hue' && overrides.hue === null) {
          merged.hue = null;
        } else if (overrides[key]) {
          (merged as Record<string, unknown>)[key] = {
            ...base[key],
            ...overrides[key],
          };
        }
      }
    }

    return merged;
  }

  // ============================================
  // Action Creators
  // ============================================

  private createLightnessAction(tier: WCAG3Tier): AIAction {
    const step = this.getStepForTier(tier, 'lightness');
    return {
      type: 'adjust-lightness',
      description: 'Adjust the lightness (L* in OKLCH) of a color while maintaining perceptual uniformity',
      parameters: [
        {
          name: 'amount',
          type: 'number',
          description: 'Amount to adjust lightness (positive = lighter, negative = darker)',
          required: true,
          validation: { min: -100, max: 100, step },
        },
        {
          name: 'colorHex',
          type: 'color',
          description: 'The input color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
      ],
      constraints: {
        requiresAccessibilityCheck: true,
        maintainsContrast: true,
      },
      examples: [
        {
          description: 'Lighten a dark blue for better contrast',
          input: { colorHex: '#1a365d', amount: 15 },
          expectedOutput: { colorHex: '#2a5298', apcaLc: 65 },
          explanation: 'Increasing lightness improves contrast against dark backgrounds',
        },
      ],
    };
  }

  private createChromaAction(tier: WCAG3Tier): AIAction {
    const step = this.getStepForTier(tier, 'chroma');
    return {
      type: 'adjust-chroma',
      description: 'Adjust the chroma (colorfulness) while preserving hue and lightness',
      parameters: [
        {
          name: 'amount',
          type: 'number',
          description: 'Amount to adjust chroma (positive = more saturated, negative = less)',
          required: true,
          validation: { min: -150, max: 150, step },
        },
        {
          name: 'colorHex',
          type: 'color',
          description: 'The input color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
      ],
      constraints: {
        preservesHue: true,
        requiresAccessibilityCheck: true,
      },
    };
  }

  private createToneAction(tier: WCAG3Tier): AIAction {
    const step = this.getStepForTier(tier, 'tone');
    return {
      type: 'adjust-tone',
      description: 'Adjust the HCT tone value for Material Design 3 compatibility',
      parameters: [
        {
          name: 'targetTone',
          type: 'number',
          description: 'Target tone value (0-100)',
          required: true,
          validation: { min: 0, max: 100, step },
        },
        {
          name: 'colorHex',
          type: 'color',
          description: 'The input color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
      ],
      constraints: {
        preservesHue: true,
        preservesChroma: false,
        requiresAccessibilityCheck: true,
      },
    };
  }

  private createHueAction(tier: WCAG3Tier): AIAction {
    const step = this.getStepForTier(tier, 'hue');
    return {
      type: 'adjust-hue',
      description: 'Rotate the hue while preserving lightness and chroma',
      parameters: [
        {
          name: 'degrees',
          type: 'number',
          description: 'Degrees to rotate hue (positive = clockwise)',
          required: true,
          validation: { min: -180, max: 180, step },
        },
        {
          name: 'colorHex',
          type: 'color',
          description: 'The input color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
      ],
      constraints: {
        requiresAccessibilityCheck: true,
      },
    };
  }

  private createVariantAction(tier: WCAG3Tier): AIAction {
    return {
      type: 'create-variant',
      description: 'Create accessible color variants (lighter/darker versions)',
      parameters: [
        {
          name: 'colorHex',
          type: 'color',
          description: 'The base color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'variantType',
          type: 'string',
          description: 'Type of variant to create',
          required: true,
          validation: { enum: ['lighter', 'darker', 'muted', 'vibrant'] },
        },
        {
          name: 'steps',
          type: 'number',
          description: 'Number of variants to generate',
          required: false,
          default: 5,
          validation: { min: 1, max: 10 },
        },
      ],
      constraints: {
        preservesHue: true,
        requiresAccessibilityCheck: true,
        minContrastRatio: APCA_THRESHOLDS[normalizeTier(tier)] ?? 60,
      },
    };
  }

  private createSuggestionAction(tier: WCAG3Tier): AIAction {
    return {
      type: 'suggest-alternative',
      description: 'Suggest accessible alternative colors that meet contrast requirements',
      parameters: [
        {
          name: 'colorHex',
          type: 'color',
          description: 'The problematic color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'backgroundHex',
          type: 'color',
          description: 'The background color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'maxSuggestions',
          type: 'number',
          description: 'Maximum number of suggestions',
          required: false,
          default: 3,
          validation: { min: 1, max: 10 },
        },
      ],
      constraints: {
        requiresAccessibilityCheck: true,
        minContrastRatio: APCA_THRESHOLDS[normalizeTier(tier)] ?? 60,
      },
    };
  }

  private createValidationAction(tier: WCAG3Tier): AIAction {
    return {
      type: 'validate-accessibility',
      description: 'Validate a color pair for accessibility compliance',
      parameters: [
        {
          name: 'foregroundHex',
          type: 'color',
          description: 'The foreground (text) color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'backgroundHex',
          type: 'color',
          description: 'The background color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'fontSize',
          type: 'number',
          description: 'Font size in pixels',
          required: false,
          default: 16,
          validation: { min: 8, max: 72 },
        },
      ],
    };
  }

  private createOptimizeAction(tier: WCAG3Tier): AIAction {
    return {
      type: 'optimize-contrast',
      description: 'Optimize a color pair to meet minimum contrast requirements',
      parameters: [
        {
          name: 'foregroundHex',
          type: 'color',
          description: 'The foreground color to optimize',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'backgroundHex',
          type: 'color',
          description: 'The fixed background color',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'adjustBackground',
          type: 'boolean',
          description: 'Whether to adjust background instead of foreground',
          required: false,
          default: false,
        },
      ],
      constraints: {
        requiresAccessibilityCheck: true,
        minContrastRatio: APCA_THRESHOLDS[normalizeTier(tier)] ?? 60,
        maxIterations: 20,
      },
    };
  }

  private createPaletteAction(tier: WCAG3Tier): AIAction {
    return {
      type: 'generate-palette',
      description: 'Generate an accessible color palette from a seed color',
      parameters: [
        {
          name: 'seedHex',
          type: 'color',
          description: 'The seed color in hex format',
          required: true,
          validation: { format: 'hex' },
        },
        {
          name: 'paletteType',
          type: 'string',
          description: 'Type of palette to generate',
          required: false,
          default: 'complementary',
          validation: { enum: ['complementary', 'analogous', 'triadic', 'split-complementary', 'monochromatic'] },
        },
        {
          name: 'includeNeutrals',
          type: 'boolean',
          description: 'Include neutral tones in the palette',
          required: false,
          default: true,
        },
      ],
      constraints: {
        requiresAccessibilityCheck: true,
        minContrastRatio: APCA_THRESHOLDS[normalizeTier(tier)] ?? 60,
      },
    };
  }
}

/**
 * Factory function
 */
export function createConstraintGenerator(): ConstraintGenerator {
  return new ConstraintGenerator();
}
