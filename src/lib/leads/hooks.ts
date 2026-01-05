'use client';

import * as React from 'react';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import { useTenantSafe } from '@/lib/tenant';

import type {
  Lead,
  LeadNote,
  LeadActivity,
  PipelineStage,
  PipelineView,
  LeadsListResponse,
  LeadNotesResponse,
  LeadStatsResponse,
  ConvertLeadResponse,
  CreateLeadRequest,
  UpdateLeadRequest,
  LeadsQueryParams,
  ConvertLeadRequest,
  BulkAssignRequest,
  BulkDeleteRequest,
  BulkStatusRequest,
  BulkStageRequest,
  BulkExportRequest,
  BulkTagRequest,
  BulkOperationResult,
  BulkExportResult,
  AdvancedLeadFilters,
} from './types';

// ============================================
// Query Keys
// ============================================

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (params: LeadsQueryParams) => [...leadKeys.lists(), params] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  notes: (id: string) => [...leadKeys.all, 'notes', id] as const,
  activity: (id: string) => [...leadKeys.all, 'activity', id] as const,
  stats: () => [...leadKeys.all, 'stats'] as const,
  pipeline: () => [...leadKeys.all, 'pipeline'] as const,
  pipelineStages: () => [...leadKeys.pipeline(), 'stages'] as const,
  pipelineView: () => [...leadKeys.pipeline(), 'view'] as const,
};

// ============================================
// Lead Queries
// ============================================

/**
 * Hook to fetch leads with filters and pagination
 */
export function useLeads(params: LeadsQueryParams = {}) {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      if (params.searchTerm) searchParams.set('searchTerm', params.searchTerm);
      if (params.status) searchParams.set('status', params.status);
      if (params.stageId) searchParams.set('stageId', params.stageId);
      if (params.assignedTo) searchParams.set('assignedTo', params.assignedTo);
      if (params.source) searchParams.set('source', params.source);
      if (params.industry) searchParams.set('industry', params.industry);
      if (params.minScore !== undefined) searchParams.set('minScore', String(params.minScore));
      if (params.maxScore !== undefined) searchParams.set('maxScore', String(params.maxScore));
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      const response = await apiClient.get<LeadsListResponse>(
        `/api/v1/leads?${searchParams.toString()}`
      );
      return response;
    },
    enabled: !!tenant,
  });
}

/**
 * Hook to fetch a single lead by ID
 */
export function useLead(leadId: string) {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: leadKeys.detail(leadId),
    queryFn: async () => {
      const response = await apiClient.get<Lead>(`/api/v1/leads/${leadId}`);
      return response;
    },
    enabled: !!tenant && !!leadId,
  });
}

/**
 * Hook to fetch lead statistics
 */
export function useLeadStats() {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: leadKeys.stats(),
    queryFn: async () => {
      const response = await apiClient.get<LeadStatsResponse>('/api/v1/leads/stats/overview');
      return response;
    },
    enabled: !!tenant,
  });
}

// ============================================
// Lead Mutations
// ============================================

/**
 * Hook to create a new lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadRequest) => {
      const response = await apiClient.post<Lead>('/api/v1/leads', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook to update a lead
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data: UpdateLeadRequest }) => {
      const response = await apiClient.patch<Lead>(`/api/v1/leads/${leadId}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook to delete a lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      await apiClient.delete(`/api/v1/leads/${leadId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook to change lead status
 */
export function useChangeLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, status, reason }: { leadId: string; status: string; reason: string }) => {
      const response = await apiClient.patch<Lead>(`/api/v1/leads/${leadId}/status`, { status, reason });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook to update lead score
 */
export function useUpdateLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, score, reason }: { leadId: string; score: number; reason: string }) => {
      const response = await apiClient.patch<Lead>(`/api/v1/leads/${leadId}/score`, { score, reason });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
    },
  });
}

/**
 * Hook to assign lead to a user
 */
export function useAssignLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, assignedTo }: { leadId: string; assignedTo: string }) => {
      const response = await apiClient.post<Lead>(`/api/v1/leads/${leadId}/assign`, { assignedTo });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activity(variables.leadId) });
    },
  });
}

/**
 * Hook to update lead stage (Kanban)
 */
export function useUpdateLeadStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const response = await apiClient.patch<Lead>(`/api/v1/leads/${leadId}/stage`, { stageId });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activity(variables.leadId) });
    },
  });
}

/**
 * Hook to qualify a lead
 */
export function useQualifyLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, qualifiedBy }: { leadId: string; qualifiedBy: string }) => {
      const response = await apiClient.post<Lead>(`/api/v1/leads/${leadId}/qualify`, { qualifiedBy });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
    },
  });
}

/**
 * Hook to convert lead to customer
 */
export function useConvertLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, data }: { leadId: string; data?: ConvertLeadRequest }) => {
      const response = await apiClient.post<ConvertLeadResponse>(
        `/api/v1/leads/${leadId}/convert`,
        data || {}
      );
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
      // Also invalidate customers cache
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Hook to schedule a follow-up
 */
export function useScheduleFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      scheduledAt,
      notes,
    }: {
      leadId: string;
      scheduledAt: string;
      notes: string;
    }) => {
      const response = await apiClient.post<Lead>(`/api/v1/leads/${leadId}/follow-up`, {
        scheduledAt,
        notes,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activity(variables.leadId) });
    },
  });
}

// ============================================
// Lead Notes
// ============================================

/**
 * Hook to fetch notes for a lead
 */
export function useLeadNotes(leadId: string, page = 1, limit = 20) {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: [...leadKeys.notes(leadId), { page, limit }],
    queryFn: async () => {
      const response = await apiClient.get<LeadNotesResponse>(
        `/api/v1/leads/${leadId}/notes?page=${page}&limit=${limit}`
      );
      return response;
    },
    enabled: !!tenant && !!leadId,
  });
}

/**
 * Hook to add a note to a lead
 */
export function useAddLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      content,
      isPinned = false,
    }: {
      leadId: string;
      content: string;
      isPinned?: boolean;
    }) => {
      const response = await apiClient.post<LeadNote>(`/api/v1/leads/${leadId}/notes`, {
        content,
        isPinned,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.notes(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activity(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.leadId) });
    },
  });
}

/**
 * Hook to update a note
 */
export function useUpdateLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      noteId,
      content,
      isPinned,
    }: {
      leadId: string;
      noteId: string;
      content?: string;
      isPinned?: boolean;
    }) => {
      const response = await apiClient.patch<LeadNote>(`/api/v1/leads/${leadId}/notes/${noteId}`, {
        content,
        isPinned,
      });
      return response;
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.notes(variables.leadId) });
    },
  });
}

/**
 * Hook to delete a note
 */
export function useDeleteLeadNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, noteId }: { leadId: string; noteId: string }) => {
      await apiClient.delete(`/api/v1/leads/${leadId}/notes/${noteId}`);
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.notes(variables.leadId) });
      void queryClient.invalidateQueries({ queryKey: leadKeys.activity(variables.leadId) });
    },
  });
}

// ============================================
// Lead Activity
// ============================================

/**
 * Hook to fetch activity for a lead with infinite scroll
 */
export function useLeadActivity(leadId: string, limit = 20) {
  const { tenant } = useTenantSafe();

  return useInfiniteQuery({
    queryKey: leadKeys.activity(leadId),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get<{
        data: LeadActivity[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/v1/leads/${leadId}/activity?page=${pageParam}&limit=${limit}`);
      return response;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!tenant && !!leadId,
  });
}

// ============================================
// Pipeline
// ============================================

/**
 * Hook to fetch pipeline stages
 */
export function usePipelineStages() {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: leadKeys.pipelineStages(),
    queryFn: async () => {
      const response = await apiClient.get<PipelineStage[]>('/api/v1/leads/pipeline/stages');
      return response;
    },
    enabled: !!tenant,
  });
}

/**
 * Hook to fetch pipeline view (leads grouped by stage)
 */
export function usePipelineView() {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: leadKeys.pipelineView(),
    queryFn: async () => {
      const response = await apiClient.get<PipelineView>('/api/v1/leads/pipeline/view');
      return response;
    },
    enabled: !!tenant,
  });
}

/**
 * Hook to create a pipeline stage
 */
export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      label: string;
      description?: string;
      order?: number;
      color?: string;
      isDefault?: boolean;
    }) => {
      const response = await apiClient.post<PipelineStage>('/api/v1/leads/pipeline/stages', data);
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineStages() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Combined hook for lead detail page
 */
export function useLeadDetail(leadId: string) {
  const lead = useLead(leadId);
  const notes = useLeadNotes(leadId);
  const activity = useLeadActivity(leadId);
  const stages = usePipelineStages();

  return {
    lead: lead.data,
    notes: notes.data?.data || [],
    notesMeta: notes.data?.meta,
    activities: activity.data?.pages.flatMap((page) => page.data) || [],
    stages: stages.data || [],
    isLoading: lead.isLoading || notes.isLoading,
    isLoadingActivity: activity.isLoading,
    hasMoreActivity: activity.hasNextPage,
    fetchMoreActivity: activity.fetchNextPage,
    leadError: lead.error,
    refetchLead: lead.refetch,
    refetchNotes: notes.refetch,
  };
}

/**
 * Combined hook for leads list page
 */
export function useLeadsManagement(params: LeadsQueryParams = {}) {
  const leads = useLeads(params);
  const stats = useLeadStats();

  return {
    leads: leads.data?.data || [],
    meta: leads.data?.meta,
    statistics: stats.data,
    isLoading: leads.isLoading,
    isStatsLoading: stats.isLoading,
    error: leads.error,
    statsError: stats.error,
    refetchLeads: leads.refetch,
    refetchStats: stats.refetch,
  };
}

/**
 * Combined hook for notes management
 */
export function useLeadNotesManagement(leadId: string) {
  const notes = useLeadNotes(leadId);
  const addNote = useAddLeadNote();
  const updateNote = useUpdateLeadNote();
  const deleteNote = useDeleteLeadNote();

  return {
    notes: notes.data?.data || [],
    meta: notes.data?.meta,
    isLoading: notes.isLoading,
    addNote,
    updateNote,
    deleteNote,
    refetch: notes.refetch,
  };
}

// ============================================
// Bulk Operations - FASE 5.10
// ============================================

/**
 * Hook for bulk assign leads to a user
 */
export function useBulkAssignLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BulkAssignRequest, 'operation'>) => {
      const response = await apiClient.post<BulkOperationResult>('/api/v1/leads/bulk/assign', {
        ...data,
        operation: 'assign',
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook for bulk delete leads
 */
export function useBulkDeleteLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BulkDeleteRequest, 'operation'>) => {
      const response = await apiClient.post<BulkOperationResult>('/api/v1/leads/bulk/delete', {
        ...data,
        operation: 'delete',
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook for bulk update lead status
 */
export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BulkStatusRequest, 'operation'>) => {
      const response = await apiClient.post<BulkOperationResult>('/api/v1/leads/bulk/status', {
        ...data,
        operation: 'status',
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.stats() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook for bulk update lead stage
 */
export function useBulkUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BulkStageRequest, 'operation'>) => {
      const response = await apiClient.post<BulkOperationResult>('/api/v1/leads/bulk/stage', {
        ...data,
        operation: 'stage',
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });
    },
  });
}

/**
 * Hook for bulk export leads
 */
export function useBulkExportLeads() {
  return useMutation({
    mutationFn: async (data: Omit<BulkExportRequest, 'operation'>) => {
      const response = await apiClient.post<BulkExportResult>('/api/v1/leads/bulk/export', {
        ...data,
        operation: 'export',
      });
      return response;
    },
  });
}

/**
 * Hook for bulk tag operations
 */
export function useBulkTagLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<BulkTagRequest, 'operation'>) => {
      const response = await apiClient.post<BulkOperationResult>('/api/v1/leads/bulk/tags', {
        ...data,
        operation: 'tag',
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Combined hook for bulk operations management
 */
export function useBulkLeadOperations() {
  const bulkAssign = useBulkAssignLeads();
  const bulkDelete = useBulkDeleteLeads();
  const bulkStatus = useBulkUpdateStatus();
  const bulkStage = useBulkUpdateStage();
  const bulkExport = useBulkExportLeads();
  const bulkTag = useBulkTagLeads();

  const isLoading =
    bulkAssign.isPending ||
    bulkDelete.isPending ||
    bulkStatus.isPending ||
    bulkStage.isPending ||
    bulkExport.isPending ||
    bulkTag.isPending;

  return {
    assign: bulkAssign.mutateAsync,
    delete: bulkDelete.mutateAsync,
    updateStatus: bulkStatus.mutateAsync,
    updateStage: bulkStage.mutateAsync,
    export: bulkExport.mutateAsync,
    tag: bulkTag.mutateAsync,
    isLoading,
    assignState: bulkAssign,
    deleteState: bulkDelete,
    statusState: bulkStatus,
    stageState: bulkStage,
    exportState: bulkExport,
    tagState: bulkTag,
  };
}

// ============================================
// Advanced Filters - FASE 5.10
// ============================================

/**
 * Hook to fetch leads with advanced filters
 */
export function useLeadsAdvanced(filters: AdvancedLeadFilters = {}) {
  const { tenant } = useTenantSafe();

  return useQuery({
    queryKey: [...leadKeys.lists(), 'advanced', filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      // Basic params
      if (filters.page) searchParams.set('page', String(filters.page));
      if (filters.limit) searchParams.set('limit', String(filters.limit));
      if (filters.searchTerm) searchParams.set('searchTerm', filters.searchTerm);
      if (filters.status) searchParams.set('status', filters.status);
      if (filters.stageId) searchParams.set('stageId', filters.stageId);
      if (filters.assignedTo) searchParams.set('assignedTo', filters.assignedTo);
      if (filters.source) searchParams.set('source', filters.source);
      if (filters.industry) searchParams.set('industry', filters.industry);
      if (filters.minScore !== undefined) searchParams.set('minScore', String(filters.minScore));
      if (filters.maxScore !== undefined) searchParams.set('maxScore', String(filters.maxScore));
      if (filters.sortBy) searchParams.set('sortBy', filters.sortBy);
      if (filters.sortOrder) searchParams.set('sortOrder', filters.sortOrder);

      // Advanced params
      if (filters.createdAtFrom) searchParams.set('createdAtFrom', filters.createdAtFrom);
      if (filters.createdAtTo) searchParams.set('createdAtTo', filters.createdAtTo);
      if (filters.updatedAtFrom) searchParams.set('updatedAtFrom', filters.updatedAtFrom);
      if (filters.updatedAtTo) searchParams.set('updatedAtTo', filters.updatedAtTo);
      if (filters.hasFollowUp !== undefined) searchParams.set('hasFollowUp', String(filters.hasFollowUp));
      if (filters.followUpOverdue !== undefined) searchParams.set('followUpOverdue', String(filters.followUpOverdue));
      if (filters.tags?.length) searchParams.set('tags', filters.tags.join(','));

      const response = await apiClient.get<LeadsListResponse>(
        `/api/v1/leads?${searchParams.toString()}`
      );
      return response;
    },
    enabled: !!tenant,
  });
}

/**
 * Hook for lead selection state management
 */
export function useLeadSelection() {
  const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set());

  const toggleLead = React.useCallback((leadId: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback((leadIds: string[]) => {
    setSelectedLeads(new Set(leadIds));
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedLeads(new Set());
  }, []);

  const isSelected = React.useCallback(
    (leadId: string) => selectedLeads.has(leadId),
    [selectedLeads]
  );

  return {
    selectedLeads: Array.from(selectedLeads),
    selectedCount: selectedLeads.size,
    toggleLead,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedLeads.size > 0,
  };
}
