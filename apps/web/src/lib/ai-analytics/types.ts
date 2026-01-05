// ============================================
// FASE 6.3 — AI Predictive Analytics Types
// Type definitions for forecasting and predictions
// ============================================

// ============================================
// Forecast Types
// ============================================

export type ForecastType =
  | 'revenue'
  | 'pipeline'
  | 'deals'
  | 'leads'
  | 'conversions'
  | 'churn'
  | 'growth';

export type ForecastPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export type ForecastModel =
  | 'linear'
  | 'exponential'
  | 'seasonal'
  | 'arima'
  | 'prophet'
  | 'ai_ensemble';

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high';

export interface ForecastDataPoint {
  date: string;
  value: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  isActual: boolean;
  isPredicted: boolean;
}

export interface ForecastMetrics {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number; // Mean Absolute Error
  r2: number; // R-squared
  accuracy: number;
}

export interface Forecast {
  id: string;
  tenantId: string;
  type: ForecastType;
  period: ForecastPeriod;
  model: ForecastModel;
  name: string;
  description?: string;

  // Time range
  startDate: string;
  endDate: string;
  forecastHorizon: number; // Days to forecast

  // Data
  historicalData: ForecastDataPoint[];
  predictedData: ForecastDataPoint[];

  // Summary
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';

  // Quality
  metrics: ForecastMetrics;
  confidence: ConfidenceLevel;
  confidenceScore: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastTrainedAt?: string;
  nextRefreshAt?: string;

  // AI Details
  aiInsights?: string[];
  aiRecommendations?: string[];
  factors?: ForecastFactor[];
}

export interface ForecastFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
  trend?: 'improving' | 'declining' | 'stable';
}

// ============================================
// Revenue Forecast Types
// ============================================

export interface RevenueForecast extends Forecast {
  type: 'revenue';
  currency: string;
  segments?: RevenueSegment[];
  byProduct?: RevenueByCategory[];
  byRegion?: RevenueByCategory[];
  byChannel?: RevenueByCategory[];
}

export interface RevenueSegment {
  name: string;
  currentValue: number;
  predictedValue: number;
  changePercent: number;
  confidence: number;
}

export interface RevenueByCategory {
  category: string;
  currentValue: number;
  predictedValue: number;
  percentage: number;
}

// ============================================
// Pipeline Forecast Types
// ============================================

export interface PipelineForecast extends Forecast {
  type: 'pipeline';
  stages: PipelineStageForecast[];
  conversionRates: ConversionRateForecast[];
  velocity: PipelineVelocity;
}

export interface PipelineStageForecast {
  stageId: string;
  stageName: string;
  currentCount: number;
  predictedCount: number;
  currentValue: number;
  predictedValue: number;
  avgTimeInStage: number;
  predictedTimeInStage: number;
}

export interface ConversionRateForecast {
  fromStage: string;
  toStage: string;
  currentRate: number;
  predictedRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PipelineVelocity {
  currentDays: number;
  predictedDays: number;
  trend: 'faster' | 'slower' | 'stable';
  bottlenecks: string[];
}

// ============================================
// Deal Forecast Types
// ============================================

export interface DealForecast extends Forecast {
  type: 'deals';
  dealProbabilities: DealProbability[];
  expectedCloseDate: string;
  riskFactors: DealRiskFactor[];
  recommendations: DealRecommendation[];
}

export interface DealProbability {
  dealId: string;
  dealName: string;
  currentStage: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  daysInPipeline: number;
  riskLevel: 'low' | 'medium' | 'high';
  signals: DealSignal[];
}

export interface DealSignal {
  type: 'positive' | 'negative' | 'neutral';
  signal: string;
  weight: number;
  timestamp: string;
}

export interface DealRiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedDeals: number;
  potentialLoss: number;
  mitigation?: string;
}

export interface DealRecommendation {
  dealId: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedImpact: string;
  reasoning: string;
}

// ============================================
// Lead Forecast Types
// ============================================

export interface LeadForecast extends Forecast {
  type: 'leads';
  bySource: LeadsBySource[];
  qualityDistribution: LeadQualityDistribution;
  conversionFunnel: LeadConversionFunnel;
}

export interface LeadsBySource {
  source: string;
  currentCount: number;
  predictedCount: number;
  conversionRate: number;
  costPerLead?: number;
  roi?: number;
}

export interface LeadQualityDistribution {
  hot: { current: number; predicted: number };
  warm: { current: number; predicted: number };
  cold: { current: number; predicted: number };
}

export interface LeadConversionFunnel {
  stages: FunnelStage[];
  overallConversionRate: number;
  predictedConversionRate: number;
  avgTimeToConvert: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

// ============================================
// Churn Prediction Types
// ============================================

export interface ChurnPrediction {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;

  // Prediction
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  predictedChurnDate?: string;

  // Factors
  riskFactors: ChurnRiskFactor[];
  healthScore: number;
  engagementScore: number;
  satisfactionScore?: number;

  // History
  contractValue: number;
  lifetimeValue: number;
  tenure: number; // months
  lastInteraction: string;
  supportTickets: number;

  // Recommendations
  retentionActions: RetentionAction[];

  // Metadata
  calculatedAt: string;
  confidence: number;
}

export interface ChurnRiskFactor {
  factor: string;
  impact: number; // 0-1
  description: string;
  trend: 'improving' | 'declining' | 'stable';
  dataPoints?: Array<{ date: string; value: number }>;
}

export interface RetentionAction {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedImpact: number; // Reduction in churn probability
  cost?: number;
  owner?: string;
  dueDate?: string;
}

// ============================================
// Predictive Alert Types
// ============================================

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'urgent';
export type AlertCategory =
  | 'revenue'
  | 'pipeline'
  | 'churn'
  | 'opportunity'
  | 'lead'
  | 'performance'
  | 'anomaly';

export interface PredictiveAlert {
  id: string;
  tenantId: string;
  category: AlertCategory;
  severity: AlertSeverity;

  // Content
  title: string;
  message: string;
  details?: string;

  // Prediction
  prediction: string;
  probability: number;
  confidence: number;
  timeframe?: string;

  // Impact
  potentialImpact: string;
  affectedEntities: AlertEntity[];
  estimatedValue?: number;

  // Actions
  suggestedActions: AlertAction[];

  // Status
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;

  // Metadata
  createdAt: string;
  expiresAt?: string;
  source: string;
}

export interface AlertEntity {
  type: 'deal' | 'lead' | 'customer' | 'user' | 'pipeline';
  id: string;
  name: string;
  value?: number;
}

export interface AlertAction {
  action: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedImpact?: string;
  automatable: boolean;
}

// ============================================
// Trend Analysis Types
// ============================================

export interface TrendAnalysis {
  id: string;
  tenantId: string;
  metric: string;
  period: ForecastPeriod;

  // Current state
  currentValue: number;
  previousValue: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';

  // Historical
  dataPoints: TrendDataPoint[];
  movingAverage: number[];
  seasonality?: SeasonalityPattern;

  // Analysis
  anomalies: TrendAnomaly[];
  correlations: TrendCorrelation[];
  insights: string[];

  // Forecast
  predictedTrend: 'up' | 'down' | 'stable';
  predictedChange: number;
  confidence: number;

  createdAt: string;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  isAnomaly: boolean;
  annotation?: string;
}

export interface SeasonalityPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  pattern: number[];
  strength: number;
  description: string;
}

export interface TrendAnomaly {
  date: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  possibleCauses: string[];
}

export interface TrendCorrelation {
  metric: string;
  correlation: number; // -1 to 1
  lag: number; // days
  description: string;
}

// ============================================
// AI Analytics Dashboard Types
// ============================================

export interface AnalyticsDashboard {
  id: string;
  tenantId: string;
  userId: string;
  name: string;

  // Widgets
  widgets: DashboardWidget[];
  layout: DashboardLayout;

  // Filters
  dateRange: { start: string; end: string };
  filters: Record<string, unknown>;

  // Refresh
  autoRefresh: boolean;
  refreshInterval: number; // minutes
  lastRefreshedAt: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

export type WidgetType =
  | 'forecast_chart'
  | 'kpi_card'
  | 'trend_chart'
  | 'pipeline_funnel'
  | 'churn_risk_list'
  | 'alert_feed'
  | 'deal_probability'
  | 'revenue_breakdown'
  | 'prediction_accuracy'
  | 'ai_insights';

export interface WidgetConfig {
  forecastType?: ForecastType;
  metric?: string;
  period?: ForecastPeriod;
  showConfidenceInterval?: boolean;
  showPredictions?: boolean;
  maxItems?: number;
  filters?: Record<string, unknown>;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  margin: [number, number];
}

// ============================================
// Scoring & Ranking Types
// ============================================

export interface PredictiveScore {
  entityType: 'lead' | 'deal' | 'customer';
  entityId: string;

  // Overall score
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  percentile: number;

  // Component scores
  components: ScoreComponent[];

  // Trends
  previousScore: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;

  // Predictions
  predictedOutcome: string;
  probability: number;
  timeframe: string;

  // Recommendations
  improvementActions: ImprovementAction[];

  calculatedAt: string;
  confidence: number;
}

export interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
}

export interface ImprovementAction {
  action: string;
  expectedImpact: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number;
}

// ============================================
// Configuration Types
// ============================================

export interface ForecastConfig {
  tenantId: string;

  // Model settings
  defaultModel: ForecastModel;
  forecastHorizon: number;
  confidenceInterval: number; // 0.9 = 90%

  // Training settings
  minHistoricalData: number; // days
  retrainInterval: number; // hours

  // Alert thresholds
  accuracyThreshold: number;
  anomalyThreshold: number;

  // Features
  includeSeasonality: boolean;
  includeExternalFactors: boolean;

  updatedAt: string;
}

export interface AlertConfig {
  tenantId: string;

  // Thresholds by category
  thresholds: Record<AlertCategory, AlertThreshold>;

  // Notifications
  emailNotifications: boolean;
  slackNotifications: boolean;
  inAppNotifications: boolean;

  // Digest
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';

  updatedAt: string;
}

export interface AlertThreshold {
  enabled: boolean;
  minSeverity: AlertSeverity;
  minProbability: number;
  cooldownMinutes: number;
}

// ============================================
// API Response Types
// ============================================

export interface ForecastResponse {
  success: boolean;
  forecast?: Forecast;
  error?: string;
  metadata?: {
    processingTimeMs: number;
    modelUsed: ForecastModel;
    dataPointsUsed: number;
  };
}

export interface AlertsResponse {
  success: boolean;
  alerts: PredictiveAlert[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface TrendResponse {
  success: boolean;
  trend?: TrendAnalysis;
  error?: string;
}

// ============================================
// Export Labels & Constants
// ============================================

export const FORECAST_TYPE_LABELS: Record<ForecastType, string> = {
  revenue: 'Ingresos',
  pipeline: 'Pipeline',
  deals: 'Negocios',
  leads: 'Leads',
  conversions: 'Conversiones',
  churn: 'Churn',
  growth: 'Crecimiento',
};

export const FORECAST_PERIOD_LABELS: Record<ForecastPeriod, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Advertencia',
  critical: 'Crítico',
  urgent: 'Urgente',
};

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  revenue: 'Ingresos',
  pipeline: 'Pipeline',
  churn: 'Riesgo de Churn',
  opportunity: 'Oportunidad',
  lead: 'Lead',
  performance: 'Rendimiento',
  anomaly: 'Anomalía',
};

export const CONFIDENCE_LEVEL_LABELS: Record<ConfidenceLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  very_high: 'Muy Alta',
};
