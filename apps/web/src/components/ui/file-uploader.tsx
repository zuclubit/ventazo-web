'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
  Paperclip,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileIcon } from '@/components/ui/file-icon';
import {
  type AttachmentEntityType,
  type FileCategory,
  type FileAccessLevel,
  type Attachment,
  type UploadProgress,
  type FileValidationError,
  formatFileSize,
  getFileExtension,
  getFilesFromDataTransfer,
  validateFiles,
  createImagePreview,
  revokeImagePreview,
  getUploadStatusAnnouncement,
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  ALL_ALLOWED_MIME_TYPES,
  useUploadMultipleAttachments,
} from '@/lib/attachments';

/**
 * FileUploader Component - Premium Drag & Drop File Upload
 *
 * Features:
 * - Drag & drop with visual feedback
 * - Multiple file upload with queue
 * - Progress tracking per file
 * - Validation with error display
 * - Image preview support
 * - Keyboard accessible
 * - Screen reader announcements
 */

const fileUploaderVariants = cva(
  // Base dropzone styles - responsive padding
  [
    'relative flex flex-col items-center justify-center',
    'w-full min-h-[120px] sm:min-h-[140px] p-4 sm:p-6',
    'border-2 border-dashed',
    'rounded-xl',
    'transition-all duration-300 ease-out',
    'cursor-pointer touch-manipulation',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default - subtle background
        default: [
          'border-slate-200 dark:border-slate-700',
          'bg-slate-50/50 dark:bg-slate-800/30',
          'hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10',
          'active:bg-primary/10 dark:active:bg-primary/15',
        ].join(' '),

        // Glass - for modals/sheets
        glass: [
          'backdrop-blur-sm',
          'border-slate-200/60 dark:border-slate-600/40',
          'bg-white/80 dark:bg-slate-800/80',
          'hover:border-primary/40 hover:bg-white/90 dark:hover:bg-slate-800/90',
          'active:bg-primary/5 dark:active:bg-primary/10',
          'shadow-sm',
        ].join(' '),

        // Premium - elevated look
        premium: [
          'border-slate-200 dark:border-slate-600',
          'bg-gradient-to-b from-white to-slate-50/80',
          'dark:from-slate-800 dark:to-slate-800/90',
          'hover:border-primary/50 hover:shadow-md',
          'active:shadow-sm',
          'shadow-sm',
        ].join(' '),

        // Minimal - clean underline style
        minimal: [
          'border-0 border-b-2 border-slate-200 dark:border-slate-700',
          'bg-transparent',
          'rounded-none min-h-[80px] sm:min-h-[100px]',
          'hover:border-primary/50',
        ].join(' '),
      },
      size: {
        sm: 'min-h-[80px] sm:min-h-[100px] p-3 sm:p-4 text-sm',
        default: 'min-h-[120px] sm:min-h-[140px] p-4 sm:p-6',
        lg: 'min-h-[150px] sm:min-h-[180px] p-6 sm:p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// States for dropzone
const dropzoneStateClasses = {
  dragging: 'border-primary bg-primary/10 dark:bg-primary/20 scale-[1.02] shadow-lg shadow-primary/10',
  error: 'border-red-400 bg-red-50/50 dark:bg-red-950/20',
  disabled: 'opacity-50 cursor-not-allowed',
};

export interface FileUploaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onDrop'>,
    VariantProps<typeof fileUploaderVariants> {
  /** Entity type for attachments */
  entityType: AttachmentEntityType;
  /** Entity ID for attachments */
  entityId: string;
  /** Maximum number of files (default: 10) */
  maxFiles?: number;
  /** Maximum file size in bytes (default: 50MB) */
  maxFileSize?: number;
  /** Accepted MIME types */
  acceptedTypes?: string[];
  /** Default category for uploads */
  category?: FileCategory;
  /** Default access level */
  accessLevel?: FileAccessLevel;
  /** Disabled state */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Hide the file list */
  hideFileList?: boolean;
  /** Compact mode - single row */
  compact?: boolean;
  /** Callback when uploads complete */
  onUploadComplete?: (attachments: Attachment[]) => void;
  /** Callback when validation errors occur */
  onUploadError?: (errors: FileValidationError[]) => void;
  /** Callback when files are selected (before upload) */
  onFilesChange?: (files: File[]) => void;
}

const FileUploader = React.forwardRef<HTMLDivElement, FileUploaderProps>(
  (
    {
      className,
      variant,
      size,
      entityType,
      entityId,
      maxFiles = MAX_FILES_PER_UPLOAD,
      maxFileSize = MAX_FILE_SIZE,
      acceptedTypes = ALL_ALLOWED_MIME_TYPES,
      category,
      accessLevel = 'team',
      disabled = false,
      error = false,
      hideFileList = false,
      compact = false,
      onUploadComplete,
      onUploadError,
      onFilesChange,
      ...props
    },
    ref
  ) => {
    // Refs
    const inputRef = React.useRef<HTMLInputElement>(null);
    const announceRef = React.useRef<HTMLDivElement>(null);

    // State
    const [isDragging, setIsDragging] = React.useState(false);
    const [previews, setPreviews] = React.useState<Map<string, string>>(new Map());

    // Upload hook
    const { uploadFiles, uploads, isUploading, clearUploads, removeUpload } =
      useUploadMultipleAttachments();

    // Cleanup previews on unmount
    React.useEffect(() => {
      return () => {
        previews.forEach((url) => revokeImagePreview(url));
      };
    }, [previews]);

    // Announce to screen readers
    const announce = React.useCallback((message: string) => {
      if (announceRef.current) {
        announceRef.current.textContent = message;
      }
    }, []);

    // Handle file selection
    const handleFiles = React.useCallback(
      async (files: File[]) => {
        if (disabled || isUploading) return;

        // Limit number of files
        const limitedFiles = files.slice(0, maxFiles);
        onFilesChange?.(limitedFiles);

        // Validate files
        const { validFiles, errors } = validateFiles(limitedFiles);

        if (errors.length > 0) {
          onUploadError?.(errors);
          announce(`${errors.length} archivos con errores`);
        }

        if (validFiles.length === 0) return;

        // Generate previews for images
        const newPreviews = new Map<string, string>();
        for (const file of validFiles) {
          if (file.type.startsWith('image/')) {
            try {
              const preview = await createImagePreview(file);
              newPreviews.set(file.name, preview);
            } catch {
              // Ignore preview errors
            }
          }
        }
        setPreviews(newPreviews);

        announce(`Subiendo ${validFiles.length} archivos`);

        // Upload files
        const result = await uploadFiles(validFiles, {
          entityType,
          entityId,
          category,
          accessLevel,
        });

        if (result.successful.length > 0) {
          onUploadComplete?.(result.successful);
          announce(`${result.successful.length} archivos subidos exitosamente`);
        }

        if (result.failed.length > 0) {
          onUploadError?.(result.failed);
        }
      },
      [
        disabled,
        isUploading,
        maxFiles,
        entityType,
        entityId,
        category,
        accessLevel,
        uploadFiles,
        onFilesChange,
        onUploadComplete,
        onUploadError,
        announce,
      ]
    );

    // Drag handlers
    const handleDragEnter = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
      },
      [disabled]
    );

    const handleDragLeave = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDragOver = React.useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const files = getFilesFromDataTransfer(e.dataTransfer);
        handleFiles(files);
      },
      [disabled, handleFiles]
    );

    // Click to open file dialog
    const handleClick = React.useCallback(() => {
      if (!disabled && !isUploading) {
        inputRef.current?.click();
      }
    }, [disabled, isUploading]);

    // Input change handler
    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        handleFiles(files);
        // Reset input
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      },
      [handleFiles]
    );

    // Keyboard handler
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      },
      [handleClick]
    );

    // Remove upload item
    const handleRemoveUpload = React.useCallback(
      (id: string) => {
        removeUpload(id);
      },
      [removeUpload]
    );

    // Format accepted types for display
    const acceptedTypesDisplay = React.useMemo(() => {
      const extensions = ['PDF', 'DOC', 'XLS', 'CSV', 'IMG'];
      return extensions.join(', ');
    }, []);

    return (
      <div className="w-full space-y-3" ref={ref} {...props}>
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          className="sr-only"
          aria-label="Seleccionar archivos"
          disabled={disabled}
        />

        {/* Screen reader announcements */}
        <div
          ref={announceRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            fileUploaderVariants({ variant, size }),
            isDragging && dropzoneStateClasses.dragging,
            error && dropzoneStateClasses.error,
            disabled && dropzoneStateClasses.disabled,
            compact && 'min-h-[80px] p-4 flex-row gap-4',
            className
          )}
          aria-disabled={disabled}
          aria-busy={isUploading}
        >
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center',
              'w-12 h-12 rounded-full',
              'bg-primary/10 dark:bg-primary/20',
              'text-primary',
              'transition-transform duration-300',
              isDragging && 'scale-110',
              compact && 'w-10 h-10'
            )}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isDragging ? (
              <CloudUpload className="w-5 h-5" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          {/* Text - shorter on mobile */}
          <div className={cn('text-center', compact && 'text-left flex-1')}>
            <p
              className={cn(
                'text-xs sm:text-sm font-medium',
                'text-slate-700 dark:text-slate-200',
                compact && 'text-sm'
              )}
            >
              {isUploading
                ? 'Subiendo...'
                : isDragging
                  ? 'Suelta aquí'
                  : (
                    <>
                      <span className="hidden sm:inline">Arrastra archivos o haz clic para subir</span>
                      <span className="sm:hidden">Toca para subir archivos</span>
                    </>
                  )}
            </p>
            {!compact && (
              <p className="mt-1 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {acceptedTypesDisplay} ({formatFileSize(maxFileSize)} máx)
              </p>
            )}
          </div>
        </div>

        {/* Upload progress list */}
        {!hideFileList && uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((upload) => (
              <UploadProgressItem
                key={upload.id}
                upload={upload}
                preview={previews.get(upload.file.name)}
                onRemove={() => handleRemoveUpload(upload.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
FileUploader.displayName = 'FileUploader';

// ============================================
// Upload Progress Item Component
// ============================================

interface UploadProgressItemProps {
  upload: UploadProgress;
  preview?: string;
  onRemove: () => void;
}

function UploadProgressItem({ upload, preview, onRemove }: UploadProgressItemProps) {
  const { file, progress, status, error } = upload;
  const extension = getFileExtension(file.name);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3',
        'rounded-lg',
        'bg-white dark:bg-slate-800',
        'border border-slate-100 dark:border-slate-700',
        'transition-all duration-200',
        status === 'error' && 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20'
      )}
      role="listitem"
      aria-label={getUploadStatusAnnouncement(status, file.name, progress)}
    >
      {/* File icon or preview */}
      {preview ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <FileIcon extension={extension} mimeType={file.type} size="default" />
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {file.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(file.size)}
          </span>
          {status === 'error' && error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>

        {/* Progress bar */}
        {(status === 'uploading' || status === 'processing') && (
          <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / Remove button */}
      <div className="flex-shrink-0">
        {status === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : status === 'error' ? (
          <AlertCircle className="w-5 h-5 text-red-500" />
        ) : status === 'uploading' || status === 'processing' ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 text-slate-400 hover:text-slate-600"
            onClick={onRemove}
            aria-label={`Eliminar ${file.name}`}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Compact File Uploader (inline button style)
// ============================================

export interface CompactFileUploaderProps
  extends Omit<FileUploaderProps, 'variant' | 'size' | 'compact' | 'hideFileList'> {
  /** Button label */
  label?: string;
}

const CompactFileUploader = React.forwardRef<HTMLDivElement, CompactFileUploaderProps>(
  ({ label = 'Adjuntar archivo', className, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const { uploadFiles, isUploading } = useUploadMultipleAttachments();

    const handleClick = () => {
      if (!props.disabled && !isUploading) {
        inputRef.current?.click();
      }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const result = await uploadFiles(files, {
        entityType: props.entityType,
        entityId: props.entityId,
        category: props.category,
        accessLevel: props.accessLevel,
      });

      if (result.successful.length > 0) {
        props.onUploadComplete?.(result.successful);
      }
      if (result.failed.length > 0) {
        props.onUploadError?.(result.failed);
      }

      // Reset input
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    };

    return (
      <div ref={ref} className={className}>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={props.acceptedTypes?.join(',') || ALL_ALLOWED_MIME_TYPES.join(',')}
          onChange={handleChange}
          className="sr-only"
          disabled={props.disabled || isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={props.disabled || isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4" />
          )}
          {label}
        </Button>
      </div>
    );
  }
);
CompactFileUploader.displayName = 'CompactFileUploader';

export { FileUploader, CompactFileUploader, fileUploaderVariants };
