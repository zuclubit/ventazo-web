/**
 * Proposal Template Types
 * Defines the structure for PDF layout and styling configurations
 */

// ============================================================================
// Section Types
// ============================================================================

/**
 * Available section types for PDF layout
 */
export type ProposalSectionType =
  | 'cover'        // Cover page with logo, client info, title
  | 'summary'      // Executive summary / overview
  | 'details'      // Line items table
  | 'totals'       // Subtotal, taxes, discounts, total
  | 'terms'        // Terms and conditions
  | 'signature'    // Signature block
  | 'custom_text'; // Custom markdown/text block

/**
 * Configuration for a single section in the PDF
 */
export interface ProposalSection {
  id: string;
  type: ProposalSectionType;
  enabled: boolean;
  order: number;
  config: ProposalSectionConfig;
}

/**
 * Section-specific configuration options
 */
export interface ProposalSectionConfig {
  // Cover section
  showLogo?: boolean;
  showDate?: boolean;
  showQuoteNumber?: boolean;
  showClientAddress?: boolean;

  // Details section
  columns?: number;
  showItemNumber?: boolean;
  showDescription?: boolean;
  showQuantity?: boolean;
  showUnitPrice?: boolean;
  showTotal?: boolean;

  // Totals section
  showSubtotal?: boolean;
  showTax?: boolean;
  showDiscount?: boolean;

  // Terms section
  termsTitle?: string;

  // Signature section
  showSignatureLine?: boolean;
  showDateLine?: boolean;
  signatureLabel?: string;

  // Custom text section
  title?: string;
  content?: string;  // Markdown supported

  // Generic
  [key: string]: unknown;
}

// ============================================================================
// Style Types
// ============================================================================

/**
 * Theme options for PDF
 */
export type ProposalTheme = 'dark' | 'light';

/**
 * Color configuration for PDF styling
 */
export interface ProposalColors {
  primary: string;    // Main accent color (headers, highlights)
  secondary: string;  // Secondary accent color
  accent: string;     // Tertiary accent color
  background: string; // Page background
  text: string;       // Main text color
  muted?: string;     // Muted/secondary text
  border?: string;    // Border color
  tableHeader?: string; // Table header background
  tableRowAlt?: string; // Alternating row color
}

/**
 * Font configuration for PDF
 */
export interface ProposalFonts {
  heading: string;   // Font for headings
  body: string;      // Font for body text
  sizes: {
    title: number;   // Main title size
    heading: number; // Section heading size
    body: number;    // Body text size
    small: number;   // Small text / labels
  };
}

/**
 * Spacing configuration for PDF layout
 */
export interface ProposalSpacing {
  margins: number;     // Page margins (mm)
  padding: number;     // Section padding
  lineHeight: number;  // Line height multiplier
  sectionGap?: number; // Gap between sections
}

/**
 * Complete style configuration for PDF
 */
export interface ProposalStyles {
  theme: ProposalTheme;
  colors: ProposalColors;
  fonts: ProposalFonts;
  spacing: ProposalSpacing;
}

// ============================================================================
// Template Entity
// ============================================================================

/**
 * Proposal Template entity
 * Stores reusable PDF layout and styling configurations
 */
export interface ProposalTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  isActive: boolean;
  sections: ProposalSection[];
  styles: ProposalStyles;
  thumbnail?: string | null;
  createdBy: string;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs
// ============================================================================

/**
 * Input for creating a new proposal template
 */
export interface CreateProposalTemplateInput {
  name: string;
  description?: string;
  sections: ProposalSection[];
  styles: ProposalStyles;
  isDefault?: boolean;
}

/**
 * Input for updating an existing proposal template
 */
export interface UpdateProposalTemplateInput {
  name?: string;
  description?: string | null;
  sections?: ProposalSection[];
  styles?: ProposalStyles;
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Input for generating a PDF with a specific template
 */
export interface GenerateProposalPdfInput {
  quoteId: string;
  templateId?: string; // Uses tenant's default if not specified
  overrideStyles?: Partial<ProposalStyles>;
}

/**
 * Input for generating a template preview
 */
export interface GenerateTemplatePreviewInput {
  templateId: string;
  previewType?: 'thumbnail' | 'full';
}

// ============================================================================
// Constants / Defaults
// ============================================================================

/**
 * Default sections for a new template
 */
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
      showItemNumber: true,
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
      termsTitle: 'Terms & Conditions',
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
      signatureLabel: 'Authorized Signature',
    },
  },
];

/**
 * Default dark theme styles
 */
export const DEFAULT_DARK_STYLES: ProposalStyles = {
  theme: 'dark',
  colors: {
    primary: '#00FF9D',     // Ventazo green
    secondary: '#6B21A8',   // Purple
    accent: '#2DD4BF',      // Teal
    background: '#0D1117',  // Dark background
    text: '#E5E7EB',        // Light text
    muted: '#9CA3AF',       // Muted text
    border: '#374151',      // Border color
    tableHeader: '#1F2937', // Table header
    tableRowAlt: '#111827', // Alternating row
  },
  fonts: {
    heading: 'Montserrat',
    body: 'Inter',
    sizes: {
      title: 28,
      heading: 16,
      body: 11,
      small: 9,
    },
  },
  spacing: {
    margins: 20,
    padding: 15,
    lineHeight: 1.4,
    sectionGap: 20,
  },
};

/**
 * Default light theme styles
 */
export const DEFAULT_LIGHT_STYLES: ProposalStyles = {
  theme: 'light',
  colors: {
    primary: '#059669',     // Green
    secondary: '#7C3AED',   // Purple
    accent: '#0D9488',      // Teal
    background: '#FFFFFF',  // White background
    text: '#1F2937',        // Dark text
    muted: '#6B7280',       // Muted text
    border: '#E5E7EB',      // Border color
    tableHeader: '#F3F4F6', // Table header
    tableRowAlt: '#F9FAFB', // Alternating row
  },
  fonts: {
    heading: 'Montserrat',
    body: 'Inter',
    sizes: {
      title: 28,
      heading: 16,
      body: 11,
      small: 9,
    },
  },
  spacing: {
    margins: 20,
    padding: 15,
    lineHeight: 1.4,
    sectionGap: 20,
  },
};

/**
 * Get default styles for a theme
 */
export function getDefaultStyles(theme: ProposalTheme): ProposalStyles {
  return theme === 'light' ? DEFAULT_LIGHT_STYLES : DEFAULT_DARK_STYLES;
}

/**
 * Create a default template configuration
 */
export function createDefaultTemplate(
  name: string = 'Default Template',
  theme: ProposalTheme = 'dark'
): Omit<ProposalTemplate, 'id' | 'tenantId' | 'createdBy' | 'createdAt' | 'updatedAt'> {
  return {
    name,
    description: theme === 'dark'
      ? 'Professional dark theme template'
      : 'Clean light theme template',
    isDefault: true,
    isActive: true,
    sections: DEFAULT_SECTIONS,
    styles: getDefaultStyles(theme),
    thumbnail: null,
    updatedBy: null,
  };
}
