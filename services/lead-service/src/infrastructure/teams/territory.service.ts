/**
 * Territory Service
 * Manages sales territories and account assignments
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  Territory,
  TerritoryAssignment,
  TerritoryHierarchy,
  TerritoryAssignmentDetail,
  TerritoryStats,
  TerritorySettings,
  TerritoryCriteria,
  TerritoryType,
  TerritoryAssignmentType,
  CreateTerritoryInput,
  UpdateTerritoryInput,
  AssignTerritoryInput,
} from './types';

const DEFAULT_TERRITORY_SETTINGS: TerritorySettings = {
  autoLeadRouting: true,
  allowOverlap: false,
  roundRobinWithinTerritory: true,
  conflictResolution: 'first_assigned',
};

@injectable()
export class TerritoryService {
  constructor(private pool: DatabasePool) {}

  // ==================== Territory CRUD ====================

  /**
   * Create a new territory
   */
  async createTerritory(
    tenantId: string,
    input: CreateTerritoryInput
  ): Promise<Result<Territory>> {
    const settings = { ...DEFAULT_TERRITORY_SETTINGS, ...input.settings };

    const result = await this.pool.query(`
      INSERT INTO territories (
        tenant_id, name, description, type, parent_territory_id, criteria, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      tenantId,
      input.name,
      input.description || null,
      input.type || 'geographic',
      input.parentTerritoryId || null,
      JSON.stringify(input.criteria || {}),
      JSON.stringify(settings),
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to create territory');
    }

    return Result.ok(this.mapRowToTerritory(result.value.rows[0]));
  }

  /**
   * Get territory by ID
   */
  async getTerritory(tenantId: string, territoryId: string): Promise<Result<Territory>> {
    const result = await this.pool.query(`
      SELECT * FROM territories
      WHERE id = $1 AND tenant_id = $2
    `, [territoryId, tenantId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Territory not found');
    }

    // Get assignments
    const assignmentsResult = await this.pool.query(`
      SELECT * FROM territory_assignments
      WHERE territory_id = $1
      AND (end_date IS NULL OR end_date > NOW())
    `, [territoryId]);

    const territory = this.mapRowToTerritory(result.value.rows[0]);
    territory.assignments = (assignmentsResult.value?.rows || []).map(
      (row: Record<string, unknown>) => this.mapRowToAssignment(row)
    );

    return Result.ok(territory);
  }

  /**
   * List territories for a tenant
   */
  async listTerritories(
    tenantId: string,
    options: {
      type?: TerritoryType;
      parentTerritoryId?: string | null;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Result<{ territories: Territory[]; total: number }>> {
    let query = `SELECT * FROM territories WHERE tenant_id = $1`;
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(options.type);
    }

    if (options.parentTerritoryId !== undefined) {
      if (options.parentTerritoryId === null) {
        query += ` AND parent_territory_id IS NULL`;
      } else {
        query += ` AND parent_territory_id = $${paramIndex++}`;
        values.push(options.parentTerritoryId);
      }
    }

    if (!options.includeInactive) {
      query += ` AND is_active = true`;
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM (${query}) as count_query`,
      values
    );
    const total = parseInt(countResult.value?.rows?.[0]?.count || '0', 10);

    // Add pagination
    query += ` ORDER BY name ASC`;
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
      return Result.fail(result.error || 'Failed to list territories');
    }

    const territories = (result.value?.rows || []).map((row: Record<string, unknown>) =>
      this.mapRowToTerritory(row)
    );

    return Result.ok({ territories, total });
  }

  /**
   * Update a territory
   */
  async updateTerritory(
    tenantId: string,
    territoryId: string,
    input: UpdateTerritoryInput
  ): Promise<Result<Territory>> {
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
    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(input.type);
    }
    if (input.parentTerritoryId !== undefined) {
      updates.push(`parent_territory_id = $${paramIndex++}`);
      values.push(input.parentTerritoryId);
    }
    if (input.criteria !== undefined) {
      updates.push(`criteria = $${paramIndex++}`);
      values.push(JSON.stringify(input.criteria));
    }
    if (input.settings !== undefined) {
      updates.push(`settings = settings || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(input.settings));
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return this.getTerritory(tenantId, territoryId);
    }

    updates.push(`updated_at = NOW()`);

    values.push(territoryId, tenantId);

    const result = await this.pool.query(`
      UPDATE territories
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to update territory');
    }

    return Result.ok(this.mapRowToTerritory(result.value.rows[0]));
  }

  /**
   * Delete a territory (soft delete)
   */
  async deleteTerritory(tenantId: string, territoryId: string): Promise<Result<void>> {
    const result = await this.pool.query(`
      UPDATE territories
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [territoryId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to delete territory');
    }

    return Result.ok(undefined);
  }

  // ==================== Territory Assignments ====================

  /**
   * Assign a user/team to a territory
   */
  async assignToTerritory(
    tenantId: string,
    territoryId: string,
    input: AssignTerritoryInput
  ): Promise<Result<TerritoryAssignment>> {
    // Verify territory exists
    const territoryResult = await this.getTerritory(tenantId, territoryId);
    if (territoryResult.isFailure) {
      return Result.fail('Territory not found');
    }

    const territory = territoryResult.value;
    if (!territory) {
      return Result.fail('Territory not found');
    }

    // Check for overlap if not allowed
    if (!territory.settings?.allowOverlap && input.assignmentType === 'exclusive') {
      const existingResult = await this.pool.query(`
        SELECT * FROM territory_assignments
        WHERE territory_id = $1
        AND assignment_type = 'exclusive'
        AND (end_date IS NULL OR end_date > NOW())
      `, [territoryId]);

      if (existingResult.value?.rows && existingResult.value.rows.length > 0) {
        return Result.fail('Territory already has an exclusive assignment');
      }
    }

    const result = await this.pool.query(`
      INSERT INTO territory_assignments (
        territory_id, user_id, team_id, assignment_type, is_primary, start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (territory_id, user_id) DO UPDATE
      SET assignment_type = $4, is_primary = $5, start_date = $6, end_date = $7, updated_at = NOW()
      RETURNING *
    `, [
      territoryId,
      input.userId,
      input.teamId || null,
      input.assignmentType || 'exclusive',
      input.isPrimary || false,
      input.startDate || new Date(),
      input.endDate || null,
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to assign to territory');
    }

    return Result.ok(this.mapRowToAssignment(result.value.rows[0]));
  }

  /**
   * Remove an assignment from a territory
   */
  async removeFromTerritory(
    tenantId: string,
    territoryId: string,
    userId: string
  ): Promise<Result<void>> {
    // Verify territory exists
    const territoryResult = await this.getTerritory(tenantId, territoryId);
    if (territoryResult.isFailure) {
      return Result.fail('Territory not found');
    }

    await this.pool.query(`
      UPDATE territory_assignments
      SET end_date = NOW(), updated_at = NOW()
      WHERE territory_id = $1 AND user_id = $2 AND (end_date IS NULL OR end_date > NOW())
    `, [territoryId, userId]);

    return Result.ok(undefined);
  }

  /**
   * Get territory assignments with user/team details
   */
  async getTerritoryAssignments(
    tenantId: string,
    territoryId: string
  ): Promise<Result<TerritoryAssignmentDetail[]>> {
    // Verify territory exists
    const territoryResult = await this.getTerritory(tenantId, territoryId);
    if (territoryResult.isFailure) {
      return Result.fail('Territory not found');
    }

    const result = await this.pool.query(`
      SELECT
        ta.*,
        u.email as user_email,
        u.full_name as user_full_name,
        u.avatar_url as user_avatar_url,
        t.name as team_name
      FROM territory_assignments ta
      LEFT JOIN users u ON u.id = ta.user_id
      LEFT JOIN teams t ON t.id = ta.team_id
      WHERE ta.territory_id = $1
      AND (ta.end_date IS NULL OR ta.end_date > NOW())
      ORDER BY ta.is_primary DESC, u.full_name ASC
    `, [territoryId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get assignments');
    }

    const assignments = (result.value?.rows || []).map((row: Record<string, unknown>) => ({
      assignment: this.mapRowToAssignment(row),
      user: {
        id: row.user_id as string,
        email: row.user_email as string,
        fullName: row.user_full_name as string || '',
        avatarUrl: row.user_avatar_url as string | undefined,
      },
      team: row.team_id ? {
        id: row.team_id as string,
        name: row.team_name as string,
      } : undefined,
    }));

    return Result.ok(assignments);
  }

  /**
   * Get territories assigned to a user
   */
  async getUserTerritories(
    tenantId: string,
    userId: string
  ): Promise<Result<Territory[]>> {
    const result = await this.pool.query(`
      SELECT t.*
      FROM territories t
      JOIN territory_assignments ta ON ta.territory_id = t.id
      WHERE t.tenant_id = $1
      AND ta.user_id = $2
      AND t.is_active = true
      AND (ta.end_date IS NULL OR ta.end_date > NOW())
      ORDER BY t.name ASC
    `, [tenantId, userId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get user territories');
    }

    const territories = (result.value?.rows || []).map((row: Record<string, unknown>) =>
      this.mapRowToTerritory(row)
    );

    return Result.ok(territories);
  }

  // ==================== Territory Hierarchy ====================

  /**
   * Get territory hierarchy (tree structure)
   */
  async getTerritoryHierarchy(
    tenantId: string,
    rootTerritoryId?: string
  ): Promise<Result<TerritoryHierarchy[]>> {
    // Get all territories
    const territoriesResult = await this.listTerritories(tenantId, { includeInactive: false });
    if (territoriesResult.isFailure || !territoriesResult.value) {
      return Result.fail(territoriesResult.error || 'Failed to get territories');
    }

    const { territories } = territoriesResult.value;

    // Build hierarchy
    const buildHierarchy = async (parentId?: string): Promise<TerritoryHierarchy[]> => {
      const children = territories.filter((t: Territory) => t.parentTerritoryId === parentId);

      return Promise.all(children.map(async (territory: Territory) => {
        const assignmentsResult = await this.getTerritoryAssignments(tenantId, territory.id);
        const assignments = assignmentsResult.isSuccess && assignmentsResult.value ? assignmentsResult.value : [];

        const stats = await this.getTerritoryStats(tenantId, territory.id);

        const subTerritories = await buildHierarchy(territory.id);

        return {
          territory,
          assignments,
          subTerritories,
          stats: stats.isSuccess && stats.value ? stats.value : this.getEmptyStats(),
        };
      }));
    };

    const hierarchy = await buildHierarchy(rootTerritoryId);
    return Result.ok(hierarchy);
  }

  /**
   * Get territory statistics
   */
  async getTerritoryStats(tenantId: string, territoryId: string): Promise<Result<TerritoryStats>> {
    // Get assigned user IDs
    const assignmentsResult = await this.pool.query(`
      SELECT user_id FROM territory_assignments
      WHERE territory_id = $1
      AND (end_date IS NULL OR end_date > NOW())
    `, [territoryId]);

    const userIds = (assignmentsResult.value?.rows || [])
      .map((r: Record<string, unknown>) => r.user_id as string)
      .filter(Boolean);

    if (userIds.length === 0) {
      return Result.ok(this.getEmptyStats());
    }

    // Get aggregate stats
    const statsResult = await this.pool.query(`
      SELECT
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT c.id) as total_accounts,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost')) as open_opportunities,
        COALESCE(SUM(o.value) FILTER (WHERE o.stage = 'closed_won'), 0) as total_revenue
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id AND l.tenant_id = $1
      LEFT JOIN customers c ON c.account_manager_id = u.id AND c.tenant_id = $1
      LEFT JOIN opportunities o ON o.owner_id = u.id AND o.tenant_id = $1
      WHERE u.id = ANY($2::uuid[])
    `, [tenantId, userIds]);

    const row = statsResult.value?.rows?.[0] || {};

    return Result.ok({
      totalAccounts: parseInt(row.total_accounts as string || '0', 10),
      totalLeads: parseInt(row.total_leads as string || '0', 10),
      openOpportunities: parseInt(row.open_opportunities as string || '0', 10),
      revenue: parseFloat(row.total_revenue as string || '0'),
      coverage: 0, // Would calculate based on criteria match
      assignedReps: userIds.length,
    });
  }

  // ==================== Lead Matching ====================

  /**
   * Find matching territory for a lead based on criteria
   */
  async findMatchingTerritory(
    tenantId: string,
    leadData: {
      country?: string;
      state?: string;
      city?: string;
      postalCode?: string;
      industry?: string;
      employeeCount?: number;
      annualRevenue?: number;
    }
  ): Promise<Result<Territory | null>> {
    // Get all active territories with assignments
    const territoriesResult = await this.listTerritories(tenantId, { includeInactive: false });
    if (territoriesResult.isFailure || !territoriesResult.value) {
      return Result.fail(territoriesResult.error || 'Failed to get territories');
    }

    const { territories } = territoriesResult.value;

    // Find matching territory (priority order)
    for (const territory of territories) {
      if (this.matchesCriteria(territory.criteria, leadData)) {
        // Verify territory has active assignments
        const assignmentsResult = await this.getTerritoryAssignments(tenantId, territory.id);
        if (assignmentsResult.isSuccess && assignmentsResult.value && assignmentsResult.value.length > 0) {
          return Result.ok(territory);
        }
      }
    }

    return Result.ok(null);
  }

  /**
   * Get the primary assignee for a territory
   */
  async getPrimaryAssignee(
    tenantId: string,
    territoryId: string
  ): Promise<Result<string | null>> {
    const result = await this.pool.query(`
      SELECT user_id FROM territory_assignments
      WHERE territory_id = $1
      AND is_primary = true
      AND (end_date IS NULL OR end_date > NOW())
      LIMIT 1
    `, [territoryId]);

    if (!result.value?.rows?.[0]) {
      // If no primary, get any assignment
      const anyResult = await this.pool.query(`
        SELECT user_id FROM territory_assignments
        WHERE territory_id = $1
        AND (end_date IS NULL OR end_date > NOW())
        ORDER BY start_date ASC
        LIMIT 1
      `, [territoryId]);

      return Result.ok(anyResult.value?.rows?.[0]?.user_id as string | null);
    }

    return Result.ok(result.value.rows[0].user_id as string);
  }

  // ==================== Helpers ====================

  private matchesCriteria(
    criteria: TerritoryCriteria,
    leadData: {
      country?: string;
      state?: string;
      city?: string;
      postalCode?: string;
      industry?: string;
      employeeCount?: number;
      annualRevenue?: number;
    }
  ): boolean {
    // Check geographic criteria
    if (criteria.geographic) {
      const geo = criteria.geographic;
      if (geo.countries?.length && leadData.country && !geo.countries.includes(leadData.country)) {
        return false;
      }
      if (geo.states?.length && leadData.state && !geo.states.includes(leadData.state)) {
        return false;
      }
      if (geo.cities?.length && leadData.city && !geo.cities.includes(leadData.city)) {
        return false;
      }
      if (geo.postalCodes?.length && leadData.postalCode && !geo.postalCodes.includes(leadData.postalCode)) {
        return false;
      }
    }

    // Check industry criteria
    if (criteria.industry?.length && leadData.industry) {
      if (!criteria.industry.includes(leadData.industry)) {
        return false;
      }
    }

    // Check account size criteria
    if (criteria.accountSize && leadData.employeeCount !== undefined) {
      const size = criteria.accountSize;
      if (size.minEmployees !== undefined && leadData.employeeCount < size.minEmployees) {
        return false;
      }
      if (size.maxEmployees !== undefined && leadData.employeeCount > size.maxEmployees) {
        return false;
      }
    }

    // Check revenue range criteria
    if (criteria.revenueRange && leadData.annualRevenue !== undefined) {
      const range = criteria.revenueRange;
      if (range.minRevenue !== undefined && leadData.annualRevenue < range.minRevenue) {
        return false;
      }
      if (range.maxRevenue !== undefined && leadData.annualRevenue > range.maxRevenue) {
        return false;
      }
    }

    // Check custom rules
    if (criteria.customRules?.length) {
      for (const rule of criteria.customRules) {
        const fieldValue = leadData[rule.field as keyof typeof leadData];
        if (!this.evaluateRule(rule.operator, fieldValue, rule.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateRule(operator: string, fieldValue: unknown, ruleValue: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === ruleValue;
      case 'not_equals':
        return fieldValue !== ruleValue;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(ruleValue as string);
      case 'starts_with':
        return typeof fieldValue === 'string' && fieldValue.startsWith(ruleValue as string);
      case 'ends_with':
        return typeof fieldValue === 'string' && fieldValue.endsWith(ruleValue as string);
      case 'in':
        return Array.isArray(ruleValue) && ruleValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(ruleValue) && !ruleValue.includes(fieldValue);
      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > (ruleValue as number);
      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < (ruleValue as number);
      default:
        return true;
    }
  }

  private mapRowToTerritory(row: Record<string, unknown>): Territory {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as TerritoryType,
      parentTerritoryId: row.parent_territory_id as string | undefined,
      criteria: typeof row.criteria === 'string'
        ? JSON.parse(row.criteria)
        : row.criteria as TerritoryCriteria,
      assignments: [],
      quotas: [],
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings as TerritorySettings,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToAssignment(row: Record<string, unknown>): TerritoryAssignment {
    return {
      id: row.id as string,
      territoryId: row.territory_id as string,
      userId: row.user_id as string,
      teamId: row.team_id as string | undefined,
      assignmentType: row.assignment_type as TerritoryAssignmentType,
      isPrimary: row.is_primary as boolean,
      startDate: new Date(row.start_date as string),
      endDate: row.end_date ? new Date(row.end_date as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private getEmptyStats(): TerritoryStats {
    return {
      totalAccounts: 0,
      totalLeads: 0,
      openOpportunities: 0,
      revenue: 0,
      coverage: 0,
      assignedReps: 0,
    };
  }
}
