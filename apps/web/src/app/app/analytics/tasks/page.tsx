'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Filter,
  RefreshCw,
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
  generateTaskInsights,
  useAnalyticsTasks,
  type AnalyticsFilters,
  type DateRange,
} from '@/lib/analytics';

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function TasksAnalyticsPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data, isLoading, refetch } = useAnalyticsTasks(filters);

  const insights = React.useMemo(() => {
    if (!data) return [];
    return generateTaskInsights(data);
  }, [data]);

  // Mock data for demonstration
  const timeSeriesData = React.useMemo(() => {
    if (!data?.tasksOverTime?.length) {
      return [
        { date: 'Sem 1', created: 45, completed: 38 },
        { date: 'Sem 2', created: 52, completed: 48 },
        { date: 'Sem 3', created: 48, completed: 42 },
        { date: 'Sem 4', created: 55, completed: 50 },
      ];
    }
    return data.tasksOverTime.map((d, idx) => ({
      date: d.label ?? d.date,
      created: d.value,
      completed: data.completionsOverTime?.[idx]?.value ?? 0,
    }));
  }, [data]);

  const priorityData = React.useMemo(() => {
    if (!data?.byPriority?.length) {
      return [
        { priority: 'Urgente', count: 12, completed: 10, rate: 83.3 },
        { priority: 'Alta', count: 35, completed: 28, rate: 80.0 },
        { priority: 'Media', count: 68, completed: 55, rate: 80.9 },
        { priority: 'Baja', count: 45, completed: 42, rate: 93.3 },
      ];
    }
    return data.byPriority.map((p) => ({
      priority: p.priority,
      count: p.count,
      completed: p.completedCount,
      rate: p.completionRate,
    }));
  }, [data]);

  const typeData = React.useMemo(() => {
    if (!data?.byType?.length) {
      return [
        { name: 'Llamada', value: 45 },
        { name: 'Reunión', value: 32 },
        { name: 'Email', value: 28 },
        { name: 'Seguimiento', value: 35 },
        { name: 'Otros', value: 20 },
      ];
    }
    return data.byType.map((t) => ({
      name: t.type,
      value: t.count,
    }));
  }, [data]);

  const weeklyData = React.useMemo(() => {
    if (!data?.weeklyProductivity?.length) {
      return [
        { day: 'Lun', created: 32, completed: 28, overdue: 3 },
        { day: 'Mar', created: 38, completed: 35, overdue: 2 },
        { day: 'Mié', created: 35, completed: 30, overdue: 4 },
        { day: 'Jue', created: 42, completed: 38, overdue: 2 },
        { day: 'Vie', created: 28, completed: 32, overdue: 1 },
      ];
    }
    return data.weeklyProductivity;
  }, [data]);

  const ownerData = React.useMemo(() => {
    if (!data?.byOwner?.length) {
      return [
        { name: 'Juan García', total: 45, completed: 38, overdue: 3, rate: 84.4, avgTime: 4.2 },
        { name: 'María López', total: 52, completed: 48, overdue: 1, rate: 92.3, avgTime: 3.5 },
        { name: 'Carlos Ruiz', total: 38, completed: 32, overdue: 4, rate: 84.2, avgTime: 5.1 },
        { name: 'Ana Martínez', total: 48, completed: 44, overdue: 2, rate: 91.7, avgTime: 3.8 },
      ];
    }
    return data.byOwner.map((o) => ({
      name: o.userName,
      total: o.totalTasks,
      completed: o.completedTasks,
      overdue: o.overdueTasks,
      rate: o.completionRate,
      avgTime: o.avgCompletionTime,
    }));
  }, [data]);

  const totalTasks = data?.totalTasks ?? 160;
  const completedTasks = data?.completedTasks ?? 135;
  const pendingTasks = data?.pendingTasks ?? 18;
  const overdueTasks = data?.overdueTasks ?? 7;
  const completionRate = data?.completionRate ?? 84.4;
  const onTimeRate = data?.onTimeRate ?? 91.5;

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
            <h1 className="text-2xl font-bold tracking-tight">Analytics de Tareas</h1>
            <p className="text-muted-foreground">Productividad y gestión de tareas</p>
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
              Total Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalTasks}</span>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Completadas</span>
                <span>{completedTasks}/{totalTasks}</span>
              </div>
              <Progress value={(completedTasks / totalTasks) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{completionRate.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{pendingTasks}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{overdueTasks}</span>
              <Badge variant="destructive" className="ml-2">
                {((overdueTasks / totalTasks) * 100).toFixed(1)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas Creadas vs Completadas</CardTitle>
            <CardDescription>Evolución semanal</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  dataKey="created"
                  name="Creadas"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="completed"
                  name="Completadas"
                  stroke="#10B981"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas por Tipo</CardTitle>
            <CardDescription>Distribución por categoría</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={typeData}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={120}
                >
                  {typeData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
        {/* By Priority */}
        <Card>
          <CardHeader>
            <CardTitle>Tareas por Prioridad</CardTitle>
            <CardDescription>Completadas vs Total por nivel de prioridad</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Total" />
                <Bar dataKey="completed" fill="#10B981" name="Completadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Productivity */}
        <Card>
          <CardHeader>
            <CardTitle>Productividad Semanal</CardTitle>
            <CardDescription>Actividad por día de la semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" fill="#3B82F6" name="Creadas" />
                <Bar dataKey="completed" fill="#10B981" name="Completadas" />
                <Bar dataKey="overdue" fill="#EF4444" name="Vencidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Owner */}
      <Card>
        <CardHeader>
          <CardTitle>Productividad por Usuario</CardTitle>
          <CardDescription>Rendimiento individual del equipo</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Completadas</TableHead>
                <TableHead className="text-right">Vencidas</TableHead>
                <TableHead className="text-right">Tasa</TableHead>
                <TableHead className="text-right">Tiempo Prom.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownerData.map((owner, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell className="text-right">{owner.total}</TableCell>
                  <TableCell className="text-right">{owner.completed}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={owner.overdue > 3 ? 'destructive' : 'secondary'}>
                      {owner.overdue}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={owner.rate > 85 ? 'default' : 'secondary'}>
                      {owner.rate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{owner.avgTime.toFixed(1)}h</TableCell>
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
              Tasa a Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{onTimeRate.toFixed(1)}%</span>
              <Badge variant="outline" className="text-green-600">
                On Time
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tiempo Promedio de Completado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{data?.avgCompletionTime ?? 4.2}</span>
              <span className="text-muted-foreground">horas</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{data?.inProgressTasks ?? 12}</span>
              <Badge variant="outline" className="text-blue-600">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Análisis automático de productividad</CardDescription>
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
