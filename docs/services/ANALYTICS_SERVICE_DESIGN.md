# Analytics Service - Diseño de Solución Detallado
**Version**: 1.0.0 | **Fecha**: Enero 2025 | **Status**: Design Complete ✅

---

## 🎯 Visión General

### Bounded Context
**Business Intelligence & Reporting** - Agregación de métricas, dashboards, reportes y análisis de negocio.

### Responsabilidades Core
```yaml
Primary:
  - Real-time metrics aggregation
  - Dashboard data provisioning
  - KPI calculation (Sales, Customer Success, Revenue)
  - Report generation (PDF, Excel, CSV)
  - Funnel analytics (Lead → Customer conversion)
  - Revenue analytics (ARR, MRR, churn rate)
  - Sales performance tracking
  - Customer health trends
  - Product usage analytics

Secondary:
  - Data warehouse integration (Snowflake/BigQuery)
  - BI tool integration (Metabase, Looker)
  - Scheduled reports (daily/weekly/monthly)
  - Custom report builder
```

### Dependencies
```yaml
Upstream (consume eventos de):
  - Lead Service: Lead.Created, Lead.Qualified, Lead.Converted
  - Customer Service: Customer.Created, Customer.HealthScoreUpdated, Customer.Churned
  - Proposal Service: Proposal.Created, Proposal.Accepted
  - Financial Service: Invoice.Paid, Payment.Succeeded
  - AI Automation Service: LeadScore.Predicted

Downstream:
  - Notification Service: Report.Generated → Email delivery

Infrastructure:
  - PostgreSQL: OLTP operational data (read replicas)
  - MongoDB: Time-series metrics, raw events
  - Redis: Dashboard cache (5 min TTL)
  - ClickHouse: OLAP columnar database (optional Phase 2)
  - NATS: Event consuming
```

---

## 📊 Métricas Principales

### Sales Metrics

```typescript
/**
 * Sales KPIs
 */
interface SalesMetrics {
  // Leads
  total_leads: number;
  new_leads_this_month: number;
  lead_conversion_rate: number; // % qualified
  avg_lead_score: number;

  // Pipeline
  pipeline_value: number; // Total value of active proposals
  weighted_pipeline: number; // Pipeline * win probability
  avg_deal_size: number;

  // Win Rate
  proposals_created: number;
  proposals_won: number;
  proposals_lost: number;
  win_rate: number; // won / (won + lost)

  // Velocity
  avg_sales_cycle_days: number; // Lead created → Proposal accepted
  avg_time_to_first_contact: number; // Hours

  // Sales Rep Performance
  top_performers: {
    user_id: string;
    user_name: string;
    deals_closed: number;
    revenue: number;
  }[];
}
```

### Customer Success Metrics

```typescript
interface CustomerSuccessMetrics {
  // Customer Base
  total_customers: number;
  active_customers: number;
  onboarding_customers: number;
  at_risk_customers: number;
  churned_this_month: number;

  // Health
  avg_health_score: number;
  health_distribution: {
    healthy: number;
    stable: number;
    at_risk: number;
    critical: number;
  };

  // Retention
  retention_rate: number; // % customers retained
  churn_rate: number; // % customers churned
  logo_churn: number; // # customers lost
  revenue_churn: number; // $ revenue lost

  // Expansion
  upsell_revenue: number;
  cross_sell_revenue: number;
  expansion_rate: number; // % revenue growth from existing customers

  // Renewals
  renewals_due_this_quarter: number;
  renewal_rate: number; // % renewed
}
```

### Revenue Metrics

```typescript
interface RevenueMetrics {
  // Recurring Revenue
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  net_new_mrr: number; // New MRR this month

  // Growth
  mrr_growth_rate: number; // %
  arr_growth_rate: number; // %

  // Breakdown
  new_business_mrr: number;
  expansion_mrr: number; // Upsells
  contraction_mrr: number; // Downgrades
  churned_mrr: number;

  // Revenue by Segment
  revenue_by_segment: {
    smb: number;
    mid_market: number;
    enterprise: number;
  };

  // Revenue by Product
  revenue_by_product: {
    product_name: string;
    arr: number;
  }[];

  // Customer Lifetime Value
  avg_ltv: number;
  ltv_to_cac_ratio: number; // LTV / CAC
}
```

---

## 🏛️ Arquitectura

### Event-Driven Metrics Aggregation

```typescript
/**
 * Metrics Aggregation Service
 * Listens to events and updates metrics in real-time
 */

class MetricsAggregationService {
  constructor(
    private mongodb: MongoDBClient,
    private redis: RedisClient
  ) {}

  // Subscribe to all relevant events
  async subscribeToEvents() {
    await subscribeToEvents('lead.created', this.handleLeadCreated.bind(this));
    await subscribeToEvents('lead.converted', this.handleLeadConverted.bind(this));
    await subscribeToEvents('customer.created', this.handleCustomerCreated.bind(this));
    await subscribeToEvents('invoice.paid', this.handleInvoicePaid.bind(this));
    // ... more subscriptions
  }

  // Lead Created → Increment lead count
  async handleLeadCreated(event: DomainEvent) {
    const { tenantId, data } = event;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await this.mongodb.collection('daily_metrics').updateOne(
      {
        tenant_id: tenantId,
        date,
        metric_type: 'leads',
      },
      {
        $inc: { count: 1 },
        $setOnInsert: { date },
      },
      { upsert: true }
    );

    // Invalidate cache
    await this.redis.del(`dashboard:${tenantId}:sales`);
  }

  // Invoice Paid → Update revenue metrics
  async handleInvoicePaid(event: DomainEvent) {
    const { tenantId, data } = event;
    const { amount, currency } = data;

    const date = new Date().toISOString().split('T')[0];

    await this.mongodb.collection('daily_metrics').updateOne(
      {
        tenant_id: tenantId,
        date,
        metric_type: 'revenue',
      },
      {
        $inc: { total: amount },
        $set: { currency },
        $setOnInsert: { date },
      },
      { upsert: true }
    );

    // Recalculate MRR/ARR
    await this.recalculateMRR(tenantId);

    // Invalidate cache
    await this.redis.del(`dashboard:${tenantId}:revenue`);
  }

  private async recalculateMRR(tenantId: string): Promise<void> {
    // Query subscriptions from Financial Service
    // Calculate MRR = sum of all active monthly subscriptions
    // Store in Redis cache
  }
}
```

### Dashboard Data Service

```typescript
/**
 * Dashboard Data Service
 * Provides aggregated data for dashboards with caching
 */

class DashboardDataService {
  constructor(
    private postgres: PostgreSQLClient,
    private mongodb: MongoDBClient,
    private redis: RedisClient
  ) {}

  async getSalesDashboard(
    tenantId: string,
    dateRange: DateRange
  ): Promise<SalesDashboardData> {
    const cacheKey = `dashboard:${tenantId}:sales:${dateRange.start}:${dateRange.end}`;

    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Aggregate from multiple sources
    const [
      leadsData,
      proposalsData,
      conversionData,
      performanceData,
    ] = await Promise.all([
      this.aggregateLeadsMetrics(tenantId, dateRange),
      this.aggregateProposalsMetrics(tenantId, dateRange),
      this.calculateConversionFunnel(tenantId, dateRange),
      this.getSalesRepPerformance(tenantId, dateRange),
    ]);

    const dashboardData: SalesDashboardData = {
      leads: leadsData,
      proposals: proposalsData,
      conversion_funnel: conversionData,
      top_performers: performanceData,
      last_updated: new Date(),
    };

    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(dashboardData), { ex: 300 });

    return dashboardData;
  }

  private async aggregateLeadsMetrics(
    tenantId: string,
    dateRange: DateRange
  ): Promise<LeadsMetrics> {
    // Query MongoDB time-series data
    const pipeline = [
      {
        $match: {
          tenant_id: tenantId,
          date: {
            $gte: dateRange.start,
            $lte: dateRange.end,
          },
          metric_type: 'leads',
        },
      },
      {
        $group: {
          _id: null,
          total_leads: { $sum: '$count' },
        },
      },
    ];

    const result = await this.mongodb
      .collection('daily_metrics')
      .aggregate(pipeline)
      .toArray();

    return {
      total_leads: result[0]?.total_leads || 0,
      // ... more calculations
    };
  }

  private async calculateConversionFunnel(
    tenantId: string,
    dateRange: DateRange
  ): Promise<ConversionFunnel> {
    // Query PostgreSQL for conversion stages
    const query = `
      SELECT
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
        COUNT(DISTINCT p.id) as proposals_created,
        COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as proposals_won,
        COUNT(DISTINCT c.id) as customers_created
      FROM leads l
      LEFT JOIN proposals p ON p.lead_id = l.id
      LEFT JOIN customers c ON c.converted_from_lead_id = l.id
      WHERE l.tenant_id = $1
        AND l.created_at BETWEEN $2 AND $3
    `;

    const result = await this.postgres.query(query, [
      tenantId,
      dateRange.start,
      dateRange.end,
    ]);

    const row = result.rows[0];

    return {
      stages: [
        { name: 'Leads', count: row.total_leads, conversion_rate: 100 },
        {
          name: 'Qualified',
          count: row.qualified_leads,
          conversion_rate: (row.qualified_leads / row.total_leads) * 100,
        },
        {
          name: 'Proposals',
          count: row.proposals_created,
          conversion_rate: (row.proposals_created / row.qualified_leads) * 100,
        },
        {
          name: 'Won',
          count: row.proposals_won,
          conversion_rate: (row.proposals_won / row.proposals_created) * 100,
        },
        {
          name: 'Customers',
          count: row.customers_created,
          conversion_rate: (row.customers_created / row.proposals_won) * 100,
        },
      ],
    };
  }
}

interface ConversionFunnel {
  stages: {
    name: string;
    count: number;
    conversion_rate: number; // %
  }[];
}

interface SalesDashboardData {
  leads: LeadsMetrics;
  proposals: ProposalsMetrics;
  conversion_funnel: ConversionFunnel;
  top_performers: SalesRepPerformance[];
  last_updated: Date;
}
```

### Report Generation Service

```typescript
/**
 * Report Generation Service
 * Generates PDF/Excel reports
 */

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

class ReportGenerationService {
  async generateSalesReport(
    tenantId: string,
    dateRange: DateRange,
    format: 'pdf' | 'excel' | 'csv'
  ): Promise<Result<{ url: string; filename: string }>> {
    // 1. Gather data
    const data = await this.gatherReportData(tenantId, dateRange);

    // 2. Generate report
    let buffer: Buffer;
    let filename: string;

    if (format === 'pdf') {
      buffer = await this.generatePDFReport(data);
      filename = `sales-report-${dateRange.start}-${dateRange.end}.pdf`;
    } else if (format === 'excel') {
      buffer = await this.generateExcelReport(data);
      filename = `sales-report-${dateRange.start}-${dateRange.end}.xlsx`;
    } else {
      buffer = await this.generateCSVReport(data);
      filename = `sales-report-${dateRange.start}-${dateRange.end}.csv`;
    }

    // 3. Upload to S3
    const key = `reports/${tenantId}/${filename}`;
    await this.s3.upload(key, buffer, 'application/pdf');

    // 4. Generate signed URL (expires in 24h)
    const url = await this.s3.getSignedUrl(key, 86400);

    return Result.ok({ url, filename });
  }

  private async generatePDFReport(data: ReportData): Promise<Buffer> {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));

    // Header
    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();

    // Summary section
    doc.fontSize(14).text('Summary');
    doc.fontSize(10).text(`Total Leads: ${data.total_leads}`);
    doc.text(`Conversion Rate: ${data.conversion_rate.toFixed(2)}%`);
    doc.text(`Win Rate: ${data.win_rate.toFixed(2)}%`);
    doc.moveDown();

    // Funnel chart (text representation)
    doc.fontSize(14).text('Conversion Funnel');
    data.funnel.stages.forEach((stage) => {
      doc.fontSize(10).text(
        `${stage.name}: ${stage.count} (${stage.conversion_rate.toFixed(1)}%)`
      );
    });

    doc.end();

    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async generateExcelReport(data: ReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales Report');

    // Headers
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 },
    ];

    // Data
    sheet.addRow({ metric: 'Total Leads', value: data.total_leads });
    sheet.addRow({ metric: 'Qualified Leads', value: data.qualified_leads });
    sheet.addRow({ metric: 'Conversion Rate', value: `${data.conversion_rate}%` });
    sheet.addRow({ metric: 'Win Rate', value: `${data.win_rate}%` });

    // Funnel sheet
    const funnelSheet = workbook.addWorksheet('Funnel');
    funnelSheet.columns = [
      { header: 'Stage', key: 'stage', width: 20 },
      { header: 'Count', key: 'count', width: 15 },
      { header: 'Conversion Rate', key: 'rate', width: 15 },
    ];

    data.funnel.stages.forEach((stage) => {
      funnelSheet.addRow({
        stage: stage.name,
        count: stage.count,
        rate: `${stage.conversion_rate.toFixed(1)}%`,
      });
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}
```

---

## 🗄️ Base de Datos

### MongoDB Time-Series Collections

```typescript
// Collection: daily_metrics (time-series)
interface DailyMetric {
  _id: ObjectId;
  tenant_id: string;
  date: string; // YYYY-MM-DD
  metric_type: string; // leads, customers, revenue, proposals

  // Metric data
  count?: number;
  total?: number;
  avg?: number;

  // Breakdown
  breakdown?: Record<string, number>;

  // Metadata
  created_at: Date;
}

db.daily_metrics.createIndexes([
  { key: { tenant_id: 1, date: -1, metric_type: 1 } },
  { key: { date: -1 } },
]);

// Collection: hourly_metrics (real-time)
interface HourlyMetric {
  _id: ObjectId;
  tenant_id: string;
  timestamp: Date; // Hour precision
  metric_type: string;

  count: number;

  expires_at: Date; // TTL 30 days
}

db.hourly_metrics.createIndexes([
  { key: { tenant_id: 1, timestamp: -1, metric_type: 1 } },
  { key: { expires_at: 1 }, expireAfterSeconds: 0 },
]);

// Collection: event_stream (raw events for replay)
interface EventStream {
  _id: ObjectId;
  tenant_id: string;
  event_type: string;
  event_data: any;
  timestamp: Date;

  expires_at: Date; // TTL 90 days
}

db.event_stream.createIndexes([
  { key: { tenant_id: 1, timestamp: -1 } },
  { key: { event_type: 1, timestamp: -1 } },
  { key: { expires_at: 1 }, expireAfterSeconds: 0 },
]);
```

### PostgreSQL Materialized Views

```sql
-- Materialized view for faster dashboard queries
CREATE MATERIALIZED VIEW mv_sales_summary AS
SELECT
  l.tenant_id,
  DATE_TRUNC('day', l.created_at) as date,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
  COUNT(DISTINCT p.id) as proposals_created,
  COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN p.id END) as proposals_won,
  SUM(CASE WHEN p.status = 'accepted' THEN p.total ELSE 0 END) as revenue
FROM leads l
LEFT JOIN proposals p ON p.lead_id = l.id
GROUP BY l.tenant_id, DATE_TRUNC('day', l.created_at);

CREATE INDEX idx_mv_sales_summary ON mv_sales_summary(tenant_id, date DESC);

-- Refresh materialized view (scheduled job)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_summary;
```

---

## 🔌 API Design

```typescript
/**
 * Analytics Service - API v1
 */

// GET /api/v1/analytics/dashboards/sales
interface GetSalesDashboardRequest {
  start_date: string;
  end_date: string;
}

interface GetSalesDashboardResponse {
  summary: SalesMetrics;
  funnel: ConversionFunnel;
  trends: {
    date: string;
    leads: number;
    proposals: number;
    revenue: number;
  }[];
  top_performers: {
    user_id: string;
    user_name: string;
    deals_closed: number;
    revenue: number;
  }[];
}

// GET /api/v1/analytics/dashboards/customer-success
interface GetCustomerSuccessDashboardResponse {
  summary: CustomerSuccessMetrics;
  health_distribution: {
    healthy: number;
    stable: number;
    at_risk: number;
    critical: number;
  };
  churn_trend: {
    month: string;
    churned: number;
    retained: number;
    churn_rate: number;
  }[];
}

// GET /api/v1/analytics/dashboards/revenue
interface GetRevenueDashboardResponse {
  summary: RevenueMetrics;
  mrr_trend: {
    month: string;
    mrr: number;
    new_business: number;
    expansion: number;
    contraction: number;
    churned: number;
  }[];
  revenue_by_segment: {
    segment: string;
    arr: number;
    percentage: number;
  }[];
}

// POST /api/v1/analytics/reports/generate
interface GenerateReportRequest {
  report_type: 'sales' | 'customer_success' | 'revenue' | 'executive';
  format: 'pdf' | 'excel' | 'csv';
  start_date: string;
  end_date: string;
  email_to?: string[]; // Optional: email report when ready
}

interface GenerateReportResponse {
  report_id: string;
  status: 'processing' | 'ready';
  download_url?: string; // Available when ready
  expires_at?: string;
}

// GET /api/v1/analytics/reports/:id
// Get report status and download URL

// GET /api/v1/analytics/metrics/real-time
// Get real-time metrics (hourly data)

// GET /api/v1/analytics/cohorts
// Cohort analysis (customer retention by signup month)
```

---

## 📈 Dashboards Principales

### 1. Sales Dashboard
- **Lead Metrics**: New leads, qualified leads, conversion rate
- **Pipeline**: Total pipeline value, weighted pipeline
- **Proposals**: Win rate, avg deal size
- **Funnel**: Visual conversion funnel (Lead → Customer)
- **Performance**: Top performers (leaderboard)
- **Trends**: 30-day trend chart

### 2. Customer Success Dashboard
- **Customer Base**: Total, active, at-risk, churned
- **Health Distribution**: Pie chart (Healthy/Stable/At Risk/Critical)
- **Retention**: Retention rate, churn rate trends
- **Renewals**: Upcoming renewals, renewal rate
- **Expansion**: Upsell/cross-sell revenue

### 3. Revenue Dashboard
- **MRR/ARR**: Current + growth rate
- **Revenue Breakdown**: By segment, by product
- **Churn**: Revenue churn, logo churn
- **LTV/CAC**: Customer economics
- **Cash Flow**: Revenue forecast

### 4. Executive Dashboard
- **Company KPIs**: ARR, customers, win rate, churn rate
- **Goals Progress**: Quarterly goals tracking
- **Highlights**: Key achievements, risks
- **Trends**: 90-day historical trends

---

## ⚡ Optimización de Performance

```typescript
/**
 * Performance optimization strategies
 */

// 1. Caching Strategy
const CACHE_TTLS = {
  dashboard: 300,       // 5 minutes
  metrics: 60,          // 1 minute (real-time)
  reports: 3600,        // 1 hour
  historical: 86400,    // 24 hours (static data)
};

// 2. Query Optimization
// Use materialized views for expensive aggregations
// Use read replicas for analytics queries
// Partition large tables by date

// 3. Async Processing
// Generate complex reports asynchronously
// Send notification when ready

// 4. Data Aggregation
// Pre-aggregate metrics daily (cron job)
// Store in MongoDB for fast retrieval
```

---

## 🎯 Summary

**Analytics Service** - Diseño completo:

### ✅ Componentes:
- **Real-time Metrics Aggregation** (event-driven)
- **Dashboard Data Service** (cached, fast)
- **Report Generation** (PDF, Excel, CSV)
- **Conversion Funnel Analytics**
- **Revenue Analytics** (MRR, ARR, churn)
- **Sales Performance Tracking**

### 📊 Métricas:
- **Dashboards**: 4 (Sales, Customer Success, Revenue, Executive)
- **KPIs Tracked**: 50+
- **Report Formats**: 3 (PDF, Excel, CSV)
- **Cache Strategy**: Multi-layer (Redis + Materialized Views)
- **Data Retention**: 90 days (events), 2 years (aggregated)

---

**Status**: ✅ DESIGN COMPLETE
**Next**: Notification Service (último servicio)
