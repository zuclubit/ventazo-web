// ============================================
// Theme System Types
// FASE: Branding & Theming System
// ============================================

/**
 * RGB Color representation
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * HSL Color representation
 */
export interface HSL {
  h: number;
  s: number;
  l: number;
}

/**
 * Complete color information
 */
export interface ColorInfo {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  luminance: number;
}

/**
 * Color validation result with WCAG compliance info
 */
export interface ColorValidation {
  isValid: boolean;
  hex: string;
  hsl: HSL;
  rgb: RGB;
  contrast: {
    white: number;
    black: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  };
  suggestions?: {
    lighterVariant: string;
    darkerVariant: string;
    complementary: string;
  };
}

/**
 * Logo configuration
 */
export interface LogoConfig {
  url: string | null;
  darkUrl?: string | null;
  width?: number;
  height?: number;
  aspectRatio?: string;
}

/**
 * Color palette for tenant branding
 */
export interface BrandingColors {
  // Primary brand colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;

  // Background & text
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;

  // UI elements
  border: string;
  input: string;
  ring: string;

  // Semantic colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;

  // Muted
  muted: string;
  mutedForeground: string;

  // Sidebar (optional overrides)
  sidebarBackground?: string;
  sidebarForeground?: string;
  sidebarPrimary?: string;
  sidebarPrimaryForeground?: string;
  sidebarAccent?: string;
  sidebarAccentForeground?: string;
  sidebarBorder?: string;
}

/**
 * Typography configuration
 */
export interface BrandingTypography {
  fontFamily: string;
  fontFamilyMono?: string;
  baseFontSize: number;
}

/**
 * Shape configuration
 */
export interface BrandingShapes {
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  buttonStyle: 'rounded' | 'square' | 'pill';
}

/**
 * Branding metadata
 */
export interface BrandingMeta {
  version: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Complete tenant branding configuration
 */
export interface TenantBranding {
  logo: LogoConfig;
  colors: BrandingColors;
  typography: BrandingTypography;
  shapes: BrandingShapes;
  meta: BrandingMeta;
}

/**
 * Simplified branding for onboarding
 */
export interface SimpleBranding {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName?: string;
}

/**
 * Theme context value type
 */
export interface TenantThemeContextValue {
  branding: TenantBranding | null;
  isLoading: boolean;
  applyTheme: (branding: Partial<TenantBranding>) => void;
  resetTheme: () => void;
  previewTheme: (colors: { primary: string; secondary: string }) => void;
}

/**
 * Border radius mapping
 */
export const BORDER_RADIUS_MAP: Record<BrandingShapes['borderRadius'], string> = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
};

/**
 * Default Ventazo branding
 */
export const DEFAULT_BRANDING: TenantBranding = {
  logo: { url: null },
  colors: {
    primary: '#0D9488',
    primaryForeground: '#FFFFFF',
    secondary: '#F97316',
    secondaryForeground: '#FFFFFF',
    accent: '#F97316',
    accentForeground: '#FFFFFF',
    background: '#FAF7F5',
    foreground: '#0A0A0A',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    popover: '#FFFFFF',
    popoverForeground: '#0A0A0A',
    border: '#E5E0DB',
    input: '#E5E0DB',
    ring: '#0D9488',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    success: '#10B981',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#0A0A0A',
    info: '#0D9488',
    infoForeground: '#FFFFFF',
    muted: '#F5F0EB',
    mutedForeground: '#737373',
  },
  typography: {
    fontFamily: 'Inter',
    baseFontSize: 16,
  },
  shapes: {
    borderRadius: 'lg',
    buttonStyle: 'rounded',
  },
  meta: {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
};
