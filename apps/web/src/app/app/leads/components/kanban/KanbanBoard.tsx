'use client';

/**
 * KanbanBoard Component - v2.0
 *
 * Main orchestrator for the Kanban board with bulletproof layout.
 * Uses horizontal flexbox with proper containment for scrolling.
 *
 * Layout Architecture:
 * - Parent (PageContent scroll="horizontal") provides the scroll context
 * - KanbanBoard is a flex row that MUST fill 100% height of parent
 * - Columns are fixed-width, flex-shrink-0, with FULL height
 * - Cards container inside each column has overflow-y-auto
 *
 * Responsive Breakpoints:
 * - Mobile (< 640px): Single column visible, snap scroll
 * - Tablet (640px - 1023px): 2-3 columns visible
 * - Desktop (1024px - 1535px): 4-5 columns visible
 * - 4K (1536px+): All columns visible
 *
 * CRITICAL: This component expects to be inside a container with:
 * - Defined height (h-full or flex-1 with min-h-0)
 * - overflow-x-auto (PageContent provides this)
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Lead, PipelineColumn } from '@/lib/leads';
import { useKanbanDragDrop } from '../../hooks/useKanbanDragDrop';
import { KanbanColumn } from './KanbanColumn';
import { LeadCardV3Overlay } from '../LeadCardV3';

export interface KanbanBoardProps {
  /** Pipeline columns with leads */
  columns: PipelineColumn[];
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

// Measuring configuration for DndContext
const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export function KanbanBoard({
  columns,
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  onLeadConvert,
  className,
}: KanbanBoardProps) {
  const {
    sensors,
    activeLead,
    overId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useKanbanDragDrop({ columns });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={measuringConfig}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/*
        Board Container
        CRITICAL: Uses inline flex with nowrap to enable horizontal scroll
        Height is 100% of parent (PageContent)
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
          'pb-3',
          className
        )}
        role="region"
        aria-label="Kanban board"
      >
        {columns.map((column) => (
          <KanbanColumn
            key={column.stage.id}
            column={column}
            isOver={overId === column.stage.id}
            onLeadClick={onLeadClick}
            onLeadEdit={onLeadEdit}
            onLeadDelete={onLeadDelete}
            onLeadConvert={onLeadConvert}
          />
        ))}
      </div>

      {/* Drag Overlay - Shows the dragged card with AI Score */}
      <DragOverlay dropAnimation={null}>
        {activeLead && <LeadCardV3Overlay lead={activeLead} />}
      </DragOverlay>
    </DndContext>
  );
}
