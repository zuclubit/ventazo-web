// ============================================
// FASE 6.3 — AI Predictive Analytics
// Main exports
// ============================================

// Types
export * from './types';

// Engine
export {
  // Revenue Forecast
  createRevenueForecast,
  type CreateRevenueForecastParams,

  // Pipeline Forecast
  createPipelineForecast,
  type CreatePipelineForecastParams,

  // Deal Forecast
  createDealForecast,
  type CreateDealForecastParams,

  // Lead Forecast
  createLeadForecast,
  type CreateLeadForecastParams,

  // Churn Prediction
  createChurnPrediction,
  type CreateChurnPredictionParams,

  // Trend Analysis
  createTrendAnalysis,
  type CreateTrendAnalysisParams,

  // Configuration
  getForecastConfig,
  updateForecastConfig,

  // Statistical Utilities
  generateHistoricalData,
  generatePredictedData,
  calculateForecastMetrics,
  calculateConfidenceLevel,
  calculateTrend,
  calculateChangePercent,
  mean,
  standardDeviation,
  linearRegression,
  exponentialSmoothing,
  movingAverage,
  detectSeasonality,
  detectAnomalies,
} from './engine';

// Alerts
export {
  // Alert CRUD
  createAlert,
  getAlerts,
  getAlert,
  type CreateAlertParams,
  type GetAlertsParams,

  // Alert Status
  acknowledgeAlert,
  startAlertProgress,
  resolveAlert,
  dismissAlert,
  bulkAcknowledge,
  bulkDismiss,

  // Alert Stats & Digest
  getAlertStats,
  generateAlertDigest,
  type AlertStats,
  type AlertDigest,

  // Alert Generation
  generateForecastAlerts,
  generateChurnAlerts,
  generateTrendAlerts,

  // Configuration
  getAlertConfig,
  updateAlertConfig,
  defaultConfig as defaultAlertConfig,
  defaultThreshold,

  // Cleanup
  cleanupExpiredAlerts,
  cleanupOldAlerts,
} from './alerts';

// Hooks
export {
  // Query Keys
  aiAnalyticsQueryKeys,

  // Revenue Forecast Hooks
  useRevenueForecast,
  useGenerateRevenueForecast,

  // Pipeline Forecast Hooks
  usePipelineForecast,
  useGeneratePipelineForecast,

  // Deal Forecast Hooks
  useDealForecast,
  useGenerateDealForecast,

  // Lead Forecast Hooks
  useLeadForecast,
  useGenerateLeadForecast,

  // Churn Prediction Hooks
  useChurnPrediction,
  useGenerateChurnPrediction,
  useBulkChurnPredictions,

  // Trend Analysis Hooks
  useTrendAnalysis,
  useGenerateTrendAnalysis,

  // Alert Hooks
  useAlerts,
  useAlert,
  useAlertStats,
  useCreateAlert,
  useAcknowledgeAlert,
  useStartAlertProgress,
  useResolveAlert,
  useDismissAlert,
  useBulkAcknowledgeAlerts,
  useBulkDismissAlerts,
  useAlertDigest,

  // Alert Generation Hooks
  useGenerateForecastAlerts,
  useGenerateChurnAlerts,
  useGenerateTrendAlerts,

  // Configuration Hooks
  useForecastConfig,
  useUpdateForecastConfig,
  useAlertConfig,
  useUpdateAlertConfig,

  // Dashboard Hook
  useAnalyticsDashboard,
  type UseAnalyticsDashboardParams,

  // Utility Hooks
  usePrefetchForecasts,
  useInvalidateForecasts,
  useInvalidateAlerts,
} from './hooks';
