'use client';

/**
 * Dashboard Page - v2.0 (Production Ready)
 *
 * Integrated with real APIs - NO MOCK DATA.
 * Uses existing hooks from modules.
 *
 * Features:
 * - Real-time KPIs from backend
 * - Clickable KPIs with navigation + filters
 * - Loading, empty, and error states
 * - Recent leads with live data
 * - Recent activities from actual API
 *
 * @version 2.0.0
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  DollarSign,
  Target,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building2,
  RefreshCw,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Import real hooks from modules
import { useLeadStats, useLeads, type Lead } from '@/lib/leads';
import { useOpportunityStatistics } from '@/lib/opportunities';
import { useTaskStatistics, useUpcomingTasks, type Task } from '@/lib/tasks';
import { useCustomerStatistics } from '@/lib/customers';

// Force dynamic rendering so middleware runs
export const dynamic = 'force-dynamic';

// ============================================
// Types
// ============================================

interface KPIStat {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  description: string;
  href: string;
  filter?: Record<string, string>;
  color: string;
}

// ============================================
// KPI Card Component (Clickable)
// ============================================

interface KPICardProps {
  stat: KPIStat;
  isLoading?: boolean;
  onClick: () => void;
}

function KPICard({ stat, isLoading, onClick }: KPICardProps) {
  if (isLoading) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:scale-[1.02]',
        'border-l-4',
        stat.color
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        <stat.icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{stat.value}</div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          {stat.trend && stat.change && (
            <>
              {stat.trend === 'up' ? (
                <ArrowUp className="mr-1 h-3 w-3 text-green-500" />
              ) : stat.trend === 'down' ? (
                <ArrowDown className="mr-1 h-3 w-3 text-red-500" />
              ) : null}
              <span
                className={cn(
                  stat.trend === 'up' && 'text-green-500',
                  stat.trend === 'down' && 'text-red-500'
                )}
              >
                {stat.change}
              </span>
              <span className="ml-1">{stat.description}</span>
            </>
          )}
          {!stat.change && <span>{stat.description}</span>}
        </div>
        <div className="flex items-center justify-end mt-2 text-xs text-primary">
          <span>Ver detalle</span>
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Recent Leads Component
// ============================================

interface RecentLeadsProps {
  leads: Lead[];
  isLoading: boolean;
  onViewAll: () => void;
}

function RecentLeads({ leads, isLoading, onViewAll }: RecentLeadsProps) {
  const router = useRouter();

  const statusLabels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    won: 'Ganado',
    lost: 'Perdido',
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      contacted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      qualified: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      proposal: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      negotiation: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Leads Recientes</CardTitle>
          <CardDescription>Últimos leads agregados a tu pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (leads.length === 0) {
    return (
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle>Leads Recientes</CardTitle>
          <CardDescription>Últimos leads agregados a tu pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No hay leads recientes</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push('/app/leads')}
            >
              Ir a Leads
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Leads Recientes</CardTitle>
          <CardDescription>Últimos leads agregados a tu pipeline</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leads.slice(0, 5).map((lead) => (
            <div
              key={lead.id}
              className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
              onClick={() => router.push(`/app/leads?selected=${lead.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-medium text-primary">
                    {(lead.companyName || lead.fullName || 'L')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{lead.companyName || lead.fullName}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                    getStatusColor(lead.status)
                  )}
                >
                  {statusLabels[lead.status] || lead.status}
                </span>
                <div className="w-12 text-right">
                  <span className={cn('text-sm font-medium', getScoreColor(lead.score || 0))}>
                    {lead.score || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Upcoming Tasks Component
// ============================================

interface UpcomingTasksProps {
  tasks: Task[];
  isLoading: boolean;
  onViewAll: () => void;
}

function UpcomingTasksList({ tasks, isLoading, onViewAll }: UpcomingTasksProps) {
  const router = useRouter();

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: 'text-red-500',
      high: 'text-orange-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
    };
    return colors[priority] || 'text-muted-foreground';
  };

  const formatDueDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Sin fecha';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencida';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Tareas Próximas</CardTitle>
          <CardDescription>Tus próximas actividades pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                <div>
                  <Skeleton className="h-4 w-40 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Tareas Próximas</CardTitle>
          <CardDescription>Tus próximas actividades pendientes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500/30 mb-3" />
            <p className="text-sm text-muted-foreground">¡Todo al día!</p>
            <p className="text-xs text-muted-foreground mt-1">No tienes tareas pendientes</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tareas Próximas</CardTitle>
          <CardDescription>Tus próximas actividades pendientes</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todas
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.slice(0, 5).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 transition-colors"
              onClick={() => router.push(`/app/tasks?selected=${task.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-1.5 h-8 rounded-full', getPriorityColor(task.priority).replace('text-', 'bg-'))} />
                <div>
                  <p className="text-sm font-medium line-clamp-1">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.type === 'call' && '📞 Llamada'}
                    {task.type === 'meeting' && '📅 Reunión'}
                    {task.type === 'email' && '✉️ Email'}
                    {task.type === 'task' && '✓ Tarea'}
                    {task.type === 'follow_up' && '🔄 Seguimiento'}
                    {!['call', 'meeting', 'email', 'task', 'follow_up'].includes(task.type) && task.type}
                  </p>
                </div>
              </div>
              <span className={cn(
                'text-xs font-medium',
                task.dueDate && new Date(task.dueDate) < new Date() ? 'text-red-500' : 'text-muted-foreground'
              )}>
                {formatDueDate(task.dueDate)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Error State Component
// ============================================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-destructive/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">Error al cargar datos</h3>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="h-4 w-4 mr-2" />
        Reintentar
      </Button>
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export default function DashboardPage() {
  const router = useRouter();

  // Fetch real data from APIs
  const leadStats = useLeadStats();
  const opportunityStats = useOpportunityStatistics();
  const taskStats = useTaskStatistics();
  const customerStats = useCustomerStatistics();
  const recentLeads = useLeads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });
  const upcomingTasks = useUpcomingTasks();

  // Loading state
  const isStatsLoading = leadStats.isLoading || opportunityStats.isLoading || taskStats.isLoading || customerStats.isLoading;

  // Error state
  const hasError = leadStats.error || opportunityStats.error || taskStats.error || customerStats.error;

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  // Format percentage change
  const formatChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      trend: change >= 0 ? 'up' : 'down' as const,
    };
  };

  // Build KPI stats from real data
  const kpiStats: KPIStat[] = [
    {
      id: 'leads',
      title: 'Total Leads',
      value: leadStats.data?.total ?? 0,
      change: leadStats.data?.newThisMonth
        ? `+${leadStats.data.newThisMonth} este mes`
        : undefined,
      trend: leadStats.data?.newThisMonth && leadStats.data.newThisMonth > 0 ? 'up' : 'neutral',
      icon: Users,
      description: 'en pipeline',
      href: '/app/leads',
      color: 'border-l-blue-500',
    },
    {
      id: 'opportunities',
      title: 'Oportunidades',
      value: opportunityStats.data?.total ?? 0,
      change: opportunityStats.data?.open
        ? `${opportunityStats.data.open} activas`
        : undefined,
      trend: 'neutral',
      icon: Target,
      description: 'en seguimiento',
      href: '/app/opportunities',
      filter: { status: 'active' },
      color: 'border-l-purple-500',
    },
    {
      id: 'pipeline-value',
      title: 'Valor Pipeline',
      value: formatCurrency(opportunityStats.data?.totalAmount ?? 0),
      change: opportunityStats.data?.winRate
        ? `${opportunityStats.data.winRate.toFixed(0)}% win rate`
        : undefined,
      trend: 'neutral',
      icon: DollarSign,
      description: 'MXN total',
      href: '/app/opportunities',
      color: 'border-l-green-500',
    },
    {
      id: 'tasks',
      title: 'Tareas Pendientes',
      value: taskStats.data?.byStatus?.pending ?? 0,
      change: taskStats.data?.overdue && taskStats.data.overdue > 0
        ? `${taskStats.data.overdue} vencidas`
        : 'Al día',
      trend: taskStats.data?.overdue && taskStats.data.overdue > 0 ? 'down' : 'up',
      icon: Clock,
      description: 'por completar',
      href: '/app/tasks',
      filter: { status: 'pending' },
      color: 'border-l-orange-500',
    },
    {
      id: 'customers',
      title: 'Clientes Activos',
      value: customerStats.data?.totalCustomers ?? 0,
      change: customerStats.data?.activeCustomers
        ? `${customerStats.data.activeCustomers} activos`
        : undefined,
      trend: 'neutral',
      icon: Building2,
      description: 'en cartera',
      href: '/app/customers',
      filter: { status: 'active' },
      color: 'border-l-teal-500',
    },
    {
      id: 'conversion',
      title: 'Tasa Conversión',
      value: `${(opportunityStats.data?.winRate ?? 0).toFixed(1)}%`,
      change: opportunityStats.data?.won
        ? `${opportunityStats.data.won} ganadas`
        : undefined,
      trend: (opportunityStats.data?.winRate ?? 0) >= 20 ? 'up' : 'down',
      icon: TrendingUp,
      description: 'oportunidades → clientes',
      href: '/app/opportunities',
      filter: { status: 'won' },
      color: 'border-l-emerald-500',
    },
  ];

  // Handle KPI click - navigate with filters
  const handleKPIClick = (stat: KPIStat) => {
    const url = new URL(stat.href, window.location.origin);
    if (stat.filter) {
      Object.entries(stat.filter).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    router.push(url.pathname + url.search);
  };

  // Refresh all data
  const handleRefresh = () => {
    void leadStats.refetch();
    void opportunityStats.refetch();
    void taskStats.refetch();
    void customerStats.refetch();
    void recentLeads.refetch();
    void upcomingTasks.refetch();
  };

  // Error handling
  if (hasError) {
    return (
      <>
        <PageHeader
          description="Vista general de tu actividad de ventas"
          title="Dashboard"
        />
        <ErrorState
          message="No pudimos cargar los datos del dashboard"
          onRetry={handleRefresh}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        description="Vista general de tu actividad de ventas"
        title="Dashboard"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isStatsLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isStatsLoading && 'animate-spin')} />
            Actualizar
          </Button>
        }
      />

      {/* Stats Grid - 6 KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiStats.map((stat) => (
          <KPICard
            key={stat.id}
            stat={stat}
            isLoading={isStatsLoading}
            onClick={() => handleKPIClick(stat)}
          />
        ))}
      </div>

      {/* Content Grid - Leads + Tasks */}
      <div className="grid gap-4 lg:grid-cols-7 mt-6">
        <RecentLeads
          leads={recentLeads.data?.data ?? []}
          isLoading={recentLeads.isLoading}
          onViewAll={() => router.push('/app/leads')}
        />
        <UpcomingTasksList
          tasks={upcomingTasks.data?.today ?? upcomingTasks.data?.thisWeek ?? []}
          isLoading={upcomingTasks.isLoading}
          onViewAll={() => router.push('/app/tasks')}
        />
      </div>
    </>
  );
}
