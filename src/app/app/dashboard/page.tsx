'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Lightbulb,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DATE_RANGE_LABELS,
  DATE_RANGES,
  generateAllInsights,
  useAnalyticsLeads,
  useAnalyticsOpportunities,
  useAnalyticsOverview,
  useAnalyticsTasks,
  useAnalyticsWorkflows,
  type AnalyticsFilters,
  type DateRange,
  type Insight,
} from '@/lib/analytics';

// ============================================
// Chart Colors
// ============================================

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
  quaternary: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  gray: '#6B7280',
};

const FUNNEL_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];

const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary, CHART_COLORS.purple];

// ============================================
// KPI Card Component
// ============================================

function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  format = 'number',
  tooltip,
  href,
}: {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  format?: 'number' | 'currency' | 'percentage';
  tooltip?: string;
  href?: string;
}) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toFixed(0)}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toFixed(0);
    }
  };

  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {title}
          {tooltip && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <span className="text-xs text-muted-foreground/60">?</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">{tooltip}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </CardTitle>
        <div className="rounded-full bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {change >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {Math.abs(change).toFixed(1)}%
            </span>
            {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ============================================
// Insight Card Component
// ============================================

function InsightCard({ insight }: { insight: Insight }) {
  const getInsightColor = (type: Insight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getInsightColor(insight.type)}`}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium">{insight.title}</h4>
          <p className="text-sm mt-1 opacity-90">{insight.description}</p>
          {insight.recommendation && (
            <p className="text-sm mt-2 font-medium">{insight.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Chart Loading Skeleton
// ============================================

function _ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="space-y-2 w-full">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className={`w-full mt-4`} style={{ height: height - 60 }} />
      </div>
    </div>
  );
}

// ============================================
// Error State Component
// ============================================

function DashboardError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <Target className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold">Error al cargar el dashboard</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        {message || 'No se pudieron cargar los datos. Por favor, intenta de nuevo.'}
      </p>
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export default function DashboardPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data: overview, isLoading: loadingOverview, error: overviewError, refetch: refetchOverview } = useAnalyticsOverview(filters);
  const { data: leads, isLoading: loadingLeads, error: leadsError } = useAnalyticsLeads(filters);
  const { data: opportunities, isLoading: loadingOpportunities, error: opportunitiesError } = useAnalyticsOpportunities(filters);
  const { data: tasks, isLoading: loadingTasks, error: tasksError } = useAnalyticsTasks(filters);
  const { data: workflows, isLoading: loadingWorkflows, error: workflowsError } = useAnalyticsWorkflows(filters);

  const isLoading = loadingOverview || loadingLeads || loadingOpportunities || loadingTasks || loadingWorkflows;
  const hasError = overviewError || leadsError || opportunitiesError || tasksError || workflowsError;

  // Generate insights from data
  const insights = React.useMemo(() => {
    if (!overview) return [];
    return generateAllInsights({
      overview,
      leads,
      opportunities,
      tasks,
      workflows,
    });
  }, [overview, leads, opportunities, tasks, workflows]);

  // Mock data for demonstration (will be replaced by API data)
  const mockFunnelData = React.useMemo(() => {
    if (!leads?.funnel?.length) {
      return [
        { name: 'Nuevos', value: overview?.newLeads ?? 45, fill: FUNNEL_COLORS[0] },
        { name: 'Contactados', value: overview?.leadsContacted ?? 32, fill: FUNNEL_COLORS[1] },
        { name: 'Calificados', value: overview?.leadsQualified ?? 18, fill: FUNNEL_COLORS[2] },
        { name: 'Convertidos', value: overview?.leadsConverted ?? 8, fill: FUNNEL_COLORS[3] },
      ];
    }
    return leads.funnel.map((stage, idx) => ({
      name: stage.stageName,
      value: stage.count,
      fill: FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
    }));
  }, [leads, overview]);

  const mockPipelineData = React.useMemo(() => {
    if (!opportunities?.pipeline?.length) {
      return [
        { name: 'Prospección', value: 125000, weighted: 12500 },
        { name: 'Calificación', value: 85000, weighted: 25500 },
        { name: 'Propuesta', value: 65000, weighted: 32500 },
        { name: 'Negociación', value: 45000, weighted: 31500 },
        { name: 'Cierre', value: 25000, weighted: 22500 },
      ];
    }
    return opportunities.pipeline.map((stage) => ({
      name: stage.stageName,
      value: stage.value,
      weighted: stage.weightedValue,
    }));
  }, [opportunities]);

  const mockTasksData = React.useMemo(() => {
    if (!tasks?.weeklyProductivity?.length) {
      return [
        { day: 'Lun', completed: 12, pending: 5, overdue: 2 },
        { day: 'Mar', completed: 15, pending: 8, overdue: 1 },
        { day: 'Mié', completed: 10, pending: 6, overdue: 3 },
        { day: 'Jue', completed: 18, pending: 4, overdue: 1 },
        { day: 'Vie', completed: 14, pending: 7, overdue: 2 },
        { day: 'Sáb', completed: 5, pending: 2, overdue: 0 },
        { day: 'Dom', completed: 3, pending: 1, overdue: 0 },
      ];
    }
    return tasks.weeklyProductivity;
  }, [tasks]);

  const mockWorkflowData = React.useMemo(() => {
    if (!workflows?.executionsOverTime?.length) {
      return [
        { date: 'Sem 1', success: 45, failed: 3 },
        { date: 'Sem 2', success: 52, failed: 2 },
        { date: 'Sem 3', success: 48, failed: 5 },
        { date: 'Sem 4', success: 61, failed: 1 },
      ];
    }
    return workflows.executionsOverTime.map((d) => ({
      date: d.label ?? d.date,
      success: d.value,
      failed: 0,
    }));
  }, [workflows]);

  const mockServiceDistribution = [
    { name: 'Servicios', value: 45, color: CHART_COLORS.primary },
    { name: 'Productos', value: 35, color: CHART_COLORS.secondary },
    { name: 'Paquetes', value: 20, color: CHART_COLORS.tertiary },
  ];

  const handleRefresh = () => {
    void refetchOverview();
  };

  // Error state
  if (hasError && !overview) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Vista general de tu CRM</p>
          </div>
        </div>
        <DashboardError
          message={overviewError?.message || 'Error al cargar los datos del dashboard'}
          onRetry={() => void refetchOverview()}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading && !overview) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Vista general de tu CRM</p>
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Vista general de tu CRM</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={filters.dateRange}
            onValueChange={(value) => setFilters({ ...filters, dateRange: value as DateRange })}
          >
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.filter((r) => r !== 'custom').map((range) => (
                <SelectItem key={range} value={range}>
                  {DATE_RANGE_LABELS[range]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          change={overview?.leadsChange}
          changeLabel="vs período anterior"
          href="/app/analytics/leads"
          icon={Users}
          title="Total Leads"
          tooltip="Número total de leads en el período seleccionado"
          value={overview?.totalLeads ?? 0}
        />
        <KPICard
          format="percentage"
          href="/app/analytics/leads"
          icon={TrendingUp}
          title="Tasa de Conversión"
          tooltip="Porcentaje de leads convertidos a clientes"
          value={overview?.leadConversionRate ?? 0}
        />
        <KPICard
          change={overview?.revenueChange}
          changeLabel="vs período anterior"
          format="currency"
          href="/app/analytics/opportunities"
          icon={DollarSign}
          title="Pipeline Value"
          tooltip="Valor total de oportunidades abiertas"
          value={overview?.pipelineValue ?? 0}
        />
        <KPICard
          format="currency"
          href="/app/analytics/opportunities"
          icon={Target}
          title="Forecast Revenue"
          tooltip="Ingresos proyectados ponderados por probabilidad"
          value={overview?.weightedPipelineValue ?? 0}
        />
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          href="/app/analytics/opportunities"
          icon={BarChart3}
          title="Oportunidades Ganadas"
          value={overview?.opportunitiesWon ?? 0}
        />
        <KPICard
          href="/app/analytics/tasks"
          icon={CheckCircle2}
          title="Tareas Completadas"
          value={overview?.tasksCompleted ?? 0}
        />
        <KPICard
          href="/app/analytics/workflows"
          icon={Workflow}
          title="Workflows Ejecutados"
          value={overview?.workflowExecutions ?? 0}
        />
        <KPICard
          change={overview?.customersChange}
          href="/app/customers"
          icon={Users}
          title="Nuevos Clientes"
          value={overview?.newCustomers ?? 0}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Funnel de Leads</CardTitle>
                <CardDescription>Conversión por etapa</CardDescription>
              </div>
              <Link href="/app/analytics/leads">
                <Button size="sm" variant="ghost">
                  Ver más <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <FunnelChart>
                <Tooltip
                  formatter={(value: number) => [value, 'Leads']}
                />
                <Funnel
                  data={mockFunnelData}
                  dataKey="value"
                  isAnimationActive
                >
                  <LabelList dataKey="name" fill="#fff" position="center" stroke="none" />
                  {mockFunnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Opportunity Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Pipeline de Oportunidades</CardTitle>
                <CardDescription>Valor por etapa (real vs ponderado)</CardDescription>
              </div>
              <Link href="/app/analytics/opportunities">
                <Button size="sm" variant="ghost">
                  Ver más <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={mockPipelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="value" fill={CHART_COLORS.primary} name="Valor Total" />
                <Bar dataKey="weighted" fill={CHART_COLORS.secondary} name="Ponderado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks Productivity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Productividad Semanal</CardTitle>
                <CardDescription>Tareas completadas, pendientes y vencidas</CardDescription>
              </div>
              <Link href="/app/analytics/tasks">
                <Button size="sm" variant="ghost">
                  Ver más <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={mockTasksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill={CHART_COLORS.secondary} name="Completadas" stackId="a" />
                <Bar dataKey="pending" fill={CHART_COLORS.tertiary} name="Pendientes" stackId="a" />
                <Bar dataKey="overdue" fill={CHART_COLORS.quaternary} name="Vencidas" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workflow Executions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Ejecuciones de Workflows</CardTitle>
                <CardDescription>Exitosas vs fallidas por semana</CardDescription>
              </div>
              <Link href="/app/analytics/workflows">
                <Button size="sm" variant="ghost">
                  Ver más <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <LineChart data={mockWorkflowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  dataKey="success"
                  name="Exitosas"
                  stroke={CHART_COLORS.secondary}
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="failed"
                  name="Fallidas"
                  stroke={CHART_COLORS.quaternary}
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Servicios</CardTitle>
            <CardDescription>Por tipo de servicio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={200} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={mockServiceDistribution}
                  dataKey="value"
                  innerRadius={50}
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={80}
                >
                  {mockServiceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Servicios']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estadísticas Rápidas</CardTitle>
            <CardDescription>Métricas clave del período</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <Badge variant="secondary">{(overview?.winRate ?? 0).toFixed(1)}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ticket Promedio</span>
              <Badge variant="secondary">${(overview?.avgDealSize ?? 0).toLocaleString()}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tiempo Conversión</span>
              <Badge variant="secondary">{overview?.avgLeadConversionTime ?? 0} días</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tareas Completadas</span>
              <Badge variant="secondary">{(overview?.taskCompletionRate ?? 0).toFixed(0)}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Workflows Activos</span>
              <Badge variant="secondary">{overview?.activeWorkflows ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Insights
            </CardTitle>
            <CardDescription>Análisis automático de tus datos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[280px] overflow-y-auto">
            {insights.length > 0 ? (
              insights.slice(0, 4).map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Los insights se generarán con más datos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
