'use client';

/**
 * OpportunityProbabilityIndicator Component
 *
 * Visual indicator for opportunity probability (0-100%) with color-coded feedback.
 * Colors: <40% red (low), 40-70% amber (medium), >70% green (high)
 * Shows trophy icon for probabilities >80% (likely wins)
 *
 * Homologated with LeadScoreIndicator design patterns.
 */

import * as React from 'react';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface OpportunityProbabilityIndicatorProps {
  /** Probability from 0-100 */
  probability: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show percentage label */
  showLabel?: boolean;
  /** Show as compact inline badge */
  variant?: 'default' | 'compact' | 'badge' | 'bar';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

type ProbabilityCategory = 'low' | 'medium' | 'high';

function getProbabilityCategory(probability: number): ProbabilityCategory {
  if (probability < 40) return 'low';
  if (probability < 70) return 'medium';
  return 'high';
}

function getProbabilityLabel(category: ProbabilityCategory): string {
  switch (category) {
    case 'low':
      return 'Bajo';
    case 'medium':
      return 'Medio';
    case 'high':
      return 'Alto';
  }
}

// Color configurations using CSS variables for theme compatibility
const probabilityColors: Record<ProbabilityCategory, {
  textClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  gradientClass: string;
  barColor: string;
}> = {
  low: {
    textClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-500/15',
    borderClass: 'border-red-200 dark:border-red-500/30',
    ringClass: 'ring-red-500/20',
    gradientClass: 'from-red-500 to-red-600',
    barColor: 'bg-red-500',
  },
  medium: {
    textClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-500/15',
    borderClass: 'border-amber-200 dark:border-amber-500/30',
    ringClass: 'ring-amber-500/20',
    gradientClass: 'from-amber-500 to-orange-500',
    barColor: 'bg-amber-500',
  },
  high: {
    textClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-500/15',
    borderClass: 'border-emerald-200 dark:border-emerald-500/30',
    ringClass: 'ring-emerald-500/20',
    gradientClass: 'from-emerald-500 to-green-500',
    barColor: 'bg-emerald-500',
  },
};

// Size configurations
const sizeConfig = {
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs font-semibold',
    label: 'text-2xs',
    trophy: 'h-2.5 w-2.5',
    wrapper: 'gap-1.5',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm font-bold',
    label: 'text-xs',
    trophy: 'h-3 w-3',
    wrapper: 'gap-2',
  },
  lg: {
    container: 'h-14 w-14',
    text: 'text-lg font-bold',
    label: 'text-sm',
    trophy: 'h-4 w-4',
    wrapper: 'gap-2.5',
  },
};

// ============================================
// Main Component
// ============================================

export function OpportunityProbabilityIndicator({
  probability,
  size = 'md',
  showLabel = true,
  variant = 'default',
  className,
}: OpportunityProbabilityIndicatorProps) {
  // Clamp probability to 0-100
  const normalizedProbability = Math.max(0, Math.min(100, Math.round(probability)));
  const category = getProbabilityCategory(normalizedProbability);
  const colors = probabilityColors[category];
  const sizes = sizeConfig[size];
  const isLikelyWin = normalizedProbability >= 80;

  // Bar variant (for tables/compact displays)
  if (variant === 'bar') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[48px]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              colors.barColor
            )}
            style={{ width: `${normalizedProbability}%` }}
            role="progressbar"
            aria-valuenow={normalizedProbability}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Probabilidad: ${normalizedProbability}%`}
          />
        </div>
        <span className={cn('text-xs font-medium min-w-[2.5rem] text-right', colors.textClass)}>
          {normalizedProbability}%
        </span>
      </div>
    );
  }

  // Compact badge variant (for tables/lists)
  if (variant === 'badge') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border',
          colors.bgClass,
          colors.borderClass,
          className
        )}
      >
        {isLikelyWin && (
          <Trophy className={cn('h-3 w-3', colors.textClass)} />
        )}
        <span className={cn('text-xs font-semibold', colors.textClass)}>
          {normalizedProbability}%
        </span>
      </div>
    );
  }

  // Compact inline variant
  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center', sizes.wrapper, className)}>
        <div
          className={cn(
            'flex items-center justify-center rounded-full border',
            colors.bgClass,
            colors.borderClass,
            size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
          )}
        >
          <span className={cn(sizes.text, colors.textClass)}>
            {normalizedProbability}
          </span>
        </div>
        {isLikelyWin && (
          <Trophy className={cn(sizes.trophy, 'text-emerald-500 animate-pulse')} />
        )}
      </div>
    );
  }

  // Default circular gauge variant
  return (
    <div className={cn('flex flex-col items-center', sizes.wrapper, className)}>
      {/* Circular Probability */}
      <div className="relative">
        {/* Background Ring */}
        <div
          className={cn(
            'flex items-center justify-center rounded-full',
            'border-2 transition-all duration-300',
            colors.bgClass,
            colors.borderClass,
            sizes.container
          )}
        >
          {/* Probability Number */}
          <span className={cn(sizes.text, colors.textClass)}>
            {normalizedProbability}
          </span>
        </div>

        {/* Likely Win Trophy Badge */}
        {isLikelyWin && (
          <div
            className={cn(
              'absolute -top-1 -right-1',
              'flex items-center justify-center',
              'h-5 w-5 rounded-full',
              'bg-gradient-to-br from-amber-400 to-amber-500',
              'shadow-lg shadow-amber-500/30',
              'animate-pulse'
            )}
          >
            <Trophy className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Probability Label */}
      {showLabel && (
        <span className={cn(sizes.label, 'text-muted-foreground font-medium')}>
          {getProbabilityLabel(category)}
        </span>
      )}
    </div>
  );
}

// ============================================
// Progress Bar Variant (alternative display)
// ============================================

export interface OpportunityProbabilityBarProps {
  probability: number;
  showValue?: boolean;
  showForecast?: boolean;
  amount?: number;
  currency?: string;
  className?: string;
}

export function OpportunityProbabilityBar({
  probability,
  showValue = true,
  showForecast = false,
  amount = 0,
  currency = 'USD',
  className,
}: OpportunityProbabilityBarProps) {
  const normalizedProbability = Math.max(0, Math.min(100, Math.round(probability)));
  const category = getProbabilityCategory(normalizedProbability);
  const colors = probabilityColors[category];
  const forecast = (amount * normalizedProbability) / 100;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        {/* Progress Bar */}
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              'bg-gradient-to-r',
              colors.gradientClass
            )}
            style={{ width: `${normalizedProbability}%` }}
            role="progressbar"
            aria-valuenow={normalizedProbability}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Probabilidad: ${normalizedProbability}%`}
          />
        </div>

        {/* Value */}
        {showValue && (
          <span className={cn('text-xs font-semibold min-w-[2.5rem] text-right', colors.textClass)}>
            {normalizedProbability}%
          </span>
        )}
      </div>

      {/* Forecast */}
      {showForecast && amount > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Forecast:</span>
          <span className={cn('font-medium', colors.textClass)}>
            {formatCurrency(forecast)}
          </span>
        </div>
      )}
    </div>
  );
}
