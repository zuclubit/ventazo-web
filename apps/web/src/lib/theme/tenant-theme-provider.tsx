'use client';

// ============================================
// TenantThemeProvider
// Dynamic theming system for multi-tenant CRM
// ============================================

import * as React from 'react';
import { useTenant } from '@/lib/tenant/tenant-context';
import {
  hexToHslString,
  getOptimalForeground,
  darken,
  lighten,
  setCssVariable,
  removeCssVariable,
} from './color-utils';
import type { TenantBranding, TenantThemeContextValue } from './types';
import { DEFAULT_BRANDING, BORDER_RADIUS_MAP } from './types';

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
 * Apply branding colors as CSS variables
 * Converts hex colors to HSL format for CSS custom properties
 */
function applyCssVariables(branding: TenantBranding): void {
  const { colors, shapes } = branding;

  // Primary
  setCssVariable('--primary', hexToHslString(colors.primary));
  setCssVariable('--primary-foreground', hexToHslString(colors.primaryForeground));

  // Secondary
  setCssVariable('--secondary', hexToHslString(colors.secondary));
  setCssVariable('--secondary-foreground', hexToHslString(colors.secondaryForeground));

  // Accent
  setCssVariable('--accent', hexToHslString(colors.accent));
  setCssVariable('--accent-foreground', hexToHslString(colors.accentForeground));

  // Background & Foreground
  setCssVariable('--background', hexToHslString(colors.background));
  setCssVariable('--foreground', hexToHslString(colors.foreground));

  // Card
  setCssVariable('--card', hexToHslString(colors.card));
  setCssVariable('--card-foreground', hexToHslString(colors.cardForeground));

  // Popover
  setCssVariable('--popover', hexToHslString(colors.popover));
  setCssVariable('--popover-foreground', hexToHslString(colors.popoverForeground));

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

  // Muted
  setCssVariable('--muted', hexToHslString(colors.muted));
  setCssVariable('--muted-foreground', hexToHslString(colors.mutedForeground));

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
  const tenantContext = useTenant();
  const [branding, setBranding] = React.useState<TenantBranding | null>(
    initialBranding || null
  );
  const [isLoading, setIsLoading] = React.useState(!initialBranding);

  // Load branding when tenant changes
  React.useEffect(() => {
    const tenant = tenantContext?.tenant;

    if (tenant?.settings) {
      // Check if tenant has branding settings
      const tenantSettings = tenant.settings as Record<string, unknown>;
      const tenantBranding = tenantSettings['branding'] as Partial<TenantBranding> | undefined;

      if (tenantBranding) {
        const mergedBranding = mergeBranding(DEFAULT_BRANDING, tenantBranding);
        setBranding(mergedBranding);
        applyCssVariables(mergedBranding);
      } else if (tenantSettings['primaryColor']) {
        // Legacy support: just primary and secondary colors
        const primaryColor = tenantSettings['primaryColor'] as string;
        const legacyBranding = mergeBranding(DEFAULT_BRANDING, {
          colors: {
            ...DEFAULT_BRANDING.colors,
            primary: primaryColor,
            primaryForeground: getOptimalForeground(primaryColor),
            ring: primaryColor,
            info: primaryColor,
            infoForeground: getOptimalForeground(primaryColor),
          },
        });
        setBranding(legacyBranding);
        applyCssVariables(legacyBranding);
      } else {
        // Use default branding
        setBranding(DEFAULT_BRANDING);
        applyCssVariables(DEFAULT_BRANDING);
      }
    } else {
      // No tenant - use defaults
      setBranding(DEFAULT_BRANDING);
      applyCssVariables(DEFAULT_BRANDING);
    }

    setIsLoading(false);
  }, [tenantContext?.tenant]);

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
