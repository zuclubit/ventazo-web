'use client';

/**
 * useKanbanTheme - Comprehensive Dynamic Theming System for Kanban Board v4.0
 *
 * @description Enterprise-grade theming hook that provides FULLY dynamic colors
 * for the entire Kanban board based on tenant configuration. Every color that
 * should be dynamic is controlled by this hook via CSS variables.
 *
 * Architecture:
 * - Tenant colors (primary, accent, surface, sidebar) from useTenantBranding
 * - All derived colors computed with luminance-aware algorithms
 * - CSS variables injected on mount/update for global access
 * - Components use CSS variables, not hardcoded colors
 *
 * Features:
 * - Dynamic card borders, shadows, and backgrounds
 * - Score badge gradients with tenant color integration
 * - Drop zone highlighting with tenant primary
 * - Action buttons with dynamic hover states
 * - Status badges with computed contrasts
 * - Channel colors with accessibility compliance
 * - Full dark mode support
 * - Memoized for optimal performance
 *
 * @version 4.0.0
 * @module hooks/useKanbanTheme
 */

import * as React from 'react';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface StageColorConfig {
  id: string;
  bg: string;
  text: string;
  border: string;
  glow: string;
  raw: string;
}

export interface ScoreTheme {
  gradient: string;
  text: string;
  shadow: string;
  icon: string;
  bg: string;
  border: string;
}

export interface CardTheme {
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

export interface KanbanTheme {
  card: CardTheme;
  score: {
    hot: ScoreTheme;
    warm: ScoreTheme;
    cold: ScoreTheme;
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
    primary: ActionTheme;
  };
  channel: {
    whatsapp: string;
    social: string;
    email: string;
    phone: string;
    website: string;
    organic: string;
    referral: string;
    ad: string;
  };
  status: {
    success: { bg: string; text: string; border: string };
    warning: { bg: string; text: string; border: string };
    error: { bg: string; text: string; border: string };
    info: { bg: string; text: string; border: string };
  };
  getStageColors: (stageColor: string, stageName?: string) => StageColorConfig;
  getStageBadgeStyle: (stageColor: string) => React.CSSProperties;
  isCustomTheme: boolean;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
}

// ============================================
// Color Utilities
// ============================================

/**
 * Parse hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
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

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

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
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Calculate relative luminance for WCAG contrast
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Get optimal text color (white or dark) for a background
 */
export function getOptimalTextColor(bgHex: string): string {
  const luminance = getLuminance(bgHex);
  return luminance > 0.4 ? '#1C1C1E' : '#FFFFFF';
}

/**
 * Lighten a hex color by percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);

  const newR = Math.min(255, r + amt);
  const newG = Math.min(255, g + amt);
  const newB = Math.min(255, b + amt);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Darken a hex color by percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);

  const newR = Math.max(0, r - amt);
  const newG = Math.max(0, g - amt);
  const newB = Math.max(0, b - amt);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Create RGBA string from hex and alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Blend two colors
 */
export function blendColors(color1: string, color2: string, weight: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r * (1 - weight) + c2.r * weight);
  const g = Math.round(c1.g * (1 - weight) + c2.g * weight);
  const b = Math.round(c1.b * (1 - weight) + c2.b * weight);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Adjust saturation of a color
 */
function adjustSaturation(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newS = Math.max(0, Math.min(100, s + amount));

  // Convert HSL back to RGB
  const c = (1 - Math.abs(2 * l / 100 - 1)) * (newS / 100);
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l / 100 - c / 2;

  let rNew = 0, gNew = 0, bNew = 0;
  if (h < 60) { rNew = c; gNew = x; bNew = 0; }
  else if (h < 120) { rNew = x; gNew = c; bNew = 0; }
  else if (h < 180) { rNew = 0; gNew = c; bNew = x; }
  else if (h < 240) { rNew = 0; gNew = x; bNew = c; }
  else if (h < 300) { rNew = x; gNew = 0; bNew = c; }
  else { rNew = c; gNew = 0; bNew = x; }

  const finalR = Math.round((rNew + m) * 255);
  const finalG = Math.round((gNew + m) * 255);
  const finalB = Math.round((bNew + m) * 255);

  return `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`;
}

// ============================================
// Default Theme Values
// ============================================

// NOTE: These defaults are ONLY used when useTenantBranding returns no custom colors
// The actual dynamic colors come from the tenant's branding configuration
// stored in the database and loaded via TenantThemeProvider → useTenantBranding

// DO NOT change these - they are fallbacks that match Ventazo brand
const DEFAULT_PRIMARY = '#0EB58C';
const DEFAULT_ACCENT = '#5EEAD4';
const DEFAULT_SURFACE = '#052828';

// Semantic score colors (temperature-based)
// Using raw values for gradient computations, CSS vars for backgrounds
const SCORE_COLORS = {
  hot: {
    base: 'var(--score-hot-base, #F97316)',
    light: 'var(--score-hot-light, #FB923C)',
    dark: 'var(--score-hot-dark, #EA580C)',
    rawBase: '#F97316',
    rawLight: '#FB923C',
    rawDark: '#EA580C',
  },
  warm: {
    base: 'var(--score-warm-base, #F59E0B)',
    light: 'var(--score-warm-light, #FBBF24)',
    dark: 'var(--score-warm-dark, #D97706)',
    rawBase: '#F59E0B',
    rawLight: '#FBBF24',
    rawDark: '#D97706',
  },
  cold: {
    base: 'var(--score-cold-base, #6B7280)',
    light: 'var(--score-cold-light, #9CA3AF)',
    dark: 'var(--score-cold-dark, #4B5563)',
    rawBase: '#6B7280',
    rawLight: '#9CA3AF',
    rawDark: '#4B5563',
  },
};

// WhatsApp brand color (fixed - brand requirement)
const WHATSAPP_GREEN = 'var(--action-whatsapp, #25D366)';
const WHATSAPP_GREEN_RAW = '#25D366';

// Email blue (semantic)
const EMAIL_BLUE = 'var(--action-email, #3B82F6)';
const EMAIL_BLUE_RAW = '#3B82F6';

// ============================================
// Main Hook
// ============================================

export function useKanbanTheme(): KanbanTheme {
  const branding = useTenantBranding();

  // Extract tenant colors with fallbacks
  const primaryColor = branding.primaryColor || DEFAULT_PRIMARY;
  const accentColor = branding.accentColor || DEFAULT_ACCENT;
  const surfaceColor = branding.surfaceColor || DEFAULT_SURFACE;

  // Check if using custom tenant colors
  const isCustomTheme = primaryColor !== DEFAULT_PRIMARY;

  // Derived colors
  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);
  const primaryHover = darkenColor(primaryColor, 10);
  const primaryLight = lightenColor(primaryColor, 35);
  const primaryLighter = lightenColor(primaryColor, 50);
  const accentLight = lightenColor(accentColor, 30);

  // ============================================
  // Generate Card Theme
  // ============================================
  const card = React.useMemo<CardTheme>(() => ({
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
  // Generate Score Themes
  // Using rawBase values for computations, CSS vars for backgrounds
  // ============================================
  const score = React.useMemo(() => {
    // Hot leads blend with tenant primary for cohesion
    const hotBlended = isCustomTheme
      ? blendColors(SCORE_COLORS.hot.rawBase, primaryColor, 0.2)
      : SCORE_COLORS.hot.rawBase;

    return {
      hot: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.hot.dark} 0%, ${hotBlended} 50%, ${SCORE_COLORS.hot.light} 100%)`,
        text: '#FFFFFF',
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.hot.rawBase, 0.35)}`,
        icon: '#FFFFFF',
        bg: 'color-mix(in srgb, var(--score-hot-base, #F97316) 12%, transparent)',
        border: 'color-mix(in srgb, var(--score-hot-base, #F97316) 25%, transparent)',
      },
      warm: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.warm.dark} 0%, ${SCORE_COLORS.warm.base} 50%, ${SCORE_COLORS.warm.light} 100%)`,
        text: '#78350F',
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.warm.rawBase, 0.35)}`,
        icon: '#78350F',
        bg: 'color-mix(in srgb, var(--score-warm-base, #F59E0B) 12%, transparent)',
        border: 'color-mix(in srgb, var(--score-warm-base, #F59E0B) 25%, transparent)',
      },
      cold: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.cold.dark} 0%, ${SCORE_COLORS.cold.base} 50%, ${SCORE_COLORS.cold.light} 100%)`,
        text: '#FFFFFF',
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.cold.rawBase, 0.25)}`,
        icon: '#FFFFFF',
        bg: 'color-mix(in srgb, var(--score-cold-base, #6B7280) 12%, transparent)',
        border: 'color-mix(in srgb, var(--score-cold-base, #6B7280) 25%, transparent)',
      },
    };
  }, [primaryColor, isCustomTheme]);

  // ============================================
  // Generate Drop Zone Theme
  // ============================================
  const dropZone = React.useMemo(() => ({
    borderColor: hexToRgba(primaryColor, 0.5),
    shadow: `0 0 0 3px ${hexToRgba(primaryColor, 0.15)}, 0 0 30px ${hexToRgba(primaryColor, 0.2)}`,
    bgTint: hexToRgba(primaryColor, 0.05),
  }), [primaryColor]);

  // ============================================
  // Generate Column Theme
  // ============================================
  const column = React.useMemo(() => ({
    bgLight: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
    bgDark: `linear-gradient(180deg, ${hexToRgba(surfaceColor, 0.5)} 0%, ${hexToRgba(surfaceColor, 0.3)} 100%)`,
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
  }), [surfaceColor]);

  // ============================================
  // Generate Action Button Themes (Dynamic)
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
    primary: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
  }), [primaryColor]);

  // ============================================
  // Channel Colors (for source badges)
  // Using CSS variables with fallbacks
  // ============================================
  const channel = React.useMemo(() => ({
    whatsapp: WHATSAPP_GREEN,
    social: accentColor, // Use tenant accent for social
    email: EMAIL_BLUE,
    phone: primaryColor, // Use tenant primary for phone
    website: 'var(--channel-website, #F97316)', // Orange for website
    organic: accentColor, // Use tenant accent for organic
    referral: 'var(--channel-referral, #8B5CF6)', // Purple for referral
    ad: 'var(--channel-ad, #EC4899)', // Pink for ads
  }), [primaryColor, accentColor]);

  // ============================================
  // Status Colors (semantic + tenant-aware)
  // Using color-mix for CSS variable compatibility
  // ============================================
  const status = React.useMemo(() => ({
    success: {
      bg: hexToRgba(accentColor, 0.15),
      text: accentColor,
      border: hexToRgba(accentColor, 0.35),
    },
    warning: {
      bg: 'color-mix(in srgb, var(--action-warning, #F59E0B) 15%, transparent)',
      text: 'var(--status-warning-text, #D97706)',
      border: 'color-mix(in srgb, var(--action-warning, #F59E0B) 35%, transparent)',
    },
    error: {
      bg: 'color-mix(in srgb, var(--action-lost, #EF4444) 15%, transparent)',
      text: 'var(--status-error-text, #DC2626)',
      border: 'color-mix(in srgb, var(--action-lost, #EF4444) 35%, transparent)',
    },
    info: {
      bg: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.35),
    },
  }), [primaryColor, accentColor]);

  // ============================================
  // Dynamic Stage Color Generator
  // ============================================
  const getStageColors = React.useCallback((stageColor: string, stageName?: string): StageColorConfig => {
    const sanitizedColor = stageColor.startsWith('#') ? stageColor : `#${stageColor}`;
    const isDark = getLuminance(sanitizedColor) < 0.4;

    return {
      id: stageName || 'custom',
      bg: hexToRgba(sanitizedColor, 0.15),
      text: isDark ? lightenColor(sanitizedColor, 20) : darkenColor(sanitizedColor, 20),
      border: hexToRgba(sanitizedColor, 0.4),
      glow: hexToRgba(sanitizedColor, 0.3),
      raw: sanitizedColor,
    };
  }, []);

  // ============================================
  // Stage Badge Inline Style Generator
  // ============================================
  const getStageBadgeStyle = React.useCallback((stageColor: string): React.CSSProperties => {
    const colors = getStageColors(stageColor);

    return {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.text,
      boxShadow: `inset 0 1px 0 ${hexToRgba(stageColor, 0.1)}`,
    };
  }, [getStageColors]);

  // ============================================
  // Apply ALL CSS Variables on Mount/Update
  // ============================================
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // ========== TENANT CORE ==========
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

    // ========== KANBAN CARD ==========
    root.style.setProperty('--kanban-card-border-hover', card.borderHover);
    root.style.setProperty('--kanban-card-border-selected', card.borderSelected);
    root.style.setProperty('--kanban-card-shadow-hover', card.shadowHover);
    root.style.setProperty('--kanban-card-shadow-dragging', card.shadowDragging);

    // ========== DROP ZONE ==========
    root.style.setProperty('--kanban-drop-border', dropZone.borderColor);
    root.style.setProperty('--kanban-drop-shadow', dropZone.shadow);
    root.style.setProperty('--kanban-drop-bg', dropZone.bgTint);

    // ========== SCORE GRADIENTS ==========
    root.style.setProperty('--score-hot-gradient', score.hot.gradient);
    root.style.setProperty('--score-hot-shadow', score.hot.shadow);
    root.style.setProperty('--score-hot-bg', score.hot.bg);
    root.style.setProperty('--score-hot-border', score.hot.border);
    root.style.setProperty('--score-warm-gradient', score.warm.gradient);
    root.style.setProperty('--score-warm-shadow', score.warm.shadow);
    root.style.setProperty('--score-warm-bg', score.warm.bg);
    root.style.setProperty('--score-warm-border', score.warm.border);
    root.style.setProperty('--score-cold-gradient', score.cold.gradient);
    root.style.setProperty('--score-cold-shadow', score.cold.shadow);
    root.style.setProperty('--score-cold-bg', score.cold.bg);
    root.style.setProperty('--score-cold-border', score.cold.border);

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

    // ========== CHANNEL COLORS ==========
    root.style.setProperty('--channel-whatsapp', channel.whatsapp);
    root.style.setProperty('--channel-social', channel.social);
    root.style.setProperty('--channel-email', channel.email);
    root.style.setProperty('--channel-phone', channel.phone);
    root.style.setProperty('--channel-website', channel.website);
    root.style.setProperty('--channel-organic', channel.organic);
    root.style.setProperty('--channel-referral', channel.referral);
    root.style.setProperty('--channel-ad', channel.ad);

    // ========== STATUS COLORS ==========
    root.style.setProperty('--status-success-bg', status.success.bg);
    root.style.setProperty('--status-success-text', status.success.text);
    root.style.setProperty('--status-success-border', status.success.border);
    root.style.setProperty('--status-warning-bg', status.warning.bg);
    root.style.setProperty('--status-warning-text', status.warning.text);
    root.style.setProperty('--status-warning-border', status.warning.border);
    root.style.setProperty('--status-error-bg', status.error.bg);
    root.style.setProperty('--status-error-text', status.error.text);
    root.style.setProperty('--status-error-border', status.error.border);
    root.style.setProperty('--status-info-bg', status.info.bg);
    root.style.setProperty('--status-info-text', status.info.text);
    root.style.setProperty('--status-info-border', status.info.border);

    // ========== TEXT ACCENT (Dynamic) ==========
    root.style.setProperty('--text-accent', primaryColor);
    root.style.setProperty('--text-accent-hover', primaryHover);

  }, [
    primaryColor, primaryRgb, primaryHover, primaryLight, primaryLighter,
    accentColor, accentRgb, accentLight, surfaceColor,
    card, dropZone, score, actions, channel, status
  ]);

  return {
    card,
    score,
    dropZone,
    column,
    actions,
    channel,
    status,
    getStageColors,
    getStageBadgeStyle,
    isCustomTheme,
    primaryColor,
    accentColor,
    surfaceColor,
  };
}

// ============================================
// Context for Deep Component Access
// ============================================

const KanbanThemeContext = React.createContext<KanbanTheme | null>(null);

export function KanbanThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useKanbanTheme();

  return (
    <KanbanThemeContext.Provider value={theme}>
      {children}
    </KanbanThemeContext.Provider>
  );
}

export function useKanbanThemeContext(): KanbanTheme {
  const context = React.useContext(KanbanThemeContext);
  if (!context) {
    throw new Error('useKanbanThemeContext must be used within KanbanThemeProvider');
  }
  return context;
}

export function useKanbanThemeOptional(): KanbanTheme | null {
  return React.useContext(KanbanThemeContext);
}
