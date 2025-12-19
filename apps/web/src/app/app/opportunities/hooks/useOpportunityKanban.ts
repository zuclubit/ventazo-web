'use client';

/**
 * useOpportunityKanban Hook
 *
 * Custom hook that provides opportunity Kanban management including:
 * - Pipeline data fetching
 * - Stage movement with optimistic updates
 * - Win/Lost dialog state management
 *
 * Homologated with useKanbanDragDrop patterns from leads.
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  usePipelineManagement,
  useUpdateOpportunityStage,
  opportunityQueryKeys,
  type Opportunity,
  type PipelineColumn,
  type PipelineView,
} from '@/lib/opportunities';

// ============================================
// Types
// ============================================

export interface UseOpportunityKanbanOptions {
  /** Callback when a move is successful */
  onMoveSuccess?: () => void;
  /** Callback when a move fails */
  onMoveError?: (error: Error) => void;
}

export interface UseOpportunityKanbanReturn {
  /** Pipeline columns with opportunities */
  columns: PipelineColumn[];
  /** Whether the pipeline is loading */
  isLoading: boolean;
  /** Whether a move operation is in progress */
  isMoving: boolean;
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
  /** Refetch pipeline data */
  refetchPipeline: () => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useOpportunityKanban(
  options: UseOpportunityKanbanOptions = {}
): UseOpportunityKanbanReturn {
  const { onMoveSuccess, onMoveError } = options;
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

  // Move to stage handler with optimistic update
  const moveToStage = React.useCallback(
    async (opportunityId: string, targetStageId: string) => {
      // Find current column
      const currentColumn = columns.find((col) =>
        col.opportunities.some((opp) => opp.id === opportunityId)
      );

      if (!currentColumn) return;

      // If same stage, do nothing
      if (currentColumn.stage.id === targetStageId) return;

      // Find target stage
      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) return;

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
          const sourceColumn = newColumns.find(
            (c) => c.stage.id === currentColumn.stage.id
          );
          if (sourceColumn) {
            const oppIndex = sourceColumn.opportunities.findIndex(
              (o) => o.id === opportunityId
            );
            if (oppIndex !== -1) {
              [movedOpportunity] = sourceColumn.opportunities.splice(oppIndex, 1);
              // Recalculate totals
              sourceColumn.totalAmount -= movedOpportunity.amount;
              sourceColumn.totalForecast -=
                (movedOpportunity.amount * movedOpportunity.probability) / 100;
            }
          }

          // Add to target column
          if (movedOpportunity) {
            const targetColumn = newColumns.find(
              (c) => c.stage.id === targetStageId
            );
            if (targetColumn) {
              // Update opportunity's stageId and probability
              movedOpportunity = {
                ...movedOpportunity,
                stageId: targetStageId,
                probability: targetStage.probability,
              };
              targetColumn.opportunities.push(movedOpportunity);
              // Recalculate totals
              targetColumn.totalAmount += movedOpportunity.amount;
              targetColumn.totalForecast +=
                (movedOpportunity.amount * movedOpportunity.probability) / 100;
            }
          }

          return { ...old, columns: newColumns };
        }
      );

      // Call API
      try {
        await updateStageMutation.mutateAsync({
          opportunityId,
          data: { stageId: targetStageId },
        });

        toast({
          title: 'Oportunidad movida',
          description: `Movida a "${targetStage.label}" exitosamente.`,
        });

        onMoveSuccess?.();
      } catch (error) {
        // Rollback on error
        queryClient.invalidateQueries({
          queryKey: opportunityQueryKeys.pipelineView(),
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';
        toast({
          title: 'Error',
          description: `No se pudo mover la oportunidad: ${errorMessage}`,
          variant: 'destructive',
        });

        onMoveError?.(
          error instanceof Error ? error : new Error(errorMessage)
        );
      }
    },
    [
      columns,
      stages,
      queryClient,
      updateStageMutation,
      toast,
      onMoveSuccess,
      onMoveError,
    ]
  );

  return {
    columns,
    isLoading,
    isMoving: updateStageMutation.isPending,
    totalOpportunities,
    totalAmount,
    totalForecast,
    wonAmount,
    lostAmount,
    moveToStage,
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
