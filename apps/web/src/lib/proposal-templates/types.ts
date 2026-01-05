// ============================================
// Proposal Template Types - PDF Customization
// ============================================

/**
 * Section types for PDF layout
 * Each section represents a distinct part of the proposal PDF
 */
export type ProposalSectionType =
  | 'cover'         // Header with logo, title, quote number
  | 'summary'       // Executive summary / description
  | 'details'       // Line items table
  | 'totals'        // Subtotal, tax, discount, total
  | 'terms'         // Terms and conditions
  | 'signature'     // Signature block
  | 'custom_text';  // Custom markdown/text block

/**
 * Configuration for a single PDF section
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
  content?: string; // Markdown supported

  // Allow additional custom config
  [key: string]: unknown;
}

/**
 * Color configuration for PDF styling
 */
export interface ProposalColors {
  primary: string;      // Main accent color
  secondary: string;    // Secondary accent
  accent: string;       // Tertiary accent
  background: string;   // Page background
  text: string;         // Main text color
  muted?: string;       // Secondary text color
  border?: string;      // Border color
  tableHeader?: string; // Table header background
  tableRowAlt?: string; // Alternating row background
}

/**
 * Font configuration for PDF
 */
export interface ProposalFonts {
  heading: string;
  body: string;
  sizes: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
}

/**
 * Spacing configuration for PDF layout
 */
export interface ProposalSpacing {
  margins: number;     // Page margins in mm
  padding: number;     // Content padding
  lineHeight: number;  // Line height multiplier
  sectionGap: number;  // Gap between sections
}

/**
 * Complete style configuration for PDF
 */
export interface ProposalStyles {
  theme: 'dark' | 'light';
  colors: ProposalColors;
  fonts: ProposalFonts;
  spacing: ProposalSpacing;
}

/**
 * Complete Proposal Template entity
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
  createdAt: string;
  updatedAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateProposalTemplateRequest {
  name: string;
  description?: string;
  sections: ProposalSection[];
  styles: ProposalStyles;
  isDefault?: boolean;
}

export interface UpdateProposalTemplateRequest {
  name?: string;
  description?: string;
  sections?: ProposalSection[];
  styles?: ProposalStyles;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface ProposalTemplatesListResponse {
  data: ProposalTemplate[];
  meta: {
    total: number;
  };
}

export interface ProposalTemplatePreviewRequest {
  sections?: ProposalSection[];
  styles?: ProposalStyles;
}

// ============================================
// PDF Generation Types
// ============================================

export interface GenerateProposalPdfRequest {
  quoteId: string;
  templateId?: string;
  overrideStyles?: Partial<ProposalStyles>;
  overrideSections?: ProposalSection[];
}

export interface GenerateProposalPreviewRequest {
  quoteId: string;
  templateId?: string;
  sections?: ProposalSection[];
  styles?: ProposalStyles;
}

// ============================================
// UI Helper Types
// ============================================

/**
 * Section type metadata for UI
 */
export interface SectionTypeInfo {
  type: ProposalSectionType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  defaultConfig: ProposalSectionConfig;
  isBuiltIn: boolean; // Can't be removed
}

/**
 * Style preset for quick styling
 */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  styles: ProposalStyles;
}
