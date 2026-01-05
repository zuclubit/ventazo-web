'use client';

/**
 * useColorIntelligence Hook
 *
 * Provides Color Intelligence features for email components.
 * Focused on color analysis, accessibility validation, and dynamic color generation.
 *
 * v1.0 - Color Intelligence Integration
 * - OKLCH for perceptually uniform color manipulation
 * - HCT for Material Design 3 tonal palettes
 * - APCA for WCAG 3.0 contrast validation
 * - Smart contrast mode detection
 * - Memoized calculations for performance
 */

import * as React from 'react';

import {
  OKLCH,
  HCT,
  APCAContrast,
  detectContrastMode,
  analyzeBrandColor,
  validateColorPair,
  getColorCache,
  type ContrastMode,
  type ColorPairValidation,
  type APCALevel,
} from '@/lib/color-intelligence';

// Infer the return type of analyzeBrandColor for type safety
type BrandColorAnalysisResult = ReturnType<typeof analyzeBrandColor>;

// ============================================
// Types
// ============================================

export interface ColorAnalysis {
  /** Detected contrast mode */
  mode: ContrastMode;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether the color needs light content (white text/icons) */
  needsLightContent: boolean;
  /** Whether the color needs dark content (black text/icons) */
  needsDarkContent: boolean;
  /** OKLCH representation */
  oklch: OKLCH | null;
  /** HCT representation */
  hct: HCT | null;
  /** Perceptual lightness (0-1) */
  lightness: number;
  /** Chroma/saturation (0-0.4) */
  chroma: number;
  /** Hue angle (0-360) */
  hue: number;
}

export interface ContrastAnalysis {
  /** APCA Lc value (-108 to +108) */
  lc: number;
  /** Absolute Lc value */
  absoluteLc: number;
  /** Polarity of contrast */
  polarity: 'light-on-dark' | 'dark-on-light';
  /** Accessibility level */
  level: APCALevel;
  /** Valid for body text (14px+) */
  validForBody: boolean;
  /** Valid for large text (24px+) */
  validForLarge: boolean;
  /** Valid for headlines (32px+) */
  validForHeadlines: boolean;
  /** Valid for spot text/UI elements */
  validForSpot: boolean;
}

export interface ColorIntelligenceAPI {
  /** Analyze a single color */
  analyzeColor: (hex: string) => ColorAnalysis;
  /** Analyze contrast between two colors */
  analyzeContrast: (foreground: string, background: string) => ContrastAnalysis;
  /** Find optimal text color for a background */
  findOptimalTextColor: (
    background: string,
    options?: { preferDark?: boolean; minLc?: number }
  ) => { color: string; contrast: ContrastAnalysis };
  /** Generate tonal palette from a color */
  generateTonalPalette: (hex: string) => Map<number, string>;
  /** Lighten a color perceptually */
  lighten: (hex: string, amount: number) => string;
  /** Darken a color perceptually */
  darken: (hex: string, amount: number) => string;
  /** Adjust saturation perceptually */
  saturate: (hex: string, factor: number) => string;
  /** Desaturate a color perceptually */
  desaturate: (hex: string, factor: number) => string;
  /** Rotate hue by degrees */
  rotateHue: (hex: string, degrees: number) => string;
  /** Get color with alpha (OKLCH format) */
  withAlpha: (hex: string, alpha: number) => string;
  /** Validate accessibility of a color pair */
  validateAccessibility: (
    foreground: string,
    background: string
  ) => ColorPairValidation;
  /** Get full brand analysis for a color */
  getBrandAnalysis: (
    primary: string,
    accent?: string
  ) => BrandColorAnalysisResult;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * useColorIntelligence
 *
 * Provides Color Intelligence utilities for email components.
 * All calculations are memoized and use the centralized color cache.
 *
 * @example
 * ```tsx
 * const { analyzeColor, analyzeContrast, findOptimalTextColor } = useColorIntelligence();
 *
 * const analysis = analyzeColor('#3B82F6');
 * console.log(analysis.needsLightContent); // true
 *
 * const contrast = analyzeContrast('#FFFFFF', '#3B82F6');
 * console.log(contrast.validForBody); // true
 *
 * const optimal = findOptimalTextColor('#3B82F6');
 * console.log(optimal.color); // '#FFFFFF'
 * ```
 */
export function useColorIntelligence(): ColorIntelligenceAPI {
  const cache = React.useMemo(() => getColorCache(), []);

  // Analyze a single color
  const analyzeColor = React.useCallback(
    (hex: string): ColorAnalysis => {
      const oklch = cache.getOklch(hex);
      const hct = cache.getHct(hex);
      const contrastResult = detectContrastMode(hex);

      return {
        mode: contrastResult.mode,
        confidence: contrastResult.confidence,
        needsLightContent: contrastResult.mode === 'light-content',
        needsDarkContent: contrastResult.mode === 'dark-content',
        oklch,
        hct,
        lightness: oklch?.l ?? 0.5,
        chroma: oklch?.c ?? 0,
        hue: oklch?.h ?? 0,
      };
    },
    [cache]
  );

  // Analyze contrast between two colors
  const analyzeContrast = React.useCallback(
    (foreground: string, background: string): ContrastAnalysis => {
      const apca = cache.getApca(foreground, background);

      return {
        lc: apca.lc,
        absoluteLc: apca.absoluteLc,
        polarity: apca.polarity,
        level: apca.level,
        validForBody: apca.isValidForBodyText(),
        validForLarge: apca.isValidForLargeText(),
        validForHeadlines: apca.isValidForHeadlines(),
        validForSpot: apca.isValidForSpotText(),
      };
    },
    [cache]
  );

  // Find optimal text color for a background
  const findOptimalTextColor = React.useCallback(
    (
      background: string,
      options?: { preferDark?: boolean; minLc?: number }
    ): { color: string; contrast: ContrastAnalysis } => {
      const result = APCAContrast.findOptimalTextColor(background, options);

      return {
        color: result.color,
        contrast: {
          lc: result.contrast.lc,
          absoluteLc: result.contrast.absoluteLc,
          polarity: result.contrast.polarity,
          level: result.contrast.level,
          validForBody: result.contrast.isValidForBodyText(),
          validForLarge: result.contrast.isValidForLargeText(),
          validForHeadlines: result.contrast.isValidForHeadlines(),
          validForSpot: result.contrast.isValidForSpotText(),
        },
      };
    },
    []
  );

  // Generate tonal palette from a color
  const generateTonalPalette = React.useCallback(
    (hex: string): Map<number, string> => {
      const hct = cache.getHct(hex);
      if (!hct) return new Map();

      const tonalPalette = hct.generateTonalPalette();
      const result = new Map<number, string>();

      tonalPalette.forEach((color, tone) => {
        result.set(tone, color.toHex());
      });

      return result;
    },
    [cache]
  );

  // Lighten a color perceptually
  const lighten = React.useCallback(
    (hex: string, amount: number): string => {
      const oklch = cache.getOklch(hex);
      return oklch ? oklch.lighten(amount).toHex() : hex;
    },
    [cache]
  );

  // Darken a color perceptually
  const darken = React.useCallback(
    (hex: string, amount: number): string => {
      const oklch = cache.getOklch(hex);
      return oklch ? oklch.darken(amount).toHex() : hex;
    },
    [cache]
  );

  // Adjust saturation perceptually
  const saturate = React.useCallback(
    (hex: string, factor: number): string => {
      const oklch = cache.getOklch(hex);
      return oklch ? oklch.saturate(factor).toHex() : hex;
    },
    [cache]
  );

  // Desaturate a color perceptually
  const desaturate = React.useCallback(
    (hex: string, factor: number): string => {
      const oklch = cache.getOklch(hex);
      return oklch ? oklch.saturate(1 / factor).toHex() : hex;
    },
    [cache]
  );

  // Rotate hue by degrees
  const rotateHue = React.useCallback(
    (hex: string, degrees: number): string => {
      const oklch = cache.getOklch(hex);
      return oklch ? oklch.rotateHue(degrees).toHex() : hex;
    },
    [cache]
  );

  // Get color with alpha (OKLCH format)
  const withAlpha = React.useCallback(
    (hex: string, alpha: number): string => {
      const oklch = cache.getOklch(hex);
      if (oklch) {
        return `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / ${alpha})`;
      }
      // Fallback to rgba
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result || result.length < 4) {
        return `rgba(0, 0, 0, ${alpha})`;
      }
      const r = parseInt(result[1] ?? '0', 16);
      const g = parseInt(result[2] ?? '0', 16);
      const b = parseInt(result[3] ?? '0', 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },
    [cache]
  );

  // Validate accessibility of a color pair
  const validateAccessibility = React.useCallback(
    (foreground: string, background: string): ColorPairValidation => {
      return validateColorPair(foreground, background);
    },
    []
  );

  // Get full brand analysis for a color
  const getBrandAnalysis = React.useCallback(
    (primary: string, accent?: string): BrandColorAnalysisResult => {
      return analyzeBrandColor(primary, accent);
    },
    []
  );

  return {
    analyzeColor,
    analyzeContrast,
    findOptimalTextColor,
    generateTonalPalette,
    lighten,
    darken,
    saturate,
    desaturate,
    rotateHue,
    withAlpha,
    validateAccessibility,
    getBrandAnalysis,
  };
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * useColorAnalysis
 *
 * Simplified hook for analyzing a single color.
 * Memoizes the analysis result based on the input color.
 *
 * @example
 * ```tsx
 * const { mode, needsLightContent } = useColorAnalysis('#3B82F6');
 * ```
 */
export function useColorAnalysis(hex: string): ColorAnalysis {
  const { analyzeColor } = useColorIntelligence();

  return React.useMemo(() => analyzeColor(hex), [analyzeColor, hex]);
}

/**
 * useContrastAnalysis
 *
 * Simplified hook for analyzing contrast between two colors.
 *
 * @example
 * ```tsx
 * const { validForBody, lc } = useContrastAnalysis('#FFFFFF', '#3B82F6');
 * ```
 */
export function useContrastAnalysis(
  foreground: string,
  background: string
): ContrastAnalysis {
  const { analyzeContrast } = useColorIntelligence();

  return React.useMemo(
    () => analyzeContrast(foreground, background),
    [analyzeContrast, foreground, background]
  );
}

/**
 * useOptimalTextColor
 *
 * Hook to get the optimal text color for a background.
 *
 * @example
 * ```tsx
 * const { color, contrast } = useOptimalTextColor('#3B82F6');
 * // color: '#FFFFFF', contrast.validForBody: true
 * ```
 */
export function useOptimalTextColor(
  background: string,
  options?: { preferDark?: boolean; minLc?: number }
): { color: string; contrast: ContrastAnalysis } {
  const { findOptimalTextColor } = useColorIntelligence();

  return React.useMemo(
    () => findOptimalTextColor(background, options),
    [findOptimalTextColor, background, options]
  );
}

/**
 * useTonalPalette
 *
 * Hook to generate a tonal palette from a color.
 *
 * @example
 * ```tsx
 * const palette = useTonalPalette('#3B82F6');
 * const primary = palette.get(40); // Primary tone
 * const container = palette.get(90); // Light container
 * ```
 */
export function useTonalPalette(hex: string): Map<number, string> {
  const { generateTonalPalette } = useColorIntelligence();

  return React.useMemo(
    () => generateTonalPalette(hex),
    [generateTonalPalette, hex]
  );
}

/**
 * useBrandColors
 *
 * Hook to get full brand color analysis for theming components.
 *
 * @example
 * ```tsx
 * const { foreground, surface, glass } = useBrandColors('#3B82F6');
 * ```
 */
export function useBrandColors(
  primary: string,
  accent?: string
): BrandColorAnalysisResult {
  const { getBrandAnalysis } = useColorIntelligence();

  return React.useMemo(
    () => getBrandAnalysis(primary, accent),
    [getBrandAnalysis, primary, accent]
  );
}

export default useColorIntelligence;
