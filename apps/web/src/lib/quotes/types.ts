// ============================================
// Quote Types - Full CRM Integration
// ============================================

// Quote Status - Lifecycle states
export type QuoteStatus =
  | 'draft'
  | 'pending_review'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'revised';

// Line Item Types
export type QuoteLineItemType =
  | 'product'
  | 'service'
  | 'subscription'
  | 'discount'
  | 'fee';

// Discount Types
export type DiscountType = 'percentage' | 'fixed';

// Display Labels for Status
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  pending_review: 'En Revision',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  revised: 'Revisada',
};

/**
 * Quote Status Colors - Theme-adaptive styling via CSS variables
 * Uses CSS custom properties defined in globals.css
 * Automatically adapts to light/dark mode without dark: variants
 * @see globals.css QUOTES MODULE section for variable definitions
 */
export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-[var(--quote-draft-bg)] text-[var(--quote-draft-text)] border-[var(--quote-draft-border)]',
  pending_review: 'bg-[var(--quote-pending-bg)] text-[var(--quote-pending-text)] border-[var(--quote-pending-border)]',
  sent: 'bg-[var(--quote-sent-bg)] text-[var(--quote-sent-text)] border-[var(--quote-sent-border)]',
  viewed: 'bg-[var(--quote-viewed-bg)] text-[var(--quote-viewed-text)] border-[var(--quote-viewed-border)]',
  accepted: 'bg-[var(--quote-accepted-bg)] text-[var(--quote-accepted-text)] border-[var(--quote-accepted-border)]',
  rejected: 'bg-[var(--quote-rejected-bg)] text-[var(--quote-rejected-text)] border-[var(--quote-rejected-border)]',
  expired: 'bg-[var(--quote-expired-bg)] text-[var(--quote-expired-text)] border-[var(--quote-expired-border)]',
  revised: 'bg-[var(--quote-revised-bg)] text-[var(--quote-revised-text)] border-[var(--quote-revised-border)]',
};

export const LINE_ITEM_TYPE_LABELS: Record<QuoteLineItemType, string> = {
  product: 'Producto',
  service: 'Servicio',
  subscription: 'Suscripcion',
  discount: 'Descuento',
  fee: 'Cargo',
};

// ============================================
// Interfaces
// ============================================

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  type: QuoteLineItemType;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  subtotal: number;
  total: number;
  order: number;
  metadata?: Record<string, unknown>;
}

export interface Quote {
  id: string;
  tenantId: string;
  quoteNumber: string;
  title: string;
  description?: string;
  status: QuoteStatus;

  // Related entities
  leadId?: string;
  leadName?: string;
  customerId?: string;
  customerName?: string;
  opportunityId?: string;
  opportunityName?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Dates
  issueDate: string;
  expiryDate?: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;

  // Financial
  currency: string;
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount: number;
  total: number;

  // Line items
  items: QuoteLineItem[];

  // Content
  terms?: string;
  notes?: string;
  internalNotes?: string;

  // Template
  templateId?: string;
  templateName?: string;

  // Ownership
  createdBy: string;
  createdByName?: string;
  assignedTo?: string;
  assignedToName?: string;

  // Public access
  publicToken?: string;
  publicUrl?: string;

  // Version control
  version: number;
  parentQuoteId?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  terms?: string;
  notes?: string;
  headerHtml?: string;
  footerHtml?: string;
  cssStyles?: string;
  defaultItems?: Partial<QuoteLineItem>[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteActivity {
  id: string;
  quoteId: string;
  action: string;
  description?: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface QuoteAnalytics {
  totalQuotes: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  rejectedCount: number;
  expiredCount: number;
  totalValue: number;
  acceptedValue: number;
  avgQuoteValue: number;
  conversionRate: number;
  avgTimeToAccept: number; // days
  byStatus: Record<QuoteStatus, number>;
  byMonth: Array<{
    month: string;
    count: number;
    value: number;
    accepted: number;
  }>;
}

// ============================================
// API Response Types
// ============================================

export interface QuotesListResponse {
  data: Quote[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuoteTemplatesResponse {
  data: QuoteTemplate[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface QuoteActivityResponse {
  data: QuoteActivity[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Request Types
// ============================================

export interface CreateQuoteRequest {
  title: string;
  description?: string;
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  contactId?: string;
  contactEmail?: string;
  expiryDate?: string;
  currency?: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  terms?: string;
  notes?: string;
  internalNotes?: string;
  templateId?: string;
  assignedTo?: string;
  items: CreateQuoteLineItemRequest[];
  metadata?: Record<string, unknown>;
}

export interface CreateQuoteLineItemRequest {
  type: QuoteLineItemType;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  order?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateQuoteRequest {
  title?: string;
  description?: string;
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  contactId?: string;
  contactEmail?: string;
  expiryDate?: string;
  currency?: string;
  discountType?: DiscountType;
  discountValue?: number;
  taxRate?: number;
  terms?: string;
  notes?: string;
  internalNotes?: string;
  templateId?: string;
  assignedTo?: string;
  items?: CreateQuoteLineItemRequest[];
  metadata?: Record<string, unknown>;
}

export interface SendQuoteRequest {
  email?: string;
  subject?: string;
  message?: string;
  sendSms?: boolean;
  phone?: string;
}

export interface AcceptQuoteRequest {
  signature?: string;
  signedByName?: string;
  signedByEmail?: string;
  comments?: string;
}

export interface RejectQuoteRequest {
  reason?: string;
  comments?: string;
}

export interface QuotesQueryParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: QuoteStatus;
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  assignedTo?: string;
  minTotal?: number;
  maxTotal?: number;
  createdFrom?: string;
  createdTo?: string;
  expiryFrom?: string;
  expiryTo?: string;
  sortBy?: 'quoteNumber' | 'title' | 'total' | 'createdAt' | 'expiryDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Stats Types
// ============================================

export interface QuoteStats {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  totalValue: number;
  acceptedValue: number;
  pendingValue: number;
  conversionRate: number;
}
