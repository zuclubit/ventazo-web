'use client';

/**
 * TasksSkeleton Components
 *
 * Loading skeletons for the Tasks module following the minimal design spec:
 * - TaskStatsBarSkeleton: 44px inline stats
 * - TaskToolbarSkeleton: Search + filters
 * - TaskCardSkeleton: 72px minimal card
 * - TaskKanbanColumnSkeleton: Column with header + cards
 * - TaskKanbanBoardSkeleton: Full kanban board
 * - TaskListSkeleton: Table view
 * - TasksPageSkeleton: Complete page
 *
 * Fully responsive with appropriate sizes for all devices.
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================
// TaskStatsBarSkeleton - 44px height
// ============================================

export function TaskStatsBarSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-11 flex items-center gap-3 px-3',
        'rounded-lg',
        'bg-muted/30 border border-border/50',
        className
      )}
      role="status"
      aria-label="Cargando estadísticas..."
    >
      {/* 4 stat items */}
      {[1, 2, 3, 4].map((i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-6 rounded" />
            <Skeleton className="h-3 w-14 rounded" />
          </div>
          {i < 4 && <span className="text-muted-foreground/20">·</span>}
        </React.Fragment>
      ))}
      <span className="sr-only">Cargando estadísticas de tareas</span>
    </div>
  );
}

// ============================================
// TaskToolbarSkeleton
// ============================================

export function TaskToolbarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Search input */}
      <Skeleton className="h-9 w-[240px] rounded-md" />

      {/* Filters button */}
      <Skeleton className="h-9 w-24 rounded-md" />

      {/* Spacer */}
      <div className="flex-1" />

      {/* View toggle */}
      <Skeleton className="h-8 w-32 rounded-md" />
    </div>
  );
}

// ============================================
// TaskCardSkeleton - 72px height minimal card
// ============================================

export interface TaskCardSkeletonProps {
  className?: string;
}

export function TaskCardSkeleton({ className }: TaskCardSkeletonProps) {
  return (
    <div
      className={cn(
        'h-[72px] rounded-[10px]',
        'bg-card border border-border/50',
        'border-l-[3px] border-l-muted-foreground/20',
        'px-3 py-2.5',
        'flex flex-col justify-between',
        className
      )}
      role="status"
      aria-hidden="true"
    >
      {/* Title line */}
      <Skeleton className="h-4 w-3/4 rounded" />

      {/* Bottom row: meta + avatar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
    </div>
  );
}

// ============================================
// TaskKanbanColumnSkeleton - 280px width
// ============================================

export interface TaskKanbanColumnSkeletonProps {
  cardsCount?: number;
  className?: string;
}

export function TaskKanbanColumnSkeleton({
  cardsCount = 3,
  className,
}: TaskKanbanColumnSkeletonProps) {
  return (
    <div
      className={cn(
        'w-[280px] shrink-0',
        'rounded-lg bg-muted/30',
        'flex flex-col h-full',
        className
      )}
    >
      {/* Column header - simplified */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-muted-foreground/20">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-3 w-4 rounded" />
      </div>

      {/* Cards container */}
      <div className="flex-1 p-2 space-y-2 overflow-hidden">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// TaskKanbanBoardSkeleton
// ============================================

export interface TaskKanbanBoardSkeletonProps {
  columns?: number;
  className?: string;
}

export function TaskKanbanBoardSkeleton({
  columns = 5,
  className,
}: TaskKanbanBoardSkeletonProps) {
  // Vary cards per column for realistic look
  const cardsDistribution = [3, 2, 2, 1, 1];

  // Show fewer columns on mobile
  const mobileColumns = Math.min(columns, 2);

  return (
    <div
      className={cn(
        'inline-flex flex-nowrap',
        'h-full min-h-0',
        'gap-4',
        'px-4 pb-3',
        // Snap scrolling on mobile
        'snap-x snap-mandatory md:snap-none',
        'overflow-x-auto overflow-y-hidden',
        className
      )}
      role="status"
      aria-label="Cargando tablero de tareas..."
    >
      {/* Mobile: fewer columns */}
      <div className="contents md:hidden">
        {Array.from({ length: mobileColumns }).map((_, i) => (
          <div key={i} className="snap-center">
            <TaskKanbanColumnSkeleton cardsCount={cardsDistribution[i] || 2} />
          </div>
        ))}
      </div>

      {/* Desktop: all columns */}
      <div className="hidden md:contents">
        {Array.from({ length: columns }).map((_, i) => (
          <TaskKanbanColumnSkeleton
            key={i}
            cardsCount={cardsDistribution[i] || 2}
          />
        ))}
      </div>

      <span className="sr-only">Cargando tablero de tareas</span>
    </div>
  );
}

// ============================================
// TaskListRowSkeleton - Table row
// ============================================

export function TaskListRowSkeleton() {
  return (
    <tr className="border-b border-border/50">
      {/* Checkbox/complete */}
      <td className="py-2 px-2 w-8">
        <Skeleton className="h-5 w-5 rounded" />
      </td>
      {/* Title + entity */}
      <td className="py-2 px-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </td>
      {/* Due date */}
      <td className="py-2 px-3 w-24">
        <Skeleton className="h-3 w-16 rounded" />
      </td>
      {/* Assignee */}
      <td className="py-2 px-3 w-20">
        <Skeleton className="h-5 w-5 rounded-full" />
      </td>
      {/* Actions */}
      <td className="py-2 px-2 w-8">
        <Skeleton className="h-5 w-5 rounded" />
      </td>
    </tr>
  );
}

// ============================================
// TaskListSkeleton - Table view
// ============================================

export interface TaskListSkeletonProps {
  rows?: number;
  className?: string;
}

export function TaskListSkeleton({
  rows = 8,
  className,
}: TaskListSkeletonProps) {
  return (
    <div className={cn(className)}>
      {/* Count */}
      <Skeleton className="h-3 w-16 rounded mb-3" />

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30">
              <th className="w-8"></th>
              <th className="text-left py-2 px-3">
                <Skeleton className="h-3 w-12 rounded" />
              </th>
              <th className="text-left py-2 px-3 w-24">
                <Skeleton className="h-3 w-10 rounded" />
              </th>
              <th className="text-left py-2 px-3 w-20">
                <Skeleton className="h-3 w-14 rounded" />
              </th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TaskListRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3">
        <Skeleton className="h-3 w-8 rounded" />
        <div className="flex gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// TasksHeaderSkeleton
// ============================================

export function TasksHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <Skeleton className="h-6 w-20 rounded" />
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  );
}

// ============================================
// TasksPageSkeleton - Full page
// ============================================

export interface TasksPageSkeletonProps {
  viewMode?: 'kanban' | 'list';
  className?: string;
}

export function TasksPageSkeleton({
  viewMode = 'kanban',
  className,
}: TasksPageSkeletonProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header section */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-2 space-y-3">
        {/* Title + button */}
        <TasksHeaderSkeleton />

        {/* Stats bar */}
        <TaskStatsBarSkeleton />

        {/* Toolbar */}
        <TaskToolbarSkeleton />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'kanban' ? (
          <TaskKanbanBoardSkeleton columns={5} />
        ) : (
          <TaskListSkeleton rows={8} />
        )}
      </div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default TasksPageSkeleton;
