'use client';

/**
 * useBottomNavColorIntelligence Hook
 *
 * Comprehensive Color Intelligence integration for mobile bottom navigation.
 * Implements Phase 2-5 color-intelligence capabilities with Gold tier minimum.
 *
 * Features:
 * - HCT Tonal Palettes: Material Design 3 style mobile navigation states
 * - APCA Contrast Validation: WCAG 3.0 Gold tier (Lc ≥ 75) for all elements
 * - Smart Glass Gradients: Adaptive glass effects for bottom bar
 * - Perceptual Color Derivation: Brand-aware semantic colors
 * - Touch State Optimization: Enhanced feedback for mobile interactions
 * - OKLCH Interpolation: Perceptually uniform color transitions
 *
 * WCAG 3.0 Tier Requirements (Mobile-Optimized):
 * - Gold (Lc ≥ 75): ALL bottom nav elements (higher requirement for mobile)
 * - Platinum (Lc ≥ 90): Active navigation indicator
 *
 * Rationale for Gold Minimum:
 * - Mobile devices used in varying lighting conditions
 * - Smaller touch targets require higher visual contrast
 * - Outdoor readability requirements
 * - Accessibility for users with presbyopia (common in mobile users)
 *
 * v1.0 - Full Color Intelligence Integration for Mobile Bottom Nav
 *
 * Based on:
 * - Material Design 3 Color System: https://m3.material.io/styles/color
 * - APCA WCAG 3.0: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
 * - HCT Color Space: Tone difference >= 50 guarantees WCAG AAA equivalent
 *
 * @module components/layout/hooks/useBottomNavColorIntelligence
 * @version 1.0.0
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

import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

/**
 * Type alias for brand color analysis result
 */
type BrandColorAnalysis = ReturnType<typeof analyzeBrandColor>;

/**
 * Bottom navigation item color states using HCT tonal palette
 * All states must meet Gold tier minimum (Lc ≥ 75)
 */
export interface BottomNavItemColors {
  /** Inactive state text/label color (Gold validated) */
  inactiveText: string;
  /** Inactive state icon color (Gold validated) */
  inactiveIcon: string;
  /** Active state text/label color (Platinum target) */
  activeText: string;
  /** Active state icon color (Platinum target) */
  activeIcon: string;
  /** Active indicator background */
  activeBg: string;
  /** Active indicator dot/pill color */
  activeIndicator: string;
  /** Pressed/touch state background */
  pressedBg: string;
  /** Pressed/touch state text */
  pressedText: string;
  /** Focus ring color (keyboard navigation) */
  focusRing: string;
  /** Disabled state color */
  disabledText: string;
}

/**
 * Bottom bar container styling
 */
export interface BottomBarStyles {
  /** Bar background color */
  background: string;
  /** Bar border color */
  border: string;
  /** Blur amount for glass effect */
  blur: string;
  /** Shadow for elevation */
  shadow: string;
  /** Inner highlight */
  highlight: string;
  /** OKLCH gradient for premium effect */
  oklchGradient: string;
}

/**
 * Sheet/More menu colors (extends bottom nav palette)
 */
export interface SheetNavColors {
  /** Section header text */
  sectionHeader: string;
  /** Item text color */
  itemText: string;
  /** Item icon background */
  itemIconBg: string;
  /** Item icon color */
  itemIcon: string;
  /** Item active text */
  itemActiveText: string;
  /** Item active icon background */
  itemActiveIconBg: string;
  /** Item active indicator */
  itemActiveIndicator: string;
  /** Item hover background */
  itemHoverBg: string;
  /** Divider color */
  divider: string;
}

/**
 * Touch feedback effects
 */
export interface TouchFeedbackEffects {
  /** Ripple color on press */
  rippleColor: string;
  /** Scale transform value */
  scalePressed: string;
  /** Haptic feedback duration (for reference) */
  hapticDuration: string;
  /** Active glow effect */
  activeGlow: string;
}

/**
 * Complete HCT tonal palette for brand color
 */
export interface TonalPalette {
  tone0: string;
  tone10: string;
  tone20: string;
  tone30: string;
  tone40: string;
  tone50: string;
  tone60: string;
  tone70: string;
  tone80: string;
  tone90: string;
  tone95: string;
  tone100: string;
}

/**
 * Complete bottom navigation color intelligence result
 */
export interface BottomNavColorIntelligence {
  /** Navigation item colors */
  items: BottomNavItemColors;
  /** Bottom bar container styles */
  bar: BottomBarStyles;
  /** Sheet navigation colors */
  sheet: SheetNavColors;
  /** Touch feedback effects */
  touch: TouchFeedbackEffects;
  /** Primary tonal palette */
  primaryPalette: TonalPalette;
  /** Brand color analysis */
  brandAnalysis: BrandColorAnalysis;
  /** Contrast mode detected */
  contrastMode: ContrastMode;
  /** CSS variables for injection */
  cssVariables: Record<string, string>;
  /** Is dark bottom bar */
  isDarkBar: boolean;
  /** APCA scores for validation */
  apcaScores: Record<string, number>;
}

// ============================================
// Constants
// ============================================

/**
 * APCA Lc thresholds for WCAG 3.0 tiers
 * Bottom nav uses Gold minimum for all elements
 */
const APCA_THRESHOLDS = {
  bronze: 45,    // Minimum for decorative elements
  silver: 60,    // Body text minimum
  gold: 75,      // Bottom nav minimum (mobile-optimized)
  platinum: 90,  // Active navigation target
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
 * Ensure color meets Gold tier minimum (Lc ≥ 75)
 * Auto-remediate if necessary
 */
function ensureGoldTier(
  foreground: string,
  background: string,
  preferLight: boolean
): { color: string; apcaLc: number } {
  const cache = getColorCache();
  const apcaResult = cache.getApca(foreground, background);

  // Check if already meets Gold tier
  if (apcaResult.absoluteLc >= APCA_THRESHOLDS.gold) {
    return { color: foreground, apcaLc: apcaResult.absoluteLc };
  }

  // Auto-remediate to Gold tier
  const optimal = APCAContrast.findOptimalTextColor(background, {
    minLc: APCA_THRESHOLDS.gold,
    preferDark: !preferLight,
  });

  return { color: optimal.color, apcaLc: optimal.contrast.absoluteLc };
}

/**
 * Ensure color meets Platinum tier (Lc ≥ 90)
 * For critical active navigation elements
 */
function ensurePlatinumTier(
  foreground: string,
  background: string,
  preferLight: boolean
): { color: string; apcaLc: number } {
  const cache = getColorCache();
  const apcaResult = cache.getApca(foreground, background);

  if (apcaResult.absoluteLc >= APCA_THRESHOLDS.platinum) {
    return { color: foreground, apcaLc: apcaResult.absoluteLc };
  }

  const optimal = APCAContrast.findOptimalTextColor(background, {
    minLc: APCA_THRESHOLDS.platinum,
    preferDark: !preferLight,
  });

  return { color: optimal.color, apcaLc: optimal.contrast.absoluteLc };
}

/**
 * Generate bottom navigation item colors using HCT tonal palette
 * All colors validated for Gold tier minimum
 */
function generateItemColors(
  barColor: string,
  primaryColor: string,
  isLightContent: boolean
): { colors: BottomNavItemColors; apcaScores: Record<string, number> } {
  const cache = getColorCache();
  const barHct = cache.getHct(barColor);
  const primaryHct = cache.getHct(primaryColor);
  const apcaScores: Record<string, number> = {};

  if (!barHct || !primaryHct) {
    // Fallback with guaranteed contrast
    const fallbackInactive = isLightContent ? '#9ca3af' : '#6b7280';
    const fallbackActive = isLightContent ? '#60a5fa' : '#3b82f6';

    return {
      colors: {
        inactiveText: fallbackInactive,
        inactiveIcon: fallbackInactive,
        activeText: fallbackActive,
        activeIcon: fallbackActive,
        activeBg: `${fallbackActive}20`,
        activeIndicator: fallbackActive,
        pressedBg: `${fallbackActive}30`,
        pressedText: fallbackActive,
        focusRing: `${fallbackActive}60`,
        disabledText: isLightContent ? '#4b5563' : '#d1d5db',
      },
      apcaScores: {},
    };
  }

  if (isLightContent) {
    // Light content on dark background (typical mobile bottom bar)

    // Inactive items: Gold tier (Lc ≥ 75)
    const inactiveTextTone = 70; // Start with high tone
    const rawInactiveText = HCT.create(barHct.h, 6, inactiveTextTone).toHex();
    const inactiveResult = ensureGoldTier(rawInactiveText, barColor, true);
    apcaScores['inactiveText'] = inactiveResult.apcaLc;

    // Inactive icons slightly more muted but still Gold tier
    const rawInactiveIcon = HCT.create(barHct.h, 8, inactiveTextTone - 5).toHex();
    const inactiveIconResult = ensureGoldTier(rawInactiveIcon, barColor, true);
    apcaScores['inactiveIcon'] = inactiveIconResult.apcaLc;

    // Active items: Platinum tier (Lc ≥ 90) for maximum visibility
    const activeTextTone = 85;
    const rawActiveText = HCT.create(primaryHct.h, primaryHct.c * 0.8, activeTextTone).toHex();
    const activeResult = ensurePlatinumTier(rawActiveText, barColor, true);
    apcaScores['activeText'] = activeResult.apcaLc;

    // Active icon matches active text
    const activeIconResult = ensurePlatinumTier(rawActiveText, barColor, true);
    apcaScores['activeIcon'] = activeIconResult.apcaLc;

    // Active background with brand color
    const activeBgHct = HCT.create(primaryHct.h, primaryHct.c * 0.4, 25);
    const activeBg = `${activeBgHct.toHex()}30`;

    // Active indicator (pill/dot)
    const activeIndicator = HCT.create(primaryHct.h, primaryHct.c, 65).toHex();

    // Pressed/touch states
    const pressedBg = `${primaryHct.h ? HCT.create(primaryHct.h, primaryHct.c * 0.3, 30).toHex() : '#ffffff'}40`;
    const pressedText = activeResult.color;

    // Focus ring
    const focusRing = `${activeIndicator}60`;

    // Disabled state: Bronze tier only (intentionally lower)
    const disabledText = HCT.create(barHct.h, 4, 45).toHex();
    apcaScores['disabledText'] = cache.getApca(disabledText, barColor).absoluteLc;

    return {
      colors: {
        inactiveText: inactiveResult.color,
        inactiveIcon: inactiveIconResult.color,
        activeText: activeResult.color,
        activeIcon: activeIconResult.color,
        activeBg,
        activeIndicator,
        pressedBg,
        pressedText,
        focusRing,
        disabledText,
      },
      apcaScores,
    };
  } else {
    // Dark content on light background (less common for bottom bars)

    const inactiveTextTone = 35;
    const rawInactiveText = HCT.create(barHct.h, 6, inactiveTextTone).toHex();
    const inactiveResult = ensureGoldTier(rawInactiveText, barColor, false);
    apcaScores['inactiveText'] = inactiveResult.apcaLc;

    const rawInactiveIcon = HCT.create(barHct.h, 8, inactiveTextTone + 5).toHex();
    const inactiveIconResult = ensureGoldTier(rawInactiveIcon, barColor, false);
    apcaScores['inactiveIcon'] = inactiveIconResult.apcaLc;

    const activeTextTone = 25;
    const rawActiveText = HCT.create(primaryHct.h, primaryHct.c, activeTextTone).toHex();
    const activeResult = ensurePlatinumTier(rawActiveText, barColor, false);
    apcaScores['activeText'] = activeResult.apcaLc;

    const activeIconResult = ensurePlatinumTier(rawActiveText, barColor, false);
    apcaScores['activeIcon'] = activeIconResult.apcaLc;

    const activeBgHct = HCT.create(primaryHct.h, primaryHct.c * 0.2, 85);
    const activeBg = `${activeBgHct.toHex()}40`;

    const activeIndicator = HCT.create(primaryHct.h, primaryHct.c, 45).toHex();

    const pressedBg = `${HCT.create(primaryHct.h, primaryHct.c * 0.2, 80).toHex()}50`;
    const pressedText = activeResult.color;

    const focusRing = `${activeIndicator}50`;

    const disabledText = HCT.create(barHct.h, 4, 60).toHex();
    apcaScores['disabledText'] = cache.getApca(disabledText, barColor).absoluteLc;

    return {
      colors: {
        inactiveText: inactiveResult.color,
        inactiveIcon: inactiveIconResult.color,
        activeText: activeResult.color,
        activeIcon: activeIconResult.color,
        activeBg,
        activeIndicator,
        pressedBg,
        pressedText,
        focusRing,
        disabledText,
      },
      apcaScores,
    };
  }
}

/**
 * Generate bottom bar container styles
 */
function generateBarStyles(
  barColor: string,
  primaryColor: string,
  isLightContent: boolean
): BottomBarStyles {
  const cache = getColorCache();
  const barOklch = cache.getOklch(barColor);
  const primaryOklch = cache.getOklch(primaryColor);

  let background: string;
  let border: string;
  let oklchGradient: string;

  if (barOklch && primaryOklch) {
    // Smart Glass using OKLCH for perceptually uniform effects
    if (isLightContent) {
      const glassL = Math.min(barOklch.l + 0.05, 0.2);
      const glassC = Math.min(primaryOklch.c * 0.1, 0.03);
      background = `oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.98)`;
      border = `oklch(${(glassL + 0.08).toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.12)`;

      const endL = Math.min(glassL + 0.03, 0.25);
      oklchGradient = `linear-gradient(180deg, oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${barOklch.h.toFixed(1)}), oklch(${endL.toFixed(3)} ${(glassC * 0.8).toFixed(3)} ${barOklch.h.toFixed(1)}))`;
    } else {
      const glassL = Math.max(barOklch.l - 0.03, 0.9);
      const glassC = Math.min(primaryOklch.c * 0.08, 0.02);
      background = `oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.98)`;
      border = `oklch(${(glassL - 0.1).toFixed(3)} ${glassC.toFixed(3)} ${primaryOklch.h.toFixed(1)} / 0.08)`;

      const endL = Math.max(glassL - 0.02, 0.85);
      oklchGradient = `linear-gradient(180deg, oklch(${glassL.toFixed(3)} ${glassC.toFixed(3)} ${barOklch.h.toFixed(1)}), oklch(${endL.toFixed(3)} ${(glassC * 0.8).toFixed(3)} ${barOklch.h.toFixed(1)}))`;
    }
  } else {
    // Fallback
    background = isLightContent
      ? 'rgba(15, 23, 42, 0.98)'
      : 'rgba(255, 255, 255, 0.98)';
    border = isLightContent
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(0, 0, 0, 0.06)';
    oklchGradient = isLightContent
      ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
      : 'linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))';
  }

  // Shadow optimized for mobile elevation perception
  const shadowColor = isLightContent
    ? 'rgba(0, 0, 0, 0.5)'
    : 'rgba(0, 0, 0, 0.15)';

  const highlightColor = isLightContent
    ? 'rgba(255, 255, 255, 0.04)'
    : 'rgba(255, 255, 255, 0.6)';

  return {
    background,
    border,
    blur: '20px',
    shadow: `0 -4px 20px -4px ${shadowColor}, 0 -1px 4px rgba(0, 0, 0, 0.1)`,
    highlight: `linear-gradient(180deg, ${highlightColor} 0%, transparent 40%)`,
    oklchGradient,
  };
}

/**
 * Generate sheet navigation colors (for "Más" menu)
 */
function generateSheetColors(
  barColor: string,
  primaryColor: string,
  isLightContent: boolean
): SheetNavColors {
  const cache = getColorCache();
  const barHct = cache.getHct(barColor);
  const primaryHct = cache.getHct(primaryColor);

  if (!barHct || !primaryHct) {
    // Fallback colors
    return {
      sectionHeader: isLightContent ? '#64748b' : '#94a3b8',
      itemText: isLightContent ? '#e2e8f0' : '#1e293b',
      itemIconBg: isLightContent ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      itemIcon: isLightContent ? '#94a3b8' : '#64748b',
      itemActiveText: isLightContent ? '#60a5fa' : '#3b82f6',
      itemActiveIconBg: isLightContent ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.15)',
      itemActiveIndicator: isLightContent ? '#60a5fa' : '#3b82f6',
      itemHoverBg: isLightContent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      divider: isLightContent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    };
  }

  if (isLightContent) {
    // Section header: Gold tier
    const sectionHeaderResult = ensureGoldTier(
      HCT.create(barHct.h, 4, 55).toHex(),
      barColor,
      true
    );

    // Item text: Gold tier
    const itemTextResult = ensureGoldTier(
      HCT.create(barHct.h, 4, 88).toHex(),
      barColor,
      true
    );

    // Item icon background
    const itemIconBg = `${HCT.create(barHct.h, 8, 25).toHex()}20`;

    // Item icon: Gold tier
    const itemIconResult = ensureGoldTier(
      HCT.create(barHct.h, 6, 75).toHex(),
      barColor,
      true
    );

    // Active states with primary color
    const itemActiveTextResult = ensurePlatinumTier(
      HCT.create(primaryHct.h, primaryHct.c * 0.8, 80).toHex(),
      barColor,
      true
    );

    const itemActiveIconBg = `${HCT.create(primaryHct.h, primaryHct.c * 0.4, 25).toHex()}30`;
    const itemActiveIndicator = HCT.create(primaryHct.h, primaryHct.c, 65).toHex();

    // Hover and divider
    const itemHoverBg = `${HCT.create(barHct.h, 6, 25).toHex()}15`;
    const divider = `${HCT.create(barHct.h, 4, 30).toHex()}15`;

    return {
      sectionHeader: sectionHeaderResult.color,
      itemText: itemTextResult.color,
      itemIconBg,
      itemIcon: itemIconResult.color,
      itemActiveText: itemActiveTextResult.color,
      itemActiveIconBg,
      itemActiveIndicator,
      itemHoverBg,
      divider,
    };
  } else {
    // Light bar with dark content
    const sectionHeaderResult = ensureGoldTier(
      HCT.create(barHct.h, 4, 50).toHex(),
      barColor,
      false
    );

    const itemTextResult = ensureGoldTier(
      HCT.create(barHct.h, 4, 20).toHex(),
      barColor,
      false
    );

    const itemIconBg = `${HCT.create(barHct.h, 6, 85).toHex()}60`;

    const itemIconResult = ensureGoldTier(
      HCT.create(barHct.h, 6, 40).toHex(),
      barColor,
      false
    );

    const itemActiveTextResult = ensurePlatinumTier(
      HCT.create(primaryHct.h, primaryHct.c, 30).toHex(),
      barColor,
      false
    );

    const itemActiveIconBg = `${HCT.create(primaryHct.h, primaryHct.c * 0.3, 85).toHex()}50`;
    const itemActiveIndicator = HCT.create(primaryHct.h, primaryHct.c, 45).toHex();

    const itemHoverBg = `${HCT.create(barHct.h, 4, 90).toHex()}60`;
    const divider = `${HCT.create(barHct.h, 4, 80).toHex()}30`;

    return {
      sectionHeader: sectionHeaderResult.color,
      itemText: itemTextResult.color,
      itemIconBg,
      itemIcon: itemIconResult.color,
      itemActiveText: itemActiveTextResult.color,
      itemActiveIconBg,
      itemActiveIndicator,
      itemHoverBg,
      divider,
    };
  }
}

/**
 * Generate touch feedback effects
 */
function generateTouchEffects(
  primaryColor: string,
  isLightContent: boolean
): TouchFeedbackEffects {
  const cache = getColorCache();
  const primaryOklch = cache.getOklch(primaryColor);

  // Ripple with brand color
  const rippleOpacity = isLightContent ? 0.3 : 0.2;
  const rippleColor = primaryOklch
    ? `oklch(${primaryOklch.l.toFixed(3)} ${primaryOklch.c.toFixed(3)} ${primaryOklch.h.toFixed(1)} / ${rippleOpacity})`
    : `${primaryColor}${Math.round(rippleOpacity * 255).toString(16).padStart(2, '0')}`;

  // Scale for press feedback
  const scalePressed = '0.96';

  // Haptic duration reference
  const hapticDuration = '10ms';

  // Active glow
  const glowIntensity = isLightContent ? 0.5 : 0.3;
  const activeGlow = primaryOklch
    ? `0 0 16px oklch(${primaryOklch.l.toFixed(3)} ${primaryOklch.c.toFixed(3)} ${primaryOklch.h.toFixed(1)} / ${glowIntensity})`
    : `0 0 16px ${primaryColor}${Math.round(glowIntensity * 255).toString(16).padStart(2, '0')}`;

  return {
    rippleColor,
    scalePressed,
    hapticDuration,
    activeGlow,
  };
}

/**
 * Generate CSS variables for injection
 */
function generateCSSVariables(
  items: BottomNavItemColors,
  bar: BottomBarStyles,
  sheet: SheetNavColors,
  touch: TouchFeedbackEffects,
  primaryColor: string
): Record<string, string> {
  return {
    // Bottom Nav Items
    '--bottomnav-ci-inactive-text': items.inactiveText,
    '--bottomnav-ci-inactive-icon': items.inactiveIcon,
    '--bottomnav-ci-active-text': items.activeText,
    '--bottomnav-ci-active-icon': items.activeIcon,
    '--bottomnav-ci-active-bg': items.activeBg,
    '--bottomnav-ci-active-indicator': items.activeIndicator,
    '--bottomnav-ci-pressed-bg': items.pressedBg,
    '--bottomnav-ci-pressed-text': items.pressedText,
    '--bottomnav-ci-focus-ring': items.focusRing,
    '--bottomnav-ci-disabled-text': items.disabledText,

    // Bottom Bar Container
    '--bottomnav-ci-bar-bg': bar.background,
    '--bottomnav-ci-bar-border': bar.border,
    '--bottomnav-ci-bar-blur': bar.blur,
    '--bottomnav-ci-bar-shadow': bar.shadow,
    '--bottomnav-ci-bar-highlight': bar.highlight,
    '--bottomnav-ci-bar-gradient': bar.oklchGradient,

    // Sheet Navigation
    '--bottomnav-ci-sheet-section': sheet.sectionHeader,
    '--bottomnav-ci-sheet-text': sheet.itemText,
    '--bottomnav-ci-sheet-icon-bg': sheet.itemIconBg,
    '--bottomnav-ci-sheet-icon': sheet.itemIcon,
    '--bottomnav-ci-sheet-active-text': sheet.itemActiveText,
    '--bottomnav-ci-sheet-active-icon-bg': sheet.itemActiveIconBg,
    '--bottomnav-ci-sheet-active-indicator': sheet.itemActiveIndicator,
    '--bottomnav-ci-sheet-hover-bg': sheet.itemHoverBg,
    '--bottomnav-ci-sheet-divider': sheet.divider,

    // Touch Feedback
    '--bottomnav-ci-ripple': touch.rippleColor,
    '--bottomnav-ci-scale-pressed': touch.scalePressed,
    '--bottomnav-ci-glow': touch.activeGlow,

    // Brand Reference
    '--bottomnav-ci-primary': primaryColor,
  };
}

// ============================================
// Main Hook
// ============================================

/**
 * useBottomNavColorIntelligence
 *
 * Comprehensive Color Intelligence integration for mobile bottom navigation.
 * Generates all color states, effects, and CSS variables using:
 * - HCT tonal palettes for navigation states
 * - APCA validation for Gold tier minimum (Lc ≥ 75)
 * - Smart Glass gradients for bottom bar effects
 * - Brand analysis for semantic derivation
 *
 * @example
 * ```tsx
 * const { items, bar, sheet, touch, cssVariables, apcaScores } = useBottomNavColorIntelligence();
 *
 * // Apply CSS variables
 * useEffect(() => {
 *   Object.entries(cssVariables).forEach(([key, value]) => {
 *     document.documentElement.style.setProperty(key, value);
 *   });
 * }, [cssVariables]);
 *
 * // Use in components
 * <nav style={{ background: bar.background, color: items.inactiveText }}>
 *   <NavItem
 *     activeStyle={{ color: items.activeText }}
 *     pressedStyle={{ background: items.pressedBg }}
 *   />
 * </nav>
 *
 * // Validate APCA scores
 * console.log('Active text Lc:', apcaScores.activeText); // Should be ≥ 90
 * ```
 */
export function useBottomNavColorIntelligence(): BottomNavColorIntelligence {
  const { sidebarColor, primaryColor, accentColor } = useTenantBranding();

  // Use sidebar color as base for bottom bar (consistent theming)
  const barColor = sidebarColor;

  return React.useMemo(() => {
    // Analyze bar color for contrast mode
    const contrastResult = detectContrastMode(barColor);
    const isLightContent = contrastResult.mode === 'light-content';
    const isDarkBar = isLightContent;

    // Full brand analysis
    const brandAnalysis = analyzeBrandColor(primaryColor);

    // Generate tonal palette
    const primaryPalette = generateTonalPalette(primaryColor);

    // Generate component colors with APCA validation
    const { colors: items, apcaScores } = generateItemColors(barColor, primaryColor, isLightContent);
    const bar = generateBarStyles(barColor, primaryColor, isLightContent);
    const sheet = generateSheetColors(barColor, primaryColor, isLightContent);
    const touch = generateTouchEffects(primaryColor, isLightContent);

    // Generate CSS variables
    const cssVariables = generateCSSVariables(items, bar, sheet, touch, primaryColor);

    return {
      items,
      bar,
      sheet,
      touch,
      primaryPalette,
      brandAnalysis,
      contrastMode: contrastResult.mode,
      cssVariables,
      isDarkBar,
      apcaScores,
    };
  }, [barColor, primaryColor, accentColor]);
}

/**
 * useBottomNavItemColors
 *
 * Lightweight hook for just navigation item colors.
 */
export function useBottomNavItemColors(): BottomNavItemColors {
  const { items } = useBottomNavColorIntelligence();
  return items;
}

/**
 * useBottomNavBarStyles
 *
 * Lightweight hook for bar container styles.
 */
export function useBottomNavBarStyles(): BottomBarStyles {
  const { bar } = useBottomNavColorIntelligence();
  return bar;
}

/**
 * useBottomNavCSSVariables
 *
 * Hook that auto-injects CSS variables into document root.
 * Call this once at the bottom nav root level.
 */
export function useBottomNavCSSVariables(): void {
  const { cssVariables } = useBottomNavColorIntelligence();

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
export function getBottomNavColorIntelligence(
  barColor: string,
  primaryColor: string,
  accentColor: string
): Omit<BottomNavColorIntelligence, 'brandAnalysis'> & { brandAnalysis: BrandColorAnalysis | null } {
  const contrastResult = detectContrastMode(barColor);
  const isLightContent = contrastResult.mode === 'light-content';
  const isDarkBar = isLightContent;

  let brandAnalysis: BrandColorAnalysis | null = null;
  try {
    brandAnalysis = analyzeBrandColor(primaryColor);
  } catch {
    // Ignore analysis errors in SSR
  }

  const primaryPalette = generateTonalPalette(primaryColor);
  const { colors: items, apcaScores } = generateItemColors(barColor, primaryColor, isLightContent);
  const bar = generateBarStyles(barColor, primaryColor, isLightContent);
  const sheet = generateSheetColors(barColor, primaryColor, isLightContent);
  const touch = generateTouchEffects(primaryColor, isLightContent);
  const cssVariables = generateCSSVariables(items, bar, sheet, touch, primaryColor);

  return {
    items,
    bar,
    sheet,
    touch,
    primaryPalette,
    brandAnalysis,
    contrastMode: contrastResult.mode,
    cssVariables,
    isDarkBar,
    apcaScores,
  };
}

export default useBottomNavColorIntelligence;
