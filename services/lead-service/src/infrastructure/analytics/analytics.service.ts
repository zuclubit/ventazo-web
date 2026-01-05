/**
 * Analytics Service
 * Provides reporting and analytics capabilities
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  ReportType,
  MetricType,
  TimeGranularity,
  DateRange,
  ReportOptions,
  ReportFilter,
  MetricValue,
  TimeSeriesDataPoint,
  DistributionDataPoint,
  FunnelStage,
  PipelineSummaryReport,
  PipelineVelocityReport,
  ConversionReport,
  LeadSourceReport,
  LeadQualityReport,
  LeadAgingReport,
  ActivityReport,
  DashboardData,
  DashboardMetrics,
} from './types';
import { LeadStatusEnum } from '../../domain/value-objects';

@injectable()
export class AnalyticsService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Get dashboard data for quick overview
   */
  async getDashboard(tenantId: string, period?: DateRange): Promise<Result<DashboardData>> {
    try {
      const now = new Date();
      const dateRange = period || {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: now,
      };

      const [metrics, recentLeads, upcomingFollowUps, funnel, trend] = await Promise.all([
        this.getDashboardMetrics(tenantId, dateRange),
        this.getRecentLeads(tenantId, 5),
        this.getUpcomingFollowUps(tenantId, 5),
        this.getFunnelData(tenantId, dateRange),
        this.getTrendData(tenantId, dateRange, TimeGranularity.DAY),
      ]);

      const alerts = await this.generateAlerts(tenantId, metrics);

      return Result.ok({
        tenantId,
        period: dateRange,
        metrics,
        recentLeads,
        upcomingFollowUps,
        funnel,
        trendData: trend,
        alerts,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get dashboard: ${message}`);
    }
  }

  /**
   * Generate Pipeline Summary Report
   */
  async getPipelineSummary(options: ReportOptions): Promise<Result<PipelineSummaryReport>> {
    try {
      const { tenantId, dateRange, filters } = options;

      // Get current period metrics
      const currentMetrics = await this.calculatePipelineMetrics(tenantId, dateRange, filters);

      // Get comparison period if specified
      let comparisonMetrics: typeof currentMetrics | null = null;
      if (options.compareWith) {
        comparisonMetrics = await this.calculatePipelineMetrics(
          tenantId,
          options.compareWith,
          filters
        );
      }

      // Calculate metric values with changes
      const metrics = {
        totalLeads: this.createMetricValue(
          currentMetrics.total,
          comparisonMetrics?.total
        ),
        newLeads: this.createMetricValue(
          currentMetrics.new,
          comparisonMetrics?.new
        ),
        qualifiedLeads: this.createMetricValue(
          currentMetrics.qualified,
          comparisonMetrics?.qualified
        ),
        convertedLeads: this.createMetricValue(
          currentMetrics.converted,
          comparisonMetrics?.converted
        ),
        lostLeads: this.createMetricValue(
          currentMetrics.lost,
          comparisonMetrics?.lost
        ),
        conversionRate: this.createMetricValue(
          currentMetrics.conversionRate,
          comparisonMetrics?.conversionRate
        ),
        averageScore: this.createMetricValue(
          currentMetrics.averageScore,
          comparisonMetrics?.averageScore
        ),
      };

      // Get distribution data
      const [funnel, bySource, byIndustry, trend] = await Promise.all([
        this.getFunnelData(tenantId, dateRange, filters),
        this.getDistributionByField(tenantId, dateRange, 'source', filters),
        this.getDistributionByField(tenantId, dateRange, 'industry', filters),
        this.getTrendData(tenantId, dateRange, options.granularity || TimeGranularity.DAY),
      ]);

      return Result.ok({
        type: ReportType.PIPELINE_SUMMARY,
        period: dateRange,
        metrics,
        funnel,
        bySource,
        byIndustry,
        trend,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to generate pipeline summary: ${message}`);
    }
  }

  /**
   * Generate Lead Source Analysis Report
   */
  async getLeadSourceAnalysis(options: ReportOptions): Promise<Result<LeadSourceReport>> {
    try {
      const { tenantId, dateRange, filters } = options;

      const query = `
        SELECT
          source,
          COUNT(*) as total_leads,
          COUNT(*) FILTER (WHERE created_at >= $2) as new_leads,
          COUNT(*) FILTER (WHERE status = 'won') as converted,
          AVG(score) as average_score,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)
            FILTER (WHERE status = 'won') as avg_deal_time
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY source
        ORDER BY total_leads DESC
      `;

      const result = await this.pool.query(query, [
        tenantId,
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString(),
      ]);

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const sourceBreakdown = result.getValue().rows.map((row) => ({
        source: row.source || 'Unknown',
        totalLeads: parseInt(row.total_leads, 10),
        newLeads: parseInt(row.new_leads, 10),
        converted: parseInt(row.converted, 10),
        conversionRate:
          parseInt(row.total_leads, 10) > 0
            ? (parseInt(row.converted, 10) / parseInt(row.total_leads, 10)) * 100
            : 0,
        averageScore: parseFloat(row.average_score) || 0,
        averageDealTime: parseFloat(row.avg_deal_time) || undefined,
      }));

      const topSources: DistributionDataPoint[] = sourceBreakdown
        .slice(0, 5)
        .map((s) => ({
          label: s.source,
          value: s.totalLeads,
          percentage:
            (s.totalLeads /
              sourceBreakdown.reduce((sum, x) => sum + x.totalLeads, 0)) *
            100,
        }));

      // Generate recommendations based on data
      const recommendations = this.generateSourceRecommendations(sourceBreakdown);

      return Result.ok({
        type: ReportType.LEAD_SOURCE_ANALYSIS,
        period: dateRange,
        sourceBreakdown,
        topSources,
        sourceTrend: {},
        recommendations,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to generate source analysis: ${message}`);
    }
  }

  /**
   * Generate Lead Quality Report
   */
  async getLeadQualityReport(options: ReportOptions): Promise<Result<LeadQualityReport>> {
    try {
      const { tenantId, dateRange } = options;

      // Get score metrics
      const scoreQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE score >= 75) as hot_leads,
          COUNT(*) FILTER (WHERE score >= 50 AND score < 75) as warm_leads,
          COUNT(*) FILTER (WHERE score < 50) as cold_leads,
          AVG(score) as average_score,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `;

      const scoreResult = await this.pool.query(scoreQuery, [
        tenantId,
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString(),
      ]);

      if (scoreResult.isFailure) {
        return Result.fail(scoreResult.error!);
      }

      const row = scoreResult.getValue().rows[0];
      const total = parseInt(row.total, 10) || 1;

      const metrics = {
        averageScore: this.createMetricValue(parseFloat(row.average_score) || 0),
        hotLeads: this.createMetricValue(parseInt(row.hot_leads, 10)),
        warmLeads: this.createMetricValue(parseInt(row.warm_leads, 10)),
        coldLeads: this.createMetricValue(parseInt(row.cold_leads, 10)),
        qualificationRate: this.createMetricValue(
          (parseInt(row.qualified, 10) / total) * 100
        ),
      };

      // Score distribution
      const scoreDistribution: DistributionDataPoint[] = [
        {
          label: 'Hot (75-100)',
          value: parseInt(row.hot_leads, 10),
          percentage: (parseInt(row.hot_leads, 10) / total) * 100,
          color: '#DC2626',
        },
        {
          label: 'Warm (50-74)',
          value: parseInt(row.warm_leads, 10),
          percentage: (parseInt(row.warm_leads, 10) / total) * 100,
          color: '#F59E0B',
        },
        {
          label: 'Cold (0-49)',
          value: parseInt(row.cold_leads, 10),
          percentage: (parseInt(row.cold_leads, 10) / total) * 100,
          color: '#3B82F6',
        },
      ];

      // Quality by source
      const sourceQuery = `
        SELECT
          source,
          AVG(score) as average_score,
          COUNT(*) FILTER (WHERE score >= 75) * 100.0 / NULLIF(COUNT(*), 0) as hot_pct,
          COUNT(*) FILTER (WHERE score >= 50 AND score < 75) * 100.0 / NULLIF(COUNT(*), 0) as warm_pct,
          COUNT(*) FILTER (WHERE score < 50) * 100.0 / NULLIF(COUNT(*), 0) as cold_pct
        FROM leads
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY source
        ORDER BY average_score DESC
      `;

      const sourceResult = await this.pool.query(sourceQuery, [
        tenantId,
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString(),
      ]);

      const qualityBySource = sourceResult.isSuccess
        ? sourceResult.getValue().rows.map((r) => ({
            source: r.source || 'Unknown',
            averageScore: parseFloat(r.average_score) || 0,
            hotPercentage: parseFloat(r.hot_pct) || 0,
            warmPercentage: parseFloat(r.warm_pct) || 0,
            coldPercentage: parseFloat(r.cold_pct) || 0,
          }))
        : [];

      // Score trend
      const scoreTrend = await this.getScoreTrend(tenantId, dateRange);

      return Result.ok({
        type: ReportType.LEAD_QUALITY,
        period: dateRange,
        metrics,
        scoreDistribution,
        qualityBySource,
        scoreTrend,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to generate quality report: ${message}`);
    }
  }

  /**
   * Generate Lead Aging Report
   */
  async getLeadAgingReport(options: ReportOptions): Promise<Result<LeadAgingReport>> {
    try {
      const { tenantId, dateRange } = options;

      // Aging buckets query
      const agingQuery = `
        WITH lead_ages AS (
          SELECT
            id,
            company_name,
            status,
            owner_id,
            score,
            last_activity_at,
            EXTRACT(DAY FROM NOW() - created_at) as age_days
          FROM leads
          WHERE tenant_id = $1
            AND status NOT IN ('won', 'lost')
        )
        SELECT
          bucket,
          COUNT(*) as count,
          AVG(score) as average_score
        FROM (
          SELECT
            score,
            CASE
              WHEN age_days <= 7 THEN '0-7 days'
              WHEN age_days <= 14 THEN '8-14 days'
              WHEN age_days <= 30 THEN '15-30 days'
              WHEN age_days <= 60 THEN '31-60 days'
              ELSE '60+ days'
            END as bucket,
            CASE
              WHEN age_days <= 7 THEN 1
              WHEN age_days <= 14 THEN 2
              WHEN age_days <= 30 THEN 3
              WHEN age_days <= 60 THEN 4
              ELSE 5
            END as bucket_order
          FROM lead_ages
        ) bucketed
        GROUP BY bucket, bucket_order
        ORDER BY bucket_order
      `;

      const agingResult = await this.pool.query(agingQuery, [tenantId]);

      if (agingResult.isFailure) {
        return Result.fail(agingResult.error!);
      }

      const totalLeads = agingResult
        .getValue()
        .rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

      const agingBuckets = agingResult.getValue().rows.map((r) => ({
        bucket: r.bucket,
        count: parseInt(r.count, 10),
        percentage: (parseInt(r.count, 10) / totalLeads) * 100,
        averageScore: parseFloat(r.average_score) || 0,
      }));

      // Stale leads (30+ days with no activity)
      const staleQuery = `
        SELECT
          id, company_name, status, owner_id,
          EXTRACT(DAY FROM NOW() - created_at) as age,
          last_activity_at
        FROM leads
        WHERE tenant_id = $1
          AND status NOT IN ('won', 'lost')
          AND (
            last_activity_at IS NULL
            OR last_activity_at < NOW() - INTERVAL '30 days'
          )
        ORDER BY created_at ASC
        LIMIT 20
      `;

      const staleResult = await this.pool.query(staleQuery, [tenantId]);

      const staleLeads = staleResult.isSuccess
        ? staleResult.getValue().rows.map((r) => ({
            leadId: r.id,
            companyName: r.company_name,
            age: parseInt(r.age, 10),
            lastActivity: r.last_activity_at
              ? new Date(r.last_activity_at)
              : undefined,
            status: r.status,
            owner: r.owner_id,
          }))
        : [];

      // Metrics
      const metricsQuery = `
        SELECT
          AVG(EXTRACT(DAY FROM NOW() - created_at)) as average_age,
          COUNT(*) FILTER (
            WHERE last_activity_at IS NULL
            OR last_activity_at < NOW() - INTERVAL '30 days'
          ) as stale_count,
          COUNT(*) FILTER (
            WHERE last_activity_at IS NOT NULL
            AND last_activity_at < NOW() - INTERVAL '14 days'
            AND last_activity_at >= NOW() - INTERVAL '30 days'
          ) as at_risk_count
        FROM leads
        WHERE tenant_id = $1
          AND status NOT IN ('won', 'lost')
      `;

      const metricsResult = await this.pool.query(metricsQuery, [tenantId]);
      const metricsRow = metricsResult.isSuccess
        ? metricsResult.getValue().rows[0]
        : { average_age: 0, stale_count: 0, at_risk_count: 0 };

      return Result.ok({
        type: ReportType.LEAD_AGING,
        period: dateRange,
        agingBuckets,
        staleLeads,
        metrics: {
          averageAge: this.createMetricValue(parseFloat(metricsRow.average_age) || 0),
          staleCount: this.createMetricValue(parseInt(metricsRow.stale_count, 10)),
          atRiskCount: this.createMetricValue(parseInt(metricsRow.at_risk_count, 10)),
        },
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to generate aging report: ${message}`);
    }
  }

  /**
   * Generate Activity Report
   */
  async getActivityReport(options: ReportOptions): Promise<Result<ActivityReport>> {
    try {
      const { tenantId, dateRange } = options;

      // Activity metrics
      const metricsQuery = `
        SELECT
          COUNT(*) as total_activities,
          COUNT(*) FILTER (WHERE action = 'follow_up_scheduled') as follow_ups_scheduled,
          COUNT(*) FILTER (WHERE action = 'follow_up_completed') as follow_ups_completed
        FROM activity_logs
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
      `;

      const metricsResult = await this.pool.query(metricsQuery, [
        tenantId,
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString(),
      ]);

      // Overdue follow-ups
      const overdueQuery = `
        SELECT COUNT(*) as overdue
        FROM leads
        WHERE tenant_id = $1
          AND next_follow_up_at < NOW()
          AND status NOT IN ('won', 'lost')
      `;

      const overdueResult = await this.pool.query(overdueQuery, [tenantId]);

      const metricsRow = metricsResult.isSuccess
        ? metricsResult.getValue().rows[0]
        : { total_activities: 0, follow_ups_scheduled: 0, follow_ups_completed: 0 };

      const overdueCount = overdueResult.isSuccess
        ? parseInt(overdueResult.getValue().rows[0].overdue, 10)
        : 0;

      const scheduled = parseInt(metricsRow.follow_ups_scheduled, 10);
      const completed = parseInt(metricsRow.follow_ups_completed, 10);
      const complianceRate = scheduled > 0 ? (completed / scheduled) * 100 : 100;

      const metrics = {
        totalActivities: this.createMetricValue(parseInt(metricsRow.total_activities, 10)),
        followUpsScheduled: this.createMetricValue(scheduled),
        followUpsCompleted: this.createMetricValue(completed),
        overdueFollowUps: this.createMetricValue(overdueCount),
        complianceRate: this.createMetricValue(complianceRate),
      };

      // Activity by type
      const byTypeQuery = `
        SELECT action, COUNT(*) as count
        FROM activity_logs
        WHERE tenant_id = $1
          AND created_at >= $2
          AND created_at <= $3
        GROUP BY action
        ORDER BY count DESC
      `;

      const byTypeResult = await this.pool.query(byTypeQuery, [
        tenantId,
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString(),
      ]);

      const totalActivities = byTypeResult.isSuccess
        ? byTypeResult.getValue().rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0)
        : 1;

      const activityByType: DistributionDataPoint[] = byTypeResult.isSuccess
        ? byTypeResult.getValue().rows.map((r) => ({
            label: r.action,
            value: parseInt(r.count, 10),
            percentage: (parseInt(r.count, 10) / totalActivities) * 100,
          }))
        : [];

      // Upcoming follow-ups
      const upcomingQuery = `
        SELECT l.id, l.company_name, l.next_follow_up_at, l.owner_id
        FROM leads l
        WHERE l.tenant_id = $1
          AND l.next_follow_up_at >= NOW()
          AND l.next_follow_up_at <= NOW() + INTERVAL '7 days'
          AND l.status NOT IN ('won', 'lost')
        ORDER BY l.next_follow_up_at ASC
        LIMIT 10
      `;

      const upcomingResult = await this.pool.query(upcomingQuery, [tenantId]);

      const upcomingFollowUps = upcomingResult.isSuccess
        ? upcomingResult.getValue().rows.map((r) => ({
            leadId: r.id,
            companyName: r.company_name,
            dueDate: new Date(r.next_follow_up_at),
            ownerId: r.owner_id,
          }))
        : [];

      return Result.ok({
        type: ReportType.ACTIVITY_SUMMARY,
        period: dateRange,
        metrics,
        activityByType,
        activityByOwner: [], // Would require user service integration
        activityTrend: [],
        upcomingFollowUps,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to generate activity report: ${message}`);
    }
  }

  // ============ Private Helper Methods ============

  private async getDashboardMetrics(
    tenantId: string,
    dateRange: DateRange
  ): Promise<DashboardMetrics> {
    const query = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as new_today,
        COUNT(*) FILTER (
          WHERE status = 'won'
          AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', CURRENT_DATE)
        ) as converted_this_month,
        COUNT(*) FILTER (WHERE status = 'won') as total_converted,
        COUNT(*) FILTER (
          WHERE next_follow_up_at < NOW()
          AND status NOT IN ('won', 'lost')
        ) as overdue_follow_ups,
        AVG(score) as average_score
      FROM leads
      WHERE tenant_id = $1
    `;

    const result = await this.pool.query(query, [tenantId]);

    if (result.isFailure) {
      return {
        totalLeads: { value: 0 },
        newLeadsToday: { value: 0 },
        convertedThisMonth: { value: 0 },
        conversionRate: { value: 0 },
        overdueFollowUps: { value: 0 },
        averageScore: { value: 0 },
      };
    }

    const row = result.getValue().rows[0];
    const total = parseInt(row.total_leads, 10) || 1;
    const converted = parseInt(row.total_converted, 10);

    return {
      totalLeads: { value: parseInt(row.total_leads, 10) },
      newLeadsToday: { value: parseInt(row.new_today, 10) },
      convertedThisMonth: { value: parseInt(row.converted_this_month, 10) },
      conversionRate: { value: (converted / total) * 100 },
      overdueFollowUps: { value: parseInt(row.overdue_follow_ups, 10) },
      averageScore: { value: parseFloat(row.average_score) || 0 },
    };
  }

  private async getRecentLeads(tenantId: string, limit: number) {
    const query = `
      SELECT id, company_name, status, score, created_at
      FROM leads
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [tenantId, limit]);

    if (result.isFailure) return [];

    return result.getValue().rows.map((r) => ({
      id: r.id,
      companyName: r.company_name,
      status: r.status,
      score: r.score,
      createdAt: new Date(r.created_at),
    }));
  }

  private async getUpcomingFollowUps(tenantId: string, limit: number) {
    const query = `
      SELECT id, company_name, next_follow_up_at
      FROM leads
      WHERE tenant_id = $1
        AND next_follow_up_at >= NOW()
        AND status NOT IN ('won', 'lost')
      ORDER BY next_follow_up_at ASC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [tenantId, limit]);

    if (result.isFailure) return [];

    return result.getValue().rows.map((r) => ({
      leadId: r.id,
      companyName: r.company_name,
      dueDate: new Date(r.next_follow_up_at),
    }));
  }

  private async getFunnelData(
    tenantId: string,
    dateRange: DateRange,
    filters?: ReportFilter
  ): Promise<FunnelStage[]> {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'won'];

    const query = `
      SELECT status, COUNT(*) as count
      FROM leads
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY status
    `;

    const result = await this.pool.query(query, [
      tenantId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ]);

    if (result.isFailure) return [];

    const counts = new Map(
      result.getValue().rows.map((r) => [r.status, parseInt(r.count, 10)])
    );

    let previousCount = 0;
    return stages.map((stage, index) => {
      const count = counts.get(stage) || 0;
      const conversionRate =
        index === 0 || previousCount === 0
          ? 100
          : (count / previousCount) * 100;

      previousCount = count || previousCount;

      return {
        stage,
        count,
        conversionRate,
      };
    });
  }

  private async getTrendData(
    tenantId: string,
    dateRange: DateRange,
    granularity: TimeGranularity
  ): Promise<TimeSeriesDataPoint[]> {
    const interval = this.getIntervalForGranularity(granularity);

    const query = `
      SELECT
        DATE_TRUNC($4, created_at) as period,
        COUNT(*) as count
      FROM leads
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await this.pool.query(query, [
      tenantId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
      interval,
    ]);

    if (result.isFailure) return [];

    return result.getValue().rows.map((r) => ({
      timestamp: new Date(r.period),
      value: parseInt(r.count, 10),
    }));
  }

  private async calculatePipelineMetrics(
    tenantId: string,
    dateRange: DateRange,
    filters?: ReportFilter
  ) {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new,
        COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
        COUNT(*) FILTER (WHERE status = 'won') as converted,
        COUNT(*) FILTER (WHERE status = 'lost') as lost,
        AVG(score) as average_score
      FROM leads
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `;

    const result = await this.pool.query(query, [
      tenantId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ]);

    if (result.isFailure) {
      return {
        total: 0,
        new: 0,
        qualified: 0,
        converted: 0,
        lost: 0,
        conversionRate: 0,
        averageScore: 0,
      };
    }

    const row = result.getValue().rows[0];
    const total = parseInt(row.total, 10) || 1;
    const converted = parseInt(row.converted, 10);

    return {
      total: parseInt(row.total, 10),
      new: parseInt(row.new, 10),
      qualified: parseInt(row.qualified, 10),
      converted,
      lost: parseInt(row.lost, 10),
      conversionRate: (converted / total) * 100,
      averageScore: parseFloat(row.average_score) || 0,
    };
  }

  private async getDistributionByField(
    tenantId: string,
    dateRange: DateRange,
    field: string,
    filters?: ReportFilter
  ): Promise<DistributionDataPoint[]> {
    const query = `
      SELECT ${field}, COUNT(*) as count
      FROM leads
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY ${field}
      ORDER BY count DESC
      LIMIT 10
    `;

    const result = await this.pool.query(query, [
      tenantId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ]);

    if (result.isFailure) return [];

    const total = result
      .getValue()
      .rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return result.getValue().rows.map((r) => ({
      label: r[field] || 'Unknown',
      value: parseInt(r.count, 10),
      percentage: (parseInt(r.count, 10) / total) * 100,
    }));
  }

  private async getScoreTrend(
    tenantId: string,
    dateRange: DateRange
  ): Promise<TimeSeriesDataPoint[]> {
    const query = `
      SELECT
        DATE_TRUNC('day', created_at) as period,
        AVG(score) as average_score
      FROM leads
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY period
      ORDER BY period ASC
    `;

    const result = await this.pool.query(query, [
      tenantId,
      dateRange.startDate.toISOString(),
      dateRange.endDate.toISOString(),
    ]);

    if (result.isFailure) return [];

    return result.getValue().rows.map((r) => ({
      timestamp: new Date(r.period),
      value: parseFloat(r.average_score) || 0,
    }));
  }

  private async generateAlerts(tenantId: string, metrics: DashboardMetrics) {
    const alerts: Array<{
      type: 'warning' | 'info' | 'success' | 'error';
      message: string;
      actionUrl?: string;
    }> = [];

    if (metrics.overdueFollowUps.value > 0) {
      alerts.push({
        type: 'warning',
        message: `You have ${metrics.overdueFollowUps.value} overdue follow-ups`,
        actionUrl: '/leads?filter=overdue',
      });
    }

    if (metrics.conversionRate.value > 20) {
      alerts.push({
        type: 'success',
        message: `Great job! Conversion rate is at ${metrics.conversionRate.value.toFixed(1)}%`,
      });
    }

    if (metrics.newLeadsToday.value === 0) {
      alerts.push({
        type: 'info',
        message: 'No new leads today. Consider launching a campaign!',
      });
    }

    return alerts;
  }

  private generateSourceRecommendations(
    sourceData: Array<{
      source: string;
      totalLeads: number;
      conversionRate: number;
      averageScore: number;
    }>
  ): string[] {
    const recommendations: string[] = [];

    // Find best converting source
    const bestConversion = sourceData.reduce((best, current) =>
      current.conversionRate > best.conversionRate ? current : best
    );

    if (bestConversion.conversionRate > 0) {
      recommendations.push(
        `"${bestConversion.source}" has the highest conversion rate (${bestConversion.conversionRate.toFixed(1)}%). Consider investing more here.`
      );
    }

    // Find sources with low quality
    const lowQuality = sourceData.filter(
      (s) => s.averageScore < 50 && s.totalLeads > 5
    );
    for (const source of lowQuality.slice(0, 2)) {
      recommendations.push(
        `"${source.source}" has low lead quality (avg score: ${source.averageScore.toFixed(0)}). Review targeting.`
      );
    }

    return recommendations;
  }

  private createMetricValue(
    current: number,
    previous?: number
  ): MetricValue {
    const result: MetricValue = { value: current };

    if (previous !== undefined) {
      result.previousValue = previous;
      if (previous !== 0) {
        result.change = ((current - previous) / previous) * 100;
        result.trend =
          result.change > 1 ? 'up' : result.change < -1 ? 'down' : 'stable';
      }
    }

    return result;
  }

  private getIntervalForGranularity(granularity: TimeGranularity): string {
    switch (granularity) {
      case TimeGranularity.HOUR:
        return 'hour';
      case TimeGranularity.DAY:
        return 'day';
      case TimeGranularity.WEEK:
        return 'week';
      case TimeGranularity.MONTH:
        return 'month';
      case TimeGranularity.QUARTER:
        return 'quarter';
      case TimeGranularity.YEAR:
        return 'year';
      default:
        return 'day';
    }
  }
}
