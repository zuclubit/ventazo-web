'use client';

// ============================================
// AI Dashboard Insights Component - FASE 6.1
// Personalized insights feed for the dashboard
// ============================================

import { useState, useCallback } from 'react';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { TemperatureBadge } from './ai-badge';
import { AIInsightsList } from './ai-insight-card';

// ============================================
// Types
// ============================================

type InsightCategory = 'all' | 'leads' | 'opportunities' | 'tasks' | 'performance';
type ImpactLevel = 'all' | 'high' | 'medium' | 'low';

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
  relatedEntities?: Array<{
    type: 'lead' | 'opportunity' | 'customer' | 'task' | 'user';
    id: string;
    name: string;
  }>;
  confidence?: number;
  validUntil?: string;
  generatedAt?: string;
}

interface LeadAlert {
  id: string;
  leadName: string;
  reason: string;
  score: number;
  temperature: 'hot' | 'warm' | 'cold';
  action: string;
}

interface OpportunityRisk {
  id: string;
  opportunityName: string;
  value: number;
  winProbability: number;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
}

interface TaskReminder {
  id: string;
  taskName: string;
  relatedTo: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  isOverdue: boolean;
}

interface DashboardAIData {
  insights: AIInsight[];
  leadsRequiringAttention: LeadAlert[];
  atRiskOpportunities: OpportunityRisk[];
  criticalTasks: TaskReminder[];
  summary?: {
    totalInsights: number;
    highImpact: number;
    actionable: number;
  };
  generatedAt?: string;
  lastRefreshed?: string;
}

interface AIDashboardInsightsProps {
  data?: DashboardAIData;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
  onInsightAction?: (insight: AIInsight, action: { action: string; priority: string }) => void;
  onLeadClick?: (leadId: string) => void;
  onOpportunityClick?: (opportunityId: string) => void;
  onTaskClick?: (taskId: string) => void;
  onDismissInsight?: (insightId: string) => void;
  className?: string;
}

// ============================================
// Subcomponents
// ============================================

function QuickStatsBar({
  data,
}: {
  data: DashboardAIData;
}) {
  const stats = [
    {
      label: 'Leads Need Attention',
      value: data.leadsRequiringAttention.length,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'At-Risk Deals',
      value: data.atRiskOpportunities.length,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Critical Tasks',
      value: data.criticalTasks.filter((t) => t.priority === 'high' || t.isOverdue).length,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Actionable Insights',
      value: data.summary?.actionable || 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded', stat.bg)}>
                <Icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadAlertCard({
  alert,
  onClick,
}: {
  alert: LeadAlert;
  onClick?: () => void;
}) {
  return (
    <button
      className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {alert.leadName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{alert.reason}</p>
        </div>
        <TemperatureBadge size="sm" temperature={alert.temperature} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-blue-600 dark:text-blue-400">{alert.action}</span>
        <span className="text-xs text-slate-400">Score: {alert.score}</span>
      </div>
    </button>
  );
}

function OpportunityRiskCard({
  risk,
  onClick,
}: {
  risk: OpportunityRisk;
  onClick?: () => void;
}) {
  const riskColors = {
    high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    medium: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
    low: 'border-l-slate-300 bg-slate-50/50 dark:bg-slate-800/50',
  };

  return (
    <button
      className={cn(
        'w-full p-3 rounded-lg border-l-4 text-left transition-colors hover:shadow-sm',
        riskColors[risk.riskLevel]
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {risk.opportunityName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{risk.reason}</p>
        </div>
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
          ${risk.value.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <span className="text-xs text-slate-500">
          Win: {Math.round(risk.winProbability * 100)}%
        </span>
        <span
          className={cn(
            'text-xs font-medium',
            risk.riskLevel === 'high'
              ? 'text-red-600'
              : risk.riskLevel === 'medium'
              ? 'text-amber-600'
              : 'text-slate-500'
          )}
        >
          {risk.riskLevel.toUpperCase()} RISK
        </span>
      </div>
    </button>
  );
}

function TaskReminderCard({
  task,
  onClick,
}: {
  task: TaskReminder;
  onClick?: () => void;
}) {
  const priorityColors = {
    high: 'text-red-600',
    medium: 'text-amber-600',
    low: 'text-slate-500',
  };

  return (
    <button
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-colors hover:shadow-sm',
        task.isOverdue
          ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/50'
          : 'border-slate-200 dark:border-slate-700'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {task.taskName}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{task.relatedTo}</p>
        </div>
        {task.isOverdue && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            OVERDUE
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={cn('text-xs font-medium', priorityColors[task.priority])}>
          {task.priority.toUpperCase()}
        </span>
        <span className="text-xs text-slate-400">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function AIDashboardInsights({
  data,
  isLoading = false,
  error,
  onRefresh,
  onInsightAction,
  onLeadClick,
  onOpportunityClick,
  onTaskClick,
  onDismissInsight,
  className,
}: AIDashboardInsightsProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState<'insights' | 'leads' | 'opportunities' | 'tasks'>('insights');
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory>('all');
  const [impactFilter, setImpactFilter] = useState<ImpactLevel>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh]);

  // Filter insights
  const filteredInsights = data?.insights.filter((insight) => {
    if (categoryFilter !== 'all') {
      const categoryMap: Record<InsightCategory, string[]> = {
        all: [],
        leads: ['leads'],
        opportunities: ['opportunities', 'pipeline'],
        tasks: ['engagement'],
        performance: ['performance', 'customers'],
      };
      if (!categoryMap[categoryFilter].includes(insight.category)) {
        return false;
      }
    }
    if (impactFilter !== 'all' && insight.impact !== impactFilter) {
      return false;
    }
    return true;
  }) || [];

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Insights
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            Unable to load insights
          </p>
          <p className="text-xs text-slate-500 mb-4">{error}</p>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && !data) {
    return (
      <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              AI Insights
            </h2>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-500">Generating insights...</span>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
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
              AI Insights
            </h2>
          </div>
        </div>
        <div className="p-6 text-center">
          <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            No insights yet
          </p>
          <p className="text-xs text-slate-500 mb-4">
            AI is analyzing your CRM data to generate personalized insights.
          </p>
          {onRefresh && (
            <Button disabled={isRefreshing} onClick={handleRefresh}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Insights
            </Button>
          )}
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'insights' as const, label: 'All Insights', icon: Sparkles, count: data.insights.length },
    { id: 'leads' as const, label: 'Leads', icon: Users, count: data.leadsRequiringAttention.length },
    { id: 'opportunities' as const, label: 'Deals', icon: Target, count: data.atRiskOpportunities.length },
    { id: 'tasks' as const, label: 'Tasks', icon: Clock, count: data.criticalTasks.length },
  ];

  return (
    <div className={cn('rounded-lg border bg-white dark:bg-slate-900', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AI Insights
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            {data.summary?.totalInsights || 0} total
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              className="h-8 px-2"
              disabled={isRefreshing}
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
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
          {/* Quick Stats */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <QuickStatsBar data={data} />
          </div>

          {/* Section Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  className={cn(
                    'flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap',
                    activeSection === section.id
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  )}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="flex items-center gap-1.5">
                    <SectionIcon className="h-3.5 w-3.5" />
                    {section.label}
                    {section.count > 0 && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-[10px] font-bold rounded',
                          activeSection === section.id
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                        )}
                      >
                        {section.count}
                      </span>
                    )}
                  </span>
                  {activeSection === section.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-4">
            {/* All Insights */}
            {activeSection === 'insights' && (
              <>
                {/* Filters */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <select
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as InsightCategory)}
                  >
                    <option value="all">All Categories</option>
                    <option value="leads">Leads</option>
                    <option value="opportunities">Opportunities</option>
                    <option value="tasks">Tasks</option>
                    <option value="performance">Performance</option>
                  </select>
                  <select
                    className="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700"
                    value={impactFilter}
                    onChange={(e) => setImpactFilter(e.target.value as ImpactLevel)}
                  >
                    <option value="all">All Impact</option>
                    <option value="high">High Impact</option>
                    <option value="medium">Medium Impact</option>
                    <option value="low">Low Impact</option>
                  </select>
                </div>

                <AIInsightsList
                  emptyMessage="No insights match your filters"
                  insights={filteredInsights}
                  isLoading={isLoading}
                  onAction={(insight, action) => onInsightAction?.(insight as unknown as AIInsight, action)}
                  onDismiss={onDismissInsight}
                />
              </>
            )}

            {/* Leads Section */}
            {activeSection === 'leads' && (
              <div className="space-y-3">
                {data.leadsRequiringAttention.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No leads require attention</p>
                  </div>
                ) : (
                  data.leadsRequiringAttention.map((alert) => (
                    <LeadAlertCard
                      key={alert.id}
                      alert={alert}
                      onClick={() => onLeadClick?.(alert.id)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Opportunities Section */}
            {activeSection === 'opportunities' && (
              <div className="space-y-3">
                {data.atRiskOpportunities.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No at-risk opportunities</p>
                  </div>
                ) : (
                  data.atRiskOpportunities.map((risk) => (
                    <OpportunityRiskCard
                      key={risk.id}
                      risk={risk}
                      onClick={() => onOpportunityClick?.(risk.id)}
                    />
                  ))
                )}
              </div>
            )}

            {/* Tasks Section */}
            {activeSection === 'tasks' && (
              <div className="space-y-3">
                {data.criticalTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No critical tasks</p>
                  </div>
                ) : (
                  data.criticalTasks.map((task) => (
                    <TaskReminderCard
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick?.(task.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 italic">
                AI insights are personalized based on your role and permissions
              </p>
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
