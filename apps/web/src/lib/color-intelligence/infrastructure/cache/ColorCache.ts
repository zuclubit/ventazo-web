// ============================================
// Color Cache
// High-Performance LRU Cache with TTL for Color Operations
// ============================================

import OKLCH from '../../domain/value-objects/OKLCH';
import HCT from '../../domain/value-objects/HCT';
import APCAContrast from '../../domain/value-objects/APCAContrast';
import { ContrastModeResult } from '../../application/DetectContrastMode';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  value: T;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
}

/**
 * Cache configuration
 */
export interface ColorCacheConfig {
  maxSize: number;
  ttlMs: number;
  enableStats: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

const DEFAULT_CONFIG: ColorCacheConfig = {
  maxSize: 500,
  ttlMs: 5 * 60 * 1000, // 5 minutes
  enableStats: true,
};

/**
 * ColorCache
 *
 * A high-performance LRU cache optimized for color operations:
 * - OKLCH parsing and conversion
 * - HCT calculations
 * - APCA contrast calculations
 * - Contrast mode detection
 *
 * Features:
 * - LRU eviction policy
 * - TTL-based expiration
 * - Cache statistics
 * - Type-safe generics
 */
export class ColorCache {
  private config: ColorCacheConfig;

  // Separate caches for different value types
  private oklchCache: Map<string, CacheEntry<OKLCH>> = new Map();
  private hctCache: Map<string, CacheEntry<HCT>> = new Map();
  private apcaCache: Map<string, CacheEntry<APCAContrast>> = new Map();
  private contrastModeCache: Map<string, CacheEntry<ContrastModeResult>> = new Map();
  private genericCache: Map<string, CacheEntry<unknown>> = new Map();

  // Statistics
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(config: Partial<ColorCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================
  // OKLCH Cache
  // ============================================

  /**
   * Get or compute OKLCH from hex
   */
  getOklch(hex: string): OKLCH | null {
    const key = this.normalizeHex(hex);
    const cached = this.getFromCache(this.oklchCache, key);

    if (cached !== undefined) {
      return cached;
    }

    const value = OKLCH.fromHex(key);
    if (value) {
      this.setInCache(this.oklchCache, key, value);
    }
    return value;
  }

  /**
   * Cache an OKLCH value
   */
  setOklch(hex: string, value: OKLCH): void {
    const key = this.normalizeHex(hex);
    this.setInCache(this.oklchCache, key, value);
  }

  // ============================================
  // HCT Cache
  // ============================================

  /**
   * Get or compute HCT from hex
   */
  getHct(hex: string): HCT | null {
    const key = this.normalizeHex(hex);
    const cached = this.getFromCache(this.hctCache, key);

    if (cached !== undefined) {
      return cached;
    }

    const value = HCT.fromHex(key);
    if (value) {
      this.setInCache(this.hctCache, key, value);
    }
    return value;
  }

  /**
   * Cache an HCT value
   */
  setHct(hex: string, value: HCT): void {
    const key = this.normalizeHex(hex);
    this.setInCache(this.hctCache, key, value);
  }

  // ============================================
  // APCA Cache
  // ============================================

  /**
   * Get or compute APCA contrast
   */
  getApca(foreground: string, background: string): APCAContrast {
    const key = `${this.normalizeHex(foreground)}:${this.normalizeHex(background)}`;
    const cached = this.getFromCache(this.apcaCache, key);

    if (cached !== undefined) {
      return cached;
    }

    const value = APCAContrast.calculate(foreground, background);
    this.setInCache(this.apcaCache, key, value);
    return value;
  }

  /**
   * Cache an APCA value
   */
  setApca(foreground: string, background: string, value: APCAContrast): void {
    const key = `${this.normalizeHex(foreground)}:${this.normalizeHex(background)}`;
    this.setInCache(this.apcaCache, key, value);
  }

  // ============================================
  // Contrast Mode Cache
  // ============================================

  /**
   * Get cached contrast mode result
   */
  getContrastMode(hex: string): ContrastModeResult | undefined {
    const key = this.normalizeHex(hex);
    return this.getFromCache(this.contrastModeCache, key);
  }

  /**
   * Cache a contrast mode result
   */
  setContrastMode(hex: string, value: ContrastModeResult): void {
    const key = this.normalizeHex(hex);
    this.setInCache(this.contrastModeCache, key, value);
  }

  // ============================================
  // Generic Cache
  // ============================================

  /**
   * Get from generic cache
   */
  get<T>(key: string): T | undefined {
    return this.getFromCache(this.genericCache, key) as T | undefined;
  }

  /**
   * Set in generic cache
   */
  set<T>(key: string, value: T): void {
    this.setInCache(this.genericCache, key, value);
  }

  /**
   * Get or compute with factory function
   */
  getOrCompute<T>(key: string, factory: () => T): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value);
    return value;
  }

  /**
   * Async get or compute
   */
  async getOrComputeAsync<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value);
    return value;
  }

  // ============================================
  // Cache Operations
  // ============================================

  /**
   * Clear all caches
   */
  clear(): void {
    this.oklchCache.clear();
    this.hctCache.clear();
    this.apcaCache.clear();
    this.contrastModeCache.clear();
    this.genericCache.clear();
    this.updateSize();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): number {
    const now = Date.now();
    let cleared = 0;

    const clearFromCache = <T>(cache: Map<string, CacheEntry<T>>) => {
      for (const [key, entry] of Array.from(cache.entries())) {
        if (now - entry.createdAt > this.config.ttlMs) {
          cache.delete(key);
          cleared++;
        }
      }
    };

    clearFromCache(this.oklchCache);
    clearFromCache(this.hctCache);
    clearFromCache(this.apcaCache);
    clearFromCache(this.contrastModeCache);
    clearFromCache(this.genericCache);

    this.updateSize();
    return cleared;
  }

  /**
   * Preload common colors
   */
  preloadCommonColors(colors: string[]): void {
    for (const color of colors) {
      this.getOklch(color);
      this.getHct(color);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    if (this.config.enableStats) {
      const total = this.stats.hits + this.stats.misses;
      this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: this.stats.size,
      hitRate: 0,
    };
  }

  // ============================================
  // Internal Methods
  // ============================================

  private getFromCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);

    if (!entry) {
      if (this.config.enableStats) this.stats.misses++;
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.config.ttlMs) {
      cache.delete(key);
      if (this.config.enableStats) this.stats.misses++;
      return undefined;
    }

    // Update access metadata
    entry.accessedAt = Date.now();
    entry.accessCount++;

    if (this.config.enableStats) this.stats.hits++;
    return entry.value;
  }

  private setInCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T): void {
    // Evict if at capacity
    if (this.getTotalSize() >= this.config.maxSize) {
      this.evictLRU();
    }

    const now = Date.now();
    cache.set(key, {
      value,
      createdAt: now,
      accessedAt: now,
      accessCount: 1,
    });

    this.updateSize();
  }

  private evictLRU(): void {
    // Find LRU entry across all caches
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let targetCache: Map<string, CacheEntry<unknown>> | null = null;

    const findOldest = (cache: Map<string, CacheEntry<unknown>>) => {
      for (const [key, entry] of Array.from(cache.entries())) {
        if (entry.accessedAt < oldestTime) {
          oldestTime = entry.accessedAt;
          oldestKey = key;
          targetCache = cache;
        }
      }
    };

    findOldest(this.oklchCache as Map<string, CacheEntry<unknown>>);
    findOldest(this.hctCache as Map<string, CacheEntry<unknown>>);
    findOldest(this.apcaCache as Map<string, CacheEntry<unknown>>);
    findOldest(this.contrastModeCache as Map<string, CacheEntry<unknown>>);
    findOldest(this.genericCache);

    if (oldestKey !== null && targetCache !== null) {
      (targetCache as Map<string, CacheEntry<unknown>>).delete(oldestKey);
      if (this.config.enableStats) this.stats.evictions++;
    }
  }

  private getTotalSize(): number {
    return (
      this.oklchCache.size +
      this.hctCache.size +
      this.apcaCache.size +
      this.contrastModeCache.size +
      this.genericCache.size
    );
  }

  private updateSize(): void {
    this.stats.size = this.getTotalSize();
  }

  private normalizeHex(hex: string): string {
    // Normalize to uppercase without #
    let normalized = hex.trim().toUpperCase();
    if (normalized.startsWith('#')) {
      normalized = normalized.slice(1);
    }
    // Expand shorthand (e.g., "F00" -> "FF0000")
    if (normalized.length === 3) {
      normalized = normalized
        .split('')
        .map(c => c + c)
        .join('');
    }
    return `#${normalized}`;
  }
}

// ============================================
// Singleton Instance
// ============================================

let globalCache: ColorCache | null = null;

/**
 * Get the global color cache instance
 */
export function getColorCache(config?: Partial<ColorCacheConfig>): ColorCache {
  if (!globalCache) {
    globalCache = new ColorCache(config);
  }
  return globalCache;
}

/**
 * Reset the global cache
 */
export function resetColorCache(): void {
  if (globalCache) {
    globalCache.clear();
  }
  globalCache = null;
}

/**
 * Decorator for caching method results
 */
export function cached(keyPrefix: string) {
  return function <T extends (...args: unknown[]) => unknown>(
    _target: object,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const cache = getColorCache();
      const key = `${keyPrefix}:${JSON.stringify(args)}`;

      const cached = cache.get(key);
      if (cached !== undefined) {
        return cached;
      }

      const result = originalMethod.apply(this, args);
      cache.set(key, result);
      return result;
    } as T;

    return descriptor;
  };
}

export default ColorCache;
