// ============================================
// AI-Readable Contracts Service
// Generates machine-interpretable decisions for LLMs
// ============================================

import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import {
  ContrastDecision,
  AIReadableContract,
  LightingEnvironment,
  WCAGLevel,
  WCAG3Tier,
  DecisionFactor,
  ViewingConditions,
  ReadabilityContext,
  PerceptualScore,
  ConfidenceScore,
} from '../domain/types/decision';

// ============================================
// Extended Contract Types
// ============================================

/**
 * Semantic action types for recommendations
 */
export type SemanticAction =
  | 'increase-contrast'
  | 'decrease-contrast'
  | 'increase-font-size'
  | 'decrease-font-size'
  | 'increase-font-weight'
  | 'use-lighter-foreground'
  | 'use-darker-foreground'
  | 'use-lighter-background'
  | 'use-darker-background'
  | 'adjust-viewing-conditions'
  | 'accept-current'
  | 'escalate-to-human';

/**
 * Priority levels for actions
 */
export type ActionPriority = 'critical' | 'required' | 'recommended' | 'optional' | 'informational';

/**
 * Structured action recommendation
 */
export interface ActionRecommendation {
  readonly id: string;
  readonly type: SemanticAction;
  readonly priority: ActionPriority;
  readonly description: string;
  readonly reasoning: string;
  readonly suggestedValue?: string | number;
  readonly expectedImprovement?: {
    readonly scoreDelta: number;
    readonly newLevel: WCAGLevel;
  };
  readonly constraints?: ReadonlyArray<string>;
}

/**
 * Color context for AI interpretation
 */
export interface ColorContext {
  readonly hex: string;
  readonly oklch: {
    readonly lightness: number;
    readonly chroma: number;
    readonly hue: number;
  };
  readonly hct: {
    readonly hue: number;
    readonly chroma: number;
    readonly tone: number;
  };
  readonly semanticName: string;
  readonly isLight: boolean;
  readonly chromaLevel: 'achromatic' | 'muted' | 'moderate' | 'vivid';
}

/**
 * Extended AI contract with richer context
 */
export interface ExtendedAIContract extends AIReadableContract {
  /** Rich color context */
  readonly colorContext: {
    readonly foreground: ColorContext;
    readonly background: ColorContext;
    readonly polarity: 'dark-on-light' | 'light-on-dark';
  };

  /** Detailed factor breakdown */
  readonly factorAnalysis: ReadonlyArray<{
    readonly name: string;
    readonly contribution: number;
    readonly interpretation: string;
    readonly isOptimal: boolean;
  }>;

  /** Structured recommendations */
  readonly recommendations: ReadonlyArray<ActionRecommendation>;

  /** Compliance summary */
  readonly compliance: {
    readonly wcag21: {
      readonly normalText: boolean;
      readonly largeText: boolean;
      readonly uiComponents: boolean;
    };
    readonly wcag3: {
      readonly tier: WCAG3Tier;
      readonly continuousScore: number;
    };
    readonly apca: {
      readonly lc: number;
      readonly level: string;
      readonly minimumFontSize: number;
    };
  };

  /** Natural language summary at different verbosity levels */
  readonly summaries: {
    readonly brief: string;    // 1 sentence
    readonly standard: string; // 2-3 sentences
    readonly detailed: string; // Full paragraph
    readonly technical: string; // With all metrics
  };

  /** JSON-LD structured data for semantic web */
  readonly jsonLd: object;
}

/**
 * Contract generation options
 */
export interface ContractGenerationOptions {
  /** Include color context analysis */
  readonly includeColorContext?: boolean;

  /** Include factor analysis */
  readonly includeFactorAnalysis?: boolean;

  /** Include recommendations */
  readonly includeRecommendations?: boolean;

  /** Include compliance summary */
  readonly includeCompliance?: boolean;

  /** Include natural language summaries */
  readonly includeSummaries?: boolean;

  /** Include JSON-LD structured data */
  readonly includeJsonLd?: boolean;

  /** Language for text generation */
  readonly language?: 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';
}

// ============================================
// AI-Readable Contracts Service
// ============================================

/**
 * Service for generating AI/LLM-interpretable contracts
 * from color contrast decisions.
 *
 * These contracts are designed to be:
 * 1. Deterministic - same input always produces same output
 * 2. Explainable - every decision has reasoning
 * 3. Actionable - includes concrete recommendations
 * 4. Versioned - for reproducibility
 * 5. Schema-compliant - parseable by any JSON consumer
 */
export class AIReadableContractsService {
  private static readonly VERSION = '1.1.0';
  private static idCounter = 0;

  /**
   * Generate a basic AI-readable contract
   */
  generateContract(
    decision: ContrastDecision,
    id?: string
  ): AIReadableContract {
    const contractId = id ?? this.generateId();

    return {
      version: '1.0.0',
      type: 'contrast-decision',
      id: contractId,
      input: this.extractInput(decision),
      output: this.extractOutput(decision),
      computation: this.extractComputation(decision),
      explanation: this.generateExplanation(decision),
      actions: this.generateActions(decision),
    };
  }

  /**
   * Generate an extended contract with rich context
   */
  generateExtendedContract(
    decision: ContrastDecision,
    options: ContractGenerationOptions = {}
  ): ExtendedAIContract {
    const base = this.generateContract(decision);
    const foregroundOklch = OKLCH.fromHex(decision.colors.foreground)!;
    const backgroundOklch = OKLCH.fromHex(decision.colors.background)!;

    const extended: ExtendedAIContract = {
      ...base,
      colorContext: options.includeColorContext !== false
        ? this.analyzeColorContext(foregroundOklch, backgroundOklch)
        : {
            foreground: this.createMinimalColorContext(foregroundOklch),
            background: this.createMinimalColorContext(backgroundOklch),
            polarity: foregroundOklch.l < backgroundOklch.l ? 'dark-on-light' : 'light-on-dark',
          },
      factorAnalysis: options.includeFactorAnalysis !== false
        ? this.analyzeFactors(decision.factors)
        : [],
      recommendations: options.includeRecommendations !== false
        ? this.generateRecommendations(decision)
        : [],
      compliance: options.includeCompliance !== false
        ? this.extractCompliance(decision)
        : this.createMinimalCompliance(decision),
      summaries: options.includeSummaries !== false
        ? this.generateSummaries(decision, options.language ?? 'en')
        : this.createMinimalSummaries(decision),
      jsonLd: options.includeJsonLd !== false
        ? this.generateJsonLd(decision)
        : {},
    };

    return extended;
  }

  /**
   * Validate a contract against the schema
   */
  validateContract(contract: AIReadableContract): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Version check
    if (!contract.version || !contract.version.match(/^\d+\.\d+\.\d+$/)) {
      errors.push('Invalid version format. Expected semver.');
    }

    // Type check
    if (contract.type !== 'contrast-decision') {
      errors.push(`Unknown contract type: ${contract.type}`);
    }

    // ID check
    if (!contract.id || contract.id.length < 8) {
      warnings.push('Contract ID should be at least 8 characters for uniqueness.');
    }

    // Input validation
    if (!this.isValidHexColor(contract.input.foregroundColor)) {
      errors.push('Invalid foreground color format.');
    }
    if (!this.isValidHexColor(contract.input.backgroundColor)) {
      errors.push('Invalid background color format.');
    }
    if (contract.input.fontSizePx < 1 || contract.input.fontSizePx > 1000) {
      errors.push('Font size out of valid range (1-1000).');
    }
    if (![100, 200, 300, 400, 500, 600, 700, 800, 900].includes(contract.input.fontWeight)) {
      warnings.push('Non-standard font weight. Expected 100-900 in steps of 100.');
    }

    // Output validation
    if (contract.output.score < 0 || contract.output.score > 100) {
      errors.push('Score must be 0-100.');
    }
    if (contract.output.confidence < 0 || contract.output.confidence > 1) {
      errors.push('Confidence must be 0-1.');
    }
    if (!['Fail', 'AA', 'AAA', 'Enhanced'].includes(contract.output.level)) {
      errors.push('Invalid WCAG level.');
    }

    // Computation validation
    if (contract.computation.apcaLc < -108 || contract.computation.apcaLc > 108) {
      errors.push('APCA Lc out of valid range (-108 to 108).');
    }
    if (contract.computation.wcag21Ratio < 1) {
      errors.push('WCAG 2.1 ratio must be at least 1:1.');
    }

    // Actions validation
    for (const action of contract.actions) {
      if (!['required', 'recommended', 'optional'].includes(action.priority)) {
        warnings.push(`Unknown action priority: ${action.priority}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Serialize contract for transmission
   */
  serialize(contract: AIReadableContract | ExtendedAIContract): string {
    return JSON.stringify(contract, null, 2);
  }

  /**
   * Deserialize and validate contract
   */
  deserialize(json: string): {
    contract: AIReadableContract | null;
    validation: ReturnType<AIReadableContractsService['validateContract']>;
  } {
    try {
      const parsed = JSON.parse(json);
      const validation = this.validateContract(parsed);
      return {
        contract: validation.valid ? parsed : null,
        validation,
      };
    } catch {
      return {
        contract: null,
        validation: {
          valid: false,
          errors: ['Invalid JSON'],
          warnings: [],
        },
      };
    }
  }

  /**
   * Compare two contracts for equivalence
   */
  compareContracts(
    a: AIReadableContract,
    b: AIReadableContract
  ): {
    equivalent: boolean;
    differences: string[];
  } {
    const differences: string[] = [];

    // Compare inputs
    if (a.input.foregroundColor !== b.input.foregroundColor) {
      differences.push(`Foreground color: ${a.input.foregroundColor} vs ${b.input.foregroundColor}`);
    }
    if (a.input.backgroundColor !== b.input.backgroundColor) {
      differences.push(`Background color: ${a.input.backgroundColor} vs ${b.input.backgroundColor}`);
    }
    if (a.input.fontSizePx !== b.input.fontSizePx) {
      differences.push(`Font size: ${a.input.fontSizePx}px vs ${b.input.fontSizePx}px`);
    }
    if (a.input.fontWeight !== b.input.fontWeight) {
      differences.push(`Font weight: ${a.input.fontWeight} vs ${b.input.fontWeight}`);
    }

    // Compare outputs
    if (a.output.level !== b.output.level) {
      differences.push(`WCAG level: ${a.output.level} vs ${b.output.level}`);
    }
    if (Math.abs(a.output.score - b.output.score) > 0.1) {
      differences.push(`Score: ${a.output.score} vs ${b.output.score}`);
    }

    return {
      equivalent: differences.length === 0,
      differences,
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (AIReadableContractsService.idCounter++).toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `cd-${timestamp}-${counter}-${random}`;
  }

  private extractInput(decision: ContrastDecision): AIReadableContract['input'] {
    const ambient = decision.viewingConditions.ambientLuminance as number;
    let environment: LightingEnvironment = 'average';
    if (ambient < 20) environment = 'dark-room';
    else if (ambient < 80) environment = 'dim';
    else if (ambient < 250) environment = 'average';
    else if (ambient < 1000) environment = 'bright';
    else environment = 'outdoor';

    return {
      foregroundColor: decision.colors.foreground,
      backgroundColor: decision.colors.background,
      fontSizePx: decision.readabilityContext.fontSize as number,
      fontWeight: decision.readabilityContext.fontWeight as number,
      environment,
    };
  }

  private extractOutput(decision: ContrastDecision): AIReadableContract['output'] {
    return {
      passesAccessibility: decision.level !== 'fail',
      level: decision.wcagLevel,
      score: decision.score as number,
      confidence: decision.confidence as number,
    };
  }

  private extractComputation(decision: ContrastDecision): AIReadableContract['computation'] {
    const fontSizeFactor = decision.factors.find(f => f.id === 'font-size');
    const fontWeightFactor = decision.factors.find(f => f.id === 'font-weight');
    const envFactor = decision.factors.find(f => f.id === 'environment');

    return {
      apcaLc: decision.apcaLc,
      wcag21Ratio: decision.wcag21Ratio,
      fontSizeModifier: fontSizeFactor?.normalizedValue ?? 1,
      fontWeightModifier: fontWeightFactor?.normalizedValue ?? 1,
      environmentModifier: envFactor?.normalizedValue ?? 1,
      finalScore: decision.score as number,
    };
  }

  private generateExplanation(decision: ContrastDecision): string {
    const parts: string[] = [];

    // Opening statement
    if (decision.level === 'fail') {
      parts.push(`This color combination fails accessibility requirements.`);
    } else if (decision.level === 'enhanced') {
      parts.push(`This color combination exceeds accessibility requirements.`);
    } else {
      parts.push(`This color combination meets ${decision.wcagLevel} accessibility requirements.`);
    }

    // Add key reasoning
    const topFactors = [...decision.factors]
      .sort((a, b) => Math.abs(b.impact === 'positive' ? b.normalizedValue : -b.normalizedValue) -
                      Math.abs(a.impact === 'positive' ? a.normalizedValue : -a.normalizedValue))
      .slice(0, 2);

    for (const factor of topFactors) {
      parts.push(factor.explanation);
    }

    return parts.join(' ');
  }

  private generateActions(decision: ContrastDecision): AIReadableContract['actions'] {
    const actions: AIReadableContract['actions'] = [];

    if (decision.level === 'fail') {
      actions.push({
        type: 'adjust-foreground',
        priority: 'required',
        description: 'Increase contrast by adjusting foreground color',
      });

      if ((decision.readabilityContext.fontSize as number) < 16) {
        actions.push({
          type: 'increase-font-size',
          priority: 'recommended',
          description: 'Increase font size to improve legibility',
          suggestedValue: 16,
        });
      }
    } else if (decision.level === 'minimum') {
      actions.push({
        type: 'increase-font-weight',
        priority: 'recommended',
        description: 'Consider increasing font weight for better readability',
        suggestedValue: 500,
      });
    } else {
      actions.push({
        type: 'accept',
        priority: 'optional',
        description: 'Current combination meets or exceeds requirements',
      });
    }

    return actions;
  }

  private analyzeColorContext(
    foreground: OKLCH,
    background: OKLCH
  ): ExtendedAIContract['colorContext'] {
    return {
      foreground: this.createColorContext(foreground),
      background: this.createColorContext(background),
      polarity: foreground.l < background.l ? 'dark-on-light' : 'light-on-dark',
    };
  }

  private createColorContext(color: OKLCH): ColorContext {
    const hct = HCT.fromOKLCH(color);

    let chromaLevel: ColorContext['chromaLevel'];
    if (color.c < 0.02) chromaLevel = 'achromatic';
    else if (color.c < 0.08) chromaLevel = 'muted';
    else if (color.c < 0.15) chromaLevel = 'moderate';
    else chromaLevel = 'vivid';

    return {
      hex: color.toHex(),
      oklch: {
        lightness: Math.round(color.l * 1000) / 1000,
        chroma: Math.round(color.c * 1000) / 1000,
        hue: Math.round(color.h * 10) / 10,
      },
      hct: {
        hue: Math.round(hct.h * 10) / 10,
        chroma: Math.round(hct.c * 10) / 10,
        tone: Math.round(hct.t * 10) / 10,
      },
      semanticName: this.getSemanticColorName(color),
      isLight: color.l > 0.6,
      chromaLevel,
    };
  }

  private createMinimalColorContext(color: OKLCH): ColorContext {
    return {
      hex: color.toHex(),
      oklch: { lightness: color.l, chroma: color.c, hue: color.h },
      hct: { hue: 0, chroma: 0, tone: 0 },
      semanticName: '',
      isLight: color.l > 0.6,
      chromaLevel: 'moderate',
    };
  }

  private getSemanticColorName(color: OKLCH): string {
    // Simplified hue-based naming
    const hue = color.h;
    const isAchromatic = color.c < 0.02;

    if (isAchromatic) {
      if (color.l > 0.95) return 'white';
      if (color.l < 0.05) return 'black';
      return 'gray';
    }

    // Map hue to color name
    if (hue < 15 || hue >= 345) return 'red';
    if (hue < 45) return 'orange';
    if (hue < 75) return 'yellow';
    if (hue < 165) return 'green';
    if (hue < 200) return 'cyan';
    if (hue < 260) return 'blue';
    if (hue < 300) return 'purple';
    return 'magenta';
  }

  private analyzeFactors(
    factors: ReadonlyArray<DecisionFactor>
  ): ExtendedAIContract['factorAnalysis'] {
    return factors.map(factor => ({
      name: factor.name,
      contribution: Math.round(factor.weight * factor.normalizedValue * 100) / 100,
      interpretation: factor.explanation,
      isOptimal: factor.normalizedValue >= 0.8,
    }));
  }

  private generateRecommendations(decision: ContrastDecision): ReadonlyArray<ActionRecommendation> {
    const recommendations: ActionRecommendation[] = [];
    const score = decision.score as number;
    const fontSize = decision.readabilityContext.fontSize as number;
    const fontWeight = decision.readabilityContext.fontWeight as number;

    // Critical: failing accessibility
    if (decision.level === 'fail') {
      recommendations.push({
        id: 'rec-critical-contrast',
        type: 'increase-contrast',
        priority: 'critical',
        description: 'This color combination does not meet accessibility requirements',
        reasoning: 'APCA Lc is below minimum threshold for the specified font size',
        expectedImprovement: {
          scoreDelta: 30,
          newLevel: 'AA',
        },
      });
    }

    // Required: small font with marginal contrast
    if (fontSize < 14 && score < 70) {
      recommendations.push({
        id: 'rec-increase-font',
        type: 'increase-font-size',
        priority: 'required',
        description: 'Increase font size for better readability',
        reasoning: 'Text below 14px requires higher contrast for legibility',
        suggestedValue: 16,
        expectedImprovement: {
          scoreDelta: 10,
          newLevel: decision.wcagLevel,
        },
      });
    }

    // Recommended: light weight with moderate contrast
    if (fontWeight < 400 && score < 80) {
      recommendations.push({
        id: 'rec-increase-weight',
        type: 'increase-font-weight',
        priority: 'recommended',
        description: 'Consider using a heavier font weight',
        reasoning: 'Lighter font weights are harder to read and require more contrast',
        suggestedValue: 400,
      });
    }

    // Informational: already optimal
    if (decision.level === 'enhanced') {
      recommendations.push({
        id: 'rec-accept',
        type: 'accept-current',
        priority: 'informational',
        description: 'This combination exceeds accessibility requirements',
        reasoning: 'No changes needed; consider this a reference for other color pairs',
      });
    }

    return recommendations;
  }

  private extractCompliance(decision: ContrastDecision): ExtendedAIContract['compliance'] {
    const ratio = decision.wcag21Ratio;
    const fontSize = decision.readabilityContext.fontSize as number;
    const isLargeText = fontSize >= 24;

    return {
      wcag21: {
        normalText: ratio >= 4.5,
        largeText: ratio >= 3.0,
        uiComponents: ratio >= 3.0,
      },
      wcag3: {
        tier: decision.wcag3Tier,
        continuousScore: decision.score as number,
      },
      apca: {
        lc: decision.apcaLc,
        level: this.getAPCALevel(decision.apcaLc),
        minimumFontSize: this.getMinimumFontSize(decision.apcaLc),
      },
    };
  }

  private createMinimalCompliance(decision: ContrastDecision): ExtendedAIContract['compliance'] {
    return {
      wcag21: { normalText: false, largeText: false, uiComponents: false },
      wcag3: { tier: decision.wcag3Tier, continuousScore: decision.score as number },
      apca: { lc: decision.apcaLc, level: '', minimumFontSize: 0 },
    };
  }

  private getAPCALevel(lc: number): string {
    const absLc = Math.abs(lc);
    if (absLc >= 90) return 'Lc 90+ (Preferred)';
    if (absLc >= 75) return 'Lc 75 (Body text)';
    if (absLc >= 60) return 'Lc 60 (Content text)';
    if (absLc >= 45) return 'Lc 45 (Headlines)';
    if (absLc >= 30) return 'Lc 30 (Large text only)';
    if (absLc >= 15) return 'Lc 15 (Non-text only)';
    return 'Below minimum';
  }

  private getMinimumFontSize(lc: number): number {
    const absLc = Math.abs(lc);
    if (absLc >= 90) return 12;
    if (absLc >= 75) return 14;
    if (absLc >= 60) return 18;
    if (absLc >= 45) return 24;
    if (absLc >= 30) return 36;
    return 72;
  }

  private generateSummaries(
    decision: ContrastDecision,
    language: string
  ): ExtendedAIContract['summaries'] {
    // For now, English only - could be extended with i18n
    const score = decision.score as number;
    const level = decision.wcagLevel;
    const lc = Math.abs(decision.apcaLc);

    const brief = decision.level === 'fail'
      ? `This color pair fails accessibility with a score of ${score.toFixed(0)}.`
      : `This color pair passes ${level} accessibility with a score of ${score.toFixed(0)}.`;

    const standard = `${brief} The APCA lightness contrast is ${lc.toFixed(1)} Lc. ` +
      `${decision.reasoning[0] ?? 'Additional context may be needed.'}`;

    const detailed = `${standard} ${decision.reasoning.slice(1).join(' ')} ` +
      (decision.warnings.length > 0
        ? `Note: ${decision.warnings.join(' ')}`
        : 'No warnings were generated for this evaluation.');

    const technical = `Color pair analysis: foreground ${decision.colors.foreground} on ` +
      `background ${decision.colors.background}. APCA Lc: ${decision.apcaLc.toFixed(2)}, ` +
      `WCAG 2.1 ratio: ${decision.wcag21Ratio.toFixed(2)}:1. Font context: ` +
      `${decision.readabilityContext.fontSize}px @ weight ${decision.readabilityContext.fontWeight}. ` +
      `Result: ${level} (${decision.wcag3Tier}), confidence ${(decision.confidence as number * 100).toFixed(0)}%.`;

    return { brief, standard, detailed, technical };
  }

  private createMinimalSummaries(decision: ContrastDecision): ExtendedAIContract['summaries'] {
    const brief = `Score: ${decision.score}, Level: ${decision.wcagLevel}`;
    return { brief, standard: brief, detailed: brief, technical: brief };
  }

  private generateJsonLd(decision: ContrastDecision): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Thing',
      'name': 'Color Contrast Accessibility Decision',
      'description': decision.reasoning.join(' '),
      'additionalProperty': [
        {
          '@type': 'PropertyValue',
          'propertyID': 'wcagLevel',
          'value': decision.wcagLevel,
        },
        {
          '@type': 'PropertyValue',
          'propertyID': 'accessibilityScore',
          'value': decision.score,
          'unitCode': 'PERCENT',
        },
        {
          '@type': 'PropertyValue',
          'propertyID': 'apcaLightessContrast',
          'value': decision.apcaLc,
        },
      ],
    };
  }

  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }
}

// ============================================
// Factory and Singleton
// ============================================

let instance: AIReadableContractsService | null = null;

export function getAIContractsService(): AIReadableContractsService {
  if (!instance) {
    instance = new AIReadableContractsService();
  }
  return instance;
}

export function createAIContractsService(): AIReadableContractsService {
  return new AIReadableContractsService();
}

export default AIReadableContractsService;
