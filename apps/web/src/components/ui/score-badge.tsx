/**
 * ScoreBadge Component - Ventazo 2025 Design System
 *
 * @description Premium score indicator with gradient system and glow effects
 * for lead scoring visualization. Supports hot/warm/cold temperature states.
 *
 * @features
 * - Temperature-based gradients (hot/warm/cold)
 * - Glow effects for visual prominence
 * - WCAG 2.1 AA compliant contrast
 * - Animated icons for hot leads
 * - Multiple size variants
 *
 * @version 2.0.0
 */

'use client';

import * as React from 'react';
import { Flame, TrendingUp, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type ScoreLevel = 'hot' | 'warm' | 'cold';
export type ScoreSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ScoreBadgeProps {
  /** Score value (0-100) */
  score: number;
  /** Size variant */
  size?: ScoreSize;
  /** Show temperature icon */
  showIcon?: boolean;
  /** Show temperature label */
  showLabel?: boolean;
  /** Enable glow effect */
  glow?: boolean;
  /** Enable pulse animation for hot leads */
  pulse?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Configuration
// ============================================

interface ScoreConfig {
  level: ScoreLevel;
  label: string;
  labelEn: string;
  icon: typeof Flame;
  gradient: string;
  glowClass: string;
  textColor: string;
  iconClass: string;
}

const getScoreConfig = (score: number): ScoreConfig => {
  const clampedScore = Math.max(0, Math.min(100, score));

  if (clampedScore >= 70) {
    return {
      level: 'hot',
      label: 'Caliente',
      labelEn: 'Hot',
      icon: Flame,
      // SEMANTIC: hot = orange/red (high priority, urgent attention)
      gradient: 'bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400',
      glowClass: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]',
      textColor: 'text-white',
      iconClass: 'text-yellow-200 animate-flame-flicker',
    };
  }

  if (clampedScore >= 40) {
    return {
      level: 'warm',
      label: 'Tibio',
      labelEn: 'Warm',
      icon: TrendingUp,
      gradient: 'bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400',
      glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
      textColor: 'text-white',
      iconClass: 'text-yellow-200',
    };
  }

  return {
    level: 'cold',
    label: 'Frío',
    labelEn: 'Cold',
    icon: Snowflake,
    gradient: 'bg-gradient-to-br from-slate-500 via-slate-400 to-gray-300',
    glowClass: 'shadow-[0_0_20px_rgba(100,116,139,0.3)]',
    textColor: 'text-slate-800 dark:text-white',
    iconClass: 'text-slate-600 dark:text-slate-300',
  };
};

// Size configurations
const sizeConfig: Record<ScoreSize, {
  container: string;
  fontSize: string;
  iconSize: string;
  iconPosition: string;
}> = {
  xs: {
    container: 'w-8 h-8',
    fontSize: 'text-xs',
    iconSize: 'w-2.5 h-2.5',
    iconPosition: '-top-0.5 -right-0.5',
  },
  sm: {
    container: 'w-10 h-10',
    fontSize: 'text-sm',
    iconSize: 'w-3 h-3',
    iconPosition: '-top-0.5 -right-0.5',
  },
  md: {
    container: 'w-12 h-12',
    fontSize: 'text-base',
    iconSize: 'w-3.5 h-3.5',
    iconPosition: '-top-1 -right-1',
  },
  lg: {
    container: 'w-14 h-14',
    fontSize: 'text-lg',
    iconSize: 'w-4 h-4',
    iconPosition: '-top-1 -right-1',
  },
  xl: {
    container: 'w-16 h-16',
    fontSize: 'text-xl',
    iconSize: 'w-5 h-5',
    iconPosition: '-top-1.5 -right-1.5',
  },
};

// ============================================
// ScoreBadge Component
// ============================================

export const ScoreBadge = React.memo<ScoreBadgeProps>(function ScoreBadge({
  score,
  size = 'md',
  showIcon = true,
  showLabel = false,
  glow = true,
  pulse = false,
  className,
}) {
  const config = getScoreConfig(score);
  const sizes = sizeConfig[size];
  const Icon = config.icon;
  const isHot = config.level === 'hot';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Score Badge */}
      <div
        role="img"
        aria-label={`Score: ${score} - ${config.label}`}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl font-bold',
          config.gradient,
          config.textColor,
          sizes.container,
          sizes.fontSize,
          glow && config.glowClass,
          'transition-all duration-200 hover:scale-105',
          // Pulse animation for hot leads
          pulse && isHot && 'animate-pulse-soft'
        )}
      >
        {/* Score Number */}
        <span className="font-bold tabular-nums leading-none">
          {score}
        </span>

        {/* Temperature Icon - Corner positioned */}
        {showIcon && (
          <Icon
            className={cn(
              'absolute',
              sizes.iconPosition,
              sizes.iconSize,
              config.iconClass,
              'drop-shadow-sm'
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Label (optional) */}
      {showLabel && (
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {config.label}
        </span>
      )}
    </div>
  );
});

ScoreBadge.displayName = 'ScoreBadge';

// ============================================
// ScoreBadgeCompact - Smaller variant
// ============================================

export interface ScoreBadgeCompactProps {
  score: number;
  className?: string;
}

export const ScoreBadgeCompact = React.memo<ScoreBadgeCompactProps>(
  function ScoreBadgeCompact({ score, className }) {
    const config = getScoreConfig(score);

    return (
      <span
        role="img"
        aria-label={`Score: ${score}`}
        className={cn(
          'inline-flex items-center justify-center',
          'min-w-[1.75rem] h-6 px-1.5',
          'rounded-md text-xs font-bold',
          config.gradient,
          config.textColor,
          className
        )}
      >
        {score}
      </span>
    );
  }
);

ScoreBadgeCompact.displayName = 'ScoreBadgeCompact';

// ============================================
// ScoreProgress - Linear progress variant
// ============================================

export interface ScoreProgressProps {
  score: number;
  showValue?: boolean;
  className?: string;
}

export const ScoreProgress = React.memo<ScoreProgressProps>(
  function ScoreProgress({ score, showValue = true, className }) {
    const config = getScoreConfig(score);
    const clampedScore = Math.max(0, Math.min(100, score));

    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Lead score: ${score} - ${config.label}`}
          className="relative flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              config.gradient
            )}
            style={{ width: `${clampedScore}%` }}
          />
        </div>

        {/* Score Value */}
        {showValue && (
          <span
            className={cn(
              'text-sm font-semibold tabular-nums min-w-[2rem] text-right',
              // SEMANTIC: hot = orange (high priority)
              config.level === 'hot' && 'text-orange-600 dark:text-orange-400',
              config.level === 'warm' && 'text-amber-600 dark:text-amber-400',
              config.level === 'cold' && 'text-slate-600 dark:text-slate-400'
            )}
          >
            {score}
          </span>
        )}
      </div>
    );
  }
);

ScoreProgress.displayName = 'ScoreProgress';

// ============================================
// Utility Functions
// ============================================

/**
 * Get score level from numeric score
 */
export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

/**
 * Get score label in Spanish
 */
export function getScoreLabel(score: number): string {
  const config = getScoreConfig(score);
  return config.label;
}

/**
 * Get score gradient class
 */
export function getScoreGradient(score: number): string {
  const config = getScoreConfig(score);
  return config.gradient;
}
