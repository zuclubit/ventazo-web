/**
 * Customer 360 View Routes
 * REST API endpoints for unified customer data access
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { Customer360Service } from './customer-360.service';

// ==================== Validation Schemas ====================

const customer360ParamsSchema = z.object({
  customerId: z.string().uuid(),
});

const searchQuerySchema = z.object({
  query: z.string().optional(),
  healthScores: z.string().optional(), // comma-separated
  engagementLevels: z.string().optional(), // comma-separated
  relationshipStages: z.string().optional(), // comma-separated
  churnRiskLevels: z.string().optional(), // comma-separated
  minLifetimeValue: z.coerce.number().optional(),
  maxLifetimeValue: z.coerce.number().optional(),
  minMrr: z.coerce.number().optional(),
  maxMrr: z.coerce.number().optional(),
  ownerIds: z.string().optional(), // comma-separated
  teamIds: z.string().optional(), // comma-separated
  tags: z.string().optional(), // comma-separated
  segments: z.string().optional(), // comma-separated
  hasActiveSubscription: z.coerce.boolean().optional(),
  subscriptionPlans: z.string().optional(), // comma-separated
  lastInteractionAfter: z.coerce.date().optional(),
  lastInteractionBefore: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['name', 'lifetimeValue', 'mrr', 'healthScore', 'lastInteraction', 'createdAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const timelineQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  types: z.string().optional(), // comma-separated
});

const compareBodySchema = z.object({
  customerIds: z.array(z.string().uuid()).min(2).max(10),
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

export async function customer360Routes(fastify: FastifyInstance) {
  const service = container.resolve(Customer360Service);

  /**
   * Get complete 360 view for a customer
   * GET /api/v1/customer-360/:customerId
   */
  fastify.get(
    '/:customerId',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get complete 360 view for a customer',
        description:
          'Returns comprehensive customer data including profile, engagement, financial, subscription, deals, support, contracts, timeline, and insights',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getCustomer360View(tenantId, params.customerId);

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
   * Get customer profile only
   * GET /api/v1/customer-360/:customerId/profile
   */
  fastify.get(
    '/:customerId/profile',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer profile',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getCustomerProfile(tenantId, params.customerId);

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
   * Get engagement metrics
   * GET /api/v1/customer-360/:customerId/engagement
   */
  fastify.get(
    '/:customerId/engagement',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer engagement metrics',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getEngagementMetrics(tenantId, params.customerId);

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
   * Get financial summary
   * GET /api/v1/customer-360/:customerId/financial
   */
  fastify.get(
    '/:customerId/financial',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer financial summary',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getFinancialSummary(tenantId, params.customerId);

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
   * Get subscription info
   * GET /api/v1/customer-360/:customerId/subscription
   */
  fastify.get(
    '/:customerId/subscription',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer subscription information',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getSubscriptionInfo(tenantId, params.customerId);

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
   * Get deals summary
   * GET /api/v1/customer-360/:customerId/deals
   */
  fastify.get(
    '/:customerId/deals',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer deals summary',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getDealSummary(tenantId, params.customerId);

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
   * Get support summary
   * GET /api/v1/customer-360/:customerId/support
   */
  fastify.get(
    '/:customerId/support',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer support summary',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getSupportSummary(tenantId, params.customerId);

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
   * Get contracts summary
   * GET /api/v1/customer-360/:customerId/contracts
   */
  fastify.get(
    '/:customerId/contracts',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer contracts summary',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getContractSummary(tenantId, params.customerId);

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
   * Get unified timeline
   * GET /api/v1/customer-360/:customerId/timeline
   */
  fastify.get(
    '/:customerId/timeline',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer unified timeline',
        description:
          'Returns a chronological timeline of all interactions, activities, notes, payments, and other events',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            types: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);
      const query = timelineQuerySchema.parse(request.query);

      const result = await service.getTimeline(
        tenantId,
        params.customerId,
        query.limit,
        query.offset
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
        meta: {
          limit: query.limit,
          offset: query.offset,
        },
      });
    }
  );

  /**
   * Get related contacts
   * GET /api/v1/customer-360/:customerId/contacts
   */
  fastify.get(
    '/:customerId/contacts',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer related contacts',
        params: {
          type: 'object',
          properties: {
            customerId: { type: 'string', format: 'uuid' },
          },
          required: ['customerId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = customer360ParamsSchema.parse(request.params);

      const result = await service.getRelatedContacts(tenantId, params.customerId);

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
   * Search customers with 360 summary
   * GET /api/v1/customer-360/search
   */
  fastify.get(
    '/search',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Search customers with 360 summary',
        description:
          'Search and filter customers with summary metrics including health score, engagement level, and financial data',
        querystring: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            healthScores: { type: 'string' },
            engagementLevels: { type: 'string' },
            relationshipStages: { type: 'string' },
            churnRiskLevels: { type: 'string' },
            minLifetimeValue: { type: 'number' },
            maxLifetimeValue: { type: 'number' },
            minMrr: { type: 'number' },
            maxMrr: { type: 'number' },
            ownerIds: { type: 'string' },
            teamIds: { type: 'string' },
            tags: { type: 'string' },
            segments: { type: 'string' },
            hasActiveSubscription: { type: 'boolean' },
            subscriptionPlans: { type: 'string' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: {
              type: 'string',
              enum: ['name', 'lifetimeValue', 'mrr', 'healthScore', 'lastInteraction', 'createdAt'],
            },
            sortOrder: { type: 'string', enum: ['asc', 'desc'] },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const rawQuery = searchQuerySchema.parse(request.query);

      const searchParams = {
        tenantId,
        query: rawQuery.query,
        healthScores: parseCommaSeparated(rawQuery.healthScores) as any,
        engagementLevels: parseCommaSeparated(rawQuery.engagementLevels) as any,
        relationshipStages: parseCommaSeparated(rawQuery.relationshipStages) as any,
        churnRiskLevels: parseCommaSeparated(rawQuery.churnRiskLevels) as any,
        minLifetimeValue: rawQuery.minLifetimeValue,
        maxLifetimeValue: rawQuery.maxLifetimeValue,
        minMrr: rawQuery.minMrr,
        maxMrr: rawQuery.maxMrr,
        ownerIds: parseCommaSeparated(rawQuery.ownerIds),
        teamIds: parseCommaSeparated(rawQuery.teamIds),
        tags: parseCommaSeparated(rawQuery.tags),
        segments: parseCommaSeparated(rawQuery.segments),
        hasActiveSubscription: rawQuery.hasActiveSubscription,
        subscriptionPlans: parseCommaSeparated(rawQuery.subscriptionPlans),
        lastInteractionAfter: rawQuery.lastInteractionAfter,
        lastInteractionBefore: rawQuery.lastInteractionBefore,
        page: rawQuery.page,
        limit: rawQuery.limit,
        sortBy: rawQuery.sortBy,
        sortOrder: rawQuery.sortOrder,
      };

      const result = await service.searchCustomers(searchParams);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value.customers,
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
   * Get dashboard metrics
   * GET /api/v1/customer-360/dashboard
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Get customer 360 dashboard',
        description:
          'Returns aggregated metrics for the customer base including health distribution, engagement trends, revenue metrics, and at-risk customers',
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
   * Compare customers
   * POST /api/v1/customer-360/compare
   */
  fastify.post(
    '/compare',
    {
      schema: {
        tags: ['Customer 360'],
        summary: 'Compare multiple customers',
        description:
          'Compare key metrics across multiple customers with benchmark averages',
        body: {
          type: 'object',
          properties: {
            customerIds: {
              type: 'array',
              items: { type: 'string', format: 'uuid' },
              minItems: 2,
              maxItems: 10,
            },
          },
          required: ['customerIds'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const body = compareBodySchema.parse(request.body);

      const result = await service.compareCustomers(tenantId, body.customerIds);

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
