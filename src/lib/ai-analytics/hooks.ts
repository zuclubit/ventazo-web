// ============================================
// FASE 6.3 — AI Analytics React Query Hooks
// Hooks for forecasting, alerts, and predictions
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getAlerts,
  getAlert,
  getAlertStats,
  getAlertConfig,
  updateAlertConfig,
  createAlert,
  acknowledgeAlert,
  startAlertProgress,
  resolveAlert,
  dismissAlert,
  bulkAcknowledge,
  bulkDismiss,
  generateAlertDigest,
  generateForecastAlerts,
  generateChurnAlerts,
  generateTrendAlerts,
  type GetAlertsParams,
  type CreateAlertParams,
} from './alerts';
import {
  createRevenueForecast,
  createPipelineForecast,
  createDealForecast,
  createLeadForecast,
  createChurnPrediction,
  createTrendAnalysis,
  getForecastConfig,
  updateForecastConfig,
  type CreateRevenueForecastParams,
  type CreatePipelineForecastParams,
  type CreateDealForecastParams,
  type CreateLeadForecastParams,
  type CreateChurnPredictionParams,
  type CreateTrendAnalysisParams,
} from './engine';


import type {
  Forecast,
  RevenueForecast,
  PipelineForecast,
  DealForecast,
  LeadForecast,
  ChurnPrediction,
  TrendAnalysis,
  PredictiveAlert,
  AlertCategory,
  AlertSeverity,
  ForecastConfig,
  AlertConfig,
  ForecastType,
  ForecastPeriod,
} from './types';

// ============================================
// Query Keys
// ============================================

export const aiAnalyticsQueryKeys = {
  all: ['ai-analytics'] as const,

  // Forecasts
  forecasts: () => [...aiAnalyticsQueryKeys.all, 'forecasts'] as const,
  forecast: (type: ForecastType, id: string) =>
    [...aiAnalyticsQueryKeys.forecasts(), type, id] as const,
  revenueForecast: (tenantId: string, period: ForecastPeriod) =>
    [...aiAnalyticsQueryKeys.forecasts(), 'revenue', tenantId, period] as const,
  pipelineForecast: (tenantId: string, period: ForecastPeriod) =>
    [...aiAnalyticsQueryKeys.forecasts(), 'pipeline', tenantId, period] as const,
  dealForecast: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.forecasts(), 'deals', tenantId] as const,
  leadForecast: (tenantId: string, period: ForecastPeriod) =>
    [...aiAnalyticsQueryKeys.forecasts(), 'leads', tenantId, period] as const,

  // Churn
  churnPredictions: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.all, 'churn', tenantId] as const,
  churnPrediction: (customerId: string) =>
    [...aiAnalyticsQueryKeys.all, 'churn', 'customer', customerId] as const,

  // Trends
  trends: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.all, 'trends', tenantId] as const,
  trend: (tenantId: string, metric: string) =>
    [...aiAnalyticsQueryKeys.trends(tenantId), metric] as const,

  // Alerts
  alerts: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.all, 'alerts', tenantId] as const,
  alertsFiltered: (params: GetAlertsParams) =>
    [...aiAnalyticsQueryKeys.alerts(params.tenantId), params] as const,
  alert: (tenantId: string, alertId: string) =>
    [...aiAnalyticsQueryKeys.alerts(tenantId), alertId] as const,
  alertStats: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.alerts(tenantId), 'stats'] as const,
  alertDigest: (tenantId: string, period: 'daily' | 'weekly') =>
    [...aiAnalyticsQueryKeys.alerts(tenantId), 'digest', period] as const,

  // Config
  forecastConfig: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.all, 'config', 'forecast', tenantId] as const,
  alertConfig: (tenantId: string) =>
    [...aiAnalyticsQueryKeys.all, 'config', 'alert', tenantId] as const,
};

// ============================================
// Revenue Forecast Hooks
// ============================================

export function useRevenueForecast(
  params: Omit<CreateRevenueForecastParams, 'name'> & { name?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.revenueForecast(params.tenantId, params.period),
    queryFn: () => createRevenueForecast({
      ...params,
      name: params.name || `Revenue Forecast - ${params.period}`,
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useGenerateRevenueForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateRevenueForecastParams) => {
      return Promise.resolve(createRevenueForecast(params));
    },
    onSuccess: (forecast) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.revenueForecast(forecast.tenantId, forecast.period),
        forecast
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.forecasts(),
      });
    },
  });
}

// ============================================
// Pipeline Forecast Hooks
// ============================================

export function usePipelineForecast(
  params: Omit<CreatePipelineForecastParams, 'name'> & { name?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.pipelineForecast(params.tenantId, params.period),
    queryFn: () => createPipelineForecast({
      ...params,
      name: params.name || `Pipeline Forecast - ${params.period}`,
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGeneratePipelineForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreatePipelineForecastParams) => {
      return Promise.resolve(createPipelineForecast(params));
    },
    onSuccess: (forecast) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.pipelineForecast(forecast.tenantId, forecast.period),
        forecast
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.forecasts(),
      });
    },
  });
}

// ============================================
// Deal Forecast Hooks
// ============================================

export function useDealForecast(
  params: Omit<CreateDealForecastParams, 'name'> & { name?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.dealForecast(params.tenantId),
    queryFn: () => createDealForecast({
      ...params,
      name: params.name || 'Deal Probability Forecast',
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGenerateDealForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateDealForecastParams) => {
      return Promise.resolve(createDealForecast(params));
    },
    onSuccess: (forecast) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.dealForecast(forecast.tenantId),
        forecast
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.forecasts(),
      });
    },
  });
}

// ============================================
// Lead Forecast Hooks
// ============================================

export function useLeadForecast(
  params: Omit<CreateLeadForecastParams, 'name'> & { name?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.leadForecast(params.tenantId, params.period),
    queryFn: () => createLeadForecast({
      ...params,
      name: params.name || `Lead Forecast - ${params.period}`,
    }),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGenerateLeadForecast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateLeadForecastParams) => {
      return Promise.resolve(createLeadForecast(params));
    },
    onSuccess: (forecast) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.leadForecast(forecast.tenantId, forecast.period),
        forecast
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.forecasts(),
      });
    },
  });
}

// ============================================
// Churn Prediction Hooks
// ============================================

export function useChurnPrediction(
  params: CreateChurnPredictionParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.churnPrediction(params.customerId),
    queryFn: () => createChurnPrediction(params),
    enabled: options?.enabled !== false && !!params.customerId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useGenerateChurnPrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateChurnPredictionParams) => {
      return Promise.resolve(createChurnPrediction(params));
    },
    onSuccess: (prediction) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.churnPrediction(prediction.customerId),
        prediction
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.churnPredictions(prediction.tenantId),
      });
    },
  });
}

export function useBulkChurnPredictions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customers: CreateChurnPredictionParams[]) => {
      return customers.map(c => createChurnPrediction(c));
    },
    onSuccess: (predictions) => {
      for (const prediction of predictions) {
        queryClient.setQueryData(
          aiAnalyticsQueryKeys.churnPrediction(prediction.customerId),
          prediction
        );
      }
      if (predictions.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: aiAnalyticsQueryKeys.churnPredictions(predictions[0]!.tenantId),
        });
      }
    },
  });
}

// ============================================
// Trend Analysis Hooks
// ============================================

export function useTrendAnalysis(
  params: CreateTrendAnalysisParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.trend(params.tenantId, params.metric),
    queryFn: () => createTrendAnalysis(params),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGenerateTrendAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateTrendAnalysisParams) => {
      return Promise.resolve(createTrendAnalysis(params));
    },
    onSuccess: (trend) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.trend(trend.tenantId, trend.metric),
        trend
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.trends(trend.tenantId),
      });
    },
  });
}

// ============================================
// Alert Hooks
// ============================================

export function useAlerts(params: GetAlertsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.alertsFiltered(params),
    queryFn: () => getAlerts(params),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute auto-refresh
  });
}

export function useAlert(tenantId: string, alertId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.alert(tenantId, alertId),
    queryFn: () => getAlert(alertId, tenantId),
    enabled: options?.enabled !== false && !!alertId,
    staleTime: 30 * 1000,
  });
}

export function useAlertStats(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.alertStats(tenantId),
    queryFn: () => getAlertStats(tenantId),
    enabled: options?.enabled !== false,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateAlertParams) => {
      return Promise.resolve(createAlert(params));
    },
    onSuccess: (alert) => {
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(alert.tenantId),
      });
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, tenantId, userId }: { alertId: string; tenantId: string; userId: string }) => {
      const result = acknowledgeAlert(alertId, tenantId, userId);
      if (!result) throw new Error('Alert not found');
      return Promise.resolve(result);
    },
    onSuccess: (alert) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.alert(alert.tenantId, alert.id),
        alert
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(alert.tenantId),
      });
    },
  });
}

export function useStartAlertProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, tenantId, userId }: { alertId: string; tenantId: string; userId: string }) => {
      const result = startAlertProgress(alertId, tenantId, userId);
      if (!result) throw new Error('Alert not found');
      return Promise.resolve(result);
    },
    onSuccess: (alert) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.alert(alert.tenantId, alert.id),
        alert
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(alert.tenantId),
      });
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, tenantId, resolution }: { alertId: string; tenantId: string; resolution?: string }) => {
      const result = resolveAlert(alertId, tenantId, resolution);
      if (!result) throw new Error('Alert not found');
      return Promise.resolve(result);
    },
    onSuccess: (alert) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.alert(alert.tenantId, alert.id),
        alert
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(alert.tenantId),
      });
    },
  });
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, tenantId, reason }: { alertId: string; tenantId: string; reason?: string }) => {
      const result = dismissAlert(alertId, tenantId, reason);
      if (!result) throw new Error('Alert not found');
      return Promise.resolve(result);
    },
    onSuccess: (alert) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.alert(alert.tenantId, alert.id),
        alert
      );
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(alert.tenantId),
      });
    },
  });
}

export function useBulkAcknowledgeAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertIds, tenantId, userId }: { alertIds: string[]; tenantId: string; userId: string }) => {
      return Promise.resolve(bulkAcknowledge(alertIds, tenantId, userId));
    },
    onSuccess: (_, { tenantId }) => {
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(tenantId),
      });
    },
  });
}

export function useBulkDismissAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertIds, tenantId, reason }: { alertIds: string[]; tenantId: string; reason?: string }) => {
      return Promise.resolve(bulkDismiss(alertIds, tenantId, reason));
    },
    onSuccess: (_, { tenantId }) => {
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(tenantId),
      });
    },
  });
}

export function useAlertDigest(
  tenantId: string,
  period: 'daily' | 'weekly',
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.alertDigest(tenantId, period),
    queryFn: () => generateAlertDigest(tenantId, period),
    enabled: options?.enabled !== false,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

// ============================================
// Alert Generation Hooks
// ============================================

export function useGenerateForecastAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ forecast, tenantId }: { forecast: Forecast; tenantId: string }) => {
      return Promise.resolve(generateForecastAlerts(forecast, tenantId));
    },
    onSuccess: (alerts) => {
      if (alerts.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: aiAnalyticsQueryKeys.alerts(alerts[0]!.tenantId),
        });
      }
    },
  });
}

export function useGenerateChurnAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ predictions, tenantId }: { predictions: ChurnPrediction[]; tenantId: string }) => {
      return Promise.resolve(generateChurnAlerts(predictions, tenantId));
    },
    onSuccess: (alerts) => {
      if (alerts.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: aiAnalyticsQueryKeys.alerts(alerts[0]!.tenantId),
        });
      }
    },
  });
}

export function useGenerateTrendAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trend, tenantId }: { trend: TrendAnalysis; tenantId: string }) => {
      return Promise.resolve(generateTrendAlerts(trend, tenantId));
    },
    onSuccess: (alerts) => {
      if (alerts.length > 0) {
        void queryClient.invalidateQueries({
          queryKey: aiAnalyticsQueryKeys.alerts(alerts[0]!.tenantId),
        });
      }
    },
  });
}

// ============================================
// Configuration Hooks
// ============================================

export function useForecastConfig(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.forecastConfig(tenantId),
    queryFn: () => getForecastConfig(tenantId),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateForecastConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, updates }: { tenantId: string; updates: Partial<Omit<ForecastConfig, 'tenantId'>> }) => {
      return Promise.resolve(updateForecastConfig(tenantId, updates));
    },
    onSuccess: (config) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.forecastConfig(config.tenantId),
        config
      );
    },
  });
}

export function useAlertConfig(tenantId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiAnalyticsQueryKeys.alertConfig(tenantId),
    queryFn: () => getAlertConfig(tenantId),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateAlertConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, updates }: { tenantId: string; updates: Partial<Omit<AlertConfig, 'tenantId'>> }) => {
      return Promise.resolve(updateAlertConfig(tenantId, updates));
    },
    onSuccess: (config) => {
      queryClient.setQueryData(
        aiAnalyticsQueryKeys.alertConfig(config.tenantId),
        config
      );
    },
  });
}

// ============================================
// Combined Dashboard Hook
// ============================================

export interface UseAnalyticsDashboardParams {
  tenantId: string;
  period?: ForecastPeriod;
  enabled?: boolean;
}

export function useAnalyticsDashboard({
  tenantId,
  period = 'monthly',
  enabled = true,
}: UseAnalyticsDashboardParams) {
  const revenueForecast = useRevenueForecast({ tenantId, period }, { enabled });
  const pipelineForecast = usePipelineForecast({ tenantId, period }, { enabled });
  const leadForecast = useLeadForecast({ tenantId, period }, { enabled });
  const dealForecast = useDealForecast({ tenantId }, { enabled });
  const alertStats = useAlertStats(tenantId, { enabled });
  const alerts = useAlerts({ tenantId, limit: 5 }, { enabled });

  const isLoading =
    revenueForecast.isLoading ||
    pipelineForecast.isLoading ||
    leadForecast.isLoading ||
    dealForecast.isLoading ||
    alertStats.isLoading ||
    alerts.isLoading;

  const isError =
    revenueForecast.isError ||
    pipelineForecast.isError ||
    leadForecast.isError ||
    dealForecast.isError ||
    alertStats.isError ||
    alerts.isError;

  return {
    revenueForecast: revenueForecast.data,
    pipelineForecast: pipelineForecast.data,
    leadForecast: leadForecast.data,
    dealForecast: dealForecast.data,
    alertStats: alertStats.data,
    recentAlerts: alerts.data?.alerts,
    isLoading,
    isError,
    refetch: () => {
      void revenueForecast.refetch();
      void pipelineForecast.refetch();
      void leadForecast.refetch();
      void dealForecast.refetch();
      void alertStats.refetch();
      void alerts.refetch();
    },
  };
}

// ============================================
// Prefetch Hooks
// ============================================

export function usePrefetchForecasts() {
  const queryClient = useQueryClient();

  return (tenantId: string, period: ForecastPeriod = 'monthly') => {
    void queryClient.prefetchQuery({
      queryKey: aiAnalyticsQueryKeys.revenueForecast(tenantId, period),
      queryFn: () => createRevenueForecast({ tenantId, period, name: `Revenue - ${period}` }),
    });

    void queryClient.prefetchQuery({
      queryKey: aiAnalyticsQueryKeys.pipelineForecast(tenantId, period),
      queryFn: () => createPipelineForecast({ tenantId, period, name: `Pipeline - ${period}` }),
    });

    void queryClient.prefetchQuery({
      queryKey: aiAnalyticsQueryKeys.leadForecast(tenantId, period),
      queryFn: () => createLeadForecast({ tenantId, period, name: `Leads - ${period}` }),
    });
  };
}

export function useInvalidateForecasts() {
  const queryClient = useQueryClient();

  return (tenantId?: string) => {
    if (tenantId) {
      void queryClient.invalidateQueries({
        queryKey: [...aiAnalyticsQueryKeys.forecasts(), tenantId],
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.forecasts(),
      });
    }
  };
}

export function useInvalidateAlerts() {
  const queryClient = useQueryClient();

  return (tenantId?: string) => {
    if (tenantId) {
      void queryClient.invalidateQueries({
        queryKey: aiAnalyticsQueryKeys.alerts(tenantId),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: [...aiAnalyticsQueryKeys.all, 'alerts'],
      });
    }
  };
}
