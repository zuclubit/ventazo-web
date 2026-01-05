'use client';

/**
 * QuoteKanbanColumn Component
 *
 * Droppable column for quotes organized by status.
 * Follows the homologated pattern from Leads/Opportunities.
 *
 * Features:
 * - Status transition validation visual feedback (green/red rings)
 * - Per-quote loading states (isMoving)
 * - Drop validation message display
 * - Premium glass container with overlays
 * - Smooth transitions (200-300ms)
 *
 * @version 1.0.0
 * @module components/kanban/QuoteKanbanColumn
 */

import * as React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Ban, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quote, QuoteStatus } from '@/lib/quotes';
import type { QuoteColumn } from '../../hooks';
import { QuoteCardV3 } from '../QuoteCardV3';

export interface QuoteKanbanColumnProps {
  /** Column data with status info and quotes */
  column: QuoteColumn;
  /** Whether a dragged item is over this column */
  isOver?: boolean;
  /** Whether the drop is valid (for visual feedback) - green ring */
  isValidDropTarget?: boolean;
  /** Whether the drop is invalid (for visual feedback) - red ring */
  isInvalidDropTarget?: boolean;
  /** Message to show when drop is invalid */
  dropValidationMessage?: string;
  /** Function to check if a specific quote is being moved */
  isQuoteMoving?: (quoteId: string) => boolean;
  /** Click handler when a quote card is clicked */
  onQuoteClick?: (quote: Quote) => void;
  /** Send handler */
  onQuoteSend?: (quote: Quote) => void;
  /** Accept handler */
  onQuoteAccept?: (quote: Quote) => void;
  /** Reject handler */
  onQuoteReject?: (quote: Quote) => void;
  /** Duplicate handler */
  onQuoteDuplicate?: (quote: Quote) => void;
  /** Additional CSS classes */
  className?: string;
}

// Column width by breakpoint (responsive)
const COLUMN_WIDTHS = {
  tablet: '16.25rem',   // 260px
  desktop: '17.5rem',   // 280px
  wide: '18.75rem',     // 300px
} as const;

/**
 * Format currency for column header (compact display)
 * Note: Backend stores values in cents, so we divide by 100
 */
function formatCurrency(amount: number): string {
  const amountInDollars = amount / 100;
  if (amountInDollars >= 1000000) {
    return `$${(amountInDollars / 1000000).toFixed(1)}M`;
  }
  if (amountInDollars >= 1000) {
    return `$${(amountInDollars / 1000).toFixed(0)}K`;
  }
  return `$${amountInDollars.toFixed(0)}`;
}

/**
 * Column Header Sub-component
 */
const ColumnHeader = React.memo<{
  title: string;
  count: number;
  totalValue: number;
  colorHex: string;
}>(function ColumnHeader({ title, count, totalValue, colorHex }) {
  return (
    <div
      className={cn(
        'px-3 py-2.5',
        'bg-card/80',
        'backdrop-blur-md',
        'border-b border-border/50',
        'rounded-t-xl'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Color indicator */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: colorHex }}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {title}
          </h3>
        </div>

        {/* Count badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'px-2 py-0.5 rounded-full',
            'text-xs font-medium tabular-nums',
            'bg-muted text-muted-foreground'
          )}>
            {count}
          </span>
        </div>
      </div>

      {/* Total value */}
      {totalValue > 0 && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign className="h-3 w-3" aria-hidden="true" />
          <span className="font-medium tabular-nums">{formatCurrency(totalValue)}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Empty Column State
 */
const EmptyColumn = React.memo<{
  statusId: QuoteStatus;
  statusLabel: string;
  colorHex: string;
  isOver: boolean;
}>(function EmptyColumn({ statusId, statusLabel, colorHex, isOver }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-8 px-4',
        'text-center',
        'rounded-lg border-2 border-dashed',
        'transition-all duration-200',
        isOver
          ? 'border-primary bg-primary/5'
          : 'border-border',
        'text-muted-foreground'
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
        style={{ backgroundColor: `${colorHex}20` }}
      >
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: colorHex }}
        />
      </div>
      <p className="text-sm font-medium">Sin cotizaciones</p>
      <p className="text-xs mt-1 opacity-70">
        Arrastra aquí para mover
      </p>
    </div>
  );
});

export function QuoteKanbanColumn({
  column,
  isOver = false,
  isValidDropTarget = false,
  isInvalidDropTarget = false,
  dropValidationMessage,
  isQuoteMoving,
  onQuoteClick,
  onQuoteSend,
  onQuoteAccept,
  onQuoteReject,
  onQuoteDuplicate,
  className,
}: QuoteKanbanColumnProps) {
  const { id, label, colorHex, quotes, count, totalValue } = column;

  // Make the column droppable
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id,
    data: {
      type: 'column',
      status: id,
    },
  });

  // Combine internal and external isOver states
  const isDropTarget = isOver || isDroppableOver;
  const isHighlighted = isDropTarget && !isValidDropTarget && !isInvalidDropTarget;

  // Get quote IDs for SortableContext
  const quoteIds = React.useMemo(() => quotes.map((q) => q.id), [quotes]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Premium glass container
        'kanban-column-premium',
        'bg-muted/50',
        'backdrop-blur-sm',
        'border border-border/50',
        'rounded-xl',
        'shadow-sm',
        // Flex column for header + cards layout
        'flex flex-col',
        // Full height from parent
        'h-full',
        // Never shrink width
        'shrink-0 grow-0',
        // Relative for overlays
        'relative',
        // Transition for drop zone highlight
        'transition-all duration-300',
        // Valid drop target - green ring
        isValidDropTarget && 'ring-2 ring-green-500 ring-offset-2 ring-offset-background',
        // Invalid drop target - red ring
        isInvalidDropTarget && 'ring-2 ring-red-500 ring-offset-2 ring-offset-background opacity-75',
        // Just hovering (no validation yet) - default highlight
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={{
        width: `clamp(${COLUMN_WIDTHS.tablet}, 20vw, ${COLUMN_WIDTHS.wide})`,
      }}
      data-kanban-column
      role="listbox"
      aria-label={`${label} - ${count} cotizaciones`}
    >
      {/* Column Header */}
      <div className="shrink-0 sticky top-0 z-10">
        <ColumnHeader
          title={label}
          count={count}
          totalValue={totalValue}
          colorHex={colorHex}
        />
      </div>

      {/* Cards Container */}
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
        <SortableContext items={quoteIds} strategy={verticalListSortingStrategy}>
          {quotes.length === 0 ? (
            <EmptyColumn
              statusId={id}
              statusLabel={label}
              colorHex={colorHex}
              isOver={isHighlighted}
            />
          ) : (
            quotes.map((quote, index) => (
              <div
                key={quote.id}
                className="animate-card-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <QuoteCardV3
                  quote={quote}
                  variant="standard"
                  hideStatusBadge // Hide status badge in Kanban - column header already shows it
                  isMoving={isQuoteMoving?.(quote.id)}
                  onClick={() => onQuoteClick?.(quote)}
                  onSend={() => onQuoteSend?.(quote)}
                  onAccept={() => onQuoteAccept?.(quote)}
                  onReject={() => onQuoteReject?.(quote)}
                  onDuplicate={() => onQuoteDuplicate?.(quote)}
                />
              </div>
            ))
          )}
        </SortableContext>

        {/* Drop indicator when dragging over */}
        {isHighlighted && quotes.length > 0 && (
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

      {/* Valid Drop Indicator */}
      {isValidDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-green-500/5 pointer-events-none" />
      )}

      {/* Invalid Drop Indicator */}
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

export default QuoteKanbanColumn;
