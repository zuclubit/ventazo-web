'use client';

// ============================================
// AI Opportunity Prediction Component - FASE 6.1
// Displays AI predictions for opportunities
// ============================================

import { useState } from 'react';

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface StagePrediction {
  currentStage: string;
  predictedStage: string;
  probability: number;
  timeframe: 'days' | 'weeks' | 'months';
  estimatedDays: number;
  factors: string[];
}

interface ConversionPrediction {
  willConvert: boolean;
  probability: number;
  timeframeDays: number;
  potentialValue: number;
  riskFactors: string[];
  positiveIndicators: string[];
}

interface AIOpportunityPredictionProps {
  type: 'stage' | 'conversion';
  stagePrediction?: StagePrediction;
  conversionPrediction?: ConversionPrediction;
  confidence?: number;
  generatedAt?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

// ============================================
// Subcomponents
// ============================================

function ProbabilityMeter({
  probability,
  label,
  positive = true,
}: {
  probability: number;
  label: string;
  positive?: boolean;
}) {
  const percentage = Math.round(probability * 100);
  const color = positive
    ? percentage >= 70
      ? 'bg-emerald-500'
      : percentage >= 40
      ? 'bg-amber-500'
      : 'bg-red-500'
    : percentage >= 70
    ? 'bg-red-500'
    : percentage >= 40
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {percentage}%
        </span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function FactorsList({
  factors,
  positive = true,
}: {
  factors: string[];
  positive?: boolean;
}) {
  if (factors.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {factors.map((factor, index) => (
        <li
          key={index}
          className={cn(
            'flex items-start gap-2 text-sm',
            positive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {positive ? (
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <span>{factor}</span>
        </li>
      ))}
    </ul>
  );
}

function StageTransition({
  current,
  predicted,
}: {
  current: string;
  predicted: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="flex-1 text-center">
        <span className="text-xs text-slate-500 block mb-1">Current</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {current}
        </span>
      </div>
      <div className="flex items-center gap-1 text-blue-500">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div className="flex-1 text-center">
        <span className="text-xs text-slate-500 block mb-1">Predicted</span>
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {predicted}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AIOpportunityPrediction({
  type,
  stagePrediction,
  conversionPrediction,
  confidence,
  generatedAt,
  isLoading = false,
  onRefresh,
  className,
}: AIOpportunityPredictionProps) {
  const [expanded, setExpanded] = useState(true);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900 p-4', className)}>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-8 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-8 w-3/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const title = type === 'stage' ? 'Stage Prediction' : 'Win Probability';

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            AI {title}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              className="h-7 w-7 p-0"
              size="sm"
              variant="ghost"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            className="h-7 w-7 p-0"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Stage Prediction */}
          {type === 'stage' && stagePrediction && (
            <>
              <StageTransition
                current={stagePrediction.currentStage}
                predicted={stagePrediction.predictedStage}
              />

              <ProbabilityMeter
                label="Likelihood"
                probability={stagePrediction.probability}
              />

              {/* Timeline */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Estimated: {stagePrediction.estimatedDays}{' '}
                    {stagePrediction.timeframe}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Based on historical patterns
                  </p>
                </div>
              </div>

              {/* Factors */}
              {stagePrediction.factors.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Contributing Factors
                  </h4>
                  <FactorsList positive factors={stagePrediction.factors} />
                </div>
              )}
            </>
          )}

          {/* Conversion Prediction */}
          {type === 'conversion' && conversionPrediction && (
            <>
              {/* Main Prediction */}
              <div
                className={cn(
                  'p-4 rounded-lg text-center',
                  conversionPrediction.willConvert
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                )}
              >
                <div
                  className={cn(
                    'inline-flex items-center gap-2 text-lg font-bold',
                    conversionPrediction.willConvert
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {conversionPrediction.willConvert ? (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      Likely to Win
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5" />
                      At Risk
                    </>
                  )}
                </div>
              </div>

              <ProbabilityMeter
                label="Win Probability"
                probability={conversionPrediction.probability}
              />

              {/* Value & Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Potential Value</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    ${conversionPrediction.potentialValue.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Expected Close</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {conversionPrediction.timeframeDays} days
                  </p>
                </div>
              </div>

              {/* Positive Indicators */}
              {conversionPrediction.positiveIndicators.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">
                    Positive Indicators
                  </h4>
                  <FactorsList
                    positive
                    factors={conversionPrediction.positiveIndicators}
                  />
                </div>
              )}

              {/* Risk Factors */}
              {conversionPrediction.riskFactors.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
                    Risk Factors
                  </h4>
                  <FactorsList
                    factors={conversionPrediction.riskFactors}
                    positive={false}
                  />
                </div>
              )}
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 italic">
              AI-generated prediction. Use as guidance only.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {confidence !== undefined && (
                <span>{Math.round(confidence * 100)}% confidence</span>
              )}
              {generatedAt && (
                <span>
                  {new Date(generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
