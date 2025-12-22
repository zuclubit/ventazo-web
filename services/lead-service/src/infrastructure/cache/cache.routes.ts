/**
 * Cache Management Routes
 * Admin endpoints for cache monitoring and management
 */
import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CacheService } from './cache.service';
import { CacheWarmingService } from './cache-warming.service';

// Validation schemas
const InvalidatePatternSchema = z.object({
  pattern: z.string().min(1).max(200),
});

const InvalidateTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(100)).min(1).max(20),
});

const WarmCacheSchema = z.object({
  entities: z.array(z.enum(['lead', 'customer', 'pipeline', 'analytics'])).optional(),
});

const SetCacheSchema = z.object({
  key: z.string().min(1).max(500),
  value: z.unknown(),
  ttl: z.number().min(1).max(86400 * 30).optional(),
  tags: z.array(z.string()).optional(),
});

// JSON Schema equivalents for Fastify schema validation
const KeyParamsJSON = {
  type: 'object',
  required: ['key'],
  properties: {
    key: { type: 'string' },
  },
};

const InvalidatePatternSchemaJSON = {
  type: 'object',
  required: ['pattern'],
  properties: {
    pattern: { type: 'string', minLength: 1, maxLength: 200 },
  },
};

const InvalidateTagsSchemaJSON = {
  type: 'object',
  required: ['tags'],
  properties: {
    tags: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: { type: 'string', minLength: 1, maxLength: 100 },
    },
  },
};

const WarmCacheSchemaJSON = {
  type: 'object',
  properties: {
    entities: {
      type: 'array',
      items: { type: 'string', enum: ['lead', 'customer', 'pipeline', 'analytics'] },
    },
  },
};

const SetCacheSchemaJSON = {
  type: 'object',
  required: ['key', 'value'],
  properties: {
    key: { type: 'string', minLength: 1, maxLength: 500 },
    value: {},
    ttl: { type: 'number', minimum: 1, maximum: 2592000 },
    tags: { type: 'array', items: { type: 'string' } },
  },
};

const PublishInvalidationSchemaJSON = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ['single', 'pattern', 'tag', 'all'] },
    keys: { type: 'array', items: { type: 'string' } },
    pattern: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string' },
  },
};

export const cacheRoutes: FastifyPluginAsync = async (fastify) => {
  const cacheService = container.resolve(CacheService);
  const warmingService = container.resolve(CacheWarmingService);

  // Get cache health status
  fastify.get('/health', {
    schema: {
      description: 'Get cache health status',
      tags: ['Cache'],
    },
    handler: async (request, reply) => {
      const health = await cacheService.getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 :
                         health.status === 'degraded' ? 200 : 503;
      return reply.status(statusCode).send(health);
    },
  });

  // Get cache statistics
  fastify.get('/stats', {
    schema: {
      description: 'Get cache statistics',
      tags: ['Cache'],
    },
    handler: async (request, reply) => {
      const stats = await cacheService.getStats();
      return reply.status(200).send(stats);
    },
  });

  // Get a specific cache key
  fastify.get('/keys/:key', {
    schema: {
      description: 'Get value for a specific cache key',
      tags: ['Cache'],
      params: KeyParamsJSON,
    },
    handler: async (request, reply) => {
      const { key } = request.params as { key: string };
      const result = await cacheService.get(key);

      if (!result.hit) {
        return reply.status(404).send({ error: 'Key not found' });
      }

      return reply.status(200).send({
        key,
        value: result.value,
        metadata: result.metadata,
      });
    },
  });

  // Set a cache key (admin only)
  fastify.post('/keys', {
    schema: {
      description: 'Set a cache key',
      tags: ['Cache'],
      body: SetCacheSchemaJSON,
    },
    handler: async (request, reply) => {
      const { key, value, ttl, tags } = request.body as z.infer<typeof SetCacheSchema>;

      const result = await cacheService.set(key, value, { ttl, tags });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.status(201).send({ success: true, key });
    },
  });

  // Delete a specific cache key
  fastify.delete('/keys/:key', {
    schema: {
      description: 'Delete a specific cache key',
      tags: ['Cache'],
      params: KeyParamsJSON,
    },
    handler: async (request, reply) => {
      const { key } = request.params as { key: string };
      const result = await cacheService.delete(key);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.status(200).send({ success: true, key });
    },
  });

  // Invalidate by pattern
  fastify.post('/invalidate/pattern', {
    schema: {
      description: 'Invalidate cache keys matching a pattern',
      tags: ['Cache'],
      body: InvalidatePatternSchemaJSON,
    },
    handler: async (request, reply) => {
      const { pattern } = request.body as z.infer<typeof InvalidatePatternSchema>;
      const result = await cacheService.deletePattern(pattern);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.status(200).send({
        success: true,
        pattern,
        deletedCount: result.value,
      });
    },
  });

  // Invalidate by tags
  fastify.post('/invalidate/tags', {
    schema: {
      description: 'Invalidate cache keys by tags',
      tags: ['Cache'],
      body: InvalidateTagsSchemaJSON,
    },
    handler: async (request, reply) => {
      const { tags } = request.body as z.infer<typeof InvalidateTagsSchema>;
      let totalDeleted = 0;

      for (const tag of tags) {
        const result = await cacheService.invalidateTag(tag);
        if (result.isSuccess) {
          totalDeleted += result.value;
        }
      }

      return reply.status(200).send({
        success: true,
        tags,
        deletedCount: totalDeleted,
      });
    },
  });

  // Clear tenant cache
  fastify.post('/clear/tenant', {
    schema: {
      description: 'Clear all cache for current tenant',
      tags: ['Cache'],
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const result = await cacheService.clearTenant(tenantId);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.status(200).send({
        success: true,
        tenantId,
        deletedCount: result.value,
      });
    },
  });

  // Warm cache
  fastify.post('/warm', {
    schema: {
      description: 'Warm cache with frequently accessed data',
      tags: ['Cache'],
      body: WarmCacheSchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';

      if (warmingService.isWarmingInProgress) {
        return reply.status(409).send({
          error: 'Cache warming already in progress',
        });
      }

      const result = await warmingService.warmCache(tenantId);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.status(200).send(result.value);
    },
  });

  // Check if key exists
  fastify.get('/exists/:key', {
    schema: {
      description: 'Check if a cache key exists',
      tags: ['Cache'],
      params: KeyParamsJSON,
    },
    handler: async (request, reply) => {
      const { key } = request.params as { key: string };
      const exists = await cacheService.exists(key);
      const ttl = await cacheService.getTTL(key);

      return reply.status(200).send({
        key,
        exists,
        ttl: ttl >= 0 ? ttl : null,
      });
    },
  });

  // Get TTL for a key
  fastify.get('/ttl/:key', {
    schema: {
      description: 'Get TTL for a cache key',
      tags: ['Cache'],
      params: KeyParamsJSON,
    },
    handler: async (request, reply) => {
      const { key } = request.params as { key: string };
      const ttl = await cacheService.getTTL(key);

      if (ttl === -2) {
        return reply.status(404).send({ error: 'Key not found' });
      }

      return reply.status(200).send({
        key,
        ttl,
        expiresIn: ttl === -1 ? 'never' : `${ttl} seconds`,
      });
    },
  });

  // Publish invalidation event (for distributed cache)
  fastify.post('/invalidate/publish', {
    schema: {
      description: 'Publish cache invalidation event to all nodes',
      tags: ['Cache'],
      body: PublishInvalidationSchemaJSON,
    },
    handler: async (request, reply) => {
      const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
      const body = request.body as {
        type: 'single' | 'pattern' | 'tag' | 'all';
        keys?: string[];
        pattern?: string;
        tags?: string[];
        reason?: string;
      };

      await cacheService.publishInvalidation({
        type: body.type,
        keys: body.keys,
        pattern: body.pattern,
        tags: body.tags,
        reason: body.reason || 'Manual invalidation',
        timestamp: new Date(),
        tenantId,
      });

      return reply.status(200).send({ success: true });
    },
  });
};
