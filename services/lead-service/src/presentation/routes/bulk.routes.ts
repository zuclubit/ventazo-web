/**
 * Bulk Operations Routes
 * Provides API endpoints for bulk lead operations and import/export
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { LeadStatusEnum } from '../../domain/value-objects';
import { BulkCreateLeadsHandler } from '../../application/commands/bulk-create-leads.handler';
import {
  BulkUpdateLeadsHandler,
  BulkAssignLeadsHandler,
  BulkChangeStatusHandler,
  BulkDeleteLeadsHandler,
} from '../../application/commands/bulk-update-leads.handler';
import { BulkCreateLeadsCommand } from '../../application/commands/bulk-create-leads.command';
import {
  BulkUpdateLeadsCommand,
  BulkAssignLeadsCommand,
  BulkChangeStatusCommand,
  BulkDeleteLeadsCommand,
} from '../../application/commands/bulk-update-leads.command';
import { ImportExportService, ImportFormat, ExportFormat } from '../../infrastructure/import-export';
import { ILeadRepository } from '../../domain/repositories';

// Validation Schemas
const bulkLeadDataSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: z.string().email(),
  source: z.string().min(1),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.unknown()).optional(),
  ownerId: z.string().uuid().optional(),
});

const bulkCreateSchema = z.object({
  leads: z.array(bulkLeadDataSchema).min(1).max(1000),
  options: z
    .object({
      skipDuplicates: z.boolean().optional(),
      duplicateCheckFields: z.array(z.enum(['email', 'companyName', 'phone'])).optional(),
      validateOnly: z.boolean().optional(),
    })
    .optional(),
});

const bulkUpdateSchema = z.object({
  updates: z
    .array(
      z.object({
        leadId: z.string().uuid(),
        companyName: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        website: z.string().url().optional(),
        industry: z.string().optional(),
        employeeCount: z.number().int().positive().optional(),
        annualRevenue: z.number().positive().optional(),
        notes: z.string().max(5000).optional(),
        customFields: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .max(500),
});

const bulkAssignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  ownerId: z.string().uuid(),
});

const bulkChangeStatusSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.nativeEnum(LeadStatusEnum),
  reason: z.string().optional(),
});

const bulkDeleteSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1).max(500),
  hardDelete: z.boolean().optional(),
});

const importSchema = z.object({
  format: z.nativeEnum(ImportFormat),
  data: z.string().min(1),
  columnMappings: z
    .array(
      z.object({
        sourceColumn: z.string(),
        targetField: z.string(),
        transform: z.enum(['lowercase', 'uppercase', 'trim', 'phone', 'email', 'date']).optional(),
        defaultValue: z.string().optional(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
  skipFirstRow: z.boolean().optional(),
  skipDuplicates: z.boolean().optional(),
  duplicateCheckFields: z.array(z.enum(['email', 'companyName', 'phone'])).optional(),
  defaultSource: z.string().optional(),
  defaultOwnerId: z.string().uuid().optional(),
  dryRun: z.boolean().optional(),
});

const exportSchema = z.object({
  format: z.nativeEnum(ExportFormat),
  fields: z.array(z.string()).optional(),
  filters: z
    .object({
      status: z.array(z.string()).optional(),
      source: z.array(z.string()).optional(),
      ownerId: z.array(z.string().uuid()).optional(),
      industry: z.array(z.string()).optional(),
      scoreMin: z.number().min(0).max(100).optional(),
      scoreMax: z.number().min(0).max(100).optional(),
      createdAfter: z.string().datetime().optional(),
      createdBefore: z.string().datetime().optional(),
    })
    .optional(),
  includeCustomFields: z.boolean().optional(),
});

// JSON Schema equivalents for Fastify schema validation
const bulkCreateSchemaJSON = {
  type: 'object',
  required: ['leads'],
  properties: {
    leads: {
      type: 'array',
      minItems: 1,
      maxItems: 1000,
      items: {
        type: 'object',
        required: ['companyName', 'email', 'source'],
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          source: { type: 'string', minLength: 1 },
          phone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          industry: { type: 'string' },
          employeeCount: { type: 'integer', minimum: 1 },
          annualRevenue: { type: 'number', minimum: 0 },
          notes: { type: 'string', maxLength: 5000 },
          customFields: { type: 'object' },
          ownerId: { type: 'string', format: 'uuid' },
        },
      },
    },
    options: {
      type: 'object',
      properties: {
        skipDuplicates: { type: 'boolean' },
        duplicateCheckFields: {
          type: 'array',
          items: { type: 'string', enum: ['email', 'companyName', 'phone'] },
        },
        validateOnly: { type: 'boolean' },
      },
    },
  },
};

const bulkUpdateSchemaJSON = {
  type: 'object',
  required: ['updates'],
  properties: {
    updates: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: {
        type: 'object',
        required: ['leadId'],
        properties: {
          leadId: { type: 'string', format: 'uuid' },
          companyName: { type: 'string', minLength: 1, maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          industry: { type: 'string' },
          employeeCount: { type: 'integer', minimum: 1 },
          annualRevenue: { type: 'number', minimum: 0 },
          notes: { type: 'string', maxLength: 5000 },
          customFields: { type: 'object' },
        },
      },
    },
  },
};

const bulkAssignSchemaJSON = {
  type: 'object',
  required: ['leadIds', 'ownerId'],
  properties: {
    leadIds: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: { type: 'string', format: 'uuid' },
    },
    ownerId: { type: 'string', format: 'uuid' },
  },
};

const bulkChangeStatusSchemaJSON = {
  type: 'object',
  required: ['leadIds', 'status'],
  properties: {
    leadIds: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: { type: 'string', format: 'uuid' },
    },
    status: {
      type: 'string',
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
    },
    reason: { type: 'string' },
  },
};

const bulkDeleteSchemaJSON = {
  type: 'object',
  required: ['leadIds'],
  properties: {
    leadIds: {
      type: 'array',
      minItems: 1,
      maxItems: 500,
      items: { type: 'string', format: 'uuid' },
    },
    hardDelete: { type: 'boolean' },
  },
};

const importSchemaJSON = {
  type: 'object',
  required: ['format', 'data'],
  properties: {
    format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
    data: { type: 'string', minLength: 1 },
    columnMappings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sourceColumn', 'targetField'],
        properties: {
          sourceColumn: { type: 'string' },
          targetField: { type: 'string' },
          transform: {
            type: 'string',
            enum: ['lowercase', 'uppercase', 'trim', 'phone', 'email', 'date'],
          },
          defaultValue: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
    },
    skipFirstRow: { type: 'boolean' },
    skipDuplicates: { type: 'boolean' },
    duplicateCheckFields: {
      type: 'array',
      items: { type: 'string', enum: ['email', 'companyName', 'phone'] },
    },
    defaultSource: { type: 'string' },
    defaultOwnerId: { type: 'string', format: 'uuid' },
    dryRun: { type: 'boolean' },
  },
};

const exportSchemaJSON = {
  type: 'object',
  required: ['format'],
  properties: {
    format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
    fields: {
      type: 'array',
      items: { type: 'string' },
    },
    filters: {
      type: 'object',
      properties: {
        status: {
          type: 'array',
          items: { type: 'string' },
        },
        source: {
          type: 'array',
          items: { type: 'string' },
        },
        ownerId: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
        },
        industry: {
          type: 'array',
          items: { type: 'string' },
        },
        scoreMin: { type: 'number', minimum: 0, maximum: 100 },
        scoreMax: { type: 'number', minimum: 0, maximum: 100 },
        createdAfter: { type: 'string', format: 'date-time' },
        createdBefore: { type: 'string', format: 'date-time' },
      },
    },
    includeCustomFields: { type: 'boolean' },
  },
};

export async function bulkRoutes(fastify: FastifyInstance) {
  // Register handlers
  const leadRepository = container.resolve<ILeadRepository>('ILeadRepository');
  const bulkCreateHandler = container.resolve(BulkCreateLeadsHandler);
  const bulkUpdateHandler = new BulkUpdateLeadsHandler(leadRepository);
  const bulkAssignHandler = new BulkAssignLeadsHandler(leadRepository);
  const bulkChangeStatusHandler = new BulkChangeStatusHandler(leadRepository);
  const bulkDeleteHandler = new BulkDeleteLeadsHandler(leadRepository);

  // Try to resolve ImportExportService, create if not registered
  let importExportService: ImportExportService;
  try {
    importExportService = container.resolve(ImportExportService);
  } catch {
    // Service not registered, will be created inline
    importExportService = container.resolve(ImportExportService);
  }

  /**
   * POST /bulk/create
   * Create multiple leads in a single operation
   */
  fastify.post(
    '/create',
    {
      schema: {
        description: 'Create multiple leads in a single operation',
        tags: ['Bulk Operations'],
        body: bulkCreateSchemaJSON,
        response: {
          200: {
            type: 'object',
            properties: {
              totalProcessed: { type: 'number' },
              successCount: { type: 'number' },
              failureCount: { type: 'number' },
              duplicateCount: { type: 'number' },
              results: { type: 'array' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkCreateSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const command = new BulkCreateLeadsCommand(
        tenantId,
        request.body.leads,
        userId,
        request.body.options
      );

      const handler = new BulkCreateLeadsHandler(leadRepository);
      const result = await handler.execute(command);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * PATCH /bulk/update
   * Update multiple leads in a single operation
   */
  fastify.patch(
    '/update',
    {
      schema: {
        description: 'Update multiple leads in a single operation',
        tags: ['Bulk Operations'],
        body: bulkUpdateSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkUpdateSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const command = new BulkUpdateLeadsCommand(
        tenantId,
        request.body.updates,
        userId
      );

      const result = await bulkUpdateHandler.execute(command);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /bulk/assign
   * Assign multiple leads to an owner
   */
  fastify.post(
    '/assign',
    {
      schema: {
        description: 'Assign multiple leads to an owner',
        tags: ['Bulk Operations'],
        body: bulkAssignSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkAssignSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const command = new BulkAssignLeadsCommand(
        tenantId,
        request.body.leadIds,
        request.body.ownerId,
        userId
      );

      const result = await bulkAssignHandler.execute(command);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /bulk/status
   * Change status of multiple leads
   */
  fastify.post(
    '/status',
    {
      schema: {
        description: 'Change status of multiple leads',
        tags: ['Bulk Operations'],
        body: bulkChangeStatusSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkChangeStatusSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const command = new BulkChangeStatusCommand(
        tenantId,
        request.body.leadIds,
        request.body.status,
        userId,
        request.body.reason
      );

      const result = await bulkChangeStatusHandler.execute(command);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /bulk/delete
   * Delete multiple leads
   */
  fastify.delete(
    '/delete',
    {
      schema: {
        description: 'Delete multiple leads',
        tags: ['Bulk Operations'],
        body: bulkDeleteSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkDeleteSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const command = new BulkDeleteLeadsCommand(
        tenantId,
        request.body.leadIds,
        userId,
        request.body.hardDelete
      );

      const result = await bulkDeleteHandler.execute(command);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /bulk/import
   * Import leads from CSV or JSON
   */
  fastify.post(
    '/import',
    {
      schema: {
        description: 'Import leads from CSV or JSON data',
        tags: ['Import/Export'],
        body: importSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof importSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { format, data, columnMappings, ...options } = request.body;

      // Auto-detect mappings if not provided
      let mappings = columnMappings;
      if (!mappings && format === ImportFormat.CSV) {
        const headers = importExportService.getHeaders(data);
        mappings = importExportService.autoDetectMappings(headers);
      }

      const result = await importExportService.processImport(
        tenantId,
        data,
        {
          format,
          columnMappings: mappings || [],
          skipFirstRow: options.skipFirstRow,
          skipDuplicates: options.skipDuplicates,
          duplicateCheckFields: options.duplicateCheckFields,
          defaultSource: options.defaultSource,
          defaultOwnerId: options.defaultOwnerId,
          dryRun: options.dryRun,
        },
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /bulk/export
   * Export leads to CSV or JSON
   */
  fastify.post(
    '/export',
    {
      schema: {
        description: 'Export leads to CSV or JSON',
        tags: ['Import/Export'],
        body: exportSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof exportSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await importExportService.exportLeads(tenantId, {
        format: request.body.format,
        fields: request.body.fields,
        filters: request.body.filters
          ? {
              ...request.body.filters,
              createdAfter: request.body.filters.createdAfter
                ? new Date(request.body.filters.createdAfter)
                : undefined,
              createdBefore: request.body.filters.createdBefore
                ? new Date(request.body.filters.createdBefore)
                : undefined,
            }
          : undefined,
        includeCustomFields: request.body.includeCustomFields,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const exportData = result.getValue();

      // Set appropriate content type
      const contentType =
        exportData.format === ExportFormat.CSV
          ? 'text/csv'
          : 'application/json';

      return reply
        .header('Content-Type', contentType)
        .header(
          'Content-Disposition',
          `attachment; filename="leads-export-${Date.now()}.${exportData.format}"`
        )
        .send(exportData.data);
    }
  );

  /**
   * GET /bulk/import/template
   * Get import template CSV
   */
  fastify.get(
    '/import/template',
    {
      schema: {
        description: 'Get CSV import template',
        tags: ['Import/Export'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="lead-import-template.csv"')
        .send(importExportService.getImportTemplate());
    }
  );

  /**
   * GET /bulk/import/sample
   * Get sample import data
   */
  fastify.get(
    '/import/sample',
    {
      schema: {
        description: 'Get sample CSV import data',
        tags: ['Import/Export'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', 'attachment; filename="lead-import-sample.csv"')
        .send(importExportService.getSampleImportData());
    }
  );

  /**
   * POST /bulk/import/preview
   * Preview import without creating leads
   */
  fastify.post(
    '/import/preview',
    {
      schema: {
        description: 'Preview import results without creating leads',
        tags: ['Import/Export'],
        body: importSchemaJSON,
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof importSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { format, data, columnMappings, ...options } = request.body;

      // Auto-detect mappings if not provided
      let mappings = columnMappings;
      if (!mappings && format === ImportFormat.CSV) {
        const headers = importExportService.getHeaders(data);
        mappings = importExportService.autoDetectMappings(headers);
      }

      // Run in dry run mode
      const result = await importExportService.processImport(
        tenantId,
        data,
        {
          format,
          columnMappings: mappings || [],
          skipFirstRow: options.skipFirstRow,
          skipDuplicates: options.skipDuplicates,
          duplicateCheckFields: options.duplicateCheckFields,
          defaultSource: options.defaultSource,
          defaultOwnerId: options.defaultOwnerId,
          dryRun: true,
        },
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        ...result.getValue(),
        message: 'Preview only - no leads were created',
      });
    }
  );
}
