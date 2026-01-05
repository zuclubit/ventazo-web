'use client';

// ============================================
// TenantThemeProvider
// Dynamic theming system for multi-tenant CRM
// ============================================

import * as React from 'react';
import { useTenantStore, useCachedBranding } from '@/store';
import {
  hexToHslString,
  hexToHsl,
  hexToRgba,
  getOptimalForeground,
  darken,
  lighten,
  setCssVariable,
  removeCssVariable,
} from './color-utils';
import type { TenantBranding, TenantThemeContextValue } from './types';
import { DEFAULT_BRANDING, BORDER_RADIUS_MAP } from './types';
import { isValidHexColor, sanitizeHexColor } from '@/lib/auth';

// ============================================
// Context
// ============================================

const TenantThemeContext = React.createContext<TenantThemeContextValue | undefined>(undefined);

// ============================================
// CSS Variable Application
// ============================================

const CSS_VARIABLES = [
  '--primary',
  '--primary-foreground',
  '--secondary',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--background',
  '--foreground',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--border',
  '--input',
  '--ring',
  '--destructive',
  '--destructive-foreground',
  '--success',
  '--success-foreground',
  '--warning',
  '--warning-foreground',
  '--info',
  '--info-foreground',
  '--muted',
  '--muted-foreground',
  '--sidebar-background',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--radius',
] as const;

/**
 * Check if theme was preloaded by inline script with same colors
 * Returns true if we should skip application (already applied correctly)
 */
function shouldSkipApplication(tenantColors?: {
  primaryColor?: string;
  sidebarColor?: string;
  accentColor?: string;
  surfaceColor?: string;
}): boolean {
  if (typeof document === 'undefined') return false;

  const root = document.documentElement;
  const preloaded = root.dataset['themePreloaded'];

  if (preloaded !== 'true') return false;

  // If preloaded, check if colors match
  const currentPrimary = root.style.getPropertyValue('--tenant-primary');
  const targetPrimary = tenantColors?.primaryColor;

  if (currentPrimary && targetPrimary && currentPrimary === targetPrimary) {
    // Colors match - clear flag and skip
    delete root.dataset['themePreloaded'];
    return true;
  }

  // Colors different or no target - clear flag and continue
  delete root.dataset['themePreloaded'];
  return false;
}

/**
 * Apply branding colors as CSS variables
 * Converts hex colors to HSL format for CSS custom properties
 * Also sets tenant-specific variables for dynamic theming
 *
 * Optimized to skip if inline script already applied same colors
 */
function applyCssVariables(branding: TenantBranding, tenantColors?: {
  sidebarColor?: string;
  primaryColor?: string;
  accentColor?: string;
  surfaceColor?: string;
}): void {
  // Skip if inline script already applied the same colors (FOUC prevention)
  if (shouldSkipApplication(tenantColors)) {
    return;
  }

  const { colors, shapes } = branding;

  // Primary
  setCssVariable('--primary', hexToHslString(colors.primary));
  setCssVariable('--primary-foreground', hexToHslString(colors.primaryForeground));

  // ============================================
  // TENANT DYNAMIC COLORS (4-color semantic palette)
  // Used by leads module and other dynamic components
  // ============================================
  if (tenantColors) {
    const primaryHex = tenantColors.primaryColor || colors.primary;
    const accentHex = tenantColors.accentColor || colors.accent;
    const sidebarHex = tenantColors.sidebarColor || darken(colors.primary, 35);
    const surfaceHex = tenantColors.surfaceColor || darken(colors.primary, 40);

    // Set tenant colors as hex for direct use
    setCssVariable('--tenant-primary', primaryHex);
    setCssVariable('--tenant-accent', accentHex);
    setCssVariable('--tenant-sidebar', sidebarHex);
    setCssVariable('--tenant-surface', surfaceHex);

    // Computed foregrounds for contrast
    setCssVariable('--tenant-primary-foreground', getOptimalForeground(primaryHex));
    setCssVariable('--tenant-accent-foreground', getOptimalForeground(accentHex));

    // Primary variations (for hover, light backgrounds, etc.)
    setCssVariable('--tenant-primary-hover', darken(primaryHex, 10));
    setCssVariable('--tenant-primary-light', lighten(primaryHex, 35));
    setCssVariable('--tenant-primary-lighter', lighten(primaryHex, 45));
    setCssVariable('--tenant-primary-glow', `${primaryHex}40`); // 25% opacity

    // Accent variations
    setCssVariable('--tenant-accent-hover', darken(accentHex, 10));
    setCssVariable('--tenant-accent-light', lighten(accentHex, 35));
    setCssVariable('--tenant-accent-glow', `${accentHex}40`);

    // Surface variations
    setCssVariable('--tenant-surface-light', lighten(surfaceHex, 5));
    setCssVariable('--tenant-surface-border', lighten(surfaceHex, 15));

    // ============================================
    // Legacy brand colors (backward compatibility)
    // ============================================
    setCssVariable('--brand-sidebar', sidebarHex);
    setCssVariable('--brand-primary', primaryHex);
    setCssVariable('--brand-accent', accentHex);
    setCssVariable('--brand-surface', surfaceHex);
    setCssVariable('--brand-secondary', sidebarHex);

    // HSL components for advanced styling
    const primaryHsl = hexToHsl(primaryHex);
    const sidebarHsl = hexToHsl(sidebarHex);
    if (primaryHsl) {
      setCssVariable('--brand-primary-h', String(primaryHsl.h));
      setCssVariable('--brand-primary-s', `${primaryHsl.s}%`);
      setCssVariable('--brand-primary-l', `${primaryHsl.l}%`);
    }
    if (sidebarHsl) {
      setCssVariable('--brand-sidebar-h', String(sidebarHsl.h));
      setCssVariable('--brand-sidebar-s', `${sidebarHsl.s}%`);
      setCssVariable('--brand-sidebar-l', `${sidebarHsl.l}%`);
    }

    // ============================================
    // Sidebar UI colors (derived from branding)
    // ============================================
    setCssVariable('--sidebar-glass-bg', hexToRgba(sidebarHex, 0.95));
    setCssVariable('--sidebar-text-primary', '#FFFFFF');
    setCssVariable('--sidebar-text-secondary', '#E5E5E5');
    setCssVariable('--sidebar-text-muted', '#94A3AB');
    setCssVariable('--sidebar-text-accent', accentHex);
    setCssVariable('--sidebar-active-bg', hexToRgba(primaryHex, 0.18));
    setCssVariable('--sidebar-active-border', primaryHex);
    setCssVariable('--sidebar-hover-bg', 'rgba(255, 255, 255, 0.08)');
    setCssVariable('--sidebar-divider', 'rgba(255, 255, 255, 0.06)');
    setCssVariable('--sidebar-item-shadow-active', `0 4px 12px -2px ${hexToRgba(primaryHex, 0.3)}`);
  }

  // Secondary
  setCssVariable('--secondary', hexToHslString(colors.secondary));
  setCssVariable('--secondary-foreground', hexToHslString(colors.secondaryForeground));

  // Accent
  setCssVariable('--accent', hexToHslString(colors.accent));
  setCssVariable('--accent-foreground', hexToHslString(colors.accentForeground));

  // Background & Foreground
  // CRITICAL: Calculate optimal foreground based on background for proper contrast
  // This ensures text is always readable regardless of tenant's background color
  setCssVariable('--background', hexToHslString(colors.background));
  const optimalForeground = getOptimalForeground(colors.background);
  setCssVariable('--foreground', hexToHslString(optimalForeground));

  // Card - Calculate optimal foreground based on card background
  setCssVariable('--card', hexToHslString(colors.card));
  const optimalCardForeground = getOptimalForeground(colors.card);
  setCssVariable('--card-foreground', hexToHslString(optimalCardForeground));

  // Popover - Calculate optimal foreground based on popover background
  setCssVariable('--popover', hexToHslString(colors.popover));
  const optimalPopoverForeground = getOptimalForeground(colors.popover);
  setCssVariable('--popover-foreground', hexToHslString(optimalPopoverForeground));

  // UI Elements
  setCssVariable('--border', hexToHslString(colors.border));
  setCssVariable('--input', hexToHslString(colors.input));
  setCssVariable('--ring', hexToHslString(colors.ring));

  // Semantic colors
  setCssVariable('--destructive', hexToHslString(colors.destructive));
  setCssVariable('--destructive-foreground', hexToHslString(colors.destructiveForeground));
  setCssVariable('--success', hexToHslString(colors.success));
  setCssVariable('--success-foreground', hexToHslString(colors.successForeground));
  setCssVariable('--warning', hexToHslString(colors.warning));
  setCssVariable('--warning-foreground', hexToHslString(colors.warningForeground));
  setCssVariable('--info', hexToHslString(colors.info));
  setCssVariable('--info-foreground', hexToHslString(colors.infoForeground));

  // Muted - Calculate optimal foreground for muted backgrounds
  setCssVariable('--muted', hexToHslString(colors.muted));
  const optimalMutedForeground = getOptimalForeground(colors.muted);
  // For muted text, we want slightly less contrast (gray instead of pure black/white)
  // Use the calculated direction but apply a muted gray
  const mutedFg = optimalMutedForeground === '#000000' ? '#6B7280' : '#9CA3AF';
  setCssVariable('--muted-foreground', hexToHslString(mutedFg));

  // Sidebar - derive from primary if not specified
  const sidebarBg = colors.sidebarBackground || darken(colors.primary, 35);
  const sidebarFg = colors.sidebarForeground || getOptimalForeground(sidebarBg);
  const sidebarPrimary = colors.sidebarPrimary || lighten(colors.primary, 10);
  const sidebarAccent = colors.sidebarAccent || darken(sidebarBg, 5);

  setCssVariable('--sidebar-background', hexToHslString(sidebarBg));
  setCssVariable('--sidebar-foreground', hexToHslString(sidebarFg));
  setCssVariable('--sidebar-primary', hexToHslString(sidebarPrimary));
  setCssVariable('--sidebar-primary-foreground', hexToHslString(getOptimalForeground(sidebarPrimary)));
  setCssVariable('--sidebar-accent', hexToHslString(sidebarAccent));
  setCssVariable('--sidebar-accent-foreground', hexToHslString(getOptimalForeground(sidebarAccent)));
  setCssVariable('--sidebar-border', hexToHslString(lighten(sidebarBg, 10)));
  setCssVariable('--sidebar-ring', hexToHslString(sidebarPrimary));

  // Border radius
  setCssVariable('--radius', BORDER_RADIUS_MAP[shapes.borderRadius] || '0.75rem');
}

/**
 * Remove all theme CSS variables
 */
function removeCssVariables(): void {
  CSS_VARIABLES.forEach(v => removeCssVariable(v));
}

/**
 * Merge partial branding with defaults
 */
function mergeBranding(
  base: TenantBranding,
  partial: Partial<TenantBranding>
): TenantBranding {
  return {
    logo: partial.logo ? { ...base.logo, ...partial.logo } : base.logo,
    colors: partial.colors ? { ...base.colors, ...partial.colors } : base.colors,
    typography: partial.typography ? { ...base.typography, ...partial.typography } : base.typography,
    shapes: partial.shapes ? { ...base.shapes, ...partial.shapes } : base.shapes,
    meta: {
      ...base.meta,
      ...(partial.meta || {}),
      updatedAt: new Date().toISOString(),
    },
  };
}

// ============================================
// Provider Component
// ============================================

interface TenantThemeProviderProps {
  children: React.ReactNode;
  initialBranding?: TenantBranding;
}

export function TenantThemeProvider({
  children,
  initialBranding,
}: TenantThemeProviderProps) {
  // Use Zustand store for tenant data (includes metadata.branding from onboarding)
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const storeSettings = useTenantStore((state) => state.settings);
  // Cached branding from localStorage for instant application
  const cachedBranding = useCachedBranding();

  const [branding, setBranding] = React.useState<TenantBranding | null>(
    initialBranding || null
  );
  const [isLoading, setIsLoading] = React.useState(!initialBranding);

  // Load branding when tenant changes
  // Priority: 0) cached branding 1) metadata.branding (onboarding) 2) settings 3) store settings 4) defaults
  React.useEffect(() => {
    let resolvedBranding: TenantBranding = DEFAULT_BRANDING;
    let hasCustomColors = false;

    // Priority 0: Use cached branding for instant display while tenant loads
    // This provides immediate colors from localStorage before API response
    if (!currentTenant && cachedBranding?.primaryColor) {
      const primaryColor = sanitizeHexColor(cachedBranding.primaryColor, DEFAULT_BRANDING.colors.primary);
      resolvedBranding = mergeBranding(DEFAULT_BRANDING, {
        colors: {
          ...DEFAULT_BRANDING.colors,
          primary: primaryColor,
          primaryForeground: getOptimalForeground(primaryColor),
          ring: primaryColor,
          info: primaryColor,
          infoForeground: getOptimalForeground(primaryColor),
        },
      });

      const tenantColors = {
        primaryColor: cachedBranding.primaryColor,
        sidebarColor: cachedBranding.sidebarColor,
        accentColor: cachedBranding.accentColor,
        surfaceColor: cachedBranding.surfaceColor,
      };

      setBranding(resolvedBranding);
      applyCssVariables(resolvedBranding, tenantColors);
      setIsLoading(false);
      return; // Wait for tenant to load
    }

    // Priority 1: Check metadata.branding (where onboarding stores data)
    const metadataBranding = currentTenant?.metadata?.branding;
    if (metadataBranding) {
      const partialBranding: Partial<TenantBranding> = {};

      if (isValidHexColor(metadataBranding.primaryColor)) {
        const primaryColor = sanitizeHexColor(metadataBranding.primaryColor, DEFAULT_BRANDING.colors.primary);
        partialBranding.colors = {
          ...DEFAULT_BRANDING.colors,
          primary: primaryColor,
          primaryForeground: getOptimalForeground(primaryColor),
          ring: primaryColor,
          info: primaryColor,
          infoForeground: getOptimalForeground(primaryColor),
        };

        // Apply secondary if provided
        if (isValidHexColor(metadataBranding.secondaryColor)) {
          const secondaryColor = sanitizeHexColor(metadataBranding.secondaryColor, DEFAULT_BRANDING.colors.secondary);
          partialBranding.colors = {
            ...partialBranding.colors,
            secondary: secondaryColor,
            secondaryForeground: getOptimalForeground(secondaryColor),
          };
        }

        hasCustomColors = true;
      }

      if (hasCustomColors) {
        resolvedBranding = mergeBranding(DEFAULT_BRANDING, partialBranding);
      }
    }

    // Priority 2: Legacy tenant.settings support
    if (!hasCustomColors && currentTenant?.settings) {
      const tenantSettings = currentTenant.settings as Record<string, unknown>;

      if (isValidHexColor(tenantSettings['primaryColor'])) {
        const primaryColor = sanitizeHexColor(tenantSettings['primaryColor'] as string, DEFAULT_BRANDING.colors.primary);
        resolvedBranding = mergeBranding(DEFAULT_BRANDING, {
          colors: {
            ...DEFAULT_BRANDING.colors,
            primary: primaryColor,
            primaryForeground: getOptimalForeground(primaryColor),
            ring: primaryColor,
            info: primaryColor,
            infoForeground: getOptimalForeground(primaryColor),
          },
        });
        hasCustomColors = true;
      }
    }

    // Priority 3: Zustand store settings (runtime updates)
    if (!hasCustomColors && storeSettings.primaryColor && isValidHexColor(storeSettings.primaryColor)) {
      const primaryColor = sanitizeHexColor(storeSettings.primaryColor, DEFAULT_BRANDING.colors.primary);
      const partialColors: Partial<typeof DEFAULT_BRANDING.colors> = {
        primary: primaryColor,
        primaryForeground: getOptimalForeground(primaryColor),
        ring: primaryColor,
        info: primaryColor,
        infoForeground: getOptimalForeground(primaryColor),
      };

      if (storeSettings.secondaryColor && isValidHexColor(storeSettings.secondaryColor)) {
        const secondaryColor = sanitizeHexColor(storeSettings.secondaryColor, DEFAULT_BRANDING.colors.secondary);
        partialColors.secondary = secondaryColor;
        partialColors.secondaryForeground = getOptimalForeground(secondaryColor);
      }

      resolvedBranding = mergeBranding(DEFAULT_BRANDING, {
        colors: { ...DEFAULT_BRANDING.colors, ...partialColors },
      });
    }

    // Extract 4-color semantic palette from tenant metadata
    const tenantColors = metadataBranding ? {
      sidebarColor: isValidHexColor(metadataBranding.sidebarColor)
        ? metadataBranding.sidebarColor as string
        : undefined,
      primaryColor: isValidHexColor(metadataBranding.primaryColor)
        ? metadataBranding.primaryColor as string
        : undefined,
      accentColor: isValidHexColor(metadataBranding.accentColor)
        ? metadataBranding.accentColor as string
        : undefined,
      surfaceColor: isValidHexColor(metadataBranding.surfaceColor)
        ? metadataBranding.surfaceColor as string
        : undefined,
    } : undefined;

    // Apply the resolved branding with tenant-specific colors
    setBranding(resolvedBranding);
    applyCssVariables(resolvedBranding, tenantColors);
    setIsLoading(false);
  }, [currentTenant, cachedBranding, storeSettings.primaryColor, storeSettings.secondaryColor]);

  // Apply theme function - for programmatic updates
  const applyTheme = React.useCallback((partial: Partial<TenantBranding>) => {
    const currentBranding = branding || DEFAULT_BRANDING;
    const newBranding = mergeBranding(currentBranding, partial);
    setBranding(newBranding);
    applyCssVariables(newBranding);
  }, [branding]);

  // Reset to default theme
  const resetTheme = React.useCallback(() => {
    setBranding(DEFAULT_BRANDING);
    applyCssVariables(DEFAULT_BRANDING);
  }, []);

  // Preview theme - for onboarding/settings
  // Only changes primary and secondary, calculates derived colors
  const previewTheme = React.useCallback((colors: { primary: string; secondary: string }) => {
    const preview: TenantBranding = mergeBranding(DEFAULT_BRANDING, {
      colors: {
        ...DEFAULT_BRANDING.colors,
        primary: colors.primary,
        primaryForeground: getOptimalForeground(colors.primary),
        secondary: colors.secondary,
        secondaryForeground: getOptimalForeground(colors.secondary),
        accent: colors.secondary,
        accentForeground: getOptimalForeground(colors.secondary),
        ring: colors.primary,
        info: colors.primary,
        infoForeground: getOptimalForeground(colors.primary),
      },
    });
    applyCssVariables(preview);
    // Note: We don't update state here - this is just a preview
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Only remove if we were managing the theme
      // In practice, we rarely unmount the provider
    };
  }, []);

  const value = React.useMemo(
    () => ({
      branding,
      isLoading,
      applyTheme,
      resetTheme,
      previewTheme,
    }),
    [branding, isLoading, applyTheme, resetTheme, previewTheme]
  );

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

/**
 * Access the tenant theme context
 * Must be used within a TenantThemeProvider
 */
export function useTenantTheme(): TenantThemeContextValue {
  const context = React.useContext(TenantThemeContext);
  if (context === undefined) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if not in provider
 * Useful for optional theming
 */
export function useTenantThemeOptional(): TenantThemeContextValue | null {
  const context = React.useContext(TenantThemeContext);
  return context ?? null;
}
