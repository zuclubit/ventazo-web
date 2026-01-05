'use client';

/**
 * MetricCard Component
 *
 * @phase FASE 6 - Uses CARD_TOKENS from Design System
 */

import { type LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CARD_TOKENS, getCardInteractiveClasses } from '@/components/cards';

/**
 * Metric card variants using CSS design tokens
 * These automatically adapt to light/dark mode
 */
const variantStyles = {
  default: {
    icon: 'bg-muted text-foreground',
    value: 'text-foreground',
  },
  success: {
    icon: 'bg-[var(--status-completed-bg)] text-[var(--status-completed)]',
    value: 'text-[var(--status-completed)]',
  },
  warning: {
    icon: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]',
    value: 'text-[var(--status-pending)]',
  },
  destructive: {
    icon: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]',
    value: 'text-[var(--status-cancelled)]',
  },
  info: {
    icon: 'bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)]',
    value: 'text-[var(--status-in-progress)]',
  },
  primary: {
    icon: 'bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)] text-[var(--tenant-primary)]',
    value: 'text-[var(--tenant-primary)]',
  },
  accent: {
    icon: 'bg-[color-mix(in_srgb,var(--tenant-accent)_15%,transparent)] text-[var(--tenant-accent)]',
    value: 'text-[var(--tenant-accent)]',
  },
} as const;

export type MetricCardVariant = keyof typeof variantStyles;

export interface MetricCardProps {
  /** The title/label for the metric */
  title: string;
  /** The numeric or string value to display */
  value: string | number;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Color variant - defaults to 'default' */
  variant?: MetricCardVariant;
  /** Optional trend indicator */
  trend?: {
    value: number;
    label?: string;
    isPositiveGood?: boolean;
  };
  /** Optional subtitle/description */
  description?: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * MetricCard Component
 *
 * Reusable metric display card with semantic color variants.
 * Uses CSS design tokens for automatic light/dark mode support.
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Tasks"
 *   value={42}
 *   icon={CheckSquare}
 *   variant="primary"
 *   trend={{ value: 12, label: "vs last week" }}
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  trend,
  description,
  className,
  onClick,
  isLoading = false,
}: MetricCardProps) {
  const styles = variantStyles[variant];

  const trendColor = trend
    ? (trend.isPositiveGood ?? true)
      ? trend.value >= 0
        ? 'text-[var(--status-completed)]'
        : 'text-[var(--status-cancelled)]'
      : trend.value <= 0
        ? 'text-[var(--status-completed)]'
        : 'text-[var(--status-cancelled)]'
    : '';

  return (
    <Card
      variant="elevated"
      className={cn(
        'metric-card overflow-hidden',
        CARD_TOKENS.transition.normal,
        getCardInteractiveClasses(!!onClick),
        CARD_TOKENS.focus.ring,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Icon Container */}
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform',
              onClick && 'group-hover:scale-105',
              styles.icon,
              isLoading && 'animate-pulse'
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>

            {isLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p
                className={cn(
                  'text-2xl font-bold tracking-tight',
                  styles.value
                )}
              >
                {typeof value === 'number' ? value.toLocaleString() : value}
              </p>
            )}

            {/* Trend */}
            {trend && !isLoading && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn('text-xs font-medium', trendColor)}>
                  {trend.value >= 0 ? '+' : ''}
                  {trend.value}%
                </span>
                {trend.label && (
                  <span className="text-xs text-muted-foreground">
                    {trend.label}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {description && !isLoading && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MetricCardSkeleton - Loading placeholder for MetricCard
 */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card variant="elevated" className={cn('metric-card', className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * MetricCardGrid - Grid layout for multiple MetricCards
 */
export function MetricCardGrid({
  children,
  className,
  columns = 4,
}: {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 5;
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
