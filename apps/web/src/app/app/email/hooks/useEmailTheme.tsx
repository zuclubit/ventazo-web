'use client';

/**
 * useEmailTheme Hook
 *
 * Dynamic theming for the Email module using Color Intelligence Domain.
 * ALL colors are derived from tenant branding using perceptually uniform algorithms.
 *
 * v5.0 - Color Intelligence Integration
 * - OKLCH for perceptually uniform color manipulation
 * - HCT for Material Design 3 tonal palettes
 * - APCA for WCAG 3.0 contrast validation
 * - Smart contrast mode detection (light-content vs dark-content)
 * - Automatic accessibility validation
 */

import * as React from 'react';

import { useTenantBranding } from '@/hooks/use-tenant-branding';
import {
  OKLCH,
  HCT,
  APCAContrast,
  detectContrastMode,
  analyzeBrandColor,
  getColorCache,
  type ContrastMode,
} from '@/lib/color-intelligence';

// ============================================
// Types
// ============================================

interface EmailThemeColors {
  // Contrast analysis
  contrastMode: ContrastMode;
  isLightContent: boolean;

  // Foreground colors (for text on surfaces)
  foregroundPrimary: string;
  foregroundSecondary: string;
  foregroundMuted: string;

  // Surface colors (backgrounds)
  surfaceBase: string;
  surfaceElevated: string;
  surfaceHover: string;
  surfaceBorder: string;

  // Primary brand derivatives
  primarySubtle: string;
  primaryMuted: string;

  // Accent derivatives
  accentSubtle: string;

  // Glass effect colors
  glassBackground: string;
  glassBorder: string;
}

// ============================================
// Color Intelligence Utilities
// ============================================

/**
 * Calculate email theme colors using OKLCH perceptual color space
 */
function calculateEmailColors(
  primaryColor: string,
  accentColor: string,
  surfaceColor: string,
  sidebarColor: string
): EmailThemeColors {
  const cache = getColorCache();

  // Get OKLCH representations for perceptual manipulation
  const primaryOklch = cache.getOklch(primaryColor);
  const surfaceOklch = cache.getOklch(surfaceColor);
  const sidebarOklch = cache.getOklch(sidebarColor);

  // Detect contrast mode for each surface
  const surfaceMode = detectContrastMode(surfaceColor);
  const sidebarMode = detectContrastMode(sidebarColor);

  // Analyze brand color for comprehensive theming
  const brandAnalysis = analyzeBrandColor(primaryColor, accentColor);

  // Calculate whether surfaces need light or dark content
  const isLightContent = surfaceMode.mode === 'light-content';
  const isSidebarLightContent = sidebarMode.mode === 'light-content';

  // Generate foreground colors using APCA-validated contrast
  const foregroundPrimary = isLightContent ? '#F8FAFC' : '#0F172A';
  const foregroundSecondary = isLightContent ? '#E2E8F0' : '#334155';
  const foregroundMuted = isLightContent ? '#94A3B8' : '#64748B';

  // Generate surface variants using OKLCH
  let surfaceBase = surfaceColor;
  let surfaceElevated = surfaceColor;
  let surfaceHover = surfaceColor;
  let surfaceBorder = surfaceColor;

  if (surfaceOklch) {
    // Lighten/darken based on content mode for proper hierarchy
    if (isLightContent) {
      // Dark theme: elevate means lighter
      surfaceBase = surfaceOklch.toHex();
      surfaceElevated = surfaceOklch.lighten(0.05).toHex();
      surfaceHover = surfaceOklch.lighten(0.08).toHex();
      surfaceBorder = surfaceOklch.lighten(0.15).toHex();
    } else {
      // Light theme: elevate means adding subtle shadow
      surfaceBase = surfaceOklch.toHex();
      surfaceElevated = surfaceOklch.darken(0.02).toHex();
      surfaceHover = surfaceOklch.darken(0.05).toHex();
      surfaceBorder = surfaceOklch.darken(0.10).toHex();
    }
  }

  // Generate primary color variants using HCT tonal palette
  const primaryHct = cache.getHct(primaryColor);
  let primarySubtle = primaryColor;
  let primaryMuted = primaryColor;

  if (primaryHct) {
    const tonalPalette = primaryHct.generateTonalPalette();
    // For dark theme: use higher tones for subtle variants
    // For light theme: use lower tones
    primarySubtle = isLightContent
      ? (tonalPalette.get(80)?.toHex() ?? primaryColor)
      : (tonalPalette.get(30)?.toHex() ?? primaryColor);
    primaryMuted = isLightContent
      ? (tonalPalette.get(60)?.toHex() ?? primaryColor)
      : (tonalPalette.get(40)?.toHex() ?? primaryColor);
  }

  // Generate accent variants
  const accentHct = cache.getHct(accentColor);
  let accentSubtle = accentColor;

  if (accentHct) {
    const tonalPalette = accentHct.generateTonalPalette();
    accentSubtle = isLightContent
      ? (tonalPalette.get(80)?.toHex() ?? accentColor)
      : (tonalPalette.get(30)?.toHex() ?? accentColor);
  }

  // Glass effect colors using OKLCH alpha blending
  const glassBackground = primaryOklch
    ? `oklch(${primaryOklch.l} ${primaryOklch.c * 0.3} ${primaryOklch.h} / 0.12)`
    : `${primaryColor}1F`;
  const glassBorder = primaryOklch
    ? `oklch(${primaryOklch.l} ${primaryOklch.c * 0.5} ${primaryOklch.h} / 0.20)`
    : `${primaryColor}33`;

  return {
    contrastMode: surfaceMode.mode,
    isLightContent,
    foregroundPrimary,
    foregroundSecondary,
    foregroundMuted,
    surfaceBase,
    surfaceElevated,
    surfaceHover,
    surfaceBorder,
    primarySubtle,
    primaryMuted,
    accentSubtle,
    glassBackground,
    glassBorder,
  };
}

/**
 * Generate OKLCH-based color with alpha
 */
function oklchWithAlpha(hex: string, alpha: number): string {
  const cache = getColorCache();
  const oklch = cache.getOklch(hex);
  if (oklch) {
    return `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / ${alpha})`;
  }
  // Fallback to rgba
  return hexToRgba(hex, alpha);
}

/**
 * Lighten color using OKLCH (perceptually uniform)
 */
function lightenOklch(hex: string, amount: number): string {
  const cache = getColorCache();
  const oklch = cache.getOklch(hex);
  if (oklch) {
    return oklch.lighten(amount).toHex();
  }
  return hex;
}

/**
 * Darken color using OKLCH (perceptually uniform)
 */
function darkenOklch(hex: string, amount: number): string {
  const cache = getColorCache();
  const oklch = cache.getOklch(hex);
  if (oklch) {
    return oklch.darken(amount).toHex();
  }
  return hex;
}

/**
 * Legacy fallback for rgba conversion
 */
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || result.length < 4) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(result[1] ?? '0', 16);
  const g = parseInt(result[2] ?? '0', 16);
  const b = parseInt(result[3] ?? '0', 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================
// Hook
// ============================================

export function useEmailTheme() {
  const { primaryColor, accentColor, surfaceColor, sidebarColor } = useTenantBranding();

  // Calculate theme colors using Color Intelligence
  const themeColors = React.useMemo(
    () => calculateEmailColors(primaryColor, accentColor, surfaceColor, sidebarColor),
    [primaryColor, accentColor, surfaceColor, sidebarColor]
  );

  React.useEffect(() => {
    const root = document.documentElement;
    const { isLightContent } = themeColors;

    // ========== EMAIL SIDEBAR (from tenant sidebarColor) ==========
    const sidebarMode = detectContrastMode(sidebarColor);
    const isSidebarLightContent = sidebarMode.mode === 'light-content';

    root.style.setProperty('--email-sidebar-bg', sidebarColor);
    root.style.setProperty('--email-sidebar-text', isSidebarLightContent ? '#F8FAFC' : '#0F172A');
    root.style.setProperty('--email-sidebar-text-muted', isSidebarLightContent ? 'rgba(248, 250, 252, 0.7)' : 'rgba(15, 23, 42, 0.6)');
    root.style.setProperty('--email-sidebar-hover', oklchWithAlpha(sidebarColor, 0.1));
    root.style.setProperty('--email-sidebar-active', oklchWithAlpha(primaryColor, 0.3));
    root.style.setProperty('--email-sidebar-active-text', accentColor);

    // ========== EMAIL LIST (derived from surfaceColor with OKLCH) ==========
    root.style.setProperty('--email-list-bg', themeColors.surfaceElevated);
    root.style.setProperty('--email-list-border', themeColors.surfaceBorder);
    root.style.setProperty('--email-list-hover', oklchWithAlpha(primaryColor, 0.15));
    root.style.setProperty('--email-list-selected', oklchWithAlpha(primaryColor, 0.25));
    root.style.setProperty('--email-list-selected-border', primaryColor);

    // ========== EMAIL TEXT (APCA-validated contrast) ==========
    root.style.setProperty('--email-text-primary', themeColors.foregroundPrimary);
    root.style.setProperty('--email-text-secondary', themeColors.foregroundSecondary);
    root.style.setProperty('--email-text-muted', themeColors.foregroundMuted);

    // ========== EMAIL UNREAD INDICATOR (from primary with HCT tonal) ==========
    root.style.setProperty('--email-unread-dot', primaryColor);
    root.style.setProperty('--email-unread-bg', oklchWithAlpha(primaryColor, 0.2));
    root.style.setProperty('--email-unread-text', themeColors.primarySubtle);

    // ========== EMAIL COMPOSE BUTTON (from primary with OKLCH hover) ==========
    root.style.setProperty('--email-compose-bg', primaryColor);
    root.style.setProperty('--email-compose-hover', darkenOklch(primaryColor, 0.1));

    // Validate compose button text contrast with APCA
    const composeContrast = APCAContrast.findOptimalTextColor(primaryColor);
    root.style.setProperty('--email-compose-text', composeContrast.color);
    root.style.setProperty('--email-compose-shadow', oklchWithAlpha(primaryColor, 0.3));

    // ========== EMAIL STAR (amber for visibility - Material Design) ==========
    root.style.setProperty('--email-star-active', '#FBBF24');
    root.style.setProperty('--email-star-inactive', themeColors.foregroundMuted);

    // ========== EMAIL ACTIONS (from primary/accent with APCA validation) ==========
    root.style.setProperty('--email-action-reply', primaryColor);
    root.style.setProperty('--email-action-forward', accentColor);
    root.style.setProperty('--email-action-delete', '#EF4444');
    root.style.setProperty('--email-action-archive', themeColors.foregroundMuted);

    // ========== FOLDER BADGES (HCT tonal variants) ==========
    root.style.setProperty('--email-badge-inbox', primaryColor);
    root.style.setProperty('--email-badge-sent', accentColor);
    root.style.setProperty('--email-badge-drafts', '#F59E0B');
    root.style.setProperty('--email-badge-trash', '#EF4444');

    // ========== PROVIDER COLORS (fixed for brand recognition) ==========
    root.style.setProperty('--email-gmail', '#EA4335');
    root.style.setProperty('--email-outlook', '#0078D4');

    // ========== EMAIL DETAIL PANEL (OKLCH surface hierarchy) ==========
    root.style.setProperty('--email-detail-bg', themeColors.surfaceBase);
    root.style.setProperty('--email-detail-header-bg', themeColors.surfaceElevated);
    root.style.setProperty('--email-detail-border', themeColors.surfaceBorder);

    // ========== EMAIL SURFACE COLORS (OKLCH-derived hierarchy) ==========
    root.style.setProperty('--email-surface', themeColors.surfaceBase);
    root.style.setProperty('--email-surface-light', themeColors.surfaceElevated);
    root.style.setProperty('--email-surface-lighter', lightenOklch(surfaceColor, 0.15));
    root.style.setProperty('--email-surface-border', themeColors.surfaceBorder);
    root.style.setProperty('--email-surface-hover', themeColors.surfaceHover);

    // ========== EMAIL INPUT COLORS (OKLCH-derived) ==========
    root.style.setProperty('--email-input-bg', themeColors.surfaceHover);
    root.style.setProperty('--email-input-border', themeColors.surfaceBorder);

    // ========== EMAIL ICON SIDEBAR (OKLCH gradient) ==========
    root.style.setProperty('--email-icon-sidebar-bg', sidebarColor);
    root.style.setProperty('--email-icon-sidebar-bg-end', darkenOklch(sidebarColor, 0.1));

    // ========== EMAIL HEADER (OKLCH surface) ==========
    root.style.setProperty('--email-header-bg', lightenOklch(surfaceColor, 0.05));

    // ========== EMAIL SEARCH (OKLCH surface) ==========
    root.style.setProperty('--email-search-bg', themeColors.surfaceElevated);
    root.style.setProperty('--email-search-border', themeColors.surfaceBorder);

    // ========== EMAIL LIST ACTIVE STATE (Glass effect with OKLCH) ==========
    root.style.setProperty('--email-list-active', themeColors.glassBackground);

    // ========== EMAIL TOOLTIP (OKLCH-derived) ==========
    root.style.setProperty('--email-tooltip-bg', darkenOklch(surfaceColor, 0.2));

    // ========== EMAIL FOLDER NAV (OKLCH surface hierarchy) ==========
    root.style.setProperty('--email-nav-bg', lightenOklch(surfaceColor, 0.05));
    root.style.setProperty('--email-nav-border', themeColors.surfaceBorder);
    root.style.setProperty('--email-nav-text', themeColors.foregroundPrimary);
    root.style.setProperty('--email-nav-text-muted', themeColors.foregroundMuted);
    root.style.setProperty('--email-nav-hover', themeColors.surfaceHover);
    root.style.setProperty('--email-nav-badge-bg', themeColors.surfaceElevated);
    root.style.setProperty('--email-nav-badge-text', themeColors.foregroundMuted);

    // ========== NEW: Glass Effect Variables (Color Intelligence) ==========
    root.style.setProperty('--email-glass-bg', themeColors.glassBackground);
    root.style.setProperty('--email-glass-border', themeColors.glassBorder);
    root.style.setProperty('--email-primary-subtle', themeColors.primarySubtle);
    root.style.setProperty('--email-primary-muted', themeColors.primaryMuted);
    root.style.setProperty('--email-accent-subtle', themeColors.accentSubtle);

    // ========== NEW: Contrast Mode Indicator ==========
    root.style.setProperty('--email-content-mode', isLightContent ? 'light' : 'dark');

    // Cleanup on unmount
    return () => {
      const emailVars = [
        '--email-sidebar-bg', '--email-sidebar-text', '--email-sidebar-hover',
        '--email-list-bg', '--email-list-border', '--email-list-hover', '--email-list-active',
        '--email-unread-dot', '--email-compose-bg', '--email-star-active',
        '--email-text-primary', '--email-text-secondary', '--email-text-muted',
        '--email-detail-bg', '--email-detail-header-bg', '--email-detail-border',
        '--email-surface', '--email-surface-light', '--email-surface-lighter',
        '--email-surface-border', '--email-surface-hover',
        '--email-input-bg', '--email-input-border',
        '--email-icon-sidebar-bg', '--email-icon-sidebar-bg-end',
        '--email-header-bg', '--email-search-bg', '--email-search-border',
        '--email-tooltip-bg',
        '--email-nav-bg', '--email-nav-border', '--email-nav-text',
        '--email-nav-text-muted', '--email-nav-hover',
        '--email-nav-badge-bg', '--email-nav-badge-text',
        '--email-glass-bg', '--email-glass-border',
        '--email-primary-subtle', '--email-primary-muted', '--email-accent-subtle',
        '--email-content-mode',
      ];
      emailVars.forEach((v) => root.style.removeProperty(v));
    };
  }, [primaryColor, accentColor, surfaceColor, sidebarColor, themeColors]);

  // Return theme analysis for components that need it
  return {
    ...themeColors,
    primaryColor,
    accentColor,
    surfaceColor,
    sidebarColor,
  };
}

export default useEmailTheme;
