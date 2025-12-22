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
export type { ExtractedColor, SemanticBrandPalette } from './color-utils';

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
} from './color-utils';

// Provider & Hooks
export {
  TenantThemeProvider,
  useTenantTheme,
  useTenantThemeOptional,
} from './tenant-theme-provider';
