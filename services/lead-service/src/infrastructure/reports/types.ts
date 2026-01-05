/**
 * Report Export Types
 * Types for generating and exporting reports in various formats
 */

/**
 * Export format options
 */
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

/**
 * Report types
 */
export type ReportType =
  | 'leads'
  | 'pipeline'
  | 'sales'
  | 'activity'
  | 'conversion'
  | 'performance'
  | 'custom';

/**
 * Report status
 */
export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

/**
 * Date range filter
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Report column definition
 */
export interface ReportColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage';
  format?: string;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
}

/**
 * Lead report options
 */
export interface LeadReportOptions {
  // Filters
  status?: string[];
  source?: string[];
  assignedTo?: string[];
  pipelineStage?: string[];
  scoreRange?: { min: number; max: number };
  dateRange?: DateRange;

  // Columns to include
  columns?: string[];

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Grouping
  groupBy?: 'status' | 'source' | 'assignedTo' | 'pipelineStage' | 'month' | 'week';

  // Include summary
  includeSummary?: boolean;
  includeCharts?: boolean;
}

/**
 * Pipeline report options
 */
export interface PipelineReportOptions {
  pipelineId?: string;
  dateRange?: DateRange;
  includeStageMetrics?: boolean;
  includeConversionRates?: boolean;
  includeVelocity?: boolean;
}

/**
 * Sales report options
 */
export interface SalesReportOptions {
  dateRange?: DateRange;
  assignedTo?: string[];
  includeRevenueMetrics?: boolean;
  includeForecast?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'user';
}

/**
 * Activity report options
 */
export interface ActivityReportOptions {
  dateRange?: DateRange;
  activityTypes?: string[];
  userId?: string[];
  includeBreakdown?: boolean;
  groupBy?: 'type' | 'user' | 'day' | 'week';
}

/**
 * Report generation input
 */
export interface GenerateReportInput {
  type: ReportType;
  format: ReportFormat;
  title?: string;
  description?: string;
  options?: LeadReportOptions | PipelineReportOptions | SalesReportOptions | ActivityReportOptions;
}

/**
 * Report job
 */
export interface ReportJob {
  id: string;
  tenantId: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;

  // Configuration
  title?: string;
  description?: string;
  options: Record<string, unknown>;

  // Output
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  checksum?: string;
  expiresAt?: Date;

  // Progress
  progress?: number;
  recordsProcessed?: number;
  totalRecords?: number;

  // Error
  errorMessage?: string;

  // Audit
  createdBy?: string;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

/**
 * Report data structure (for PDF/Excel generation)
 */
export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  tenantId: string;
  reportType: ReportType;

  // Metadata
  filters?: Record<string, unknown>;
  dateRange?: DateRange;

  // Column definitions
  columns: ReportColumn[];

  // Data rows
  rows: Record<string, unknown>[];

  // Summary section
  summary?: {
    totalRecords: number;
    metrics: Array<{
      label: string;
      value: string | number;
      change?: number;
      changeLabel?: string;
    }>;
  };

  // Charts data
  charts?: Array<{
    type: 'bar' | 'line' | 'pie' | 'area';
    title: string;
    data: Array<{
      label: string;
      value: number;
      color?: string;
    }>;
  }>;

  // Groupings
  groups?: Array<{
    name: string;
    rows: Record<string, unknown>[];
    subtotal?: Record<string, number>;
  }>;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  jobId?: string;
  fileName?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  format: ReportFormat;
  error?: string;

  // For inline exports
  data?: Buffer | string;
  mimeType?: string;
}

/**
 * Report template
 */
export interface ReportTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  options: Record<string, unknown>;
  columns?: string[];
  isDefault?: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scheduled report
 */
export interface ScheduledReport {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;

  // Schedule
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  time: string; // HH:mm format
  timezone: string;

  // Delivery
  deliveryMethod: 'email' | 'download' | 'webhook';
  recipients?: string[];
  webhookUrl?: string;

  // Status
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
