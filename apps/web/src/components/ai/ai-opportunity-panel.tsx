'use client';

// ============================================
// AI Opportunity Panel Component - FASE 6.1
// Composite panel for Opportunity Detail page
// Combines Summary, Predictions, and Insights
// ============================================

import { useState, useCallback } from 'react';

import {
  AlertCircle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { AIInsightsList } from './ai-insight-card';
import { AIOpportunityPrediction } from './ai-opportunity-prediction';
import { AISummary } from './ai-summary';

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

interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  dueWithinDays?: number;
}

interface AIInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk' | 'pattern' | 'recommendation' | 'alert';
  category: 'leads' | 'opportunities' | 'customers' | 'pipeline' | 'performance' | 'engagement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    reasoning: string;
  }>;
  confidence?: number;
  validUntil?: string;
  generatedAt?: string;
}

interface OpportunityAIData {
  // Summary data
  summary: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  nextActions?: RecommendedAction[];
  topics?: string[];

  // Stage prediction
  stagePrediction?: StagePrediction;

  // Conversion prediction
  conversionPrediction?: ConversionPrediction;

  // Insights
  insights?: AIInsight[];

  // Metadata
  confidence?: number;
  generatedAt?: string;
  lastRefreshed?: string;
}

interface AIOpportunityPanelProps {
  opportunityId: string;
  tenantId: string;
  data?: OpportunityAIData;
  isLoading?: boolean;
  error?: string | null;
  onRefreshSummary?: () => void | Promise<void>;
  onRefreshPredictions?: () => void | Promise<void>;
  onRefreshInsights?: () => void | Promise<void>;
  onRefreshAll?: () => void | Promise<void>;
  onActionClick?: (action: RecommendedAction) => void;
  className?: string;
}

// ============================================
// Component
// ============================================

export function AIOpportunityPanel({
  opportunityId: _opportunityId,
  tenantId,
  data,
  isLoading = false,
  error,
  onRefreshSummary,
  onRefreshPredictions,
  onRefreshInsights: _onRefreshInsights,
  onRefreshAll,
  onActionClick,
  className,
}: AIOpportunityPanelProps) {
  // opportunityId is available for future AI operations
  void _opportunityId;
  // onRefreshInsights is available for individual insight refresh
  void _onRefreshInsights;
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'predictions' | 'insights'>('predictions');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshAll = useCallback(async () => {
    if (onRefreshAll) {
      setIsRefreshing(true);
      try {
        await onRefreshAll();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefreshAll]);

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Deal Insights
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            Unable to load AI insights
          </p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          {onRefreshAll && (
            <Button size="sm" variant="outline" onClick={handleRefreshAll}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Loading state (full panel)
  if (isLoading && !data) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Deal Insights
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-500">Analyzing opportunity...</span>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Deal Insights
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <Target className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            No AI predictions yet
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Generate AI predictions to see win probability, stage forecasts, and insights.
          </p>
          {onRefreshAll && (
            <Button disabled={isRefreshing} onClick={handleRefreshAll}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Predictions
            </Button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'predictions' as const, label: 'Predictions', icon: TrendingUp },
    { id: 'summary' as const, label: 'Summary', icon: BarChart2 },
    { id: 'insights' as const, label: 'Insights', icon: Target, count: data.insights?.length },
  ];

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Deal Insights
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefreshAll && (
            <Button
              className="h-8 px-2"
              disabled={isRefreshing}
              size="sm"
              variant="ghost"
              onClick={handleRefreshAll}
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
          <Button
            className="h-8 w-8 p-0"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className={cn(
                    'flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative',
                    activeTab === tab.id
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="flex items-center justify-center gap-2">
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-xs font-bold rounded',
                          activeTab === tab.id
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                        )}
                      >
                        {tab.count}
                      </span>
                    )}
                  </span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Predictions Tab */}
            {activeTab === 'predictions' && (
              <div className="space-y-4">
                {/* Win Probability */}
                {data.conversionPrediction && (
                  <AIOpportunityPrediction
                    confidence={data.confidence}
                    conversionPrediction={data.conversionPrediction}
                    generatedAt={data.generatedAt}
                    isLoading={isLoading}
                    type="conversion"
                    onRefresh={onRefreshPredictions}
                  />
                )}

                {/* Stage Prediction */}
                {data.stagePrediction && (
                  <AIOpportunityPrediction
                    confidence={data.confidence}
                    generatedAt={data.generatedAt}
                    isLoading={isLoading}
                    stagePrediction={data.stagePrediction}
                    type="stage"
                  />
                )}

                {/* No predictions */}
                {!data.conversionPrediction && !data.stagePrediction && (
                  <div className="text-center py-8">
                    <TrendingUp className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No predictions available yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <AISummary
                confidence={data.confidence}
                generatedAt={data.generatedAt}
                isLoading={isLoading}
                keyPoints={data.keyPoints}
                nextActions={data.nextActions}
                sentiment={data.sentiment}
                summary={data.summary}
                title="Deal Summary"
                topics={data.topics}
                urgency={data.urgency}
                variant="opportunity"
                onRefresh={onRefreshSummary}
              />
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <AIInsightsList
                emptyMessage="No insights available for this opportunity"
                insights={data.insights || []}
                isLoading={isLoading}
                onAction={(insight, action) => onActionClick?.(action)}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Shield className="h-3 w-3" />
                <span>Predictions are estimates. Tenant: {tenantId.slice(0, 8)}...</span>
              </div>
              {data.lastRefreshed && (
                <span className="text-[10px] text-slate-400">
                  Updated: {new Date(data.lastRefreshed).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
