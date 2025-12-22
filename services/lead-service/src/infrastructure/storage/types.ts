/**
 * Storage Module Types
 * Types for file storage and attachment management
 */

/**
 * Supported storage providers
 */
export type StorageProvider = 's3' | 'gcs' | 'azure' | 'supabase' | 'local';

/**
 * Entity types that can have attachments
 */
export type AttachmentEntityType = 'lead' | 'customer' | 'opportunity' | 'task' | 'note' | 'communication' | 'contact';

/**
 * Access levels for files
 */
export type FileAccessLevel = 'private' | 'team' | 'public';

/**
 * File categories for organization
 */
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

/**
 * Virus scan status
 */
export type ScanStatus = 'pending' | 'clean' | 'infected' | 'error';

/**
 * Attachment entity from database
 */
export interface Attachment {
  id: string;
  tenantId: string;
  entityType: AttachmentEntityType;
  entityId: string;

  // File metadata
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  fileExtension?: string;

  // Storage location
  storageProvider: StorageProvider;
  storageBucket: string;
  storageKey: string;
  storageUrl?: string;

  // Security
  isPublic: boolean;
  accessLevel: FileAccessLevel;

  // Preview
  thumbnailUrl?: string;
  previewAvailable: boolean;

  // Categorization
  category?: FileCategory;
  tags: string[];
  description?: string;

  // Version tracking
  version: number;
  previousVersionId?: string;

  // Virus scan
  scanStatus: ScanStatus;
  scannedAt?: Date;

  // Download tracking
  downloadCount: number;
  lastDownloadedAt?: Date;
  lastDownloadedBy?: string;

  // Audit
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Additional metadata from joins
  uploaderName?: string;
  uploaderEmail?: string;
}

/**
 * Upload file request
 */
export interface UploadFileRequest {
  entityType: AttachmentEntityType;
  entityId: string;
  file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  category?: FileCategory;
  tags?: string[];
  description?: string;
  accessLevel?: FileAccessLevel;
  isPublic?: boolean;
}

/**
 * Upload URL request (for direct browser uploads)
 */
export interface GetUploadUrlRequest {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category?: FileCategory;
}

/**
 * Presigned URL response
 */
export interface PresignedUrlResponse {
  uploadUrl: string;
  fileId: string;
  storageKey: string;
  expiresAt: Date;
  fields?: Record<string, string>; // For S3 POST policy
}

/**
 * Download URL request
 */
export interface GetDownloadUrlRequest {
  attachmentId: string;
  expiresIn?: number; // seconds
}

/**
 * Download URL response
 */
export interface DownloadUrlResponse {
  downloadUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  expiresAt: Date;
}

/**
 * List attachments query options
 */
export interface ListAttachmentsOptions {
  entityType?: AttachmentEntityType;
  entityId?: string;
  category?: FileCategory;
  mimeType?: string;
  uploadedBy?: string;
  search?: string;
  tags?: string[];
  includeDeleted?: boolean;
  sortBy?: 'createdAt' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated attachments response
 */
export interface PaginatedAttachmentsResponse {
  attachments: Attachment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Update attachment request
 */
export interface UpdateAttachmentRequest {
  description?: string;
  category?: FileCategory;
  tags?: string[];
  accessLevel?: FileAccessLevel;
  isPublic?: boolean;
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  provider: StorageProvider;
  bucket: string;

  // AWS S3
  s3?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For S3-compatible services
  };

  // Google Cloud Storage
  gcs?: {
    projectId: string;
    credentials: object;
  };

  // Azure Blob Storage
  azure?: {
    accountName: string;
    accountKey: string;
    containerName: string;
  };

  // Supabase Storage
  supabase?: {
    url: string;
    serviceKey: string;
  };

  // Local file system
  local?: {
    basePath: string;
    baseUrl: string;
  };

  // Common settings
  maxFileSize: number; // in bytes
  allowedMimeTypes?: string[];
  publicUrlExpiry?: number; // seconds
}

/**
 * Storage provider interface
 */
export interface IStorageProvider {
  readonly provider: StorageProvider;

  /**
   * Upload a file
   */
  upload(key: string, buffer: Buffer, mimeType: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Download a file
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file
   */
  delete(key: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get presigned upload URL
   */
  getUploadUrl(key: string, mimeType: string, expiresIn?: number): Promise<PresignedUrl>;

  /**
   * Get presigned download URL
   */
  getDownloadUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Copy a file
   */
  copy(sourceKey: string, destKey: string): Promise<void>;

  /**
   * Get file metadata
   */
  getMetadata(key: string): Promise<FileMetadata>;
}

/**
 * Upload options
 */
export interface UploadOptions {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

/**
 * Upload result
 */
export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  etag?: string;
}

/**
 * Presigned URL
 */
export interface PresignedUrl {
  url: string;
  fields?: Record<string, string>;
  expiresAt: Date;
}

/**
 * File metadata from storage
 */
export interface FileMetadata {
  key: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

/**
 * Allowed file types configuration
 */
export const ALLOWED_FILE_TYPES: Record<FileCategory, string[]> = {
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  video: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
  audio: [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
  ],
  contract: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  proposal: [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  invoice: [
    'application/pdf',
  ],
  presentation: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  spreadsheet: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  ],
  other: [],
};

/**
 * Default max file sizes by category (in bytes)
 */
export const MAX_FILE_SIZES: Record<FileCategory, number> = {
  document: 50 * 1024 * 1024, // 50MB
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
  contract: 50 * 1024 * 1024, // 50MB
  proposal: 100 * 1024 * 1024, // 100MB
  invoice: 10 * 1024 * 1024, // 10MB
  presentation: 100 * 1024 * 1024, // 100MB
  spreadsheet: 50 * 1024 * 1024, // 50MB
  other: 50 * 1024 * 1024, // 50MB
};

/**
 * File extension to MIME type mapping
 */
export const EXTENSION_MIME_MAP: Record<string, string> = {
  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',

  // Spreadsheets
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',

  // Presentations
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',

  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',

  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
};

/**
 * Get file category from MIME type
 */
export function getCategoryFromMimeType(mimeType: string): FileCategory {
  for (const [category, types] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (types.includes(mimeType)) {
      return category as FileCategory;
    }
  }
  return 'other';
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove or replace dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Generate storage key
 */
export function generateStorageKey(
  tenantId: string,
  entityType: string,
  entityId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(fileName);
  return `${tenantId}/${entityType}/${entityId}/${timestamp}_${sanitizedName}`;
}
