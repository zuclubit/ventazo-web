/**
 * Sales Forecasting Types
 * Comprehensive types for sales forecasting, pipeline analysis, and revenue projections
 */

// ==================== Forecast Types ====================

export type ForecastPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type ForecastCategory = 'commit' | 'best_case' | 'pipeline' | 'omitted' | 'closed_won' | 'closed_lost';

export type ForecastStatus = 'draft' | 'submitted' | 'approved' | 'locked';

export type ForecastMethod = 'weighted_pipeline' | 'historical_average' | 'ai_predicted' | 'manual';

// ==================== Forecast ====================

export interface Forecast {
  id: string;
  tenantId: string;
  userId: string;
  name: string;

  // Period
  period: ForecastPeriod;
  periodStart: Date;
  periodEnd: Date;

  // Totals
  totalPipeline: number;
  weightedPipeline: number;
  committed: number;
  bestCase: number;
  closedWon: number;
  closedLost: number;

  // Targets
  quota: number;
  quotaAttainment: number;

  // Status
  status: ForecastStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;

  // Metadata
  notes?: string;
  adjustments: ForecastAdjustment[];
  currency: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ForecastAdjustment {
  id: string;
  forecastId: string;
  category: ForecastCategory;
  amount: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
}

// ==================== Forecast Line Items ====================

export interface ForecastLineItem {
  id: string;
  forecastId: string;
  opportunityId: string;
  opportunityName: string;

  // Amounts
  amount: number;
  weightedAmount: number;
  probability: number;

  // Stage info
  stage: string;
  stageWeight: number;

  // Category
  category: ForecastCategory;
  overrideCategory?: ForecastCategory;
  overrideAmount?: number;
  overrideReason?: string;

  // Expected close
  expectedCloseDate: Date;
  originalCloseDate?: Date;

  // Owner
  ownerUserId: string;
  ownerName?: string;

  // Activity signals
  lastActivityDate?: Date;
  daysSinceActivity?: number;
  riskLevel: 'low' | 'medium' | 'high';

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Pipeline Analysis ====================

export interface PipelineSnapshot {
  id: string;
  tenantId: string;
  snapshotDate: Date;

  // Pipeline metrics
  totalValue: number;
  totalDeals: number;
  weightedValue: number;
  avgDealSize: number;

  // By stage
  byStage: StageMetrics[];

  // By category
  byCategory: CategoryMetrics[];

  // Movement
  addedValue: number;
  addedDeals: number;
  removedValue: number;
  removedDeals: number;
  movedUpValue: number;
  movedDownValue: number;

  createdAt: Date;
}

export interface StageMetrics {
  stageName: string;
  stageOrder: number;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
  probability: number;
  avgAge: number;
}

export interface CategoryMetrics {
  category: ForecastCategory;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
}

// ==================== Stage Probabilities ====================

export interface StageProbability {
  id: string;
  tenantId: string;
  pipelineId: string;
  stageName: string;
  stageOrder: number;

  // Probability
  defaultProbability: number;
  historicalWinRate?: number;
  adjustedProbability?: number;

  // Historical data
  totalDeals: number;
  wonDeals: number;
  lostDeals: number;
  avgDaysInStage: number;

  // Last calculated
  calculatedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ==================== Trend Analysis ====================

export interface ForecastTrend {
  period: string;
  periodStart: Date;
  periodEnd: Date;

  // Actuals
  actualRevenue: number;
  dealsClosed: number;
  avgDealSize: number;

  // Forecast vs Actual
  forecastedRevenue: number;
  forecastAccuracy: number;
  variance: number;
  variancePercent: number;

  // Pipeline metrics
  pipelineValue: number;
  conversionRate: number;
}

export interface WinLossAnalysis {
  period: {
    start: Date;
    end: Date;
  };

  // Win/Loss totals
  totalWon: number;
  totalLost: number;
  wonValue: number;
  lostValue: number;
  winRate: number;

  // By stage at loss
  lostByStage: {
    stageName: string;
    count: number;
    value: number;
    avgDaysInPipeline: number;
  }[];

  // By reason
  lostByReason: {
    reason: string;
    count: number;
    value: number;
  }[];

  // Win patterns
  avgCycleTime: number;
  avgDealSize: number;
  avgStagesBeforeClose: number;
}

// ==================== Revenue Projections ====================

export interface RevenueProjection {
  tenantId: string;
  projectionDate: Date;

  // Time horizons
  currentMonth: PeriodProjection;
  currentQuarter: PeriodProjection;
  currentYear: PeriodProjection;
  nextQuarter?: PeriodProjection;

  // Breakdown by source
  bySource: SourceProjection[];

  // Confidence levels
  confidenceLevel: 'low' | 'medium' | 'high';
  assumptions: string[];
}

export interface PeriodProjection {
  periodStart: Date;
  periodEnd: Date;

  // Revenue
  committed: number;
  bestCase: number;
  pipeline: number;
  predicted: number;

  // Target
  target: number;
  gapToTarget: number;
  attainmentPercent: number;

  // Probability ranges
  lowEstimate: number;
  midEstimate: number;
  highEstimate: number;
}

export interface SourceProjection {
  source: string;
  projected: number;
  deals: number;
  avgDealSize: number;
  winRate: number;
}

// ==================== Opportunity Insights ====================

export interface OpportunityInsight {
  opportunityId: string;
  opportunityName: string;
  amount: number;
  stage: string;
  expectedCloseDate: Date;
  ownerName: string;

  // Risk assessment
  riskScore: number;
  riskFactors: RiskFactor[];

  // Health indicators
  healthScore: number;
  healthIndicators: HealthIndicator[];

  // Recommendations
  recommendations: string[];

  // Probability
  predictedProbability: number;
  stageProbability: number;
  probabilityDelta: number;
}

export interface RiskFactor {
  type: 'no_activity' | 'stalled' | 'pushed_date' | 'champion_left' | 'competitor' | 'budget' | 'timeline';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedAction?: string;
}

export interface HealthIndicator {
  metric: string;
  status: 'good' | 'warning' | 'critical';
  value: number;
  benchmark: number;
}

// ==================== Deal Velocity ====================

export interface DealVelocity {
  period: {
    start: Date;
    end: Date;
  };

  // Overall metrics
  avgCycleTime: number;
  avgDealSize: number;
  avgDealsPerRep: number;
  velocity: number; // (deals * avg deal size) / cycle time

  // By stage
  stageVelocity: {
    stageName: string;
    avgDays: number;
    conversionRate: number;
    bottleneck: boolean;
  }[];

  // By rep
  repVelocity: {
    userId: string;
    userName: string;
    avgCycleTime: number;
    avgDealSize: number;
    closedDeals: number;
    velocity: number;
  }[];

  // Trends
  velocityTrend: 'improving' | 'declining' | 'stable';
  cycleTimeTrend: 'improving' | 'declining' | 'stable';
}

// ==================== Forecast Rollup ====================

export interface ForecastRollup {
  level: 'company' | 'team' | 'territory' | 'user';
  entityId: string;
  entityName: string;

  period: ForecastPeriod;
  periodStart: Date;
  periodEnd: Date;

  // Totals
  quota: number;
  committed: number;
  bestCase: number;
  pipeline: number;
  closedWon: number;
  attainment: number;

  // Children (for hierarchical rollup)
  children?: ForecastRollup[];
}

// ==================== AI/ML Predictions ====================

export interface AIPrediction {
  opportunityId: string;
  predictionDate: Date;

  // Win probability
  winProbability: number;
  confidenceScore: number;

  // Predicted close
  predictedCloseDate: Date;
  daysToClose: number;

  // Amount prediction
  predictedAmount?: number;
  amountRange?: {
    low: number;
    high: number;
  };

  // Factors
  positiveFactors: PredictionFactor[];
  negativeFactors: PredictionFactor[];

  // Model info
  modelVersion: string;
  modelAccuracy: number;
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -1 to 1
  description: string;
}

// ==================== DTOs ====================

export interface CreateForecastInput {
  name?: string;
  period: ForecastPeriod;
  periodStart: Date;
  periodEnd: Date;
  quota?: number;
  notes?: string;
}

export interface UpdateForecastInput {
  name?: string;
  quota?: number;
  notes?: string;
  status?: ForecastStatus;
}

export interface OverrideForecastItemInput {
  category?: ForecastCategory;
  amount?: number;
  reason: string;
}

export interface AdjustForecastInput {
  category: ForecastCategory;
  amount: number;
  reason: string;
}

export interface SetStageProbabilityInput {
  pipelineId: string;
  stageName: string;
  probability: number;
}

export interface GetForecastsInput {
  period?: ForecastPeriod;
  status?: ForecastStatus;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface GetPipelineAnalysisInput {
  pipelineId?: string;
  userId?: string;
  teamId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'day' | 'week' | 'month';
}

export interface GetProjectionInput {
  targetDate?: Date;
  includeAI?: boolean;
  teamId?: string;
  territoryId?: string;
}

export interface GetVelocityInput {
  startDate: Date;
  endDate: Date;
  userId?: string;
  teamId?: string;
  pipelineId?: string;
}

export interface GetWinLossInput {
  startDate: Date;
  endDate: Date;
  userId?: string;
  teamId?: string;
  pipelineId?: string;
}

export interface GetRollupInput {
  level: 'company' | 'team' | 'territory' | 'user';
  period: ForecastPeriod;
  periodStart: Date;
  periodEnd: Date;
  parentId?: string;
}
