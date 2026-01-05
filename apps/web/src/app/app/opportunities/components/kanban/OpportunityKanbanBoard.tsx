'use client';

/**
 * OpportunityKanbanBoard Component - v2.0
 *
 * Enhanced Kanban board for opportunities with:
 * - Scroll indicators with navigation arrows (NEW)
 * - Fade gradients at edges (NEW)
 * - Keyboard navigation (Arrow keys, Home/End) (NEW)
 * - Drag and drop between stages (dnd-kit)
 * - Stage transition validation
 * - Visual feedback for allowed/disallowed drops
 * - Per-card loading states
 * - Drag overlay for visual feedback
 *
 * Clean Architecture: Presentation layer only.
 * Business logic for validation is in useOpportunityKanban hook.
 *
 * @version 2.0.0
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanContainer } from '@/components/kanban';
import type { Opportunity, OpportunityPipelineStage, PipelineColumn } from '@/lib/opportunities';
import type { StageTransitionValidation } from '../../hooks/useOpportunityKanban';
import { OpportunityKanbanColumn } from './OpportunityKanbanColumn';
import { OpportunityCardV3Overlay } from '../OpportunityCardV3';

// ============================================
// Types
// ============================================

export interface OpportunityKanbanBoardProps {
  /** Pipeline columns with opportunities */
  columns: PipelineColumn[];
  /** Whether the board is loading */
  isLoading?: boolean;
  /** Whether a move operation is in progress */
  isMoving?: boolean;
  /** Validate if a move is allowed */
  canMoveToStage?: (opportunityId: string, stageId: string) => StageTransitionValidation;
  /** Check if a specific opportunity is being moved */
  isOpportunityMoving?: (opportunityId: string) => boolean;
  /** Handler when opportunity is moved to a new stage */
  onMoveToStage?: (opportunityId: string, stageId: string) => void;
  /** Handler when opportunity card is clicked */
  onOpportunityClick?: (opportunity: Opportunity) => void;
  /** Handler for edit opportunity */
  onOpportunityEdit?: (opportunity: Opportunity) => void;
  /** Handler for mark as won */
  onOpportunityWin?: (opportunity: Opportunity) => void;
  /** Handler for mark as lost */
  onOpportunityLost?: (opportunity: Opportunity) => void;
  /** Handler for view opportunity */
  onOpportunityView?: (opportunity: Opportunity) => void;
  /** Handler for adding new opportunity to a stage */
  onAddOpportunity?: (stageId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function OpportunityKanbanBoard({
  columns,
  isLoading = false,
  isMoving = false,
  canMoveToStage,
  isOpportunityMoving,
  onMoveToStage,
  onOpportunityClick,
  onOpportunityEdit,
  onOpportunityWin,
  onOpportunityLost,
  onOpportunityView,
  onAddOpportunity,
  className,
}: OpportunityKanbanBoardProps) {
  // State for tracking the active drag
  const [activeOpportunity, setActiveOpportunity] = React.useState<Opportunity | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dropValidation, setDropValidation] = React.useState<StageTransitionValidation | null>(null);

  // Configure sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // 200ms hold before drag starts
      tolerance: 8, // 8px movement tolerance during delay
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  // Find opportunity by ID
  const findOpportunityById = React.useCallback(
    (id: string): Opportunity | undefined => {
      for (const column of columns) {
        const found = column.opportunities.find((opp) => opp.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  // Find column by opportunity ID
  const findColumnByOpportunityId = React.useCallback(
    (id: string): PipelineColumn | undefined => {
      return columns.find((column) =>
        column.opportunities.some((opp) => opp.id === id)
      );
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const opportunity = findOpportunityById(active.id as string);
      setActiveOpportunity(opportunity || null);
    },
    [findOpportunityById]
  );

  // Handle drag over with validation
  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    const overIdValue = over?.id as string || null;
    setOverId(overIdValue);

    // Validate drop target
    if (active && overIdValue && canMoveToStage) {
      const activeId = active.id as string;

      // Determine target stage ID
      let targetStageId: string | null = null;
      const overColumn = columns.find((col) => col.stage.id === overIdValue);
      if (overColumn) {
        targetStageId = overColumn.stage.id;
      } else {
        // Over an opportunity, find its column
        const opportunityColumn = columns.find((col) =>
          col.opportunities.some((opp) => opp.id === overIdValue)
        );
        if (opportunityColumn) {
          targetStageId = opportunityColumn.stage.id;
        }
      }

      if (targetStageId) {
        const validation = canMoveToStage(activeId, targetStageId);
        setDropValidation(validation);
      } else {
        setDropValidation(null);
      }
    } else {
      setDropValidation(null);
    }
  }, [columns, canMoveToStage]);

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveOpportunity(null);
      setOverId(null);
      setDropValidation(null);

      // No drop target
      if (!over) return;

      const activeId = active.id as string;
      const overIdValue = over.id as string;

      // Find current column
      const currentColumn = findColumnByOpportunityId(activeId);
      if (!currentColumn) return;

      // Determine target stage ID
      // The over.id can be either a stage ID (column) or an opportunity ID
      let targetStageId: string;

      // Check if over a column directly
      const overColumn = columns.find((col) => col.stage.id === overIdValue);
      if (overColumn) {
        targetStageId = overColumn.stage.id;
      } else {
        // Over an opportunity, find its column
        const opportunityColumn = findColumnByOpportunityId(overIdValue);
        if (!opportunityColumn) return;
        targetStageId = opportunityColumn.stage.id;
      }

      // If same column, no action needed
      if (currentColumn.stage.id === targetStageId) return;

      // Trigger move (validation happens in the handler)
      onMoveToStage?.(activeId, targetStageId);
    },
    [columns, findColumnByOpportunityId, onMoveToStage]
  );

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveOpportunity(null);
    setOverId(null);
    setDropValidation(null);
  }, []);

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
        <h3 className="text-lg font-medium mb-2">Sin etapas de pipeline</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura las etapas del pipeline para visualizar y gestionar tus oportunidades.
        </p>
      </div>
    );
  }

  return (
    <KanbanContainer
      aria-label="Tablero Kanban de Oportunidades"
      className={className}
      scrollOptions={{
        columnWidth: 300,
        columnGap: 16,
        threshold: 20,
      }}
    >
      <DndContext
        sensors={sensors}
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

        {/* Columns Container */}
        <div
          className={cn(
            'inline-flex flex-nowrap',
            'h-full min-h-0',
            'items-stretch',
            'gap-3 sm:gap-4 lg:gap-5',
            'px-3 sm:px-4 lg:px-5',
            'pb-3'
          )}
          role="region"
          aria-label="Columnas del Pipeline"
        >
          {columns.map((column) => {
            // Determine if this column is a valid drop target
            const isOver = overId === column.stage.id;
            const isValidDropTarget = isOver && dropValidation?.allowed !== false;
            const isInvalidDropTarget = isOver && dropValidation?.allowed === false;

            return (
              <OpportunityKanbanColumn
                key={column.stage.id}
                stage={column.stage}
                opportunities={column.opportunities}
                totalAmount={column.totalAmount}
                totalForecast={column.totalForecast}
                isOver={isOver}
                isValidDropTarget={isValidDropTarget}
                isInvalidDropTarget={isInvalidDropTarget}
                dropValidationMessage={isInvalidDropTarget ? dropValidation?.reason : undefined}
                isOpportunityMoving={isOpportunityMoving}
                onOpportunityClick={onOpportunityClick}
                onOpportunityEdit={onOpportunityEdit}
                onOpportunityWin={onOpportunityWin}
                onOpportunityLost={onOpportunityLost}
                onOpportunityView={onOpportunityView}
                onAddOpportunity={onAddOpportunity}
              />
            );
          })}
        </div>

        {/* Drag Overlay - Uses premium V3 design */}
        <DragOverlay dropAnimation={null}>
          {activeOpportunity && (
            <OpportunityCardV3Overlay opportunity={activeOpportunity} />
          )}
        </DragOverlay>
      </DndContext>
    </KanbanContainer>
  );
}
