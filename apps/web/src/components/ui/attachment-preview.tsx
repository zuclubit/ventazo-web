'use client';

import * as React from 'react';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ExternalLink,
  Loader2,
  FileText,
  Play,
  Pause,
  Volume2,
  VolumeX,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileIcon } from '@/components/ui/file-icon';
import {
  type Attachment,
  formatFileSize,
  formatAttachmentDate,
  getFileExtension,
  getFileTypeLabel,
  isPreviewable,
  useDownloadAttachment,
  useDownloadUrl,
} from '@/lib/attachments';

/**
 * AttachmentPreview Component - Full-screen File Preview
 *
 * Features:
 * - Image preview with zoom and pan
 * - PDF viewer
 * - File metadata display
 * - Download button
 * - Navigation between files
 * - Keyboard shortcuts
 */

export interface AttachmentPreviewProps {
  /** Attachment to preview */
  attachment: Attachment | null;
  /** All attachments for navigation */
  attachments?: Attachment[];
  /** Open state */
  open: boolean;
  /** Callback when closed */
  onOpenChange: (open: boolean) => void;
  /** Callback when navigating to another attachment */
  onNavigate?: (attachment: Attachment) => void;
}

const AttachmentPreview = React.forwardRef<HTMLDivElement, AttachmentPreviewProps>(
  ({ attachment, attachments = [], open, onOpenChange, onNavigate }, ref) => {
    // State
    const [zoom, setZoom] = React.useState(1);
    const [rotation, setRotation] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    // Download hook
    const { mutateAsync: download, isPending: isDownloading } = useDownloadAttachment();

    // Fetch download URL when storageUrl is missing (fallback)
    const needsDownloadUrl = open && attachment && !attachment.storageUrl;
    const { data: downloadUrlData, isLoading: isLoadingUrl } = useDownloadUrl(
      attachment?.id || '',
      needsDownloadUrl
    );

    // Compute the effective URL for preview (storageUrl or download URL)
    const previewUrl = React.useMemo(() => {
      if (attachment?.storageUrl) {
        return attachment.storageUrl;
      }
      if (downloadUrlData?.downloadUrl) {
        return downloadUrlData.downloadUrl;
      }
      return null;
    }, [attachment?.storageUrl, downloadUrlData?.downloadUrl]);

    // Get current index for navigation
    const currentIndex = React.useMemo(() => {
      if (!attachment || attachments.length === 0) return -1;
      return attachments.findIndex((a) => a.id === attachment.id);
    }, [attachment, attachments]);

    const canNavigate = attachments.length > 1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < attachments.length - 1;

    // Reset state when attachment changes
    React.useEffect(() => {
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setError(false);
    }, [attachment?.id]);

    // Handle navigation
    const navigatePrev = React.useCallback(() => {
      if (hasPrev && onNavigate) {
        onNavigate(attachments[currentIndex - 1]);
      }
    }, [hasPrev, currentIndex, attachments, onNavigate]);

    const navigateNext = React.useCallback(() => {
      if (hasNext && onNavigate) {
        onNavigate(attachments[currentIndex + 1]);
      }
    }, [hasNext, currentIndex, attachments, onNavigate]);

    // Keyboard shortcuts
    React.useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        switch (e.key) {
          case 'ArrowLeft':
            navigatePrev();
            break;
          case 'ArrowRight':
            navigateNext();
            break;
          case 'Escape':
            onOpenChange(false);
            break;
          case '+':
          case '=':
            setZoom((z) => Math.min(z + 0.25, 3));
            break;
          case '-':
            setZoom((z) => Math.max(z - 0.25, 0.5));
            break;
          case 'r':
            setRotation((r) => (r + 90) % 360);
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, navigatePrev, navigateNext, onOpenChange]);

    // Handle download
    const handleDownload = React.useCallback(async () => {
      if (!attachment) return;
      await download({
        attachmentId: attachment.id,
        fileName: attachment.originalName,
      });
    }, [attachment, download]);

    // Handle image load
    const handleImageLoad = React.useCallback(() => {
      setIsLoading(false);
      setError(false);
    }, []);

    const handleImageError = React.useCallback(() => {
      setIsLoading(false);
      setError(true);
    }, []);

    if (!attachment) return null;

    const extension = getFileExtension(attachment.fileName);
    const isImageFile = attachment.mimeType.startsWith('image/');
    const isPdf = attachment.mimeType === 'application/pdf';
    const isVideo = attachment.mimeType.startsWith('video/');
    const isAudio = attachment.mimeType.startsWith('audio/');
    const canPreview = isPreviewable(attachment) || isVideo || isAudio;

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          ref={ref}
          className={cn(
            'max-w-5xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[90vh] p-0',
            'flex flex-col',
            'bg-slate-900 text-white',
            'border-slate-700',
            'rounded-t-2xl sm:rounded-xl'
          )}
        >
          {/* Header */}
          <DialogHeader className="flex-shrink-0 p-3 sm:p-4 border-b border-slate-700">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <FileIcon
                  extension={extension}
                  mimeType={attachment.mimeType}
                  category={attachment.category}
                  size="sm"
                  className="hidden sm:flex"
                />
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-sm sm:text-base font-medium text-white truncate">
                    {attachment.originalName}
                  </DialogTitle>
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                    {getFileTypeLabel(attachment.mimeType)} •{' '}
                    {formatFileSize(attachment.fileSize)} •{' '}
                    {formatAttachmentDate(attachment.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Zoom controls (for images) - hidden on mobile, use gestures instead */}
                {isImageFile && (
                  <div className="hidden sm:flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                      disabled={zoom <= 0.5}
                      aria-label="Reducir zoom"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-slate-400 w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                      disabled={zoom >= 3}
                      aria-label="Aumentar zoom"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      aria-label="Rotar"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-6 bg-slate-700 mx-1" />
                  </div>
                )}

                {/* Open in new tab */}
                {previewUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                    asChild
                  >
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}

                {/* Download */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  aria-label="Descargar"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>

                {/* Close */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
                  onClick={() => onOpenChange(false)}
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 relative overflow-hidden">
            {/* Loading state */}
            {(isLoading || isLoadingUrl) && canPreview && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <FileText className="w-16 h-16 text-slate-600 mb-4" />
                <p className="text-slate-400">No se pudo cargar la vista previa</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar archivo
                </Button>
              </div>
            )}

            {/* Image preview */}
            {isImageFile && !error && previewUrl && !isLoadingUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-auto">
                <img
                  src={previewUrl}
                  alt={attachment.originalName}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className={cn(
                    'max-w-full max-h-full object-contain',
                    'transition-all duration-300',
                    isLoading && 'opacity-0'
                  )}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            )}

            {/* PDF preview */}
            {isPdf && !error && previewUrl && !isLoadingUrl && (
              <iframe
                src={`${previewUrl}#view=FitH`}
                title={attachment.originalName}
                className="w-full h-full border-0"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            )}

            {/* Video preview */}
            {isVideo && !error && previewUrl && !isLoadingUrl && (
              <div className="absolute inset-0 flex items-center justify-center p-4 md:p-8">
                <video
                  src={previewUrl}
                  controls
                  controlsList="nodownload"
                  className={cn(
                    'max-w-full max-h-full rounded-lg shadow-2xl',
                    'bg-black'
                  )}
                  onLoadedData={handleImageLoad}
                  onError={handleImageError}
                  preload="metadata"
                >
                  <track kind="captions" />
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
            )}

            {/* Audio preview */}
            {isAudio && !error && previewUrl && !isLoadingUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-md">
                  <FileIcon
                    extension={extension}
                    mimeType={attachment.mimeType}
                    category={attachment.category}
                    size="xl"
                    className="mx-auto mb-6"
                  />
                  <p className="text-lg font-medium text-white text-center mb-6 truncate">
                    {attachment.originalName}
                  </p>
                  <audio
                    src={previewUrl}
                    controls
                    controlsList="nodownload"
                    className="w-full"
                    onLoadedData={handleImageLoad}
                    onError={handleImageError}
                    preload="metadata"
                  >
                    Tu navegador no soporta la reproducción de audio.
                  </audio>
                </div>
              </div>
            )}

            {/* Non-previewable file */}
            {!canPreview && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <FileIcon
                  extension={extension}
                  mimeType={attachment.mimeType}
                  category={attachment.category}
                  size="xl"
                  className="mb-4"
                />
                <p className="text-lg font-medium text-white mb-2">
                  {attachment.originalName}
                </p>
                <p className="text-slate-400 mb-4">
                  Este tipo de archivo no tiene vista previa disponible
                </p>
                <Button onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Descargar archivo
                </Button>
              </div>
            )}

            {/* Navigation arrows - smaller on mobile */}
            {canNavigate && (
              <>
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    'absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2',
                    'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full',
                    'bg-black/50 hover:bg-black/70',
                    'text-white',
                    !hasPrev && 'opacity-30 pointer-events-none'
                  )}
                  onClick={navigatePrev}
                  disabled={!hasPrev}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className={cn(
                    'absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2',
                    'w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full',
                    'bg-black/50 hover:bg-black/70',
                    'text-white',
                    !hasNext && 'opacity-30 pointer-events-none'
                  )}
                  onClick={navigateNext}
                  disabled={!hasNext}
                  aria-label="Siguiente"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </Button>
              </>
            )}
          </div>

          {/* Footer with thumbnails - horizontal scroll on mobile */}
          {canNavigate && (
            <div className="flex-shrink-0 p-2 sm:p-3 md:p-4 border-t border-slate-700">
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent justify-start sm:justify-center">
                {attachments.map((a, index) => (
                  <button
                    key={a.id}
                    onClick={() => onNavigate?.(a)}
                    className={cn(
                      'flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-md sm:rounded-lg overflow-hidden',
                      'ring-2 ring-transparent',
                      'transition-all duration-200',
                      'hover:ring-slate-500',
                      'touch-manipulation',
                      index === currentIndex && 'ring-primary'
                    )}
                    aria-label={`Ver ${a.originalName}`}
                    aria-current={index === currentIndex ? 'true' : undefined}
                  >
                    {a.mimeType.startsWith('image/') && a.thumbnailUrl ? (
                      <img
                        src={a.thumbnailUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <FileIcon
                          extension={getFileExtension(a.fileName)}
                          mimeType={a.mimeType}
                          category={a.category}
                          size="xs"
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-center text-[10px] sm:text-xs text-slate-500 mt-1.5 sm:mt-2">
                {currentIndex + 1} de {attachments.length}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }
);
AttachmentPreview.displayName = 'AttachmentPreview';

export { AttachmentPreview };
