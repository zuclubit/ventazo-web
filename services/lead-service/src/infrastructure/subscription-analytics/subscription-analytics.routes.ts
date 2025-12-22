/**
 * Subscription & Billing Analytics Routes
 * REST API endpoints for subscription metrics and revenue analytics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { SubscriptionAnalyticsService } from './subscription-analytics.service';

// ==================== Validation Schemas ====================

const periodQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).default('monthly'),
});

const dateQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

const cohortQuerySchema = z.object({
  type: z.enum(['monthly', 'quarterly', 'yearly', 'plan', 'channel', 'region']).default('monthly'),
  periods: z.coerce.number().min(1).max(24).default(12),
});

const forecastQuerySchema = z.object({
  months: z.coerce.number().min(1).max(36).default(12),
});

const planParamsSchema = z.object({
  planId: z.string().uuid().optional(),
});

// ==================== Helper Functions ====================

function getTenantId(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  return (headers['x-tenant-id'] as string) || 'default';
}

function getDefaultDateRange(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start, end };
}

// ==================== Route Handler ====================

export async function subscriptionAnalyticsRoutes(fastify: FastifyInstance) {
  const service = container.resolve(SubscriptionAnalyticsService);

  /**
   * Get subscription dashboard
   * GET /api/v1/subscription-analytics/dashboard
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get subscription analytics dashboard',
        description:
          'Returns comprehensive subscription metrics including MRR, churn, CLV, trends, and quick wins',
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
   * Get MRR metrics
   * GET /api/v1/subscription-analytics/mrr
   */
  fastify.get(
    '/mrr',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get Monthly Recurring Revenue metrics',
        description:
          'Returns MRR breakdown including new, expansion, contraction, churn, and net new MRR',
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = dateQuerySchema.parse(request.query);

      const result = await service.getMRRMetrics(tenantId, query.date);

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
   * Get churn metrics
   * GET /api/v1/subscription-analytics/churn
   */
  fastify.get(
    '/churn',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get churn metrics',
        description:
          'Returns customer and revenue churn rates, retention rates, and churn analysis',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = periodQuerySchema.parse(request.query);
      const { start, end } = query.startDate && query.endDate
        ? { start: query.startDate, end: query.endDate }
        : getDefaultDateRange();

      const result = await service.getChurnMetrics(tenantId, start, end);

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
   * Get CLV metrics
   * GET /api/v1/subscription-analytics/clv
   */
  fastify.get(
    '/clv',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get Customer Lifetime Value metrics',
        description:
          'Returns CLV analysis including average CLV, CLV by segment, CLV:CAC ratio, and ARPU',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await service.getCLVMetrics(tenantId);

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
   * Get cohort analysis
   * GET /api/v1/subscription-analytics/cohorts
   */
  fastify.get(
    '/cohorts',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get cohort retention analysis',
        description:
          'Returns cohort-based retention analysis showing customer and revenue retention over time',
        querystring: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['monthly', 'quarterly', 'yearly', 'plan', 'channel', 'region'],
              default: 'monthly',
            },
            periods: { type: 'integer', minimum: 1, maximum: 24, default: 12 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = cohortQuerySchema.parse(request.query);

      const result = await service.getCohortAnalysis(tenantId, query.type, query.periods);

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
   * Get revenue forecast
   * GET /api/v1/subscription-analytics/forecast
   */
  fastify.get(
    '/forecast',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get revenue forecast',
        description:
          'Returns revenue projections with best, base, and worst case scenarios',
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'integer', minimum: 1, maximum: 36, default: 12 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = forecastQuerySchema.parse(request.query);

      const result = await service.getRevenueForcast(tenantId, query.months);

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
   * Get plan performance
   * GET /api/v1/subscription-analytics/plans
   */
  fastify.get(
    '/plans',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get plan performance metrics',
        description:
          'Returns performance metrics for subscription plans including churn, conversion, and revenue',
        querystring: {
          type: 'object',
          properties: {
            planId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = planParamsSchema.parse(request.query);

      const result = await service.getPlanPerformance(tenantId, query.planId);

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
   * Get billing analytics
   * GET /api/v1/subscription-analytics/billing
   */
  fastify.get(
    '/billing',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get billing analytics',
        description:
          'Returns billing metrics including collection rates, payment methods, and failed payments',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = periodQuerySchema.parse(request.query);
      const { start, end } = query.startDate && query.endDate
        ? { start: query.startDate, end: query.endDate }
        : getDefaultDateRange();

      const result = await service.getBillingAnalytics(tenantId, start, end);

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
   * Get expansion metrics
   * GET /api/v1/subscription-analytics/expansion
   */
  fastify.get(
    '/expansion',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get expansion revenue metrics',
        description:
          'Returns expansion MRR breakdown including upgrades, add-ons, and expansion pipeline',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = periodQuerySchema.parse(request.query);
      const { start, end } = query.startDate && query.endDate
        ? { start: query.startDate, end: query.endDate }
        : getDefaultDateRange();

      const result = await service.getExpansionMetrics(tenantId, start, end);

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
   * Get trial analytics
   * GET /api/v1/subscription-analytics/trials
   */
  fastify.get(
    '/trials',
    {
      schema: {
        tags: ['Subscription Analytics'],
        summary: 'Get trial analytics',
        description:
          'Returns trial conversion metrics, funnel analysis, and at-risk trials',
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = periodQuerySchema.parse(request.query);
      const { start, end } = query.startDate && query.endDate
        ? { start: query.startDate, end: query.endDate }
        : getDefaultDateRange();

      const result = await service.getTrialAnalytics(tenantId, start, end);

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
