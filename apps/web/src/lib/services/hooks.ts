'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  CategoriesFilters,
  CreateCategoryInput,
  CreateCustomFieldInput,
  CreateServiceInput,
  Service,
  ServiceActivity,
  ServiceCategory,
  ServiceCustomField,
  ServicesFilters,
  ServicesStatistics,
  UpdateCategoryInput,
  UpdateCustomFieldInput,
  UpdateServiceInput,
} from './types';

// ============================================
// Query Keys
// ============================================

export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: ServicesFilters) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
  statistics: () => [...serviceKeys.all, 'statistics'] as const,
  activity: (id: string) => [...serviceKeys.all, 'activity', id] as const,
  customFields: (id: string) => [...serviceKeys.all, 'customFields', id] as const,
};

export const categoryKeys = {
  all: ['service-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: CategoriesFilters) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

// ============================================
// Services Queries
// ============================================

/**
 * Fetch services list with filters
 */
export function useServices(filters: ServicesFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.service_type?.length) params.set('service_type', filters.service_type.join(','));
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.category_id) params.set('category_id', filters.category_id);
      if (filters.is_featured !== undefined) params.set('is_featured', String(filters.is_featured));
      if (filters.is_bookable !== undefined) params.set('is_bookable', String(filters.is_bookable));
      if (filters.price_min !== undefined) params.set('price_min', String(filters.price_min));
      if (filters.price_max !== undefined) params.set('price_max', String(filters.price_max));
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));

      const queryString = params.toString();
      const url = queryString ? `/services?${queryString}` : '/services';

      const response = await apiClient.get<{ data: Service[]; total: number }>(url);
      return response;
    },
  });
}

/**
 * Fetch a single service by ID
 */
export function useService(id: string | null) {
  return useQuery({
    queryKey: serviceKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<Service>(`/services/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

/**
 * Fetch services statistics
 */
export function useServicesStatistics() {
  return useQuery({
    queryKey: serviceKeys.statistics(),
    queryFn: async () => {
      const response = await apiClient.get<ServicesStatistics>('/services/statistics');
      return response;
    },
  });
}

/**
 * Fetch service activity log
 */
export function useServiceActivity(serviceId: string | null) {
  return useQuery({
    queryKey: serviceKeys.activity(serviceId ?? ''),
    queryFn: async () => {
      if (!serviceId) return [];
      const response = await apiClient.get<ServiceActivity[]>(`/services/${serviceId}/activity`);
      return response;
    },
    enabled: !!serviceId,
  });
}

/**
 * Fetch service custom fields
 */
export function useServiceCustomFields(serviceId: string | null) {
  return useQuery({
    queryKey: serviceKeys.customFields(serviceId ?? ''),
    queryFn: async () => {
      if (!serviceId) return [];
      const response = await apiClient.get<ServiceCustomField[]>(`/services/${serviceId}/custom-fields`);
      return response;
    },
    enabled: !!serviceId,
  });
}

// ============================================
// Services Mutations
// ============================================

/**
 * Create a new service
 */
export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceInput) => {
      const response = await apiClient.post<Service>('/services', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all }); // Update category counts
    },
  });
}

/**
 * Update an existing service
 */
export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateServiceInput) => {
      const response = await apiClient.patch<Service>(`/services/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a service
 */
export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/services/${id}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all }); // Update category counts
    },
  });
}

/**
 * Archive a service
 */
export function useArchiveService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Service>(`/services/${id}`, { status: 'archived' });
      return response;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

/**
 * Activate a service
 */
export function useActivateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Service>(`/services/${id}`, { status: 'active' });
      return response;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

/**
 * Deactivate a service
 */
export function useDeactivateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<Service>(`/services/${id}`, { status: 'inactive' });
      return response;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(id) });
    },
  });
}

// ============================================
// Custom Fields Mutations
// ============================================

/**
 * Add a custom field to a service
 */
export function useAddCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCustomFieldInput) => {
      const response = await apiClient.post<ServiceCustomField>(
        `/services/${data.service_id}/custom-fields`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.customFields(variables.service_id) });
      void queryClient.invalidateQueries({ queryKey: serviceKeys.detail(variables.service_id) });
    },
  });
}

/**
 * Update a custom field
 */
export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, service_id, ...data }: UpdateCustomFieldInput & { service_id: string }) => {
      const response = await apiClient.patch<ServiceCustomField>(
        `/services/${service_id}/custom-fields/${id}`,
        data
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.customFields(variables.service_id) });
    },
  });
}

/**
 * Delete a custom field
 */
export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, service_id }: { id: string; service_id: string }) => {
      await apiClient.delete(`/services/${service_id}/custom-fields/${id}`);
      return { id, service_id };
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: serviceKeys.customFields(variables.service_id) });
    },
  });
}

// ============================================
// Categories Queries
// ============================================

/**
 * Fetch categories list
 */
export function useServiceCategories(filters: CategoriesFilters = {}) {
  return useQuery({
    queryKey: categoryKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters.parent_id !== undefined) {
        params.set('parent_id', filters.parent_id ?? 'null');
      }

      const queryString = params.toString();
      const url = queryString ? `/service-categories?${queryString}` : '/service-categories';

      const response = await apiClient.get<{ data: ServiceCategory[]; total: number }>(url);
      return response;
    },
  });
}

/**
 * Fetch a single category by ID
 */
export function useServiceCategory(id: string | null) {
  return useQuery({
    queryKey: categoryKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const response = await apiClient.get<ServiceCategory>(`/service-categories/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

// ============================================
// Categories Mutations
// ============================================

/**
 * Create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const response = await apiClient.post<ServiceCategory>('/service-categories', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/**
 * Update an existing category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCategoryInput) => {
      const response = await apiClient.patch<ServiceCategory>(`/service-categories/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.detail(variables.id) });
    },
  });
}

/**
 * Delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/service-categories/${id}`);
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

// ============================================
// Composite Hooks
// ============================================

/**
 * Combined hook for service management
 */
export function useServiceManagement(filters: ServicesFilters = {}) {
  const servicesQuery = useServices(filters);
  const statisticsQuery = useServicesStatistics();
  const categoriesQuery = useServiceCategories({ is_active: true });

  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const archiveService = useArchiveService();
  const activateService = useActivateService();

  return {
    // Data
    services: servicesQuery.data?.data ?? [],
    total: servicesQuery.data?.total ?? 0,
    statistics: statisticsQuery.data,
    categories: categoriesQuery.data?.data ?? [],

    // Loading states
    isLoading: servicesQuery.isLoading,
    isLoadingStatistics: statisticsQuery.isLoading,
    isLoadingCategories: categoriesQuery.isLoading,

    // Error states
    error: servicesQuery.error,

    // Mutations
    createService,
    updateService,
    deleteService,
    archiveService,
    activateService,

    // Mutation states
    isCreating: createService.isPending,
    isUpdating: updateService.isPending,
    isDeleting: deleteService.isPending,

    // Refetch
    refetch: servicesQuery.refetch,
  };
}

/**
 * Combined hook for category management
 */
export function useCategoryManagement(filters: CategoriesFilters = {}) {
  const categoriesQuery = useServiceCategories(filters);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  return {
    // Data
    categories: categoriesQuery.data?.data ?? [],
    total: categoriesQuery.data?.total ?? 0,

    // Loading states
    isLoading: categoriesQuery.isLoading,

    // Error states
    error: categoriesQuery.error,

    // Mutations
    createCategory,
    updateCategory,
    deleteCategory,

    // Mutation states
    isCreating: createCategory.isPending,
    isUpdating: updateCategory.isPending,
    isDeleting: deleteCategory.isPending,

    // Refetch
    refetch: categoriesQuery.refetch,
  };
}

/**
 * Combined hook for custom fields management
 */
export function useCustomFieldsManagement(serviceId: string | null) {
  const fieldsQuery = useServiceCustomFields(serviceId);

  const addField = useAddCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  return {
    // Data
    fields: fieldsQuery.data ?? [],

    // Loading states
    isLoading: fieldsQuery.isLoading,

    // Error states
    error: fieldsQuery.error,

    // Mutations
    addField,
    updateField,
    deleteField,

    // Mutation states
    isAdding: addField.isPending,
    isUpdating: updateField.isPending,
    isDeleting: deleteField.isPending,

    // Refetch
    refetch: fieldsQuery.refetch,
  };
}

/**
 * Combined hook for service detail page
 */
export function useServiceDetail(serviceId: string | null) {
  const serviceQuery = useService(serviceId);
  const activityQuery = useServiceActivity(serviceId);
  const customFieldsQuery = useServiceCustomFields(serviceId);
  const categoriesQuery = useServiceCategories({ is_active: true });

  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const archiveService = useArchiveService();
  const activateService = useActivateService();

  return {
    // Data
    service: serviceQuery.data,
    activity: activityQuery.data ?? [],
    customFields: customFieldsQuery.data ?? [],
    categories: categoriesQuery.data?.data ?? [],

    // Loading states
    isLoading: serviceQuery.isLoading,
    isLoadingActivity: activityQuery.isLoading,
    isLoadingCustomFields: customFieldsQuery.isLoading,

    // Error states
    error: serviceQuery.error,

    // Mutations
    updateService,
    deleteService,
    archiveService,
    activateService,

    // Mutation states
    isUpdating: updateService.isPending,
    isDeleting: deleteService.isPending,

    // Refetch
    refetch: serviceQuery.refetch,
    refetchActivity: activityQuery.refetch,
    refetchCustomFields: customFieldsQuery.refetch,
  };
}
