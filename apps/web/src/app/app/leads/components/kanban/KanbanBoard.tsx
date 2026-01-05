'use client';

/**
 * KanbanBoard Component - v4.0 (Enhanced with Scroll Indicators)
 *
 * Main orchestrator for the Kanban board with bulletproof layout.
 * Uses horizontal flexbox with proper containment for scrolling.
 *
 * v4.0 Features:
 * - Scroll indicators with navigation arrows
 * - Fade gradients at edges
 * - Keyboard navigation (Arrow keys, Home/End)
 * - Stage transition validation with visual feedback
 * - Per-lead loading states
 * - Drop validation (green/red rings on columns)
 * - Drag overlay with premium card design
 *
 * Layout Architecture:
 * - KanbanContainer provides scroll handling with indicators
 * - KanbanBoard is a flex row that MUST fill 100% height of parent
 * - Columns are fixed-width, flex-shrink-0, with FULL height
 * - Cards container inside each column has overflow-y-auto
 *
 * @version 4.0.0
 * @module components/kanban/KanbanBoard
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
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lead, PipelineColumn } from '@/lib/leads';
import type { StageTransitionValidation } from '../../hooks';
import { KanbanContainer } from '@/components/kanban';
import { KanbanColumn } from './KanbanColumn';
import { LeadCardV3Overlay } from '../LeadCardV3';

// ============================================
// Types
// ============================================

export interface KanbanBoardProps {
  /** Pipeline columns with leads */
  columns: PipelineColumn[];
  /** Whether the board is loading */
  isLoading?: boolean;
  /** Whether a move operation is in progress */
  isMoving?: boolean;
  /** Validate if a move is allowed */
  canMoveToStage?: (leadId: string, stageId: string) => StageTransitionValidation;
  /** Check if a specific lead is being moved */
  isLeadMoving?: (leadId: string) => boolean;
  /** Handler when lead is moved to a new stage */
  onMoveToStage?: (leadId: string, stageId: string) => void;
  /** Callback when a lead is clicked */
  onLeadClick?: (lead: Lead) => void;
  /** Callback when edit is requested */
  onLeadEdit?: (lead: Lead) => void;
  /** Callback when delete is requested */
  onLeadDelete?: (lead: Lead) => void;
  /** Callback when convert is requested */
  onLeadConvert?: (lead: Lead) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function KanbanBoard({
  columns,
  isLoading = false,
  isMoving = false,
  canMoveToStage,
  isLeadMoving,
  onMoveToStage,
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  onLeadConvert,
  className,
}: KanbanBoardProps) {
  // State for tracking the active drag
  const [activeLead, setActiveLead] = React.useState<Lead | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dropValidation, setDropValidation] = React.useState<StageTransitionValidation | null>(null);

  // Configure sensors (same as OpportunityKanbanBoard)
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

  // P1-1 Optimization: Build Map for O(1) lead lookup instead of O(n*m)
  // Before: O(n columns * m leads) per lookup
  // After: O(1) per lookup, O(n*m) once per columns change
  const leadIndex = React.useMemo(() => {
    const map = new Map<string, Lead>();
    for (const column of columns) {
      for (const lead of column.leads) {
        map.set(lead.id, lead);
      }
    }
    return map;
  }, [columns]);

  // Find lead by ID - O(1)
  const findLeadById = React.useCallback(
    (id: string): Lead | undefined => leadIndex.get(id),
    [leadIndex]
  );

  // P1-1 Optimization: Build column index for O(1) lookup
  const columnByLeadId = React.useMemo(() => {
    const map = new Map<string, PipelineColumn>();
    for (const column of columns) {
      for (const lead of column.leads) {
        map.set(lead.id, column);
      }
    }
    return map;
  }, [columns]);

  // Find column by lead ID - O(1)
  const findColumnByLeadId = React.useCallback(
    (id: string): PipelineColumn | undefined => columnByLeadId.get(id),
    [columnByLeadId]
  );

  // Handle drag start
  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const lead = findLeadById(active.id as string);
      setActiveLead(lead || null);
    },
    [findLeadById]
  );

  // Handle drag over with validation
  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overIdValue = (over?.id as string) || null;
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
          // Over a lead, find its column
          const leadColumn = columns.find((col) =>
            col.leads.some((lead) => lead.id === overIdValue)
          );
          if (leadColumn) {
            targetStageId = leadColumn.stage.id;
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
    },
    [columns, canMoveToStage]
  );

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveLead(null);
      setOverId(null);
      setDropValidation(null);

      // No drop target
      if (!over) return;

      const activeId = active.id as string;
      const overIdValue = over.id as string;

      // Find current column
      const currentColumn = findColumnByLeadId(activeId);
      if (!currentColumn) return;

      // Determine target stage ID
      let targetStageId: string;

      // Check if over a column directly
      const overColumn = columns.find((col) => col.stage.id === overIdValue);
      if (overColumn) {
        targetStageId = overColumn.stage.id;
      } else {
        // Over a lead, find its column
        const leadColumn = findColumnByLeadId(overIdValue);
        if (!leadColumn) return;
        targetStageId = leadColumn.stage.id;
      }

      // If same column, no action needed
      if (currentColumn.stage.id === targetStageId) return;

      // Trigger move (validation happens in the handler)
      onMoveToStage?.(activeId, targetStageId);
    },
    [columns, findColumnByLeadId, onMoveToStage]
  );

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveLead(null);
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
          Configura las etapas del pipeline para visualizar y gestionar tus leads.
        </p>
      </div>
    );
  }

  return (
    <KanbanContainer
      aria-label="Tablero Kanban de Leads"
      className={className}
      scrollOptions={{
        columnWidth: 280,
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
          aria-label="Columnas del Kanban"
        >
          {columns.map((column) => {
            // Determine if this column is a valid drop target
            const isOver = overId === column.stage.id;
            const isValidDropTarget = isOver && dropValidation?.allowed !== false;
            const isInvalidDropTarget = isOver && dropValidation?.allowed === false;

            return (
              <KanbanColumn
                key={column.stage.id}
                column={column}
                isOver={isOver}
                isValidDropTarget={isValidDropTarget}
                isInvalidDropTarget={isInvalidDropTarget}
                dropValidationMessage={isInvalidDropTarget ? dropValidation?.reason : undefined}
                isLeadMoving={isLeadMoving}
                onLeadClick={onLeadClick}
                onLeadEdit={onLeadEdit}
                onLeadDelete={onLeadDelete}
                onLeadConvert={onLeadConvert}
              />
            );
          })}
        </div>

        {/* Drag Overlay - Shows the dragged card with AI Score */}
        <DragOverlay dropAnimation={null}>
          {activeLead && <LeadCardV3Overlay lead={activeLead} />}
        </DragOverlay>
      </DndContext>
    </KanbanContainer>
  );
}
