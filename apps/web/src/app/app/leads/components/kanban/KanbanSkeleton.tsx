'use client';

/**
 * KanbanSkeleton Component
 *
 * Loading skeleton for the Kanban board.
 * Fully responsive with appropriate sizes for all devices.
 */

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KanbanSkeletonProps {
  /** Number of columns to show */
  columns?: number;
  /** Additional CSS classes */
  className?: string;
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card/80 p-2.5 sm:p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full shrink-0" />
          {/* Name and company */}
          <div className="space-y-1">
            <Skeleton className="h-3.5 sm:h-4 w-20 sm:w-28" />
            <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-20" />
          </div>
        </div>
        {/* Score badge */}
        <Skeleton className="h-5 sm:h-6 w-8 sm:w-10 rounded-full shrink-0" />
      </div>
      {/* Status and time row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 sm:h-5 w-14 sm:w-16 rounded-full" />
        <Skeleton className="h-3 w-12 sm:w-16" />
      </div>
    </div>
  );
}

function ColumnSkeleton({ cardsCount }: { cardsCount: number }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-muted/30',
        // Responsive width matching KanbanColumn
        'w-[85vw] min-w-[280px] max-w-[320px]',
        'sm:w-72 sm:min-w-[288px] sm:max-w-none',
        'lg:w-80 lg:min-w-[320px]',
        'flex-shrink-0',
        'snap-center md:snap-align-none'
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-2.5 sm:p-3">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <Skeleton className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full" />
          <Skeleton className="h-3.5 sm:h-4 w-16 sm:w-24" />
        </div>
        <Skeleton className="h-5 sm:h-6 w-6 sm:w-8 rounded-full" />
      </div>

      {/* Cards skeleton */}
      <div className="p-2 sm:p-2.5 lg:p-3 pt-0 space-y-2 sm:space-y-2.5">
        {Array.from({ length: cardsCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton({
  columns = 5,
  className,
}: KanbanSkeletonProps) {
  // Vary cards per column for realistic look
  const cardsDistribution = [4, 3, 2, 2, 1, 1];

  // Show fewer columns on mobile for better UX
  const mobileColumns = Math.min(columns, 3);

  return (
    <div
      className={cn(
        'flex h-full overflow-x-auto overflow-y-hidden',
        // Responsive gap
        'gap-3 sm:gap-4 lg:gap-5',
        // Mobile: Full bleed with safe overflow
        '-mx-4 px-4',
        'sm:-mx-6 sm:px-6',
        'md:mx-0 md:px-0',
        // Snap scrolling for mobile
        'snap-x snap-mandatory',
        'md:snap-none',
        // Hide scrollbar for cleaner look
        'scrollbar-none',
        // Bottom padding
        'pb-4',
        // Ensure it doesn't break layout
        'max-w-[100vw] md:max-w-full',
        className
      )}
    >
      {/* Mobile: Show fewer columns */}
      <div className="contents sm:hidden">
        {Array.from({ length: mobileColumns }).map((_, i) => (
          <ColumnSkeleton
            key={i}
            cardsCount={cardsDistribution[i] || 2}
          />
        ))}
      </div>
      {/* Desktop: Show all columns */}
      <div className="hidden sm:contents">
        {Array.from({ length: columns }).map((_, i) => (
          <ColumnSkeleton
            key={i}
            cardsCount={cardsDistribution[i] || 2}
          />
        ))}
      </div>
    </div>
  );
}
