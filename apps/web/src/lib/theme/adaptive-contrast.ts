// ============================================
// Adaptive Contrast Utilities v2.0
// Powered by Color Intelligence Domain
// ============================================
//
// This module now leverages the Color Intelligence Domain for
// perceptually uniform color calculations using OKLCH, HCT, and APCA.
//
// Migration: 2026-01-03
// ============================================

import {
  OKLCH as OKLCHValueObject,
  APCAContrast,
  detectContrastMode,
  detectContrastModeQuick,
  analyzeBrandColor,
  getColorCache,
  type ContrastMode,
} from '@/lib/color-intelligence';

// ============================================
// Re-export Color Intelligence types
// ============================================

// Legacy interface for backwards compatibility
export interface OKLCH {
  /** Lightness: 0-1 (0 = black, 1 = white) */
  l: number;
  /** Chroma: 0-0.4 (saturation) */
  c: number;
  /** Hue: 0-360 degrees */
  h: number;
}

// ============================================
// Color Conversion Utilities (via Color Intelligence)
// ============================================

/**
 * Convert Hex to OKLCH using Color Intelligence Domain
 */
export function hexToOklch(hex: string): OKLCH | null {
  const cache = getColorCache();
  const oklch = cache.getOklch(hex);
  if (!oklch) return null;
  return { l: oklch.l, c: oklch.c, h: oklch.h };
}

/**
 * Convert OKLCH to Hex using Color Intelligence Domain
 */
export function oklchToHex(lch: OKLCH): string {
  const oklch = OKLCHValueObject.create(lch.l, lch.c, lch.h);
  return oklch.toHex();
}

/**
 * Generate OKLCH CSS string
 * Format: oklch(L% C H)
 */
export function toOklchString(lch: OKLCH): string {
  return `oklch(${(lch.l * 100).toFixed(1)}% ${lch.c.toFixed(3)} ${lch.h.toFixed(1)})`;
}

// ============================================
// APCA Contrast (via Color Intelligence)
// ============================================

/**
 * Calculate APCA contrast between text and background
 * Returns Lc (Lightness contrast) value from -108 to +108
 *
 * Positive values: dark text on light background (BoW)
 * Negative values: light text on dark background (WoB)
 *
 * Minimum readable contrast:
 * - Body text (14px+): |Lc| >= 75
 * - Large text (24px+): |Lc| >= 60
 * - Headlines (32px+): |Lc| >= 45
 * - Spot text/UI: |Lc| >= 30
 */
export function getApcaContrast(textHex: string, bgHex: string): number {
  const cache = getColorCache();
  const apca = cache.getApca(textHex, bgHex);
  return apca.lc;
}

/**
 * Check if APCA contrast meets minimum requirements
 */
export function checkApcaContrast(
  textHex: string,
  bgHex: string,
  level: 'body' | 'large' | 'headline' | 'ui' = 'body'
): boolean {
  const cache = getColorCache();
  const apca = cache.getApca(textHex, bgHex);

  switch (level) {
    case 'body':
      return apca.isValidForBodyText();
    case 'large':
      return apca.isValidForLargeText();
    case 'headline':
      return apca.isValidForHeadlines();
    case 'ui':
      return apca.isValidForSpotText();
    default:
      return apca.isReadable();
  }
}

// ============================================
// Smart Glass Adaptive System
// ============================================

export interface AdaptiveColors {
  /** Icon color (adapts to background) */
  iconColor: string;
  /** Icon color with alpha for inactive states */
  iconColorMuted: string;
  /** Active icon color (usually tenant primary) */
  iconColorActive: string;
  /** Glass background opacity (0-1) */
  glassOpacity: number;
  /** Glass background with blur */
  glassBackground: string;
  /** Border color with adaptive opacity */
  borderColor: string;
  /** Shadow color derived from primary */
  shadowColor: string;
  /** Badge background gradient */
  badgeGradient: string;
  /** Badge text color */
  badgeTextColor: string;
  /** Whether we're in "light mode" (light primary) */
  isLightPrimary: boolean;
  /** Tooltip background */
  tooltipBackground: string;
  /** Focus ring color */
  focusRingColor: string;
  /** Contrast mode from Color Intelligence */
  contrastMode: ContrastMode;
  /** Confidence score for contrast detection */
  contrastConfidence: number;
}

/**
 * Calculate adaptive colors based on tenant primary color
 * Uses Color Intelligence Domain for perceptually uniform calculations
 *
 * @param tenantPrimary - Tenant's primary brand color (hex)
 * @param tenantAccent - Tenant's accent color (hex), optional
 * @returns AdaptiveColors object with all computed values
 */
export function getAdaptiveColors(
  tenantPrimary: string,
  tenantAccent?: string
): AdaptiveColors {
  const cache = getColorCache();
  const oklch = cache.getOklch(tenantPrimary);

  // Use Color Intelligence for contrast mode detection
  const contrastResult = detectContrastMode(tenantPrimary);
  const isLightContent = contrastResult.mode === 'light-content';

  // Determine if primary is "light" (perceptually)
  // Use Color Intelligence detection instead of raw OKLCH L comparison
  const isLightPrimary = !isLightContent; // light-content means dark background

  // Determine glass background base
  // Light primaries need darker glass, dark primaries need lighter glass
  const glassOpacity = isLightPrimary ? 0.75 : 0.12;

  // Icon colors adapt based on contrast mode
  const iconColor = isLightContent
    ? 'oklch(95% 0 0)' // Near white for dark backgrounds
    : 'oklch(25% 0 0)'; // Near black for light backgrounds

  const iconColorMuted = isLightContent
    ? 'oklch(95% 0 0 / 0.7)'
    : 'oklch(25% 0 0 / 0.6)';

  // Active icon color - use APCA to find optimal
  let iconColorActive = tenantPrimary;
  if (oklch) {
    // Use APCAContrast to find optimal text color
    const optimalResult = APCAContrast.findOptimalTextColor(tenantPrimary, {
      preferDark: !isLightContent,
      minLc: 60,
    });

    // If primary doesn't have enough contrast, adjust it
    if (oklch.l > 0.75) {
      iconColorActive = oklch.darken(0.35).toHex();
    } else if (oklch.l < 0.35) {
      iconColorActive = oklch.lighten(0.30).toHex();
    }
  }

  // Glass background using color-mix concept
  const glassBackground = isLightContent
    ? `rgba(255, 255, 255, ${glassOpacity})`
    : `rgba(0, 0, 0, ${glassOpacity})`;

  // Border color - subtle variant of primary using OKLCH
  let borderColor: string;
  if (oklch) {
    const borderOklch = OKLCHValueObject.create(
      isLightContent ? 0.85 : 0.3,
      0.02,
      oklch.h
    );
    borderColor = `oklch(${borderOklch.l} ${borderOklch.c} ${borderOklch.h} / 0.2)`;
  } else {
    borderColor = 'rgba(255, 255, 255, 0.15)';
  }

  // Shadow color derived from primary using OKLCH
  let shadowColor: string;
  if (oklch) {
    const shadowOklch = oklch.darken(0.5);
    shadowColor = `oklch(${shadowOklch.l} ${shadowOklch.c} ${shadowOklch.h} / 0.25)`;
  } else {
    shadowColor = 'rgba(0, 0, 0, 0.25)';
  }

  // Badge gradient
  const accent = tenantAccent || tenantPrimary;
  const badgeGradient = `linear-gradient(135deg, ${tenantPrimary}, ${accent})`;

  // Badge text - use APCA for optimal contrast
  const badgeTextResult = APCAContrast.findOptimalTextColor(tenantPrimary, {
    minLc: 75, // Body text requirement
  });
  const badgeTextColor = badgeTextResult.color;

  // Tooltip background
  const tooltipBackground = isLightContent
    ? 'rgba(15, 23, 42, 0.85)'
    : 'rgba(10, 10, 10, 0.9)';

  // Focus ring
  const focusRingColor = tenantPrimary;

  return {
    iconColor,
    iconColorMuted,
    iconColorActive,
    glassOpacity,
    glassBackground,
    borderColor,
    shadowColor,
    badgeGradient,
    badgeTextColor,
    isLightPrimary,
    tooltipBackground,
    focusRingColor,
    contrastMode: contrastResult.mode,
    contrastConfidence: contrastResult.confidence,
  };
}

/**
 * CSS Custom Properties for adaptive glass
 * Apply these to :root for global use
 */
export function getAdaptiveCssVars(
  tenantPrimary: string,
  tenantAccent?: string
): Record<string, string> {
  const colors = getAdaptiveColors(tenantPrimary, tenantAccent);

  return {
    '--adaptive-icon': colors.iconColor,
    '--adaptive-icon-muted': colors.iconColorMuted,
    '--adaptive-icon-active': colors.iconColorActive,
    '--adaptive-glass-opacity': String(colors.glassOpacity),
    '--adaptive-glass-bg': colors.glassBackground,
    '--adaptive-border': colors.borderColor,
    '--adaptive-shadow': colors.shadowColor,
    '--adaptive-badge-gradient': colors.badgeGradient,
    '--adaptive-badge-text': colors.badgeTextColor,
    '--adaptive-tooltip-bg': colors.tooltipBackground,
    '--adaptive-focus-ring': colors.focusRingColor,
    '--adaptive-is-light': colors.isLightPrimary ? '1' : '0',
    '--adaptive-contrast-mode': colors.contrastMode,
    '--adaptive-contrast-confidence': String(colors.contrastConfidence.toFixed(2)),
  };
}

// ============================================
// Performance Utilities
// ============================================

type IdleCallback = (deadline: IdleDeadline) => void;

/**
 * Schedule a function to run during idle time
 * Falls back to setTimeout if requestIdleCallback not available
 */
export function scheduleIdleTask(
  callback: IdleCallback,
  options?: IdleRequestOptions
): number {
  // Use type assertion for browser APIs that may not exist in all environments
  const win = typeof window !== 'undefined' ? window : undefined;

  if (win && 'requestIdleCallback' in win) {
    return (win as Window & typeof globalThis).requestIdleCallback(callback, options);
  }
  // Fallback for Safari and SSR
  if (win) {
    return setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1) as unknown as number;
  }
  // SSR fallback - return dummy ID
  return 0;
}

/**
 * Cancel a scheduled idle task
 */
export function cancelIdleTask(id: number): void {
  const win = typeof window !== 'undefined' ? window : undefined;
  if (!win) return;

  if ('cancelIdleCallback' in win) {
    (win as Window & typeof globalThis).cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * Memoized adaptive color calculation
 * Uses Color Intelligence cache for optimal performance
 */
const colorCache = new Map<string, AdaptiveColors>();
const CACHE_MAX_SIZE = 50;

export function getAdaptiveColorsCached(
  tenantPrimary: string,
  tenantAccent?: string
): AdaptiveColors {
  const cacheKey = `adaptive:${tenantPrimary}:${tenantAccent || ''}`;

  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }

  const colors = getAdaptiveColors(tenantPrimary, tenantAccent);

  // LRU-like eviction
  if (colorCache.size >= CACHE_MAX_SIZE) {
    const firstKey = colorCache.keys().next().value;
    if (firstKey) colorCache.delete(firstKey);
  }

  colorCache.set(cacheKey, colors);
  return colors;
}

// ============================================
// Quick Detection Utilities
// ============================================

/**
 * Quick contrast mode detection for performance-critical paths
 * Uses Color Intelligence's optimized quick mode
 */
export function getContrastModeQuick(hex: string): ContrastMode {
  return detectContrastModeQuick(hex);
}

/**
 * Check if a color needs light content (white text/icons)
 */
export function needsLightContent(hex: string): boolean {
  return detectContrastModeQuick(hex) === 'light-content';
}

/**
 * Check if a color needs dark content (black text/icons)
 */
export function needsDarkContent(hex: string): boolean {
  return detectContrastModeQuick(hex) === 'dark-content';
}
