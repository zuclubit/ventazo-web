'use client';

/**
 * CustomerHealthIndicator - Health Score Badge Component v1.0
 *
 * Displays customer health score with visual indicators.
 * Uses CSS variables for dynamic theming.
 *
 * Design:
 * - Gradient background based on health level
 * - Pulse animation for critical status
 * - Multiple sizes (sm, md, lg)
 * - WCAG 2.1 AA compliant
 *
 * @module components/CustomerHealthIndicator
 */

import * as React from 'react';
import { Heart, HeartPulse, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerHealth, type HealthLevel } from '../hooks';

// ============================================
// Types
// ============================================

export type HealthIndicatorSize = 'sm' | 'md' | 'lg';
export type HealthIndicatorVariant = 'badge' | 'compact' | 'pill' | 'icon-only';

export interface CustomerHealthIndicatorProps {
  /** Health score (0-100) */
  score: number;
  /** Size variant */
  size?: HealthIndicatorSize;
  /** Display variant */
  variant?: HealthIndicatorVariant;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Trend direction */
  trend?: 'up' | 'down' | 'stable';
  /** Optional label override */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Constants
// ============================================

const SIZE_CONFIG = {
  sm: {
    badge: 'min-w-[1.75rem] h-5 px-1.5 text-[10px] rounded-md',
    compact: 'gap-1 text-[10px]',
    pill: 'px-2 py-0.5 text-[10px] rounded-full',
    iconOnly: 'w-5 h-5 rounded-md',
    icon: 'h-2.5 w-2.5',
    trendIcon: 'h-2 w-2',
  },
  md: {
    badge: 'min-w-[2rem] h-6 px-2 text-xs rounded-lg',
    compact: 'gap-1.5 text-xs',
    pill: 'px-2.5 py-1 text-xs rounded-full',
    iconOnly: 'w-6 h-6 rounded-lg',
    icon: 'h-3 w-3',
    trendIcon: 'h-2.5 w-2.5',
  },
  lg: {
    badge: 'min-w-[2.5rem] h-8 px-3 text-sm rounded-xl',
    compact: 'gap-2 text-sm',
    pill: 'px-3 py-1.5 text-sm rounded-full',
    iconOnly: 'w-8 h-8 rounded-xl',
    icon: 'h-4 w-4',
    trendIcon: 'h-3 w-3',
  },
};

const LEVEL_LABELS: Record<HealthLevel, string> = {
  excellent: 'Excelente',
  good: 'Bueno',
  at_risk: 'En Riesgo',
  critical: 'Critico',
};

// ============================================
// Component
// ============================================

export const CustomerHealthIndicator = React.memo(function CustomerHealthIndicator({
  score,
  size = 'md',
  variant = 'badge',
  showTrend = false,
  trend,
  label,
  className,
}: CustomerHealthIndicatorProps) {
  const { getHealthLevel, getHealthColor, getHealthBgColor, getHealthBorderColor } = useCustomerHealth();

  const level = getHealthLevel(score);
  const isCritical = level === 'critical';
  const isAtRisk = level === 'at_risk';
  const sizeConfig = SIZE_CONFIG[size];

  // Get CSS variable values
  const healthColor = getHealthColor(level);
  const healthBg = getHealthBgColor(level);
  const healthBorder = getHealthBorderColor(level);

  // Determine icon
  const HeartIcon = isCritical ? HeartPulse : Heart;

  // Render trend indicator
  const TrendIndicator = React.useMemo(() => {
    if (!showTrend || !trend) return null;

    const TrendIcon = trend === 'up' ? TrendingUp :
                      trend === 'down' ? TrendingDown : Minus;

    const trendColor = trend === 'up' ? 'text-[var(--status-success)]' :
                       trend === 'down' ? 'text-[var(--status-error)]' : 'text-muted-foreground';

    return (
      <TrendIcon className={cn(sizeConfig.trendIcon, trendColor)} />
    );
  }, [showTrend, trend, sizeConfig.trendIcon]);

  // Variant: Icon Only
  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          'flex items-center justify-center',
          sizeConfig.iconOnly,
          'transition-all duration-200',
          isCritical && 'animate-pulse',
          className
        )}
        style={{
          backgroundColor: healthBg,
          borderColor: healthBorder,
          color: healthColor,
        }}
        title={`Salud: ${score} - ${label || LEVEL_LABELS[level]}`}
        aria-label={`Salud del cliente: ${score} de 100, nivel ${LEVEL_LABELS[level]}`}
      >
        <HeartIcon className={sizeConfig.icon} />
      </div>
    );
  }

  // Variant: Compact (inline with text)
  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center',
          sizeConfig.compact,
          'font-medium',
          isCritical && 'animate-pulse',
          className
        )}
        style={{ color: healthColor }}
        title={`Salud: ${score} - ${label || LEVEL_LABELS[level]}`}
        aria-label={`Salud del cliente: ${score} de 100, nivel ${LEVEL_LABELS[level]}`}
      >
        <HeartIcon className={sizeConfig.icon} />
        <span className="tabular-nums font-bold">{score}</span>
        {TrendIndicator}
      </span>
    );
  }

  // Variant: Pill (rounded full)
  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5',
          sizeConfig.pill,
          'font-semibold border',
          'transition-all duration-200',
          isCritical && 'animate-pulse',
          className
        )}
        style={{
          backgroundColor: healthBg,
          borderColor: healthBorder,
          color: healthColor,
        }}
        title={`Salud: ${score} - ${label || LEVEL_LABELS[level]}`}
        aria-label={`Salud del cliente: ${score} de 100, nivel ${LEVEL_LABELS[level]}`}
      >
        <HeartIcon className={sizeConfig.icon} />
        <span className="tabular-nums">{score}</span>
        {label && <span className="opacity-80">({label})</span>}
        {TrendIndicator}
      </span>
    );
  }

  // Variant: Badge (default)
  return (
    <span
      className={cn(
        'health-badge-premium',
        level,
        'inline-flex items-center justify-center gap-0.5',
        sizeConfig.badge,
        'font-bold tabular-nums border',
        'transition-all duration-200',
        isCritical && 'animate-pulse',
        isAtRisk && 'animate-[pulse_2s_ease-in-out_infinite]',
        className
      )}
      style={{
        backgroundColor: healthBg,
        borderColor: healthBorder,
        color: healthColor,
      }}
      title={`Salud: ${score} - ${label || LEVEL_LABELS[level]}`}
      aria-label={`Salud del cliente: ${score} de 100, nivel ${LEVEL_LABELS[level]}`}
    >
      <HeartIcon className={sizeConfig.icon} />
      {score}
      {TrendIndicator}
    </span>
  );
});

// ============================================
// Extended Version with Label
// ============================================

export interface CustomerHealthBadgeProps extends CustomerHealthIndicatorProps {
  /** Show text label */
  showLabel?: boolean;
}

export const CustomerHealthBadge = React.memo(function CustomerHealthBadge({
  score,
  size = 'md',
  showLabel = true,
  className,
  ...props
}: CustomerHealthBadgeProps) {
  const { getHealthLevel, getHealthColor, getHealthBgColor, getHealthBorderColor } = useCustomerHealth();

  const level = getHealthLevel(score);
  const healthColor = getHealthColor(level);
  const healthBg = getHealthBgColor(level);
  const healthBorder = getHealthBorderColor(level);
  const isCritical = level === 'critical';

  const sizeClasses = {
    sm: 'gap-1.5 text-[10px]',
    md: 'gap-2 text-xs',
    lg: 'gap-2.5 text-sm',
  };

  const iconSize = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-lg border',
        'transition-all duration-200',
        sizeClasses[size],
        isCritical && 'animate-pulse',
        className
      )}
      style={{
        backgroundColor: healthBg,
        borderColor: healthBorder,
      }}
      aria-label={`Salud del cliente: ${score} de 100, nivel ${LEVEL_LABELS[level]}`}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full p-1',
          'bg-white/20'
        )}
      >
        <Heart className={iconSize[size]} style={{ color: healthColor }} />
      </div>
      <div className="flex flex-col">
        <span className="font-bold tabular-nums" style={{ color: healthColor }}>
          {score}
        </span>
        {showLabel && (
          <span className="text-muted-foreground opacity-80 leading-none">
            {LEVEL_LABELS[level]}
          </span>
        )}
      </div>
    </div>
  );
});

// ============================================
// Exports
// ============================================

export default CustomerHealthIndicator;
