/**
 * Advanced Rate Limiting Service
 * Redis-based rate limiting with multiple algorithms and scopes
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { Redis } from 'ioredis';
import {
  RateLimitConfig,
  RateLimitResult,
  RateLimitScope,
  RateLimitAlgorithm,
  RateLimitTier,
  RateLimitEvent,
  RateLimitEventListener,
  RateLimitMetrics,
  UserRateLimitQuota,
  TenantRateLimitConfig,
  EndpointRateLimitRule,
  QuotaUsage,
  RateLimitHeaders,
  DEFAULT_TIER_LIMITS,
  DEFAULT_ENDPOINT_LIMITS,
} from './types';

/**
 * Rate limit context for request evaluation
 */
export interface RateLimitContext {
  tenantId?: string;
  userId?: string;
  ip: string;
  endpoint: string;
  method: string;
  apiKey?: string;
  tier?: RateLimitTier;
}

/**
 * Rate limit check options
 */
export interface RateLimitCheckOptions {
  cost?: number;
  skipRules?: string[];
  dryRun?: boolean;
}

/**
 * Lua scripts for atomic rate limiting operations
 */
const LUA_SCRIPTS = {
  // Fixed window rate limiting
  fixedWindow: `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local current = redis.call('GET', key)
    current = current and tonumber(current) or 0

    if current + cost > limit then
      local ttl = redis.call('TTL', key)
      return {0, current, ttl > 0 and ttl or window}
    end

    local new_count = redis.call('INCRBY', key, cost)
    if new_count == cost then
      redis.call('EXPIRE', key, window)
    end

    local ttl = redis.call('TTL', key)
    return {1, new_count, ttl > 0 and ttl or window}
  `,

  // Sliding window rate limiting
  slidingWindow: `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local window_start = now - window

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

    -- Count current requests
    local current = redis.call('ZCARD', key)

    if current + cost > limit then
      -- Get oldest entry to calculate retry-after
      local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
      local retry_after = oldest[2] and (tonumber(oldest[2]) + window - now) or window
      return {0, current, math.ceil(retry_after)}
    end

    -- Add new entries
    for i = 1, cost do
      redis.call('ZADD', key, now, now .. ':' .. i .. ':' .. math.random())
    end
    redis.call('EXPIRE', key, window)

    return {1, current + cost, window}
  `,

  // Token bucket rate limiting
  tokenBucket: `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])
    local burst = tonumber(ARGV[5]) or 0

    local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
    local tokens = bucket[1] and tonumber(bucket[1]) or capacity
    local last_refill = bucket[2] and tonumber(bucket[2]) or now

    -- Calculate tokens to add based on time elapsed
    local elapsed = now - last_refill
    local tokens_to_add = elapsed * refill_rate
    tokens = math.min(capacity + burst, tokens + tokens_to_add)

    if tokens < cost then
      -- Calculate time until enough tokens are available
      local needed = cost - tokens
      local retry_after = math.ceil(needed / refill_rate)
      return {0, math.floor(tokens), retry_after}
    end

    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600) -- 1 hour TTL for cleanup

    return {1, math.floor(tokens), 0}
  `,

  // Leaky bucket rate limiting
  leakyBucket: `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local leak_rate = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    local bucket = redis.call('HMGET', key, 'water', 'last_leak')
    local water = bucket[1] and tonumber(bucket[1]) or 0
    local last_leak = bucket[2] and tonumber(bucket[2]) or now

    -- Leak water based on time elapsed
    local elapsed = now - last_leak
    local leaked = elapsed * leak_rate
    water = math.max(0, water - leaked)

    if water + cost > capacity then
      -- Calculate time until there's room
      local overflow = (water + cost) - capacity
      local retry_after = math.ceil(overflow / leak_rate)
      return {0, capacity - math.floor(water), retry_after}
    end

    water = water + cost
    redis.call('HMSET', key, 'water', water, 'last_leak', now)
    redis.call('EXPIRE', key, 3600)

    return {1, capacity - math.floor(water), 0}
  `,

  // Quota usage increment
  quotaIncrement: `
    local key = KEYS[1]
    local field = ARGV[1]
    local amount = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local ttl = tonumber(ARGV[4])

    local current = redis.call('HINCRBY', key, field, amount)
    if current == amount then
      redis.call('EXPIRE', key, ttl)
    end

    if limit > 0 and current > limit then
      return {0, current}
    end

    return {1, current}
  `,
};

@injectable()
export class RateLimitingService {
  private redis: Redis | null = null;
  private listeners: RateLimitEventListener[] = [];
  private endpointRules: EndpointRateLimitRule[] = [...DEFAULT_ENDPOINT_LIMITS];
  private tenantConfigs: Map<string, TenantRateLimitConfig> = new Map();
  private userQuotas: Map<string, UserRateLimitQuota> = new Map();
  private scriptsLoaded = false;
  private scriptShas: Record<string, string> = {};
  private metricsBuffer: RateLimitEvent[] = [];
  private metricsFlushInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject('RedisClient') redis?: Redis
  ) {
    this.redis = redis || null;
    this.startMetricsFlush();
  }

  /**
   * Initialize Redis connection and load Lua scripts
   */
  async initialize(redisUrl?: string): Promise<Result<void>> {
    try {
      if (!this.redis && redisUrl) {
        this.redis = new Redis(redisUrl);
      }

      if (this.redis && !this.scriptsLoaded) {
        await this.loadScripts();
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to initialize rate limiting'));
    }
  }

  /**
   * Load Lua scripts into Redis
   */
  private async loadScripts(): Promise<void> {
    if (!this.redis) return;

    for (const [name, script] of Object.entries(LUA_SCRIPTS)) {
      this.scriptShas[name] = await this.redis.script('LOAD', script) as string;
    }
    this.scriptsLoaded = true;
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    context: RateLimitContext,
    options: RateLimitCheckOptions = {}
  ): Promise<RateLimitResult> {
    const cost = options.cost || 1;
    const matchingRules = this.findMatchingRules(context, options.skipRules);

    // Sort by priority (higher first)
    matchingRules.sort((a, b) => b.config.priority - a.config.priority);

    // Check tenant limits first
    if (context.tenantId) {
      const tenantResult = await this.checkTenantLimit(context, cost);
      if (!tenantResult.allowed) {
        this.emitEvent({
          type: 'blocked',
          timestamp: new Date(),
          scope: 'tenant',
          key: `tenant:${context.tenantId}`,
          tenantId: context.tenantId,
          userId: context.userId,
          ip: context.ip,
          endpoint: context.endpoint,
          method: context.method,
          limit: tenantResult.limit,
          remaining: tenantResult.remaining,
          cost,
          rule: 'tenant-limit',
        });
        return tenantResult;
      }
    }

    // Check each matching rule
    for (const rule of matchingRules) {
      if (!rule.config.enabled) continue;

      // Check exclusions
      if (context.userId && rule.excludeUsers?.includes(context.userId)) continue;

      const results: RateLimitResult[] = [];

      for (const scope of rule.applyTo) {
        const key = this.generateKey(scope, context, rule.id);
        const result = await this.executeRateLimitCheck(
          key,
          rule.config,
          cost,
          scope
        );

        if (!result.allowed) {
          this.emitEvent({
            type: 'blocked',
            timestamp: new Date(),
            scope,
            key,
            tenantId: context.tenantId,
            userId: context.userId,
            ip: context.ip,
            endpoint: context.endpoint,
            method: context.method,
            limit: result.limit,
            remaining: result.remaining,
            cost,
            rule: rule.id,
          });

          if (!options.dryRun) {
            return result;
          }
        }

        results.push(result);
      }

      // Return the most restrictive result
      const mostRestrictive = results.reduce((min, r) =>
        r.remaining < min.remaining ? r : min
      );

      if (mostRestrictive.allowed) {
        this.emitEvent({
          type: mostRestrictive.remaining < mostRestrictive.limit * 0.1 ? 'warning' : 'allowed',
          timestamp: new Date(),
          scope: mostRestrictive.scope,
          key: mostRestrictive.key,
          tenantId: context.tenantId,
          userId: context.userId,
          ip: context.ip,
          endpoint: context.endpoint,
          method: context.method,
          limit: mostRestrictive.limit,
          remaining: mostRestrictive.remaining,
          cost,
          rule: rule.id,
        });
      }
    }

    // Default allow if no rules matched
    return {
      allowed: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      scope: 'global',
      key: 'default',
      cost,
    };
  }

  /**
   * Execute rate limit check using appropriate algorithm
   */
  private async executeRateLimitCheck(
    key: string,
    config: RateLimitConfig,
    cost: number,
    scope: RateLimitScope
  ): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);

    if (!this.redis) {
      // In-memory fallback for testing
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: now + config.window,
        scope,
        key,
        cost,
      };
    }

    try {
      let result: [number, number, number];

      switch (config.algorithm) {
        case 'fixed_window':
          result = await this.redis.evalsha(
            this.scriptShas['fixedWindow'],
            1,
            key,
            config.limit.toString(),
            config.window.toString(),
            cost.toString(),
            now.toString()
          ) as [number, number, number];
          break;

        case 'sliding_window':
          result = await this.redis.evalsha(
            this.scriptShas['slidingWindow'],
            1,
            key,
            config.limit.toString(),
            config.window.toString(),
            cost.toString(),
            now.toString()
          ) as [number, number, number];
          break;

        case 'token_bucket':
          const refillRate = config.limit / config.window;
          result = await this.redis.evalsha(
            this.scriptShas['tokenBucket'],
            1,
            key,
            config.limit.toString(),
            refillRate.toString(),
            cost.toString(),
            now.toString(),
            (config.burstLimit || 0).toString()
          ) as [number, number, number];
          break;

        case 'leaky_bucket':
          const leakRate = config.limit / config.window;
          result = await this.redis.evalsha(
            this.scriptShas['leakyBucket'],
            1,
            key,
            config.limit.toString(),
            leakRate.toString(),
            cost.toString(),
            now.toString()
          ) as [number, number, number];
          break;

        default:
          result = [1, config.limit, config.window];
      }

      const [allowed, remaining, resetOrRetry] = result;

      return {
        allowed: allowed === 1,
        limit: config.limit,
        remaining: Math.max(0, config.limit - remaining),
        reset: now + resetOrRetry,
        retryAfter: allowed === 0 ? resetOrRetry : undefined,
        scope,
        key,
        rule: config.id,
        cost,
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open on errors
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit,
        reset: now + config.window,
        scope,
        key,
        cost,
      };
    }
  }

  /**
   * Check tenant-level rate limit
   */
  private async checkTenantLimit(
    context: RateLimitContext,
    cost: number
  ): Promise<RateLimitResult> {
    const tenantId = context.tenantId!;
    const tier = context.tier || 'free';
    const limits = this.getTenantLimits(tenantId) || DEFAULT_TIER_LIMITS[tier];
    const now = Math.floor(Date.now() / 1000);

    // Check requests per second
    const rpsKey = `ratelimit:tenant:${tenantId}:rps:${now}`;
    const rpsResult = await this.executeRateLimitCheck(
      rpsKey,
      {
        id: 'tenant-rps',
        name: 'Tenant RPS',
        scope: 'tenant',
        algorithm: 'fixed_window',
        limit: limits.requestsPerSecond,
        window: 1,
        enabled: true,
        priority: 100,
      },
      cost,
      'tenant'
    );

    if (!rpsResult.allowed) {
      return rpsResult;
    }

    // Check requests per minute
    const rpmKey = `ratelimit:tenant:${tenantId}:rpm:${Math.floor(now / 60)}`;
    const rpmResult = await this.executeRateLimitCheck(
      rpmKey,
      {
        id: 'tenant-rpm',
        name: 'Tenant RPM',
        scope: 'tenant',
        algorithm: 'fixed_window',
        limit: limits.requestsPerMinute,
        window: 60,
        enabled: true,
        priority: 100,
      },
      cost,
      'tenant'
    );

    return rpmResult;
  }

  /**
   * Generate rate limit key based on scope
   */
  private generateKey(
    scope: RateLimitScope,
    context: RateLimitContext,
    ruleId: string
  ): string {
    const base = `ratelimit:${ruleId}`;

    switch (scope) {
      case 'global':
        return `${base}:global`;
      case 'tenant':
        return `${base}:tenant:${context.tenantId || 'unknown'}`;
      case 'user':
        return `${base}:user:${context.tenantId || 'unknown'}:${context.userId || 'anonymous'}`;
      case 'ip':
        return `${base}:ip:${context.ip}`;
      case 'endpoint':
        return `${base}:endpoint:${context.method}:${context.endpoint}`;
      case 'user_endpoint':
        return `${base}:user_endpoint:${context.userId || 'anonymous'}:${context.method}:${context.endpoint}`;
      case 'api_key':
        return `${base}:apikey:${context.apiKey || 'unknown'}`;
      default:
        return `${base}:unknown`;
    }
  }

  /**
   * Find matching rate limit rules for a request
   */
  private findMatchingRules(
    context: RateLimitContext,
    skipRules?: string[]
  ): EndpointRateLimitRule[] {
    return this.endpointRules.filter(rule => {
      if (skipRules?.includes(rule.id)) return false;
      if (!rule.methods.includes(context.method)) return false;

      // Match URL pattern
      const pattern = rule.pattern
        .replace(/\*/g, '.*')
        .replace(/\//g, '\\/');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(context.endpoint);
    });
  }

  /**
   * Get tenant limits
   */
  private getTenantLimits(tenantId: string): TenantRateLimitConfig['limits'] | null {
    const config = this.tenantConfigs.get(tenantId);
    return config?.limits || null;
  }

  /**
   * Set tenant configuration
   */
  setTenantConfig(config: TenantRateLimitConfig): void {
    this.tenantConfigs.set(config.tenantId, config);
  }

  /**
   * Get tenant configuration
   */
  getTenantConfig(tenantId: string): TenantRateLimitConfig | undefined {
    return this.tenantConfigs.get(tenantId);
  }

  /**
   * Set user quota
   */
  setUserQuota(quota: UserRateLimitQuota): void {
    const key = `${quota.tenantId}:${quota.userId}`;
    this.userQuotas.set(key, quota);
  }

  /**
   * Get user quota
   */
  getUserQuota(tenantId: string, userId: string): UserRateLimitQuota | undefined {
    return this.userQuotas.get(`${tenantId}:${userId}`);
  }

  /**
   * Add endpoint rate limit rule
   */
  addEndpointRule(rule: EndpointRateLimitRule): void {
    const existingIndex = this.endpointRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.endpointRules[existingIndex] = rule;
    } else {
      this.endpointRules.push(rule);
    }
  }

  /**
   * Remove endpoint rate limit rule
   */
  removeEndpointRule(ruleId: string): boolean {
    const index = this.endpointRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.endpointRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all endpoint rules
   */
  getEndpointRules(): EndpointRateLimitRule[] {
    return [...this.endpointRules];
  }

  /**
   * Generate rate limit headers
   */
  generateHeaders(result: RateLimitResult): RateLimitHeaders {
    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.reset.toString(),
    };

    if (result.rule) {
      headers['X-RateLimit-Policy'] = result.rule;
    }

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Increment quota usage
   */
  async incrementQuota(
    tenantId: string,
    userId: string | undefined,
    field: keyof QuotaUsage['usage'],
    amount: number = 1
  ): Promise<Result<{ current: number; limit: number }>> {
    if (!this.redis) {
      return Result.ok({ current: amount, limit: -1 });
    }

    const quota = userId ? this.getUserQuota(tenantId, userId) : undefined;
    const tier = quota?.tier || 'free';
    const limits = DEFAULT_TIER_LIMITS[tier];

    let limit = -1;
    switch (field) {
      case 'requests':
        limit = limits.requestsPerDay;
        break;
      case 'apiCalls':
        limit = limits.apiCallsPerMonth;
        break;
      default:
        break;
    }

    const period = field === 'apiCalls' ? 'month' : 'day';
    const periodKey = this.getPeriodKey(period);
    const key = userId
      ? `quota:${tenantId}:${userId}:${periodKey}`
      : `quota:${tenantId}:${periodKey}`;

    const ttl = this.getPeriodTTL(period);

    try {
      const result = await this.redis.evalsha(
        this.scriptShas['quotaIncrement'],
        1,
        key,
        field,
        amount.toString(),
        limit.toString(),
        ttl.toString()
      ) as [number, number];

      const [allowed, current] = result;

      if (!allowed) {
        return Result.fail(new Error(`Quota exceeded for ${field}`));
      }

      return Result.ok({ current, limit });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to increment quota'));
    }
  }

  /**
   * Get quota usage
   */
  async getQuotaUsage(
    tenantId: string,
    userId?: string,
    period: 'minute' | 'hour' | 'day' | 'month' = 'day'
  ): Promise<Result<QuotaUsage>> {
    if (!this.redis) {
      return Result.fail(new Error('Redis not available'));
    }

    const periodKey = this.getPeriodKey(period);
    const key = userId
      ? `quota:${tenantId}:${userId}:${periodKey}`
      : `quota:${tenantId}:${periodKey}`;

    try {
      const data = await this.redis.hgetall(key);
      const quota = userId ? this.getUserQuota(tenantId, userId) : undefined;
      const tier = quota?.tier || 'free';
      const limits = DEFAULT_TIER_LIMITS[tier];

      const usage: QuotaUsage = {
        tenantId,
        userId,
        period,
        periodStart: this.getPeriodStart(period),
        periodEnd: this.getPeriodEnd(period),
        usage: {
          requests: parseInt(data.requests || '0', 10),
          apiCalls: parseInt(data.apiCalls || '0', 10),
          dataExports: parseInt(data.dataExports || '0', 10),
          bulkOperations: parseInt(data.bulkOperations || '0', 10),
          aiCalls: parseInt(data.aiCalls || '0', 10),
          storageUsed: parseInt(data.storageUsed || '0', 10),
        },
        limits: {
          requests: period === 'day' ? limits.requestsPerDay :
                    period === 'hour' ? limits.requestsPerHour :
                    period === 'minute' ? limits.requestsPerMinute : limits.requestsPerDay * 30,
          apiCalls: limits.apiCallsPerMonth,
          dataExports: 100, // Default
          bulkOperations: 50, // Default
          aiCalls: 1000, // Default
          storage: limits.storageBytes,
        },
      };

      return Result.ok(usage);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get quota usage'));
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<Result<void>> {
    if (!this.redis) {
      return Result.fail(new Error('Redis not available'));
    }

    try {
      await this.redis.del(key);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to reset rate limit'));
    }
  }

  /**
   * Get rate limit status for a context
   */
  async getRateLimitStatus(context: RateLimitContext): Promise<Map<string, RateLimitResult>> {
    const results = new Map<string, RateLimitResult>();
    const matchingRules = this.findMatchingRules(context);

    for (const rule of matchingRules) {
      for (const scope of rule.applyTo) {
        const key = this.generateKey(scope, context, rule.id);
        const result = await this.executeRateLimitCheck(
          key,
          rule.config,
          0, // Don't consume tokens
          scope
        );
        results.set(`${rule.id}:${scope}`, result);
      }
    }

    return results;
  }

  /**
   * Subscribe to rate limit events
   */
  onEvent(listener: RateLimitEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit rate limit event
   */
  private emitEvent(event: RateLimitEvent): void {
    this.metricsBuffer.push(event);

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Rate limit event listener error:', error);
      }
    }
  }

  /**
   * Get rate limit metrics
   */
  async getMetrics(since?: Date): Promise<RateLimitMetrics> {
    const sinceTime = since?.getTime() || Date.now() - 24 * 60 * 60 * 1000;
    const events = this.metricsBuffer.filter(e => e.timestamp.getTime() >= sinceTime);

    const metrics: RateLimitMetrics = {
      totalRequests: events.length,
      allowedRequests: events.filter(e => e.type === 'allowed').length,
      blockedRequests: events.filter(e => e.type === 'blocked').length,
      byScope: {} as RateLimitMetrics['byScope'],
      byTier: {} as RateLimitMetrics['byTier'],
      byEndpoint: {},
      topBlockedUsers: [],
      topBlockedIps: [],
      peakHour: 0,
      avgRequestsPerMinute: 0,
    };

    // Calculate by scope
    const scopes: RateLimitScope[] = ['global', 'tenant', 'user', 'ip', 'endpoint', 'user_endpoint', 'api_key'];
    for (const scope of scopes) {
      const scopeEvents = events.filter(e => e.scope === scope);
      metrics.byScope[scope] = {
        allowed: scopeEvents.filter(e => e.type === 'allowed').length,
        blocked: scopeEvents.filter(e => e.type === 'blocked').length,
      };
    }

    // Calculate by endpoint
    const endpointMap = new Map<string, { allowed: number; blocked: number; times: number[] }>();
    for (const event of events) {
      const endpoint = event.endpoint || 'unknown';
      const entry = endpointMap.get(endpoint) || { allowed: 0, blocked: 0, times: [] };
      if (event.type === 'allowed') {
        entry.allowed++;
      } else if (event.type === 'blocked') {
        entry.blocked++;
      }
      endpointMap.set(endpoint, entry);
    }

    for (const [endpoint, data] of endpointMap) {
      metrics.byEndpoint[endpoint] = {
        allowed: data.allowed,
        blocked: data.blocked,
        avgResponseTime: 0, // Not tracked in rate limiting
      };
    }

    // Calculate top blocked users
    const blockedUsers = new Map<string, number>();
    for (const event of events.filter(e => e.type === 'blocked' && e.userId)) {
      const count = blockedUsers.get(event.userId!) || 0;
      blockedUsers.set(event.userId!, count + 1);
    }
    metrics.topBlockedUsers = Array.from(blockedUsers.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top blocked IPs
    const blockedIps = new Map<string, number>();
    for (const event of events.filter(e => e.type === 'blocked' && e.ip)) {
      const count = blockedIps.get(event.ip!) || 0;
      blockedIps.set(event.ip!, count + 1);
    }
    metrics.topBlockedIps = Array.from(blockedIps.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate peak hour
    const hourCounts = new Map<number, number>();
    for (const event of events) {
      const hour = event.timestamp.getHours();
      const count = hourCounts.get(hour) || 0;
      hourCounts.set(hour, count + 1);
    }
    let maxCount = 0;
    for (const [hour, count] of hourCounts) {
      if (count > maxCount) {
        maxCount = count;
        metrics.peakHour = hour;
      }
    }

    // Calculate average requests per minute
    const duration = Date.now() - sinceTime;
    const minutes = duration / 60000;
    metrics.avgRequestsPerMinute = minutes > 0 ? events.length / minutes : 0;

    return metrics;
  }

  /**
   * Get period key for quota tracking
   */
  private getPeriodKey(period: 'minute' | 'hour' | 'day' | 'month'): string {
    const now = new Date();
    switch (period) {
      case 'minute':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      case 'hour':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'day':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'month':
        return `${now.getFullYear()}-${now.getMonth()}`;
    }
  }

  /**
   * Get TTL for period
   */
  private getPeriodTTL(period: 'minute' | 'hour' | 'day' | 'month'): number {
    switch (period) {
      case 'minute':
        return 120; // 2 minutes
      case 'hour':
        return 7200; // 2 hours
      case 'day':
        return 172800; // 2 days
      case 'month':
        return 5270400; // 61 days
    }
  }

  /**
   * Get period start date
   */
  private getPeriodStart(period: 'minute' | 'hour' | 'day' | 'month'): Date {
    const now = new Date();
    switch (period) {
      case 'minute':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      case 'hour':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  /**
   * Get period end date
   */
  private getPeriodEnd(period: 'minute' | 'hour' | 'day' | 'month'): Date {
    const start = this.getPeriodStart(period);
    switch (period) {
      case 'minute':
        return new Date(start.getTime() + 60000);
      case 'hour':
        return new Date(start.getTime() + 3600000);
      case 'day':
        return new Date(start.getTime() + 86400000);
      case 'month':
        return new Date(start.getFullYear(), start.getMonth() + 1, 1);
    }
  }

  /**
   * Start metrics flush interval
   */
  private startMetricsFlush(): void {
    // Keep only last 24 hours of metrics
    this.metricsFlushInterval = setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      this.metricsBuffer = this.metricsBuffer.filter(
        e => e.timestamp.getTime() > cutoff
      );
    }, 60000); // Run every minute
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    if (this.metricsFlushInterval) {
      clearInterval(this.metricsFlushInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * Create rate limiting service instance
 */
export function createRateLimitingService(redis?: Redis): RateLimitingService {
  return new RateLimitingService(redis);
}
