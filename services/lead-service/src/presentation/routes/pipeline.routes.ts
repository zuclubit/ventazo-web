/**
 * Pipeline Routes
 * API endpoints for pipeline configuration management
 */

import { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { PipelineService, UpsertStageInput, StageType } from '../../infrastructure/pipeline';
import { z } from 'zod';

/**
 * Zod schemas for validation
 */
const stageSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(StageType),
  order: z.number().int().min(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(500).optional(),
  probability: z.number().min(0).max(100).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  autoActions: z.array(z.object({
    type: z.enum(['notify', 'assign', 'tag', 'schedule_followup', 'webhook']),
    config: z.record(z.unknown()),
  })).optional(),
});

const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  copyFromDefault: z.boolean().optional(),
  stages: z.array(stageSchema.omit({ id: true })).optional(),
  settings: z.object({
    allowSkipStages: z.boolean().optional(),
    requireReasonOnLost: z.boolean().optional(),
    autoArchiveAfterDays: z.number().int().min(1).optional(),
    scoreThreshold: z.number().min(0).max(100).optional(),
    maxLeadsPerStage: z.number().int().min(1).optional(),
    enableStageRotting: z.boolean().optional(),
    rottingDays: z.record(z.number().int().min(1)).optional(),
  }).optional(),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
  settings: z.object({
    allowSkipStages: z.boolean().optional(),
    requireReasonOnLost: z.boolean().optional(),
    autoArchiveAfterDays: z.number().int().min(1).optional().nullable(),
    scoreThreshold: z.number().min(0).max(100).optional(),
    maxLeadsPerStage: z.number().int().min(1).optional().nullable(),
    enableStageRotting: z.boolean().optional(),
    rottingDays: z.record(z.number().int().min(1)).optional(),
  }).optional(),
});

const reorderStagesSchema = z.object({
  stageIds: z.array(z.string().uuid()),
});

/**
 * Pipeline routes plugin
 */
export const pipelineRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const pipelineService = container.resolve(PipelineService);

  /**
   * Get all pipelines for tenant
   * GET /pipelines
   */
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    try {
      const pipelines = await pipelineService.listPipelines(tenantId);
      return reply.send({ data: pipelines });
    } catch (error) {
      request.log.error(error, 'Failed to list pipelines');
      return reply.status(500).send({ error: 'Failed to list pipelines' });
    }
  });

  /**
   * Get default pipeline
   * GET /pipelines/default
   */
  fastify.get('/default', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    try {
      const pipeline = await pipelineService.getDefaultPipeline(tenantId);
      return reply.send({ data: pipeline });
    } catch (error) {
      request.log.error(error, 'Failed to get default pipeline');
      return reply.status(500).send({ error: 'Failed to get default pipeline' });
    }
  });

  /**
   * Get pipeline by ID
   * GET /pipelines/:id
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      try {
        const pipeline = await pipelineService.getPipeline(id, tenantId);

        if (!pipeline) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        return reply.send({ data: pipeline });
      } catch (error) {
        request.log.error(error, 'Failed to get pipeline');
        return reply.status(500).send({ error: 'Failed to get pipeline' });
      }
    }
  );

  /**
   * Create pipeline
   * POST /pipelines
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Missing x-tenant-id header' });
    }

    const validation = createPipelineSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: validation.error.errors,
      });
    }

    try {
      const pipeline = await pipelineService.createPipeline({
        tenantId,
        ...validation.data,
      });

      return reply.status(201).send({ data: pipeline });
    } catch (error) {
      request.log.error(error, 'Failed to create pipeline');
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Failed to create pipeline',
      });
    }
  });

  /**
   * Update pipeline
   * PATCH /pipelines/:id
   */
  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const validation = updatePipelineSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      try {
        const pipeline = await pipelineService.updatePipeline(id, tenantId, validation.data);
        return reply.send({ data: pipeline });
      } catch (error) {
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }
        request.log.error(error, 'Failed to update pipeline');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to update pipeline',
        });
      }
    }
  );

  /**
   * Delete pipeline
   * DELETE /pipelines/:id
   */
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      try {
        await pipelineService.deletePipeline(id, tenantId);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pipeline not found') {
            return reply.status(404).send({ error: 'Pipeline not found' });
          }
          if (error.message.includes('Cannot delete')) {
            return reply.status(409).send({ error: error.message });
          }
        }
        request.log.error(error, 'Failed to delete pipeline');
        return reply.status(500).send({ error: 'Failed to delete pipeline' });
      }
    }
  );

  /**
   * Add stage to pipeline
   * POST /pipelines/:id/stages
   */
  fastify.post<{ Params: { id: string } }>(
    '/:id/stages',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const validation = stageSchema.omit({ id: true }).safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      try {
        const stage = await pipelineService.addStage(
          id,
          tenantId,
          validation.data as UpsertStageInput
        );
        return reply.status(201).send({ data: stage });
      } catch (error) {
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }
        request.log.error(error, 'Failed to add stage');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to add stage',
        });
      }
    }
  );

  /**
   * Update stage
   * PATCH /pipelines/:id/stages/:stageId
   */
  fastify.patch<{ Params: { id: string; stageId: string } }>(
    '/:id/stages/:stageId',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id, stageId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const validation = stageSchema.partial().safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      try {
        const stage = await pipelineService.updateStage(id, tenantId, stageId, validation.data);
        return reply.send({ data: stage });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pipeline not found' || error.message === 'Stage not found') {
            return reply.status(404).send({ error: error.message });
          }
        }
        request.log.error(error, 'Failed to update stage');
        return reply.status(500).send({
          error: error instanceof Error ? error.message : 'Failed to update stage',
        });
      }
    }
  );

  /**
   * Remove stage
   * DELETE /pipelines/:id/stages/:stageId
   */
  fastify.delete<{ Params: { id: string; stageId: string } }>(
    '/:id/stages/:stageId',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id, stageId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      try {
        await pipelineService.removeStage(id, tenantId, stageId);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pipeline not found' || error.message === 'Stage not found') {
            return reply.status(404).send({ error: error.message });
          }
          if (error.message.includes('Cannot remove')) {
            return reply.status(409).send({ error: error.message });
          }
        }
        request.log.error(error, 'Failed to remove stage');
        return reply.status(500).send({ error: 'Failed to remove stage' });
      }
    }
  );

  /**
   * Reorder stages
   * PUT /pipelines/:id/stages/reorder
   */
  fastify.put<{ Params: { id: string } }>(
    '/:id/stages/reorder',
    async (request, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Missing x-tenant-id header' });
      }

      const validation = reorderStagesSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      try {
        await pipelineService.reorderStages(id, tenantId, validation.data.stageIds);
        const pipeline = await pipelineService.getPipeline(id, tenantId);
        return reply.send({ data: pipeline });
      } catch (error) {
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }
        request.log.error(error, 'Failed to reorder stages');
        return reply.status(500).send({ error: 'Failed to reorder stages' });
      }
    }
  );

  /**
   * Get available transitions from a stage
   * GET /pipelines/:id/stages/:stageSlug/transitions
   */
  fastify.get<{ Params: { id: string; stageSlug: string } }>(
    '/:id/stages/:stageSlug/transitions',
    async (request, reply: FastifyReply) => {
      const { id, stageSlug } = request.params;

      try {
        const availableStages = await pipelineService.getAvailableTransitions(id, stageSlug);
        return reply.send({ data: availableStages });
      } catch (error) {
        request.log.error(error, 'Failed to get transitions');
        return reply.status(500).send({ error: 'Failed to get transitions' });
      }
    }
  );

  /**
   * Check if transition is allowed
   * GET /pipelines/:id/transitions/validate
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { from: string; to: string };
  }>(
    '/:id/transitions/validate',
    async (request, reply: FastifyReply) => {
      const { id } = request.params;
      const { from, to } = request.query;

      if (!from || !to) {
        return reply.status(400).send({ error: 'Missing from or to query parameters' });
      }

      try {
        const allowed = await pipelineService.canTransition(id, from, to);
        return reply.send({ data: { allowed, from, to } });
      } catch (error) {
        request.log.error(error, 'Failed to validate transition');
        return reply.status(500).send({ error: 'Failed to validate transition' });
      }
    }
  );
};

export default pipelineRoutes;
