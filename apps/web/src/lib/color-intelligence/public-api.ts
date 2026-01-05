// ============================================
// Color Intelligence - Public API
// Version: 5.0.0
// ============================================
//
// This is the STABLE public API for the Color Intelligence system.
// All exports here follow SemVer versioning and are safe to use
// in production applications.
//
// Breaking changes will only occur in major version bumps.
//
// For experimental features, see './experimental-api.ts'
//
// Phase 5 introduces: Standardization, Ecosystem & Perceptual Authority
// - Formal Perceptual Specifications (referenceable standards)
// - Conformance & Certification Engine (Bronze/Silver/Gold/Platinum)
// - Plugin & Extension Ecosystem (extensible hooks)
// - Regulatory Audit Trail (compliance-ready logging)
// - Reference Implementations & Golden Sets (conformance testing)
//
// ============================================

// ============================================
// Version Information
// ============================================

export const VERSION = '5.0.0';
export const API_VERSION = '5.0';

/**
 * API stability level
 */
export type StabilityLevel = 'stable' | 'beta' | 'experimental' | 'deprecated';

/**
 * Module information
 */
export interface ModuleInfo {
  readonly name: string;
  readonly version: string;
  readonly stability: StabilityLevel;
  readonly description: string;
}

/**
 * Get information about the Color Intelligence module
 */
export function getModuleInfo(): ModuleInfo {
  return {
    name: 'color-intelligence',
    version: VERSION,
    stability: 'stable',
    description: 'A comprehensive, perceptually-accurate color system built on OKLCH, HCT, and APCA',
  };
}

// ============================================
// Domain Layer - Value Objects (STABLE)
// ============================================

export { default as OKLCH } from './domain/value-objects/OKLCH';
export type { OKLCHValues, OKLabValues, RGBValues } from './domain/value-objects/OKLCH';

export { default as HCT } from './domain/value-objects/HCT';
export type { HCTValues } from './domain/value-objects/HCT';

export { default as APCAContrast, APCA_REQUIREMENTS } from './domain/value-objects/APCAContrast';
export type { APCALevel, APCAPolarity, APCARequirements } from './domain/value-objects/APCAContrast';

// ============================================
// Domain Layer - Entities (STABLE)
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
// Domain Layer - Decision Types (STABLE)
// ============================================

export type {
  ContrastDecision,
  ContrastDecisionRequest,
  WCAGLevel,
  WCAG3Tier,
  ViewingConditions,
  ReadabilityContext,
  ContrastPolarity,
  ConfidenceScore,
  PerceptualScore,
} from './domain/types/decision';

// ============================================
// Application Layer - Use Cases (STABLE)
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
// Application Layer - Governance (STABLE v4.0)
// ============================================

// Core governance components
export {
  GovernanceEngine,
  createGovernanceEngine,
  createEngineConfig,
} from './application/governance';
export type {
  GovernanceEngineConfig,
  GovernanceEngineEvent,
  GovernanceEngineEventType,
  GovernanceEngineEventListener,
  GovernanceEngineMetrics,
} from './application/governance';

// Policy registry
export {
  PolicyRegistry,
  createPolicyRegistry,
  createRegistryConfig,
} from './application/governance';
export type {
  PolicyRegistryConfig,
  PolicyRegistryEvent,
  PolicyRegistryEventType,
  PolicyRegistryEventListener,
  PolicyRegistryMetrics,
} from './application/governance';

// Policy types
export type {
  PerceptualPolicy,
  PolicyId,
  PolicyVersion,
  PolicyPriority,
  PolicyEnforcement,
  PolicyCategory,
  PolicyContext,
  PolicyMetadata,
  AccessibilityRequirements,
} from './application/governance';

// Policy composition
export type {
  CompositePolicy,
  PolicyRule,
  RuleId,
  RuleCombinator,
  PolicySet,
  ResolvedPolicy,
} from './application/governance';

// Evaluation types
export type {
  GovernanceOutcome,
  GovernanceEvaluation,
  PolicyEvaluationResult,
  PolicyViolation,
  AdjustmentSpecification,
  AppliedAdjustment,
  AuditEntry,
  GovernanceSummary,
} from './application/governance';

// Boundary types
export type {
  IGovernanceBoundary,
  GovernanceBoundaryRequest,
  GovernanceBoundaryResponse,
  GovernanceCheckResult,
  AdjustmentDelegation,
  AdjustmentDelegationResult,
} from './application/governance';

// Port types
export type {
  IDecisionEnginePort,
  IPolicyRepositoryPort,
} from './application/governance';

// Policy utilities
export {
  createPolicy,
  createPolicyContext,
  policyId,
  policyVersion,
  ruleId,
  createRule,
  createMinApcaLcRule,
  createMinContrastRatioRule,
  createMinWcagLevelRule,
  mergeRequirements,
  createPolicySet,
  isCompositePolicy,
  validatePolicy,
  contextMatches,
  createBoundaryRequest,
  createAdjustmentDelegation,
  validateBoundaryRequest,
  DEFAULT_ADJUSTMENT_CONSTRAINTS,
  createViolation,
  createAuditEntry,
  generateAuditHash,
  extractSummary,
  GovernanceBoundaryError,
  PolicyRepositoryError,
  DecisionEnginePortError,
} from './application/governance';

// ============================================
// Application Layer - AI Contracts (STABLE v4.0)
// ============================================

// Contract generation
export {
  AIActionContractGenerator,
  createContractGenerator,
  generateContractFromPolicy,
  generateDefaultContract,
  validateAction,
} from './application/ai-contracts';

// Constraint generation
export {
  ConstraintGenerator,
  createConstraintGenerator,
} from './application/ai-contracts';

// Factory functions
export {
  createQuickContract,
  createStrictContract,
  createLenientContract,
  createBrandContract,
} from './application/ai-contracts';

// Utilities
export {
  isContractExpired,
  getContractValidityRemaining,
  formatContractValidity,
  mergeContracts,
  createContractId,
  isAIActionContract,
  isAIAction,
} from './application/ai-contracts';

// Constants
export {
  AI_CONTRACTS_VERSION,
  SUPPORTED_CONTRACT_VERSION,
  DEFAULT_WCAG3_TIER,
  DEFAULT_WCAG_LEVEL,
  APCA_TIER_THRESHOLDS,
  WCAG_CONTRAST_REQUIREMENTS,
} from './application/ai-contracts';

// Contract types
export type {
  AIActionContract,
  ContractVersion,
  ContractId,
  ContractMetadata,
  ContractGenerationOptions,
  AIActionType,
  AIAction,
  ActionParameter,
  ParameterValidation,
  ActionConstraints,
  ActionExample,
  PerceptualConstraints,
  ProtectedColor,
  AdjustmentBounds,
  NumericBounds,
  ActionValidationResult,
  ActionViolation,
  PromptFormat,
  PromptGenerationOptions,
  GeneratedPrompt,
  JSONSchemaObject,
  JSONSchemaProperty,
  IContractFactory,
  IContractValidator,
  IPromptGenerator,
} from './application/ai-contracts';

// JSON Schema exports
export {
  aiActionContractSchema,
  contractVersionSchema,
  contractIdSchema,
  wcag3TierSchema,
  wcagLevelSchema,
  actionTypeSchema,
  numericBoundsSchema,
  protectedColorSchema,
  perceptualConstraintsSchema,
  adjustmentBoundsSchema,
  actionParameterSchema,
  actionExampleSchema,
  aiActionSchema,
  contractMetadataSchema,
  adjustLightnessSchema,
  adjustChromaSchema,
  optimizeContrastSchema,
  generatePaletteSchema,
  validateContractSchema,
  getActionSchema,
  getAllActionSchemas,
  getSchemaByPath,
  schemaRegistry,
} from './application/ai-contracts';
export type {
  SchemaValidationResult,
  SchemaValidationError,
} from './application/ai-contracts';

// ============================================
// Infrastructure Layer - Adapters (STABLE)
// ============================================

export { CssOutputAdapter, cssAdapter } from './infrastructure/adapters/CssOutputAdapter';
export type {
  CssOutputOptions,
  ThemeVariableConfig,
} from './infrastructure/adapters/CssOutputAdapter';

// ============================================
// Infrastructure Layer - Exporters (STABLE v4.0)
// ============================================

// Base exporter
export { BaseExporter } from './infrastructure/exporters';

// Format-specific exporters
export {
  DesignTokensExporter,
  createDesignTokensExporter,
  StyleDictionaryExporter,
  createStyleDictionaryExporter,
  FigmaTokensExporter,
  createFigmaTokensExporter,
  TailwindExporter,
  createTailwindExporter,
  CSSVariablesExporter,
  createCSSVariablesExporter,
} from './infrastructure/exporters';

// Exporter factory and utilities
export {
  createExporter,
  getSupportedFormats,
  isFormatSupported,
  registerExporter,
  unregisterExporter,
  batchExport,
  validateTokens,
  validateAllFormats,
  getFormatInfo,
  getAllFormatInfo,
  EXPORTERS_VERSION,
  DEFAULT_EXPORT_OPTIONS,
} from './infrastructure/exporters';

// Exporter types
export type {
  ITokenExporter,
  ExportFormat,
  ExportOptions,
  ExportResult,
  GovernedExportResult,
  ExportMetadata,
  ExportFile,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TokenPalette,
  TokenGroup,
  Token,
  ColorToken,
  DimensionToken,
  TypographyToken,
  ShadowToken,
  ColorSpaceExport,
  DTCGRoot,
  DTCGToken,
  DTCGTokenGroup,
  StyleDictionaryToken,
  StyleDictionaryProperties,
  StyleDictionaryConfig,
  StyleDictionaryPlatform,
  FigmaToken,
  FigmaTokenSet,
  TailwindConfig,
  TailwindThemeExtend,
  TailwindColorConfig,
  CSSVariable,
  CSSVariablesBlock,
  BatchExportOptions,
  BatchExportResult,
  FormatInfo,
} from './infrastructure/exporters';

// ============================================
// Infrastructure Layer - Cache (STABLE)
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
// Phase 5: Standardization Layer (STABLE v5.0)
// ============================================

// Specification Module Info
export {
  SPECIFICATION_VERSION,
  SPECIFICATION_DATE,
  getSpecificationInfo,
} from './domain/specification';

// ============================================
// Phase 5: Specification Types (STABLE v5.0)
// ============================================

// Core Specification Types
export type {
  SpecificationId,
  SpecificationScope,
  SpecificationStatus,
  ExternalReference,
  SpecificationGuarantee,
  SpecificationNonGoal,
  PerceptualSpecification,
  ConformanceLevelDefinition,
  ConformanceLevel,
  ConformanceRequirement,
  SpecificationChange,
  ISpecificationRegistry,
  SpecificationListOptions,
  CreateSpecificationConfig,
} from './domain/specification';

export {
  createSpecificationId,
  isValidSpecificationId,
  createSpecification,
  createGuarantee,
  createNonGoal,
  createReference,
  isPerceptualSpecification,
  isConformanceLevel,
} from './domain/specification';

// Conformance & Certification Types
export type {
  ConformanceReportId,
  ConformanceResult,
  ViolationSeverity,
  ConformanceTestResult,
  ConformanceViolation,
  ConformanceViolationLocation,
  ConformanceReport,
  EvaluatedArtifact,
  ConformanceLevelResult,
  ViolationSummary,
  EvaluationEnvironment,
  ConformanceCertification,
  CertificationIssuer,
  CertificationScope,
  ConformanceEvaluationConfig,
  ConformanceEvaluationInput,
  EvaluationArtifact,
  ConformanceContext,
  IConformanceEngine,
  ConformanceReportFormat,
  IConformanceReportFormatter,
} from './domain/specification';

export {
  createConformanceReportId,
  createViolation as createConformanceViolation,
  createTestResult,
  calculateViolationSummary,
  isConformanceReport,
  isConformanceViolation,
} from './domain/specification';

// Audit & Regulatory Types
export type {
  AuditCategory,
  AuditSeverity,
  AuditInput,
  AuditOutput,
  AuditPolicyContext,
  DecisionExplanation,
  DecisionFactor,
  DecisionAlternative,
  AuditMetadata,
  AuditTrail,
  AuditTrailMetadata,
  IAuditTrailManager,
  AuditQueryFilter,
  AuditExportFormat,
  AuditVerificationResult,
  AuditVerificationIssue,
  ReproducibilityRecord,
  IReproducibilityChecker,
  RegulatoryFramework,
  RegulatoryRequirement,
  RegulatoryComplianceReport,
  RegulatoryRequirementResult,
} from './domain/specification';

export {
  createAuditEntryId,
  createAuditEntry as createSpecAuditEntry,
  createDecisionExplanation,
  createDecisionFactor,
  computeHash,
  isAuditEntry as isSpecAuditEntry,
  isAuditTrail,
  isDecisionExplanation,
} from './domain/specification';

// Plugin & Extension Types
export type {
  PluginId,
  PluginCategory,
  PluginState,
  PluginCapabilities,
  ColorIntelligencePlugin,
  PluginDependency,
  PluginConfigSchema,
  PluginConfigProperty,
  PolicyViolationDeclaration,
  PluginHooks,
  HookContext,
  PluginLoadHook,
  PluginUnloadHook,
  PluginErrorHook,
  BeforeDecisionHook,
  AfterDecisionHook,
  BeforeExportHook,
  AfterExportHook,
  AfterGovernanceHook,
  BeforeValidationHook,
  AfterValidationHook,
  DecisionHookInput,
  DecisionHookOutput,
  ExportHookInput,
  ExportHookOutput,
  GovernanceHookInput,
  GovernanceHookOutput,
  ValidationHookInput,
  ValidationHookOutput,
  IPluginManager,
  PluginListOptions,
  PluginInfo,
  PluginCompatibilityResult,
  PluginCompatibilityIssue,
  ConfigValidationResult,
  ConfigValidationError,
  CreatePluginConfig,
} from './domain/specification';

export {
  createPluginId,
  isValidPluginId,
  createPlugin,
  createSimplePlugin,
  isColorIntelligencePlugin,
  hasPluginHook,
} from './domain/specification';

// ============================================
// Phase 5: Reference Implementations (STABLE v5.0)
// ============================================

// Golden Sets
export {
  APCA_CONTRAST_GOLDEN_SET,
  OKLCH_CONVERSION_GOLDEN_SET,
  HCT_CONVERSION_GOLDEN_SET,
  TOKEN_GENERATION_GOLDEN_SET,
  GOVERNANCE_GOLDEN_SET,
  ALL_GOLDEN_SETS,
  REFERENCE_PALETTES,
  getGoldenSet,
  getGoldenSetsByCategory,
  getTotalTestCaseCount,
  getEssentialTestCases,
  createGoldenSetId,
} from './domain/specification';

export type {
  GoldenSetId,
  ReferencePalette,
} from './domain/specification';

// Reference Implementations
export {
  APCAReferenceImplementation,
  OKLCHReferenceImplementation,
  HCTReferenceImplementation,
  WCAG21ReferenceImplementation,
  REFERENCE_IMPLEMENTATIONS,
} from './domain/specification';

export type {
  ReferenceImplementationType,
} from './domain/specification';

// ============================================
// Phase 5: Conformance Engine (STABLE v5.0)
// ============================================

export {
  ConformanceEngine,
  createConformanceEngine,
} from './application/conformance';

// ============================================
// Phase 5: Plugin Manager (STABLE v5.0)
// ============================================

export {
  PluginManager,
  createPluginManager,
} from './application/plugins';

// ============================================
// Phase 5: Audit Trail (STABLE v5.0)
// ============================================

export {
  AuditTrailService,
  createAuditTrailService,
  createAuditEntryId as createAuditId,
} from './infrastructure/audit';

export type {
  AuditEntryId as InfraAuditEntryId,
  IAuditStoragePort,
  AuditTrailConfig,
} from './infrastructure/audit';

export {
  InMemoryAuditStorage,
  createInMemoryAuditStorage,
} from './infrastructure/audit';

// ============================================
// Convenience Functions (STABLE)
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
 * @stable
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
 * @stable
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

  const variables: Record<string, string> = {};
  const varMatches = Array.from(css.matchAll(/(--[\w-]+):\s*([^;]+);/g));
  for (const match of varMatches) {
    if (match[1] && match[2]) {
      variables[match[1]] = match[2].trim();
    }
  }

  return {
    css,
    analysis,
    variables,
  };
}

/**
 * Create a perceptually uniform gradient
 * @stable
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
 * @stable
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
 * @stable
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
 * @stable
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
 * @stable
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
 * @stable
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
 * @stable
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
// Default Export
// ============================================

// Phase 5 imports for default export
import { getSpecificationInfo } from './domain/specification';
import { createConformanceEngine, ConformanceEngine } from './application/conformance';
import { createPluginManager, PluginManager } from './application/plugins';
import { createAuditTrailService, AuditTrailService } from './infrastructure/audit';
import { createInMemoryAuditStorage, InMemoryAuditStorage } from './infrastructure/audit';
import {
  APCAReferenceImplementation,
  OKLCHReferenceImplementation,
  HCTReferenceImplementation,
  WCAG21ReferenceImplementation,
  ALL_GOLDEN_SETS,
} from './domain/specification';

/**
 * Color Intelligence default export
 *
 * Provides convenient access to all major functionality
 * through a single import.
 *
 * @example
 * ```typescript
 * import ColorIntelligence from '@lib/color-intelligence/public-api';
 *
 * // Color analysis
 * const analysis = ColorIntelligence.analyzeColor('#1E40AF');
 * const theme = ColorIntelligence.generateBrandTheme('#1E40AF');
 * const isOk = ColorIntelligence.isAccessible('#FFFFFF', '#1E40AF', 'AA');
 *
 * // Phase 5: Conformance & Certification
 * const conformance = ColorIntelligence.createConformanceEngine();
 * const report = await conformance.evaluate({
 *   subject: myImplementation,
 *   targetLevel: 'gold',
 * });
 *
 * // Phase 5: Plugin System
 * const plugins = ColorIntelligence.createPluginManager();
 * await plugins.load(myPlugin);
 *
 * // Phase 5: Audit Trail
 * const storage = ColorIntelligence.createInMemoryAuditStorage();
 * const audit = ColorIntelligence.createAuditTrailService({ storage });
 * await audit.logDecision({ decisionId: 'xyz', ... });
 * ```
 */
export default {
  // Module info
  VERSION,
  API_VERSION,
  getModuleInfo,
  getSpecificationInfo,

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

  // Phase 5: Standardization Layer
  // Conformance Engine
  ConformanceEngine,
  createConformanceEngine,

  // Plugin Manager
  PluginManager,
  createPluginManager,

  // Audit Trail
  AuditTrailService,
  createAuditTrailService,
  InMemoryAuditStorage,
  createInMemoryAuditStorage,

  // Reference Implementations
  APCAReferenceImplementation,
  OKLCHReferenceImplementation,
  HCTReferenceImplementation,
  WCAG21ReferenceImplementation,
  ALL_GOLDEN_SETS,
};

// ============================================
// API Documentation
// ============================================

/**
 * @module color-intelligence/public-api
 *
 * # Color Intelligence - Public API v5.0
 *
 * A comprehensive, perceptually-accurate color system built on
 * OKLCH, HCT, and APCA for modern web applications.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   analyzeColor,
 *   isAccessible,
 *   generateBrandTheme,
 *   GovernanceEngine,
 *   createExporter,
 *   AIActionContractGenerator,
 *   // Phase 5 imports
 *   createConformanceEngine,
 *   createPluginManager,
 *   createAuditTrailService,
 *   createInMemoryAuditStorage,
 *   APCAReferenceImplementation,
 * } from '@lib/color-intelligence/public-api';
 *
 * // Analyze a color
 * const analysis = analyzeColor('#1E40AF');
 * console.log(analysis.contrastMode.mode); // 'light-content'
 *
 * // Check accessibility
 * if (isAccessible('#FFFFFF', '#1E40AF', 'AAA')) {
 *   console.log('Passes WCAG AAA');
 * }
 *
 * // Generate a brand theme
 * const theme = generateBrandTheme('#1E40AF', { mode: 'dark' });
 *
 * // Use governance engine (Phase 4)
 * const engine = new GovernanceEngine(registry, port);
 * const result = await engine.evaluate(request);
 *
 * // Export tokens (Phase 4)
 * const exporter = createExporter('tailwind');
 * const tokens = exporter.export(palette);
 *
 * // Generate AI contracts (Phase 4)
 * const generator = new AIActionContractGenerator();
 * const contract = generator.generateFromPolicy(policy);
 * const prompt = generator.toSystemPrompt(contract);
 *
 * // Phase 5: Conformance & Certification
 * const conformance = createConformanceEngine();
 * const report = await conformance.evaluate({
 *   subject: myImplementation,
 *   targetLevel: 'gold',
 * });
 *
 * // Phase 5: Plugin System
 * const plugins = createPluginManager();
 * await plugins.load(myPlugin);
 * await plugins.executeHook('afterDecision', context);
 *
 * // Phase 5: Audit Trail
 * const storage = createInMemoryAuditStorage();
 * const audit = createAuditTrailService({ storage });
 * await audit.logDecision({
 *   decisionId: 'decision-123',
 *   decisionType: 'contrast',
 *   input: { foreground: '#FFFFFF', background: '#1E40AF' },
 *   output: { lc: 75.5, tier: 'gold' },
 * });
 *
 * // Phase 5: Reference Implementations (for conformance testing)
 * const lc = APCAReferenceImplementation.calculateLc(0, 0, 0, 255, 255, 255);
 * console.log(`Canonical APCA Lc: ${lc}`); // ~106.04
 * ```
 *
 * ## Modules
 *
 * ### Domain Layer (Stable)
 * - **OKLCH**: Perceptually uniform color space
 * - **HCT**: Hue, Chroma, Tone (Material Design 3)
 * - **APCAContrast**: Advanced Perceptual Contrast Algorithm
 * - **Gradient**: Perceptually uniform gradients
 *
 * ### Application Layer (Stable)
 * - **DetectContrastMode**: Determine light/dark content
 * - **GenerateAdaptiveGradient**: Create smart gradients
 * - **ValidateAccessibility**: WCAG 2.1 & APCA validation
 * - **GovernanceEngine**: Policy-based governance (v4.0)
 * - **PolicyRegistry**: Policy lifecycle management (v4.0)
 * - **AIActionContractGenerator**: AI agent contracts (v4.0)
 * - **ConformanceEngine**: Conformance validation & certification (v5.0)
 * - **PluginManager**: Plugin lifecycle & hook execution (v5.0)
 *
 * ### Infrastructure Layer (Stable)
 * - **CssOutputAdapter**: CSS variable generation
 * - **ColorCache**: Performance optimization
 * - **Exporters**: Multi-format token export (v4.0)
 *   - Design Tokens (W3C DTCG)
 *   - Style Dictionary (Amazon)
 *   - Figma Tokens
 *   - Tailwind CSS
 *   - CSS Variables
 * - **AuditTrailService**: Regulatory audit logging (v5.0)
 * - **InMemoryAuditStorage**: Dev/test audit storage (v5.0)
 *
 * ### Specification Layer (v5.0)
 * - **Perceptual Specifications**: Formal referenceable standards
 * - **Conformance Levels**: Bronze, Silver, Gold, Platinum
 * - **Reference Implementations**: Canonical algorithms
 * - **Golden Sets**: Conformance test vectors
 * - **Plugin Ecosystem**: Extensible hook system
 * - **Regulatory Compliance**: WCAG, Section 508, EN 301 549
 *
 * ## Versioning
 *
 * This module follows Semantic Versioning:
 * - **Major (5.x.x)**: Breaking changes
 * - **Minor (x.1.x)**: New features, backward compatible
 * - **Patch (x.x.1)**: Bug fixes, backward compatible
 *
 * ## What's New in v5.0
 *
 * v5.0 introduces the **Standardization, Ecosystem & Perceptual Authority**
 * layer with no breaking changes to existing APIs. All v4.x code continues
 * to work.
 *
 * ### New Features:
 * - **Conformance Engine**: Validate implementations against spec
 * - **Certification System**: Bronze/Silver/Gold/Platinum levels
 * - **Plugin System**: Extensible hooks for all decision points
 * - **Audit Trail**: Full decision logging for regulatory compliance
 * - **Reference Implementations**: Canonical APCA, OKLCH, HCT algorithms
 * - **Golden Sets**: Pre-validated test vectors for conformance testing
 *
 * ## See Also
 *
 * - `./experimental-api.ts` - Experimental features
 * - `./domain/governance` - Governance types
 * - `./domain/specification` - Specification types (v5.0)
 * - `./application/governance` - Governance engine
 * - `./application/ai-contracts` - AI contracts
 * - `./application/conformance` - Conformance engine (v5.0)
 * - `./application/plugins` - Plugin manager (v5.0)
 * - `./infrastructure/exporters` - Token exporters
 * - `./infrastructure/audit` - Audit trail (v5.0)
 */
