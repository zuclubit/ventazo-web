// ============================================
// FASE 6.3 — Predictive Alerts System
// Alert generation, management, and notifications
// ============================================

import type {
  PredictiveAlert,
  AlertSeverity,
  AlertCategory,
  AlertEntity,
  AlertAction,
  AlertConfig,
  AlertThreshold,
  Forecast,
  ChurnPrediction,
  TrendAnalysis,
} from './types';

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// In-Memory Alert Store
// ============================================

const alertStore: Map<string, PredictiveAlert[]> = new Map();
const configStore: Map<string, AlertConfig> = new Map();

// ============================================
// Default Configuration
// ============================================

const defaultThreshold: AlertThreshold = {
  enabled: true,
  minSeverity: 'warning',
  minProbability: 0.6,
  cooldownMinutes: 60,
};

const defaultConfig: AlertConfig = {
  tenantId: '',
  thresholds: {
    revenue: { ...defaultThreshold, minSeverity: 'warning' },
    pipeline: { ...defaultThreshold, minSeverity: 'info' },
    churn: { ...defaultThreshold, minSeverity: 'critical', minProbability: 0.5 },
    opportunity: { ...defaultThreshold, minSeverity: 'info' },
    lead: { ...defaultThreshold, minSeverity: 'info' },
    performance: { ...defaultThreshold, minSeverity: 'warning' },
    anomaly: { ...defaultThreshold, minSeverity: 'warning', minProbability: 0.7 },
  },
  emailNotifications: true,
  slackNotifications: false,
  inAppNotifications: true,
  digestEnabled: true,
  digestFrequency: 'daily',
  updatedAt: new Date().toISOString(),
};

// ============================================
// Alert Configuration Management
// ============================================

export function getAlertConfig(tenantId: string): AlertConfig {
  return configStore.get(tenantId) || { ...defaultConfig, tenantId };
}

export function updateAlertConfig(
  tenantId: string,
  updates: Partial<Omit<AlertConfig, 'tenantId'>>
): AlertConfig {
  const current = getAlertConfig(tenantId);
  const updated: AlertConfig = {
    ...current,
    ...updates,
    tenantId,
    updatedAt: new Date().toISOString(),
  };
  configStore.set(tenantId, updated);
  return updated;
}

// ============================================
// Alert Creation Functions
// ============================================

export interface CreateAlertParams {
  tenantId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  details?: string;
  prediction: string;
  probability: number;
  confidence: number;
  timeframe?: string;
  potentialImpact: string;
  affectedEntities?: AlertEntity[];
  estimatedValue?: number;
  suggestedActions?: AlertAction[];
  source: string;
  expiresAt?: string;
}

export function createAlert(params: CreateAlertParams): PredictiveAlert {
  const {
    tenantId,
    category,
    severity,
    title,
    message,
    details,
    prediction,
    probability,
    confidence,
    timeframe,
    potentialImpact,
    affectedEntities = [],
    estimatedValue,
    suggestedActions = [],
    source,
    expiresAt,
  } = params;

  // Check if alert passes threshold
  const config = getAlertConfig(tenantId);
  const threshold = config.thresholds[category];

  if (!threshold.enabled) {
    throw new Error(`Alerts for category ${category} are disabled`);
  }

  const severityOrder: AlertSeverity[] = ['info', 'warning', 'critical', 'urgent'];
  if (severityOrder.indexOf(severity) < severityOrder.indexOf(threshold.minSeverity)) {
    throw new Error(`Alert severity ${severity} is below minimum threshold ${threshold.minSeverity}`);
  }

  if (probability < threshold.minProbability) {
    throw new Error(`Alert probability ${probability} is below minimum threshold ${threshold.minProbability}`);
  }

  const alert: PredictiveAlert = {
    id: generateId(),
    tenantId,
    category,
    severity,
    title,
    message,
    details,
    prediction,
    probability,
    confidence,
    timeframe,
    potentialImpact,
    affectedEntities,
    estimatedValue,
    suggestedActions,
    status: 'new',
    createdAt: new Date().toISOString(),
    expiresAt,
    source,
  };

  // Store alert
  const tenantAlerts = alertStore.get(tenantId) || [];
  tenantAlerts.push(alert);
  alertStore.set(tenantId, tenantAlerts);

  return alert;
}

// ============================================
// Alert Generation from Forecasts
// ============================================

export function generateForecastAlerts(
  forecast: Forecast,
  tenantId: string
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  // Check for significant negative change
  if (forecast.changePercent < -10) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: forecast.type === 'revenue' ? 'revenue' : 'pipeline',
        severity: forecast.changePercent < -20 ? 'critical' : 'warning',
        title: `Caída proyectada en ${forecast.name}`,
        message: `Se proyecta una caída del ${Math.abs(forecast.changePercent).toFixed(1)}% en ${forecast.name}`,
        details: `Valor actual: ${forecast.currentValue.toLocaleString()}, Proyectado: ${forecast.predictedValue.toLocaleString()}`,
        prediction: `Reducción de ${Math.abs(forecast.changePercent).toFixed(1)}% en los próximos ${forecast.forecastHorizon} días`,
        probability: forecast.confidenceScore,
        confidence: forecast.confidenceScore,
        timeframe: `${forecast.forecastHorizon} días`,
        potentialImpact: `Pérdida potencial de ${(forecast.currentValue - forecast.predictedValue).toLocaleString()}`,
        estimatedValue: forecast.currentValue - forecast.predictedValue,
        suggestedActions: [
          {
            action: 'Revisar pipeline activo',
            description: 'Analizar deals en riesgo y oportunidades de aceleración',
            priority: 'high',
            automatable: false,
          },
          {
            action: 'Aumentar actividades de prospección',
            description: 'Incrementar generación de leads para compensar caída',
            priority: 'medium',
            automatable: true,
          },
        ],
        source: 'forecast_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  // Check for positive opportunity
  if (forecast.changePercent > 15) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: 'opportunity',
        severity: 'info',
        title: `Crecimiento proyectado en ${forecast.name}`,
        message: `Se proyecta un crecimiento del ${forecast.changePercent.toFixed(1)}% en ${forecast.name}`,
        prediction: `Incremento de ${forecast.changePercent.toFixed(1)}% en los próximos ${forecast.forecastHorizon} días`,
        probability: forecast.confidenceScore,
        confidence: forecast.confidenceScore,
        timeframe: `${forecast.forecastHorizon} días`,
        potentialImpact: `Ganancia potencial de ${(forecast.predictedValue - forecast.currentValue).toLocaleString()}`,
        estimatedValue: forecast.predictedValue - forecast.currentValue,
        suggestedActions: [
          {
            action: 'Preparar recursos',
            description: 'Asegurar capacidad para manejar el crecimiento',
            priority: 'medium',
            automatable: false,
          },
        ],
        source: 'forecast_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  // Check forecast accuracy
  if (forecast.metrics.accuracy < 70) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: 'performance',
        severity: 'warning',
        title: `Baja precisión en pronóstico ${forecast.name}`,
        message: `El modelo de pronóstico tiene una precisión del ${forecast.metrics.accuracy.toFixed(1)}%`,
        prediction: 'Predicciones pueden no ser confiables',
        probability: 0.8,
        confidence: 0.7,
        potentialImpact: 'Decisiones basadas en datos poco confiables',
        suggestedActions: [
          {
            action: 'Revisar datos históricos',
            description: 'Verificar calidad y completitud de datos',
            priority: 'medium',
            automatable: false,
          },
          {
            action: 'Reentrenar modelo',
            description: 'Solicitar reentrenamiento con datos actualizados',
            priority: 'low',
            automatable: true,
          },
        ],
        source: 'forecast_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  return alerts;
}

// ============================================
// Alert Generation from Churn Predictions
// ============================================

export function generateChurnAlerts(
  predictions: ChurnPrediction[],
  tenantId: string
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  // High-risk customers
  const highRiskCustomers = predictions.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high');

  if (highRiskCustomers.length > 0) {
    const totalAtRisk = highRiskCustomers.reduce((sum, c) => sum + c.contractValue, 0);

    try {
      alerts.push(createAlert({
        tenantId,
        category: 'churn',
        severity: 'critical',
        title: `${highRiskCustomers.length} cliente(s) en riesgo alto de churn`,
        message: `Se identificaron ${highRiskCustomers.length} clientes con alto riesgo de cancelación`,
        details: `Valor total en riesgo: ${totalAtRisk.toLocaleString()}`,
        prediction: `Probabilidad promedio de churn: ${(highRiskCustomers.reduce((sum, c) => sum + c.churnProbability, 0) / highRiskCustomers.length * 100).toFixed(0)}%`,
        probability: Math.max(...highRiskCustomers.map(c => c.churnProbability)),
        confidence: Math.min(...highRiskCustomers.map(c => c.confidence)),
        timeframe: '30 días',
        potentialImpact: `Pérdida potencial de ${totalAtRisk.toLocaleString()} en revenue recurrente`,
        affectedEntities: highRiskCustomers.map(c => ({
          type: 'customer' as const,
          id: c.customerId,
          name: c.customerName,
          value: c.contractValue,
        })),
        estimatedValue: totalAtRisk,
        suggestedActions: [
          {
            action: 'Iniciar campaña de retención',
            description: 'Contactar a clientes de alto riesgo proactivamente',
            priority: 'high',
            automatable: true,
          },
          {
            action: 'Revisar casos con Customer Success',
            description: 'Analizar causas raíz y crear planes de acción',
            priority: 'high',
            automatable: false,
          },
          {
            action: 'Considerar ofertas de retención',
            description: 'Preparar descuentos o upgrades para retener',
            priority: 'medium',
            estimatedImpact: 'Reducción de 20-30% en churn',
            automatable: false,
          },
        ],
        source: 'churn_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  // Individual critical customers
  for (const customer of predictions.filter(p => p.riskLevel === 'critical' && p.contractValue > 10000)) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: 'churn',
        severity: 'urgent',
        title: `Cliente crítico en riesgo: ${customer.customerName}`,
        message: `${customer.customerName} tiene ${(customer.churnProbability * 100).toFixed(0)}% probabilidad de churn`,
        details: `Factores: ${customer.riskFactors.map(f => f.factor).join(', ')}`,
        prediction: customer.predictedChurnDate
          ? `Cancelación estimada para ${new Date(customer.predictedChurnDate).toLocaleDateString()}`
          : 'Alto riesgo de cancelación próxima',
        probability: customer.churnProbability,
        confidence: customer.confidence,
        timeframe: customer.predictedChurnDate
          ? `${Math.ceil((new Date(customer.predictedChurnDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días`
          : '30 días',
        potentialImpact: `Pérdida de ${customer.contractValue.toLocaleString()} ARR`,
        affectedEntities: [{
          type: 'customer',
          id: customer.customerId,
          name: customer.customerName,
          value: customer.contractValue,
        }],
        estimatedValue: customer.contractValue,
        suggestedActions: customer.retentionActions.map(a => ({
          action: a.action,
          description: `Impacto esperado: ${(a.expectedImpact * 100).toFixed(0)}% reducción en riesgo`,
          priority: a.priority,
          estimatedImpact: `${(a.expectedImpact * 100).toFixed(0)}% reducción`,
          automatable: false,
        })),
        source: 'churn_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  return alerts;
}

// ============================================
// Alert Generation from Trend Analysis
// ============================================

export function generateTrendAlerts(
  trend: TrendAnalysis,
  tenantId: string
): PredictiveAlert[] {
  const alerts: PredictiveAlert[] = [];

  // Anomaly alerts
  for (const anomaly of trend.anomalies.filter(a => a.severity === 'high')) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: 'anomaly',
        severity: 'warning',
        title: `Anomalía detectada en ${trend.metric}`,
        message: `Valor inusual de ${anomaly.value.toLocaleString()} detectado (esperado: ${anomaly.expectedValue.toLocaleString()})`,
        details: `Desviación: ${anomaly.deviation.toFixed(1)} desviaciones estándar`,
        prediction: anomaly.possibleCauses.join('; '),
        probability: 0.8,
        confidence: 0.75,
        timeframe: 'Inmediato',
        potentialImpact: 'Requiere investigación para determinar impacto',
        suggestedActions: [
          {
            action: 'Investigar causa raíz',
            description: 'Revisar eventos y cambios recientes',
            priority: 'high',
            automatable: false,
          },
        ],
        source: 'trend_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  // Trend reversal alert
  if (trend.trend !== trend.predictedTrend && trend.confidence > 0.7) {
    try {
      alerts.push(createAlert({
        tenantId,
        category: 'performance',
        severity: 'info',
        title: `Cambio de tendencia proyectado en ${trend.metric}`,
        message: `La tendencia actual (${trend.trend}) podría cambiar a ${trend.predictedTrend}`,
        prediction: `Cambio proyectado de ${trend.predictedChange.toLocaleString()} en el próximo período`,
        probability: trend.confidence,
        confidence: trend.confidence,
        potentialImpact: 'Ajustar estrategias según nueva tendencia',
        suggestedActions: [
          {
            action: 'Revisar proyecciones',
            description: 'Actualizar planes según nueva tendencia',
            priority: 'medium',
            automatable: false,
          },
        ],
        source: 'trend_engine',
      }));
    } catch {
      // Alert doesn't meet threshold, skip
    }
  }

  return alerts;
}

// ============================================
// Alert Query Functions
// ============================================

export interface GetAlertsParams {
  tenantId: string;
  category?: AlertCategory;
  severity?: AlertSeverity;
  status?: PredictiveAlert['status'];
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function getAlerts(params: GetAlertsParams): {
  alerts: PredictiveAlert[];
  total: number;
  hasMore: boolean;
} {
  const {
    tenantId,
    category,
    severity,
    status,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params;

  let alerts = alertStore.get(tenantId) || [];

  // Apply filters
  if (category) {
    alerts = alerts.filter(a => a.category === category);
  }

  if (severity) {
    alerts = alerts.filter(a => a.severity === severity);
  }

  if (status) {
    alerts = alerts.filter(a => a.status === status);
  }

  if (startDate) {
    alerts = alerts.filter(a => new Date(a.createdAt) >= new Date(startDate));
  }

  if (endDate) {
    alerts = alerts.filter(a => new Date(a.createdAt) <= new Date(endDate));
  }

  // Sort by created date descending
  alerts = alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = alerts.length;
  const paginatedAlerts = alerts.slice(offset, offset + limit);

  return {
    alerts: paginatedAlerts,
    total,
    hasMore: offset + limit < total,
  };
}

export function getAlert(alertId: string, tenantId: string): PredictiveAlert | null {
  const alerts = alertStore.get(tenantId) || [];
  return alerts.find(a => a.id === alertId) || null;
}

// ============================================
// Alert Status Management
// ============================================

export function acknowledgeAlert(
  alertId: string,
  tenantId: string,
  userId: string
): PredictiveAlert | null {
  const alerts = alertStore.get(tenantId) || [];
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) return null;

  alert.status = 'acknowledged';
  alert.acknowledgedBy = userId;
  alert.acknowledgedAt = new Date().toISOString();

  return alert;
}

export function startAlertProgress(
  alertId: string,
  tenantId: string,
  userId: string
): PredictiveAlert | null {
  const alerts = alertStore.get(tenantId) || [];
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) return null;

  alert.status = 'in_progress';
  if (!alert.acknowledgedBy) {
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date().toISOString();
  }

  return alert;
}

export function resolveAlert(
  alertId: string,
  tenantId: string,
  resolution?: string
): PredictiveAlert | null {
  const alerts = alertStore.get(tenantId) || [];
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) return null;

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  if (resolution) {
    alert.details = `${alert.details || ''}\n\nResolución: ${resolution}`;
  }

  return alert;
}

export function dismissAlert(
  alertId: string,
  tenantId: string,
  reason?: string
): PredictiveAlert | null {
  const alerts = alertStore.get(tenantId) || [];
  const alert = alerts.find(a => a.id === alertId);

  if (!alert) return null;

  alert.status = 'dismissed';
  alert.resolvedAt = new Date().toISOString();
  if (reason) {
    alert.details = `${alert.details || ''}\n\nDescartada: ${reason}`;
  }

  return alert;
}

// ============================================
// Alert Statistics
// ============================================

export interface AlertStats {
  total: number;
  byStatus: Record<PredictiveAlert['status'], number>;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  newToday: number;
  resolvedToday: number;
  avgResolutionTime: number; // hours
  criticalUnresolved: number;
}

export function getAlertStats(tenantId: string): AlertStats {
  const alerts = alertStore.get(tenantId) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats: AlertStats = {
    total: alerts.length,
    byStatus: {
      new: 0,
      acknowledged: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0,
    },
    bySeverity: {
      info: 0,
      warning: 0,
      critical: 0,
      urgent: 0,
    },
    byCategory: {
      revenue: 0,
      pipeline: 0,
      churn: 0,
      opportunity: 0,
      lead: 0,
      performance: 0,
      anomaly: 0,
    },
    newToday: 0,
    resolvedToday: 0,
    avgResolutionTime: 0,
    criticalUnresolved: 0,
  };

  const resolutionTimes: number[] = [];

  for (const alert of alerts) {
    // By status
    stats.byStatus[alert.status]++;

    // By severity
    stats.bySeverity[alert.severity]++;

    // By category
    stats.byCategory[alert.category]++;

    // New today
    if (new Date(alert.createdAt) >= today) {
      stats.newToday++;
    }

    // Resolved today
    if (alert.resolvedAt && new Date(alert.resolvedAt) >= today) {
      stats.resolvedToday++;
    }

    // Resolution time
    if (alert.resolvedAt && alert.createdAt) {
      const resolutionTime = (new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60 * 60);
      resolutionTimes.push(resolutionTime);
    }

    // Critical unresolved
    if ((alert.severity === 'critical' || alert.severity === 'urgent') &&
        (alert.status === 'new' || alert.status === 'acknowledged' || alert.status === 'in_progress')) {
      stats.criticalUnresolved++;
    }
  }

  // Calculate average resolution time
  if (resolutionTimes.length > 0) {
    stats.avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
  }

  return stats;
}

// ============================================
// Bulk Alert Operations
// ============================================

export function bulkAcknowledge(
  alertIds: string[],
  tenantId: string,
  userId: string
): number {
  let count = 0;
  for (const alertId of alertIds) {
    const result = acknowledgeAlert(alertId, tenantId, userId);
    if (result) count++;
  }
  return count;
}

export function bulkDismiss(
  alertIds: string[],
  tenantId: string,
  reason?: string
): number {
  let count = 0;
  for (const alertId of alertIds) {
    const result = dismissAlert(alertId, tenantId, reason);
    if (result) count++;
  }
  return count;
}

// ============================================
// Alert Cleanup
// ============================================

export function cleanupExpiredAlerts(tenantId: string): number {
  const alerts = alertStore.get(tenantId) || [];
  const now = new Date();

  const validAlerts = alerts.filter(a => {
    if (!a.expiresAt) return true;
    return new Date(a.expiresAt) > now;
  });

  const removed = alerts.length - validAlerts.length;
  alertStore.set(tenantId, validAlerts);

  return removed;
}

export function cleanupOldAlerts(tenantId: string, maxAgeDays: number = 90): number {
  const alerts = alertStore.get(tenantId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const validAlerts = alerts.filter(a => {
    if (a.status === 'new' || a.status === 'in_progress') return true;
    return new Date(a.createdAt) > cutoff;
  });

  const removed = alerts.length - validAlerts.length;
  alertStore.set(tenantId, validAlerts);

  return removed;
}

// ============================================
// Alert Digest Generation
// ============================================

export interface AlertDigest {
  tenantId: string;
  period: 'daily' | 'weekly';
  generatedAt: string;
  summary: {
    totalNew: number;
    totalResolved: number;
    criticalActive: number;
    topCategories: Array<{ category: AlertCategory; count: number }>;
  };
  highlights: PredictiveAlert[];
  trends: {
    alertVolume: 'increasing' | 'decreasing' | 'stable';
    resolutionRate: number;
    avgResponseTime: number;
  };
}

export function generateAlertDigest(tenantId: string, period: 'daily' | 'weekly'): AlertDigest {
  const alerts = alertStore.get(tenantId) || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (period === 'daily' ? 1 : 7));

  const periodAlerts = alerts.filter(a => new Date(a.createdAt) >= cutoff);
  const resolvedAlerts = periodAlerts.filter(a => a.status === 'resolved');
  const criticalAlerts = periodAlerts.filter(a =>
    (a.severity === 'critical' || a.severity === 'urgent') &&
    a.status !== 'resolved' && a.status !== 'dismissed'
  );

  // Category counts
  const categoryCounts: Record<string, number> = {};
  for (const alert of periodAlerts) {
    categoryCounts[alert.category] = (categoryCounts[alert.category] || 0) + 1;
  }

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category: category as AlertCategory, count }));

  // Calculate trends
  const previousPeriodAlerts = alerts.filter(a => {
    const date = new Date(a.createdAt);
    const previousCutoff = new Date(cutoff);
    previousCutoff.setDate(previousCutoff.getDate() - (period === 'daily' ? 1 : 7));
    return date >= previousCutoff && date < cutoff;
  });

  let alertVolume: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (periodAlerts.length > previousPeriodAlerts.length * 1.2) {
    alertVolume = 'increasing';
  } else if (periodAlerts.length < previousPeriodAlerts.length * 0.8) {
    alertVolume = 'decreasing';
  }

  const resolutionRate = periodAlerts.length > 0
    ? resolvedAlerts.length / periodAlerts.length
    : 0;

  // Average response time
  const responseTimes = resolvedAlerts
    .filter(a => a.acknowledgedAt)
    .map(a => (new Date(a.acknowledgedAt!).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60));

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  // Highlights (most important alerts)
  const highlights = periodAlerts
    .filter(a => a.severity === 'critical' || a.severity === 'urgent')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    tenantId,
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      totalNew: periodAlerts.length,
      totalResolved: resolvedAlerts.length,
      criticalActive: criticalAlerts.length,
      topCategories,
    },
    highlights,
    trends: {
      alertVolume,
      resolutionRate,
      avgResponseTime,
    },
  };
}

// ============================================
// Export All
// ============================================

export {
  defaultConfig,
  defaultThreshold,
};
