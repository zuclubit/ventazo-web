'use client';

// ============================================
// FASE 6.3 — AI Predictive Analytics Dashboard
// Main dashboard component for forecasts & alerts
// ============================================

import * as React from 'react';

import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Bell,
  ChevronRight,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  Target,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  CheckCircle,
} from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useAnalyticsDashboard,
  type ForecastPeriod,
  type AlertSeverity,
  type PredictiveAlert,
  type Forecast,
  FORECAST_PERIOD_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_CATEGORY_LABELS,
} from '@/lib/ai-analytics';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface AIPredictiveDashboardProps {
  tenantId: string;
  className?: string;
}

// ============================================
// Helper Components
// ============================================

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
}

function SeverityBadge({ severity }: { severity: AlertSeverity }) {
  const colors: Record<AlertSeverity, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  };

  return (
    <Badge className={cn('text-xs', colors[severity])} variant="outline">
      {ALERT_SEVERITY_LABELS[severity]}
    </Badge>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const color =
    percentage >= 80 ? 'text-green-600' :
    percentage >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Activity className={cn('h-3 w-3', color)} />
            <span className={cn('text-xs font-medium', color)}>{percentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Confianza del modelo: {percentage}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  confidence,
  subtitle,
}: {
  title: string;
  value: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ElementType;
  confidence?: number;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            {trend && <TrendIcon trend={trend} />}
            {change !== undefined && (
              <span className={cn(
                'text-xs',
                change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            )}
          </div>
          {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastChart({ forecast }: { forecast: Forecast }) {
  // Simple sparkline-style chart
  const allData = [...forecast.historicalData, ...forecast.predictedData];
  const maxValue = Math.max(...allData.map(d => d.upperBound));
  const minValue = Math.min(...allData.map(d => d.lowerBound));
  const range = maxValue - minValue || 1;

  return (
    <div className="h-24 flex items-end gap-0.5">
      {allData.slice(-30).map((point) => {
        const height = ((point.value - minValue) / range) * 100;
        const isHistorical = point.isActual;

        return (
          <TooltipProvider key={point.date}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex-1 rounded-t transition-all',
                    isHistorical ? 'bg-primary/60' : 'bg-primary/30 border-t-2 border-dashed border-primary'
                  )}
                  style={{ height: `${height}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {point.date}: {point.value.toLocaleString()}
                  {!isHistorical && ' (proyectado)'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

function AlertItem({ alert, onAcknowledge }: { alert: PredictiveAlert; onAcknowledge?: () => void }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="mt-0.5">
        <AlertTriangle className={cn(
          'h-4 w-4',
          alert.severity === 'urgent' ? 'text-red-500' :
          alert.severity === 'critical' ? 'text-orange-500' :
          alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium truncate">{alert.title}</h4>
          <SeverityBadge severity={alert.severity} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>{ALERT_CATEGORY_LABELS[alert.category]}</span>
          <span>•</span>
          <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
          {alert.estimatedValue && (
            <>
              <span>•</span>
              <span className="font-medium">${alert.estimatedValue.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
      {alert.status === 'new' && onAcknowledge && (
        <Button size="sm" variant="ghost" onClick={onAcknowledge}>
          <CheckCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface AlertStatsType {
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  criticalUnresolved: number;
  avgResolutionTime: number;
}

function AlertStatsCard({ stats }: { stats: AlertStatsType }) {
  const newCount = stats.byStatus['new'] ?? 0;
  const resolvedCount = stats.byStatus['resolved'] ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Estado de Alertas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.criticalUnresolved}</div>
            <div className="text-xs text-muted-foreground">Críticas</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{newCount}</div>
            <div className="text-xs text-muted-foreground">Nuevas</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{resolvedCount}</div>
            <div className="text-xs text-muted-foreground">Resueltas</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Tiempo promedio de resolución</span>
            <span className="font-medium">{stats.avgResolutionTime.toFixed(1)}h</span>
          </div>
          <Progress value={Math.min(100, (24 - stats.avgResolutionTime) / 24 * 100)} />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function AIPredictiveDashboard({ tenantId, className }: AIPredictiveDashboardProps) {
  const [period, setPeriod] = React.useState<ForecastPeriod>('monthly');

  const {
    revenueForecast,
    pipelineForecast,
    leadForecast,
    dealForecast,
    alertStats,
    recentAlerts,
    isLoading,
    refetch,
  } = useAnalyticsDashboard({ tenantId, period });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Analytics</h2>
          <p className="text-muted-foreground">
            Predicciones y análisis inteligente de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ForecastPeriod)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FORECAST_PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {revenueForecast && (
          <MetricCard
            change={revenueForecast.changePercent}
            confidence={revenueForecast.confidenceScore}
            icon={DollarSign}
            subtitle={`vs actual: $${(revenueForecast.currentValue / 1000).toFixed(0)}K`}
            title="Ingresos Proyectados"
            trend={revenueForecast.trend}
            value={`$${(revenueForecast.predictedValue / 1000).toFixed(0)}K`}
          />
        )}
        {pipelineForecast && (
          <MetricCard
            change={pipelineForecast.changePercent}
            confidence={pipelineForecast.confidenceScore}
            icon={Target}
            subtitle={`${pipelineForecast.stages?.length || 0} etapas`}
            title="Pipeline Proyectado"
            trend={pipelineForecast.trend}
            value={`$${(pipelineForecast.predictedValue / 1000).toFixed(0)}K`}
          />
        )}
        {leadForecast && (
          <MetricCard
            change={leadForecast.changePercent}
            confidence={leadForecast.confidenceScore}
            icon={Users}
            subtitle={`${leadForecast.bySource?.length || 0} fuentes`}
            title="Leads Proyectados"
            trend={leadForecast.trend}
            value={leadForecast.predictedValue.toLocaleString()}
          />
        )}
        {dealForecast && (
          <MetricCard
            confidence={dealForecast.confidenceScore}
            icon={BarChart3}
            subtitle={`$${((dealForecast.predictedValue || 0) / 1000).toFixed(0)}K ponderado`}
            title="Deals en Pipeline"
            value={dealForecast.dealProbabilities?.length.toString() || '0'}
          />
        )}
      </div>

      {/* Main Content */}
      <Tabs className="space-y-4" defaultValue="forecasts">
        <TabsList>
          <TabsTrigger className="gap-2" value="forecasts">
            <LineChart className="h-4 w-4" />
            Pronósticos
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="alerts">
            <Bell className="h-4 w-4" />
            Alertas
            {alertStats && alertStats.criticalUnresolved > 0 && (
              <Badge className="ml-1 h-5 px-1.5" variant="destructive">
                {alertStats.criticalUnresolved}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger className="gap-2" value="deals">
            <PieChart className="h-4 w-4" />
            Deals
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="forecasts">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Forecast */}
            {revenueForecast && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pronóstico de Ingresos</CardTitle>
                      <CardDescription>
                        Próximos {revenueForecast.forecastHorizon} días
                      </CardDescription>
                    </div>
                    <ConfidenceIndicator confidence={revenueForecast.confidenceScore} />
                  </div>
                </CardHeader>
                <CardContent>
                  <ForecastChart forecast={revenueForecast} />
                  <div className="mt-4 space-y-2">
                    {revenueForecast.aiInsights?.slice(0, 2).map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-muted-foreground">{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pipeline Forecast */}
            {pipelineForecast && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pronóstico de Pipeline</CardTitle>
                      <CardDescription>
                        Velocidad: {pipelineForecast.velocity?.currentDays || 0} días promedio
                      </CardDescription>
                    </div>
                    <ConfidenceIndicator confidence={pipelineForecast.confidenceScore} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pipelineForecast.stages?.slice(0, 5).map((stage) => (
                      <div key={stage.stageId}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{stage.stageName}</span>
                          <span className="font-medium">
                            {stage.predictedCount} ({(stage.predictedValue / 1000).toFixed(0)}K)
                          </span>
                        </div>
                        <Progress
                          value={(stage.predictedValue / (pipelineForecast.predictedValue || 1)) * 100}
                        />
                      </div>
                    ))}
                  </div>
                  {pipelineForecast.velocity?.bottlenecks && pipelineForecast.velocity.bottlenecks.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-yellow-800">
                        <AlertTriangle className="h-4 w-4" />
                        Cuellos de botella detectados
                      </div>
                      <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside">
                        {pipelineForecast.velocity.bottlenecks.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Lead Forecast Details */}
          {leadForecast && (
            <Card>
              <CardHeader>
                <CardTitle>Pronóstico de Leads por Fuente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {leadForecast.bySource?.map((source) => (
                    <div key={source.source} className="p-4 border rounded-lg">
                      <div className="font-medium">{source.source}</div>
                      <div className="text-2xl font-bold mt-1">
                        {source.predictedCount}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{(source.conversionRate * 100).toFixed(0)}% conv.</span>
                        {source.roi && <span>• ROI {source.roi.toFixed(1)}x</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent className="space-y-4" value="alerts">
          <div className="grid gap-4 md:grid-cols-3">
            {alertStats && (
              <AlertStatsCard stats={alertStats} />
            )}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Alertas Recientes</CardTitle>
                  <Button className="gap-1" size="sm" variant="link">
                    Ver todas <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAlerts && recentAlerts.length > 0 ? (
                    recentAlerts.map((alert) => (
                      <AlertItem key={alert.id} alert={alert} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p>No hay alertas pendientes</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="deals">
          {dealForecast && dealForecast.dealProbabilities && (
            <Card>
              <CardHeader>
                <CardTitle>Probabilidad de Deals</CardTitle>
                <CardDescription>
                  Análisis predictivo de cierre por deal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dealForecast.dealProbabilities.map((deal) => (
                    <div key={deal.dealId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{deal.dealName}</span>
                          <Badge variant="outline">{deal.currentStage}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>${deal.value.toLocaleString()}</span>
                          <span>•</span>
                          <span>{deal.daysInPipeline} días</span>
                          <span>•</span>
                          <span>Cierre: {deal.expectedCloseDate}</span>
                        </div>
                        {deal.signals.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {deal.signals.slice(0, 3).map((signal, idx) => (
                              <Badge
                                key={idx}
                                className={cn(
                                  'text-xs',
                                  signal.type === 'positive' ? 'text-green-600 border-green-300' :
                                  signal.type === 'negative' ? 'text-red-600 border-red-300' :
                                  'text-gray-600 border-gray-300'
                                )}
                                variant="outline"
                              >
                                {signal.signal}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {(deal.probability * 100).toFixed(0)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Probabilidad
                        </div>
                        <Badge
                          className={cn(
                            'mt-1',
                            deal.riskLevel === 'low' ? 'text-green-600' :
                            deal.riskLevel === 'medium' ? 'text-yellow-600' :
                            'text-red-600'
                          )}
                          variant="outline"
                        >
                          Riesgo {deal.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {dealForecast.recommendations && dealForecast.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recomendaciones AI</h4>
                    <div className="space-y-2">
                      {dealForecast.recommendations.map((rec) => (
                        <div key={rec.dealId} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <Activity className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{rec.action}</p>
                            <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                          </div>
                          <Badge
                            className={cn(
                              rec.priority === 'urgent' ? 'text-red-600' :
                              rec.priority === 'high' ? 'text-orange-600' :
                              'text-gray-600'
                            )}
                            variant="outline"
                          >
                            {rec.priority}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIPredictiveDashboard;
