// ============================================
// API Query Hooks - FASE 2
// TanStack Query hooks with tenant awareness
// ============================================

'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query';

import { useCurrentTenantId } from '@/store';

import { createApiClient, type ApiError, type RequestConfig } from '../api-client';

// ============================================
// Create tenant-aware API client hook
// ============================================

export function useApiClient() {
  const tenantId = useCurrentTenantId();
  return createApiClient(tenantId ?? undefined);
}

// ============================================
// Generic Query Hook
// ============================================

interface UseApiQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'> {
  config?: RequestConfig;
  /** If true, the query will run even without a tenant ID */
  skipTenantCheck?: boolean;
}

export function useApiQuery<TData>(
  queryKey: QueryKey,
  endpoint: string,
  options?: UseApiQueryOptions<TData>
) {
  const tenantId = useCurrentTenantId();
  const { config, skipTenantCheck, ...queryOptions } = options ?? {};

  // Determine if query should be enabled
  // If skipTenantCheck is true, query can run without tenant
  // Otherwise, require tenant ID
  const isEnabled = skipTenantCheck ? true : !!tenantId;
  const userEnabled = queryOptions.enabled !== undefined ? queryOptions.enabled : true;

  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      const client = createApiClient(tenantId ?? undefined);
      return client.get<TData>(endpoint, config);
    },
    enabled: isEnabled && userEnabled,
    ...queryOptions,
  });
}

// ============================================
// Generic Mutation Hook
// ============================================

interface UseApiMutationOptions<TData, TVariables>
  extends Omit<UseMutationOptions<TData, ApiError, TVariables>, 'mutationFn'> {
  invalidateKeys?: QueryKey[];
  setDataKeys?: Array<{
    queryKey: QueryKey;
    updater: (old: unknown, data: TData) => unknown;
  }>;
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables, client: ReturnType<typeof createApiClient>) => Promise<TData>,
  options?: UseApiMutationOptions<TData, TVariables>
) {
  const queryClient = useQueryClient();
  const tenantId = useCurrentTenantId();
  const { invalidateKeys, setDataKeys, ...mutationOptions } = options ?? {};

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const client = createApiClient(tenantId ?? undefined);
      return mutationFn(variables, client);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate specified query keys
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          void queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Update cache with new data
      if (setDataKeys) {
        setDataKeys.forEach(({ queryKey, updater }) => {
          queryClient.setQueryData(queryKey, (old: unknown) =>
            updater(old, data)
          );
        });
      }

      // Call user's onSuccess callback if provided
      if (mutationOptions?.onSuccess) {
        // @ts-expect-error - TanStack Query v5 types are strict
        mutationOptions.onSuccess(data, variables, context);
      }
    },
    ...mutationOptions,
  });
}

// ============================================
// POST Mutation Helper
// ============================================

export function useApiPost<TData, TBody>(
  endpoint: string,
  options?: UseApiMutationOptions<TData, TBody>
) {
  return useApiMutation<TData, TBody>(
    async (body, client) => client.post<TData>(endpoint, body),
    options
  );
}

// ============================================
// PUT Mutation Helper
// ============================================

export function useApiPut<TData, TBody>(
  endpoint: string,
  options?: UseApiMutationOptions<TData, TBody>
) {
  return useApiMutation<TData, TBody>(
    async (body, client) => client.put<TData>(endpoint, body),
    options
  );
}

// ============================================
// PATCH Mutation Helper
// ============================================

export function useApiPatch<TData, TBody>(
  endpoint: string,
  options?: UseApiMutationOptions<TData, TBody>
) {
  return useApiMutation<TData, TBody>(
    async (body, client) => client.patch<TData>(endpoint, body),
    options
  );
}

// ============================================
// DELETE Mutation Helper
// ============================================

export function useApiDelete<TData>(
  endpoint: string,
  options?: UseApiMutationOptions<TData, void>
) {
  return useApiMutation<TData, void>(
    async (_, client) => client.delete<TData>(endpoint),
    options
  );
}

// ============================================
// Optimistic Update Hook
// ============================================

interface UseOptimisticMutationOptions<TData, TVariables, TContext = unknown>
  extends UseMutationOptions<TData, ApiError, TVariables, TContext> {
  queryKey: QueryKey;
  optimisticUpdate: (old: TData | undefined, variables: TVariables) => TData;
}

export function useOptimisticMutation<TData, TVariables, TContext = { previousData?: TData }>(
  mutationFn: (variables: TVariables, client: ReturnType<typeof createApiClient>) => Promise<TData>,
  options: UseOptimisticMutationOptions<TData, TVariables, TContext>
) {
  const queryClient = useQueryClient();
  const tenantId = useCurrentTenantId();
  const { queryKey, optimisticUpdate, ...mutationOptions } = options;

  return useMutation<TData, ApiError, TVariables, TContext>({
    mutationFn: async (variables) => {
      const client = createApiClient(tenantId ?? undefined);
      return mutationFn(variables, client);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) =>
        optimisticUpdate(old, variables)
      );

      // Return context with the previous data
      return { previousData } as TContext;
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context && typeof context === 'object' && 'previousData' in context) {
        queryClient.setQueryData(queryKey, (context as { previousData?: TData }).previousData);
      }
      // @ts-expect-error - TanStack Query v5 types are strict
      mutationOptions.onError?.(err, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after error or success
      void queryClient.invalidateQueries({ queryKey });
      // @ts-expect-error - TanStack Query v5 types are strict
      mutationOptions.onSettled?.(data, error, variables, context);
    },
    ...mutationOptions,
  });
}

// ============================================
// Paginated Query Hook
// ============================================

interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export function usePaginatedQuery<TData>(
  queryKey: QueryKey,
  endpoint: string,
  pagination: PaginationParams,
  options?: Omit<UseApiQueryOptions<PaginatedResponse<TData>>, 'config'>
) {
  const tenantId = useCurrentTenantId();

  return useQuery<PaginatedResponse<TData>, ApiError>({
    queryKey: [...queryKey, pagination],
    queryFn: async () => {
      const client = createApiClient(tenantId ?? undefined);
      return client.get<PaginatedResponse<TData>>(endpoint, {
        params: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          sortBy: pagination.sortBy,
          sortOrder: pagination.sortOrder,
        },
      });
    },
    enabled: !!tenantId,
    placeholderData: (previousData) => previousData,
    ...options,
  });
}

// ============================================
// Infinite Query Hook
// ============================================

export function useInfiniteApiQuery<TData>(
  queryKey: QueryKey,
  endpoint: string,
  pageSize: number = 20,
  options?: Omit<UseApiQueryOptions<PaginatedResponse<TData>>, 'config'>
) {
  const tenantId = useCurrentTenantId();

  // This is a simplified version - for full infinite query, use useInfiniteQuery
  return useQuery<PaginatedResponse<TData>, ApiError>({
    queryKey: [...queryKey, { pageSize }],
    queryFn: async () => {
      const client = createApiClient(tenantId ?? undefined);
      return client.get<PaginatedResponse<TData>>(endpoint, {
        params: { pageSize },
      });
    },
    enabled: !!tenantId,
    ...options,
  });
}
