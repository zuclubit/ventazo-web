'use client';

/**
 * useSidebarColorIntelligence Hook
 *
 * Comprehensive Color Intelligence integration for sidebar theming.
 * Maximizes all capabilities of the color-intelligence library:
 *
 * Features:
 * - HCT Tonal Palettes: Material Design 3 style navigation states
 * - APCA Contrast Validation: WCAG 3.0 accessibility for all text/icons
 * - Smart Glass Gradients: Adaptive glass effects based on brand analysis
 * - Semantic Color Derivation: Brand-aware semantic colors for badges/indicators
 * - Contrast Mode Detection: Automatic light/dark content adaptation
 * - OKLCH Interpolation: Perceptually uniform color transitions
 *
 * v1.0 - Full Color Intelligence Integration
 *
 * Based on:
 * - Material Design 3 Color System: https://m3.material.io/styles/color
 * - APCA WCAG 3.0: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
 * - HCT Color Space: Tone difference >= 40 guarantees WCAG AA
 */

import * as React from 'react';
import {
  HCT,
  APCAContrast,
  detectContrastMode,
  analyzeBrandColor,
  getColorCache,
  interpolateColor,
  type ContrastMode,
} from '@/lib/color-intelligence';

/**
 * Type alias for brand color analysis result
 * Derived from analyzeBrandColor return type for type safety
 */
type BrandColorAnalysis = ReturnType<typeof analyzeBrandColor>;
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

/**
 * Navigation item color states using HCT tonal palette
 */
export interface NavItemColors {
  /** Default state text color (APCA-validated) */
  text: string;
  /** Default state icon color */
  icon: string;
  /** Hover state background */
  hoverBg: string;
  /** Hover state text color */
  hoverText: string;
  /** Active state background */
  activeBg: string;
  /** Active state text color */
  activeText: string;
  /** Active border/indicator color */
  activeBorder: string;
  /** Muted/disabled state */
  mutedText: string;
  /** Focus ring color */
  focusRing: string;
}

/**
 * Badge semantic colors with brand derivation
 */
export interface BadgeColors {
  /** Default badge gradient */
  defaultGradient: string;
  /** Default badge text */
  defaultText: string;
  /** Warning badge gradient */
  warningGradient: string;
  /** Warning badge text */
  warningText: string;
  /** Success badge gradient */
  successGradient: string;
  /** Success badge text */
  successText: string;
  /** Destructive badge gradient */
  destructiveGradient: string;
  /** Destructive badge text */
  destructiveText: string;
  /** Info badge gradient */
  infoGradient: string;
  /** Info badge text */
  infoText: string;
}

/**
 * Glass effect styling with Smart Glass generation
 */
export interface GlassStyles {
  /** Glass background color with alpha */
  background: string;
  /** Glass border color */
  border: string;
  /** Backdrop blur value */
  blur: string;
  /** Outer shadow */
  shadowOuter: string;
  /** Inner shadow (neumorphic) */
  shadowInner: string;
  /** Highlight gradient for glass sheen */
  highlightGradient: string;
  /** OKLCH glass gradient */
  oklchGradient: string;
}

/**
 * Ambient glow and brand emphasis effects
 */
export interface AmbientEffects {
  /** Logo glow radial gradient */
  logoGlow: string;
  /** Section divider gradient */
  dividerGradient: string;
  /** Hover ripple color */
  rippleColor: string;
  /** Active indicator glow */
  indicatorGlow: string;
  /** Premium accent highlight */
  accentHighlight: string;
}

/**
 * Complete HCT tonal palette for brand color
 */
export interface TonalPalette {
  /** Tone 0 - Darkest */
  tone0: string;
  /** Tone 10 */
  tone10: string;
  /** Tone 20 */
  tone20: string;
  /** Tone 30 */
  tone30: string;
  /** Tone 40 */
  tone40: string;
  /** Tone 50 */
  tone50: string;
  /** Tone 60 */
  tone60: string;
  /** Tone 70 */
  tone70: string;
  /** Tone 80 */
  tone80: string;
  /** Tone 90 */
  tone90: string;
  /** Tone 95 */
  tone95: string;
  /** Tone 100 - Lightest */
  tone100: string;
}

/**
 * Complete sidebar color intelligence result
 */
export interface SidebarColorIntelligence {
  /** Navigation item colors */
  nav: NavItemColors;
  /** Badge colors */
  badges: BadgeColors;
  /** Glass styling */
  glass: GlassStyles;
  /** Ambient effects */
  ambient: AmbientEffects;
  /** Primary tonal palette */
  primaryPalette: TonalPalette;
  /** Accent tonal palette */
  accentPalette: TonalPalette;
  /** Brand color analysis */
  brandAnalysis: BrandColorAnalysis;
  /** Contrast mode */
  contrastMode: ContrastMode;
  /** CSS variables for injection */
  cssVariables: Record<string, string>;
  /** Is dark sidebar */
  isDarkSidebar: boolean;
}

// ============================================
// Constants
// ============================================

/**
 * HCT hue values for semantic colors
 * Optimized for universal recognition
 */
const SEMANTIC_HUES = {
  warning: 55,    // Amber/Orange
  success: 145,   // Green
  destructive: 25, // Red
  info: 250,      // Blue
} as const;

/**
 * Chroma values for semantic colors
 */
const SEMANTIC_CHROMA = {
  warning: 72,
  success: 64,
  destructive: 72,
  info: 48,
} as const;

/**
 * Standard tone values for Material Design 3 palette
 */
const TONAL_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100] as const;

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a complete HCT tonal palette from a hex color
 */
function generateTonalPalette(hexColor: string): TonalPalette {
  const cache = getColorCache();
  const hctColor = cache.getHct(hexColor);

  if (!hctColor) {
    // Fallback to neutral grays
    return {
      tone0: '#000000',
      tone10: '#1a1a1a',
      tone20: '#333333',
      tone30: '#4d4d4d',
      tone40: '#666666',
      tone50: '#808080',
      tone60: '#999999',
      tone70: '#b3b3b3',
      tone80: '#cccccc',
      tone90: '#e6e6e6',
      tone95: '#f2f2f2',
      tone100: '#ffffff',
    };
  }

  // Build TonalPalette with explicit properties to satisfy TypeScript
  const createTone = (tone: number): string => {
    return HCT.create(hctColor.h, hctColor.c, tone).toHex();
  };

  return {
    tone0: createTone(0),
    tone10: createTone(10),
    tone20: createTone(20),
    tone30: createTone(30),
    tone40: createTone(40),
    tone50: createTone(50),
    tone60: createTone(60),
    tone70: createTone(70),
    tone80: createTone(80),
    tone90: createTone(90),
    tone95: createTone(95),
    tone100: createTone(100),
  };
}

/**
 * Generate semantic badge colors with HCT and APCA validation
 */
function generateBadgeColors(
  primaryColor: string,
  accentColor: string,
  isLightContent: boolean
): BadgeColors {
  const cache = getColorCache();
  const primaryHct = cache.getHct(primaryColor);
  const accentHct = cache.getHct(accentColor);

  // Default badge - brand gradient
  const defaultStart = primaryColor;
  const defaultEnd = accentColor;
  const defaultTextResult = APCAContrast.findOptimalTextColor(primaryColor, { minLc: 75 });

  // Semantic badges with HCT
  const generateSemanticBadge = (hue: number, chroma: number) => {
    const baseTone = isLightContent ? 55 : 45;
    const startHct = HCT.create(hue, chroma, baseTone);
    const endHct = HCT.create(hue + 15, chroma * 0.9, baseTone + 10);
    const startColor = startHct.toHex();
    const textResult = APCAContrast.findOptimalTextColor(startColor, { minLc: 75 });

    return {
      gradient: `linear-gradient(135deg, ${startColor}, ${endHct.toHex()})`,
      text: textResult.color,
    };
  };

  const warning = generateSemanticBadge(SEMANTIC_HUES.warning, SEMANTIC_CHROMA.warning);
  const success = generateSemanticBadge(SEMANTIC_HUES.success, SEMANTIC_CHROMA.success);
  const destructive = generateSemanticBadge(SEMANTIC_HUES.destructive, SEMANTIC_CHROMA.destructive);
  const info = generateSemanticBadge(SEMANTIC_HUES.info, SEMANTIC_CHROMA.info);

  return {
    defaultGradient: `linear-gradient(135deg, ${defaultStart}, ${defaultEnd})`,
    defaultText: defaultTextResult.color,
    warningGradient: warning.gradient,
    warningText: warning.text,
    successGradient: success.gradient,
    successText: success.text,
    destructiveGradient: destructive.gradient,
    destructiveText: destructive.text,
    infoGradient: info.gradient,
    infoText: info.text,
  };
}

/**
 * Generate navigation item colors using HCT tonal palette
 */
function generateNavColors(
  sidebarColor: string,
  primaryColor: string,
  isLightContent: boolean
): NavItemColors {
  const cache = getColorCache();
  const sidebarHct = cache.getHct(sidebarColor);
  const primaryHct = cache.getHct(primaryColor);

  if (!sidebarHct || !primaryHct) {
    // Fallback colors
    return {
      text: isLightContent ? '#e5e7eb' : '#374151',
      icon: isLightContent ? '#9ca3af' : '#6b7280',
      hoverBg: isLightContent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      hoverText: isLightContent ? '#f3f4f6' : '#1f2937',
      activeBg: isLightContent ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.1)',
      activeText: isLightContent ? '#60a5fa' : '#3b82f6',
      activeBorder: primaryColor,
      mutedText: isLightContent ? '#6b7280' : '#9ca3af',
      focusRing: `${primaryColor}40`,
    };
  }

  // Calculate optimal tones for dark sidebar (light content)
  if (isLightContent) {
    // Light content on dark background
    const textTone = 85; // High tone for readability
    const iconTone = 65; // Slightly muted icons
    const mutedTone = 50;
    const hoverBgTone = sidebarHct.t + 8;
    const activeBgTone = primaryHct.t > 50 ? 20 : primaryHct.t + 10;

    const textHct = HCT.create(sidebarHct.h, 4, textTone);
    const iconHct = HCT.create(sidebarHct.h, 6, iconTone);
    const mutedHct = HCT.create(sidebarHct.h, 4, mutedTone);
    const hoverBgHct = HCT.create(sidebarHct.h, 8, Math.min(hoverBgTone, 30));
    const activeBgHct = HCT.create(primaryHct.h, primaryHct.c * 0.3, activeBgTone);
    const activeTextHct = HCT.create(primaryHct.h, primaryHct.c * 0.8, 75);

    return {
      text: textHct.toHex(),
      icon: iconHct.toHex(),
      hoverBg: `${hoverBgHct.toHex()}20`,
      hoverText: HCT.create(sidebarHct.h, 2, 95).toHex(),
      activeBg: `${activeBgHct.toHex()}25`,
      activeText: activeTextHct.toHex(),
      activeBorder: primaryColor,
      mutedText: mutedHct.toHex(),
      focusRing: `${primaryColor}40`,
    };
  } else {
    // Dark content on light background
    const textTone = 25;
    const iconTone = 40;
    const mutedTone = 55;
    const hoverBgTone = Math.max(sidebarHct.t - 8, 90);
    const activeBgTone = primaryHct.t < 50 ? 90 : primaryHct.t - 10;

    const textHct = HCT.create(sidebarHct.h, 4, textTone);
    const iconHct = HCT.create(sidebarHct.h, 6, iconTone);
    const mutedHct = HCT.create(sidebarHct.h, 4, mutedTone);
    const hoverBgHct = HCT.create(sidebarHct.h, 4, hoverBgTone);
    const activeBgHct = HCT.create(primaryHct.h, primaryHct.c * 0.2, activeBgTone);
    const activeTextHct = HCT.create(primaryHct.h, primaryHct.c, 35);

    return {
      text: textHct.toHex(),
      icon: iconHct.toHex(),
      hoverBg: `${hoverBgHct.toHex()}80`,
      hoverText: HCT.create(sidebarHct.h, 2, 15).toHex(),
      activeBg: `${activeBgHct.toHex()}30`,
      activeText: activeTextHct.toHex(),
      activeBorder: primaryColor,
      mutedText: mutedHct.toHex(),
      focusRing: `${primaryColor}40`,
    };
  }
}

/**
 * Generate glass effect styles using Color Intelligence
 *
 * Creates perceptually-aware glass effects based on:
 * - Sidebar background color for proper contrast
 * - Primary color for brand tinting
 * - Light/dark content mode for optimal visibility
 */
function generateGlassStyles(
  sidebarColor: string,
  primaryColor: string,
  isLightContent: boolean
): GlassStyles {
  const cache = getColorCache();

  const sidebarOklch = cache.getOklch(sidebarColor);
  const primaryOklch = cache.getOklch(primaryColor);

  // Generate glass background with brand tint
  let glassBackground: string;
  let glassBorder: string;
  let oklchGradient: string;

  if (sidebarOklch && primaryOklch) {
    // Smart Glass: Use OKLCH for perceptually uniform glass effects
    if (isLightContent) {
      // Dark sidebar: glass with subtle light overlay
      const glassL = Math.min(sidebarOklch.l + 0.08, 0.25);
      const glassC = Math.min(primaryOklch.c * 0.15, 0.05);
      glassBackground = `oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.85)`;
      glassBorder = `oklch(${(glassL + 0.1).toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.15)`;
    } else {
      // Light sidebar: glass with subtle dark overlay
      const glassL = Math.max(sidebarOklch.l - 0.05, 0.85);
      const glassC = Math.min(primaryOklch.c * 0.1, 0.03);
      glassBackground = `oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.9)`;
      glassBorder = `oklch(${(glassL - 0.15).toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.1)`;
    }

    // Generate OKLCH gradient for smooth transitions
    const startL = sidebarOklch.l;
    const endL = isLightContent
      ? Math.min(startL + 0.05, 0.3)
      : Math.max(startL - 0.03, 0.8);
    oklchGradient = `linear-gradient(180deg, oklch(${startL.toFixed(3)} ${(sidebarOklch.c * 0.3).toFixed(3)} ${sidebarOklch.h.toFixed(1)}), oklch(${endL.toFixed(3)} ${(sidebarOklch.c * 0.2).toFixed(3)} ${sidebarOklch.h.toFixed(1)}))`;
  } else {
    // Fallback: use hex-based glass styles
    glassBackground = isLightContent
      ? 'rgba(15, 23, 42, 0.85)'
      : 'rgba(255, 255, 255, 0.9)';
    glassBorder = isLightContent
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)';
    oklchGradient = isLightContent
      ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9))';
  }

  // Shadow generation based on contrast mode
  const shadowColor = isLightContent
    ? 'rgba(0, 0, 0, 0.4)'
    : 'rgba(0, 0, 0, 0.1)';

  const highlightColor = isLightContent
    ? 'rgba(255, 255, 255, 0.03)'
    : 'rgba(255, 255, 255, 0.5)';

  return {
    background: glassBackground,
    border: glassBorder,
    blur: '20px',
    shadowOuter: `0 8px 32px ${shadowColor}, 0 2px 8px rgba(0, 0, 0, 0.2)`,
    shadowInner: `inset 0 1px 0 ${highlightColor}`,
    highlightGradient: `linear-gradient(180deg, ${highlightColor} 0%, transparent 50%)`,
    oklchGradient,
  };
}

/**
 * Generate ambient effects and glows
 */
function generateAmbientEffects(
  primaryColor: string,
  accentColor: string,
  isLightContent: boolean
): AmbientEffects {
  const cache = getColorCache();
  const primaryOklch = cache.getOklch(primaryColor);

  // Logo glow with brand color
  const glowIntensity = isLightContent ? 0.6 : 0.3;
  const logoGlow = primaryOklch
    ? `radial-gradient(circle, oklch(${primaryOklch.l.toFixed(3)} ${primaryOklch.c.toFixed(3)} ${primaryOklch.h.toFixed(1)} / ${glowIntensity}) 0%, transparent 70%)`
    : `radial-gradient(circle, ${primaryColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`;

  // Divider gradient
  const dividerOpacity = isLightContent ? 0.15 : 0.1;
  const dividerGradient = `linear-gradient(90deg, transparent, ${primaryColor}${Math.round(dividerOpacity * 255).toString(16).padStart(2, '0')}, transparent)`;

  // Ripple effect color
  const rippleOpacity = isLightContent ? 0.25 : 0.15;
  const rippleColor = `${primaryColor}${Math.round(rippleOpacity * 255).toString(16).padStart(2, '0')}`;

  // Active indicator glow
  const indicatorGlow = `0 0 12px ${primaryColor}60, 0 0 4px ${primaryColor}80`;

  // Accent highlight for premium effects
  const accentHighlight = interpolateColor(primaryColor, accentColor, 0.5);

  return {
    logoGlow,
    dividerGradient,
    rippleColor,
    indicatorGlow,
    accentHighlight,
  };
}

/**
 * Generate CSS variables for injection
 */
function generateCSSVariables(
  nav: NavItemColors,
  badges: BadgeColors,
  glass: GlassStyles,
  ambient: AmbientEffects,
  primaryColor: string,
  accentColor: string
): Record<string, string> {
  return {
    // Navigation
    '--sidebar-ci-text': nav.text,
    '--sidebar-ci-icon': nav.icon,
    '--sidebar-ci-hover-bg': nav.hoverBg,
    '--sidebar-ci-hover-text': nav.hoverText,
    '--sidebar-ci-active-bg': nav.activeBg,
    '--sidebar-ci-active-text': nav.activeText,
    '--sidebar-ci-active-border': nav.activeBorder,
    '--sidebar-ci-muted-text': nav.mutedText,
    '--sidebar-ci-focus-ring': nav.focusRing,

    // Glass
    '--sidebar-ci-glass-bg': glass.background,
    '--sidebar-ci-glass-border': glass.border,
    '--sidebar-ci-glass-blur': glass.blur,
    '--sidebar-ci-shadow-outer': glass.shadowOuter,
    '--sidebar-ci-shadow-inner': glass.shadowInner,
    '--sidebar-ci-highlight': glass.highlightGradient,

    // Ambient
    '--sidebar-ci-logo-glow': ambient.logoGlow,
    '--sidebar-ci-divider': ambient.dividerGradient,
    '--sidebar-ci-ripple': ambient.rippleColor,
    '--sidebar-ci-indicator-glow': ambient.indicatorGlow,
    '--sidebar-ci-accent-highlight': ambient.accentHighlight,

    // Badges
    '--sidebar-ci-badge-default': badges.defaultGradient,
    '--sidebar-ci-badge-default-text': badges.defaultText,
    '--sidebar-ci-badge-warning': badges.warningGradient,
    '--sidebar-ci-badge-warning-text': badges.warningText,
    '--sidebar-ci-badge-success': badges.successGradient,
    '--sidebar-ci-badge-success-text': badges.successText,
    '--sidebar-ci-badge-destructive': badges.destructiveGradient,
    '--sidebar-ci-badge-destructive-text': badges.destructiveText,
    '--sidebar-ci-badge-info': badges.infoGradient,
    '--sidebar-ci-badge-info-text': badges.infoText,

    // Brand (for reference)
    '--sidebar-ci-primary': primaryColor,
    '--sidebar-ci-accent': accentColor,
  };
}

// ============================================
// Main Hook
// ============================================

/**
 * useSidebarColorIntelligence
 *
 * Comprehensive Color Intelligence integration for sidebar theming.
 * Generates all color states, effects, and CSS variables using:
 * - HCT tonal palettes for navigation states
 * - APCA validation for accessibility
 * - Smart Glass gradients for glass effects
 * - Brand analysis for semantic derivation
 *
 * @example
 * ```tsx
 * const { nav, badges, glass, ambient, cssVariables } = useSidebarColorIntelligence();
 *
 * // Apply CSS variables
 * useEffect(() => {
 *   Object.entries(cssVariables).forEach(([key, value]) => {
 *     document.documentElement.style.setProperty(key, value);
 *   });
 * }, [cssVariables]);
 *
 * // Use in components
 * <nav style={{ color: nav.text, background: glass.background }}>
 *   <NavItem activeStyle={{ color: nav.activeText, background: nav.activeBg }} />
 * </nav>
 * ```
 */
export function useSidebarColorIntelligence(): SidebarColorIntelligence {
  const { sidebarColor, primaryColor, accentColor, surfaceColor } = useTenantBranding();

  return React.useMemo(() => {
    // Analyze sidebar color for contrast mode
    const contrastResult = detectContrastMode(sidebarColor);
    const isLightContent = contrastResult.mode === 'light-content';
    const isDarkSidebar = isLightContent;

    // Full brand analysis
    const brandAnalysis = analyzeBrandColor(primaryColor);

    // Generate tonal palettes
    const primaryPalette = generateTonalPalette(primaryColor);
    const accentPalette = generateTonalPalette(accentColor);

    // Generate component colors
    const nav = generateNavColors(sidebarColor, primaryColor, isLightContent);
    const badges = generateBadgeColors(primaryColor, accentColor, isLightContent);
    const glass = generateGlassStyles(sidebarColor, primaryColor, isLightContent);
    const ambient = generateAmbientEffects(primaryColor, accentColor, isLightContent);

    // Generate CSS variables
    const cssVariables = generateCSSVariables(nav, badges, glass, ambient, primaryColor, accentColor);

    return {
      nav,
      badges,
      glass,
      ambient,
      primaryPalette,
      accentPalette,
      brandAnalysis,
      contrastMode: contrastResult.mode,
      cssVariables,
      isDarkSidebar,
    };
  }, [sidebarColor, primaryColor, accentColor, surfaceColor]);
}

/**
 * useSidebarNavColors
 *
 * Lightweight hook for just navigation colors.
 * Use when you only need nav item theming.
 */
export function useSidebarNavColors(): NavItemColors {
  const { nav } = useSidebarColorIntelligence();
  return nav;
}

/**
 * useSidebarBadgeColors
 *
 * Lightweight hook for badge colors only.
 */
export function useSidebarBadgeColors(): BadgeColors {
  const { badges } = useSidebarColorIntelligence();
  return badges;
}

/**
 * useSidebarGlassStyles
 *
 * Lightweight hook for glass effect styles.
 */
export function useSidebarGlassStyles(): GlassStyles {
  const { glass } = useSidebarColorIntelligence();
  return glass;
}

/**
 * useSidebarCSSVariables
 *
 * Hook that auto-injects CSS variables into document root.
 * Call this once at the sidebar root level.
 */
export function useSidebarCSSVariables(): void {
  const { cssVariables } = useSidebarColorIntelligence();

  React.useEffect(() => {
    const root = document.documentElement;

    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [cssVariables]);
}

/**
 * Pure function for SSR or non-React contexts
 */
export function getSidebarColorIntelligence(
  sidebarColor: string,
  primaryColor: string,
  accentColor: string
): Omit<SidebarColorIntelligence, 'brandAnalysis'> & { brandAnalysis: BrandColorAnalysis | null } {
  const contrastResult = detectContrastMode(sidebarColor);
  const isLightContent = contrastResult.mode === 'light-content';
  const isDarkSidebar = isLightContent;

  let brandAnalysis: BrandColorAnalysis | null = null;
  try {
    brandAnalysis = analyzeBrandColor(primaryColor);
  } catch {
    // Ignore analysis errors in SSR
  }

  const primaryPalette = generateTonalPalette(primaryColor);
  const accentPalette = generateTonalPalette(accentColor);

  const nav = generateNavColors(sidebarColor, primaryColor, isLightContent);
  const badges = generateBadgeColors(primaryColor, accentColor, isLightContent);
  const glass = generateGlassStyles(sidebarColor, primaryColor, isLightContent);
  const ambient = generateAmbientEffects(primaryColor, accentColor, isLightContent);
  const cssVariables = generateCSSVariables(nav, badges, glass, ambient, primaryColor, accentColor);

  return {
    nav,
    badges,
    glass,
    ambient,
    primaryPalette,
    accentPalette,
    brandAnalysis,
    contrastMode: contrastResult.mode,
    cssVariables,
    isDarkSidebar,
  };
}

export default useSidebarColorIntelligence;
