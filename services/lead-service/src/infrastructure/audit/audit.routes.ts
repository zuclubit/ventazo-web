/**
 * Audit Routes
 * REST API endpoints for audit log management
 */
import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AuditService } from './audit.service';

// Validation schemas
const QueryAuditSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  actions: z.array(z.string()).optional(),
  entityTypes: z.array(z.string()).optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  success: z.enum(['true', 'false']).optional(),
  severity: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
  source: z.array(z.enum(['api', 'ui', 'webhook', 'system', 'integration', 'batch'])).optional(),
  search: z.string().optional(),
  correlationId: z.string().optional(),
  page: z.coerce.number().min(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).optional(),
  sortBy: z.enum(['timestamp', 'action', 'entityType', 'userId']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const ExportSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']),
  includeMetadata: z.boolean().optional(),
  includeChanges: z.boolean().optional(),
  dateFormat: z.string().optional(),
  timezone: z.string().optional(),
});

const AlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  condition: z.object({
    actions: z.array(z.string()).optional(),
    entityTypes: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional(),
    threshold: z.number().optional(),
    timeWindow: z.number().optional(),
    successOnly: z.boolean().optional(),
    failureOnly: z.boolean().optional(),
  }),
  severity: z.enum(['warning', 'critical']),
  notifyChannels: z.array(z.enum(['email', 'slack', 'webhook'])),
  notifyUsers: z.array(z.string()),
  isActive: z.boolean(),
  cooldown: z.number().min(1),
});

const RetentionPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  entityTypes: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
  retentionDays: z.number().min(1).max(3650),
  archiveBeforeDelete: z.boolean(),
  archiveLocation: z.string().optional(),
  isActive: z.boolean(),
});

// JSON Schema equivalents for Fastify schema validation
const QueryAuditSchemaJSON = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    actions: { type: 'array', items: { type: 'string' } },
    entityTypes: { type: 'array', items: { type: 'string' } },
    entityId: { type: 'string' },
    userId: { type: 'string' },
    success: { type: 'string', enum: ['true', 'false'] },
    severity: { type: 'array', items: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
    source: { type: 'array', items: { type: 'string', enum: ['api', 'ui', 'webhook', 'system', 'integration', 'batch'] } },
    search: { type: 'string' },
    correlationId: { type: 'string' },
    page: { type: 'number', minimum: 1 },
    pageSize: { type: 'number', minimum: 1, maximum: 100 },
    sortBy: { type: 'string', enum: ['timestamp', 'action', 'entityType', 'userId'] },
    sortOrder: { type: 'string', enum: ['asc', 'desc'] },
  },
};

const StatsQuerySchemaJSON = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
};

const EntityTrailParamsJSON = {
  type: 'object',
  required: ['entityType', 'entityId'],
  properties: {
    entityType: { type: 'string' },
    entityId: { type: 'string' },
  },
};

const EntityTrailQueryJSON = {
  type: 'object',
  properties: {
    page: { type: 'number', minimum: 1 },
    pageSize: { type: 'number', minimum: 1, maximum: 100 },
  },
};

const UserActivityParamsJSON = {
  type: 'object',
  required: ['userId'],
  properties: {
    userId: { type: 'string' },
  },
};

const UserActivityQueryJSON = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    page: { type: 'number', minimum: 1 },
    pageSize: { type: 'number', minimum: 1, maximum: 100 },
  },
};

const ExportSchemaJSON = {
  type: 'object',
  required: ['format'],
  properties: {
    format: { type: 'string', enum: ['json', 'csv', 'xlsx'] },
    includeMetadata: { type: 'boolean' },
    includeChanges: { type: 'boolean' },
    dateFormat: { type: 'string' },
    timezone: { type: 'string' },
  },
};

const ExportBodySchemaJSON = {
  type: 'object',
  required: ['query', 'export'],
  properties: {
    query: QueryAuditSchemaJSON,
    export: ExportSchemaJSON,
  },
};

const ComplianceReportSchemaJSON = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
};

const AlertRuleSchemaJSON = {
  type: 'object',
  required: ['name', 'condition', 'severity', 'notifyChannels', 'notifyUsers', 'isActive', 'cooldown'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    condition: {
      type: 'object',
      properties: {
        actions: { type: 'array', items: { type: 'string' } },
        entityTypes: { type: 'array', items: { type: 'string' } },
        userIds: { type: 'array', items: { type: 'string' } },
        threshold: { type: 'number' },
        timeWindow: { type: 'number' },
        successOnly: { type: 'boolean' },
        failureOnly: { type: 'boolean' },
      },
    },
    severity: { type: 'string', enum: ['warning', 'critical'] },
    notifyChannels: { type: 'array', items: { type: 'string', enum: ['email', 'slack', 'webhook'] } },
    notifyUsers: { type: 'array', items: { type: 'string' } },
    isActive: { type: 'boolean' },
    cooldown: { type: 'number', minimum: 1 },
  },
};

const AlertRuleParamsJSON = {
  type: 'object',
  required: ['ruleId'],
  properties: {
    ruleId: { type: 'string' },
  },
};

const RetentionPolicySchemaJSON = {
  type: 'object',
  required: ['name', 'retentionDays', 'archiveBeforeDelete', 'isActive'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
    entityTypes: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string' } },
    retentionDays: { type: 'number', minimum: 1, maximum: 3650 },
    archiveBeforeDelete: { type: 'boolean' },
    archiveLocation: { type: 'string' },
    isActive: { type: 'boolean' },
  },
};

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(AuditService);

  // Query audit logs
  fastify.get('/logs', {
    schema: {
      description: 'Query audit logs with filters',
      tags: ['Audit'],
      querystring: QueryAuditSchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const query = request.query as z.infer<typeof QueryAuditSchema>;

      const result = await service.query({
        tenantId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        actions: query.actions as any,
        entityTypes: query.entityTypes as any,
        entityId: query.entityId,
        userId: query.userId,
        success: query.success === 'true' ? true : query.success === 'false' ? false : undefined,
        severity: query.severity,
        source: query.source,
        search: query.search,
        correlationId: query.correlationId,
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Get audit statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get audit log statistics',
      tags: ['Audit'],
      querystring: StatsQuerySchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const query = request.query as { startDate?: string; endDate?: string };

      const result = await service.getStats(
        tenantId,
        query.startDate ? new Date(query.startDate) : undefined,
        query.endDate ? new Date(query.endDate) : undefined
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Get entity audit trail
  fastify.get('/trail/:entityType/:entityId', {
    schema: {
      description: 'Get complete audit trail for an entity',
      tags: ['Audit'],
      params: EntityTrailParamsJSON,
      querystring: EntityTrailQueryJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const { entityType, entityId } = request.params as { entityType: string; entityId: string };
      const query = request.query as { page?: number; pageSize?: number };

      const result = await service.getEntityAuditTrail(
        tenantId,
        entityType as any,
        entityId,
        { page: query.page, pageSize: query.pageSize }
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Get user activity log
  fastify.get('/users/:userId/activity', {
    schema: {
      description: 'Get activity log for a specific user',
      tags: ['Audit'],
      params: UserActivityParamsJSON,
      querystring: UserActivityQueryJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const { userId } = request.params as { userId: string };
      const query = request.query as { startDate?: string; endDate?: string; page?: number; pageSize?: number };

      const result = await service.getUserActivityLog(tenantId, userId, {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Export audit logs
  fastify.post('/export', {
    schema: {
      description: 'Export audit logs',
      tags: ['Audit'],
      body: ExportBodySchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const { query, export: exportOptions } = request.body as {
        query: z.infer<typeof QueryAuditSchema>;
        export: z.infer<typeof ExportSchema>;
      };

      const result = await service.export(
        {
          tenantId,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
          actions: query.actions as any,
          entityTypes: query.entityTypes as any,
          entityId: query.entityId,
          userId: query.userId,
        },
        {
          format: exportOptions.format,
          includeMetadata: exportOptions.includeMetadata ?? true,
          includeChanges: exportOptions.includeChanges ?? true,
          dateFormat: exportOptions.dateFormat,
          timezone: exportOptions.timezone,
        }
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const contentType =
        exportOptions.format === 'json'
          ? 'application/json'
          : exportOptions.format === 'csv'
          ? 'text/csv'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      return reply
        .header('Content-Type', contentType)
        .header('Content-Disposition', `attachment; filename=audit-export.${exportOptions.format}`)
        .send(result.value);
    },
  });

  // Generate compliance report
  fastify.post('/compliance-report', {
    schema: {
      description: 'Generate compliance report',
      tags: ['Audit'],
      body: ComplianceReportSchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const { startDate, endDate } = request.body as { startDate: string; endDate: string };

      const result = await service.generateComplianceReport(
        tenantId,
        new Date(startDate),
        new Date(endDate)
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // === Alert Rules ===

  // Get alert rules
  fastify.get('/alerts/rules', {
    schema: {
      description: 'Get all alert rules',
      tags: ['Audit - Alerts'],
    },
    handler: async (request, reply) => {
      const result = await service.getAlertRules();

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Create alert rule
  fastify.post('/alerts/rules', {
    schema: {
      description: 'Create alert rule',
      tags: ['Audit - Alerts'],
      body: AlertRuleSchemaJSON,
    },
    handler: async (request, reply) => {
      const rule = request.body as z.infer<typeof AlertRuleSchema>;

      const result = await service.createAlertRule({
        ...rule,
        description: rule.description || '',
        condition: {
          ...rule.condition,
          actions: rule.condition.actions as any,
          entityTypes: rule.condition.entityTypes as any,
        },
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.value);
    },
  });

  // Delete alert rule
  fastify.delete('/alerts/rules/:ruleId', {
    schema: {
      description: 'Delete alert rule',
      tags: ['Audit - Alerts'],
      params: AlertRuleParamsJSON,
    },
    handler: async (request, reply) => {
      const { ruleId } = request.params as { ruleId: string };

      const result = await service.deleteAlertRule(ruleId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    },
  });

  // === Retention Policies ===

  // Create retention policy
  fastify.post('/retention', {
    schema: {
      description: 'Create retention policy',
      tags: ['Audit - Retention'],
      body: RetentionPolicySchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const policy = request.body as z.infer<typeof RetentionPolicySchema>;

      const result = await service.createRetentionPolicy(tenantId, {
        ...policy,
        description: policy.description || '',
        entityTypes: policy.entityTypes as any,
        actions: policy.actions as any,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.value);
    },
  });

  // Apply retention policies
  fastify.post('/retention/apply', {
    schema: {
      description: 'Apply retention policies and cleanup old logs',
      tags: ['Audit - Retention'],
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';

      const result = await service.applyRetentionPolicies(tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send({
        success: true,
        deletedCount: result.value,
      });
    },
  });
};
