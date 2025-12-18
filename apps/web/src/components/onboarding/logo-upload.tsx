'use client';

import * as React from 'react';

import { ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAccessToken } from '@/lib/auth/token-manager';

/**
 * Logo Upload Component
 * Drag & drop image upload with preview and compression (P0.4)
 */

export interface LogoUploadProps {
  /** Current logo URL */
  value?: string | null;
  /** Callback when logo changes */
  onChange: (url: string | null) => void;
  /** Upload endpoint */
  uploadEndpoint?: string;
  /** Maximum file size in bytes (default: 5MB) */
  maxSize?: number;
  /** Accepted file types */
  accept?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Show remove button */
  showRemove?: boolean;
  /** Company name for default avatar */
  companyName?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  preview: string | null;
}

// Maximum dimensions for logo
const MAX_WIDTH = 512;
const MAX_HEIGHT = 512;

export function LogoUpload({
  value,
  onChange,
  uploadEndpoint = '/api/upload/logo',
  maxSize = 5 * 1024 * 1024, // 5MB
  accept = 'image/jpeg,image/png,image/webp,image/svg+xml',
  disabled = false,
  className,
  placeholder = 'Arrastra tu logo aquí o haz clic para seleccionar',
  label = 'Logo de la empresa',
  showRemove = true,
  companyName,
}: LogoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [state, setState] = React.useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    preview: null,
  });
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Set preview from value
  React.useEffect(() => {
    if (value && !state.preview) {
      setState((prev) => ({ ...prev, preview: value }));
    }
  }, [value, state.preview]);

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = accept.split(',').map((t) => t.trim());
    if (!validTypes.some((type) => file.type === type || type === '*/*')) {
      return 'Tipo de archivo no permitido. Usa JPG, PNG, WebP o SVG.';
    }

    // Check file size
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      return `El archivo es demasiado grande. Máximo ${maxMB}MB.`;
    }

    return null;
  };

  // Compress image client-side before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      // Skip SVG compression
      if (file.type === 'image/svg+xml') {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        if (height > MAX_HEIGHT) {
          width = (width * MAX_HEIGHT) / height;
          height = MAX_HEIGHT;
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          // Draw with white background for transparency
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to WebP for better compression (fallback to JPEG)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                // Fallback to JPEG
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob) {
                      resolve(jpegBlob);
                    } else {
                      reject(new Error('Failed to compress image'));
                    }
                  },
                  'image/jpeg',
                  0.85
                );
              }
            },
            'image/webp',
            0.85
          );
        } else {
          reject(new Error('Canvas context not available'));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Upload file
  const uploadFile = async (file: File) => {
    setState({
      isUploading: true,
      progress: 0,
      error: null,
      preview: URL.createObjectURL(file),
    });

    try {
      // Compress image
      setState((prev) => ({ ...prev, progress: 20 }));
      const compressedBlob = await compressImage(file);

      // Create form data
      const formData = new FormData();
      const extension = file.type === 'image/svg+xml' ? 'svg' : 'webp';
      formData.append('file', compressedBlob, `logo.${extension}`);

      setState((prev) => ({ ...prev, progress: 50 }));

      // Get access token for authentication
      const accessToken = getAccessToken();

      // Build headers with Bearer token (aligned with backend auth)
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Upload to server
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      setState((prev) => ({ ...prev, progress: 80 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al subir el archivo');
      }

      const data = await response.json();
      const uploadedUrl = data.url;

      setState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 100,
        preview: uploadedUrl,
      }));

      onChange(uploadedUrl);
    } catch (error) {
      console.error('Logo upload error:', error);
      setState((prev) => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Error al subir el archivo',
      }));
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    const file = files[0];
    if (!file) return;

    const error = validateFile(file);

    if (error) {
      setState((prev) => ({ ...prev, error }));
      return;
    }

    uploadFile(file);
  };

  // Handle click
  const handleClick = () => {
    if (!disabled && !state.isUploading) {
      inputRef.current?.click();
    }
  };

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !state.isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (!disabled && !state.isUploading) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  // Handle remove
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      preview: null,
    });
    onChange(null);
  };

  // Clear error
  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  // Get initials for placeholder
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasImage = state.preview || value;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      {/* Upload area */}
      <div
        aria-label={placeholder}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragOver && 'border-primary bg-primary/10',
          state.error && 'border-destructive bg-destructive/5',
          disabled && 'cursor-not-allowed opacity-50',
          hasImage ? 'aspect-square w-32 p-0' : 'min-h-[150px] p-4'
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          accept={accept}
          className="hidden"
          disabled={disabled}
          type="file"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {/* Upload progress overlay */}
        {state.isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="mt-2 text-sm text-muted-foreground">
              {state.progress}%
            </span>
          </div>
        )}

        {/* Content */}
        {hasImage ? (
          // Show preview
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <img
              alt="Logo preview"
              className="w-full h-full object-contain bg-white"
              src={state.preview || value || ''}
            />

            {/* Remove button */}
            {showRemove && !disabled && !state.isUploading && (
              <button
                className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                type="button"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          // Show upload placeholder
          <div className="flex flex-col items-center gap-3 text-center">
            {companyName ? (
              // Show company initials as placeholder
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                {getInitials(companyName)}
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ImagePlus className="h-7 w-7 text-primary" />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm font-medium">{placeholder}</p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WebP o SVG hasta {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>

            <Button
              className="gap-2"
              disabled={disabled || state.isUploading}
              size="sm"
              type="button"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              Seleccionar archivo
            </Button>
          </div>
        )}
      </div>

      {/* Error message */}
      {state.error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>{state.error}</span>
          <button
            className="text-destructive/70 hover:text-destructive"
            type="button"
            onClick={clearError}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Help text */}
      {!hasImage && !state.error && (
        <p className="text-xs text-muted-foreground">
          Recomendamos un logo cuadrado de al menos 512x512 píxeles.
        </p>
      )}
    </div>
  );
}
