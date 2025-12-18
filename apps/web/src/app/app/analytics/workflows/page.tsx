'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Filter,
  PlayCircle,
  RefreshCw,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DATE_RANGE_LABELS,
  DATE_RANGES,
  generateWorkflowInsights,
  useAnalyticsWorkflows,
  type AnalyticsFilters,
  type DateRange,
} from '@/lib/analytics';

const TRIGGER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS = {
  success: '#10B981',
  failed: '#EF4444',
  skipped: '#F59E0B',
};

export default function WorkflowsAnalyticsPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data, isLoading, refetch } = useAnalyticsWorkflows(filters);

  const insights = React.useMemo(() => {
    if (!data) return [];
    return generateWorkflowInsights(data);
  }, [data]);

  // Mock data for demonstration
  const executionsOverTime = React.useMemo(() => {
    if (!data?.executionsOverTime?.length) {
      return [
        { date: 'Sem 1', executions: 245, success: 228, failed: 12, skipped: 5 },
        { date: 'Sem 2', executions: 312, success: 295, failed: 10, skipped: 7 },
        { date: 'Sem 3', executions: 289, success: 268, failed: 15, skipped: 6 },
        { date: 'Sem 4', executions: 356, success: 338, failed: 11, skipped: 7 },
      ];
    }
    return data.executionsOverTime.map((d) => ({
      date: d.label ?? d.date,
      executions: d.value,
      success: Math.round(d.value * 0.93),
      failed: Math.round(d.value * 0.04),
      skipped: Math.round(d.value * 0.03),
    }));
  }, [data]);

  const triggerData = React.useMemo(() => {
    if (!data?.byTrigger?.length) {
      return [
        { name: 'Lead Creado', value: 320, percentage: 28 },
        { name: 'Lead Calificado', value: 180, percentage: 16 },
        { name: 'Oportunidad Ganada', value: 145, percentage: 13 },
        { name: 'Tarea Completada', value: 210, percentage: 18 },
        { name: 'Tiempo Programado', value: 165, percentage: 14 },
        { name: 'Otros', value: 125, percentage: 11 },
      ];
    }
    return data.byTrigger.map((t) => ({
      name: t.triggerLabel,
      value: t.count,
      percentage: t.percentage,
    }));
  }, [data]);

  const actionData = React.useMemo(() => {
    if (!data?.byAction?.length) {
      return [
        { name: 'Enviar Email', count: 420 },
        { name: 'Crear Tarea', count: 285 },
        { name: 'Actualizar Campo', count: 195 },
        { name: 'Enviar Notificación', count: 165 },
        { name: 'Asignar Usuario', count: 120 },
        { name: 'Webhook', count: 85 },
      ];
    }
    return data.byAction.map((a) => ({
      name: a.actionLabel,
      count: a.count,
    }));
  }, [data]);

  const errorData = React.useMemo(() => {
    if (!data?.errorAnalysis?.length) {
      return [
        { name: 'Timeout', value: 35, percentage: 40 },
        { name: 'API Error', value: 28, percentage: 32 },
        { name: 'Validación', value: 15, percentage: 17 },
        { name: 'Permisos', value: 10, percentage: 11 },
      ];
    }
    return data.errorAnalysis.map((e) => ({
      name: e.errorType,
      value: e.count,
      percentage: e.percentage,
    }));
  }, [data]);

  const topWorkflows = React.useMemo(() => {
    if (!data?.topWorkflows?.length) {
      return [
        { name: 'Bienvenida a Nuevos Leads', executions: 320, rate: 98.5, last: 'Hace 2 min' },
        { name: 'Asignación Automática', executions: 285, rate: 97.2, last: 'Hace 5 min' },
        { name: 'Follow-up Automático', executions: 248, rate: 95.8, last: 'Hace 12 min' },
        { name: 'Alerta de Deal Grande', executions: 165, rate: 99.1, last: 'Hace 1 hora' },
        { name: 'Recordatorio de Tareas', executions: 145, rate: 94.5, last: 'Hace 30 min' },
      ];
    }
    return data.topWorkflows.map((w) => ({
      name: w.name,
      executions: w.executionCount,
      rate: w.successRate,
      last: w.lastExecution,
    }));
  }, [data]);

  const totalWorkflows = data?.totalWorkflows ?? 24;
  const activeWorkflows = data?.activeWorkflows ?? 18;
  const totalExecutions = data?.totalExecutions ?? 1202;
  const successfulExecutions = data?.successfulExecutions ?? 1129;
  const failedExecutions = data?.failedExecutions ?? 48;
  const successRate = data?.successRate ?? 93.9;

  if (isLoading && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/dashboard">
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics de Workflows</h1>
            <p className="text-muted-foreground">Ejecuciones, triggers y automatizaciones</p>
          </div>
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
          <Button size="icon" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflows Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{activeWorkflows}</span>
              <span className="text-sm text-muted-foreground">/ {totalWorkflows}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ejecuciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{totalExecutions.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Éxito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{failedExecutions}</span>
              <Badge variant="destructive">
                {((failedExecutions / totalExecutions) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Executions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Ejecuciones en el Tiempo</CardTitle>
            <CardDescription>Éxitos, fallos y omitidos por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <LineChart data={executionsOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  dataKey="success"
                  name="Exitosos"
                  stroke={STATUS_COLORS.success}
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="failed"
                  name="Fallidos"
                  stroke={STATUS_COLORS.failed}
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="skipped"
                  name="Omitidos"
                  stroke={STATUS_COLORS.skipped}
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Trigger */}
        <Card>
          <CardHeader>
            <CardTitle>Ejecuciones por Trigger</CardTitle>
            <CardDescription>Distribución de activadores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={triggerData}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={120}
                >
                  {triggerData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={TRIGGER_COLORS[index % TRIGGER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Actions Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones más Usadas</CardTitle>
            <CardDescription>Frecuencia de cada tipo de acción</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={actionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis fontSize={12} type="number" />
                <YAxis dataKey="name" fontSize={12} type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="Ejecuciones" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Error Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Errores</CardTitle>
            <CardDescription>Tipos de fallos más comunes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#EF4444" name="Errores">
                  {errorData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : index === 1 ? '#F59E0B' : '#6366F1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>Top Workflows</CardTitle>
          <CardDescription>Workflows más ejecutados y su rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead className="text-right">Ejecuciones</TableHead>
                <TableHead className="text-right">Tasa de Éxito</TableHead>
                <TableHead className="text-right">Última Ejecución</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topWorkflows.map((workflow, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      {workflow.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{workflow.executions}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={workflow.rate > 95 ? 'default' : 'secondary'}>
                      {workflow.rate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {workflow.last}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ejecuciones Exitosas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-3xl font-bold">{successfulExecutions.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflows Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{totalWorkflows - activeWorkflows}</span>
              <Badge variant="outline">Pausados</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ejecuciones Omitidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <span className="text-3xl font-bold">{data?.skippedExecutions ?? 25}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Análisis automático de tus automatizaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-lg border p-4 ${
                  insight.type === 'positive'
                    ? 'bg-green-50 border-green-200'
                    : insight.type === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : insight.type === 'negative'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-blue-50 border-blue-200'
                }`}
              >
                <h4 className="font-medium">{insight.title}</h4>
                <p className="text-sm mt-1 opacity-90">{insight.description}</p>
                {insight.recommendation && (
                  <p className="text-sm mt-2 font-medium">{insight.recommendation}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
