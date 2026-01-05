/**
 * Forecasting Routes
 * REST API endpoints for sales forecasting, pipeline analysis, and revenue projections
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { container } from 'tsyringe';
import { ForecastingService } from '../../infrastructure/forecasting';

// ==================== Validation Schemas ====================

const createForecastSchema = z.object({
  name: z.string().optional(),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  quota: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const updateForecastSchema = z.object({
  name: z.string().optional(),
  quota: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'locked']).optional(),
});

const overrideItemSchema = z.object({
  category: z.enum(['commit', 'best_case', 'pipeline', 'omitted']).optional(),
  amount: z.number().int().optional(),
  reason: z.string().min(1),
});

const adjustForecastSchema = z.object({
  category: z.enum(['commit', 'best_case', 'pipeline', 'omitted', 'closed_won', 'closed_lost']),
  amount: z.number().int(),
  reason: z.string().min(1),
});

const listForecastsQuerySchema = z.object({
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'locked']).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const pipelineAnalysisQuerySchema = z.object({
  pipelineId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

const projectionQuerySchema = z.object({
  targetDate: z.coerce.date().optional(),
  includeAI: z.coerce.boolean().optional(),
  teamId: z.string().uuid().optional(),
  territoryId: z.string().uuid().optional(),
});

const velocityQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
});

const winLossQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
});

const rollupQuerySchema = z.object({
  level: z.enum(['company', 'team', 'territory', 'user']),
  period: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  parentId: z.string().uuid().optional(),
});

const setStageProbabilitySchema = z.object({
  pipelineId: z.string().uuid(),
  stageName: z.string().min(1),
  probability: z.number().int().min(0).max(100),
});

// ==================== Route Handlers ====================

export async function forecastingRoutes(fastify: FastifyInstance) {
  const forecastingService = container.resolve(ForecastingService);

  // ==================== Forecasts ====================

  // List forecasts (must be registered BEFORE /:forecastId to avoid route conflicts)
  fastify.get('/', {
    schema: {
      tags: ['Forecasting'],
      summary: 'List forecasts',
      querystring: toJsonSchema(listForecastsQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = listForecastsQuerySchema.parse(request.query);

    const result = await forecastingService.listForecasts(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // List forecasts (alias at /forecasts for backwards compatibility)
  fastify.get('/forecasts', {
    schema: {
      tags: ['Forecasting'],
      summary: 'List forecasts (alias)',
      querystring: toJsonSchema(listForecastsQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = listForecastsQuerySchema.parse(request.query);

    const result = await forecastingService.listForecasts(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Create forecast
  fastify.post('/', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Create a new forecast',
      body: toJsonSchema(createForecastSchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const userId = (request as any).userId || 'default-user';
    const input = createForecastSchema.parse(request.body);

    const result = await forecastingService.createForecast(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get forecast by ID
  fastify.get('/forecasts/:forecastId', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Get forecast by ID',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { forecastId } = request.params;

    const result = await forecastingService.getForecast(tenantId, forecastId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update forecast
  fastify.patch('/forecasts/:forecastId', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Update forecast',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
      body: toJsonSchema(updateForecastSchema),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { forecastId } = request.params;
    const input = updateForecastSchema.parse(request.body);

    const result = await forecastingService.updateForecast(tenantId, forecastId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Submit forecast
  fastify.post('/forecasts/:forecastId/submit', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Submit forecast for approval',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { forecastId } = request.params;

    const result = await forecastingService.submitForecast(tenantId, forecastId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Approve forecast
  fastify.post('/forecasts/:forecastId/approve', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Approve forecast',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const userId = (request as any).userId || 'default-user';
    const { forecastId } = request.params;

    const result = await forecastingService.approveForecast(tenantId, forecastId, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Forecast Line Items ====================

  // Get forecast line items
  fastify.get('/forecasts/:forecastId/items', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Get forecast line items',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
      querystring: toJsonSchema(z.object({
        category: z.enum(['commit', 'best_case', 'pipeline', 'omitted']).optional(),
        ownerUserId: z.string().uuid().optional(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string }; Querystring: { category?: string; ownerUserId?: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { forecastId } = request.params;
    const { category, ownerUserId } = request.query;

    const result = await forecastingService.getForecastLineItems(tenantId, forecastId, {
      category: category as any,
      ownerUserId,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Override forecast item
  fastify.patch('/forecasts/:forecastId/items/:itemId', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Override forecast line item',
      params: { type: 'object', properties: { forecastId: { type: 'string', format: 'uuid' }, itemId: { type: 'string', format: 'uuid' } }, required: ['forecastId', 'itemId'] },
      body: toJsonSchema(overrideItemSchema),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string; itemId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const userId = (request as any).userId || 'default-user';
    const { forecastId, itemId } = request.params;
    const input = overrideItemSchema.parse(request.body);

    const result = await forecastingService.overrideForecastItem(tenantId, forecastId, itemId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Add forecast adjustment
  fastify.post('/forecasts/:forecastId/adjustments', {
    schema: {
      tags: ['Forecasting'],
      summary: 'Add forecast adjustment',
      params: toJsonSchema(z.object({
        forecastId: z.string().uuid(),
      })),
      body: toJsonSchema(adjustForecastSchema),
    },
  }, async (request: FastifyRequest<{ Params: { forecastId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const userId = (request as any).userId || 'default-user';
    const { forecastId } = request.params;
    const input = adjustForecastSchema.parse(request.body);

    const result = await forecastingService.addForecastAdjustment(tenantId, forecastId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Pipeline Analysis ====================

  // Get pipeline analysis
  fastify.get('/pipeline/analysis', {
    schema: {
      tags: ['Pipeline Analysis'],
      summary: 'Get current pipeline analysis',
      querystring: toJsonSchema(pipelineAnalysisQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = pipelineAnalysisQuerySchema.parse(request.query);

    const result = await forecastingService.getPipelineAnalysis(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Take pipeline snapshot
  fastify.post('/pipeline/snapshot', {
    schema: {
      tags: ['Pipeline Analysis'],
      summary: 'Take a pipeline snapshot',
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;

    const result = await forecastingService.takePipelineSnapshot(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get pipeline history
  fastify.get('/pipeline/history', {
    schema: {
      tags: ['Pipeline Analysis'],
      summary: 'Get pipeline history',
      querystring: toJsonSchema(z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      })),
    },
  }, async (request: FastifyRequest<{ Querystring: { startDate: Date; endDate: Date } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { startDate, endDate } = request.query;

    const result = await forecastingService.getPipelineHistory(tenantId, startDate, endDate);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Stage Probabilities ====================

  // Get stage probabilities
  fastify.get('/probabilities/:pipelineId', {
    schema: {
      tags: ['Stage Probabilities'],
      summary: 'Get stage probabilities for a pipeline',
      params: toJsonSchema(z.object({
        pipelineId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { pipelineId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { pipelineId } = request.params;

    const result = await forecastingService.getStageProbabilities(tenantId, pipelineId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Set stage probability
  fastify.post('/probabilities', {
    schema: {
      tags: ['Stage Probabilities'],
      summary: 'Set stage probability',
      body: toJsonSchema(setStageProbabilitySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const input = setStageProbabilitySchema.parse(request.body);

    const result = await forecastingService.setStageProbability(tenantId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Calculate historical probabilities
  fastify.post('/probabilities/:pipelineId/calculate', {
    schema: {
      tags: ['Stage Probabilities'],
      summary: 'Calculate historical win rates for stage probabilities',
      params: toJsonSchema(z.object({
        pipelineId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { pipelineId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { pipelineId } = request.params;

    const result = await forecastingService.calculateHistoricalProbabilities(tenantId, pipelineId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Revenue Projections ====================

  // Get revenue projection
  fastify.get('/projection', {
    schema: {
      tags: ['Revenue Projections'],
      summary: 'Get revenue projection',
      querystring: toJsonSchema(projectionQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = projectionQuerySchema.parse(request.query);

    const result = await forecastingService.getRevenueProjection(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Deal Velocity ====================

  // Get deal velocity
  fastify.get('/velocity', {
    schema: {
      tags: ['Deal Velocity'],
      summary: 'Get deal velocity metrics',
      querystring: toJsonSchema(velocityQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = velocityQuerySchema.parse(request.query);

    const result = await forecastingService.getDealVelocity(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Win/Loss Analysis ====================

  // Get win/loss analysis
  fastify.get('/win-loss', {
    schema: {
      tags: ['Win/Loss Analysis'],
      summary: 'Get win/loss analysis',
      querystring: toJsonSchema(winLossQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = winLossQuerySchema.parse(request.query);

    const result = await forecastingService.getWinLossAnalysis(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Forecast Rollup ====================

  // Get forecast rollup
  fastify.get('/rollup', {
    schema: {
      tags: ['Forecast Rollup'],
      summary: 'Get hierarchical forecast rollup',
      querystring: toJsonSchema(rollupQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const query = rollupQuerySchema.parse(request.query);

    const result = await forecastingService.getForecastRollup(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Opportunity Insights ====================

  // Get opportunity insight
  fastify.get('/insights/:opportunityId', {
    schema: {
      tags: ['Opportunity Insights'],
      summary: 'Get insights for an opportunity',
      params: toJsonSchema(z.object({
        opportunityId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { opportunityId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || (request as any).tenantId;
    const { opportunityId } = request.params;

    const result = await forecastingService.getOpportunityInsight(tenantId, opportunityId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });
}

export default forecastingRoutes;
