'use client';

/**
 * MobileKanbanView Component - v1.0
 *
 * Modern mobile-first Kanban view following 2025 best practices:
 * - Stack View: One column at a time (like Trello, Linear, Notion)
 * - Swipeable tabs for column navigation
 * - Full vertical scroll without gesture conflicts
 * - Pull-to-refresh pattern ready
 *
 * UX Research Sources:
 * - Trello Mobile: Stack view with tab navigation
 * - Linear Mobile: Single column with swipe gestures
 * - Notion Mobile: Full-screen column views
 * - Baymard Institute: Mobile app UX patterns 2024
 *
 * @module components/kanban/MobileKanbanView
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface MobileKanbanColumn {
  id: string;
  label: string;
  color?: string;
  count: number;
}

export interface MobileKanbanViewProps {
  /** Available columns/stages */
  columns: MobileKanbanColumn[];
  /** Currently selected column ID */
  selectedColumnId: string;
  /** Callback when column changes */
  onColumnChange: (columnId: string) => void;
  /** Children (the cards for the selected column) */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Show column count badges */
  showCounts?: boolean;
  /** Enable swipe gestures */
  enableSwipe?: boolean;
}

// ============================================
// Column Tab Component
// ============================================

interface ColumnTabProps {
  column: MobileKanbanColumn;
  isSelected: boolean;
  onClick: () => void;
  showCount?: boolean;
}

function ColumnTab({ column, isSelected, onClick, showCount = true }: ColumnTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'text-sm font-medium whitespace-nowrap',
        'transition-all duration-200',
        'touch-manipulation', // Optimizes for touch
        isSelected
          ? 'bg-[var(--tenant-primary)] text-white shadow-md'
          : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
      )}
      style={{
        // Use column color as accent when selected
        ...(isSelected && column.color && {
          backgroundColor: column.color,
        }),
      }}
    >
      {/* Color dot indicator */}
      {!isSelected && column.color && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: column.color }}
        />
      )}
      <span className="truncate max-w-[100px]">{column.label}</span>
      {showCount && (
        <span
          className={cn(
            'min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-bold',
            'flex items-center justify-center',
            isSelected
              ? 'bg-white/20 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          )}
        >
          {column.count}
        </span>
      )}
    </button>
  );
}

// ============================================
// Navigation Arrows
// ============================================

interface NavArrowProps {
  direction: 'left' | 'right';
  onClick: () => void;
  disabled?: boolean;
}

function NavArrow({ direction, onClick, disabled }: NavArrowProps) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center',
        'w-8 h-8 rounded-full',
        'bg-white dark:bg-slate-800',
        'border border-slate-200 dark:border-slate-700',
        'shadow-sm',
        'transition-all duration-150',
        'touch-manipulation',
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : 'hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95'
      )}
      aria-label={direction === 'left' ? 'Columna anterior' : 'Columna siguiente'}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function MobileKanbanView({
  columns,
  selectedColumnId,
  onColumnChange,
  children,
  className,
  showCounts = true,
  enableSwipe = true,
}: MobileKanbanViewProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const selectedTabRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Touch tracking for swipe gestures
  const touchStartX = React.useRef<number>(0);
  const touchStartY = React.useRef<number>(0);
  const isSwiping = React.useRef<boolean>(false);

  // Current column index
  const currentIndex = React.useMemo(
    () => columns.findIndex((col) => col.id === selectedColumnId),
    [columns, selectedColumnId]
  );

  const currentColumn = columns[currentIndex];

  // Navigation handlers
  const goToPrevious = React.useCallback(() => {
    const prevColumn = columns[currentIndex - 1];
    if (currentIndex > 0 && prevColumn) {
      onColumnChange(prevColumn.id);
    }
  }, [currentIndex, columns, onColumnChange]);

  const goToNext = React.useCallback(() => {
    const nextColumn = columns[currentIndex + 1];
    if (currentIndex < columns.length - 1 && nextColumn) {
      onColumnChange(nextColumn.id);
    }
  }, [currentIndex, columns, onColumnChange]);

  // Auto-scroll selected tab into view
  React.useEffect(() => {
    if (scrollContainerRef.current && selectedTabRef.current) {
      const container = scrollContainerRef.current;
      const tab = selectedTabRef.current;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();

      // Center the selected tab
      const scrollLeft = tab.offsetLeft - container.offsetWidth / 2 + tab.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedColumnId]);

  // Swipe gesture handlers
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;
    const touch = e.touches[0];
    if (touch) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }
    isSwiping.current = false;
  }, [enableSwipe]);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!enableSwipe) return;
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - (touchStartX.current ?? 0);
    const deltaY = touch.clientY - (touchStartY.current ?? 0);

    // Determine if this is a horizontal swipe (not vertical scroll)
    if (!isSwiping.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
    }
  }, [enableSwipe]);

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || !isSwiping.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - (touchStartX.current ?? 0);
    const threshold = 50; // Minimum swipe distance

    if (deltaX > threshold) {
      goToPrevious();
    } else if (deltaX < -threshold) {
      goToNext();
    }

    isSwiping.current = false;
  }, [enableSwipe, goToPrevious, goToNext]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Column Tabs Header */}
      <div className="shrink-0 bg-background border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Previous Arrow */}
          <NavArrow
            direction="left"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          />

          {/* Scrollable Tabs */}
          <div
            ref={scrollContainerRef}
            className={cn(
              'flex-1 overflow-x-auto',
              'scrollbar-none', // Hide scrollbar
              '-webkit-overflow-scrolling-touch',
              'scroll-smooth'
            )}
          >
            <div className="flex items-center gap-2 px-1">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  ref={column.id === selectedColumnId ? (selectedTabRef as unknown as React.RefObject<HTMLDivElement>) : undefined}
                >
                  <ColumnTab
                    column={column}
                    isSelected={column.id === selectedColumnId}
                    onClick={() => onColumnChange(column.id)}
                    showCount={showCounts}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Next Arrow */}
          <NavArrow
            direction="right"
            onClick={goToNext}
            disabled={currentIndex === columns.length - 1}
          />
        </div>

        {/* Progress indicator */}
        <div className="h-0.5 bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-[var(--tenant-primary)] transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / columns.length) * 100}%`,
              backgroundColor: currentColumn?.color || undefined,
            }}
          />
        </div>
      </div>

      {/* Column Header Info */}
      <div className="shrink-0 px-4 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentColumn?.color && (
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: currentColumn.color }}
              />
            )}
            <h2 className="text-base font-semibold text-foreground">
              {currentColumn?.label || 'Sin columna'}
            </h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {currentColumn?.count || 0} {currentColumn?.count === 1 ? 'elemento' : 'elementos'}
          </span>
        </div>
      </div>

      {/* Cards Container - Full scroll area */}
      <div
        ref={contentRef}
        className={cn(
          'flex-1 min-h-0',
          'overflow-y-auto overflow-x-hidden',
          '-webkit-overflow-scrolling-touch',
          'overscroll-contain', // Prevent scroll chaining
          'scrollbar-thin'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-3 space-y-3">
          {children}
        </div>
      </div>

      {/* Swipe hint (shown briefly on first visit) */}
      <div className="shrink-0 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-border/50">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ChevronLeft className="h-3 w-3" />
          <span>Desliza para cambiar columna</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Mobile Drag Handle Component
// ============================================

export interface MobileDragHandleProps {
  listeners?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  className?: string;
}

/**
 * MobileDragHandle - Touch-friendly drag handle
 *
 * On mobile, only this component initiates drag.
 * The rest of the card allows normal scroll/tap.
 */
export function MobileDragHandle({
  listeners,
  attributes,
  className,
}: MobileDragHandleProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center',
        'w-8 h-10 -ml-1 mr-1',
        'rounded-lg',
        'text-muted-foreground/50',
        'hover:text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700',
        'active:bg-slate-200 dark:active:bg-slate-600',
        'transition-colors duration-150',
        'touch-none', // Only this element blocks touch
        'cursor-grab active:cursor-grabbing',
        className
      )}
      aria-label="Arrastrar para mover"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

export default MobileKanbanView;
