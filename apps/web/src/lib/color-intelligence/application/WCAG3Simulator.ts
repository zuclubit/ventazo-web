// ============================================
// WCAG 3.0 Simulation Mode
// Progressive Scoring Model based on APCA Draft
// ============================================
//
// WCAG 3.0 introduces a fundamentally different approach:
// - Continuous scoring instead of binary pass/fail
// - Progressive tiers (Bronze/Silver/Gold/Platinum)
// - Context-aware requirements based on use case
// - Font size/weight lookup tables
//
// This simulator implements the draft APCA methodology
// with forward-compatible design.
//
// ============================================

import APCAContrast, { APCALevel, APCA_REQUIREMENTS } from '../domain/value-objects/APCAContrast';
import OKLCH from '../domain/value-objects/OKLCH';
import {
  type WCAG3Tier,
  type ReadabilityContext,
  type PerceptualScore,
  createReadabilityContext,
  createPerceptualScore,
} from '../domain/types/decision';

// ============================================
// WCAG 3.0 Types
// ============================================

/**
 * WCAG 3.0 conformance outcome
 */
export type WCAG3Outcome =
  | 'not-applicable'  // Criterion doesn't apply
  | 'fail'            // Does not meet minimum
  | 'poor'            // Below Bronze
  | 'bronze'          // Minimum acceptable
  | 'silver'          // Standard recommendation
  | 'gold'            // Enhanced experience
  | 'platinum';       // Exceeds all expectations

/**
 * WCAG 3.0 functional category
 */
export type FunctionalCategory =
  | 'body-text'
  | 'large-text'
  | 'placeholder'
  | 'ui-component'
  | 'icon'
  | 'non-text';

/**
 * Font size/weight combination for lookup
 */
export interface FontSpec {
  readonly size: number;    // px
  readonly weight: number;  // 100-900
}

/**
 * APCA Font Size Lookup Table Entry
 * Based on the APCA Visual Readability Contrast standard
 */
export interface APCALookupEntry {
  readonly minLc: number;
  readonly fontSpec: FontSpec;
  readonly tier: WCAG3Tier;
  readonly notes?: string;
}

/**
 * WCAG 3.0 Scoring Result
 */
export interface WCAG3Score {
  // ===== Core Metrics =====

  /** Continuous score 0-100 */
  readonly continuousScore: PerceptualScore;

  /** Discrete tier */
  readonly tier: WCAG3Tier;

  /** Detailed outcome */
  readonly outcome: WCAG3Outcome;

  // ===== APCA Details =====

  /** APCA Lc value */
  readonly apcaLc: number;

  /** APCA polarity */
  readonly polarity: 'dark-on-light' | 'light-on-dark';

  /** Font size used */
  readonly fontSize: number;

  /** Font weight used */
  readonly fontWeight: number;

  // ===== Progressive Requirements =====

  /** Minimum Lc for Bronze tier at this font size */
  readonly bronzeThreshold: number;

  /** Minimum Lc for Silver tier at this font size */
  readonly silverThreshold: number;

  /** Minimum Lc for Gold tier at this font size */
  readonly goldThreshold: number;

  /** Minimum Lc for Platinum tier at this font size */
  readonly platinumThreshold: number;

  /** Delta to reach next tier (0 if already Platinum) */
  readonly deltaToNextTier: number;

  // ===== Recommendations =====

  /** Alternative font sizes that would pass at current contrast */
  readonly alternativeFontSizes: ReadonlyArray<FontSpec>;

  /** Recommended minimum contrast for this font */
  readonly recommendedLc: number;

  /** Human-readable explanation */
  readonly explanation: string;
}

/**
 * WCAG 3.0 Audit result for a complete palette
 */
export interface WCAG3AuditResult {
  /** Overall tier for the palette */
  readonly overallTier: WCAG3Tier;

  /** Average continuous score */
  readonly averageScore: number;

  /** Worst performing pair */
  readonly lowestScore: WCAG3Score;

  /** Best performing pair */
  readonly highestScore: WCAG3Score;

  /** All evaluated pairs */
  readonly pairs: ReadonlyArray<{
    readonly foreground: string;
    readonly background: string;
    readonly score: WCAG3Score;
  }>;

  /** Summary statistics by tier */
  readonly tierDistribution: Record<WCAG3Tier, number>;

  /** Recommendations for improvement */
  readonly recommendations: ReadonlyArray<string>;
}

// ============================================
// APCA Font Size Lookup Tables
// Based on APCA 0.1.9 Visual Readability Contrast
// ============================================

/**
 * APCA Bronze tier minimum Lc by font size
 * This is the minimum for basic accessibility
 */
const BRONZE_LC_TABLE: ReadonlyArray<{ size: number; weight: number; minLc: number }> = [
  // Size (px), Weight, Min Lc
  { size: 12, weight: 400, minLc: 100 },  // Not recommended
  { size: 12, weight: 700, minLc: 90 },
  { size: 14, weight: 400, minLc: 90 },
  { size: 14, weight: 700, minLc: 75 },
  { size: 16, weight: 400, minLc: 75 },
  { size: 16, weight: 700, minLc: 60 },
  { size: 18, weight: 400, minLc: 65 },
  { size: 18, weight: 700, minLc: 55 },
  { size: 24, weight: 400, minLc: 55 },
  { size: 24, weight: 700, minLc: 45 },
  { size: 32, weight: 400, minLc: 45 },
  { size: 32, weight: 700, minLc: 35 },
  { size: 48, weight: 400, minLc: 35 },
  { size: 48, weight: 700, minLc: 25 },
  { size: 72, weight: 400, minLc: 25 },
  { size: 72, weight: 700, minLc: 15 },
];

/**
 * Get required Lc for a given font spec and tier
 */
function getRequiredLc(fontSize: number, fontWeight: number, tier: WCAG3Tier): number {
  // Find the closest matching entry
  const normalizedWeight = fontWeight >= 600 ? 700 : 400;

  // Find the two closest font sizes
  const sortedBySize = [...BRONZE_LC_TABLE]
    .filter(e => e.weight === normalizedWeight)
    .sort((a, b) => a.size - b.size);

  let baseLc: number;

  const firstEntry = sortedBySize[0];
  const lastEntry = sortedBySize[sortedBySize.length - 1];

  if (!firstEntry || !lastEntry) {
    return 45; // Default Bronze Lc
  }

  if (fontSize <= firstEntry.size) {
    baseLc = firstEntry.minLc;
  } else if (fontSize >= lastEntry.size) {
    baseLc = lastEntry.minLc;
  } else {
    // Interpolate between two closest entries
    const lower = sortedBySize.filter(e => e.size <= fontSize).pop()!;
    const upper = sortedBySize.find(e => e.size > fontSize)!;

    const t = (fontSize - lower.size) / (upper.size - lower.size);
    baseLc = lower.minLc + t * (upper.minLc - lower.minLc);
  }

  // Apply tier multipliers
  const tierMultipliers: Record<WCAG3Tier, number> = {
    Fail: 0.5,      // Below minimum
    Bronze: 1.0,    // Base
    Silver: 1.15,   // +15%
    Gold: 1.3,      // +30%
    Platinum: 1.5,  // +50%
  };

  return Math.round(baseLc * tierMultipliers[tier]);
}

/**
 * Calculate tier from Lc and thresholds
 */
function calculateTier(
  lc: number,
  bronze: number,
  silver: number,
  gold: number,
  platinum: number
): WCAG3Tier {
  if (lc >= platinum) return 'Platinum';
  if (lc >= gold) return 'Gold';
  if (lc >= silver) return 'Silver';
  if (lc >= bronze) return 'Bronze';
  return 'Fail';
}

/**
 * Calculate outcome from tier
 */
function calculateOutcome(tier: WCAG3Tier, lc: number, bronzeThreshold: number): WCAG3Outcome {
  if (tier === 'Fail') {
    return lc >= bronzeThreshold * 0.75 ? 'poor' : 'fail';
  }
  return tier.toLowerCase() as WCAG3Outcome;
}

/**
 * Calculate continuous score (0-100)
 */
function calculateContinuousScore(
  lc: number,
  bronzeThreshold: number,
  platinumThreshold: number
): number {
  if (lc <= 0) return 0;
  if (lc >= platinumThreshold * 1.2) return 100;

  // Score mapping:
  // 0 = no contrast
  // 40 = Bronze threshold
  // 60 = Silver threshold
  // 80 = Gold threshold
  // 95 = Platinum threshold
  // 100 = 1.2x Platinum

  const bronzeLc = bronzeThreshold;
  const platinumLc = platinumThreshold;

  if (lc < bronzeLc) {
    // 0-40 range
    return (lc / bronzeLc) * 40;
  }

  const range = platinumLc - bronzeLc;
  const progress = (lc - bronzeLc) / range;

  // 40-95 range with diminishing returns
  return 40 + progress * 55;
}

// ============================================
// WCAG 3.0 Simulator Class
// ============================================

/**
 * WCAG3Simulator
 *
 * Simulates WCAG 3.0 scoring based on the APCA draft methodology.
 * Provides progressive scoring instead of binary pass/fail.
 *
 * @example
 * ```typescript
 * const simulator = new WCAG3Simulator();
 *
 * const score = simulator.evaluate('#333333', '#FFFFFF', {
 *   fontSize: 16,
 *   fontWeight: 400,
 * });
 *
 * console.log(score.tier);            // 'Gold'
 * console.log(score.continuousScore); // 82
 * console.log(score.explanation);     // 'Exceeds Silver requirements...'
 * ```
 */
export class WCAG3Simulator {
  private readonly strictMode: boolean;

  constructor(options?: { strictMode?: boolean }) {
    this.strictMode = options?.strictMode ?? false;
  }

  // ============================================
  // Main Evaluation
  // ============================================

  /**
   * Evaluate a color pair for WCAG 3.0 compliance
   */
  evaluate(
    foreground: string,
    background: string,
    fontSpec?: FontSpec
  ): WCAG3Score {
    const spec = fontSpec ?? { size: 16, weight: 400 };
    const { size: fontSize, weight: fontWeight } = spec;

    // Calculate APCA
    const apca = APCAContrast.calculate(foreground, background);
    const lc = apca.absoluteLc;

    // Get tier thresholds
    const bronzeThreshold = getRequiredLc(fontSize, fontWeight, 'Bronze');
    const silverThreshold = getRequiredLc(fontSize, fontWeight, 'Silver');
    const goldThreshold = getRequiredLc(fontSize, fontWeight, 'Gold');
    const platinumThreshold = getRequiredLc(fontSize, fontWeight, 'Platinum');

    // Calculate tier
    const tier = calculateTier(lc, bronzeThreshold, silverThreshold, goldThreshold, platinumThreshold);

    // Calculate outcome
    const outcome = calculateOutcome(tier, lc, bronzeThreshold);

    // Calculate continuous score
    const continuousScore = createPerceptualScore(
      calculateContinuousScore(lc, bronzeThreshold, platinumThreshold)
    );

    // Calculate delta to next tier
    let deltaToNextTier = 0;
    if (tier === 'Fail') deltaToNextTier = bronzeThreshold - lc;
    else if (tier === 'Bronze') deltaToNextTier = silverThreshold - lc;
    else if (tier === 'Silver') deltaToNextTier = goldThreshold - lc;
    else if (tier === 'Gold') deltaToNextTier = platinumThreshold - lc;

    deltaToNextTier = Math.max(0, deltaToNextTier);

    // Find alternative font sizes
    const alternativeFontSizes = this.findAlternativeFontSizes(lc);

    // Recommended Lc for this font
    const recommendedLc = silverThreshold;

    // Generate explanation
    const explanation = this.generateExplanation(
      tier, lc, fontSize, fontWeight, bronzeThreshold, silverThreshold
    );

    return {
      continuousScore,
      tier,
      outcome,
      apcaLc: apca.lc,
      polarity: apca.polarity,
      fontSize,
      fontWeight,
      bronzeThreshold,
      silverThreshold,
      goldThreshold,
      platinumThreshold,
      deltaToNextTier,
      alternativeFontSizes,
      recommendedLc,
      explanation,
    };
  }

  /**
   * Evaluate with ReadabilityContext
   */
  evaluateWithContext(
    foreground: string,
    background: string,
    context: ReadabilityContext
  ): WCAG3Score {
    return this.evaluate(foreground, background, {
      size: context.fontSize as number,
      weight: context.fontWeight as number,
    });
  }

  // ============================================
  // Alternative Font Sizes
  // ============================================

  private findAlternativeFontSizes(currentLc: number): FontSpec[] {
    const alternatives: FontSpec[] = [];

    // Check which font sizes would work with current Lc
    for (const entry of BRONZE_LC_TABLE) {
      if (currentLc >= entry.minLc) {
        alternatives.push({
          size: entry.size,
          weight: entry.weight,
        });
      }
    }

    // Sort by size ascending
    return alternatives.sort((a, b) => a.size - b.size);
  }

  // ============================================
  // Explanation Generation
  // ============================================

  private generateExplanation(
    tier: WCAG3Tier,
    lc: number,
    fontSize: number,
    fontWeight: number,
    bronzeThreshold: number,
    silverThreshold: number
  ): string {
    const lcDisplay = lc.toFixed(1);
    const fontDesc = `${fontSize}px ${fontWeight >= 600 ? 'bold' : 'regular'} text`;

    switch (tier) {
      case 'Platinum':
        return `APCA Lc ${lcDisplay} significantly exceeds all requirements for ${fontDesc}. ` +
          `This provides an exceptional reading experience for all users.`;

      case 'Gold':
        return `APCA Lc ${lcDisplay} exceeds the recommended Silver level for ${fontDesc}. ` +
          `This provides an enhanced reading experience.`;

      case 'Silver':
        return `APCA Lc ${lcDisplay} meets the standard recommendation for ${fontDesc}. ` +
          `This is suitable for general body text.`;

      case 'Bronze':
        return `APCA Lc ${lcDisplay} meets minimum requirements for ${fontDesc}. ` +
          `Consider increasing to ${silverThreshold} Lc for improved readability.`;

      case 'Fail':
        return `APCA Lc ${lcDisplay} is below the minimum requirement of ${bronzeThreshold} for ${fontDesc}. ` +
          `This combination is not accessible. Increase contrast or use a larger font size.`;
    }
  }

  // ============================================
  // Palette Audit
  // ============================================

  /**
   * Audit a complete color palette
   */
  auditPalette(
    colors: Array<{ hex: string; role: 'foreground' | 'background' | 'both' }>,
    defaultFontSpec?: FontSpec
  ): WCAG3AuditResult {
    const fontSpec = defaultFontSpec ?? { size: 16, weight: 400 };

    const foregrounds = colors.filter(c => c.role !== 'background');
    const backgrounds = colors.filter(c => c.role !== 'foreground');

    const pairs: Array<{
      foreground: string;
      background: string;
      score: WCAG3Score;
    }> = [];

    // Evaluate all pairs
    for (const fg of foregrounds) {
      for (const bg of backgrounds) {
        if (fg.hex !== bg.hex) {
          const score = this.evaluate(fg.hex, bg.hex, fontSpec);
          pairs.push({
            foreground: fg.hex,
            background: bg.hex,
            score,
          });
        }
      }
    }

    if (pairs.length === 0) {
      throw new Error('No valid color pairs to audit');
    }

    // Calculate statistics
    const tierDistribution: Record<WCAG3Tier, number> = {
      Fail: 0,
      Bronze: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0,
    };

    let totalScore = 0;
    let lowestScore = pairs[0];
    let highestScore = pairs[0];

    if (!lowestScore || !highestScore) {
      // No pairs to evaluate - create minimal empty WCAG3Score
      const emptyScore: WCAG3Score = {
        continuousScore: createPerceptualScore(0),
        tier: 'Fail',
        outcome: 'fail',
        apcaLc: 0,
        polarity: 'dark-on-light',
        fontSize: 16,
        fontWeight: 400,
        bronzeThreshold: 45,
        silverThreshold: 60,
        goldThreshold: 75,
        platinumThreshold: 90,
        deltaToNextTier: 45,
        alternativeFontSizes: [],
        recommendedLc: 45,
        explanation: 'No color pairs to evaluate',
      };
      return {
        overallTier: 'Fail' as WCAG3Tier,
        averageScore: 0,
        lowestScore: emptyScore,
        highestScore: emptyScore,
        pairs: [],
        tierDistribution,
        recommendations: ['No color pairs to evaluate'],
      };
    }

    for (const pair of pairs) {
      tierDistribution[pair.score.tier]++;
      totalScore += pair.score.continuousScore as number;

      if ((pair.score.continuousScore as number) < (lowestScore!.score.continuousScore as number)) {
        lowestScore = pair;
      }
      if ((pair.score.continuousScore as number) > (highestScore!.score.continuousScore as number)) {
        highestScore = pair;
      }
    }

    const averageScore = totalScore / pairs.length;

    // Determine overall tier (based on lowest performing pair in strict mode)
    let overallTier: WCAG3Tier;
    if (this.strictMode) {
      overallTier = lowestScore!.score.tier;
    } else {
      // Average-based tier
      if (averageScore >= 95) overallTier = 'Platinum';
      else if (averageScore >= 80) overallTier = 'Gold';
      else if (averageScore >= 60) overallTier = 'Silver';
      else if (averageScore >= 40) overallTier = 'Bronze';
      else overallTier = 'Fail';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (tierDistribution.Fail > 0) {
      recommendations.push(
        `${tierDistribution.Fail} color pair(s) fail minimum requirements and must be fixed`
      );
    }

    if (tierDistribution.Bronze > pairs.length * 0.3) {
      recommendations.push(
        'Many pairs are at minimum Bronze level - consider improving contrast for better UX'
      );
    }

    if (lowestScore!.score.tier === 'Fail') {
      recommendations.push(
        `Lowest performing pair: ${lowestScore!.foreground} on ${lowestScore!.background} ` +
        `(Lc ${lowestScore!.score.apcaLc.toFixed(1)})`
      );
    }

    if (averageScore < 70) {
      recommendations.push(
        'Overall palette contrast is below recommended levels - review color choices'
      );
    }

    return {
      overallTier,
      averageScore: Math.round(averageScore),
      lowestScore: lowestScore!.score,
      highestScore: highestScore!.score,
      pairs,
      tierDistribution,
      recommendations,
    };
  }

  // ============================================
  // Tier Requirements
  // ============================================

  /**
   * Get the Lc required for each tier at a given font size
   */
  getTierRequirements(fontSpec: FontSpec): Record<WCAG3Tier, number> {
    return {
      Fail: 0,
      Bronze: getRequiredLc(fontSpec.size, fontSpec.weight, 'Bronze'),
      Silver: getRequiredLc(fontSpec.size, fontSpec.weight, 'Silver'),
      Gold: getRequiredLc(fontSpec.size, fontSpec.weight, 'Gold'),
      Platinum: getRequiredLc(fontSpec.size, fontSpec.weight, 'Platinum'),
    };
  }

  /**
   * Get minimum font size for a given Lc and target tier
   */
  getMinimumFontSize(targetLc: number, targetTier: WCAG3Tier = 'Silver'): FontSpec | null {
    // Search for smallest font that works
    for (const entry of [...BRONZE_LC_TABLE].sort((a, b) => a.size - b.size)) {
      const required = getRequiredLc(entry.size, entry.weight, targetTier);
      if (targetLc >= required) {
        return { size: entry.size, weight: entry.weight };
      }
    }
    return null;
  }

  // ============================================
  // Comparison Methods
  // ============================================

  /**
   * Compare two color pairs
   */
  compare(
    pair1: { fg: string; bg: string },
    pair2: { fg: string; bg: string },
    fontSpec?: FontSpec
  ): {
    pair1: WCAG3Score;
    pair2: WCAG3Score;
    better: 1 | 2 | 'equal';
    scoreDelta: number;
  } {
    const score1 = this.evaluate(pair1.fg, pair1.bg, fontSpec);
    const score2 = this.evaluate(pair2.fg, pair2.bg, fontSpec);

    const s1 = score1.continuousScore as number;
    const s2 = score2.continuousScore as number;

    return {
      pair1: score1,
      pair2: score2,
      better: s1 > s2 ? 1 : s1 < s2 ? 2 : 'equal',
      scoreDelta: Math.abs(s1 - s2),
    };
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create WCAG 3.0 simulator instance
 */
export function createWCAG3Simulator(options?: {
  strictMode?: boolean;
}): WCAG3Simulator {
  return new WCAG3Simulator(options);
}

/**
 * Quick WCAG 3.0 evaluation
 */
export function evaluateWCAG3(
  foreground: string,
  background: string,
  fontSize: number = 16,
  fontWeight: number = 400
): WCAG3Score {
  const simulator = new WCAG3Simulator();
  return simulator.evaluate(foreground, background, { size: fontSize, weight: fontWeight });
}

/**
 * Check if a pair meets a specific tier
 */
export function meetsTier(
  foreground: string,
  background: string,
  targetTier: WCAG3Tier,
  fontSpec?: FontSpec
): boolean {
  const score = evaluateWCAG3(
    foreground,
    background,
    fontSpec?.size ?? 16,
    fontSpec?.weight ?? 400
  );

  const tierOrder: Record<WCAG3Tier, number> = {
    Fail: 0,
    Bronze: 1,
    Silver: 2,
    Gold: 3,
    Platinum: 4,
  };

  return tierOrder[score.tier] >= tierOrder[targetTier];
}

export default WCAG3Simulator;
