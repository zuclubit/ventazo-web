/**
 * Data Management Routes
 * API endpoints for data export, import, and storage management
 *
 * @module presentation/routes/data-management.routes
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';

import { getTenantId, getUserId } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import { HttpError } from '../middlewares/error-handler.middleware';
import { DataManagementService } from '../../infrastructure/data-management';
import { requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../../infrastructure/auth';

// ============================================
// Validation Schemas
// ============================================

const exportRequestSchema = z.object({
  entities: z.array(z.enum(['leads', 'customers', 'opportunities', 'tasks', 'contacts', 'all'])).min(1),
  format: z.enum(['json', 'csv', 'xlsx']),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
  filters: z.record(z.unknown()).optional(),
});

const jobIdParamsSchema = z.object({
  jobId: z.string().uuid(),
});

const deleteDataRequestSchema = z.object({
  confirmation: z.string().min(1),
  scope: z.enum(['soft', 'hard']),
  entities: z.array(z.enum(['leads', 'customers', 'opportunities', 'tasks', 'contacts'])).optional(),
});

// ============================================
// Routes
// ============================================

export async function dataManagementRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const dataService = container.resolve(DataManagementService);

  // ============================================
  // EXPORT OPERATIONS
  // ============================================

  /**
   * POST /data/export - Create export job
   */
  server.post<{ Body: z.infer<typeof exportRequestSchema> }>(
    '/export',
    {
      preHandler: validate({ body: exportRequestSchema }),
      schema: {
        description: 'Create a new data export job',
        tags: ['Data Management'],
        body: {
          type: 'object',
          required: ['entities', 'format'],
          properties: {
            entities: {
              type: 'array',
              items: { type: 'string', enum: ['leads', 'customers', 'opportunities', 'tasks', 'contacts', 'all'] },
            },
            format: { type: 'string', enum: ['json', 'csv', 'xlsx'] },
            dateRange: {
              type: 'object',
              properties: {
                from: { type: 'string', format: 'date-time' },
                to: { type: 'string', format: 'date-time' },
              },
            },
            filters: { type: 'object' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              entities: { type: 'array', items: { type: 'string' } },
              format: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof exportRequestSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId || userId === 'system') {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await dataService.createExportJob(tenantId, userId, request.body);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * GET /data/export/:jobId - Get export job status
   */
  server.get<{ Params: z.infer<typeof jobIdParamsSchema> }>(
    '/export/:jobId',
    {
      preHandler: validate({ params: jobIdParamsSchema }),
      schema: {
        description: 'Get export job status',
        tags: ['Data Management'],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              downloadUrl: { type: 'string' },
              expiresAt: { type: 'string' },
              error: { type: 'string' },
              entities: { type: 'array', items: { type: 'string' } },
              format: { type: 'string' },
              createdAt: { type: 'string' },
              completedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof jobIdParamsSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { jobId } = request.params;

      const result = await dataService.getExportJob(jobId, tenantId);

      if (result.isFailure) {
        throw new HttpError(404, 'Not Found', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * GET /data/export/:jobId/download - Download export file
   */
  server.get<{ Params: z.infer<typeof jobIdParamsSchema> }>(
    '/export/:jobId/download',
    {
      preHandler: validate({ params: jobIdParamsSchema }),
      schema: {
        description: 'Download export file',
        tags: ['Data Management'],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof jobIdParamsSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { jobId } = request.params;

      const result = await dataService.getExportJob(jobId, tenantId);

      if (result.isFailure) {
        throw new HttpError(404, 'Not Found', result.getError());
      }

      const job = result.getValue();

      if (job.status !== 'completed' || !job.downloadUrl) {
        throw new HttpError(400, 'Bad Request', 'Export is not ready for download');
      }

      // Redirect to download URL
      return reply.redirect(302, job.downloadUrl);
    }
  );

  /**
   * GET /data/export/history - Get export history
   */
  server.get(
    '/export/history',
    {
      schema: {
        description: 'Get export job history',
        tags: ['Data Management'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                entities: { type: 'array', items: { type: 'string' } },
                format: { type: 'string' },
                status: { type: 'string' },
                fileSize: { type: 'integer' },
                downloadUrl: { type: 'string' },
                expiresAt: { type: 'string' },
                createdAt: { type: 'string' },
                completedAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { limit?: number } }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const limit = request.query.limit || 50;

      const result = await dataService.getExportHistory(tenantId, limit);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * DELETE /data/export/:jobId - Cancel export job
   */
  server.delete<{ Params: z.infer<typeof jobIdParamsSchema> }>(
    '/export/:jobId',
    {
      preHandler: validate({ params: jobIdParamsSchema }),
      schema: {
        description: 'Cancel an export job',
        tags: ['Data Management'],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof jobIdParamsSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { jobId } = request.params;

      const result = await dataService.cancelExportJob(jobId, tenantId);

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send({ success: true });
    }
  );

  // ============================================
  // IMPORT OPERATIONS
  // ============================================

  /**
   * POST /data/import - Create import job (multipart form)
   */
  server.post(
    '/import',
    {
      schema: {
        description: 'Create a new data import job',
        tags: ['Data Management'],
        consumes: ['multipart/form-data'],
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              totalRecords: { type: 'integer' },
              processedRecords: { type: 'integer' },
              successCount: { type: 'integer' },
              errorCount: { type: 'integer' },
              errors: { type: 'array' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId || userId === 'system') {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // Handle multipart form data
      const data = await request.file();
      if (!data) {
        throw new HttpError(400, 'Bad Request', 'No file uploaded');
      }

      const fileBuffer = await data.toBuffer();
      const fileName = data.filename;

      // Parse form fields
      const entityType = (data.fields?.entityType as { value: string })?.value || 'leads';
      const mode = (data.fields?.mode as { value: string })?.value || 'merge';
      const validateOnly = (data.fields?.validateOnly as { value: string })?.value === 'true';

      const result = await dataService.createImportJob(
        tenantId,
        userId,
        {
          entityType: entityType as 'leads' | 'customers' | 'opportunities' | 'tasks' | 'contacts' | 'all',
          mode: mode as 'merge' | 'replace' | 'skip',
          validateOnly,
        },
        fileBuffer,
        fileName
      );

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * GET /data/import/:jobId - Get import job status
   */
  server.get<{ Params: z.infer<typeof jobIdParamsSchema> }>(
    '/import/:jobId',
    {
      preHandler: validate({ params: jobIdParamsSchema }),
      schema: {
        description: 'Get import job status',
        tags: ['Data Management'],
        params: {
          type: 'object',
          required: ['jobId'],
          properties: {
            jobId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              status: { type: 'string' },
              progress: { type: 'number' },
              totalRecords: { type: 'integer' },
              processedRecords: { type: 'integer' },
              successCount: { type: 'integer' },
              errorCount: { type: 'integer' },
              errors: { type: 'array' },
              createdAt: { type: 'string' },
              completedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: z.infer<typeof jobIdParamsSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { jobId } = request.params;

      const result = await dataService.getImportJob(jobId, tenantId);

      if (result.isFailure) {
        throw new HttpError(404, 'Not Found', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ============================================
  // STORAGE OPERATIONS
  // ============================================

  /**
   * GET /data/storage/stats - Get storage statistics
   */
  server.get(
    '/storage/stats',
    {
      schema: {
        description: 'Get storage statistics for the tenant',
        tags: ['Data Management'],
        response: {
          200: {
            type: 'object',
            properties: {
              totalUsed: { type: 'integer' },
              totalQuota: { type: 'integer' },
              usagePercentage: { type: 'integer' },
              breakdown: {
                type: 'object',
                properties: {
                  documents: { type: 'integer' },
                  attachments: { type: 'integer' },
                  exports: { type: 'integer' },
                  other: { type: 'integer' },
                },
              },
              lastUpdated: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await dataService.getStorageStats(tenantId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ============================================
  // DATA DELETION OPERATIONS
  // ============================================

  /**
   * DELETE /data/delete-all - Delete all tenant data (Owner only)
   */
  server.delete<{ Body: z.infer<typeof deleteDataRequestSchema> }>(
    '/delete-all',
    {
      preHandler: [
        requireRole(UserRole.OWNER),
        validate({ body: deleteDataRequestSchema }),
      ],
      schema: {
        description: 'Delete all tenant data (Owner only - DANGEROUS)',
        tags: ['Data Management'],
        body: {
          type: 'object',
          required: ['confirmation', 'scope'],
          properties: {
            confirmation: { type: 'string', description: 'Must match tenant name exactly' },
            scope: { type: 'string', enum: ['soft', 'hard'] },
            entities: {
              type: 'array',
              items: { type: 'string', enum: ['leads', 'customers', 'opportunities', 'tasks', 'contacts'] },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              deletedCounts: { type: 'object' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof deleteDataRequestSchema> }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId || userId === 'system') {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await dataService.deleteAllData(tenantId, userId, request.body);

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );
}

export default dataManagementRoutes;
