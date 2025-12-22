/**
 * Deduplication Routes
 * Provides API endpoints for duplicate detection and merging
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { container } from 'tsyringe';
import {
  DeduplicationService,
  DuplicateStrategy,
  DuplicateConfidence,
  MergeStrategy,
} from '../../infrastructure/deduplication';

// Validation Schemas
const duplicateCheckFieldSchema = z.enum(['email', 'companyName', 'phone', 'website', 'domain']);

const duplicateConfigSchema = z.object({
  fields: z.array(duplicateCheckFieldSchema).optional(),
  strategy: z.nativeEnum(DuplicateStrategy).optional(),
  minConfidence: z.nativeEnum(DuplicateConfidence).optional(),
  fuzzyThreshold: z.number().min(0).max(1).optional(),
  ignoreCase: z.boolean().optional(),
  normalizePhones: z.boolean().optional(),
  normalizeDomains: z.boolean().optional(),
});

const findDuplicatesSchema = z.object({
  config: duplicateConfigSchema.optional(),
});

const scanDuplicatesSchema = z.object({
  config: duplicateConfigSchema.optional(),
  leadIds: z.array(z.string().uuid()).optional(),
  excludeLeadIds: z.array(z.string().uuid()).optional(),
  includeAlreadyGrouped: z.boolean().optional(),
  maxResults: z.number().int().positive().max(1000).optional(),
});

const checkDuplicateSchema = z.object({
  companyName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  config: duplicateConfigSchema.optional(),
});

const mergeLeadsSchema = z.object({
  primaryLeadId: z.string().uuid(),
  duplicateLeadIds: z.array(z.string().uuid()).min(1),
  fieldConfigs: z
    .array(
      z.object({
        field: z.string(),
        strategy: z.nativeEnum(MergeStrategy),
      })
    )
    .optional(),
  defaultStrategy: z.nativeEnum(MergeStrategy).optional(),
  deleteAfterMerge: z.boolean().optional(),
  preserveHistory: z.boolean().optional(),
});

// Convert Zod schemas to JSON Schema for Fastify
const leadIdParamsJsonSchema = toJsonSchema(z.object({ leadId: z.string().uuid() }));
const duplicateConfigJsonSchema = toJsonSchema(duplicateConfigSchema);
const findDuplicatesJsonSchema = toJsonSchema(findDuplicatesSchema);
const scanDuplicatesJsonSchema = toJsonSchema(scanDuplicatesSchema);
const checkDuplicateJsonSchema = toJsonSchema(checkDuplicateSchema);
const mergeLeadsJsonSchema = toJsonSchema(mergeLeadsSchema);

export async function deduplicationRoutes(fastify: FastifyInstance) {
  const deduplicationService = container.resolve(DeduplicationService);

  /**
   * GET /duplicates/:leadId
   * Find duplicates for a specific lead
   */
  fastify.get(
    '/:leadId',
    {
      schema: {
        description: 'Find duplicates for a specific lead',
        tags: ['Deduplication'],
        params: leadIdParamsJsonSchema,
        querystring: duplicateConfigJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Querystring: z.infer<typeof duplicateConfigSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await deduplicationService.findDuplicates(
        request.params.leadId,
        tenantId,
        request.query
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /duplicates/scan
   * Scan all leads for duplicates
   */
  fastify.post(
    '/scan',
    {
      schema: {
        description: 'Scan all leads for duplicates',
        tags: ['Deduplication'],
        body: scanDuplicatesJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof scanDuplicatesSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await deduplicationService.scanForDuplicates({
        tenantId,
        config: request.body.config,
        leadIds: request.body.leadIds,
        excludeLeadIds: request.body.excludeLeadIds,
        includeAlreadyGrouped: request.body.includeAlreadyGrouped,
        maxResults: request.body.maxResults,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /duplicates/check
   * Check if a lead would be a duplicate before creation
   */
  fastify.post(
    '/check',
    {
      schema: {
        description: 'Check if a lead would be a duplicate before creation',
        tags: ['Deduplication'],
        body: checkDuplicateJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof checkDuplicateSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await deduplicationService.checkForDuplicatesBeforeCreate(
        tenantId,
        request.body.companyName,
        request.body.email,
        request.body.phone,
        request.body.config
      );

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /duplicates/merge
   * Merge duplicate leads
   */
  fastify.post(
    '/merge',
    {
      schema: {
        description: 'Merge duplicate leads into a single lead',
        tags: ['Deduplication'],
        body: mergeLeadsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof mergeLeadsSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await deduplicationService.mergeLeads(tenantId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /duplicates/config
   * Get default duplicate detection configuration
   */
  fastify.get(
    '/config',
    {
      schema: {
        description: 'Get default duplicate detection configuration',
        tags: ['Deduplication'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        fields: ['email', 'companyName'],
        strategy: DuplicateStrategy.NORMALIZED,
        minConfidence: DuplicateConfidence.MEDIUM,
        fuzzyThreshold: 0.8,
        ignoreCase: true,
        normalizePhones: true,
        normalizeDomains: true,
        availableFields: ['email', 'companyName', 'phone', 'website', 'domain'],
        availableStrategies: Object.values(DuplicateStrategy),
        availableConfidenceLevels: Object.values(DuplicateConfidence),
        availableMergeStrategies: Object.values(MergeStrategy),
      });
    }
  );
}
