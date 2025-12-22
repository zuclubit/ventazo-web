'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  ArrowUpRight,
  Filter,
  RefreshCw,
  TrendingUp,
  Users,
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
  generateLeadInsights,
  useAnalyticsLeads,
  type AnalyticsFilters,
  type DateRange,
} from '@/lib/analytics';

const FUNNEL_COLORS = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'];
const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function LeadsAnalyticsPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data, isLoading, refetch } = useAnalyticsLeads(filters);

  const insights = React.useMemo(() => {
    if (!data) return [];
    return generateLeadInsights(data);
  }, [data]);

  // Mock data for demonstration
  const funnelData = React.useMemo(() => {
    if (!data?.funnel?.length) {
      return [
        { name: 'Nuevos', value: 120, fill: FUNNEL_COLORS[0] },
        { name: 'Contactados', value: 85, fill: FUNNEL_COLORS[1] },
        { name: 'Calificados', value: 52, fill: FUNNEL_COLORS[2] },
        { name: 'Propuesta', value: 28, fill: FUNNEL_COLORS[3] },
        { name: 'Convertidos', value: 15, fill: FUNNEL_COLORS[4] },
      ];
    }
    return data.funnel.map((stage, idx) => ({
      name: stage.stageName,
      value: stage.count,
      fill: FUNNEL_COLORS[idx % FUNNEL_COLORS.length],
    }));
  }, [data]);

  const sourceData = React.useMemo(() => {
    if (!data?.bySource?.length) {
      return [
        { name: 'Website', value: 45, conversionRate: 18 },
        { name: 'Referral', value: 28, conversionRate: 25 },
        { name: 'Social Media', value: 22, conversionRate: 12 },
        { name: 'Email', value: 18, conversionRate: 22 },
        { name: 'Otros', value: 7, conversionRate: 8 },
      ];
    }
    return data.bySource.map((s) => ({
      name: s.source,
      value: s.count,
      conversionRate: s.conversionRate,
    }));
  }, [data]);

  const timeSeriesData = React.useMemo(() => {
    if (!data?.leadsOverTime?.length) {
      return [
        { date: 'Sem 1', leads: 28, conversions: 4 },
        { date: 'Sem 2', leads: 35, conversions: 6 },
        { date: 'Sem 3', leads: 32, conversions: 5 },
        { date: 'Sem 4', leads: 40, conversions: 8 },
      ];
    }
    return data.leadsOverTime.map((d, idx) => ({
      date: d.label ?? d.date,
      leads: d.value,
      conversions: data.conversionsOverTime?.[idx]?.value ?? 0,
    }));
  }, [data]);

  const ownerData = React.useMemo(() => {
    if (!data?.byOwner?.length) {
      return [
        { name: 'Juan García', leads: 35, converted: 8, rate: 22.8 },
        { name: 'María López', leads: 42, converted: 12, rate: 28.5 },
        { name: 'Carlos Ruiz', leads: 28, converted: 5, rate: 17.8 },
        { name: 'Ana Martínez', leads: 31, converted: 9, rate: 29.0 },
      ];
    }
    return data.byOwner.map((o) => ({
      name: o.userName,
      leads: o.count,
      converted: Math.round(o.count * (o.conversionRate / 100)),
      rate: o.conversionRate,
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
            <h1 className="text-2xl font-bold tracking-tight">Analytics de Leads</h1>
            <p className="text-muted-foreground">Análisis detallado del funnel de leads</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{data?.totalLeads ?? 120}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{(data?.conversionRate ?? 12.5).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data?.avgConversionTime ?? 14} días</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Calificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data?.qualifiedLeads ?? 52}</span>
              <Badge variant="secondary">{(data?.qualificationRate ?? 43.3).toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Funnel de Conversión</CardTitle>
            <CardDescription>Progresión de leads por etapa</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <FunnelChart>
                <Tooltip formatter={(value: number) => [value, 'Leads']} />
                <Funnel data={funnelData} dataKey="value" isAnimationActive>
                  <LabelList
                    dataKey="name"
                    fill="#fff"
                    position="center"
                    stroke="none"
                  />
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Leads vs Conversiones</CardTitle>
            <CardDescription>Evolución en el tiempo</CardDescription>
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
                  dataKey="leads"
                  name="Nuevos Leads"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  type="monotone"
                />
                <Line
                  dataKey="conversions"
                  name="Conversiones"
                  stroke="#10B981"
                  strokeWidth={2}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Source */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Fuente</CardTitle>
            <CardDescription>Distribución y conversión por origen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis fontSize={12} type="number" />
                <YAxis dataKey="name" fontSize={12} type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" name="Leads" />
                <Bar dataKey="conversionRate" fill="#10B981" name="Conversión %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Fuente</CardTitle>
            <CardDescription>Porcentaje de leads por origen</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="50%"
                  data={sourceData}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  outerRadius={100}
                >
                  {sourceData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Owner */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento por Usuario</CardTitle>
          <CardDescription>Leads y conversiones por vendedor</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Convertidos</TableHead>
                <TableHead className="text-right">Tasa de Conversión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownerData.map((owner, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{owner.name}</TableCell>
                  <TableCell className="text-right">{owner.leads}</TableCell>
                  <TableCell className="text-right">{owner.converted}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {owner.rate > 20 && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                      <Badge variant={owner.rate > 20 ? 'default' : 'secondary'}>
                        {owner.rate.toFixed(1)}%
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Análisis automático de tus leads</CardDescription>
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
