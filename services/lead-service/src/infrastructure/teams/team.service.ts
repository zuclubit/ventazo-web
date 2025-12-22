/**
 * Team Service
 * Manages sales teams and organizational structure
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  Team,
  TeamMember,
  TeamHierarchy,
  TeamMemberProfile,
  TeamStats,
  TeamSettings,
  TeamRole,
  TeamType,
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
} from './types';

const DEFAULT_TEAM_SETTINGS: TeamSettings = {
  autoAssignment: true,
  roundRobinEnabled: true,
  maxLeadsPerMember: 50,
  notifications: {
    newLeadAlert: true,
    quotaReminders: true,
    performanceReports: true,
  },
};

@injectable()
export class TeamService {
  constructor(private pool: DatabasePool) {}

  // ==================== Team CRUD ====================

  /**
   * Create a new team
   */
  async createTeam(
    tenantId: string,
    input: CreateTeamInput
  ): Promise<Result<Team>> {
    const settings = { ...DEFAULT_TEAM_SETTINGS, ...input.settings };

    const result = await this.pool.query(`
      INSERT INTO teams (
        tenant_id, name, description, type, parent_team_id, manager_id, settings, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      tenantId,
      input.name,
      input.description || null,
      input.type || 'sales',
      input.parentTeamId || null,
      input.managerId || null,
      JSON.stringify(settings),
      JSON.stringify(input.metadata || {}),
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to create team');
    }

    return Result.ok(this.mapRowToTeam(result.value.rows[0]));
  }

  /**
   * Get team by ID
   */
  async getTeam(tenantId: string, teamId: string): Promise<Result<Team>> {
    const result = await this.pool.query(`
      SELECT * FROM teams
      WHERE id = $1 AND tenant_id = $2
    `, [teamId, tenantId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Team not found');
    }

    return Result.ok(this.mapRowToTeam(result.value.rows[0]));
  }

  /**
   * List teams for a tenant
   */
  async listTeams(
    tenantId: string,
    options: {
      type?: TeamType;
      parentTeamId?: string | null;
      includeInactive?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Result<{ teams: Team[]; total: number }>> {
    let query = `SELECT * FROM teams WHERE tenant_id = $1`;
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.type) {
      query += ` AND type = $${paramIndex++}`;
      values.push(options.type);
    }

    if (options.parentTeamId !== undefined) {
      if (options.parentTeamId === null) {
        query += ` AND parent_team_id IS NULL`;
      } else {
        query += ` AND parent_team_id = $${paramIndex++}`;
        values.push(options.parentTeamId);
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
      return Result.fail(result.error || 'Failed to list teams');
    }

    const teams = (result.value?.rows || []).map((row: Record<string, unknown>) =>
      this.mapRowToTeam(row)
    );

    return Result.ok({ teams, total });
  }

  /**
   * Update a team
   */
  async updateTeam(
    tenantId: string,
    teamId: string,
    input: UpdateTeamInput
  ): Promise<Result<Team>> {
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
    if (input.parentTeamId !== undefined) {
      updates.push(`parent_team_id = $${paramIndex++}`);
      values.push(input.parentTeamId);
    }
    if (input.managerId !== undefined) {
      updates.push(`manager_id = $${paramIndex++}`);
      values.push(input.managerId);
    }
    if (input.settings !== undefined) {
      updates.push(`settings = settings || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(input.settings));
    }
    if (input.metadata !== undefined) {
      updates.push(`metadata = metadata || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(input.metadata));
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(input.isActive);
    }

    if (updates.length === 0) {
      return this.getTeam(tenantId, teamId);
    }

    updates.push(`updated_at = NOW()`);

    values.push(teamId, tenantId);

    const result = await this.pool.query(`
      UPDATE teams
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to update team');
    }

    return Result.ok(this.mapRowToTeam(result.value.rows[0]));
  }

  /**
   * Delete a team (soft delete)
   */
  async deleteTeam(tenantId: string, teamId: string): Promise<Result<void>> {
    const result = await this.pool.query(`
      UPDATE teams
      SET is_active = false, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `, [teamId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to delete team');
    }

    return Result.ok(undefined);
  }

  // ==================== Team Members ====================

  /**
   * Add a member to a team
   */
  async addMember(
    tenantId: string,
    teamId: string,
    input: AddTeamMemberInput
  ): Promise<Result<TeamMember>> {
    // Verify team exists
    const teamResult = await this.getTeam(tenantId, teamId);
    if (teamResult.isFailure) {
      return Result.fail('Team not found');
    }

    const result = await this.pool.query(`
      INSERT INTO team_members (team_id, user_id, role, position)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (team_id, user_id) DO UPDATE
      SET role = $3, position = $4, is_active = true, left_at = NULL, updated_at = NOW()
      RETURNING *
    `, [teamId, input.userId, input.role || 'member', input.position || null]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Failed to add team member');
    }

    return Result.ok(this.mapRowToTeamMember(result.value.rows[0]));
  }

  /**
   * Remove a member from a team
   */
  async removeMember(
    tenantId: string,
    teamId: string,
    userId: string
  ): Promise<Result<void>> {
    // Verify team exists
    const teamResult = await this.getTeam(tenantId, teamId);
    if (teamResult.isFailure) {
      return Result.fail('Team not found');
    }

    await this.pool.query(`
      UPDATE team_members
      SET is_active = false, left_at = NOW(), updated_at = NOW()
      WHERE team_id = $1 AND user_id = $2
    `, [teamId, userId]);

    return Result.ok(undefined);
  }

  /**
   * Update a team member's role
   */
  async updateMemberRole(
    tenantId: string,
    teamId: string,
    userId: string,
    role: TeamRole,
    position?: string
  ): Promise<Result<TeamMember>> {
    // Verify team exists
    const teamResult = await this.getTeam(tenantId, teamId);
    if (teamResult.isFailure) {
      return Result.fail('Team not found');
    }

    const result = await this.pool.query(`
      UPDATE team_members
      SET role = $1, position = COALESCE($2, position), updated_at = NOW()
      WHERE team_id = $3 AND user_id = $4 AND is_active = true
      RETURNING *
    `, [role, position, teamId, userId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail(result.error || 'Team member not found');
    }

    return Result.ok(this.mapRowToTeamMember(result.value.rows[0]));
  }

  /**
   * Get team members
   */
  async getTeamMembers(
    tenantId: string,
    teamId: string,
    includeInactive = false
  ): Promise<Result<TeamMemberProfile[]>> {
    // Verify team exists
    const teamResult = await this.getTeam(tenantId, teamId);
    if (teamResult.isFailure) {
      return Result.fail('Team not found');
    }

    let query = `
      SELECT
        tm.*,
        u.email,
        u.full_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM leads WHERE owner_id = u.id AND tenant_id = $2) as lead_count,
        (SELECT COUNT(*) FROM territory_assignments WHERE user_id = u.id) as territory_count
      FROM team_members tm
      JOIN users u ON u.id = tm.user_id
      WHERE tm.team_id = $1
    `;

    if (!includeInactive) {
      query += ` AND tm.is_active = true`;
    }

    query += ` ORDER BY tm.role DESC, u.full_name ASC`;

    const result = await this.pool.query(query, [teamId, tenantId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get team members');
    }

    const members = (result.value?.rows || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      email: row.email as string,
      fullName: row.full_name as string || '',
      avatarUrl: row.avatar_url as string | undefined,
      role: row.role as TeamRole,
      position: row.position as string | undefined,
      territories: [], // Would need to join territory_assignments
      currentLeadCount: parseInt(row.lead_count as string || '0', 10),
      quotaProgress: 0, // Would need to calculate from quota_assignments
    }));

    return Result.ok(members);
  }

  /**
   * Get teams a user belongs to
   */
  async getUserTeams(
    tenantId: string,
    userId: string
  ): Promise<Result<Array<Team & { role: TeamRole }>>> {
    const result = await this.pool.query(`
      SELECT t.*, tm.role as member_role
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE t.tenant_id = $1 AND tm.user_id = $2 AND tm.is_active = true AND t.is_active = true
      ORDER BY t.name ASC
    `, [tenantId, userId]);

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to get user teams');
    }

    const teams = (result.value?.rows || []).map((row: Record<string, unknown>) => ({
      ...this.mapRowToTeam(row),
      role: row.member_role as TeamRole,
    }));

    return Result.ok(teams);
  }

  // ==================== Team Hierarchy ====================

  /**
   * Get team hierarchy (tree structure)
   */
  async getTeamHierarchy(
    tenantId: string,
    rootTeamId?: string
  ): Promise<Result<TeamHierarchy[]>> {
    // Get all teams
    const teamsResult = await this.listTeams(tenantId, { includeInactive: false });
    if (teamsResult.isFailure || !teamsResult.value) {
      return Result.fail(teamsResult.error || 'Failed to get teams');
    }

    const { teams } = teamsResult.value;

    // Build hierarchy
    const buildHierarchy = async (parentId?: string): Promise<TeamHierarchy[]> => {
      const children = teams.filter((t: Team) => t.parentTeamId === parentId);

      return Promise.all(children.map(async (team: Team) => {
        const membersResult = await this.getTeamMembers(tenantId, team.id);
        const members = membersResult.isSuccess && membersResult.value ? membersResult.value : [];

        const manager = members.find((m: TeamMemberProfile) => m.userId === team.managerId);
        const stats = await this.getTeamStats(tenantId, team.id);

        const subTeams = await buildHierarchy(team.id);

        return {
          team,
          manager,
          members,
          subTeams,
          stats: stats.isSuccess && stats.value ? stats.value : this.getEmptyStats(),
        };
      }));
    };

    const hierarchy = await buildHierarchy(rootTeamId);
    return Result.ok(hierarchy);
  }

  /**
   * Get team statistics
   */
  async getTeamStats(tenantId: string, teamId: string): Promise<Result<TeamStats>> {
    // Get member IDs
    const membersResult = await this.pool.query(`
      SELECT user_id FROM team_members
      WHERE team_id = $1 AND is_active = true
    `, [teamId]);

    const memberIds = (membersResult.value?.rows || []).map(
      (r: Record<string, unknown>) => r.user_id as string
    );

    if (memberIds.length === 0) {
      return Result.ok(this.getEmptyStats());
    }

    // Get aggregate stats
    const statsResult = await this.pool.query(`
      SELECT
        COUNT(DISTINCT l.id) FILTER (WHERE l.status NOT IN ('converted', 'lost')) as active_leads,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage NOT IN ('closed_won', 'closed_lost')) as active_deals,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_won') as won_deals,
        COUNT(DISTINCT o.id) FILTER (WHERE o.stage = 'closed_lost') as lost_deals,
        COALESCE(SUM(o.value) FILTER (WHERE o.stage = 'closed_won'), 0) as total_revenue,
        COALESCE(AVG(o.value) FILTER (WHERE o.stage = 'closed_won'), 0) as avg_deal_size
      FROM users u
      LEFT JOIN leads l ON l.owner_id = u.id AND l.tenant_id = $1
      LEFT JOIN opportunities o ON o.owner_id = u.id AND o.tenant_id = $1
      WHERE u.id = ANY($2::uuid[])
    `, [tenantId, memberIds]);

    const row = statsResult.value?.rows?.[0] || {};
    const wonDeals = parseInt(row.won_deals as string || '0', 10);
    const lostDeals = parseInt(row.lost_deals as string || '0', 10);
    const totalDeals = wonDeals + lostDeals;

    return Result.ok({
      totalMembers: memberIds.length,
      activeDeals: parseInt(row.active_deals as string || '0', 10),
      totalLeads: parseInt(row.active_leads as string || '0', 10),
      quotaAttainment: 0, // Would calculate from quota assignments
      avgDealSize: parseFloat(row.avg_deal_size as string || '0'),
      winRate: totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0,
      avgCycleTime: 0, // Would calculate from opportunity history
    });
  }

  // ==================== Round Robin Assignment ====================

  /**
   * Get next assignee using round robin
   */
  async getNextAssignee(
    tenantId: string,
    teamId: string
  ): Promise<Result<string | null>> {
    // Get team settings
    const teamResult = await this.getTeam(tenantId, teamId);
    if (teamResult.isFailure) {
      return Result.fail('Team not found');
    }

    const team = teamResult.value;
    if (!team || !team.settings.roundRobinEnabled) {
      return Result.ok(null);
    }

    // Get active members ordered by their last assignment
    const result = await this.pool.query(`
      SELECT
        tm.user_id,
        (SELECT COUNT(*) FROM leads WHERE owner_id = tm.user_id AND tenant_id = $1) as lead_count,
        (SELECT MAX(assigned_at) FROM assignment_history WHERE to_user_id = tm.user_id) as last_assigned
      FROM team_members tm
      WHERE tm.team_id = $2 AND tm.is_active = true
      ORDER BY last_assigned ASC NULLS FIRST, lead_count ASC
      LIMIT 1
    `, [tenantId, teamId]);

    if (!result.value?.rows?.[0]) {
      return Result.ok(null);
    }

    const row = result.value.rows[0];
    const leadCount = parseInt(row.lead_count as string || '0', 10);

    // Check if member is at capacity
    if (team.settings?.maxLeadsPerMember && leadCount >= team.settings.maxLeadsPerMember) {
      return Result.ok(null);
    }

    return Result.ok(row.user_id as string);
  }

  // ==================== Helpers ====================

  private mapRowToTeam(row: Record<string, unknown>): Team {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as TeamType,
      parentTeamId: row.parent_team_id as string | undefined,
      managerId: row.manager_id as string | undefined,
      settings: typeof row.settings === 'string'
        ? JSON.parse(row.settings)
        : row.settings as TeamSettings,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToTeamMember(row: Record<string, unknown>): TeamMember {
    return {
      id: row.id as string,
      teamId: row.team_id as string,
      userId: row.user_id as string,
      role: row.role as TeamRole,
      position: row.position as string | undefined,
      joinedAt: new Date(row.joined_at as string),
      leftAt: row.left_at ? new Date(row.left_at as string) : undefined,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private getEmptyStats(): TeamStats {
    return {
      totalMembers: 0,
      activeDeals: 0,
      totalLeads: 0,
      quotaAttainment: 0,
      avgDealSize: 0,
      winRate: 0,
      avgCycleTime: 0,
    };
  }
}
