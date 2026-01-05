// ============================================
// Customer Management Hooks - FASE 5.2
// React Query hooks for customer operations
// ============================================

'use client';

import { useQueryClient } from '@tanstack/react-query';

import {
  useApiQuery,
  useApiMutation,
} from '@/lib/api';

import type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerNote,
  CreateNoteData,
  UpdateNoteData,
  CustomersResponse,
  CustomerNotesResponse,
  CustomerActivityResponse,
  CustomerStatistics,
  CustomerFilters,
  CustomerSort,
  CustomerNotesFilters,
  CustomerActivityFilters,
} from './types';

// ============================================
// Query Keys
// ============================================

export const customerQueryKeys = {
  all: ['customers'] as const,
  lists: () => [...customerQueryKeys.all, 'list'] as const,
  list: (filters?: CustomerFilters & CustomerSort & { page?: number; limit?: number }) =>
    [...customerQueryKeys.lists(), filters] as const,
  details: () => [...customerQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerQueryKeys.details(), id] as const,
  statistics: () => [...customerQueryKeys.all, 'statistics'] as const,
  topRevenue: (limit?: number) => [...customerQueryKeys.all, 'top-revenue', limit] as const,
  // Notes
  notes: (customerId: string) => [...customerQueryKeys.all, customerId, 'notes'] as const,
  notesList: (customerId: string, filters?: CustomerNotesFilters & { page?: number; limit?: number }) =>
    [...customerQueryKeys.notes(customerId), 'list', filters] as const,
  // Activity
  activity: (customerId: string) => [...customerQueryKeys.all, customerId, 'activity'] as const,
  activityList: (customerId: string, filters?: CustomerActivityFilters & { page?: number; limit?: number }) =>
    [...customerQueryKeys.activity(customerId), 'list', filters] as const,
};

// ============================================
// Customer List & CRUD Hooks
// ============================================

interface UseCustomersOptions extends CustomerFilters, CustomerSort {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Get customers list with filters
 */
export function useCustomers(options: UseCustomersOptions = {}) {
  const { enabled = true, ...filters } = options;
  const queryParams = new URLSearchParams();

  // Build query params
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
  if (filters.searchTerm) queryParams.set('searchTerm', filters.searchTerm);
  if (filters.accountManagerId) queryParams.set('accountManagerId', filters.accountManagerId);
  if (filters.hasRevenue !== undefined) queryParams.set('hasRevenue', String(filters.hasRevenue));
  if (filters.revenueMin) queryParams.set('revenueMin', String(filters.revenueMin));
  if (filters.revenueMax) queryParams.set('revenueMax', String(filters.revenueMax));
  if (filters.convertedDateFrom) queryParams.set('convertedDateFrom', filters.convertedDateFrom);
  if (filters.convertedDateTo) queryParams.set('convertedDateTo', filters.convertedDateTo);

  // Handle array filters
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach((s) => queryParams.append('status', s));
  }
  if (filters.type) {
    const types = Array.isArray(filters.type) ? filters.type : [filters.type];
    types.forEach((t) => queryParams.append('type', t));
  }
  if (filters.tier) {
    const tiers = Array.isArray(filters.tier) ? filters.tier : [filters.tier];
    tiers.forEach((t) => queryParams.append('tier', t));
  }

  const endpoint = `/api/v1/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<CustomersResponse>(
    customerQueryKeys.list(filters as Record<string, unknown>),
    endpoint,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled,
    }
  );
}

/**
 * Get single customer by ID
 */
export function useCustomer(customerId: string) {
  return useApiQuery<Customer>(
    customerQueryKeys.detail(customerId),
    `/api/v1/customers/${customerId}`,
    {
      enabled: !!customerId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Get customer statistics
 */
export function useCustomerStatistics(options?: {
  accountManagerId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const queryParams = new URLSearchParams();
  if (options?.accountManagerId) queryParams.set('accountManagerId', options.accountManagerId);
  if (options?.dateFrom) queryParams.set('dateFrom', options.dateFrom);
  if (options?.dateTo) queryParams.set('dateTo', options.dateTo);

  const endpoint = `/api/v1/customers/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<CustomerStatistics>(
    customerQueryKeys.statistics(),
    endpoint,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useApiMutation<Customer, CreateCustomerData>(
    async (data, client) => {
      return client.post<Customer>('/api/v1/customers', data);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.statistics() });
      },
    }
  );
}

/**
 * Update a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useApiMutation<Customer, { customerId: string; data: UpdateCustomerData }>(
    async ({ customerId, data }, client) => {
      return client.patch<Customer>(`/api/v1/customers/${customerId}`, data);
    },
    {
      onSuccess: (updatedCustomer) => {
        // Update cache
        queryClient.setQueryData(customerQueryKeys.detail(updatedCustomer.id), updatedCustomer);
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      },
    }
  );
}

/**
 * Delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>(
    async (customerId, client) => {
      return client.delete(`/api/v1/customers/${customerId}`);
    },
    {
      onSuccess: (_, customerId) => {
        queryClient.removeQueries({ queryKey: customerQueryKeys.detail(customerId) });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.statistics() });
      },
    }
  );
}

// ============================================
// Customer Notes Hooks
// ============================================

interface UseCustomerNotesOptions extends CustomerNotesFilters {
  page?: number;
  limit?: number;
}

/**
 * Get customer notes
 */
export function useCustomerNotes(customerId: string, options: UseCustomerNotesOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));
  if (options.isPinned !== undefined) queryParams.set('isPinned', String(options.isPinned));

  const endpoint = `/api/v1/customers/${customerId}/notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<CustomerNotesResponse>(
    customerQueryKeys.notesList(customerId, options as Record<string, unknown>),
    endpoint,
    {
      enabled: !!customerId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Add a note to a customer
 */
export function useAddCustomerNote() {
  const queryClient = useQueryClient();

  return useApiMutation<CustomerNote, { customerId: string; data: CreateNoteData }>(
    async ({ customerId, data }, client) => {
      return client.post<CustomerNote>(`/api/v1/customers/${customerId}/notes`, data);
    },
    {
      onSuccess: (_, { customerId }) => {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.notes(customerId) });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.activity(customerId) });
      },
    }
  );
}

/**
 * Update a customer note
 */
export function useUpdateCustomerNote() {
  const queryClient = useQueryClient();

  return useApiMutation<CustomerNote, { customerId: string; noteId: string; data: UpdateNoteData }>(
    async ({ customerId, noteId, data }, client) => {
      return client.patch<CustomerNote>(`/api/v1/customers/${customerId}/notes/${noteId}`, data);
    },
    {
      onSuccess: (_, { customerId }) => {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.notes(customerId) });
      },
    }
  );
}

/**
 * Delete a customer note
 */
export function useDeleteCustomerNote() {
  const queryClient = useQueryClient();

  return useApiMutation<void, { customerId: string; noteId: string }>(
    async ({ customerId, noteId }, client) => {
      return client.delete(`/api/v1/customers/${customerId}/notes/${noteId}`);
    },
    {
      onSuccess: (_, { customerId }) => {
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.notes(customerId) });
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.activity(customerId) });
      },
    }
  );
}

// ============================================
// Customer Activity Hooks
// ============================================

interface UseCustomerActivityOptions extends CustomerActivityFilters {
  page?: number;
  limit?: number;
}

/**
 * Get customer activity log
 */
export function useCustomerActivity(customerId: string, options: UseCustomerActivityOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));
  if (options.actionType) queryParams.set('actionType', options.actionType);
  if (options.startDate) queryParams.set('startDate', options.startDate);
  if (options.endDate) queryParams.set('endDate', options.endDate);

  const endpoint = `/api/v1/customers/${customerId}/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<CustomerActivityResponse>(
    customerQueryKeys.activityList(customerId, options as Record<string, unknown>),
    endpoint,
    {
      enabled: !!customerId,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Hook that provides customer detail with notes and activity
 */
export function useCustomerDetail(customerId: string) {
  const customer = useCustomer(customerId);
  const notes = useCustomerNotes(customerId, { limit: 5 });
  const activity = useCustomerActivity(customerId, { limit: 10 });

  return {
    // Customer data
    customer: customer.data,
    isCustomerLoading: customer.isLoading,
    customerError: customer.error,

    // Notes
    notes: notes.data?.data ?? [],
    isNotesLoading: notes.isLoading,

    // Activity
    activity: activity.data?.data ?? [],
    isActivityLoading: activity.isLoading,

    // Combined loading
    isLoading: customer.isLoading || notes.isLoading || activity.isLoading,

    // Refresh
    refetchCustomer: customer.refetch,
    refetchNotes: notes.refetch,
    refetchActivity: activity.refetch,
  };
}

/**
 * Hook that provides customer list management
 */
export function useCustomerManagement(options: UseCustomersOptions = {}) {
  const customers = useCustomers(options);
  const statistics = useCustomerStatistics();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  return {
    // Data
    customers: customers.data?.data ?? [],
    meta: customers.data?.meta,
    statistics: statistics.data,

    // Loading states
    isLoading: customers.isLoading,
    isStatisticsLoading: statistics.isLoading,

    // Errors
    customersError: customers.error,
    statisticsError: statistics.error,

    // Mutations
    createCustomer: createCustomer.mutate,
    createCustomerAsync: createCustomer.mutateAsync,
    isCreating: createCustomer.isPending,

    updateCustomer: updateCustomer.mutate,
    updateCustomerAsync: updateCustomer.mutateAsync,
    isUpdating: updateCustomer.isPending,

    deleteCustomer: deleteCustomer.mutate,
    deleteCustomerAsync: deleteCustomer.mutateAsync,
    isDeleting: deleteCustomer.isPending,

    // Refresh
    refetchCustomers: customers.refetch,
    refetchStatistics: statistics.refetch,
  };
}

/**
 * Hook that provides customer notes management
 */
export function useCustomerNotesManagement(customerId: string) {
  const notes = useCustomerNotes(customerId);
  const addNote = useAddCustomerNote();
  const updateNote = useUpdateCustomerNote();
  const deleteNote = useDeleteCustomerNote();

  return {
    // Data
    notes: notes.data?.data ?? [],
    meta: notes.data?.meta,

    // Loading states
    isLoading: notes.isLoading,

    // Mutations
    addNote: (data: CreateNoteData) => addNote.mutate({ customerId, data }),
    addNoteAsync: (data: CreateNoteData) => addNote.mutateAsync({ customerId, data }),
    isAdding: addNote.isPending,

    updateNote: (noteId: string, data: UpdateNoteData) =>
      updateNote.mutate({ customerId, noteId, data }),
    updateNoteAsync: (noteId: string, data: UpdateNoteData) =>
      updateNote.mutateAsync({ customerId, noteId, data }),
    isUpdatingNote: updateNote.isPending,

    deleteNote: (noteId: string) => deleteNote.mutate({ customerId, noteId }),
    deleteNoteAsync: (noteId: string) => deleteNote.mutateAsync({ customerId, noteId }),
    isDeletingNote: deleteNote.isPending,

    // Refresh
    refetchNotes: notes.refetch,
  };
}
