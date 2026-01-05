'use client';

/**
 * Data Management Hooks
 * React Query hooks for export, import, and storage operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useTenantValidation } from '@/lib/tenant';

import type {
  CreateExportRequest,
  ExportJob,
  ExportHistoryItem,
  ImportJob,
  StorageStats,
  DeleteDataRequest,
  DeleteDataResponse,
} from './types';

// ============================================
// Query Keys
// ============================================

export const dataKeys = {
  all: ['data'] as const,
  export: () => [...dataKeys.all, 'export'] as const,
  exportJob: (id: string) => [...dataKeys.export(), id] as const,
  exportHistory: () => [...dataKeys.export(), 'history'] as const,
  import: () => [...dataKeys.all, 'import'] as const,
  importJob: (id: string) => [...dataKeys.import(), id] as const,
  storage: () => [...dataKeys.all, 'storage'] as const,
};

// ============================================
// Export Queries & Mutations
// ============================================

/**
 * Hook to create an export job
 */
export function useCreateExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExportRequest) => {
      const response = await apiClient.post<ExportJob>('/data/export', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataKeys.exportHistory() });
    },
  });
}

/**
 * Hook to fetch export job status
 */
export function useExportJob(jobId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: dataKeys.exportJob(jobId),
    queryFn: async () => {
      const response = await apiClient.get<ExportJob>(`/data/export/${jobId}`);
      return response;
    },
    enabled: (options?.enabled ?? true) && isValid && !!tenantId && !!jobId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Hook to fetch export history
 */
export function useExportHistory(limit = 50) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: [...dataKeys.exportHistory(), { limit }],
    queryFn: async () => {
      const response = await apiClient.get<ExportHistoryItem[]>(`/data/export/history?limit=${limit}`);
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

/**
 * Hook to cancel an export job
 */
export function useCancelExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiClient.delete<{ success: boolean }>(`/data/export/${jobId}`);
      return response;
    },
    onSuccess: (_, jobId) => {
      void queryClient.invalidateQueries({ queryKey: dataKeys.exportJob(jobId) });
      void queryClient.invalidateQueries({ queryKey: dataKeys.exportHistory() });
    },
  });
}

/**
 * Hook to download export file
 */
export function useDownloadExport() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      // This triggers a redirect to the download URL
      const response = await apiClient.get<ExportJob>(`/data/export/${jobId}`);
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
      return response;
    },
  });
}

// ============================================
// Import Queries & Mutations
// ============================================

/**
 * Hook to create an import job
 */
export function useCreateImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      entityType,
      mode,
      validateOnly,
    }: {
      file: File;
      entityType: string;
      mode: string;
      validateOnly?: boolean;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('mode', mode);
      if (validateOnly !== undefined) {
        formData.append('validateOnly', String(validateOnly));
      }

      // Use fetch directly for multipart form data
      const response = await fetch('/api/proxy/data/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      return (await response.json()) as ImportJob;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dataKeys.storage() });
    },
  });
}

/**
 * Hook to fetch import job status
 */
export function useImportJob(jobId: string, options?: { enabled?: boolean; refetchInterval?: number }) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: dataKeys.importJob(jobId),
    queryFn: async () => {
      const response = await apiClient.get<ImportJob>(`/data/import/${jobId}`);
      return response;
    },
    enabled: (options?.enabled ?? true) && isValid && !!tenantId && !!jobId,
    refetchInterval: options?.refetchInterval,
  });
}

// ============================================
// Storage Queries
// ============================================

/**
 * Hook to fetch storage statistics
 */
export function useStorageStats() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: dataKeys.storage(),
    queryFn: async () => {
      const response = await apiClient.get<StorageStats>('/data/storage/stats');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

// ============================================
// Delete Operations
// ============================================

/**
 * Hook to delete all tenant data
 */
export function useDeleteAllData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteDataRequest) => {
      const response = await apiClient.delete<DeleteDataResponse>('/data/delete-all', {
        // Pass body as query params is not standard, using POST-like delete
      });
      // Actually we need to send the body with DELETE
      const fetchResponse = await fetch('/api/proxy/data/delete-all', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!fetchResponse.ok) {
        throw new Error('Delete failed');
      }

      return (await fetchResponse.json()) as DeleteDataResponse;
    },
    onSuccess: () => {
      // Invalidate all data-related queries
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['contacts'] });
      void queryClient.invalidateQueries({ queryKey: dataKeys.storage() });
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for data management page
 */
export function useDataManagement() {
  const storage = useStorageStats();
  const history = useExportHistory();
  const createExport = useCreateExport();
  const createImport = useCreateImport();
  const deleteAll = useDeleteAllData();

  return {
    // Storage
    storageStats: storage.data,
    isStorageLoading: storage.isLoading,

    // Export History
    exportHistory: history.data || [],
    isHistoryLoading: history.isLoading,

    // Export mutation
    createExport: createExport.mutateAsync,
    isExporting: createExport.isPending,

    // Import mutation
    createImport: createImport.mutateAsync,
    isImporting: createImport.isPending,

    // Delete mutation
    deleteAllData: deleteAll.mutateAsync,
    isDeleting: deleteAll.isPending,

    // Combined loading
    isLoading: storage.isLoading || history.isLoading,

    // Refetch
    refetchAll: () => {
      void storage.refetch();
      void history.refetch();
    },
  };
}

/**
 * Hook for tracking export progress
 */
export function useExportProgress(jobId: string | null) {
  const job = useExportJob(jobId || '', {
    enabled: !!jobId,
    refetchInterval: jobId ? 1000 : undefined, // Poll every second while active
  });

  const isComplete = job.data?.status === 'completed';
  const isFailed = job.data?.status === 'failed';
  const isProcessing = job.data?.status === 'processing' || job.data?.status === 'queued';

  return {
    job: job.data,
    isLoading: job.isLoading,
    isComplete,
    isFailed,
    isProcessing,
    progress: job.data?.progress || 0,
    error: job.data?.error,
    downloadUrl: job.data?.downloadUrl,
  };
}

/**
 * Hook for tracking import progress
 */
export function useImportProgress(jobId: string | null) {
  const job = useImportJob(jobId || '', {
    enabled: !!jobId,
    refetchInterval: jobId ? 1000 : undefined,
  });

  const isComplete = job.data?.status === 'completed';
  const isFailed = job.data?.status === 'failed';
  const isProcessing = job.data?.status === 'processing' || job.data?.status === 'validating';

  return {
    job: job.data,
    isLoading: job.isLoading,
    isComplete,
    isFailed,
    isProcessing,
    progress: job.data?.progress || 0,
    totalRecords: job.data?.totalRecords || 0,
    processedRecords: job.data?.processedRecords || 0,
    successCount: job.data?.successCount || 0,
    errorCount: job.data?.errorCount || 0,
    errors: job.data?.errors || [],
  };
}
