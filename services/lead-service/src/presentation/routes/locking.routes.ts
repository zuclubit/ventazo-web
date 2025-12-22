/**
 * Optimistic Locking Routes
 * Admin endpoints for locking metrics and configuration
 */

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { OptimisticLockService } from '../../infrastructure/locking';

interface LockingQueryParams {
  entityType?: string;
  entityId?: string;
  limit?: number;
  version1?: number;
  version2?: number;
}

/**
 * Locking routes plugin
 */
export async function lockingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get locking metrics
   */
  fastify.get<{
    Querystring: LockingQueryParams;
  }>('/metrics', async (_request, reply) => {
    try {
      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const metrics = lockingService.getMetrics();

      return reply.status(200).send({
        success: true,
        data: metrics,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get locking metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get locking metrics',
      });
    }
  });

  /**
   * Reset locking metrics
   */
  fastify.post('/metrics/reset', async (_request, reply) => {
    try {
      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      lockingService.resetMetrics();

      return reply.status(200).send({
        success: true,
        message: 'Locking metrics reset successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to reset locking metrics');
      return reply.status(500).send({
        success: false,
        error: 'Failed to reset locking metrics',
      });
    }
  });

  /**
   * Get version history for an entity
   */
  fastify.get<{
    Params: { entityType: string; entityId: string };
    Querystring: LockingQueryParams;
  }>('/history/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params;
      const limit = request.query.limit || 50;

      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const result = await lockingService.getVersionHistory(entityType, entityId, limit);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to get version history',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          entityType,
          entityId,
          history: result.value,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get version history');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get version history',
      });
    }
  });

  /**
   * Compare two versions of an entity
   */
  fastify.get<{
    Params: { entityType: string; entityId: string };
    Querystring: LockingQueryParams;
  }>('/compare/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params;
      const { version1, version2 } = request.query;

      if (!version1 || !version2) {
        return reply.status(400).send({
          success: false,
          error: 'Both version1 and version2 query parameters are required',
        });
      }

      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const result = await lockingService.compareVersions(
        entityType,
        entityId,
        version1,
        version2
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to compare versions',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          entityType,
          entityId,
          version1,
          version2,
          changedFields: result.value?.fields,
          differences: result.value?.values,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to compare versions');
      return reply.status(500).send({
        success: false,
        error: 'Failed to compare versions',
      });
    }
  });

  /**
   * Get current version of an entity
   */
  fastify.get<{
    Params: { entityType: string; entityId: string };
  }>('/version/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params;

      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const result = await lockingService.getVersion(entityType, entityId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to get version',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          success: false,
          error: 'Entity not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          entityType,
          entityId,
          ...result.value,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get version');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get version',
      });
    }
  });

  /**
   * Check if entity data is stale
   */
  fastify.get<{
    Params: { entityType: string; entityId: string };
    Querystring: { version: number };
  }>('/stale/:entityType/:entityId', async (request, reply) => {
    try {
      const { entityType, entityId } = request.params;
      const { version } = request.query;

      if (version === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'Version query parameter is required',
        });
      }

      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const result = await lockingService.isStale(entityType, entityId, version);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to check staleness',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          entityType,
          entityId,
          yourVersion: version,
          isStale: result.value,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to check staleness');
      return reply.status(500).send({
        success: false,
        error: 'Failed to check staleness',
      });
    }
  });

  /**
   * Get locking statistics summary
   */
  fastify.get('/stats', async (_request, reply) => {
    try {
      const lockingService = container.resolve<OptimisticLockService>('OptimisticLockService');
      const metrics = lockingService.getMetrics();

      // Calculate additional statistics
      const successRate = metrics.totalUpdates > 0
        ? (metrics.successfulUpdates / metrics.totalUpdates) * 100
        : 100;

      const entityStats = Object.entries(metrics.byEntity).map(([entityType, stats]) => ({
        entityType,
        ...stats,
        conflictRate: stats.updates > 0 ? (stats.conflicts / stats.updates) * 100 : 0,
      }));

      return reply.status(200).send({
        success: true,
        data: {
          summary: {
            totalUpdates: metrics.totalUpdates,
            successfulUpdates: metrics.successfulUpdates,
            failedUpdates: metrics.conflictCount,
            totalRetries: metrics.retryCount,
            successRate: successRate.toFixed(2) + '%',
            averageRetries: metrics.avgRetries.toFixed(2),
            conflictRate: (metrics.conflictRate * 100).toFixed(2) + '%',
          },
          byEntity: entityStats,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get locking stats');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get locking stats',
      });
    }
  });
}
