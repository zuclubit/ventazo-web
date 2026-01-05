'use client';

/**
 * PipelineColumn - Unified Kanban Column Component
 *
 * Composable column component for all pipeline/kanban views.
 * Combines header, content area, and empty state into one unit.
 *
 * Features:
 * - Droppable zone with dnd-kit
 * - Visual feedback for valid/invalid drops
 * - Premium glass styling
 * - Responsive width
 * - Smooth animations
 *
 * @module components/pipeline/PipelineColumn
 */

import * as React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COLUMN_TOKENS, COLOR_TOKENS } from './tokens';
import { PipelineColumnHeader } from './PipelineColumnHeader';
import { PipelineColumnEmptyState, type PipelineType } from './PipelineColumnEmptyState';

// ============================================
// Types
// ============================================

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  probability?: number;
}

export interface PipelineColumnProps<T extends { id: string }> {
  /** Stage/column configuration */
  stage: PipelineStage;
  /** Items in this column */
  items: T[];
  /** Total count (may differ from items.length if paginated) */
  count?: number;
  /** Pipeline type for empty state messaging */
  pipelineType?: PipelineType;
  /** Optional money total for this column */
  moneyTotal?: number;
  /** Currency for money display */
  currency?: string;
  /** Whether a dragged item is over this column */
  isOver?: boolean;
  /** Whether the drop is valid */
  isValidDropTarget?: boolean;
  /** Whether the drop is invalid */
  isInvalidDropTarget?: boolean;
  /** Message for invalid drop */
  dropValidationMessage?: string;
  /** Function to check if specific item is being moved */
  isItemMoving?: (itemId: string) => boolean;
  /** Render function for each item */
  renderItem: (item: T, index: number, isMoving: boolean) => React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Column Width Configuration
// ============================================

const COLUMN_STYLE = {
  // Responsive width using CSS clamp
  width: `clamp(${COLUMN_TOKENS.width.min}, 20vw, ${COLUMN_TOKENS.width.max})`,
};

// ============================================
// Component
// ============================================

export function PipelineColumn<T extends { id: string }>({
  stage,
  items,
  count,
  pipelineType = 'leads',
  moneyTotal,
  currency = 'MXN',
  isOver = false,
  isValidDropTarget = false,
  isInvalidDropTarget = false,
  dropValidationMessage,
  isItemMoving,
  renderItem,
  className,
}: PipelineColumnProps<T>) {
  // Make the column droppable
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  // Combine isOver states
  const isDropTarget = isOver || isDroppableOver;
  const isHighlighted = isDropTarget && !isValidDropTarget && !isInvalidDropTarget;

  // Get item IDs for SortableContext
  const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);

  // Actual count
  const displayCount = count ?? items.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Premium glass container
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
        // Valid drop - green ring
        isValidDropTarget && 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
        // Invalid drop - red ring with dimming
        isInvalidDropTarget && 'ring-2 ring-red-500 ring-offset-2 ring-offset-background opacity-75',
        // Neutral highlight when dragging over
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={COLUMN_STYLE}
      data-pipeline-column
      role="listbox"
      aria-label={`${stage.label} - ${displayCount} items`}
    >
      {/* Column Header - Sticky */}
      <div className="shrink-0 sticky top-0 z-10">
        <PipelineColumnHeader
          title={stage.label}
          count={displayCount}
          color={stage.color}
          percentage={stage.probability}
          moneyTotal={moneyTotal}
          currency={currency}
        />
      </div>

      {/* Cards Container - Scrollable */}
      <div
        className={cn(
          // Fill remaining space
          'flex-1',
          // Enable overflow
          'min-h-0',
          // Padding
          'p-2.5 sm:p-3',
          'pt-2',
          // Vertical scroll
          'overflow-y-auto overflow-x-hidden',
          // iOS momentum
          '-webkit-overflow-scrolling-touch',
          // Spacing between cards
          'space-y-2.5 sm:space-y-3',
          // Custom scrollbar
          'scrollbar-thin'
        )}
        role="list"
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.length === 0 ? (
            <PipelineColumnEmptyState
              stageId={stage.id}
              stageName={stage.label}
              stageColor={stage.color}
              pipelineType={pipelineType}
              isDropTarget={isHighlighted}
              size="md"
            />
          ) : (
            items.map((item, index) => (
              <div
                key={item.id}
                className="animate-card-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {renderItem(item, index, isItemMoving?.(item.id) ?? false)}
              </div>
            ))
          )}
        </SortableContext>

        {/* Drop indicator when dragging over non-empty column */}
        {isHighlighted && items.length > 0 && (
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

      {/* Valid Drop Overlay - Green tint */}
      {isValidDropTarget && (
        <div
          className="absolute inset-0 rounded-xl bg-green-500/5 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Invalid Drop Overlay - Red tint with message */}
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

export default PipelineColumn;
