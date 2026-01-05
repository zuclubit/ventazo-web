'use client';

/**
 * useOpportunityTheme - Dynamic Theming System for Opportunities Pipeline v2.0
 *
 * @description Enterprise-grade theming hook for opportunities module.
 * Provides FULLY dynamic colors based on tenant configuration.
 * Mirrors useKanbanTheme architecture for consistency.
 *
 * Architecture:
 * - Tenant colors (primary, accent, surface, sidebar) from useTenantBranding
 * - All derived colors computed with luminance-aware algorithms
 * - CSS variables injected on mount/update for global access
 * - Components use CSS variables, not hardcoded colors
 *
 * Color System:
 * - Probability-based colors (high/medium/low) for closing likelihood
 * - Dynamic card borders/shadows based on tenant primary
 * - Action buttons with tenant-aware colors
 * - Status badges (won/lost/open) with proper theming
 *
 * @version 2.0.0
 * @module hooks/useOpportunityTheme
 */

import * as React from 'react';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  probability: number;
  order: number;
}

export interface ProbabilityTheme {
  gradient: string;
  text: string;
  shadow: string;
  bg: string;
  border: string;
  glow: string;
}

export interface OpportunityCardTheme {
  bg: string;
  bgHover: string;
  bgActive: string;
  border: string;
  borderHover: string;
  borderSelected: string;
  shadow: string;
  shadowHover: string;
  shadowDragging: string;
}

export interface ActionTheme {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
}

export interface OpportunityTheme {
  card: OpportunityCardTheme;
  probability: {
    high: ProbabilityTheme;    // 70-100%
    medium: ProbabilityTheme;  // 40-69%
    low: ProbabilityTheme;     // 0-39%
    won: ProbabilityTheme;     // Won status
    lost: ProbabilityTheme;    // Lost status
  };
  dropZone: {
    borderColor: string;
    shadow: string;
    bgTint: string;
  };
  column: {
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
  };
  actions: {
    whatsapp: ActionTheme;
    call: ActionTheme;
    email: ActionTheme;
    win: ActionTheme;
    lost: ActionTheme;
    primary: ActionTheme;
  };
  status: {
    open: { bg: string; text: string; border: string };
    won: { bg: string; text: string; border: string };
    lost: { bg: string; text: string; border: string };
    stalled: { bg: string; text: string; border: string };
  };
  priority: {
    critical: { bg: string; text: string; border: string };
    high: { bg: string; text: string; border: string };
    medium: { bg: string; text: string; border: string };
    low: { bg: string; text: string; border: string };
  };
  getStageColors: (stageColor: string) => { bg: string; text: string; border: string; glow: string };
  getStageBadgeStyle: (stageColor: string) => React.CSSProperties;
  getProbabilityLevel: (probability: number) => 'high' | 'medium' | 'low';
  isCustomTheme: boolean;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
}

// ============================================
// Color Utilities
// ============================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '');
  const fullHex = sanitized.length === 3
    ? sanitized.split('').map(c => c + c).join('')
    : sanitized;

  return {
    r: parseInt(fullHex.substring(0, 2), 16) || 0,
    g: parseInt(fullHex.substring(2, 4), 16) || 0,
    b: parseInt(fullHex.substring(4, 6), 16) || 0,
  };
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);
  const newR = Math.max(0, r - amt);
  const newG = Math.max(0, g - amt);
  const newB = Math.max(0, b - amt);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);
  const newR = Math.min(255, r + amt);
  const newG = Math.min(255, g + amt);
  const newB = Math.min(255, b + amt);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function blendColors(color1: string, color2: string, weight: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r * (1 - weight) + c2.r * weight);
  const g = Math.round(c1.g * (1 - weight) + c2.g * weight);
  const b = Math.round(c1.b * (1 - weight) + c2.b * weight);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// Default Colors (CSS Variable Fallbacks)
// These align with globals.css opportunity module tokens
// ============================================

const DEFAULT_PRIMARY = 'var(--tenant-primary, #0EB58C)';
const DEFAULT_ACCENT = 'var(--tenant-accent, #5EEAD4)';
const DEFAULT_SURFACE = 'var(--tenant-surface, #052828)';

// Fallback hex values for computations (when CSS vars aren't available)
const FALLBACK_PRIMARY_HEX = '#0EB58C';
const FALLBACK_ACCENT_HEX = '#5EEAD4';
const FALLBACK_SURFACE_HEX = '#052828';

// Probability colors (temperature-based for closing likelihood)
// These are input values for gradient computations
// Using CSS variables with fallbacks for full theme compliance
const PROBABILITY_COLORS = {
  high: {
    // CSS variable references
    base: 'var(--prob-high-base, #059669)',
    light: 'var(--prob-high-light, #34D399)',
    dark: 'var(--prob-high-dark, #047857)',
    text: 'var(--prob-high-text, #FFFFFF)',
    // Raw fallback values for computation (used by hexToRgba, blendColors)
    rawBase: '#059669',
    rawLight: '#34D399',
    rawDark: '#047857',
  },
  medium: {
    base: 'var(--prob-medium-base, #F59E0B)',
    light: 'var(--prob-medium-light, #FBBF24)',
    dark: 'var(--prob-medium-dark, #D97706)',
    text: 'var(--prob-medium-text, #78350F)',
    rawBase: '#F59E0B',
    rawLight: '#FBBF24',
    rawDark: '#D97706',
  },
  low: {
    base: 'var(--prob-low-base, #6B7280)',
    light: 'var(--prob-low-light, #9CA3AF)',
    dark: 'var(--prob-low-dark, #4B5563)',
    text: 'var(--prob-low-text, #FFFFFF)',
    rawBase: '#6B7280',
    rawLight: '#9CA3AF',
    rawDark: '#4B5563',
  },
};

// Semantic action colors - Using CSS variables with hardcoded fallbacks
// These fallbacks are only used when CSS vars aren't available (SSR/computation)
const WHATSAPP_GREEN_FALLBACK = '#25D366';
const EMAIL_BLUE_FALLBACK = '#3B82F6';
const WIN_GREEN_FALLBACK = '#10B981';
const LOST_RED_FALLBACK = '#EF4444';
const WARNING_AMBER_FALLBACK = '#F59E0B';

// CSS variable references for use in computed styles
const WHATSAPP_GREEN = 'var(--action-whatsapp, #25D366)';
const EMAIL_BLUE = 'var(--action-email, #3B82F6)';
const WIN_GREEN = 'var(--action-win, #10B981)';
const LOST_RED = 'var(--action-lost, #EF4444)';
const WARNING_AMBER = 'var(--action-warning, #F59E0B)';

// ============================================
// Main Hook
// ============================================

export function useOpportunityTheme(): OpportunityTheme {
  const branding = useTenantBranding();

  // Extract tenant colors with fallbacks
  const primaryColor = branding.primaryColor || DEFAULT_PRIMARY;
  const accentColor = branding.accentColor || DEFAULT_ACCENT;
  const surfaceColor = branding.surfaceColor || DEFAULT_SURFACE;

  // Check if using custom tenant colors
  const isCustomTheme = primaryColor !== DEFAULT_PRIMARY;

  // Derived RGB values
  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);

  // Derived color variations
  const primaryHover = darkenColor(primaryColor, 10);
  const primaryLight = lightenColor(primaryColor, 35);
  const primaryLighter = lightenColor(primaryColor, 50);
  const accentLight = lightenColor(accentColor, 30);

  // ============================================
  // Card Theme (Dynamic from tenant primary)
  // ============================================
  const card = React.useMemo<OpportunityCardTheme>(() => ({
    bg: 'rgba(255, 255, 255, 0.92)',
    bgHover: 'rgba(255, 255, 255, 0.98)',
    bgActive: 'rgba(255, 255, 255, 0.96)',
    border: 'rgba(0, 0, 0, 0.06)',
    borderHover: hexToRgba(primaryColor, 0.25),
    borderSelected: primaryColor,
    shadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    shadowHover: `0 4px 12px ${hexToRgba(primaryColor, 0.12)}, 0 2px 4px rgba(0, 0, 0, 0.08)`,
    shadowDragging: `0 8px 32px ${hexToRgba(primaryColor, 0.2)}, 0 4px 16px rgba(0, 0, 0, 0.12)`,
  }), [primaryColor]);

  // ============================================
  // Probability Themes (Closing likelihood)
  // Using rawBase values for computations, CSS vars for gradients
  // ============================================
  const probability = React.useMemo(() => {
    // High probability blends with tenant primary for brand cohesion
    const highBlended = isCustomTheme
      ? blendColors(PROBABILITY_COLORS.high.rawBase, primaryColor, 0.15)
      : PROBABILITY_COLORS.high.rawBase;

    return {
      high: {
        gradient: `linear-gradient(135deg, ${PROBABILITY_COLORS.high.dark} 0%, ${highBlended} 50%, ${PROBABILITY_COLORS.high.light} 100%)`,
        text: PROBABILITY_COLORS.high.text,
        shadow: `0 4px 16px ${hexToRgba(PROBABILITY_COLORS.high.rawBase, 0.35)}`,
        bg: 'color-mix(in srgb, var(--prob-high-base, #059669) 12%, transparent)',
        border: 'color-mix(in srgb, var(--prob-high-base, #059669) 25%, transparent)',
        glow: 'color-mix(in srgb, var(--prob-high-base, #059669) 30%, transparent)',
      },
      medium: {
        gradient: `linear-gradient(135deg, ${PROBABILITY_COLORS.medium.dark} 0%, ${PROBABILITY_COLORS.medium.base} 50%, ${PROBABILITY_COLORS.medium.light} 100%)`,
        text: PROBABILITY_COLORS.medium.text,
        shadow: `0 4px 16px ${hexToRgba(PROBABILITY_COLORS.medium.rawBase, 0.35)}`,
        bg: 'color-mix(in srgb, var(--prob-medium-base, #F59E0B) 12%, transparent)',
        border: 'color-mix(in srgb, var(--prob-medium-base, #F59E0B) 25%, transparent)',
        glow: 'color-mix(in srgb, var(--prob-medium-base, #F59E0B) 30%, transparent)',
      },
      low: {
        gradient: `linear-gradient(135deg, ${PROBABILITY_COLORS.low.dark} 0%, ${PROBABILITY_COLORS.low.base} 50%, ${PROBABILITY_COLORS.low.light} 100%)`,
        text: PROBABILITY_COLORS.low.text,
        shadow: `0 4px 16px ${hexToRgba(PROBABILITY_COLORS.low.rawBase, 0.25)}`,
        bg: 'color-mix(in srgb, var(--prob-low-base, #6B7280) 12%, transparent)',
        border: 'color-mix(in srgb, var(--prob-low-base, #6B7280) 25%, transparent)',
        glow: 'color-mix(in srgb, var(--prob-low-base, #6B7280) 20%, transparent)',
      },
      won: {
        gradient: `linear-gradient(135deg, ${darkenColor(WIN_GREEN_FALLBACK, 10)} 0%, ${WIN_GREEN_FALLBACK} 50%, ${lightenColor(WIN_GREEN_FALLBACK, 15)} 100%)`,
        text: 'var(--prob-high-text, #FFFFFF)',
        shadow: `0 4px 16px ${hexToRgba(WIN_GREEN_FALLBACK, 0.35)}`,
        bg: 'color-mix(in srgb, var(--action-win, #10B981) 15%, transparent)',
        border: 'color-mix(in srgb, var(--action-win, #10B981) 35%, transparent)',
        glow: 'color-mix(in srgb, var(--action-win, #10B981) 40%, transparent)',
      },
      lost: {
        gradient: `linear-gradient(135deg, ${darkenColor(LOST_RED_FALLBACK, 10)} 0%, ${LOST_RED_FALLBACK} 50%, ${lightenColor(LOST_RED_FALLBACK, 15)} 100%)`,
        text: 'var(--prob-high-text, #FFFFFF)',
        shadow: `0 4px 16px ${hexToRgba(LOST_RED_FALLBACK, 0.35)}`,
        bg: 'color-mix(in srgb, var(--action-lost, #EF4444) 15%, transparent)',
        border: 'color-mix(in srgb, var(--action-lost, #EF4444) 35%, transparent)',
        glow: 'color-mix(in srgb, var(--action-lost, #EF4444) 40%, transparent)',
      },
    };
  }, [primaryColor, isCustomTheme]);

  // ============================================
  // Drop Zone Theme (Dynamic from tenant primary)
  // ============================================
  const dropZone = React.useMemo(() => ({
    borderColor: hexToRgba(primaryColor, 0.5),
    shadow: `0 0 0 3px ${hexToRgba(primaryColor, 0.15)}, 0 0 30px ${hexToRgba(primaryColor, 0.2)}`,
    bgTint: hexToRgba(primaryColor, 0.05),
  }), [primaryColor]);

  // ============================================
  // Column Theme
  // ============================================
  const column = React.useMemo(() => ({
    bgLight: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
    bgDark: `linear-gradient(180deg, ${hexToRgba(surfaceColor, 0.5)} 0%, ${hexToRgba(surfaceColor, 0.3)} 100%)`,
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
  }), [surfaceColor]);

  // ============================================
  // Actions Theme (Dynamic from tenant primary)
  // Using color-mix for CSS variable compatibility
  // ============================================
  const actions = React.useMemo(() => ({
    whatsapp: {
      bg: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 15%, transparent)',
      text: WHATSAPP_GREEN,
      border: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 25%, transparent)',
    },
    call: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
    email: {
      bg: 'color-mix(in srgb, var(--action-email, #3B82F6) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-email, #3B82F6) 15%, transparent)',
      text: EMAIL_BLUE,
      border: 'color-mix(in srgb, var(--action-email, #3B82F6) 25%, transparent)',
    },
    win: {
      bg: 'color-mix(in srgb, var(--action-win, #10B981) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-win, #10B981) 15%, transparent)',
      text: WIN_GREEN,
      border: 'color-mix(in srgb, var(--action-win, #10B981) 25%, transparent)',
    },
    lost: {
      bg: 'color-mix(in srgb, var(--action-lost, #EF4444) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-lost, #EF4444) 15%, transparent)',
      text: LOST_RED,
      border: 'color-mix(in srgb, var(--action-lost, #EF4444) 25%, transparent)',
    },
    primary: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
  }), [primaryColor]);

  // ============================================
  // Status Colors (Opportunity-specific)
  // Using color-mix for CSS variable compatibility
  // ============================================
  const status = React.useMemo(() => ({
    open: {
      bg: hexToRgba(primaryColor, 0.12),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
    won: {
      bg: 'color-mix(in srgb, var(--action-win, #10B981) 12%, transparent)',
      text: 'var(--opp-status-won-text, #059669)',
      border: 'color-mix(in srgb, var(--action-win, #10B981) 25%, transparent)',
    },
    lost: {
      bg: 'color-mix(in srgb, var(--action-lost, #EF4444) 12%, transparent)',
      text: 'var(--opp-status-lost-text, #DC2626)',
      border: 'color-mix(in srgb, var(--action-lost, #EF4444) 25%, transparent)',
    },
    stalled: {
      bg: 'color-mix(in srgb, var(--action-warning, #F59E0B) 12%, transparent)',
      text: 'var(--opp-status-stalled-text, #D97706)',
      border: 'color-mix(in srgb, var(--action-warning, #F59E0B) 25%, transparent)',
    },
  }), [primaryColor]);

  // ============================================
  // Priority Theme
  // ============================================
  const priority = React.useMemo(() => ({
    critical: {
      bg: 'color-mix(in srgb, var(--action-lost, #EF4444) 15%, transparent)',
      text: 'var(--opp-priority-critical-text, #DC2626)',
      border: 'color-mix(in srgb, var(--action-lost, #EF4444) 35%, transparent)',
    },
    high: {
      bg: 'color-mix(in srgb, var(--action-warning, #F59E0B) 15%, transparent)',
      text: 'var(--opp-priority-high-text, #EA580C)',
      border: 'color-mix(in srgb, var(--action-warning, #F59E0B) 35%, transparent)',
    },
    medium: {
      bg: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.35),
    },
    low: {
      bg: 'color-mix(in srgb, var(--prob-low-base, #6B7280) 15%, transparent)',
      text: 'var(--opp-priority-low-text, #4B5563)',
      border: 'color-mix(in srgb, var(--prob-low-base, #6B7280) 35%, transparent)',
    },
  }), [primaryColor]);

  // ============================================
  // Utility Functions
  // ============================================
  const getStageColors = React.useCallback((stageColor: string) => {
    const sanitizedColor = stageColor.startsWith('#') ? stageColor : `#${stageColor}`;
    const isDark = getLuminance(sanitizedColor) < 0.4;

    return {
      bg: hexToRgba(sanitizedColor, 0.15),
      text: isDark ? lightenColor(sanitizedColor, 20) : darkenColor(sanitizedColor, 20),
      border: hexToRgba(sanitizedColor, 0.4),
      glow: hexToRgba(sanitizedColor, 0.3),
    };
  }, []);

  const getStageBadgeStyle = React.useCallback((stageColor: string): React.CSSProperties => {
    const colors = getStageColors(stageColor);
    return {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.text,
      boxShadow: `inset 0 1px 0 ${hexToRgba(stageColor, 0.1)}`,
    };
  }, [getStageColors]);

  const getProbabilityLevel = React.useCallback((prob: number): 'high' | 'medium' | 'low' => {
    if (prob >= 70) return 'high';
    if (prob >= 40) return 'medium';
    return 'low';
  }, []);

  // ============================================
  // Apply ALL CSS Variables on Mount/Update
  // CRITICAL: This is what makes colors dynamic!
  // ============================================
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // ========== TENANT CORE (Same as useKanbanTheme) ==========
    // These are the base variables that ALL components can use
    root.style.setProperty('--tenant-primary', primaryColor);
    root.style.setProperty('--tenant-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--tenant-primary-hover', primaryHover);
    root.style.setProperty('--tenant-primary-light', primaryLight);
    root.style.setProperty('--tenant-primary-lighter', primaryLighter);
    root.style.setProperty('--tenant-primary-glow', hexToRgba(primaryColor, 0.25));
    root.style.setProperty('--tenant-accent', accentColor);
    root.style.setProperty('--tenant-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--tenant-accent-light', accentLight);
    root.style.setProperty('--tenant-accent-glow', hexToRgba(accentColor, 0.25));
    root.style.setProperty('--tenant-surface', surfaceColor);

    // ========== OPPORTUNITY CARD ==========
    root.style.setProperty('--opp-card-border-hover', card.borderHover);
    root.style.setProperty('--opp-card-border-selected', card.borderSelected);
    root.style.setProperty('--opp-card-shadow-hover', card.shadowHover);
    root.style.setProperty('--opp-card-shadow-dragging', card.shadowDragging);

    // ========== DROP ZONE ==========
    root.style.setProperty('--opp-drop-border', dropZone.borderColor);
    root.style.setProperty('--opp-drop-shadow', dropZone.shadow);
    root.style.setProperty('--opp-drop-bg', dropZone.bgTint);

    // ========== PROBABILITY GRADIENTS ==========
    root.style.setProperty('--prob-high-gradient', probability.high.gradient);
    root.style.setProperty('--prob-high-shadow', probability.high.shadow);
    root.style.setProperty('--prob-high-bg', probability.high.bg);
    root.style.setProperty('--prob-high-border', probability.high.border);
    root.style.setProperty('--prob-high-text', probability.high.text);
    root.style.setProperty('--prob-medium-gradient', probability.medium.gradient);
    root.style.setProperty('--prob-medium-shadow', probability.medium.shadow);
    root.style.setProperty('--prob-medium-bg', probability.medium.bg);
    root.style.setProperty('--prob-medium-border', probability.medium.border);
    root.style.setProperty('--prob-medium-text', probability.medium.text);
    root.style.setProperty('--prob-low-gradient', probability.low.gradient);
    root.style.setProperty('--prob-low-shadow', probability.low.shadow);
    root.style.setProperty('--prob-low-bg', probability.low.bg);
    root.style.setProperty('--prob-low-border', probability.low.border);
    root.style.setProperty('--prob-low-text', probability.low.text);
    root.style.setProperty('--prob-won-gradient', probability.won.gradient);
    root.style.setProperty('--prob-won-bg', probability.won.bg);
    root.style.setProperty('--prob-won-border', probability.won.border);
    root.style.setProperty('--prob-lost-gradient', probability.lost.gradient);
    root.style.setProperty('--prob-lost-bg', probability.lost.bg);
    root.style.setProperty('--prob-lost-border', probability.lost.border);

    // ========== ACTION BUTTONS ==========
    root.style.setProperty('--action-whatsapp-bg', actions.whatsapp.bg);
    root.style.setProperty('--action-whatsapp-bg-hover', actions.whatsapp.bgHover);
    root.style.setProperty('--action-whatsapp-text', actions.whatsapp.text);
    root.style.setProperty('--action-whatsapp-border', actions.whatsapp.border);
    root.style.setProperty('--action-call-bg', actions.call.bg);
    root.style.setProperty('--action-call-bg-hover', actions.call.bgHover);
    root.style.setProperty('--action-call-text', actions.call.text);
    root.style.setProperty('--action-call-border', actions.call.border);
    root.style.setProperty('--action-email-bg', actions.email.bg);
    root.style.setProperty('--action-email-bg-hover', actions.email.bgHover);
    root.style.setProperty('--action-email-text', actions.email.text);
    root.style.setProperty('--action-email-border', actions.email.border);
    root.style.setProperty('--action-primary-bg', actions.primary.bg);
    root.style.setProperty('--action-primary-bg-hover', actions.primary.bgHover);
    root.style.setProperty('--action-primary-text', actions.primary.text);
    root.style.setProperty('--action-primary-border', actions.primary.border);

    // ========== WIN/LOST ACTIONS ==========
    root.style.setProperty('--opp-action-win-bg', actions.win.bg);
    root.style.setProperty('--opp-action-win-bg-hover', actions.win.bgHover);
    root.style.setProperty('--opp-action-win-text', actions.win.text);
    root.style.setProperty('--opp-action-win-border', actions.win.border);
    root.style.setProperty('--opp-action-lost-bg', actions.lost.bg);
    root.style.setProperty('--opp-action-lost-bg-hover', actions.lost.bgHover);
    root.style.setProperty('--opp-action-lost-text', actions.lost.text);
    root.style.setProperty('--opp-action-lost-border', actions.lost.border);

    // ========== STATUS COLORS ==========
    root.style.setProperty('--opp-status-open-bg', status.open.bg);
    root.style.setProperty('--opp-status-open-text', status.open.text);
    root.style.setProperty('--opp-status-open-border', status.open.border);
    root.style.setProperty('--opp-status-won-bg', status.won.bg);
    root.style.setProperty('--opp-status-won-text', status.won.text);
    root.style.setProperty('--opp-status-won-border', status.won.border);
    root.style.setProperty('--opp-status-lost-bg', status.lost.bg);
    root.style.setProperty('--opp-status-lost-text', status.lost.text);
    root.style.setProperty('--opp-status-lost-border', status.lost.border);
    root.style.setProperty('--opp-status-stalled-bg', status.stalled.bg);
    root.style.setProperty('--opp-status-stalled-text', status.stalled.text);
    root.style.setProperty('--opp-status-stalled-border', status.stalled.border);

    // ========== PRIORITY COLORS ==========
    root.style.setProperty('--opp-priority-critical-bg', priority.critical.bg);
    root.style.setProperty('--opp-priority-critical-text', priority.critical.text);
    root.style.setProperty('--opp-priority-critical-border', priority.critical.border);
    root.style.setProperty('--opp-priority-high-bg', priority.high.bg);
    root.style.setProperty('--opp-priority-high-text', priority.high.text);
    root.style.setProperty('--opp-priority-high-border', priority.high.border);
    root.style.setProperty('--opp-priority-medium-bg', priority.medium.bg);
    root.style.setProperty('--opp-priority-medium-text', priority.medium.text);
    root.style.setProperty('--opp-priority-medium-border', priority.medium.border);
    root.style.setProperty('--opp-priority-low-bg', priority.low.bg);
    root.style.setProperty('--opp-priority-low-text', priority.low.text);
    root.style.setProperty('--opp-priority-low-border', priority.low.border);

    // ========== TEXT ACCENT (Dynamic) ==========
    root.style.setProperty('--text-accent', primaryColor);
    root.style.setProperty('--text-accent-hover', primaryHover);

  }, [
    primaryColor, primaryRgb, primaryHover, primaryLight, primaryLighter,
    accentColor, accentRgb, accentLight, surfaceColor,
    card, dropZone, probability, actions, status, priority
  ]);

  return {
    card,
    probability,
    dropZone,
    column,
    actions,
    status,
    priority,
    getStageColors,
    getStageBadgeStyle,
    getProbabilityLevel,
    isCustomTheme,
    primaryColor,
    accentColor,
    surfaceColor,
  };
}

// ============================================
// Context for Deep Component Access
// ============================================

const OpportunityThemeContext = React.createContext<OpportunityTheme | null>(null);

export function OpportunityThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useOpportunityTheme();
  return (
    <OpportunityThemeContext.Provider value={theme}>
      {children}
    </OpportunityThemeContext.Provider>
  );
}

export function useOpportunityThemeContext(): OpportunityTheme {
  const context = React.useContext(OpportunityThemeContext);
  if (!context) {
    throw new Error('useOpportunityThemeContext must be used within OpportunityThemeProvider');
  }
  return context;
}

export function useOpportunityThemeOptional(): OpportunityTheme | null {
  return React.useContext(OpportunityThemeContext);
}

export default useOpportunityTheme;
