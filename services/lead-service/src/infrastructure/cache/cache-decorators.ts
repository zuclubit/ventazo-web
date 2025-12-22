/**
 * Cache Decorators
 * TypeScript decorators for automatic caching of methods
 */
import { container } from 'tsyringe';
import { CacheService } from './cache.service';
import { CacheSetOptions, CacheTTL } from './types';

/**
 * Cache decorator options
 */
export interface CacheableOptions {
  key?: string | ((...args: unknown[]) => string);
  ttl?: number;
  tags?: string[] | ((...args: unknown[]) => string[]);
  condition?: (...args: unknown[]) => boolean;
  unless?: (result: unknown) => boolean;
  keyGenerator?: (...args: unknown[]) => string;
}

/**
 * Cache eviction options
 */
export interface CacheEvictOptions {
  key?: string | ((...args: unknown[]) => string);
  keys?: string[] | ((...args: unknown[]) => string[]);
  allEntries?: boolean;
  beforeInvocation?: boolean;
  condition?: (...args: unknown[]) => boolean;
  tags?: string[] | ((...args: unknown[]) => string[]);
}

/**
 * Default key generator
 */
function defaultKeyGenerator(
  target: object,
  propertyKey: string,
  args: unknown[]
): string {
  const className = target.constructor.name;
  const argsHash = CacheService.generateKeyHash(args);
  return `${className}:${propertyKey}:${argsHash}`;
}

/**
 * Cacheable decorator
 * Caches the result of a method
 *
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300, tags: ['leads'] })
 * async getLeadById(tenantId: string, leadId: string): Promise<Lead> {
 *   return this.repository.findById(tenantId, leadId);
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Get cache service
      let cacheService: CacheService;
      try {
        cacheService = container.resolve(CacheService);
      } catch {
        // Cache not available, execute method directly
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let key: string;
      if (typeof options.key === 'function') {
        key = options.key(...args);
      } else if (typeof options.key === 'string') {
        key = options.key;
      } else if (options.keyGenerator) {
        key = options.keyGenerator(...args);
      } else {
        key = defaultKeyGenerator(target, propertyKey, args);
      }

      // Try to get from cache
      const cached = await cacheService.get(key);
      if (cached.hit && cached.value !== null) {
        return cached.value;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check unless condition
      if (options.unless && options.unless(result)) {
        return result;
      }

      // Generate tags
      let tags: string[] | undefined;
      if (typeof options.tags === 'function') {
        tags = options.tags(...args);
      } else {
        tags = options.tags;
      }

      // Cache the result
      const cacheOptions: CacheSetOptions = {
        ttl: options.ttl || CacheTTL.lead,
        tags,
      };

      await cacheService.set(key, result, cacheOptions);

      return result;
    };

    return descriptor;
  };
}

/**
 * CacheEvict decorator
 * Evicts cache entries when method is called
 *
 * @example
 * ```typescript
 * @CacheEvict({ tags: ['leads'] })
 * async updateLead(tenantId: string, leadId: string, data: UpdateLeadData): Promise<Lead> {
 *   return this.repository.update(tenantId, leadId, data);
 * }
 * ```
 */
export function CacheEvict(options: CacheEvictOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Get cache service
      let cacheService: CacheService;
      try {
        cacheService = container.resolve(CacheService);
      } catch {
        // Cache not available, execute method directly
        return originalMethod.apply(this, args);
      }

      // Evict before invocation if specified
      if (options.beforeInvocation) {
        await evictCache(cacheService, options, target, propertyKey, args);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Evict after invocation (default behavior)
      if (!options.beforeInvocation) {
        await evictCache(cacheService, options, target, propertyKey, args);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Helper function to evict cache
 */
async function evictCache(
  cacheService: CacheService,
  options: CacheEvictOptions,
  target: object,
  propertyKey: string,
  args: unknown[]
): Promise<void> {
  // Evict by tags
  if (options.tags) {
    const tags =
      typeof options.tags === 'function' ? options.tags(...args) : options.tags;

    for (const tag of tags) {
      await cacheService.invalidateTag(tag);
    }
  }

  // Evict by single key
  if (options.key) {
    const key =
      typeof options.key === 'function'
        ? options.key(...args)
        : options.key;
    await cacheService.delete(key);
  }

  // Evict by multiple keys
  if (options.keys) {
    const keys =
      typeof options.keys === 'function'
        ? options.keys(...args)
        : options.keys;

    for (const key of keys) {
      await cacheService.delete(key);
    }
  }
}

/**
 * CachePut decorator
 * Always executes the method and updates the cache
 *
 * @example
 * ```typescript
 * @CachePut({ key: (tenantId, leadId) => `lead:${tenantId}:${leadId}` })
 * async createLead(tenantId: string, data: CreateLeadData): Promise<Lead> {
 *   return this.repository.create(tenantId, data);
 * }
 * ```
 */
export function CachePut(options: CacheableOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Check unless condition
      if (options.unless && options.unless(result)) {
        return result;
      }

      // Get cache service
      let cacheService: CacheService;
      try {
        cacheService = container.resolve(CacheService);
      } catch {
        // Cache not available
        return result;
      }

      // Generate cache key
      let key: string;
      if (typeof options.key === 'function') {
        key = options.key(...args);
      } else if (typeof options.key === 'string') {
        key = options.key;
      } else if (options.keyGenerator) {
        key = options.keyGenerator(...args);
      } else {
        key = defaultKeyGenerator(target, propertyKey, args);
      }

      // Generate tags
      let tags: string[] | undefined;
      if (typeof options.tags === 'function') {
        tags = options.tags(...args);
      } else {
        tags = options.tags;
      }

      // Update cache
      const cacheOptions: CacheSetOptions = {
        ttl: options.ttl || CacheTTL.lead,
        tags,
      };

      await cacheService.set(key, result, cacheOptions);

      return result;
    };

    return descriptor;
  };
}

/**
 * Caching decorator - combines Cacheable and CacheEvict
 * For methods that both read and modify data
 *
 * @example
 * ```typescript
 * @Caching({
 *   cacheable: { key: 'stats:leads', ttl: 600 },
 *   evict: { tags: ['leads-stats'] }
 * })
 * async getAndRefreshStats(tenantId: string): Promise<LeadStats> {
 *   // This will cache the result and evict related caches
 * }
 * ```
 */
export function Caching(options: {
  cacheable?: CacheableOptions;
  evict?: CacheEvictOptions;
}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let cacheService: CacheService;
      try {
        cacheService = container.resolve(CacheService);
      } catch {
        return originalMethod.apply(this, args);
      }

      // Handle eviction before if needed
      if (options.evict?.beforeInvocation) {
        await evictCache(cacheService, options.evict, target, propertyKey, args);
      }

      // Try to get from cache if cacheable
      if (options.cacheable) {
        const cacheableOpts = options.cacheable;

        // Check condition
        if (!cacheableOpts.condition || cacheableOpts.condition(...args)) {
          let key: string;
          if (typeof cacheableOpts.key === 'function') {
            key = cacheableOpts.key(...args);
          } else if (typeof cacheableOpts.key === 'string') {
            key = cacheableOpts.key;
          } else {
            key = defaultKeyGenerator(target, propertyKey, args);
          }

          const cached = await cacheService.get(key);
          if (cached.hit && cached.value !== null) {
            return cached.value;
          }
        }
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result if cacheable
      if (options.cacheable) {
        const cacheableOpts = options.cacheable;

        if (!cacheableOpts.unless || !cacheableOpts.unless(result)) {
          let key: string;
          if (typeof cacheableOpts.key === 'function') {
            key = cacheableOpts.key(...args);
          } else if (typeof cacheableOpts.key === 'string') {
            key = cacheableOpts.key;
          } else {
            key = defaultKeyGenerator(target, propertyKey, args);
          }

          let tags: string[] | undefined;
          if (typeof cacheableOpts.tags === 'function') {
            tags = cacheableOpts.tags(...args);
          } else {
            tags = cacheableOpts.tags;
          }

          await cacheService.set(key, result, {
            ttl: cacheableOpts.ttl,
            tags,
          });
        }
      }

      // Handle eviction after
      if (options.evict && !options.evict.beforeInvocation) {
        await evictCache(cacheService, options.evict, target, propertyKey, args);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Lock decorator - acquire distributed lock before execution
 *
 * @example
 * ```typescript
 * @Lock({ resource: 'lead-import', ttl: 60000 })
 * async importLeads(tenantId: string, data: ImportData): Promise<ImportResult> {
 *   // Only one instance can run this at a time
 * }
 * ```
 */
export function Lock(options: {
  resource: string | ((...args: unknown[]) => string);
  ttl: number;
  retryCount?: number;
  retryDelay?: number;
  onLockFailed?: () => void;
}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      let cacheService: CacheService;
      try {
        cacheService = container.resolve(CacheService);
      } catch {
        return originalMethod.apply(this, args);
      }

      // Generate resource name
      const resource =
        typeof options.resource === 'function'
          ? options.resource(...args)
          : options.resource;

      // Try to acquire lock
      const lockResult = await cacheService.acquireLock(resource, {
        ttl: options.ttl,
        retryCount: options.retryCount,
        retryDelay: options.retryDelay,
      });

      if (!lockResult.acquired) {
        options.onLockFailed?.();
        throw new Error(`Failed to acquire lock for resource: ${resource}`);
      }

      try {
        // Execute original method
        return await originalMethod.apply(this, args);
      } finally {
        // Release lock
        if (lockResult.lockId) {
          await cacheService.releaseLock(resource, lockResult.lockId);
        }
      }
    };

    return descriptor;
  };
}
