/**
 * Contract Management Types
 *
 * Comprehensive contract lifecycle management:
 * - Contract creation and versioning
 * - Approval workflows
 * - E-signature integration
 * - Renewal management
 * - Compliance tracking
 * - Contract analytics
 */

/**
 * Contract Status Types
 */
export type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'pending_signature'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'renewed';

export type ContractType =
  | 'master_agreement'
  | 'service_agreement'
  | 'subscription'
  | 'license'
  | 'nda'
  | 'sow'
  | 'amendment'
  | 'renewal'
  | 'other';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type SignatureStatus = 'pending' | 'signed' | 'declined' | 'voided';
export type RenewalStatus = 'upcoming' | 'in_progress' | 'renewed' | 'churned' | 'auto_renewed';

/**
 * Contract Entity
 */
export interface Contract {
  id: string;
  tenantId: string;

  // Core info
  contractNumber: string;
  name: string;
  type: ContractType;
  status: ContractStatus;
  description?: string;

  // Parties
  customerId?: string;
  customerName: string;
  vendorId?: string;
  vendorName?: string;

  // Financial terms
  totalValue: number;
  currency: string;
  recurringValue?: number;        // For subscription contracts
  billingFrequency?: 'monthly' | 'quarterly' | 'annually' | 'one_time';
  paymentTerms?: string;          // Net 30, etc.

  // Dates
  effectiveDate: Date;
  expirationDate: Date;
  signedDate?: Date;
  terminatedDate?: Date;
  renewalDate?: Date;

  // Terms
  autoRenew: boolean;
  renewalTermMonths?: number;
  noticePeriodDays?: number;
  terminationClause?: string;

  // Documents
  documentUrl?: string;
  templateId?: string;
  currentVersionId?: string;

  // Ownership
  ownerId: string;
  ownerName: string;

  // Related entities
  opportunityId?: string;
  parentContractId?: string;      // For amendments/renewals

  // Metadata
  tags: string[];
  customFields: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Contract Version
 */
export interface ContractVersion {
  id: string;
  contractId: string;
  tenantId: string;

  versionNumber: number;
  documentUrl: string;
  documentHash: string;           // SHA-256 hash for integrity
  fileSize: number;
  mimeType: string;

  changes: string;                // Description of changes
  createdBy: string;
  createdAt: Date;

  // Comparison
  previousVersionId?: string;
}

/**
 * Contract Template
 */
export interface ContractTemplate {
  id: string;
  tenantId: string;

  name: string;
  description?: string;
  type: ContractType;
  category: string;

  // Template content
  documentUrl: string;
  placeholders: TemplatePlaceholder[];

  // Settings
  requiresApproval: boolean;
  approvalWorkflowId?: string;
  defaultTermMonths: number;
  defaultAutoRenew: boolean;

  // Usage stats
  useCount: number;
  lastUsedAt?: Date;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Template Placeholder
 */
export interface TemplatePlaceholder {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'currency' | 'select' | 'signature';
  required: boolean;
  defaultValue?: string;
  options?: string[];             // For select type
  validation?: string;            // Regex pattern
}

/**
 * Approval Workflow
 */
export interface ApprovalWorkflow {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  // Triggers
  triggerType: 'contract_value' | 'contract_type' | 'manual' | 'always';
  triggerConditions: ApprovalTriggerCondition[];

  // Steps
  steps: ApprovalStep[];

  // Settings
  requireAllApprovers: boolean;   // All vs any in parallel steps
  allowSkip: boolean;
  skipConditions?: ApprovalTriggerCondition[];

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Approval Trigger Condition
 */
export interface ApprovalTriggerCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | string[];
}

/**
 * Approval Step
 */
export interface ApprovalStep {
  order: number;
  name: string;
  type: 'single' | 'parallel' | 'any_of';
  approvers: ApproverConfig[];
  dueInHours: number;
  escalationConfig?: EscalationConfig;
  autoApproveConditions?: ApprovalTriggerCondition[];
}

/**
 * Approver Configuration
 */
export interface ApproverConfig {
  type: 'user' | 'role' | 'manager' | 'dynamic';
  userId?: string;
  roleId?: string;
  dynamicField?: string;          // e.g., 'contract.ownerId.manager'
}

/**
 * Escalation Configuration
 */
export interface EscalationConfig {
  afterHours: number;
  escalateTo: ApproverConfig;
  notifyOriginal: boolean;
}

/**
 * Contract Approval Request
 */
export interface ContractApproval {
  id: string;
  contractId: string;
  tenantId: string;
  workflowId: string;

  // Current state
  currentStepOrder: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Approvals
  approvals: ApprovalDecision[];

  // Metadata
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  comments?: string;
}

/**
 * Approval Decision
 */
export interface ApprovalDecision {
  stepOrder: number;
  approverId: string;
  approverName: string;
  status: ApprovalStatus;
  decision?: 'approved' | 'rejected';
  comments?: string;
  decidedAt?: Date;
  dueAt: Date;
}

/**
 * Signature Request
 */
export interface SignatureRequest {
  id: string;
  contractId: string;
  tenantId: string;

  // External e-sign integration
  externalProvider?: 'docusign' | 'adobe_sign' | 'hellosign' | 'pandadoc';
  externalId?: string;
  externalStatus?: string;

  // Signatories
  signatories: Signatory[];

  // Document
  documentUrl: string;
  signedDocumentUrl?: string;

  // Status
  status: 'draft' | 'sent' | 'partially_signed' | 'completed' | 'declined' | 'voided' | 'expired';

  // Dates
  sentAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;

  // Metadata
  message?: string;
  reminderConfig?: ReminderConfig;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Signatory
 */
export interface Signatory {
  id: string;
  name: string;
  email: string;
  role: 'signer' | 'cc' | 'witness';
  order: number;
  status: SignatureStatus;
  signedAt?: Date;
  ipAddress?: string;
  signatureId?: string;           // External signature ID
}

/**
 * Reminder Configuration
 */
export interface ReminderConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  maxReminders: number;
  remindersSent: number;
}

/**
 * Contract Renewal
 */
export interface ContractRenewal {
  id: string;
  contractId: string;
  tenantId: string;

  // Renewal info
  status: RenewalStatus;
  renewalDate: Date;

  // Proposed terms
  proposedValue?: number;
  proposedTermMonths?: number;
  valueChange?: number;           // Positive = upsell, negative = downsell

  // New contract
  renewedContractId?: string;

  // Handling
  assignedTo?: string;
  notes?: string;

  // Risk assessment
  churnRisk?: 'low' | 'medium' | 'high';
  churnReasons?: string[];

  // Timestamps
  notifiedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * Contract Obligation
 */
export interface ContractObligation {
  id: string;
  contractId: string;
  tenantId: string;

  // Obligation details
  type: 'payment' | 'delivery' | 'compliance' | 'reporting' | 'milestone' | 'other';
  title: string;
  description?: string;

  // Party responsible
  responsibleParty: 'customer' | 'vendor' | 'mutual';
  assignedTo?: string;

  // Due date
  dueDate: Date;
  recurringPattern?: string;      // RRULE format

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  completedAt?: Date;
  completedBy?: string;

  // Notifications
  reminderDays: number[];         // Days before due to remind
  lastReminderAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contract Amendment
 */
export interface ContractAmendment {
  id: string;
  contractId: string;
  tenantId: string;

  // Amendment details
  amendmentNumber: number;
  title: string;
  description: string;

  // What changed
  changes: AmendmentChange[];

  // Status
  status: ContractStatus;

  // Document
  documentUrl?: string;

  // Approval
  approvalId?: string;
  signatureRequestId?: string;

  effectiveDate: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Amendment Change
 */
export interface AmendmentChange {
  field: string;
  previousValue: string;
  newValue: string;
  reason?: string;
}

/**
 * Contract Clause
 */
export interface ContractClause {
  id: string;
  tenantId: string;

  // Clause info
  name: string;
  category: string;
  content: string;

  // Metadata
  isStandard: boolean;
  requiresReview: boolean;
  riskLevel: 'low' | 'medium' | 'high';

  // Usage
  useCount: number;

  // Versions
  version: number;
  previousVersions: string[];

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Contract Event/Activity
 */
export interface ContractEvent {
  id: string;
  contractId: string;
  tenantId: string;

  type: ContractEventType;
  description: string;

  // Actor
  userId?: string;
  userName?: string;

  // Related entity
  relatedType?: 'approval' | 'signature' | 'amendment' | 'renewal' | 'obligation';
  relatedId?: string;

  // Metadata
  metadata: Record<string, unknown>;

  occurredAt: Date;
}

export type ContractEventType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'version_uploaded'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'signature_sent'
  | 'signature_signed'
  | 'signature_declined'
  | 'executed'
  | 'renewed'
  | 'amended'
  | 'terminated'
  | 'expired'
  | 'obligation_due'
  | 'obligation_completed';

/**
 * Contract Analytics/Dashboard
 */
export interface ContractAnalytics {
  tenantId: string;
  period: 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;

  // Volume metrics
  totalContracts: number;
  newContracts: number;
  renewedContracts: number;
  expiredContracts: number;
  terminatedContracts: number;

  // Value metrics
  totalContractValue: number;
  newContractValue: number;
  renewalValue: number;
  churnValue: number;

  // Velocity metrics
  avgDaysToSign: number;
  avgApprovalTime: number;

  // Status breakdown
  statusBreakdown: Record<ContractStatus, number>;
  typeBreakdown: Record<ContractType, number>;

  // Risk metrics
  expiringIn30Days: number;
  expiringIn60Days: number;
  expiringIn90Days: number;
  overdueObligations: number;

  // Performance
  renewalRate: number;
  churnRate: number;
  avgContractValue: number;
}

/**
 * Renewal Forecast
 */
export interface RenewalForecast {
  tenantId: string;

  // Time period
  period: 'month' | 'quarter';
  periodStart: Date;
  periodEnd: Date;

  // Counts
  contractsUpForRenewal: number;
  likelyToRenew: number;
  atRisk: number;
  churned: number;

  // Values
  totalRenewalValue: number;
  expectedValue: number;          // Based on likelihood
  atRiskValue: number;

  // By segment
  byType: RenewalSegment[];
  byOwner: RenewalSegment[];
}

/**
 * Renewal Segment
 */
export interface RenewalSegment {
  segmentKey: string;
  segmentName: string;
  count: number;
  value: number;
  atRiskCount: number;
  atRiskValue: number;
}

/**
 * Contract Search Filters
 */
export interface ContractSearchFilters {
  status?: ContractStatus[];
  type?: ContractType[];
  customerId?: string;
  ownerId?: string;
  expiringBefore?: Date;
  expiringAfter?: Date;
  minValue?: number;
  maxValue?: number;
  tags?: string[];
  search?: string;               // Full-text search
}

/**
 * Contract Dashboard
 */
export interface ContractDashboard {
  tenantId: string;

  // Summary
  summary: {
    totalActive: number;
    totalValue: number;
    avgContractValue: number;
    renewalRate: number;
  };

  // Upcoming actions
  expiringContracts: ContractSummary[];
  pendingApprovals: ContractApprovalSummary[];
  pendingSignatures: SignatureRequestSummary[];
  overdueObligations: ObligationSummary[];

  // Trends
  valueTrend: { date: string; value: number }[];
  statusDistribution: { status: ContractStatus; count: number; value: number }[];
  typeDistribution: { type: ContractType; count: number; value: number }[];
}

/**
 * Summary types for dashboard
 */
export interface ContractSummary {
  id: string;
  contractNumber: string;
  name: string;
  customerName: string;
  totalValue: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  status: ContractStatus;
}

export interface ContractApprovalSummary {
  id: string;
  contractId: string;
  contractName: string;
  currentStep: string;
  requestedAt: Date;
  daysWaiting: number;
}

export interface SignatureRequestSummary {
  id: string;
  contractId: string;
  contractName: string;
  pendingSignatures: number;
  totalSignatures: number;
  sentAt: Date;
}

export interface ObligationSummary {
  id: string;
  contractId: string;
  contractName: string;
  title: string;
  dueDate: Date;
  daysOverdue: number;
}
