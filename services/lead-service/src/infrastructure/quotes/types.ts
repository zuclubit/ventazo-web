/**
 * Quotes/Proposals Types
 * Types for quote and proposal management
 */

/**
 * Quote status
 */
export type QuoteStatus =
  | 'draft'
  | 'pending_review'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revised';

/**
 * Quote item type
 */
export type QuoteItemType = 'product' | 'service' | 'subscription' | 'discount' | 'fee';

/**
 * Quote line item
 */
export interface QuoteLineItem {
  id: string;
  quoteId: string;
  type: QuoteItemType;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unitPrice: number; // In cents
  discount?: number; // Percentage or fixed amount
  discountType?: 'percentage' | 'fixed';
  tax?: number; // Percentage
  taxable: boolean;
  total: number; // Calculated total in cents
  position: number;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quote
 */
export interface Quote {
  id: string;
  tenantId: string;
  quoteNumber: string;

  // Relationships
  customerId?: string;
  leadId?: string;
  opportunityId?: string;

  // Quote details
  title: string;
  description?: string;
  status: QuoteStatus;
  version: number;
  parentQuoteId?: string; // For revisions

  // Dates
  issueDate: Date;
  expirationDate: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  sentAt?: Date;
  viewedAt?: Date;

  // Financial
  currency: string;
  subtotal: number;
  discountType?: 'percentage' | 'fixed'; // Quote-level discount type
  discountValue?: number; // Quote-level discount value
  discountTotal: number;
  taxRate?: number; // Tax rate percentage (e.g., 16 for 16% IVA)
  taxTotal: number;
  total: number;

  // Billing information
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  // Contact information
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;

  // Terms and notes
  terms?: string;
  notes?: string;
  internalNotes?: string;

  // Signature
  signatureRequired: boolean;
  signatureName?: string;
  signatureEmail?: string;
  signatureDate?: Date;
  signatureIp?: string;

  // Payment
  paymentTerms?: string;
  paymentDueDays?: number;
  depositRequired: boolean;
  depositPercentage?: number;
  depositAmount?: number;

  // Files
  attachmentUrls?: string[];
  pdfUrl?: string;
  publicUrl?: string;
  publicToken?: string;

  // Tracking
  viewCount: number;
  lastViewedAt?: Date;
  lastViewedBy?: string;

  // Metadata
  tags?: string[];
  customFields?: Record<string, unknown>;
  metadata?: Record<string, string>;

  // Ownership
  createdBy: string;
  assignedTo?: string;

  // Audit
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quote template
 */
export interface QuoteTemplate {
  id: string;
  tenantId: string;

  name: string;
  description?: string;
  category?: string;

  // Default values
  defaultTitle?: string;
  defaultDescription?: string;
  defaultTerms?: string;
  defaultNotes?: string;
  defaultPaymentTerms?: string;
  defaultPaymentDueDays?: number;
  defaultValidityDays?: number;
  defaultDepositRequired?: boolean;
  defaultDepositPercentage?: number;

  // Default line items
  lineItems?: Omit<QuoteLineItem, 'id' | 'quoteId' | 'createdAt' | 'updatedAt'>[];

  // Branding
  headerHtml?: string;
  footerHtml?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quote activity
 */
export interface QuoteActivity {
  id: string;
  quoteId: string;
  tenantId: string;

  type: 'created' | 'updated' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised' | 'comment';
  description: string;

  // Actor info
  userId?: string;
  userName?: string;
  userEmail?: string;

  // View info (for viewed events)
  viewerIp?: string;
  viewerUserAgent?: string;
  viewDuration?: number; // seconds

  // Changes (for updated events)
  changes?: Record<string, { old: unknown; new: unknown }>;

  // Comment (for comment events)
  comment?: string;

  metadata?: Record<string, string>;
  createdAt: Date;
}

/**
 * Create quote input
 */
export interface CreateQuoteInput {
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  templateId?: string;

  title: string;
  description?: string;

  expirationDate: Date;
  currency?: string;

  billingAddress?: Quote['billingAddress'];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;

  terms?: string;
  notes?: string;
  internalNotes?: string;

  signatureRequired?: boolean;
  paymentTerms?: string;
  paymentDueDays?: number;
  depositRequired?: boolean;
  depositPercentage?: number;

  lineItems: Array<{
    type: QuoteItemType;
    name: string;
    description?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    tax?: number;
    taxable?: boolean;
  }>;

  tags?: string[];
  customFields?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

/**
 * Update quote input
 */
export interface UpdateQuoteInput {
  // Status for Kanban drag & drop operations
  status?: QuoteStatus;
  title?: string;
  description?: string;
  expirationDate?: Date;

  billingAddress?: Quote['billingAddress'];
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;

  terms?: string;
  notes?: string;
  internalNotes?: string;

  signatureRequired?: boolean;
  paymentTerms?: string;
  paymentDueDays?: number;
  depositRequired?: boolean;
  depositPercentage?: number;

  lineItems?: Array<{
    id?: string;
    type: QuoteItemType;
    name: string;
    description?: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    tax?: number;
    taxable?: boolean;
  }>;

  tags?: string[];
  customFields?: Record<string, unknown>;
  metadata?: Record<string, string>;
}

/**
 * Send quote input
 */
export interface SendQuoteInput {
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  ccEmails?: string[];
  attachPdf?: boolean;
}

/**
 * Accept quote input
 */
export interface AcceptQuoteInput {
  signatureName: string;
  signatureEmail: string;
  signatureIp?: string;
  notes?: string;
}

/**
 * Quote filter
 */
export interface QuoteFilter {
  tenantId: string;
  customerId?: string;
  leadId?: string;
  opportunityId?: string;
  status?: QuoteStatus | QuoteStatus[];
  search?: string;
  minTotal?: number;
  maxTotal?: number;
  createdFrom?: Date;
  createdTo?: Date;
  expirationFrom?: Date;
  expirationTo?: Date;
  createdBy?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'total' | 'quoteNumber' | 'expirationDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Quote analytics
 */
export interface QuoteAnalytics {
  totalQuotes: number;
  totalValue: number;
  acceptedQuotes: number;
  acceptedValue: number;
  rejectedQuotes: number;
  pendingQuotes: number;
  expiredQuotes: number;
  acceptanceRate: number;
  averageValue: number;
  averageTimeToAccept: number; // hours
  quotesByStatus: Record<QuoteStatus, number>;
  quotesByMonth: Array<{
    month: string;
    created: number;
    accepted: number;
    rejected: number;
    value: number;
  }>;
  topProducts?: Array<{
    name: string;
    quantity: number;
    value: number;
  }>;
}
