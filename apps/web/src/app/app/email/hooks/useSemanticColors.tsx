'use client';

/**
 * useSemanticColors Hook
 *
 * Provides APCA-validated semantic colors for email actions.
 * Adapts colors based on surface contrast mode (light/dark content).
 *
 * v1.0 - Color Intelligence Integration
 * - APCA Lc thresholds: 75 (body), 60 (large), 45 (headlines), 30 (spot)
 * - Automatic surface-aware color adaptation
 * - HCT tonal adjustments for accessibility
 * - OKLCH alpha blending for hover states
 *
 * Semantic Color Categories:
 * - Star/Favorite: Amber/Gold (hue ~85 in HCT)
 * - Delete/Destructive: Red (hue ~25 in HCT)
 * - Archive: Neutral gray
 * - Reply: Primary brand
 * - Forward: Accent brand
 * - Unread: Primary brand indicator
 *
 * Based on:
 * - APCA WCAG 3.0: https://www.w3.org/WAI/GL/task-forces/silver/wiki/Visual_Contrast_of_Text_Subgroup
 * - HCT Tone Contrast: Tone difference >= 40 guarantees WCAG AA
 */

import * as React from 'react';
import {
  HCT,
  APCAContrast,
  detectContrastMode,
  getColorCache,
  type ContrastMode,
} from '@/lib/color-intelligence';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface SemanticColor {
  /** Main color (hex) */
  color: string;
  /** Hover state color (hex) */
  hover: string;
  /** Active/pressed state color (hex) */
  active: string;
  /** Muted/inactive state color (hex) */
  muted: string;
  /** Background color with alpha (OKLCH) */
  background: string;
  /** Border color with alpha (OKLCH) */
  border: string;
  /** Whether this color has sufficient contrast on current surface */
  isAccessible: boolean;
  /** APCA Lc value against current surface */
  contrastLc: number;
}

export interface SemanticColors {
  /** Star/favorite action (amber/gold) */
  star: SemanticColor;
  /** Delete/destructive action (red) */
  delete: SemanticColor;
  /** Archive action (neutral) */
  archive: SemanticColor;
  /** Reply action (primary brand) */
  reply: SemanticColor;
  /** Forward action (accent brand) */
  forward: SemanticColor;
  /** Unread indicator (primary brand) */
  unread: SemanticColor;
  /** Success states (green) */
  success: SemanticColor;
  /** Warning states (orange) */
  warning: SemanticColor;
  /** Info states (blue) */
  info: SemanticColor;

  /** Current contrast mode */
  contrastMode: ContrastMode;
  /** Surface color used for calculations */
  surfaceColor: string;
}

// ============================================
// Constants - Base Semantic Colors (HCT Hue)
// ============================================

/**
 * Base HCT hue values for semantic colors
 * Selected for universal color association and distinction
 */
const SEMANTIC_HCT_HUES = {
  star: 85,      // Amber/Gold - universal positive indicator
  delete: 25,    // Red - universal danger/stop
  archive: 250,  // Neutral blue-gray
  success: 145,  // Green - universal positive/complete
  warning: 55,   // Orange - universal caution
  info: 250,     // Blue - universal information
} as const;

/**
 * Base chroma for semantic colors
 * Slightly higher than UI elements for emphasis
 */
const SEMANTIC_CHROMA = {
  star: 84,      // High chroma for visibility
  delete: 72,    // High chroma for danger emphasis
  archive: 8,    // Very low chroma for neutral
  success: 64,   // Medium-high for positive feedback
  warning: 72,   // High for attention
  info: 48,      // Medium for informational
} as const;

// ============================================
// Color Generation
// ============================================

/**
 * Generate a semantic color with APCA validation
 */
function generateSemanticColor(
  hue: number,
  chroma: number,
  surfaceColor: string,
  isLightContent: boolean
): SemanticColor {
  const cache = getColorCache();

  // Calculate optimal tone for surface contrast
  // Light content (dark surface) needs higher tones
  // Dark content (light surface) needs lower tones
  const baseTone = isLightContent ? 75 : 45;

  // Create base color using HCT
  const baseHct = HCT.create(hue, chroma, baseTone);
  const baseColor = baseHct.toHex();

  // Validate contrast with APCA
  const apca = cache.getApca(baseColor, surfaceColor);
  let finalColor = baseColor;
  let finalHct = baseHct;

  // If contrast is insufficient, adjust tone
  if (!apca.isValidForSpotText()) {
    // Increase tone difference
    const adjustedTone = isLightContent
      ? Math.min(baseTone + 15, 95)
      : Math.max(baseTone - 15, 15);

    finalHct = HCT.create(hue, chroma, adjustedTone);
    finalColor = finalHct.toHex();
  }

  // Generate state variants using HCT tone adjustments
  const hoverHct = HCT.create(hue, chroma * 1.1, finalHct.t + (isLightContent ? 5 : -5));
  const activeHct = HCT.create(hue, chroma * 1.2, finalHct.t + (isLightContent ? 10 : -10));
  const mutedHct = HCT.create(hue, chroma * 0.4, finalHct.t);

  // Get OKLCH for alpha blending
  const oklch = cache.getOklch(finalColor);
  let background = `${finalColor}1A`; // Fallback with hex alpha
  let border = `${finalColor}33`;

  if (oklch) {
    background = `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / 0.1)`;
    border = `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / 0.2)`;
  }

  // Final APCA check
  const finalApca = cache.getApca(finalColor, surfaceColor);

  return {
    color: finalColor,
    hover: hoverHct.toHex(),
    active: activeHct.toHex(),
    muted: mutedHct.toHex(),
    background,
    border,
    isAccessible: finalApca.isValidForSpotText(),
    contrastLc: finalApca.absoluteLc,
  };
}

/**
 * Generate brand-derived semantic color
 */
function generateBrandSemanticColor(
  brandColor: string,
  surfaceColor: string,
  isLightContent: boolean
): SemanticColor {
  const cache = getColorCache();
  const brandHct = cache.getHct(brandColor);

  if (!brandHct) {
    // Fallback to generic blue
    return generateSemanticColor(250, 48, surfaceColor, isLightContent);
  }

  // Use brand hue and chroma, adjust tone for contrast
  const baseTone = isLightContent ? 75 : 45;
  const baseHct = HCT.create(brandHct.h, brandHct.c, baseTone);
  let finalColor = baseHct.toHex();

  // Validate contrast
  const apca = cache.getApca(finalColor, surfaceColor);
  let finalHct = baseHct;

  if (!apca.isValidForSpotText()) {
    const adjustedTone = isLightContent
      ? Math.min(baseTone + 15, 95)
      : Math.max(baseTone - 15, 15);
    finalHct = HCT.create(brandHct.h, brandHct.c, adjustedTone);
    finalColor = finalHct.toHex();
  }

  // Generate state variants
  const hoverHct = HCT.create(brandHct.h, brandHct.c * 1.1, finalHct.t + (isLightContent ? 5 : -5));
  const activeHct = HCT.create(brandHct.h, brandHct.c * 1.2, finalHct.t + (isLightContent ? 10 : -10));
  const mutedHct = HCT.create(brandHct.h, brandHct.c * 0.4, finalHct.t);

  // OKLCH alpha blending
  const oklch = cache.getOklch(finalColor);
  let background = `${finalColor}1A`;
  let border = `${finalColor}33`;

  if (oklch) {
    background = `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / 0.1)`;
    border = `oklch(${oklch.l.toFixed(3)} ${oklch.c.toFixed(3)} ${oklch.h.toFixed(1)} / 0.2)`;
  }

  const finalApca = cache.getApca(finalColor, surfaceColor);

  return {
    color: finalColor,
    hover: hoverHct.toHex(),
    active: activeHct.toHex(),
    muted: mutedHct.toHex(),
    background,
    border,
    isAccessible: finalApca.isValidForSpotText(),
    contrastLc: finalApca.absoluteLc,
  };
}

// ============================================
// Main Hook
// ============================================

/**
 * useSemanticColors
 *
 * Provides APCA-validated semantic colors for email actions.
 * Automatically adapts to surface contrast mode.
 *
 * @example
 * ```tsx
 * const { star, delete: deleteColor, unread } = useSemanticColors();
 *
 * <StarIcon style={{ color: isStarred ? star.color : star.muted }} />
 * <button style={{ backgroundColor: deleteColor.background }}>
 *   <TrashIcon style={{ color: deleteColor.color }} />
 * </button>
 * <span style={{ backgroundColor: unread.color }} className="w-2 h-2 rounded-full" />
 * ```
 */
export function useSemanticColors(): SemanticColors {
  const { primaryColor, accentColor, surfaceColor } = useTenantBranding();

  return React.useMemo(() => {
    // Detect contrast mode for surface
    const contrastResult = detectContrastMode(surfaceColor);
    const isLightContent = contrastResult.mode === 'light-content';

    // Generate fixed semantic colors
    const star = generateSemanticColor(
      SEMANTIC_HCT_HUES.star,
      SEMANTIC_CHROMA.star,
      surfaceColor,
      isLightContent
    );

    const deleteColor = generateSemanticColor(
      SEMANTIC_HCT_HUES.delete,
      SEMANTIC_CHROMA.delete,
      surfaceColor,
      isLightContent
    );

    const archive = generateSemanticColor(
      SEMANTIC_HCT_HUES.archive,
      SEMANTIC_CHROMA.archive,
      surfaceColor,
      isLightContent
    );

    const success = generateSemanticColor(
      SEMANTIC_HCT_HUES.success,
      SEMANTIC_CHROMA.success,
      surfaceColor,
      isLightContent
    );

    const warning = generateSemanticColor(
      SEMANTIC_HCT_HUES.warning,
      SEMANTIC_CHROMA.warning,
      surfaceColor,
      isLightContent
    );

    const info = generateSemanticColor(
      SEMANTIC_HCT_HUES.info,
      SEMANTIC_CHROMA.info,
      surfaceColor,
      isLightContent
    );

    // Generate brand-derived semantic colors
    const reply = generateBrandSemanticColor(primaryColor, surfaceColor, isLightContent);
    const forward = generateBrandSemanticColor(accentColor, surfaceColor, isLightContent);
    const unread = generateBrandSemanticColor(primaryColor, surfaceColor, isLightContent);

    return {
      star,
      delete: deleteColor,
      archive,
      reply,
      forward,
      unread,
      success,
      warning,
      info,
      contrastMode: contrastResult.mode,
      surfaceColor,
    };
  }, [primaryColor, accentColor, surfaceColor]);
}

/**
 * useSemanticColor
 *
 * Get a single semantic color by type.
 * Useful when you only need one semantic color.
 *
 * @example
 * ```tsx
 * const starColor = useSemanticColor('star');
 * ```
 */
export function useSemanticColor(
  type: keyof Omit<SemanticColors, 'contrastMode' | 'surfaceColor'>
): SemanticColor {
  const colors = useSemanticColors();
  return colors[type];
}

/**
 * Pure function for non-React contexts
 */
export function getSemanticColors(
  primaryColor: string,
  accentColor: string,
  surfaceColor: string
): SemanticColors {
  const contrastResult = detectContrastMode(surfaceColor);
  const isLightContent = contrastResult.mode === 'light-content';

  const star = generateSemanticColor(
    SEMANTIC_HCT_HUES.star,
    SEMANTIC_CHROMA.star,
    surfaceColor,
    isLightContent
  );

  const deleteColor = generateSemanticColor(
    SEMANTIC_HCT_HUES.delete,
    SEMANTIC_CHROMA.delete,
    surfaceColor,
    isLightContent
  );

  const archive = generateSemanticColor(
    SEMANTIC_HCT_HUES.archive,
    SEMANTIC_CHROMA.archive,
    surfaceColor,
    isLightContent
  );

  const success = generateSemanticColor(
    SEMANTIC_HCT_HUES.success,
    SEMANTIC_CHROMA.success,
    surfaceColor,
    isLightContent
  );

  const warning = generateSemanticColor(
    SEMANTIC_HCT_HUES.warning,
    SEMANTIC_CHROMA.warning,
    surfaceColor,
    isLightContent
  );

  const info = generateSemanticColor(
    SEMANTIC_HCT_HUES.info,
    SEMANTIC_CHROMA.info,
    surfaceColor,
    isLightContent
  );

  const reply = generateBrandSemanticColor(primaryColor, surfaceColor, isLightContent);
  const forward = generateBrandSemanticColor(accentColor, surfaceColor, isLightContent);
  const unread = generateBrandSemanticColor(primaryColor, surfaceColor, isLightContent);

  return {
    star,
    delete: deleteColor,
    archive,
    reply,
    forward,
    unread,
    success,
    warning,
    info,
    contrastMode: contrastResult.mode,
    surfaceColor,
  };
}

export default useSemanticColors;
