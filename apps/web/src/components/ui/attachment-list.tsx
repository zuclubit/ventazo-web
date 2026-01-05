'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  Download,
  Trash2,
  MoreVertical,
  ExternalLink,
  Copy,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FileIconWithPreview } from '@/components/ui/file-icon';
import {
  type AttachmentEntityType,
  type Attachment,
  type AttachmentListView,
  formatFileSize,
  formatAttachmentDate,
  getFileExtension,
  getAttachmentAriaLabel,
  isPreviewable,
  useEntityAttachments,
} from '@/lib/attachments';

/**
 * AttachmentList Component - Display Uploaded Files
 *
 * Features:
 * - Multiple view modes (grid, list, compact)
 * - Download and delete actions
 * - Image thumbnail previews
 * - Skeleton loading states
 * - Empty state messaging
 * - Accessible with keyboard navigation
 */

const attachmentListVariants = cva('w-full', {
  variants: {
    view: {
      grid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3',
      list: 'flex flex-col gap-2',
      compact: 'flex flex-wrap gap-2',
    },
  },
  defaultVariants: {
    view: 'list',
  },
});

export interface AttachmentListProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof attachmentListVariants> {
  /** Entity type */
  entityType: AttachmentEntityType;
  /** Entity ID */
  entityId: string;
  /** View mode */
  view?: AttachmentListView;
  /** Show preview thumbnails for images */
  showPreview?: boolean;
  /** Show delete button */
  showDelete?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Maximum items to show (0 = unlimited) */
  maxItems?: number;
  /** Callback when preview is clicked */
  onPreview?: (attachment: Attachment) => void;
  /** Callback when copy is clicked */
  onCopy?: (attachment: Attachment) => void;
}

const AttachmentList = React.forwardRef<HTMLDivElement, AttachmentListProps>(
  (
    {
      className,
      view = 'list',
      entityType,
      entityId,
      showPreview = true,
      showDelete = true,
      showDownload = true,
      emptyMessage = 'No hay archivos adjuntos',
      maxItems = 0,
      onPreview,
      onCopy,
      ...props
    },
    ref
  ) => {
    const {
      attachments,
      isLoading,
      isDeleting,
      isDownloading,
      deleteAttachment,
      downloadAttachment,
    } = useEntityAttachments(entityType, entityId);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = React.useState<Attachment | null>(null);

    // Limit items if maxItems > 0
    const displayedAttachments = maxItems > 0 ? attachments.slice(0, maxItems) : attachments;
    const hasMore = maxItems > 0 && attachments.length > maxItems;

    // Handle delete confirmation
    const handleDeleteConfirm = React.useCallback(async () => {
      if (!deleteTarget) return;
      await deleteAttachment(deleteTarget.id);
      setDeleteTarget(null);
    }, [deleteTarget, deleteAttachment]);

    // Handle download
    const handleDownload = React.useCallback(
      async (attachment: Attachment) => {
        await downloadAttachment(attachment);
      },
      [downloadAttachment]
    );

    // Loading skeleton
    if (isLoading) {
      return (
        <div ref={ref} className={cn(attachmentListVariants({ view }), className)} {...props}>
          {[1, 2, 3].map((i) => (
            <AttachmentSkeleton key={i} view={view} />
          ))}
        </div>
      );
    }

    // Empty state
    if (attachments.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center py-8 text-center',
            className
          )}
          {...props}
        >
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <>
        <div ref={ref} className={cn(attachmentListVariants({ view }), className)} {...props}>
          {displayedAttachments.map((attachment) => (
            <AttachmentItem
              key={attachment.id}
              attachment={attachment}
              view={view}
              showPreview={showPreview}
              showDelete={showDelete}
              showDownload={showDownload}
              isDeleting={isDeleting}
              isDownloading={isDownloading}
              onPreview={onPreview}
              onDownload={handleDownload}
              onDelete={() => setDeleteTarget(attachment)}
              onCopy={onCopy}
            />
          ))}

          {/* Show more indicator */}
          {hasMore && (
            <div className="flex items-center justify-center p-2 text-sm text-slate-500">
              +{attachments.length - maxItems} más
            </div>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente{' '}
                <span className="font-medium">{deleteTarget?.originalName}</span>. Esta acción no
                se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);
AttachmentList.displayName = 'AttachmentList';

// ============================================
// Attachment Item Component
// ============================================

interface AttachmentItemProps {
  attachment: Attachment;
  view?: AttachmentListView;
  showPreview?: boolean;
  showDelete?: boolean;
  showDownload?: boolean;
  isDeleting?: boolean;
  isDownloading?: boolean;
  onPreview?: (attachment: Attachment) => void;
  onDownload: (attachment: Attachment) => void;
  onDelete: () => void;
  onCopy?: (attachment: Attachment) => void;
}

function AttachmentItem({
  attachment,
  view = 'list',
  showPreview,
  showDelete,
  showDownload,
  isDeleting,
  isDownloading,
  onPreview,
  onDownload,
  onDelete,
  onCopy,
}: AttachmentItemProps) {
  const extension = getFileExtension(attachment.fileName);
  const canPreview = isPreviewable(attachment);

  // Grid view - card style
  if (view === 'grid') {
    return (
      <div
        className={cn(
          'group relative flex flex-col',
          'rounded-xl border border-slate-100 dark:border-slate-700',
          'bg-white dark:bg-slate-800',
          'overflow-hidden',
          'transition-all duration-200',
          'hover:border-slate-200 dark:hover:border-slate-600',
          'hover:shadow-md'
        )}
        role="listitem"
        aria-label={getAttachmentAriaLabel(attachment)}
      >
        {/* Thumbnail / Icon area */}
        <div className="relative aspect-square bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
          <FileIconWithPreview
            extension={extension}
            mimeType={attachment.mimeType}
            category={attachment.category}
            thumbnailUrl={attachment.thumbnailUrl || undefined}
            size="xl"
          />

          {/* Hover overlay */}
          <div
            className={cn(
              'absolute inset-0 bg-black/50',
              'flex items-center justify-center gap-2',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity duration-200'
            )}
          >
            {showDownload && (
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => onDownload(attachment)}
                disabled={isDownloading}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {canPreview && onPreview && (
              <Button
                size="sm"
                variant="secondary"
                className="w-8 h-8 p-0"
                onClick={() => onPreview(attachment)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
            title={attachment.originalName}
          >
            {attachment.originalName}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>

        {/* Actions menu - always visible on mobile, hover on desktop */}
        <AttachmentMenu
          attachment={attachment}
          showDelete={showDelete}
          showDownload={showDownload}
          canPreview={canPreview}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          onCopy={onCopy}
          className="absolute top-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        />
      </div>
    );
  }

  // Compact view - chip style
  if (view === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5',
          'rounded-full',
          'bg-slate-100 dark:bg-slate-700',
          'text-sm',
          'transition-colors duration-200',
          'hover:bg-slate-200 dark:hover:bg-slate-600'
        )}
        role="listitem"
        aria-label={getAttachmentAriaLabel(attachment)}
      >
        <FileIconWithPreview
          extension={extension}
          mimeType={attachment.mimeType}
          category={attachment.category}
          size="xs"
        />
        <span className="text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
          {attachment.originalName}
        </span>
        <button
          onClick={() => onDownload(attachment)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label={`Descargar ${attachment.originalName}`}
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // List view - row style (default)
  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-3',
        'rounded-lg',
        'bg-white dark:bg-slate-800',
        'border border-slate-100 dark:border-slate-700',
        'transition-all duration-200',
        'hover:border-slate-200 dark:hover:border-slate-600',
        'hover:shadow-sm'
      )}
      role="listitem"
      aria-label={getAttachmentAriaLabel(attachment)}
    >
      {/* Icon */}
      <FileIconWithPreview
        extension={extension}
        mimeType={attachment.mimeType}
        category={attachment.category}
        thumbnailUrl={attachment.thumbnailUrl || undefined}
        size="default"
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
          title={attachment.originalName}
        >
          {attachment.originalName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {formatFileSize(attachment.fileSize)} • {formatAttachmentDate(attachment.createdAt)}
        </p>
      </div>

      {/* Actions - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {showDownload && (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={() => onDownload(attachment)}
            disabled={isDownloading}
            aria-label={`Descargar ${attachment.originalName}`}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        )}
        {showDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={onDelete}
            disabled={isDeleting}
            aria-label={`Eliminar ${attachment.originalName}`}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        )}
        <AttachmentMenu
          attachment={attachment}
          showDelete={false}
          showDownload={false}
          canPreview={canPreview}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          onCopy={onCopy}
        />
      </div>
    </div>
  );
}

// ============================================
// Attachment Menu Component
// ============================================

interface AttachmentMenuProps {
  attachment: Attachment;
  showDelete?: boolean;
  showDownload?: boolean;
  canPreview?: boolean;
  onPreview?: (attachment: Attachment) => void;
  onDownload: (attachment: Attachment) => void;
  onDelete: () => void;
  onCopy?: (attachment: Attachment) => void;
  className?: string;
}

function AttachmentMenu({
  attachment,
  showDelete,
  showDownload,
  canPreview,
  onPreview,
  onDownload,
  onDelete,
  onCopy,
  className,
}: AttachmentMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-8 h-8 p-0', className)}
          aria-label="Más opciones"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canPreview && onPreview && (
          <DropdownMenuItem onClick={() => onPreview(attachment)}>
            <Eye className="w-4 h-4 mr-2" />
            Vista previa
          </DropdownMenuItem>
        )}
        {showDownload && (
          <DropdownMenuItem onClick={() => onDownload(attachment)}>
            <Download className="w-4 h-4 mr-2" />
            Descargar
          </DropdownMenuItem>
        )}
        {attachment.storageUrl && (
          <DropdownMenuItem asChild>
            <a href={attachment.storageUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir en nueva pestaña
            </a>
          </DropdownMenuItem>
        )}
        {onCopy && (
          <DropdownMenuItem onClick={() => onCopy(attachment)}>
            <Copy className="w-4 h-4 mr-2" />
            Copiar a...
          </DropdownMenuItem>
        )}
        {showDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// Skeleton Components
// ============================================

function AttachmentSkeleton({ view }: { view?: AttachmentListView }) {
  if (view === 'grid') {
    return (
      <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-pulse">
        <div className="aspect-square bg-slate-100 dark:bg-slate-800" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (view === 'compact') {
    return (
      <div className="h-8 w-32 bg-slate-100 dark:bg-slate-700 rounded-full animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-700 animate-pulse">
      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
      </div>
    </div>
  );
}

export { AttachmentList, attachmentListVariants };
