'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  Box,
  DollarSign,
  Filter,
  Layers,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
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
  generateServiceInsights,
  useAnalyticsServices,
  type AnalyticsFilters,
  type DateRange,
} from '@/lib/analytics';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const TYPE_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ServicesAnalyticsPage() {
  const [filters, setFilters] = React.useState<AnalyticsFilters>({
    dateRange: 'month',
  });

  const { data, isLoading, refetch } = useAnalyticsServices(filters);

  const insights = React.useMemo(() => {
    if (!data) return [];
    return generateServiceInsights(data);
  }, [data]);

  // Mock data for demonstration
  const categoryData = React.useMemo(() => {
    if (!data?.byCategory?.length) {
      return [
        { name: 'Consultoría', count: 25, avgPrice: 5000, percentage: 32 },
        { name: 'Desarrollo', count: 18, avgPrice: 12000, percentage: 23 },
        { name: 'Soporte', count: 22, avgPrice: 2500, percentage: 28 },
        { name: 'Capacitación', count: 8, avgPrice: 3500, percentage: 10 },
        { name: 'Otros', count: 5, avgPrice: 1800, percentage: 7 },
      ];
    }
    return data.byCategory.map((c) => ({
      name: c.categoryName,
      count: c.count,
      avgPrice: c.avgPrice,
      percentage: c.percentage,
    }));
  }, [data]);

  const typeData = React.useMemo(() => {
    if (!data?.byType?.length) {
      return [
        { name: 'Por Proyecto', value: 45, avgPrice: 15000 },
        { name: 'Recurrente', value: 28, avgPrice: 3500 },
        { name: 'Por Hora', value: 27, avgPrice: 150 },
      ];
    }
    return data.byType.map((t) => ({
      name: t.type,
      value: t.count,
      avgPrice: t.avgPrice,
    }));
  }, [data]);

  const priceDistribution = React.useMemo(() => {
    if (!data?.priceDistribution?.length) {
      return [
        { range: '$0-1k', count: 15 },
        { range: '$1k-5k', count: 28 },
        { range: '$5k-10k', count: 22 },
        { range: '$10k-25k', count: 12 },
        { range: '$25k+', count: 8 },
      ];
    }
    return data.priceDistribution;
  }, [data]);

  const revenueByCategory = React.useMemo(() => {
    if (!data?.revenueByCategory?.length) {
      return [
        { name: 'Desarrollo', size: 450000, percentage: 42 },
        { name: 'Consultoría', size: 280000, percentage: 26 },
        { name: 'Soporte', size: 180000, percentage: 17 },
        { name: 'Capacitación', size: 95000, percentage: 9 },
        { name: 'Otros', size: 65000, percentage: 6 },
      ];
    }
    return data.revenueByCategory.map((r) => ({
      name: r.category,
      size: r.potentialRevenue,
      percentage: r.percentage,
    }));
  }, [data]);

  const topServices = React.useMemo(() => {
    if (!data?.topServices?.length) {
      return [
        { name: 'Desarrollo Web Full Stack', type: 'Por Proyecto', price: 25000, usage: 12, revenue: 300000 },
        { name: 'Consultoría Estratégica', type: 'Por Hora', price: 250, usage: 45, revenue: 180000 },
        { name: 'Soporte Técnico Premium', type: 'Recurrente', price: 5000, usage: 28, revenue: 140000 },
        { name: 'Desarrollo de Apps Móviles', type: 'Por Proyecto', price: 35000, usage: 4, revenue: 140000 },
        { name: 'Capacitación Corporativa', type: 'Por Proyecto', price: 8000, usage: 15, revenue: 120000 },
      ];
    }
    return data.topServices.map((s) => ({
      name: s.name,
      type: s.type,
      price: s.price,
      usage: s.usageCount,
      revenue: s.revenue,
    }));
  }, [data]);

  const totalServices = data?.totalServices ?? 78;
  const activeServices = data?.activeServices ?? 65;
  const inactiveServices = data?.inactiveServices ?? 10;
  const archivedServices = data?.archivedServices ?? 3;

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
            <h1 className="text-2xl font-bold tracking-tight">Analytics de Servicios</h1>
            <p className="text-muted-foreground">Catálogo, precios y distribución</p>
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
              Total Servicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalServices}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Servicios Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{activeServices}</span>
              <Badge variant="secondary">
                {((activeServices / totalServices) * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categorías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{categoryData.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Precio Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{formatCurrency(6500)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios por Categoría</CardTitle>
            <CardDescription>Distribución y precio promedio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={350} width="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis fontSize={12} type="number" />
                <YAxis dataKey="name" fontSize={12} type="category" width={100} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'avgPrice' ? formatCurrency(value) : value,
                    name === 'avgPrice' ? 'Precio Prom.' : 'Cantidad',
                  ]}
                />
                <Legend />
                <Bar dataKey="count" fill="#3B82F6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle>Servicios por Tipo</CardTitle>
            <CardDescription>Proyecto, Recurrente, Por Hora</CardDescription>
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
                    <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
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
        {/* Price Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Precios</CardTitle>
            <CardDescription>Servicios por rango de precio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <BarChart data={priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" name="Servicios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category (Treemap) */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Potenciales por Categoría</CardTitle>
            <CardDescription>Proporción de ingresos esperados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={300} width="100%">
              <Treemap
                data={revenueByCategory}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill="#3B82F6"
                content={({ x, y, width, height, name, percentage }) => (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      style={{
                        fill: CATEGORY_COLORS[revenueByCategory.findIndex((r) => r.name === name) % CATEGORY_COLORS.length],
                        stroke: '#fff',
                        strokeWidth: 2,
                      }}
                    />
                    {width > 60 && height > 40 && (
                      <>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 - 8}
                          fill="#fff"
                          fontSize={12}
                          textAnchor="middle"
                        >
                          {name}
                        </text>
                        <text
                          x={x + width / 2}
                          y={y + height / 2 + 10}
                          fill="#fff"
                          fontSize={11}
                          textAnchor="middle"
                        >
                          {percentage}%
                        </text>
                      </>
                    )}
                  </g>
                )}
              />
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card>
        <CardHeader>
          <CardTitle>Top Servicios</CardTitle>
          <CardDescription>Servicios con mayor uso e ingresos</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Servicio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Uso</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topServices.map((service, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{service.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(service.price)}</TableCell>
                  <TableCell className="text-right">{service.usage}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(service.revenue)}
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
              Servicios Inactivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{inactiveServices}</span>
              <Badge variant="secondary">
                {((inactiveServices / totalServices) * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Servicios Archivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{archivedServices}</span>
              <Badge variant="outline">Archivo</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ingresos Potenciales Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{formatCurrency(1070000)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
            <CardDescription>Análisis automático de tu catálogo</CardDescription>
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
