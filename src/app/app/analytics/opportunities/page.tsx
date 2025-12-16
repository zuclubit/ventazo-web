'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  ArrowUpRight,
  DollarSign,
  Filter,
  Percent,
  RefreshCw,
  Target,
  TrendingUp,
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
  generateOpportunityInsights,
  useAnalyticsOpportunities,
  type AnalyticsFilters,
  type DateRange,
} from '@/lib/analytics';

const PIPELINE_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#10B981', '#EF4444'];
const PIE_COLORS = ['#EF4444', '#F59E0B', '#6366F1', '#8B5CF6', '#EC4899'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OpportunitiesAnalyticsPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data, isLoading, refetch } = useAnalyticsOpportunities(filters);

  const insights = React.useMemo(() => {
    if (!data) return [];
    return generateOpportunityInsights(data);
  }, [data]);

  // Mock data for demonstration
  const pipelineData = React.useMemo(() => {
    if (!data?.pipeline?.length) {
      return [
        { name: 'Prospección', count: 35, value: 175000, fill: PIPELINE_COLORS[0] },
        { name: 'Calificación', count: 28, value: 280000, fill: PIPELINE_COLORS[1] },
        { name: 'Propuesta', count: 18, value: 360000, fill: PIPELINE_COLORS[2] },
        { name: 'Negociación', count: 12, value: 420000, fill: PIPELINE_COLORS[3] },
        { name: 'Cierre', count: 8, value: 320000, fill: PIPELINE_COLORS[4] },
      ];
    }
    return data.pipeline.map((stage, idx) => ({
      name: stage.stageName,
      count: stage.count,
      value: stage.value,
      fill: PIPELINE_COLORS[idx % PIPELINE_COLORS.length],
    }));
  }, [data]);

  const timeSeriesData = React.useMemo(() => {
    if (!data?.dealsOverTime?.length) {
      return [
        { date: 'Ene', deals: 12, revenue: 85000 },
        { date: 'Feb', deals: 18, revenue: 125000 },
        { date: 'Mar', deals: 15, revenue: 110000 },
        { date: 'Abr', deals: 22, revenue: 180000 },
      ];
    }
    return data.dealsOverTime.map((d, idx) => ({
      date: d.label ?? d.date,
      deals: d.value,
      revenue: data.revenueOverTime?.[idx]?.value ?? 0,
    }));
  }, [data]);

  const lossReasonData = React.useMemo(() => {
    if (!data?.lossReasons?.length) {
      return [
        { name: 'Precio', value: 35, amount: 175000 },
        { name: 'Competencia', value: 25, amount: 125000 },
        { name: 'Timing', value: 20, amount: 100000 },
        { name: 'Sin presupuesto', value: 12, amount: 60000 },
        { name: 'Otros', value: 8, amount: 40000 },
      ];
    }
    return data.lossReasons.map((r) => ({
      name: r.reason,
      value: r.percentage,
      amount: r.totalValue,
    }));
  }, [data]);

  const forecastData = React.useMemo(() => {
    if (!data?.forecast?.length) {
      return [
        { month: 'Este mes', committed: 180000, bestCase: 250000, pipeline: 420000 },
        { month: 'Próximo mes', committed: 120000, bestCase: 200000, pipeline: 380000 },
        { month: '+2 meses', committed: 80000, bestCase: 160000, pipeline: 320000 },
      ];
    }
    return data.forecast.map((f) => ({
      month: f.month,
      committed: f.committed,
      bestCase: f.bestCase,
      pipeline: f.pipeline,
    }));
  }, [data]);

  const ownerData = React.useMemo(() => {
    if (!data?.byOwner?.length) {
      return [
        { name: 'Juan García', count: 18, value: 320000, winRate: 42.5 },
        { name: 'María López', count: 22, value: 450000, winRate: 55.2 },
        { name: 'Carlos Ruiz', count: 15, value: 280000, winRate: 38.0 },
        { name: 'Ana Martínez', count: 20, value: 390000, winRate: 48.5 },
      ];
    }
    return data.byOwner.map((o) => ({
      name: o.userName,
      count: o.count,
      value: o.value,
      winRate: o.winRate,
    }));
  }, [data]);

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
            <h1 className="text-2xl font-bold tracking-tight">Analytics de Oportunidades</h1>
            <p className="text-muted-foreground">Pipeline, pronósticos y análisis de ventas</p>
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
              Pipeline Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(data?.totalPipelineValue ?? 1555000)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pipeline Ponderado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(data?.weightedPipelineValue ?? 680000)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Cierre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{(data?.winRate ?? 32.5).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">
                {formatCurrency(data?.avgDealSize ?? 45000)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pipeline Stage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline por Etapa</CardTitle>
            <CardDescription>Oportunidades y valor por etapa del pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis fontSize={12} type="number" />
                <YAxis dataKey="name" fontSize={12} type="category" width={100} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'value' ? formatCurrency(value) : value,
                    name === 'value' ? 'Valor' : 'Cantidad',
                  ]}
                />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Oportunidades" />
                <Bar dataKey="value" fill="#10B981" name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deals & Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Deals vs Ingresos</CardTitle>
            <CardDescription>Evolución en el tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} yAxisId="left" />
                <YAxis fontSize={12} orientation="right" yAxisId="right" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Ingresos' : 'Deals',
                  ]}
                />
                <Legend />
                <Line
                  dataKey="deals"
                  name="Deals Cerrados"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="left"
                />
                <Line
                  dataKey="revenue"
                  name="Ingresos"
                  stroke="#10B981"
                  strokeWidth={2}
                  type="monotone"
                  yAxisId="right"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Loss Reasons */}
        <Card>
          <CardHeader>
            <CardTitle>Razones de Pérdida</CardTitle>
            <CardDescription>Análisis de oportunidades perdidas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={lossReasonData}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={100}
                >
                  {lossReasonData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props) => [
                    name === 'value'
                      ? `${value}%`
                      : formatCurrency(props.payload.amount as number),
                    name === 'value' ? 'Porcentaje' : 'Valor Perdido',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Pronóstico de Ventas</CardTitle>
            <CardDescription>Proyección de ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                <Legend />
                <Bar dataKey="committed" fill="#10B981" name="Comprometido" />
                <Bar dataKey="bestCase" fill="#3B82F6" name="Mejor Caso" />
                <Bar dataKey="pipeline" fill="#93C5FD" name="Pipeline" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Owner */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Vendedor</CardTitle>
          <CardDescription>Oportunidades, valor y tasa de cierre por usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Oportunidades</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Tasa de Cierre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownerData.map((owner, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell className="text-right">{owner.count}</TableCell>
                  <TableCell className="text-right">{formatCurrency(owner.value)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {owner.winRate > 40 && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                      <Badge variant={owner.winRate > 40 ? 'default' : 'secondary'}>
                        {owner.winRate.toFixed(1)}%
                      </Badge>
                    </div>
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
              Oportunidades Ganadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{data?.wonOpportunities ?? 24}</span>
              <span className="text-sm text-green-500">
                {formatCurrency(data?.totalWonValue ?? 580000)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oportunidades Perdidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{data?.lostOpportunities ?? 18}</span>
              <span className="text-sm text-red-500">
                {formatCurrency(data?.totalLostValue ?? 420000)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ciclo de Venta Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{data?.avgSalesCycle ?? 28}</span>
              <span className="text-sm text-muted-foreground">días</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Análisis automático de tus oportunidades</CardDescription>
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
