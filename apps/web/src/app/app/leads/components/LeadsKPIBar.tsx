'use client';

/**
 * LeadsKPIBar Component - Glass Premium 2025
 *
 * Premium glass morphism KPI strip with microinteractions.
 * Features clickable mini-cards that filter the board view.
 *
 * Metrics:
 * - Total Leads
 * - New Leads (this week)
 * - Hot Leads (score >= 70)
 * - Pending Follow-ups
 */

import * as React from 'react';

import {
  Users,
  UserPlus,
  Flame,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import type { PipelineColumn } from '@/lib/leads';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface LeadsKPIBarProps {
  /** Pipeline data with leads */
  columns: PipelineColumn[];
  /** Currently active filter */
  activeFilter?: KPIFilterType | null;
  /** Callback when a KPI is clicked */
  onFilterChange?: (filter: KPIFilterType | null) => void;
  /** Additional CSS classes */
  className?: string;
}

export type KPIFilterType = 'all' | 'new' | 'hot' | 'follow-up';

// ============================================
// KPI Mini Card Component
// ============================================

interface KPIMiniCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isActive?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'hot' | 'warning' | 'success' | 'primary';
  className?: string;
}

function KPIMiniCard({
  label,
  value,
  icon: Icon,
  trend,
  isActive = false,
  onClick,
  variant = 'default',
  className,
}: KPIMiniCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Glass Premium KPI card
        'glass-kpi',
        isActive && 'active',
        // Variant styling
        variant === 'hot' && 'hot',
        variant === 'warning' && 'warning',
        variant === 'success' && 'success',
        variant === 'primary' && 'primary',
        className
      )}
      aria-pressed={isActive}
      aria-label={`${label}: ${value}`}
    >
      {/* Icon - Glass Premium styling */}
      <div className={cn(
        'glass-kpi-icon',
        variant
      )}>
        <Icon className="h-[18px] w-[18px]" />
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0">
        {/* Value Row */}
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xl font-bold tabular-nums leading-none',
            variant === 'hot' && 'text-[var(--brand-orange)]',
            isActive && variant !== 'hot' && 'text-[#0EB58C]'
          )}>
            {value}
          </span>

          {/* Trend Badge - Premium styling */}
          {trend && (
            <span className={cn(
              'inline-flex items-center gap-0.5',
              'px-1.5 py-0.5 rounded-lg',
              'text-[11px] font-semibold',
              'backdrop-blur-sm',
              trend.isPositive
                ? 'bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-red-100/80 text-red-600 dark:bg-red-500/20 dark:text-red-400'
            )}>
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {/* Label */}
        <span className="text-[11px] text-muted-foreground truncate mt-1">
          {label}
        </span>
      </div>
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadsKPIBar({
  columns,
  activeFilter,
  onFilterChange,
  className,
}: LeadsKPIBarProps) {
  // Calculate metrics from columns
  const metrics = React.useMemo(() => {
    const allLeads = columns.flatMap((col) => col.leads);
    const totalLeads = allLeads.length;

    // New leads (created in last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newLeads = allLeads.filter((lead) => {
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
      return createdAt && createdAt >= oneWeekAgo;
    }).length;

    // Hot leads (score >= 70)
    const hotLeads = allLeads.filter((lead) => lead.score >= 70).length;

    // Pending follow-ups (leads with follow-up date in the past or today)
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const pendingFollowUps = allLeads.filter((lead) => {
      if (!lead.nextFollowUpAt) return false;
      const followUpDate = new Date(lead.nextFollowUpAt);
      return followUpDate <= today;
    }).length;

    return {
      totalLeads,
      newLeads,
      hotLeads,
      pendingFollowUps,
    };
  }, [columns]);

  const handleFilterClick = (filter: KPIFilterType) => {
    if (activeFilter === filter) {
      onFilterChange?.(null);
    } else {
      onFilterChange?.(filter);
    }
  };

  return (
    <div
      className={cn(
        // Horizontal scroll container
        'flex gap-3',
        'overflow-x-auto',
        // Proper horizontal padding for edge-to-edge scroll
        'px-4 py-2 -my-2',
        // Hide scrollbar
        'scrollbar-none',
        '-webkit-overflow-scrolling-touch',
        // Snap behavior for better UX
        'snap-x snap-mandatory',
        className
      )}
    >
      {/* Total Leads */}
      <div className="snap-start shrink-0">
        <KPIMiniCard
          label="Total Leads"
          value={metrics.totalLeads}
          icon={Users}
          variant="primary"
          isActive={activeFilter === 'all'}
          onClick={() => handleFilterClick('all')}
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* New This Week */}
      <div className="snap-start shrink-0">
        <KPIMiniCard
          label="Nuevos (7d)"
          value={metrics.newLeads}
          icon={UserPlus}
          variant="success"
          isActive={activeFilter === 'new'}
          onClick={() => handleFilterClick('new')}
        />
      </div>

      {/* Hot Leads - Emphasized with brand orange */}
      <div className="snap-start shrink-0">
        <KPIMiniCard
          label="Calientes"
          value={metrics.hotLeads}
          icon={Flame}
          variant="hot"
          isActive={activeFilter === 'hot'}
          onClick={() => handleFilterClick('hot')}
          trend={metrics.hotLeads > 0 ? { value: 8, isPositive: true } : undefined}
        />
      </div>

      {/* Pending Follow-ups */}
      <div className="snap-start shrink-0">
        <KPIMiniCard
          label="Seguimientos"
          value={metrics.pendingFollowUps}
          icon={Calendar}
          variant={metrics.pendingFollowUps > 0 ? 'warning' : 'default'}
          isActive={activeFilter === 'follow-up'}
          onClick={() => handleFilterClick('follow-up')}
        />
      </div>
    </div>
  );
}
