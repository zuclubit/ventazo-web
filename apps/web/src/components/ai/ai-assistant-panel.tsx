'use client';

// ============================================
// AI Assistant Panel Component - FASE 6.1
// Composite panel for Lead Detail page
// Combines Score, Summary, and Classification
// ============================================

import { useState, useCallback } from 'react';

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { AIClassificationCard } from './ai-classification-card';
import { AIScore } from './ai-score';
import { AISummary } from './ai-summary';

// ============================================
// Types
// ============================================

type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
type IntentLevel = 'low' | 'medium' | 'high';

interface ScoreFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

interface ClassificationLabel {
  label: string;
  probability: number;
  description?: string;
}

interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  dueWithinDays?: number;
}

interface LeadAIData {
  // Score data
  score: number;
  grade?: 'A' | 'B' | 'C' | 'D' | 'F';
  scoreConfidence?: number;
  scoreFactors?: ScoreFactor[];
  scoreExplanations?: string[];
  recommendation?: 'pursue' | 'nurture' | 'archive' | 'convert';
  previousScore?: number;

  // Summary data
  summary: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  nextActions?: RecommendedAction[];
  topics?: string[];

  // Classification data
  primaryLabel: string;
  labels?: ClassificationLabel[];
  industry?: string;
  companySize?: CompanySize;
  buyerPersona?: string;
  intentLevel?: IntentLevel;
  interests?: string[];
  classificationConfidence?: number;

  // Metadata
  generatedAt?: string;
  lastRefreshed?: string;
}

interface AIAssistantPanelProps {
  leadId: string;
  tenantId: string;
  data?: LeadAIData;
  isLoading?: boolean;
  error?: string | null;
  onRefreshScore?: () => void | Promise<void>;
  onRefreshSummary?: () => void | Promise<void>;
  onRefreshClassification?: () => void | Promise<void>;
  onRefreshAll?: () => void | Promise<void>;
  onApplyClassification?: (classification: {
    primaryLabel: string;
    industry?: string;
    companySize?: CompanySize;
    intentLevel?: IntentLevel;
    interests?: string[];
  }) => void;
  onAddSummaryAsNote?: () => void;
  className?: string;
}

// ============================================
// Component
// ============================================

export function AIAssistantPanel({
  leadId: _leadId,
  tenantId,
  data,
  isLoading = false,
  error,
  onRefreshScore,
  onRefreshSummary,
  onRefreshClassification,
  onRefreshAll,
  onApplyClassification,
  onAddSummaryAsNote,
  className,
}: AIAssistantPanelProps) {
  // leadId is available for future use in AI operations
  void _leadId;
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'score' | 'summary' | 'classification'>('score');
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
              AI Assistant
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
              AI Assistant
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-500">Analyzing lead data...</span>
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
              AI Assistant
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            No AI insights yet
          </p>
          <p className="text-xs text-slate-500 mb-4">
            Generate AI insights for this lead to see scoring, summaries, and classifications.
          </p>
          {onRefreshAll && (
            <Button disabled={isRefreshing} onClick={handleRefreshAll}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Insights
            </Button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'score' as const, label: 'Score', count: data.score },
    { id: 'summary' as const, label: 'Summary' },
    { id: 'classification' as const, label: 'Classification' },
  ];

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Assistant
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
              Refresh All
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
            {tabs.map((tab) => (
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
                  {tab.label}
                  {tab.count !== undefined && (
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
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Score Tab */}
            {activeTab === 'score' && (
              <AIScore
                confidence={data.scoreConfidence}
                explanations={data.scoreExplanations}
                factors={data.scoreFactors}
                grade={data.grade}
                isLoading={isLoading}
                previousScore={data.previousScore}
                recommendation={data.recommendation}
                score={data.score}
                showDetails={true}
                onRefresh={onRefreshScore}
              />
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <AISummary
                generatedAt={data.generatedAt}
                isLoading={isLoading}
                keyPoints={data.keyPoints}
                nextActions={data.nextActions}
                sentiment={data.sentiment}
                summary={data.summary}
                title="Lead Summary"
                topics={data.topics}
                urgency={data.urgency}
                variant="lead"
                onAddAsNote={onAddSummaryAsNote}
                onRefresh={onRefreshSummary}
              />
            )}

            {/* Classification Tab */}
            {activeTab === 'classification' && (
              <AIClassificationCard
                buyerPersona={data.buyerPersona}
                companySize={data.companySize}
                confidence={data.classificationConfidence}
                generatedAt={data.generatedAt}
                industry={data.industry}
                intentLevel={data.intentLevel}
                interests={data.interests}
                isLoading={isLoading}
                labels={data.labels}
                primaryLabel={data.primaryLabel}
                onApply={onApplyClassification}
                onRefresh={onRefreshClassification}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Shield className="h-3 w-3" />
                <span>Data processed securely. Tenant: {tenantId.slice(0, 8)}...</span>
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
