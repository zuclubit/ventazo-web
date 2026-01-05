// ============================================
// ValidateAccessibility Use Case
// Comprehensive Accessibility Validation for Color Systems
// ============================================

import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast, { APCALevel, APCA_REQUIREMENTS } from '../domain/value-objects/APCAContrast';
import { detectContrastMode, ContrastMode } from './DetectContrastMode';

/**
 * Accessibility standard to validate against
 */
export type AccessibilityStandard =
  | 'WCAG-2.1-AA'
  | 'WCAG-2.1-AAA'
  | 'WCAG-3.0-Silver'
  | 'WCAG-3.0-Gold'
  | 'WCAG-3.0-Platinum'
  | 'APCA-Fluent'
  | 'APCA-Body';

/**
 * Use case for a color combination
 */
export type ColorUseCase =
  | 'body-text'
  | 'large-text'
  | 'headline'
  | 'ui-component'
  | 'decorative'
  | 'icon'
  | 'badge-text'
  | 'link'
  | 'placeholder'
  | 'disabled-text';

/**
 * Validation result for a single color pair
 */
export interface ColorPairValidation {
  foreground: string;
  background: string;
  wcag21ContrastRatio: number;
  apcaContrast: APCAContrast;
  passes: {
    wcagAA: boolean;
    wcagAALarge: boolean;
    wcagAAA: boolean;
    wcagAAALarge: boolean;
    apcaBody: boolean;
    apcaLarge: boolean;
    apcaSpot: boolean;
  };
  recommendedUseCases: ColorUseCase[];
  issues: string[];
  suggestions: string[];
}

/**
 * Full palette validation result
 */
export interface PaletteValidationResult {
  overall: {
    score: number;        // 0-100 accessibility score
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    passesStandard: AccessibilityStandard[];
    failsStandard: AccessibilityStandard[];
  };
  pairs: ColorPairValidation[];
  criticalIssues: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Input for palette validation
 */
export interface PaletteValidationInput {
  colors: {
    name: string;
    hex: string;
    role?: 'background' | 'foreground' | 'both';
  }[];
  standards?: AccessibilityStandard[];
  useCases?: ColorUseCase[];
}

// ============================================
// WCAG 2.1 Contrast Calculation
// ============================================

/**
 * Calculate relative luminance (WCAG 2.1)
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const linearValues = [rgb.r, rgb.g, rgb.b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  const r = linearValues[0] ?? 0;
  const g = linearValues[1] ?? 0;
  const b = linearValues[2] ?? 0;

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate WCAG 2.1 contrast ratio
 */
function calculateWcag21ContrastRatio(fg: string, bg: string): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const rHex = result[1];
  const gHex = result[2];
  const bHex = result[3];
  if (!rHex || !gHex || !bHex) return null;
  return {
    r: parseInt(rHex, 16),
    g: parseInt(gHex, 16),
    b: parseInt(bHex, 16),
  };
}

// ============================================
// Main Validation Functions
// ============================================

/**
 * Validate a single color pair
 */
export function validateColorPair(
  foreground: string,
  background: string,
  useCase?: ColorUseCase
): ColorPairValidation {
  // Calculate WCAG 2.1 contrast
  const wcagRatio = calculateWcag21ContrastRatio(foreground, background);

  // Calculate APCA contrast
  const apcaContrast = APCAContrast.calculate(foreground, background);

  // Check passes
  const passes = {
    wcagAA: wcagRatio >= 4.5,
    wcagAALarge: wcagRatio >= 3,
    wcagAAA: wcagRatio >= 7,
    wcagAAALarge: wcagRatio >= 4.5,
    apcaBody: apcaContrast.isValidForBodyText(),
    apcaLarge: apcaContrast.isValidForLargeText(),
    apcaSpot: apcaContrast.isValidForSpotText(),
  };

  // Determine recommended use cases
  const recommendedUseCases: ColorUseCase[] = [];

  if (passes.apcaBody) {
    recommendedUseCases.push('body-text', 'link');
  }
  if (passes.apcaLarge || passes.wcagAALarge) {
    recommendedUseCases.push('large-text', 'headline');
  }
  if (passes.apcaSpot) {
    recommendedUseCases.push('ui-component', 'icon', 'badge-text');
  }
  if (apcaContrast.absoluteLc >= 15) {
    recommendedUseCases.push('decorative', 'placeholder', 'disabled-text');
  }

  // Generate issues
  const issues: string[] = [];

  if (useCase === 'body-text' && !passes.apcaBody) {
    issues.push(`Body text requires APCA Lc ≥ 75, current: ${apcaContrast.absoluteLc.toFixed(1)}`);
  }

  if (useCase === 'large-text' && !passes.apcaLarge) {
    issues.push(`Large text requires APCA Lc ≥ 60, current: ${apcaContrast.absoluteLc.toFixed(1)}`);
  }

  if (useCase === 'headline' && !passes.wcagAALarge) {
    issues.push(`Headlines should meet WCAG AA Large (3:1), current: ${wcagRatio.toFixed(2)}:1`);
  }

  if (useCase === 'ui-component' && !passes.apcaSpot) {
    issues.push(`UI components require APCA Lc ≥ 30, current: ${apcaContrast.absoluteLc.toFixed(1)}`);
  }

  // Generate suggestions
  const suggestions = apcaContrast.getRecommendations();

  // Add font size suggestions
  const fontSizes = apcaContrast.getMinimumFontSize();
  if (fontSizes) {
    suggestions.push(
      `Minimum font sizes: ${fontSizes.regular}px regular, ${fontSizes.bold}px bold`
    );
  }

  return {
    foreground,
    background,
    wcag21ContrastRatio: wcagRatio,
    apcaContrast,
    passes,
    recommendedUseCases,
    issues,
    suggestions,
  };
}

/**
 * Validate a full color palette
 */
export function validatePalette(
  input: PaletteValidationInput
): PaletteValidationResult {
  const { colors, standards = ['WCAG-2.1-AA', 'APCA-Body'], useCases = [] } = input;

  // Separate foregrounds and backgrounds
  const foregrounds = colors.filter(c => c.role !== 'background');
  const backgrounds = colors.filter(c => c.role !== 'foreground');

  // Validate all pairs
  const pairs: ColorPairValidation[] = [];

  for (const fg of foregrounds) {
    for (const bg of backgrounds) {
      if (fg.hex !== bg.hex) {
        pairs.push(validateColorPair(fg.hex, bg.hex));
      }
    }
  }

  // Calculate overall score
  let totalScore = 0;
  let maxScore = 0;

  for (const pair of pairs) {
    maxScore += 100;

    // Score based on APCA level
    const apcaScore = pair.apcaContrast.score;
    totalScore += apcaScore;
  }

  const overallScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Determine grade
  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  // Check standards
  const passesStandard: AccessibilityStandard[] = [];
  const failsStandard: AccessibilityStandard[] = [];

  for (const standard of standards) {
    const passes = checkStandard(pairs, standard);
    if (passes) {
      passesStandard.push(standard);
    } else {
      failsStandard.push(standard);
    }
  }

  // Collect issues
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const pair of pairs) {
    // Critical: no contrast at all
    if (pair.apcaContrast.absoluteLc < 15) {
      criticalIssues.push(
        `Critical: ${pair.foreground} on ${pair.background} has insufficient contrast (Lc: ${pair.apcaContrast.absoluteLc.toFixed(1)})`
      );
    }

    // Warning: borderline contrast
    if (pair.apcaContrast.absoluteLc >= 15 && pair.apcaContrast.absoluteLc < 45) {
      warnings.push(
        `Warning: ${pair.foreground} on ${pair.background} only suitable for large text or decorative use`
      );
    }

    // Collect unique recommendations
    for (const suggestion of pair.suggestions) {
      if (!recommendations.includes(suggestion)) {
        recommendations.push(suggestion);
      }
    }
  }

  return {
    overall: {
      score: Math.round(overallScore),
      grade,
      passesStandard,
      failsStandard,
    },
    pairs,
    criticalIssues,
    warnings,
    recommendations,
  };
}

/**
 * Check if pairs pass a specific standard
 */
function checkStandard(
  pairs: ColorPairValidation[],
  standard: AccessibilityStandard
): boolean {
  switch (standard) {
    case 'WCAG-2.1-AA':
      return pairs.every(p => p.passes.wcagAA);

    case 'WCAG-2.1-AAA':
      return pairs.every(p => p.passes.wcagAAA);

    case 'WCAG-3.0-Silver':
      // Silver requires Lc >= 60 for body text
      return pairs.every(p => p.apcaContrast.absoluteLc >= 60);

    case 'WCAG-3.0-Gold':
      // Gold requires Lc >= 75 for body text
      return pairs.every(p => p.apcaContrast.absoluteLc >= 75);

    case 'WCAG-3.0-Platinum':
      // Platinum requires Lc >= 90
      return pairs.every(p => p.apcaContrast.absoluteLc >= 90);

    case 'APCA-Fluent':
      return pairs.every(p => p.passes.apcaBody);

    case 'APCA-Body':
      return pairs.every(p => p.apcaContrast.absoluteLc >= 60);

    default:
      return false;
  }
}

// ============================================
// Specialized Validators
// ============================================

/**
 * Validate a brand color system
 */
export function validateBrandColorSystem(
  primaryColor: string,
  options: {
    accentColor?: string;
    neutralScale?: string[];
    surfaceColors?: string[];
  } = {}
): {
  isAccessible: boolean;
  primaryAnalysis: ColorPairValidation;
  accentAnalysis?: ColorPairValidation;
  recommendations: string[];
  suggestedAdjustments: {
    color: string;
    currentHex: string;
    suggestedHex: string;
    reason: string;
  }[];
} {
  const { accentColor, neutralScale = [], surfaceColors = ['#FFFFFF', '#0A0A0A'] } = options;

  const recommendations: string[] = [];
  const suggestedAdjustments: {
    color: string;
    currentHex: string;
    suggestedHex: string;
    reason: string;
  }[] = [];

  // Analyze primary
  const primaryOklch = OKLCH.fromHex(primaryColor);
  if (!primaryOklch) {
    throw new Error(`Invalid primary color: ${primaryColor}`);
  }

  const mode = detectContrastMode(primaryColor);

  // Test primary against surfaces
  const whiteContrast = validateColorPair(primaryColor, '#FFFFFF');
  const blackContrast = validateColorPair(primaryColor, '#0A0A0A');

  const primaryAnalysis = mode.mode === 'light-content' ? blackContrast : whiteContrast;

  // Check if primary needs adjustment
  if (!primaryAnalysis.passes.apcaSpot) {
    const oklch = OKLCH.fromHex(primaryColor)!;
    const adjusted = mode.mode === 'light-content'
      ? oklch.darken(0.1)
      : oklch.lighten(0.1);

    suggestedAdjustments.push({
      color: 'primary',
      currentHex: primaryColor,
      suggestedHex: adjusted.toHex(),
      reason: 'Insufficient contrast for UI components',
    });
  }

  // Analyze accent if provided
  let accentAnalysis: ColorPairValidation | undefined;

  if (accentColor) {
    const accentMode = detectContrastMode(accentColor);
    accentAnalysis = accentMode.mode === 'light-content'
      ? validateColorPair(accentColor, '#FFFFFF')
      : validateColorPair(accentColor, '#0A0A0A');

    if (!accentAnalysis.passes.apcaSpot) {
      const oklch = OKLCH.fromHex(accentColor)!;
      const adjusted = accentMode.mode === 'light-content'
        ? oklch.darken(0.1)
        : oklch.lighten(0.1);

      suggestedAdjustments.push({
        color: 'accent',
        currentHex: accentColor,
        suggestedHex: adjusted.toHex(),
        reason: 'Insufficient contrast for UI components',
      });
    }
  }

  // Generate recommendations
  if (mode.confidence < 0.7) {
    recommendations.push(
      'Primary color is near the light/dark boundary - test thoroughly with users'
    );
  }

  if (primaryOklch.c > 0.25) {
    recommendations.push(
      'High saturation primary - may cause eye strain in large areas. Consider reducing chroma for backgrounds.'
    );
  }

  const isAccessible = primaryAnalysis.passes.apcaSpot &&
    (!accentAnalysis || accentAnalysis.passes.apcaSpot);

  return {
    isAccessible,
    primaryAnalysis,
    accentAnalysis,
    recommendations,
    suggestedAdjustments,
  };
}

/**
 * Quick accessibility check for a color pair
 */
export function quickAccessibilityCheck(
  foreground: string,
  background: string
): {
  isAccessible: boolean;
  level: APCALevel;
  ratio: number;
  message: string;
} {
  const wcagRatio = calculateWcag21ContrastRatio(foreground, background);
  const apca = APCAContrast.calculate(foreground, background);

  const isAccessible = apca.absoluteLc >= 45;
  const level = apca.level;

  let message: string;
  if (level === 'excellent' || level === 'fluent') {
    message = 'Excellent contrast - suitable for all text sizes';
  } else if (level === 'body') {
    message = 'Good contrast - suitable for body text (18px+)';
  } else if (level === 'large') {
    message = 'Adequate contrast - suitable for large text only (24px+)';
  } else if (level === 'spot') {
    message = 'Limited contrast - icons and UI elements only';
  } else if (level === 'minimum') {
    message = 'Minimal contrast - decorative use only';
  } else {
    message = 'Insufficient contrast - not accessible';
  }

  return {
    isAccessible,
    level,
    ratio: wcagRatio,
    message,
  };
}

/**
 * Suggest accessible alternatives for a failing color pair
 */
export function suggestAccessibleAlternatives(
  foreground: string,
  background: string,
  targetLevel: APCALevel = 'body'
): {
  original: ColorPairValidation;
  adjustedForeground: { hex: string; validation: ColorPairValidation } | null;
  adjustedBackground: { hex: string; validation: ColorPairValidation } | null;
  bestOption: 'foreground' | 'background' | 'both' | 'none';
} {
  const original = validateColorPair(foreground, background);

  const targetLc = {
    fail: 0,
    minimum: 15,
    spot: 30,
    large: 45,
    body: 60,
    fluent: 75,
    excellent: 90,
  }[targetLevel];

  // Already meets target?
  if (original.apcaContrast.absoluteLc >= targetLc) {
    return {
      original,
      adjustedForeground: null,
      adjustedBackground: null,
      bestOption: 'none',
    };
  }

  // Try adjusting foreground
  const adjustedFgOklch = APCAContrast.findContrastingLightness(
    foreground,
    background,
    targetLc,
    'auto'
  );

  let adjustedForeground: { hex: string; validation: ColorPairValidation } | null = null;

  if (adjustedFgOklch) {
    const hex = adjustedFgOklch.toHex();
    adjustedForeground = {
      hex,
      validation: validateColorPair(hex, background),
    };
  }

  // Try adjusting background
  const adjustedBgOklch = APCAContrast.findContrastingLightness(
    background,
    foreground,
    targetLc,
    'auto'
  );

  let adjustedBackground: { hex: string; validation: ColorPairValidation } | null = null;

  if (adjustedBgOklch) {
    const hex = adjustedBgOklch.toHex();
    adjustedBackground = {
      hex,
      validation: validateColorPair(foreground, hex),
    };
  }

  // Determine best option
  let bestOption: 'foreground' | 'background' | 'both' | 'none' = 'none';

  if (adjustedForeground && adjustedBackground) {
    // Both work - pick the one with smaller change
    const fgDelta = Math.abs(
      OKLCH.fromHex(foreground)!.l - adjustedFgOklch!.l
    );
    const bgDelta = Math.abs(
      OKLCH.fromHex(background)!.l - adjustedBgOklch!.l
    );

    bestOption = fgDelta <= bgDelta ? 'foreground' : 'background';
  } else if (adjustedForeground) {
    bestOption = 'foreground';
  } else if (adjustedBackground) {
    bestOption = 'background';
  }

  return {
    original,
    adjustedForeground,
    adjustedBackground,
    bestOption,
  };
}

export default validateColorPair;
