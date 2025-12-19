'use client';

/**
 * OpportunitiesKPIDashboard Component
 *
 * Dashboard with 4 clickable KPI cards for opportunities:
 * 1. Pipeline Total - Total value in pipeline
 * 2. Forecast - Weighted value
 * 3. Ganadas - Won opportunities
 * 4. Perdidas - Lost opportunities
 *
 * Features:
 * - Glassmorphism design
 * - Trend indicators
 * - Click to filter by status
 * - Responsive grid
 *
 * Homologated with LeadsKPIDashboard design patterns.
 */

import * as React from 'react';
import {
  DollarSign,
  Target,
  Trophy,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type OpportunityKPIFilter = 'all' | 'open' | 'won' | 'lost';

export interface OpportunitiesKPIDashboardProps {
  /** Total value in pipeline */
  pipelineTotal: number;
  /** Total opportunities count */
  totalCount: number;
  /** Weighted forecast value */
  forecastValue: number;
  /** Total won amount */
  wonAmount: number;
  /** Won count */
  wonCount: number;
  /** Total lost amount */
  lostAmount: number;
  /** Lost count */
  lostCount: number;
  /** Previous period values for trends */
  previousPeriod?: {
    pipelineTotal?: number;
    forecastValue?: number;
    wonAmount?: number;
    lostAmount?: number;
  };
  /** Currently active filter */
  activeFilter?: OpportunityKPIFilter;
  /** Handler when a KPI is clicked */
  onFilterChange?: (filter: OpportunityKPIFilter) => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatFullCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateTrend(current: number, previous?: number): {
  type: 'up' | 'down' | 'neutral';
  percentage: number;
} {
  if (!previous || previous === 0) {
    return { type: 'neutral', percentage: 0 };
  }

  const change = ((current - previous) / previous) * 100;

  if (change > 0) {
    return { type: 'up', percentage: Math.abs(change) };
  } else if (change < 0) {
    return { type: 'down', percentage: Math.abs(change) };
  }

  return { type: 'neutral', percentage: 0 };
}

// ============================================
// KPI Card Component
// ============================================

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  trend?: { type: 'up' | 'down' | 'neutral'; percentage: number };
  isActive?: boolean;
  colorScheme: 'primary' | 'success' | 'danger' | 'info';
  onClick?: () => void;
  className?: string;
}

function KPICard({
  icon,
  title,
  value,
  subtitle,
  trend,
  isActive = false,
  colorScheme,
  onClick,
  className,
}: KPICardProps) {
  const colorClasses = {
    primary: {
      icon: 'bg-primary/10 text-primary',
      ring: 'ring-primary',
      glow: 'shadow-primary/20',
    },
    success: {
      icon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      ring: 'ring-emerald-500',
      glow: 'shadow-emerald-500/20',
    },
    danger: {
      icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      ring: 'ring-red-500',
      glow: 'shadow-red-500/20',
    },
    info: {
      icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      ring: 'ring-blue-500',
      glow: 'shadow-blue-500/20',
    },
  };

  const colors = colorClasses[colorScheme];

  const TrendIcon = trend?.type === 'up' ? TrendingUp : trend?.type === 'down' ? TrendingDown : Minus;
  const trendColorClass = trend?.type === 'up'
    ? 'text-emerald-600 dark:text-emerald-400'
    : trend?.type === 'down'
    ? 'text-red-600 dark:text-red-400'
    : 'text-muted-foreground';

  return (
    <button
      type="button"
      className={cn(
        'relative w-full text-left',
        'rounded-xl border p-4',
        'bg-card/80 backdrop-blur-sm',
        'transition-all duration-200',
        'hover:shadow-lg hover:border-primary/30',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive && [
          'ring-2',
          colors.ring,
          'shadow-lg',
          colors.glow,
        ],
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center',
            'h-10 w-10 rounded-xl',
            colors.icon
          )}
        >
          {icon}
        </div>

        {/* Trend */}
        {trend && trend.type !== 'neutral' && (
          <div className={cn('flex items-center gap-1 text-xs', trendColorClass)}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium">{trend.percentage.toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-3">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-0.5 bg-primary rounded-t-full" />
      )}
    </button>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function KPISkeleton() {
  return (
    <div className="rounded-xl border p-4 bg-card/80 backdrop-blur-sm animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="h-4 w-12 rounded bg-muted" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OpportunitiesKPIDashboard({
  pipelineTotal,
  totalCount,
  forecastValue,
  wonAmount,
  wonCount,
  lostAmount,
  lostCount,
  previousPeriod,
  activeFilter = 'all',
  onFilterChange,
  isLoading = false,
  className,
}: OpportunitiesKPIDashboardProps) {
  // Calculate trends
  const pipelineTrend = calculateTrend(pipelineTotal, previousPeriod?.pipelineTotal);
  const forecastTrend = calculateTrend(forecastValue, previousPeriod?.forecastValue);
  const wonTrend = calculateTrend(wonAmount, previousPeriod?.wonAmount);
  const lostTrend = calculateTrend(lostAmount, previousPeriod?.lostAmount);

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {/* Pipeline Total */}
      <KPICard
        icon={<DollarSign className="h-5 w-5" />}
        title="Pipeline Total"
        value={formatCurrency(pipelineTotal)}
        subtitle={`${totalCount} oportunidades`}
        trend={pipelineTrend}
        isActive={activeFilter === 'all'}
        colorScheme="primary"
        onClick={() => onFilterChange?.('all')}
      />

      {/* Forecast */}
      <KPICard
        icon={<Target className="h-5 w-5" />}
        title="Forecast"
        value={formatCurrency(forecastValue)}
        subtitle="Valor ponderado"
        trend={forecastTrend}
        isActive={activeFilter === 'open'}
        colorScheme="info"
        onClick={() => onFilterChange?.('open')}
      />

      {/* Won */}
      <KPICard
        icon={<Trophy className="h-5 w-5" />}
        title="Ganadas"
        value={formatCurrency(wonAmount)}
        subtitle={`${wonCount} cerradas`}
        trend={wonTrend}
        isActive={activeFilter === 'won'}
        colorScheme="success"
        onClick={() => onFilterChange?.('won')}
      />

      {/* Lost */}
      <KPICard
        icon={<XCircle className="h-5 w-5" />}
        title="Perdidas"
        value={formatCurrency(lostAmount)}
        subtitle={`${lostCount} cerradas`}
        trend={lostTrend}
        isActive={activeFilter === 'lost'}
        colorScheme="danger"
        onClick={() => onFilterChange?.('lost')}
      />
    </div>
  );
}
