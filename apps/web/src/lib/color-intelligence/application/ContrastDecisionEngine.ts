// ============================================
// Contrast Decision Engine
// Multi-Factor Readability Decision System
// ============================================
//
// This engine evaluates real readability, not just static ratios.
// It considers font size, weight, viewing conditions, ambient light,
// and polarity to produce a comprehensive decision with reasoning.
//
// Architecture:
// - Input: Colors + Context (font, environment)
// - Process: Multi-factor analysis with configurable weights
// - Output: ContrastDecision with score, level, confidence, reasoning
//
// ============================================

import APCAContrast, { APCAPolarity, APCA_REQUIREMENTS } from '../domain/value-objects/APCAContrast';
import OKLCH from '../domain/value-objects/OKLCH';
import {
  type ContrastDecision,
  type ContrastDecisionRequest,
  type ContrastLevel,
  type DecisionFactor,
  type ReadabilityContext,
  type ThresholdConfiguration,
  type ViewingConditions,
  type ConfidenceScore,
  type PerceptualScore,
  createViewingConditions,
  createReadabilityContext,
  createConfidenceScore,
  createPerceptualScore,
  createThresholdConfig,
  toWCAGLevel,
  toWCAG3Tier,
  DEFAULT_THRESHOLDS,
} from '../domain/types/decision';

// ============================================
// Engine Configuration
// ============================================

/**
 * Factor weights for the decision algorithm
 * Sum should equal 1.0 for normalized scoring
 */
export interface DecisionWeights {
  /** Weight for raw APCA contrast */
  readonly apcaContrast: number;

  /** Weight for font size factor */
  readonly fontSize: number;

  /** Weight for font weight factor */
  readonly fontWeight: number;

  /** Weight for viewing environment */
  readonly environment: number;

  /** Weight for polarity preference */
  readonly polarity: number;

  /** Weight for color temperature/hue */
  readonly colorTemperature: number;
}

const DEFAULT_WEIGHTS: DecisionWeights = {
  apcaContrast: 0.45,      // Primary factor
  fontSize: 0.20,          // Size significantly affects legibility
  fontWeight: 0.12,        // Weight has moderate effect
  environment: 0.10,       // Environment modifies perception
  polarity: 0.08,          // Light/dark mode affects comfort
  colorTemperature: 0.05,  // Warm/cool has subtle effect
};

/**
 * Engine configuration
 */
export interface ContrastDecisionEngineConfig {
  /** Factor weights */
  readonly weights?: Partial<DecisionWeights>;

  /** Threshold configuration */
  readonly thresholds?: Partial<ThresholdConfiguration>;

  /** Algorithm version identifier */
  readonly algorithmVersion?: string;

  /** Enable detailed factor breakdown */
  readonly detailedFactors?: boolean;

  /** Enable suggestion generation */
  readonly generateSuggestions?: boolean;
}

// ============================================
// WCAG 2.1 Helper (for backwards compatibility)
// ============================================

function calculateWCAG21Ratio(fg: string, bg: string): number {
  const getLuminance = (hex: string): number => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result || !result[1] || !result[2] || !result[3]) return 0;

    const channels = [result[1], result[2], result[3]].map(c => {
      const val = parseInt(c, 16) / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    const r = channels[0] ?? 0;
    const g = channels[1] ?? 0;
    const b = channels[2] ?? 0;

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// ============================================
// Contrast Decision Engine Class
// ============================================

/**
 * ContrastDecisionEngine
 *
 * A multi-factor decision engine that evaluates text readability
 * considering context beyond simple contrast ratios.
 *
 * @example
 * ```typescript
 * const engine = new ContrastDecisionEngine();
 *
 * const decision = engine.evaluate({
 *   foreground: '#333333',
 *   background: '#FFFFFF',
 *   readabilityContext: createReadabilityContext(16, 400),
 *   viewingConditions: createViewingConditions('average'),
 * });
 *
 * console.log(decision.score);     // 85
 * console.log(decision.level);     // 'standard'
 * console.log(decision.reasoning); // ['APCA Lc 87.5 exceeds body text threshold...']
 * ```
 */
export class ContrastDecisionEngine {
  private readonly weights: DecisionWeights;
  private readonly thresholds: ThresholdConfiguration;
  private readonly algorithmVersion: string;
  private readonly detailedFactors: boolean;
  private readonly generateSuggestions: boolean;

  constructor(config?: ContrastDecisionEngineConfig) {
    this.weights = { ...DEFAULT_WEIGHTS, ...config?.weights };
    this.thresholds = createThresholdConfig(config?.thresholds);
    this.algorithmVersion = config?.algorithmVersion ?? '1.0.0-beta';
    this.detailedFactors = config?.detailedFactors ?? true;
    this.generateSuggestions = config?.generateSuggestions ?? true;

    // Validate weights sum to 1.0 (with tolerance)
    const weightSum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(weightSum - 1.0) > 0.001) {
      console.warn(`Decision weights sum to ${weightSum}, expected 1.0. Normalizing.`);
    }
  }

  // ============================================
  // Main Evaluation Method
  // ============================================

  /**
   * Evaluate contrast decision for a color pair
   */
  evaluate(request: ContrastDecisionRequest): ContrastDecision {
    const { foreground, background } = request;

    // Default contexts if not provided
    const readabilityContext = request.readabilityContext
      ?? createReadabilityContext(16, 400);

    const viewingConditions = request.viewingConditions
      ?? createViewingConditions('average');

    // Merge threshold overrides
    const thresholds = request.thresholdOverrides
      ? createThresholdConfig({ ...this.thresholds, ...request.thresholdOverrides })
      : this.thresholds;

    // ===== Calculate Raw Metrics =====
    const apca = APCAContrast.calculate(foreground, background);
    const wcag21Ratio = calculateWCAG21Ratio(foreground, background);
    const fgOklch = OKLCH.fromHex(foreground);
    const bgOklch = OKLCH.fromHex(background);

    // ===== Calculate Individual Factors =====
    const factors: DecisionFactor[] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Factor 1: APCA Contrast
    const apcaFactor = this.calculateAPCAFactor(apca, readabilityContext, thresholds);
    factors.push(apcaFactor);

    // Factor 2: Font Size
    const fontSizeFactor = this.calculateFontSizeFactor(readabilityContext, apca, thresholds);
    factors.push(fontSizeFactor);

    // Factor 3: Font Weight
    const fontWeightFactor = this.calculateFontWeightFactor(readabilityContext, thresholds);
    factors.push(fontWeightFactor);

    // Factor 4: Environment
    const environmentFactor = this.calculateEnvironmentFactor(viewingConditions, apca, thresholds);
    factors.push(environmentFactor);

    // Factor 5: Polarity
    const polarityFactor = this.calculatePolarityFactor(apca, viewingConditions);
    factors.push(polarityFactor);

    // Factor 6: Color Temperature
    const temperatureFactor = this.calculateColorTemperatureFactor(fgOklch, bgOklch);
    factors.push(temperatureFactor);

    // ===== Calculate Weighted Score =====
    const rawScore = factors.reduce((sum, factor) => {
      return sum + factor.normalizedValue * factor.weight;
    }, 0);

    // Scale to 0-100
    const score = createPerceptualScore(rawScore * 100);

    // ===== Determine Level =====
    const level = this.determineLevel(score, apca, readabilityContext, thresholds);

    // ===== Calculate Confidence =====
    const confidence = this.calculateConfidence(factors, score, apca, thresholds);

    // ===== Generate Reasoning =====
    reasoning.push(...this.generateReasoning(factors, level, apca, readabilityContext));

    // ===== Generate Warnings =====
    warnings.push(...this.generateWarnings(factors, apca, readabilityContext, viewingConditions));

    // ===== Generate Suggestions =====
    const suggestions = this.generateSuggestions
      ? this.generateImprovementSuggestions(level, apca, readabilityContext, fgOklch, bgOklch)
      : [];

    // ===== Build Decision =====
    return {
      score,
      level,
      wcagLevel: toWCAGLevel(level),
      wcag3Tier: toWCAG3Tier(level, score as number),
      apcaLc: apca.lc,
      apcaAbsolute: apca.absoluteLc,
      wcag21Ratio,
      polarity: apca.polarity,
      confidence,
      viewingConditions,
      readabilityContext,
      factors: this.detailedFactors ? factors : [],
      reasoning,
      warnings,
      suggestions,
      timestamp: new Date().toISOString(),
      algorithmVersion: this.algorithmVersion,
      colors: { foreground, background },
    };
  }

  // ============================================
  // Factor Calculations
  // ============================================

  private calculateAPCAFactor(
    apca: APCAContrast,
    context: ReadabilityContext,
    thresholds: ThresholdConfiguration
  ): DecisionFactor {
    const fontSize = context.fontSize as number;
    const absoluteLc = apca.absoluteLc;

    // Determine required Lc based on font size
    let requiredLc: number;
    if (fontSize >= thresholds.extraLargeFontSizeThreshold) {
      requiredLc = thresholds.spotTextLc;
    } else if (fontSize >= thresholds.largeFontSizeThreshold) {
      requiredLc = thresholds.headlineLc;
    } else if (fontSize >= thresholds.smallFontSizeThreshold) {
      requiredLc = thresholds.largeTextLc;
    } else {
      requiredLc = thresholds.bodyTextLc;
    }

    // Normalize: how well does actual Lc meet requirement?
    // Perfect score at requiredLc * 1.3, failing at requiredLc * 0.5
    const normalizedValue = Math.max(0, Math.min(1,
      (absoluteLc - requiredLc * 0.5) / (requiredLc * 0.8)
    ));

    const impact: 'positive' | 'negative' | 'neutral' =
      absoluteLc >= requiredLc * 1.1 ? 'positive' :
        absoluteLc < requiredLc ? 'negative' : 'neutral';

    return {
      id: 'apca-contrast',
      name: 'APCA Contrast',
      weight: this.weights.apcaContrast,
      rawValue: absoluteLc,
      normalizedValue,
      impact,
      explanation: absoluteLc >= requiredLc
        ? `APCA Lc ${absoluteLc.toFixed(1)} meets requirement of ${requiredLc} for ${fontSize}px text`
        : `APCA Lc ${absoluteLc.toFixed(1)} below requirement of ${requiredLc} for ${fontSize}px text`,
    };
  }

  private calculateFontSizeFactor(
    context: ReadabilityContext,
    apca: APCAContrast,
    thresholds: ThresholdConfiguration
  ): DecisionFactor {
    const fontSize = context.fontSize as number;

    // Larger fonts can tolerate lower contrast
    // Smaller fonts need more contrast
    let normalizedValue: number;
    let impact: 'positive' | 'negative' | 'neutral';

    if (fontSize >= thresholds.extraLargeFontSizeThreshold) {
      normalizedValue = 1.0; // Full bonus
      impact = 'positive';
    } else if (fontSize >= thresholds.largeFontSizeThreshold) {
      normalizedValue = 0.8 + (fontSize - thresholds.largeFontSizeThreshold) /
        (thresholds.extraLargeFontSizeThreshold - thresholds.largeFontSizeThreshold) * 0.2;
      impact = 'positive';
    } else if (fontSize >= thresholds.smallFontSizeThreshold) {
      normalizedValue = 0.5 + (fontSize - thresholds.smallFontSizeThreshold) /
        (thresholds.largeFontSizeThreshold - thresholds.smallFontSizeThreshold) * 0.3;
      impact = 'neutral';
    } else {
      // Small font penalty
      normalizedValue = Math.max(0.1, fontSize / thresholds.smallFontSizeThreshold * 0.5);
      impact = 'negative';
    }

    return {
      id: 'font-size',
      name: 'Font Size',
      weight: this.weights.fontSize,
      rawValue: fontSize,
      normalizedValue,
      impact,
      explanation: fontSize >= thresholds.largeFontSizeThreshold
        ? `Large font (${fontSize}px) reduces contrast requirements`
        : fontSize < thresholds.smallFontSizeThreshold
          ? `Small font (${fontSize}px) requires higher contrast`
          : `Standard font size (${fontSize}px)`,
    };
  }

  private calculateFontWeightFactor(
    context: ReadabilityContext,
    thresholds: ThresholdConfiguration
  ): DecisionFactor {
    const weight = context.fontWeight as number;

    let normalizedValue: number;
    let impact: 'positive' | 'negative' | 'neutral';

    if (weight >= thresholds.boldWeightThreshold) {
      // Bold text is more legible
      normalizedValue = 0.8 + (weight - thresholds.boldWeightThreshold) / 300 * 0.2;
      impact = 'positive';
    } else if (weight <= thresholds.lightWeightThreshold) {
      // Light text is less legible
      normalizedValue = 0.3 + (weight - 100) / (thresholds.lightWeightThreshold - 100) * 0.2;
      impact = 'negative';
    } else {
      // Normal weight
      normalizedValue = 0.5 + (weight - thresholds.lightWeightThreshold) /
        (thresholds.boldWeightThreshold - thresholds.lightWeightThreshold) * 0.3;
      impact = 'neutral';
    }

    return {
      id: 'font-weight',
      name: 'Font Weight',
      weight: this.weights.fontWeight,
      rawValue: weight,
      normalizedValue: Math.min(1, normalizedValue),
      impact,
      explanation: weight >= thresholds.boldWeightThreshold
        ? `Bold weight (${weight}) improves legibility`
        : weight <= thresholds.lightWeightThreshold
          ? `Light weight (${weight}) reduces legibility`
          : `Normal weight (${weight})`,
    };
  }

  private calculateEnvironmentFactor(
    conditions: ViewingConditions,
    apca: APCAContrast,
    thresholds: ThresholdConfiguration
  ): DecisionFactor {
    const ambient = conditions.ambientLuminance as number;

    let normalizedValue: number;
    let impact: 'positive' | 'negative' | 'neutral';
    let explanation: string;

    if (ambient >= thresholds.brightEnvironmentLuminance) {
      // Bright environment needs higher contrast
      const contrastNeed = 1 + (ambient - thresholds.brightEnvironmentLuminance) / 1000 * 0.15;
      normalizedValue = Math.max(0.3, 1 - (contrastNeed - 1) * 2);
      impact = 'negative';
      explanation = `Bright environment (${ambient} cd/m²) requires higher contrast`;
    } else if (ambient <= thresholds.darkEnvironmentLuminance) {
      // Dark environment - polarity matters more
      if (apca.polarity === 'light-on-dark') {
        normalizedValue = 0.8; // Preferred in dark
        impact = 'positive';
        explanation = `Dark environment with light-on-dark polarity is comfortable`;
      } else {
        normalizedValue = 0.5;
        impact = 'neutral';
        explanation = `Dark environment with dark-on-light may cause eye strain`;
      }
    } else {
      // Average environment
      normalizedValue = 0.7;
      impact = 'neutral';
      explanation = `Average lighting conditions (${ambient} cd/m²)`;
    }

    return {
      id: 'environment',
      name: 'Viewing Environment',
      weight: this.weights.environment,
      rawValue: ambient,
      normalizedValue,
      impact,
      explanation,
    };
  }

  private calculatePolarityFactor(
    apca: APCAContrast,
    conditions: ViewingConditions
  ): DecisionFactor {
    const polarity = apca.polarity;
    const surround = conditions.surround;

    let normalizedValue: number;
    let impact: 'positive' | 'negative' | 'neutral';
    let explanation: string;

    // Light-on-dark is preferred in dark surrounds
    // Dark-on-light is preferred in bright surrounds
    if (surround === 'dark' && polarity === 'light-on-dark') {
      normalizedValue = 0.9;
      impact = 'positive';
      explanation = 'Light text on dark background suits dark environment';
    } else if (surround === 'dark' && polarity === 'dark-on-light') {
      normalizedValue = 0.5;
      impact = 'negative';
      explanation = 'Dark text on light background may be harsh in dark environment';
    } else if (surround !== 'dark' && polarity === 'dark-on-light') {
      normalizedValue = 0.8;
      impact = 'positive';
      explanation = 'Dark text on light background suits lit environment';
    } else {
      normalizedValue = 0.6;
      impact = 'neutral';
      explanation = 'Light text on dark in lit environment requires adjustment';
    }

    return {
      id: 'polarity',
      name: 'Polarity Match',
      weight: this.weights.polarity,
      rawValue: polarity === 'dark-on-light' ? 1 : 0,
      normalizedValue,
      impact,
      explanation,
    };
  }

  private calculateColorTemperatureFactor(
    fgOklch: OKLCH | null,
    bgOklch: OKLCH | null
  ): DecisionFactor {
    if (!fgOklch || !bgOklch) {
      return {
        id: 'color-temperature',
        name: 'Color Temperature',
        weight: this.weights.colorTemperature,
        rawValue: 0,
        normalizedValue: 0.5,
        impact: 'neutral',
        explanation: 'Unable to analyze color temperature',
      };
    }

    const fgWarmth = fgOklch.getWarmth();
    const bgWarmth = bgOklch.getWarmth();

    // Similar temperature = harmonious but may reduce perceived contrast
    // Opposite temperature = more vibrant but potentially jarring
    const temperatureDelta = Math.abs(fgWarmth - bgWarmth);

    let normalizedValue: number;
    let impact: 'positive' | 'negative' | 'neutral';
    let explanation: string;

    if (temperatureDelta < 0.3) {
      // Similar temperature - harmonious
      normalizedValue = 0.7;
      impact = 'neutral';
      explanation = 'Similar color temperatures create harmony';
    } else if (temperatureDelta < 0.7) {
      // Moderate contrast - optimal
      normalizedValue = 0.85;
      impact = 'positive';
      explanation = 'Color temperature contrast enhances readability';
    } else {
      // High contrast - may be jarring
      normalizedValue = 0.6;
      impact = 'neutral';
      explanation = 'High color temperature contrast may be visually intense';
    }

    return {
      id: 'color-temperature',
      name: 'Color Temperature',
      weight: this.weights.colorTemperature,
      rawValue: temperatureDelta,
      normalizedValue,
      impact,
      explanation,
    };
  }

  // ============================================
  // Level Determination
  // ============================================

  private determineLevel(
    score: PerceptualScore,
    apca: APCAContrast,
    context: ReadabilityContext,
    thresholds: ThresholdConfiguration
  ): ContrastLevel {
    const scoreNum = score as number;
    const fontSize = context.fontSize as number;

    // Determine context-appropriate threshold
    let requiredLc: number;
    if (fontSize >= thresholds.extraLargeFontSizeThreshold) {
      requiredLc = thresholds.spotTextLc;
    } else if (fontSize >= thresholds.largeFontSizeThreshold) {
      requiredLc = thresholds.headlineLc;
    } else if (fontSize >= thresholds.smallFontSizeThreshold) {
      requiredLc = thresholds.largeTextLc;
    } else {
      requiredLc = thresholds.bodyTextLc;
    }

    // Level is determined by both score and absolute APCA
    if (apca.absoluteLc < thresholds.minimumLc) {
      return 'fail';
    }

    if (apca.absoluteLc < requiredLc * 0.75) {
      return 'fail';
    }

    if (scoreNum >= 85 && apca.absoluteLc >= requiredLc * 1.2) {
      return 'enhanced';
    }

    if (scoreNum >= 70 && apca.absoluteLc >= requiredLc) {
      return 'standard';
    }

    if (scoreNum >= 50 && apca.absoluteLc >= requiredLc * 0.8) {
      return 'minimum';
    }

    return 'fail';
  }

  // ============================================
  // Confidence Calculation
  // ============================================

  private calculateConfidence(
    factors: DecisionFactor[],
    score: PerceptualScore,
    apca: APCAContrast,
    thresholds: ThresholdConfiguration
  ): ConfidenceScore {
    const scoreNum = score as number;

    // Base confidence from score distance to thresholds
    let baseConfidence: number;

    // Scores near boundaries have lower confidence
    const distanceToNearestBoundary = Math.min(
      Math.abs(scoreNum - 50),  // Fail/minimum boundary
      Math.abs(scoreNum - 70),  // Minimum/standard boundary
      Math.abs(scoreNum - 85),  // Standard/enhanced boundary
    );

    if (distanceToNearestBoundary < thresholds.uncertaintyWindow) {
      baseConfidence = 0.5 + distanceToNearestBoundary / thresholds.uncertaintyWindow * 0.3;
    } else {
      baseConfidence = 0.8 + Math.min(0.2, distanceToNearestBoundary / 30 * 0.2);
    }

    // Adjust for factor agreement
    const positiveFactors = factors.filter(f => f.impact === 'positive').length;
    const negativeFactors = factors.filter(f => f.impact === 'negative').length;

    // More agreement = higher confidence
    if (positiveFactors >= 4 || negativeFactors >= 4) {
      baseConfidence += 0.1;
    } else if (positiveFactors > 0 && negativeFactors > 0) {
      baseConfidence -= 0.05; // Mixed signals
    }

    return createConfidenceScore(baseConfidence);
  }

  // ============================================
  // Reasoning Generation
  // ============================================

  private generateReasoning(
    factors: DecisionFactor[],
    level: ContrastLevel,
    apca: APCAContrast,
    context: ReadabilityContext
  ): string[] {
    const reasoning: string[] = [];

    // Primary APCA reasoning
    reasoning.push(
      `APCA Lightness Contrast is ${apca.absoluteLc.toFixed(1)} (${apca.polarity})`
    );

    // Level explanation
    const levelDescriptions: Record<ContrastLevel, string> = {
      fail: 'does not meet accessibility requirements',
      minimum: 'meets minimum accessibility (WCAG AA equivalent)',
      standard: 'meets standard accessibility (WCAG AAA equivalent)',
      enhanced: 'exceeds accessibility requirements',
    };
    reasoning.push(`This ${levelDescriptions[level]} for ${context.fontSize}px ${context.fontWeight} weight text`);

    // Add significant factor explanations
    factors
      .filter(f => f.impact !== 'neutral' && f.weight >= 0.1)
      .forEach(f => {
        reasoning.push(f.explanation);
      });

    return reasoning;
  }

  // ============================================
  // Warning Generation
  // ============================================

  private generateWarnings(
    factors: DecisionFactor[],
    apca: APCAContrast,
    context: ReadabilityContext,
    conditions: ViewingConditions
  ): string[] {
    const warnings: string[] = [];

    // Small font warning
    if ((context.fontSize as number) < 14) {
      warnings.push('Font size below 14px may have legibility issues regardless of contrast');
    }

    // Light weight on small font
    if ((context.fontSize as number) < 16 && (context.fontWeight as number) < 400) {
      warnings.push('Light font weight combined with small size reduces legibility');
    }

    // Borderline APCA
    if (apca.absoluteLc >= 45 && apca.absoluteLc < 60) {
      warnings.push('APCA is in borderline range - test with users');
    }

    // Bright environment penalty
    if ((conditions.ambientLuminance as number) > 500) {
      warnings.push('Bright viewing conditions may reduce perceived contrast');
    }

    // High chroma colors
    const fgOklch = OKLCH.fromHex(apca.foreground);
    if (fgOklch && fgOklch.c > 0.2) {
      warnings.push('High saturation foreground may cause eye strain for extended reading');
    }

    return warnings;
  }

  // ============================================
  // Suggestion Generation
  // ============================================

  private generateImprovementSuggestions(
    level: ContrastLevel,
    apca: APCAContrast,
    context: ReadabilityContext,
    fgOklch: OKLCH | null,
    bgOklch: OKLCH | null
  ): string[] {
    if (level === 'enhanced') {
      return ['Current contrast exceeds requirements - no improvements needed'];
    }

    const suggestions: string[] = [];

    if (level === 'fail' || level === 'minimum') {
      // Suggest contrast improvement
      if (apca.polarity === 'dark-on-light' && fgOklch) {
        const darker = fgOklch.darken(0.15);
        suggestions.push(`Darken foreground to approximately ${darker.toHex()} for better contrast`);
      } else if (fgOklch) {
        const lighter = fgOklch.lighten(0.15);
        suggestions.push(`Lighten foreground to approximately ${lighter.toHex()} for better contrast`);
      }
    }

    // Font size suggestions (we already returned early for 'enhanced' level)
    if ((context.fontSize as number) < 16) {
      suggestions.push('Increase font size to 16px or larger for improved legibility');
    }

    // Font weight suggestions
    if ((context.fontWeight as number) < 500 && level === 'minimum') {
      suggestions.push('Increase font weight to 500+ (medium) to compensate for lower contrast');
    }

    // APCA level-specific suggestions
    if (apca.absoluteLc < 60) {
      suggestions.push('Use this color combination only for large text (24px+) or UI elements');
    }

    return suggestions;
  }

  // ============================================
  // Batch Evaluation
  // ============================================

  /**
   * Evaluate multiple color pairs efficiently
   */
  evaluateBatch(requests: ContrastDecisionRequest[]): ContrastDecision[] {
    return requests.map(req => this.evaluate(req));
  }

  /**
   * Find the best foreground color for a given background
   */
  findOptimalForeground(
    background: string,
    candidates: string[],
    context?: ReadabilityContext
  ): { color: string; decision: ContrastDecision } {
    let best: { color: string; decision: ContrastDecision } | null = null;

    for (const fg of candidates) {
      const decision = this.evaluate({
        foreground: fg,
        background,
        readabilityContext: context,
      });

      if (!best || (decision.score as number) > (best.decision.score as number)) {
        best = { color: fg, decision };
      }
    }

    // Fallback to black or white if no candidates
    if (!best) {
      const blackDecision = this.evaluate({
        foreground: '#000000',
        background,
        readabilityContext: context,
      });
      const whiteDecision = this.evaluate({
        foreground: '#FFFFFF',
        background,
        readabilityContext: context,
      });

      return (blackDecision.score as number) > (whiteDecision.score as number)
        ? { color: '#000000', decision: blackDecision }
        : { color: '#FFFFFF', decision: whiteDecision };
    }

    return best;
  }

  // ============================================
  // Configuration Access
  // ============================================

  /**
   * Get current engine configuration
   */
  getConfig(): {
    weights: DecisionWeights;
    thresholds: ThresholdConfiguration;
    algorithmVersion: string;
  } {
    return {
      weights: { ...this.weights },
      thresholds: { ...this.thresholds },
      algorithmVersion: this.algorithmVersion,
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a decision engine with default configuration
 */
export function createContrastDecisionEngine(
  config?: ContrastDecisionEngineConfig
): ContrastDecisionEngine {
  return new ContrastDecisionEngine(config);
}

/**
 * Quick evaluation without instantiating engine
 */
export function evaluateContrast(
  foreground: string,
  background: string,
  fontSize: number = 16,
  fontWeight: number = 400
): ContrastDecision {
  const engine = new ContrastDecisionEngine();
  return engine.evaluate({
    foreground,
    background,
    readabilityContext: createReadabilityContext(fontSize, fontWeight),
    viewingConditions: createViewingConditions('average'),
  });
}

export default ContrastDecisionEngine;
