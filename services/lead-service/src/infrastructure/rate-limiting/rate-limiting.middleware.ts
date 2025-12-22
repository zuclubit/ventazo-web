/**
 * Rate Limiting Middleware
 * Fastify middleware for automatic rate limiting
 */

import { FastifyRequest, FastifyReply, FastifyInstance, FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import { container } from 'tsyringe';
import { RateLimitingService, RateLimitContext, RateLimitCheckOptions } from './rate-limiting.service';
import { RateLimitResult, RateLimitTier } from './types';

/**
 * Rate limit middleware options
 */
export interface RateLimitMiddlewareOptions {
  /**
   * Skip rate limiting for certain paths
   */
  skipPaths?: string[];

  /**
   * Skip rate limiting for certain methods
   */
  skipMethods?: string[];

  /**
   * Extract tenant ID from request
   */
  extractTenantId?: (request: FastifyRequest) => string | undefined;

  /**
   * Extract user ID from request
   */
  extractUserId?: (request: FastifyRequest) => string | undefined;

  /**
   * Extract API key from request
   */
  extractApiKey?: (request: FastifyRequest) => string | undefined;

  /**
   * Extract tier from request
   */
  extractTier?: (request: FastifyRequest) => RateLimitTier | undefined;

  /**
   * Custom cost calculator
   */
  calculateCost?: (request: FastifyRequest) => number;

  /**
   * Handler for blocked requests
   */
  onBlocked?: (request: FastifyRequest, reply: FastifyReply, result: RateLimitResult) => void;

  /**
   * Enable dry run mode (log but don't block)
   */
  dryRun?: boolean;

  /**
   * Trust proxy headers for IP extraction
   */
  trustProxy?: boolean;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: RateLimitMiddlewareOptions = {
  skipPaths: ['/health', '/metrics', '/ready', '/live'],
  skipMethods: ['OPTIONS'],
  dryRun: false,
  trustProxy: true,
  errorMessage: 'Too many requests, please try again later',
};

/**
 * Extend FastifyRequest with rate limit info
 */
declare module 'fastify' {
  interface FastifyRequest {
    rateLimit?: {
      result: RateLimitResult;
      context: RateLimitContext;
    };
  }
}

/**
 * Extract client IP from request
 */
function extractClientIp(request: FastifyRequest, trustProxy: boolean): string {
  if (trustProxy) {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
  }

  return request.ip;
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions = {}
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip certain paths
    if (opts.skipPaths?.some(path => request.url.startsWith(path))) {
      return;
    }

    // Skip certain methods
    if (opts.skipMethods?.includes(request.method)) {
      return;
    }

    let rateLimitingService: RateLimitingService;
    try {
      rateLimitingService = container.resolve<RateLimitingService>('IRateLimitingService');
    } catch {
      // Rate limiting service not available, skip
      return;
    }

    // Build context
    const context: RateLimitContext = {
      ip: extractClientIp(request, opts.trustProxy || true),
      endpoint: request.url.split('?')[0], // Remove query string
      method: request.method,
      tenantId: opts.extractTenantId?.(request),
      userId: opts.extractUserId?.(request),
      apiKey: opts.extractApiKey?.(request),
      tier: opts.extractTier?.(request),
    };

    // Calculate cost
    const checkOptions: RateLimitCheckOptions = {
      cost: opts.calculateCost?.(request) || 1,
      dryRun: opts.dryRun,
    };

    // Check rate limit
    const result = await rateLimitingService.checkRateLimit(context, checkOptions);

    // Attach to request for downstream use
    request.rateLimit = { result, context };

    // Set rate limit headers
    const headers = rateLimitingService.generateHeaders(result);
    for (const [key, value] of Object.entries(headers)) {
      reply.header(key, value);
    }

    // Handle blocked request
    if (!result.allowed && !opts.dryRun) {
      if (opts.onBlocked) {
        opts.onBlocked(request, reply, result);
      } else {
        reply.code(429).send({
          error: 'Too Many Requests',
          message: opts.errorMessage,
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        });
      }
    }
  };
}

/**
 * Rate limiting Fastify plugin
 */
const rateLimitPlugin: FastifyPluginCallback<RateLimitMiddlewareOptions> = (
  fastify: FastifyInstance,
  options: RateLimitMiddlewareOptions,
  done: (err?: Error) => void
) => {
  const middleware = createRateLimitMiddleware(options);

  fastify.addHook('onRequest', async (request, reply) => {
    await middleware(request, reply);
  });

  done();
};

/**
 * Exported Fastify plugin
 */
export const rateLimitingPlugin = fp(rateLimitPlugin, {
  fastify: '4.x',
  name: 'rate-limiting',
});

/**
 * Route-level rate limit decorator
 */
export interface RouteRateLimitOptions {
  limit?: number;
  window?: number;
  scope?: 'ip' | 'user' | 'api_key';
  skipCondition?: (request: FastifyRequest) => boolean;
}

/**
 * Create route-specific rate limiter
 */
export function createRouteRateLimiter(options: RouteRateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Skip if condition met
    if (options.skipCondition?.(request)) {
      return;
    }

    let rateLimitingService: RateLimitingService;
    try {
      rateLimitingService = container.resolve<RateLimitingService>('IRateLimitingService');
    } catch {
      return;
    }

    const context: RateLimitContext = {
      ip: request.ip,
      endpoint: request.url.split('?')[0],
      method: request.method,
    };

    // Add custom rule for this route
    const ruleId = `route:${context.method}:${context.endpoint}`;

    const result = await rateLimitingService.checkRateLimit(context, {
      skipRules: ['default-api'], // Skip default rules, use custom
    });

    if (!result.allowed) {
      const headers = rateLimitingService.generateHeaders(result);
      for (const [key, value] of Object.entries(headers)) {
        reply.header(key, value);
      }

      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded for this endpoint',
        retryAfter: result.retryAfter,
      });
    }
  };
}

/**
 * IP-based rate limiter for sensitive endpoints
 */
export function createIpRateLimiter(limit: number, windowSeconds: number) {
  const counters = new Map<string, { count: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ip = extractClientIp(request, true);
    const now = Date.now();

    let entry = counters.get(ip);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      counters.set(ip, entry);
    }

    entry.count++;

    const remaining = Math.max(0, limit - entry.count);
    const reset = Math.ceil(entry.resetAt / 1000);

    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', reset.toString());

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('Retry-After', retryAfter.toString());
      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'IP rate limit exceeded',
        retryAfter,
      });
    }

    // Cleanup old entries periodically
    if (counters.size > 10000) {
      for (const [key, val] of counters.entries()) {
        if (val.resetAt < now) {
          counters.delete(key);
        }
      }
    }
  };
}

/**
 * User-based rate limiter
 */
export function createUserRateLimiter(
  extractUserId: (request: FastifyRequest) => string | undefined,
  limit: number,
  windowSeconds: number
) {
  const counters = new Map<string, { count: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const userId = extractUserId(request);
    if (!userId) {
      return; // Skip for unauthenticated requests
    }

    const now = Date.now();
    let entry = counters.get(userId);

    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      counters.set(userId, entry);
    }

    entry.count++;

    const remaining = Math.max(0, limit - entry.count);
    const reset = Math.ceil(entry.resetAt / 1000);

    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Reset', reset.toString());

    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('Retry-After', retryAfter.toString());
      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'User rate limit exceeded',
        retryAfter,
      });
    }

    // Cleanup old entries
    if (counters.size > 50000) {
      for (const [key, val] of counters.entries()) {
        if (val.resetAt < now) {
          counters.delete(key);
        }
      }
    }
  };
}

/**
 * Concurrent request limiter (semaphore)
 */
export function createConcurrencyLimiter(maxConcurrent: number) {
  const active = new Map<string, number>();
  const queues = new Map<string, (() => void)[]>();

  return {
    preHandler: async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const key = request.ip;
      const current = active.get(key) || 0;

      if (current >= maxConcurrent) {
        reply.code(429).send({
          error: 'Too Many Concurrent Requests',
          message: `Maximum ${maxConcurrent} concurrent requests allowed`,
        });
        return;
      }

      active.set(key, current + 1);

      // Store for cleanup
      (request as any)._concurrencyKey = key;
    },

    onResponse: async (request: FastifyRequest): Promise<void> => {
      const key = (request as any)._concurrencyKey;
      if (key) {
        const current = active.get(key) || 0;
        if (current <= 1) {
          active.delete(key);
        } else {
          active.set(key, current - 1);
        }
      }
    },
  };
}

/**
 * Sliding window rate limiter
 */
export function createSlidingWindowLimiter(
  keyExtractor: (request: FastifyRequest) => string,
  limit: number,
  windowMs: number
) {
  const windows = new Map<string, number[]>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = keyExtractor(request);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create window
    let timestamps = windows.get(key) || [];

    // Remove old timestamps
    timestamps = timestamps.filter(ts => ts > windowStart);

    // Check limit
    if (timestamps.length >= limit) {
      const oldestInWindow = Math.min(...timestamps);
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);

      reply.header('X-RateLimit-Limit', limit.toString());
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('Retry-After', retryAfter.toString());

      reply.code(429).send({
        error: 'Too Many Requests',
        message: 'Sliding window rate limit exceeded',
        retryAfter,
      });
      return;
    }

    // Add current timestamp
    timestamps.push(now);
    windows.set(key, timestamps);

    const remaining = limit - timestamps.length;

    reply.header('X-RateLimit-Limit', limit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());

    // Cleanup old windows periodically
    if (windows.size > 10000) {
      for (const [k, ts] of windows.entries()) {
        const filtered = ts.filter(t => t > windowStart);
        if (filtered.length === 0) {
          windows.delete(k);
        } else {
          windows.set(k, filtered);
        }
      }
    }
  };
}

/**
 * Cost-based rate limiter
 */
export interface CostConfig {
  GET?: number;
  POST?: number;
  PUT?: number;
  PATCH?: number;
  DELETE?: number;
  default?: number;
  endpoints?: Record<string, number>;
}

export function createCostBasedLimiter(
  keyExtractor: (request: FastifyRequest) => string,
  budget: number,
  windowSeconds: number,
  costs: CostConfig
) {
  const usage = new Map<string, { spent: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = keyExtractor(request);
    const now = Date.now();

    // Calculate cost
    let cost = costs.endpoints?.[request.url.split('?')[0]];
    if (cost === undefined) {
      cost = costs[request.method as keyof CostConfig] as number;
    }
    if (cost === undefined) {
      cost = costs.default || 1;
    }

    // Get or reset usage
    let entry = usage.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { spent: 0, resetAt: now + windowSeconds * 1000 };
      usage.set(key, entry);
    }

    const remaining = Math.max(0, budget - entry.spent);

    if (entry.spent + cost > budget) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      reply.header('X-RateLimit-Limit', budget.toString());
      reply.header('X-RateLimit-Remaining', remaining.toString());
      reply.header('Retry-After', retryAfter.toString());
      reply.header('X-RateLimit-Cost', cost.toString());

      reply.code(429).send({
        error: 'Rate Limit Exceeded',
        message: 'Request budget exhausted',
        retryAfter,
        cost,
        remaining,
      });
      return;
    }

    entry.spent += cost;

    reply.header('X-RateLimit-Limit', budget.toString());
    reply.header('X-RateLimit-Remaining', (budget - entry.spent).toString());
    reply.header('X-RateLimit-Cost', cost.toString());
  };
}

/**
 * Adaptive rate limiter that adjusts based on server load
 */
export function createAdaptiveRateLimiter(
  baseLimit: number,
  getLoadFactor: () => number // 0-1, where 1 is fully loaded
) {
  const counters = new Map<string, { count: number; resetAt: number }>();
  const windowMs = 60000; // 1 minute window

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const ip = request.ip;
    const now = Date.now();
    const loadFactor = getLoadFactor();

    // Reduce limit based on load
    const adjustedLimit = Math.max(
      Math.floor(baseLimit * (1 - loadFactor * 0.5)),
      Math.floor(baseLimit * 0.2)
    );

    let entry = counters.get(ip);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs };
      counters.set(ip, entry);
    }

    entry.count++;

    const remaining = Math.max(0, adjustedLimit - entry.count);

    reply.header('X-RateLimit-Limit', adjustedLimit.toString());
    reply.header('X-RateLimit-Remaining', remaining.toString());
    reply.header('X-RateLimit-Load', loadFactor.toFixed(2));

    if (entry.count > adjustedLimit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      reply.header('Retry-After', retryAfter.toString());
      reply.code(429).send({
        error: 'Too Many Requests',
        message: loadFactor > 0.8
          ? 'Server under heavy load, please retry later'
          : 'Rate limit exceeded',
        retryAfter,
        serverLoad: loadFactor > 0.8 ? 'high' : 'normal',
      });
    }
  };
}
