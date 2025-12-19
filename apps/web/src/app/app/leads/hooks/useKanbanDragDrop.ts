'use client';

/**
 * useKanbanDragDrop Hook
 *
 * Custom hook that encapsulates all drag-and-drop logic for the Kanban board.
 * Handles sensors, drag events, and integration with the backend mutation.
 */

import * as React from 'react';
import {
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useUpdateLeadStage, leadKeys } from '@/lib/leads/hooks';
import type { Lead, PipelineColumn, PipelineView } from '@/lib/leads';

export interface UseKanbanDragDropOptions {
  /** Current pipeline columns */
  columns: PipelineColumn[];
  /** Callback when a lead is successfully moved */
  onMoveSuccess?: () => void;
  /** Callback when a lead move fails */
  onMoveError?: (error: Error) => void;
}

export interface UseKanbanDragDropReturn {
  /** Configured sensors for DndContext */
  sensors: ReturnType<typeof useSensors>;
  /** Currently dragged lead ID */
  activeId: UniqueIdentifier | null;
  /** Currently dragged lead data */
  activeLead: Lead | null;
  /** ID of column being dragged over */
  overId: UniqueIdentifier | null;
  /** Handler for drag start */
  handleDragStart: (event: DragStartEvent) => void;
  /** Handler for drag over */
  handleDragOver: (event: DragOverEvent) => void;
  /** Handler for drag end */
  handleDragEnd: (event: DragEndEvent) => void;
  /** Handler for drag cancel */
  handleDragCancel: () => void;
  /** Whether a move operation is in progress */
  isMoving: boolean;
}

export function useKanbanDragDrop({
  columns,
  onMoveSuccess,
  onMoveError,
}: UseKanbanDragDropOptions): UseKanbanDragDropReturn {
  const queryClient = useQueryClient();
  const updateStageMutation = useUpdateLeadStage();

  // State for tracking the active drag
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = React.useState<UniqueIdentifier | null>(null);

  // Configure sensors
  // - PointerSensor: for mouse with distance threshold to prevent accidental drags
  // - TouchSensor: for touch devices with delay to distinguish from scrolling
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250, // 250ms hold before drag starts
      tolerance: 5, // 5px movement tolerance during delay
    },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  // Find the currently dragged lead
  const activeLead = React.useMemo(() => {
    if (!activeId) return null;

    for (const column of columns) {
      const found = column.leads.find((lead) => lead.id === activeId);
      if (found) return found;
    }

    return null;
  }, [activeId, columns]);

  // Find which column a lead belongs to
  const findColumnByLeadId = React.useCallback(
    (leadId: UniqueIdentifier): PipelineColumn | undefined => {
      return columns.find((column) =>
        column.leads.some((lead) => lead.id === leadId)
      );
    },
    [columns]
  );

  // Find column by stage ID
  const findColumnByStageId = React.useCallback(
    (stageId: UniqueIdentifier): PipelineColumn | undefined => {
      return columns.find((column) => column.stage.id === stageId);
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
    setOverId(null);
  }, []);

  // Handle drag over (for visual feedback)
  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id ?? null);
  }, []);

  // Handle drag end - main logic
  const handleDragEnd = React.useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveId(null);
      setOverId(null);

      // No drop target
      if (!over) return;

      const activeLeadId = active.id as string;

      // Determine target column
      // The over.id can be either a lead ID (if dropped on a card) or a stage ID (if dropped on column)
      let targetStageId: string;

      const overColumn = findColumnByStageId(over.id);
      if (overColumn) {
        // Dropped on a column directly
        targetStageId = overColumn.stage.id;
      } else {
        // Dropped on a lead - find its column
        const leadColumn = findColumnByLeadId(over.id);
        if (!leadColumn) return;
        targetStageId = leadColumn.stage.id;
      }

      // Find current column of the lead
      const currentColumn = findColumnByLeadId(activeLeadId);
      if (!currentColumn) return;

      // If dropped in the same column, no need to update
      if (currentColumn.stage.id === targetStageId) return;

      // Optimistic update
      queryClient.setQueryData<PipelineView>(
        leadKeys.pipelineView(),
        (old) => {
          if (!old) return old;

          // Deep clone to avoid mutations
          const newStages = old.stages.map((column) => ({
            ...column,
            leads: [...column.leads],
          }));

          // Find and remove lead from source column
          let movedLead: Lead | undefined;
          const sourceColumn = newStages.find(
            (c) => c.stage.id === currentColumn.stage.id
          );
          if (sourceColumn) {
            const leadIndex = sourceColumn.leads.findIndex(
              (l) => l.id === activeLeadId
            );
            if (leadIndex !== -1) {
              [movedLead] = sourceColumn.leads.splice(leadIndex, 1);
              sourceColumn.count = sourceColumn.leads.length;
            }
          }

          // Add lead to target column
          if (movedLead) {
            const targetColumn = newStages.find(
              (c) => c.stage.id === targetStageId
            );
            if (targetColumn) {
              // Update lead's stageId
              movedLead = { ...movedLead, stageId: targetStageId };
              targetColumn.leads.push(movedLead);
              targetColumn.count = targetColumn.leads.length;
            }
          }

          return { ...old, stages: newStages };
        }
      );

      // Call API
      try {
        await updateStageMutation.mutateAsync({
          leadId: activeLeadId,
          stageId: targetStageId,
        });

        onMoveSuccess?.();
        toast({
          title: 'Lead movido',
          description: 'El lead se movió correctamente al nuevo estado',
        });
      } catch (error) {
        // Rollback on error
        queryClient.invalidateQueries({ queryKey: leadKeys.pipelineView() });

        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast({
          title: 'Error',
          description: `Error al mover el lead: ${errorMessage}`,
          variant: 'destructive',
        });
        onMoveError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [
      findColumnByLeadId,
      findColumnByStageId,
      queryClient,
      updateStageMutation,
      onMoveSuccess,
      onMoveError,
    ]
  );

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  return {
    sensors,
    activeId,
    activeLead,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isMoving: updateStageMutation.isPending,
  };
}
