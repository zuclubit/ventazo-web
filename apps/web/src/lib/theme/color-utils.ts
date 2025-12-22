// ============================================
// Color Utilities for Theme System
// Professional color manipulation, conversion, and WCAG validation
// ============================================

import type { RGB, HSL, ColorValidation } from './types';

// ============================================
// Color Conversion Functions
// ============================================

/**
 * Parse hex color to RGB
 * Supports #RGB, #RRGGBB formats
 */
export function hexToRgb(hex: string): RGB | null {
  const cleanHex = hex.replace(/^#/, '');

  if (!/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cleanHex)) {
    return null;
  }

  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  }

  const num = parseInt(fullHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

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
 * Convert HSL to RGB
 */
export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

/**
 * Convert RGB to Hex
 */
export function rgbToHex(rgb: RGB): string {
  return '#' + [rgb.r, rgb.g, rgb.b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Convert Hex to HSL string for CSS variables
 * Returns "H S% L%" format (without commas, for CSS custom properties)
 */
export function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '0 0% 0%';
  const hsl = rgbToHsl(rgb);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

/**
 * Convert Hex to HSL object
 */
export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
}

// ============================================
// WCAG Contrast Validation
// ============================================

/**
 * Calculate relative luminance (WCAG 2.1)
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function getRelativeLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (rs ?? 0) + 0.7152 * (gs ?? 0) + 0.0722 * (bs ?? 0);
}

/**
 * Calculate contrast ratio between two colors
 * Returns value between 1 and 21
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 * @param foreground - Text color
 * @param background - Background color
 * @param level - 'AA' (4.5:1) or 'AAA' (7:1)
 * @param isLargeText - Large text has lower requirements
 */
export function checkWcagContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  // AA level
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Get optimal foreground color (black or white) for a background
 */
export function getOptimalForeground(background: string): string {
  const rgb = hexToRgb(background);
  if (!rgb) return '#000000';

  const lum = getRelativeLuminance(rgb);
  return lum > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Get WCAG compliance level for a color pair
 */
export function getWcagLevel(foreground: string, background: string): 'AAA' | 'AA' | 'Fail' {
  const ratio = getContrastRatio(foreground, background);
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}

// ============================================
// Color Manipulation
// ============================================

/**
 * Lighten a color by percentage
 */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const newL = Math.min(100, hsl.l + amount);
  return rgbToHex(hslToRgb({ ...hsl, l: newL }));
}

/**
 * Darken a color by percentage
 */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const newL = Math.max(0, hsl.l - amount);
  return rgbToHex(hslToRgb({ ...hsl, l: newL }));
}

/**
 * Saturate a color by percentage
 */
export function saturate(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const newS = Math.min(100, hsl.s + amount);
  return rgbToHex(hslToRgb({ ...hsl, s: newS }));
}

/**
 * Desaturate a color by percentage
 */
export function desaturate(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const newS = Math.max(0, hsl.s - amount);
  return rgbToHex(hslToRgb({ ...hsl, s: newS }));
}

/**
 * Get complementary color (180 degrees on color wheel)
 */
export function getComplementary(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const complementary = { ...hsl, h: (hsl.h + 180) % 360 };
  return rgbToHex(hslToRgb(complementary));
}

/**
 * Get analogous colors (30 degrees on each side)
 */
export function getAnalogous(hex: string): [string, string] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex];

  const hsl = rgbToHsl(rgb);
  const left = { ...hsl, h: (hsl.h - 30 + 360) % 360 };
  const right = { ...hsl, h: (hsl.h + 30) % 360 };
  return [rgbToHex(hslToRgb(left)), rgbToHex(hslToRgb(right))];
}

/**
 * Get triadic colors (120 degrees apart)
 */
export function getTriadic(hex: string): [string, string] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [hex, hex];

  const hsl = rgbToHsl(rgb);
  const second = { ...hsl, h: (hsl.h + 120) % 360 };
  const third = { ...hsl, h: (hsl.h + 240) % 360 };
  return [rgbToHex(hslToRgb(second)), rgbToHex(hslToRgb(third))];
}

/**
 * Mix two colors together
 */
export function mixColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: Math.round(rgb1.r * (1 - w) + rgb2.r * w),
    g: Math.round(rgb1.g * (1 - w) + rgb2.g * w),
    b: Math.round(rgb1.b * (1 - w) + rgb2.b * w),
  });
}

// ============================================
// Palette Generation
// ============================================

/**
 * Generate a color palette (shades 50-950) from a base color
 */
export function generatePalette(baseHex: string): Record<string, string> {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return {};

  const hsl = rgbToHsl(rgb);
  const palette: Record<string, string> = {};

  const shades = [
    { name: '50', l: 97 },
    { name: '100', l: 94 },
    { name: '200', l: 86 },
    { name: '300', l: 76 },
    { name: '400', l: 64 },
    { name: '500', l: 50 },
    { name: '600', l: 40 },
    { name: '700', l: 32 },
    { name: '800', l: 24 },
    { name: '900', l: 18 },
    { name: '950', l: 10 },
  ];

  shades.forEach(shade => {
    const newHsl = { ...hsl, l: shade.l };
    palette[shade.name] = rgbToHex(hslToRgb(newHsl));
  });

  return palette;
}

/**
 * Generate semantic color variants (hover, active, disabled)
 */
export function generateSemanticVariants(baseHex: string): {
  base: string;
  hover: string;
  active: string;
  disabled: string;
  light: string;
  dark: string;
} {
  return {
    base: baseHex,
    hover: darken(baseHex, 8),
    active: darken(baseHex, 12),
    disabled: desaturate(lighten(baseHex, 20), 30),
    light: lighten(baseHex, 35),
    dark: darken(baseHex, 20),
  };
}

// ============================================
// Validation
// ============================================

/**
 * Validate hex color format
 */
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

/**
 * Normalize hex to uppercase 6-digit format
 */
export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) return hex;

  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  return '#' + clean.toUpperCase();
}

/**
 * Comprehensive color validation with WCAG info
 */
export function validateColor(hex: string): ColorValidation {
  const normalized = normalizeHex(hex);
  const rgb = hexToRgb(normalized);

  if (!rgb) {
    return {
      isValid: false,
      hex: normalized,
      hsl: { h: 0, s: 0, l: 0 },
      rgb: { r: 0, g: 0, b: 0 },
      contrast: { white: 1, black: 1, wcagAA: false, wcagAAA: false },
    };
  }

  const hsl = rgbToHsl(rgb);
  const contrastWhite = getContrastRatio(normalized, '#FFFFFF');
  const contrastBlack = getContrastRatio(normalized, '#000000');

  return {
    isValid: true,
    hex: normalized,
    hsl,
    rgb,
    contrast: {
      white: contrastWhite,
      black: contrastBlack,
      wcagAA: contrastWhite >= 4.5 || contrastBlack >= 4.5,
      wcagAAA: contrastWhite >= 7 || contrastBlack >= 7,
    },
    suggestions: {
      lighterVariant: lighten(normalized, 15),
      darkerVariant: darken(normalized, 15),
      complementary: getComplementary(normalized),
    },
  };
}

// ============================================
// CSS Variable Helpers
// ============================================

/**
 * Set a CSS variable on the document root
 */
export function setCssVariable(name: string, value: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty(name, value);
  }
}

/**
 * Remove a CSS variable from the document root
 */
export function removeCssVariable(name: string): void {
  if (typeof document !== 'undefined') {
    document.documentElement.style.removeProperty(name);
  }
}

/**
 * Get a CSS variable value
 */
export function getCssVariable(name: string): string {
  if (typeof document !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  return '';
}

// ============================================
// Image Color Extraction
// ============================================

export interface ExtractedColor {
  hex: string;
  rgb: RGB;
  count: number;
  percentage: number;
}

/**
 * Extract dominant colors from an image
 * Uses Canvas API and k-means clustering approach
 * @param imageSource - Image URL or File/Blob
 * @param maxColors - Maximum number of colors to extract (default: 5)
 * @param quality - Sampling quality 1-10, lower = faster (default: 5)
 */
export async function extractColorsFromImage(
  imageSource: string | File | Blob,
  maxColors: number = 5,
  quality: number = 5
): Promise<ExtractedColor[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Scale down for performance
        const scaleFactor = Math.min(1, 150 / Math.max(img.width, img.height));
        canvas.width = Math.floor(img.width * scaleFactor);
        canvas.height = Math.floor(img.height * scaleFactor);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Sample pixels based on quality
        const sampleStep = Math.max(1, 11 - quality);
        const colorMap = new Map<string, { rgb: RGB; count: number }>();

        for (let i = 0; i < pixels.length; i += 4 * sampleStep) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];
          const a = pixels[i + 3];

          // Skip transparent pixels
          if (a === undefined || a < 128) continue;
          if (r === undefined || g === undefined || b === undefined) continue;

          // Skip very light colors (likely background)
          if (r > 250 && g > 250 && b > 250) continue;

          // Quantize to reduce similar colors
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;

          const key = `${qr},${qg},${qb}`;
          const existing = colorMap.get(key);

          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { rgb: { r: qr, g: qg, b: qb }, count: 1 });
          }
        }

        // Sort by count and get top colors
        const sortedColors = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, maxColors * 3);

        // Merge similar colors
        const mergedColors: { rgb: RGB; count: number }[] = [];
        const colorDistance = (c1: RGB, c2: RGB) =>
          Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));

        for (const color of sortedColors) {
          const similar = mergedColors.find(c => colorDistance(c.rgb, color.rgb) < 50);
          if (similar) {
            similar.count += color.count;
          } else {
            mergedColors.push({ ...color });
          }
        }

        // Calculate total and create final result
        const total = mergedColors.reduce((sum, c) => sum + c.count, 0);

        const result: ExtractedColor[] = mergedColors
          .sort((a, b) => b.count - a.count)
          .slice(0, maxColors)
          .map(color => ({
            hex: rgbToHex(color.rgb),
            rgb: color.rgb,
            count: color.count,
            percentage: Math.round((color.count / total) * 100),
          }));

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Get suggested brand colors from extracted palette
 * Returns primary (most dominant saturated) and secondary (complementary accent)
 */
export function suggestBrandColors(extractedColors: ExtractedColor[]): {
  primary: string;
  secondary: string;
} {
  if (extractedColors.length === 0) {
    return { primary: '#0D9488', secondary: '#F97316' };
  }

  // Find most saturated color with decent luminance for primary
  const coloredOptions = extractedColors
    .map(c => ({
      ...c,
      hsl: rgbToHsl(c.rgb),
    }))
    .filter(c => c.hsl.s > 15 && c.hsl.l > 15 && c.hsl.l < 85);

  const primary = coloredOptions.length > 0
    ? coloredOptions.sort((a, b) => (b.hsl.s * b.percentage) - (a.hsl.s * a.percentage))[0]?.hex || extractedColors[0]?.hex || '#0D9488'
    : extractedColors[0]?.hex || '#0D9488';

  // Generate complementary or triadic color for secondary
  const secondary = getComplementary(primary);

  return { primary, secondary };
}

/**
 * Semantic 4-color palette for CRM branding
 */
export interface SemanticBrandPalette {
  /** Sidebar/navigation background (dark, professional) */
  sidebarColor: string;
  /** Main brand color for buttons, CTAs, active states */
  primaryColor: string;
  /** Accent color for highlights, links, hover effects */
  accentColor: string;
  /** Surface color for cards, dropdowns, secondary backgrounds */
  surfaceColor: string;
}

/**
 * Generate a complete 4-color semantic brand palette from extracted colors
 *
 * Algorithm:
 * 1. Find the most saturated dark color for sidebar (L < 30)
 * 2. Find the most vibrant mid-tone for primary (L 30-70)
 * 3. Generate lighter accent from primary
 * 4. Generate darker surface from sidebar
 */
export function suggest4ColorPalette(extractedColors: ExtractedColor[]): SemanticBrandPalette {
  // Default Ventazo palette
  const defaults: SemanticBrandPalette = {
    sidebarColor: '#003C3B',
    primaryColor: '#0EB58C',
    accentColor: '#5EEAD4',
    surfaceColor: '#052828',
  };

  if (extractedColors.length === 0) {
    return defaults;
  }

  // Analyze all colors
  const analyzed = extractedColors.map(c => ({
    ...c,
    hsl: rgbToHsl(c.rgb),
  }));

  // 1. Find dark color for sidebar (prefer saturated darks)
  const darkColors = analyzed.filter(c => c.hsl.l <= 35 && c.hsl.s > 10);
  const sidebar = darkColors.length > 0
    ? darkColors.sort((a, b) => (b.hsl.s * 0.5 + (35 - b.hsl.l)) - (a.hsl.s * 0.5 + (35 - a.hsl.l)))[0]
    : null;

  // 2. Find vibrant color for primary (mid-tone, high saturation)
  const midTones = analyzed.filter(c => c.hsl.l >= 30 && c.hsl.l <= 70 && c.hsl.s > 25);
  const primary = midTones.length > 0
    ? midTones.sort((a, b) => (b.hsl.s * b.percentage) - (a.hsl.s * a.percentage))[0]
    : null;

  // Calculate the palette
  const sidebarHex = sidebar?.hex || (primary ? darken(primary.hex, 30) : defaults.sidebarColor);
  const primaryHex = primary?.hex || (sidebar ? lighten(sidebar.hex, 25) : defaults.primaryColor);

  // 3. Accent: lighter, more vibrant version of primary
  const accentHex = (() => {
    const rgb = hexToRgb(primaryHex);
    if (!rgb) return defaults.accentColor;
    const hsl = rgbToHsl(rgb);
    // Make it lighter and more saturated
    const newHsl = {
      h: hsl.h,
      s: Math.min(100, hsl.s + 15),
      l: Math.min(85, hsl.l + 25),
    };
    return rgbToHex(hslToRgb(newHsl));
  })();

  // 4. Surface: darker version of sidebar
  const surfaceHex = (() => {
    const rgb = hexToRgb(sidebarHex);
    if (!rgb) return defaults.surfaceColor;
    const hsl = rgbToHsl(rgb);
    // Make it darker
    const newHsl = {
      h: hsl.h,
      s: hsl.s,
      l: Math.max(5, hsl.l - 8),
    };
    return rgbToHex(hslToRgb(newHsl));
  })();

  return {
    sidebarColor: normalizeHex(sidebarHex),
    primaryColor: normalizeHex(primaryHex),
    accentColor: normalizeHex(accentHex),
    surfaceColor: normalizeHex(surfaceHex),
  };
}

/**
 * Generate derived colors from a single user-selected primary
 * Useful when user only picks one color and we need to derive the rest
 */
export function deriveFullPaletteFromPrimary(primaryHex: string): SemanticBrandPalette {
  const rgb = hexToRgb(primaryHex);
  if (!rgb) {
    return {
      sidebarColor: '#003C3B',
      primaryColor: primaryHex,
      accentColor: '#5EEAD4',
      surfaceColor: '#052828',
    };
  }

  const hsl = rgbToHsl(rgb);

  // Sidebar: same hue, dark
  const sidebarHsl = {
    h: hsl.h,
    s: Math.min(100, hsl.s + 10),
    l: Math.max(12, Math.min(25, hsl.l - 30)),
  };

  // Accent: same hue, lighter and more vibrant
  const accentHsl = {
    h: hsl.h,
    s: Math.min(100, hsl.s + 15),
    l: Math.min(85, hsl.l + 25),
  };

  // Surface: same hue, very dark
  const surfaceHsl = {
    h: hsl.h,
    s: Math.min(100, hsl.s + 5),
    l: Math.max(5, sidebarHsl.l - 8),
  };

  return {
    sidebarColor: normalizeHex(rgbToHex(hslToRgb(sidebarHsl))),
    primaryColor: normalizeHex(primaryHex),
    accentColor: normalizeHex(rgbToHex(hslToRgb(accentHsl))),
    surfaceColor: normalizeHex(rgbToHex(hslToRgb(surfaceHsl))),
  };
}
