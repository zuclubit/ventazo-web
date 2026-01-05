'use client';

/**
 * SmartKPICard Component
 *
 * KPI card with trend indicator, icon, and premium glassmorphism styling.
 * Supports variants: default, highlight (primary border), warning (urgent)
 * Clickable for filtering functionality.
 *
 * @phase FASE 6 - Uses CARD_TOKENS from Design System
 */

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CARD_TOKENS, getCardInteractiveClasses } from '@/components/cards';

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
  /** Show pulsing indicator for urgent items */
  showPulse?: boolean;
  /** Badge text (e.g., "¡Atención!") */
  badge?: string;
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
    badgeStyle: 'bg-muted text-muted-foreground',
    pulseColor: 'bg-muted-foreground',
  },
  highlight: {
    border: 'border-l-4 border-l-primary border-t-0 border-r-0 border-b-0',
    iconBg: 'bg-[var(--highlight-primary)]',
    iconColor: 'text-primary',
    activeBorder: 'ring-2 ring-primary/20',
    badgeStyle: 'bg-[var(--highlight-primary)] text-primary',
    pulseColor: 'bg-primary',
  },
  warning: {
    border: 'border-l-4 border-t-0 border-r-0 border-b-0',
    borderColor: 'border-l-[var(--status-warning)]',
    iconBg: 'bg-[var(--status-warning-bg)]',
    iconColor: 'status-warning-text',
    activeBorder: 'ring-2 ring-[var(--status-warning)]/20',
    badgeStyle: 'bg-[var(--status-warning-bg)] status-warning-text',
    pulseColor: 'bg-[var(--status-warning)]',
  },
  success: {
    border: 'border-l-4 border-t-0 border-r-0 border-b-0',
    borderColor: 'border-l-[var(--status-success)]',
    iconBg: 'bg-[var(--status-success-bg)]',
    iconColor: 'status-success-text',
    activeBorder: 'ring-2 ring-[var(--status-success)]/20',
    badgeStyle: 'bg-[var(--status-success-bg)] status-success-text',
    pulseColor: 'bg-[var(--status-success)]',
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
      className: 'trend-up',
      bgClassName: 'trend-up-bg',
      prefix: '+',
    },
    down: {
      icon: TrendingDown,
      className: 'trend-down',
      bgClassName: 'trend-down-bg',
      prefix: '',
    },
    neutral: {
      icon: Minus,
      className: 'trend-neutral',
      bgClassName: 'trend-neutral-bg',
      prefix: '',
    },
  };

  const { icon: Icon, className, bgClassName, prefix } = config[direction];

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-full', bgClassName)}>
        <Icon className={cn('h-3 w-3', className)} />
        <span className={cn('text-xs font-medium', className)}>
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
  showPulse = false,
  badge,
  className,
}: SmartKPICardProps) {
  const config = variantConfig[variant];
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        'backdrop-blur-xl bg-card/80',
        CARD_TOKENS.transition.normal,
        config.border,
        'borderColor' in config && config.borderColor,
        getCardInteractiveClasses(isClickable),
        isActive && config.activeBorder,
        CARD_TOKENS.focus.ring,
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
            {/* Title with optional badge */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
              {badge && (
                <span className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-medium',
                  config.badgeStyle
                )}>
                  {badge}
                </span>
              )}
            </div>

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

          {/* Icon with optional pulse */}
          <div className="relative">
            {showPulse && (
              <>
                <div className={cn(
                  'absolute -inset-1 rounded-xl animate-ping opacity-20',
                  config.pulseColor
                )} />
                <div className={cn(
                  'absolute -top-1 -right-1 h-3 w-3 rounded-full animate-pulse',
                  config.pulseColor
                )} />
              </>
            )}
            <div
              className={cn(
                'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                config.iconBg
              )}
            >
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>
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
