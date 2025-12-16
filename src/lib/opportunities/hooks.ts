// ============================================
// Opportunities Module Hooks - FASE 5.4
// React Query hooks for opportunity operations
// ============================================

'use client';

import * as React from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  useApiQuery,
  useApiMutation,
} from '@/lib/api';

import type {
  Opportunity,
  OpportunityNote,
  OpportunityPipelineStage,
  OpportunitiesResponse,
  OpportunityNotesResponse,
  OpportunityActivityResponse,
  OpportunityStatistics,
  OpportunityFilters,
  OpportunitySort,
  OpportunityNotesFilters,
  OpportunityActivityFilters,
  CreateOpportunityData,
  UpdateOpportunityData,
  UpdateOpportunityStageData,
  UpdateOpportunityStatusData,
  AssignOpportunityOwnerData,
  WinOpportunityData,
  LoseOpportunityData,
  CreateOpportunityNoteData,
  UpdateOpportunityNoteData,
  CreatePipelineStageData,
  PipelineView,
  ReopenOpportunityData,
  BulkOpportunityAssignRequest,
  BulkOpportunityDeleteRequest,
  BulkOpportunityStatusRequest,
  BulkOpportunityStageRequest,
  BulkOpportunityExportRequest,
  BulkOpportunityOperationResult,
  BulkOpportunityExportResult,
  ForecastSummary,
} from './types';

// ============================================
// Query Keys
// ============================================

export const opportunityQueryKeys = {
  all: ['opportunities'] as const,
  lists: () => [...opportunityQueryKeys.all, 'list'] as const,
  list: (filters?: OpportunityFilters & OpportunitySort & { page?: number; limit?: number }) =>
    [...opportunityQueryKeys.lists(), filters] as const,
  details: () => [...opportunityQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...opportunityQueryKeys.details(), id] as const,
  statistics: () => [...opportunityQueryKeys.all, 'statistics'] as const,
  // Notes
  notes: (opportunityId: string) => [...opportunityQueryKeys.all, opportunityId, 'notes'] as const,
  notesList: (opportunityId: string, filters?: OpportunityNotesFilters & { page?: number; limit?: number }) =>
    [...opportunityQueryKeys.notes(opportunityId), 'list', filters] as const,
  // Activity
  activity: (opportunityId: string) => [...opportunityQueryKeys.all, opportunityId, 'activity'] as const,
  activityList: (opportunityId: string, filters?: OpportunityActivityFilters & { page?: number; limit?: number }) =>
    [...opportunityQueryKeys.activity(opportunityId), 'list', filters] as const,
  // Pipeline
  pipeline: () => [...opportunityQueryKeys.all, 'pipeline'] as const,
  pipelineStages: () => [...opportunityQueryKeys.pipeline(), 'stages'] as const,
  pipelineView: () => [...opportunityQueryKeys.pipeline(), 'view'] as const,
};

// ============================================
// Opportunity List & CRUD Hooks
// ============================================

interface UseOpportunitiesOptions extends OpportunityFilters, OpportunitySort {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

/**
 * Get opportunities list with filters
 */
export function useOpportunities(options: UseOpportunitiesOptions = {}) {
  const { enabled = true, ...filters } = options;
  const queryParams = new URLSearchParams();

  // Build query params
  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.sortBy) queryParams.set('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.set('sortOrder', filters.sortOrder);
  if (filters.searchTerm) queryParams.set('searchTerm', filters.searchTerm);
  if (filters.customerId) queryParams.set('customerId', filters.customerId);
  if (filters.leadId) queryParams.set('leadId', filters.leadId);
  if (filters.contactId) queryParams.set('contactId', filters.contactId);
  if (filters.amountMin !== undefined) queryParams.set('amountMin', String(filters.amountMin));
  if (filters.amountMax !== undefined) queryParams.set('amountMax', String(filters.amountMax));
  if (filters.probabilityMin !== undefined) queryParams.set('probabilityMin', String(filters.probabilityMin));
  if (filters.probabilityMax !== undefined) queryParams.set('probabilityMax', String(filters.probabilityMax));
  if (filters.expectedCloseDateFrom) queryParams.set('expectedCloseDateFrom', filters.expectedCloseDateFrom);
  if (filters.expectedCloseDateTo) queryParams.set('expectedCloseDateTo', filters.expectedCloseDateTo);
  if (filters.createdFrom) queryParams.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) queryParams.set('createdTo', filters.createdTo);

  // Handle array filters
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    statuses.forEach((s) => queryParams.append('status', s));
  }
  if (filters.stageId) {
    const stages = Array.isArray(filters.stageId) ? filters.stageId : [filters.stageId];
    stages.forEach((s) => queryParams.append('stageId', s));
  }
  if (filters.ownerId) {
    const owners = Array.isArray(filters.ownerId) ? filters.ownerId : [filters.ownerId];
    owners.forEach((o) => queryParams.append('ownerId', o));
  }
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    priorities.forEach((p) => queryParams.append('priority', p));
  }
  if (filters.tags) {
    filters.tags.forEach((t) => queryParams.append('tags', t));
  }

  const endpoint = `/api/v1/opportunities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<OpportunitiesResponse>(
    opportunityQueryKeys.list(filters as Record<string, unknown>),
    endpoint,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      enabled,
    }
  );
}

/**
 * Get single opportunity by ID
 */
export function useOpportunity(opportunityId: string) {
  return useApiQuery<Opportunity>(
    opportunityQueryKeys.detail(opportunityId),
    `/api/v1/opportunities/${opportunityId}`,
    {
      enabled: !!opportunityId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Get opportunity statistics
 */
export function useOpportunityStatistics(options?: {
  ownerId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const queryParams = new URLSearchParams();
  if (options?.ownerId) queryParams.set('ownerId', options.ownerId);
  if (options?.dateFrom) queryParams.set('dateFrom', options.dateFrom);
  if (options?.dateTo) queryParams.set('dateTo', options.dateTo);

  const endpoint = `/api/v1/opportunities/statistics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<OpportunityStatistics>(
    opportunityQueryKeys.statistics(),
    endpoint,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Create a new opportunity
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, CreateOpportunityData>(
    async (data, client) => {
      return client.post<Opportunity>('/api/v1/opportunities', data);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Update an opportunity
 */
export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data: UpdateOpportunityData }>(
    async ({ opportunityId, data }, client) => {
      return client.patch<Opportunity>(`/api/v1/opportunities/${opportunityId}`, data);
    },
    {
      onSuccess: (updatedOpportunity) => {
        // Update cache
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Delete an opportunity
 */
export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useApiMutation<void, string>(
    async (opportunityId, client) => {
      return client.delete(`/api/v1/opportunities/${opportunityId}`);
    },
    {
      onSuccess: (_, opportunityId) => {
        queryClient.removeQueries({ queryKey: opportunityQueryKeys.detail(opportunityId) });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

// ============================================
// Stage, Status & Owner Update Hooks
// ============================================

/**
 * Update opportunity stage (for Kanban drag & drop)
 */
export function useUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data: UpdateOpportunityStageData }>(
    async ({ opportunityId, data }, client) => {
      return client.patch<Opportunity>(`/api/v1/opportunities/${opportunityId}/stage`, data);
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

/**
 * Update opportunity status
 */
export function useUpdateOpportunityStatus() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data: UpdateOpportunityStatusData }>(
    async ({ opportunityId, data }, client) => {
      return client.patch<Opportunity>(`/api/v1/opportunities/${opportunityId}/status`, data);
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

/**
 * Assign opportunity owner
 */
export function useAssignOpportunityOwner() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data: AssignOpportunityOwnerData }>(
    async ({ opportunityId, data }, client) => {
      return client.patch<Opportunity>(`/api/v1/opportunities/${opportunityId}/owner`, data);
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

// ============================================
// Win/Lost Hooks
// ============================================

/**
 * Mark opportunity as won
 */
export function useMarkOpportunityWon() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data?: WinOpportunityData }>(
    async ({ opportunityId, data }, client) => {
      return client.post<Opportunity>(`/api/v1/opportunities/${opportunityId}/win`, data ?? {});
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

/**
 * Mark opportunity as lost
 */
export function useMarkOpportunityLost() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data: LoseOpportunityData }>(
    async ({ opportunityId, data }, client) => {
      return client.post<Opportunity>(`/api/v1/opportunities/${opportunityId}/lost`, data);
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

// ============================================
// Opportunity Notes Hooks
// ============================================

interface UseOpportunityNotesOptions extends OpportunityNotesFilters {
  page?: number;
  limit?: number;
}

/**
 * Get opportunity notes
 */
export function useOpportunityNotes(opportunityId: string, options: UseOpportunityNotesOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));
  if (options.isPinned !== undefined) queryParams.set('isPinned', String(options.isPinned));

  const endpoint = `/api/v1/opportunities/${opportunityId}/notes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<OpportunityNotesResponse>(
    opportunityQueryKeys.notesList(opportunityId, options as Record<string, unknown>),
    endpoint,
    {
      enabled: !!opportunityId,
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Add a note to an opportunity
 */
export function useAddOpportunityNote() {
  const queryClient = useQueryClient();

  return useApiMutation<OpportunityNote, { opportunityId: string; data: CreateOpportunityNoteData }>(
    async ({ opportunityId, data }, client) => {
      return client.post<OpportunityNote>(`/api/v1/opportunities/${opportunityId}/notes`, data);
    },
    {
      onSuccess: (_, { opportunityId }) => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.notes(opportunityId) });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(opportunityId) });
      },
    }
  );
}

/**
 * Update an opportunity note
 */
export function useUpdateOpportunityNote() {
  const queryClient = useQueryClient();

  return useApiMutation<OpportunityNote, { opportunityId: string; noteId: string; data: UpdateOpportunityNoteData }>(
    async ({ opportunityId, noteId, data }, client) => {
      return client.patch<OpportunityNote>(`/api/v1/opportunities/${opportunityId}/notes/${noteId}`, data);
    },
    {
      onSuccess: (_, { opportunityId }) => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.notes(opportunityId) });
      },
    }
  );
}

/**
 * Delete an opportunity note
 */
export function useDeleteOpportunityNote() {
  const queryClient = useQueryClient();

  return useApiMutation<void, { opportunityId: string; noteId: string }>(
    async ({ opportunityId, noteId }, client) => {
      return client.delete(`/api/v1/opportunities/${opportunityId}/notes/${noteId}`);
    },
    {
      onSuccess: (_, { opportunityId }) => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.notes(opportunityId) });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(opportunityId) });
      },
    }
  );
}

// ============================================
// Opportunity Activity Hooks
// ============================================

interface UseOpportunityActivityOptions extends OpportunityActivityFilters {
  page?: number;
  limit?: number;
}

/**
 * Get opportunity activity log
 */
export function useOpportunityActivity(opportunityId: string, options: UseOpportunityActivityOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set('page', String(options.page));
  if (options.limit) queryParams.set('limit', String(options.limit));
  if (options.actionType) queryParams.set('actionType', options.actionType);
  if (options.startDate) queryParams.set('startDate', options.startDate);
  if (options.endDate) queryParams.set('endDate', options.endDate);

  const endpoint = `/api/v1/opportunities/${opportunityId}/activity${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<OpportunityActivityResponse>(
    opportunityQueryKeys.activityList(opportunityId, options as Record<string, unknown>),
    endpoint,
    {
      enabled: !!opportunityId,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
}

// ============================================
// Pipeline Hooks
// ============================================

/**
 * Get pipeline stages
 */
export function usePipelineStages() {
  return useApiQuery<OpportunityPipelineStage[]>(
    opportunityQueryKeys.pipelineStages(),
    '/api/v1/opportunities/pipeline/stages',
    {
      staleTime: 10 * 60 * 1000, // 10 minutes (stages don't change often)
    }
  );
}

/**
 * Get pipeline view (Kanban)
 */
export function usePipelineView() {
  return useApiQuery<PipelineView>(
    opportunityQueryKeys.pipelineView(),
    '/api/v1/opportunities/pipeline/view',
    {
      staleTime: 60 * 1000, // 1 minute
    }
  );
}

/**
 * Create a new pipeline stage
 */
export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useApiMutation<OpportunityPipelineStage, CreatePipelineStageData>(
    async (data, client) => {
      return client.post<OpportunityPipelineStage>('/api/v1/opportunities/pipeline/stages', data);
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineStages() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

// ============================================
// Combined Hooks
// ============================================

/**
 * Hook that provides opportunity detail with notes and activity
 */
export function useOpportunityDetail(opportunityId: string) {
  const opportunity = useOpportunity(opportunityId);
  const notes = useOpportunityNotes(opportunityId, { limit: 5 });
  const activity = useOpportunityActivity(opportunityId, { limit: 10 });
  const stages = usePipelineStages();

  return {
    // Opportunity data
    opportunity: opportunity.data,
    isOpportunityLoading: opportunity.isLoading,
    opportunityError: opportunity.error,

    // Notes
    notes: notes.data?.data ?? [],
    isNotesLoading: notes.isLoading,

    // Activity
    activity: activity.data?.data ?? [],
    isActivityLoading: activity.isLoading,

    // Stages
    stages: stages.data ?? [],
    isStagesLoading: stages.isLoading,

    // Combined loading
    isLoading: opportunity.isLoading || notes.isLoading || activity.isLoading,

    // Refresh
    refetchOpportunity: opportunity.refetch,
    refetchNotes: notes.refetch,
    refetchActivity: activity.refetch,
  };
}

/**
 * Hook that provides opportunity list management
 */
export function useOpportunityManagement(options: UseOpportunitiesOptions = {}) {
  const opportunities = useOpportunities(options);
  const statistics = useOpportunityStatistics();
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();
  const deleteOpportunity = useDeleteOpportunity();

  return {
    // Data
    opportunities: opportunities.data?.data ?? [],
    meta: opportunities.data?.meta,
    statistics: statistics.data,

    // Loading states
    isLoading: opportunities.isLoading,
    isStatisticsLoading: statistics.isLoading,

    // Errors
    opportunitiesError: opportunities.error,
    statisticsError: statistics.error,

    // Mutations
    createOpportunity: createOpportunity.mutate,
    createOpportunityAsync: createOpportunity.mutateAsync,
    isCreating: createOpportunity.isPending,

    updateOpportunity: updateOpportunity.mutate,
    updateOpportunityAsync: updateOpportunity.mutateAsync,
    isUpdating: updateOpportunity.isPending,

    deleteOpportunity: deleteOpportunity.mutate,
    deleteOpportunityAsync: deleteOpportunity.mutateAsync,
    isDeleting: deleteOpportunity.isPending,

    // Refresh
    refetchOpportunities: opportunities.refetch,
    refetchStatistics: statistics.refetch,
  };
}

/**
 * Hook that provides opportunity notes management
 */
export function useOpportunityNotesManagement(opportunityId: string) {
  const notes = useOpportunityNotes(opportunityId);
  const addNote = useAddOpportunityNote();
  const updateNote = useUpdateOpportunityNote();
  const deleteNote = useDeleteOpportunityNote();

  return {
    // Data
    notes: notes.data?.data ?? [],
    meta: notes.data?.meta,

    // Loading states
    isLoading: notes.isLoading,

    // Mutations
    addNote: (data: CreateOpportunityNoteData) => addNote.mutate({ opportunityId, data }),
    addNoteAsync: (data: CreateOpportunityNoteData) => addNote.mutateAsync({ opportunityId, data }),
    isAdding: addNote.isPending,

    updateNote: (noteId: string, data: UpdateOpportunityNoteData) =>
      updateNote.mutate({ opportunityId, noteId, data }),
    updateNoteAsync: (noteId: string, data: UpdateOpportunityNoteData) =>
      updateNote.mutateAsync({ opportunityId, noteId, data }),
    isUpdatingNote: updateNote.isPending,

    deleteNote: (noteId: string) => deleteNote.mutate({ opportunityId, noteId }),
    deleteNoteAsync: (noteId: string) => deleteNote.mutateAsync({ opportunityId, noteId }),
    isDeletingNote: deleteNote.isPending,

    // Refresh
    refetchNotes: notes.refetch,
  };
}

/**
 * Hook that provides pipeline management for Kanban view
 */
export function usePipelineManagement() {
  const pipelineView = usePipelineView();
  const stages = usePipelineStages();
  const updateStage = useUpdateOpportunityStage();
  const updateStatus = useUpdateOpportunityStatus();
  const markWon = useMarkOpportunityWon();
  const markLost = useMarkOpportunityLost();

  return {
    // Data
    columns: pipelineView.data?.columns ?? [],
    stages: stages.data ?? [],
    totalOpportunities: pipelineView.data?.totalOpportunities ?? 0,
    totalAmount: pipelineView.data?.totalAmount ?? 0,
    totalForecast: pipelineView.data?.totalForecast ?? 0,
    wonAmount: pipelineView.data?.wonAmount ?? 0,
    lostAmount: pipelineView.data?.lostAmount ?? 0,

    // Loading states
    isLoading: pipelineView.isLoading || stages.isLoading,

    // Mutations
    moveToStage: (opportunityId: string, stageId: string) =>
      updateStage.mutate({ opportunityId, data: { stageId } }),
    moveToStageAsync: (opportunityId: string, stageId: string) =>
      updateStage.mutateAsync({ opportunityId, data: { stageId } }),
    isMoving: updateStage.isPending,

    markAsWon: (opportunityId: string, data?: WinOpportunityData) =>
      markWon.mutate({ opportunityId, data }),
    markAsWonAsync: (opportunityId: string, data?: WinOpportunityData) =>
      markWon.mutateAsync({ opportunityId, data }),
    isMarkingWon: markWon.isPending,

    markAsLost: (opportunityId: string, data: LoseOpportunityData) =>
      markLost.mutate({ opportunityId, data }),
    markAsLostAsync: (opportunityId: string, data: LoseOpportunityData) =>
      markLost.mutateAsync({ opportunityId, data }),
    isMarkingLost: markLost.isPending,

    updateStatus: (opportunityId: string, data: UpdateOpportunityStatusData) =>
      updateStatus.mutate({ opportunityId, data }),
    updateStatusAsync: (opportunityId: string, data: UpdateOpportunityStatusData) =>
      updateStatus.mutateAsync({ opportunityId, data }),
    isUpdatingStatus: updateStatus.isPending,

    // Refresh
    refetchPipeline: pipelineView.refetch,
    refetchStages: stages.refetch,
  };
}

// ============================================
// Reopen Opportunity - FASE 5.10
// ============================================

/**
 * Reopen a closed (won/lost) opportunity
 */
export function useReopenOpportunity() {
  const queryClient = useQueryClient();

  return useApiMutation<Opportunity, { opportunityId: string; data?: ReopenOpportunityData }>(
    async ({ opportunityId, data }, client) => {
      return client.post<Opportunity>(`/api/v1/opportunities/${opportunityId}/reopen`, data ?? {});
    },
    {
      onSuccess: (updatedOpportunity) => {
        queryClient.setQueryData(opportunityQueryKeys.detail(updatedOpportunity.id), updatedOpportunity);
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.activity(updatedOpportunity.id) });
      },
    }
  );
}

// ============================================
// Bulk Operations - FASE 5.10
// ============================================

/**
 * Bulk assign opportunities to an owner
 */
export function useBulkAssignOpportunities() {
  const queryClient = useQueryClient();

  return useApiMutation<BulkOpportunityOperationResult, Omit<BulkOpportunityAssignRequest, 'operation'>>(
    async (data, client) => {
      return client.post<BulkOpportunityOperationResult>('/api/v1/opportunities/bulk/assign', {
        ...data,
        operation: 'assign',
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Bulk delete opportunities
 */
export function useBulkDeleteOpportunities() {
  const queryClient = useQueryClient();

  return useApiMutation<BulkOpportunityOperationResult, Omit<BulkOpportunityDeleteRequest, 'operation'>>(
    async (data, client) => {
      return client.post<BulkOpportunityOperationResult>('/api/v1/opportunities/bulk/delete', {
        ...data,
        operation: 'delete',
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Bulk update opportunity status
 */
export function useBulkUpdateOpportunityStatus() {
  const queryClient = useQueryClient();

  return useApiMutation<BulkOpportunityOperationResult, Omit<BulkOpportunityStatusRequest, 'operation'>>(
    async (data, client) => {
      return client.post<BulkOpportunityOperationResult>('/api/v1/opportunities/bulk/status', {
        ...data,
        operation: 'status',
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.statistics() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Bulk update opportunity stage
 */
export function useBulkUpdateOpportunityStage() {
  const queryClient = useQueryClient();

  return useApiMutation<BulkOpportunityOperationResult, Omit<BulkOpportunityStageRequest, 'operation'>>(
    async (data, client) => {
      return client.post<BulkOpportunityOperationResult>('/api/v1/opportunities/bulk/stage', {
        ...data,
        operation: 'stage',
      });
    },
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.lists() });
        void queryClient.invalidateQueries({ queryKey: opportunityQueryKeys.pipelineView() });
      },
    }
  );
}

/**
 * Bulk export opportunities
 */
export function useBulkExportOpportunities() {
  return useApiMutation<BulkOpportunityExportResult, Omit<BulkOpportunityExportRequest, 'operation'>>(
    async (data, client) => {
      return client.post<BulkOpportunityExportResult>('/api/v1/opportunities/bulk/export', {
        ...data,
        operation: 'export',
      });
    }
  );
}

/**
 * Combined hook for bulk opportunity operations
 */
export function useBulkOpportunityOperations() {
  const bulkAssign = useBulkAssignOpportunities();
  const bulkDelete = useBulkDeleteOpportunities();
  const bulkStatus = useBulkUpdateOpportunityStatus();
  const bulkStage = useBulkUpdateOpportunityStage();
  const bulkExport = useBulkExportOpportunities();

  const isLoading =
    bulkAssign.isPending ||
    bulkDelete.isPending ||
    bulkStatus.isPending ||
    bulkStage.isPending ||
    bulkExport.isPending;

  return {
    assign: bulkAssign.mutateAsync,
    delete: bulkDelete.mutateAsync,
    updateStatus: bulkStatus.mutateAsync,
    updateStage: bulkStage.mutateAsync,
    export: bulkExport.mutateAsync,
    isLoading,
    assignState: bulkAssign,
    deleteState: bulkDelete,
    statusState: bulkStatus,
    stageState: bulkStage,
    exportState: bulkExport,
  };
}

// ============================================
// Opportunity Selection Hook - FASE 5.10
// ============================================

/**
 * Hook for opportunity selection state management
 */
export function useOpportunitySelection() {
  const [selectedOpportunities, setSelectedOpportunities] = React.useState<Set<string>>(new Set());

  const toggleOpportunity = React.useCallback((opportunityId: string) => {
    setSelectedOpportunities((prev) => {
      const next = new Set(prev);
      if (next.has(opportunityId)) {
        next.delete(opportunityId);
      } else {
        next.add(opportunityId);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback((opportunityIds: string[]) => {
    setSelectedOpportunities(new Set(opportunityIds));
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedOpportunities(new Set());
  }, []);

  const isSelected = React.useCallback(
    (opportunityId: string) => selectedOpportunities.has(opportunityId),
    [selectedOpportunities]
  );

  return {
    selectedOpportunities: Array.from(selectedOpportunities),
    selectedCount: selectedOpportunities.size,
    toggleOpportunity,
    selectAll,
    clearSelection,
    isSelected,
    hasSelection: selectedOpportunities.size > 0,
  };
}

// ============================================
// Forecast Hooks - FASE 5.10
// ============================================

/**
 * Get forecast summary for opportunities
 */
export function useOpportunityForecast(options?: {
  period?: 'monthly' | 'quarterly' | 'yearly';
  ownerId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const queryParams = new URLSearchParams();
  if (options?.period) queryParams.set('period', options.period);
  if (options?.ownerId) queryParams.set('ownerId', options.ownerId);
  if (options?.startDate) queryParams.set('startDate', options.startDate);
  if (options?.endDate) queryParams.set('endDate', options.endDate);

  const endpoint = `/api/v1/opportunities/forecast${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  return useApiQuery<ForecastSummary>(
    [...opportunityQueryKeys.all, 'forecast', options],
    endpoint,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
}

/**
 * Combined hook for forecast management
 */
export function useForecastManagement(options?: {
  period?: 'monthly' | 'quarterly' | 'yearly';
  ownerId?: string;
}) {
  const forecast = useOpportunityForecast(options);
  const statistics = useOpportunityStatistics();

  return {
    // Forecast data
    forecast: forecast.data,
    currentPeriod: forecast.data?.currentPeriod,
    previousPeriod: forecast.data?.previousPeriod,
    trend: forecast.data?.trend ?? 'stable',
    changePercentage: forecast.data?.changePercentage ?? 0,
    byOwner: forecast.data?.byOwner ?? [],
    byStage: forecast.data?.byStage ?? [],

    // Statistics
    statistics: statistics.data,
    winRate: statistics.data?.winRate ?? 0,
    averageDealSize: statistics.data?.averageDealSize ?? 0,
    averageSalesCycle: statistics.data?.averageSalesCycle ?? 0,

    // Loading states
    isForecastLoading: forecast.isLoading,
    isStatisticsLoading: statistics.isLoading,
    isLoading: forecast.isLoading || statistics.isLoading,

    // Errors
    forecastError: forecast.error,
    statisticsError: statistics.error,

    // Refresh
    refetchForecast: forecast.refetch,
    refetchStatistics: statistics.refetch,
  };
}
