'use client';

/**
 * OpportunitiesSkeleton Components
 *
 * Loading skeleton components for opportunities:
 * - KPI Dashboard skeleton
 * - Kanban column skeleton
 * - Kanban card skeleton
 * - Preview panel skeleton
 *
 * Homologated with LeadsSkeleton design patterns.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Base Skeleton Component
// ============================================

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  );
}

// ============================================
// KPI Card Skeleton
// ============================================

export function OpportunityKPICardSkeleton() {
  return (
    <div className="rounded-xl border p-4 bg-card/80 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// ============================================
// KPI Dashboard Skeleton
// ============================================

export function OpportunitiesKPIDashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <OpportunityKPICardSkeleton />
      <OpportunityKPICardSkeleton />
      <OpportunityKPICardSkeleton />
      <OpportunityKPICardSkeleton />
    </div>
  );
}

// ============================================
// Kanban Card Skeleton
// ============================================

export function OpportunityKanbanCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-4 w-4 flex-shrink-0 mt-1" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>

      {/* Amount Row */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      {/* Progress Bar */}
      <Skeleton className="h-1.5 w-full rounded-full" />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// ============================================
// Kanban Column Skeleton
// ============================================

export function OpportunityKanbanColumnSkeleton() {
  return (
    <div
      className="flex flex-col rounded-xl border bg-muted/30"
      style={{
        minWidth: '300px',
        maxWidth: '300px',
        height: 'calc(100vh - 260px)',
        minHeight: '400px',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 rounded-t-xl bg-muted/50">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>

        {/* Stats */}
        <div className="bg-card/50 border-b px-3 py-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2">
        <OpportunityKanbanCardSkeleton />
        <OpportunityKanbanCardSkeleton />
        <OpportunityKanbanCardSkeleton />
      </div>
    </div>
  );
}

// ============================================
// Kanban Board Skeleton
// ============================================

export function OpportunityKanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 pb-4 overflow-x-auto scrollbar-none">
      <OpportunityKanbanColumnSkeleton />
      <OpportunityKanbanColumnSkeleton />
      <OpportunityKanbanColumnSkeleton />
      <OpportunityKanbanColumnSkeleton />
      <OpportunityKanbanColumnSkeleton />
    </div>
  );
}

// ============================================
// Preview Panel Skeleton
// ============================================

export function OpportunityPreviewPanelSkeleton() {
  return (
    <div className="w-[380px] h-full border-l bg-card/50 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b bg-card/50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Amount Card */}
        <div className="rounded-xl border p-4">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-28" />
        </div>

        {/* Probability */}
        <div className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 pt-4 border-t">
          <Skeleton className="h-4 w-20 mb-2" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card/50 space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Full Page Skeleton
// ============================================

export function OpportunitiesPageSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* KPIs */}
      <OpportunitiesKPIDashboardSkeleton />

      {/* Filters */}
      <div className="flex items-center gap-2 py-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Kanban Board */}
      <OpportunityKanbanBoardSkeleton />
    </div>
  );
}
