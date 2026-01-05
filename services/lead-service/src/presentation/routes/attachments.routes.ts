/**
 * Attachments Routes
 * REST API endpoints for file storage and attachment management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { StorageService } from '../../infrastructure/storage';
import {
  AttachmentEntityType,
  FileCategory,
  FileAccessLevel,
  UpdateAttachmentRequest,
} from '../../infrastructure/storage/types';

// Request schemas
interface UploadFileBody {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileData: string; // Base64 encoded file data
  category?: FileCategory;
  tags?: string[];
  description?: string;
  accessLevel?: FileAccessLevel;
  isPublic?: boolean;
}

interface GetUploadUrlBody {
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category?: FileCategory;
}

interface ListAttachmentsQuery {
  entityType?: AttachmentEntityType;
  entityId?: string;
  category?: FileCategory;
  mimeType?: string;
  uploadedBy?: string;
  search?: string;
  tags?: string;
  includeDeleted?: boolean;
  sortBy?: 'createdAt' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface AttachmentParams {
  id: string;
}

interface DownloadUrlQuery {
  expiresIn?: number;
}

export async function attachmentsRoutes(fastify: FastifyInstance): Promise<void> {
  const storageService = container.resolve<StorageService>('StorageService');

  /**
   * Upload a file directly
   * POST /api/v1/attachments/upload
   */
  fastify.post(
    '/upload',
    async (
      request: FastifyRequest<{ Body: UploadFileBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const body = request.body;

      // Decode base64 file data
      if (!body.fileData) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No file data provided',
        });
      }

      const buffer = Buffer.from(body.fileData, 'base64');

      const result = await storageService.uploadFile(
        tenantId,
        userId,
        {
          entityType: body.entityType,
          entityId: body.entityId,
          file: {
            buffer,
            originalName: body.fileName,
            mimeType: body.mimeType,
            size: buffer.length,
          },
          category: body.category,
          tags: body.tags,
          description: body.description,
          accessLevel: body.accessLevel,
          isPublic: body.isPublic,
        }
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Upload Failed',
          message: result.error || 'Failed to upload file',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get presigned upload URL for direct browser upload
   * POST /api/v1/attachments/upload-url
   */
  fastify.post(
    '/upload-url',
    async (
      request: FastifyRequest<{ Body: GetUploadUrlBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { entityType, entityId, fileName, mimeType, fileSize, category } =
        request.body;

      const result = await storageService.getUploadUrl(
        tenantId,
        userId,
        {
          entityType,
          entityId,
          fileName,
          mimeType,
          fileSize,
          category,
        }
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Failed to generate upload URL',
          message: result.error || 'Unknown error',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Confirm upload completed (after direct browser upload)
   * POST /api/v1/attachments/:id/confirm
   *
   * This endpoint:
   * 1. Verifies the file exists in storage
   * 2. Updates storage_url with proper URL (public or generates presigned)
   * 3. Marks the attachment as ready
   */
  fastify.post(
    '/:id/confirm',
    async (
      request: FastifyRequest<{ Params: AttachmentParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      // Get the attachment to verify it exists and get storage details
      const attachmentResult = await storageService.getAttachmentById(tenantId, id);

      if (attachmentResult.isFailure || !attachmentResult.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Attachment not found',
        });
      }

      const attachment = attachmentResult.value;

      // Verify the file exists in storage and get download URL
      const downloadResult = await storageService.getDownloadUrl(
        tenantId,
        id,
        86400 // 24 hour expiry for the storage URL
      );

      if (downloadResult.isFailure || !downloadResult.value) {
        return reply.status(400).send({
          error: 'Confirmation Failed',
          message: 'Could not verify file in storage. Please try uploading again.',
        });
      }

      // Update the attachment with storage URL
      const updateResult = await storageService.confirmUpload(
        tenantId,
        id,
        downloadResult.value.downloadUrl
      );

      if (updateResult.isFailure || !updateResult.value) {
        return reply.status(400).send({
          error: 'Confirmation Failed',
          message: updateResult.error || 'Failed to confirm upload',
        });
      }

      return reply.status(200).send({
        success: true,
        data: updateResult.value,
      });
    }
  );

  /**
   * Get download URL for an attachment
   * GET /api/v1/attachments/:id/download-url
   */
  fastify.get(
    '/:id/download-url',
    async (
      request: FastifyRequest<{
        Params: AttachmentParams;
        Querystring: DownloadUrlQuery;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;
      const { expiresIn } = request.query;

      const result = await storageService.getDownloadUrl(
        tenantId,
        id,
        expiresIn
      );

      // Track download if user is provided
      if (userId && result.isSuccess && result.value) {
        await storageService.trackDownload(tenantId, id, userId);
      }

      if (result.isFailure || !result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error || 'Attachment not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * List attachments with filtering
   * GET /api/v1/attachments
   */
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListAttachmentsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const {
        entityType,
        entityId,
        category,
        mimeType,
        uploadedBy,
        search,
        tags,
        includeDeleted,
        sortBy,
        sortOrder,
        page,
        limit,
      } = request.query;

      const result = await storageService.listAttachments(
        tenantId,
        {
          entityType,
          entityId,
          category,
          mimeType,
          uploadedBy,
          search,
          tags: tags ? tags.split(',') : undefined,
          includeDeleted,
          sortBy,
          sortOrder,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        }
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list attachments',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get attachments for a specific entity
   * GET /api/v1/attachments/entity/:entityType/:entityId
   */
  fastify.get(
    '/entity/:entityType/:entityId',
    async (
      request: FastifyRequest<{
        Params: { entityType: AttachmentEntityType; entityId: string };
        Querystring: ListAttachmentsQuery;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { entityType, entityId } = request.params;
      const { category, sortBy, sortOrder, page, limit } = request.query;

      const result = await storageService.listAttachments(
        tenantId,
        {
          entityType,
          entityId,
          category,
          sortBy,
          sortOrder,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
        }
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list attachments',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get attachment details
   * GET /api/v1/attachments/:id
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: AttachmentParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await storageService.getAttachmentById(tenantId, id);

      if (result.isFailure || !result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: result.error || 'Attachment not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Update attachment metadata
   * PATCH /api/v1/attachments/:id
   */
  fastify.patch(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: AttachmentParams;
        Body: UpdateAttachmentRequest;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { id } = request.params;
      const updates = request.body;

      const result = await storageService.updateAttachment(
        tenantId,
        id,
        updates
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Update Failed',
          message: result.error || 'Failed to update attachment',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Delete attachment (soft delete)
   * DELETE /api/v1/attachments/:id
   */
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{ Params: AttachmentParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { id } = request.params;

      const result = await storageService.deleteAttachment(tenantId, id);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Delete Failed',
          message: result.error || 'Failed to delete attachment',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Attachment deleted successfully',
      });
    }
  );

  /**
   * Permanently delete attachment
   * DELETE /api/v1/attachments/:id/permanent
   */
  fastify.delete(
    '/:id/permanent',
    async (
      request: FastifyRequest<{ Params: AttachmentParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { id } = request.params;

      const result = await storageService.permanentlyDeleteAttachment(
        tenantId,
        id
      );

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Delete Failed',
          message: result.error || 'Failed to permanently delete attachment',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Attachment permanently deleted',
      });
    }
  );

  /**
   * Copy attachment to another entity
   * POST /api/v1/attachments/:id/copy
   */
  fastify.post(
    '/:id/copy',
    async (
      request: FastifyRequest<{
        Params: AttachmentParams;
        Body: { entityType: AttachmentEntityType; entityId: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { id } = request.params;
      const { entityType, entityId } = request.body;

      const result = await storageService.copyAttachment(
        tenantId,
        userId,
        id,
        entityType,
        entityId
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Copy Failed',
          message: result.error || 'Failed to copy attachment',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );
}
