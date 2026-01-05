/**
 * Webhook Routes
 * Provides API endpoints for webhook management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { WebhookService } from '../../infrastructure/webhooks';
import { WebhookEvent, WebhookStatus, DeliveryStatus } from '../../infrastructure/webhooks/types';

// Get enum values for JSON Schema
const webhookEventValues = Object.values(WebhookEvent);
const webhookStatusValues = Object.values(WebhookStatus);
const deliveryStatusValues = Object.values(DeliveryStatus);

// JSON Schema for Fastify validation
const createWebhookJsonSchema = {
  type: 'object',
  required: ['name', 'url', 'events'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    url: { type: 'string', format: 'uri' },
    events: { type: 'array', items: { type: 'string', enum: webhookEventValues }, minItems: 1 },
    secret: { type: 'string', minLength: 16 },
    headers: { type: 'object', additionalProperties: { type: 'string' } },
    retryPolicy: {
      type: 'object',
      properties: {
        maxRetries: { type: 'number', minimum: 0, maximum: 10 },
        retryDelayMs: { type: 'number', minimum: 100, maximum: 60000 },
        backoffMultiplier: { type: 'number', minimum: 1, maximum: 4 },
      },
    },
    filters: {
      type: 'object',
      properties: {
        statuses: { type: 'array', items: { type: 'string' } },
        scoreRange: {
          type: 'object',
          properties: {
            min: { type: 'number', minimum: 0, maximum: 100 },
            max: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
        sources: { type: 'array', items: { type: 'string' } },
        owners: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  },
};

const updateWebhookJsonSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    url: { type: 'string', format: 'uri' },
    events: { type: 'array', items: { type: 'string', enum: webhookEventValues }, minItems: 1 },
    status: { type: 'string', enum: webhookStatusValues },
    secret: { type: 'string', minLength: 16 },
    headers: { type: 'object', additionalProperties: { type: 'string' } },
    retryPolicy: {
      type: 'object',
      properties: {
        maxRetries: { type: 'number', minimum: 0, maximum: 10 },
        retryDelayMs: { type: 'number', minimum: 100, maximum: 60000 },
        backoffMultiplier: { type: 'number', minimum: 1, maximum: 4 },
      },
    },
    filters: {
      type: 'object',
      properties: {
        statuses: { type: 'array', items: { type: 'string' } },
        scoreRange: {
          type: 'object',
          properties: {
            min: { type: 'number', minimum: 0, maximum: 100 },
            max: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
        sources: { type: 'array', items: { type: 'string' } },
        owners: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  },
};

const queryWebhooksJsonSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: webhookStatusValues },
    event: { type: 'string', enum: webhookEventValues },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};

const queryDeliveriesJsonSchema = {
  type: 'object',
  properties: {
    webhookId: { type: 'string', format: 'uuid' },
    status: { type: 'string', enum: deliveryStatusValues },
    event: { type: 'string', enum: webhookEventValues },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};

const uuidParamsJsonSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
};

// TypeScript types for request handling
interface QueryWebhooks {
  status?: WebhookStatus;
  event?: WebhookEvent;
  page: number;
  limit: number;
}

interface QueryDeliveries {
  webhookId?: string;
  status?: DeliveryStatus;
  event?: WebhookEvent;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

interface CreateWebhookBody {
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelayMs?: number;
    backoffMultiplier?: number;
  };
  filters?: {
    statuses?: string[];
    scoreRange?: { min?: number; max?: number };
    sources?: string[];
    owners?: string[];
  };
}

interface UpdateWebhookBody {
  name?: string;
  description?: string;
  url?: string;
  events?: WebhookEvent[];
  status?: WebhookStatus;
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: {
    maxRetries?: number;
    retryDelayMs?: number;
    backoffMultiplier?: number;
  };
  filters?: {
    statuses?: string[];
    scoreRange?: { min?: number; max?: number };
    sources?: string[];
    owners?: string[];
  };
}

export async function webhookRoutes(fastify: FastifyInstance) {
  const webhookService = container.resolve(WebhookService);

  /**
   * GET /webhooks
   * List all webhooks for the tenant
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List all webhooks',
        tags: ['Webhooks'],
        querystring: queryWebhooksJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              items: { type: 'array' },
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: QueryWebhooks }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.listWebhooks({
        tenantId,
        status: request.query.status,
        event: request.query.event,
        page: request.query.page,
        limit: request.query.limit,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      const { items, total } = result.getValue();
      return reply.send({
        items,
        total,
        page: request.query.page,
        limit: request.query.limit,
      });
    }
  );

  /**
   * POST /webhooks
   * Create a new webhook
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new webhook',
        tags: ['Webhooks'],
        body: createWebhookJsonSchema,
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              url: { type: 'string' },
              events: { type: 'array' },
              status: { type: 'string' },
              secret: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: CreateWebhookBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.createWebhook({
        tenantId,
        ...request.body,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /webhooks/:id
   * Get a specific webhook
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get a specific webhook',
        tags: ['Webhooks'],
        params: uuidParamsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.getWebhook(request.params.id, tenantId);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      const webhook = result.getValue();
      if (!webhook) {
        return reply.status(404).send({ error: 'Webhook not found' });
      }

      return reply.send(webhook);
    }
  );

  /**
   * PATCH /webhooks/:id
   * Update a webhook
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update a webhook',
        tags: ['Webhooks'],
        params: uuidParamsJsonSchema,
        body: updateWebhookJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateWebhookBody;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.updateWebhook(
        request.params.id,
        tenantId,
        request.body
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /webhooks/:id
   * Delete a webhook
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete a webhook',
        tags: ['Webhooks'],
        params: uuidParamsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.deleteWebhook(request.params.id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /webhooks/:id/test
   * Send a test webhook
   */
  fastify.post(
    '/:id/test',
    {
      schema: {
        description: 'Send a test webhook',
        tags: ['Webhooks'],
        params: uuidParamsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Trigger a test event
      const deliveryResult = await webhookService.triggerWebhooks(
        tenantId,
        WebhookEvent.LEAD_CREATED, // Use a generic event for testing
        {
          entityType: 'lead',
          entityId: 'test-lead-id',
          action: 'test',
          current: {
            id: 'test-lead-id',
            companyName: 'Test Company',
            status: 'new',
            score: 50,
          },
          triggeredBy: 'api-test',
        }
      );

      if (deliveryResult.isFailure) {
        return reply.status(500).send({ error: deliveryResult.error });
      }

      const deliveryIds = deliveryResult.getValue();

      if (deliveryIds.length === 0) {
        return reply.status(400).send({
          error: 'Webhook not matched for test event. Check event subscriptions.',
        });
      }

      // Execute the delivery
      const executeResult = await webhookService.executeDelivery(deliveryIds[0]);

      if (executeResult.isFailure) {
        return reply.status(500).send({ error: executeResult.error });
      }

      return reply.send({
        message: 'Test webhook sent',
        delivery: executeResult.getValue(),
      });
    }
  );

  /**
   * GET /webhooks/deliveries
   * Get webhook delivery history
   */
  fastify.get(
    '/deliveries',
    {
      schema: {
        description: 'Get webhook delivery history',
        tags: ['Webhooks', 'Deliveries'],
        querystring: queryDeliveriesJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: QueryDeliveries }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await webhookService.getDeliveryHistory({
        tenantId,
        webhookId: request.query.webhookId,
        status: request.query.status,
        event: request.query.event,
        startDate: request.query.startDate
          ? new Date(request.query.startDate)
          : undefined,
        endDate: request.query.endDate
          ? new Date(request.query.endDate)
          : undefined,
        page: request.query.page,
        limit: request.query.limit,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      const { items, total } = result.getValue();
      return reply.send({
        items,
        total,
        page: request.query.page,
        limit: request.query.limit,
      });
    }
  );

  /**
   * POST /webhooks/deliveries/:id/retry
   * Retry a failed delivery
   */
  fastify.post(
    '/deliveries/:id/retry',
    {
      schema: {
        description: 'Retry a failed delivery',
        tags: ['Webhooks', 'Deliveries'],
        params: uuidParamsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const retryResult = await webhookService.retryDelivery(
        request.params.id,
        tenantId
      );

      if (retryResult.isFailure) {
        return reply.status(400).send({ error: retryResult.error });
      }

      // Execute the retry
      const executeResult = await webhookService.executeDelivery(
        retryResult.getValue()
      );

      if (executeResult.isFailure) {
        return reply.status(500).send({ error: executeResult.error });
      }

      return reply.send({
        message: 'Delivery retry initiated',
        delivery: executeResult.getValue(),
      });
    }
  );

  /**
   * GET /webhooks/events
   * List available webhook events
   */
  fastify.get(
    '/events',
    {
      schema: {
        description: 'List available webhook events',
        tags: ['Webhooks'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const events = Object.values(WebhookEvent).map((event) => ({
        name: event,
        description: getEventDescription(event),
        category: getEventCategory(event),
      }));

      return reply.send({ events });
    }
  );
}

// Helper functions for event metadata
function getEventDescription(event: WebhookEvent): string {
  const descriptions: Record<WebhookEvent, string> = {
    [WebhookEvent.LEAD_CREATED]: 'Triggered when a new lead is created',
    [WebhookEvent.LEAD_UPDATED]: 'Triggered when a lead is updated',
    [WebhookEvent.LEAD_DELETED]: 'Triggered when a lead is deleted',
    [WebhookEvent.LEAD_STATUS_CHANGED]: 'Triggered when a lead status changes',
    [WebhookEvent.LEAD_SCORE_CHANGED]: 'Triggered when a lead score changes',
    [WebhookEvent.LEAD_ASSIGNED]: 'Triggered when a lead is assigned',
    [WebhookEvent.LEAD_QUALIFIED]: 'Triggered when a lead is qualified',
    [WebhookEvent.LEAD_CONVERTED]: 'Triggered when a lead is converted',
    [WebhookEvent.LEAD_LOST]: 'Triggered when a lead is marked as lost',
    [WebhookEvent.FOLLOW_UP_SCHEDULED]: 'Triggered when a follow-up is scheduled',
    [WebhookEvent.FOLLOW_UP_COMPLETED]: 'Triggered when a follow-up is completed',
    [WebhookEvent.FOLLOW_UP_OVERDUE]: 'Triggered when a follow-up becomes overdue',
    [WebhookEvent.PIPELINE_STAGE_CHANGED]: 'Triggered when pipeline stage changes',
    [WebhookEvent.ALL]: 'Subscribe to all events',
  };
  return descriptions[event] || 'No description available';
}

function getEventCategory(event: WebhookEvent): string {
  if (event.startsWith('lead.')) return 'Lead';
  if (event.startsWith('follow_up.')) return 'Follow-up';
  if (event.startsWith('pipeline.')) return 'Pipeline';
  return 'Other';
}
