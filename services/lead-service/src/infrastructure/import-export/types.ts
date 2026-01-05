/**
 * Import/Export Types
 * Defines types for lead data import and export operations
 */

/**
 * Supported import formats
 */
export enum ImportFormat {
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
}

/**
 * Supported export formats
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XLSX = 'xlsx',
}

/**
 * Column mapping for CSV import
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'phone' | 'email' | 'date';
  defaultValue?: string;
  required?: boolean;
}

/**
 * Import configuration
 */
export interface ImportConfig {
  format: ImportFormat;
  columnMappings: ColumnMapping[];
  skipFirstRow?: boolean;
  skipDuplicates?: boolean;
  duplicateCheckFields?: ('email' | 'companyName' | 'phone')[];
  defaultSource?: string;
  defaultOwnerId?: string;
  batchSize?: number;
  dryRun?: boolean;
}

/**
 * Import job status
 */
export enum ImportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Import job record
 */
export interface ImportJob {
  id: string;
  tenantId: string;
  status: ImportJobStatus;
  config: ImportConfig;
  fileName: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: ImportError[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

/**
 * Import error record
 */
export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  message: string;
}

/**
 * Import result for a single row
 */
export interface ImportRowResult {
  row: number;
  success: boolean;
  leadId?: string;
  isDuplicate?: boolean;
  errors?: ImportError[];
}

/**
 * Overall import result
 */
export interface ImportResult {
  jobId: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  errors: ImportError[];
  leadIds: string[];
  duration: number;
}

/**
 * Export configuration
 */
export interface ExportConfig {
  format: ExportFormat;
  fields?: string[];
  filters?: ExportFilters;
  includeCustomFields?: boolean;
  dateFormat?: string;
  delimiter?: string;
}

/**
 * Export filters
 */
export interface ExportFilters {
  status?: string[];
  source?: string[];
  ownerId?: string[];
  industry?: string[];
  scoreMin?: number;
  scoreMax?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}

/**
 * Export job status
 */
export enum ExportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Export job record
 */
export interface ExportJob {
  id: string;
  tenantId: string;
  status: ExportJobStatus;
  config: ExportConfig;
  totalRecords: number;
  exportedRecords: number;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  expiresAt?: Date;
  error?: string;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Field definition for export
 */
export interface ExportFieldDefinition {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  format?: string;
}

/**
 * Default exportable fields
 */
export const DEFAULT_EXPORT_FIELDS: ExportFieldDefinition[] = [
  { field: 'id', label: 'ID', type: 'string' },
  { field: 'companyName', label: 'Company Name', type: 'string' },
  { field: 'email', label: 'Email', type: 'string' },
  { field: 'phone', label: 'Phone', type: 'string' },
  { field: 'website', label: 'Website', type: 'string' },
  { field: 'industry', label: 'Industry', type: 'string' },
  { field: 'employeeCount', label: 'Employee Count', type: 'number' },
  { field: 'annualRevenue', label: 'Annual Revenue', type: 'number' },
  { field: 'status', label: 'Status', type: 'string' },
  { field: 'score', label: 'Score', type: 'number' },
  { field: 'source', label: 'Source', type: 'string' },
  { field: 'ownerId', label: 'Owner ID', type: 'string' },
  { field: 'notes', label: 'Notes', type: 'string' },
  { field: 'createdAt', label: 'Created At', type: 'date' },
  { field: 'updatedAt', label: 'Updated At', type: 'date' },
  { field: 'lastActivityAt', label: 'Last Activity', type: 'date' },
  { field: 'nextFollowUpAt', label: 'Next Follow-up', type: 'date' },
];

/**
 * CSV parse options
 */
export interface CsvParseOptions {
  delimiter?: string;
  quote?: string;
  escape?: string;
  skipEmptyLines?: boolean;
  trimFields?: boolean;
}

/**
 * Standard field mappings for common CRM imports
 */
export const COMMON_FIELD_MAPPINGS: Record<string, string[]> = {
  companyName: ['company', 'company_name', 'company name', 'organization', 'org', 'account'],
  email: ['email', 'e-mail', 'email_address', 'email address', 'contact_email'],
  phone: ['phone', 'telephone', 'tel', 'phone_number', 'phone number', 'contact_phone'],
  website: ['website', 'web', 'url', 'homepage', 'company_website'],
  industry: ['industry', 'sector', 'vertical', 'business_type'],
  source: ['source', 'lead_source', 'lead source', 'origin', 'channel'],
  notes: ['notes', 'description', 'comments', 'remarks'],
  employeeCount: ['employees', 'employee_count', 'company_size', 'size'],
  annualRevenue: ['revenue', 'annual_revenue', 'yearly_revenue'],
};
