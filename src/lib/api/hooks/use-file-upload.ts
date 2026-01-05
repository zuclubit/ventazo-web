// ============================================
// File Upload Hook - FASE 5.11
// Standardized file upload utilities
// ============================================

'use client';

import * as React from 'react';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

import { toast } from '@/hooks/use-toast';

import { useCurrentTenantId } from '@/store';

import { ApiError, API_BASE_URL } from '../api-client';
import { getValidAccessToken } from '@/lib/auth/token-manager';

// ============================================
// Types
// ============================================

export interface FileUploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[]; // MIME types
  allowedExtensions?: string[]; // file extensions
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult<T = unknown> {
  data: T;
  file: File;
}

export interface UseFileUploadOptions<TResponse> {
  endpoint: string;
  fieldName?: string;
  additionalData?: Record<string, string>;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (data: TResponse) => void;
  onError?: (error: Error) => void;
  invalidateKeys?: QueryKey[];
  validation?: FileUploadOptions;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

// ============================================
// Validation
// ============================================

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function validateFile(
  file: File,
  options: FileUploadOptions = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes,
    allowedExtensions,
  } = options;

  // Check size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo de ${maxSizeMB}MB`,
    };
  }

  // Check MIME type
  if (allowedTypes && allowedTypes.length > 0) {
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Tipo de archivo no permitido. Se permiten: ${allowedTypes.join(', ')}`,
      };
    }
  }

  // Check extension
  if (allowedExtensions && allowedExtensions.length > 0) {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(`.${extension}`)) {
      return {
        valid: false,
        error: `Extensión no permitida. Se permiten: ${allowedExtensions.join(', ')}`,
      };
    }
  }

  return { valid: true };
}

// ============================================
// Upload Function
// ============================================

async function uploadFile<TResponse>(
  file: File,
  endpoint: string,
  options: {
    tenantId?: string;
    fieldName?: string;
    additionalData?: Record<string, string>;
    onProgress?: (progress: UploadProgress) => void;
  } = {}
): Promise<TResponse> {
  const {
    tenantId,
    fieldName = 'file',
    additionalData = {},
    onProgress,
  } = options;

  const formData = new FormData();
  formData.append(fieldName, file);

  // Add additional form fields
  Object.entries(additionalData).forEach(([key, value]) => {
    formData.append(key, value);
  });

  // Build headers
  const headers: Record<string, string> = {};

  // Add auth token
  const token = await getValidAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add tenant ID
  if (tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  // Build full URL
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response as TResponse);
        } catch {
          resolve(xhr.responseText as unknown as TResponse);
        }
      } else {
        let errorData: unknown;
        try {
          errorData = JSON.parse(xhr.responseText);
        } catch {
          errorData = xhr.responseText;
        }
        reject(new ApiError(xhr.status, xhr.statusText, errorData));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Error de red al subir el archivo'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Carga de archivo cancelada'));
    });

    xhr.open('POST', url);

    // Set headers (but not Content-Type - let the browser set it with boundary)
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.send(formData);
  });
}

// ============================================
// File Upload Hook
// ============================================

/**
 * Hook for uploading files with progress tracking
 */
export function useFileUpload<TResponse = unknown>(
  options: UseFileUploadOptions<TResponse>
) {
  const queryClient = useQueryClient();
  const tenantId = useCurrentTenantId();
  const [progress, setProgress] = React.useState<UploadProgress | null>(null);

  const {
    endpoint,
    fieldName = 'file',
    additionalData,
    onProgress,
    onSuccess,
    onError,
    invalidateKeys,
    validation,
    showToast = true,
    successMessage = 'Archivo subido exitosamente',
    errorMessage = 'Error al subir el archivo',
  } = options;

  const mutation = useMutation<TResponse, Error, File>({
    mutationFn: async (file: File) => {
      // Validate file
      const validationResult = validateFile(file, validation);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Upload with progress
      return uploadFile<TResponse>(file, endpoint, {
        tenantId: tenantId ?? undefined,
        fieldName,
        additionalData,
        onProgress: (prog) => {
          setProgress(prog);
          onProgress?.(prog);
        },
      });
    },
    onSuccess: (data) => {
      setProgress(null);

      // Invalidate queries
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          void queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Show toast
      if (showToast) {
        toast({
          title: 'Exito',
          description: successMessage,
        });
      }

      // Call user callback
      onSuccess?.(data);
    },
    onError: (error) => {
      setProgress(null);

      // Show toast
      if (showToast) {
        toast({
          title: 'Error',
          description: error.message || errorMessage,
          variant: 'destructive',
        });
      }

      // Call user callback
      onError?.(error);
    },
  });

  const upload = React.useCallback(
    (file: File) => {
      mutation.mutate(file);
    },
    [mutation]
  );

  const uploadAsync = React.useCallback(
    (file: File) => {
      return mutation.mutateAsync(file);
    },
    [mutation]
  );

  const reset = React.useCallback(() => {
    setProgress(null);
    mutation.reset();
  }, [mutation]);

  return {
    upload,
    uploadAsync,
    reset,
    isUploading: mutation.isPending,
    progress,
    error: mutation.error,
    data: mutation.data,
  };
}

// ============================================
// Multiple Files Upload Hook
// ============================================

interface UseMultipleFileUploadOptions<TResponse> extends Omit<UseFileUploadOptions<TResponse>, 'onSuccess'> {
  maxFiles?: number;
  onFileSuccess?: (data: TResponse, file: File) => void;
  onAllComplete?: (results: FileUploadResult<TResponse>[]) => void;
}

/**
 * Hook for uploading multiple files
 */
export function useMultipleFileUpload<TResponse = unknown>(
  options: UseMultipleFileUploadOptions<TResponse>
) {
  const {
    maxFiles = 10,
    onFileSuccess,
    onAllComplete,
    ...uploadOptions
  } = options;

  const [files, setFiles] = React.useState<File[]>([]);
  const [results, setResults] = React.useState<FileUploadResult<TResponse>[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const { upload, uploadAsync, isUploading, progress, error, reset: resetUpload } = useFileUpload<TResponse>({
    ...uploadOptions,
    showToast: false,
    onSuccess: undefined,
  });

  const uploadFiles = React.useCallback(
    async (newFiles: File[]) => {
      if (newFiles.length > maxFiles) {
        toast({
          title: 'Error',
          description: `Máximo ${maxFiles} archivos permitidos`,
          variant: 'destructive',
        });
        return;
      }

      setFiles(newFiles);
      setResults([]);
      setCurrentIndex(0);

      const uploadResults: FileUploadResult<TResponse>[] = [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (!file) continue;

        setCurrentIndex(i);

        try {
          const data = await uploadAsync(file);
          uploadResults.push({ data, file });
          onFileSuccess?.(data, file);
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          // Continue with other files
        }
      }

      setResults(uploadResults);
      onAllComplete?.(uploadResults);

      if (uploadResults.length === newFiles.length) {
        toast({
          title: 'Exito',
          description: `${uploadResults.length} archivos subidos exitosamente`,
        });
      } else {
        toast({
          title: 'Advertencia',
          description: `${uploadResults.length} de ${newFiles.length} archivos subidos`,
        });
      }
    },
    [maxFiles, uploadAsync, onFileSuccess, onAllComplete]
  );

  const reset = React.useCallback(() => {
    setFiles([]);
    setResults([]);
    setCurrentIndex(0);
    resetUpload();
  }, [resetUpload]);

  return {
    uploadFiles,
    reset,
    isUploading,
    progress,
    error,
    files,
    results,
    currentIndex,
    totalFiles: files.length,
  };
}

// ============================================
// Image Upload Hook (Specialized)
// ============================================

interface UseImageUploadOptions<TResponse> extends Omit<UseFileUploadOptions<TResponse>, 'validation'> {
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * Specialized hook for uploading images
 */
export function useImageUpload<TResponse = { url: string }>(
  options: UseImageUploadOptions<TResponse>
) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default for images
    allowedTypes = DEFAULT_IMAGE_TYPES,
    ...uploadOptions
  } = options;

  return useFileUpload<TResponse>({
    ...uploadOptions,
    validation: {
      maxSize,
      allowedTypes,
    },
  });
}

// ============================================
// Document Upload Hook (Specialized)
// ============================================

interface UseDocumentUploadOptions<TResponse> extends Omit<UseFileUploadOptions<TResponse>, 'validation'> {
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * Specialized hook for uploading documents
 */
export function useDocumentUpload<TResponse = { url: string; filename: string }>(
  options: UseDocumentUploadOptions<TResponse>
) {
  const {
    maxSize = 25 * 1024 * 1024, // 25MB default for documents
    allowedTypes = [...DEFAULT_IMAGE_TYPES, ...DEFAULT_DOCUMENT_TYPES],
    ...uploadOptions
  } = options;

  return useFileUpload<TResponse>({
    ...uploadOptions,
    validation: {
      maxSize,
      allowedTypes,
    },
  });
}

// ============================================
// Exports
// ============================================

export {
  DEFAULT_MAX_SIZE,
  DEFAULT_IMAGE_TYPES,
  DEFAULT_DOCUMENT_TYPES,
  uploadFile,
};
