/**
 * Webhook DLQ Routes
 * REST API for Dead Letter Queue management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { WebhookDLQService } from './webhook-dlq.service';
import { WebhookQueueService } from './webhook-queue.service';
import { DLQQueryOptions, FailureCategory, DLQStatus } from './webhook-dlq.types';
import { WebhookEvent } from './types';

/**
 * Get DLQ service from container
 */
function getDLQService(): WebhookDLQService {
  return container.resolve<WebhookDLQService>('WebhookDLQService');
}

/**
 * Get Queue service from container
 */
function getQueueService(): WebhookQueueService {
  return container.resolve<WebhookQueueService>('WebhookQueueService');
}

/**
 * DLQ routes
 */
export async function webhookDLQRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get DLQ statistics
   */
  fastify.get('/stats', {
    schema: {
      description: 'Get DLQ statistics',
      tags: ['Webhook DLQ'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { tenantId: string } }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.getStats(request.query.tenantId);

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * List DLQ entries
   */
  fastify.get('/entries', {
    schema: {
      description: 'List DLQ entries',
      tags: ['Webhook DLQ'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          webhookId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'retrying', 'recovered', 'discarded', 'expired'] },
          category: { type: 'string', enum: ['network_error', 'server_error', 'client_error', 'timeout', 'invalid_response', 'circuit_open', 'rate_limited', 'unknown'] },
          event: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          sortBy: { type: 'string', enum: ['addedToDLQAt', 'lastAttemptAt', 'totalAttempts'], default: 'addedToDLQAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: DLQQueryOptions & { startDate?: string; endDate?: string };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const { startDate, endDate, ...rest } = request.query;

    const result = await service.listEntries({
      ...rest,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * Get a specific DLQ entry
   */
  fastify.get('/entries/:id', {
    schema: {
      description: 'Get a DLQ entry',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: { tenantId: string };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.getEntry(request.params.id, request.query.tenantId);

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    if (!result.value) {
      reply.code(404);
      return { error: 'Entry not found' };
    }

    return result.value;
  });

  /**
   * Retry a single DLQ entry
   */
  fastify.post('/entries/:id/retry', {
    schema: {
      description: 'Retry a DLQ entry',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          options: {
            type: 'object',
            properties: {
              maxRetries: { type: 'integer', minimum: 1 },
              retryDelay: { type: 'integer', minimum: 1000 },
            },
          },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { tenantId: string; options?: { maxRetries?: number; retryDelay?: number } };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.retryEntry(
      request.params.id,
      request.body.tenantId,
      request.body.options
    );

    if (result.isFailure) {
      reply.code(result.error?.message === 'DLQ entry not found' ? 404 : 500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * Bulk retry entries
   */
  fastify.post('/entries/bulk-retry', {
    schema: {
      description: 'Bulk retry DLQ entries',
      tags: ['Webhook DLQ'],
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          filter: {
            type: 'object',
            properties: {
              webhookId: { type: 'string', format: 'uuid' },
              category: { type: 'string' },
              event: { type: 'string' },
            },
          },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      tenantId: string;
      filter?: {
        webhookId?: string;
        category?: FailureCategory;
        event?: WebhookEvent;
      };
    };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.bulkRetry(
      request.body.tenantId,
      request.body.filter || {}
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * Discard a DLQ entry
   */
  fastify.post('/entries/:id/discard', {
    schema: {
      description: 'Discard a DLQ entry',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          discardedBy: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['tenantId', 'discardedBy'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { tenantId: string; discardedBy: string; reason?: string };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.discardEntry(
      request.params.id,
      request.body.tenantId,
      request.body.discardedBy,
      request.body.reason
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return { success: true };
  });

  /**
   * Bulk discard entries
   */
  fastify.post('/entries/bulk-discard', {
    schema: {
      description: 'Bulk discard DLQ entries',
      tags: ['Webhook DLQ'],
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          filter: {
            type: 'object',
            properties: {
              webhookId: { type: 'string', format: 'uuid' },
              status: { type: 'string' },
              category: { type: 'string' },
            },
          },
          discardedBy: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['tenantId', 'discardedBy'],
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      tenantId: string;
      filter?: Partial<DLQQueryOptions>;
      discardedBy: string;
      reason?: string;
    };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.bulkDiscard(
      request.body.tenantId,
      request.body.filter || {},
      request.body.discardedBy,
      request.body.reason
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * Add tags to an entry
   */
  fastify.post('/entries/:id/tags', {
    schema: {
      description: 'Add tags to a DLQ entry',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['tenantId', 'tags'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { tenantId: string; tags: string[] };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.addTags(
      request.params.id,
      request.body.tenantId,
      request.body.tags
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return { success: true };
  });

  /**
   * Add note to an entry
   */
  fastify.post('/entries/:id/note', {
    schema: {
      description: 'Add note to a DLQ entry',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          note: { type: 'string' },
        },
        required: ['tenantId', 'note'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { tenantId: string; note: string };
  }>, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.addNote(
      request.params.id,
      request.body.tenantId,
      request.body.note
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return { success: true };
  });

  /**
   * Manually trigger cleanup
   */
  fastify.post('/cleanup', {
    schema: {
      description: 'Trigger DLQ cleanup',
      tags: ['Webhook DLQ'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const service = getDLQService();
    const result = await service.cleanupExpired();

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return {
      success: true,
      entriesRemoved: result.value,
    };
  });

  /**
   * Get queue metrics
   */
  fastify.get('/queue/metrics', {
    schema: {
      description: 'Get webhook queue metrics',
      tags: ['Webhook DLQ'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const result = await queueService.getMetrics();

      if (result.isFailure) {
        reply.code(500);
        return { error: result.error?.message };
      }

      return result.value;
    } catch {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
        avgProcessingTime: 0,
        throughput: 0,
      };
    }
  });

  /**
   * Pause the queue
   */
  fastify.post('/queue/pause', {
    schema: {
      description: 'Pause the webhook queue',
      tags: ['Webhook DLQ'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const result = await queueService.pause();

      if (result.isFailure) {
        reply.code(500);
        return { error: result.error?.message };
      }

      return { success: true, paused: true };
    } catch (error) {
      reply.code(500);
      return { error: 'Queue service not available' };
    }
  });

  /**
   * Resume the queue
   */
  fastify.post('/queue/resume', {
    schema: {
      description: 'Resume the webhook queue',
      tags: ['Webhook DLQ'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const result = await queueService.resume();

      if (result.isFailure) {
        reply.code(500);
        return { error: result.error?.message };
      }

      return { success: true, paused: false };
    } catch (error) {
      reply.code(500);
      return { error: 'Queue service not available' };
    }
  });

  /**
   * Get queue jobs by status
   */
  fastify.get('/queue/jobs', {
    schema: {
      description: 'Get queue jobs by status',
      tags: ['Webhook DLQ'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['waiting', 'active', 'completed', 'failed', 'delayed'] },
          start: { type: 'integer', minimum: 0, default: 0 },
          end: { type: 'integer', minimum: 1, default: 100 },
        },
        required: ['status'],
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
      start?: number;
      end?: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const { status, start = 0, end = 100 } = request.query;

      const result = await queueService.getJobs(status, start, end);

      if (result.isFailure) {
        reply.code(500);
        return { error: result.error?.message };
      }

      // Return simplified job info
      return result.value.map((job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }));
    } catch (error) {
      reply.code(500);
      return { error: 'Queue service not available' };
    }
  });

  /**
   * Retry a queue job
   */
  fastify.post('/queue/jobs/:jobId/retry', {
    schema: {
      description: 'Retry a queue job',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const result = await queueService.retryJob(request.params.jobId);

      if (result.isFailure) {
        reply.code(result.error?.message === 'Job not found' ? 404 : 500);
        return { error: result.error?.message };
      }

      return { success: true };
    } catch (error) {
      reply.code(500);
      return { error: 'Queue service not available' };
    }
  });

  /**
   * Remove a queue job
   */
  fastify.delete('/queue/jobs/:jobId', {
    schema: {
      description: 'Remove a queue job',
      tags: ['Webhook DLQ'],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { jobId: string } }>, reply: FastifyReply) => {
    try {
      const queueService = getQueueService();
      const result = await queueService.removeJob(request.params.jobId);

      if (result.isFailure) {
        reply.code(500);
        return { error: result.error?.message };
      }

      return { success: true };
    } catch (error) {
      reply.code(500);
      return { error: 'Queue service not available' };
    }
  });
}
