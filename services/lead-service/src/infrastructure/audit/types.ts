/**
 * Audit Logging Types
 * Comprehensive audit trail for all CRM operations
 */

/**
 * Audit action types
 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'bulk_create'
  | 'bulk_update'
  | 'bulk_delete'
  | 'import'
  | 'export'
  | 'login'
  | 'logout'
  | 'permission_change'
  | 'status_change'
  | 'assignment'
  | 'conversion'
  | 'merge'
  | 'restore'
  | 'archive'
  | 'api_call'
  | 'webhook_received'
  | 'webhook_sent'
  | 'email_sent'
  | 'sms_sent'
  | 'payment_processed'
  | 'integration_sync'
  | 'workflow_triggered'
  | 'report_generated'
  | 'data_access'
  | 'gdpr_request'
  | 'custom';

/**
 * Audit entity types
 */
export type AuditEntityType =
  | 'lead'
  | 'contact'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'pipeline'
  | 'user'
  | 'team'
  | 'role'
  | 'permission'
  | 'workflow'
  | 'campaign'
  | 'email'
  | 'sms'
  | 'payment'
  | 'invoice'
  | 'quote'
  | 'contract'
  | 'document'
  | 'note'
  | 'activity'
  | 'integration'
  | 'webhook'
  | 'report'
  | 'system'
  | 'custom';

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  timestamp: Date;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  duration?: number;
  source: 'api' | 'ui' | 'webhook' | 'system' | 'integration' | 'batch';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Audit change record
 */
export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  displayName?: string;
  masked?: boolean;
}

/**
 * Audit query options
 */
export interface AuditQueryOptions {
  tenantId: string;
  startDate?: Date;
  endDate?: Date;
  actions?: AuditAction[];
  entityTypes?: AuditEntityType[];
  entityId?: string;
  userId?: string;
  success?: boolean;
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  source?: ('api' | 'ui' | 'webhook' | 'system' | 'integration' | 'batch')[];
  search?: string;
  correlationId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'timestamp' | 'action' | 'entityType' | 'userId';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit query result
 */
export interface AuditQueryResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Audit statistics
 */
export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<string, number>;
  entriesByEntityType: Record<string, number>;
  entriesByUser: { userId: string; userName?: string; count: number }[];
  entriesBySeverity: Record<string, number>;
  successRate: number;
  avgDuration: number;
  peakHour: number;
  mostActiveDay: string;
}

/**
 * Audit retention policy
 */
export interface AuditRetentionPolicy {
  id: string;
  name: string;
  description: string;
  entityTypes?: AuditEntityType[];
  actions?: AuditAction[];
  retentionDays: number;
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sensitive fields that should be masked in audit logs
 */
export const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'apiKey',
  'accessToken',
  'refreshToken',
  'privateKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'bankAccount',
  'routingNumber',
];

/**
 * Fields to exclude from audit logging
 */
export const EXCLUDED_FIELDS = [
  'updatedAt',
  'createdAt',
  'lastModified',
  '__v',
  '_rev',
];

/**
 * Audit configuration
 */
export interface AuditConfig {
  enabled: boolean;
  logReads: boolean;
  sensitiveFields: string[];
  excludedFields: string[];
  retentionDays: number;
  maxEntriesPerQuery: number;
  asyncLogging: boolean;
  batchSize: number;
  flushInterval: number;
}

/**
 * Default audit configuration
 */
export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  enabled: true,
  logReads: false,
  sensitiveFields: SENSITIVE_FIELDS,
  excludedFields: EXCLUDED_FIELDS,
  retentionDays: 365,
  maxEntriesPerQuery: 1000,
  asyncLogging: true,
  batchSize: 100,
  flushInterval: 5000,
};

/**
 * Audit context for tracking through request lifecycle
 */
export interface AuditContext {
  tenantId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
  source: 'api' | 'ui' | 'webhook' | 'system' | 'integration' | 'batch';
}

/**
 * Audit decorator options
 */
export interface AuditDecoratorOptions {
  action: AuditAction;
  entityType: AuditEntityType;
  getEntityId?: (...args: unknown[]) => string | undefined;
  getEntityName?: (...args: unknown[]) => string | undefined;
  getChanges?: (args: unknown[], result: unknown) => AuditChange[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown> | ((...args: unknown[]) => Record<string, unknown>);
  condition?: (...args: unknown[]) => boolean;
}

/**
 * Audit export format
 */
export type AuditExportFormat = 'json' | 'csv' | 'xlsx';

/**
 * Audit export options
 */
export interface AuditExportOptions {
  format: AuditExportFormat;
  includeMetadata: boolean;
  includeChanges: boolean;
  dateFormat?: string;
  timezone?: string;
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  reportId: string;
  tenantId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  summary: {
    totalActions: number;
    uniqueUsers: number;
    dataAccessCount: number;
    sensitiveDataAccess: number;
    failedOperations: number;
    criticalActions: number;
  };
  dataAccessLog: {
    userId: string;
    userName?: string;
    accessedEntities: {
      entityType: AuditEntityType;
      entityId: string;
      accessCount: number;
      lastAccessed: Date;
    }[];
  }[];
  securityEvents: {
    timestamp: Date;
    event: string;
    userId: string;
    details: string;
  }[];
  gdprEvents: {
    type: 'access_request' | 'deletion_request' | 'export_request' | 'consent_change';
    timestamp: Date;
    subjectId: string;
    status: string;
  }[];
}

/**
 * Real-time audit event
 */
export interface RealTimeAuditEvent {
  type: 'new_entry' | 'bulk_insert' | 'alert';
  entry?: AuditLogEntry;
  count?: number;
  alert?: {
    severity: 'warning' | 'critical';
    message: string;
    action: AuditAction;
    userId: string;
  };
}

/**
 * Audit alert rule
 */
export interface AuditAlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    actions?: AuditAction[];
    entityTypes?: AuditEntityType[];
    userIds?: string[];
    threshold?: number; // Actions per time window
    timeWindow?: number; // In minutes
    successOnly?: boolean;
    failureOnly?: boolean;
  };
  severity: 'warning' | 'critical';
  notifyChannels: ('email' | 'slack' | 'webhook')[];
  notifyUsers: string[];
  isActive: boolean;
  cooldown: number; // Minutes between alerts
  lastTriggered?: Date;
}
