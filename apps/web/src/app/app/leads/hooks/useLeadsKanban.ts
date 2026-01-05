'use client';

/**
 * useLeadsKanban Hook - v2.0 (Homologated with Opportunities)
 *
 * Enhanced custom hook for lead Kanban management:
 * - Pipeline data fetching with proper state management
 * - Stage movement with optimistic updates and validation
 * - Stage transition validation (won/lost via convert dialog)
 * - Per-lead loading states
 * - Retry logic with exponential backoff
 * - Undo capability for recent moves
 *
 * Architecture mirrors useOpportunityKanban for consistency.
 * Clean Architecture: Frontend presentation logic only.
 * Backend handles business rules validation.
 *
 * @version 2.0.0
 * @module hooks/useLeadsKanban
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  usePipelineView,
  useUpdateLeadStage,
  leadKeys,
  type Lead,
  type PipelineStage,
  type PipelineColumn,
  type PipelineView,
} from '@/lib/leads';

// ============================================
// Constants
// ============================================

/** Maximum retry attempts for failed moves */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

/** Time window for undo capability (ms) */
const UNDO_WINDOW_MS = 5000;

// Terminal stage identifiers (status-based)
const TERMINAL_STATUSES = ['won', 'lost'] as const;

// ============================================
// Types
// ============================================

export interface UseLeadsKanbanOptions {
  /** Callback when a move is successful */
  onMoveSuccess?: (leadId: string, targetStageId: string) => void;
  /** Callback when a move fails */
  onMoveError?: (error: Error, leadId: string) => void;
  /** Callback when trying to move to a terminal stage (won/lost) */
  onTerminalStageAttempt?: (lead: Lead, stageType: 'won' | 'lost') => void;
  /** Enable undo capability for recent moves */
  enableUndo?: boolean;
}

export interface UseLeadsKanbanReturn {
  /** Pipeline columns with leads */
  columns: PipelineColumn[];
  /** Pipeline stages for reference */
  stages: PipelineStage[];
  /** Whether the pipeline is loading */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether any move operation is in progress */
  isMoving: boolean;
  /** Set of lead IDs currently being moved */
  movingLeadIds: Set<string>;
  /** Check if a specific lead is being moved */
  isLeadMoving: (leadId: string) => boolean;
  /** Total leads count */
  totalLeads: number;
  /** Move lead to a new stage */
  moveToStage: (leadId: string, stageId: string) => void;
  /** Validate if a stage transition is allowed (frontend validation) */
  canMoveToStage: (leadId: string, targetStageId: string) => StageTransitionValidation;
  /** Get validation message for a stage transition */
  getTransitionMessage: (leadId: string, targetStageId: string) => string | null;
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
  suggestedAction?: 'use_convert_dialog' | 'reopen_first' | 'already_there';
}

interface UndoState {
  leadId: string;
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
 * Check if a stage is terminal (won/lost)
 */
function isTerminalStage(stage: PipelineStage): boolean {
  const label = stage.label.toLowerCase();
  return label === 'won' || label === 'ganado' || label === 'lost' || label === 'perdido';
}

/**
 * Get terminal stage type
 */
function getTerminalStageType(stage: PipelineStage): 'won' | 'lost' | null {
  const label = stage.label.toLowerCase();
  if (label === 'won' || label === 'ganado') return 'won';
  if (label === 'lost' || label === 'perdido') return 'lost';
  return null;
}

/**
 * Validate stage transition rules
 *
 * Business Rules:
 * - Open stages can freely move between each other
 * - Cannot drag to won/lost stages directly (must use convert dialog)
 * - Won/lost leads cannot be moved (status is final)
 */
function validateStageTransition(
  lead: Lead | undefined,
  sourceStage: PipelineStage | undefined,
  targetStage: PipelineStage | undefined
): StageTransitionValidation {
  if (!lead || !sourceStage || !targetStage) {
    return { allowed: false, reason: 'Datos incompletos para validar transición' };
  }

  // Same stage - no move needed
  if (sourceStage.id === targetStage.id) {
    return {
      allowed: false,
      reason: 'El lead ya está en esta etapa',
      suggestedAction: 'already_there',
    };
  }

  // Check if lead is in a terminal state (won/lost)
  if (lead.status === 'won' || lead.status === 'lost') {
    return {
      allowed: false,
      reason: `El lead está ${lead.status === 'won' ? 'ganado' : 'perdido'}. No se puede mover.`,
      suggestedAction: 'reopen_first',
    };
  }

  // Cannot drag to won/lost stage - must use convert dialog
  if (isTerminalStage(targetStage)) {
    const stageType = getTerminalStageType(targetStage);
    return {
      allowed: false,
      reason: stageType === 'won'
        ? 'Usa el botón "Convertir a Cliente" para marcar como ganado'
        : 'Usa el menú de acciones para marcar como perdido',
      suggestedAction: 'use_convert_dialog',
    };
  }

  // Open-to-open transitions are allowed
  return { allowed: true };
}

// ============================================
// Hook Implementation
// ============================================

export function useLeadsKanban(
  options: UseLeadsKanbanOptions = {}
): UseLeadsKanbanReturn {
  const {
    onMoveSuccess,
    onMoveError,
    onTerminalStageAttempt,
    enableUndo = true,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pipeline data fetch
  const {
    data: pipelineData,
    isLoading,
    error,
    refetch: refetchPipeline,
  } = usePipelineView();

  // Stage update mutation
  const updateStageMutation = useUpdateLeadStage();

  // Per-lead loading states
  const [movingIds, setMovingIds] = React.useState<Set<string>>(new Set());

  // Undo state
  const [undoState, setUndoState] = React.useState<UndoState | null>(null);

  // Extract columns and stages from pipeline data
  const columns = pipelineData?.stages ?? [];
  const stages = React.useMemo(
    () => columns.map((col) => col.stage),
    [columns]
  );
  const totalLeads = pipelineData?.totalLeads ?? 0;

  // Clear undo state after window expires
  React.useEffect(() => {
    if (!undoState) return;

    const timeout = setTimeout(() => {
      setUndoState(null);
    }, UNDO_WINDOW_MS);

    return () => clearTimeout(timeout);
  }, [undoState]);

  // P1-1 Optimization: Build indices for O(1) lookup instead of O(n*m)
  const { leadIndex, columnByLeadId, stageIndex } = React.useMemo(() => {
    const leadMap = new Map<string, Lead>();
    const columnMap = new Map<string, PipelineColumn>();
    const stageMap = new Map<string, PipelineStage>();

    for (const column of columns) {
      stageMap.set(column.stage.id, column.stage);
      for (const lead of column.leads) {
        leadMap.set(lead.id, lead);
        columnMap.set(lead.id, column);
      }
    }

    return { leadIndex: leadMap, columnByLeadId: columnMap, stageIndex: stageMap };
  }, [columns]);

  // Find lead by ID - O(1)
  const findLeadById = React.useCallback(
    (leadId: string): Lead | undefined => leadIndex.get(leadId),
    [leadIndex]
  );

  // Find stage by ID - O(1)
  const findStageById = React.useCallback(
    (stageId: string): PipelineStage | undefined => stageIndex.get(stageId),
    [stageIndex]
  );

  // Find column by lead ID - O(1)
  const findColumnByLeadId = React.useCallback(
    (leadId: string): PipelineColumn | undefined => columnByLeadId.get(leadId),
    [columnByLeadId]
  );

  // Validate stage transition
  const canMoveToStage = React.useCallback(
    (leadId: string, targetStageId: string): StageTransitionValidation => {
      const lead = findLeadById(leadId);
      const currentColumn = findColumnByLeadId(leadId);
      const targetStage = findStageById(targetStageId);

      return validateStageTransition(
        lead,
        currentColumn?.stage,
        targetStage
      );
    },
    [findLeadById, findColumnByLeadId, findStageById]
  );

  // Get transition message
  const getTransitionMessage = React.useCallback(
    (leadId: string, targetStageId: string): string | null => {
      const validation = canMoveToStage(leadId, targetStageId);
      return validation.allowed ? null : (validation.reason ?? 'Transición no permitida');
    },
    [canMoveToStage]
  );

  // Check if a specific lead is being moved
  const isLeadMoving = React.useCallback(
    (leadId: string): boolean => {
      return movingIds.has(leadId);
    },
    [movingIds]
  );

  // Move to stage with retry logic
  const moveToStageWithRetry = React.useCallback(
    async (
      leadId: string,
      targetStageId: string,
      attempt: number = 0
    ): Promise<void> => {
      try {
        await updateStageMutation.mutateAsync({
          leadId,
          stageId: targetStageId,
        });
      } catch (error) {
        // Check if we should retry
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          await wait(delay);
          return moveToStageWithRetry(leadId, targetStageId, attempt + 1);
        }
        throw error;
      }
    },
    [updateStageMutation]
  );

  // Move to stage handler with optimistic update
  const moveToStage = React.useCallback(
    async (leadId: string, targetStageId: string) => {
      // Find current column and lead
      const currentColumn = findColumnByLeadId(leadId);
      const lead = findLeadById(leadId);

      if (!currentColumn || !lead) return;

      // If same stage, do nothing
      if (currentColumn.stage.id === targetStageId) return;

      // Find target stage
      const targetStage = findStageById(targetStageId);
      if (!targetStage) return;

      // Validate transition
      const validation = canMoveToStage(leadId, targetStageId);
      if (!validation.allowed) {
        // If attempting to move to terminal stage, trigger callback
        if (validation.suggestedAction === 'use_convert_dialog') {
          const stageType = getTerminalStageType(targetStage);
          if (stageType) {
            onTerminalStageAttempt?.(lead, stageType);
          }
        }

        // Don't show toast for "already there" - it's obvious
        if (validation.suggestedAction !== 'already_there') {
          toast({
            title: 'Acción no permitida',
            description: validation.reason,
            variant: 'destructive',
          });
        }
        return;
      }

      // Store source for undo
      const sourceStageId = currentColumn.stage.id;

      // Mark as moving
      setMovingIds((prev) => new Set(prev).add(leadId));

      // Optimistic update
      queryClient.setQueryData<PipelineView>(
        leadKeys.pipelineView(),
        (old) => {
          if (!old) return old;

          // Deep clone columns
          const newColumns = old.stages.map((column) => ({
            ...column,
            leads: [...column.leads],
          }));

          // Find and remove lead from source column
          let movedLead: Lead | undefined;
          const sourceCol = newColumns.find(
            (c) => c.stage.id === currentColumn.stage.id
          );
          if (sourceCol) {
            const leadIndex = sourceCol.leads.findIndex(
              (l) => l.id === leadId
            );
            if (leadIndex !== -1) {
              [movedLead] = sourceCol.leads.splice(leadIndex, 1);
              sourceCol.count = sourceCol.leads.length;
            }
          }

          // Add to target column
          if (movedLead) {
            const targetCol = newColumns.find((c) => c.stage.id === targetStageId);
            if (targetCol) {
              // Update lead's stageId
              movedLead = {
                ...movedLead,
                stageId: targetStageId,
              };
              targetCol.leads.push(movedLead);
              targetCol.count = targetCol.leads.length;
            }
          }

          return { ...old, stages: newColumns };
        }
      );

      // Call API with retry
      try {
        await moveToStageWithRetry(leadId, targetStageId);

        // Store undo state
        if (enableUndo) {
          setUndoState({
            leadId,
            sourceStageId,
            targetStageId,
            timestamp: Date.now(),
          });
        }

        toast({
          title: 'Lead movido',
          description: `Movido a "${targetStage.label}" exitosamente.`,
        });

        onMoveSuccess?.(leadId, targetStageId);
      } catch (error) {
        // Rollback on error
        await queryClient.invalidateQueries({
          queryKey: leadKeys.pipelineView(),
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';

        toast({
          title: 'Error al mover lead',
          description: errorMessage,
          variant: 'destructive',
        });

        onMoveError?.(
          error instanceof Error ? error : new Error(errorMessage),
          leadId
        );
      } finally {
        // Remove from moving set
        setMovingIds((prev) => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
      }
    },
    [
      findColumnByLeadId,
      findLeadById,
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

    const { leadId, sourceStageId, timestamp } = undoState;

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
    await moveToStage(leadId, sourceStageId);

    toast({
      title: 'Movimiento deshecho',
      description: 'El lead ha sido restaurado a su etapa anterior.',
    });
  }, [undoState, moveToStage, toast]);

  return {
    columns,
    stages,
    isLoading,
    error: error as Error | null,
    isMoving: updateStageMutation.isPending || movingIds.size > 0,
    movingLeadIds: movingIds,
    isLeadMoving,
    totalLeads,
    moveToStage,
    canMoveToStage,
    getTransitionMessage,
    undoLastMove,
    canUndo: undoState !== null && Date.now() - undoState.timestamp < UNDO_WINDOW_MS,
    refetchPipeline,
  };
}

// ============================================
// Lead Selection Hook (for bulk operations)
// ============================================

export function useLeadSelection() {
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

export default useLeadsKanban;
