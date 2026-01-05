/**
 * Data Management Module Types
 * Types for export, import, and storage operations
 */

// ============================================
// Export Types
// ============================================

export type ExportFormat = 'json' | 'csv' | 'xlsx';
export type ExportEntity = 'leads' | 'customers' | 'opportunities' | 'tasks' | 'contacts' | 'all';
export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface CreateExportRequest {
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
  status: ExportStatus;
  progress: number;
  entities: ExportEntity[];
  format: ExportFormat;
  downloadUrl?: string;
  expiresAt?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

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
// Import Types
// ============================================

export type ImportMode = 'merge' | 'replace' | 'skip';
export type ImportStatus = 'validating' | 'processing' | 'completed' | 'failed';
export type ImportEntityType = 'leads' | 'customers' | 'opportunities' | 'tasks' | 'contacts';

export interface CreateImportRequest {
  entityType: ImportEntityType;
  mode: ImportMode;
  validateOnly?: boolean;
}

export interface ImportJob {
  id: string;
  status: ImportStatus;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
  createdAt: string;
  completedAt?: string;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

// ============================================
// Storage Types
// ============================================

export interface StorageStats {
  totalUsed: number;
  totalQuota: number;
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
// Delete Types
// ============================================

export type DeleteScope = 'soft' | 'hard';

export interface DeleteDataRequest {
  confirmation: string;
  scope: DeleteScope;
  entities?: ImportEntityType[];
}

export interface DeleteDataResponse {
  success: boolean;
  deletedCounts: Record<string, number>;
  message: string;
}
