// ============================================
// APCA Contrast Value Object
// Accessible Perceptual Contrast Algorithm (WCAG 3.0)
// ============================================

import OKLCH from './OKLCH';

/**
 * APCA Contrast Level enumeration
 * Based on WCAG 3.0 Silver/Gold/Bronze scoring
 */
export type APCALevel =
  | 'fail'           // |Lc| < 15 - Not readable
  | 'minimum'        // |Lc| >= 15 - Minimum for non-text
  | 'spot'           // |Lc| >= 30 - Spot text, icons, UI
  | 'large'          // |Lc| >= 45 - Large/bold text (24px+)
  | 'body'           // |Lc| >= 60 - Body text (18px+)
  | 'fluent'         // |Lc| >= 75 - Fluent reading (14px+)
  | 'excellent';     // |Lc| >= 90 - Excellent contrast

/**
 * APCA Contrast requirements for different use cases
 */
export interface APCARequirements {
  bodyText: number;      // 75 Lc
  largeText: number;     // 60 Lc
  headlines: number;     // 45 Lc
  spotText: number;      // 30 Lc
  nonText: number;       // 15 Lc
}

export const APCA_REQUIREMENTS: APCARequirements = {
  bodyText: 75,
  largeText: 60,
  headlines: 45,
  spotText: 30,
  nonText: 15,
};

/**
 * APCA polarity indicates text vs background relationship
 */
export type APCAPolarity = 'dark-on-light' | 'light-on-dark';

// SAPC-4g / APCA-W3 0.1.9 Constants
// Reference: https://github.com/Myndex/SAPC-APCA
const APCA = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.0721750,
  // Soft clamp threshold for very dark colors (blkThrs in APCA spec)
  blkThrs: 0.022,
  // Soft clamp exponent (blkClmp in APCA spec)
  blkClmp: 1.414,
  // Output clipping threshold (separate from soft clamp)
  loClip: 0.001,
  deltaYmin: 0.0005,
  normBG: 0.56,
  normTXT: 0.57,
  revBG: 0.65,
  revTXT: 0.62,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  loBoWthresh: 0.035991,
  loWoBthresh: 0.035991,
} as const;

/**
 * APCAContrast Value Object
 *
 * Represents a contrast measurement between foreground and background
 * using the APCA algorithm (WCAG 3.0 standard).
 *
 * Key differences from WCAG 2.1:
 * - Polarity matters (dark on light vs light on dark)
 * - More accurate for low luminance colors
 * - Better prediction of perceived contrast
 * - Accounts for spatial frequency (text size)
 *
 * @immutable
 */
export class APCAContrast {
  private readonly _lc: number;
  private readonly _polarity: APCAPolarity;
  private readonly _foreground: string;
  private readonly _background: string;

  private constructor(
    lc: number,
    polarity: APCAPolarity,
    foreground: string,
    background: string
  ) {
    this._lc = lc;
    this._polarity = polarity;
    this._foreground = foreground;
    this._background = background;
  }

  // ============================================
  // Factory Methods
  // ============================================

  /**
   * Calculate APCA contrast between text and background
   */
  static calculate(textHex: string, bgHex: string): APCAContrast {
    const textY = hexToApcaLuminance(textHex);
    const bgY = hexToApcaLuminance(bgHex);

    if (textY === null || bgY === null) {
      return new APCAContrast(0, 'dark-on-light', textHex, bgHex);
    }

    const { lc, polarity } = calculateAPCA(textY, bgY);
    return new APCAContrast(lc, polarity, textHex, bgHex);
  }

  /**
   * Calculate from OKLCH values
   */
  static fromOKLCH(text: OKLCH, bg: OKLCH): APCAContrast {
    return APCAContrast.calculate(text.toHex(), bg.toHex());
  }

  // ============================================
  // Getters
  // ============================================

  /**
   * Lightness Contrast value (-108 to +108)
   * Positive = dark on light, Negative = light on dark
   */
  get lc(): number { return this._lc; }

  /**
   * Absolute Lc value (always positive)
   */
  get absoluteLc(): number { return Math.abs(this._lc); }

  /**
   * Polarity of the contrast
   */
  get polarity(): APCAPolarity { return this._polarity; }

  /**
   * Original foreground color
   */
  get foreground(): string { return this._foreground; }

  /**
   * Original background color
   */
  get background(): string { return this._background; }

  // ============================================
  // Level Classification
  // ============================================

  /**
   * Get APCA level classification
   */
  get level(): APCALevel {
    const lc = this.absoluteLc;

    if (lc >= 90) return 'excellent';
    if (lc >= 75) return 'fluent';
    if (lc >= 60) return 'body';
    if (lc >= 45) return 'large';
    if (lc >= 30) return 'spot';
    if (lc >= 15) return 'minimum';
    return 'fail';
  }

  /**
   * Get numeric score (0-100) based on level
   */
  get score(): number {
    const lc = this.absoluteLc;
    // Score mapping with diminishing returns
    if (lc >= 90) return 100;
    if (lc >= 75) return 85 + (lc - 75) / 15 * 15;
    if (lc >= 60) return 70 + (lc - 60) / 15 * 15;
    if (lc >= 45) return 55 + (lc - 45) / 15 * 15;
    if (lc >= 30) return 40 + (lc - 30) / 15 * 15;
    if (lc >= 15) return 20 + (lc - 15) / 15 * 20;
    return lc / 15 * 20;
  }

  // ============================================
  // Validation Methods
  // ============================================

  /**
   * Check if contrast is sufficient for body text (14px+)
   */
  isValidForBodyText(): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS.bodyText;
  }

  /**
   * Check if contrast is sufficient for large text (24px+)
   */
  isValidForLargeText(): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS.largeText;
  }

  /**
   * Check if contrast is sufficient for headlines (32px+)
   */
  isValidForHeadlines(): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS.headlines;
  }

  /**
   * Check if contrast is sufficient for spot text/UI
   */
  isValidForSpotText(): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS.spotText;
  }

  /**
   * Check if contrast meets any readable threshold
   */
  isReadable(): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS.nonText;
  }

  /**
   * Validate against a specific use case
   */
  validate(useCase: keyof APCARequirements): boolean {
    return this.absoluteLc >= APCA_REQUIREMENTS[useCase];
  }

  /**
   * Get all passing use cases
   */
  getPassingUseCases(): (keyof APCARequirements)[] {
    const passing: (keyof APCARequirements)[] = [];

    if (this.isValidForBodyText()) passing.push('bodyText');
    if (this.isValidForLargeText()) passing.push('largeText');
    if (this.isValidForHeadlines()) passing.push('headlines');
    if (this.isValidForSpotText()) passing.push('spotText');
    if (this.isReadable()) passing.push('nonText');

    return passing;
  }

  // ============================================
  // Recommendations
  // ============================================

  /**
   * Get minimum font size recommendation
   */
  getMinimumFontSize(): { regular: number; bold: number } | null {
    const lc = this.absoluteLc;

    // Based on APCA font-size lookup tables
    if (lc >= 90) return { regular: 12, bold: 12 };
    if (lc >= 75) return { regular: 14, bold: 12 };
    if (lc >= 60) return { regular: 18, bold: 14 };
    if (lc >= 45) return { regular: 24, bold: 18 };
    if (lc >= 30) return { regular: 36, bold: 24 };
    if (lc >= 15) return { regular: 48, bold: 36 };
    return null; // Not readable
  }

  /**
   * Get improvement recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const lc = this.absoluteLc;

    if (lc < 75) {
      recommendations.push(
        'Increase contrast for comfortable body text reading'
      );

      if (this._polarity === 'dark-on-light') {
        recommendations.push('Try darkening the text color');
      } else {
        recommendations.push('Try lightening the text color');
      }
    }

    if (lc < 45) {
      recommendations.push(
        'Current contrast only suitable for large text (24px+) or decorative use'
      );
    }

    if (lc < 30) {
      recommendations.push(
        'Contrast insufficient for readable text - consider icons only'
      );
    }

    if (lc < 15) {
      recommendations.push(
        'Contrast too low for any functional use'
      );
    }

    return recommendations;
  }

  /**
   * Calculate required Lc delta to reach a target level
   */
  deltaToReach(targetLevel: APCALevel): number {
    const targetLc = {
      fail: 0,
      minimum: 15,
      spot: 30,
      large: 45,
      body: 60,
      fluent: 75,
      excellent: 90,
    }[targetLevel];

    return Math.max(0, targetLc - this.absoluteLc);
  }

  // ============================================
  // Comparison
  // ============================================

  /**
   * Compare with another contrast measurement
   */
  compareTo(other: APCAContrast): number {
    return this.absoluteLc - other.absoluteLc;
  }

  /**
   * Check if this contrast is better than another
   */
  isBetterThan(other: APCAContrast): boolean {
    return this.absoluteLc > other.absoluteLc;
  }

  /**
   * Check if approximately equal (within tolerance)
   */
  isApproximatelyEqual(other: APCAContrast, tolerance: number = 3): boolean {
    return Math.abs(this.absoluteLc - other.absoluteLc) <= tolerance;
  }

  // ============================================
  // Serialization
  // ============================================

  /**
   * Convert to plain object
   */
  toJSON(): {
    lc: number;
    absoluteLc: number;
    polarity: APCAPolarity;
    level: APCALevel;
    score: number;
    foreground: string;
    background: string;
  } {
    return {
      lc: this._lc,
      absoluteLc: this.absoluteLc,
      polarity: this._polarity,
      level: this.level,
      score: this.score,
      foreground: this._foreground,
      background: this._background,
    };
  }

  /**
   * Human-readable string representation
   */
  toString(): string {
    return `APCAContrast(Lc: ${this._lc.toFixed(1)}, Level: ${this.level}, ${this._polarity})`;
  }

  // ============================================
  // Static Utilities
  // ============================================

  /**
   * Find optimal text color for a given background
   */
  static findOptimalTextColor(
    bgHex: string,
    options: {
      preferDark?: boolean;
      minLc?: number;
    } = {}
  ): { color: string; contrast: APCAContrast } {
    const { preferDark = true, minLc = 75 } = options;

    // Try pure black and white first
    const blackContrast = APCAContrast.calculate('#000000', bgHex);
    const whiteContrast = APCAContrast.calculate('#FFFFFF', bgHex);

    // Return the one with higher contrast (or preference if both pass)
    if (blackContrast.absoluteLc >= minLc && whiteContrast.absoluteLc >= minLc) {
      return preferDark
        ? { color: '#000000', contrast: blackContrast }
        : { color: '#FFFFFF', contrast: whiteContrast };
    }

    if (blackContrast.absoluteLc > whiteContrast.absoluteLc) {
      return { color: '#000000', contrast: blackContrast };
    }

    return { color: '#FFFFFF', contrast: whiteContrast };
  }

  /**
   * Calculate the minimum lightness change needed to reach target Lc
   * Uses binary search for precision
   */
  static findContrastingLightness(
    sourceHex: string,
    bgHex: string,
    targetLc: number,
    direction: 'lighter' | 'darker' | 'auto' = 'auto'
  ): OKLCH | null {
    const source = OKLCH.fromHex(sourceHex);
    if (!source) return null;

    // Determine direction if auto
    let searchDirection = direction;
    if (direction === 'auto') {
      const currentContrast = APCAContrast.calculate(sourceHex, bgHex);
      searchDirection = currentContrast.polarity === 'dark-on-light' ? 'darker' : 'lighter';
    }

    // Binary search for target lightness
    let low = searchDirection === 'darker' ? 0 : source.l;
    let high = searchDirection === 'darker' ? source.l : 1;

    for (let i = 0; i < 20; i++) { // 20 iterations for precision
      const mid = (low + high) / 2;
      const test = source.withLightness(mid);
      const testContrast = APCAContrast.calculate(test.toHex(), bgHex);

      if (Math.abs(testContrast.absoluteLc - targetLc) < 1) {
        return test;
      }

      if (testContrast.absoluteLc < targetLc) {
        // Need more contrast
        if (searchDirection === 'darker') {
          high = mid;
        } else {
          low = mid;
        }
      } else {
        // Too much contrast
        if (searchDirection === 'darker') {
          low = mid;
        } else {
          high = mid;
        }
      }
    }

    // Return best found
    const result = source.withLightness((low + high) / 2);
    return result;
  }
}

// ============================================
// Internal Helper Functions
// ============================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

function hexToApcaLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const rLin = Math.pow(rgb.r / 255, APCA.mainTRC);
  const gLin = Math.pow(rgb.g / 255, APCA.mainTRC);
  const bLin = Math.pow(rgb.b / 255, APCA.mainTRC);

  return APCA.sRco * rLin + APCA.sGco * gLin + APCA.sBco * bLin;
}

function calculateAPCA(
  txtY: number,
  bgY: number
): { lc: number; polarity: APCAPolarity } {
  // Soft clamp for very dark colors using APCA blkThrs threshold
  // Reference: SAPC-4g / APCA-W3 0.1.9 - https://github.com/Myndex/SAPC-APCA
  // blkThrs (0.022) is the black soft clamp threshold
  // blkClmp (1.414) is the exponent for the soft clamp curve
  let textY = txtY > APCA.blkThrs ? txtY : txtY + Math.pow(APCA.blkThrs - txtY, APCA.blkClmp);
  let backY = bgY > APCA.blkThrs ? bgY : bgY + Math.pow(APCA.blkThrs - bgY, APCA.blkClmp);

  // Polarity check
  const polarity: APCAPolarity = backY > textY ? 'dark-on-light' : 'light-on-dark';

  let SAPC: number;

  if (polarity === 'dark-on-light') {
    SAPC = (Math.pow(backY, APCA.normBG) - Math.pow(textY, APCA.normTXT)) * APCA.scaleBoW;
  } else {
    SAPC = (Math.pow(backY, APCA.revBG) - Math.pow(textY, APCA.revTXT)) * APCA.scaleWoB;
  }

  // Low contrast clamp
  let lc: number;
  if (polarity === 'dark-on-light') {
    lc = SAPC < APCA.loBoWthresh ? 0 : (SAPC - APCA.loBoWoffset) * 100;
  } else {
    lc = SAPC > -APCA.loWoBthresh ? 0 : (SAPC + APCA.loWoBoffset) * 100;
  }

  return { lc, polarity };
}

export default APCAContrast;
