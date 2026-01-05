/**
 * Data Management Module Types
 * Types for data export, import, and storage management
 *
 * @module infrastructure/data-management/types
 */

// ============================================
// Export Types
// ============================================

export type ExportFormat = 'json' | 'csv' | 'xlsx';
export type ExportEntity = 'leads' | 'customers' | 'opportunities' | 'tasks' | 'contacts' | 'all';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ExportJobRequest {
  entities: ExportEntity[];
  format: ExportFormat;
  dateRange?: {
    from: string;
    to: string;
  };
  filters?: Record<string, unknown>;
}

export interface ExportJob {
  id: string;
  tenantId: string;
  userId: string;
  entities: ExportEntity[];
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  fileUrl?: string;
  fileSize?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface ExportJobResponse {
  id: string;
  status: ExportStatus;
  progress: number;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  entities: ExportEntity[];
  format: ExportFormat;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Import Types
// ============================================

export type ImportMode = 'merge' | 'replace' | 'skip';
export type ImportStatus = 'queued' | 'validating' | 'processing' | 'completed' | 'failed';

export interface ImportJobRequest {
  entityType: ExportEntity;
  mode: ImportMode;
  mapping?: Record<string, string>;
  validateOnly?: boolean;
}

export interface ImportJob {
  id: string;
  tenantId: string;
  userId: string;
  entityType: ExportEntity;
  mode: ImportMode;
  status: ImportStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors?: ImportError[];
  mapping?: Record<string, string>;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ImportJobResponse {
  id: string;
  status: ImportStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors?: ImportError[];
  createdAt: string;
  completedAt?: string;
}

export interface ImportValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  errors: ImportError[];
  warnings: string[];
  previewData?: Record<string, unknown>[];
}

// ============================================
// Storage Types
// ============================================

export interface StorageStats {
  totalUsed: number; // bytes
  totalQuota: number; // bytes
  usagePercentage: number;
  breakdown: {
    documents: number;
    attachments: number;
    exports: number;
    other: number;
  };
  lastUpdated: string;
}

// ============================================
// Export History Types
// ============================================

export interface ExportHistoryItem {
  id: string;
  entities: ExportEntity[];
  format: ExportFormat;
  status: ExportStatus;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// Data Deletion Types
// ============================================

export type DeletionScope = 'soft' | 'hard';

export interface DeleteDataRequest {
  confirmation: string; // Must match tenant name
  scope: DeletionScope;
  entities?: ExportEntity[];
}

export interface DeleteDataResponse {
  success: boolean;
  deletedCounts: Record<string, number>;
  message: string;
}
