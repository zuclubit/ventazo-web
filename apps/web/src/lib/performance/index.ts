// ============================================
// Performance Utilities - FASE 5.11
// Memoization, lazy loading, and optimization helpers
// ============================================

import * as React from 'react';

// ============================================
// Memoization Utilities
// ============================================

/**
 * Creates a memoized version of an expensive function
 * with configurable cache size
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options: { maxSize?: number; getKey?: (...args: Parameters<T>) => string } = {}
): T {
  const { maxSize = 100, getKey = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, ReturnType<T>>();
  const keys: string[] = [];

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    keys.push(key);

    // Evict oldest entries if cache is too large
    while (keys.length > maxSize) {
      const oldestKey = keys.shift()!;
      cache.delete(oldestKey);
    }

    return result;
  }) as T;
}

/**
 * Creates a memoized async function with deduplication
 * Prevents duplicate in-flight requests
 */
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: { ttl?: number; getKey?: (...args: Parameters<T>) => string } = {}
): T {
  const { ttl = 60000, getKey = (...args) => JSON.stringify(args) } = options;
  const cache = new Map<string, { value: Awaited<ReturnType<T>>; timestamp: number }>();
  const pending = new Map<string, Promise<Awaited<ReturnType<T>>>>();

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = getKey(...args);
    const now = Date.now();

    // Check cache first
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    // Check if there's already a pending request
    if (pending.has(key)) {
      return pending.get(key)!;
    }

    // Create new request
    const promise = fn(...args) as Promise<Awaited<ReturnType<T>>>;
    pending.set(key, promise);

    try {
      const result = await promise;
      cache.set(key, { value: result, timestamp: now });
      return result;
    } finally {
      pending.delete(key);
    }
  }) as T;
}

// ============================================
// React Performance Hooks
// ============================================

/**
 * Hook for deferring non-critical updates
 * Uses React.useDeferredValue for React 18+
 */
export function useDeferredState<T>(value: T): T {
  return React.useDeferredValue(value);
}

/**
 * Hook for debounced state updates
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number
): T {
  const lastRun = React.useRef(0);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  return React.useCallback(
    ((...args: Parameters<T>): ReturnType<T> | undefined => {
      const now = Date.now();

      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastRun.current = Date.now();
        callback(...args);
      }, delay - (now - lastRun.current));

      return undefined;
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook for intersection observer with lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setIsIntersecting(entry.isIntersecting);
      }
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return isIntersecting;
}

/**
 * Hook for lazy loading components on scroll
 */
export function useLazyLoad(
  ref: React.RefObject<Element>,
  options: { threshold?: number; rootMargin?: string } = {}
): boolean {
  const [loaded, setLoaded] = React.useState(false);

  const isIntersecting = useIntersectionObserver(ref, {
    threshold: options.threshold ?? 0,
    rootMargin: options.rootMargin ?? '100px',
  });

  React.useEffect(() => {
    if (isIntersecting && !loaded) {
      setLoaded(true);
    }
  }, [isIntersecting, loaded]);

  return loaded;
}

// ============================================
// Virtual List Helpers
// ============================================

export interface VirtualListConfig {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export interface VirtualListResult {
  virtualItems: Array<{ index: number; start: number }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Calculate virtual list items for windowing
 */
export function calculateVirtualItems(
  scrollTop: number,
  config: VirtualListConfig
): VirtualListResult {
  const { itemCount, itemHeight, containerHeight, overscan = 3 } = config;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const virtualItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    virtualItems.push({
      index: i,
      start: i * itemHeight,
    });
  }

  return {
    virtualItems,
    totalHeight: itemCount * itemHeight,
    startIndex,
    endIndex,
  };
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll(config: VirtualListConfig) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = React.useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop((e.target as HTMLElement).scrollTop);
  }, []);

  const virtualList = React.useMemo(
    () => calculateVirtualItems(scrollTop, config),
    [scrollTop, config.itemCount, config.itemHeight, config.containerHeight, config.overscan]
  );

  return {
    ...virtualList,
    handleScroll,
    scrollTop,
  };
}

// ============================================
// Performance Monitoring
// ============================================

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

/**
 * Collect Core Web Vitals metrics
 */
export function collectWebVitals(): Promise<PerformanceMetrics> {
  return new Promise((resolve) => {
    const metrics: PerformanceMetrics = {};

    // Get performance entries
    if ('performance' in window) {
      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find((entry) => entry.name === 'first-contentful-paint');
      if (fcp) {
        metrics.fcp = fcp.startTime;
      }

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart;
      }
    }

    // Use PerformanceObserver for LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            metrics.lcp = lastEntry.startTime;
          }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS Observer
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          metrics.cls = clsValue;
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // FID Observer
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstEntry = entries[0];
          if (firstEntry && 'processingStart' in firstEntry) {
            metrics.fid = (firstEntry as PerformanceEventTiming).processingStart - firstEntry.startTime;
          }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch {
        // PerformanceObserver not fully supported
      }
    }

    // Resolve after a short delay to collect metrics
    setTimeout(() => resolve(metrics), 3000);
  });
}

/**
 * Log performance metrics to console (dev only)
 */
export function logPerformanceMetrics(): void {
  if (process.env.NODE_ENV !== 'development') return;

  void collectWebVitals().then((metrics) => {
    /* eslint-disable no-console */
    console.group('Performance Metrics');
    if (metrics.fcp) console.log(`FCP: ${metrics.fcp.toFixed(2)}ms`);
    if (metrics.lcp) console.log(`LCP: ${metrics.lcp.toFixed(2)}ms`);
    if (metrics.fid) console.log(`FID: ${metrics.fid.toFixed(2)}ms`);
    if (metrics.cls) console.log(`CLS: ${metrics.cls.toFixed(4)}`);
    if (metrics.ttfb) console.log(`TTFB: ${metrics.ttfb.toFixed(2)}ms`);
    console.groupEnd();
    /* eslint-enable no-console */
  });
}

// ============================================
// Image Optimization Helpers
// ============================================

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(src: string, sizes: number[]): string {
  return sizes
    .map((size) => {
      const url = new URL(src, window.location.origin);
      url.searchParams.set('w', String(size));
      return `${url.toString()} ${size}w`;
    })
    .join(', ');
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(preloadImage));
}

// ============================================
// Bundle Size Optimization
// ============================================

/**
 * Dynamic import wrapper with preload hint
 */
export function lazyImport<T extends React.ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  preload = false
): React.LazyExoticComponent<T> {
  if (preload) {
    // Preload the chunk
    void importFn();
  }

  return React.lazy(importFn);
}

/**
 * Preload a route's component
 */
export function preloadRoute(importFn: () => Promise<unknown>): void {
  // Use requestIdleCallback if available
  const win = window as Window & { requestIdleCallback?: (cb: () => void) => void };
  if (win.requestIdleCallback) {
    win.requestIdleCallback(() => {
      void importFn();
    });
  } else {
    setTimeout(() => {
      void importFn();
    }, 100);
  }
}
