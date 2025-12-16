'use client';

// ============================================
// AI Insight Card Component - FASE 6.1
// Individual insight display with actions
// ============================================

import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Clock,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type InsightType =
  | 'trend'
  | 'anomaly'
  | 'opportunity'
  | 'risk'
  | 'pattern'
  | 'recommendation'
  | 'alert';

type InsightCategory =
  | 'leads'
  | 'opportunities'
  | 'customers'
  | 'pipeline'
  | 'performance'
  | 'engagement';

interface RecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
}

interface RelatedEntity {
  type: 'lead' | 'opportunity' | 'customer' | 'task' | 'user';
  id: string;
  name: string;
}

interface AIInsightCardProps {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions?: RecommendedAction[];
  relatedEntities?: RelatedEntity[];
  confidence?: number;
  validUntil?: string;
  generatedAt?: string;
  onAction?: (action: RecommendedAction) => void;
  onNavigate?: (entity: RelatedEntity) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

// ============================================
// Configuration
// ============================================

const typeConfig: Record<InsightType, {
  icon: typeof TrendingUp;
  color: string;
  bg: string;
  label: string;
}> = {
  trend: {
    icon: TrendingUp,
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Trend',
  },
  anomaly: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Anomaly',
  },
  opportunity: {
    icon: Target,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Opportunity',
  },
  risk: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    label: 'Risk',
  },
  pattern: {
    icon: Zap,
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Pattern',
  },
  recommendation: {
    icon: Lightbulb,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Recommendation',
  },
  alert: {
    icon: Bell,
    color: 'text-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Alert',
  },
};

const impactConfig = {
  high: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  medium: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  low: {
    border: 'border-l-slate-300',
    badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  },
};

const categoryLabels: Record<InsightCategory, string> = {
  leads: 'Leads',
  opportunities: 'Opportunities',
  customers: 'Customers',
  pipeline: 'Pipeline',
  performance: 'Performance',
  engagement: 'Engagement',
};

// ============================================
// Component
// ============================================

export function AIInsightCard({
  id,
  type,
  category,
  title,
  description,
  impact,
  actionable,
  suggestedActions = [],
  relatedEntities = [],
  confidence,
  validUntil,
  generatedAt,
  onAction,
  onNavigate,
  onDismiss,
  className,
}: AIInsightCardProps) {
  const typeInfo = typeConfig[type];
  const impactInfo = impactConfig[impact];
  const Icon = typeInfo.icon;

  // Check if insight is still valid
  const isExpired = validUntil ? new Date(validUntil) < new Date() : false;

  if (isExpired) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-white dark:bg-slate-900 border-l-4 overflow-hidden',
        impactInfo.border,
        className
      )}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn('p-2 rounded-lg', typeInfo.bg)}>
            <Icon className={cn('h-4 w-4', typeInfo.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  typeInfo.bg,
                  typeInfo.color
                )}
              >
                {typeInfo.label}
              </span>
              <span className="text-xs text-slate-400">
                {categoryLabels[category]}
              </span>
              <span className={cn('text-xs px-1.5 py-0.5 rounded', impactInfo.badge)}>
                {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
              </span>
            </div>
            <h4 className="mt-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h4>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {description}
            </p>
          </div>

          {/* Dismiss */}
          {onDismiss && (
            <button
              className="text-slate-400 hover:text-slate-600 p-1 -m-1"
              title="Dismiss"
              onClick={() => onDismiss(id)}
            >
              <span className="sr-only">Dismiss</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      {actionable && suggestedActions.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {suggestedActions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                className="text-xs h-7"
                size="sm"
                variant={action.priority === 'high' ? 'default' : 'outline'}
                onClick={() => onAction?.(action)}
              >
                {action.action}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Related Entities */}
      {relatedEntities.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {relatedEntities.slice(0, 3).map((entity) => (
              <button
                key={entity.id}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => onNavigate?.(entity)}
              >
                {entity.name}
                <ChevronRight className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-2">
            {confidence !== undefined && (
              <span>{Math.round(confidence * 100)}% confidence</span>
            )}
            {generatedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(generatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          {validUntil && (
            <span>
              Valid until {new Date(validUntil).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Insights List Component
// ============================================

interface AIInsightsListProps {
  insights: Omit<AIInsightCardProps, 'onAction' | 'onNavigate' | 'onDismiss'>[];
  onAction?: (insight: { id: string }, action: RecommendedAction) => void;
  onNavigate?: (entity: RelatedEntity) => void;
  onDismiss?: (id: string) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export function AIInsightsList({
  insights,
  onAction,
  onNavigate,
  onDismiss,
  emptyMessage = 'No insights available',
  isLoading = false,
  className,
}: AIInsightsListProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-lg border bg-slate-50 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Lightbulb className="h-8 w-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {insights.map((insight) => (
        <AIInsightCard
          key={insight.id}
          {...insight}
          onAction={(action) => onAction?.({ id: insight.id }, action)}
          onDismiss={onDismiss}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
