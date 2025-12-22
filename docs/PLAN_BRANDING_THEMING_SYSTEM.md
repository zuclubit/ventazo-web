# Plan Tecnico: Sistema de Branding y Tematizacion Dinamica

**Version:** 1.0.0
**Fecha:** 2025-12-17
**Autor:** Claude AI Architect
**Referencia:** Panel de onboarding en https://crm.zuclubit.com/onboarding/setup

---

## 1. Resumen Ejecutivo

Este documento describe la arquitectura e implementacion de un sistema de tematizacion dinamica de nivel empresarial para el CRM Zuclubit. El sistema permitira a cada tenant personalizar completamente su identidad visual (colores, logo) con aplicacion en tiempo real, validacion WCAG y optimizacion de rendimiento.

### 1.1 Estado Actual (Gap Analysis)

| Componente | Estado Actual | Brecha Identificada |
|------------|--------------|---------------------|
| CSS Variables | Implementado (HSL) | No dinamico por tenant |
| Tailwind Config | Ventazo palette hardcoded | Sin soporte multi-tenant |
| TenantContext | Solo `primaryColor` basico | No aplica CSS variables |
| Onboarding Form | Input hex basico | Sin preview, validacion limitada |
| Backend | Endpoint branding existe | No retorna tema al login |
| ThemeProvider | Solo dark/light mode | No soporta colores custom |

### 1.2 Objetivos

1. **Personalizacion Completa**: Colores primario, secundario, acento, fondo, tipografia
2. **Aplicacion Dinamica**: Cambios visibles en tiempo real sin reload
3. **Validacion WCAG**: Contraste minimo 4.5:1 para AA, 7:1 para AAA
4. **Logo Optimizado**: Escalado responsivo, validacion de calidad
5. **Performance**: Sin CLS (Cumulative Layout Shift), carga instantanea

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │   Providers     │    │  Theme Engine   │    │   Components    │     │
│  │                 │    │                 │    │                 │     │
│  │ AuthProvider    │───>│ TenantTheme     │───>│ BrandingForm    │     │
│  │ TenantProvider  │    │ Provider        │    │ ColorPicker     │     │
│  │ ThemeProvider   │    │                 │    │ LogoUpload      │     │
│  │ QueryProvider   │    │ - CSS Variables │    │ ThemePreview    │     │
│  └─────────────────┘    │ - Color Utils   │    └─────────────────┘     │
│                         │ - WCAG Checker  │                             │
│                         └─────────────────┘                             │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Design Token System                          │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Primary  │  │Secondary │  │  Accent  │  │ Semantic │        │   │
│  │  │ Palette  │  │ Palette  │  │ Palette  │  │ Colors   │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
└─────────────────────────────────│───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Fastify)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │  Auth Module    │    │ Tenant Module   │    │ Storage Module  │     │
│  │                 │    │                 │    │                 │     │
│  │ - Login returns │    │ - Branding CRUD │    │ - Logo Upload   │     │
│  │   tenant theme  │    │ - Theme Schema  │    │ - Image Optim   │     │
│  │ - Tenant switch │    │ - Validation    │    │ - CDN URL       │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                 │                                       │
│                                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PostgreSQL                                │   │
│  │                                                                  │   │
│  │  tenants table:                                                  │   │
│  │  - branding: JSONB {                                            │   │
│  │      logoUrl, primaryColor, secondaryColor, accentColor,        │   │
│  │      backgroundColor, textColor, fonts, borderRadius            │   │
│  │    }                                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Datos

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuario    │     │   Frontend   │     │   Backend    │
│   Edita      │────>│   Preview    │────>│   Validar    │
│   Colores    │     │   Real-time  │     │   y Guardar  │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ CSS Vars    │     │  Database    │
                     │ :root scope │     │  tenants.    │
                     │ Applied     │     │  branding    │
                     └──────────────┘     └──────────────┘
```

---

## 3. Modelo de Datos

### 3.1 Schema de Branding (TypeScript)

```typescript
// apps/web/src/lib/theme/types.ts

/**
 * Tenant Branding Configuration
 * Defines all customizable visual elements for a tenant
 */
export interface TenantBranding {
  // Logo
  logo: {
    url: string | null;
    darkUrl?: string | null;  // For dark mode
    width?: number;
    height?: number;
    aspectRatio?: string;
  };

  // Core Colors (Hex format #RRGGBB)
  colors: {
    primary: string;           // Main brand color
    primaryForeground: string; // Text on primary
    secondary: string;         // Secondary brand color
    secondaryForeground: string;
    accent: string;            // Highlight/CTA color
    accentForeground: string;

    // Backgrounds
    background: string;        // Main background
    foreground: string;        // Main text color
    card: string;              // Card backgrounds
    cardForeground: string;

    // UI Elements
    border: string;
    input: string;
    ring: string;              // Focus rings

    // Semantic
    destructive: string;
    destructiveForeground: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;

    // Muted
    muted: string;
    mutedForeground: string;

    // Sidebar (optional)
    sidebarBackground?: string;
    sidebarForeground?: string;
    sidebarPrimary?: string;
    sidebarAccent?: string;
  };

  // Typography
  typography: {
    fontFamily: string;        // e.g., 'Inter', 'Roboto'
    fontFamilyMono?: string;   // For code
    baseFontSize: number;      // In pixels (14-18)
  };

  // Shapes
  shapes: {
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    buttonStyle: 'rounded' | 'square' | 'pill';
  };

  // Metadata
  meta: {
    version: number;
    updatedAt: string;
    updatedBy: string;
  };
}

/**
 * Simplified branding for onboarding
 */
export interface SimpleBranding {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName?: string;
}

/**
 * Color validation result
 */
export interface ColorValidation {
  isValid: boolean;
  hex: string;
  hsl: { h: number; s: number; l: number };
  rgb: { r: number; g: number; b: number };
  contrast: {
    white: number;
    black: number;
    wcagAA: boolean;
    wcagAAA: boolean;
  };
  suggestions?: {
    lighterVariant: string;
    darkerVariant: string;
    complementary: string;
  };
}
```

### 3.2 Schema de Base de Datos

```sql
-- Migration: Add branding JSONB column to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{
  "logo": { "url": null },
  "colors": {
    "primary": "#0D9488",
    "primaryForeground": "#FFFFFF",
    "secondary": "#F97316",
    "secondaryForeground": "#FFFFFF",
    "accent": "#F97316",
    "accentForeground": "#FFFFFF",
    "background": "#FAF7F5",
    "foreground": "#0A0A0A"
  },
  "typography": {
    "fontFamily": "Inter",
    "baseFontSize": 16
  },
  "shapes": {
    "borderRadius": "lg",
    "buttonStyle": "rounded"
  },
  "meta": {
    "version": 1
  }
}'::jsonb;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_branding
ON tenants USING GIN (branding);
```

---

## 4. Componentes del Sistema

### 4.1 Color Utilities (`apps/web/src/lib/theme/color-utils.ts`)

```typescript
/**
 * Professional Color Utilities for Theme System
 * Handles color conversion, validation, and WCAG compliance
 */

// ============================================
// Types
// ============================================

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface ColorInfo {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  luminance: number;
}

// ============================================
// Conversion Functions
// ============================================

/**
 * Parse hex color to RGB
 * Supports #RGB, #RRGGBB, and #RRGGBBAA formats
 */
export function hexToRgb(hex: string): RGB | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Validate hex format
  if (!/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(cleanHex)) {
    return null;
  }

  // Expand shorthand (#RGB -> #RRGGBB)
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(c => c + c).join('');
  }

  const num = parseInt(fullHex.slice(0, 6), 16);
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

  const hue2rgb = (p: number, q: number, t: number) => {
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
 * Returns "H S% L%" format
 */
export function hexToHslString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '0 0% 0%';
  const hsl = rgbToHsl(rgb);
  return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
}

// ============================================
// WCAG Contrast Validation
// ============================================

/**
 * Calculate relative luminance (WCAG 2.1)
 */
export function getRelativeLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs! + 0.7152 * gs! + 0.0722 * bs!;
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
  // AA
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

// ============================================
// Color Generation
// ============================================

/**
 * Generate a color palette from a base color
 */
export function generatePalette(baseHex: string): Record<string, string> {
  const rgb = hexToRgb(baseHex);
  if (!rgb) return {};

  const hsl = rgbToHsl(rgb);
  const palette: Record<string, string> = {};

  // Generate shades (50-950)
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
 * Get complementary color
 */
export function getComplementary(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const hsl = rgbToHsl(rgb);
  const complementary = { ...hsl, h: (hsl.h + 180) % 360 };
  return rgbToHex(hslToRgb(complementary));
}

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
 * Comprehensive color validation
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
```

### 4.2 TenantThemeProvider (`apps/web/src/lib/theme/tenant-theme-provider.tsx`)

```typescript
'use client';

import * as React from 'react';
import { useTenant } from '@/lib/tenant/tenant-context';
import { hexToHslString, getOptimalForeground, darken, lighten } from './color-utils';
import type { TenantBranding } from './types';

// ============================================
// Context
// ============================================

interface TenantThemeContextType {
  branding: TenantBranding | null;
  isLoading: boolean;
  applyTheme: (branding: Partial<TenantBranding>) => void;
  resetTheme: () => void;
  previewTheme: (colors: { primary: string; secondary: string }) => void;
}

const TenantThemeContext = React.createContext<TenantThemeContextType | undefined>(undefined);

// ============================================
// Default Theme (Ventazo)
// ============================================

const DEFAULT_BRANDING: TenantBranding = {
  logo: { url: null },
  colors: {
    primary: '#0D9488',
    primaryForeground: '#FFFFFF',
    secondary: '#F97316',
    secondaryForeground: '#FFFFFF',
    accent: '#F97316',
    accentForeground: '#FFFFFF',
    background: '#FAF7F5',
    foreground: '#0A0A0A',
    card: '#FFFFFF',
    cardForeground: '#0A0A0A',
    border: '#E5E0DB',
    input: '#E5E0DB',
    ring: '#0D9488',
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',
    success: '#10B981',
    successForeground: '#FFFFFF',
    warning: '#F59E0B',
    warningForeground: '#0A0A0A',
    info: '#0D9488',
    infoForeground: '#FFFFFF',
    muted: '#F5F0EB',
    mutedForeground: '#737373',
  },
  typography: {
    fontFamily: 'Inter',
    baseFontSize: 16,
  },
  shapes: {
    borderRadius: 'lg',
    buttonStyle: 'rounded',
  },
  meta: {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system',
  },
};

// ============================================
// CSS Variable Application
// ============================================

function applyCssVariables(branding: TenantBranding) {
  const root = document.documentElement;
  const { colors } = branding;

  // Primary
  root.style.setProperty('--primary', hexToHslString(colors.primary));
  root.style.setProperty('--primary-foreground', hexToHslString(colors.primaryForeground));

  // Secondary
  root.style.setProperty('--secondary', hexToHslString(colors.secondary));
  root.style.setProperty('--secondary-foreground', hexToHslString(colors.secondaryForeground));

  // Accent
  root.style.setProperty('--accent', hexToHslString(colors.accent));
  root.style.setProperty('--accent-foreground', hexToHslString(colors.accentForeground));

  // Background & Foreground
  root.style.setProperty('--background', hexToHslString(colors.background));
  root.style.setProperty('--foreground', hexToHslString(colors.foreground));

  // Card
  root.style.setProperty('--card', hexToHslString(colors.card));
  root.style.setProperty('--card-foreground', hexToHslString(colors.cardForeground));

  // UI Elements
  root.style.setProperty('--border', hexToHslString(colors.border));
  root.style.setProperty('--input', hexToHslString(colors.input));
  root.style.setProperty('--ring', hexToHslString(colors.ring));

  // Semantic colors
  root.style.setProperty('--destructive', hexToHslString(colors.destructive));
  root.style.setProperty('--destructive-foreground', hexToHslString(colors.destructiveForeground));
  root.style.setProperty('--success', hexToHslString(colors.success));
  root.style.setProperty('--success-foreground', hexToHslString(colors.successForeground));
  root.style.setProperty('--warning', hexToHslString(colors.warning));
  root.style.setProperty('--warning-foreground', hexToHslString(colors.warningForeground));
  root.style.setProperty('--info', hexToHslString(colors.info));
  root.style.setProperty('--info-foreground', hexToHslString(colors.infoForeground));

  // Muted
  root.style.setProperty('--muted', hexToHslString(colors.muted));
  root.style.setProperty('--muted-foreground', hexToHslString(colors.mutedForeground));

  // Sidebar (derived from primary if not specified)
  const sidebarBg = colors.sidebarBackground || darken(colors.primary, 35);
  const sidebarFg = colors.sidebarForeground || getOptimalForeground(sidebarBg);
  root.style.setProperty('--sidebar-background', hexToHslString(sidebarBg));
  root.style.setProperty('--sidebar-foreground', hexToHslString(sidebarFg));
  root.style.setProperty('--sidebar-primary', hexToHslString(lighten(colors.primary, 10)));
  root.style.setProperty('--sidebar-accent', hexToHslString(darken(sidebarBg, 5)));

  // Border radius
  const radiusMap: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  };
  root.style.setProperty('--radius', radiusMap[branding.shapes.borderRadius] || '0.75rem');
}

function removeCssVariables() {
  const root = document.documentElement;
  const variables = [
    '--primary', '--primary-foreground',
    '--secondary', '--secondary-foreground',
    '--accent', '--accent-foreground',
    '--background', '--foreground',
    '--card', '--card-foreground',
    '--border', '--input', '--ring',
    '--destructive', '--destructive-foreground',
    '--success', '--success-foreground',
    '--warning', '--warning-foreground',
    '--info', '--info-foreground',
    '--muted', '--muted-foreground',
    '--sidebar-background', '--sidebar-foreground',
    '--sidebar-primary', '--sidebar-accent',
    '--radius',
  ];
  variables.forEach(v => root.style.removeProperty(v));
}

// ============================================
// Provider Component
// ============================================

interface TenantThemeProviderProps {
  children: React.ReactNode;
  initialBranding?: TenantBranding;
}

export function TenantThemeProvider({
  children,
  initialBranding
}: TenantThemeProviderProps) {
  const { tenant } = useTenant();
  const [branding, setBranding] = React.useState<TenantBranding | null>(
    initialBranding || null
  );
  const [isLoading, setIsLoading] = React.useState(!initialBranding);

  // Load branding when tenant changes
  React.useEffect(() => {
    if (tenant?.settings?.branding) {
      const tenantBranding = {
        ...DEFAULT_BRANDING,
        ...tenant.settings.branding,
        colors: {
          ...DEFAULT_BRANDING.colors,
          ...(tenant.settings.branding?.colors || {}),
        },
      } as TenantBranding;
      setBranding(tenantBranding);
      applyCssVariables(tenantBranding);
    } else {
      // Use default
      setBranding(DEFAULT_BRANDING);
      applyCssVariables(DEFAULT_BRANDING);
    }
    setIsLoading(false);
  }, [tenant]);

  // Apply theme function
  const applyTheme = React.useCallback((partial: Partial<TenantBranding>) => {
    const newBranding = {
      ...DEFAULT_BRANDING,
      ...branding,
      ...partial,
      colors: {
        ...DEFAULT_BRANDING.colors,
        ...(branding?.colors || {}),
        ...(partial.colors || {}),
      },
    } as TenantBranding;
    setBranding(newBranding);
    applyCssVariables(newBranding);
  }, [branding]);

  // Reset to default
  const resetTheme = React.useCallback(() => {
    setBranding(DEFAULT_BRANDING);
    applyCssVariables(DEFAULT_BRANDING);
  }, []);

  // Preview theme (for onboarding)
  const previewTheme = React.useCallback((colors: { primary: string; secondary: string }) => {
    const preview: TenantBranding = {
      ...DEFAULT_BRANDING,
      colors: {
        ...DEFAULT_BRANDING.colors,
        primary: colors.primary,
        primaryForeground: getOptimalForeground(colors.primary),
        secondary: colors.secondary,
        secondaryForeground: getOptimalForeground(colors.secondary),
        accent: colors.secondary,
        accentForeground: getOptimalForeground(colors.secondary),
        ring: colors.primary,
        info: colors.primary,
        infoForeground: getOptimalForeground(colors.primary),
      },
    };
    applyCssVariables(preview);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      removeCssVariables();
    };
  }, []);

  const value = React.useMemo(
    () => ({
      branding,
      isLoading,
      applyTheme,
      resetTheme,
      previewTheme,
    }),
    [branding, isLoading, applyTheme, resetTheme, previewTheme]
  );

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useTenantTheme() {
  const context = React.useContext(TenantThemeContext);
  if (context === undefined) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }
  return context;
}
```

### 4.3 Advanced Color Picker Component

```typescript
// apps/web/src/components/onboarding/advanced-color-picker.tsx
'use client';

import * as React from 'react';
import { Check, AlertTriangle, RefreshCw, Palette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  validateColor,
  getContrastRatio,
  generatePalette,
  isValidHex,
  normalizeHex,
} from '@/lib/theme/color-utils';
import { cn } from '@/lib/utils';

interface AdvancedColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  showContrast?: boolean;
  contrastAgainst?: string;
  showPalettePreview?: boolean;
  disabled?: boolean;
  presets?: string[];
}

// Professional color presets
const DEFAULT_PRESETS = [
  '#0D9488', // Teal (Ventazo)
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#14B8A6', // Cyan
  '#6366F1', // Indigo
];

export function AdvancedColorPicker({
  label,
  value,
  onChange,
  description,
  showContrast = true,
  contrastAgainst = '#FFFFFF',
  showPalettePreview = false,
  disabled = false,
  presets = DEFAULT_PRESETS,
}: AdvancedColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [validation, setValidation] = React.useState(() => validateColor(value));
  const [showPresets, setShowPresets] = React.useState(false);

  // Update validation when value changes
  React.useEffect(() => {
    setInputValue(value);
    setValidation(validateColor(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Auto-add # if missing
    const normalized = newValue.startsWith('#') ? newValue : `#${newValue}`;

    if (isValidHex(normalized)) {
      const finalValue = normalizeHex(normalized);
      setValidation(validateColor(finalValue));
      onChange(finalValue);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = normalizeHex(e.target.value);
    setInputValue(newValue);
    setValidation(validateColor(newValue));
    onChange(newValue);
  };

  const handlePresetClick = (preset: string) => {
    const normalized = normalizeHex(preset);
    setInputValue(normalized);
    setValidation(validateColor(normalized));
    onChange(normalized);
    setShowPresets(false);
  };

  const contrastRatio = showContrast
    ? getContrastRatio(value, contrastAgainst)
    : 0;

  const contrastLevel = contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : 'Fail';
  const palette = showPalettePreview ? generatePalette(value) : null;

  return (
    <div className="space-y-3">
      {/* Label & Description */}
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {/* Color Input Row */}
      <div className="flex items-center gap-3">
        {/* Native Color Picker */}
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={handleColorPickerChange}
            disabled={disabled}
            className={cn(
              'h-12 w-12 cursor-pointer rounded-lg border-2 transition-all',
              'hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          {validation.isValid && (
            <Check className="absolute -bottom-1 -right-1 h-4 w-4 text-success bg-background rounded-full" />
          )}
        </div>

        {/* Hex Input */}
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="#000000"
            className={cn(
              'font-mono uppercase',
              !validation.isValid && inputValue.length > 0 && 'border-destructive'
            )}
            maxLength={7}
          />
        </div>

        {/* Presets Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setShowPresets(!showPresets)}
              disabled={disabled}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Colores sugeridos</TooltipContent>
        </Tooltip>
      </div>

      {/* Presets Grid */}
      {showPresets && (
        <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg bg-muted/30 animate-in fade-in-50 slide-in-from-top-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'h-8 w-full rounded-md border-2 transition-all',
                'hover:scale-110 hover:shadow-md',
                value === preset && 'ring-2 ring-primary ring-offset-2'
              )}
              style={{ backgroundColor: preset }}
              title={preset}
            />
          ))}
        </div>
      )}

      {/* Contrast Indicator */}
      {showContrast && validation.isValid && (
        <div className="flex items-center gap-2 text-sm">
          <div
            className="h-6 w-6 rounded border flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: value,
              color: contrastAgainst,
            }}
          >
            Aa
          </div>
          <span className="text-muted-foreground">
            Contraste: {contrastRatio.toFixed(1)}:1
          </span>
          <span className={cn(
            'px-1.5 py-0.5 rounded text-xs font-medium',
            contrastLevel === 'AAA' && 'bg-success/20 text-success',
            contrastLevel === 'AA' && 'bg-warning/20 text-warning',
            contrastLevel === 'Fail' && 'bg-destructive/20 text-destructive',
          )}>
            WCAG {contrastLevel}
          </span>
          {contrastLevel === 'Fail' && (
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent>
                El contraste es muy bajo para texto. Considera usar un color mas oscuro.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Palette Preview */}
      {showPalettePreview && palette && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Paleta generada:</p>
          <div className="flex rounded-lg overflow-hidden">
            {Object.entries(palette).map(([shade, color]) => (
              <Tooltip key={shade}>
                <TooltipTrigger asChild>
                  <div
                    className="h-6 flex-1 cursor-pointer hover:scale-y-125 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono">{shade}: {color}</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* HSL Values (for developers) */}
      {validation.isValid && (
        <p className="text-xs text-muted-foreground font-mono">
          HSL: {validation.hsl.h} {validation.hsl.s}% {validation.hsl.l}%
        </p>
      )}
    </div>
  );
}
```

---

## 5. Flujo de Implementacion

### 5.1 Pasos Numerados

```
FASE 1: Infraestructura Base (Prioridad Alta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 1.1 Crear color-utils.ts
      - Funciones de conversion (hex ↔ rgb ↔ hsl)
      - Validacion WCAG
      - Generacion de paletas

□ 1.2 Crear types.ts para branding
      - TenantBranding interface
      - ColorValidation interface

□ 1.3 Crear TenantThemeProvider
      - Context y Provider
      - applyCssVariables function
      - previewTheme function

FASE 2: Componentes UI (Prioridad Alta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 2.1 Crear AdvancedColorPicker
      - Input hex con validacion
      - Presets de colores
      - Indicador de contraste WCAG

□ 2.2 Mejorar LogoUpload
      - Validacion de calidad (min 256px)
      - Preview responsivo
      - Soporte dark mode logo

□ 2.3 Crear ThemePreview component
      - Vista previa de sidebar
      - Vista previa de botones
      - Vista previa de cards

FASE 3: Integracion (Prioridad Media)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 3.1 Actualizar setup/page.tsx
      - Usar AdvancedColorPicker
      - Integrar ThemePreview
      - Live preview con previewTheme()

□ 3.2 Actualizar providers.tsx
      - Agregar TenantThemeProvider
      - Orden correcto de providers

□ 3.3 Actualizar tenant-context.tsx
      - Agregar branding a TenantSettings
      - Cargar branding desde API

FASE 4: Backend (Prioridad Media)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 4.1 Crear/actualizar migration
      - Column branding JSONB
      - Default values

□ 4.2 Actualizar endpoint /tenant/branding
      - Validacion de colores hex
      - Sanitizacion de input

□ 4.3 Actualizar endpoint /auth/login
      - Incluir branding en respuesta
      - Cache de branding

FASE 5: Testing y Validacion (Prioridad Alta)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ 5.1 Tests unitarios
      - color-utils.test.ts
      - Validacion WCAG

□ 5.2 Tests de integracion
      - ThemeProvider rendering
      - CSS variables application

□ 5.3 Tests visuales
      - Storybook stories
      - Chromatic visual regression
```

### 5.2 Checklist de Comprobaciones Finales

```
VERIFICACIONES DE CALIDAD
━━━━━━━━━━━━━━━━━━━━━━━━━

□ Colores
  ├─ □ Formato hex valido (#RRGGBB)
  ├─ □ Contraste WCAG AA minimo (4.5:1)
  ├─ □ Foreground automatico calculado
  ├─ □ Paleta de shades generada
  └─ □ Sin colores hardcodeados

□ Logo
  ├─ □ Resolucion minima 256x256
  ├─ □ Aspect ratio preservado
  ├─ □ Compresion WebP aplicada
  ├─ □ Preview responsivo
  └─ □ Fallback a iniciales

□ Performance
  ├─ □ No CLS (Cumulative Layout Shift)
  ├─ □ CSS variables aplicadas < 50ms
  ├─ □ Tema cargado antes del paint
  └─ □ No flash de tema default

□ Accesibilidad
  ├─ □ Focus rings visibles
  ├─ □ Contraste en todos los estados
  ├─ □ Labels descriptivos
  └─ □ Screen reader compatible

□ Responsividad
  ├─ □ Mobile first
  ├─ □ Touch targets 44x44
  ├─ □ Sidebar collapse
  └─ □ Color picker usable en movil
```

---

## 6. Dependencias y Librerias

### 6.1 Dependencias Existentes (Sin cambios)

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "tailwindcss": "3.x",
    "next-themes": "^0.3.0",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x"
  }
}
```

### 6.2 Nuevas Dependencias Recomendadas

```json
{
  "dependencies": {
    "chroma-js": "^2.4.2"  // OPCIONAL: Manipulacion avanzada de color
  },
  "devDependencies": {
    "@storybook/addon-a11y": "^7.x",  // Testing de accesibilidad
    "axe-core": "^4.x"  // WCAG validation
  }
}
```

> **Nota:** La implementacion propuesta NO requiere nuevas dependencias. Las funciones de color estan implementadas en vanilla TypeScript para minimizar bundle size.

---

## 7. Consideraciones de Seguridad

### 7.1 Validacion de Input

```typescript
// Backend validation schema
const BrandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  // ... other fields
});
```

### 7.2 Sanitizacion

- URLs de logo deben ser de dominios permitidos (Supabase Storage, CDN)
- Colores hex son sanitizados a formato exacto
- No se permite CSS injection via valores

### 7.3 Rate Limiting

- Max 10 actualizaciones de branding por hora por tenant
- Max 5 uploads de logo por hora

---

## 8. Metricas de Exito

| Metrica | Objetivo | Medicion |
|---------|----------|----------|
| Time to Theme | < 100ms | Performance.measure() |
| WCAG Compliance | 100% AA | axe-core audit |
| User Satisfaction | > 4.5/5 | NPS survey |
| Error Rate | < 0.1% | Sentry tracking |
| Bundle Impact | < 10KB | webpack-bundle-analyzer |

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Flash de tema incorrecto | Media | Alto | SSR del tema inicial |
| Colores inaccessibles | Alta | Medio | Validacion WCAG obligatoria |
| Logo de baja calidad | Media | Bajo | Validacion de resolucion |
| Performance degradada | Baja | Alto | CSS variables vs inline |
| Conflictos dark mode | Media | Medio | Testing exhaustivo |

---

## 10. Proximos Pasos

1. **Aprobacion del plan** - Revision con stakeholders
2. **Spike tecnico** - POC de TenantThemeProvider (2h)
3. **Implementacion Fase 1** - Color utilities y types
4. **Implementacion Fase 2** - Componentes UI
5. **Integracion y testing** - E2E con Playwright
6. **Deploy a staging** - Testing con usuarios reales
7. **Rollout gradual** - Feature flag por tenant

---

**Documento generado por Claude AI Architect**
**Version:** 1.0.0 | **Fecha:** 2025-12-17
