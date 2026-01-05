/**
 * Advanced Reporting Engine Types
 * Comprehensive reporting with custom reports, scheduling, and exports
 */

/**
 * Report status
 */
export type ReportStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Report type
 */
export type ReportType =
  | 'leads'
  | 'sales'
  | 'pipeline'
  | 'activities'
  | 'campaigns'
  | 'revenue'
  | 'team_performance'
  | 'customer_success'
  | 'custom';

/**
 * Chart types
 */
export type ChartType =
  | 'line'
  | 'bar'
  | 'horizontal_bar'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'funnel'
  | 'table'
  | 'number'
  | 'gauge'
  | 'heatmap';

/**
 * Aggregation functions
 */
export type AggregationFunction =
  | 'count'
  | 'count_distinct'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'first'
  | 'last'
  | 'median'
  | 'percentile';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Date granularity
 */
export type DateGranularity =
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

/**
 * Export format
 */
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

/**
 * Schedule frequency
 */
export type ScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly';

/**
 * Filter operator
 */
export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null';

/**
 * Data source for reports
 */
export interface ReportDataSource {
  table: string;
  alias?: string;
  joins?: Array<{
    table: string;
    alias?: string;
    type: 'inner' | 'left' | 'right';
    on: string;
  }>;
}

/**
 * Report column/field definition
 */
export interface ReportColumn {
  id: string;
  name: string;
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  aggregation?: AggregationFunction;
  format?: string; // e.g., "currency:USD", "date:YYYY-MM-DD", "percent"
  width?: number;
  visible?: boolean;
  sortable?: boolean;
  groupable?: boolean;
}

/**
 * Report filter
 */
export interface ReportFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: unknown;
  secondValue?: unknown; // For 'between' operator
  label?: string;
  required?: boolean;
}

/**
 * Report grouping
 */
export interface ReportGrouping {
  field: string;
  granularity?: DateGranularity; // For date fields
  sortOrder?: SortOrder;
  limit?: number;
}

/**
 * Report sorting
 */
export interface ReportSorting {
  field: string;
  order: SortOrder;
}

/**
 * Calculated field
 */
export interface CalculatedField {
  id: string;
  name: string;
  expression: string; // e.g., "revenue - cost", "won_count / total_count * 100"
  type: 'number' | 'currency' | 'percent';
  format?: string;
}

/**
 * Report visualization settings
 */
export interface VisualizationSettings {
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string[];
  colorField?: string;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
  animate?: boolean;
  height?: number;
}

/**
 * Report widget (dashboard component)
 */
export interface ReportWidget {
  id: string;
  title: string;
  description?: string;
  reportId?: string; // Link to saved report
  query: ReportQuery;
  visualization: VisualizationSettings;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refreshInterval?: number; // minutes
  drillDown?: {
    reportId: string;
    filters: Record<string, string>; // field -> {{clicked_value}}
  };
}

/**
 * Report query definition
 */
export interface ReportQuery {
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters?: ReportFilter[];
  groupBy?: ReportGrouping[];
  orderBy?: ReportSorting[];
  calculatedFields?: CalculatedField[];
  limit?: number;
  offset?: number;
}

/**
 * Schedule configuration
 */
export interface ReportSchedule {
  id: string;
  reportId: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
  enabled: boolean;
  recipients: Array<{
    email: string;
    name?: string;
  }>;
  format: ExportFormat;
  filters?: ReportFilter[]; // Dynamic filters for scheduled run
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * Report definition
 */
export interface Report {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ReportType;
  status: ReportStatus;
  query: ReportQuery;
  visualization?: VisualizationSettings;
  schedules?: ReportSchedule[];
  tags?: string[];
  isPublic?: boolean;
  sharedWith?: string[]; // User IDs
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  runCount: number;
}

/**
 * Dashboard definition
 */
export interface Dashboard {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  widgets: ReportWidget[];
  layout?: 'grid' | 'free';
  gridColumns?: number;
  refreshInterval?: number; // minutes
  filters?: ReportFilter[]; // Global filters
  tags?: string[];
  isDefault?: boolean;
  isPublic?: boolean;
  sharedWith?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Report execution result
 */
export interface ReportResult {
  reportId: string;
  columns: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  rows: Array<Record<string, unknown>>;
  totals?: Record<string, unknown>;
  metadata: {
    rowCount: number;
    executionTime: number;
    generatedAt: Date;
    filters?: ReportFilter[];
  };
}

/**
 * Report export result
 */
export interface ReportExport {
  id: string;
  reportId: string;
  format: ExportFormat;
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Create report request
 */
export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  query: ReportQuery;
  visualization?: VisualizationSettings;
  tags?: string[];
  isPublic?: boolean;
  sharedWith?: string[];
}

/**
 * Update report request
 */
export interface UpdateReportRequest {
  name?: string;
  description?: string;
  status?: ReportStatus;
  query?: ReportQuery;
  visualization?: VisualizationSettings;
  tags?: string[];
  isPublic?: boolean;
  sharedWith?: string[];
}

/**
 * Create dashboard request
 */
export interface CreateDashboardRequest {
  name: string;
  description?: string;
  widgets?: ReportWidget[];
  layout?: 'grid' | 'free';
  gridColumns?: number;
  refreshInterval?: number;
  filters?: ReportFilter[];
  tags?: string[];
  isPublic?: boolean;
  sharedWith?: string[];
}

/**
 * Report query options
 */
export interface ReportQueryOptions {
  status?: ReportStatus;
  type?: ReportType;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'runCount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Predefined report metrics
 */
export interface ReportMetric {
  id: string;
  name: string;
  description: string;
  category: string;
  field: string;
  aggregation: AggregationFunction;
  format?: string;
}

/**
 * Report template
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: ReportType;
  query: ReportQuery;
  visualization?: VisualizationSettings;
  icon?: string;
}

/**
 * Default available metrics
 */
export const DEFAULT_METRICS: ReportMetric[] = [
  // Lead metrics
  { id: 'total_leads', name: 'Total Leads', description: 'Total number of leads', category: 'Leads', field: 'leads.id', aggregation: 'count' },
  { id: 'new_leads', name: 'New Leads', description: 'Leads created in period', category: 'Leads', field: 'leads.id', aggregation: 'count' },
  { id: 'qualified_leads', name: 'Qualified Leads', description: 'Leads marked as qualified', category: 'Leads', field: 'leads.id', aggregation: 'count' },
  { id: 'avg_lead_score', name: 'Average Lead Score', description: 'Average score across leads', category: 'Leads', field: 'leads.score', aggregation: 'avg' },

  // Sales metrics
  { id: 'total_revenue', name: 'Total Revenue', description: 'Total closed revenue', category: 'Sales', field: 'opportunities.value', aggregation: 'sum', format: 'currency' },
  { id: 'deals_won', name: 'Deals Won', description: 'Number of closed won deals', category: 'Sales', field: 'opportunities.id', aggregation: 'count' },
  { id: 'avg_deal_size', name: 'Average Deal Size', description: 'Average value of closed deals', category: 'Sales', field: 'opportunities.value', aggregation: 'avg', format: 'currency' },
  { id: 'win_rate', name: 'Win Rate', description: 'Percentage of deals won', category: 'Sales', field: 'opportunities.id', aggregation: 'count', format: 'percent' },

  // Pipeline metrics
  { id: 'pipeline_value', name: 'Pipeline Value', description: 'Total value in pipeline', category: 'Pipeline', field: 'opportunities.value', aggregation: 'sum', format: 'currency' },
  { id: 'pipeline_count', name: 'Pipeline Count', description: 'Number of deals in pipeline', category: 'Pipeline', field: 'opportunities.id', aggregation: 'count' },
  { id: 'avg_cycle_time', name: 'Average Sales Cycle', description: 'Average days to close', category: 'Pipeline', field: 'opportunities.days_to_close', aggregation: 'avg' },

  // Activity metrics
  { id: 'total_activities', name: 'Total Activities', description: 'All logged activities', category: 'Activities', field: 'activities.id', aggregation: 'count' },
  { id: 'emails_sent', name: 'Emails Sent', description: 'Number of emails sent', category: 'Activities', field: 'activities.id', aggregation: 'count' },
  { id: 'calls_made', name: 'Calls Made', description: 'Number of calls made', category: 'Activities', field: 'activities.id', aggregation: 'count' },
  { id: 'meetings_held', name: 'Meetings Held', description: 'Number of meetings', category: 'Activities', field: 'activities.id', aggregation: 'count' },
];

/**
 * Default report templates
 */
export const DEFAULT_REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'lead-overview',
    name: 'Lead Overview',
    description: 'Overview of all leads with status breakdown',
    category: 'Leads',
    type: 'leads',
    query: {
      dataSource: { table: 'leads' },
      columns: [
        { id: 'status', name: 'Status', field: 'status', type: 'string', groupable: true },
        { id: 'count', name: 'Count', field: 'id', type: 'number', aggregation: 'count' },
      ],
      groupBy: [{ field: 'status' }],
    },
    visualization: {
      chartType: 'pie',
      xAxis: 'status',
      yAxis: ['count'],
      showLegend: true,
    },
    icon: 'users',
  },
  {
    id: 'sales-pipeline',
    name: 'Sales Pipeline',
    description: 'Pipeline stages with values',
    category: 'Sales',
    type: 'pipeline',
    query: {
      dataSource: { table: 'opportunities' },
      columns: [
        { id: 'stage', name: 'Stage', field: 'stage', type: 'string', groupable: true },
        { id: 'count', name: 'Deals', field: 'id', type: 'number', aggregation: 'count' },
        { id: 'value', name: 'Value', field: 'value', type: 'currency', aggregation: 'sum' },
      ],
      groupBy: [{ field: 'stage' }],
    },
    visualization: {
      chartType: 'funnel',
      xAxis: 'stage',
      yAxis: ['value'],
      showLabels: true,
    },
    icon: 'trending-up',
  },
  {
    id: 'revenue-trend',
    name: 'Revenue Trend',
    description: 'Monthly revenue over time',
    category: 'Revenue',
    type: 'revenue',
    query: {
      dataSource: { table: 'opportunities' },
      columns: [
        { id: 'month', name: 'Month', field: 'closed_at', type: 'date' },
        { id: 'revenue', name: 'Revenue', field: 'value', type: 'currency', aggregation: 'sum' },
      ],
      groupBy: [{ field: 'closed_at', granularity: 'month' }],
      filters: [{ id: 'status', field: 'status', operator: 'equals', value: 'won' }],
      orderBy: [{ field: 'closed_at', order: 'asc' }],
    },
    visualization: {
      chartType: 'area',
      xAxis: 'month',
      yAxis: ['revenue'],
      showGrid: true,
      animate: true,
    },
    icon: 'dollar-sign',
  },
  {
    id: 'team-performance',
    name: 'Team Performance',
    description: 'Sales performance by team member',
    category: 'Team',
    type: 'team_performance',
    query: {
      dataSource: {
        table: 'opportunities',
        joins: [{ table: 'users', type: 'left', on: 'opportunities.owner_id = users.id' }],
      },
      columns: [
        { id: 'rep', name: 'Sales Rep', field: 'users.name', type: 'string', groupable: true },
        { id: 'deals', name: 'Deals', field: 'opportunities.id', type: 'number', aggregation: 'count' },
        { id: 'revenue', name: 'Revenue', field: 'opportunities.value', type: 'currency', aggregation: 'sum' },
        { id: 'avg_deal', name: 'Avg Deal', field: 'opportunities.value', type: 'currency', aggregation: 'avg' },
      ],
      groupBy: [{ field: 'users.name' }],
      orderBy: [{ field: 'revenue', order: 'desc' }],
    },
    visualization: {
      chartType: 'horizontal_bar',
      xAxis: 'rep',
      yAxis: ['revenue'],
      showLabels: true,
    },
    icon: 'users',
  },
  {
    id: 'lead-sources',
    name: 'Lead Sources',
    description: 'Leads by acquisition source',
    category: 'Marketing',
    type: 'leads',
    query: {
      dataSource: { table: 'leads' },
      columns: [
        { id: 'source', name: 'Source', field: 'source', type: 'string', groupable: true },
        { id: 'count', name: 'Leads', field: 'id', type: 'number', aggregation: 'count' },
      ],
      groupBy: [{ field: 'source' }],
      orderBy: [{ field: 'count', order: 'desc' }],
    },
    visualization: {
      chartType: 'donut',
      xAxis: 'source',
      yAxis: ['count'],
      showLegend: true,
    },
    icon: 'target',
  },
  {
    id: 'activity-summary',
    name: 'Activity Summary',
    description: 'Activity breakdown by type',
    category: 'Activities',
    type: 'activities',
    query: {
      dataSource: { table: 'activities' },
      columns: [
        { id: 'type', name: 'Type', field: 'type', type: 'string', groupable: true },
        { id: 'count', name: 'Count', field: 'id', type: 'number', aggregation: 'count' },
      ],
      groupBy: [{ field: 'type' }],
    },
    visualization: {
      chartType: 'bar',
      xAxis: 'type',
      yAxis: ['count'],
      colors: ['#3B82F6'],
    },
    icon: 'activity',
  },
];

/**
 * Date range presets
 */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'all_time'
  | 'custom';

/**
 * Get date range for preset
 */
export function getDateRangeForPreset(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

  switch (preset) {
    case 'today':
      return { start: today, end };

    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return { start: yesterday, end: today };

    case 'last_7_days':
      return { start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), end };

    case 'last_30_days':
      return { start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), end };

    case 'last_90_days':
      return { start: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), end };

    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };

    case 'last_month':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: lastMonth, end: lastMonthEnd };

    case 'this_quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { start: quarterStart, end };

    case 'last_quarter':
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1);
      return { start: lastQuarterStart, end: lastQuarterEnd };

    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end };

    case 'last_year':
      return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31) };

    case 'all_time':
    default:
      return { start: new Date(2000, 0, 1), end };
  }
}
