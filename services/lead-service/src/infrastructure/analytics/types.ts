/**
 * Analytics Types and Interfaces
 * Defines report types, metrics, and analytics data structures
 */

export enum ReportType {
  // Pipeline Reports
  PIPELINE_SUMMARY = 'pipeline_summary',
  PIPELINE_VELOCITY = 'pipeline_velocity',
  PIPELINE_CONVERSION = 'pipeline_conversion',

  // Performance Reports
  SALES_PERFORMANCE = 'sales_performance',
  TEAM_PERFORMANCE = 'team_performance',
  INDIVIDUAL_PERFORMANCE = 'individual_performance',

  // Lead Reports
  LEAD_SOURCE_ANALYSIS = 'lead_source_analysis',
  LEAD_QUALITY = 'lead_quality',
  LEAD_AGING = 'lead_aging',

  // Activity Reports
  ACTIVITY_SUMMARY = 'activity_summary',
  FOLLOW_UP_COMPLIANCE = 'follow_up_compliance',

  // Trend Reports
  TREND_ANALYSIS = 'trend_analysis',
  FORECAST = 'forecast',
}

export enum MetricType {
  // Volume Metrics
  TOTAL_LEADS = 'total_leads',
  NEW_LEADS = 'new_leads',
  CONVERTED_LEADS = 'converted_leads',
  LOST_LEADS = 'lost_leads',

  // Rate Metrics
  CONVERSION_RATE = 'conversion_rate',
  WIN_RATE = 'win_rate',
  LOSS_RATE = 'loss_rate',
  QUALIFICATION_RATE = 'qualification_rate',

  // Time Metrics
  AVERAGE_DEAL_TIME = 'average_deal_time',
  AVERAGE_RESPONSE_TIME = 'average_response_time',
  TIME_IN_STAGE = 'time_in_stage',

  // Value Metrics
  AVERAGE_DEAL_SIZE = 'average_deal_size',
  TOTAL_PIPELINE_VALUE = 'total_pipeline_value',

  // Score Metrics
  AVERAGE_SCORE = 'average_score',
  SCORE_DISTRIBUTION = 'score_distribution',

  // Activity Metrics
  ACTIVITIES_COUNT = 'activities_count',
  FOLLOW_UPS_SCHEDULED = 'follow_ups_scheduled',
  FOLLOW_UPS_COMPLETED = 'follow_ups_completed',
  OVERDUE_FOLLOW_UPS = 'overdue_follow_ups',
}

export enum TimeGranularity {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilter {
  owners?: string[];
  statuses?: string[];
  sources?: string[];
  industries?: string[];
  scoreRange?: { min?: number; max?: number };
  tags?: string[];
}

export interface ReportOptions {
  tenantId: string;
  dateRange: DateRange;
  granularity?: TimeGranularity;
  filters?: ReportFilter;
  compareWith?: DateRange; // For period-over-period comparison
  groupBy?: string[];
  metrics?: MetricType[];
}

// ============ Report Data Structures ============

export interface MetricValue {
  value: number;
  change?: number; // Percentage change from comparison period
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number;
}

export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface DistributionDataPoint {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface FunnelStage {
  stage: string;
  count: number;
  value?: number;
  conversionRate?: number;
  averageTime?: number; // days
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName?: string;
  metric: number;
  target?: number;
  achievement?: number; // percentage
}

// ============ Report Results ============

export interface PipelineSummaryReport {
  type: ReportType.PIPELINE_SUMMARY;
  period: DateRange;
  metrics: {
    totalLeads: MetricValue;
    newLeads: MetricValue;
    qualifiedLeads: MetricValue;
    convertedLeads: MetricValue;
    lostLeads: MetricValue;
    conversionRate: MetricValue;
    averageScore: MetricValue;
  };
  funnel: FunnelStage[];
  bySource: DistributionDataPoint[];
  byIndustry: DistributionDataPoint[];
  trend: TimeSeriesDataPoint[];
  generatedAt: Date;
}

export interface PipelineVelocityReport {
  type: ReportType.PIPELINE_VELOCITY;
  period: DateRange;
  metrics: {
    averageDealTime: MetricValue; // days
    averageTimeInStage: Record<string, MetricValue>;
    fastestDeals: number; // count of deals closed under target
    slowestStage: string;
  };
  velocityByStage: Array<{
    stage: string;
    averageDays: number;
    medianDays: number;
    leadsCount: number;
  }>;
  velocityTrend: TimeSeriesDataPoint[];
  bottlenecks: Array<{
    stage: string;
    leadsStuck: number;
    averageWaitTime: number;
  }>;
  generatedAt: Date;
}

export interface ConversionReport {
  type: ReportType.PIPELINE_CONVERSION;
  period: DateRange;
  metrics: {
    overallConversionRate: MetricValue;
    stageConversionRates: Record<string, MetricValue>;
    qualificationRate: MetricValue;
    winRate: MetricValue;
    lossRate: MetricValue;
  };
  conversionFunnel: FunnelStage[];
  conversionBySource: Array<{
    source: string;
    leads: number;
    converted: number;
    rate: number;
  }>;
  conversionByOwner: Array<{
    ownerId: string;
    ownerName?: string;
    leads: number;
    converted: number;
    rate: number;
  }>;
  lossReasons: DistributionDataPoint[];
  generatedAt: Date;
}

export interface SalesPerformanceReport {
  type: ReportType.SALES_PERFORMANCE;
  period: DateRange;
  metrics: {
    totalDeals: MetricValue;
    closedWon: MetricValue;
    closedLost: MetricValue;
    winRate: MetricValue;
    averageDealSize: MetricValue;
    totalValue: MetricValue;
  };
  performanceTrend: TimeSeriesDataPoint[];
  leaderboard: LeaderboardEntry[];
  targetProgress: {
    current: number;
    target: number;
    percentage: number;
  };
  generatedAt: Date;
}

export interface LeadSourceReport {
  type: ReportType.LEAD_SOURCE_ANALYSIS;
  period: DateRange;
  sourceBreakdown: Array<{
    source: string;
    totalLeads: number;
    newLeads: number;
    converted: number;
    conversionRate: number;
    averageScore: number;
    averageDealTime?: number;
    roi?: number;
  }>;
  topSources: DistributionDataPoint[];
  sourceTrend: Record<string, TimeSeriesDataPoint[]>;
  recommendations: string[];
  generatedAt: Date;
}

export interface LeadQualityReport {
  type: ReportType.LEAD_QUALITY;
  period: DateRange;
  metrics: {
    averageScore: MetricValue;
    hotLeads: MetricValue;
    warmLeads: MetricValue;
    coldLeads: MetricValue;
    qualificationRate: MetricValue;
  };
  scoreDistribution: DistributionDataPoint[];
  qualityBySource: Array<{
    source: string;
    averageScore: number;
    hotPercentage: number;
    warmPercentage: number;
    coldPercentage: number;
  }>;
  scoreTrend: TimeSeriesDataPoint[];
  generatedAt: Date;
}

export interface LeadAgingReport {
  type: ReportType.LEAD_AGING;
  period: DateRange;
  agingBuckets: Array<{
    bucket: string; // e.g., "0-7 days", "8-14 days", etc.
    count: number;
    percentage: number;
    averageScore: number;
  }>;
  staleLeads: Array<{
    leadId: string;
    companyName: string;
    age: number; // days
    lastActivity?: Date;
    status: string;
    owner?: string;
  }>;
  metrics: {
    averageAge: MetricValue;
    staleCount: MetricValue; // leads over 30 days with no activity
    atRiskCount: MetricValue; // leads at risk of going stale
  };
  generatedAt: Date;
}

export interface ActivityReport {
  type: ReportType.ACTIVITY_SUMMARY;
  period: DateRange;
  metrics: {
    totalActivities: MetricValue;
    followUpsScheduled: MetricValue;
    followUpsCompleted: MetricValue;
    overdueFollowUps: MetricValue;
    complianceRate: MetricValue;
  };
  activityByType: DistributionDataPoint[];
  activityByOwner: LeaderboardEntry[];
  activityTrend: TimeSeriesDataPoint[];
  upcomingFollowUps: Array<{
    leadId: string;
    companyName: string;
    dueDate: Date;
    ownerId: string;
    ownerName?: string;
  }>;
  generatedAt: Date;
}

export interface DashboardMetrics {
  totalLeads: MetricValue;
  newLeadsToday: MetricValue;
  convertedThisMonth: MetricValue;
  conversionRate: MetricValue;
  overdueFollowUps: MetricValue;
  averageScore: MetricValue;
  pipelineValue?: MetricValue;
  topPerformer?: {
    userId: string;
    userName?: string;
    metric: number;
  };
}

export interface DashboardData {
  tenantId: string;
  period: DateRange;
  metrics: DashboardMetrics;
  recentLeads: Array<{
    id: string;
    companyName: string;
    status: string;
    score: number;
    createdAt: Date;
  }>;
  upcomingFollowUps: Array<{
    leadId: string;
    companyName: string;
    dueDate: Date;
  }>;
  funnel: FunnelStage[];
  trendData: TimeSeriesDataPoint[];
  alerts: Array<{
    type: 'warning' | 'info' | 'success' | 'error';
    message: string;
    actionUrl?: string;
  }>;
  generatedAt: Date;
}
