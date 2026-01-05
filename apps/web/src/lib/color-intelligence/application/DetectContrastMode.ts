// ============================================
// DetectContrastMode Use Case
// Multi-Factor Contrast Mode Detection with Confidence Score
// ============================================

import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast from '../domain/value-objects/APCAContrast';

/**
 * Detected contrast mode
 */
export type ContrastMode = 'light-content' | 'dark-content';

/**
 * Detection factor weights (sum to 1.0)
 */
export interface DetectionWeights {
  lightness: number;         // OKLCH L factor
  tone: number;              // HCT Tone factor
  apca: number;              // APCA contrast factor
  perceptualWarmth: number;  // Warm/cool color factor
  chromaInfluence: number;   // High chroma adjustment
}

/**
 * Detection factors breakdown
 */
export interface DetectionFactors {
  oklchLightness: number;      // 0-1 lightness value
  hctTone: number;             // 0-100 tone value
  apcaPreference: ContrastMode; // APCA-based preference
  warmthAdjustment: number;    // -0.1 to +0.1 adjustment
  chromaAdjustment: number;    // -0.05 to +0.05 adjustment
  rawScore: number;            // 0-1 before thresholding
  threshold: number;           // Applied threshold
}

/**
 * Detection result
 */
export interface ContrastModeResult {
  mode: ContrastMode;
  confidence: number;          // 0-1, higher = more certain
  factors: DetectionFactors;
  recommendations: string[];
}

/**
 * Detection configuration
 */
export interface DetectContrastModeConfig {
  weights?: Partial<DetectionWeights>;
  lightThreshold?: number;      // Score above this = light-content
  confidenceWindow?: number;    // Scores within this of threshold = low confidence
  applyWarmthCorrection?: boolean;
  applyChromaCorrection?: boolean;
}

const DEFAULT_WEIGHTS: DetectionWeights = {
  lightness: 0.40,       // Primary factor
  tone: 0.25,            // HCT tone consideration
  apca: 0.20,            // APCA preference
  perceptualWarmth: 0.10, // Warm colors appear lighter
  chromaInfluence: 0.05,  // Saturated colors need adjustment
};

const DEFAULT_CONFIG: Required<DetectContrastModeConfig> = {
  weights: DEFAULT_WEIGHTS,
  lightThreshold: 0.58,       // Calibrated threshold (not 0.5 due to perceptual factors)
  confidenceWindow: 0.15,     // ±15% around threshold = lower confidence
  applyWarmthCorrection: true,
  applyChromaCorrection: true,
};

/**
 * DetectContrastMode Use Case
 *
 * Problem Solved:
 * The simple L > 0.65 threshold fails for:
 * - Saturated colors (appear darker than their L value)
 * - Warm colors (yellow appears lighter than its L)
 * - Colors near the threshold (no confidence indication)
 *
 * Solution:
 * Multi-factor analysis combining:
 * 1. OKLCH Lightness (perceptually uniform)
 * 2. HCT Tone (Material Design 3 validated)
 * 3. APCA preference (accessibility-first)
 * 4. Warmth correction (perceptual psychology)
 * 5. Chroma influence (saturation affects perceived lightness)
 *
 * @example
 * ```typescript
 * const result = detectContrastMode('#0EB58C');
 * // { mode: 'light-content', confidence: 0.78, ... }
 * ```
 */
export function detectContrastMode(
  colorInput: string | OKLCH,
  config?: DetectContrastModeConfig
): ContrastModeResult {
  // Merge config
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    weights: { ...DEFAULT_WEIGHTS, ...config?.weights },
  };

  // Parse input
  const oklch = typeof colorInput === 'string'
    ? OKLCH.fromHex(colorInput)
    : colorInput;

  if (!oklch) {
    throw new Error('Invalid color input for contrast mode detection');
  }

  const hex = typeof colorInput === 'string' ? colorInput : colorInput.toHex();

  // Calculate HCT equivalent
  const hct = HCT.fromOKLCH(oklch);

  // Calculate APCA contrasts against black and white
  const contrastOnBlack = APCAContrast.calculate(hex, '#000000');
  const contrastOnWhite = APCAContrast.calculate(hex, '#FFFFFF');

  // ===== Factor 1: OKLCH Lightness =====
  const oklchLightness = oklch.l;

  // ===== Factor 2: HCT Tone =====
  const hctTone = hct.t / 100; // Normalize to 0-1

  // ===== Factor 3: APCA Preference =====
  // Which background gives better contrast for body text?
  const apcaPreference: ContrastMode =
    contrastOnBlack.absoluteLc > contrastOnWhite.absoluteLc
      ? 'light-content'
      : 'dark-content';

  // APCA score contribution (normalized)
  const apcaScore = contrastOnBlack.absoluteLc > contrastOnWhite.absoluteLc
    ? Math.min(1, contrastOnBlack.absoluteLc / 100)
    : 1 - Math.min(1, contrastOnWhite.absoluteLc / 100);

  // ===== Factor 4: Warmth Adjustment =====
  let warmthAdjustment = 0;
  if (cfg.applyWarmthCorrection) {
    // Warm colors (red, orange, yellow) appear perceptually lighter
    // Cool colors (blue, cyan) appear perceptually darker
    const warmth = oklch.getWarmth();

    // Map warmth (-1 to +1) to adjustment (-0.1 to +0.1)
    warmthAdjustment = warmth * 0.1;
  }

  // ===== Factor 5: Chroma Influence =====
  let chromaAdjustment = 0;
  if (cfg.applyChromaCorrection) {
    // High chroma colors appear darker than their L value suggests
    // (Helmholtz–Kohlrausch effect)
    const chromaFactor = Math.min(oklch.c / 0.3, 1); // Normalize chroma
    chromaAdjustment = -chromaFactor * 0.05; // Reduce score for saturated colors
  }

  // ===== Calculate Weighted Score =====
  const { weights } = cfg;

  const rawScore =
    oklchLightness * weights.lightness +
    hctTone * weights.tone +
    apcaScore * weights.apca +
    (0.5 + warmthAdjustment) * weights.perceptualWarmth +
    (0.5 + chromaAdjustment) * weights.chromaInfluence;

  // ===== Apply Threshold =====
  const { lightThreshold, confidenceWindow } = cfg;

  const mode: ContrastMode = rawScore >= lightThreshold
    ? 'light-content'
    : 'dark-content';

  // ===== Calculate Confidence =====
  // Distance from threshold determines confidence
  const distanceFromThreshold = Math.abs(rawScore - lightThreshold);
  const maxDistance = Math.max(lightThreshold, 1 - lightThreshold);

  // Confidence is low near threshold, high far from it
  let confidence: number;
  if (distanceFromThreshold <= confidenceWindow) {
    // Within uncertainty window
    confidence = 0.5 + (distanceFromThreshold / confidenceWindow) * 0.3;
  } else {
    // Outside window
    confidence = 0.8 + (distanceFromThreshold - confidenceWindow) / (maxDistance - confidenceWindow) * 0.2;
  }

  confidence = Math.min(1, Math.max(0, confidence));

  // ===== Generate Recommendations =====
  const recommendations: string[] = [];

  if (confidence < 0.7) {
    recommendations.push(
      'Color is near the light/dark boundary - consider testing with users'
    );
  }

  if (oklch.c > 0.25) {
    recommendations.push(
      'High saturation may affect perceived contrast - verify with APCA'
    );
  }

  if (mode === 'light-content' && contrastOnWhite.absoluteLc < 45) {
    recommendations.push(
      'Light content mode but low contrast on white - ensure icons have sufficient contrast'
    );
  }

  if (mode === 'dark-content' && contrastOnBlack.absoluteLc < 45) {
    recommendations.push(
      'Dark content mode but low contrast on black - ensure icons have sufficient contrast'
    );
  }

  // Specific hue warnings
  if (oklch.h >= 50 && oklch.h <= 70 && oklch.l > 0.5) {
    // Yellow/green-yellow range
    recommendations.push(
      'Yellow/lime hues are challenging - test dark text carefully for legibility'
    );
  }

  // ===== Return Result =====
  return {
    mode,
    confidence,
    factors: {
      oklchLightness,
      hctTone: hct.t,
      apcaPreference,
      warmthAdjustment,
      chromaAdjustment,
      rawScore,
      threshold: lightThreshold,
    },
    recommendations,
  };
}

/**
 * Quick detection for performance-sensitive code
 * Returns only mode, no confidence or factors
 */
export function detectContrastModeQuick(
  colorInput: string | OKLCH
): ContrastMode {
  const oklch = typeof colorInput === 'string'
    ? OKLCH.fromHex(colorInput)
    : colorInput;

  if (!oklch) return 'dark-content';

  // Simplified multi-factor calculation
  const l = oklch.l;
  const warmth = oklch.getWarmth();
  const chromaPenalty = Math.min(oklch.c / 0.3, 1) * 0.05;

  const score = l + warmth * 0.08 - chromaPenalty;

  return score >= 0.56 ? 'light-content' : 'dark-content';
}

/**
 * Batch detection for multiple colors
 */
export function detectContrastModeBatch(
  colors: Array<string | OKLCH>,
  config?: DetectContrastModeConfig
): ContrastModeResult[] {
  return colors.map(c => detectContrastMode(c, config));
}

/**
 * Get optimal foreground colors for a background
 */
export function getOptimalForegroundPair(
  background: string | OKLCH,
  config?: DetectContrastModeConfig
): {
  primary: { color: string; contrast: APCAContrast };
  muted: { color: string; contrast: APCAContrast };
  active: { color: string; contrast: APCAContrast };
} {
  const result = detectContrastMode(background, config);
  const bgHex = typeof background === 'string' ? background : background.toHex();

  if (result.mode === 'light-content') {
    // Dark foreground on light background
    return {
      primary: {
        color: 'oklch(20% 0 0)',
        contrast: APCAContrast.calculate('#1A1A1A', bgHex),
      },
      muted: {
        color: 'oklch(30% 0 0 / 0.7)',
        contrast: APCAContrast.calculate('#4D4D4D', bgHex),
      },
      active: {
        color: 'oklch(15% 0 0)',
        contrast: APCAContrast.calculate('#0D0D0D', bgHex),
      },
    };
  } else {
    // Light foreground on dark background
    return {
      primary: {
        color: 'oklch(95% 0 0)',
        contrast: APCAContrast.calculate('#F2F2F2', bgHex),
      },
      muted: {
        color: 'oklch(85% 0 0 / 0.7)',
        contrast: APCAContrast.calculate('#D9D9D9', bgHex),
      },
      active: {
        color: 'oklch(100% 0 0)',
        contrast: APCAContrast.calculate('#FFFFFF', bgHex),
      },
    };
  }
}

/**
 * Analyze a brand color for Smart Glass system
 */
export function analyzeBrandColor(
  primaryHex: string,
  accentHex?: string
): {
  mode: ContrastModeResult;
  glassBackground: string;
  glassOpacity: number;
  iconColors: ReturnType<typeof getOptimalForegroundPair>;
  borderColor: string;
  shadowColor: string;
  badgeConfig: {
    background: string;
    textColor: string;
    borderColor: string;
  };
} {
  const mode = detectContrastMode(primaryHex);
  const oklch = OKLCH.fromHex(primaryHex)!;
  const isLight = mode.mode === 'light-content';

  // Glass background adapts to primary
  const glassBackground = isLight
    ? 'rgba(0, 0, 0, 0.08)'
    : 'rgba(255, 255, 255, 0.08)';

  const glassOpacity = isLight ? 0.12 : 0.08;

  // Icon colors
  const iconColors = getOptimalForegroundPair(primaryHex);

  // Border with subtle hue from primary
  const borderColor = OKLCH.create(
    isLight ? 0.3 : 0.85,
    0.015,
    oklch.h
  ).toCssAlpha(0.15);

  // Shadow derived from primary
  const shadowColor = OKLCH.create(
    oklch.l * 0.4,
    oklch.c * 0.5,
    oklch.h
  ).toCssAlpha(0.25);

  // Badge configuration
  const accent = accentHex ? OKLCH.fromHex(accentHex) : oklch.lighten(0.1);
  const badgeMode = detectContrastModeQuick(primaryHex);

  return {
    mode,
    glassBackground,
    glassOpacity,
    iconColors,
    borderColor,
    shadowColor,
    badgeConfig: {
      background: `linear-gradient(135deg, ${primaryHex}, ${accent?.toHex() ?? primaryHex})`,
      textColor: badgeMode === 'light-content' ? '#0A0A0A' : '#FFFFFF',
      borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)',
    },
  };
}

export default detectContrastMode;
