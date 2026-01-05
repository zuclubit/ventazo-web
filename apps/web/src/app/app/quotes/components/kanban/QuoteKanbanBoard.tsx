'use client';

/**
 * QuoteKanbanBoard Component
 *
 * Main orchestrator for the Quote Kanban board.
 * Follows the homologated pattern from Leads/Opportunities.
 *
 * Features:
 * - Horizontal scrollable board with indicators
 * - Drag & drop with dnd-kit
 * - Status transition validation with visual feedback
 * - Per-quote loading states
 * - Drop validation (green/red rings on columns)
 * - Drag overlay with premium card design
 *
 * @version 1.0.0
 * @module components/kanban/QuoteKanbanBoard
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
import { Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Quote, QuoteStatus } from '@/lib/quotes';
import type { QuoteColumn, StatusTransitionValidation } from '../../hooks';
import { KanbanContainer } from '@/components/kanban';
import { QuoteKanbanColumn } from './QuoteKanbanColumn';
import { QuoteCardV3Overlay } from '../QuoteCardV3';

// ============================================
// Types
// ============================================

export interface QuoteKanbanBoardProps {
  /** Columns organized by quote status */
  columns: QuoteColumn[];
  /** Whether the board is loading */
  isLoading?: boolean;
  /** Whether a move operation is in progress */
  isMoving?: boolean;
  /** Validate if a move is allowed */
  canMoveToStatus?: (quoteId: string, status: QuoteStatus) => StatusTransitionValidation;
  /** Check if a specific quote is being moved */
  isQuoteMoving?: (quoteId: string) => boolean;
  /** Handler when quote is moved to a new status */
  onMoveToStatus?: (quoteId: string, status: QuoteStatus) => void;
  /** Callback when a quote is clicked */
  onQuoteClick?: (quote: Quote) => void;
  /** Callback when send is requested */
  onQuoteSend?: (quote: Quote) => void;
  /** Callback when accept is requested */
  onQuoteAccept?: (quote: Quote) => void;
  /** Callback when reject is requested */
  onQuoteReject?: (quote: Quote) => void;
  /** Callback when duplicate is requested */
  onQuoteDuplicate?: (quote: Quote) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function QuoteKanbanBoard({
  columns,
  isLoading = false,
  isMoving = false,
  canMoveToStatus,
  isQuoteMoving,
  onMoveToStatus,
  onQuoteClick,
  onQuoteSend,
  onQuoteAccept,
  onQuoteReject,
  onQuoteDuplicate,
  className,
}: QuoteKanbanBoardProps) {
  // State for tracking the active drag
  const [activeQuote, setActiveQuote] = React.useState<Quote | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dropValidation, setDropValidation] = React.useState<StatusTransitionValidation | null>(null);

  // Configure sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  // Find quote by ID
  const findQuoteById = React.useCallback(
    (id: string): Quote | undefined => {
      for (const column of columns) {
        const found = column.quotes.find((q) => q.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  // Find column by quote ID
  const findColumnByQuoteId = React.useCallback(
    (id: string): QuoteColumn | undefined => {
      return columns.find((column) =>
        column.quotes.some((q) => q.id === id)
      );
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const quote = findQuoteById(active.id as string);
      setActiveQuote(quote || null);
    },
    [findQuoteById]
  );

  // Handle drag over with validation
  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overIdValue = (over?.id as string) || null;
      setOverId(overIdValue);

      // Validate drop target
      if (active && overIdValue && canMoveToStatus) {
        const activeId = active.id as string;

        // Determine target status
        let targetStatus: QuoteStatus | null = null;
        const overColumn = columns.find((col) => col.id === overIdValue);
        if (overColumn) {
          targetStatus = overColumn.id;
        } else {
          // Over a quote, find its column
          const quoteColumn = columns.find((col) =>
            col.quotes.some((q) => q.id === overIdValue)
          );
          if (quoteColumn) {
            targetStatus = quoteColumn.id;
          }
        }

        if (targetStatus) {
          const validation = canMoveToStatus(activeId, targetStatus);
          setDropValidation(validation);
        } else {
          setDropValidation(null);
        }
      } else {
        setDropValidation(null);
      }
    },
    [columns, canMoveToStatus]
  );

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveQuote(null);
      setOverId(null);
      setDropValidation(null);

      // No drop target
      if (!over) return;

      const activeId = active.id as string;
      const overIdValue = over.id as string;

      // Find current column
      const currentColumn = findColumnByQuoteId(activeId);
      if (!currentColumn) return;

      // Determine target status
      let targetStatus: QuoteStatus;

      // Check if over a column directly
      const overColumn = columns.find((col) => col.id === overIdValue);
      if (overColumn) {
        targetStatus = overColumn.id;
      } else {
        // Over a quote, find its column
        const quoteColumn = findColumnByQuoteId(overIdValue);
        if (!quoteColumn) return;
        targetStatus = quoteColumn.id;
      }

      // If same column, no action needed
      if (currentColumn.id === targetStatus) return;

      // Trigger move (validation happens in the handler)
      onMoveToStatus?.(activeId, targetStatus);
    },
    [columns, findColumnByQuoteId, onMoveToStatus]
  );

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveQuote(null);
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
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">Sin estados configurados</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          El sistema de cotizaciones no tiene estados disponibles.
        </p>
      </div>
    );
  }

  return (
    <KanbanContainer
      aria-label="Tablero Kanban de Cotizaciones"
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

        {/* Board Container */}
        <div
          className={cn(
            'inline-flex flex-nowrap',
            'h-full',
            'min-h-0',
            'items-stretch',
            'gap-3 sm:gap-4 lg:gap-5',
            'px-3 sm:px-4 lg:px-5',
            'pb-3'
          )}
          role="region"
          aria-label="Columnas del Kanban de Cotizaciones"
        >
          {columns.map((column) => {
            // Determine if this column is a valid drop target
            const isOver = overId === column.id;
            const isValidDropTarget = isOver && dropValidation?.allowed !== false;
            const isInvalidDropTarget = isOver && dropValidation?.allowed === false;

            return (
              <QuoteKanbanColumn
                key={column.id}
                column={column}
                isOver={isOver}
                isValidDropTarget={isValidDropTarget}
                isInvalidDropTarget={isInvalidDropTarget}
                dropValidationMessage={isInvalidDropTarget ? dropValidation?.reason : undefined}
                isQuoteMoving={isQuoteMoving}
                onQuoteClick={onQuoteClick}
                onQuoteSend={onQuoteSend}
                onQuoteAccept={onQuoteAccept}
                onQuoteReject={onQuoteReject}
                onQuoteDuplicate={onQuoteDuplicate}
              />
            );
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeQuote && <QuoteCardV3Overlay quote={activeQuote} />}
        </DragOverlay>
      </DndContext>
    </KanbanContainer>
  );
}

export default QuoteKanbanBoard;
