/**
 * Attachment Types - Enterprise CRM File System
 *
 * Type definitions for the file attachment system supporting
 * multiple entity types across the CRM platform.
 */

// ============================================
// ENTITY & CATEGORY TYPES
// ============================================

/** Supported entity types that can have attachments */
export type AttachmentEntityType =
  | 'lead'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'quote'
  | 'note'
  | 'communication'
  | 'contact';

/** File categories for organization and filtering */
export type FileCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'contract'
  | 'proposal'
  | 'invoice'
  | 'presentation'
  | 'spreadsheet'
  | 'other';

/** Access level for file visibility */
export type FileAccessLevel = 'private' | 'team' | 'public';

/** Virus scan status */
export type ScanStatus = 'pending' | 'clean' | 'infected' | 'error';

// ============================================
// ATTACHMENT INTERFACE
// ============================================

/** Complete attachment record from the database */
export interface Attachment {
  id: string;
  tenantId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileExtension: string;
  storageUrl: string;
  thumbnailUrl?: string | null;
  previewAvailable: boolean;
  category: FileCategory;
  tags: string[];
  description?: string | null;
  accessLevel: FileAccessLevel;
  scanStatus: ScanStatus;
  downloadCount: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

/** DTO for creating a new attachment */
export interface CreateAttachmentDTO {
  entityType: AttachmentEntityType;
  entityId: string;
  file: File;
  category?: FileCategory;
  description?: string;
  accessLevel?: FileAccessLevel;
  tags?: string[];
}

/** DTO for updating an attachment */
export interface UpdateAttachmentDTO {
  description?: string;
  category?: FileCategory;
  accessLevel?: FileAccessLevel;
  tags?: string[];
}

// ============================================
// UPLOAD PROGRESS & VALIDATION
// ============================================

/** Upload status for individual files */
export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'error';

/** Track upload progress for a single file */
export interface UploadProgress {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  attachment?: Attachment;
}

/** Validation error codes */
export type FileValidationErrorCode =
  | 'SIZE_EXCEEDED'
  | 'TYPE_NOT_ALLOWED'
  | 'INVALID_EXTENSION'
  | 'FILE_EMPTY'
  | 'NAME_TOO_LONG'
  | 'DUPLICATE_FILE';

/** File validation error details */
export interface FileValidationError {
  file: File;
  code: FileValidationErrorCode;
  message: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/** Backend API wrapper response */
export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** Paginated data from backend */
export interface PaginatedAttachmentsData {
  attachments: Attachment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/** Full list response from backend */
export type AttachmentListResponse = ApiSuccessResponse<PaginatedAttachmentsData>;

/** Presigned URL data from backend */
export interface PresignedUrlData {
  uploadUrl: string;
  fileId: string;
  storageKey: string;
  expiresAt: string;
  fields?: Record<string, string>;
}

/** Full presigned URL response (wrapped) */
export type PresignedUrlResponse = ApiSuccessResponse<PresignedUrlData>;

/** Download URL data from backend */
export interface DownloadUrlData {
  downloadUrl: string;
  expiresAt: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/** Full download URL response (wrapped) */
export type DownloadUrlResponse = ApiSuccessResponse<DownloadUrlData>;

/** Single attachment response (wrapped) */
export type AttachmentResponse = ApiSuccessResponse<Attachment>;

/** Confirm upload response data (returns full attachment) */
export type ConfirmUploadData = Attachment;

/** Full confirm response (wrapped) - returns the updated attachment with storageUrl */
export type ConfirmUploadResponse = ApiSuccessResponse<ConfirmUploadData>;

// ============================================
// COMPONENT PROPS TYPES
// ============================================

/** FileUploader component variant options */
export type FileUploaderVariant = 'default' | 'glass' | 'premium' | 'minimal';

/** FileUploader size options */
export type FileUploaderSize = 'sm' | 'default' | 'lg';

/** AttachmentList view mode */
export type AttachmentListView = 'grid' | 'list' | 'compact';

// ============================================
// CONSTANTS
// ============================================

/** Maximum file size in bytes (50MB) */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Maximum files per upload */
export const MAX_FILES_PER_UPLOAD = 10;

/** Maximum filename length */
export const MAX_FILENAME_LENGTH = 255;

/** Allowed MIME types by category */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  // Documents
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/rtf',
  ],
  // Spreadsheets
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/vnd.oasis.opendocument.spreadsheet',
  ],
  // Presentations
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
  ],
  // Images
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
  ],
  // Videos
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
  ],
  // Audio
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ],
};

/** All allowed MIME types flattened */
export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

/** File extension to category mapping */
export const EXTENSION_CATEGORY_MAP: Record<string, FileCategory> = {
  // Documents
  pdf: 'document',
  doc: 'document',
  docx: 'document',
  txt: 'document',
  md: 'document',
  rtf: 'document',
  // Spreadsheets
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',
  // Presentations
  ppt: 'presentation',
  pptx: 'presentation',
  odp: 'presentation',
  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  bmp: 'image',
  tiff: 'image',
  // Videos
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  avi: 'video',
  // Audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  // Contracts/Proposals/Invoices - determined by context, default to document
  contract: 'contract',
  proposal: 'proposal',
  invoice: 'invoice',
};

/** Human-readable file type labels */
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'text/csv': 'CSV',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'video/mp4': 'MP4',
  'audio/mpeg': 'MP3',
};

/** Category icons (Lucide icon names) */
export const CATEGORY_ICONS: Record<FileCategory, string> = {
  document: 'FileText',
  image: 'Image',
  video: 'Video',
  audio: 'Music',
  contract: 'FileSignature',
  proposal: 'FileSpreadsheet',
  invoice: 'Receipt',
  presentation: 'Presentation',
  spreadsheet: 'Table',
  other: 'File',
};

/** Category colors for badges/icons with dark mode support */
export const CATEGORY_COLORS: Record<FileCategory, string> = {
  document: 'bg-blue-500 dark:bg-blue-600',
  image: 'bg-purple-500 dark:bg-purple-600',
  video: 'bg-pink-500 dark:bg-pink-600',
  audio: 'bg-amber-500 dark:bg-amber-600',
  contract: 'bg-emerald-500 dark:bg-emerald-600',
  proposal: 'bg-cyan-500 dark:bg-cyan-600',
  invoice: 'bg-green-500 dark:bg-green-600',
  presentation: 'bg-orange-500 dark:bg-orange-600',
  spreadsheet: 'bg-green-600 dark:bg-green-700',
  other: 'bg-slate-500 dark:bg-slate-600',
};
