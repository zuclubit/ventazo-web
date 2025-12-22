/**
 * useTenantBranding Hook - v2.0
 *
 * Enterprise-grade dynamic tenant branding system.
 * Provides secure, validated, and optimized branding configuration.
 *
 * Architecture:
 * - Immutable state with proper memoization
 * - Security-first with input validation
 * - Performance optimized with shallow comparisons
 * - Multi-device responsive (CSS variables)
 * - WCAG 2.1 AA color contrast aware
 * - Unified CSS variable system (--tenant-* and --sidebar-*)
 *
 * @module hooks/use-tenant-branding
 */

'use client';

import * as React from 'react';

import { useTenantStore } from '@/store';
import {
  type PlanTier,
  type TenantBranding as TenantBrandingConfig,
  isValidHexColor,
  isValidAssetUrl,
  sanitizeHexColor,
  sanitizeAssetUrl,
} from '@/lib/auth';

// ============================================
// Constants
// ============================================

/**
 * Default Ventazo branding colors
 *
 * Color roles:
 * - SIDEBAR: Dark background for navigation (professional, AMOLED-friendly)
 * - PRIMARY: Main brand color for buttons, CTAs, active states
 * - ACCENT: Highlights, links, text emphasis
 * - SURFACE: Cards, dropdowns, secondary backgrounds
 */
const VENTAZO_COLORS = {
  SIDEBAR: '#003C3B',   // Dark teal - sidebar background
  PRIMARY: '#0EB58C',   // Teal - main actions
  ACCENT: '#5EEAD4',    // Light teal - highlights
  SURFACE: '#052828',   // Darker teal - surfaces/dropdowns
  // Legacy aliases
  SECONDARY: '#003C3B', // @deprecated: use SIDEBAR
} as const;

/** Default assets */
const DEFAULT_ASSETS = {
  LOGO: '/images/hero/logo.png',
  FAVICON: '/favicon.ico',
} as const;

/** CSS variable names for branding - Unified system */
const CSS_VARS = {
  // ============================================
  // Tenant semantic colors (primary system)
  // ============================================
  TENANT_PRIMARY: '--tenant-primary',
  TENANT_ACCENT: '--tenant-accent',
  TENANT_SIDEBAR: '--tenant-sidebar',
  TENANT_SURFACE: '--tenant-surface',
  TENANT_PRIMARY_FOREGROUND: '--tenant-primary-foreground',
  TENANT_ACCENT_FOREGROUND: '--tenant-accent-foreground',
  // Tenant color variations
  TENANT_PRIMARY_HOVER: '--tenant-primary-hover',
  TENANT_PRIMARY_LIGHT: '--tenant-primary-light',
  TENANT_PRIMARY_LIGHTER: '--tenant-primary-lighter',
  TENANT_PRIMARY_GLOW: '--tenant-primary-glow',
  TENANT_ACCENT_HOVER: '--tenant-accent-hover',
  TENANT_ACCENT_LIGHT: '--tenant-accent-light',
  TENANT_ACCENT_GLOW: '--tenant-accent-glow',
  TENANT_SURFACE_LIGHT: '--tenant-surface-light',
  TENANT_SURFACE_BORDER: '--tenant-surface-border',
  // ============================================
  // Legacy brand colors (backward compatibility)
  // ============================================
  BRAND_SIDEBAR: '--brand-sidebar',
  BRAND_PRIMARY: '--brand-primary',
  BRAND_ACCENT: '--brand-accent',
  BRAND_SURFACE: '--brand-surface',
  BRAND_SECONDARY: '--brand-secondary',
  // HSL components for advanced styling
  PRIMARY_H: '--brand-primary-h',
  PRIMARY_S: '--brand-primary-s',
  PRIMARY_L: '--brand-primary-l',
  SIDEBAR_H: '--brand-sidebar-h',
  SIDEBAR_S: '--brand-sidebar-s',
  SIDEBAR_L: '--brand-sidebar-l',
  // ============================================
  // Sidebar UI colors (derived from brand colors)
  // ============================================
  SIDEBAR_GLASS_BG: '--sidebar-glass-bg',
  SIDEBAR_TEXT_PRIMARY: '--sidebar-text-primary',
  SIDEBAR_TEXT_SECONDARY: '--sidebar-text-secondary',
  SIDEBAR_TEXT_MUTED: '--sidebar-text-muted',
  SIDEBAR_TEXT_ACCENT: '--sidebar-text-accent',
  SIDEBAR_ACTIVE_BG: '--sidebar-active-bg',
  SIDEBAR_ACTIVE_BORDER: '--sidebar-active-border',
  SIDEBAR_HOVER_BG: '--sidebar-hover-bg',
  SIDEBAR_DIVIDER: '--sidebar-divider',
  SIDEBAR_ITEM_SHADOW_ACTIVE: '--sidebar-item-shadow-active',
} as const;

// ============================================
// Types
// ============================================

/**
 * Computed branding configuration with derived values
 *
 * 4-color semantic system:
 * - sidebarColor: Navigation background (dark, professional)
 * - primaryColor: Main brand color for actions
 * - accentColor: Highlights and emphasis
 * - surfaceColor: Cards, dropdowns, secondary backgrounds
 */
export interface ComputedBranding {
  /** Company/Business name (legal name) */
  name: string;
  /** App/Brand name displayed in UI (can differ from company name) */
  appName: string;
  /** Validated logo URL */
  logoUrl: string;
  /** Sidebar/navigation background color */
  sidebarColor: string;
  /** Main brand color for buttons, CTAs, active states */
  primaryColor: string;
  /** Accent color for highlights, links, hover effects */
  accentColor: string;
  /** Surface color for cards, dropdowns, menus */
  surfaceColor: string;
  /** Optimal foreground color for primary */
  primaryForeground: string;
  /** Optimal foreground color for accent */
  accentForeground: string;
  /** @deprecated Use sidebarColor - kept for backward compatibility */
  secondaryColor: string;
  /** Dark mode variant of primary */
  primaryColorDark: string;
  /** Dark mode variant of sidebar */
  sidebarColorDark: string;
  /** Favicon URL */
  faviconUrl: string;
  /** Whether using custom branding */
  isCustomBranding: boolean;
  /** Plan level for feature gating */
  plan: PlanTier;
  /** HSL components of primary color for CSS */
  hsl: { h: number; s: number; l: number };
  /** HSL components of sidebar color for CSS */
  sidebarHsl: { h: number; s: number; l: number };
}

/** CSS color palette for components */
export interface BrandingColors {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly text: string;
  readonly textMuted: string;
  readonly background: string;
  readonly border: string;
  readonly hover: string;
  readonly active: string;
}

// Re-export for backward compatibility
export type TenantBranding = ComputedBranding;
export type BrandingPlanTier = PlanTier;

// ============================================
// Color Utilities (Pure Functions)
// ============================================

/**
 * Convert hex color to HSL values
 * Uses optimized algorithm without regex in hot path
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Remove # and parse
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;

  // Handle shorthand (#RGB)
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  if (fullHex.length !== 6) {
    return { h: 160, s: 85, l: 39 }; // Fallback to Ventazo primary
  }

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Generate accent color from primary (lighter, more saturated)
 */
function generateAccentColor(primaryHex: string): string {
  const hsl = hexToHsl(primaryHex);
  // Create a lighter, more vibrant version
  return `hsl(${hsl.h}, ${Math.min(hsl.s + 15, 100)}%, ${Math.min(hsl.l + 25, 85)}%)`;
}

/**
 * Generate surface color from sidebar (slightly darker)
 */
function generateSurfaceColor(sidebarHex: string): string {
  const hsl = hexToHsl(sidebarHex);
  // Create a slightly darker version for surfaces
  return `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 5, 5)}%)`;
}

/**
 * Generate dark mode variant (lighter for visibility)
 */
function generateDarkModeColor(hex: string): string {
  const hsl = hexToHsl(hex);
  return `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 10, 70)}%)`;
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  return {
    r: parseInt(fullHex.slice(0, 2), 16),
    g: parseInt(fullHex.slice(2, 4), 16),
    b: parseInt(fullHex.slice(4, 6), 16),
  };
}

/**
 * Generate RGBA string from hex and alpha
 */
function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate optimal foreground color for WCAG contrast
 * Uses relative luminance to determine black or white text
 */
function getOptimalForeground(hex: string): string {
  const { r, g, b } = hexToRgb(hex);

  // Calculate relative luminance (WCAG formula)
  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Return white for dark backgrounds, dark for light backgrounds
  return luminance > 0.179 ? '#1C1C1E' : '#FFFFFF';
}

/**
 * Darken a hex color by percentage
 */
function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 - percent / 100;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Lighten a hex color by percentage
 */
function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const factor = percent / 100;
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// ============================================
// Default Branding (Immutable)
// ============================================

const DEFAULT_BRANDING: ComputedBranding = Object.freeze({
  name: 'Ventazo',
  appName: 'Ventazo',
  logoUrl: DEFAULT_ASSETS.LOGO,
  // 4-color semantic system
  sidebarColor: VENTAZO_COLORS.SIDEBAR,
  primaryColor: VENTAZO_COLORS.PRIMARY,
  accentColor: VENTAZO_COLORS.ACCENT,
  surfaceColor: VENTAZO_COLORS.SURFACE,
  // Foreground colors for WCAG compliance
  primaryForeground: getOptimalForeground(VENTAZO_COLORS.PRIMARY),
  accentForeground: getOptimalForeground(VENTAZO_COLORS.ACCENT),
  // Legacy (backward compatibility)
  secondaryColor: VENTAZO_COLORS.SIDEBAR,
  // Dark mode variants
  primaryColorDark: generateDarkModeColor(VENTAZO_COLORS.PRIMARY),
  sidebarColorDark: generateDarkModeColor(VENTAZO_COLORS.SIDEBAR),
  // Assets
  faviconUrl: DEFAULT_ASSETS.FAVICON,
  isCustomBranding: false,
  plan: 'free',
  // HSL for CSS variables
  hsl: Object.freeze(hexToHsl(VENTAZO_COLORS.PRIMARY)),
  sidebarHsl: Object.freeze(hexToHsl(VENTAZO_COLORS.SIDEBAR)),
});

// ============================================
// Branding Extraction Logic
// ============================================

/**
 * Extract and validate branding from tenant metadata
 * Supports new 4-color schema with backward compatibility
 */
function extractBrandingFromMetadata(
  branding: TenantBrandingConfig | undefined
): Partial<ComputedBranding> {
  if (!branding) return {};

  const result: Partial<ComputedBranding> = {};

  // Logo (with security validation)
  const logoValue = branding.logo || branding.logoUrl;
  if (isValidAssetUrl(logoValue)) {
    result.logoUrl = sanitizeAssetUrl(logoValue, DEFAULT_ASSETS.LOGO);
  }

  // Sidebar color (new field, fallback to secondaryColor for backward compatibility)
  const sidebarValue = branding.sidebarColor || branding.secondaryColor;
  if (isValidHexColor(sidebarValue)) {
    const sanitized = sanitizeHexColor(sidebarValue, VENTAZO_COLORS.SIDEBAR);
    result.sidebarColor = sanitized;
    result.secondaryColor = sanitized; // Legacy compatibility
    result.sidebarColorDark = generateDarkModeColor(sanitized);
    // Generate surface color if not provided
    if (!branding.surfaceColor) {
      result.surfaceColor = generateSurfaceColor(sanitized);
    }
  }

  // Primary color (main brand color for actions)
  if (isValidHexColor(branding.primaryColor)) {
    const sanitized = sanitizeHexColor(branding.primaryColor, VENTAZO_COLORS.PRIMARY);
    result.primaryColor = sanitized;
    result.primaryColorDark = generateDarkModeColor(sanitized);
    // Generate accent color if not provided
    if (!branding.accentColor) {
      result.accentColor = generateAccentColor(sanitized);
    }
  }

  // Accent color (optional, for highlights)
  if (isValidHexColor(branding.accentColor)) {
    result.accentColor = sanitizeHexColor(branding.accentColor, VENTAZO_COLORS.ACCENT);
  }

  // Surface color (optional, for cards/dropdowns)
  if (isValidHexColor(branding.surfaceColor)) {
    result.surfaceColor = sanitizeHexColor(branding.surfaceColor, VENTAZO_COLORS.SURFACE);
  }

  // Favicon
  if (isValidAssetUrl(branding.favicon)) {
    result.faviconUrl = sanitizeAssetUrl(branding.favicon, DEFAULT_ASSETS.FAVICON);
  }

  return result;
}

/**
 * Extract branding from legacy settings object
 * Provides backward compatibility with old 2-color schema
 */
function extractBrandingFromSettings(
  settings: Record<string, unknown> | undefined
): Partial<ComputedBranding> {
  if (!settings) return {};

  const result: Partial<ComputedBranding> = {};

  // Logo
  const logoValue = settings['logo'] || settings['logoUrl'];
  if (isValidAssetUrl(logoValue)) {
    result.logoUrl = sanitizeAssetUrl(logoValue, DEFAULT_ASSETS.LOGO);
  }

  // Sidebar color (new) or secondary color (legacy)
  const sidebarValue = settings['sidebarColor'] || settings['secondaryColor'];
  if (isValidHexColor(sidebarValue)) {
    const sanitized = sanitizeHexColor(sidebarValue, VENTAZO_COLORS.SIDEBAR);
    result.sidebarColor = sanitized;
    result.secondaryColor = sanitized;
    result.sidebarColorDark = generateDarkModeColor(sanitized);
    result.surfaceColor = generateSurfaceColor(sanitized);
  }

  // Primary color
  const primaryValue = settings['primaryColor'];
  if (isValidHexColor(primaryValue)) {
    const sanitized = sanitizeHexColor(primaryValue, VENTAZO_COLORS.PRIMARY);
    result.primaryColor = sanitized;
    result.accentColor = generateAccentColor(sanitized);
    result.primaryColorDark = generateDarkModeColor(sanitized);
  }

  // Accent color (optional)
  const accentValue = settings['accentColor'];
  if (isValidHexColor(accentValue)) {
    result.accentColor = sanitizeHexColor(accentValue, VENTAZO_COLORS.ACCENT);
  }

  // Surface color (optional)
  const surfaceValue = settings['surfaceColor'];
  if (isValidHexColor(surfaceValue)) {
    result.surfaceColor = sanitizeHexColor(surfaceValue, VENTAZO_COLORS.SURFACE);
  }

  return result;
}

// ============================================
// useTenantBranding Hook
// ============================================

/**
 * Primary hook for tenant branding
 *
 * Features:
 * - Security-validated colors and URLs
 * - Optimized memoization (stable reference)
 * - Multi-source priority: metadata > settings > store > defaults
 * - Immutable return value
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   const { name, logoUrl, primaryColor, hsl } = useTenantBranding();
 *   return (
 *     <div style={{ '--primary-h': hsl.h }}>
 *       <img src={logoUrl} alt={name} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useTenantBranding(): ComputedBranding {
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const storeSettings = useTenantStore((state) => state.settings);

  return React.useMemo((): ComputedBranding => {
    // Start with immutable defaults
    let branding: ComputedBranding = { ...DEFAULT_BRANDING };
    let hasCustomBranding = false;

    if (currentTenant) {
      // Apply tenant name, appName, and plan
      // appName can be set separately in metadata.branding or defaults to name
      const metadataBrandingRaw = currentTenant.metadata?.branding as Record<string, unknown> | undefined;
      const appName = (metadataBrandingRaw?.['appName'] as string) ||
                      (metadataBrandingRaw?.['brandName'] as string) ||
                      currentTenant.name || branding.appName;
      branding = {
        ...branding,
        name: currentTenant.name || branding.name,
        appName: appName,
        plan: currentTenant.plan || 'free',
      };

      // Priority 1: metadata.branding (onboarding stores here)
      const metadataBranding = extractBrandingFromMetadata(
        currentTenant.metadata?.branding
      );
      if (Object.keys(metadataBranding).length > 0) {
        branding = { ...branding, ...metadataBranding };
        hasCustomBranding = true;
      }

      // Priority 2: legacy settings (backward compatibility)
      if (!hasCustomBranding) {
        const settingsBranding = extractBrandingFromSettings(currentTenant.settings);
        if (Object.keys(settingsBranding).length > 0) {
          branding = { ...branding, ...settingsBranding };
          hasCustomBranding = true;
        }
      }
    }

    // Priority 3: Zustand store settings (runtime updates)
    if (storeSettings.logo && isValidAssetUrl(storeSettings.logo)) {
      branding = { ...branding, logoUrl: storeSettings.logo };
      hasCustomBranding = true;
    }

    if (storeSettings.primaryColor && isValidHexColor(storeSettings.primaryColor)) {
      const sanitized = sanitizeHexColor(storeSettings.primaryColor, branding.primaryColor);
      branding = {
        ...branding,
        primaryColor: sanitized,
        accentColor: generateAccentColor(sanitized),
        primaryColorDark: generateDarkModeColor(sanitized),
      };
      hasCustomBranding = true;
    }

    // Handle sidebar color (new) or secondary color (legacy)
    const sidebarValue = storeSettings.primaryColor ? undefined : storeSettings.secondaryColor;
    if (sidebarValue && isValidHexColor(sidebarValue)) {
      const sanitized = sanitizeHexColor(sidebarValue, branding.sidebarColor);
      branding = {
        ...branding,
        sidebarColor: sanitized,
        secondaryColor: sanitized,
        sidebarColorDark: generateDarkModeColor(sanitized),
        surfaceColor: generateSurfaceColor(sanitized),
      };
      hasCustomBranding = true;
    }

    // Compute HSL for CSS variables
    const hsl = hexToHsl(branding.primaryColor);
    const sidebarHsl = hexToHsl(branding.sidebarColor);

    // Compute foreground colors for WCAG compliance
    const primaryForeground = getOptimalForeground(branding.primaryColor);
    const accentForeground = getOptimalForeground(branding.accentColor);

    // Return frozen object for immutability
    return Object.freeze({
      ...branding,
      primaryForeground,
      accentForeground,
      isCustomBranding: hasCustomBranding,
      hsl: Object.freeze(hsl),
      sidebarHsl: Object.freeze(sidebarHsl),
    });
  }, [currentTenant, storeSettings]);
}

// ============================================
// useBrandingColors Hook
// ============================================

/**
 * Get computed color palette for UI components
 * Optimized for component styling
 */
export function useBrandingColors(): BrandingColors {
  const branding = useTenantBranding();

  return React.useMemo((): BrandingColors => {
    const { hsl } = branding;

    return Object.freeze({
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor,
      text: '#FFFFFF',
      textMuted: '#94A3AB',
      background: '#041A1A',
      border: 'rgba(255, 255, 255, 0.06)',
      hover: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.15)`,
      active: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 0.25)`,
    });
  }, [branding]);
}

// ============================================
// useBrandingCSSVars Hook
// ============================================

/**
 * Apply branding as CSS custom properties to document root
 *
 * Features:
 * - Optimized to avoid unnecessary DOM updates
 * - Automatic cleanup on unmount
 * - SSR-safe (checks for document)
 * - Batch updates for performance
 */
export function useBrandingCSSVars(): void {
  const branding = useTenantBranding();

  // Use ref to track previous values and avoid unnecessary updates
  const prevBrandingRef = React.useRef<ComputedBranding | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const prev = prevBrandingRef.current;

    // Check if update is necessary (using 4-color semantic system)
    const needsUpdate = !prev ||
      prev.sidebarColor !== branding.sidebarColor ||
      prev.primaryColor !== branding.primaryColor ||
      prev.accentColor !== branding.accentColor ||
      prev.surfaceColor !== branding.surfaceColor;

    if (!needsUpdate) return;

    // Batch DOM updates with all CSS variables
    requestAnimationFrame(() => {
      // ============================================
      // Tenant semantic colors (primary system)
      // ============================================
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY, branding.primaryColor);
      root.style.setProperty(CSS_VARS.TENANT_ACCENT, branding.accentColor);
      root.style.setProperty(CSS_VARS.TENANT_SIDEBAR, branding.sidebarColor);
      root.style.setProperty(CSS_VARS.TENANT_SURFACE, branding.surfaceColor);
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY_FOREGROUND, branding.primaryForeground);
      root.style.setProperty(CSS_VARS.TENANT_ACCENT_FOREGROUND, branding.accentForeground);

      // Tenant color variations
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY_HOVER, darkenColor(branding.primaryColor, 10));
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY_LIGHT, lightenColor(branding.primaryColor, 35));
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY_LIGHTER, lightenColor(branding.primaryColor, 45));
      root.style.setProperty(CSS_VARS.TENANT_PRIMARY_GLOW, `${branding.primaryColor}40`);
      root.style.setProperty(CSS_VARS.TENANT_ACCENT_HOVER, darkenColor(branding.accentColor, 10));
      root.style.setProperty(CSS_VARS.TENANT_ACCENT_LIGHT, lightenColor(branding.accentColor, 35));
      root.style.setProperty(CSS_VARS.TENANT_ACCENT_GLOW, `${branding.accentColor}40`);
      root.style.setProperty(CSS_VARS.TENANT_SURFACE_LIGHT, lightenColor(branding.surfaceColor, 5));
      root.style.setProperty(CSS_VARS.TENANT_SURFACE_BORDER, lightenColor(branding.surfaceColor, 15));

      // ============================================
      // Legacy brand colors (backward compatibility)
      // ============================================
      root.style.setProperty(CSS_VARS.BRAND_SIDEBAR, branding.sidebarColor);
      root.style.setProperty(CSS_VARS.BRAND_PRIMARY, branding.primaryColor);
      root.style.setProperty(CSS_VARS.BRAND_ACCENT, branding.accentColor);
      root.style.setProperty(CSS_VARS.BRAND_SURFACE, branding.surfaceColor);
      root.style.setProperty(CSS_VARS.BRAND_SECONDARY, branding.sidebarColor);

      // HSL components for primary color
      root.style.setProperty(CSS_VARS.PRIMARY_H, String(branding.hsl.h));
      root.style.setProperty(CSS_VARS.PRIMARY_S, `${branding.hsl.s}%`);
      root.style.setProperty(CSS_VARS.PRIMARY_L, `${branding.hsl.l}%`);
      // HSL components for sidebar color
      root.style.setProperty(CSS_VARS.SIDEBAR_H, String(branding.sidebarHsl.h));
      root.style.setProperty(CSS_VARS.SIDEBAR_S, `${branding.sidebarHsl.s}%`);
      root.style.setProperty(CSS_VARS.SIDEBAR_L, `${branding.sidebarHsl.l}%`);

      // ============================================
      // Sidebar UI colors (derived from branding)
      // ============================================
      // Glass background using sidebarColor with high opacity
      root.style.setProperty(
        CSS_VARS.SIDEBAR_GLASS_BG,
        hexToRgba(branding.sidebarColor, 0.95)
      );
      // Text colors
      root.style.setProperty(CSS_VARS.SIDEBAR_TEXT_PRIMARY, '#FFFFFF');
      root.style.setProperty(CSS_VARS.SIDEBAR_TEXT_SECONDARY, '#E5E5E5');
      root.style.setProperty(CSS_VARS.SIDEBAR_TEXT_MUTED, '#94A3AB');
      root.style.setProperty(CSS_VARS.SIDEBAR_TEXT_ACCENT, branding.accentColor);
      // Active background using primary color with transparency
      root.style.setProperty(
        CSS_VARS.SIDEBAR_ACTIVE_BG,
        hexToRgba(branding.primaryColor, 0.18)
      );
      // Active border using primary color
      root.style.setProperty(CSS_VARS.SIDEBAR_ACTIVE_BORDER, branding.primaryColor);
      // Hover background
      root.style.setProperty(CSS_VARS.SIDEBAR_HOVER_BG, 'rgba(255, 255, 255, 0.08)');
      // Divider color
      root.style.setProperty(CSS_VARS.SIDEBAR_DIVIDER, 'rgba(255, 255, 255, 0.06)');
      // Active item shadow using primary color
      root.style.setProperty(
        CSS_VARS.SIDEBAR_ITEM_SHADOW_ACTIVE,
        `0 4px 12px -2px ${hexToRgba(branding.primaryColor, 0.3)}`
      );
    });

    prevBrandingRef.current = branding;

    // Cleanup on unmount
    return () => {
      Object.values(CSS_VARS).forEach((varName) => {
        root.style.removeProperty(varName);
      });
    };
  }, [branding]);
}

// ============================================
// AI Navigation Priority Hook
// ============================================

export interface NavPriorityItem {
  readonly href: string;
  readonly score: number;
  readonly lastAccess: number;
  readonly accessCount: number;
}

const NAV_STORAGE_KEY = 'ventazo-nav-priorities';
const DECAY_CONSTANT = 86400000; // 24 hours in ms

/**
 * AI-driven navigation priority based on user behavior
 *
 * Uses time-decay scoring algorithm:
 * score = accessCount + recencyBonus
 * recencyBonus = 1 / (1 + timeSinceLastAccess / 24h)
 */
export function useAINavigationPriority(): {
  readonly priorities: readonly NavPriorityItem[];
  readonly recordAccess: (href: string) => void;
  readonly getTopItems: (count: number) => readonly string[];
} {
  const [priorities, setPriorities] = React.useState<NavPriorityItem[]>([]);

  // Load from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(NAV_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NavPriorityItem[];
        if (Array.isArray(parsed)) {
          setPriorities(parsed);
        }
      }
    } catch {
      // Silently handle parse errors
    }
  }, []);

  // Record page access with time-decay scoring
  const recordAccess = React.useCallback((href: string) => {
    setPriorities((prev) => {
      const now = Date.now();
      const existingIndex = prev.findIndex((p) => p.href === href);

      let updated: NavPriorityItem[];

      if (existingIndex >= 0) {
        // Update existing item
        const existing = prev[existingIndex]!;
        const newCount = existing.accessCount + 1;
        const recencyBonus = 1 / (1 + (now - existing.lastAccess) / DECAY_CONSTANT);

        updated = [
          ...prev.slice(0, existingIndex),
          {
            href,
            lastAccess: now,
            accessCount: newCount,
            score: newCount + recencyBonus,
          },
          ...prev.slice(existingIndex + 1),
        ];
      } else {
        // Add new item
        updated = [
          ...prev,
          {
            href,
            lastAccess: now,
            accessCount: 1,
            score: 1,
          },
        ];
      }

      // Persist to localStorage (non-blocking)
      try {
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage full or unavailable
      }

      return updated;
    });
  }, []);

  // Get top N items sorted by score
  const getTopItems = React.useCallback(
    (count: number): readonly string[] => {
      return [...priorities]
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map((p) => p.href);
    },
    [priorities]
  );

  return React.useMemo(
    () => ({
      priorities: Object.freeze(priorities),
      recordAccess,
      getTopItems,
    }),
    [priorities, recordAccess, getTopItems]
  );
}

export default useTenantBranding;
