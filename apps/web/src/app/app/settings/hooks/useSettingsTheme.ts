'use client';

/**
 * useSettingsTheme Hook
 *
 * Provides dynamic theming for Settings module that adapts to tenant branding.
 * Generates category colors derived from the tenant's 4-color semantic palette.
 *
 * Architecture:
 * - Uses CSS variables for consistency with global theme system
 * - Generates 8 category colors from tenant primary/accent using HSL rotation
 * - Provides both inline styles and class mappings
 * - Memoized for performance
 */

import * as React from 'react';
import { useTenantBranding, type ComputedBranding } from '@/hooks/use-tenant-branding';
import type { SettingsCategoryColor } from '../components/settings-config';

// ============================================
// Types
// ============================================

export interface CategoryColorConfig {
  /** Icon text color class */
  icon: string;
  /** Background color class */
  bg: string;
  /** Hover background class */
  bgHover: string;
  /** Border color class */
  border: string;
  /** Hover border class */
  borderHover: string;
  /** CSS color value for inline styles */
  cssColor: string;
  /** CSS background with opacity */
  cssBg: string;
  /** CSS border color */
  cssBorder: string;
}

export interface SettingsThemeColors {
  profile: CategoryColorConfig;
  team: CategoryColorConfig;
  notifications: CategoryColorConfig;
  billing: CategoryColorConfig;
  messaging: CategoryColorConfig;
  integrations: CategoryColorConfig;
  pipeline: CategoryColorConfig;
  activity: CategoryColorConfig;
  branding: CategoryColorConfig;
  security: CategoryColorConfig;
  data: CategoryColorConfig;
  proposals: CategoryColorConfig;
  ai: CategoryColorConfig;
}

export interface UseSettingsThemeReturn {
  /** Category color configurations */
  colors: SettingsThemeColors;
  /** Get color config for a specific category */
  getCategoryColor: (category: SettingsCategoryColor) => CategoryColorConfig;
  /** Whether custom branding is active */
  isCustomBranding: boolean;
  /** Tenant branding data */
  branding: ComputedBranding;
}

// ============================================
// Color Utilities
// ============================================

/**
 * Convert hex to HSL values
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  if (fullHex.length !== 6) {
    return { h: 160, s: 85, l: 39 };
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
 * Generate HSL color string with hue rotation
 */
function rotateHue(baseHsl: { h: number; s: number; l: number }, degrees: number): string {
  const newHue = (baseHsl.h + degrees) % 360;
  return `hsl(${newHue}, ${Math.min(baseHsl.s, 75)}%, ${Math.min(baseHsl.l + 15, 60)}%)`;
}

/**
 * Generate background color with opacity
 */
function generateBgColor(baseHsl: { h: number; s: number; l: number }, degrees: number): string {
  const newHue = (baseHsl.h + degrees) % 360;
  return `hsla(${newHue}, ${Math.min(baseHsl.s, 70)}%, ${50}%, 0.1)`;
}

/**
 * Generate border color with opacity
 */
function generateBorderColor(baseHsl: { h: number; s: number; l: number }, degrees: number): string {
  const newHue = (baseHsl.h + degrees) % 360;
  return `hsla(${newHue}, ${Math.min(baseHsl.s, 70)}%, ${50}%, 0.2)`;
}

// ============================================
// Hue offsets for each category
// These create visually distinct colors while
// maintaining harmony with the primary color
// ============================================

const CATEGORY_HUE_OFFSETS: Record<SettingsCategoryColor, number> = {
  profile: 0,        // Primary color (no rotation)
  team: 270,         // Purple (complementary range)
  notifications: 45, // Amber/Orange
  billing: 140,      // Green (success-like)
  messaging: 180,    // Cyan (opposite of orange)
  integrations: 320, // Pink/Magenta
  pipeline: 30,      // Orange
  activity: 210,     // Slate-blue
  branding: 160,     // Teal (brand identity)
  security: 240,     // Indigo (trust/security)
  data: 170,         // Teal (data/storage)
  proposals: 280,    // Violet (proposals/documents)
  ai: 290,           // Purple-violet (AI/intelligence)
};

// ============================================
// Default Static Colors (fallback when no branding)
// ============================================

const DEFAULT_CATEGORY_COLORS: Record<SettingsCategoryColor, CategoryColorConfig> = {
  profile: {
    icon: 'text-blue-400 dark:text-blue-300',
    bg: 'bg-blue-500/10 dark:bg-blue-500/15',
    bgHover: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
    border: 'border-blue-500/20 dark:border-blue-500/30',
    borderHover: 'hover:border-blue-500/40 dark:hover:border-blue-500/50',
    cssColor: 'var(--settings-profile-icon)',
    cssBg: 'var(--settings-profile-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-profile-icon) 20%, transparent)',
  },
  team: {
    icon: 'text-emerald-400 dark:text-emerald-300',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    bgHover: 'hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25',
    border: 'border-emerald-500/20 dark:border-emerald-500/30',
    borderHover: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/50',
    cssColor: 'var(--settings-team-icon)',
    cssBg: 'var(--settings-team-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-team-icon) 20%, transparent)',
  },
  notifications: {
    icon: 'text-amber-400 dark:text-amber-300',
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    bgHover: 'hover:bg-amber-500/20 dark:hover:bg-amber-500/25',
    border: 'border-amber-500/20 dark:border-amber-500/30',
    borderHover: 'hover:border-amber-500/40 dark:hover:border-amber-500/50',
    cssColor: 'var(--settings-notifications-icon)',
    cssBg: 'var(--settings-notifications-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-notifications-icon) 20%, transparent)',
  },
  billing: {
    icon: 'text-red-400 dark:text-red-300',
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    bgHover: 'hover:bg-red-500/20 dark:hover:bg-red-500/25',
    border: 'border-red-500/20 dark:border-red-500/30',
    borderHover: 'hover:border-red-500/40 dark:hover:border-red-500/50',
    cssColor: 'var(--settings-billing-icon)',
    cssBg: 'var(--settings-billing-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-billing-icon) 20%, transparent)',
  },
  messaging: {
    icon: 'text-cyan-400 dark:text-cyan-300',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    bgHover: 'hover:bg-cyan-500/20 dark:hover:bg-cyan-500/25',
    border: 'border-cyan-500/20 dark:border-cyan-500/30',
    borderHover: 'hover:border-cyan-500/40 dark:hover:border-cyan-500/50',
    cssColor: 'var(--settings-messaging-icon)',
    cssBg: 'var(--settings-messaging-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-messaging-icon) 20%, transparent)',
  },
  integrations: {
    icon: 'text-pink-400 dark:text-pink-300',
    bg: 'bg-pink-500/10 dark:bg-pink-500/15',
    bgHover: 'hover:bg-pink-500/20 dark:hover:bg-pink-500/25',
    border: 'border-pink-500/20 dark:border-pink-500/30',
    borderHover: 'hover:border-pink-500/40 dark:hover:border-pink-500/50',
    cssColor: 'var(--settings-integrations-icon)',
    cssBg: 'var(--settings-integrations-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-integrations-icon) 20%, transparent)',
  },
  pipeline: {
    icon: 'text-orange-400 dark:text-orange-300',
    bg: 'bg-orange-500/10 dark:bg-orange-500/15',
    bgHover: 'hover:bg-orange-500/20 dark:hover:bg-orange-500/25',
    border: 'border-orange-500/20 dark:border-orange-500/30',
    borderHover: 'hover:border-orange-500/40 dark:hover:border-orange-500/50',
    cssColor: 'var(--settings-pipeline-icon)',
    cssBg: 'var(--settings-pipeline-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-pipeline-icon) 20%, transparent)',
  },
  activity: {
    icon: 'text-slate-400 dark:text-slate-300',
    bg: 'bg-slate-500/10 dark:bg-slate-500/15',
    bgHover: 'hover:bg-slate-500/20 dark:hover:bg-slate-500/25',
    border: 'border-slate-500/20 dark:border-slate-500/30',
    borderHover: 'hover:border-slate-500/40 dark:hover:border-slate-500/50',
    cssColor: 'var(--settings-activity-icon)',
    cssBg: 'var(--settings-activity-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-activity-icon) 20%, transparent)',
  },
  branding: {
    icon: 'text-purple-400 dark:text-purple-300',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    bgHover: 'hover:bg-purple-500/20 dark:hover:bg-purple-500/25',
    border: 'border-purple-500/20 dark:border-purple-500/30',
    borderHover: 'hover:border-purple-500/40 dark:hover:border-purple-500/50',
    cssColor: 'var(--settings-branding-icon)',
    cssBg: 'var(--settings-branding-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-branding-icon) 20%, transparent)',
  },
  security: {
    icon: 'text-indigo-400 dark:text-indigo-300',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    bgHover: 'hover:bg-indigo-500/20 dark:hover:bg-indigo-500/25',
    border: 'border-indigo-500/20 dark:border-indigo-500/30',
    borderHover: 'hover:border-indigo-500/40 dark:hover:border-indigo-500/50',
    cssColor: 'var(--settings-security-icon)',
    cssBg: 'var(--settings-security-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-security-icon) 20%, transparent)',
  },
  data: {
    icon: 'text-teal-400 dark:text-teal-300',
    bg: 'bg-teal-500/10 dark:bg-teal-500/15',
    bgHover: 'hover:bg-teal-500/20 dark:hover:bg-teal-500/25',
    border: 'border-teal-500/20 dark:border-teal-500/30',
    borderHover: 'hover:border-teal-500/40 dark:hover:border-teal-500/50',
    cssColor: 'var(--settings-data-icon)',
    cssBg: 'var(--settings-data-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-data-icon) 20%, transparent)',
  },
  proposals: {
    icon: 'text-violet-400 dark:text-violet-300',
    bg: 'bg-violet-500/10 dark:bg-violet-500/15',
    bgHover: 'hover:bg-violet-500/20 dark:hover:bg-violet-500/25',
    border: 'border-violet-500/20 dark:border-violet-500/30',
    borderHover: 'hover:border-violet-500/40 dark:hover:border-violet-500/50',
    cssColor: 'var(--settings-proposals-icon)',
    cssBg: 'var(--settings-proposals-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-proposals-icon) 20%, transparent)',
  },
  ai: {
    icon: 'text-purple-400 dark:text-purple-300',
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    bgHover: 'hover:bg-purple-500/20 dark:hover:bg-purple-500/25',
    border: 'border-purple-500/20 dark:border-purple-500/30',
    borderHover: 'hover:border-purple-500/40 dark:hover:border-purple-500/50',
    cssColor: 'var(--settings-ai-icon)',
    cssBg: 'var(--settings-ai-bg)',
    cssBorder: 'color-mix(in srgb, var(--settings-ai-icon) 20%, transparent)',
  },
};

// ============================================
// Static CSS Variable Classes
// ============================================
// IMPORTANT: These must be static strings (not template literals)
// so Tailwind can safely scan and include them in the CSS output.
// Using `${category}` in class names causes Tailwind to output
// literal ${category} strings which break CSS parsing.

const DYNAMIC_CSS_CLASSES: Record<
  SettingsCategoryColor,
  Pick<CategoryColorConfig, 'icon' | 'bg' | 'bgHover' | 'border' | 'borderHover'>
> = {
  profile: {
    icon: 'text-[var(--settings-profile-color)]',
    bg: 'bg-[var(--settings-profile-bg)]',
    bgHover: 'hover:bg-[var(--settings-profile-bg-hover)]',
    border: 'border-[var(--settings-profile-border)]',
    borderHover: 'hover:border-[var(--settings-profile-border-hover)]',
  },
  team: {
    icon: 'text-[var(--settings-team-color)]',
    bg: 'bg-[var(--settings-team-bg)]',
    bgHover: 'hover:bg-[var(--settings-team-bg-hover)]',
    border: 'border-[var(--settings-team-border)]',
    borderHover: 'hover:border-[var(--settings-team-border-hover)]',
  },
  notifications: {
    icon: 'text-[var(--settings-notifications-color)]',
    bg: 'bg-[var(--settings-notifications-bg)]',
    bgHover: 'hover:bg-[var(--settings-notifications-bg-hover)]',
    border: 'border-[var(--settings-notifications-border)]',
    borderHover: 'hover:border-[var(--settings-notifications-border-hover)]',
  },
  billing: {
    icon: 'text-[var(--settings-billing-color)]',
    bg: 'bg-[var(--settings-billing-bg)]',
    bgHover: 'hover:bg-[var(--settings-billing-bg-hover)]',
    border: 'border-[var(--settings-billing-border)]',
    borderHover: 'hover:border-[var(--settings-billing-border-hover)]',
  },
  messaging: {
    icon: 'text-[var(--settings-messaging-color)]',
    bg: 'bg-[var(--settings-messaging-bg)]',
    bgHover: 'hover:bg-[var(--settings-messaging-bg-hover)]',
    border: 'border-[var(--settings-messaging-border)]',
    borderHover: 'hover:border-[var(--settings-messaging-border-hover)]',
  },
  integrations: {
    icon: 'text-[var(--settings-integrations-color)]',
    bg: 'bg-[var(--settings-integrations-bg)]',
    bgHover: 'hover:bg-[var(--settings-integrations-bg-hover)]',
    border: 'border-[var(--settings-integrations-border)]',
    borderHover: 'hover:border-[var(--settings-integrations-border-hover)]',
  },
  pipeline: {
    icon: 'text-[var(--settings-pipeline-color)]',
    bg: 'bg-[var(--settings-pipeline-bg)]',
    bgHover: 'hover:bg-[var(--settings-pipeline-bg-hover)]',
    border: 'border-[var(--settings-pipeline-border)]',
    borderHover: 'hover:border-[var(--settings-pipeline-border-hover)]',
  },
  activity: {
    icon: 'text-[var(--settings-activity-color)]',
    bg: 'bg-[var(--settings-activity-bg)]',
    bgHover: 'hover:bg-[var(--settings-activity-bg-hover)]',
    border: 'border-[var(--settings-activity-border)]',
    borderHover: 'hover:border-[var(--settings-activity-border-hover)]',
  },
  branding: {
    icon: 'text-[var(--settings-branding-color)]',
    bg: 'bg-[var(--settings-branding-bg)]',
    bgHover: 'hover:bg-[var(--settings-branding-bg-hover)]',
    border: 'border-[var(--settings-branding-border)]',
    borderHover: 'hover:border-[var(--settings-branding-border-hover)]',
  },
  security: {
    icon: 'text-[var(--settings-security-color)]',
    bg: 'bg-[var(--settings-security-bg)]',
    bgHover: 'hover:bg-[var(--settings-security-bg-hover)]',
    border: 'border-[var(--settings-security-border)]',
    borderHover: 'hover:border-[var(--settings-security-border-hover)]',
  },
  data: {
    icon: 'text-[var(--settings-data-color)]',
    bg: 'bg-[var(--settings-data-bg)]',
    bgHover: 'hover:bg-[var(--settings-data-bg-hover)]',
    border: 'border-[var(--settings-data-border)]',
    borderHover: 'hover:border-[var(--settings-data-border-hover)]',
  },
  proposals: {
    icon: 'text-[var(--settings-proposals-color)]',
    bg: 'bg-[var(--settings-proposals-bg)]',
    bgHover: 'hover:bg-[var(--settings-proposals-bg-hover)]',
    border: 'border-[var(--settings-proposals-border)]',
    borderHover: 'hover:border-[var(--settings-proposals-border-hover)]',
  },
  ai: {
    icon: 'text-[var(--settings-ai-color)]',
    bg: 'bg-[var(--settings-ai-bg)]',
    bgHover: 'hover:bg-[var(--settings-ai-bg-hover)]',
    border: 'border-[var(--settings-ai-border)]',
    borderHover: 'hover:border-[var(--settings-ai-border-hover)]',
  },
};

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook that provides dynamic category colors based on tenant branding
 *
 * When custom branding is active, it generates category colors by rotating
 * the hue of the primary color. This creates a harmonious color palette
 * that adapts to any brand color.
 *
 * @example
 * ```tsx
 * function SettingsCard({ category }: { category: SettingsCategoryColor }) {
 *   const { getCategoryColor } = useSettingsTheme();
 *   const colors = getCategoryColor(category);
 *
 *   return (
 *     <div
 *       className={cn(colors.bg, colors.border)}
 *       style={{ color: colors.cssColor }}
 *     >
 *       ...
 *     </div>
 *   );
 * }
 * ```
 */
export function useSettingsTheme(): UseSettingsThemeReturn {
  const branding = useTenantBranding();

  const colors = React.useMemo((): SettingsThemeColors => {
    // If no custom branding, use default static colors
    if (!branding.isCustomBranding) {
      return DEFAULT_CATEGORY_COLORS;
    }

    // Get HSL of primary color for hue rotation
    const primaryHsl = branding.hsl;

    // Generate dynamic colors for each category
    const dynamicColors: SettingsThemeColors = {} as SettingsThemeColors;

    const categories: SettingsCategoryColor[] = [
      'profile', 'team', 'notifications', 'billing',
      'messaging', 'integrations', 'pipeline', 'activity', 'branding',
      'security', 'data', 'proposals', 'ai'
    ];

    categories.forEach((category) => {
      const hueOffset = CATEGORY_HUE_OFFSETS[category];
      const color = rotateHue(primaryHsl, hueOffset);
      const bgColor = generateBgColor(primaryHsl, hueOffset);
      const borderColor = generateBorderColor(primaryHsl, hueOffset);

      // Use static class names from DYNAMIC_CSS_CLASSES map
      // This avoids template literals that break Tailwind CSS parsing
      const cssClasses = DYNAMIC_CSS_CLASSES[category];

      dynamicColors[category] = {
        icon: cssClasses.icon,
        bg: cssClasses.bg,
        bgHover: cssClasses.bgHover,
        border: cssClasses.border,
        borderHover: cssClasses.borderHover,
        cssColor: color,
        cssBg: bgColor,
        cssBorder: borderColor,
      };
    });

    return dynamicColors;
  }, [branding.isCustomBranding, branding.hsl]);

  // Apply CSS variables for dynamic colors
  React.useEffect(() => {
    if (typeof document === 'undefined' || !branding.isCustomBranding) return;

    const root = document.documentElement;
    const primaryHsl = branding.hsl;

    const categories: SettingsCategoryColor[] = [
      'profile', 'team', 'notifications', 'billing',
      'messaging', 'integrations', 'pipeline', 'activity', 'branding',
      'security', 'data', 'proposals', 'ai'
    ];

    requestAnimationFrame(() => {
      categories.forEach((category) => {
        const hueOffset = CATEGORY_HUE_OFFSETS[category];
        const rotatedHue = (primaryHsl.h + hueOffset) % 360;
        const saturation = Math.min(primaryHsl.s, 75);
        const lightness = Math.min(primaryHsl.l + 15, 60);

        // Main color
        root.style.setProperty(
          `--settings-${category}-color`,
          `hsl(${rotatedHue}, ${saturation}%, ${lightness}%)`
        );
        // Background (10% opacity)
        root.style.setProperty(
          `--settings-${category}-bg`,
          `hsla(${rotatedHue}, ${Math.min(primaryHsl.s, 70)}%, 50%, 0.1)`
        );
        // Background hover (20% opacity)
        root.style.setProperty(
          `--settings-${category}-bg-hover`,
          `hsla(${rotatedHue}, ${Math.min(primaryHsl.s, 70)}%, 50%, 0.2)`
        );
        // Border (20% opacity)
        root.style.setProperty(
          `--settings-${category}-border`,
          `hsla(${rotatedHue}, ${Math.min(primaryHsl.s, 70)}%, 50%, 0.2)`
        );
        // Border hover (40% opacity)
        root.style.setProperty(
          `--settings-${category}-border-hover`,
          `hsla(${rotatedHue}, ${Math.min(primaryHsl.s, 70)}%, 50%, 0.4)`
        );
      });
    });

    // Cleanup
    return () => {
      categories.forEach((category) => {
        root.style.removeProperty(`--settings-${category}-color`);
        root.style.removeProperty(`--settings-${category}-bg`);
        root.style.removeProperty(`--settings-${category}-bg-hover`);
        root.style.removeProperty(`--settings-${category}-border`);
        root.style.removeProperty(`--settings-${category}-border-hover`);
      });
    };
  }, [branding.isCustomBranding, branding.hsl]);

  const getCategoryColor = React.useCallback(
    (category: SettingsCategoryColor): CategoryColorConfig => {
      return colors[category] || DEFAULT_CATEGORY_COLORS.profile;
    },
    [colors]
  );

  return React.useMemo(
    () => ({
      colors,
      getCategoryColor,
      isCustomBranding: branding.isCustomBranding,
      branding,
    }),
    [colors, getCategoryColor, branding]
  );
}

export default useSettingsTheme;
