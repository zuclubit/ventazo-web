/**
 * Storage Service
 * Unified file storage management with support for multiple providers
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  Attachment,
  StorageProvider,
  AttachmentEntityType,
  FileCategory,
  FileAccessLevel,
  ScanStatus,
  UploadFileRequest,
  GetUploadUrlRequest,
  PresignedUrlResponse,
  DownloadUrlResponse,
  ListAttachmentsOptions,
  PaginatedAttachmentsResponse,
  UpdateAttachmentRequest,
  StorageConfig,
  IStorageProvider,
  getCategoryFromMimeType,
  getFileExtension,
  generateStorageKey,
  MAX_FILE_SIZES,
  ALLOWED_FILE_TYPES,
} from './types';
import { S3StorageProvider, S3ProviderConfig } from './s3.provider';
import { SupabaseStorageProvider, SupabaseProviderConfig } from './supabase.provider';

/**
 * Storage service configuration
 */
export interface StorageServiceConfig {
  provider: StorageProvider;
  s3?: S3ProviderConfig;
  supabase?: SupabaseProviderConfig;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
}

/**
 * Get storage configuration from environment
 */
export function getStorageConfig(): StorageServiceConfig | undefined {
  const provider = process.env.STORAGE_PROVIDER as StorageProvider;

  if (!provider) {
    return undefined;
  }

  // Cloudflare R2 (S3-compatible) - preferred for production
  if ((provider === 's3' || provider === 'r2') && process.env.R2_ACCOUNT_ID) {
    return {
      provider: 's3', // R2 uses S3 protocol
      s3: {
        region: 'auto',
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
        bucket: process.env.R2_BUCKET_NAME || 'attachments',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
      },
    };
  }

  // AWS S3
  if (provider === 's3' && process.env.AWS_ACCESS_KEY_ID) {
    return {
      provider: 's3',
      s3: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.AWS_S3_BUCKET || 'crm-files',
        endpoint: process.env.AWS_S3_ENDPOINT,
        forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      },
    };
  }

  // Supabase Storage
  if (provider === 'supabase' && process.env.SUPABASE_URL) {
    return {
      provider: 'supabase',
      supabase: {
        url: process.env.SUPABASE_URL,
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
        bucket: process.env.SUPABASE_STORAGE_BUCKET || 'attachments',
      },
    };
  }

  return undefined;
}

@injectable()
export class StorageService {
  private storageProvider?: IStorageProvider;
  private config?: StorageServiceConfig;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    config?: StorageServiceConfig
  ) {
    this.config = config || getStorageConfig();

    if (this.config) {
      this.initializeProvider();
    }
  }

  /**
   * Initialize the storage provider
   */
  private initializeProvider(): void {
    if (!this.config) return;

    switch (this.config.provider) {
      case 's3':
        if (this.config.s3) {
          this.storageProvider = new S3StorageProvider(this.config.s3);
        }
        break;
      case 'supabase':
        if (this.config.supabase) {
          this.storageProvider = new SupabaseStorageProvider(this.config.supabase);
        }
        break;
      default:
        console.warn(`Storage provider ${this.config.provider} not implemented`);
    }
  }

  /**
   * Check if storage is configured
   */
  isConfigured(): boolean {
    return !!this.storageProvider;
  }

  /**
   * Get active storage provider
   */
  getProvider(): StorageProvider | null {
    return this.storageProvider?.provider || null;
  }

  /**
   * Upload a file
   */
  async uploadFile(
    tenantId: string,
    userId: string,
    request: UploadFileRequest
  ): Promise<Result<Attachment>> {
    try {
      if (!this.storageProvider || !this.config) {
        return Result.fail('Storage is not configured');
      }

      // Validate file
      const validationError = this.validateFile(
        request.file.size,
        request.file.mimeType,
        request.category
      );
      if (validationError) {
        return Result.fail(validationError);
      }

      // Generate storage key
      const extension = getFileExtension(request.file.originalName);
      const fileName = `${uuidv4()}.${extension}`;
      const storageKey = generateStorageKey(
        tenantId,
        request.entityType,
        request.entityId,
        fileName
      );

      // Upload to storage provider
      const uploadResult = await this.storageProvider.upload(
        storageKey,
        request.file.buffer,
        request.file.mimeType,
        {
          contentDisposition: `attachment; filename="${request.file.originalName}"`,
        }
      );

      // Determine category
      const category = request.category || getCategoryFromMimeType(request.file.mimeType);

      // Create attachment record
      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO attachments (
          id, tenant_id, entity_type, entity_id,
          file_name, original_name, mime_type, file_size, file_extension,
          storage_provider, storage_bucket, storage_key, storage_url,
          is_public, access_level, category, tags, description,
          version, scan_status, download_count, uploaded_by,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.entityType,
        request.entityId,
        fileName,
        request.file.originalName,
        request.file.mimeType,
        request.file.size,
        extension,
        this.storageProvider.provider,
        uploadResult.bucket,
        storageKey,
        uploadResult.url,
        request.isPublic || false,
        request.accessLevel || 'private',
        category,
        JSON.stringify(request.tags || []),
        request.description || null,
        1,
        'pending',
        0,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        // Cleanup uploaded file on DB failure
        await this.storageProvider.delete(storageKey).catch(() => {});
        return Result.fail('Failed to save attachment record');
      }

      return Result.ok(this.mapRowToAttachment(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get presigned upload URL for direct browser uploads
   */
  async getUploadUrl(
    tenantId: string,
    userId: string,
    request: GetUploadUrlRequest
  ): Promise<Result<PresignedUrlResponse>> {
    try {
      if (!this.storageProvider || !this.config) {
        return Result.fail('Storage is not configured');
      }

      // Validate file
      const validationError = this.validateFile(
        request.fileSize,
        request.mimeType,
        request.category
      );
      if (validationError) {
        return Result.fail(validationError);
      }

      // Generate storage key
      const extension = getFileExtension(request.fileName);
      const fileName = `${uuidv4()}.${extension}`;
      const storageKey = generateStorageKey(
        tenantId,
        request.entityType,
        request.entityId,
        fileName
      );

      // Get presigned URL
      const presigned = await this.storageProvider.getUploadUrl(
        storageKey,
        request.mimeType,
        3600 // 1 hour
      );

      // Create pending attachment record
      const id = uuidv4();
      const category = request.category || getCategoryFromMimeType(request.mimeType);

      const query = `
        INSERT INTO attachments (
          id, tenant_id, entity_type, entity_id,
          file_name, original_name, mime_type, file_size, file_extension,
          storage_provider, storage_bucket, storage_key,
          is_public, access_level, category, tags,
          version, scan_status, download_count, uploaded_by,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id
      `;

      const bucket = this.config.s3?.bucket || this.config.supabase?.bucket || 'attachments';

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.entityType,
        request.entityId,
        fileName,
        request.fileName,
        request.mimeType,
        request.fileSize,
        extension,
        this.storageProvider.provider,
        bucket,
        storageKey,
        false,
        'private',
        category,
        JSON.stringify([]),
        1,
        'pending',
        0,
        userId,
        new Date(),
        new Date(),
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to create attachment record');
      }

      return Result.ok({
        uploadUrl: presigned.url,
        fileId: id,
        storageKey,
        expiresAt: presigned.expiresAt,
        fields: presigned.fields,
      });
    } catch (error) {
      return Result.fail(`Failed to get upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get download URL for an attachment
   */
  async getDownloadUrl(
    tenantId: string,
    attachmentId: string,
    expiresIn: number = 3600
  ): Promise<Result<DownloadUrlResponse>> {
    try {
      if (!this.storageProvider) {
        return Result.fail('Storage is not configured');
      }

      // Get attachment
      const attachmentResult = await this.getAttachmentById(tenantId, attachmentId);
      if (attachmentResult.isFailure || !attachmentResult.value) {
        return Result.fail(attachmentResult.error || 'Attachment not found');
      }

      const attachment = attachmentResult.value;

      // If public, return public URL
      if (attachment.isPublic && attachment.storageUrl) {
        return Result.ok({
          downloadUrl: attachment.storageUrl,
          fileName: attachment.originalName,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Far future for public
        });
      }

      // Generate presigned URL
      const downloadUrl = await this.storageProvider.getDownloadUrl(
        attachment.storageKey,
        expiresIn
      );

      return Result.ok({
        downloadUrl,
        fileName: attachment.originalName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      });
    } catch (error) {
      return Result.fail(`Failed to get download URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm upload completed and update storage URL
   * Called after direct browser upload to presigned URL
   */
  async confirmUpload(
    tenantId: string,
    attachmentId: string,
    storageUrl: string
  ): Promise<Result<Attachment>> {
    try {
      const query = `
        UPDATE attachments
        SET storage_url = $1,
            scan_status = 'clean',
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING *
      `;

      const result = await this.pool.query(query, [storageUrl, attachmentId, tenantId]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to confirm upload');
      }

      return Result.ok(this.mapRowToAttachment(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to confirm upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track download
   */
  async trackDownload(
    tenantId: string,
    attachmentId: string,
    userId: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE attachments
        SET download_count = download_count + 1,
            last_downloaded_at = NOW(),
            last_downloaded_by = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [userId, attachmentId, tenantId]);

      if (result.isFailure) {
        return Result.fail('Failed to track download');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to track download: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attachment by ID
   */
  async getAttachmentById(tenantId: string, attachmentId: string): Promise<Result<Attachment | null>> {
    try {
      const query = `
        SELECT a.*, u.full_name as uploader_name, u.email as uploader_email
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE a.id = $1 AND a.tenant_id = $2 AND a.deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [attachmentId, tenantId]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to fetch attachment');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToAttachment(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List attachments
   */
  async listAttachments(
    tenantId: string,
    options: ListAttachmentsOptions
  ): Promise<Result<PaginatedAttachmentsResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['a.tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (!options.includeDeleted) {
        conditions.push('a.deleted_at IS NULL');
      }

      if (options.entityType) {
        conditions.push(`a.entity_type = $${paramIndex++}`);
        values.push(options.entityType);
      }

      if (options.entityId) {
        conditions.push(`a.entity_id = $${paramIndex++}`);
        values.push(options.entityId);
      }

      if (options.category) {
        conditions.push(`a.category = $${paramIndex++}`);
        values.push(options.category);
      }

      if (options.mimeType) {
        conditions.push(`a.mime_type LIKE $${paramIndex++}`);
        values.push(`${options.mimeType}%`);
      }

      if (options.uploadedBy) {
        conditions.push(`a.uploaded_by = $${paramIndex++}`);
        values.push(options.uploadedBy);
      }

      if (options.search) {
        conditions.push(`(a.original_name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      if (options.tags && options.tags.length > 0) {
        conditions.push(`a.tags ?| $${paramIndex++}`);
        values.push(options.tags);
      }

      const whereClause = conditions.join(' AND ');

      // Sort order
      let orderBy = 'a.created_at DESC';
      if (options.sortBy === 'fileName') {
        orderBy = `a.original_name ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      } else if (options.sortBy === 'fileSize') {
        orderBy = `a.file_size ${options.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
      } else if (options.sortOrder === 'asc') {
        orderBy = 'a.created_at ASC';
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM attachments a WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count attachments');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get attachments
      const query = `
        SELECT a.*, u.full_name as uploader_name, u.email as uploader_email
        FROM attachments a
        LEFT JOIN users u ON a.uploaded_by = u.id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list attachments');
      }

      const attachments = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToAttachment(row)
      );

      return Result.ok({
        attachments,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list attachments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attachments for entity
   */
  async getAttachmentsForEntity(
    tenantId: string,
    entityType: AttachmentEntityType,
    entityId: string
  ): Promise<Result<Attachment[]>> {
    const result = await this.listAttachments(tenantId, {
      entityType,
      entityId,
      limit: 100,
    });

    if (result.isFailure || !result.value) {
      return Result.fail(result.error || 'Failed to get attachments');
    }

    return Result.ok(result.value.attachments);
  }

  /**
   * Update attachment metadata
   */
  async updateAttachment(
    tenantId: string,
    attachmentId: string,
    request: UpdateAttachmentRequest
  ): Promise<Result<Attachment>> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(request.description);
      }

      if (request.category !== undefined) {
        updates.push(`category = $${paramIndex++}`);
        values.push(request.category);
      }

      if (request.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(request.tags));
      }

      if (request.accessLevel !== undefined) {
        updates.push(`access_level = $${paramIndex++}`);
        values.push(request.accessLevel);
      }

      if (request.isPublic !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(request.isPublic);
      }

      if (updates.length === 0) {
        const existing = await this.getAttachmentById(tenantId, attachmentId);
        if (existing.isFailure || !existing.value) {
          return Result.fail(existing.error || 'Attachment not found');
        }
        return Result.ok(existing.value);
      }

      updates.push('updated_at = NOW()');

      const query = `
        UPDATE attachments
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
      `;

      values.push(attachmentId, tenantId);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        return Result.fail('Failed to update attachment');
      }

      return Result.ok(this.mapRowToAttachment(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete attachment (soft delete)
   */
  async deleteAttachment(
    tenantId: string,
    attachmentId: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE attachments
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [attachmentId, tenantId]);

      if (result.isFailure) {
        return Result.fail('Failed to delete attachment');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Permanently delete attachment (hard delete)
   */
  async permanentlyDeleteAttachment(
    tenantId: string,
    attachmentId: string
  ): Promise<Result<void>> {
    try {
      if (!this.storageProvider) {
        return Result.fail('Storage is not configured');
      }

      // Get attachment
      const attachmentResult = await this.pool.query(
        `SELECT storage_key FROM attachments WHERE id = $1 AND tenant_id = $2`,
        [attachmentId, tenantId]
      );

      if (attachmentResult.isFailure || !attachmentResult.value || !attachmentResult.value.rows[0]) {
        return Result.fail('Attachment not found');
      }

      const storageKey = attachmentResult.value.rows[0].storage_key;

      // Delete from storage
      await this.storageProvider.delete(storageKey);

      // Delete from database
      const deleteResult = await this.pool.query(
        `DELETE FROM attachments WHERE id = $1 AND tenant_id = $2`,
        [attachmentId, tenantId]
      );

      if (deleteResult.isFailure) {
        return Result.fail('Failed to delete attachment record');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to permanently delete attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Copy attachment to another entity
   */
  async copyAttachment(
    tenantId: string,
    userId: string,
    attachmentId: string,
    targetEntityType: AttachmentEntityType,
    targetEntityId: string
  ): Promise<Result<Attachment>> {
    try {
      if (!this.storageProvider) {
        return Result.fail('Storage is not configured');
      }

      // Get source attachment
      const sourceResult = await this.getAttachmentById(tenantId, attachmentId);
      if (sourceResult.isFailure || !sourceResult.value) {
        return Result.fail(sourceResult.error || 'Source attachment not found');
      }

      const source = sourceResult.value;

      // Generate new storage key
      const newFileName = `${uuidv4()}.${source.fileExtension || 'bin'}`;
      const newStorageKey = generateStorageKey(
        tenantId,
        targetEntityType,
        targetEntityId,
        newFileName
      );

      // Copy in storage provider
      await this.storageProvider.copy(source.storageKey, newStorageKey);

      // Create new attachment record
      const newId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO attachments (
          id, tenant_id, entity_type, entity_id,
          file_name, original_name, mime_type, file_size, file_extension,
          storage_provider, storage_bucket, storage_key,
          is_public, access_level, category, tags, description,
          version, scan_status, download_count, uploaded_by,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        newId,
        tenantId,
        targetEntityType,
        targetEntityId,
        newFileName,
        source.originalName,
        source.mimeType,
        source.fileSize,
        source.fileExtension,
        source.storageProvider,
        source.storageBucket,
        newStorageKey,
        source.isPublic,
        source.accessLevel,
        source.category,
        JSON.stringify(source.tags),
        source.description,
        1,
        source.scanStatus,
        0,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value || !result.value.rows[0]) {
        // Cleanup copied file on DB failure
        await this.storageProvider.delete(newStorageKey).catch(() => {});
        return Result.fail('Failed to create attachment record');
      }

      return Result.ok(this.mapRowToAttachment(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to copy attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(
    fileSize: number,
    mimeType: string,
    category?: FileCategory
  ): string | null {
    // Check file size
    const categoryForSize = category || getCategoryFromMimeType(mimeType);
    const maxSize = MAX_FILE_SIZES[categoryForSize] || MAX_FILE_SIZES.other;

    if (fileSize > maxSize) {
      return `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`;
    }

    // Check MIME type
    if (category && category !== 'other') {
      const allowedTypes = ALLOWED_FILE_TYPES[category];
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(mimeType)) {
        return `File type ${mimeType} is not allowed for category ${category}`;
      }
    }

    return null;
  }

  /**
   * Map database row to Attachment object
   */
  private mapRowToAttachment(row: Record<string, unknown>): Attachment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      entityType: row.entity_type as AttachmentEntityType,
      entityId: row.entity_id as string,
      fileName: row.file_name as string,
      originalName: row.original_name as string,
      mimeType: row.mime_type as string,
      fileSize: row.file_size as number,
      fileExtension: row.file_extension as string | undefined,
      storageProvider: row.storage_provider as StorageProvider,
      storageBucket: row.storage_bucket as string,
      storageKey: row.storage_key as string,
      storageUrl: row.storage_url as string | undefined,
      isPublic: row.is_public as boolean,
      accessLevel: row.access_level as FileAccessLevel,
      thumbnailUrl: row.thumbnail_url as string | undefined,
      previewAvailable: row.preview_available as boolean,
      category: row.category as FileCategory | undefined,
      tags: (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) as string[] || [],
      description: row.description as string | undefined,
      version: row.version as number,
      previousVersionId: row.previous_version_id as string | undefined,
      scanStatus: row.scan_status as ScanStatus,
      scannedAt: row.scanned_at ? new Date(row.scanned_at as string) : undefined,
      downloadCount: row.download_count as number,
      lastDownloadedAt: row.last_downloaded_at ? new Date(row.last_downloaded_at as string) : undefined,
      lastDownloadedBy: row.last_downloaded_by as string | undefined,
      uploadedBy: row.uploaded_by as string,
      uploaderName: row.uploader_name as string | undefined,
      uploaderEmail: row.uploader_email as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : undefined,
    };
  }
}
