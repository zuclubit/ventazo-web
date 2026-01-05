'use client';

/**
 * CustomerKanbanSkeleton - Loading Skeleton for Kanban Board v1.0
 *
 * Displays a loading state that matches the Kanban board layout.
 * Uses shimmer animation for better UX.
 *
 * @module components/kanban/CustomerKanbanSkeleton
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface CustomerKanbanSkeletonProps {
  /** Number of columns to display */
  columns?: number;
  /** Number of cards per column */
  cardsPerColumn?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Card Skeleton
// ============================================

function CardSkeleton() {
  return (
    <div className="p-3 rounded-xl border border-border/80 bg-card">
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse shrink-0" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Name + Health */}
          <div className="flex items-center gap-2">
            <div className="h-4 flex-1 max-w-[120px] bg-muted rounded animate-pulse" />
            <div className="h-5 w-8 bg-muted rounded animate-pulse" />
          </div>

          {/* Tier + MRR */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-14 bg-muted rounded animate-pulse" />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Actions skeleton */}
        <div className="flex flex-col gap-1 shrink-0">
          <div className="h-7 w-7 bg-muted rounded animate-pulse" />
          <div className="h-7 w-7 bg-muted rounded animate-pulse" />
          <div className="h-7 w-7 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Column Skeleton
// ============================================

function ColumnSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div
      className={cn(
        'flex flex-col',
        'w-[300px] md:w-[320px]',
        'h-full',
        'shrink-0',
        'bg-muted/50',
        'rounded-xl',
        'border border-border/60'
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-muted animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-5 w-6 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <div className="h-6 w-6 bg-muted rounded animate-pulse" />
          <div className="h-6 w-6 bg-muted rounded animate-pulse" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="flex-1 overflow-hidden px-2 py-2 space-y-2">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function CustomerKanbanSkeleton({
  columns = 6,
  cardsPerColumn = 3,
  className,
}: CustomerKanbanSkeletonProps) {
  // Vary the number of cards per column for more natural look
  const cardCounts = React.useMemo(() => {
    return Array.from({ length: columns }).map((_, i) => {
      // First column has more, last has fewer
      if (i === 0) return Math.min(cardsPerColumn + 1, 4);
      if (i === columns - 1) return Math.max(cardsPerColumn - 2, 1);
      return Math.max(1, cardsPerColumn - (i % 2));
    });
  }, [columns, cardsPerColumn]);

  return (
    <div
      className={cn(
        'inline-flex gap-4',
        'h-full',
        'p-4',
        'min-w-max',
        className
      )}
      aria-busy="true"
      aria-label="Cargando tablero de clientes..."
    >
      {Array.from({ length: columns }).map((_, i) => (
        <ColumnSkeleton key={i} cards={cardCounts[i]} />
      ))}
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default CustomerKanbanSkeleton;
