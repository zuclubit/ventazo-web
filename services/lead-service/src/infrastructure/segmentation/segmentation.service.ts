/**
 * Customer Segmentation Service
 * Dynamic segmentation engine for targeting and personalization
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { randomUUID } from 'crypto';
import {
  Segment,
  SegmentMember,
  SegmentType,
  SegmentStatus,
  SegmentEntityType,
  SegmentRuleGroup,
  SegmentCondition,
  RuleOperator,
  LogicalOperator,
  CreateSegmentRequest,
  UpdateSegmentRequest,
  SegmentQueryOptions,
  MembershipCheckResult,
  SegmentCalculationResult,
  SegmentOverlap,
  SegmentInsights,
  SegmentMetrics,
  SegmentFieldDefinition,
  SegmentTemplate,
  DEFAULT_SEGMENT_FIELDS,
  DEFAULT_SEGMENT_TEMPLATES,
} from './types';

/**
 * Entity data for rule evaluation
 */
interface EntityData extends Record<string, unknown> {
  id: string;
}

@injectable()
export class SegmentationService {
  private calculationQueue: Map<string, Promise<SegmentCalculationResult>> = new Map();
  private fieldDefinitions: SegmentFieldDefinition[] = DEFAULT_SEGMENT_FIELDS;

  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {}

  // ============ Segment CRUD Operations ============

  /**
   * Create a new segment
   */
  async createSegment(
    tenantId: string,
    userId: string,
    request: CreateSegmentRequest
  ): Promise<Result<Segment>> {
    try {
      const id = randomUUID();
      const now = new Date();

      // Validate rules
      const validationResult = this.validateRules(request.rules);
      if (!validationResult.valid) {
        return Result.fail(new Error(`Invalid segment rules: ${validationResult.error}`));
      }

      const query = `
        INSERT INTO segments (
          id, tenant_id, name, description, type, entity_type, status,
          rules, behavioral_triggers, tags, member_count, refresh_interval_minutes,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.name,
        request.description || null,
        request.type,
        request.entityType,
        'draft',
        JSON.stringify(request.rules),
        JSON.stringify(request.behavioralTriggers || []),
        request.tags || [],
        0,
        request.refreshIntervalMinutes || 60,
        userId,
        now,
        now,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const segment = this.mapRowToSegment(result.getValue().rows[0]);

      // If type is dynamic and status should be active, calculate immediately
      if (request.type === 'dynamic') {
        // Schedule initial calculation
        this.scheduleCalculation(segment.id, tenantId);
      }

      return Result.ok(segment);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create segment'));
    }
  }

  /**
   * Get segment by ID
   */
  async getSegment(tenantId: string, segmentId: string): Promise<Result<Segment | null>> {
    try {
      const query = `
        SELECT * FROM segments
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [segmentId, tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToSegment(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get segment'));
    }
  }

  /**
   * List segments with filtering
   */
  async listSegments(
    tenantId: string,
    options: SegmentQueryOptions = {}
  ): Promise<Result<{ segments: Segment[]; total: number }>> {
    try {
      const {
        status,
        type,
        entityType,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = options;

      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        params.push(type);
      }

      if (entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
      }

      if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const sortColumn = this.getSortColumn(sortBy);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM segments WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(new Error(countResult.error!));
      }
      const total = parseInt(countResult.getValue().rows[0].count, 10);

      // Get paginated results
      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM segments
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const segments = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToSegment(row)
      );

      return Result.ok({ segments, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list segments'));
    }
  }

  /**
   * Update segment
   */
  async updateSegment(
    tenantId: string,
    segmentId: string,
    request: UpdateSegmentRequest
  ): Promise<Result<Segment>> {
    try {
      // Validate rules if provided
      if (request.rules) {
        const validationResult = this.validateRules(request.rules);
        if (!validationResult.valid) {
          return Result.fail(new Error(`Invalid segment rules: ${validationResult.error}`));
        }
      }

      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [segmentId, tenantId];
      let paramIndex = 3;

      if (request.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(request.name);
      }

      if (request.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(request.description);
      }

      if (request.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(request.status);
      }

      if (request.rules !== undefined) {
        setClauses.push(`rules = $${paramIndex++}`);
        params.push(JSON.stringify(request.rules));
      }

      if (request.behavioralTriggers !== undefined) {
        setClauses.push(`behavioral_triggers = $${paramIndex++}`);
        params.push(JSON.stringify(request.behavioralTriggers));
      }

      if (request.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        params.push(request.tags);
      }

      if (request.refreshIntervalMinutes !== undefined) {
        setClauses.push(`refresh_interval_minutes = $${paramIndex++}`);
        params.push(request.refreshIntervalMinutes);
      }

      const query = `
        UPDATE segments
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail(new Error('Segment not found'));
      }

      const segment = this.mapRowToSegment(rows[0]);

      // Recalculate if rules changed and segment is active
      if (request.rules && segment.status === 'active' && segment.type === 'dynamic') {
        this.scheduleCalculation(segment.id, tenantId);
      }

      return Result.ok(segment);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update segment'));
    }
  }

  /**
   * Delete segment
   */
  async deleteSegment(tenantId: string, segmentId: string): Promise<Result<void>> {
    try {
      // Delete members first
      await this.pool.query(
        'DELETE FROM segment_members WHERE segment_id = $1',
        [segmentId]
      );

      // Delete segment
      const query = `
        DELETE FROM segments
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [segmentId, tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete segment'));
    }
  }

  // ============ Segment Calculation ============

  /**
   * Calculate segment membership
   */
  async calculateSegment(
    tenantId: string,
    segmentId: string
  ): Promise<Result<SegmentCalculationResult>> {
    const startTime = Date.now();

    try {
      // Get segment
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      const segment = segmentResult.value;
      const previousCount = segment.memberCount;

      // Get all entities of the segment's entity type
      const entities = await this.getEntitiesForSegment(tenantId, segment.entityType);

      // Evaluate rules for each entity
      const matchingEntityIds: string[] = [];
      for (const entity of entities) {
        const isMatch = this.evaluateRuleGroup(segment.rules, entity);
        if (isMatch) {
          matchingEntityIds.push(entity.id);
        }
      }

      // Get current members
      const currentMembersResult = await this.pool.query(
        'SELECT entity_id FROM segment_members WHERE segment_id = $1',
        [segmentId]
      );

      const currentMemberIds = new Set(
        currentMembersResult.isSuccess
          ? currentMembersResult.getValue().rows.map((r: { entity_id: string }) => r.entity_id)
          : []
      );

      // Calculate additions and removals
      const toAdd = matchingEntityIds.filter(id => !currentMemberIds.has(id));
      const toRemove = Array.from(currentMemberIds).filter(id => !matchingEntityIds.includes(id));

      // Remove old members
      if (toRemove.length > 0) {
        await this.pool.query(
          'DELETE FROM segment_members WHERE segment_id = $1 AND entity_id = ANY($2)',
          [segmentId, toRemove]
        );
      }

      // Add new members
      if (toAdd.length > 0) {
        const insertValues = toAdd.map((entityId, idx) => {
          const offset = idx * 4;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
        }).join(', ');

        const insertParams: unknown[] = [];
        for (const entityId of toAdd) {
          insertParams.push(randomUUID(), segmentId, entityId, segment.entityType);
        }

        if (insertParams.length > 0) {
          await this.pool.query(
            `INSERT INTO segment_members (id, segment_id, entity_id, entity_type) VALUES ${insertValues}`,
            insertParams
          );
        }
      }

      // Update segment member count
      const newCount = matchingEntityIds.length;
      await this.pool.query(
        `UPDATE segments SET member_count = $1, last_calculated_at = NOW() WHERE id = $2`,
        [newCount, segmentId]
      );

      const duration = Date.now() - startTime;

      const result: SegmentCalculationResult = {
        segmentId,
        previousCount,
        newCount,
        added: toAdd.length,
        removed: toRemove.length,
        duration,
        timestamp: new Date(),
      };

      return Result.ok(result);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to calculate segment'));
    }
  }

  /**
   * Schedule segment calculation (debounced)
   */
  private scheduleCalculation(segmentId: string, tenantId: string): void {
    // Check if calculation is already in progress
    if (this.calculationQueue.has(segmentId)) {
      return;
    }

    const calculation = this.calculateSegment(tenantId, segmentId)
      .finally(() => {
        this.calculationQueue.delete(segmentId);
      });

    this.calculationQueue.set(segmentId, calculation as Promise<SegmentCalculationResult>);
  }

  /**
   * Recalculate all active dynamic segments
   */
  async recalculateAllSegments(tenantId: string): Promise<Result<SegmentCalculationResult[]>> {
    try {
      const query = `
        SELECT id FROM segments
        WHERE tenant_id = $1 AND type = 'dynamic' AND status = 'active'
      `;

      const result = await this.pool.query(query, [tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const results: SegmentCalculationResult[] = [];
      for (const row of result.getValue().rows) {
        const calcResult = await this.calculateSegment(tenantId, row.id);
        if (calcResult.isSuccess && calcResult.value) {
          results.push(calcResult.value);
        }
      }

      return Result.ok(results);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to recalculate segments'));
    }
  }

  // ============ Membership Operations ============

  /**
   * Check if entity is member of segment
   */
  async checkMembership(
    tenantId: string,
    segmentId: string,
    entityId: string
  ): Promise<Result<MembershipCheckResult>> {
    try {
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      const segment = segmentResult.value;

      // For static segments, just check membership table
      if (segment.type === 'static') {
        const memberResult = await this.pool.query(
          'SELECT * FROM segment_members WHERE segment_id = $1 AND entity_id = $2',
          [segmentId, entityId]
        );

        return Result.ok({
          entityId,
          isMember: memberResult.isSuccess && memberResult.getValue().rows.length > 0,
        });
      }

      // For dynamic segments, evaluate rules
      const entity = await this.getEntity(tenantId, segment.entityType, entityId);
      if (!entity) {
        return Result.ok({
          entityId,
          isMember: false,
          reason: 'Entity not found',
        });
      }

      const isMember = this.evaluateRuleGroup(segment.rules, entity);
      const matchedRules = isMember ? this.getMatchedConditionIds(segment.rules, entity) : [];

      return Result.ok({
        entityId,
        isMember,
        matchedRules,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to check membership'));
    }
  }

  /**
   * Get segment members
   */
  async getSegmentMembers(
    tenantId: string,
    segmentId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<Result<{ members: SegmentMember[]; total: number }>> {
    try {
      // Verify segment belongs to tenant
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      const countResult = await this.pool.query(
        'SELECT COUNT(*) FROM segment_members WHERE segment_id = $1',
        [segmentId]
      );

      const total = countResult.isSuccess
        ? parseInt(countResult.getValue().rows[0].count, 10)
        : 0;

      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM segment_members
        WHERE segment_id = $1
        ORDER BY added_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.pool.query(query, [segmentId, limit, offset]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const members = result.getValue().rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        segmentId: row.segment_id as string,
        entityId: row.entity_id as string,
        entityType: row.entity_type as SegmentEntityType,
        score: row.score as number | undefined,
        addedAt: new Date(row.added_at as string),
        addedBy: row.added_by as string | undefined,
        expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
        metadata: row.metadata as Record<string, unknown> | undefined,
      }));

      return Result.ok({ members, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get segment members'));
    }
  }

  /**
   * Add member to static segment
   */
  async addMember(
    tenantId: string,
    segmentId: string,
    entityId: string,
    userId: string
  ): Promise<Result<SegmentMember>> {
    try {
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      if (segmentResult.value.type !== 'static') {
        return Result.fail(new Error('Can only manually add members to static segments'));
      }

      const id = randomUUID();
      const query = `
        INSERT INTO segment_members (id, segment_id, entity_id, entity_type, added_by, added_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (segment_id, entity_id) DO NOTHING
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        segmentId,
        entityId,
        segmentResult.value.entityType,
        userId,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      // Update member count
      await this.pool.query(
        `UPDATE segments SET member_count = member_count + 1 WHERE id = $1`,
        [segmentId]
      );

      const row = result.getValue().rows[0];
      return Result.ok({
        id: row.id,
        segmentId: row.segment_id,
        entityId: row.entity_id,
        entityType: row.entity_type,
        addedAt: new Date(row.added_at),
        addedBy: row.added_by,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add member'));
    }
  }

  /**
   * Remove member from static segment
   */
  async removeMember(
    tenantId: string,
    segmentId: string,
    entityId: string
  ): Promise<Result<void>> {
    try {
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      if (segmentResult.value.type !== 'static') {
        return Result.fail(new Error('Can only manually remove members from static segments'));
      }

      await this.pool.query(
        'DELETE FROM segment_members WHERE segment_id = $1 AND entity_id = $2',
        [segmentId, entityId]
      );

      // Update member count
      await this.pool.query(
        `UPDATE segments SET member_count = GREATEST(0, member_count - 1) WHERE id = $1`,
        [segmentId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to remove member'));
    }
  }

  // ============ Analysis & Insights ============

  /**
   * Get segment overlap between two segments
   */
  async getSegmentOverlap(
    tenantId: string,
    segmentAId: string,
    segmentBId: string
  ): Promise<Result<SegmentOverlap>> {
    try {
      // Get both segments
      const [segmentAResult, segmentBResult] = await Promise.all([
        this.getSegment(tenantId, segmentAId),
        this.getSegment(tenantId, segmentBId),
      ]);

      if (segmentAResult.isFailure || !segmentAResult.value ||
          segmentBResult.isFailure || !segmentBResult.value) {
        return Result.fail(new Error('One or both segments not found'));
      }

      const segmentA = segmentAResult.value;
      const segmentB = segmentBResult.value;

      // Calculate overlap
      const overlapQuery = `
        SELECT COUNT(DISTINCT a.entity_id) as overlap_count
        FROM segment_members a
        INNER JOIN segment_members b ON a.entity_id = b.entity_id
        WHERE a.segment_id = $1 AND b.segment_id = $2
      `;

      const overlapResult = await this.pool.query(overlapQuery, [segmentAId, segmentBId]);
      const overlapCount = overlapResult.isSuccess
        ? parseInt(overlapResult.getValue().rows[0].overlap_count, 10)
        : 0;

      return Result.ok({
        segmentAId,
        segmentBId,
        segmentAName: segmentA.name,
        segmentBName: segmentB.name,
        segmentACount: segmentA.memberCount,
        segmentBCount: segmentB.memberCount,
        overlapCount,
        overlapPercentageA: segmentA.memberCount > 0
          ? (overlapCount / segmentA.memberCount) * 100
          : 0,
        overlapPercentageB: segmentB.memberCount > 0
          ? (overlapCount / segmentB.memberCount) * 100
          : 0,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to calculate overlap'));
    }
  }

  /**
   * Get segment insights
   */
  async getSegmentInsights(
    tenantId: string,
    segmentId: string
  ): Promise<Result<SegmentInsights>> {
    try {
      const segmentResult = await this.getSegment(tenantId, segmentId);
      if (segmentResult.isFailure || !segmentResult.value) {
        return Result.fail(new Error('Segment not found'));
      }

      const segment = segmentResult.value;

      // Get trend data (last 30 days)
      const trendQuery = `
        SELECT DATE(added_at) as date, COUNT(*) as count
        FROM segment_members
        WHERE segment_id = $1 AND added_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(added_at)
        ORDER BY date ASC
      `;

      const trendResult = await this.pool.query(trendQuery, [segmentId]);
      const trends = trendResult.isSuccess
        ? trendResult.getValue().rows.map((r: { date: string; count: string }) => ({
            date: new Date(r.date),
            count: parseInt(r.count, 10),
          }))
        : [];

      // Calculate growth rate
      const thirtyDaysAgo = await this.pool.query(
        `SELECT COUNT(*) FROM segment_members WHERE segment_id = $1 AND added_at < NOW() - INTERVAL '30 days'`,
        [segmentId]
      );
      const previousCount = thirtyDaysAgo.isSuccess
        ? parseInt(thirtyDaysAgo.getValue().rows[0].count, 10)
        : 0;

      const growthRate = previousCount > 0
        ? ((segment.memberCount - previousCount) / previousCount) * 100
        : 0;

      return Result.ok({
        segmentId,
        memberCount: segment.memberCount,
        growthRate,
        topAttributes: [], // Would need to query actual entity data
        behaviorMetrics: {
          avgEngagementScore: 0,
          avgDealValue: 0,
          conversionRate: 0,
        },
        trends,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get insights'));
    }
  }

  /**
   * Get segmentation metrics
   */
  async getMetrics(tenantId: string): Promise<Result<SegmentMetrics>> {
    try {
      const metricsQuery = `
        SELECT
          COUNT(*) as total_segments,
          COUNT(*) FILTER (WHERE status = 'active') as active_segments,
          SUM(member_count) as total_members,
          AVG(member_count) as avg_members
        FROM segments
        WHERE tenant_id = $1
      `;

      const result = await this.pool.query(metricsQuery, [tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const row = result.getValue().rows[0];

      // Get counts by type
      const byTypeQuery = `
        SELECT type, COUNT(*) as count
        FROM segments
        WHERE tenant_id = $1
        GROUP BY type
      `;
      const typeResult = await this.pool.query(byTypeQuery, [tenantId]);
      const byType: Record<SegmentType, number> = {
        static: 0,
        dynamic: 0,
        predictive: 0,
        behavioral: 0,
      };
      if (typeResult.isSuccess) {
        for (const r of typeResult.getValue().rows) {
          byType[r.type as SegmentType] = parseInt(r.count, 10);
        }
      }

      // Get counts by entity type
      const byEntityQuery = `
        SELECT entity_type, COUNT(*) as count
        FROM segments
        WHERE tenant_id = $1
        GROUP BY entity_type
      `;
      const entityResult = await this.pool.query(byEntityQuery, [tenantId]);
      const byEntityType: Record<SegmentEntityType, number> = {
        lead: 0,
        contact: 0,
        customer: 0,
        opportunity: 0,
        account: 0,
      };
      if (entityResult.isSuccess) {
        for (const r of entityResult.getValue().rows) {
          byEntityType[r.entity_type as SegmentEntityType] = parseInt(r.count, 10);
        }
      }

      return Result.ok({
        totalSegments: parseInt(row.total_segments || '0', 10),
        activeSegments: parseInt(row.active_segments || '0', 10),
        totalMembers: parseInt(row.total_members || '0', 10),
        avgMembersPerSegment: parseFloat(row.avg_members || '0'),
        calculationsToday: 0,
        avgCalculationTime: 0,
        byType,
        byEntityType,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get metrics'));
    }
  }

  // ============ Templates & Field Definitions ============

  /**
   * Get available field definitions
   */
  getFieldDefinitions(entityType?: SegmentEntityType): SegmentFieldDefinition[] {
    if (entityType) {
      return this.fieldDefinitions.filter(f => f.entityTypes.includes(entityType));
    }
    return this.fieldDefinitions;
  }

  /**
   * Get segment templates
   */
  getTemplates(entityType?: SegmentEntityType): SegmentTemplate[] {
    if (entityType) {
      return DEFAULT_SEGMENT_TEMPLATES.filter(t => t.entityType === entityType);
    }
    return DEFAULT_SEGMENT_TEMPLATES;
  }

  /**
   * Create segment from template
   */
  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    name?: string
  ): Promise<Result<Segment>> {
    const template = DEFAULT_SEGMENT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return Result.fail(new Error('Template not found'));
    }

    return this.createSegment(tenantId, userId, {
      name: name || template.name,
      description: template.description,
      type: 'dynamic',
      entityType: template.entityType,
      rules: template.rules,
      tags: [template.category],
    });
  }

  // ============ Rule Evaluation Engine ============

  /**
   * Evaluate a rule group against entity data
   */
  private evaluateRuleGroup(group: SegmentRuleGroup, entity: EntityData): boolean {
    const conditionResults = group.conditions.map(c => this.evaluateCondition(c, entity));
    const nestedResults = (group.groups || []).map(g => this.evaluateRuleGroup(g, entity));

    const allResults = [...conditionResults, ...nestedResults];

    if (group.operator === 'AND') {
      return allResults.every(r => r);
    } else {
      return allResults.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: SegmentCondition, entity: EntityData): boolean {
    const fieldValue = this.getNestedValue(entity, condition.field);
    const { operator, value, secondValue, fieldType } = condition;

    switch (operator) {
      case 'equals':
        return this.compareValues(fieldValue, value, fieldType) === 0;

      case 'not_equals':
        return this.compareValues(fieldValue, value, fieldType) !== 0;

      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        return String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());

      case 'not_contains':
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        return !String(fieldValue || '').toLowerCase().includes(String(value).toLowerCase());

      case 'starts_with':
        return String(fieldValue || '').toLowerCase().startsWith(String(value).toLowerCase());

      case 'ends_with':
        return String(fieldValue || '').toLowerCase().endsWith(String(value).toLowerCase());

      case 'greater_than':
        return this.compareValues(fieldValue, value, fieldType) > 0;

      case 'less_than':
        return this.compareValues(fieldValue, value, fieldType) < 0;

      case 'greater_or_equal':
        return this.compareValues(fieldValue, value, fieldType) >= 0;

      case 'less_or_equal':
        return this.compareValues(fieldValue, value, fieldType) <= 0;

      case 'between':
        return this.compareValues(fieldValue, value, fieldType) >= 0 &&
               this.compareValues(fieldValue, secondValue, fieldType) <= 0;

      case 'not_between':
        return this.compareValues(fieldValue, value, fieldType) < 0 ||
               this.compareValues(fieldValue, secondValue, fieldType) > 0;

      case 'in':
        if (Array.isArray(value)) {
          return value.some(v => this.compareValues(fieldValue, v, fieldType) === 0);
        }
        return false;

      case 'not_in':
        if (Array.isArray(value)) {
          return !value.some(v => this.compareValues(fieldValue, v, fieldType) === 0);
        }
        return true;

      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '' ||
               (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '' &&
               (!Array.isArray(fieldValue) || fieldValue.length > 0);

      case 'is_true':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'is_false':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      case 'date_before':
        return this.compareDates(fieldValue, value) < 0;

      case 'date_after':
        return this.compareDates(fieldValue, value) > 0;

      case 'date_between':
        return this.compareDates(fieldValue, value) >= 0 &&
               this.compareDates(fieldValue, secondValue) <= 0;

      case 'days_ago':
        const daysAgo = this.getDaysAgo(fieldValue);
        return daysAgo !== null && daysAgo >= (value as number);

      case 'days_from_now':
        const daysFromNow = this.getDaysFromNow(fieldValue);
        return daysFromNow !== null && daysFromNow <= (value as number);

      case 'regex_match':
        try {
          const regex = new RegExp(String(value), 'i');
          return regex.test(String(fieldValue || ''));
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Compare values based on type
   */
  private compareValues(a: unknown, b: unknown, fieldType: string): number {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
    if (b === null || b === undefined) return 1;

    if (fieldType === 'number') {
      return Number(a) - Number(b);
    }

    if (fieldType === 'date' || fieldType === 'datetime') {
      return this.compareDates(a, b);
    }

    return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
  }

  /**
   * Compare dates
   */
  private compareDates(a: unknown, b: unknown): number {
    const dateA = a instanceof Date ? a : new Date(String(a));
    const dateB = b instanceof Date ? b : new Date(String(b));
    return dateA.getTime() - dateB.getTime();
  }

  /**
   * Get days ago from date
   */
  private getDaysAgo(value: unknown): number | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days from now to date
   */
  private getDaysFromNow(value: unknown): number | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) return null;
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get matched condition IDs
   */
  private getMatchedConditionIds(group: SegmentRuleGroup, entity: EntityData): string[] {
    const matched: string[] = [];

    for (const condition of group.conditions) {
      if (this.evaluateCondition(condition, entity)) {
        matched.push(condition.id);
      }
    }

    for (const nestedGroup of group.groups || []) {
      matched.push(...this.getMatchedConditionIds(nestedGroup, entity));
    }

    return matched;
  }

  /**
   * Validate segment rules
   */
  private validateRules(rules: SegmentRuleGroup): { valid: boolean; error?: string } {
    if (!rules.id || !rules.operator) {
      return { valid: false, error: 'Rule group must have id and operator' };
    }

    if (!['AND', 'OR'].includes(rules.operator)) {
      return { valid: false, error: 'Invalid operator' };
    }

    if (!rules.conditions || !Array.isArray(rules.conditions)) {
      return { valid: false, error: 'Conditions must be an array' };
    }

    for (const condition of rules.conditions) {
      if (!condition.id || !condition.field || !condition.operator) {
        return { valid: false, error: 'Each condition must have id, field, and operator' };
      }
    }

    for (const group of rules.groups || []) {
      const result = this.validateRules(group);
      if (!result.valid) {
        return result;
      }
    }

    return { valid: true };
  }

  // ============ Helper Methods ============

  /**
   * Get entities for segment calculation
   */
  private async getEntitiesForSegment(
    tenantId: string,
    entityType: SegmentEntityType
  ): Promise<EntityData[]> {
    const tableMap: Record<SegmentEntityType, string> = {
      lead: 'leads',
      contact: 'contacts',
      customer: 'customers',
      opportunity: 'opportunities',
      account: 'accounts',
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      return [];
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM ${tableName} WHERE tenant_id = $1`,
        [tenantId]
      );

      if (result.isFailure) {
        return [];
      }

      return result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToEntityData(row)
      );
    } catch {
      return [];
    }
  }

  /**
   * Get single entity
   */
  private async getEntity(
    tenantId: string,
    entityType: SegmentEntityType,
    entityId: string
  ): Promise<EntityData | null> {
    const tableMap: Record<SegmentEntityType, string> = {
      lead: 'leads',
      contact: 'contacts',
      customer: 'customers',
      opportunity: 'opportunities',
      account: 'accounts',
    };

    const tableName = tableMap[entityType];
    if (!tableName) {
      return null;
    }

    try {
      const result = await this.pool.query(
        `SELECT * FROM ${tableName} WHERE id = $1 AND tenant_id = $2`,
        [entityId, tenantId]
      );

      if (result.isFailure || result.getValue().rows.length === 0) {
        return null;
      }

      return this.mapRowToEntityData(result.getValue().rows[0]);
    } catch {
      return null;
    }
  }

  /**
   * Map DB row to entity data
   */
  private mapRowToEntityData(row: Record<string, unknown>): EntityData {
    const entity: EntityData = { id: row.id as string };

    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      entity[camelKey] = value;
    }

    return entity;
  }

  /**
   * Map DB row to Segment
   */
  private mapRowToSegment(row: Record<string, unknown>): Segment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as SegmentType,
      entityType: row.entity_type as SegmentEntityType,
      status: row.status as SegmentStatus,
      rules: typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules as SegmentRuleGroup,
      behavioralTriggers: row.behavioral_triggers
        ? (typeof row.behavioral_triggers === 'string'
            ? JSON.parse(row.behavioral_triggers)
            : row.behavioral_triggers)
        : undefined,
      tags: row.tags as string[] | undefined,
      memberCount: row.member_count as number,
      lastCalculatedAt: row.last_calculated_at
        ? new Date(row.last_calculated_at as string)
        : undefined,
      refreshIntervalMinutes: row.refresh_interval_minutes as number | undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Get sort column name
   */
  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'name',
      memberCount: 'member_count',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };
    return columnMap[sortBy] || 'created_at';
  }
}

/**
 * Create segmentation service instance
 */
export function createSegmentationService(pool: DatabasePool): SegmentationService {
  return new SegmentationService(pool);
}
