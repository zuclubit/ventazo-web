/**
 * Rate Limiting Admin Routes
 * REST API for rate limit management and monitoring
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { RateLimitingService } from './rate-limiting.service';
import {
  RateLimitScope,
  RateLimitTier,
  RateLimitAlgorithm,
  EndpointRateLimitRule,
  TenantRateLimitConfig,
  UserRateLimitQuota,
  DEFAULT_TIER_LIMITS,
} from './types';
import { toJsonSchema } from '../../utils/zod-schema';

/**
 * Zod schemas for validation
 */
const EndpointRuleSchema = z.object({
  id: z.string().min(1),
  pattern: z.string().min(1),
  methods: z.array(z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])),
  config: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    scope: z.enum(['global', 'tenant', 'user', 'ip', 'endpoint', 'user_endpoint', 'api_key']),
    algorithm: z.enum(['fixed_window', 'sliding_window', 'token_bucket', 'leaky_bucket']),
    limit: z.number().int().positive(),
    window: z.number().int().positive(),
    burstLimit: z.number().int().nonnegative().optional(),
    costPerRequest: z.number().positive().optional(),
    enabled: z.boolean(),
    priority: z.number().int().min(0).max(1000),
  }),
  applyTo: z.array(z.enum(['global', 'tenant', 'user', 'ip', 'endpoint', 'user_endpoint', 'api_key'])),
  excludeRoles: z.array(z.string()).optional(),
  excludeUsers: z.array(z.string()).optional(),
});

const TenantConfigSchema = z.object({
  tenantId: z.string().uuid(),
  tier: z.enum(['free', 'starter', 'professional', 'enterprise', 'unlimited']),
  limits: z.object({
    requestsPerSecond: z.number().int().positive(),
    requestsPerMinute: z.number().int().positive(),
    requestsPerHour: z.number().int().positive(),
    requestsPerDay: z.number().int().positive(),
    concurrentRequests: z.number().int().positive(),
    webhooksPerMinute: z.number().int().positive(),
    apiCallsPerMonth: z.number().int(),
    storageBytes: z.number().int(),
  }),
  features: z.object({
    priorityQueue: z.boolean(),
    burstAllowance: z.boolean(),
    customEndpointLimits: z.boolean(),
    rateLimitBypass: z.array(z.string()),
  }),
});

const UserQuotaSchema = z.object({
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  tier: z.enum(['free', 'starter', 'professional', 'enterprise', 'unlimited']),
  customLimits: z.object({
    requestsPerMinute: z.number().int().positive().optional(),
    requestsPerHour: z.number().int().positive().optional(),
    requestsPerDay: z.number().int().positive().optional(),
    apiCallsPerMonth: z.number().int().optional(),
    dataExportsPerDay: z.number().int().positive().optional(),
    bulkOperationsPerHour: z.number().int().positive().optional(),
  }).optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime().optional(),
});

/**
 * Get rate limiting service from container
 */
function getRateLimitingService(): RateLimitingService {
  return container.resolve<RateLimitingService>('IRateLimitingService');
}

/**
 * Rate limiting routes
 */
export async function rateLimitingRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get rate limiting metrics
   */
  fastify.get('/metrics', {
    schema: {
      description: 'Get rate limiting metrics',
      tags: ['Rate Limiting'],
      querystring: {
        type: 'object',
        properties: {
          since: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalRequests: { type: 'number' },
            allowedRequests: { type: 'number' },
            blockedRequests: { type: 'number' },
            blockRate: { type: 'number' },
            peakHour: { type: 'number' },
            avgRequestsPerMinute: { type: 'number' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { since?: string } }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const since = request.query.since ? new Date(request.query.since) : undefined;

    const metrics = await service.getMetrics(since);
    const blockRate = metrics.totalRequests > 0
      ? metrics.blockedRequests / metrics.totalRequests
      : 0;

    return {
      ...metrics,
      blockRate,
    };
  });

  /**
   * Get all endpoint rules
   */
  fastify.get('/rules', {
    schema: {
      description: 'Get all rate limit endpoint rules',
      tags: ['Rate Limiting'],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              pattern: { type: 'string' },
              methods: { type: 'array', items: { type: 'string' } },
              config: { type: 'object' },
              applyTo: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, _reply: FastifyReply) => {
    const service = getRateLimitingService();
    return service.getEndpointRules();
  });

  /**
   * Add or update endpoint rule
   */
  fastify.post('/rules', {
    schema: {
      description: 'Add or update rate limit endpoint rule',
      tags: ['Rate Limiting'],
      body: toJsonSchema(EndpointRuleSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            ruleId: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: EndpointRateLimitRule }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const rule = request.body;

    service.addEndpointRule(rule);

    return {
      success: true,
      ruleId: rule.id,
    };
  });

  /**
   * Delete endpoint rule
   */
  fastify.delete('/rules/:ruleId', {
    schema: {
      description: 'Delete rate limit endpoint rule',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' },
        },
        required: ['ruleId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { ruleId: string } }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const deleted = service.removeEndpointRule(request.params.ruleId);

    if (!deleted) {
      reply.code(404);
      return { error: 'Rule not found' };
    }

    return { success: true };
  });

  /**
   * Get default tier limits
   */
  fastify.get('/tiers', {
    schema: {
      description: 'Get default tier limits',
      tags: ['Rate Limiting'],
    },
  }, async (_request: FastifyRequest, _reply: FastifyReply) => {
    return DEFAULT_TIER_LIMITS;
  });

  /**
   * Get tenant configuration
   */
  fastify.get('/tenants/:tenantId', {
    schema: {
      description: 'Get tenant rate limit configuration',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const config = service.getTenantConfig(request.params.tenantId);

    if (!config) {
      // Return default based on free tier
      return {
        tenantId: request.params.tenantId,
        tier: 'free' as RateLimitTier,
        limits: DEFAULT_TIER_LIMITS.free,
        features: {
          priorityQueue: false,
          burstAllowance: false,
          customEndpointLimits: false,
          rateLimitBypass: [],
        },
      };
    }

    return config;
  });

  /**
   * Set tenant configuration
   */
  fastify.put('/tenants/:tenantId', {
    schema: {
      description: 'Set tenant rate limit configuration',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId'],
      },
      body: toJsonSchema(TenantConfigSchema),
    },
  }, async (request: FastifyRequest<{
    Params: { tenantId: string };
    Body: TenantRateLimitConfig;
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();

    // Ensure tenantId matches
    const config = {
      ...request.body,
      tenantId: request.params.tenantId,
    };

    service.setTenantConfig(config);

    return {
      success: true,
      config,
    };
  });

  /**
   * Get user quota
   */
  fastify.get('/users/:tenantId/:userId/quota', {
    schema: {
      description: 'Get user rate limit quota',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId', 'userId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { tenantId: string; userId: string } }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const quota = service.getUserQuota(request.params.tenantId, request.params.userId);

    if (!quota) {
      return {
        userId: request.params.userId,
        tenantId: request.params.tenantId,
        tier: 'free' as RateLimitTier,
        validFrom: new Date(),
      };
    }

    return quota;
  });

  /**
   * Set user quota
   */
  fastify.put('/users/:tenantId/:userId/quota', {
    schema: {
      description: 'Set user rate limit quota',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId', 'userId'],
      },
      body: toJsonSchema(UserQuotaSchema),
    },
  }, async (request: FastifyRequest<{
    Params: { tenantId: string; userId: string };
    Body: UserRateLimitQuota;
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();

    const quota: UserRateLimitQuota = {
      ...request.body,
      userId: request.params.userId,
      tenantId: request.params.tenantId,
      validFrom: new Date(request.body.validFrom as unknown as string),
      validUntil: request.body.validUntil
        ? new Date(request.body.validUntil as unknown as string)
        : undefined,
    };

    service.setUserQuota(quota);

    return {
      success: true,
      quota,
    };
  });

  /**
   * Get quota usage
   */
  fastify.get('/usage/:tenantId', {
    schema: {
      description: 'Get tenant quota usage',
      tags: ['Rate Limiting'],
      params: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
        required: ['tenantId'],
      },
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' },
          period: { type: 'string', enum: ['minute', 'hour', 'day', 'month'] },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { tenantId: string };
    Querystring: { userId?: string; period?: 'minute' | 'hour' | 'day' | 'month' };
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const result = await service.getQuotaUsage(
      request.params.tenantId,
      request.query.userId,
      request.query.period || 'day'
    );

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return result.value;
  });

  /**
   * Check rate limit for a context
   */
  fastify.post('/check', {
    schema: {
      description: 'Check rate limit for a given context',
      tags: ['Rate Limiting'],
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          userId: { type: 'string' },
          ip: { type: 'string' },
          endpoint: { type: 'string' },
          method: { type: 'string' },
          apiKey: { type: 'string' },
          tier: { type: 'string' },
          cost: { type: 'number' },
          dryRun: { type: 'boolean' },
        },
        required: ['ip', 'endpoint', 'method'],
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      tenantId?: string;
      userId?: string;
      ip: string;
      endpoint: string;
      method: string;
      apiKey?: string;
      tier?: RateLimitTier;
      cost?: number;
      dryRun?: boolean;
    };
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const { cost, dryRun, ...context } = request.body;

    const result = await service.checkRateLimit(context, {
      cost: cost || 1,
      dryRun: dryRun ?? true, // Default to dry run for manual checks
    });

    return result;
  });

  /**
   * Reset rate limit for a key
   */
  fastify.post('/reset', {
    schema: {
      description: 'Reset rate limit for a specific key',
      tags: ['Rate Limiting'],
      body: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          scope: { type: 'string' },
          tenantId: { type: 'string' },
          userId: { type: 'string' },
          ip: { type: 'string' },
          ruleId: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      key?: string;
      scope?: RateLimitScope;
      tenantId?: string;
      userId?: string;
      ip?: string;
      ruleId?: string;
    };
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();

    let key = request.body.key;

    // Generate key from scope if not provided directly
    if (!key && request.body.scope && request.body.ruleId) {
      const scope = request.body.scope;
      const ruleId = request.body.ruleId;

      switch (scope) {
        case 'tenant':
          key = `ratelimit:${ruleId}:tenant:${request.body.tenantId}`;
          break;
        case 'user':
          key = `ratelimit:${ruleId}:user:${request.body.tenantId}:${request.body.userId}`;
          break;
        case 'ip':
          key = `ratelimit:${ruleId}:ip:${request.body.ip}`;
          break;
        default:
          key = `ratelimit:${ruleId}:${scope}`;
      }
    }

    if (!key) {
      reply.code(400);
      return { error: 'Either key or scope with identifiers required' };
    }

    const result = await service.resetRateLimit(key);

    if (result.isFailure) {
      reply.code(500);
      return { error: result.error?.message };
    }

    return { success: true, key };
  });

  /**
   * Get rate limit status for context
   */
  fastify.post('/status', {
    schema: {
      description: 'Get rate limit status for all matching rules',
      tags: ['Rate Limiting'],
      body: {
        type: 'object',
        properties: {
          tenantId: { type: 'string' },
          userId: { type: 'string' },
          ip: { type: 'string' },
          endpoint: { type: 'string' },
          method: { type: 'string' },
          apiKey: { type: 'string' },
          tier: { type: 'string' },
        },
        required: ['ip', 'endpoint', 'method'],
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      tenantId?: string;
      userId?: string;
      ip: string;
      endpoint: string;
      method: string;
      apiKey?: string;
      tier?: RateLimitTier;
    };
  }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const statusMap = await service.getRateLimitStatus(request.body);

    const status: Record<string, object> = {};
    for (const [key, result] of statusMap) {
      status[key] = result;
    }

    return status;
  });

  /**
   * Get dashboard data
   */
  fastify.get('/dashboard', {
    schema: {
      description: 'Get rate limiting dashboard data',
      tags: ['Rate Limiting'],
      querystring: {
        type: 'object',
        properties: {
          tenantId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { tenantId?: string } }>, reply: FastifyReply) => {
    const service = getRateLimitingService();
    const metrics = await service.getMetrics();

    const totalRequests = metrics.totalRequests;
    const blockedRequests = metrics.blockedRequests;

    // Get top endpoints
    const topEndpoints = Object.entries(metrics.byEndpoint)
      .map(([endpoint, data]) => ({
        endpoint,
        requests: data.allowed + data.blocked,
        blocked: data.blocked,
        avgLatency: data.avgResponseTime,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Generate alerts for high block rates
    const alerts: Array<{
      type: 'warning' | 'critical';
      message: string;
      scope: RateLimitScope;
      key: string;
      timestamp: Date;
    }> = [];

    if (blockedRequests / totalRequests > 0.1) {
      alerts.push({
        type: 'warning',
        message: `High block rate: ${((blockedRequests / totalRequests) * 100).toFixed(1)}% of requests blocked`,
        scope: 'global',
        key: 'block-rate',
        timestamp: new Date(),
      });
    }

    for (const user of metrics.topBlockedUsers.slice(0, 3)) {
      alerts.push({
        type: 'warning',
        message: `User ${user.userId} blocked ${user.count} times`,
        scope: 'user',
        key: user.userId,
        timestamp: new Date(),
      });
    }

    // Get tenant quota status if requested
    let quotaStatus = undefined;
    if (request.query.tenantId) {
      const usageResult = await service.getQuotaUsage(request.query.tenantId, undefined, 'day');
      if (usageResult.isSuccess && usageResult.value) {
        const usage = usageResult.value;
        const usagePercent = usage.limits.requests > 0
          ? (usage.usage.requests / usage.limits.requests) * 100
          : 0;

        quotaStatus = {
          tenantId: request.query.tenantId,
          tier: 'free' as RateLimitTier,
          usagePercent,
          resetIn: Math.ceil((usage.periodEnd.getTime() - Date.now()) / 1000),
        };
      }
    }

    return {
      summary: {
        totalRequests24h: totalRequests,
        blockedRequests24h: blockedRequests,
        blockRate: totalRequests > 0 ? blockedRequests / totalRequests : 0,
        avgResponseTime: 0, // Not tracked in rate limiting
        activeUsers: metrics.topBlockedUsers.length,
        peakRps: 0, // Would need time-series data
      },
      metrics,
      topEndpoints,
      alerts,
      quotaStatus,
    };
  });
}
