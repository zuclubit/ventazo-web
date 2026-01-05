/**
 * Segmentation Routes
 * REST API endpoints for customer segmentation
 */

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { SegmentationService } from '../../infrastructure/segmentation';
import {
  CreateSegmentRequest,
  UpdateSegmentRequest,
  SegmentQueryOptions,
  SegmentEntityType,
} from '../../infrastructure/segmentation/types';

interface RouteParams {
  segmentId: string;
  entityId: string;
  segmentAId: string;
  segmentBId: string;
}

interface RouteQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  entityType?: string;
  tags?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Segmentation routes
 */
export async function segmentationRoutes(fastify: FastifyInstance): Promise<void> {
  const getTenantId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-tenant-id'] as string) || 'default';
  };

  const getUserId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-user-id'] as string) || 'system';
  };

  // ============ Segment CRUD ============

  /**
   * Create a new segment
   */
  fastify.post<{ Body: CreateSegmentRequest }>('/', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.createSegment(tenantId, userId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create segment',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create segment');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * List segments
   */
  fastify.get<{ Querystring: RouteQuery }>('/', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const {
        page,
        limit,
        status,
        type,
        entityType,
        tags,
        search,
        sortBy,
        sortOrder,
      } = request.query;

      const options: SegmentQueryOptions = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as SegmentQueryOptions['status'],
        type: type as SegmentQueryOptions['type'],
        entityType: entityType as SegmentQueryOptions['entityType'],
        tags: tags ? tags.split(',') : undefined,
        search,
        sortBy: sortBy as SegmentQueryOptions['sortBy'],
        sortOrder: sortOrder as SegmentQueryOptions['sortOrder'],
      };

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.listSegments(tenantId, options);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to list segments',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value?.segments,
        pagination: {
          total: result.value?.total,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to list segments');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get segment by ID
   */
  fastify.get<{ Params: Pick<RouteParams, 'segmentId'> }>(
    '/:segmentId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { segmentId } = request.params;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const result = await service.getSegment(tenantId, segmentId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get segment',
          });
        }

        if (!result.value) {
          return reply.status(404).send({
            success: false,
            error: 'Segment not found',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get segment');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Update segment
   */
  fastify.put<{
    Params: Pick<RouteParams, 'segmentId'>;
    Body: UpdateSegmentRequest;
  }>('/:segmentId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { segmentId } = request.params;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.updateSegment(tenantId, segmentId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to update segment',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update segment');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Delete segment
   */
  fastify.delete<{ Params: Pick<RouteParams, 'segmentId'> }>(
    '/:segmentId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { segmentId } = request.params;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const result = await service.deleteSegment(tenantId, segmentId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to delete segment',
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Segment deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete segment');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // ============ Segment Calculation ============

  /**
   * Calculate/refresh segment
   */
  fastify.post<{ Params: Pick<RouteParams, 'segmentId'> }>(
    '/:segmentId/calculate',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { segmentId } = request.params;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const result = await service.calculateSegment(tenantId, segmentId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to calculate segment',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to calculate segment');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Recalculate all active segments
   */
  fastify.post('/calculate-all', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.recalculateAllSegments(tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to recalculate segments',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          recalculated: result.value?.length || 0,
          results: result.value,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to recalculate segments');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Membership Operations ============

  /**
   * Get segment members
   */
  fastify.get<{
    Params: Pick<RouteParams, 'segmentId'>;
    Querystring: Pick<RouteQuery, 'page' | 'limit'>;
  }>('/:segmentId/members', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { segmentId } = request.params;
      const { page = 1, limit = 50 } = request.query;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.getSegmentMembers(
        tenantId,
        segmentId,
        Number(page),
        Number(limit)
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to get members',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value?.members,
        pagination: {
          total: result.value?.total,
          page: Number(page),
          limit: Number(limit),
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get segment members');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Check entity membership
   */
  fastify.get<{
    Params: Pick<RouteParams, 'segmentId' | 'entityId'>;
  }>('/:segmentId/members/:entityId/check', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { segmentId, entityId } = request.params;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.checkMembership(tenantId, segmentId, entityId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to check membership',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to check membership');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Add member to static segment
   */
  fastify.post<{
    Params: Pick<RouteParams, 'segmentId'>;
    Body: { entityId: string };
  }>('/:segmentId/members', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { segmentId } = request.params;
      const { entityId } = request.body;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.addMember(tenantId, segmentId, entityId, userId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to add member',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to add member');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Remove member from static segment
   */
  fastify.delete<{
    Params: Pick<RouteParams, 'segmentId' | 'entityId'>;
  }>('/:segmentId/members/:entityId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { segmentId, entityId } = request.params;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.removeMember(tenantId, segmentId, entityId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to remove member',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to remove member');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Analysis & Insights ============

  /**
   * Get segment overlap
   */
  fastify.get<{
    Params: Pick<RouteParams, 'segmentAId' | 'segmentBId'>;
  }>('/overlap/:segmentAId/:segmentBId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { segmentAId, segmentBId } = request.params;

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.getSegmentOverlap(tenantId, segmentAId, segmentBId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to get overlap',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get segment overlap');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get segment insights
   */
  fastify.get<{ Params: Pick<RouteParams, 'segmentId'> }>(
    '/:segmentId/insights',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { segmentId } = request.params;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const result = await service.getSegmentInsights(tenantId, segmentId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get insights',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get segment insights');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Get segmentation metrics
   */
  fastify.get('/metrics', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);

      const service = container.resolve<SegmentationService>('SegmentationService');
      const result = await service.getMetrics(tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to get metrics',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get metrics');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Templates & Field Definitions ============

  /**
   * Get available field definitions
   */
  fastify.get<{ Querystring: { entityType?: string } }>(
    '/fields/definitions',
    async (request, reply) => {
      try {
        const { entityType } = request.query;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const fields = service.getFieldDefinitions(entityType as SegmentEntityType | undefined);

        return reply.status(200).send({
          success: true,
          data: fields,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get field definitions');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Get segment templates
   */
  fastify.get<{ Querystring: { entityType?: string } }>(
    '/templates',
    async (request, reply) => {
      try {
        const { entityType } = request.query;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const templates = service.getTemplates(entityType as SegmentEntityType | undefined);

        return reply.status(200).send({
          success: true,
          data: templates,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get templates');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Create segment from template
   */
  fastify.post<{ Body: { templateId: string; name?: string } }>(
    '/from-template',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const userId = getUserId(request);
        const { templateId, name } = request.body;

        const service = container.resolve<SegmentationService>('SegmentationService');
        const result = await service.createFromTemplate(tenantId, userId, templateId, name);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to create from template',
          });
        }

        return reply.status(201).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to create from template');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
