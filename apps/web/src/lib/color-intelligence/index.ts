// ============================================
// Color Intelligence Domain - Public API
// ============================================
//
// A comprehensive, perceptually-accurate color system
// built on OKLCH, HCT, and APCA for modern web applications.
//
// Reference Implementation 2026
// Version: 4.0.0 (Phase 4: Governance & Adoption Layer)
//
// For the full stable API with versioning guarantees,
// import from './public-api.ts' instead.
//
// ============================================

// ============================================
// Re-export from Public API (recommended)
// ============================================

export { VERSION, API_VERSION, getModuleInfo } from './public-api';

// ============================================
// Domain Layer - Value Objects
// ============================================

export { default as OKLCH } from './domain/value-objects/OKLCH';
export type { OKLCHValues, OKLabValues, RGBValues } from './domain/value-objects/OKLCH';

export { default as HCT } from './domain/value-objects/HCT';
export type { HCTValues } from './domain/value-objects/HCT';

export { default as APCAContrast, APCA_REQUIREMENTS } from './domain/value-objects/APCAContrast';
export type { APCALevel, APCAPolarity, APCARequirements } from './domain/value-objects/APCAContrast';

// ============================================
// Domain Layer - Entities
// ============================================

export { Gradient } from './domain/entities/Gradient';
export type {
  ColorStop,
  GradientOptions,
  HuePath,
  GamutStrategy,
  LightnessCurve,
  ChromaBehavior,
} from './domain/entities/Gradient';

// ============================================
// Application Layer - Use Cases
// ============================================

// Contrast Mode Detection
export {
  detectContrastMode,
  detectContrastModeQuick,
  detectContrastModeBatch,
  getOptimalForegroundPair,
  analyzeBrandColor,
} from './application/DetectContrastMode';
export type {
  ContrastMode,
  ContrastModeResult,
  DetectionWeights,
  DetectionFactors,
  DetectContrastModeConfig,
} from './application/DetectContrastMode';

// Adaptive Gradient Generation
export {
  generateAdaptiveGradient,
  generateSmartGlassGradient,
  generateButtonGradient,
  generateCardHighlightGradient,
} from './application/GenerateAdaptiveGradient';
export type {
  GradientPreset,
  AdaptiveGradientConfig,
  AdaptiveGradientResult,
} from './application/GenerateAdaptiveGradient';

// Accessibility Validation
export {
  validateColorPair,
  validatePalette,
  validateBrandColorSystem,
  quickAccessibilityCheck,
  suggestAccessibleAlternatives,
} from './application/ValidateAccessibility';
export type {
  AccessibilityStandard,
  ColorUseCase,
  ColorPairValidation,
  PaletteValidationResult,
  PaletteValidationInput,
} from './application/ValidateAccessibility';

// ============================================
// Infrastructure Layer - Adapters
// ============================================

export { CssOutputAdapter, cssAdapter } from './infrastructure/adapters/CssOutputAdapter';
export type {
  CssOutputOptions,
  ThemeVariableConfig,
} from './infrastructure/adapters/CssOutputAdapter';

// ============================================
// Infrastructure Layer - Cache
// ============================================

export {
  ColorCache,
  getColorCache,
  resetColorCache,
  cached,
} from './infrastructure/cache/ColorCache';
export type {
  ColorCacheConfig,
  CacheStats,
} from './infrastructure/cache/ColorCache';

// ============================================
// Convenience Functions
// ============================================

import OKLCH from './domain/value-objects/OKLCH';
import HCT from './domain/value-objects/HCT';
import APCAContrast from './domain/value-objects/APCAContrast';
import { Gradient } from './domain/entities/Gradient';
import { detectContrastMode, analyzeBrandColor } from './application/DetectContrastMode';
import { generateAdaptiveGradient } from './application/GenerateAdaptiveGradient';
import { validateColorPair, quickAccessibilityCheck } from './application/ValidateAccessibility';
import { CssOutputAdapter } from './infrastructure/adapters/CssOutputAdapter';
import { getColorCache } from './infrastructure/cache/ColorCache';

/**
 * Quick color analysis - returns all relevant information
 */
export function analyzeColor(hex: string): {
  oklch: OKLCH | null;
  hct: HCT | null;
  contrastMode: ReturnType<typeof detectContrastMode>;
  optimalTextColor: string;
  wcag21ContrastOnWhite: number;
  wcag21ContrastOnBlack: number;
  apcaOnWhite: number;
  apcaOnBlack: number;
} {
  const cache = getColorCache();

  const oklch = cache.getOklch(hex);
  const hct = cache.getHct(hex);
  const contrastMode = detectContrastMode(hex);

  const apcaWhite = cache.getApca(hex, '#FFFFFF');
  const apcaBlack = cache.getApca(hex, '#000000');

  // Calculate WCAG ratios
  const checkWhite = quickAccessibilityCheck(hex, '#FFFFFF');
  const checkBlack = quickAccessibilityCheck(hex, '#000000');

  return {
    oklch,
    hct,
    contrastMode,
    optimalTextColor: contrastMode.mode === 'light-content' ? '#0A0A0A' : '#FFFFFF',
    wcag21ContrastOnWhite: checkWhite.ratio,
    wcag21ContrastOnBlack: checkBlack.ratio,
    apcaOnWhite: apcaWhite.absoluteLc,
    apcaOnBlack: apcaBlack.absoluteLc,
  };
}

/**
 * Generate a complete brand theme from a single color
 */
export function generateBrandTheme(
  primaryColor: string,
  options: {
    accentColor?: string;
    mode?: 'light' | 'dark' | 'auto';
    format?: 'oklch' | 'hsl' | 'rgb' | 'hex';
  } = {}
): {
  css: string;
  analysis: ReturnType<typeof analyzeBrandColor>;
  variables: Record<string, string>;
} {
  const { mode = 'auto', format = 'oklch' } = options;

  const analysis = analyzeBrandColor(primaryColor, options.accentColor);

  const adapter = new CssOutputAdapter({
    format,
    includeFallback: true,
    includeComments: true,
  });

  const css = adapter.generateThemeCss(primaryColor, {
    accentColor: options.accentColor,
    mode,
  });

  // Extract variables from the generated CSS
  const variables: Record<string, string> = {};
  const varMatches = Array.from(css.matchAll(/(--[\w-]+):\s*([^;]+);/g));
  for (const match of varMatches) {
    variables[match[1]!] = match[2]!.trim();
  }

  return {
    css,
    analysis,
    variables,
  };
}

/**
 * Create a perceptually uniform gradient
 */
export function createGradient(
  startColor: string,
  endColor: string,
  options: {
    steps?: number;
    type?: 'linear' | 'radial';
    angle?: number;
  } = {}
): {
  css: string;
  stops: Array<{ position: number; color: string }>;
  analysis: ReturnType<typeof generateAdaptiveGradient>['analysis'];
} {
  const result = generateAdaptiveGradient({
    preset: 'custom',
    primaryColor: startColor,
    secondaryColor: endColor,
    steps: options.steps ?? 5,
    type: options.type ?? 'linear',
    angle: options.angle ?? 180,
  });

  return {
    css: result.css,
    stops: result.stops.map(s => ({
      position: s.position,
      color: s.color,
    })),
    analysis: result.analysis,
  };
}

/**
 * Check if a color combination is accessible
 */
export function isAccessible(
  foreground: string,
  background: string,
  level: 'minimum' | 'AA' | 'AAA' = 'AA'
): boolean {
  const validation = validateColorPair(foreground, background);

  switch (level) {
    case 'minimum':
      return validation.apcaContrast.absoluteLc >= 30;
    case 'AA':
      return validation.passes.wcagAA || validation.passes.apcaLarge;
    case 'AAA':
      return validation.passes.wcagAAA || validation.passes.apcaBody;
    default:
      return false;
  }
}

/**
 * Find the best text color for a background
 */
export function getTextColor(
  background: string,
  options: {
    preferDark?: boolean;
    minContrast?: number;
  } = {}
): {
  color: string;
  contrast: number;
  isAccessible: boolean;
} {
  const { preferDark = true, minContrast = 60 } = options;

  const optimal = APCAContrast.findOptimalTextColor(background, {
    preferDark,
    minLc: minContrast,
  });

  return {
    color: optimal.color,
    contrast: optimal.contrast.absoluteLc,
    isAccessible: optimal.contrast.absoluteLc >= 60,
  };
}

/**
 * Interpolate between two colors
 */
export function interpolateColor(
  startColor: string,
  endColor: string,
  t: number
): string {
  const start = OKLCH.fromHex(startColor);
  const end = OKLCH.fromHex(endColor);

  if (!start || !end) {
    throw new Error('Invalid color input');
  }

  return OKLCH.interpolate(start, end, t, 'shorter').toHex();
}

/**
 * Adjust a color's lightness
 */
export function adjustLightness(
  color: string,
  delta: number
): string {
  const oklch = OKLCH.fromHex(color);
  if (!oklch) throw new Error('Invalid color');

  if (delta > 0) {
    return oklch.lighten(delta).toHex();
  } else {
    return oklch.darken(Math.abs(delta)).toHex();
  }
}

/**
 * Adjust a color's saturation (chroma)
 */
export function adjustSaturation(
  color: string,
  delta: number
): string {
  const oklch = OKLCH.fromHex(color);
  if (!oklch) throw new Error('Invalid color');

  if (delta > 0) {
    return oklch.saturate(delta).toHex();
  } else {
    return oklch.desaturate(Math.abs(delta)).toHex();
  }
}

/**
 * Get a tonal palette from a color (Material Design 3 style)
 */
export function getTonalPalette(
  color: string
): Map<number, string> {
  const hct = HCT.fromHex(color);
  if (!hct) throw new Error('Invalid color');

  const palette = hct.generateTonalPalette();
  const result = new Map<number, string>();

  for (const [tone, hctColor] of Array.from(palette.entries())) {
    result.set(tone, hctColor.toHex());
  }

  return result;
}

// ============================================
// Phase 4: Governance Layer
// ============================================

export {
  // Engine & Registry
  GovernanceEngine,
  createGovernanceEngine,
  PolicyRegistry,
  createPolicyRegistry,

  // Policy creation
  createPolicy,
  createPolicyContext,
  policyId,
  policyVersion,

  // Rule creation
  createRule,
  createMinApcaLcRule,
  createMinContrastRatioRule,
  createMinWcagLevelRule,

  // Utilities
  validatePolicy,
  contextMatches,
  isCompositePolicy,
} from './application/governance';

export type {
  PerceptualPolicy,
  PolicyId,
  PolicyVersion,
  PolicyContext,
  PolicyPriority,
  PolicyEnforcement,
  GovernanceOutcome,
  GovernanceEvaluation,
  PolicyViolation,
  WCAGLevel,
  WCAG3Tier,
} from './application/governance';

// ============================================
// Phase 4: AI Action Contracts
// ============================================

export {
  AIActionContractGenerator,
  createContractGenerator,
  generateContractFromPolicy,
  generateDefaultContract,
  validateAction,
  createQuickContract,
  createStrictContract,
  createLenientContract,
  createBrandContract,
  APCA_TIER_THRESHOLDS,
  WCAG_CONTRAST_REQUIREMENTS,
} from './application/ai-contracts';

export type {
  AIActionContract,
  AIAction,
  AIActionType,
  PerceptualConstraints,
  AdjustmentBounds,
  ProtectedColor,
  ActionValidationResult,
} from './application/ai-contracts';

// ============================================
// Phase 4: Design Tooling Exporters
// ============================================

export {
  createExporter,
  getSupportedFormats,
  batchExport,
  DesignTokensExporter,
  StyleDictionaryExporter,
  FigmaTokensExporter,
  TailwindExporter,
  CSSVariablesExporter,
} from './infrastructure/exporters';

export type {
  ITokenExporter,
  ExportFormat,
  ExportOptions,
  ExportResult,
  TokenPalette,
} from './infrastructure/exporters';

// ============================================
// Phase 5: Conformance Engine
// ============================================

export {
  ConformanceEngine,
  createConformanceEngine,
} from './application/conformance';

// ============================================
// Phase 5: Audit Trail
// ============================================

export {
  AuditTrailService,
  createAuditTrailService,
} from './infrastructure/audit';

export {
  InMemoryAuditStorage,
  createInMemoryAuditStorage,
} from './infrastructure/audit';

export type {
  AuditEntryId,
  IAuditStoragePort,
  AuditTrailConfig,
} from './infrastructure/audit';

// ============================================
// Phase 5: Specification Types
// ============================================

export type {
  ConformanceLevel,
  ConformanceReport,
  AuditTrail,
} from './domain/specification';

// ============================================
// Default Export
// ============================================

export default {
  // Value Objects
  OKLCH,
  HCT,
  APCAContrast,
  Gradient,

  // Use Cases
  detectContrastMode,
  analyzeBrandColor,
  generateAdaptiveGradient,
  validateColorPair,

  // Convenience
  analyzeColor,
  generateBrandTheme,
  createGradient,
  isAccessible,
  getTextColor,
  interpolateColor,
  adjustLightness,
  adjustSaturation,
  getTonalPalette,

  // Infrastructure
  getColorCache,
};
