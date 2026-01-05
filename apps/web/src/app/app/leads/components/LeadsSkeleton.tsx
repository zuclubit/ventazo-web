'use client';

/**
 * LeadsSkeleton Component
 *
 * Skeleton loading states for the leads page.
 * Shows placeholder content while data is loading.
 *
 * Fully responsive design optimized for:
 * - Mobile: 320px - 480px
 * - Tablet: 481px - 768px
 * - Desktop: 769px+
 */

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================
// KPI Cards Skeleton
// ============================================

export function KPICardsSkeleton() {
  return (
    <div className={cn(
      'grid gap-3 sm:gap-4',
      // Responsive grid: 2 cols on mobile, 4 on desktop
      'grid-cols-2 lg:grid-cols-4',
      // Full width container
      'w-full max-w-full'
    )}>
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="backdrop-blur-xl bg-card/80 w-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16" />
                <Skeleton className="h-2.5 sm:h-3 w-14 sm:w-20" />
              </div>
              <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Lead Card Skeleton
// ============================================

export function LeadCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  return (
    <Card className={cn(
      'transition-all duration-200 w-full max-w-full overflow-hidden',
      variant === 'compact' ? 'p-2.5 sm:p-3' : 'p-3 sm:p-4'
    )}>
      {/* Mobile Layout: Stacked */}
      <div className="flex sm:hidden flex-col gap-3">
        {/* Top row: Avatar + Name + Score */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-4 w-3/4 max-w-[140px]" />
            <Skeleton className="h-3 w-1/2 max-w-[100px]" />
          </div>
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
        </div>
        {/* Bottom row: Status + Actions */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Desktop Layout: Horizontal */}
      <div className="hidden sm:flex items-center gap-3 md:gap-4">
        {/* Checkbox placeholder */}
        <Skeleton className="h-5 w-5 rounded shrink-0" />

        {/* Avatar */}
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 md:w-32" />
            <Skeleton className="h-5 w-14 md:w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20 md:w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16 md:w-20" />
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-2 w-10 md:w-12" />
        </div>

        {/* Tags - Only on larger screens */}
        <div className="hidden lg:flex gap-1 shrink-0">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        {/* Actions */}
        <div className="flex gap-1 shrink-0">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="hidden md:block h-8 w-8 rounded-md" />
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Lead List Skeleton
// ============================================

export function LeadListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {[...Array(count)].map((_, i) => (
        <LeadCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// Filters Bar Skeleton
// ============================================

export function FiltersBarSkeleton() {
  return (
    <div className="w-full max-w-full space-y-3 sm:space-y-0">
      {/* Mobile Layout: Stacked */}
      <div className="flex sm:hidden flex-col gap-3">
        {/* Search - Full width on mobile */}
        <Skeleton className="h-10 w-full rounded-lg" />
        {/* Filter row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 flex-1 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md shrink-0" />
        </div>
      </div>

      {/* Desktop Layout: Horizontal */}
      <div className="hidden sm:flex flex-wrap items-center gap-3">
        {/* Search */}
        <Skeleton className="h-9 flex-1 min-w-[160px] max-w-xs lg:max-w-md rounded-md" />

        {/* Dropdowns */}
        <Skeleton className="h-9 w-28 md:w-32 lg:w-[140px] rounded-md" />
        <Skeleton className="h-9 w-28 md:w-32 lg:w-[140px] rounded-md" />

        {/* More filters */}
        <Skeleton className="hidden md:block h-9 w-24 lg:w-[100px] rounded-md" />

        {/* Refresh */}
        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
      </div>
    </div>
  );
}

// ============================================
// Full Page Skeleton
// ============================================

export function LeadsPageSkeleton() {
  return (
    <div className={cn(
      // Responsive spacing
      'space-y-4 sm:space-y-5',
      // Full width with overflow protection
      'w-full max-w-full overflow-x-hidden'
    )}>
      {/* KPI Cards */}
      <KPICardsSkeleton />

      {/* Filters */}
      <FiltersBarSkeleton />

      {/* Lead List - fewer items on mobile for faster perceived load */}
      <div className="sm:hidden">
        <LeadListSkeleton count={4} />
      </div>
      <div className="hidden sm:block">
        <LeadListSkeleton count={6} />
      </div>

      {/* Pagination */}
      <div className={cn(
        'flex items-center pt-3 sm:pt-4',
        // Mobile: centered, Desktop: space-between
        'flex-col gap-3 sm:flex-row sm:justify-between'
      )}>
        <Skeleton className="h-4 w-32 sm:w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16 sm:w-20 rounded-md" />
          <Skeleton className="h-8 w-16 sm:w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Header Skeleton (for page title area)
// ============================================

export function LeadsHeaderSkeleton() {
  return (
    <div className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      'w-full max-w-full'
    )}>
      {/* Title */}
      <div className="space-y-1">
        <Skeleton className="h-6 sm:h-7 w-24 sm:w-32" />
        <Skeleton className="h-3 sm:h-4 w-40 sm:w-56" />
      </div>
      {/* Actions */}
      <div className="flex gap-2">
        <Skeleton className="h-9 sm:h-10 w-full sm:w-32 rounded-lg" />
      </div>
    </div>
  );
}
