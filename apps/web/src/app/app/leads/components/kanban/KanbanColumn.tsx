'use client';

/**
 * KanbanColumn Component
 *
 * Droppable column for a pipeline stage.
 * Responsive design:
 * - Mobile: Full viewport width with snap
 * - Tablet: Medium fixed width
 * - Desktop: Optimal width with flexible height
 */

import * as React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { Lead, PipelineColumn as PipelineColumnType } from '@/lib/leads';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanEmptyColumn } from './KanbanEmptyColumn';
import { KanbanCard } from './KanbanCard';

export interface KanbanColumnProps {
  /** Pipeline column data with stage info and leads */
  column: PipelineColumnType;
  /** Whether a dragged item is over this column */
  isOver?: boolean;
  /** Click handler when a lead card is clicked */
  onLeadClick?: (lead: Lead) => void;
  /** Edit handler */
  onLeadEdit?: (lead: Lead) => void;
  /** Delete handler */
  onLeadDelete?: (lead: Lead) => void;
  /** Convert handler */
  onLeadConvert?: (lead: Lead) => void;
  /** Additional CSS classes */
  className?: string;
}

export function KanbanColumn({
  column,
  isOver = false,
  onLeadClick,
  onLeadEdit,
  onLeadDelete,
  onLeadConvert,
  className,
}: KanbanColumnProps) {
  const { stage, leads, count } = column;

  // Make the column droppable
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  const isHighlighted = isOver || isDroppableOver;

  // Get lead IDs for SortableContext
  const leadIds = React.useMemo(() => leads.map((lead) => lead.id), [leads]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Base styles
        'flex flex-col rounded-xl',
        'bg-muted/30 backdrop-blur-sm',
        'border border-transparent',
        'transition-all duration-200',
        // Responsive width
        // Mobile: Almost full width with some peek of next column
        'w-[85vw] min-w-[280px] max-w-[320px]',
        // Tablet: Fixed medium width
        'sm:w-72 sm:min-w-[288px] sm:max-w-none',
        // Desktop: Slightly larger
        'lg:w-80 lg:min-w-[320px]',
        // Flex shrink behavior
        'flex-shrink-0',
        // Mobile snap
        'snap-center',
        'md:snap-align-none',
        // Highlight when dragging over
        isHighlighted && 'border-primary/30 bg-primary/5 shadow-lg shadow-primary/5',
        className
      )}
    >
      {/* Column Header - Sticky on scroll */}
      <div className="sticky top-0 z-10 bg-inherit rounded-t-xl">
        <KanbanColumnHeader
          title={stage.label}
          count={count}
          color={stage.color}
        />
      </div>

      {/* Cards Container - Scrollable */}
      <div
        className={cn(
          // Padding responsive
          'p-2 sm:p-2.5 lg:p-3',
          'pt-0',
          // Spacing between cards
          'space-y-2 sm:space-y-2.5',
          // Responsive height - account for header
          'min-h-[150px] sm:min-h-[180px]',
          'max-h-[calc(100vh-16rem)] sm:max-h-[calc(100vh-15rem)] lg:max-h-[calc(100vh-14rem)]',
          // Scrollable
          'overflow-y-auto overflow-x-hidden',
          // Smooth scroll
          'scroll-smooth',
          // Custom scrollbar
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20',
          'hover:scrollbar-thumb-muted-foreground/40'
        )}
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <KanbanEmptyColumn
              stageName={stage.label}
              isOver={isHighlighted}
            />
          ) : (
            leads.map((lead) => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick?.(lead)}
                onEdit={() => onLeadEdit?.(lead)}
                onDelete={() => onLeadDelete?.(lead)}
                onConvert={() => onLeadConvert?.(lead)}
              />
            ))
          )}
        </SortableContext>

        {/* Drop placeholder when dragging over */}
        {isHighlighted && leads.length > 0 && (
          <div className="h-1.5 sm:h-2 rounded-full bg-primary/30 animate-pulse" />
        )}
      </div>
    </div>
  );
}
