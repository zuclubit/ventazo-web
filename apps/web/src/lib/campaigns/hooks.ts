/**
 * Campaigns Module Hooks
 *
 * React Query hooks for campaign operations including:
 * - Campaign CRUD operations
 * - Sending and scheduling
 * - Analytics and reporting
 */

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  Campaign,
  CampaignAnalytics,
  CampaignQueryParams,
  CampaignsListResponse,
  CampaignsDashboardStats,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  SendCampaignRequest,
  SendCampaignResult,
  CampaignRecipientsResponse,
  PreviewRecipientsResponse,
  RecipientFilters,
  CampaignTemplate,
} from './types';

// ============================================
// Query Keys
// ============================================

export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (params: CampaignQueryParams) => [...campaignKeys.lists(), params] as const,
  infinite: (params: CampaignQueryParams) => [...campaignKeys.all, 'infinite', params] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
  analytics: (id: string) => [...campaignKeys.all, 'analytics', id] as const,
  recipients: (id: string, params?: { page?: number; status?: string }) =>
    [...campaignKeys.all, 'recipients', id, params] as const,
  preview: (filters: RecipientFilters) => [...campaignKeys.all, 'preview', filters] as const,
  stats: () => [...campaignKeys.all, 'stats'] as const,
  templates: () => [...campaignKeys.all, 'templates'] as const,
};

// ============================================
// API Functions
// ============================================

const campaignsApi = {
  // Campaigns CRUD
  list: async (params: CampaignQueryParams): Promise<CampaignsListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set('status', params.status);
    if (params.channel) searchParams.set('channel', params.channel);
    if (params.search) searchParams.set('search', params.search);
    if (params.tags?.length) searchParams.set('tags', params.tags.join(','));
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    return apiClient.get<CampaignsListResponse>(`/campaigns?${searchParams.toString()}`);
  },

  getById: async (id: string): Promise<Campaign> => {
    return apiClient.get<Campaign>(`/campaigns/${id}`);
  },

  create: async (request: CreateCampaignRequest): Promise<Campaign> => {
    return apiClient.post<Campaign>('/campaigns', request);
  },

  update: async (id: string, request: UpdateCampaignRequest): Promise<Campaign> => {
    return apiClient.patch<Campaign>(`/campaigns/${id}`, request);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/campaigns/${id}`);
  },

  duplicate: async (id: string, name: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/duplicate`, { name });
  },

  // Sending
  send: async (request: SendCampaignRequest): Promise<SendCampaignResult> => {
    return apiClient.post<SendCampaignResult>(`/campaigns/${request.campaignId}/send`, request);
  },

  schedule: async (id: string, scheduledAt: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/schedule`, { scheduledAt });
  },

  pause: async (id: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/pause`, {});
  },

  resume: async (id: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/resume`, {});
  },

  cancel: async (id: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/cancel`, {});
  },

  // Recipients
  getRecipients: async (
    id: string,
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<CampaignRecipientsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    return apiClient.get<CampaignRecipientsResponse>(
      `/campaigns/${id}/recipients?${searchParams.toString()}`
    );
  },

  previewRecipients: async (
    filters: RecipientFilters,
    limit = 10
  ): Promise<PreviewRecipientsResponse> => {
    return apiClient.post<PreviewRecipientsResponse>('/campaigns/preview-recipients', {
      filters,
      limit,
    });
  },

  countRecipients: async (filters: RecipientFilters): Promise<{ count: number }> => {
    return apiClient.post<{ count: number }>('/campaigns/count-recipients', { filters });
  },

  // Analytics
  getAnalytics: async (id: string): Promise<CampaignAnalytics> => {
    return apiClient.get<CampaignAnalytics>(`/campaigns/${id}/analytics`);
  },

  getDashboardStats: async (): Promise<CampaignsDashboardStats> => {
    return apiClient.get<CampaignsDashboardStats>('/campaigns/stats');
  },

  // Templates
  getTemplates: async (): Promise<CampaignTemplate[]> => {
    return apiClient.get<CampaignTemplate[]>('/campaigns/templates');
  },

  // Test send
  sendTest: async (id: string, emails: string[]): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/campaigns/${id}/test`, { emails });
  },
};

// ============================================
// Campaign Hooks
// ============================================

export function useCampaigns(params: CampaignQueryParams = {}) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useInfiniteCampaigns(params: CampaignQueryParams = {}) {
  return useInfiniteQuery({
    queryKey: campaignKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      campaignsApi.list({ ...params, page: pageParam, limit: params.limit || 20 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 30 * 1000,
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId),
    queryFn: () => campaignsApi.getById(campaignId),
    enabled: !!campaignId,
  });
}

export function useCampaignAnalytics(campaignId: string) {
  return useQuery({
    queryKey: campaignKeys.analytics(campaignId),
    queryFn: () => campaignsApi.getAnalytics(campaignId),
    enabled: !!campaignId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCampaignRecipients(
  campaignId: string,
  params?: { page?: number; status?: string }
) {
  return useQuery({
    queryKey: campaignKeys.recipients(campaignId, params),
    queryFn: () => campaignsApi.getRecipients(campaignId, params),
    enabled: !!campaignId,
  });
}

export function useCampaignsDashboard() {
  return useQuery({
    queryKey: campaignKeys.stats(),
    queryFn: () => campaignsApi.getDashboardStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCampaignTemplates() {
  return useQuery({
    queryKey: campaignKeys.templates(),
    queryFn: () => campaignsApi.getTemplates(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// Campaign Mutation Hooks
// ============================================

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCampaignRequest) => campaignsApi.create(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: campaignKeys.stats() });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateCampaignRequest }) =>
      campaignsApi.update(id, request),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: campaignKeys.stats() });
    },
  });
}

export function useDuplicateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => campaignsApi.duplicate(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useSendCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendCampaignRequest) => campaignsApi.send(request),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: campaignKeys.stats() });
    },
  });
}

export function useScheduleCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      campaignsApi.schedule(id, scheduledAt),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.pause(id),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.resume(id),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignsApi.cancel(id),
    onSuccess: (updatedCampaign) => {
      queryClient.setQueryData(campaignKeys.detail(updatedCampaign.id), updatedCampaign);
      void queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

export function useSendTestCampaign() {
  return useMutation({
    mutationFn: ({ id, emails }: { id: string; emails: string[] }) =>
      campaignsApi.sendTest(id, emails),
  });
}

// ============================================
// Recipient Preview Hooks
// ============================================

export function usePreviewRecipients(filters: RecipientFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: campaignKeys.preview(filters),
    queryFn: () => campaignsApi.previewRecipients(filters),
    enabled: options?.enabled ?? true,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCountRecipients() {
  return useMutation({
    mutationFn: (filters: RecipientFilters) => campaignsApi.countRecipients(filters),
  });
}
