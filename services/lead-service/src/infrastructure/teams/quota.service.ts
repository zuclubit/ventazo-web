/**
 * Quota Service
 * Manages sales quotas, assignments, and progress tracking
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  Quota,
  QuotaAssignment,
  QuotaAdjustment,
  QuotaProgress,
  QuotaRollup,
  QuotaSettings,
  QuotaPeriod,
  QuotaType,
  QuotaStatus,
  CreateQuotaInput,
  UpdateQuotaInput,
  AssignQuotaInput,
  AdjustQuotaInput,
  Leaderboard,
  LeaderboardEntry,
  PerformanceMetrics,
} from './types';

const DEFAULT_QUOTA_SETTINGS: QuotaSettings = {
  allowOverachievement: true,
  prorateForiNewHires: true,
  includeInForecasting: true,
  rollupToParent: true,
};

@injectable()
export class QuotaService {
  constructor(private pool: DatabasePool) {}

  // ==================== Quota CRUD ====================

  /**
   * Create a new quota
   */
  async createQuota(
    tenantId: string,
    input: CreateQuotaInput
  ): Promise<Result<Quota>> {
    const settings = { ...DEFAULT_QUOTA_SETTINGS, ...input.settings };

    const result = await this.pool.query(`
      INSERT INTO quotas (
        tenant_id, name, description, type, period, start_date, end_date, target, currency, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId,
      input.name,
      input.description || null,
      input.type || 'revenue',
      input.period || 'monthly',
      input.startDate,
      input.endDate,
      input.target,
      input.currency || 'USD',
      JSON.stringify(settings),
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to create quota');
    }

    return Result.ok(this.mapRowToQuota(result.value.rows[0]));
  }

  /**
   * Get quota by ID
   */
  async getQuota(tenantId: string, quotaId: string): Promise<Result<Quota>> {
    const result = await this.pool.query(`
      SELECT * FROM quotas
      WHERE id = $1 AND tenant_id = $2
    `, [quotaId, tenantId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Quota not found');
    }

    return Result.ok(this.mapRowToQuota(result.value.rows[0]));
  }

  /**
   * List quotas for a tenant
   */
  async listQuotas(
    tenantId: string,
    options: {
      type?: QuotaType;
      period?: QuotaPeriod;
      status?: QuotaStatus;
      startDateFrom?: Date;
      startDateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Result<{ quotas: Quota[]; total: number }>> {
    let query = `SELECT * FROM quotas WHERE tenant_id = $1`;
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(options.type);
    }
    if (options.period) {
      query += ` AND period = $${paramIndex++}`;
      values.push(options.period);
    }
    if (options.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(options.status);
    }
    if (options.startDateFrom) {
      query += ` AND start_date >= $${paramIndex++}`;
      values.push(options.startDateFrom);
    }
    if (options.startDateTo) {
      query += ` AND start_date <= $${paramIndex++}`;
      values.push(options.startDateTo);
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM (${query}) as count_query`,
      values
    );
    const total = parseInt(countResult.value?.rows?.[0]?.count || '0', 10);

    // Add pagination
    query += ` ORDER BY start_date DESC`;
    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(options.limit);
    }
    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(options.offset);
    }

    const result = await this.pool.query(query, values);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to list quotas');
    }

    const quotas = (result.value?.rows || []).map((row: Record<string, unknown>) =>
      this.mapRowToQuota(row)
    );

    return Result.ok({ quotas, total });
  }

  /**
   * Update a quota
   */
  async updateQuota(
    tenantId: string,
    quotaId: string,
    input: UpdateQuotaInput
  ): Promise<Result<Quota>> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.target !== undefined) {
      updates.push(`target = $${paramIndex++}`);
      values.push(input.target);
    }
    if (input.settings !== undefined) {
      updates.push(`settings = settings || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(input.settings));
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }

    if (updates.length === 0) {
      return this.getQuota(tenantId, quotaId);
    }

    updates.push(`updated_at = NOW()`);

    values.push(quotaId, tenantId);

    const result = await this.pool.query(`
      UPDATE quotas
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to update quota');
    }

    return Result.ok(this.mapRowToQuota(result.value.rows[0]));
  }

  /**
   * Activate a quota
   */
  async activateQuota(tenantId: string, quotaId: string): Promise<Result<Quota>> {
    return this.updateQuota(tenantId, quotaId, { status: 'active' });
  }

  /**
   * Archive a quota
   */
  async archiveQuota(tenantId: string, quotaId: string): Promise<Result<Quota>> {
    return this.updateQuota(tenantId, quotaId, { status: 'archived' });
  }

  // ==================== Quota Assignments ====================

  /**
   * Assign a quota to user/team/territory
   */
  async assignQuota(
    tenantId: string,
    quotaId: string,
    input: AssignQuotaInput
  ): Promise<Result<QuotaAssignment>> {
    // Verify quota exists
    const quotaResult = await this.getQuota(tenantId, quotaId);
    if (quotaResult.isFailure) {
      return Result.fail('Quota not found');
    }

    const result = await this.pool.query(`
      INSERT INTO quota_assignments (
        quota_id, user_id, team_id, territory_id, target
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      quotaId,
      input.userId || null,
      input.teamId || null,
      input.territoryId || null,
      input.target,
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to assign quota');
    }

    return Result.ok(this.mapRowToAssignment(result.value.rows[0]));
  }

  /**
   * Update quota assignment target
   */
  async updateAssignment(
    tenantId: string,
    assignmentId: string,
    target: number
  ): Promise<Result<QuotaAssignment>> {
    const result = await this.pool.query(`
      UPDATE quota_assignments
      SET target = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [target, assignmentId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to update assignment');
    }

    return Result.ok(this.mapRowToAssignment(result.value.rows[0]));
  }

  /**
   * Adjust quota assignment
   */
  async adjustQuota(
    tenantId: string,
    assignmentId: string,
    userId: string,
    input: AdjustQuotaInput
  ): Promise<Result<QuotaAdjustment>> {
    // Create adjustment record
    const adjustmentResult = await this.pool.query(`
      INSERT INTO quota_adjustments (assignment_id, amount, reason, adjusted_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [assignmentId, input.amount, input.reason, userId]);

    if (adjustmentResult.isFailure || !adjustmentResult.value?.rows?.[0]) {
      return Result.fail(adjustmentResult.error || 'Failed to create adjustment');
    }

    // Update assignment target
    await this.pool.query(`
      UPDATE quota_assignments
      SET target = target + $1, updated_at = NOW()
      WHERE id = $2
    `, [input.amount, assignmentId]);

    const row = adjustmentResult.value.rows[0];
    return Result.ok({
      id: row.id as string,
      assignmentId: row.assignment_id as string,
      amount: row.amount as number,
      reason: row.reason as string,
      adjustedBy: row.adjusted_by as string,
      adjustedAt: new Date(row.adjusted_at as string),
    });
  }

  /**
   * Get quota assignments for a quota
   */
  async getQuotaAssignments(
    tenantId: string,
    quotaId: string
  ): Promise<Result<QuotaAssignment[]>> {
    const result = await this.pool.query(`
      SELECT * FROM quota_assignments
      WHERE quota_id = $1
      ORDER BY created_at ASC
    `, [quotaId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get assignments');
    }

    const assignments = (result.value?.rows || []).map((row: Record<string, unknown>) =>
      this.mapRowToAssignment(row)
    );

    return Result.ok(assignments);
  }

  /**
   * Get user's quota assignments
   */
  async getUserQuotas(
    tenantId: string,
    userId: string,
    activeOnly = true
  ): Promise<Result<QuotaProgress[]>> {
    let query = `
      SELECT
        qa.*,
        q.name as quota_name,
        q.type as quota_type,
        q.period as quota_period,
        q.start_date as quota_start_date,
        q.end_date as quota_end_date,
        q.currency as quota_currency,
        q.status as quota_status,
        q.settings as quota_settings
      FROM quota_assignments qa
      JOIN quotas q ON q.id = qa.quota_id
      WHERE qa.user_id = $1 AND q.tenant_id = $2
    `;

    if (activeOnly) {
      query += ` AND q.status = 'active' AND qa.status = 'active'`;
    }

    query += ` ORDER BY q.start_date DESC`;

    const result = await this.pool.query(query, [userId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get user quotas');
    }

    const progress = await Promise.all(
      (result.value?.rows || []).map(async (row: Record<string, unknown>) => {
        const quota = {
          id: row.quota_id as string,
          tenantId,
          name: row.quota_name as string,
          type: row.quota_type as QuotaType,
          period: row.quota_period as QuotaPeriod,
          startDate: new Date(row.quota_start_date as string),
          endDate: new Date(row.quota_end_date as string),
          target: 0,
          currency: row.quota_currency as string,
          status: row.quota_status as QuotaStatus,
          settings: typeof row.quota_settings === 'string'
            ? JSON.parse(row.quota_settings)
            : row.quota_settings as QuotaSettings,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const assignment = this.mapRowToAssignment(row);
        const actual = await this.calculateActual(tenantId, userId, quota);
        const daysRemaining = this.calculateDaysRemaining(quota.endDate);

        return {
          assignment,
          quota,
          actual,
          attainment: assignment.target > 0 ? (actual / assignment.target) * 100 : 0,
          remaining: Math.max(0, assignment.target - actual),
          forecast: this.calculateForecast(actual, quota.startDate, quota.endDate),
          trend: this.calculateTrend(actual, assignment.target, daysRemaining),
          paceToQuota: this.calculatePace(actual, assignment.target, quota.startDate, quota.endDate),
          daysRemaining,
        };
      })
    );

    return Result.ok(progress);
  }

  // ==================== Quota Rollups ====================

  /**
   * Get quota rollup by team
   */
  async getTeamRollup(
    tenantId: string,
    quotaId: string
  ): Promise<Result<QuotaRollup[]>> {
    const result = await this.pool.query(`
      SELECT
        t.id as team_id,
        t.name as team_name,
        COALESCE(SUM(qa.target), 0) as total_target,
        qa.quota_id
      FROM teams t
      LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.is_active = true
      LEFT JOIN quota_assignments qa ON qa.user_id = tm.user_id AND qa.quota_id = $1
      WHERE t.tenant_id = $2 AND t.is_active = true
      GROUP BY t.id, t.name, qa.quota_id
      HAVING qa.quota_id IS NOT NULL
      ORDER BY t.name ASC
    `, [quotaId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get team rollup');
    }

    const quotaResult = await this.getQuota(tenantId, quotaId);
    if (quotaResult.isFailure || !quotaResult.value) {
      return Result.fail('Quota not found');
    }

    const quota = quotaResult.value;

    const rollups = await Promise.all(
      (result.value?.rows || []).map(async (row: Record<string, unknown>) => {
        const teamId = row.team_id as string;
        const target = parseInt(row.total_target as string || '0', 10);

        // Get team members' actuals
        const membersResult = await this.pool.query(`
          SELECT tm.user_id FROM team_members tm
          WHERE tm.team_id = $1 AND tm.is_active = true
        `, [teamId]);

        const memberIds = (membersResult.value?.rows || []).map(
          (r: Record<string, unknown>) => r.user_id as string
        );

        let actual = 0;
        for (const memberId of memberIds) {
          actual += await this.calculateActual(tenantId, memberId, quota);
        }

        return {
          entityType: 'team' as const,
          entityId: teamId,
          entityName: row.team_name as string,
          target,
          actual,
          attainment: target > 0 ? (actual / target) * 100 : 0,
        };
      })
    );

    return Result.ok(rollups);
  }

  /**
   * Get quota rollup by territory
   */
  async getTerritoryRollup(
    tenantId: string,
    quotaId: string
  ): Promise<Result<QuotaRollup[]>> {
    const result = await this.pool.query(`
      SELECT
        tr.id as territory_id,
        tr.name as territory_name,
        COALESCE(SUM(qa.target), 0) as total_target
      FROM territories tr
      LEFT JOIN territory_assignments ta ON ta.territory_id = tr.id
        AND (ta.end_date IS NULL OR ta.end_date > NOW())
      LEFT JOIN quota_assignments qa ON qa.user_id = ta.user_id AND qa.quota_id = $1
      WHERE tr.tenant_id = $2 AND tr.is_active = true
      GROUP BY tr.id, tr.name
      ORDER BY tr.name ASC
    `, [quotaId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get territory rollup');
    }

    const quotaResult = await this.getQuota(tenantId, quotaId);
    if (quotaResult.isFailure || !quotaResult.value) {
      return Result.fail('Quota not found');
    }

    const quota = quotaResult.value;

    const rollups = await Promise.all(
      (result.value?.rows || []).map(async (row: Record<string, unknown>) => {
        const territoryId = row.territory_id as string;
        const target = parseInt(row.total_target as string || '0', 10);

        // Get territory assignees' actuals
        const assigneesResult = await this.pool.query(`
          SELECT user_id FROM territory_assignments
          WHERE territory_id = $1 AND (end_date IS NULL OR end_date > NOW())
        `, [territoryId]);

        const assigneeIds = (assigneesResult.value?.rows || []).map(
          (r: Record<string, unknown>) => r.user_id as string
        );

        let actual = 0;
        for (const assigneeId of assigneeIds) {
          actual += await this.calculateActual(tenantId, assigneeId, quota);
        }

        return {
          entityType: 'territory' as const,
          entityId: territoryId,
          entityName: row.territory_name as string,
          target,
          actual,
          attainment: target > 0 ? (actual / target) * 100 : 0,
        };
      })
    );

    return Result.ok(rollups);
  }

  // ==================== Leaderboard ====================

  /**
   * Get sales leaderboard
   */
  async getLeaderboard(
    tenantId: string,
    quotaId: string,
    limit = 10
  ): Promise<Result<Leaderboard>> {
    const quotaResult = await this.getQuota(tenantId, quotaId);
    if (quotaResult.isFailure || !quotaResult.value) {
      return Result.fail('Quota not found');
    }

    const quota = quotaResult.value;

    const result = await this.pool.query(`
      SELECT
        qa.user_id,
        u.full_name,
        u.avatar_url,
        t.name as team_name,
        qa.target
      FROM quota_assignments qa
      JOIN users u ON u.id = qa.user_id
      LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.is_active = true
      LEFT JOIN teams t ON t.id = tm.team_id AND t.tenant_id = $1
      WHERE qa.quota_id = $2 AND qa.status = 'active'
    `, [tenantId, quotaId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get leaderboard');
    }

    const entries = await Promise.all(
      (result.value?.rows || []).map(async (row: Record<string, unknown>) => {
        const userId = row.user_id as string;
        const target = row.target as number;
        const actual = await this.calculateActual(tenantId, userId, quota);

        return {
          userId,
          userName: row.full_name as string || 'Unknown',
          avatarUrl: row.avatar_url as string | undefined,
          teamName: row.team_name as string | undefined,
          target,
          actual,
          attainment: target > 0 ? (actual / target) * 100 : 0,
        };
      })
    );

    // Sort by attainment descending
    entries.sort((a, b) => b.attainment - a.attainment);

    const rankedEntries: LeaderboardEntry[] = entries.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      userName: entry.userName,
      avatarUrl: entry.avatarUrl,
      teamName: entry.teamName,
      value: entry.attainment,
      change: 0, // Would track historical position
      trend: 'stable' as const,
    }));

    return Result.ok({
      period: {
        start: quota.startDate,
        end: quota.endDate,
      },
      metric: quota.type,
      entries: rankedEntries,
    });
  }

  // ==================== Performance Metrics ====================

  /**
   * Get user performance metrics
   */
  async getPerformanceMetrics(
    tenantId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<PerformanceMetrics>> {
    const metricsResult = await this.pool.query(`
      SELECT
        COUNT(DISTINCT l.id) FILTER (WHERE l.created_at BETWEEN $3 AND $4) as leads_generated,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'converted' AND l.updated_at BETWEEN $3 AND $4) as leads_converted,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_won' AND o.updated_at BETWEEN $3 AND $4) as deals_won,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_lost' AND o.updated_at BETWEEN $3 AND $4) as deals_lost,
        COALESCE(SUM(o.value) FILTER (WHERE o.stage = 'closed_won' AND o.updated_at BETWEEN $3 AND $4), 0) as revenue,
        COALESCE(AVG(o.value) FILTER (WHERE o.stage = 'closed_won' AND o.updated_at BETWEEN $3 AND $4), 0) as avg_deal_size,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' AND t.updated_at BETWEEN $3 AND $4) as activities_completed
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id AND l.tenant_id = $1
      LEFT JOIN opportunities o ON o.owner_id = u.id AND o.tenant_id = $1
      LEFT JOIN tasks t ON t.assigned_to = u.id AND t.tenant_id = $1
      WHERE u.id = $2
    `, [tenantId, userId, startDate, endDate]);

    const row = metricsResult.value?.rows?.[0] || {};

    const leadsGenerated = parseInt(row.leads_generated as string || '0', 10);
    const leadsConverted = parseInt(row.leads_converted as string || '0', 10);
    const dealsWon = parseInt(row.deals_won as string || '0', 10);
    const dealsLost = parseInt(row.deals_lost as string || '0', 10);
    const totalDeals = dealsWon + dealsLost;

    // Get quota attainment
    const quotasResult = await this.getUserQuotas(tenantId, userId);
    const quotaAttainment = quotasResult.isSuccess && quotasResult.value && quotasResult.value.length > 0
      ? quotasResult.value.reduce((sum: number, q: QuotaProgress) => sum + q.attainment, 0) / quotasResult.value.length
      : 0;

    // Get rankings
    const rankingsResult = await this.pool.query(`
      WITH user_revenue AS (
        SELECT
          owner_id,
          COALESCE(SUM(value) FILTER (WHERE stage = 'closed_won'), 0) as total_revenue
        FROM opportunities
        WHERE tenant_id = $1 AND updated_at BETWEEN $2 AND $3
        GROUP BY owner_id
      ),
      ranked AS (
        SELECT
          owner_id,
          total_revenue,
          RANK() OVER (ORDER BY total_revenue DESC) as rank,
          PERCENT_RANK() OVER (ORDER BY total_revenue DESC) as percentile
        FROM user_revenue
      )
      SELECT rank, percentile FROM ranked WHERE owner_id = $4
    `, [tenantId, startDate, endDate, userId]);

    const rankings = rankingsResult.value?.rows?.[0] || {};

    return Result.ok({
      userId,
      period: { start: startDate, end: endDate },
      metrics: {
        leadsGenerated,
        leadsConverted,
        conversionRate: leadsGenerated > 0 ? (leadsConverted / leadsGenerated) * 100 : 0,
        dealsWon,
        dealsLost,
        winRate: totalDeals > 0 ? (dealsWon / totalDeals) * 100 : 0,
        revenue: parseFloat(row.revenue as string || '0'),
        avgDealSize: parseFloat(row.avg_deal_size as string || '0'),
        avgCycleTime: 0, // Would calculate from opportunity history
        activitiesCompleted: parseInt(row.activities_completed as string || '0', 10),
        quotaAttainment,
      },
      rankings: {
        inTeam: 0, // Would need team context
        inCompany: parseInt(rankings.rank as string || '0', 10),
        percentile: Math.round((1 - parseFloat(rankings.percentile as string || '0')) * 100),
      },
    });
  }

  // ==================== Helper Methods ====================

  private async calculateActual(
    tenantId: string,
    userId: string,
    quota: Quota
  ): Promise<number> {
    let query: string;
    const values = [tenantId, userId, quota.startDate, quota.endDate];

    switch (quota.type) {
      case 'revenue':
        query = `
          SELECT COALESCE(SUM(value), 0) as actual
          FROM opportunities
          WHERE tenant_id = $1 AND owner_id = $2
          AND stage = 'closed_won'
          AND updated_at BETWEEN $3 AND $4
        `;
        break;

      case 'deals':
        query = `
          SELECT COUNT(*) as actual
          FROM opportunities
          WHERE tenant_id = $1 AND owner_id = $2
          AND stage = 'closed_won'
          AND updated_at BETWEEN $3 AND $4
        `;
        break;

      case 'leads':
        query = `
          SELECT COUNT(*) as actual
          FROM leads
          WHERE tenant_id = $1 AND owner_id = $2
          AND status = 'qualified'
          AND updated_at BETWEEN $3 AND $4
        `;
        break;

      case 'activities':
        query = `
          SELECT COUNT(*) as actual
          FROM tasks
          WHERE tenant_id = $1 AND assigned_to = $2
          AND status = 'completed'
          AND updated_at BETWEEN $3 AND $4
        `;
        break;

      default:
        return 0;
    }

    const result = await this.pool.query(query, values);
    return parseFloat(result.value?.rows?.[0]?.actual as string || '0');
  }

  private calculateDaysRemaining(endDate: Date): number {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private calculateForecast(actual: number, startDate: Date, endDate: Date): number {
    const now = new Date();
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (elapsedDays <= 0) return 0;
    if (elapsedDays >= totalDays) return actual;

    const dailyRate = actual / elapsedDays;
    return Math.round(dailyRate * totalDays);
  }

  private calculateTrend(
    actual: number,
    target: number,
    daysRemaining: number
  ): 'up' | 'down' | 'stable' {
    const attainment = target > 0 ? (actual / target) * 100 : 0;
    const expectedAttainment = 100 - (daysRemaining / 30) * 100; // Rough estimate

    if (attainment > expectedAttainment + 5) return 'up';
    if (attainment < expectedAttainment - 5) return 'down';
    return 'stable';
  }

  private calculatePace(
    actual: number,
    target: number,
    startDate: Date,
    endDate: Date
  ): number {
    const now = new Date();
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (elapsedDays <= 0 || totalDays <= 0) return 0;

    const expectedProgress = (elapsedDays / totalDays) * target;
    return expectedProgress > 0 ? (actual / expectedProgress) * 100 : 0;
  }

  private mapRowToQuota(row: Record<string, unknown>): Quota {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as QuotaType,
      period: row.period as QuotaPeriod,
      startDate: new Date(row.start_date as string),
      endDate: new Date(row.end_date as string),
      target: row.target as number,
      currency: row.currency as string,
      status: row.status as QuotaStatus,
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings as QuotaSettings,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToAssignment(row: Record<string, unknown>): QuotaAssignment {
    return {
      id: row.id as string,
      quotaId: row.quota_id as string,
      userId: row.user_id as string | undefined,
      teamId: row.team_id as string | undefined,
      territoryId: row.territory_id as string | undefined,
      target: row.target as number,
      adjustments: [],
      status: row.status as QuotaStatus,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
