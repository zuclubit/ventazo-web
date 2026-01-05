'use client';

/**
 * CalendarSkeleton - Layout-Aware Loading State
 *
 * High-fidelity skeleton that matches the exact layout of the calendar.
 * Prevents CLS by reserving exact space during loading.
 *
 * Structure:
 * - Header (icon + title)
 * - Toolbar (navigation + view toggle + create button)
 * - Calendar Grid (7 columns x 6 rows for month view)
 *
 * @module app/calendar/components/CalendarSkeleton
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================
// Header Skeleton
// ============================================

function CalendarHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between pb-4 border-b">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1">
          {/* Title */}
          <Skeleton className="h-6 w-28" />
          {/* Subtitle */}
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
      {/* Settings button */}
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>
  );
}

// ============================================
// Toolbar Skeleton
// ============================================

function CalendarToolbarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        {/* Today button */}
        <Skeleton className="h-8 w-14 hidden sm:block rounded-md" />
        {/* Prev/Next */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
        {/* Date display */}
        <Skeleton className="h-6 w-44 ml-2" />
      </div>

      {/* Right: View Toggle + Create */}
      <div className="flex items-center gap-3">
        {/* View Toggle Group */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
        {/* Create button */}
        <Skeleton className="h-8 w-32 rounded-md" />
      </div>
    </div>
  );
}

// ============================================
// Calendar Grid Skeleton - Month View
// ============================================

function CalendarGridSkeleton() {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const weeks = 6; // Standard calendar has 6 weeks max

  return (
    <div
      className="flex-1 min-h-0 border rounded-lg overflow-hidden"
      style={{ height: 'calc(100vh - 280px)' }}
    >
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground border-r last:border-r-0"
          >
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar Weeks */}
      <div className="grid grid-rows-6 h-[calc(100%-40px)]">
        {Array.from({ length: weeks }).map((_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b last:border-b-0">
            {Array.from({ length: 7 }).map((_, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  'p-1 border-r last:border-r-0 min-h-[80px]',
                  'flex flex-col gap-1'
                )}
              >
                {/* Day number */}
                <Skeleton className="h-5 w-5 rounded-full" />

                {/* Random events */}
                {(weekIndex + dayIndex) % 3 === 0 && (
                  <Skeleton className="h-4 w-full rounded" />
                )}
                {(weekIndex + dayIndex) % 4 === 0 && (
                  <Skeleton className="h-4 w-3/4 rounded" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Empty State Skeleton
// ============================================

function CalendarEmptyStateSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Icon */}
      <Skeleton className="h-16 w-16 rounded-full mb-4" />
      {/* Title */}
      <Skeleton className="h-6 w-48 mb-2" />
      {/* Description */}
      <Skeleton className="h-4 w-64 mb-1" />
      <Skeleton className="h-4 w-56 mb-6" />
      {/* Button */}
      <Skeleton className="h-10 w-44 rounded-md" />
    </div>
  );
}

// ============================================
// Full Page Skeleton
// ============================================

interface CalendarSkeletonProps {
  /** Show empty state skeleton instead */
  showEmptyState?: boolean;
  className?: string;
}

export function CalendarSkeleton({
  showEmptyState = false,
  className,
}: CalendarSkeletonProps) {
  if (showEmptyState) {
    return <CalendarEmptyStateSkeleton />;
  }

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      role="status"
      aria-label="Cargando calendario..."
    >
      {/* Header */}
      <CalendarHeaderSkeleton />

      {/* Toolbar */}
      <CalendarToolbarSkeleton />

      {/* Grid */}
      <CalendarGridSkeleton />

      <span className="sr-only">Cargando calendario</span>
    </div>
  );
}

// Named exports for granular usage
export {
  CalendarHeaderSkeleton,
  CalendarToolbarSkeleton,
  CalendarGridSkeleton,
  CalendarEmptyStateSkeleton,
};

export default CalendarSkeleton;
