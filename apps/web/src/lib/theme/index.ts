// ============================================
// Theme System - Public API
// ============================================

// Types
export type {
  RGB,
  HSL,
  ColorInfo,
  ColorValidation,
  LogoConfig,
  BrandingColors,
  BrandingTypography,
  BrandingShapes,
  BrandingMeta,
  TenantBranding,
  SimpleBranding,
  TenantThemeContextValue,
} from './types';

// Image color extraction types
export type {
  ExtractedColor,
  SemanticBrandPalette,
  // Perceptual Color Types (from UI-Kit integration)
  OKLCH as PerceptualOKLCH,
  PerceptualColorInfo,
  ApcaContrastResult,
  PerceptualAccessibility,
} from './color-utils';

// Constants
export { DEFAULT_BRANDING, BORDER_RADIUS_MAP } from './types';

// Color Utilities
export {
  // Conversion
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  hexToHslString,
  hexToHsl,
  hexToRgba,

  // WCAG Validation
  getRelativeLuminance,
  getContrastRatio,
  checkWcagContrast,
  getOptimalForeground,
  getWcagLevel,

  // Color Manipulation
  lighten,
  darken,
  saturate,
  desaturate,
  getComplementary,
  getAnalogous,
  getTriadic,
  mixColors,

  // Palette Generation
  generatePalette,
  generateSemanticVariants,

  // Validation
  isValidHex,
  normalizeHex,
  validateColor,

  // CSS Helpers
  setCssVariable,
  removeCssVariable,
  getCssVariable,

  // Image Color Extraction
  extractColorsFromImage,
  suggestBrandColors,

  // 4-Color Semantic Palette
  suggest4ColorPalette,
  deriveFullPaletteFromPrimary,

  // ============================================
  // Perceptual Color Functions (OKLCH-based)
  // Enhanced color operations using ColorBridge
  // ============================================

  // OKLCH Conversion (via ColorBridge)
  hexToOklch as perceptualHexToOklch,
  oklchToHex as perceptualOklchToHex,

  // Perceptual Color Info
  getPerceptualInfo,

  // Perceptual Manipulation (uniform lightness/chroma)
  perceptualLighten,
  perceptualDarken,
  perceptualSaturate,
  perceptualDesaturate,
  perceptualRotateHue,

  // APCA Contrast (WCAG 3.0 via ColorBridge)
  getApcaContrast as getPerceptualApcaContrast,
  validateAccessibility,
  getOptimalForegroundApca,

  // Perceptual Palette Generation
  generatePerceptualPalette,
  generatePerceptualScale,
  generatePerceptualSemanticVariants,
  derivePerceptualPaletteFromPrimary,
} from './color-utils';

// Provider & Hooks
export {
  TenantThemeProvider,
  useTenantTheme,
  useTenantThemeOptional,
} from './tenant-theme-provider';

// Governance Provider & Hooks
export {
  GovernanceProvider,
  useGovernance,
  useGovernanceOptional,
  useAccessibilityValidation,
  useGovernanceViolations,
  useThemeDerivation,
  useApcaContrast,
  GovernanceGate,
} from './GovernanceProvider';

export type {
  GovernanceContextValue,
  GovernanceEvaluationState,
  GovernanceProviderProps,
} from './GovernanceProvider';

// Design Tokens (Static CSS Variable References)
export {
  colors,
  spacing,
  radius,
  shadows,
  transitions,
  glass,
  typography,
  statusClasses,
  priorityClasses,
  tokens,
  // Responsive utilities
  breakpoints,
  responsiveSpacing,
  touchTargets,
  responsiveVisibility,
  responsiveCardClasses,
  // Integration tokens
  integrationColors,
  integrationClasses,
} from './tokens';

// Token Collection Functions (TokenBridge integration)
export {
  // Collection access
  getTokenCollection,
  getToken,
  queryTokens,
  // Token derivation
  deriveColorScale,
  deriveStateTokens,
  deriveComponentTokens,
  deriveThemeTokens,
  // Token export
  exportTokensToCss,
  exportTokensToTailwind,
  exportTokensToW3C,
  exportTokensToFigma,
  // Token validation
  validateTokens,
  getTokenStats,
  preloadTokens,
  clearTokenCache,
} from './tokens';

// React Hooks for Token Access
export {
  useTokenCollection,
  useDerivedTokens,
  useStaticTokens,
  useBreakpoint,
} from './tokens';

export type {
  StatusKey,
  PriorityKey,
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  TransitionTokens,
  BreakpointKey,
  IntegrationProvider,
} from './tokens';

// Z-Index System (2025 Best Practices)
export {
  zIndex,
  zIndexClasses,
  getZIndex,
  getZIndexClass,
} from './z-index';

export type {
  ZIndexToken,
  ZIndexClass,
} from './z-index';

// ============================================
// Theme Orchestrator (UI-Kit Integration)
// Governance-aware theme management
// ============================================

export {
  ThemeOrchestrator,
  themeOrchestrator,
  deriveThemeFromPrimary,
  validateTheme,
  exportTokensAsCss,
} from './ThemeOrchestrator';

export type {
  ThemeOrchestratorConfig,
  ThemeDerivedResult,
  ThemeAccessibilityReport,
  AccessibilityIssue,
  GovernanceReport,
  GovernanceViolation,
  ThemeTokenCollection,
  TokenExportOptions,
} from './ThemeOrchestrator';

// Adaptive Contrast System (APCA + OKLCH - 2026)
export {
  // OKLCH Color Space
  rgbToOklab,
  oklabToRgb,
  oklabToOklch,
  oklchToOklab,
  hexToOklch,
  oklchToHex,
  toOklchString,

  // APCA Contrast (WCAG 3.0)
  getApcaContrast,
  checkApcaContrast,

  // Smart Glass Adaptive System
  getAdaptiveColors,
  getAdaptiveCssVars,
  getAdaptiveColorsCached,

  // Performance Utilities
  scheduleIdleTask,
  cancelIdleTask,
} from './adaptive-contrast';

export type {
  OKLCH,
  OKLab,
  AdaptiveColors,
} from './adaptive-contrast';

// ============================================
// Conformance Validation Hooks
// WCAG 2.1, APCA, and accessibility auditing
// ============================================

export {
  // Single color pair validation
  useColorConformance,
  // Batch validation for multiple pairs
  useBatchConformance,
  // Real-time validation with debouncing
  useLiveConformance,
  // Component-level accessibility audit
  useComponentAudit,
  // Token usage validation
  useTokenConformance,
  // Accessibility score calculation
  useAccessibilityScore,
} from './hooks';

export type {
  WcagLevel,
  TextSize,
  ConformanceResult,
  TokenConformanceResult,
  ComponentAuditResult,
} from './hooks';
