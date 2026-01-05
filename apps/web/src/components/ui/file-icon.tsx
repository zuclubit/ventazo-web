'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  FileText,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Presentation,
  FileSignature,
  Receipt,
  Table,
  File,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { getFileExtension, getFileIconColor, getExtensionLabel } from '@/lib/attachments';
import type { FileCategory } from '@/lib/attachments';

/**
 * FileIcon Component - Premium File Type Icon
 *
 * Displays a styled icon representing a file type with the extension label.
 * Supports multiple sizes and variants matching the design system.
 */

const fileIconVariants = cva(
  // Base styles
  [
    'relative inline-flex items-center justify-center',
    'text-white font-semibold',
    'rounded-lg shadow-sm',
    'transition-all duration-200',
  ].join(' '),
  {
    variants: {
      size: {
        xs: 'w-7 h-7 text-[8px]',
        sm: 'w-8 h-8 text-[9px]',
        default: 'w-10 h-10 text-[10px]',
        lg: 'w-12 h-12 text-xs',
        xl: 'w-16 h-16 text-sm',
      },
      variant: {
        // Solid colored background
        solid: '',
        // Subtle with border
        subtle: 'bg-opacity-10 border border-opacity-20',
        // Glass effect
        glass: 'backdrop-blur-sm bg-opacity-80 shadow-lg',
        // Outline only
        outline: 'bg-transparent border-2',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'solid',
    },
  }
);

// Icon component mapping by category
const CategoryIcons: Record<FileCategory, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  audio: Music,
  contract: FileSignature,
  proposal: FileSpreadsheet,
  invoice: Receipt,
  presentation: Presentation,
  spreadsheet: Table,
  other: File,
};

// Icon sizes for different component sizes
const iconSizes: Record<string, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  default: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export interface FileIconProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof fileIconVariants> {
  /** File extension (e.g., 'pdf', 'docx') */
  extension?: string;
  /** MIME type for fallback categorization */
  mimeType?: string;
  /** File category if known */
  category?: FileCategory;
  /** Show extension label inside icon */
  showLabel?: boolean;
  /** Custom color class (overrides automatic color) */
  colorClass?: string;
}

/**
 * Get category from MIME type
 */
function getCategoryFromMimeType(mimeType?: string): FileCategory {
  if (!mimeType) return 'other';

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

  return 'other';
}

const FileIcon = React.forwardRef<HTMLDivElement, FileIconProps>(
  (
    {
      className,
      size,
      variant,
      extension,
      mimeType,
      category,
      showLabel = true,
      colorClass,
      ...props
    },
    ref
  ) => {
    // Determine extension
    const ext = extension?.toLowerCase() || '';

    // Determine category
    const resolvedCategory = category || getCategoryFromMimeType(mimeType) || 'other';

    // Get icon component
    const IconComponent = CategoryIcons[resolvedCategory];

    // Get color class
    const bgColorClass = colorClass || getFileIconColor(ext);

    // Get extension label
    const label = getExtensionLabel(ext);

    // Determine if we should show the icon or the label
    const sizeKey = size || 'default';
    const showIconInstead = sizeKey === 'xs' || sizeKey === 'sm' || !showLabel || !ext;

    return (
      <div
        ref={ref}
        className={cn(
          fileIconVariants({ size, variant }),
          bgColorClass,
          variant === 'subtle' && 'text-current bg-current',
          variant === 'outline' && 'text-current border-current bg-transparent',
          className
        )}
        role="img"
        aria-label={`${ext || resolvedCategory} file`}
        {...props}
      >
        {showIconInstead ? (
          <IconComponent className={cn(iconSizes[sizeKey], 'opacity-90')} />
        ) : (
          <span className="font-bold tracking-tight uppercase">{label}</span>
        )}
      </div>
    );
  }
);
FileIcon.displayName = 'FileIcon';

/**
 * FileIconWithPreview - Icon with thumbnail overlay for images
 */
export interface FileIconWithPreviewProps extends FileIconProps {
  /** Thumbnail URL for image preview */
  thumbnailUrl?: string;
  /** Alt text for thumbnail */
  alt?: string;
}

const FileIconWithPreview = React.forwardRef<HTMLDivElement, FileIconWithPreviewProps>(
  ({ thumbnailUrl, alt, category, ...props }, ref) => {
    const isImageCategory = category === 'image' || props.mimeType?.startsWith('image/');

    // If it's an image with thumbnail, show the thumbnail
    if (isImageCategory && thumbnailUrl) {
      const sizeClasses: Record<string, string> = {
        xs: 'w-7 h-7',
        sm: 'w-8 h-8',
        default: 'w-10 h-10',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
      };

      const sizeKey = props.size || 'default';

      return (
        <div
          ref={ref}
          className={cn(
            sizeClasses[sizeKey],
            'relative rounded-lg overflow-hidden',
            'ring-1 ring-slate-200 dark:ring-slate-700',
            props.className
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnailUrl}
            alt={alt || 'Thumbnail'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // Otherwise show the standard file icon
    return <FileIcon ref={ref} category={category} {...props} />;
  }
);
FileIconWithPreview.displayName = 'FileIconWithPreview';

export { FileIcon, FileIconWithPreview, fileIconVariants };
