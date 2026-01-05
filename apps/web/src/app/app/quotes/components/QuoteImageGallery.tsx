'use client';

/**
 * QuoteImageGallery - Image Gallery Component for Quote Attachments
 *
 * Displays images in a beautiful masonry-style grid with lightbox preview.
 * Filters attachments to show only images for quick visual access.
 *
 * @version 1.0.0
 */

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  ImageIcon,
  X,
  ZoomIn,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAttachments,
  useDownloadAttachment,
  type Attachment,
  formatFileSize,
} from '@/lib/attachments';

interface QuoteImageGalleryProps {
  quoteId: string;
  className?: string;
  maxPreviewImages?: number;
  showCount?: boolean;
  emptyMessage?: string;
}

export function QuoteImageGallery({
  quoteId,
  className,
  maxPreviewImages = 6,
  showCount = true,
  emptyMessage = 'No hay imágenes adjuntas',
}: QuoteImageGalleryProps) {
  const { data: allAttachments, isLoading } = useAttachments('quote', quoteId);
  const [selectedImage, setSelectedImage] = React.useState<Attachment | null>(null);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const { download, isDownloading } = useDownloadAttachment();

  // Filter only images
  const images = React.useMemo(() => {
    return (allAttachments || []).filter((att) =>
      att.mimeType.startsWith('image/')
    );
  }, [allAttachments]);

  // Get preview images
  const previewImages = images.slice(0, maxPreviewImages);
  const remainingCount = images.length - maxPreviewImages;

  // Handle image click
  const handleImageClick = (image: Attachment, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  // Handle navigation
  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    setSelectedImage(images[newIndex]);
  };

  // Handle download
  const handleDownload = async () => {
    if (selectedImage) {
      await download(selectedImage.id, selectedImage.originalName);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') setSelectedImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentIndex]);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-3', className)}>
        {/* Header */}
        {showCount && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="w-4 h-4 text-[var(--tenant-primary)]" />
              <span>Galería</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {images.length} {images.length === 1 ? 'imagen' : 'imágenes'}
            </Badge>
          </div>
        )}

        {/* Image Grid */}
        <div
          className={cn(
            'grid gap-2',
            images.length === 1 && 'grid-cols-1',
            images.length === 2 && 'grid-cols-2',
            images.length >= 3 && 'grid-cols-3'
          )}
        >
          {previewImages.map((image, index) => (
            <motion.button
              key={image.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleImageClick(image, index)}
              className={cn(
                'relative group overflow-hidden rounded-xl',
                'aspect-square bg-muted',
                'border border-border/50',
                'hover:border-[var(--tenant-primary)]/50',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)]',
                // First image larger on grids
                index === 0 && images.length > 2 && 'col-span-2 row-span-2'
              )}
            >
              {/* Image */}
              <Image
                src={image.thumbnailUrl || image.storageUrl}
                alt={image.originalName}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 33vw"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              {/* Zoom icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* File info */}
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <p className="text-[10px] sm:text-xs text-white font-medium truncate">
                  {image.originalName}
                </p>
                <p className="text-[9px] sm:text-[10px] text-white/70">
                  {formatFileSize(image.fileSize)}
                </p>
              </div>

              {/* Remaining count badge */}
              {index === maxPreviewImages - 1 && remainingCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <span className="text-xl sm:text-2xl font-bold text-white">
                    +{remainingCount}
                  </span>
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* View all link */}
        {images.length > maxPreviewImages && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[var(--tenant-primary)] hover:bg-[var(--tenant-primary)]/10"
            onClick={() => handleImageClick(images[0], 0)}
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver todas ({images.length})
          </Button>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}

            {/* Image */}
            <motion.div
              key={selectedImage.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.storageUrl}
                alt={selectedImage.originalName}
                width={1200}
                height={800}
                className="object-contain max-h-[80vh] rounded-lg"
                priority
              />
            </motion.div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between max-w-3xl mx-auto">
                <div className="text-white">
                  <p className="font-medium truncate max-w-[200px] sm:max-w-none">
                    {selectedImage.originalName}
                  </p>
                  <p className="text-sm text-white/70">
                    {formatFileSize(selectedImage.fileSize)} • {currentIndex + 1} de {images.length}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="shrink-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </Button>
              </div>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 backdrop-blur-sm rounded-lg max-w-[90vw] overflow-x-auto">
                {images.slice(0, 8).map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(img, idx);
                    }}
                    className={cn(
                      'shrink-0 w-12 h-12 rounded-md overflow-hidden',
                      'border-2 transition-all',
                      idx === currentIndex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <Image
                      src={img.thumbnailUrl || img.storageUrl}
                      alt={img.originalName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default QuoteImageGallery;
