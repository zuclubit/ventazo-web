/**
 * Attachment Utilities - Helper Functions
 *
 * Utility functions for file validation, formatting, and categorization.
 */

import {
  type FileCategory,
  type FileValidationError,
  type FileValidationErrorCode,
  type Attachment,
  MAX_FILE_SIZE,
  MAX_FILENAME_LENGTH,
  ALL_ALLOWED_MIME_TYPES,
  EXTENSION_CATEGORY_MAP,
  FILE_TYPE_LABELS,
  CATEGORY_COLORS,
} from './types';

// ============================================
// FILE VALIDATION
// ============================================

/**
 * Validate a single file against size and type constraints
 */
export function validateFile(file: File): FileValidationError | null {
  // Check if file is empty
  if (file.size === 0) {
    return {
      file,
      code: 'FILE_EMPTY',
      message: 'El archivo está vacío',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      file,
      code: 'SIZE_EXCEEDED',
      message: `El archivo excede el límite de ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  // Check filename length
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return {
      file,
      code: 'NAME_TOO_LONG',
      message: `El nombre del archivo excede ${MAX_FILENAME_LENGTH} caracteres`,
    };
  }

  // Check MIME type
  if (!ALL_ALLOWED_MIME_TYPES.includes(file.type)) {
    const extension = getFileExtension(file.name);
    // Also check by extension as a fallback
    if (!Object.keys(EXTENSION_CATEGORY_MAP).includes(extension.toLowerCase())) {
      return {
        file,
        code: 'TYPE_NOT_ALLOWED',
        message: `Tipo de archivo no permitido: ${file.type || extension}`,
      };
    }
  }

  return null;
}

/**
 * Validate multiple files, returning all errors
 */
export function validateFiles(files: File[]): {
  validFiles: File[];
  errors: FileValidationError[];
} {
  const validFiles: File[] = [];
  const errors: FileValidationError[] = [];

  // Check for duplicates
  const seenNames = new Set<string>();

  for (const file of files) {
    // Check duplicate
    if (seenNames.has(file.name)) {
      errors.push({
        file,
        code: 'DUPLICATE_FILE',
        message: 'Archivo duplicado',
      });
      continue;
    }
    seenNames.add(file.name);

    // Validate file
    const error = validateFile(file);
    if (error) {
      errors.push(error);
    } else {
      validFiles.push(file);
    }
  }

  return { validFiles, errors };
}

// ============================================
// FILE FORMATTING
// ============================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Get human-readable file type label
 */
export function getFileTypeLabel(mimeType: string): string {
  return FILE_TYPE_LABELS[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'Archivo';
}

/**
 * Format date for display
 */
export function formatAttachmentDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hoy';
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

// ============================================
// FILE CATEGORIZATION
// ============================================

/**
 * Determine file category from MIME type or extension
 */
export function getFileCategory(file: File | { mimeType: string; fileName: string }): FileCategory {
  const mimeType = 'type' in file ? file.type : file.mimeType;
  const fileName = 'name' in file ? file.name : file.fileName;
  const extension = getFileExtension(fileName).toLowerCase();

  // Check by MIME type first
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return 'spreadsheet';
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return 'presentation';
  }
  if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
    return 'document';
  }

  // Fallback to extension mapping
  return EXTENSION_CATEGORY_MAP[extension] || 'other';
}

/**
 * Check if file is previewable (images, PDFs, videos, audio)
 */
export function isPreviewable(attachment: Attachment): boolean {
  const { mimeType, category } = attachment;

  // Images are always previewable
  if (category === 'image' || mimeType.startsWith('image/')) {
    return true;
  }

  // PDFs are previewable
  if (mimeType === 'application/pdf') {
    return true;
  }

  // Videos are previewable
  if (category === 'video' || mimeType.startsWith('video/')) {
    return true;
  }

  // Audio is previewable
  if (category === 'audio' || mimeType.startsWith('audio/')) {
    return true;
  }

  return attachment.previewAvailable;
}

/**
 * Check if file is an image
 */
export function isImage(file: File | Attachment): boolean {
  const mimeType = 'type' in file ? file.type : file.mimeType;
  return mimeType.startsWith('image/');
}

/**
 * Check if file is a video
 */
export function isVideo(file: File | Attachment): boolean {
  const mimeType = 'type' in file ? file.type : file.mimeType;
  return mimeType.startsWith('video/');
}

/**
 * Check if file is audio
 */
export function isAudio(file: File | Attachment): boolean {
  const mimeType = 'type' in file ? file.type : file.mimeType;
  return mimeType.startsWith('audio/');
}

/**
 * Get color class for category badge
 */
export function getCategoryColorClass(category: FileCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

// ============================================
// FILE ICON UTILITIES
// ============================================

/** File icon color mapping by extension with dark mode support */
export const FILE_ICON_COLORS: Record<string, string> = {
  // Documents - Blue tones
  pdf: 'bg-red-500 dark:bg-red-600',
  doc: 'bg-blue-600 dark:bg-blue-700',
  docx: 'bg-blue-600 dark:bg-blue-700',
  txt: 'bg-slate-500 dark:bg-slate-600',
  md: 'bg-slate-600 dark:bg-slate-700',
  rtf: 'bg-blue-400 dark:bg-blue-500',

  // Spreadsheets - Green tones
  xls: 'bg-green-600 dark:bg-green-700',
  xlsx: 'bg-green-600 dark:bg-green-700',
  csv: 'bg-green-500 dark:bg-green-600',
  ods: 'bg-green-400 dark:bg-green-500',

  // Presentations - Orange tones
  ppt: 'bg-orange-500 dark:bg-orange-600',
  pptx: 'bg-orange-500 dark:bg-orange-600',
  odp: 'bg-orange-400 dark:bg-orange-500',

  // Images - Purple tones
  jpg: 'bg-purple-500 dark:bg-purple-600',
  jpeg: 'bg-purple-500 dark:bg-purple-600',
  png: 'bg-purple-600 dark:bg-purple-700',
  gif: 'bg-purple-400 dark:bg-purple-500',
  webp: 'bg-purple-500 dark:bg-purple-600',
  svg: 'bg-purple-700 dark:bg-purple-800',

  // Videos - Pink tones
  mp4: 'bg-pink-500 dark:bg-pink-600',
  webm: 'bg-pink-500 dark:bg-pink-600',
  mov: 'bg-pink-400 dark:bg-pink-500',
  avi: 'bg-pink-600 dark:bg-pink-700',

  // Audio - Amber tones
  mp3: 'bg-amber-500 dark:bg-amber-600',
  wav: 'bg-amber-500 dark:bg-amber-600',
  ogg: 'bg-amber-400 dark:bg-amber-500',

  // Default
  default: 'bg-slate-400 dark:bg-slate-500',
};

/**
 * Get icon color class for file extension
 */
export function getFileIconColor(extension: string): string {
  return FILE_ICON_COLORS[extension.toLowerCase()] || FILE_ICON_COLORS.default;
}

/**
 * Get short extension label (max 4 chars)
 */
export function getExtensionLabel(extension: string): string {
  const ext = extension.toUpperCase();
  return ext.length > 4 ? ext.slice(0, 4) : ext;
}

// ============================================
// DRAG & DROP UTILITIES
// ============================================

/**
 * Extract files from a DataTransfer object (drag & drop or paste)
 */
export function getFilesFromDataTransfer(dataTransfer: DataTransfer): File[] {
  const files: File[] = [];

  if (dataTransfer.items) {
    // Use DataTransferItemList interface
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  } else {
    // Fallback to DataTransfer.files
    for (let i = 0; i < dataTransfer.files.length; i++) {
      files.push(dataTransfer.files[i]);
    }
  }

  return files;
}

/**
 * Create a unique ID for tracking uploads
 */
export function createUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// IMAGE UTILITIES
// ============================================

/**
 * Create a thumbnail preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Not an image file'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Revoke object URL to prevent memory leaks
 */
export function revokeImagePreview(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

// ============================================
// ACCESSIBILITY UTILITIES
// ============================================

/**
 * Get aria-label for attachment
 */
export function getAttachmentAriaLabel(attachment: Attachment): string {
  const size = formatFileSize(attachment.fileSize);
  const date = formatAttachmentDate(attachment.createdAt);
  return `${attachment.originalName}, ${getFileTypeLabel(attachment.mimeType)}, ${size}, subido ${date}`;
}

/**
 * Get screen reader announcement for upload status
 */
export function getUploadStatusAnnouncement(
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'error',
  fileName: string,
  progress?: number
): string {
  switch (status) {
    case 'pending':
      return `${fileName} en cola para subir`;
    case 'uploading':
      return progress !== undefined
        ? `Subiendo ${fileName}, ${progress}% completado`
        : `Subiendo ${fileName}`;
    case 'processing':
      return `Procesando ${fileName}`;
    case 'success':
      return `${fileName} subido exitosamente`;
    case 'error':
      return `Error al subir ${fileName}`;
  }
}
