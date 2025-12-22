/**
 * Analytics Routes
 * Provides API endpoints for reports and analytics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { AnalyticsService } from '../../infrastructure/analytics';
import { ReportType, TimeGranularity } from '../../infrastructure/analytics/types';

// JSON Schema for Fastify validation
const dateRangeJsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
};

const reportOptionsJsonSchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    granularity: { type: 'string', enum: ['hour', 'day', 'week', 'month', 'quarter', 'year'] },
    compareStartDate: { type: 'string', format: 'date-time' },
    compareEndDate: { type: 'string', format: 'date-time' },
    owners: { type: 'array', items: { type: 'string', format: 'uuid' } },
    statuses: { type: 'array', items: { type: 'string' } },
    sources: { type: 'array', items: { type: 'string' } },
    industries: { type: 'array', items: { type: 'string' } },
    minScore: { type: 'number', minimum: 0, maximum: 100 },
    maxScore: { type: 'number', minimum: 0, maximum: 100 },
  },
};

// JSON Schema for metrics query
const metricsQueryJsonSchema = {
  type: 'object',
  properties: {
    metrics: { type: 'string' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
    groupBy: { type: 'string' },
  },
};

// JSON Schema for export query
const exportQueryJsonSchema = {
  type: 'object',
  properties: {
    reportType: { type: 'string', enum: ['pipeline_summary', 'lead_source_analysis', 'conversion_rates', 'lead_quality', 'activity_report', 'lead_aging'] },
    format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
    startDate: { type: 'string', format: 'date-time' },
    endDate: { type: 'string', format: 'date-time' },
  },
  required: ['reportType'],
};

// Zod schemas for type inference
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const reportOptionsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.nativeEnum(TimeGranularity).optional(),
  compareStartDate: z.string().datetime().optional(),
  compareEndDate: z.string().datetime().optional(),
  owners: z.array(z.string().uuid()).optional(),
  statuses: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
});

type ReportQuery = z.infer<typeof reportOptionsSchema>;

export async function analyticsRoutes(fastify: FastifyInstance) {
  const analyticsService = container.resolve(AnalyticsService);

  // Helper to get date range from query
  const getDateRange = (query: ReportQuery) => {
    const now = new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : now;
    return { startDate, endDate };
  };

  // Helper to get filters from query
  const getFilters = (query: ReportQuery) => ({
    owners: query.owners,
    statuses: query.statuses,
    sources: query.sources,
    industries: query.industries,
    scoreRange:
      query.minScore !== undefined || query.maxScore !== undefined
        ? { min: query.minScore, max: query.maxScore }
        : undefined,
  });

  /**
   * GET /analytics/overview
   * Get overview KPIs for dashboard (alias for frontend compatibility)
   */
  fastify.get(
    '/overview',
    {
      schema: {
        description: 'Get overview KPIs for dashboard',
        tags: ['Analytics'],
        querystring: {
          type: 'object',
          properties: {
            dateRange: { type: 'string', enum: ['today', 'week', 'month', 'quarter', 'year'] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          dateRange?: string;
          startDate?: string;
          endDate?: string;
        }
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Calculate date range based on preset or custom dates
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (request.query.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'month':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (request.query.startDate) {
        startDate = new Date(request.query.startDate);
      }
      if (request.query.endDate) {
        endDate = new Date(request.query.endDate);
      }

      const result = await analyticsService.getDashboard(tenantId, { startDate, endDate });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      const dashboard = result.getValue();
      const metrics = dashboard.metrics;

      // Helper to extract numeric value from MetricValue object or direct number
      const getValue = (metric: unknown): number => {
        if (metric === null || metric === undefined) return 0;
        if (typeof metric === 'number') return metric;
        if (typeof metric === 'object' && 'value' in metric) {
          return typeof (metric as { value: unknown }).value === 'number'
            ? (metric as { value: number }).value
            : 0;
        }
        return 0;
      };

      // Transform to KPI format expected by frontend
      return reply.send({
        totalLeads: getValue(metrics?.totalLeads),
        newLeads: getValue(metrics?.newLeadsToday ?? metrics?.newLeads),
        qualifiedLeads: getValue(metrics?.qualifiedLeads),
        convertedLeads: getValue(metrics?.convertedThisMonth ?? metrics?.convertedLeads),
        conversionRate: getValue(metrics?.conversionRate),
        avgScore: getValue(metrics?.averageScore),
        totalOpportunities: getValue(metrics?.totalOpportunities),
        openOpportunities: getValue(metrics?.openOpportunities),
        wonOpportunities: getValue(metrics?.wonOpportunities),
        totalRevenue: getValue(metrics?.totalRevenue),
        pendingTasks: getValue(metrics?.pendingTasks),
        overdueTasks: getValue(metrics?.overdueFollowUps ?? metrics?.overdueTasks),
        completedTasks: getValue(metrics?.completedTasks),
        activeWorkflows: getValue(metrics?.activeWorkflows),
        // Trends (percentage change vs previous period)
        trends: {
          leads: getValue(metrics?.leadsTrend),
          opportunities: getValue(metrics?.opportunitiesTrend),
          revenue: getValue(metrics?.revenueTrend),
          conversion: getValue(metrics?.conversionTrend),
        },
        // Chart data
        funnel: dashboard.funnel ?? [],
        trendData: dashboard.trendData ?? [],
        recentLeads: dashboard.recentLeads ?? [],
        upcomingFollowUps: dashboard.upcomingFollowUps ?? [],
      });
    }
  );

  /**
   * GET /analytics/leads
   * Get lead-specific analytics
   */
  fastify.get(
    '/leads',
    {
      schema: {
        description: 'Get lead analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = request.query.startDate
        ? {
            startDate: new Date(request.query.startDate),
            endDate: request.query.endDate
              ? new Date(request.query.endDate)
              : new Date(),
          }
        : undefined;

      const result = await analyticsService.getDashboard(tenantId, dateRange);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      const dashboard = result.getValue();

      // Return lead-specific analytics
      return reply.send({
        totalLeads: dashboard.funnel?.find((f) => f.stage === 'new')?.count ?? 0,
        newLeads: dashboard.recentLeads?.length ?? 0,
        contactedLeads: dashboard.funnel?.find((f) => f.stage === 'contacted')?.count ?? 0,
        qualifiedLeads: dashboard.funnel?.find((f) => f.stage === 'qualified')?.count ?? 0,
        convertedLeads: dashboard.funnel?.find((f) => f.stage === 'won')?.count ?? 0,
        conversionRate: dashboard.funnel?.find((f) => f.stage === 'won')?.conversionRate ?? 0,
        qualificationRate: dashboard.funnel?.find((f) => f.stage === 'qualified')?.conversionRate ?? 0,
        avgConversionTime: 0,
        avgResponseTime: 0,
        funnel: dashboard.funnel ?? [],
        bySource: [],
        leadsOverTime: dashboard.trendData ?? [],
        conversionsOverTime: [],
        scoreDistribution: [],
        byOwner: [],
      });
    }
  );

  /**
   * GET /analytics/opportunities
   * Get opportunity-specific analytics
   */
  fastify.get(
    '/opportunities',
    {
      schema: {
        description: 'Get opportunity analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Return default opportunity analytics (stub)
      return reply.send({
        totalOpportunities: 0,
        openOpportunities: 0,
        wonOpportunities: 0,
        lostOpportunities: 0,
        totalPipelineValue: 0,
        weightedPipelineValue: 0,
        totalWonValue: 0,
        totalLostValue: 0,
        avgDealSize: 0,
        avgWonDealSize: 0,
        winRate: 0,
        avgSalesCycle: 0,
        pipeline: [],
        dealsOverTime: [],
        revenueOverTime: [],
        lossReasons: [],
        byOwner: [],
        forecast: [],
      });
    }
  );

  /**
   * GET /analytics/tasks
   * Get task-specific analytics
   */
  fastify.get(
    '/tasks',
    {
      schema: {
        description: 'Get task analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Return default task analytics (stub)
      return reply.send({
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        inProgressTasks: 0,
        completionRate: 0,
        onTimeRate: 0,
        avgCompletionTime: 0,
        tasksOverTime: [],
        completionsOverTime: [],
        byPriority: [],
        byType: [],
        byOwner: [],
        weeklyProductivity: [],
      });
    }
  );

  /**
   * GET /analytics/workflows
   * Get workflow-specific analytics
   */
  fastify.get(
    '/workflows',
    {
      schema: {
        description: 'Get workflow analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Return default workflow analytics (stub)
      return reply.send({
        totalWorkflows: 0,
        activeWorkflows: 0,
        inactiveWorkflows: 0,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        skippedExecutions: 0,
        successRate: 0,
        executionsOverTime: [],
        byTrigger: [],
        byAction: [],
        topWorkflows: [],
        errorAnalysis: [],
      });
    }
  );

  /**
   * GET /analytics/services
   * Get service-specific analytics
   */
  fastify.get(
    '/services',
    {
      schema: {
        description: 'Get service analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Return default service analytics (stub)
      return reply.send({
        totalServices: 0,
        activeServices: 0,
        inactiveServices: 0,
        archivedServices: 0,
        byType: [],
        byCategory: [],
        topServices: [],
        priceDistribution: [],
        revenueByCategory: [],
      });
    }
  );

  /**
   * GET /analytics/customers
   * Get customer-specific analytics
   */
  fastify.get(
    '/customers',
    {
      schema: {
        description: 'Get customer analytics',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      // Return default customer analytics (stub)
      return reply.send({
        totalCustomers: 0,
        newCustomers: 0,
        activeCustomers: 0,
        inactiveCustomers: 0,
        growthRate: 0,
        churnRate: 0,
        customersOverTime: [],
        acquisitionOverTime: [],
        bySource: [],
        byType: [],
        avgActivitiesPerCustomer: 0,
        avgOpportunitiesPerCustomer: 0,
        topCustomers: [],
      });
    }
  );

  /**
   * GET /analytics/dashboard
   * Get dashboard overview data
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        description: 'Get dashboard overview data',
        tags: ['Analytics'],
        querystring: dateRangeJsonSchema,
        response: {
          200: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              metrics: { type: 'object' },
              recentLeads: { type: 'array' },
              upcomingFollowUps: { type: 'array' },
              funnel: { type: 'array' },
              trendData: { type: 'array' },
              alerts: { type: 'array' },
              generatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof dateRangeSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = request.query.startDate
        ? {
            startDate: new Date(request.query.startDate),
            endDate: request.query.endDate
              ? new Date(request.query.endDate)
              : new Date(),
          }
        : undefined;

      const result = await analyticsService.getDashboard(tenantId, dateRange);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/reports/pipeline-summary
   * Get pipeline summary report
   */
  fastify.get(
    '/reports/pipeline-summary',
    {
      schema: {
        description: 'Get pipeline summary report',
        tags: ['Analytics', 'Reports'],
        querystring: reportOptionsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ReportQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = getDateRange(request.query);
      const filters = getFilters(request.query);

      const compareWith =
        request.query.compareStartDate && request.query.compareEndDate
          ? {
              startDate: new Date(request.query.compareStartDate),
              endDate: new Date(request.query.compareEndDate),
            }
          : undefined;

      const result = await analyticsService.getPipelineSummary({
        tenantId,
        dateRange,
        granularity: request.query.granularity,
        filters,
        compareWith,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/reports/lead-sources
   * Get lead source analysis report
   */
  fastify.get(
    '/reports/lead-sources',
    {
      schema: {
        description: 'Get lead source analysis report',
        tags: ['Analytics', 'Reports'],
        querystring: reportOptionsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ReportQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = getDateRange(request.query);
      const filters = getFilters(request.query);

      const result = await analyticsService.getLeadSourceAnalysis({
        tenantId,
        dateRange,
        filters,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/reports/lead-quality
   * Get lead quality report
   */
  fastify.get(
    '/reports/lead-quality',
    {
      schema: {
        description: 'Get lead quality report',
        tags: ['Analytics', 'Reports'],
        querystring: reportOptionsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ReportQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = getDateRange(request.query);

      const result = await analyticsService.getLeadQualityReport({
        tenantId,
        dateRange,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/reports/lead-aging
   * Get lead aging report
   */
  fastify.get(
    '/reports/lead-aging',
    {
      schema: {
        description: 'Get lead aging report',
        tags: ['Analytics', 'Reports'],
        querystring: reportOptionsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ReportQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = getDateRange(request.query);

      const result = await analyticsService.getLeadAgingReport({
        tenantId,
        dateRange,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/reports/activity
   * Get activity report
   */
  fastify.get(
    '/reports/activity',
    {
      schema: {
        description: 'Get activity report',
        tags: ['Analytics', 'Reports'],
        querystring: reportOptionsJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ReportQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = getDateRange(request.query);

      const result = await analyticsService.getActivityReport({
        tenantId,
        dateRange,
      });

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /analytics/metrics
   * Get specific metrics
   */
  fastify.get(
    '/metrics',
    {
      schema: {
        description: 'Get specific metrics',
        tags: ['Analytics'],
        querystring: metricsQueryJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          metrics?: string;
          startDate?: string;
          endDate?: string;
          groupBy?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const dateRange = {
        startDate: request.query.startDate
          ? new Date(request.query.startDate)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: request.query.endDate
          ? new Date(request.query.endDate)
          : new Date(),
      };

      // For now, return dashboard metrics
      const result = await analyticsService.getDashboard(tenantId, dateRange);

      if (result.isFailure) {
        return reply.status(500).send({ error: result.error });
      }

      return reply.send({ metrics: result.getValue().metrics });
    }
  );

  /**
   * GET /analytics/export
   * Export report data
   */
  fastify.get(
    '/export',
    {
      schema: {
        description: 'Export report data',
        tags: ['Analytics', 'Export'],
        querystring: exportQueryJsonSchema,
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          reportType: ReportType;
          format: 'json' | 'csv';
          startDate?: string;
          endDate?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { reportType, format } = request.query;
      const dateRange = {
        startDate: request.query.startDate
          ? new Date(request.query.startDate)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: request.query.endDate
          ? new Date(request.query.endDate)
          : new Date(),
      };

      // Get report data based on type
      let reportData: unknown;

      switch (reportType) {
        case ReportType.PIPELINE_SUMMARY:
          const pipelineResult = await analyticsService.getPipelineSummary({
            tenantId,
            dateRange,
          });
          if (pipelineResult.isFailure) {
            return reply.status(500).send({ error: pipelineResult.error });
          }
          reportData = pipelineResult.getValue();
          break;

        case ReportType.LEAD_SOURCE_ANALYSIS:
          const sourceResult = await analyticsService.getLeadSourceAnalysis({
            tenantId,
            dateRange,
          });
          if (sourceResult.isFailure) {
            return reply.status(500).send({ error: sourceResult.error });
          }
          reportData = sourceResult.getValue();
          break;

        case ReportType.LEAD_QUALITY:
          const qualityResult = await analyticsService.getLeadQualityReport({
            tenantId,
            dateRange,
          });
          if (qualityResult.isFailure) {
            return reply.status(500).send({ error: qualityResult.error });
          }
          reportData = qualityResult.getValue();
          break;

        default:
          return reply.status(400).send({ error: 'Unsupported report type for export' });
      }

      if (format === 'csv') {
        // Convert to CSV
        const csv = convertToCSV(reportData);
        return reply
          .header('Content-Type', 'text/csv')
          .header(
            'Content-Disposition',
            `attachment; filename="${reportType}-${Date.now()}.csv"`
          )
          .send(csv);
      }

      return reply
        .header('Content-Type', 'application/json')
        .header(
          'Content-Disposition',
          `attachment; filename="${reportType}-${Date.now()}.json"`
        )
        .send(reportData);
    }
  );
}

// Helper function to convert data to CSV
function convertToCSV(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const obj = data as Record<string, unknown>;

  // Try to find an array property to convert
  const arrayProps = Object.entries(obj).filter(([, v]) => Array.isArray(v));

  if (arrayProps.length === 0) {
    // If no arrays, convert the metrics object
    const metrics = obj.metrics as Record<string, unknown> | undefined;
    if (metrics) {
      const headers = Object.keys(metrics);
      const values = Object.values(metrics).map((v) =>
        typeof v === 'object' ? (v as { value?: unknown })?.value ?? '' : v
      );
      return `${headers.join(',')}\n${values.join(',')}`;
    }
    return '';
  }

  // Convert the first array found
  const [propName, propArray] = arrayProps[0];
  const array = propArray as Record<string, unknown>[];

  if (array.length === 0) return '';

  const headers = Object.keys(array[0]);
  const rows = array.map((item) =>
    headers.map((h) => {
      const val = item[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return String(val);
    }).join(',')
  );

  return `${headers.join(',')}\n${rows.join('\n')}`;
}
