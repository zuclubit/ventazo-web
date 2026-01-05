/**
 * Redis Cache Service
 * Comprehensive caching layer with invalidation strategies
 */
import { injectable, inject } from 'tsyringe';
import Redis from 'ioredis';
import { createHash } from 'crypto';
import { Result } from '@zuclubit/domain';
import {
  CacheConfig,
  CacheSetOptions,
  CacheGetResult,
  CacheStats,
  CacheMetadata,
  CacheInvalidationEvent,
  CacheHealthStatus,
  CachedEntity,
  MultiGetResult,
  DistributedLockOptions,
  LockResult,
  CacheEvent,
  CacheEventType,
  CacheListener,
  CacheTTL,
} from './types';

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: 'crm:',
  tls: process.env.REDIS_TLS === 'true',
  maxRetriesPerRequest: 3,
  retryDelayMs: 100,
  connectTimeout: 10000,
  commandTimeout: 5000,
  enableOfflineQueue: true,
  lazyConnect: false,
};

@injectable()
export class CacheService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private config: CacheConfig;
  private listeners: Map<CacheEventType, CacheListener[]> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };
  private isConnected = false;
  private lastError: string | null = null;
  private lastErrorTime: Date | null = null;

  constructor(
    @inject('CacheConfig') config?: Partial<CacheConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<Result<void>> {
    try {
      if (this.isConnected && this.client) {
        return Result.ok(undefined);
      }

      this.client = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        tls: this.config.tls ? {} : undefined,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        retryStrategy: (times) => {
          if (times > 10) {
            return null; // Stop retrying
          }
          return Math.min(times * this.config.retryDelayMs!, 2000);
        },
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        enableOfflineQueue: this.config.enableOfflineQueue,
        lazyConnect: this.config.lazyConnect,
      });

      // Set up event handlers
      this.client.on('connect', () => {
        this.isConnected = true;
        this.emit('connect', {});
        console.log('✓ Redis cache connected');
      });

      this.client.on('error', (err) => {
        this.lastError = err.message;
        this.lastErrorTime = new Date();
        this.stats.errors++;
        this.emit('error', { error: err.message });
        console.error('Redis cache error:', err.message);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.emit('disconnect', {});
        console.log('Redis cache disconnected');
      });

      // Create subscriber for cache invalidation
      this.subscriber = this.client.duplicate();
      await this.setupSubscriber();

      // Test connection
      await this.client.ping();
      this.isConnected = true;

      return Result.ok(undefined);
    } catch (error) {
      this.lastError = String(error);
      this.lastErrorTime = new Date();
      return Result.fail(`Failed to connect to Redis: ${error}`);
    }
  }

  /**
   * Set up pub/sub subscriber for cache invalidation
   */
  private async setupSubscriber(): Promise<void> {
    if (!this.subscriber) return;

    await this.subscriber.subscribe('cache:invalidate');

    this.subscriber.on('message', async (channel, message) => {
      if (channel === 'cache:invalidate') {
        try {
          const event: CacheInvalidationEvent = JSON.parse(message);
          await this.handleInvalidationEvent(event);
        } catch (error) {
          console.error('Failed to handle invalidation event:', error);
        }
      }
    });
  }

  /**
   * Handle cache invalidation event
   */
  private async handleInvalidationEvent(event: CacheInvalidationEvent): Promise<void> {
    switch (event.type) {
      case 'single':
        if (event.keys) {
          await Promise.all(event.keys.map((key) => this.delete(key)));
        }
        break;
      case 'pattern':
        if (event.pattern) {
          await this.deletePattern(event.pattern);
        }
        break;
      case 'tag':
        if (event.tags) {
          await Promise.all(event.tags.map((tag) => this.invalidateTag(tag)));
        }
        break;
      case 'all':
        if (event.tenantId) {
          await this.deletePattern(`tenant:${event.tenantId}:*`);
        }
        break;
    }

    this.emit('invalidate', { event });
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.isConnected = false;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<CacheGetResult<T>> {
    const startTime = Date.now();

    if (!this.client || !this.isConnected) {
      this.stats.misses++;
      return { value: null, hit: false };
    }

    try {
      const data = await this.client.get(key);

      if (data === null) {
        this.stats.misses++;
        this.emit('miss', { key, duration: Date.now() - startTime });
        return { value: null, hit: false };
      }

      const parsed = JSON.parse(data) as CachedEntity<T>;
      this.stats.hits++;

      // Update last accessed time for sliding expiration
      if (parsed.metadata?.createdAt) {
        const metadata = await this.client.hgetall(`${key}:meta`);
        if (metadata.sliding === 'true') {
          await this.client.expire(key, parseInt(metadata.ttl || '3600', 10));
        }
      }

      this.emit('hit', { key, duration: Date.now() - startTime });

      return {
        value: parsed.data,
        hit: true,
        metadata: parsed.metadata,
      };
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { key, error: String(error) });
      return { value: null, hit: false };
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheSetOptions = {}
  ): Promise<Result<void>> {
    const startTime = Date.now();

    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      const ttl = options.ttl || CacheTTL.lead;
      const metadata: CacheMetadata = {
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + ttl * 1000),
        hits: 0,
        lastAccessed: new Date(),
        size: 0,
        compressed: options.compress || false,
        tags: options.tags || [],
      };

      let dataToStore = JSON.stringify(value);

      // Compress if needed (for values > 1KB)
      if (options.compress && dataToStore.length > 1024) {
        // In production, use zlib compression
        metadata.compressed = true;
      }

      const entity: CachedEntity<T> = {
        data: value,
        metadata,
        version: 1,
        etag: this.generateETag(value),
      };

      metadata.size = JSON.stringify(entity).length;

      // Store main data
      await this.client.setex(key, ttl, JSON.stringify(entity));

      // Store metadata separately for quick access
      await this.client.hset(`${key}:meta`, {
        ttl: ttl.toString(),
        sliding: (options.sliding || false).toString(),
        createdAt: metadata.createdAt.toISOString(),
      });
      await this.client.expire(`${key}:meta`, ttl);

      // Add to tag sets for invalidation
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          await this.client.sadd(`tag:${tag}`, key);
          await this.client.expire(`tag:${tag}`, ttl * 2); // Tags live longer
        }
      }

      this.stats.sets++;
      this.emit('set', { key, duration: Date.now() - startTime });

      return Result.ok(undefined);
    } catch (error) {
      this.stats.errors++;
      this.emit('error', { key, error: String(error) });
      return Result.fail(`Failed to set cache: ${error}`);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<Result<void>> {
    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      await this.client.del(key, `${key}:meta`);
      this.stats.deletes++;
      this.emit('delete', { key });
      return Result.ok(undefined);
    } catch (error) {
      this.stats.errors++;
      return Result.fail(`Failed to delete cache: ${error}`);
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<Result<number>> {
    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      let cursor = '0';
      let deletedCount = 0;
      const fullPattern = `${this.config.keyPrefix}${pattern}`;

      do {
        const [newCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // Remove prefix for deletion
          const keysWithoutPrefix = keys.map((k) =>
            k.replace(this.config.keyPrefix!, '')
          );
          await this.client.del(...keysWithoutPrefix);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      this.emit('invalidate', { pattern, count: deletedCount });
      return Result.ok(deletedCount);
    } catch (error) {
      this.stats.errors++;
      return Result.fail(`Failed to delete pattern: ${error}`);
    }
  }

  /**
   * Invalidate cache by tag
   */
  async invalidateTag(tag: string): Promise<Result<number>> {
    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      const keys = await this.client.smembers(`tag:${tag}`);

      if (keys.length > 0) {
        await this.client.del(...keys);
        await this.client.del(`tag:${tag}`);
      }

      this.emit('invalidate', { tag, count: keys.length });
      return Result.ok(keys.length);
    } catch (error) {
      this.stats.errors++;
      return Result.fail(`Failed to invalidate tag: ${error}`);
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<MultiGetResult<T>> {
    const result: MultiGetResult<T> = {
      found: new Map(),
      missing: [],
    };

    if (!this.client || !this.isConnected || keys.length === 0) {
      result.missing = keys;
      return result;
    }

    try {
      const values = await this.client.mget(keys);

      keys.forEach((key, index) => {
        const data = values[index];
        if (data !== null) {
          try {
            const parsed = JSON.parse(data) as CachedEntity<T>;
            result.found.set(key, parsed.data);
            this.stats.hits++;
          } catch {
            result.missing.push(key);
            this.stats.misses++;
          }
        } else {
          result.missing.push(key);
          this.stats.misses++;
        }
      });

      return result;
    } catch (error) {
      this.stats.errors++;
      result.missing = keys;
      return result;
    }
  }

  /**
   * Set multiple keys at once
   */
  async mset<T>(
    entries: Map<string, T>,
    options: CacheSetOptions = {}
  ): Promise<Result<void>> {
    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      const pipeline = this.client.pipeline();
      const ttl = options.ttl || CacheTTL.lead;

      for (const [key, value] of entries) {
        const entity: CachedEntity<T> = {
          data: value,
          metadata: {
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + ttl * 1000),
            hits: 0,
            lastAccessed: new Date(),
            size: 0,
            compressed: false,
            tags: options.tags || [],
          },
          version: 1,
          etag: this.generateETag(value),
        };

        pipeline.setex(key, ttl, JSON.stringify(entity));
        this.stats.sets++;
      }

      await pipeline.exec();
      return Result.ok(undefined);
    } catch (error) {
      this.stats.errors++;
      return Result.fail(`Failed to mset cache: ${error}`);
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheSetOptions = {}
  ): Promise<Result<T>> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached.hit && cached.value !== null) {
      return Result.ok(cached.value);
    }

    // Execute factory function
    try {
      const value = await factory();

      // Store in cache (don't wait)
      this.set(key, value, options).catch((err) => {
        console.error('Failed to cache value:', err);
      });

      return Result.ok(value);
    } catch (error) {
      return Result.fail(`Failed to get or set: ${error}`);
    }
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    options: DistributedLockOptions
  ): Promise<LockResult> {
    if (!this.client || !this.isConnected) {
      return { acquired: false, error: 'Cache not connected' };
    }

    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const key = `lock:${resource}`;
    const retryCount = options.retryCount || 3;
    const retryDelay = options.retryDelay || 100;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        // Try to set lock with NX (only if not exists) and PX (expire in milliseconds)
        const result = await this.client.set(
          key,
          lockId,
          'PX',
          options.ttl,
          'NX'
        );

        if (result === 'OK') {
          options.onLockAcquired?.();
          return {
            acquired: true,
            lockId,
            expiresAt: new Date(Date.now() + options.ttl),
          };
        }

        // Wait before retry
        if (attempt < retryCount - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        this.stats.errors++;
      }
    }

    options.onLockFailed?.('Failed to acquire lock after retries');
    return { acquired: false, error: 'Failed to acquire lock' };
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    const key = `lock:${resource}`;

    try {
      // Use Lua script to ensure we only release our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, key, lockId);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Extend lock TTL
   */
  async extendLock(
    resource: string,
    lockId: string,
    ttl: number
  ): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    const key = `lock:${resource}`;

    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("pexpire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.client.eval(script, 1, key, lockId, ttl);
      return result === 1;
    } catch (error) {
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Publish cache invalidation event
   */
  async publishInvalidation(event: CacheInvalidationEvent): Promise<void> {
    if (!this.client || !this.isConnected) return;

    try {
      await this.client.publish('cache:invalidate', JSON.stringify(event));
    } catch (error) {
      console.error('Failed to publish invalidation:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const defaultStats: CacheStats = {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      keys: 0,
      memory: 0,
      evictions: 0,
      expired: 0,
      avgTtl: 0,
      uptime: 0,
      connectedClients: 0,
    };

    if (!this.client || !this.isConnected) {
      return defaultStats;
    }

    try {
      const info = await this.client.info();
      const dbSize = await this.client.dbsize();

      // Parse Redis INFO response
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const evictedMatch = info.match(/evicted_keys:(\d+)/);
      const expiredMatch = info.match(/expired_keys:(\d+)/);
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const clientsMatch = info.match(/connected_clients:(\d+)/);

      return {
        ...defaultStats,
        keys: dbSize,
        memory: memoryMatch ? parseInt(memoryMatch[1], 10) : 0,
        evictions: evictedMatch ? parseInt(evictedMatch[1], 10) : 0,
        expired: expiredMatch ? parseInt(expiredMatch[1], 10) : 0,
        uptime: uptimeMatch ? parseInt(uptimeMatch[1], 10) : 0,
        connectedClients: clientsMatch ? parseInt(clientsMatch[1], 10) : 0,
      };
    } catch (error) {
      return defaultStats;
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<CacheHealthStatus> {
    const stats = await this.getStats();
    const startTime = Date.now();
    let latency = 0;

    try {
      if (this.client && this.isConnected) {
        await this.client.ping();
        latency = Date.now() - startTime;
      }
    } catch {
      latency = -1;
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!this.isConnected) {
      status = 'unhealthy';
    } else if (latency > 100 || stats.hitRate < 0.5) {
      status = 'degraded';
    }

    return {
      status,
      latency,
      connected: this.isConnected,
      lastError: this.lastError || undefined,
      lastErrorTime: this.lastErrorTime || undefined,
      stats,
    };
  }

  /**
   * Clear all cache for a tenant
   */
  async clearTenant(tenantId: string): Promise<Result<number>> {
    return this.deletePattern(`tenant:${tenantId}:*`);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<Result<void>> {
    if (!this.client || !this.isConnected) {
      return Result.fail('Cache not connected');
    }

    try {
      await this.client.flushdb();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to clear cache: ${error}`);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTTL(key: string): Promise<number> {
    if (!this.client || !this.isConnected) {
      return -2;
    }

    try {
      return await this.client.ttl(key);
    } catch {
      return -2;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount = 1): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      return await this.client.incrby(key, amount);
    } catch {
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string, amount = 1): Promise<number> {
    if (!this.client || !this.isConnected) {
      return 0;
    }

    try {
      return await this.client.decrby(key, amount);
    } catch {
      return 0;
    }
  }

  /**
   * Generate ETag for a value
   */
  private generateETag(value: unknown): string {
    const hash = createHash('md5')
      .update(JSON.stringify(value))
      .digest('hex');
    return `"${hash}"`;
  }

  /**
   * Generate hash for cache key
   */
  static generateKeyHash(data: unknown): string {
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Add event listener
   */
  on(event: CacheEventType, listener: CacheListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: CacheEventType, listener: CacheListener): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: CacheEventType, metadata: Record<string, unknown>): void {
    const event: CacheEvent = {
      type,
      timestamp: new Date(),
      ...metadata,
    } as CacheEvent;

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Cache event listener error:', error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}
