// ============================================
// FASE 6.2 — AI Actions Hooks
// React Query hooks for AI workflow actions
// ============================================

import * as React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  executeAIAction,
  generateAISuggestions,
  getAIWorkflowAuditLog,
} from './engine';
import {
  cancelItemsForEntity,
  clearOldItems,
  enqueue,
  getDLQItems,
  getQueueItemsByTenant,
  getQueueStats,
  retryItem,
} from './queue';
import {
  cancelScheduledAction,
  getScheduledActions,
  getSchedulerStats,
  scheduleAIAction,
} from './scheduler';

import type {
  AIActionParams,
  AIActionResult,
  AIQueueItem,
  AIQueuePriority,
  AISuggestion,
  AIWorkflowAction,
} from './types';

// ============================================
// Query Keys
// ============================================

export const aiActionsQueryKeys = {
  all: ['ai-actions'] as const,
  suggestions: (entityType: string, entityId: string) =>
    [...aiActionsQueryKeys.all, 'suggestions', entityType, entityId] as const,
  auditLog: (filters?: Record<string, unknown>) =>
    [...aiActionsQueryKeys.all, 'audit-log', filters] as const,
  queue: (tenantId: string) =>
    [...aiActionsQueryKeys.all, 'queue', tenantId] as const,
  queueStats: () =>
    [...aiActionsQueryKeys.all, 'queue-stats'] as const,
  scheduled: (tenantId: string) =>
    [...aiActionsQueryKeys.all, 'scheduled', tenantId] as const,
  schedulerStats: () =>
    [...aiActionsQueryKeys.all, 'scheduler-stats'] as const,
  dlq: (tenantId?: string) =>
    [...aiActionsQueryKeys.all, 'dlq', tenantId] as const,
};

// ============================================
// AI Suggestions Hooks
// ============================================

interface UseAISuggestionsParams {
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  entityData: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  enabled?: boolean;
}

export function useAISuggestions({
  entityType,
  entityId,
  entityData,
  tenantId,
  userId,
  enabled = true,
}: UseAISuggestionsParams) {
  return useQuery({
    queryKey: aiActionsQueryKeys.suggestions(entityType, entityId),
    queryFn: async () => {
      return generateAISuggestions({
        tenantId,
        entityType,
        entityId,
        entityData,
        userId,
      });
    },
    enabled: enabled && !!entityId && !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useRefreshAISuggestions() {
  const queryClient = useQueryClient();

  return (entityType: string, entityId: string) => {
    return queryClient.invalidateQueries({
      queryKey: aiActionsQueryKeys.suggestions(entityType, entityId),
    });
  };
}

// ============================================
// AI Action Execution Hooks
// ============================================

interface ExecuteAIActionParams {
  action: AIWorkflowAction;
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  entityData: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
}

export function useExecuteAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      entityData,
      tenantId,
      userId,
      workflowId,
      params = {},
    }: ExecuteAIActionParams): Promise<AIActionResult> => {
      return executeAIAction(
        action,
        {
          tenantId,
          entityType,
          entityId,
          entityData,
          userId,
          workflowId,
        },
        params
      );
    },
    onSuccess: (_result, variables) => {
      // Invalidate suggestions after action execution
      void queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.suggestions(variables.entityType, variables.entityId),
      });
      // Invalidate audit log
      void queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.auditLog(),
      });
    },
  });
}

export function useExecuteAIActionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      actions: ExecuteAIActionParams[]
    ): Promise<AIActionResult[]> => {
      const results = await Promise.all(
        actions.map(({
          action,
          entityType,
          entityId,
          entityData,
          tenantId,
          userId,
          workflowId,
          params = {},
        }) =>
          executeAIAction(
            action,
            {
              tenantId,
              entityType,
              entityId,
              entityData,
              userId,
              workflowId,
            },
            params
          )
        )
      );
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.all,
      });
    },
  });
}

// ============================================
// Queue Hooks
// ============================================

interface QueueAIActionParams {
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
  priority?: AIQueuePriority;
  scheduledAt?: string;
}

export function useQueueAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: QueueAIActionParams): Promise<AIQueueItem> => {
      return enqueue({
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        tenantId: params.tenantId,
        userId: params.userId,
        workflowId: params.workflowId,
        params: params.params,
        priority: params.priority,
        scheduledAt: params.scheduledAt,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.queue(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.queueStats(),
      });
    },
  });
}

export function useQueueItems(tenantId: string, options?: {
  status?: AIQueueItem['status'];
  action?: AIWorkflowAction;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: aiActionsQueryKeys.queue(tenantId),
    queryFn: () => getQueueItemsByTenant(tenantId, options),
    enabled: options?.enabled !== false && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}

export function useQueueStats() {
  return useQuery({
    queryKey: aiActionsQueryKeys.queueStats(),
    queryFn: getQueueStats,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 10 * 1000,
  });
}

export function useRetryQueueItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const success = retryItem(itemId);
      if (!success) {
        throw new Error('Failed to retry item');
      }
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.all,
      });
    },
  });
}

export function useCancelQueueItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      tenantId,
    }: {
      entityType: string;
      entityId: string;
      tenantId: string;
    }) => {
      return cancelItemsForEntity(entityType, entityId, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.all,
      });
    },
  });
}

export function useClearOldQueueItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maxAgeMs?: number) => {
      return clearOldItems(maxAgeMs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.all,
      });
    },
  });
}

// ============================================
// Scheduler Hooks
// ============================================

interface ScheduleAIActionParams {
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
  priority?: AIQueuePriority;
  scheduledAt?: Date;
  recurringPattern?: {
    type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
    cronExpression?: string;
    timezone?: string;
  };
  maxExecutions?: number;
}

export function useScheduleAIAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ScheduleAIActionParams) => {
      return scheduleAIAction(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.scheduled(variables.tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.schedulerStats(),
      });
    },
  });
}

export function useScheduledActions(tenantId: string, options?: {
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  action?: AIWorkflowAction;
  entityType?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: aiActionsQueryKeys.scheduled(tenantId),
    queryFn: () => getScheduledActions(tenantId, options),
    enabled: options?.enabled !== false && !!tenantId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });
}

export function useSchedulerStats() {
  return useQuery({
    queryKey: aiActionsQueryKeys.schedulerStats(),
    queryFn: getSchedulerStats,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useCancelScheduledAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const success = cancelScheduledAction(actionId);
      if (!success) {
        throw new Error('Failed to cancel scheduled action');
      }
      return success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.all,
      });
    },
  });
}

// ============================================
// Audit Log Hooks
// ============================================

interface AuditLogFilters {
  tenantId?: string;
  workflowId?: string;
  action?: AIWorkflowAction;
  entityId?: string;
  status?: string;
  limit?: number;
  [key: string]: unknown;
}

export function useAIWorkflowAuditLog(filters?: AuditLogFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiActionsQueryKeys.auditLog(filters as Record<string, unknown> | undefined),
    queryFn: () => getAIWorkflowAuditLog(filters),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
  });
}

export function useRefreshAuditLog() {
  const queryClient = useQueryClient();

  return () => {
    return queryClient.invalidateQueries({
      queryKey: aiActionsQueryKeys.auditLog(),
    });
  };
}

// ============================================
// Dead Letter Queue Hooks
// ============================================

export function useDLQItems(tenantId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiActionsQueryKeys.dlq(tenantId),
    queryFn: () => getDLQItems(tenantId),
    enabled: options?.enabled !== false,
    staleTime: 60 * 1000,
  });
}

// ============================================
// Suggestion Management Hooks
// ============================================

interface ApplySuggestionParams {
  suggestion: AISuggestion;
  entityData: Record<string, unknown>;
  tenantId: string;
  userId?: string;
}

export function useApplySuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestion,
      entityData,
      tenantId,
      userId,
    }: ApplySuggestionParams): Promise<AIActionResult> => {
      return executeAIAction(
        suggestion.action,
        {
          tenantId,
          entityType: suggestion.entityType,
          entityId: suggestion.entityId,
          entityData,
          userId,
        },
        { ...suggestion.suggestedChanges }
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate suggestions
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.suggestions(
          variables.suggestion.entityType,
          variables.suggestion.entityId
        ),
      });
      // Invalidate audit log
      queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.auditLog(),
      });
    },
  });
}

// ============================================
// Combined Status Hook
// ============================================

export function useAIActionsStatus(_tenantId: string) {
  const queueStats = useQueueStats();
  const schedulerStats = useSchedulerStats();

  return {
    queue: queueStats.data,
    scheduler: schedulerStats.data,
    isLoading: queueStats.isLoading || schedulerStats.isLoading,
    isError: queueStats.isError || schedulerStats.isError,
    refetch: () => {
      void queueStats.refetch();
      void schedulerStats.refetch();
    },
  };
}

// ============================================
// Real-time Updates Hook
// ============================================

interface UseAIActionsRealtimeParams {
  tenantId: string;
  _onActionStarted?: (item: AIQueueItem) => void;
  _onActionCompleted?: (item: AIQueueItem, result: AIActionResult) => void;
  _onActionFailed?: (item: AIQueueItem, error: string) => void;
  enabled?: boolean;
}

export function useAIActionsRealtime({
  tenantId,
  _onActionStarted,
  _onActionCompleted,
  _onActionFailed,
  enabled = true,
}: UseAIActionsRealtimeParams) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!enabled) return;

    // In production, this would connect to a WebSocket or SSE endpoint
    // For now, we use polling with the existing hooks
    const interval = setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: aiActionsQueryKeys.queue(tenantId),
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, tenantId, queryClient]);

  // Return current queue items for monitoring
  return useQueueItems(tenantId, { enabled });
}

// ============================================
// Optimistic Updates Hook
// ============================================

export function useOptimisticSuggestionUpdate() {
  const queryClient = useQueryClient();

  const markAsApplied = (entityType: string, entityId: string, suggestionId: string) => {
    queryClient.setQueryData<AISuggestion[]>(
      aiActionsQueryKeys.suggestions(entityType, entityId),
      (old) => {
        if (!old) return old;
        return old.map((s) =>
          s.id === suggestionId ? { ...s, status: 'applied' as const } : s
        );
      }
    );
  };

  const markAsDismissed = (entityType: string, entityId: string, suggestionId: string) => {
    queryClient.setQueryData<AISuggestion[]>(
      aiActionsQueryKeys.suggestions(entityType, entityId),
      (old) => {
        if (!old) return old;
        return old.map((s) =>
          s.id === suggestionId ? { ...s, status: 'dismissed' as const } : s
        );
      }
    );
  };

  return { markAsApplied, markAsDismissed };
}

// ============================================
// Prefetch Hooks
// ============================================

export function usePrefetchAISuggestions() {
  const queryClient = useQueryClient();

  return (params: UseAISuggestionsParams) => {
    return queryClient.prefetchQuery({
      queryKey: aiActionsQueryKeys.suggestions(params.entityType, params.entityId),
      queryFn: () =>
        generateAISuggestions({
          tenantId: params.tenantId,
          entityType: params.entityType,
          entityId: params.entityId,
          entityData: params.entityData,
          userId: params.userId,
        }),
      staleTime: 2 * 60 * 1000,
    });
  };
}
