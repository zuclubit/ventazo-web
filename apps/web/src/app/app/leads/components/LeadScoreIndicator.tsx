'use client';

/**
 * LeadScoreIndicator Component
 *
 * Visual indicator for lead score (0-100) with color-coded feedback.
 * Colors: <40 red (cold), 40-70 amber (warm), >70 green (hot)
 * Shows fire emoji for scores >80 (priority leads)
 */

import * as React from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface LeadScoreIndicatorProps {
  /** Lead score from 0-100 */
  score: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show temperature label (Frio, Tibio, Caliente) */
  showLabel?: boolean;
  /** Show as compact inline badge */
  variant?: 'default' | 'compact' | 'badge';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

type ScoreCategory = 'cold' | 'warm' | 'hot';

function getScoreCategory(score: number): ScoreCategory {
  if (score < 40) return 'cold';
  if (score < 70) return 'warm';
  return 'hot';
}

function getScoreLabel(category: ScoreCategory): string {
  switch (category) {
    case 'cold':
      return 'Frio';
    case 'warm':
      return 'Tibio';
    case 'hot':
      return 'Caliente';
  }
}

// Color configurations using CSS variables for theme compatibility
const scoreColors: Record<ScoreCategory, {
  textClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  gradientClass: string;
}> = {
  cold: {
    textClass: 'score-cold',
    bgClass: 'score-cold-bg',
    borderClass: 'border-[var(--score-cold)]/30',
    ringClass: 'ring-[var(--score-cold)]/20',
    gradientClass: 'from-[var(--score-cold)] to-[var(--score-cold)]',
  },
  warm: {
    textClass: 'score-warm',
    bgClass: 'score-warm-bg',
    borderClass: 'border-[var(--score-warm)]/30',
    ringClass: 'ring-[var(--score-warm)]/20',
    gradientClass: 'from-[var(--score-warm)] to-[var(--status-warning)]',
  },
  hot: {
    textClass: 'score-hot',
    bgClass: 'score-hot-bg',
    borderClass: 'border-[var(--score-hot)]/30',
    ringClass: 'ring-[var(--score-hot)]/20',
    gradientClass: 'from-[var(--score-hot)] to-primary',
  },
};

// Size configurations
const sizeConfig = {
  sm: {
    container: 'h-8 w-8',
    text: 'text-xs font-semibold',
    label: 'text-2xs',
    flame: 'h-2.5 w-2.5',
    wrapper: 'gap-1.5',
  },
  md: {
    container: 'h-10 w-10',
    text: 'text-sm font-bold',
    label: 'text-xs',
    flame: 'h-3 w-3',
    wrapper: 'gap-2',
  },
  lg: {
    container: 'h-14 w-14',
    text: 'text-lg font-bold',
    label: 'text-sm',
    flame: 'h-4 w-4',
    wrapper: 'gap-2.5',
  },
};

// ============================================
// Main Component
// ============================================

export function LeadScoreIndicator({
  score,
  size = 'md',
  showLabel = true,
  variant = 'default',
  className,
}: LeadScoreIndicatorProps) {
  // Clamp score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const category = getScoreCategory(normalizedScore);
  const colors = scoreColors[category];
  const sizes = sizeConfig[size];
  const isHotLead = normalizedScore >= 80;

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
        {isHotLead && (
          <Flame className={cn('h-3 w-3', colors.textClass)} />
        )}
        <span className={cn('text-xs font-semibold', colors.textClass)}>
          {normalizedScore}
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
            {normalizedScore}
          </span>
        </div>
        {isHotLead && (
          <Flame className={cn(sizes.flame, 'status-warning-text animate-pulse')} />
        )}
      </div>
    );
  }

  // Default circular gauge variant
  return (
    <div className={cn('flex flex-col items-center', sizes.wrapper, className)}>
      {/* Circular Score */}
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
          {/* Score Number */}
          <span className={cn(sizes.text, colors.textClass)}>
            {normalizedScore}
          </span>
        </div>

        {/* Hot Lead Fire Badge */}
        {isHotLead && (
          <div
            className={cn(
              'absolute -top-1 -right-1',
              'flex items-center justify-center',
              'h-5 w-5 rounded-full',
              'bg-gradient-to-br from-[var(--status-warning)] to-[var(--status-error)]',
              'shadow-lg shadow-[var(--status-warning)]/30',
              'animate-pulse'
            )}
          >
            <Flame className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Temperature Label */}
      {showLabel && (
        <span className={cn(sizes.label, 'text-muted-foreground font-medium')}>
          {getScoreLabel(category)}
        </span>
      )}
    </div>
  );
}

// ============================================
// Score Progress Bar (alternative display)
// ============================================

export interface LeadScoreBarProps {
  score: number;
  showValue?: boolean;
  className?: string;
}

export function LeadScoreBar({
  score,
  showValue = true,
  className,
}: LeadScoreBarProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const category = getScoreCategory(normalizedScore);
  const colors = scoreColors[category];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            'bg-gradient-to-r',
            colors.gradientClass
          )}
          style={{ width: `${normalizedScore}%` }}
          role="progressbar"
          aria-valuenow={normalizedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Score: ${normalizedScore}`}
        />
      </div>

      {/* Value */}
      {showValue && (
        <span className={cn('text-xs font-semibold min-w-[2rem] text-right', colors.textClass)}>
          {normalizedScore}
        </span>
      )}
    </div>
  );
}
