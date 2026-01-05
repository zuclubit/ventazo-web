'use client';

/**
 * CustomerKanbanBoard - Main Kanban Board Component v3.0
 *
 * Homologated with OpportunityKanbanBoard and LeadsKanbanBoard design.
 * Provides consistent visual experience across all pipeline views.
 *
 * v3.0 Features (Homologated):
 * - Scroll indicators with navigation arrows (NEW)
 * - Fade gradients at edges (NEW)
 * - Keyboard navigation (Arrow keys, Home/End) (NEW)
 * - Drag and drop between stages (dnd-kit)
 * - Drop validation feedback
 * - Per-card loading states
 * - Premium drag overlay
 *
 * Layout Architecture:
 * - KanbanContainer provides scroll handling with indicators
 * - CustomerKanbanBoard is a flex row that MUST fill 100% height of parent
 * - Columns are fixed-width, flex-shrink-0, with FULL height
 * - Cards container inside each column has overflow-y-auto
 *
 * Clean Architecture: Presentation layer only.
 * Business logic is in useCustomerKanbanDragDrop hook.
 *
 * @version 3.0.0
 * @module components/kanban/CustomerKanbanBoard
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  useSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanContainer } from '@/components/kanban';
import type { Customer } from '@/lib/customers';

import { CustomerCard, CustomerCardOverlay } from '../CustomerCard';
import { CustomerKanbanColumn, type LifecycleColumn } from './CustomerKanbanColumn';
import { useCustomerKanbanDragDrop, useCustomerTheme } from '../../hooks';

// ============================================
// Types
// ============================================

export interface CustomerKanbanBoardProps {
  /** Lifecycle columns with customers */
  columns: LifecycleColumn[];
  /** Whether the board is loading */
  isLoading?: boolean;
  /** Handler when a customer card is clicked */
  onCustomerClick?: (customer: Customer) => void;
  /** Handler when a customer is edited */
  onCustomerEdit?: (customer: Customer) => void;
  /** Handler when a customer is deleted */
  onCustomerDelete?: (customer: Customer) => void;
  /** Handler to add a new customer */
  onAddCustomer?: (stageId?: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function CustomerKanbanBoard({
  columns,
  isLoading = false,
  onCustomerClick,
  onCustomerEdit,
  onCustomerDelete,
  onAddCustomer,
  className,
}: CustomerKanbanBoardProps) {
  // Initialize theme (for CSS variables)
  const { lifecycle } = useCustomerTheme();

  // Keyboard sensor for accessibility
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  // DnD Kit drag-drop handling
  const {
    sensors,
    activeId,
    activeCustomer,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
    isMoving,
  } = useCustomerKanbanDragDrop({
    columns,
    onMoveSuccess: () => {
      // Optional: trigger analytics or other side effects
    },
  });

  // Combine sensors
  const allSensors = React.useMemo(
    () => [...sensors, keyboardSensor],
    [sensors, keyboardSensor]
  );

  // Handler for adding customer to specific stage
  const handleAddCustomer = React.useCallback(
    (stageId: string) => {
      onAddCustomer?.(stageId);
    },
    [onAddCustomer]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state
  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
        <h3 className="text-lg font-medium mb-2">Sin etapas de lifecycle</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No hay etapas configuradas para visualizar clientes.
        </p>
      </div>
    );
  }

  return (
    <KanbanContainer
      aria-label="Tablero Kanban de Clientes"
      className={className}
      scrollOptions={{
        columnWidth: 300,
        columnGap: 16,
        threshold: 20,
      }}
    >
      <DndContext
        sensors={allSensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Moving indicator */}
        {isMoving && (
          <div className="absolute top-2 right-2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Moviendo...</span>
          </div>
        )}

        {/*
          Board Container
          CRITICAL: Uses inline flex with nowrap to enable horizontal scroll
          Height is 100% of parent (KanbanContainer)
        */}
        <div
          className={cn(
            // CRITICAL: Inline flex to allow horizontal sizing
            'inline-flex flex-nowrap',
            // CRITICAL: Fill full height from parent
            'h-full',
            // CRITICAL: Min dimensions to allow proper sizing
            'min-h-0',
            // Align columns to top (don't stretch column height)
            'items-stretch',
            // Gap between columns - responsive
            'gap-3 sm:gap-4 lg:gap-5',
            // Padding for first/last column visibility
            'px-3 sm:px-4 lg:px-5',
            // Bottom padding for visual breathing room
            'pb-3'
          )}
          role="region"
          aria-label="Columnas del Lifecycle"
        >
          {columns.map((column) => {
            // Determine if this column is being hovered
            const isOver = overId === column.stage.id;

            return (
              <CustomerKanbanColumn
                key={column.stage.id}
                column={column}
                isOver={isOver}
                onCustomerClick={onCustomerClick}
                onCustomerEdit={onCustomerEdit}
                onCustomerDelete={onCustomerDelete}
                onAddCustomer={handleAddCustomer}
              />
            );
          })}
        </div>

        {/* Drag Overlay - Premium design */}
        <DragOverlay dropAnimation={null}>
          {activeCustomer && <CustomerCardOverlay customer={activeCustomer} />}
        </DragOverlay>
      </DndContext>
    </KanbanContainer>
  );
}

// ============================================
// Hook for transforming customer data to columns
// ============================================

export interface UseCustomerLifecycleColumnsOptions {
  customers: Customer[];
}

export function useCustomerLifecycleColumns(customers: Customer[]): LifecycleColumn[] {
  const { lifecycle } = useCustomerTheme();

  return React.useMemo(() => {
    // Define the stage order
    const stageOrder: (keyof typeof lifecycle)[] = [
      'prospect',
      'onboarding',
      'active',
      'at_risk',
      'renewal',
      'churned',
    ];

    // Map customers to stages based on status
    const statusToStage: Record<string, keyof typeof lifecycle> = {
      inactive: 'prospect', // Default for new/inactive
      active: 'active',
      at_risk: 'at_risk',
      churned: 'churned',
    };

    // Group customers by stage
    const customersByStage: Record<string, Customer[]> = {};
    stageOrder.forEach((stageId) => {
      customersByStage[stageId] = [];
    });

    customers.forEach((customer) => {
      // Determine stage based on status
      let stageId = statusToStage[customer.status] || 'prospect';

      // Special cases
      // If active and renewal is coming up (within 90 days), show in renewal
      if (customer.status === 'active' && customer.renewalDate) {
        const daysToRenewal = Math.floor(
          (new Date(customer.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysToRenewal <= 90 && daysToRenewal > 0) {
          stageId = 'renewal';
        }
      }

      // If recently converted (within 30 days), show in onboarding
      if (customer.status === 'inactive' && customer.convertedAt) {
        const daysSinceConverted = Math.floor(
          (Date.now() - new Date(customer.convertedAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceConverted <= 30) {
          stageId = 'onboarding';
        }
      }

      const stageArray = customersByStage[stageId];
      if (stageArray) {
        stageArray.push(customer);
      }
    });

    // Create column objects
    return stageOrder.map((stageId) => {
      const stageConfig = lifecycle[stageId];
      const stageCustomers = customersByStage[stageId] || [];
      const totalMrr = stageCustomers.reduce((sum, c) => sum + (c.mrr || 0), 0);

      return {
        stage: stageConfig,
        customers: stageCustomers,
        count: stageCustomers.length,
        totalMrr,
      };
    });
  }, [customers, lifecycle]);
}

// ============================================
// Exports
// ============================================

export default CustomerKanbanBoard;
