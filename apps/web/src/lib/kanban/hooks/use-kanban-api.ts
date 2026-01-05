'use client';

/**
 * Kanban API Hooks
 *
 * React Query hooks for Kanban backend operations with:
 * - Optimistic updates
 * - Real-time synchronization
 * - Undo/Redo support
 * - WIP limit enforcement
 *
 * @version 1.0.0
 * @module lib/kanban/hooks/use-kanban-api
 */

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getKanbanBoard,
  getKanbanStageItems,
  moveKanbanItem,
  undoKanbanMove,
  redoKanbanMove,
  getKanbanConfig,
  updateKanbanConfig,
  getKanbanItemHistory,
  getKanbanBoardHistory,
  acquireKanbanLock,
  releaseKanbanLock,
  getKanbanMetrics,
  kanbanKeys,
  type KanbanEntityType,
  type KanbanBoardData,
  type KanbanConfig,
  type KanbanMoveRequest,
  type KanbanMoveResult,
} from '../api';

// ============================================
// Move Item Hook
// ============================================

export interface UseKanbanMoveApiOptions {
  onSuccess?: (result: KanbanMoveResult) => void;
  onError?: (error: Error, request: KanbanMoveRequest) => void;
  onWipWarning?: (wipStatus: NonNullable<KanbanMoveResult['wipStatus']>) => void;
}

export function useKanbanMoveApi(options: UseKanbanMoveApiOptions = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: moveKanbanItem,
    onMutate: async (request) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: kanbanKeys.board(request.entityType),
      });

      // Snapshot previous value for rollback
      const previousBoard = queryClient.getQueryData<KanbanBoardData>(
        kanbanKeys.board(request.entityType)
      );

      return { previousBoard };
    },
    onSuccess: (result, request) => {
      // Notify about WIP warning if applicable
      if (result.wipStatus && result.wipStatus.level !== 'normal') {
        options.onWipWarning?.(result.wipStatus as NonNullable<KanbanMoveResult['wipStatus']>);

        if (result.wipStatus.level === 'warning' || result.wipStatus.level === 'critical') {
          toast({
            title: 'WIP Limit Warning',
            description: `Stage has ${result.wipStatus.current}/${result.wipStatus.limit} items`,
            variant: 'default',
          });
        }
      }

      options.onSuccess?.(result);
    },
    onError: (error, request, context) => {
      // Rollback optimistic update
      if (context?.previousBoard) {
        queryClient.setQueryData(
          kanbanKeys.board(request.entityType),
          context.previousBoard
        );
      }

      const err = error as Error & { code?: string };
      let title = 'Move Failed';
      let description = err.message;

      if (err.code === 'WIP_LIMIT_EXCEEDED') {
        title = 'WIP Limit Reached';
        description = 'This stage has reached its maximum capacity';
      } else if (err.code === 'TRANSITION_BLOCKED') {
        title = 'Move Not Allowed';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });

      options.onError?.(error as Error, request);
    },
    onSettled: (_, __, request) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.board(request.entityType),
      });
    },
  });
}

// ============================================
// Undo/Redo API Hooks
// ============================================

export function useKanbanUndoApi(entityType: KanbanEntityType) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (moveId?: string) => undoKanbanMove(entityType, moveId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.board(entityType),
      });

      toast({
        title: 'Move Undone',
        description: 'Item moved back to previous stage',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Undo Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useKanbanRedoApi(entityType: KanbanEntityType) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (moveId?: string) => redoKanbanMove(entityType, moveId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: kanbanKeys.board(entityType),
      });

      toast({
        title: 'Move Redone',
        description: 'Item moved back to target stage',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Redo Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// Configuration API Hook
// ============================================

export function useKanbanConfigApi(entityType: KanbanEntityType) {
  return useQuery({
    queryKey: kanbanKeys.config(entityType),
    queryFn: () => getKanbanConfig(entityType),
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useUpdateKanbanConfigApi(entityType: KanbanEntityType) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ updates, version }: { updates: Partial<KanbanConfig>; version: number }) =>
      updateKanbanConfig(entityType, updates, version),
    onSuccess: (newConfig) => {
      queryClient.setQueryData(kanbanKeys.config(entityType), newConfig);

      toast({
        title: 'Configuration Updated',
        description: 'Kanban settings have been saved',
      });
    },
    onError: (error: Error & { code?: string }) => {
      let title = 'Update Failed';
      let description = error.message;

      if (error.code === 'VERSION_CONFLICT') {
        title = 'Conflict Detected';
        description = 'Another user modified the configuration. Please refresh and try again.';
      }

      toast({
        title,
        description,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// History API Hooks
// ============================================

export function useKanbanItemHistoryApi(
  entityType: KanbanEntityType,
  entityId: string,
  options: { limit?: number; offset?: number; enabled?: boolean } = {}
) {
  const { limit = 50, offset = 0, enabled = true } = options;

  return useQuery({
    queryKey: [...kanbanKeys.history(entityType, entityId), { limit, offset }],
    queryFn: () => getKanbanItemHistory(entityType, entityId, { limit, offset }),
    enabled,
    staleTime: 60_000, // 1 minute
  });
}

export function useKanbanBoardHistoryApi(
  entityType: KanbanEntityType,
  options: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    enabled?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, startDate, endDate, enabled = true } = options;

  return useQuery({
    queryKey: [...kanbanKeys.history(entityType), { limit, offset, startDate, endDate }],
    queryFn: () => getKanbanBoardHistory(entityType, { limit, offset, startDate, endDate }),
    enabled,
    staleTime: 60_000,
  });
}

// ============================================
// Lock API Hook
// ============================================

export function useKanbanLockApi(entityType: KanbanEntityType, entityId: string) {
  const [lockId, setLockId] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<Date | null>(null);

  const acquire = useMutation({
    mutationFn: (ttlSeconds?: number) =>
      acquireKanbanLock(entityType, entityId, ttlSeconds),
    onSuccess: (result) => {
      setLockId(result.lockId);
      setExpiresAt(new Date(result.expiresAt));
    },
  });

  const release = useMutation({
    mutationFn: () => releaseKanbanLock(entityType, entityId),
    onSuccess: () => {
      setLockId(null);
      setExpiresAt(null);
    },
  });

  // Auto-release on unmount
  React.useEffect(() => {
    return () => {
      if (lockId) {
        releaseKanbanLock(entityType, entityId).catch(() => {
          // Ignore errors on cleanup
        });
      }
    };
  }, [entityType, entityId, lockId]);

  return {
    lockId,
    expiresAt,
    isLocked: !!lockId,
    acquire: acquire.mutate,
    release: release.mutate,
    isAcquiring: acquire.isPending,
    isReleasing: release.isPending,
    acquireError: acquire.error,
  };
}

// ============================================
// Metrics API Hook
// ============================================

export function useKanbanMetricsApi(
  entityType: KanbanEntityType,
  options: {
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    stageIds?: string[];
    enabled?: boolean;
  }
) {
  const { periodType, startDate, endDate, stageIds, enabled = true } = options;

  return useQuery({
    queryKey: [...kanbanKeys.metrics(entityType), { periodType, startDate, endDate, stageIds }],
    queryFn: () =>
      getKanbanMetrics(entityType, { periodType, startDate, endDate, stageIds }),
    enabled,
    staleTime: 5 * 60_000, // 5 minutes
  });
}
