// ============================================
// React Query Configuration - FASE 5.12
// Optimized query client configuration
// ============================================

import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

// ============================================
// Query Configuration Constants
// ============================================

// Stale times for different data types (in milliseconds)
export const STALE_TIMES = {
  // Static data that rarely changes
  static: 1000 * 60 * 60, // 1 hour

  // Reference data (e.g., pipeline stages, status options)
  reference: 1000 * 60 * 30, // 30 minutes

  // Standard data (e.g., leads, opportunities)
  standard: 1000 * 60 * 5, // 5 minutes

  // Frequently changing data (e.g., dashboard stats)
  frequent: 1000 * 60 * 1, // 1 minute

  // Real-time data (e.g., notifications)
  realtime: 1000 * 30, // 30 seconds

  // Infinite (for data that should always be fresh)
  always: 0,
} as const;

// Cache times for garbage collection (in milliseconds)
export const GC_TIMES = {
  // Long-lived cache
  long: 1000 * 60 * 60 * 24, // 24 hours

  // Standard cache
  standard: 1000 * 60 * 30, // 30 minutes

  // Short-lived cache
  short: 1000 * 60 * 5, // 5 minutes
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

// ============================================
// Default Query Options
// ============================================

export const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Default stale time - data is fresh for 5 minutes
    staleTime: STALE_TIMES.standard,

    // Keep unused data in cache for 30 minutes
    gcTime: GC_TIMES.standard,

    // Retry failed queries up to 3 times
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && 'status' in error) {
        const status = (error as { status: number }).status;
        if (status >= 400 && status < 500) {
          return false;
        }
      }
      return failureCount < RETRY_CONFIG.maxRetries;
    },
    retryDelay: RETRY_CONFIG.retryDelay,

    // Refetch behavior
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Disable automatic refetching when the tab is in the background
    refetchIntervalInBackground: false,

    // Network mode - online means queries won't run without network
    networkMode: 'online',
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    retryDelay: 1000,

    // Network mode
    networkMode: 'online',
  },
};

// ============================================
// Create Query Client Factory
// ============================================

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

// ============================================
// Query Key Prefixes (for invalidation)
// ============================================

export const QUERY_PREFIXES = {
  leads: 'leads',
  opportunities: 'opportunities',
  customers: 'customers',
  tasks: 'tasks',
  workflows: 'workflows',
  services: 'services',
  analytics: 'analytics',
  users: 'users',
  teams: 'teams',
  notifications: 'notifications',
  settings: 'settings',
} as const;

// ============================================
// Invalidation Helpers
// ============================================

/**
 * Invalidate all queries for a specific entity
 */
export function invalidateEntity(
  queryClient: QueryClient,
  entity: keyof typeof QUERY_PREFIXES
): void {
  void queryClient.invalidateQueries({
    queryKey: [QUERY_PREFIXES[entity]],
  });
}

/**
 * Invalidate related entities after a mutation
 */
export function invalidateRelated(
  queryClient: QueryClient,
  entities: (keyof typeof QUERY_PREFIXES)[]
): void {
  entities.forEach((entity) => {
    void queryClient.invalidateQueries({
      queryKey: [QUERY_PREFIXES[entity]],
    });
  });
}

/**
 * Prefetch data for a route
 */
export async function prefetchRoute(
  queryClient: QueryClient,
  queries: Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown> }>
): Promise<void> {
  await Promise.all(
    queries.map(({ queryKey, queryFn }) =>
      queryClient.prefetchQuery({ queryKey, queryFn })
    )
  );
}

// ============================================
// Query Options Factories
// ============================================

/**
 * Create query options for static data
 */
export function staticQueryOptions<T>(
  queryFn: () => Promise<T>
): { queryFn: () => Promise<T>; staleTime: number; gcTime: number } {
  return {
    queryFn,
    staleTime: STALE_TIMES.static,
    gcTime: GC_TIMES.long,
  };
}

/**
 * Create query options for reference data
 */
export function referenceQueryOptions<T>(
  queryFn: () => Promise<T>
): { queryFn: () => Promise<T>; staleTime: number; gcTime: number } {
  return {
    queryFn,
    staleTime: STALE_TIMES.reference,
    gcTime: GC_TIMES.standard,
  };
}

/**
 * Create query options for real-time data
 */
export function realtimeQueryOptions<T>(
  queryFn: () => Promise<T>,
  refetchInterval = 30000
): {
  queryFn: () => Promise<T>;
  staleTime: number;
  gcTime: number;
  refetchInterval: number;
} {
  return {
    queryFn,
    staleTime: STALE_TIMES.realtime,
    gcTime: GC_TIMES.short,
    refetchInterval,
  };
}

// ============================================
// Optimistic Update Helpers
// ============================================

/**
 * Helper for optimistic updates
 */
export function createOptimisticUpdate<TData, TVariables, TContext>(options: {
  queryKey: unknown[];
  updateFn: (old: TData | undefined, variables: TVariables) => TData;
}): {
  onMutate: (variables: TVariables) => Promise<TContext>;
  onError: (
    error: unknown,
    variables: TVariables,
    context: TContext | undefined
  ) => void;
  onSettled: () => void;
} {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      const queryClient = new QueryClient();
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(options.queryKey);

      // Optimistically update
      queryClient.setQueryData<TData>(options.queryKey, (old) =>
        options.updateFn(old, variables)
      );

      return { previousData } as TContext;
    },
    onError: (
      _error: unknown,
      _variables: TVariables,
      context: TContext | undefined
    ) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousData' in (context as object)) {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
          options.queryKey,
          (context as unknown as { previousData: TData }).previousData
        );
      }
    },
    onSettled: () => {
      // Invalidate to refetch
      const queryClient = new QueryClient();
      void queryClient.invalidateQueries({ queryKey: options.queryKey });
    },
  };
}

// ============================================
// Select Helpers (for data transformation)
// ============================================

/**
 * Create a selector for paginated data
 */
export function selectPaginatedData<T>(
  response: { data: T[]; meta?: { total: number; page: number; totalPages: number } } | undefined
): { items: T[]; total: number; page: number; totalPages: number } {
  if (!response) {
    return { items: [], total: 0, page: 1, totalPages: 0 };
  }
  return {
    items: response.data,
    total: response.meta?.total ?? response.data.length,
    page: response.meta?.page ?? 1,
    totalPages: response.meta?.totalPages ?? 1,
  };
}

/**
 * Create a selector for a single item from a list
 */
export function selectById<T extends { id: string }>(
  data: T[] | undefined,
  id: string
): T | undefined {
  return data?.find((item) => item.id === id);
}
