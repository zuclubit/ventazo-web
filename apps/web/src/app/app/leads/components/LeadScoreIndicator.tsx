'use client';

/**
 * LeadScoreIndicator Component - Premium 2025 Redesign
 *
 * Visual indicator for lead score (0-100) with temperature icons.
 * - Hot (>=70): Green with Flame icon
 * - Warm (40-69): Amber with TrendingUp icon
 * - Cold (<40): Gray-blue with Snowflake icon
 *
 * Features tooltips with contextual labels and premium styling.
 */

import * as React from 'react';
import { Flame, TrendingUp, Snowflake } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  variant?: 'default' | 'compact' | 'badge' | 'ai-enhanced';
  /** Show AI context tooltip with score factors */
  showAIContext?: boolean;
  /** Whether lead has recent activity (for AI context) */
  hasRecentActivity?: boolean;
  /** Whether lead has a scheduled follow-up (for AI context) */
  hasFollowUp?: boolean;
  /** Lead source (for AI context) */
  source?: string;
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

function getScoreTooltip(category: ScoreCategory, score: number): string {
  switch (category) {
    case 'cold':
      return `Lead frio (${score}) - Necesita mas nurturing`;
    case 'warm':
      return `Lead tibio (${score}) - Buen potencial`;
    case 'hot':
      return `Lead caliente (${score}) - Alta probabilidad de conversion`;
  }
}

/**
 * AI Score Context - Explains what factors contribute to the score
 */
interface ScoreContext {
  factors: Array<{
    label: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  recommendation: string;
}

function getScoreContext(
  score: number,
  category: ScoreCategory,
  hasRecentActivity?: boolean,
  hasFollowUp?: boolean,
  source?: string
): ScoreContext {
  const factors: ScoreContext['factors'] = [];

  // Score level factor
  if (score >= 70) {
    factors.push({ label: 'Score alto', impact: 'positive', weight: 30 });
  } else if (score >= 40) {
    factors.push({ label: 'Score medio', impact: 'neutral', weight: 20 });
  } else {
    factors.push({ label: 'Score bajo', impact: 'negative', weight: 10 });
  }

  // Activity factor
  if (hasRecentActivity) {
    factors.push({ label: 'Actividad reciente', impact: 'positive', weight: 20 });
  } else {
    factors.push({ label: 'Sin actividad reciente', impact: 'negative', weight: -10 });
  }

  // Follow-up factor
  if (hasFollowUp) {
    factors.push({ label: 'Seguimiento programado', impact: 'positive', weight: 15 });
  }

  // Source factor (organic/referral tend to be higher quality)
  if (source === 'referral') {
    factors.push({ label: 'Fuente: Referido', impact: 'positive', weight: 15 });
  } else if (source === 'organic') {
    factors.push({ label: 'Fuente: Organico', impact: 'positive', weight: 10 });
  }

  // Recommendations based on category
  const recommendations: Record<ScoreCategory, string> = {
    hot: 'Contactar inmediatamente - alta probabilidad de cierre',
    warm: 'Nutrir con contenido relevante y agendar llamada',
    cold: 'Incluir en campana de email automatizada',
  };

  return {
    factors,
    recommendation: recommendations[category],
  };
}

function getScoreIcon(category: ScoreCategory) {
  switch (category) {
    case 'cold':
      return Snowflake;
    case 'warm':
      return TrendingUp;
    case 'hot':
      return Flame;
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
  showAIContext = false,
  hasRecentActivity,
  hasFollowUp,
  source,
  className,
}: LeadScoreIndicatorProps) {
  // Clamp score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const category = getScoreCategory(normalizedScore);
  const colors = scoreColors[category];
  const sizes = sizeConfig[size];
  const isHotLead = normalizedScore >= 80;

  // Calculate AI context if enabled
  const aiContext = React.useMemo(() => {
    if (!showAIContext && variant !== 'ai-enhanced') return null;
    return getScoreContext(normalizedScore, category, hasRecentActivity, hasFollowUp, source);
  }, [normalizedScore, category, hasRecentActivity, hasFollowUp, source, showAIContext, variant]);

  // AI-Enhanced variant with rich tooltip
  if (variant === 'ai-enhanced') {
    const Icon = getScoreIcon(category);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              // Premium styling with orange for hot leads
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
              'cursor-help transition-all duration-200',
              'border shadow-sm',
              'hover:scale-105 hover:shadow-md',
              // Category-specific colors
              category === 'hot' && 'bg-[var(--brand-warm-bg)] border-[var(--brand-orange)]/40 text-[var(--brand-orange)]',
              category === 'warm' && 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400',
              category === 'cold' && 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-500/10 dark:border-slate-500/30 dark:text-slate-400',
              className
            )}
          >
            <Icon className={cn(
              'h-3.5 w-3.5',
              isHotLead && 'hot-lead-fire'
            )} />
            <span className="text-sm font-bold tabular-nums">
              {normalizedScore}
            </span>
            <span className="text-[10px] font-medium opacity-80">
              {getScoreLabel(category)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] p-3"
        >
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">
                Score IA: {normalizedScore}
              </span>
              <span className={cn(
                'text-xs font-medium px-1.5 py-0.5 rounded',
                category === 'hot' && 'bg-[var(--brand-orange)]/15 text-[var(--brand-orange)]',
                category === 'warm' && 'bg-amber-100 text-amber-700',
                category === 'cold' && 'bg-slate-100 text-slate-600'
              )}>
                {getScoreLabel(category)}
              </span>
            </div>

            {/* Factors */}
            {aiContext && aiContext.factors.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Factores
                </span>
                <div className="flex flex-wrap gap-1">
                  {aiContext.factors.map((factor, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        factor.impact === 'positive' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
                        factor.impact === 'negative' && 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
                        factor.impact === 'neutral' && 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400'
                      )}
                    >
                      {factor.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {aiContext && (
              <div className="pt-1 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                  <strong>Recomendacion:</strong> {aiContext.recommendation}
                </span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Premium badge variant with temperature icon and tooltip
  if (variant === 'badge') {
    const Icon = getScoreIcon(category);
    const tooltipText = getScoreTooltip(category, normalizedScore);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              // Use premium score badge classes
              category === 'hot' && 'score-badge-hot',
              category === 'warm' && 'score-badge-warm',
              category === 'cold' && 'score-badge-cold',
              // Layout
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
              // Interaction
              'cursor-help transition-all duration-200',
              'hover:scale-105',
              className
            )}
          >
            <Icon className={cn(
              'h-3 w-3',
              isHotLead && 'animate-pulse'
            )} />
            <span className="text-xs font-bold tabular-nums">
              {normalizedScore}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
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
