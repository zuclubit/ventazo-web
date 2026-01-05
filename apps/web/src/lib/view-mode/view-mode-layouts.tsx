'use client';

/**
 * ViewMode Layout Components - Ventazo Design System 2025
 *
 * @description Layout wrappers for different view modes.
 * Provides consistent spacing, grid configurations, and responsive behavior.
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { ViewMode } from './types';

// ============================================
// Types
// ============================================

export interface ViewModeLayoutProps {
  /** Current view mode */
  mode: ViewMode;
  /** Children to render */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface GridLayoutProps {
  /** Number of columns on mobile */
  colsMobile?: 1 | 2;
  /** Number of columns on tablet */
  colsTablet?: 2 | 3 | 4;
  /** Number of columns on desktop */
  colsDesktop?: 3 | 4 | 5 | 6;
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface ListLayoutProps {
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  /** Dividers between items */
  dividers?: boolean;
  /** Children */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export interface KanbanLayoutProps {
  /** Children (columns) */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Layout Configuration
// ============================================

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

// ============================================
// ViewModeLayout (Auto-switching)
// ============================================

/**
 * Automatically applies the correct layout based on view mode
 */
export function ViewModeLayout({
  mode,
  children,
  className,
}: ViewModeLayoutProps) {
  switch (mode) {
    case 'grid':
      return <GridLayout className={className}>{children}</GridLayout>;
    case 'list':
      return <ListLayout className={className}>{children}</ListLayout>;
    case 'compact':
      return <CompactLayout className={className}>{children}</CompactLayout>;
    case 'kanban':
      return <KanbanLayout className={className}>{children}</KanbanLayout>;
    default:
      return <ListLayout className={className}>{children}</ListLayout>;
  }
}

// ============================================
// GridLayout
// ============================================

/**
 * Responsive grid layout for cards
 */
export function GridLayout({
  colsMobile = 1,
  colsTablet = 2,
  colsDesktop = 3,
  gap = 'md',
  children,
  className,
}: GridLayoutProps) {
  const mobileClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  };

  const tabletClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  };

  const desktopClasses = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };

  return (
    <div
      className={cn(
        'grid',
        mobileClasses[colsMobile],
        tabletClasses[colsTablet],
        desktopClasses[colsDesktop],
        gapClasses[gap],
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}

// ============================================
// ListLayout
// ============================================

/**
 * Vertical list layout
 */
export function ListLayout({
  gap = 'sm',
  dividers = false,
  children,
  className,
}: ListLayoutProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        gapClasses[gap],
        dividers && 'divide-y divide-border',
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}

// ============================================
// CompactLayout
// ============================================

/**
 * Compact list layout with minimal spacing
 */
export function CompactLayout({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        'divide-y divide-border/50',
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}

// ============================================
// KanbanLayout
// ============================================

/**
 * Horizontal kanban board layout
 */
export function KanbanLayout({
  children,
  className,
}: KanbanLayoutProps) {
  return (
    <div
      className={cn(
        'flex gap-4',
        'overflow-x-auto',
        'pb-4', // Space for scrollbar
        '-mx-4 px-4', // Full-bleed scrolling
        'snap-x snap-mandatory', // Snap scrolling on mobile
        'md:snap-none',
        className
      )}
      role="list"
      aria-label="Tablero Kanban"
    >
      {children}
    </div>
  );
}

// ============================================
// KanbanColumn
// ============================================

export interface KanbanColumnProps {
  /** Column title */
  title: string;
  /** Item count */
  count?: number;
  /** Column color (CSS color value) */
  color?: string;
  /** Header actions */
  headerActions?: React.ReactNode;
  /** Column children */
  children: React.ReactNode;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Is drop target (for visual feedback) */
  isDropTarget?: boolean;
  /** Is valid drop (green) */
  isValidDrop?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function KanbanColumn({
  title,
  count,
  color,
  headerActions,
  children,
  emptyState,
  isDropTarget = false,
  isValidDrop = false,
  className,
}: KanbanColumnProps) {
  const isEmpty = React.Children.count(children) === 0;

  return (
    <div
      className={cn(
        'flex flex-col',
        'w-[var(--kanban-column-width)] min-w-[280px] max-w-[320px]',
        'shrink-0',
        'snap-center', // Snap point for mobile
        'md:snap-align-none',
        className
      )}
      role="group"
      aria-label={`Columna ${title}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Color indicator */}
          {color && (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}

          {/* Title */}
          <h3 className="font-semibold text-sm text-foreground truncate">
            {title}
          </h3>

          {/* Count badge */}
          {count !== undefined && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>

        {/* Actions */}
        {headerActions}
      </div>

      {/* Cards container */}
      <div
        className={cn(
          'flex-1 flex flex-col gap-[var(--kanban-card-gap)]',
          'p-2 -m-2', // Padding for drop zone, negative margin to compensate
          'min-h-[var(--kanban-column-min-height)]',
          'rounded-lg',
          'transition-colors duration-200',
          // Drop target states
          isDropTarget && !isValidDrop && 'bg-muted/50 border-2 border-dashed border-muted-foreground/30',
          isDropTarget && isValidDrop && 'bg-[color-mix(in_srgb,var(--tenant-primary)_10%,transparent)] border-2 border-dashed border-[var(--tenant-primary)]'
        )}
      >
        {isEmpty && emptyState ? emptyState : children}
      </div>
    </div>
  );
}

// ============================================
// Utility: getLayoutClassNames
// ============================================

/**
 * Get CSS class names for a view mode (for custom layouts)
 */
export function getLayoutClassNames(mode: ViewMode): string {
  switch (mode) {
    case 'grid':
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    case 'list':
      return 'flex flex-col gap-3';
    case 'compact':
      return 'flex flex-col gap-1 divide-y divide-border/50';
    case 'kanban':
      return 'flex gap-4 overflow-x-auto pb-4';
    default:
      return 'flex flex-col gap-3';
  }
}
