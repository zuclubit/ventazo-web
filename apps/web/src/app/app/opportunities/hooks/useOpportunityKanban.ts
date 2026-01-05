'use client';

/**
 * useOpportunityKanban Hook
 *
 * Enhanced custom hook for opportunity Kanban management:
 * - Pipeline data fetching with proper state management
 * - Stage movement with optimistic updates and validation
 * - Stage transition validation (open → open only, won/lost via dialogs)
 * - Per-opportunity loading states
 * - Retry logic with exponential backoff
 * - Win/Lost dialog state management
 * - Undo capability for recent moves
 *
 * Clean Architecture: Frontend presentation logic only.
 * Backend handles business rules validation.
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  usePipelineManagement,
  useUpdateOpportunityStage,
  opportunityQueryKeys,
  type Opportunity,
  type OpportunityPipelineStage,
  type PipelineColumn,
  type PipelineView,
  type OpportunityStageType,
} from '@/lib/opportunities';

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

export interface UseOpportunityKanbanOptions {
  /** Callback when a move is successful */
  onMoveSuccess?: (opportunityId: string, targetStageId: string) => void;
  /** Callback when a move fails */
  onMoveError?: (error: Error, opportunityId: string) => void;
  /** Callback when trying to move to a terminal stage (won/lost) */
  onTerminalStageAttempt?: (opportunity: Opportunity, stageType: OpportunityStageType) => void;
  /** Enable undo capability for recent moves */
  enableUndo?: boolean;
}

export interface UseOpportunityKanbanReturn {
  /** Pipeline columns with opportunities */
  columns: PipelineColumn[];
  /** Pipeline stages for reference */
  stages: OpportunityPipelineStage[];
  /** Whether the pipeline is loading */
  isLoading: boolean;
  /** Whether any move operation is in progress */
  isMoving: boolean;
  /** Set of opportunity IDs currently being moved */
  movingOpportunityIds: Set<string>;
  /** Check if a specific opportunity is being moved */
  isOpportunityMoving: (opportunityId: string) => boolean;
  /** Total opportunities count */
  totalOpportunities: number;
  /** Total amount in pipeline */
  totalAmount: number;
  /** Weighted forecast total */
  totalForecast: number;
  /** Total won amount */
  wonAmount: number;
  /** Total lost amount */
  lostAmount: number;
  /** Move opportunity to a new stage */
  moveToStage: (opportunityId: string, stageId: string) => void;
  /** Validate if a stage transition is allowed (frontend validation) */
  canMoveToStage: (opportunityId: string, targetStageId: string) => StageTransitionValidation;
  /** Get validation message for a stage transition */
  getTransitionMessage: (opportunityId: string, targetStageId: string) => string | null;
  /** Undo last move (if within undo window) */
  undoLastMove: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Refetch pipeline data */
  refetchPipeline: () => void;
}

export interface StageTransitionValidation {
  /** Whether the transition is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Suggested action if not allowed */
  suggestedAction?: 'use_win_dialog' | 'use_lost_dialog' | 'reopen_first';
}

interface UndoState {
  opportunityId: string;
  sourceStageId: string;
  targetStageId: string;
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

/**
 * Validate stage transition rules
 *
 * Business Rules:
 * - open stages can freely move between each other
 * - Cannot drag to won/lost stages (must use dialogs)
 * - Won/lost opportunities cannot be moved (must reopen first)
 */
function validateStageTransition(
  opportunity: Opportunity | undefined,
  sourceStage: OpportunityPipelineStage | undefined,
  targetStage: OpportunityPipelineStage | undefined
): StageTransitionValidation {
  if (!opportunity || !sourceStage || !targetStage) {
    return { allowed: false, reason: 'Datos incompletos para validar transición' };
  }

  // Same stage - no move needed
  if (sourceStage.id === targetStage.id) {
    return { allowed: false, reason: 'La oportunidad ya está en esta etapa' };
  }

  // Check if opportunity is in a terminal state (won/lost)
  if (opportunity.status === 'won' || opportunity.status === 'lost') {
    return {
      allowed: false,
      reason: `La oportunidad está ${opportunity.status === 'won' ? 'ganada' : 'perdida'}. Debes reabrirla primero.`,
      suggestedAction: 'reopen_first',
    };
  }

  // Cannot drag to won stage - must use dialog
  if (targetStage.stageType === 'won') {
    return {
      allowed: false,
      reason: 'Usa el botón "Marcar Ganada" para cerrar como ganada',
      suggestedAction: 'use_win_dialog',
    };
  }

  // Cannot drag to lost stage - must use dialog
  if (targetStage.stageType === 'lost') {
    return {
      allowed: false,
      reason: 'Usa el botón "Marcar Perdida" para cerrar como perdida',
      suggestedAction: 'use_lost_dialog',
    };
  }

  // Open-to-open transitions are allowed
  if (sourceStage.stageType === 'open' && targetStage.stageType === 'open') {
    return { allowed: true };
  }

  // Default: allow (backend will validate further)
  return { allowed: true };
}

// ============================================
// Hook Implementation
// ============================================

export function useOpportunityKanban(
  options: UseOpportunityKanbanOptions = {}
): UseOpportunityKanbanReturn {
  const {
    onMoveSuccess,
    onMoveError,
    onTerminalStageAttempt,
    enableUndo = true,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pipeline management hook
  const {
    columns,
    stages,
    totalOpportunities,
    totalAmount,
    totalForecast,
    wonAmount,
    lostAmount,
    isLoading,
    refetchPipeline,
  } = usePipelineManagement();

  // Stage update mutation
  const updateStageMutation = useUpdateOpportunityStage();

  // Per-opportunity loading states
  const [movingIds, setMovingIds] = React.useState<Set<string>>(new Set());

  // Undo state
  const [undoState, setUndoState] = React.useState<UndoState | null>(null);

  // Clear undo state after window expires
  React.useEffect(() => {
    if (!undoState) return;

    const timeout = setTimeout(() => {
      setUndoState(null);
    }, UNDO_WINDOW_MS);

    return () => clearTimeout(timeout);
  }, [undoState]);

  // Find opportunity by ID
  const findOpportunityById = React.useCallback(
    (opportunityId: string): Opportunity | undefined => {
      for (const column of columns) {
        const found = column.opportunities.find((opp) => opp.id === opportunityId);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  // Find stage by ID
  const findStageById = React.useCallback(
    (stageId: string): OpportunityPipelineStage | undefined => {
      return stages.find((s) => s.id === stageId);
    },
    [stages]
  );

  // Find column by opportunity ID
  const findColumnByOpportunityId = React.useCallback(
    (opportunityId: string): PipelineColumn | undefined => {
      return columns.find((column) =>
        column.opportunities.some((opp) => opp.id === opportunityId)
      );
    },
    [columns]
  );

  // Validate stage transition
  const canMoveToStage = React.useCallback(
    (opportunityId: string, targetStageId: string): StageTransitionValidation => {
      const opportunity = findOpportunityById(opportunityId);
      const currentColumn = findColumnByOpportunityId(opportunityId);
      const targetStage = findStageById(targetStageId);

      return validateStageTransition(
        opportunity,
        currentColumn?.stage,
        targetStage
      );
    },
    [findOpportunityById, findColumnByOpportunityId, findStageById]
  );

  // Get transition message
  const getTransitionMessage = React.useCallback(
    (opportunityId: string, targetStageId: string): string | null => {
      const validation = canMoveToStage(opportunityId, targetStageId);
      return validation.allowed ? null : (validation.reason ?? 'Transición no permitida');
    },
    [canMoveToStage]
  );

  // Check if a specific opportunity is being moved
  const isOpportunityMoving = React.useCallback(
    (opportunityId: string): boolean => {
      return movingIds.has(opportunityId);
    },
    [movingIds]
  );

  // Move to stage with retry logic
  const moveToStageWithRetry = React.useCallback(
    async (
      opportunityId: string,
      targetStageId: string,
      attempt: number = 0
    ): Promise<void> => {
      try {
        await updateStageMutation.mutateAsync({
          opportunityId,
          data: { stageId: targetStageId },
        });
      } catch (error) {
        // Check if we should retry
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          await wait(delay);
          return moveToStageWithRetry(opportunityId, targetStageId, attempt + 1);
        }
        throw error;
      }
    },
    [updateStageMutation]
  );

  // Move to stage handler with optimistic update
  const moveToStage = React.useCallback(
    async (opportunityId: string, targetStageId: string) => {
      // Find current column and opportunity
      const currentColumn = findColumnByOpportunityId(opportunityId);
      const opportunity = findOpportunityById(opportunityId);

      if (!currentColumn || !opportunity) return;

      // If same stage, do nothing
      if (currentColumn.stage.id === targetStageId) return;

      // Find target stage
      const targetStage = findStageById(targetStageId);
      if (!targetStage) return;

      // Validate transition
      const validation = canMoveToStage(opportunityId, targetStageId);
      if (!validation.allowed) {
        // If attempting to move to terminal stage, trigger callback
        if (validation.suggestedAction === 'use_win_dialog' || validation.suggestedAction === 'use_lost_dialog') {
          onTerminalStageAttempt?.(opportunity, targetStage.stageType);
        }

        toast({
          title: 'Acción no permitida',
          description: validation.reason,
          variant: 'destructive',
        });
        return;
      }

      // Store source for undo
      const sourceStageId = currentColumn.stage.id;

      // Mark as moving
      setMovingIds((prev) => new Set(prev).add(opportunityId));

      // Optimistic update
      queryClient.setQueryData<PipelineView>(
        opportunityQueryKeys.pipelineView(),
        (old) => {
          if (!old) return old;

          // Deep clone columns
          const newColumns = old.columns.map((column) => ({
            ...column,
            opportunities: [...column.opportunities],
          }));

          // Find and remove opportunity from source column
          let movedOpportunity: Opportunity | undefined;
          const sourceCol = newColumns.find(
            (c) => c.stage.id === currentColumn.stage.id
          );
          if (sourceCol) {
            const oppIndex = sourceCol.opportunities.findIndex(
              (o) => o.id === opportunityId
            );
            if (oppIndex !== -1) {
              [movedOpportunity] = sourceCol.opportunities.splice(oppIndex, 1);
              // Recalculate totals
              if (movedOpportunity) {
                sourceCol.totalAmount -= movedOpportunity.amount;
                sourceCol.totalForecast -=
                  (movedOpportunity.amount * movedOpportunity.probability) / 100;
                sourceCol.count--;
              }
            }
          }

          // Add to target column
          if (movedOpportunity) {
            const targetCol = newColumns.find((c) => c.stage.id === targetStageId);
            if (targetCol) {
              // Update opportunity's stageId and probability
              movedOpportunity = {
                ...movedOpportunity,
                stageId: targetStageId,
                probability: targetStage.probability,
              };
              targetCol.opportunities.push(movedOpportunity);
              // Recalculate totals
              targetCol.totalAmount += movedOpportunity.amount;
              targetCol.totalForecast +=
                (movedOpportunity.amount * movedOpportunity.probability) / 100;
              targetCol.count++;
            }
          }

          return { ...old, columns: newColumns };
        }
      );

      // Call API with retry
      try {
        await moveToStageWithRetry(opportunityId, targetStageId);

        // Store undo state
        if (enableUndo) {
          setUndoState({
            opportunityId,
            sourceStageId,
            targetStageId,
            timestamp: Date.now(),
          });
        }

        toast({
          title: 'Oportunidad movida',
          description: `Movida a "${targetStage.label}" exitosamente.`,
        });

        onMoveSuccess?.(opportunityId, targetStageId);
      } catch (error) {
        // Rollback on error
        await queryClient.invalidateQueries({
          queryKey: opportunityQueryKeys.pipelineView(),
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';

        toast({
          title: 'Error al mover oportunidad',
          description: errorMessage,
          variant: 'destructive',
        });

        onMoveError?.(
          error instanceof Error ? error : new Error(errorMessage),
          opportunityId
        );
      } finally {
        // Remove from moving set
        setMovingIds((prev) => {
          const next = new Set(prev);
          next.delete(opportunityId);
          return next;
        });
      }
    },
    [
      findColumnByOpportunityId,
      findOpportunityById,
      findStageById,
      canMoveToStage,
      onTerminalStageAttempt,
      toast,
      queryClient,
      moveToStageWithRetry,
      enableUndo,
      onMoveSuccess,
      onMoveError,
    ]
  );

  // Undo last move
  const undoLastMove = React.useCallback(async () => {
    if (!undoState) return;

    const { opportunityId, sourceStageId, timestamp } = undoState;

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

    // Move back to source stage
    await moveToStage(opportunityId, sourceStageId);

    toast({
      title: 'Movimiento deshecho',
      description: 'La oportunidad ha sido restaurada a su etapa anterior.',
    });
  }, [undoState, moveToStage, toast]);

  return {
    columns,
    stages,
    isLoading,
    isMoving: updateStageMutation.isPending || movingIds.size > 0,
    movingOpportunityIds: movingIds,
    isOpportunityMoving,
    totalOpportunities,
    totalAmount,
    totalForecast,
    wonAmount,
    lostAmount,
    moveToStage,
    canMoveToStage,
    getTransitionMessage,
    undoLastMove,
    canUndo: undoState !== null && Date.now() - undoState.timestamp < UNDO_WINDOW_MS,
    refetchPipeline,
  };
}

// ============================================
// Win/Lost Dialog State Hook
// ============================================

export interface WinLostDialogState {
  opportunity: Opportunity | null;
  action: 'win' | 'lost';
}

export function useWinLostDialog() {
  const [state, setState] = React.useState<WinLostDialogState | null>(null);

  const openWinDialog = React.useCallback((opportunity: Opportunity) => {
    setState({ opportunity, action: 'win' });
  }, []);

  const openLostDialog = React.useCallback((opportunity: Opportunity) => {
    setState({ opportunity, action: 'lost' });
  }, []);

  const closeDialog = React.useCallback(() => {
    setState(null);
  }, []);

  return {
    isOpen: state !== null,
    opportunity: state?.opportunity ?? null,
    action: state?.action ?? 'win',
    openWinDialog,
    openLostDialog,
    closeDialog,
  };
}

// ============================================
// Opportunity Selection Hook
// ============================================

export function useOpportunitySelection() {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    hasSelection: selectedIds.size > 0,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  };
}
