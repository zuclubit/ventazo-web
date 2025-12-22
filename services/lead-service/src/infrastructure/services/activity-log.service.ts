/**
 * Activity Log Service
 * Records all significant actions for audit trail
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';

/**
 * Entity types that can be logged
 */
export type EntityType = 'lead' | 'customer' | 'user' | 'tenant' | 'membership';

/**
 * Actions that can be performed
 */
export type ActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'score_changed'
  | 'assigned'
  | 'qualified'
  | 'converted'
  | 'follow_up_scheduled'
  | 'invited'
  | 'accepted'
  | 'deactivated'
  | 'reactivated';

/**
 * Activity log entry structure
 */
export interface ActivityLogEntry {
  id: string;
  tenantId: string;
  userId: string | null;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  changes: Record<string, { before: unknown; after: unknown }>;
  metadata: {
    ip?: string;
    userAgent?: string;
    correlationId?: string;
    [key: string]: unknown;
  };
  createdAt: Date;
}

/**
 * Input for creating activity log
 */
export interface CreateActivityLogInput {
  tenantId: string;
  userId?: string | null;
  entityType: EntityType;
  entityId: string;
  action: ActionType;
  changes?: Record<string, { before: unknown; after: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Query options for fetching activity logs
 */
export interface ActivityLogQueryOptions {
  tenantId: string;
  entityType?: EntityType;
  entityId?: string;
  userId?: string;
  action?: ActionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Activity Log Service Interface
 */
export interface IActivityLogService {
  log(input: CreateActivityLogInput): Promise<Result<ActivityLogEntry>>;
  getByEntity(tenantId: string, entityType: EntityType, entityId: string): Promise<Result<ActivityLogEntry[]>>;
  query(options: ActivityLogQueryOptions): Promise<Result<{ items: ActivityLogEntry[]; total: number }>>;
}

/**
 * Activity Log Service Implementation
 */
@injectable()
export class ActivityLogService implements IActivityLogService {
  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {}

  /**
   * Log an activity
   */
  async log(input: CreateActivityLogInput): Promise<Result<ActivityLogEntry>> {
    const id = uuidv4();
    const createdAt = new Date();

    const sql = `
      INSERT INTO activity_logs (id, tenant_id, user_id, entity_type, entity_id, action, changes, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      id,
      input.tenantId,
      input.userId || null,
      input.entityType,
      input.entityId,
      input.action,
      JSON.stringify(input.changes || {}),
      JSON.stringify(input.metadata || {}),
      createdAt,
    ];

    const result = await this.pool.query(sql, values);

    if (result.isFailure) {
      return Result.fail(`Failed to create activity log: ${result.error}`);
    }

    const row = result.getValue().rows[0];
    return Result.ok(this.mapRowToEntry(row));
  }

  /**
   * Get activity logs for a specific entity
   */
  async getByEntity(
    tenantId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<Result<ActivityLogEntry[]>> {
    const sql = `
      SELECT * FROM activity_logs
      WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY created_at DESC
    `;

    const result = await this.pool.query(sql, [tenantId, entityType, entityId]);

    if (result.isFailure) {
      return Result.fail(`Failed to fetch activity logs: ${result.error}`);
    }

    const entries = result.getValue().rows.map((row) => this.mapRowToEntry(row));
    return Result.ok(entries);
  }

  /**
   * Query activity logs with filters
   */
  async query(
    options: ActivityLogQueryOptions
  ): Promise<Result<{ items: ActivityLogEntry[]; total: number }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [options.tenantId];
    let paramIndex = 2;

    if (options.entityType) {
      conditions.push(`entity_type = $${paramIndex}`);
      values.push(options.entityType);
      paramIndex++;
    }

    if (options.entityId) {
      conditions.push(`entity_id = $${paramIndex}`);
      values.push(options.entityId);
      paramIndex++;
    }

    if (options.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(options.userId);
      paramIndex++;
    }

    if (options.action) {
      conditions.push(`action = $${paramIndex}`);
      values.push(options.action);
      paramIndex++;
    }

    if (options.startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      values.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      values.push(options.endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM activity_logs WHERE ${whereClause}`;
    const countResult = await this.pool.query(countSql, values);

    if (countResult.isFailure) {
      return Result.fail(`Failed to count activity logs: ${countResult.error}`);
    }

    const total = parseInt(countResult.getValue().rows[0].total, 10);

    // Get paginated results
    const sql = `
      SELECT * FROM activity_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(sql, values);

    if (result.isFailure) {
      return Result.fail(`Failed to fetch activity logs: ${result.error}`);
    }

    const items = result.getValue().rows.map((row) => this.mapRowToEntry(row));
    return Result.ok({ items, total });
  }

  /**
   * Map database row to ActivityLogEntry
   */
  private mapRowToEntry(row: Record<string, unknown>): ActivityLogEntry {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string | null,
      entityType: row.entity_type as EntityType,
      entityId: row.entity_id as string,
      action: row.action as ActionType,
      changes: row.changes as Record<string, { before: unknown; after: unknown }>,
      metadata: row.metadata as ActivityLogEntry['metadata'],
      createdAt: new Date(row.created_at as string),
    };
  }
}

/**
 * Helper function to compute changes between two objects
 */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeValue = before[key];
    const afterValue = after[key];

    // Skip if values are the same (simple comparison)
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    changes[key] = { before: beforeValue, after: afterValue };
  }

  return changes;
}
