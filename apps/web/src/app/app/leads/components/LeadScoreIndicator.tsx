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

// Color configurations
const scoreColors: Record<ScoreCategory, {
  text: string;
  bg: string;
  border: string;
  ring: string;
  gradient: string;
}> = {
  cold: {
    text: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    ring: 'ring-red-500/20',
    gradient: 'from-red-500 to-red-600',
  },
  warm: {
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    ring: 'ring-amber-500/20',
    gradient: 'from-amber-500 to-orange-500',
  },
  hot: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    ring: 'ring-emerald-500/20',
    gradient: 'from-emerald-500 to-teal-500',
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
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
          colors.bg,
          colors.border,
          'border',
          className
        )}
      >
        {isHotLead && (
          <Flame className={cn('h-3 w-3', colors.text)} />
        )}
        <span className={cn('text-xs font-semibold', colors.text)}>
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
            'flex items-center justify-center rounded-full',
            colors.bg,
            colors.border,
            'border',
            size === 'sm' ? 'h-6 w-6' : 'h-7 w-7'
          )}
        >
          <span className={cn(sizes.text, colors.text)}>
            {normalizedScore}
          </span>
        </div>
        {isHotLead && (
          <Flame className={cn(sizes.flame, 'text-orange-500 animate-pulse')} />
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
            colors.bg,
            colors.border,
            sizes.container
          )}
        >
          {/* Score Number */}
          <span className={cn(sizes.text, colors.text)}>
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
              'bg-gradient-to-br from-orange-400 to-red-500',
              'shadow-lg shadow-orange-500/30',
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
            colors.gradient
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
        <span className={cn('text-xs font-semibold min-w-[2rem] text-right', colors.text)}>
          {normalizedScore}
        </span>
      )}
    </div>
  );
}
