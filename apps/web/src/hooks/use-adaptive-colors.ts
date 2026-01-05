'use client';

// ============================================
// useAdaptiveColors Hook
// Smart Glass color adaptation based on tenant branding
// ============================================

import * as React from 'react';
import {
  getAdaptiveColorsCached,
  getAdaptiveCssVars,
  scheduleIdleTask,
  cancelIdleTask,
  type AdaptiveColors,
} from '@/lib/theme/adaptive-contrast';
import { useTenantStore } from '@/store';
import { setCssVariable, getCssVariable } from '@/lib/theme/color-utils';

// ============================================
// Types
// ============================================

export interface UseAdaptiveColorsOptions {
  /** Skip CSS variable application (for isolated components) */
  skipCssVars?: boolean;
  /** Use idle callback for non-critical calculations */
  lazyCalculation?: boolean;
  /** Fallback primary color */
  fallbackPrimary?: string;
  /** Fallback accent color */
  fallbackAccent?: string;
}

export interface UseAdaptiveColorsReturn extends AdaptiveColors {
  /** Whether colors are still being calculated */
  isCalculating: boolean;
  /** Manually recalculate colors */
  recalculate: () => void;
  /** Get inline style object for component */
  getInlineStyles: () => React.CSSProperties;
  /** Get CSS class names based on adaptive mode */
  getClassNames: () => string;
}

// ============================================
// Default Colors (Ventazo brand)
// ============================================

const DEFAULT_PRIMARY = '#0EB58C';
const DEFAULT_ACCENT = '#5EEAD4';

// ============================================
// Hook Implementation
// ============================================

/**
 * React hook for adaptive color calculation
 *
 * Features:
 * - Reactive to tenant color changes
 * - Lazy calculation with requestIdleCallback
 * - Memoized results
 * - CSS variable application
 * - SSR-safe
 *
 * @example
 * ```tsx
 * const { iconColor, isLightPrimary, getClassNames } = useAdaptiveColors();
 *
 * return (
 *   <div className={getClassNames()}>
 *     <Icon style={{ color: iconColor }} />
 *   </div>
 * );
 * ```
 */
export function useAdaptiveColors(
  options: UseAdaptiveColorsOptions = {}
): UseAdaptiveColorsReturn {
  const {
    skipCssVars = false,
    lazyCalculation = false,
    fallbackPrimary = DEFAULT_PRIMARY,
    fallbackAccent = DEFAULT_ACCENT,
  } = options;

  // Get tenant colors from store
  const currentTenant = useTenantStore((state) => state.currentTenant);

  // Extract colors from tenant metadata
  const tenantPrimary = React.useMemo(() => {
    const metadata = currentTenant?.metadata?.branding;
    if (metadata?.primaryColor && typeof metadata.primaryColor === 'string') {
      return metadata.primaryColor;
    }
    // Try CSS variable as fallback
    if (typeof window !== 'undefined') {
      const cssVar = getCssVariable('--tenant-primary');
      if (cssVar && cssVar.startsWith('#')) {
        return cssVar;
      }
    }
    return fallbackPrimary;
  }, [currentTenant, fallbackPrimary]);

  const tenantAccent = React.useMemo(() => {
    const metadata = currentTenant?.metadata?.branding;
    if (metadata?.accentColor && typeof metadata.accentColor === 'string') {
      return metadata.accentColor;
    }
    if (typeof window !== 'undefined') {
      const cssVar = getCssVariable('--tenant-accent');
      if (cssVar && cssVar.startsWith('#')) {
        return cssVar;
      }
    }
    return fallbackAccent;
  }, [currentTenant, fallbackAccent]);

  // State for calculated colors
  const [colors, setColors] = React.useState<AdaptiveColors>(() =>
    getAdaptiveColorsCached(tenantPrimary, tenantAccent)
  );
  const [isCalculating, setIsCalculating] = React.useState(false);

  // Track idle callback for cleanup
  const idleCallbackRef = React.useRef<number | null>(null);

  // Calculate colors when tenant changes
  React.useEffect(() => {
    const calculate = () => {
      const newColors = getAdaptiveColorsCached(tenantPrimary, tenantAccent);
      setColors(newColors);
      setIsCalculating(false);

      // Apply CSS variables if enabled
      if (!skipCssVars && typeof document !== 'undefined') {
        const cssVars = getAdaptiveCssVars(tenantPrimary, tenantAccent);
        Object.entries(cssVars).forEach(([key, value]) => {
          setCssVariable(key, value);
        });
      }
    };

    if (lazyCalculation && typeof window !== 'undefined') {
      // Use idle callback for non-critical calculation
      setIsCalculating(true);
      idleCallbackRef.current = scheduleIdleTask(
        (deadline) => {
          // Only calculate if we have time, otherwise schedule again
          if (deadline.timeRemaining() > 5 || deadline.didTimeout) {
            calculate();
          } else {
            idleCallbackRef.current = scheduleIdleTask(calculate, { timeout: 100 });
          }
        },
        { timeout: 200 }
      );
    } else {
      calculate();
    }

    return () => {
      if (idleCallbackRef.current !== null) {
        cancelIdleTask(idleCallbackRef.current);
      }
    };
  }, [tenantPrimary, tenantAccent, skipCssVars, lazyCalculation]);

  // Manual recalculation function
  const recalculate = React.useCallback(() => {
    const newColors = getAdaptiveColorsCached(tenantPrimary, tenantAccent);
    setColors(newColors);

    if (!skipCssVars && typeof document !== 'undefined') {
      const cssVars = getAdaptiveCssVars(tenantPrimary, tenantAccent);
      Object.entries(cssVars).forEach(([key, value]) => {
        setCssVariable(key, value);
      });
    }
  }, [tenantPrimary, tenantAccent, skipCssVars]);

  // Generate inline styles for component use
  const getInlineStyles = React.useCallback((): React.CSSProperties => {
    return {
      '--local-icon-color': colors.iconColor,
      '--local-icon-muted': colors.iconColorMuted,
      '--local-icon-active': colors.iconColorActive,
      '--local-glass-bg': colors.glassBackground,
      '--local-glass-opacity': String(colors.glassOpacity),
      '--local-border': colors.borderColor,
      '--local-shadow': colors.shadowColor,
    } as React.CSSProperties;
  }, [colors]);

  // Generate CSS class names based on mode
  const getClassNames = React.useCallback((): string => {
    const classes = ['adaptive-glass'];

    if (colors.isLightPrimary) {
      classes.push('adaptive-glass--light');
    } else {
      classes.push('adaptive-glass--dark');
    }

    return classes.join(' ');
  }, [colors.isLightPrimary]);

  return {
    ...colors,
    isCalculating,
    recalculate,
    getInlineStyles,
    getClassNames,
  };
}

// ============================================
// Static utilities for SSR/non-React contexts
// ============================================

/**
 * Get adaptive colors without React
 * Useful for SSR or non-component contexts
 */
export function getStaticAdaptiveColors(
  tenantPrimary: string = DEFAULT_PRIMARY,
  tenantAccent: string = DEFAULT_ACCENT
): AdaptiveColors {
  return getAdaptiveColorsCached(tenantPrimary, tenantAccent);
}

// ============================================
// CSS-only utilities
// ============================================

/**
 * Generate CSS custom properties string for inline use
 * Useful for style tags or CSS-in-JS
 */
export function generateAdaptiveCssString(
  tenantPrimary: string,
  tenantAccent?: string
): string {
  const vars = getAdaptiveCssVars(tenantPrimary, tenantAccent);
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n');
}

export default useAdaptiveColors;
