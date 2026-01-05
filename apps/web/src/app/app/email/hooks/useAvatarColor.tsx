'use client';

/**
 * useAvatarColor Hook
 *
 * Generates perceptually uniform avatar colors using HCT tonal palettes.
 * Replaces hardcoded Tailwind gradient colors with Color Intelligence.
 *
 * v1.0 - Color Intelligence Integration
 * - Uses HCT (Hue-Chroma-Tone) for Material Design 3 tonal palettes
 * - APCA-validated text colors for accessibility
 * - Deterministic color generation based on input string
 * - OKLCH gradients for perceptually smooth transitions
 *
 * Based on:
 * - Material Design 3 Color System: https://m3.material.io/styles/color
 * - HCT Color Space: Tone difference >= 40 guarantees WCAG AA
 */

import * as React from 'react';
import {
  HCT,
  APCAContrast,
  getColorCache,
} from '@/lib/color-intelligence';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface AvatarColorResult {
  /** Primary background color (hex) */
  backgroundColor: string;
  /** Gradient end color for depth (hex) */
  gradientEndColor: string;
  /** APCA-validated text color */
  textColor: string;
  /** CSS gradient string for direct use */
  gradient: string;
  /** OKLCH gradient for modern browsers */
  oklchGradient: string;
  /** Hue angle used (0-360) for consistent theming */
  hue: number;
  /** Tone value used (0-100) */
  tone: number;
}

export interface AvatarColorOptions {
  /** Use tenant primary color as base hue */
  useTenantHue?: boolean;
  /** Minimum tone for backgrounds (default: 35) */
  minTone?: number;
  /** Maximum tone for backgrounds (default: 65) */
  maxTone?: number;
  /** Chroma level for saturation (default: 48) */
  chroma?: number;
}

// ============================================
// Constants
// ============================================

/**
 * Golden ratio-based hue distribution for visually pleasing variety
 * Using golden angle (137.508°) for optimal hue separation
 */
const GOLDEN_ANGLE = 137.508;

/**
 * Base hues for diverse color palette (in HCT hue degrees)
 * Selected for maximum perceptual distinction
 */
const BASE_HUES = [
  25,   // Orange-red
  60,   // Yellow
  145,  // Green
  200,  // Cyan
  265,  // Blue
  310,  // Purple
  340,  // Magenta
] as const;

// ============================================
// Utilities
// ============================================

/**
 * Generate a deterministic hash from a string
 * Uses djb2 algorithm for consistent distribution
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Get initials from an email address or name
 */
export function getInitials(input: string): string {
  // If it's an email, extract name part
  const namePart = input.includes('@') ? input.split('@')[0] : input;

  // Split by common separators and get first letters
  const parts = namePart?.split(/[._-]/).filter(Boolean) ?? [];

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  // Single word - take first two characters
  const firstPart = parts[0] ?? '';
  return firstPart.slice(0, 2).toUpperCase();
}

// ============================================
// Color Generation with HCT
// ============================================

/**
 * Generate avatar color using HCT tonal palette
 * Guarantees WCAG AA contrast for text
 */
function generateAvatarColorHCT(
  input: string,
  options: Required<Omit<AvatarColorOptions, 'useTenantHue'>> & { tenantHue?: number }
): AvatarColorResult {
  const { minTone, maxTone, chroma, tenantHue } = options;
  const cache = getColorCache();

  // Generate deterministic hash
  const hash = hashString(input.toLowerCase());

  // Calculate hue - use tenant hue as base if provided, otherwise use diverse hues
  let hue: number;
  if (tenantHue !== undefined) {
    // Rotate around tenant hue using golden angle for variety
    const rotations = hash % 12;
    hue = (tenantHue + rotations * GOLDEN_ANGLE) % 360;
  } else {
    // Select from base hues, then add slight variation
    const baseHue = BASE_HUES[hash % BASE_HUES.length] ?? 200;
    const variation = (hash / 1000) % 30 - 15; // ±15° variation
    hue = (baseHue + variation + 360) % 360;
  }

  // Calculate tone within specified range
  const toneRange = maxTone - minTone;
  const tone = minTone + (hash % toneRange);

  // Create HCT color
  const hct = HCT.create(hue, chroma, tone);
  const backgroundColor = hct.toHex();

  // Generate gradient end color (slightly darker for depth)
  // Use HCT to ensure perceptually uniform darkening
  const gradientEndTone = Math.max(tone - 12, 20); // At least 12 tones darker
  const gradientEndHct = HCT.create(hue, chroma * 1.1, gradientEndTone);
  const gradientEndColor = gradientEndHct.toHex();

  // Get APCA-validated text color
  const textResult = APCAContrast.findOptimalTextColor(backgroundColor, {
    minLc: 75, // Body text requirement for readability
  });
  const textColor = textResult.color;

  // Generate CSS gradients
  const gradient = `linear-gradient(135deg, ${backgroundColor}, ${gradientEndColor})`;

  // OKLCH gradient for modern browsers (more perceptually uniform)
  const bgOklch = cache.getOklch(backgroundColor);
  const endOklch = cache.getOklch(gradientEndColor);

  let oklchGradient = gradient;
  if (bgOklch && endOklch) {
    oklchGradient = `linear-gradient(135deg, oklch(${bgOklch.l.toFixed(3)} ${bgOklch.c.toFixed(3)} ${bgOklch.h.toFixed(1)}), oklch(${endOklch.l.toFixed(3)} ${endOklch.c.toFixed(3)} ${endOklch.h.toFixed(1)}))`;
  }

  return {
    backgroundColor,
    gradientEndColor,
    textColor,
    gradient,
    oklchGradient,
    hue,
    tone,
  };
}

// ============================================
// Main Hook
// ============================================

/**
 * useAvatarColor
 *
 * Generates a perceptually uniform avatar color based on input string.
 * Uses HCT color space for Material Design 3 tonal palettes.
 *
 * @example
 * ```tsx
 * const { gradient, textColor, initials } = useAvatarColor('john.doe@example.com');
 *
 * <div style={{ background: gradient, color: textColor }}>
 *   {initials}
 * </div>
 * ```
 */
export function useAvatarColor(
  input: string,
  options: AvatarColorOptions = {}
): AvatarColorResult & { initials: string } {
  const { primaryColor } = useTenantBranding();
  const cache = getColorCache();

  const {
    useTenantHue = false,
    minTone = 35,
    maxTone = 65,
    chroma = 48,
  } = options;

  // Get tenant hue if requested
  const tenantHue = React.useMemo(() => {
    if (!useTenantHue) return undefined;
    const hct = cache.getHct(primaryColor);
    return hct?.h;
  }, [useTenantHue, primaryColor, cache]);

  // Generate avatar color
  const colorResult = React.useMemo(() => {
    return generateAvatarColorHCT(input, {
      minTone,
      maxTone,
      chroma,
      tenantHue,
    });
  }, [input, minTone, maxTone, chroma, tenantHue]);

  // Generate initials
  const initials = React.useMemo(() => getInitials(input), [input]);

  return {
    ...colorResult,
    initials,
  };
}

/**
 * useAvatarColorPalette
 *
 * Generate multiple avatar colors for a list of inputs.
 * Useful for rendering email lists with consistent coloring.
 *
 * @example
 * ```tsx
 * const palette = useAvatarColorPalette(emails.map(e => e.from));
 *
 * emails.map((email, i) => (
 *   <Avatar style={{ background: palette[i].gradient }} />
 * ))
 * ```
 */
export function useAvatarColorPalette(
  inputs: string[],
  options: AvatarColorOptions = {}
): Map<string, AvatarColorResult & { initials: string }> {
  const { primaryColor } = useTenantBranding();
  const cache = getColorCache();

  const {
    useTenantHue = false,
    minTone = 35,
    maxTone = 65,
    chroma = 48,
  } = options;

  // Get tenant hue if requested
  const tenantHue = React.useMemo(() => {
    if (!useTenantHue) return undefined;
    const hct = cache.getHct(primaryColor);
    return hct?.h;
  }, [useTenantHue, primaryColor, cache]);

  // Generate palette
  return React.useMemo(() => {
    const palette = new Map<string, AvatarColorResult & { initials: string }>();

    for (const input of inputs) {
      if (palette.has(input)) continue;

      const colorResult = generateAvatarColorHCT(input, {
        minTone,
        maxTone,
        chroma,
        tenantHue,
      });

      palette.set(input, {
        ...colorResult,
        initials: getInitials(input),
      });
    }

    return palette;
  }, [inputs, minTone, maxTone, chroma, tenantHue]);
}

/**
 * Pure function for non-React contexts
 * Useful for server-side rendering or static generation
 */
export function getAvatarColor(
  input: string,
  options: AvatarColorOptions & { tenantPrimaryColor?: string } = {}
): AvatarColorResult & { initials: string } {
  const cache = getColorCache();

  const {
    useTenantHue = false,
    tenantPrimaryColor,
    minTone = 35,
    maxTone = 65,
    chroma = 48,
  } = options;

  let tenantHue: number | undefined;
  if (useTenantHue && tenantPrimaryColor) {
    const hct = cache.getHct(tenantPrimaryColor);
    tenantHue = hct?.h;
  }

  const colorResult = generateAvatarColorHCT(input, {
    minTone,
    maxTone,
    chroma,
    tenantHue,
  });

  return {
    ...colorResult,
    initials: getInitials(input),
  };
}

export default useAvatarColor;
