'use client';

/**
 * OpportunityKanbanColumn Component
 *
 * Kanban column for opportunities with:
 * - Stage header with color, count, and money total
 * - Droppable area for opportunities
 * - Empty state with contextual messaging
 *
 * Uses shared pipeline components for visual consistency.
 *
 * @module components/opportunities/kanban/OpportunityKanbanColumn
 */

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PipelineColumnHeader,
  PipelineColumnEmptyState,
  COLUMN_TOKENS,
} from '@/components/pipeline';
import type { Opportunity, OpportunityPipelineStage } from '@/lib/opportunities';
import { OpportunityKanbanCard } from './OpportunityKanbanCard';

// ============================================
// Types
// ============================================

export interface OpportunityKanbanColumnProps {
  /** Stage data */
  stage: OpportunityPipelineStage;
  /** Opportunities in this column */
  opportunities: Opportunity[];
  /** Total amount for this stage */
  totalAmount: number;
  /** Weighted forecast for this stage */
  totalForecast: number;
  /** Whether this column is being dragged over */
  isOver?: boolean;
  /** Whether the drop is valid (for visual feedback) */
  isValidDropTarget?: boolean;
  /** Whether the drop is invalid (for visual feedback) */
  isInvalidDropTarget?: boolean;
  /** Message to show when drop is invalid */
  dropValidationMessage?: string;
  /** Function to check if a specific opportunity is being moved */
  isOpportunityMoving?: (opportunityId: string) => boolean;
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
  /** Handler for adding new opportunity to this stage */
  onAddOpportunity?: (stageId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Column Width Configuration (from Design System)
// ============================================

const COLUMN_STYLE = {
  width: `clamp(${COLUMN_TOKENS.width.min}, 20vw, ${COLUMN_TOKENS.width.max})`,
};

// ============================================
// Main Component
// ============================================

export function OpportunityKanbanColumn({
  stage,
  opportunities,
  totalAmount,
  totalForecast,
  isOver = false,
  isValidDropTarget = false,
  isInvalidDropTarget = false,
  dropValidationMessage,
  isOpportunityMoving,
  onOpportunityClick,
  onOpportunityEdit,
  onOpportunityWin,
  onOpportunityLost,
  onOpportunityView,
  onAddOpportunity,
  className,
}: OpportunityKanbanColumnProps) {
  // DnD Kit droppable hook
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  // Combine internal and external isOver states
  const isDropTarget = isOver || dndIsOver;
  const isHighlighted = isDropTarget && !isValidDropTarget && !isInvalidDropTarget;

  // Get opportunity IDs for sortable context
  const opportunityIds = React.useMemo(
    () => opportunities.map((opp) => opp.id),
    [opportunities]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Premium glass container (shared with leads)
        'kanban-column-premium',
        // Flex column layout
        'flex flex-col',
        // Full height from parent
        'h-full',
        // Never shrink
        'shrink-0 grow-0',
        // Relative for overlays
        'relative',
        // Transition for drop feedback
        'transition-all duration-300',
        // Valid drop target - success ring (uses CSS variable)
        isValidDropTarget && 'ring-2 ring-[var(--status-completed)] ring-offset-2 ring-offset-background',
        // Invalid drop target - error ring with dimming (uses CSS variable)
        isInvalidDropTarget && 'ring-2 ring-[var(--status-cancelled)] ring-offset-2 ring-offset-background opacity-75',
        // Neutral highlight when dragging over
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={COLUMN_STYLE}
      data-pipeline-column
      role="listbox"
      aria-label={`${stage.label} - ${opportunities.length} opportunities`}
    >
      {/* Column Header - Uses shared component */}
      <div className="shrink-0 sticky top-0 z-10">
        <PipelineColumnHeader
          title={stage.label}
          count={opportunities.length}
          color={stage.color}
          percentage={stage.probability}
          moneyTotal={totalAmount}
          currency="MXN"
        />
      </div>

      {/* Cards Container - Scrollable */}
      <div
        className={cn(
          'flex-1',
          'min-h-0',
          'p-2.5 sm:p-3',
          'pt-2',
          'overflow-y-auto overflow-x-hidden',
          '-webkit-overflow-scrolling-touch',
          'space-y-2.5 sm:space-y-3',
          'scrollbar-thin'
        )}
        role="list"
      >
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          {opportunities.length === 0 ? (
            <PipelineColumnEmptyState
              stageId={stage.id}
              stageName={stage.label}
              stageColor={stage.color}
              pipelineType="opportunities"
              isDropTarget={isHighlighted}
              size="md"
            />
          ) : (
            opportunities.map((opportunity, index) => (
              <div
                key={opportunity.id}
                className="animate-card-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <OpportunityKanbanCard
                  opportunity={opportunity}
                  isMoving={isOpportunityMoving?.(opportunity.id)}
                  onClick={onOpportunityClick}
                  onEdit={onOpportunityEdit}
                  onWin={onOpportunityWin}
                  onLost={onOpportunityLost}
                  onView={onOpportunityView}
                />
              </div>
            ))
          )}
        </SortableContext>

        {/* Drop indicator when dragging over non-empty column */}
        {isHighlighted && opportunities.length > 0 && (
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

      {/* Valid Drop Overlay - Success tint (uses CSS variable) */}
      {isValidDropTarget && (
        <div
          className="absolute inset-0 rounded-xl bg-[var(--status-completed)]/5 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Invalid Drop Overlay - Error tint with message (uses CSS variables) */}
      {isInvalidDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-[var(--status-cancelled)]/10 pointer-events-none flex items-center justify-center z-20">
          <div className="bg-[var(--status-cancelled-bg)] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[250px] border border-[var(--status-cancelled-border)]">
            <Ban className="h-4 w-4 text-[var(--status-cancelled)] shrink-0" />
            <span className="text-xs text-[var(--status-cancelled)] font-medium">
              {dropValidationMessage || 'Acción no permitida'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
