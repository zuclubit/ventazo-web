'use client';

/**
 * KanbanBoard Component
 *
 * Main orchestrator component for the Kanban board.
 * Fully responsive with optimized layouts for:
 * - Mobile: Horizontal snap scrolling, full-width columns
 * - Tablet: Scrollable columns, medium width
 * - Desktop: All columns visible, optimal spacing
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
import { KanbanCardOverlay } from './KanbanCard';

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
    activeId,
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
      {/* Board Container - Responsive */}
      <div
        className={cn(
          // Base layout
          'flex h-full overflow-x-auto overflow-y-hidden',
          // Responsive gap
          'gap-3 sm:gap-4 lg:gap-5',
          // Mobile: Full bleed with padding, snap scrolling
          '-mx-4 px-4',
          'sm:-mx-6 sm:px-6',
          'md:mx-0 md:px-0',
          // Snap scrolling for mobile
          'snap-x snap-mandatory',
          'md:snap-none',
          // Smooth scrolling
          'scroll-smooth',
          // Bottom padding for scrollbar
          'pb-4',
          // Hide scrollbar on mobile, show on desktop
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20',
          'hover:scrollbar-thumb-muted-foreground/40',
          className
        )}
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

      {/* Drag Overlay - Shows the dragged card */}
      <DragOverlay dropAnimation={null}>
        {activeLead && <KanbanCardOverlay lead={activeLead} />}
      </DragOverlay>
    </DndContext>
  );
}
