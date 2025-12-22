/**
 * GDPR Compliance Types
 * Types for GDPR data export, deletion, and consent management
 */

/**
 * Data subject request types (DSR)
 */
export type DsrType =
  | 'access'       // Right of access (Article 15)
  | 'rectification' // Right to rectification (Article 16)
  | 'erasure'      // Right to erasure / Right to be forgotten (Article 17)
  | 'restriction'  // Right to restriction of processing (Article 18)
  | 'portability'  // Right to data portability (Article 20)
  | 'objection';   // Right to object (Article 21)

/**
 * DSR status
 */
export type DsrStatus =
  | 'pending'
  | 'in_progress'
  | 'verification_required'
  | 'completed'
  | 'rejected'
  | 'expired';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'xml';

/**
 * Consent basis for processing
 */
export type ConsentBasis =
  | 'consent'           // Explicit consent
  | 'contract'          // Necessary for contract
  | 'legal_obligation'  // Legal requirement
  | 'vital_interest'    // To protect vital interests
  | 'public_task'       // Public interest task
  | 'legitimate_interest'; // Legitimate interest

/**
 * Personal data category
 */
export type DataCategory =
  | 'identity'         // Name, ID numbers
  | 'contact'          // Email, phone, address
  | 'financial'        // Payment, billing
  | 'professional'     // Job, company
  | 'behavioral'       // Interactions, activity
  | 'technical'        // IP, device info
  | 'communication'    // Messages, notes
  | 'preferences';     // Settings, preferences

/**
 * Consent record
 */
export interface ConsentRecord {
  id: string;
  tenantId: string;
  subjectId: string;         // Lead ID, customer ID, or external identifier
  subjectType: 'lead' | 'customer' | 'contact' | 'external';
  email: string;

  // Consent details
  purpose: string;           // Specific purpose for processing
  consentBasis: ConsentBasis;
  dataCategories: DataCategory[];

  // Status
  isActive: boolean;
  consentGivenAt: Date;
  consentMethod: 'web_form' | 'email' | 'verbal' | 'written' | 'api';
  consentSource: string;     // URL, form name, etc.
  consentVersion: string;    // Privacy policy version

  // Withdrawal
  withdrawnAt?: Date;
  withdrawalMethod?: string;

  // Expiry
  expiresAt?: Date;

  // Audit
  ipAddress?: string;
  userAgent?: string;
  verificationToken?: string;
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data Subject Request (DSR)
 */
export interface DataSubjectRequest {
  id: string;
  tenantId: string;

  // Request details
  type: DsrType;
  status: DsrStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Subject identification
  subjectEmail: string;
  subjectName?: string;
  subjectId?: string;        // If known (lead ID, customer ID)
  subjectType?: 'lead' | 'customer' | 'contact' | 'unknown';

  // Verification
  verificationMethod: 'email' | 'identity_document' | 'manual';
  verificationToken?: string;
  verifiedAt?: Date;

  // Request metadata
  requestSource: 'web_form' | 'email' | 'phone' | 'mail' | 'api';
  requestNotes?: string;

  // Processing
  assignedTo?: string;
  processingNotes?: string;
  dataLocations?: string[];  // Systems where data was found

  // For erasure requests
  erasureScope?: 'all' | 'specific';
  erasureExclusions?: string[]; // Data to retain for legal reasons

  // For portability requests
  exportFormat?: ExportFormat;
  exportUrl?: string;
  exportExpiresAt?: Date;

  // Response
  responseNotes?: string;
  rejectionReason?: string;

  // Compliance timeline
  receivedAt: Date;
  acknowledgedAt?: Date;
  dueDate: Date;             // 30 days from receivedAt per GDPR
  completedAt?: Date;

  // Audit
  auditLog: DsrAuditEntry[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * DSR audit log entry
 */
export interface DsrAuditEntry {
  timestamp: Date;
  action: string;
  performedBy: string;
  details?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

/**
 * Data export result
 */
export interface DataExportResult {
  success: boolean;
  format: ExportFormat;

  // Export metadata
  exportedAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
  checksum?: string;
  sizeBytes?: number;

  // Data summary
  recordCounts: {
    leads: number;
    contacts: number;
    communications: number;
    activities: number;
    notes: number;
    attachments: number;
    consents: number;
  };

  // For inline export
  data?: PersonalDataExport;

  error?: string;
}

/**
 * Personal data export structure
 */
export interface PersonalDataExport {
  exportedAt: string;
  dataSubject: {
    email: string;
    name?: string;
    identifiers: Array<{ type: string; value: string }>;
  };

  // Personal data categories
  leads?: Array<{
    id: string;
    companyName?: string;
    email: string;
    phone?: string;
    status: string;
    source: string;
    createdAt: string;
    customFields?: Record<string, unknown>;
  }>;

  contacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    createdAt: string;
  }>;

  communications?: Array<{
    id: string;
    type: string;
    direction: string;
    subject?: string;
    occurredAt: string;
  }>;

  activities?: Array<{
    id: string;
    action: string;
    entityType: string;
    timestamp: string;
  }>;

  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;

  consents?: Array<{
    purpose: string;
    consentBasis: string;
    givenAt: string;
    withdrawnAt?: string;
    isActive: boolean;
  }>;

  // Processing information
  processingPurposes: string[];
  dataRetention: {
    policy: string;
    retentionPeriod?: string;
  };
  thirdPartySharing?: Array<{
    recipient: string;
    purpose: string;
    dataCategories: string[];
  }>;
}

/**
 * Data deletion result
 */
export interface DataDeletionResult {
  success: boolean;
  deletedAt?: Date;

  // Deletion summary
  deletedRecords: {
    leads: number;
    contacts: number;
    communications: number;
    activities: number;
    notes: number;
    attachments: number;
    consents: number;
  };

  // Retained data (for legal reasons)
  retainedRecords?: {
    category: string;
    count: number;
    reason: string;
    retentionUntil?: Date;
  }[];

  // Verification
  deletionCertificate?: string; // Reference number

  error?: string;
}

/**
 * Retention policy
 */
export interface RetentionPolicy {
  id: string;
  tenantId: string;

  // Policy details
  name: string;
  description?: string;
  dataCategory: DataCategory;
  retentionDays: number;

  // Legal basis
  legalBasis: string;

  // Actions
  actionOnExpiry: 'delete' | 'anonymize' | 'archive' | 'review';
  notifyBeforeExpiry: boolean;
  notifyDaysBefore?: number;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a DSR
 */
export interface CreateDsrInput {
  type: DsrType;
  subjectEmail: string;
  subjectName?: string;
  requestSource: DataSubjectRequest['requestSource'];
  requestNotes?: string;
  exportFormat?: ExportFormat;
  erasureScope?: 'all' | 'specific';
  erasureExclusions?: string[];
  verificationMethod?: DataSubjectRequest['verificationMethod'];
}

/**
 * Input for recording consent
 */
export interface RecordConsentInput {
  subjectId?: string;
  subjectType?: ConsentRecord['subjectType'];
  email: string;
  purpose: string;
  consentBasis: ConsentBasis;
  dataCategories: DataCategory[];
  consentMethod: ConsentRecord['consentMethod'];
  consentSource: string;
  consentVersion: string;
  expiresAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * GDPR compliance summary
 */
export interface GdprComplianceSummary {
  tenantId: string;
  generatedAt: Date;

  // Consent stats
  consents: {
    total: number;
    active: number;
    withdrawn: number;
    expired: number;
    byPurpose: Record<string, number>;
  };

  // DSR stats
  requests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byType: Record<DsrType, number>;
    averageCompletionDays: number;
  };

  // Data inventory
  dataInventory: {
    leads: number;
    contacts: number;
    communications: number;
    withConsentBasis: number;
    withoutConsentBasis: number;
  };

  // Retention
  retention: {
    policiesActive: number;
    recordsDueForAction: number;
    recordsExpired: number;
  };
}
