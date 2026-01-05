/**
 * Integration Hub Routes
 * REST API endpoints for managing third-party integrations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { IntegrationHubService } from './integration-hub.service';

// ==================== Validation Schemas ====================

const integrationParamsSchema = z.object({
  integrationId: z.string(),
});

const connectedIntegrationParamsSchema = z.object({
  connectedIntegrationId: z.string().uuid(),
});

const searchQuerySchema = z.object({
  query: z.string().optional(),
  categories: z.string().optional(), // comma-separated
  authTypes: z.string().optional(), // comma-separated
  tags: z.string().optional(), // comma-separated
  isFeatured: z.coerce.boolean().optional(),
  isFree: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'popularity', 'rating', 'newest']).default('popularity'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const oauthInitSchema = z.object({
  redirectUri: z.string().url(),
});

const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  redirectUri: z.string().url(),
});

const apiKeyConnectSchema = z.object({
  apiKey: z.string(),
  settings: z.record(z.unknown()).optional(),
});

const syncTriggerSchema = z.object({
  entities: z.array(z.string()).optional(),
  mode: z.enum(['full', 'incremental']).default('incremental'),
});

const fieldMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      id: z.string(),
      sourceField: z.string(),
      targetField: z.string(),
      mappingType: z.enum(['direct', 'transform', 'lookup', 'computed', 'constant']),
      transformFunction: z.string().optional(),
      transformConfig: z.record(z.unknown()).optional(),
      lookupTable: z.string().optional(),
      lookupKeyField: z.string().optional(),
      lookupValueField: z.string().optional(),
      computeExpression: z.string().optional(),
      constantValue: z.unknown().optional(),
      isRequired: z.boolean().optional(),
      defaultValue: z.unknown().optional(),
      nullable: z.boolean().optional(),
    })
  ),
});

const actionRequestSchema = z.object({
  actionId: z.string(),
  input: z.record(z.unknown()),
  async: z.boolean().default(false),
});

const webhookBodySchema = z.object({
  eventType: z.string(),
  payload: z.record(z.unknown()),
});

// ==================== Helper Functions ====================

function getTenantId(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  return (headers['x-tenant-id'] as string) || 'default';
}

function parseCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ==================== Route Handler ====================

export async function integrationHubRoutes(fastify: FastifyInstance) {
  const service = container.resolve(IntegrationHubService);

  /**
   * Get integration hub dashboard
   * GET /api/v1/integrations/dashboard
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get integration hub dashboard',
        description:
          'Returns dashboard with connected integrations, health metrics, and recommendations',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await service.getDashboard(tenantId);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get available integrations (marketplace)
   * GET /api/v1/integrations/available
   */
  fastify.get(
    '/available',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get available integrations',
        description: 'Returns list of all available integrations from the marketplace',
        querystring: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            categories: { type: 'string' },
            authTypes: { type: 'string' },
            tags: { type: 'string' },
            isFeatured: { type: 'boolean' },
            isFree: { type: 'boolean' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: { type: 'string', enum: ['name', 'popularity', 'rating', 'newest'] },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = searchQuerySchema.parse(request.query);

      const searchParams = {
        query: query.query,
        categories: parseCommaSeparated(query.categories) as any,
        authTypes: parseCommaSeparated(query.authTypes) as any,
        tags: parseCommaSeparated(query.tags),
        isFeatured: query.isFeatured,
        isFree: query.isFree,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      };

      const result = await service.getAvailableIntegrations(searchParams);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value.integrations,
        meta: {
          total: result.value.total,
          page: result.value.page,
          limit: result.value.limit,
          totalPages: result.value.totalPages,
        },
      });
    }
  );

  /**
   * Get integration by ID
   * GET /api/v1/integrations/:integrationId
   */
  fastify.get(
    '/:integrationId',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get integration details',
        params: {
          type: 'object',
          properties: {
            integrationId: { type: 'string' },
          },
          required: ['integrationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = integrationParamsSchema.parse(request.params);

      const result = await service.getIntegration(params.integrationId);

      if (result.isFailure) {
        return reply.status(404).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get connected integrations
   * GET /api/v1/integrations/connected
   */
  fastify.get(
    '/connected',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get connected integrations',
        description: 'Returns list of integrations connected to the current tenant',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await service.getConnectedIntegrations(tenantId);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get connected integration details
   * GET /api/v1/integrations/connected/:connectedIntegrationId
   */
  fastify.get(
    '/connected/:connectedIntegrationId',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get connected integration details',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);

      const result = await service.getConnectedIntegration(
        tenantId,
        params.connectedIntegrationId
      );

      if (result.isFailure) {
        return reply.status(404).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Initialize OAuth flow
   * POST /api/v1/integrations/:integrationId/oauth/init
   */
  fastify.post(
    '/:integrationId/oauth/init',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Initialize OAuth connection',
        params: {
          type: 'object',
          properties: {
            integrationId: { type: 'string' },
          },
          required: ['integrationId'],
        },
        body: {
          type: 'object',
          properties: {
            redirectUri: { type: 'string', format: 'uri' },
          },
          required: ['redirectUri'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = integrationParamsSchema.parse(request.params);
      const body = oauthInitSchema.parse(request.body);

      const result = await service.initOAuth(
        tenantId,
        params.integrationId,
        body.redirectUri
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Handle OAuth callback
   * POST /api/v1/integrations/:integrationId/oauth/callback
   */
  fastify.post(
    '/:integrationId/oauth/callback',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Handle OAuth callback',
        params: {
          type: 'object',
          properties: {
            integrationId: { type: 'string' },
          },
          required: ['integrationId'],
        },
        body: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            state: { type: 'string' },
            redirectUri: { type: 'string', format: 'uri' },
          },
          required: ['code', 'state', 'redirectUri'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = integrationParamsSchema.parse(request.params);
      const body = oauthCallbackSchema.parse(request.body);

      const result = await service.handleOAuthCallback(
        tenantId,
        params.integrationId,
        body.code,
        body.state,
        body.redirectUri
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Connect with API key
   * POST /api/v1/integrations/:integrationId/connect/api-key
   */
  fastify.post(
    '/:integrationId/connect/api-key',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Connect integration with API key',
        params: {
          type: 'object',
          properties: {
            integrationId: { type: 'string' },
          },
          required: ['integrationId'],
        },
        body: {
          type: 'object',
          properties: {
            apiKey: { type: 'string' },
            settings: { type: 'object' },
          },
          required: ['apiKey'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = integrationParamsSchema.parse(request.params);
      const body = apiKeyConnectSchema.parse(request.body);

      const result = await service.connectWithApiKey(
        tenantId,
        params.integrationId,
        body.apiKey,
        body.settings
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Disconnect integration
   * DELETE /api/v1/integrations/connected/:connectedIntegrationId
   */
  fastify.delete(
    '/connected/:connectedIntegrationId',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Disconnect integration',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);

      const result = await service.disconnectIntegration(
        tenantId,
        params.connectedIntegrationId
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Integration disconnected',
      });
    }
  );

  /**
   * Trigger sync
   * POST /api/v1/integrations/connected/:connectedIntegrationId/sync
   */
  fastify.post(
    '/connected/:connectedIntegrationId/sync',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Trigger data sync',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
        body: {
          type: 'object',
          properties: {
            entities: { type: 'array', items: { type: 'string' } },
            mode: { type: 'string', enum: ['full', 'incremental'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const body = syncTriggerSchema.parse(request.body || {});

      const result = await service.triggerSync(
        tenantId,
        params.connectedIntegrationId,
        body.entities,
        body.mode
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(202).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get sync history
   * GET /api/v1/integrations/connected/:connectedIntegrationId/sync/history
   */
  fastify.get(
    '/connected/:connectedIntegrationId/sync/history',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get sync history',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const query = request.query as any;

      const result = await service.getSyncHistory(
        tenantId,
        params.connectedIntegrationId,
        query.limit || 20
      );

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get field mappings
   * GET /api/v1/integrations/connected/:connectedIntegrationId/mappings
   */
  fastify.get(
    '/connected/:connectedIntegrationId/mappings',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get field mappings',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);

      const result = await service.getFieldMappings(
        tenantId,
        params.connectedIntegrationId
      );

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Update field mappings
   * PUT /api/v1/integrations/connected/:connectedIntegrationId/mappings
   */
  fastify.put(
    '/connected/:connectedIntegrationId/mappings',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Update field mappings',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
        body: {
          type: 'object',
          properties: {
            mappings: { type: 'array' },
          },
          required: ['mappings'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const body = fieldMappingsSchema.parse(request.body);

      const result = await service.updateFieldMappings(
        tenantId,
        params.connectedIntegrationId,
        body.mappings as any
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Execute action
   * POST /api/v1/integrations/connected/:connectedIntegrationId/actions
   */
  fastify.post(
    '/connected/:connectedIntegrationId/actions',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Execute integration action',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
        body: {
          type: 'object',
          properties: {
            actionId: { type: 'string' },
            input: { type: 'object' },
            async: { type: 'boolean' },
          },
          required: ['actionId', 'input'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const body = actionRequestSchema.parse(request.body);

      const connected = await service.getConnectedIntegration(
        tenantId,
        params.connectedIntegrationId
      );

      if (connected.isFailure) {
        return reply.status(404).send({
          success: false,
          error: connected.error,
        });
      }

      const result = await service.executeAction(tenantId, {
        integrationId: connected.value.integrationId,
        connectedIntegrationId: params.connectedIntegrationId,
        actionId: body.actionId,
        input: body.input,
        async: body.async,
      });

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Receive webhook
   * POST /api/v1/integrations/connected/:connectedIntegrationId/webhook
   */
  fastify.post(
    '/connected/:connectedIntegrationId/webhook',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Receive webhook from integration',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const body = webhookBodySchema.parse(request.body);
      const headers = request.headers as Record<string, string>;

      const result = await service.handleWebhook(
        tenantId,
        params.connectedIntegrationId,
        body.eventType,
        body.payload,
        headers
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get API logs
   * GET /api/v1/integrations/connected/:connectedIntegrationId/logs
   */
  fastify.get(
    '/connected/:connectedIntegrationId/logs',
    {
      schema: {
        tags: ['Integration Hub'],
        summary: 'Get API logs',
        params: {
          type: 'object',
          properties: {
            connectedIntegrationId: { type: 'string', format: 'uuid' },
          },
          required: ['connectedIntegrationId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = connectedIntegrationParamsSchema.parse(request.params);
      const query = request.query as any;

      const result = await service.getApiLogs(
        tenantId,
        params.connectedIntegrationId,
        query.limit || 50
      );

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );
}
