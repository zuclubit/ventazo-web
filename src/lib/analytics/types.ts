// ============================================
// FASE 5.8 — Dashboard & Analytics Types
// ============================================

// ============================================
// Date Range & Filter Types
// ============================================

export const DATE_RANGES = ['today', 'yesterday', 'week', 'month', 'quarter', 'year', 'custom'] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta semana',
  month: 'Este mes',
  quarter: 'Este trimestre',
  year: 'Este año',
  custom: 'Personalizado',
};

export interface AnalyticsFilters {
  dateRange: DateRange;
  startDate?: string;
  endDate?: string;
  userId?: string;
  tags?: string[];
  stageId?: string;
  status?: string;
}

export interface DateRangeValue {
  start: Date;
  end: Date;
}

// ============================================
// Overview KPIs
// ============================================

export interface OverviewKPIs {
  // Leads
  totalLeads: number;
  newLeads: number;
  leadsContacted: number;
  leadsQualified: number;
  leadsConverted: number;
  leadConversionRate: number;
  avgLeadConversionTime: number; // days

  // Opportunities
  totalOpportunities: number;
  openOpportunities: number;
  pipelineValue: number;
  weightedPipelineValue: number;
  opportunitiesWon: number;
  opportunitiesLost: number;
  winRate: number;
  avgDealSize: number;

  // Customers
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;

  // Tasks
  totalTasks: number;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  taskCompletionRate: number;

  // Services
  totalServices: number;
  activeServices: number;
  topServiceCategory: string;

  // Workflows
  totalWorkflows: number;
  activeWorkflows: number;
  workflowExecutions: number;
  workflowSuccessRate: number;

  // Comparison with previous period
  leadsChange: number;
  opportunitiesChange: number;
  revenueChange: number;
  customersChange: number;
}

// ============================================
// Lead Analytics
// ============================================

export interface LeadFunnelStage {
  stage: string;
  stageName: string;
  count: number;
  percentage: number;
  conversionRate: number;
  avgTimeInStage: number; // hours
}

export interface LeadSourceMetrics {
  source: string;
  count: number;
  percentage: number;
  conversionRate: number;
}

export interface LeadAnalytics {
  // Summary
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;

  // Rates
  conversionRate: number;
  qualificationRate: number;
  avgConversionTime: number; // days
  avgResponseTime: number; // hours

  // Funnel
  funnel: LeadFunnelStage[];

  // By source
  bySource: LeadSourceMetrics[];

  // Time series
  leadsOverTime: TimeSeriesData[];
  conversionsOverTime: TimeSeriesData[];

  // By score
  scoreDistribution: {
    range: string;
    count: number;
  }[];

  // By owner
  byOwner: {
    userId: string;
    userName: string;
    count: number;
    conversionRate: number;
  }[];
}

// ============================================
// Opportunity Analytics
// ============================================

export interface OpportunityStageMetrics {
  stageId: string;
  stageName: string;
  count: number;
  value: number;
  weightedValue: number;
  avgTimeInStage: number; // days
  conversionRate: number;
}

export interface OpportunityAnalytics {
  // Summary
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  lostOpportunities: number;

  // Values
  totalPipelineValue: number;
  weightedPipelineValue: number;
  totalWonValue: number;
  totalLostValue: number;
  avgDealSize: number;
  avgWonDealSize: number;

  // Rates
  winRate: number;
  avgSalesCycle: number; // days

  // Pipeline stages
  pipeline: OpportunityStageMetrics[];

  // Time series
  dealsOverTime: TimeSeriesData[];
  revenueOverTime: TimeSeriesData[];

  // Loss reasons
  lossReasons: {
    reason: string;
    count: number;
    percentage: number;
    totalValue: number;
  }[];

  // By owner
  byOwner: {
    userId: string;
    userName: string;
    count: number;
    value: number;
    winRate: number;
  }[];

  // Forecast
  forecast: {
    month: string;
    committed: number;
    bestCase: number;
    pipeline: number;
  }[];
}

// ============================================
// Customer Analytics
// ============================================

export interface CustomerAnalytics {
  // Summary
  totalCustomers: number;
  newCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;

  // Growth
  growthRate: number;
  churnRate: number;

  // Time series
  customersOverTime: TimeSeriesData[];
  acquisitionOverTime: TimeSeriesData[];

  // By source
  bySource: {
    source: string;
    count: number;
    percentage: number;
  }[];

  // By type
  byType: {
    type: string;
    count: number;
    percentage: number;
  }[];

  // Activity
  avgActivitiesPerCustomer: number;
  avgOpportunitiesPerCustomer: number;

  // Top customers
  topCustomers: {
    id: string;
    name: string;
    totalValue: number;
    opportunityCount: number;
    lastActivity: string;
  }[];
}

// ============================================
// Task Analytics
// ============================================

export interface TaskAnalytics {
  // Summary
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  inProgressTasks: number;

  // Rates
  completionRate: number;
  onTimeRate: number;
  avgCompletionTime: number; // hours

  // Time series
  tasksOverTime: TimeSeriesData[];
  completionsOverTime: TimeSeriesData[];

  // By priority
  byPriority: {
    priority: string;
    count: number;
    completedCount: number;
    completionRate: number;
  }[];

  // By type
  byType: {
    type: string;
    count: number;
    percentage: number;
  }[];

  // By owner (productivity)
  byOwner: {
    userId: string;
    userName: string;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
    avgCompletionTime: number;
  }[];

  // Weekly productivity
  weeklyProductivity: {
    day: string;
    created: number;
    completed: number;
    overdue: number;
  }[];
}

// ============================================
// Service Analytics
// ============================================

export interface ServiceAnalytics {
  // Summary
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
  archivedServices: number;

  // By type
  byType: {
    type: string;
    count: number;
    percentage: number;
    avgPrice: number;
  }[];

  // By category
  byCategory: {
    categoryId: string;
    categoryName: string;
    count: number;
    percentage: number;
    avgPrice: number;
  }[];

  // Top services
  topServices: {
    id: string;
    name: string;
    type: string;
    price: number;
    usageCount: number;
    revenue: number;
  }[];

  // Price distribution
  priceDistribution: {
    range: string;
    count: number;
  }[];

  // Revenue by category (potential)
  revenueByCategory: {
    category: string;
    potentialRevenue: number;
    percentage: number;
  }[];
}

// ============================================
// Workflow Analytics
// ============================================

export interface WorkflowAnalytics {
  // Summary
  totalWorkflows: number;
  activeWorkflows: number;
  inactiveWorkflows: number;

  // Executions
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  skippedExecutions: number;
  successRate: number;

  // Time series
  executionsOverTime: TimeSeriesData[];

  // By trigger
  byTrigger: {
    trigger: string;
    triggerLabel: string;
    count: number;
    percentage: number;
  }[];

  // By action
  byAction: {
    action: string;
    actionLabel: string;
    count: number;
    percentage: number;
  }[];

  // Top workflows
  topWorkflows: {
    id: string;
    name: string;
    executionCount: number;
    successRate: number;
    lastExecution: string;
  }[];

  // Error analysis
  errorAnalysis: {
    errorType: string;
    count: number;
    percentage: number;
  }[];
}

// ============================================
// Time Series Data
// ============================================

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface MultiSeriesData {
  date: string;
  [key: string]: string | number;
}

// ============================================
// Chart Data Types
// ============================================

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface BarChartData {
  name: string;
  value: number;
  secondary?: number;
  color?: string;
}

export interface FunnelChartData {
  name: string;
  value: number;
  fill: string;
}

// ============================================
// Insight Types
// ============================================

export const INSIGHT_TYPES = ['positive', 'negative', 'neutral', 'warning', 'info'] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number];

export const INSIGHT_CATEGORIES = [
  'leads',
  'opportunities',
  'customers',
  'tasks',
  'services',
  'workflows',
  'general',
] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export interface Insight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  description: string;
  metric?: string;
  change?: number;
  recommendation?: string;
  priority: number;
}

// ============================================
// Dashboard Widget Types
// ============================================

export const WIDGET_TYPES = [
  'kpi',
  'chart-line',
  'chart-bar',
  'chart-pie',
  'chart-funnel',
  'table',
  'list',
  'insight',
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  size: 'small' | 'medium' | 'large' | 'full';
  data: unknown;
  config?: Record<string, unknown>;
}

// ============================================
// KPI Card Types
// ============================================

export interface KPICardData {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: string;
  color?: string;
  format?: 'number' | 'currency' | 'percentage' | 'duration';
  tooltip?: string;
}

// ============================================
// Comparison Types
// ============================================

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================
// Export Types
// ============================================

export interface AnalyticsExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  sections: InsightCategory[];
  dateRange: DateRangeValue;
  includeCharts: boolean;
}

// ============================================
// Advanced Reports - FASE 5.10
// ============================================

export const REPORT_TYPES = [
  'sales_performance',
  'lead_conversion',
  'pipeline_velocity',
  'revenue_forecast',
  'team_productivity',
  'customer_acquisition',
  'activity_summary',
  'custom',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  sales_performance: 'Rendimiento de Ventas',
  lead_conversion: 'Conversión de Leads',
  pipeline_velocity: 'Velocidad de Pipeline',
  revenue_forecast: 'Pronóstico de Ingresos',
  team_productivity: 'Productividad del Equipo',
  customer_acquisition: 'Adquisición de Clientes',
  activity_summary: 'Resumen de Actividad',
  custom: 'Reporte Personalizado',
};

export const REPORT_FREQUENCIES = ['once', 'daily', 'weekly', 'monthly', 'quarterly'] as const;
export type ReportFrequency = (typeof REPORT_FREQUENCIES)[number];

export interface ReportConfig {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  filters: AnalyticsFilters;
  columns: string[];
  groupBy?: string[];
  sortBy?: { field: string; order: 'asc' | 'desc' };
  schedule?: {
    frequency: ReportFrequency;
    recipients: string[];
    nextRunAt?: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  recordCount?: number;
  error?: string;
}

export interface SavedReport {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  config: ReportConfig;
  isFavorite: boolean;
  lastViewedAt?: string;
  viewCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Custom Dashboards - FASE 5.10
// ============================================

export interface DashboardConfig {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isShared: boolean;
  layout: DashboardLayout;
  widgets: DashboardWidgetConfig[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  gap: number;
}

export interface DashboardWidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  dataSource: string;
  filters?: AnalyticsFilters;
  visualization: VisualizationConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  refreshInterval?: number; // minutes
}

export interface VisualizationConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut' | 'table' | 'kpi' | 'funnel';
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  xAxis?: { field: string; label?: string };
  yAxis?: { field: string; label?: string };
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

// ============================================
// Export Results - FASE 5.10
// ============================================

export interface ExportResult {
  success: boolean;
  downloadUrl: string;
  expiresAt: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'pdf';
  recordCount: number;
  fileSize: number;
}

export interface ScheduledExport {
  id: string;
  tenantId: string;
  name: string;
  reportType: ReportType;
  format: 'csv' | 'xlsx' | 'pdf';
  frequency: ReportFrequency;
  recipients: string[];
  filters: AnalyticsFilters;
  isActive: boolean;
  lastExportAt?: string;
  nextExportAt?: string;
  createdBy: string;
  createdAt: string;
}
