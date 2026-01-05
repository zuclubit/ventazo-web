'use client';

/**
 * useCustomerKanbanDragDrop Hook
 *
 * Custom hook that encapsulates all drag-and-drop logic for the Customer Lifecycle Kanban.
 * Handles sensors, drag events, and optimistic updates.
 *
 * Based on useKanbanDragDrop from leads module.
 *
 * @module hooks/useCustomerKanbanDragDrop
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
import { useUpdateCustomer, customerQueryKeys, CustomerStatus } from '@/lib/customers';
import type { Customer } from '@/lib/customers';
import type { LifecycleColumn } from '../components/kanban/CustomerKanbanColumn';

// ============================================
// Types
// ============================================

export interface UseCustomerKanbanDragDropOptions {
  /** Current lifecycle columns */
  columns: LifecycleColumn[];
  /** Callback when a customer is successfully moved */
  onMoveSuccess?: () => void;
  /** Callback when a customer move fails */
  onMoveError?: (error: Error) => void;
}

export interface UseCustomerKanbanDragDropReturn {
  /** Configured sensors for DndContext */
  sensors: ReturnType<typeof useSensors>;
  /** Currently dragged customer ID */
  activeId: UniqueIdentifier | null;
  /** Currently dragged customer data */
  activeCustomer: Customer | null;
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

// ============================================
// Stage to Status Mapping
// ============================================

const STAGE_TO_STATUS: Record<string, CustomerStatus> = {
  prospect: CustomerStatus.INACTIVE, // New prospects start as inactive
  onboarding: CustomerStatus.INACTIVE, // Still in setup
  active: CustomerStatus.ACTIVE,
  at_risk: CustomerStatus.AT_RISK,
  renewal: CustomerStatus.ACTIVE, // Still active, just pending renewal
  churned: CustomerStatus.CHURNED,
};

// ============================================
// Hook Implementation
// ============================================

export function useCustomerKanbanDragDrop({
  columns,
  onMoveSuccess,
  onMoveError,
}: UseCustomerKanbanDragDropOptions): UseCustomerKanbanDragDropReturn {
  const queryClient = useQueryClient();
  const updateCustomerMutation = useUpdateCustomer();

  // State for tracking the active drag
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = React.useState<UniqueIdentifier | null>(null);

  // Configure sensors
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

  // Find the currently dragged customer
  const activeCustomer = React.useMemo(() => {
    if (!activeId) return null;

    for (const column of columns) {
      const found = column.customers.find((c) => c.id === activeId);
      if (found) return found;
    }

    return null;
  }, [activeId, columns]);

  // Find which column a customer belongs to
  const findColumnByCustomerId = React.useCallback(
    (customerId: UniqueIdentifier): LifecycleColumn | undefined => {
      return columns.find((column) =>
        column.customers.some((c) => c.id === customerId)
      );
    },
    [columns]
  );

  // Find column by stage ID
  const findColumnByStageId = React.useCallback(
    (stageId: UniqueIdentifier): LifecycleColumn | undefined => {
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

      const activeCustomerId = active.id as string;

      // Determine target column
      let targetStageId: string;

      const overColumn = findColumnByStageId(over.id);
      if (overColumn) {
        // Dropped on a column directly
        targetStageId = overColumn.stage.id;
      } else {
        // Dropped on a customer - find its column
        const customerColumn = findColumnByCustomerId(over.id);
        if (!customerColumn) return;
        targetStageId = customerColumn.stage.id;
      }

      // Find current column of the customer
      const currentColumn = findColumnByCustomerId(activeCustomerId);
      if (!currentColumn) return;

      // If dropped in the same column, no need to update
      if (currentColumn.stage.id === targetStageId) return;

      // Get new status based on target stage
      const newStatus = STAGE_TO_STATUS[targetStageId];
      if (!newStatus) {
        console.warn(`No status mapping for stage: ${targetStageId}`);
        return;
      }

      // Optimistic update would go here
      // For now, we'll just call the API and refetch

      // Call API
      try {
        await updateCustomerMutation.mutateAsync({
          customerId: activeCustomerId,
          data: { status: newStatus },
        });

        onMoveSuccess?.();
        toast({
          title: 'Cliente movido',
          description: `El cliente se movió a ${targetStageId === 'churned' ? 'Perdidos' : targetStageId}`,
        });

        // Invalidate queries to refresh the list
        void queryClient.invalidateQueries({ queryKey: customerQueryKeys.lists() });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast({
          title: 'Error',
          description: `Error al mover el cliente: ${errorMessage}`,
          variant: 'destructive',
        });
        onMoveError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    },
    [
      findColumnByCustomerId,
      findColumnByStageId,
      queryClient,
      updateCustomerMutation,
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
    activeCustomer,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isMoving: updateCustomerMutation.isPending,
  };
}

export default useCustomerKanbanDragDrop;
