'use client';

/**
 * SmartKPICard Component
 *
 * KPI card with trend indicator, icon, and premium glassmorphism styling.
 * Supports variants: default, highlight (primary border), warning (urgent)
 * Clickable for filtering functionality.
 */

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SmartKPICardProps {
  /** KPI title */
  title: string;
  /** Main value to display */
  value: number | string;
  /** Icon component */
  icon: LucideIcon;
  /** Trend data */
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string; // e.g., "vs mes anterior"
  };
  /** Subtitle text */
  subtitle?: string;
  /** Card variant */
  variant?: 'default' | 'highlight' | 'warning' | 'success';
  /** Loading state */
  isLoading?: boolean;
  /** Click handler (for filtering) */
  onClick?: () => void;
  /** Is currently active/selected */
  isActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Variant Configurations
// ============================================

const variantConfig = {
  default: {
    border: 'border-border/50',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    activeBorder: 'border-primary/50',
  },
  highlight: {
    border: 'border-l-4 border-l-primary border-t-0 border-r-0 border-b-0',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    activeBorder: 'ring-2 ring-primary/20',
  },
  warning: {
    border: 'border-l-4 border-l-orange-500 border-t-0 border-r-0 border-b-0',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    activeBorder: 'ring-2 ring-orange-500/20',
  },
  success: {
    border: 'border-l-4 border-l-emerald-500 border-t-0 border-r-0 border-b-0',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    activeBorder: 'ring-2 ring-emerald-500/20',
  },
};

// ============================================
// Trend Indicator Component
// ============================================

interface TrendIndicatorProps {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  label?: string;
}

function TrendIndicator({ value, direction, label }: TrendIndicatorProps) {
  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      prefix: '+',
    },
    down: {
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      prefix: '',
    },
    neutral: {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      prefix: '',
    },
  };

  const { icon: Icon, color, bgColor, prefix } = config[direction];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-full', bgColor)}>
        <Icon className={cn('h-3 w-3', color)} />
        <span className={cn('text-xs font-medium', color)}>
          {prefix}
          {Math.abs(value)}%
        </span>
      </div>
      {label && (
        <span className="text-2xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SmartKPICard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  variant = 'default',
  isLoading = false,
  onClick,
  isActive = false,
  className,
}: SmartKPICardProps) {
  const config = variantConfig[variant];
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        'backdrop-blur-xl bg-card/80',
        config.border,
        isClickable && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
        isActive && config.activeBorder,
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>

            {/* Value */}
            <div className="mt-1 flex items-baseline gap-2">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-2xl font-bold tracking-tight">
                  {typeof value === 'number' ? value.toLocaleString('es-MX') : value}
                </span>
              )}
            </div>

            {/* Subtitle or Trend */}
            <div className="mt-1.5 flex items-center gap-2">
              {trend && !isLoading && (
                <TrendIndicator
                  value={trend.value}
                  direction={trend.direction}
                  label={trend.label}
                />
              )}
              {subtitle && !trend && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>

          {/* Icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              config.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
        </div>
      </CardContent>

      {/* Subtle gradient overlay for premium effect */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none',
          'bg-gradient-to-br from-white/[0.02] to-transparent'
        )}
      />
    </Card>
  );
}

// ============================================
// KPI Card Grid Component
// ============================================

export interface KPICardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function KPICardGrid({ children, columns = 4, className }: KPICardGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
