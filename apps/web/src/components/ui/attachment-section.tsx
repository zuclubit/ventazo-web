'use client';

import * as React from 'react';
import { Paperclip, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileUploader, CompactFileUploader } from '@/components/ui/file-uploader';
import { AttachmentList } from '@/components/ui/attachment-list';
import { AttachmentPreview } from '@/components/ui/attachment-preview';
import {
  type AttachmentEntityType,
  type FileCategory,
  type FileAccessLevel,
  type Attachment,
  type AttachmentListView,
  type FileValidationError,
  useEntityAttachments,
} from '@/lib/attachments';

/**
 * AttachmentSection Component - Complete Attachment UI for Forms
 *
 * A self-contained section that provides:
 * - File upload dropzone
 * - List of existing attachments
 * - Preview modal for files
 * - Collapsible design for forms
 *
 * Usage:
 * ```tsx
 * <AttachmentSection
 *   entityType="quote"
 *   entityId={quoteId}
 *   title="Documentos Adjuntos"
 * />
 * ```
 */

export interface AttachmentSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Entity type */
  entityType: AttachmentEntityType;
  /** Entity ID */
  entityId: string;
  /** Section title */
  title?: string;
  /** Description text */
  description?: string;
  /** Default category for uploads */
  category?: FileCategory;
  /** Default access level */
  accessLevel?: FileAccessLevel;
  /** View mode for attachment list */
  view?: AttachmentListView;
  /** Show file uploader */
  showUploader?: boolean;
  /** Show attachment list */
  showList?: boolean;
  /** Collapsible section */
  collapsible?: boolean;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Compact mode - inline button instead of dropzone */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Callback when uploads complete */
  onUploadComplete?: (attachments: Attachment[]) => void;
  /** Callback when upload errors occur */
  onUploadError?: (errors: FileValidationError[]) => void;
}

const AttachmentSection = React.forwardRef<HTMLDivElement, AttachmentSectionProps>(
  (
    {
      className,
      entityType,
      entityId,
      title = 'Documentos Adjuntos',
      description,
      category,
      accessLevel = 'team',
      view = 'list',
      showUploader = true,
      showList = true,
      collapsible = false,
      defaultCollapsed = false,
      compact = false,
      disabled = false,
      onUploadComplete,
      onUploadError,
      ...props
    },
    ref
  ) => {
    // State
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
    const [previewAttachment, setPreviewAttachment] = React.useState<Attachment | null>(null);

    // Get attachments for preview navigation
    const { attachments } = useEntityAttachments(entityType, entityId);

    // Toggle collapse
    const toggleCollapse = React.useCallback(() => {
      if (collapsible) {
        setIsCollapsed((prev) => !prev);
      }
    }, [collapsible]);

    // Handle preview
    const handlePreview = React.useCallback((attachment: Attachment) => {
      setPreviewAttachment(attachment);
    }, []);

    // Handle preview navigation
    const handlePreviewNavigate = React.useCallback((attachment: Attachment) => {
      setPreviewAttachment(attachment);
    }, []);

    return (
      <>
        <div
          ref={ref}
          className={cn('attachment-form-section', disabled && 'opacity-50', className)}
          {...props}
        >
          {/* Header */}
          <div
            className={cn(
              'attachment-form-section-title',
              collapsible && 'cursor-pointer select-none'
            )}
            onClick={toggleCollapse}
            role={collapsible ? 'button' : undefined}
            aria-expanded={collapsible ? !isCollapsed : undefined}
          >
            <Paperclip className="w-4 h-4" />
            <span className="flex-1">{title}</span>
            {attachments.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {attachments.length}
              </span>
            )}
            {collapsible && (
              <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* Description */}
          {description && !isCollapsed && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}

          {/* Content */}
          {!isCollapsed && (
            <div className="space-y-4">
              {/* Uploader */}
              {showUploader && entityId && (
                <>
                  {compact ? (
                    <CompactFileUploader
                      entityType={entityType}
                      entityId={entityId}
                      category={category}
                      accessLevel={accessLevel}
                      disabled={disabled}
                      onUploadComplete={onUploadComplete}
                      onUploadError={onUploadError}
                    />
                  ) : (
                    <FileUploader
                      entityType={entityType}
                      entityId={entityId}
                      category={category}
                      accessLevel={accessLevel}
                      variant="glass"
                      size="sm"
                      disabled={disabled}
                      onUploadComplete={onUploadComplete}
                      onUploadError={onUploadError}
                    />
                  )}
                </>
              )}

              {/* List */}
              {showList && entityId && (
                <AttachmentList
                  entityType={entityType}
                  entityId={entityId}
                  view={view}
                  onPreview={handlePreview}
                  emptyMessage="No hay archivos adjuntos"
                />
              )}

              {/* Empty state for new entities */}
              {!entityId && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Guarda primero para poder adjuntar archivos
                </p>
              )}
            </div>
          )}
        </div>

        {/* Preview modal */}
        <AttachmentPreview
          attachment={previewAttachment}
          attachments={attachments}
          open={!!previewAttachment}
          onOpenChange={(open) => !open && setPreviewAttachment(null)}
          onNavigate={handlePreviewNavigate}
        />
      </>
    );
  }
);
AttachmentSection.displayName = 'AttachmentSection';

/**
 * Minimal variant for detail views (read-only with preview)
 */
export interface AttachmentViewProps extends Omit<AttachmentSectionProps, 'showUploader'> {}

const AttachmentView = React.forwardRef<HTMLDivElement, AttachmentViewProps>((props, ref) => (
  <AttachmentSection ref={ref} {...props} showUploader={false} collapsible={true} />
));
AttachmentView.displayName = 'AttachmentView';

export { AttachmentSection, AttachmentView };
