'use client';

/**
 * KanbanColumn Component - v3.1 (Homologated with Opportunities)
 *
 * Droppable column with validation visual feedback.
 * Homologated with OpportunityKanbanColumn design patterns.
 *
 * v3.1 Features (Homologated):
 * - Stage transition validation visual feedback (green/red rings)
 * - Per-lead loading states (isMoving)
 * - Drop validation message display
 * - Premium glass container with overlays
 * - Smooth transitions (200-300ms)
 *
 * Layout Architecture:
 * - Column has FULL height from parent (KanbanBoard h-full)
 * - Fixed width using CSS clamp()
 * - Internal structure: Header (shrink-0) + Cards (flex-1 overflow-y-auto)
 *
 * @version 3.1.0
 * @module components/kanban/KanbanColumn
 */

import * as React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
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
  /** Whether the drop is valid (for visual feedback) - green ring */
  isValidDropTarget?: boolean;
  /** Whether the drop is invalid (for visual feedback) - red ring */
  isInvalidDropTarget?: boolean;
  /** Message to show when drop is invalid */
  dropValidationMessage?: string;
  /** Function to check if a specific lead is being moved */
  isLeadMoving?: (leadId: string) => boolean;
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
  isValidDropTarget = false,
  isInvalidDropTarget = false,
  dropValidationMessage,
  isLeadMoving,
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

  // Combine internal and external isOver states
  const isDropTarget = isOver || isDroppableOver;
  const isHighlighted = isDropTarget && !isValidDropTarget && !isInvalidDropTarget;

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
        // Relative for overlays
        'relative',
        // Transition for drop zone highlight
        'transition-all duration-300',
        // Valid drop target - green ring (homologated with Opportunities)
        isValidDropTarget && 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
        // Invalid drop target - red ring
        isInvalidDropTarget && 'ring-2 ring-red-500 ring-offset-2 ring-offset-background opacity-75',
        // Just hovering (no validation yet) - default highlight
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background drop-zone-active',
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
          'scrollbar-thin'
        )}
        role="list"
      >
        <SortableContext items={leadIds} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <KanbanEmptyColumn
              stageId={stage.id}
              stageName={stage.label}
              stageColor={stage.color}
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
                  isMoving={isLeadMoving?.(lead.id)}
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

      {/* Valid Drop Indicator - Green overlay (homologated with Opportunities) */}
      {isValidDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-green-500/5 pointer-events-none" />
      )}

      {/* Invalid Drop Indicator - Red overlay with message */}
      {isInvalidDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-red-500/10 pointer-events-none flex items-center justify-center z-20">
          <div className="bg-red-100 dark:bg-red-900/50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[250px]">
            <Ban className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">
              {dropValidationMessage || 'Acción no permitida'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
