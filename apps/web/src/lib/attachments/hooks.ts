'use client';

/**
 * Attachment Hooks - React Query Hooks for File Attachments
 *
 * Provides data fetching and mutation hooks for the file attachment system.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api';
import { useTenantValidation } from '@/lib/tenant';

import {
  type Attachment,
  type AttachmentEntityType,
  type AttachmentListResponse,
  type PresignedUrlResponse,
  type DownloadUrlResponse,
  type AttachmentResponse,
  type ConfirmUploadResponse,
  type UpdateAttachmentDTO,
  type UploadProgress,
  type FileCategory,
  type FileAccessLevel,
} from './types';
import {
  validateFiles,
  getFileCategory,
  createUploadId,
  type FileValidationError,
} from './utils';

// ============================================
// Query Keys
// ============================================

export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  list: (entityType: AttachmentEntityType, entityId: string) =>
    [...attachmentKeys.lists(), entityType, entityId] as const,
  details: () => [...attachmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...attachmentKeys.details(), id] as const,
  download: (id: string) => [...attachmentKeys.all, 'download', id] as const,
};

// ============================================
// Attachment Queries
// ============================================

interface UseAttachmentsParams {
  entityType: AttachmentEntityType;
  entityId: string;
  enabled?: boolean;
}

/**
 * Hook to fetch attachments for an entity
 */
export function useAttachments({ entityType, entityId, enabled = true }: UseAttachmentsParams) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: attachmentKeys.list(entityType, entityId),
    queryFn: async () => {
      const response = await apiClient.get<AttachmentListResponse>(
        `/attachments?entityType=${entityType}&entityId=${entityId}`,
        { tenantId: tenantId! }
      );
      return response;
    },
    enabled: enabled && isValid && !!tenantId && !!entityId,
  });
}

/**
 * Hook to fetch a single attachment
 */
export function useAttachment(attachmentId: string) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: attachmentKeys.detail(attachmentId),
    queryFn: async () => {
      const response = await apiClient.get<AttachmentResponse>(`/attachments/${attachmentId}`, {
        tenantId: tenantId!,
      });
      // Extract attachment from wrapped response
      return response.data;
    },
    enabled: isValid && !!tenantId && !!attachmentId,
  });
}

/**
 * Hook to get download URL for an attachment
 */
export function useDownloadUrl(attachmentId: string, enabled = false) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: attachmentKeys.download(attachmentId),
    queryFn: async () => {
      const response = await apiClient.get<DownloadUrlResponse>(
        `/attachments/${attachmentId}/download-url`,
        { tenantId: tenantId! }
      );
      // Extract download data from wrapped response
      return response.data;
    },
    enabled: enabled && isValid && !!tenantId && !!attachmentId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================
// Upload Mutation with Progress
// ============================================

interface UploadAttachmentOptions {
  entityType: AttachmentEntityType;
  entityId: string;
  category?: FileCategory;
  description?: string;
  accessLevel?: FileAccessLevel;
  tags?: string[];
  onProgress?: (progress: number) => void;
}

/**
 * Hook to upload a single attachment with progress tracking
 */
export function useUploadAttachment() {
  const { tenantId } = useTenantValidation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      options,
    }: {
      file: File;
      options: UploadAttachmentOptions;
    }): Promise<Attachment> => {
      // Step 1: Get presigned URL (backend wraps in {success, data})
      const presignedResponse = await apiClient.post<PresignedUrlResponse>(
        '/attachments/upload-url',
        {
          entityType: options.entityType,
          entityId: options.entityId,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          category: options.category || getFileCategory(file),
        },
        { tenantId: tenantId! }
      );

      // Extract data from wrapped response
      const presignedData = presignedResponse.data;
      if (!presignedData?.uploadUrl || !presignedData?.fileId) {
        throw new Error('Invalid presigned URL response from server');
      }

      // Step 2: Upload file directly to storage using presigned URL
      const uploadResponse = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      // Step 3: Confirm upload completed - returns the complete attachment with storageUrl
      const confirmResponse = await apiClient.post<ConfirmUploadResponse>(
        `/attachments/${presignedData.fileId}/confirm`,
        {},
        { tenantId: tenantId! }
      );

      // Confirm now returns the complete attachment with storageUrl populated
      if (!confirmResponse.data) {
        throw new Error('Failed to confirm upload');
      }

      return confirmResponse.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate attachments list for the entity
      void queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(variables.options.entityType, variables.options.entityId),
      });
    },
  });
}

/**
 * Hook to upload multiple files with progress tracking
 */
export function useUploadMultipleAttachments() {
  const { tenantId } = useTenantValidation();
  const queryClient = useQueryClient();
  const uploadSingle = useUploadAttachment();

  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = useCallback(
    async (
      files: File[],
      options: UploadAttachmentOptions
    ): Promise<{
      successful: Attachment[];
      failed: FileValidationError[];
    }> => {
      // Validate files first
      const { validFiles, errors } = validateFiles(files);

      if (validFiles.length === 0) {
        return { successful: [], failed: errors };
      }

      setIsUploading(true);

      // Initialize upload tracking
      const initialUploads = new Map<string, UploadProgress>();
      validFiles.forEach((file) => {
        const id = createUploadId();
        initialUploads.set(id, {
          id,
          file,
          progress: 0,
          status: 'pending',
        });
      });
      setUploads(initialUploads);

      // Upload files sequentially to avoid overwhelming the server
      const successful: Attachment[] = [];
      const uploadArray = Array.from(initialUploads.entries());

      for (const [id, upload] of uploadArray) {
        try {
          // Update status to uploading
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(id, { ...upload, status: 'uploading', progress: 10 });
            return next;
          });

          // Perform upload
          const attachment = await uploadSingle.mutateAsync({
            file: upload.file,
            options,
          });

          // Update status to success
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(id, {
              ...upload,
              status: 'success',
              progress: 100,
              attachment,
            });
            return next;
          });

          successful.push(attachment);
        } catch (error) {
          // Update status to error
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(id, {
              ...upload,
              status: 'error',
              progress: 0,
              error: error instanceof Error ? error.message : 'Upload failed',
            });
            return next;
          });

          errors.push({
            file: upload.file,
            code: 'INVALID_EXTENSION',
            message: error instanceof Error ? error.message : 'Upload failed',
          });
        }
      }

      setIsUploading(false);

      // Invalidate queries if any successful uploads
      if (successful.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: attachmentKeys.list(options.entityType, options.entityId),
        });
      }

      return { successful, failed: errors };
    },
    [uploadSingle, queryClient, tenantId]
  );

  const clearUploads = useCallback(() => {
    setUploads(new Map());
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  return {
    uploadFiles,
    uploads: Array.from(uploads.values()),
    isUploading,
    clearUploads,
    removeUpload,
  };
}

// ============================================
// Attachment Mutations
// ============================================

/**
 * Hook to update attachment metadata
 */
export function useUpdateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      data,
    }: {
      attachmentId: string;
      data: UpdateAttachmentDTO;
    }) => {
      const response = await apiClient.patch<AttachmentResponse>(`/attachments/${attachmentId}`, data);
      // Extract attachment from wrapped response
      if (!response.data) {
        throw new Error('Failed to update attachment');
      }
      return response.data;
    },
    onSuccess: (attachment) => {
      void queryClient.invalidateQueries({
        queryKey: attachmentKeys.detail(attachment.id),
      });
      void queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(attachment.entityType, attachment.entityId),
      });
    },
  });
}

/**
 * Hook to delete an attachment
 */
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      entityType,
      entityId,
    }: {
      attachmentId: string;
      entityType: AttachmentEntityType;
      entityId: string;
    }) => {
      await apiClient.delete(`/attachments/${attachmentId}`);
      return { attachmentId, entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => {
      void queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(entityType, entityId),
      });
    },
  });
}

/**
 * Hook to copy an attachment to another entity
 */
export function useCopyAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      targetEntityType,
      targetEntityId,
    }: {
      attachmentId: string;
      targetEntityType: AttachmentEntityType;
      targetEntityId: string;
    }) => {
      const response = await apiClient.post<AttachmentResponse>(`/attachments/${attachmentId}/copy`, {
        entityType: targetEntityType,
        entityId: targetEntityId,
      });
      // Extract attachment from wrapped response
      if (!response.data) {
        throw new Error('Failed to copy attachment');
      }
      return response.data;
    },
    onSuccess: (attachment) => {
      void queryClient.invalidateQueries({
        queryKey: attachmentKeys.list(attachment.entityType, attachment.entityId),
      });
    },
  });
}

// ============================================
// Download Helpers
// ============================================

/**
 * Hook to download an attachment
 */
export function useDownloadAttachment() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      attachmentId,
      fileName,
    }: {
      attachmentId: string;
      fileName: string;
    }) => {
      // Get download URL (backend wraps in {success, data})
      const response = await apiClient.get<DownloadUrlResponse>(
        `/attachments/${attachmentId}/download-url`,
        { tenantId: tenantId! }
      );

      // Extract data from wrapped response
      const downloadData = response.data;
      if (!downloadData?.downloadUrl) {
        throw new Error('Failed to get download URL');
      }

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadData.downloadUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return downloadData;
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for attachment management on an entity
 */
export function useEntityAttachments(entityType: AttachmentEntityType, entityId: string) {
  const attachments = useAttachments({ entityType, entityId });
  const multiUpload = useUploadMultipleAttachments();
  const deleteAttachment = useDeleteAttachment();
  const downloadAttachment = useDownloadAttachment();

  const handleDelete = useCallback(
    async (attachmentId: string) => {
      await deleteAttachment.mutateAsync({ attachmentId, entityType, entityId });
    },
    [deleteAttachment, entityType, entityId]
  );

  const handleDownload = useCallback(
    async (attachment: Attachment) => {
      await downloadAttachment.mutateAsync({
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      });
    },
    [downloadAttachment]
  );

  // Extract data from backend response structure
  const attachmentData = attachments.data?.data;
  const paginationData = attachmentData ? {
    page: attachmentData.page,
    limit: attachmentData.limit,
    total: attachmentData.total,
    totalPages: attachmentData.totalPages,
  } : undefined;

  return {
    // Data - extract from nested backend response
    attachments: attachmentData?.attachments || [],
    pagination: paginationData,

    // Loading states
    isLoading: attachments.isLoading,
    isUploading: multiUpload.isUploading,
    isDeleting: deleteAttachment.isPending,
    isDownloading: downloadAttachment.isPending,

    // Upload state
    uploads: multiUpload.uploads,

    // Actions
    upload: (files: File[], options?: Partial<UploadAttachmentOptions>) =>
      multiUpload.uploadFiles(files, { entityType, entityId, ...options }),
    deleteAttachment: handleDelete,
    downloadAttachment: handleDownload,
    clearUploads: multiUpload.clearUploads,
    removeUpload: multiUpload.removeUpload,

    // Query functions
    refetch: attachments.refetch,

    // Errors
    error: attachments.error,
  };
}

/**
 * Hook for all attachment mutations (for use in forms)
 */
export function useAttachmentMutations() {
  const uploadSingle = useUploadAttachment();
  const uploadMultiple = useUploadMultipleAttachments();
  const updateAttachment = useUpdateAttachment();
  const deleteAttachment = useDeleteAttachment();
  const copyAttachment = useCopyAttachment();
  const downloadAttachment = useDownloadAttachment();

  const isLoading =
    uploadSingle.isPending ||
    uploadMultiple.isUploading ||
    updateAttachment.isPending ||
    deleteAttachment.isPending ||
    copyAttachment.isPending ||
    downloadAttachment.isPending;

  return {
    uploadSingle: uploadSingle.mutateAsync,
    uploadMultiple: uploadMultiple.uploadFiles,
    update: updateAttachment.mutateAsync,
    delete: deleteAttachment.mutateAsync,
    copy: copyAttachment.mutateAsync,
    download: downloadAttachment.mutateAsync,
    isLoading,
    uploads: uploadMultiple.uploads,
    clearUploads: uploadMultiple.clearUploads,
    removeUpload: uploadMultiple.removeUpload,
  };
}
