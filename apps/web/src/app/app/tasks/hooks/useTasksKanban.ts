'use client';

/**
 * useTasksKanban Hook - v1.0
 *
 * Custom hook for task Kanban management:
 * - Fetches all tasks and groups by status
 * - Status movement with optimistic updates
 * - Per-task loading states
 * - Undo capability for recent moves
 *
 * Architecture mirrors useLeadsKanban for consistency.
 *
 * @version 1.0.0
 * @module hooks/useTasksKanban
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  useTasks,
  useUpdateTask,
  useCompleteTask,
  useCancelTask,
  taskQueryKeys,
} from '@/lib/tasks/hooks';
import {
  type Task,
  type TaskStatus,
  type TaskKanbanColumn,
  type TaskKanbanTransitionValidation,
  TASK_KANBAN_STAGES,
  groupTasksByStatus,
  validateTaskTransition,
} from '@/lib/tasks/types';

// ============================================
// Constants
// ============================================

/** Maximum retry attempts for failed moves */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

/** Time window for undo capability (ms) */
const UNDO_WINDOW_MS = 5000;

// ============================================
// Types
// ============================================

export interface UseTasksKanbanOptions {
  /** Callback when a move is successful */
  onMoveSuccess?: (taskId: string, targetStatus: TaskStatus) => void;
  /** Callback when a move fails */
  onMoveError?: (error: Error, taskId: string) => void;
  /** Callback when trying to move to completed */
  onCompletedAttempt?: (task: Task) => void;
  /** Callback when trying to move to cancelled */
  onCancelledAttempt?: (task: Task) => void;
  /** Enable undo capability for recent moves */
  enableUndo?: boolean;
  /** Include completed tasks in the board */
  includeCompleted?: boolean;
}

export interface UseTasksKanbanReturn {
  /** Kanban columns with tasks */
  columns: TaskKanbanColumn[];
  /** Whether the board is loading */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether any move operation is in progress */
  isMoving: boolean;
  /** Set of task IDs currently being moved */
  movingTaskIds: Set<string>;
  /** Check if a specific task is being moved */
  isTaskMoving: (taskId: string) => boolean;
  /** Total tasks count */
  totalTasks: number;
  /** Move task to a new status */
  moveToStatus: (taskId: string, status: TaskStatus) => void;
  /** Validate if a status transition is allowed */
  canMoveToStatus: (taskId: string, targetStatus: TaskStatus) => TaskKanbanTransitionValidation;
  /** Undo last move (if within undo window) */
  undoLastMove: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Refetch tasks data */
  refetchTasks: () => void;
}

interface UndoState {
  taskId: string;
  sourceStatus: TaskStatus;
  targetStatus: TaskStatus;
  timestamp: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate delay for exponential backoff
 */
function getRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * Wait for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Hook Implementation
// ============================================

export function useTasksKanban(
  options: UseTasksKanbanOptions = {}
): UseTasksKanbanReturn {
  const {
    onMoveSuccess,
    onMoveError,
    onCompletedAttempt,
    onCancelledAttempt,
    enableUndo = true,
    includeCompleted = true,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all tasks (we'll group them client-side)
  // Backend max limit is 100
  // TODO: Implement pagination if tasks exceed 100
  const {
    data: tasksData,
    isLoading,
    error,
    refetch: refetchTasks,
  } = useTasks({
    includeCompleted,
    limit: 100, // Backend max is 100
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  // Mutations
  const updateTaskMutation = useUpdateTask();
  const completeTaskMutation = useCompleteTask();
  const cancelTaskMutation = useCancelTask();

  // Per-task loading states
  const [movingIds, setMovingIds] = React.useState<Set<string>>(new Set());

  // Undo state
  const [undoState, setUndoState] = React.useState<UndoState | null>(null);

  // Group tasks into columns
  const columns = React.useMemo(() => {
    const tasks = tasksData?.data ?? [];
    return groupTasksByStatus(tasks);
  }, [tasksData?.data]);

  const totalTasks = tasksData?.meta?.total ?? 0;

  // Clear undo state after window expires
  React.useEffect(() => {
    if (!undoState) return;

    const timeout = setTimeout(() => {
      setUndoState(null);
    }, UNDO_WINDOW_MS);

    return () => clearTimeout(timeout);
  }, [undoState]);

  // Find task by ID
  const findTaskById = React.useCallback(
    (taskId: string): Task | undefined => {
      for (const column of columns) {
        const found = column.tasks.find((task) => task.id === taskId);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  // Validate status transition
  const canMoveToStatus = React.useCallback(
    (taskId: string, targetStatus: TaskStatus): TaskKanbanTransitionValidation => {
      const task = findTaskById(taskId);
      return validateTaskTransition(task, targetStatus);
    },
    [findTaskById]
  );

  // Check if a specific task is being moved
  const isTaskMoving = React.useCallback(
    (taskId: string): boolean => {
      return movingIds.has(taskId);
    },
    [movingIds]
  );

  // Move to status with retry logic
  const moveToStatusWithRetry = React.useCallback(
    async (
      taskId: string,
      targetStatus: TaskStatus,
      attempt: number = 0
    ): Promise<void> => {
      try {
        if (targetStatus === 'completed') {
          await completeTaskMutation.mutateAsync({ taskId });
        } else if (targetStatus === 'cancelled') {
          await cancelTaskMutation.mutateAsync({ taskId });
        } else {
          await updateTaskMutation.mutateAsync({
            taskId,
            data: { status: targetStatus },
          });
        }
      } catch (error) {
        // Check if we should retry
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          await wait(delay);
          return moveToStatusWithRetry(taskId, targetStatus, attempt + 1);
        }
        throw error;
      }
    },
    [updateTaskMutation, completeTaskMutation, cancelTaskMutation]
  );

  // Move to status handler with optimistic update
  const moveToStatus = React.useCallback(
    async (taskId: string, targetStatus: TaskStatus) => {
      const task = findTaskById(taskId);
      if (!task) return;

      // If same status, do nothing
      if (task.status === targetStatus) return;

      // Validate transition
      const validation = canMoveToStatus(taskId, targetStatus);

      // If not allowed and has a suggested action
      if (!validation.allowed && validation.suggestedAction === 'already_there') {
        return;
      }

      // For completed/cancelled, trigger callbacks but still allow move
      if (validation.suggestedAction === 'use_complete_dialog' && onCompletedAttempt) {
        // Optional: trigger callback but continue with move
        // Comment this out if you want to force using the dialog
        // onCompletedAttempt(task);
        // return;
      }

      if (validation.suggestedAction === 'use_cancel_dialog' && onCancelledAttempt) {
        // Optional: trigger callback but continue with move
        // onCancelledAttempt(task);
        // return;
      }

      // Store source for undo
      const sourceStatus = task.status;

      // Mark as moving
      setMovingIds((prev) => new Set(prev).add(taskId));

      // Optimistic update - update the query cache
      const previousData = queryClient.getQueryData(taskQueryKeys.lists());

      queryClient.setQueriesData(
        { queryKey: taskQueryKeys.lists() },
        (old: { data: Task[]; meta: unknown } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((t) =>
              t.id === taskId ? { ...t, status: targetStatus } : t
            ),
          };
        }
      );

      // Call API with retry
      try {
        await moveToStatusWithRetry(taskId, targetStatus);

        // Store undo state
        if (enableUndo) {
          setUndoState({
            taskId,
            sourceStatus,
            targetStatus,
            timestamp: Date.now(),
          });
        }

        const targetStage = TASK_KANBAN_STAGES.find((s) => s.id === targetStatus);
        toast({
          title: 'Tarea movida',
          description: `Movida a "${targetStage?.label ?? targetStatus}" exitosamente.`,
        });

        onMoveSuccess?.(taskId, targetStatus);
      } catch (error) {
        // Rollback on error
        queryClient.setQueriesData(
          { queryKey: taskQueryKeys.lists() },
          () => previousData
        );
        await queryClient.invalidateQueries({
          queryKey: taskQueryKeys.lists(),
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';

        toast({
          title: 'Error al mover tarea',
          description: errorMessage,
          variant: 'destructive',
        });

        onMoveError?.(
          error instanceof Error ? error : new Error(errorMessage),
          taskId
        );
      } finally {
        // Remove from moving set
        setMovingIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [
      findTaskById,
      canMoveToStatus,
      onCompletedAttempt,
      onCancelledAttempt,
      queryClient,
      moveToStatusWithRetry,
      enableUndo,
      toast,
      onMoveSuccess,
      onMoveError,
    ]
  );

  // Undo last move
  const undoLastMove = React.useCallback(async () => {
    if (!undoState) return;

    const { taskId, sourceStatus, timestamp } = undoState;

    // Check if still within undo window
    if (Date.now() - timestamp > UNDO_WINDOW_MS) {
      setUndoState(null);
      toast({
        title: 'No se puede deshacer',
        description: 'El tiempo para deshacer ha expirado.',
        variant: 'destructive',
      });
      return;
    }

    // Clear undo state immediately
    setUndoState(null);

    // Move back to source status
    await moveToStatus(taskId, sourceStatus);

    toast({
      title: 'Movimiento deshecho',
      description: 'La tarea ha sido restaurada a su estado anterior.',
    });
  }, [undoState, moveToStatus, toast]);

  return {
    columns,
    isLoading,
    error: error as Error | null,
    isMoving: updateTaskMutation.isPending || movingIds.size > 0,
    movingTaskIds: movingIds,
    isTaskMoving,
    totalTasks,
    moveToStatus,
    canMoveToStatus,
    undoLastMove,
    canUndo: undoState !== null && Date.now() - undoState.timestamp < UNDO_WINDOW_MS,
    refetchTasks,
  };
}

export default useTasksKanban;
