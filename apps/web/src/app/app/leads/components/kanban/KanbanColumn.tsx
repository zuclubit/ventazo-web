'use client';

/**
 * KanbanColumn Component - V3 AI Score Prominence
 *
 * Droppable column with the new LeadCardV3 design.
 * AI Score is THE most prominent element.
 *
 * Features:
 * - LeadCardV3 with AI Priority Indicator
 * - Premium glass container
 * - Animated drop zone highlight
 * - Smooth transitions (200-300ms)
 *
 * Layout Architecture:
 * - Column has FULL height from parent (KanbanBoard h-full)
 * - Fixed width using CSS clamp()
 * - Internal structure: Header (shrink-0) + Cards (flex-1 overflow-y-auto)
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
import { LeadCardV3 } from '../LeadCardV3';

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

// Column width by breakpoint (responsive)
const COLUMN_WIDTHS = {
  mobile: '17.5rem',    // 280px - good for single column view with peek
  tablet: '16.25rem',   // 260px - fits ~2.5 columns
  desktop: '17.5rem',   // 280px - fits ~4 columns
  wide: '18.75rem',     // 300px - fits 5+ columns
} as const;

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
        // Premium glass container
        'kanban-column-premium',
        // CRITICAL: Flex column for header + cards layout
        'flex flex-col',
        // CRITICAL: Full height from parent
        'h-full',
        // CRITICAL: Never shrink width
        'shrink-0 grow-0',
        // Transition for drop zone highlight
        'transition-all duration-300',
        // Highlight when dragging over
        isHighlighted && 'drop-zone-active',
        className
      )}
      style={{
        // Responsive width using CSS clamp
        width: `clamp(${COLUMN_WIDTHS.tablet}, 20vw, ${COLUMN_WIDTHS.wide})`,
      }}
      data-kanban-column
      role="listbox"
      aria-label={`${stage.label} - ${count} leads`}
    >
      {/* Column Header - Premium with glass effect */}
      <div className="shrink-0 sticky top-0 z-10">
        <KanbanColumnHeader
          title={stage.label}
          count={count}
          color={stage.color}
        />
      </div>

      {/*
        Cards Container - Premium scrolling area
        Smooth internal scrolling with custom scrollbar
      */}
      <div
        className={cn(
          // CRITICAL: Fill remaining space
          'flex-1',
          // CRITICAL: Allow shrinking to enable overflow
          'min-h-0',
          // Padding - slightly more for premium feel
          'p-2.5 sm:p-3',
          'pt-2',
          // Vertical scroll for cards
          'overflow-y-auto overflow-x-hidden',
          // iOS momentum scrolling
          '-webkit-overflow-scrolling-touch',
          // Spacing between cards - more breathing room
          'space-y-2.5 sm:space-y-3',
          // Custom scrollbar styling
          'scrollbar-thin scrollbar-track-transparent',
          'scrollbar-thumb-muted-foreground/20',
          'hover:scrollbar-thumb-muted-foreground/40'
        )}
        role="list"
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <KanbanEmptyColumn
              stageName={stage.label}
              isOver={isHighlighted}
            />
          ) : (
            leads.map((lead, index) => (
              <div
                key={lead.id}
                className="animate-card-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <LeadCardV3
                  lead={lead}
                  variant="standard"
                  onClick={() => onLeadClick?.(lead)}
                  stageName={stage.label}
                  stageColor={stage.color}
                />
              </div>
            ))
          )}
        </SortableContext>

        {/* Premium drop indicator when dragging over */}
        {isHighlighted && leads.length > 0 && (
          <div
            className={cn(
              'h-2 rounded-full mx-2',
              'bg-gradient-to-r from-transparent via-primary/40 to-transparent',
              'animate-pulse'
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
