'use client';

// ============================================
// AI Score Component - FASE 6.1
// Visual score gauge with explanations
// ============================================

import { Info, Minus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { scoreToTemperature, TemperatureBadge } from './ai-badge';

// ============================================
// Types
// ============================================

interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

interface AIScoreProps {
  score: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  confidence?: number;
  factors?: ScoreFactor[];
  explanations?: string[];
  recommendation?: 'pursue' | 'nurture' | 'archive' | 'convert';
  previousScore?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  showDetails?: boolean;
  className?: string;
}

// ============================================
// Configuration
// ============================================

const gradeConfig = {
  A: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  B: { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  C: { color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  D: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  F: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const recommendationConfig = {
  pursue: { label: 'Pursue', color: 'text-emerald-600', description: 'High priority - take action now' },
  nurture: { label: 'Nurture', color: 'text-blue-600', description: 'Build relationship over time' },
  archive: { label: 'Archive', color: 'text-slate-500', description: 'Low priority - revisit later' },
  convert: { label: 'Convert', color: 'text-purple-600', description: 'Ready for conversion' },
};

// ============================================
// Subcomponents
// ============================================

function ScoreGauge({ score, className }: { score: number; className?: string }) {
  // Calculate stroke dash for circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  // Determine color based on score
  const getColor = (s: number) => {
    if (s >= 70) return 'stroke-emerald-500';
    if (s >= 40) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  return (
    <div className={cn('relative w-32 h-32', className)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          className="text-slate-200 dark:text-slate-700"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          className={cn('transition-all duration-700 ease-out', getColor(score))}
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          strokeLinecap="round"
          strokeWidth="8"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: circumference - progress,
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {score}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

function ScoreChange({ current, previous }: { current: number; previous: number }) {
  const change = current - previous;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        isPositive ? 'text-emerald-600' : 'text-red-600'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}{change} pts
    </span>
  );
}

function FactorItem({ factor }: { factor: ScoreFactor }) {
  const impactIcon = {
    positive: <TrendingUp className="h-3 w-3 text-emerald-500" />,
    negative: <TrendingDown className="h-3 w-3 text-red-500" />,
    neutral: <Minus className="h-3 w-3 text-slate-400" />,
  };

  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="mt-0.5">{impactIcon[factor.impact]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {factor.name}
          </span>
          <span className="text-xs text-slate-500 shrink-0">
            {factor.value}/100
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {factor.explanation}
        </p>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AIScore({
  score,
  grade,
  confidence,
  factors = [],
  explanations = [],
  recommendation,
  previousScore,
  isLoading = false,
  onRefresh,
  showDetails = true,
  className,
}: AIScoreProps) {
  const temperature = scoreToTemperature(score);
  const gradeStyle = grade ? gradeConfig[grade] : undefined;
  const recConfig = recommendation ? recommendationConfig[recommendation] : undefined;

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI Lead Score
          </h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-slate-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">
                  AI-powered score based on lead data, engagement history, and behavioral patterns.
                  {confidence && ` Confidence: ${Math.round(confidence * 100)}%`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {onRefresh && (
          <Button
            className="h-8 w-8 p-0"
            disabled={isLoading}
            size="sm"
            variant="ghost"
            onClick={onRefresh}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-center gap-6">
        <ScoreGauge score={score} />

        <div className="flex-1 space-y-3">
          {/* Temperature Badge */}
          <TemperatureBadge size="lg" temperature={temperature} />

          {/* Grade */}
          {grade && gradeStyle && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Grade:</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-sm font-bold',
                  gradeStyle.bg,
                  gradeStyle.color
                )}
              >
                {grade}
              </span>
            </div>
          )}

          {/* Score Change */}
          {previousScore !== undefined && (
            <ScoreChange current={score} previous={previousScore} />
          )}

          {/* Recommendation */}
          {recConfig && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Action:</span>
              <span className={cn('text-sm font-medium', recConfig.color)}>
                {recConfig.label}
              </span>
            </div>
          )}

          {/* Confidence */}
          {confidence !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                {Math.round(confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Details Section */}
      {showDetails && (factors.length > 0 || explanations.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          {/* Factors */}
          {factors.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Scoring Factors
              </h4>
              {factors.slice(0, 4).map((factor, index) => (
                <FactorItem key={index} factor={factor} />
              ))}
            </div>
          )}

          {/* Explanations */}
          {explanations.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Analysis
              </h4>
              <ul className="space-y-1">
                {explanations.slice(0, 3).map((exp, index) => (
                  <li
                    key={index}
                    className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                  >
                    <span className="text-slate-400 mt-0.5">•</span>
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* AI Disclaimer */}
      <p className="mt-4 text-[10px] text-slate-400 italic">
        AI-generated analysis. Review recommendations before taking action.
      </p>
    </div>
  );
}

// ============================================
// Compact Score Badge
// ============================================

interface AIScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function AIScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className,
}: AIScoreBadgeProps) {
  const temperature = scoreToTemperature(score);

  const getColor = (s: number) => {
    if (s >= 70) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s >= 40) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold rounded-full border',
        getColor(score),
        sizeClasses[size],
        className
      )}
    >
      <span>{score}</span>
      {showLabel && (
        <span className="font-normal opacity-75">
          {temperature.charAt(0).toUpperCase() + temperature.slice(1)}
        </span>
      )}
    </span>
  );
}
