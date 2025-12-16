'use client';

// ============================================
// AI Summary Component - FASE 6.1
// Displays AI-generated summaries with actions
// ============================================

import { useState } from 'react';

import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Lightbulb,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { UrgencyBadge } from './ai-badge';

// ============================================
// Types
// ============================================

interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  dueWithinDays?: number;
}

interface AISummaryProps {
  summary: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  nextActions?: RecommendedAction[];
  topics?: string[];
  actionItems?: string[];
  generatedAt?: string;
  confidence?: number;
  isLoading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onCopy?: () => void;
  onAddAsNote?: () => void;
  title?: string;
  variant?: 'lead' | 'notes' | 'opportunity';
  className?: string;
}

// ============================================
// Configuration
// ============================================

const sentimentConfig = {
  positive: {
    label: 'Positive',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    icon: '😊',
  },
  neutral: {
    label: 'Neutral',
    color: 'text-slate-600 bg-slate-50 dark:bg-slate-800',
    icon: '😐',
  },
  negative: {
    label: 'Negative',
    color: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    icon: '😟',
  },
  mixed: {
    label: 'Mixed',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    icon: '🤔',
  },
};

const priorityConfig = {
  high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
  medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
  low: 'border-l-slate-300 bg-slate-50/50 dark:bg-slate-800/50',
};

// ============================================
// Subcomponents
// ============================================

function ActionItem({ action }: { action: RecommendedAction }) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border-l-4',
        priorityConfig[action.priority]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {action.action}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {action.reasoning}
          </p>
        </div>
        {action.dueWithinDays && (
          <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <Clock className="h-3 w-3" />
            {action.dueWithinDays}d
          </span>
        )}
      </div>
    </div>
  );
}

function KeyPointsList({ points }: { points: string[] }) {
  return (
    <ul className="space-y-2">
      {points.map((point, index) => (
        <li
          key={index}
          className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
        >
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function TopicTags({ topics }: { topics: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic, index) => (
        <span
          key={index}
          className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
        >
          {topic}
        </span>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AISummary({
  summary,
  keyPoints = [],
  sentiment,
  urgency,
  nextActions = [],
  topics = [],
  actionItems = [],
  generatedAt,
  confidence,
  isLoading = false,
  error,
  onRefresh,
  onCopy,
  onAddAsNote,
  title = 'AI Summary',
  variant: _variant = 'lead',
  className,
}: AISummaryProps) {
  // variant is available for future styling variations
  void _variant;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else {
      await navigator.clipboard.writeText(summary);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sentimentInfo = sentiment ? sentimentConfig[sentiment] : undefined;

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4', className)}>
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to generate summary</span>
        </div>
        <p className="mt-2 text-sm text-red-600/80 dark:text-red-400/80">{error}</p>
        {onRefresh && (
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900 p-4', className)}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-4/6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {urgency && <UrgencyBadge size="sm" urgency={urgency} />}
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              className="h-7 w-7 p-0"
              size="sm"
              title="Regenerate summary"
              variant="ghost"
              onClick={onRefresh}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            className="h-7 w-7 p-0"
            size="sm"
            title="Copy summary"
            variant="ghost"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          {onAddAsNote && (
            <Button
              className="h-7 w-7 p-0"
              size="sm"
              title="Add as note"
              variant="ghost"
              onClick={onAddAsNote}
            >
              <Plus className="h-3.5 w-3.5" />
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
          {/* Summary Text */}
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {summary}
          </p>

          {/* Sentiment & Topics Row */}
          {(sentimentInfo || topics.length > 0) && (
            <div className="flex items-center gap-3 flex-wrap">
              {sentimentInfo && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    sentimentInfo.color
                  )}
                >
                  <span>{sentimentInfo.icon}</span>
                  {sentimentInfo.label}
                </span>
              )}
              {topics.length > 0 && <TopicTags topics={topics} />}
            </div>
          )}

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Key Points
              </h4>
              <KeyPointsList points={keyPoints} />
            </div>
          )}

          {/* Action Items (for notes summary) */}
          {actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Action Items
              </h4>
              <ul className="space-y-1.5">
                {actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                  >
                    <Target className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Actions */}
          {nextActions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Recommended Actions
              </h4>
              <div className="space-y-2">
                {nextActions.slice(0, 3).map((action, index) => (
                  <ActionItem key={index} action={action} />
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 italic">
              AI-generated. Review before use.
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {confidence !== undefined && (
                <span>{Math.round(confidence * 100)}% confidence</span>
              )}
              {generatedAt && (
                <span>
                  {new Date(generatedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
