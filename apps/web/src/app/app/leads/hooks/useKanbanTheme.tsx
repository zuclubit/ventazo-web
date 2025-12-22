'use client';

/**
 * useKanbanTheme - Advanced Dynamic Theming System for Kanban Board
 *
 * @description Enterprise-grade theming hook that provides dynamic colors
 * for the Kanban board based on tenant configuration. Integrates with
 * the tenant branding system and generates computed styles.
 *
 * Features:
 * - Dynamic stage colors with luminance-aware contrasts
 * - Score badge gradients derived from tenant palette
 * - Card states (hover, active, selected) using tenant colors
 * - Drop zone highlighting with tenant primary
 * - Full CSS variable integration
 * - Memoized for optimal performance
 * - Dark mode aware
 *
 * @version 1.0.0
 * @module hooks/useKanbanTheme
 */

import * as React from 'react';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface StageColorConfig {
  /** Stage identifier */
  id: string;
  /** Background color (with opacity) */
  bg: string;
  /** Text color for contrast */
  text: string;
  /** Border color */
  border: string;
  /** Glow/shadow color */
  glow: string;
  /** Raw hex color */
  raw: string;
}

export interface ScoreTheme {
  /** Gradient background */
  gradient: string;
  /** Text color */
  text: string;
  /** Shadow/glow */
  shadow: string;
  /** Icon color */
  icon: string;
}

export interface CardTheme {
  /** Base background */
  bg: string;
  /** Hover background */
  bgHover: string;
  /** Active/dragging background */
  bgActive: string;
  /** Border color */
  border: string;
  /** Hover border */
  borderHover: string;
  /** Selected border */
  borderSelected: string;
  /** Base shadow */
  shadow: string;
  /** Hover shadow */
  shadowHover: string;
  /** Dragging shadow */
  shadowDragging: string;
}

export interface KanbanTheme {
  /** Card styling */
  card: CardTheme;
  /** Score badge styles by level */
  score: {
    hot: ScoreTheme;
    warm: ScoreTheme;
    cold: ScoreTheme;
  };
  /** Drop zone styles */
  dropZone: {
    borderColor: string;
    shadow: string;
    bgTint: string;
  };
  /** Column styles */
  column: {
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
  };
  /** Action button styles */
  actions: {
    whatsapp: { bg: string; text: string };
    call: { bg: string; text: string };
    email: { bg: string; text: string };
    primary: { bg: string; text: string };
  };
  /** Generate dynamic stage colors */
  getStageColors: (stageColor: string, stageName?: string) => StageColorConfig;
  /** Get inline style object for stage badge */
  getStageBadgeStyle: (stageColor: string) => React.CSSProperties;
  /** Check if using tenant colors (vs defaults) */
  isCustomTheme: boolean;
  /** Tenant primary color (for reference) */
  primaryColor: string;
  /** Tenant accent color (for reference) */
  accentColor: string;
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
    r: parseInt(fullHex.substring(0, 2), 16),
    g: parseInt(fullHex.substring(2, 4), 16),
    b: parseInt(fullHex.substring(4, 6), 16),
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

// ============================================
// Default Theme Values
// ============================================

const DEFAULT_PRIMARY = '#0EB58C';
const DEFAULT_ACCENT = '#5EEAD4';
const DEFAULT_SURFACE = '#052828';

// Semantic score colors (temperature-based)
const SCORE_COLORS = {
  hot: {
    base: '#F97316',      // Orange-500
    light: '#FB923C',     // Orange-400
    dark: '#EA580C',      // Orange-600
  },
  warm: {
    base: '#F59E0B',      // Amber-500
    light: '#FBBF24',     // Amber-400
    dark: '#D97706',      // Amber-600
  },
  cold: {
    base: '#6B7280',      // Gray-500
    light: '#9CA3AF',     // Gray-400
    dark: '#4B5563',      // Gray-600
  },
};

// Action colors (semantic, not tenant-specific)
const ACTION_COLORS = {
  whatsapp: '#25D366',
  call: '#8B5CF6',
  email: '#3B82F6',
};

// ============================================
// Main Hook
// ============================================

export function useKanbanTheme(): KanbanTheme {
  const branding = useTenantBranding();

  // Extract tenant colors with fallbacks
  const primaryColor = branding.primaryColor || DEFAULT_PRIMARY;
  const accentColor = branding.accentColor || DEFAULT_ACCENT;
  const surfaceColor = branding.surfaceColor || DEFAULT_SURFACE;
  const sidebarColor = branding.sidebarColor || darkenColor(primaryColor, 35);

  // Check if using custom tenant colors
  const isCustomTheme = primaryColor !== DEFAULT_PRIMARY;

  // ============================================
  // Generate Card Theme
  // ============================================
  const card = React.useMemo<CardTheme>(() => ({
    // Light mode backgrounds
    bg: 'rgba(255, 255, 255, 0.92)',
    bgHover: 'rgba(255, 255, 255, 0.98)',
    bgActive: 'rgba(255, 255, 255, 0.96)',
    // Borders derived from tenant primary
    border: 'rgba(0, 0, 0, 0.06)',
    borderHover: hexToRgba(primaryColor, 0.25),
    borderSelected: primaryColor,
    // Shadows with tenant color tint
    shadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    shadowHover: `0 4px 12px ${hexToRgba(primaryColor, 0.12)}, 0 2px 4px rgba(0, 0, 0, 0.08)`,
    shadowDragging: `0 8px 32px ${hexToRgba(primaryColor, 0.2)}, 0 4px 16px rgba(0, 0, 0, 0.12)`,
  }), [primaryColor]);

  // ============================================
  // Generate Score Themes
  // ============================================
  const score = React.useMemo(() => {
    // Hot leads can optionally blend with tenant primary for cohesion
    const hotBlended = isCustomTheme
      ? blendColors(SCORE_COLORS.hot.base, primaryColor, 0.15)
      : SCORE_COLORS.hot.base;

    return {
      hot: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.hot.dark} 0%, ${hotBlended} 50%, ${SCORE_COLORS.hot.light} 100%)`,
        text: '#FFFFFF',
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.hot.base, 0.35)}`,
        icon: '#FFFFFF',
      },
      warm: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.warm.dark} 0%, ${SCORE_COLORS.warm.base} 50%, ${SCORE_COLORS.warm.light} 100%)`,
        text: '#78350F', // Amber-900
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.warm.base, 0.35)}`,
        icon: '#78350F',
      },
      cold: {
        gradient: `linear-gradient(135deg, ${SCORE_COLORS.cold.dark} 0%, ${SCORE_COLORS.cold.base} 50%, ${SCORE_COLORS.cold.light} 100%)`,
        text: '#FFFFFF',
        shadow: `0 4px 16px ${hexToRgba(SCORE_COLORS.cold.base, 0.25)}`,
        icon: '#FFFFFF',
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
  // Generate Action Button Themes
  // ============================================
  const actions = React.useMemo(() => ({
    whatsapp: {
      bg: hexToRgba(ACTION_COLORS.whatsapp, 0.12),
      text: ACTION_COLORS.whatsapp,
    },
    call: {
      bg: hexToRgba(primaryColor, 0.12),
      text: primaryColor,
    },
    email: {
      bg: hexToRgba(ACTION_COLORS.email, 0.12),
      text: ACTION_COLORS.email,
    },
    primary: {
      bg: hexToRgba(primaryColor, 0.12),
      text: primaryColor,
    },
  }), [primaryColor]);

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
      // Subtle shadow for depth
      boxShadow: `inset 0 1px 0 ${hexToRgba(stageColor, 0.1)}`,
    };
  }, [getStageColors]);

  // ============================================
  // Apply CSS Variables on Mount/Update
  // ============================================
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Kanban-specific variables
    root.style.setProperty('--kanban-card-border-hover', card.borderHover);
    root.style.setProperty('--kanban-card-border-selected', card.borderSelected);
    root.style.setProperty('--kanban-card-shadow-hover', card.shadowHover);
    root.style.setProperty('--kanban-card-shadow-dragging', card.shadowDragging);

    // Drop zone variables
    root.style.setProperty('--kanban-drop-border', dropZone.borderColor);
    root.style.setProperty('--kanban-drop-shadow', dropZone.shadow);
    root.style.setProperty('--kanban-drop-bg', dropZone.bgTint);

    // Score gradients
    root.style.setProperty('--score-hot-gradient', score.hot.gradient);
    root.style.setProperty('--score-hot-shadow', score.hot.shadow);
    root.style.setProperty('--score-warm-gradient', score.warm.gradient);
    root.style.setProperty('--score-warm-shadow', score.warm.shadow);
    root.style.setProperty('--score-cold-gradient', score.cold.gradient);
    root.style.setProperty('--score-cold-shadow', score.cold.shadow);

    // Action button colors
    root.style.setProperty('--action-call-bg', actions.call.bg);
    root.style.setProperty('--action-call-text', actions.call.text);
    root.style.setProperty('--action-primary-bg', actions.primary.bg);
    root.style.setProperty('--action-primary-text', actions.primary.text);
  }, [card, dropZone, score, actions]);

  return {
    card,
    score,
    dropZone,
    column,
    actions,
    getStageColors,
    getStageBadgeStyle,
    isCustomTheme,
    primaryColor,
    accentColor,
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

/**
 * Use Kanban theme from context (for deeply nested components)
 */
export function useKanbanThemeContext(): KanbanTheme {
  const context = React.useContext(KanbanThemeContext);
  if (!context) {
    throw new Error('useKanbanThemeContext must be used within KanbanThemeProvider');
  }
  return context;
}

/**
 * Safely get theme context (returns null if not in provider)
 */
export function useKanbanThemeOptional(): KanbanTheme | null {
  return React.useContext(KanbanThemeContext);
}
