'use client';

/**
 * QuotesKPICards Component
 *
 * Dashboard-style KPI cards showing quote metrics.
 * Clickable cards that can filter the quote list.
 *
 * Metrics displayed:
 * 1. Pendientes (draft + sent + viewed) - with total value
 * 2. Tasa de conversión (accepted / total)
 * 3. Por vencer (expiring in next 7 days)
 * 4. Valor promedio (average quote value)
 *
 * @version 1.0.0
 * @module components/QuotesKPICards
 */

import * as React from 'react';
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  Calculator,
  CheckCircle,
  XCircle,
  Send,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteStats, QuoteStatus } from '@/lib/quotes';

// ============================================
// Types
// ============================================

export interface QuotesKPICardsProps {
  /** Quote statistics */
  stats?: QuoteStats;
  /** Currently active filter status */
  activeFilter?: QuoteStatus | 'pending' | 'expiring' | null;
  /** Click handler for filtering */
  onFilterClick?: (filter: QuoteStatus | 'pending' | 'expiring' | null) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; value: number };
  icon: typeof FileText;
  color: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  isActive?: boolean;
  onClick?: () => void;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format currency for KPI display
 * Note: Backend stores values in cents, so we divide by 100
 */
function formatCurrency(amount: number, compact: boolean = true): string {
  const amountInDollars = amount / 100;
  if (compact) {
    if (amountInDollars >= 1000000) {
      return `$${(amountInDollars / 1000000).toFixed(1)}M`;
    }
    if (amountInDollars >= 1000) {
      return `$${(amountInDollars / 1000).toFixed(0)}K`;
    }
  }
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountInDollars);
}

// ============================================
// Color Configuration
// ============================================

// Color configuration using CSS variables for consistent theming
const COLOR_CONFIG = {
  primary: {
    bg: 'bg-[var(--action-send-bg)]',
    bgHover: 'hover:bg-[var(--action-send-bg)]/80',
    bgActive: 'bg-[var(--action-send-bg)] ring-2 ring-[var(--action-send)]',
    icon: 'text-[var(--action-send)]',
    iconBg: 'bg-[var(--action-send-bg)]',
    text: 'text-[var(--action-send)]',
  },
  success: {
    bg: 'bg-[var(--action-accept-bg)]',
    bgHover: 'hover:bg-[var(--action-accept-bg)]/80',
    bgActive: 'bg-[var(--action-accept-bg)] ring-2 ring-[var(--action-accept)]',
    icon: 'text-[var(--action-accept)]',
    iconBg: 'bg-[var(--action-accept-bg)]',
    text: 'text-[var(--action-accept)]',
  },
  warning: {
    bg: 'bg-[var(--urgency-today-bg)]',
    bgHover: 'hover:bg-[var(--urgency-today-bg)]/80',
    bgActive: 'bg-[var(--urgency-today-bg)] ring-2 ring-[var(--urgency-today)]',
    icon: 'text-[var(--urgency-today)]',
    iconBg: 'bg-[var(--urgency-today-bg)]',
    text: 'text-[var(--urgency-today)]',
  },
  info: {
    bg: 'bg-[var(--action-duplicate-bg)]',
    bgHover: 'hover:bg-[var(--action-duplicate-bg)]/80',
    bgActive: 'bg-[var(--action-duplicate-bg)] ring-2 ring-[var(--action-duplicate)]',
    icon: 'text-[var(--action-duplicate)]',
    iconBg: 'bg-[var(--action-duplicate-bg)]',
    text: 'text-[var(--action-duplicate)]',
  },
  danger: {
    bg: 'bg-[var(--action-reject-bg)]',
    bgHover: 'hover:bg-[var(--action-reject-bg)]/80',
    bgActive: 'bg-[var(--action-reject-bg)] ring-2 ring-[var(--action-reject)]',
    icon: 'text-[var(--action-reject)]',
    iconBg: 'bg-[var(--action-reject-bg)]',
    text: 'text-[var(--action-reject)]',
  },
};

// ============================================
// KPI Card Sub-component
// ============================================

const KPICard = React.memo<KPICardProps>(function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
  isActive = false,
  onClick,
}) {
  const colors = COLOR_CONFIG[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 min-w-[160px] max-w-[280px]',
        'p-4 rounded-xl',
        'border border-border/50',
        'transition-all duration-200',
        'text-left',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        isActive ? colors.bgActive : colors.bg,
        !isActive && colors.bgHover,
        onClick && 'cursor-pointer'
      )}
      aria-pressed={isActive}
      aria-label={`${title}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <p className={cn(
            'text-2xl font-bold tracking-tight tabular-nums',
            'text-foreground'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn('text-xs mt-0.5', colors.text)}>
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              trend.direction === 'up' ? 'text-[var(--trend-up)]' :
              trend.direction === 'down' ? 'text-[var(--trend-down)]' :
              'text-[var(--trend-neutral)]'
            )}>
              <TrendingUp className={cn(
                'h-3 w-3',
                trend.direction === 'down' && 'rotate-180'
              )} />
              {trend.value}%
            </p>
          )}
        </div>
        <div className={cn(
          'shrink-0',
          'w-10 h-10 rounded-lg',
          'flex items-center justify-center',
          colors.iconBg
        )}>
          <Icon className={cn('h-5 w-5', colors.icon)} />
        </div>
      </div>
    </button>
  );
});

// ============================================
// Skeleton Component
// ============================================

const KPICardSkeleton = React.memo(function KPICardSkeleton() {
  return (
    <div className={cn(
      'flex-1 min-w-[160px] max-w-[280px]',
      'p-4 rounded-xl',
      'bg-muted/30',
      'border border-border/50'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-muted-foreground/20 animate-pulse" />
          <div className="h-8 w-20 rounded bg-muted-foreground/20 animate-pulse" />
          <div className="h-3 w-12 rounded bg-muted-foreground/20 animate-pulse" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 animate-pulse" />
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export function QuotesKPICards({
  stats,
  activeFilter,
  onFilterClick,
  isLoading = false,
  className,
}: QuotesKPICardsProps) {
  if (isLoading || !stats) {
    return (
      <div className={cn(
        'flex gap-3 overflow-x-auto pb-2',
        '-mx-4 px-4 sm:mx-0 sm:px-0',
        className
      )}>
        {[1, 2, 3, 4].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Calculate pending (draft + sent + viewed)
  const pendingCount = stats.draft + stats.sent;
  const pendingValue = stats.pendingValue;

  // Calculate conversion rate
  const conversionRate = stats.conversionRate;

  // Average quote value
  const avgValue = stats.total > 0 ? Math.round(stats.totalValue / stats.total) : 0;

  // Expiring count (would need to be calculated from actual quotes)
  // For now we'll use a placeholder - in real app this would come from the API
  const expiringCount = 0; // TODO: Add to API

  return (
    <div className={cn(
      'flex gap-3 overflow-x-auto pb-2',
      '-mx-4 px-4 sm:mx-0 sm:px-0',
      'scrollbar-thin',
      className
    )}>
      {/* Pending Quotes */}
      <KPICard
        title="Pendientes"
        value={pendingCount}
        subtitle={formatCurrency(pendingValue)}
        icon={FileText}
        color="primary"
        isActive={activeFilter === 'pending'}
        onClick={() => onFilterClick?.(activeFilter === 'pending' ? null : 'pending')}
      />

      {/* Conversion Rate */}
      <KPICard
        title="Tasa de Conversión"
        value={`${conversionRate}%`}
        subtitle={`${stats.accepted} aceptadas`}
        icon={CheckCircle}
        color="success"
        isActive={activeFilter === 'accepted'}
        onClick={() => onFilterClick?.(activeFilter === 'accepted' ? null : 'accepted')}
      />

      {/* Expiring Soon */}
      <KPICard
        title="Por Vencer"
        value={expiringCount}
        subtitle="próx. 7 días"
        icon={AlertTriangle}
        color="warning"
        isActive={activeFilter === 'expiring'}
        onClick={() => onFilterClick?.(activeFilter === 'expiring' ? null : 'expiring')}
      />

      {/* Average Value */}
      <KPICard
        title="Valor Promedio"
        value={formatCurrency(avgValue, false)}
        subtitle={`${stats.total} cotizaciones`}
        icon={Calculator}
        color="info"
        isActive={false}
        // This one doesn't filter
      />
    </div>
  );
}

export default QuotesKPICards;
