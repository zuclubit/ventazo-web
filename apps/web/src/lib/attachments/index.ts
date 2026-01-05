/**
 * Attachments Module - File Attachment System
 *
 * Provides a complete file attachment system for the CRM.
 *
 * @example
 * ```tsx
 * import { useEntityAttachments, FileUploader, AttachmentList } from '@/lib/attachments';
 *
 * function QuoteForm({ quoteId }) {
 *   const { attachments, upload, isUploading } = useEntityAttachments('quote', quoteId);
 *
 *   return (
 *     <>
 *       <FileUploader
 *         entityType="quote"
 *         entityId={quoteId}
 *         onUploadComplete={(files) => console.log('Uploaded:', files)}
 *       />
 *       <AttachmentList
 *         entityType="quote"
 *         entityId={quoteId}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

// Types
export type {
  AttachmentEntityType,
  FileCategory,
  FileAccessLevel,
  ScanStatus,
  Attachment,
  CreateAttachmentDTO,
  UpdateAttachmentDTO,
  UploadStatus,
  UploadProgress,
  FileValidationErrorCode,
  FileValidationError,
  // API Response types
  ApiSuccessResponse,
  PaginatedAttachmentsData,
  AttachmentListResponse,
  PresignedUrlData,
  PresignedUrlResponse,
  DownloadUrlData,
  DownloadUrlResponse,
  AttachmentResponse,
  ConfirmUploadData,
  ConfirmUploadResponse,
  // Component props
  FileUploaderVariant,
  FileUploaderSize,
  AttachmentListView,
} from './types';

// Constants
export {
  MAX_FILE_SIZE,
  MAX_FILES_PER_UPLOAD,
  MAX_FILENAME_LENGTH,
  ALLOWED_MIME_TYPES,
  ALL_ALLOWED_MIME_TYPES,
  EXTENSION_CATEGORY_MAP,
  FILE_TYPE_LABELS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from './types';

// Utilities
export {
  validateFile,
  validateFiles,
  formatFileSize,
  getFileExtension,
  getFileTypeLabel,
  formatAttachmentDate,
  getFileCategory,
  isPreviewable,
  isImage,
  isVideo,
  isAudio,
  getCategoryColorClass,
  FILE_ICON_COLORS,
  getFileIconColor,
  getExtensionLabel,
  getFilesFromDataTransfer,
  createUploadId,
  createImagePreview,
  revokeImagePreview,
  getAttachmentAriaLabel,
  getUploadStatusAnnouncement,
} from './utils';

// Hooks
export {
  attachmentKeys,
  useAttachments,
  useAttachment,
  useDownloadUrl,
  useUploadAttachment,
  useUploadMultipleAttachments,
  useUpdateAttachment,
  useDeleteAttachment,
  useCopyAttachment,
  useDownloadAttachment,
  useEntityAttachments,
  useAttachmentMutations,
} from './hooks';
