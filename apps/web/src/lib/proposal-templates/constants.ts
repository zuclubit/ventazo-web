// ============================================
// Proposal Template Constants
// ============================================

import type {
  ProposalSection,
  ProposalStyles,
  ProposalColors,
  ProposalFonts,
  ProposalSpacing,
  SectionTypeInfo,
  StylePreset,
  ProposalSectionType,
} from './types';

// ============================================
// Default Sections
// ============================================

export const DEFAULT_SECTIONS: ProposalSection[] = [
  {
    id: 'cover',
    type: 'cover',
    enabled: true,
    order: 0,
    config: {
      showLogo: true,
      showDate: true,
      showQuoteNumber: true,
      showClientAddress: true,
    },
  },
  {
    id: 'summary',
    type: 'summary',
    enabled: true,
    order: 1,
    config: {},
  },
  {
    id: 'details',
    type: 'details',
    enabled: true,
    order: 2,
    config: {
      columns: 4,
      showDescription: true,
      showQuantity: true,
      showUnitPrice: true,
      showTotal: true,
    },
  },
  {
    id: 'totals',
    type: 'totals',
    enabled: true,
    order: 3,
    config: {
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
    },
  },
  {
    id: 'terms',
    type: 'terms',
    enabled: true,
    order: 4,
    config: {
      termsTitle: 'Terminos y Condiciones',
    },
  },
  {
    id: 'signature',
    type: 'signature',
    enabled: true,
    order: 5,
    config: {
      showSignatureLine: true,
      showDateLine: true,
      signatureLabel: 'Firma Autorizada',
    },
  },
];

// ============================================
// Default Styles
// ============================================

export const DEFAULT_DARK_COLORS: ProposalColors = {
  primary: '#10b981',      // Emerald-500
  secondary: '#7c3aed',    // Violet-500
  accent: '#14b8a6',       // Teal-500
  background: '#0f172a',   // Slate-900
  text: '#e5e7eb',         // Gray-200
  muted: '#9ca3af',        // Gray-400
  border: '#334155',       // Slate-700
  tableHeader: '#1f2937',  // Gray-800
  tableRowAlt: '#111827',  // Gray-900
};

export const DEFAULT_LIGHT_COLORS: ProposalColors = {
  primary: '#059669',      // Emerald-600
  secondary: '#7c3aed',    // Violet-500
  accent: '#0d9488',       // Teal-600
  background: '#ffffff',   // White
  text: '#1f2937',         // Gray-800
  muted: '#6b7280',        // Gray-500
  border: '#e5e7eb',       // Gray-200
  tableHeader: '#f3f4f6',  // Gray-100
  tableRowAlt: '#f9fafb',  // Gray-50
};

export const DEFAULT_FONTS: ProposalFonts = {
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  sizes: {
    title: 36,
    heading: 20,
    body: 11,
    small: 9,
  },
};

export const DEFAULT_SPACING: ProposalSpacing = {
  margins: 20,
  padding: 15,
  lineHeight: 1.4,
  sectionGap: 20,
};

export const DEFAULT_DARK_STYLES: ProposalStyles = {
  theme: 'dark',
  colors: DEFAULT_DARK_COLORS,
  fonts: DEFAULT_FONTS,
  spacing: DEFAULT_SPACING,
};

export const DEFAULT_LIGHT_STYLES: ProposalStyles = {
  theme: 'light',
  colors: DEFAULT_LIGHT_COLORS,
  fonts: DEFAULT_FONTS,
  spacing: DEFAULT_SPACING,
};

// ============================================
// Section Type Metadata
// ============================================

export const SECTION_TYPES: SectionTypeInfo[] = [
  {
    type: 'cover',
    label: 'Portada',
    description: 'Encabezado con logo, titulo y numero de cotizacion',
    icon: 'LayoutTemplate',
    defaultConfig: {
      showLogo: true,
      showDate: true,
      showQuoteNumber: true,
      showClientAddress: true,
    },
    isBuiltIn: true,
  },
  {
    type: 'summary',
    label: 'Resumen',
    description: 'Descripcion general de la propuesta',
    icon: 'FileText',
    defaultConfig: {},
    isBuiltIn: true,
  },
  {
    type: 'details',
    label: 'Detalles',
    description: 'Tabla de productos y servicios',
    icon: 'Table',
    defaultConfig: {
      columns: 4,
      showDescription: true,
      showQuantity: true,
      showUnitPrice: true,
      showTotal: true,
    },
    isBuiltIn: true,
  },
  {
    type: 'totals',
    label: 'Totales',
    description: 'Subtotal, impuestos y total',
    icon: 'Calculator',
    defaultConfig: {
      showSubtotal: true,
      showTax: true,
      showDiscount: true,
    },
    isBuiltIn: true,
  },
  {
    type: 'terms',
    label: 'Terminos',
    description: 'Terminos y condiciones',
    icon: 'Scale',
    defaultConfig: {
      termsTitle: 'Terminos y Condiciones',
    },
    isBuiltIn: false,
  },
  {
    type: 'signature',
    label: 'Firma',
    description: 'Bloque de firma',
    icon: 'PenTool',
    defaultConfig: {
      showSignatureLine: true,
      showDateLine: true,
      signatureLabel: 'Firma Autorizada',
    },
    isBuiltIn: false,
  },
  {
    type: 'custom_text',
    label: 'Texto Personalizado',
    description: 'Bloque de texto con soporte Markdown',
    icon: 'Type',
    defaultConfig: {
      title: '',
      content: '',
    },
    isBuiltIn: false,
  },
];

/**
 * Get section type info by type
 */
export function getSectionTypeInfo(type: ProposalSectionType): SectionTypeInfo | undefined {
  return SECTION_TYPES.find((s) => s.type === type);
}

// ============================================
// Style Presets
// ============================================

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'professional-dark',
    name: 'Profesional Oscuro',
    description: 'Tema oscuro elegante con acentos esmeralda',
    styles: DEFAULT_DARK_STYLES,
  },
  {
    id: 'professional-light',
    name: 'Profesional Claro',
    description: 'Tema claro limpio para impresion',
    styles: DEFAULT_LIGHT_STYLES,
  },
  {
    id: 'minimal-dark',
    name: 'Minimalista Oscuro',
    description: 'Diseno minimalista con colores neutros',
    styles: {
      theme: 'dark',
      colors: {
        ...DEFAULT_DARK_COLORS,
        primary: '#6b7280',    // Gray-500
        secondary: '#9ca3af',  // Gray-400
        accent: '#d1d5db',     // Gray-300
      },
      fonts: DEFAULT_FONTS,
      spacing: { ...DEFAULT_SPACING, margins: 25 },
    },
  },
  {
    id: 'bold-brand',
    name: 'Marca Audaz',
    description: 'Colores vibrantes para destacar tu marca',
    styles: {
      theme: 'dark',
      colors: {
        ...DEFAULT_DARK_COLORS,
        primary: '#ef4444',    // Red-500
        secondary: '#f97316',  // Orange-500
        accent: '#facc15',     // Yellow-400
      },
      fonts: DEFAULT_FONTS,
      spacing: DEFAULT_SPACING,
    },
  },
  {
    id: 'corporate-blue',
    name: 'Corporativo Azul',
    description: 'Estilo corporativo clasico',
    styles: {
      theme: 'light',
      colors: {
        primary: '#2563eb',    // Blue-600
        secondary: '#1e40af',  // Blue-800
        accent: '#3b82f6',     // Blue-500
        background: '#ffffff',
        text: '#1e293b',       // Slate-800
        muted: '#64748b',      // Slate-500
        border: '#cbd5e1',     // Slate-300
        tableHeader: '#f1f5f9', // Slate-100
        tableRowAlt: '#f8fafc', // Slate-50
      },
      fonts: DEFAULT_FONTS,
      spacing: DEFAULT_SPACING,
    },
  },
];

// ============================================
// Font Options
// ============================================

export const AVAILABLE_FONTS = [
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Helvetica-Bold', label: 'Helvetica Bold' },
  { value: 'Times-Roman', label: 'Times Roman' },
  { value: 'Times-Bold', label: 'Times Bold' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Courier-Bold', label: 'Courier Bold' },
];

export const FONT_SIZE_OPTIONS = [
  { value: 8, label: '8pt' },
  { value: 9, label: '9pt' },
  { value: 10, label: '10pt' },
  { value: 11, label: '11pt' },
  { value: 12, label: '12pt' },
  { value: 14, label: '14pt' },
  { value: 16, label: '16pt' },
  { value: 18, label: '18pt' },
  { value: 20, label: '20pt' },
  { value: 24, label: '24pt' },
  { value: 28, label: '28pt' },
  { value: 32, label: '32pt' },
  { value: 36, label: '36pt' },
];

// ============================================
// Spacing Options
// ============================================

export const MARGIN_OPTIONS = [
  { value: 10, label: 'Estrecho (10mm)' },
  { value: 15, label: 'Reducido (15mm)' },
  { value: 20, label: 'Normal (20mm)' },
  { value: 25, label: 'Amplio (25mm)' },
  { value: 30, label: 'Extra amplio (30mm)' },
];

export const LINE_HEIGHT_OPTIONS = [
  { value: 1.0, label: 'Simple (1.0)' },
  { value: 1.2, label: 'Compacto (1.2)' },
  { value: 1.4, label: 'Normal (1.4)' },
  { value: 1.6, label: 'Espaciado (1.6)' },
  { value: 1.8, label: 'Doble (1.8)' },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Create a new custom section with default config
 */
export function createCustomSection(order: number): ProposalSection {
  return {
    id: `custom-${Date.now()}`,
    type: 'custom_text',
    enabled: true,
    order,
    config: {
      title: 'Nueva Seccion',
      content: '',
    },
  };
}

/**
 * Get default styles based on theme
 */
export function getDefaultStyles(theme: 'dark' | 'light'): ProposalStyles {
  return theme === 'dark' ? DEFAULT_DARK_STYLES : DEFAULT_LIGHT_STYLES;
}

/**
 * Find a style preset by ID
 */
export function getStylePreset(presetId: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === presetId);
}
