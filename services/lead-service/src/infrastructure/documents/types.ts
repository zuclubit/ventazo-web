/**
 * Document Management & Templates Types
 *
 * Comprehensive document management for CRM:
 * - Document templates (proposals, contracts, quotes, invoices)
 * - Template variables and merge fields
 * - Document generation from templates
 * - Document versioning and approval workflows
 * - E-signature integration
 * - Document analytics and tracking
 */

/**
 * Document Types
 */
export type DocumentType =
  | 'proposal'           // Sales proposal
  | 'contract'           // Legal contract
  | 'quote'              // Price quote
  | 'invoice'            // Invoice
  | 'agreement'          // Service agreement
  | 'nda'                // Non-disclosure agreement
  | 'sow'                // Statement of work
  | 'sla'                // Service level agreement
  | 'order_form'         // Order form
  | 'letter'             // Business letter
  | 'report'             // Report
  | 'presentation'       // Presentation
  | 'brochure'           // Marketing brochure
  | 'case_study'         // Case study
  | 'onboarding'         // Onboarding document
  | 'policy'             // Policy document
  | 'other';             // Other document

/**
 * Document Status
 */
export type DocumentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'voided'
  | 'archived';

/**
 * Template Status
 */
export type TemplateStatus = 'draft' | 'active' | 'archived';

/**
 * Template Format
 */
export type TemplateFormat = 'html' | 'markdown' | 'pdf' | 'docx';

/**
 * Signature Status
 */
export type SignatureStatus =
  | 'not_required'
  | 'pending'
  | 'signed'
  | 'declined'
  | 'expired';

/**
 * Merge Field Source
 */
export type MergeFieldSource =
  | 'lead'
  | 'contact'
  | 'customer'
  | 'deal'
  | 'quote'
  | 'product'
  | 'company'
  | 'user'
  | 'custom';

/**
 * Document Template
 */
export interface DocumentTemplate {
  id: string;
  tenantId: string;

  name: string;
  description?: string;
  type: DocumentType;
  status: TemplateStatus;

  // Template content
  format: TemplateFormat;
  content: string;           // HTML/Markdown content
  headerContent?: string;    // Header template
  footerContent?: string;    // Footer template
  cssStyles?: string;        // Custom CSS

  // Layout settings
  pageSize?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  // Merge fields
  mergeFields: MergeFieldDefinition[];
  conditionalSections?: ConditionalSection[];

  // Cover page
  hasCoverPage?: boolean;
  coverPageContent?: string;

  // Signature settings
  requiresSignature?: boolean;
  signatureFields?: SignatureFieldDefinition[];

  // Branding
  logoUrl?: string;
  brandColor?: string;
  fontFamily?: string;

  // Approval settings
  requiresApproval?: boolean;
  approverIds?: string[];

  // Version
  version: number;
  parentTemplateId?: string;

  // Organization
  folderId?: string;
  tags?: string[];

  // Usage stats
  usageCount: number;
  lastUsedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Merge Field Definition
 */
export interface MergeFieldDefinition {
  id: string;
  tag: string;                   // e.g., {{contact.firstName}}
  name: string;                  // Display name
  source: MergeFieldSource;
  field: string;                 // Field path, e.g., "firstName"
  fallback?: string;             // Fallback value if field is empty
  format?: string;               // Date/number formatting
  isRequired?: boolean;
  description?: string;
}

/**
 * Conditional Section
 */
export interface ConditionalSection {
  id: string;
  name: string;
  condition: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value?: unknown;
  };
  content: string;
}

/**
 * Signature Field Definition
 */
export interface SignatureFieldDefinition {
  id: string;
  label: string;
  signerType: 'sender' | 'recipient' | 'witness';
  signerEmail?: string;         // If specific person
  isRequired: boolean;
  order: number;
  position?: {
    page: number;
    x: number;
    y: number;
  };
}

/**
 * Generated Document
 */
export interface Document {
  id: string;
  tenantId: string;

  // Template reference
  templateId?: string;
  templateName?: string;
  templateVersion?: number;

  // Document info
  name: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;

  // Content
  format: TemplateFormat;
  content?: string;              // HTML/Markdown content
  pdfUrl?: string;               // Generated PDF URL
  storageKey?: string;           // Storage key for file

  // Entity associations
  entityType?: 'lead' | 'contact' | 'customer' | 'deal' | 'opportunity' | 'quote';
  entityId?: string;
  entityName?: string;

  // Related entities
  dealId?: string;
  quoteId?: string;
  contactId?: string;
  customerId?: string;

  // Recipient
  recipientEmail?: string;
  recipientName?: string;

  // Value (for quotes/invoices)
  amount?: number;
  currency?: string;

  // Expiration
  expiresAt?: Date;
  validUntil?: Date;

  // Approval
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;

  // Signature
  signatureStatus: SignatureStatus;
  signatureProvider?: string;
  signatureDocumentId?: string;  // External signature provider ID
  signatures: DocumentSignature[];

  // Tracking
  sentAt?: Date;
  viewedAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  downloadCount: number;
  lastDownloadedAt?: Date;

  // Version
  version: number;
  previousVersionId?: string;

  // Custom data
  mergeData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  ownerId: string;
  ownerName?: string;
}

/**
 * Document Signature
 */
export interface DocumentSignature {
  id: string;
  documentId: string;
  signerId: string;
  signerEmail: string;
  signerName?: string;
  signerType: 'sender' | 'recipient' | 'witness';
  status: SignatureStatus;
  signedAt?: Date;
  ipAddress?: string;
  signatureImageUrl?: string;
  declineReason?: string;
  order: number;
}

/**
 * Document Folder
 */
export interface DocumentFolder {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentId?: string;
  displayOrder: number;
  documentCount?: number;
  templateCount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Document Activity
 */
export interface DocumentActivity {
  id: string;
  documentId: string;
  tenantId: string;
  type: DocumentActivityType;
  description: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  recipientEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type DocumentActivityType =
  | 'created'
  | 'updated'
  | 'sent'
  | 'viewed'
  | 'downloaded'
  | 'signed'
  | 'declined'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'voided'
  | 'comment_added'
  | 'reminder_sent';

/**
 * Document Analytics
 */
export interface DocumentAnalytics {
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;

  // Counts
  totalDocuments: number;
  documentsCreated: number;
  documentsSent: number;
  documentsViewed: number;
  documentsSigned: number;
  documentsDeclined: number;
  documentsExpired: number;

  // By type
  byType: {
    type: DocumentType;
    count: number;
    signed: number;
    declined: number;
  }[];

  // By status
  byStatus: {
    status: DocumentStatus;
    count: number;
  }[];

  // Conversion metrics
  sendToViewRate: number;
  viewToSignRate: number;
  overallConversionRate: number;

  // Timing
  avgTimeToView?: number;        // Hours
  avgTimeToSign?: number;        // Hours
  avgTimeToComplete?: number;    // Hours

  // Value
  totalValue: number;
  signedValue: number;

  // Top templates
  topTemplates: {
    templateId: string;
    templateName: string;
    usageCount: number;
    signedCount: number;
  }[];

  // By user
  byUser: {
    userId: string;
    userName: string;
    created: number;
    sent: number;
    signed: number;
  }[];
}

/**
 * Create Template Input
 */
export interface CreateTemplateInput {
  name: string;
  description?: string;
  type: DocumentType;
  format?: TemplateFormat;
  content: string;
  headerContent?: string;
  footerContent?: string;
  cssStyles?: string;
  pageSize?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margins?: { top: number; right: number; bottom: number; left: number };
  mergeFields?: Omit<MergeFieldDefinition, 'id'>[];
  conditionalSections?: Omit<ConditionalSection, 'id'>[];
  hasCoverPage?: boolean;
  coverPageContent?: string;
  requiresSignature?: boolean;
  signatureFields?: Omit<SignatureFieldDefinition, 'id'>[];
  logoUrl?: string;
  brandColor?: string;
  fontFamily?: string;
  requiresApproval?: boolean;
  approverIds?: string[];
  folderId?: string;
  tags?: string[];
}

/**
 * Update Template Input
 */
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  content?: string;
  headerContent?: string;
  footerContent?: string;
  cssStyles?: string;
  pageSize?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margins?: { top: number; right: number; bottom: number; left: number };
  mergeFields?: Omit<MergeFieldDefinition, 'id'>[];
  conditionalSections?: Omit<ConditionalSection, 'id'>[];
  hasCoverPage?: boolean;
  coverPageContent?: string;
  requiresSignature?: boolean;
  signatureFields?: Omit<SignatureFieldDefinition, 'id'>[];
  logoUrl?: string;
  brandColor?: string;
  fontFamily?: string;
  requiresApproval?: boolean;
  approverIds?: string[];
  folderId?: string;
  tags?: string[];
}

/**
 * Generate Document Input
 */
export interface GenerateDocumentInput {
  templateId: string;
  name?: string;
  description?: string;
  entityType?: 'lead' | 'contact' | 'customer' | 'deal' | 'opportunity' | 'quote';
  entityId?: string;
  dealId?: string;
  quoteId?: string;
  contactId?: string;
  customerId?: string;
  recipientEmail?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  expiresAt?: Date;
  validUntil?: Date;
  mergeData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  generatePdf?: boolean;
}

/**
 * Create Document Input (without template)
 */
export interface CreateDocumentInput {
  name: string;
  description?: string;
  type: DocumentType;
  format?: TemplateFormat;
  content: string;
  entityType?: 'lead' | 'contact' | 'customer' | 'deal' | 'opportunity' | 'quote';
  entityId?: string;
  dealId?: string;
  quoteId?: string;
  contactId?: string;
  customerId?: string;
  recipientEmail?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  expiresAt?: Date;
  validUntil?: Date;
  requiresSignature?: boolean;
  signatureFields?: Omit<SignatureFieldDefinition, 'id'>[];
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Update Document Input
 */
export interface UpdateDocumentInput {
  name?: string;
  description?: string;
  status?: DocumentStatus;
  content?: string;
  recipientEmail?: string;
  recipientName?: string;
  amount?: number;
  currency?: string;
  expiresAt?: Date;
  validUntil?: Date;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Send Document Input
 */
export interface SendDocumentInput {
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  ccEmails?: string[];
  requestSignature?: boolean;
  reminderDays?: number[];
  expiresInDays?: number;
}

/**
 * Template Search Filters
 */
export interface TemplateSearchFilters {
  search?: string;
  type?: DocumentType[];
  status?: TemplateStatus[];
  folderId?: string;
  tags?: string[];
  createdBy?: string;
  requiresSignature?: boolean;
}

/**
 * Document Search Filters
 */
export interface DocumentSearchFilters {
  search?: string;
  type?: DocumentType[];
  status?: DocumentStatus[];
  entityType?: string;
  entityId?: string;
  dealId?: string;
  contactId?: string;
  customerId?: string;
  ownerId?: string;
  templateId?: string;
  signatureStatus?: SignatureStatus[];
  createdAfter?: Date;
  createdBefore?: Date;
  expiringBefore?: Date;
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Template Search Result
 */
export interface TemplateSearchResult {
  templates: DocumentTemplate[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Document Search Result
 */
export interface DocumentSearchResult {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  aggregations?: {
    byType: { type: DocumentType; count: number }[];
    byStatus: { status: DocumentStatus; count: number }[];
    totalValue: number;
  };
}

/**
 * Document Dashboard
 */
export interface DocumentDashboard {
  tenantId: string;

  // Summary
  totalDocuments: number;
  draftDocuments: number;
  pendingApproval: number;
  awaitingSignature: number;
  completedThisMonth: number;

  // Value
  totalPipelineValue: number;
  signedValueThisMonth: number;

  // Performance
  avgTimeToSign: number;
  signatureConversionRate: number;

  // Recent activity
  recentDocuments: Document[];
  recentActivity: DocumentActivity[];

  // Expiring soon
  expiringDocuments: Document[];

  // Pending actions
  pendingSignatures: Document[];
  pendingApprovals: Document[];
}

/**
 * Signature Request
 */
export interface SignatureRequest {
  documentId: string;
  signers: {
    email: string;
    name?: string;
    order: number;
    signerType: 'sender' | 'recipient' | 'witness';
  }[];
  message?: string;
  subject?: string;
  expiresInDays?: number;
  reminderDays?: number[];
  redirectUrl?: string;
}

/**
 * Signature Callback
 */
export interface SignatureCallback {
  provider: string;
  event: 'signed' | 'declined' | 'expired' | 'viewed';
  documentId: string;
  signerEmail: string;
  signedAt?: Date;
  declineReason?: string;
  ipAddress?: string;
}

/**
 * Clone Template Input
 */
export interface CloneTemplateInput {
  name?: string;
  description?: string;
  folderId?: string;
}

/**
 * Bulk Document Operation
 */
export interface BulkDocumentOperation {
  documentIds: string[];
  operation: 'archive' | 'void' | 'delete' | 'send_reminder';
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors?: { documentId: string; error: string }[];
}

/**
 * Standard Merge Fields
 */
export const STANDARD_MERGE_FIELDS: MergeFieldDefinition[] = [
  // Contact fields
  { id: '1', tag: '{{contact.firstName}}', name: 'Contact First Name', source: 'contact', field: 'firstName' },
  { id: '2', tag: '{{contact.lastName}}', name: 'Contact Last Name', source: 'contact', field: 'lastName' },
  { id: '3', tag: '{{contact.email}}', name: 'Contact Email', source: 'contact', field: 'email' },
  { id: '4', tag: '{{contact.phone}}', name: 'Contact Phone', source: 'contact', field: 'phone' },
  { id: '5', tag: '{{contact.company}}', name: 'Contact Company', source: 'contact', field: 'company' },
  { id: '6', tag: '{{contact.title}}', name: 'Contact Title', source: 'contact', field: 'title' },
  { id: '7', tag: '{{contact.address}}', name: 'Contact Address', source: 'contact', field: 'address' },

  // Company fields
  { id: '10', tag: '{{company.name}}', name: 'Company Name', source: 'company', field: 'name' },
  { id: '11', tag: '{{company.address}}', name: 'Company Address', source: 'company', field: 'address' },
  { id: '12', tag: '{{company.phone}}', name: 'Company Phone', source: 'company', field: 'phone' },
  { id: '13', tag: '{{company.website}}', name: 'Company Website', source: 'company', field: 'website' },

  // Deal fields
  { id: '20', tag: '{{deal.name}}', name: 'Deal Name', source: 'deal', field: 'name' },
  { id: '21', tag: '{{deal.amount}}', name: 'Deal Amount', source: 'deal', field: 'amount', format: 'currency' },
  { id: '22', tag: '{{deal.stage}}', name: 'Deal Stage', source: 'deal', field: 'stage' },
  { id: '23', tag: '{{deal.closeDate}}', name: 'Expected Close Date', source: 'deal', field: 'closeDate', format: 'date' },

  // Quote fields
  { id: '30', tag: '{{quote.number}}', name: 'Quote Number', source: 'quote', field: 'number' },
  { id: '31', tag: '{{quote.subtotal}}', name: 'Quote Subtotal', source: 'quote', field: 'subtotal', format: 'currency' },
  { id: '32', tag: '{{quote.tax}}', name: 'Quote Tax', source: 'quote', field: 'tax', format: 'currency' },
  { id: '33', tag: '{{quote.total}}', name: 'Quote Total', source: 'quote', field: 'total', format: 'currency' },
  { id: '34', tag: '{{quote.validUntil}}', name: 'Quote Valid Until', source: 'quote', field: 'validUntil', format: 'date' },

  // User/sender fields
  { id: '40', tag: '{{user.name}}', name: 'Sender Name', source: 'user', field: 'name' },
  { id: '41', tag: '{{user.email}}', name: 'Sender Email', source: 'user', field: 'email' },
  { id: '42', tag: '{{user.phone}}', name: 'Sender Phone', source: 'user', field: 'phone' },
  { id: '43', tag: '{{user.title}}', name: 'Sender Title', source: 'user', field: 'title' },

  // Date fields
  { id: '50', tag: '{{date.today}}', name: 'Today\'s Date', source: 'custom', field: 'today', format: 'date' },
  { id: '51', tag: '{{date.now}}', name: 'Current Date/Time', source: 'custom', field: 'now', format: 'datetime' },
];
