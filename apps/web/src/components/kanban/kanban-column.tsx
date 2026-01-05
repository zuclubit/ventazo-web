'use client';

/**
 * KanbanColumn - Unified Base Component
 *
 * Premium styled kanban column with CSS design tokens.
 * Provides consistent styling across all modules (leads, opportunities, customers).
 *
 * This is a base/styled component. Module-specific logic (dnd-kit, etc)
 * should be composed on top of this in each module.
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BaseKanbanColumnProps, KanbanColumnHeaderProps, KanbanEmptyColumnProps } from './types';

// ============================================
// Column Header Component
// ============================================

export function KanbanColumnHeader({
  title,
  count,
  color,
  actions,
  className,
}: KanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        'kanban-column-header',
        'flex items-center gap-2 px-3 py-3',
        'bg-card/80 backdrop-blur-sm',
        'border-b border-border/50',
        'sticky top-0 z-10',
        className
      )}
    >
      {/* Color indicator */}
      {color && (
        <div
          className="h-3 w-3 rounded-full shrink-0 ring-2 ring-white/20"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}

      {/* Title */}
      <span className="font-medium text-sm text-foreground truncate flex-1">
        {title}
      </span>

      {/* Count badge */}
      <Badge
        variant="secondary"
        className="h-5 min-w-5 px-1.5 text-xs font-medium"
      >
        {count}
      </Badge>

      {/* Optional actions */}
      {actions}
    </div>
  );
}

// ============================================
// Empty Column Component
// ============================================

export function KanbanEmptyColumn({
  title = 'Columna vacía',
  message = 'Arrastra elementos aquí',
  isDropTarget = false,
  icon,
  className,
}: KanbanEmptyColumnProps) {
  return (
    <div
      className={cn(
        'kanban-empty-state',
        'flex flex-col items-center justify-center',
        'min-h-[var(--kanban-empty-height,120px)]',
        'py-8 px-4',
        'rounded-xl',
        'border-2 border-dashed',
        'transition-all duration-300',
        isDropTarget
          ? 'border-[var(--tenant-primary)] bg-[color-mix(in_srgb,var(--tenant-primary)_8%,transparent)]'
          : 'border-muted-foreground/20 bg-muted/30',
        className
      )}
    >
      {icon && (
        <div className="mb-2 text-muted-foreground/50">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-muted-foreground/70">
        {title}
      </p>
      <p className="text-xs text-muted-foreground/50 mt-1">
        {message}
      </p>
    </div>
  );
}

// ============================================
// Main Column Component
// ============================================

export function KanbanColumn({
  config,
  dropState = {},
  children,
  emptyState,
  className,
  width,
}: BaseKanbanColumnProps) {
  const {
    isOver = false,
    isValidDrop = false,
    isInvalidDrop = false,
    validationMessage,
  } = dropState;

  const isEmpty = React.Children.count(children) === 0;
  const isHighlighted = isOver && !isValidDrop && !isInvalidDrop;

  return (
    <div
      className={cn(
        // Premium glass container class from globals.css
        'kanban-column-premium',
        // Layout
        'flex flex-col',
        'h-full',
        'shrink-0 grow-0',
        'relative',
        // Transition
        'transition-all duration-300',
        // Drop zone states
        isValidDrop && 'ring-2 ring-[var(--status-completed)] ring-offset-2 ring-offset-background',
        isInvalidDrop && 'ring-2 ring-[var(--status-cancelled)] ring-offset-2 ring-offset-background opacity-75',
        isHighlighted && 'ring-2 ring-[var(--tenant-primary)] ring-offset-2 ring-offset-background',
        className
      )}
      style={{
        width: width ?? 'var(--kanban-column-width, 320px)',
      }}
      data-kanban-column
      role="listbox"
      aria-label={`${config.title} - ${config.count} items`}
    >
      {/* Header */}
      <KanbanColumnHeader
        title={config.title}
        count={config.count}
        color={config.color}
      />

      {/* Cards Container */}
      <ScrollArea className="flex-1 min-h-0">
        <div
          className={cn(
            'p-2.5 sm:p-3',
            'space-y-[var(--kanban-card-gap,0.75rem)]'
          )}
          role="list"
        >
          {isEmpty ? (
            emptyState ?? (
              <KanbanEmptyColumn
                title={`Sin ${config.title.toLowerCase()}`}
                isDropTarget={isHighlighted}
              />
            )
          ) : (
            children
          )}

          {/* Drop indicator when dragging over non-empty column */}
          {isHighlighted && !isEmpty && (
            <div
              className={cn(
                'h-2 rounded-full mx-2',
                'bg-gradient-to-r from-transparent via-[var(--tenant-primary)]/40 to-transparent',
                'animate-pulse'
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </ScrollArea>

      {/* Valid Drop Overlay */}
      {isValidDrop && (
        <div
          className="absolute inset-0 rounded-xl bg-[var(--status-completed)]/5 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Invalid Drop Overlay with Message */}
      {isInvalidDrop && (
        <div className="absolute inset-0 rounded-xl bg-[var(--status-cancelled)]/10 pointer-events-none flex items-center justify-center z-20">
          <div className="bg-[var(--status-cancelled-bg)] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[250px] border border-[var(--status-cancelled-border)]">
            <span className="text-xs text-[var(--status-cancelled)] font-medium">
              {validationMessage || 'Acción no permitida'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
