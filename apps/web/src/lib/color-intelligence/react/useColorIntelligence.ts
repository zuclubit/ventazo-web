// ============================================
// useColorIntelligence React Hook
// High-level React integration for Color Intelligence Domain
// ============================================

'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast from '../domain/value-objects/APCAContrast';
import {
  detectContrastMode,
  ContrastMode,
  ContrastModeResult,
  analyzeBrandColor,
} from '../application/DetectContrastMode';
import {
  generateAdaptiveGradient,
  AdaptiveGradientResult,
  GradientPreset,
} from '../application/GenerateAdaptiveGradient';
import {
  validateColorPair,
  quickAccessibilityCheck,
  ColorPairValidation,
} from '../application/ValidateAccessibility';
import { getColorCache } from '../infrastructure/cache/ColorCache';

// ============================================
// Types
// ============================================

export interface ColorAnalysis {
  hex: string;
  oklch: OKLCH | null;
  hct: HCT | null;
  contrastMode: ContrastModeResult;
  isLight: boolean;
  optimalTextColor: string;
  optimalTextColorMuted: string;
}

export interface BrandAnalysis {
  primary: ColorAnalysis;
  accent?: ColorAnalysis;
  glassStyles: {
    background: string;
    backdropFilter: string;
    border: string;
    shadow: string;
  };
  gradientCss: string;
  cssVariables: Record<string, string>;
}

export interface UseColorIntelligenceOptions {
  enableCache?: boolean;
  preloadColors?: string[];
}

export interface ColorIntelligenceHook {
  // Analysis
  analyzeColor: (hex: string) => ColorAnalysis;
  analyzeBrand: (primaryHex: string, accentHex?: string) => BrandAnalysis;

  // Contrast
  getContrastMode: (hex: string) => ContrastMode;
  getContrastModeResult: (hex: string) => ContrastModeResult;
  getOptimalTextColor: (backgroundHex: string) => string;

  // Validation
  validatePair: (fgHex: string, bgHex: string) => ColorPairValidation;
  isAccessible: (fgHex: string, bgHex: string, level?: 'AA' | 'AAA') => boolean;
  getContrastRatio: (fgHex: string, bgHex: string) => number;

  // Gradients
  generateGradient: (
    startHex: string,
    endHex?: string,
    preset?: GradientPreset
  ) => AdaptiveGradientResult;

  // Manipulation
  lighten: (hex: string, amount: number) => string;
  darken: (hex: string, amount: number) => string;
  saturate: (hex: string, amount: number) => string;
  desaturate: (hex: string, amount: number) => string;
  adjustHue: (hex: string, degrees: number) => string;
  interpolate: (startHex: string, endHex: string, t: number) => string;

  // Tonal palette
  getTonalPalette: (hex: string) => Map<number, string>;

  // Cache
  clearCache: () => void;
  getCacheStats: () => { hits: number; misses: number; size: number };
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useColorIntelligence Hook
 *
 * Provides a comprehensive, memoized interface to the Color Intelligence domain.
 *
 * @example
 * ```tsx
 * const { analyzeColor, getOptimalTextColor, generateGradient } = useColorIntelligence();
 *
 * const analysis = analyzeColor('#0EB58C');
 * const textColor = getOptimalTextColor('#0EB58C');
 * const gradient = generateGradient('#0EB58C', '#10B981', 'brand-surface');
 * ```
 */
export function useColorIntelligence(
  options: UseColorIntelligenceOptions = {}
): ColorIntelligenceHook {
  const { enableCache = true, preloadColors = [] } = options;

  // Initialize cache
  const cache = useMemo(() => {
    const c = getColorCache();
    if (preloadColors.length > 0) {
      c.preloadCommonColors(preloadColors);
    }
    return c;
  }, []);

  // ============================================
  // Analysis Functions
  // ============================================

  const analyzeColor = useCallback(
    (hex: string): ColorAnalysis => {
      const normalizedHex = normalizeHex(hex);

      const oklch = enableCache
        ? cache.getOklch(normalizedHex)
        : OKLCH.fromHex(normalizedHex);

      const hct = enableCache
        ? cache.getHct(normalizedHex)
        : HCT.fromHex(normalizedHex);

      const contrastMode = enableCache
        ? cache.getContrastMode(normalizedHex) ?? detectContrastMode(normalizedHex)
        : detectContrastMode(normalizedHex);

      if (enableCache && !cache.getContrastMode(normalizedHex)) {
        cache.setContrastMode(normalizedHex, contrastMode);
      }

      const isLight = contrastMode.mode === 'light-content';

      return {
        hex: normalizedHex,
        oklch,
        hct,
        contrastMode,
        isLight,
        optimalTextColor: isLight ? '#0A0A0A' : '#FFFFFF',
        optimalTextColorMuted: isLight
          ? 'rgba(10, 10, 10, 0.7)'
          : 'rgba(255, 255, 255, 0.7)',
      };
    },
    [cache, enableCache]
  );

  const analyzeBrand = useCallback(
    (primaryHex: string, accentHex?: string): BrandAnalysis => {
      const primary = analyzeColor(primaryHex);
      const accent = accentHex ? analyzeColor(accentHex) : undefined;

      const brandAnalysis = analyzeBrandColor(primaryHex, accentHex);

      // Generate glass styles
      const isLight = primary.isLight;
      const glassStyles = {
        background: brandAnalysis.glassBackground,
        backdropFilter: 'blur(20px) saturate(1.8)',
        border: brandAnalysis.borderColor,
        shadow: brandAnalysis.shadowColor,
      };

      // Generate gradient
      const gradientResult = generateAdaptiveGradient({
        preset: 'brand-surface',
        primaryColor: primaryHex,
        secondaryColor: accentHex,
        angle: 135,
      });

      // CSS Variables
      const oklch = primary.oklch!;
      const cssVariables: Record<string, string> = {
        '--color-primary': primaryHex,
        '--color-primary-foreground': primary.optimalTextColor,
        '--color-primary-l': `${oklch.l}`,
        '--color-primary-c': `${oklch.c}`,
        '--color-primary-h': `${oklch.h}`,
        '--color-primary-oklch': oklch.toCss(),
        '--glass-bg': glassStyles.background,
        '--glass-border': glassStyles.border,
        '--glass-shadow': glassStyles.shadow,
        '--gradient-brand': gradientResult.css,
      };

      if (accent?.oklch) {
        cssVariables['--color-accent'] = accentHex!;
        cssVariables['--color-accent-foreground'] = accent.optimalTextColor;
        cssVariables['--color-accent-oklch'] = accent.oklch.toCss();
      }

      return {
        primary,
        accent,
        glassStyles,
        gradientCss: gradientResult.css,
        cssVariables,
      };
    },
    [analyzeColor]
  );

  // ============================================
  // Contrast Functions
  // ============================================

  const getContrastMode = useCallback(
    (hex: string): ContrastMode => {
      const analysis = analyzeColor(hex);
      return analysis.contrastMode.mode;
    },
    [analyzeColor]
  );

  const getContrastModeResult = useCallback(
    (hex: string): ContrastModeResult => {
      const analysis = analyzeColor(hex);
      return analysis.contrastMode;
    },
    [analyzeColor]
  );

  const getOptimalTextColor = useCallback(
    (backgroundHex: string): string => {
      const analysis = analyzeColor(backgroundHex);
      return analysis.optimalTextColor;
    },
    [analyzeColor]
  );

  // ============================================
  // Validation Functions
  // ============================================

  const validatePair = useCallback(
    (fgHex: string, bgHex: string): ColorPairValidation => {
      return validateColorPair(normalizeHex(fgHex), normalizeHex(bgHex));
    },
    []
  );

  const isAccessible = useCallback(
    (fgHex: string, bgHex: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
      const validation = validatePair(fgHex, bgHex);

      if (level === 'AA') {
        return validation.passes.wcagAA || validation.passes.apcaLarge;
      }
      return validation.passes.wcagAAA || validation.passes.apcaBody;
    },
    [validatePair]
  );

  const getContrastRatio = useCallback(
    (fgHex: string, bgHex: string): number => {
      const validation = validatePair(fgHex, bgHex);
      return validation.wcag21ContrastRatio;
    },
    [validatePair]
  );

  // ============================================
  // Gradient Functions
  // ============================================

  const generateGradient = useCallback(
    (
      startHex: string,
      endHex?: string,
      preset: GradientPreset = 'brand-surface'
    ): AdaptiveGradientResult => {
      return generateAdaptiveGradient({
        preset,
        primaryColor: normalizeHex(startHex),
        secondaryColor: endHex ? normalizeHex(endHex) : undefined,
        angle: 180,
      });
    },
    []
  );

  // ============================================
  // Manipulation Functions
  // ============================================

  const lighten = useCallback(
    (hex: string, amount: number): string => {
      const oklch = OKLCH.fromHex(normalizeHex(hex));
      if (!oklch) return hex;
      return oklch.lighten(amount).toHex();
    },
    []
  );

  const darken = useCallback(
    (hex: string, amount: number): string => {
      const oklch = OKLCH.fromHex(normalizeHex(hex));
      if (!oklch) return hex;
      return oklch.darken(amount).toHex();
    },
    []
  );

  const saturate = useCallback(
    (hex: string, amount: number): string => {
      const oklch = OKLCH.fromHex(normalizeHex(hex));
      if (!oklch) return hex;
      return oklch.saturate(amount).toHex();
    },
    []
  );

  const desaturate = useCallback(
    (hex: string, amount: number): string => {
      const oklch = OKLCH.fromHex(normalizeHex(hex));
      if (!oklch) return hex;
      return oklch.desaturate(amount).toHex();
    },
    []
  );

  const adjustHue = useCallback(
    (hex: string, degrees: number): string => {
      const oklch = OKLCH.fromHex(normalizeHex(hex));
      if (!oklch) return hex;
      return oklch.withHue((oklch.h + degrees) % 360).toHex();
    },
    []
  );

  const interpolate = useCallback(
    (startHex: string, endHex: string, t: number): string => {
      const start = OKLCH.fromHex(normalizeHex(startHex));
      const end = OKLCH.fromHex(normalizeHex(endHex));

      if (!start || !end) {
        // Fallback to start color
        return startHex;
      }

      return OKLCH.interpolate(start, end, t, 'shorter').toHex();
    },
    []
  );

  // ============================================
  // Tonal Palette
  // ============================================

  const getTonalPalette = useCallback(
    (hex: string): Map<number, string> => {
      const hct = HCT.fromHex(normalizeHex(hex));
      if (!hct) return new Map();

      const palette = hct.generateTonalPalette();
      const result = new Map<number, string>();

      // Use Array.from to avoid downlevelIteration requirement
      Array.from(palette.entries()).forEach(([tone, color]) => {
        result.set(tone, color.toHex());
      });

      return result;
    },
    []
  );

  // ============================================
  // Cache Functions
  // ============================================

  const clearCache = useCallback(() => {
    cache.clear();
  }, [cache]);

  const getCacheStats = useCallback(() => {
    const stats = cache.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: stats.size,
    };
  }, [cache]);

  // ============================================
  // Return Hook
  // ============================================

  return {
    // Analysis
    analyzeColor,
    analyzeBrand,

    // Contrast
    getContrastMode,
    getContrastModeResult,
    getOptimalTextColor,

    // Validation
    validatePair,
    isAccessible,
    getContrastRatio,

    // Gradients
    generateGradient,

    // Manipulation
    lighten,
    darken,
    saturate,
    desaturate,
    adjustHue,
    interpolate,

    // Tonal palette
    getTonalPalette,

    // Cache
    clearCache,
    getCacheStats,
  };
}

// ============================================
// Helper Functions
// ============================================

function normalizeHex(hex: string): string {
  let normalized = hex.trim();
  if (!normalized.startsWith('#')) {
    normalized = `#${normalized}`;
  }
  return normalized.toUpperCase();
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * Hook for analyzing a brand color with reactive updates
 */
export function useBrandAnalysis(
  primaryColor: string | null | undefined,
  accentColor?: string | null
) {
  const { analyzeBrand, analyzeColor } = useColorIntelligence();

  return useMemo(() => {
    if (!primaryColor) {
      return null;
    }

    return analyzeBrand(primaryColor, accentColor ?? undefined);
  }, [primaryColor, accentColor, analyzeBrand]);
}

/**
 * Hook for getting optimal text color
 */
export function useOptimalTextColor(backgroundColor: string | null | undefined) {
  const { getOptimalTextColor } = useColorIntelligence();

  return useMemo(() => {
    if (!backgroundColor) {
      return null;
    }

    return getOptimalTextColor(backgroundColor);
  }, [backgroundColor, getOptimalTextColor]);
}

/**
 * Hook for checking accessibility
 */
export function useAccessibilityCheck(
  foregroundColor: string | null | undefined,
  backgroundColor: string | null | undefined
) {
  const { validatePair, isAccessible } = useColorIntelligence();

  return useMemo(() => {
    if (!foregroundColor || !backgroundColor) {
      return null;
    }

    const validation = validatePair(foregroundColor, backgroundColor);

    return {
      ...validation,
      passesAA: isAccessible(foregroundColor, backgroundColor, 'AA'),
      passesAAA: isAccessible(foregroundColor, backgroundColor, 'AAA'),
    };
  }, [foregroundColor, backgroundColor, validatePair, isAccessible]);
}

/**
 * Hook for generating gradient CSS
 */
export function useGradientCss(
  startColor: string | null | undefined,
  endColor?: string | null,
  preset: GradientPreset = 'brand-surface'
) {
  const { generateGradient } = useColorIntelligence();

  return useMemo(() => {
    if (!startColor) {
      return null;
    }

    const result = generateGradient(startColor, endColor ?? undefined, preset);
    return result.css;
  }, [startColor, endColor, preset, generateGradient]);
}

/**
 * Hook for tonal palette
 */
export function useTonalPalette(baseColor: string | null | undefined) {
  const { getTonalPalette } = useColorIntelligence();

  return useMemo(() => {
    if (!baseColor) {
      return null;
    }

    return getTonalPalette(baseColor);
  }, [baseColor, getTonalPalette]);
}

export default useColorIntelligence;
