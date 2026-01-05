/**
 * Optimistic Locking Service
 * Version-based concurrency control implementation
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  Versionable,
  OptimisticLockOptions,
  LockConflict,
  LockResult,
  VersionedUpdate,
  VersionMetadata,
  VersionHistoryEntry,
  EntityLockConfig,
  LockMetrics,
  ConcurrentUpdateError,
  StaleDataError,
  DEFAULT_LOCK_CONFIG,
  calculateChanges,
  hasConflictingChanges,
  mergeChanges,
  generateVersionChecksum,
} from './types';

/**
 * Default options
 */
const DEFAULT_OPTIONS: OptimisticLockOptions = {
  retry: {
    maxAttempts: 3,
    delayMs: 100,
    backoffMultiplier: 2,
  },
  mergeStrategy: 'fail',
  throwOnConflict: true,
};

@injectable()
export class OptimisticLockService {
  private entityConfigs: Map<string, EntityLockConfig> = new Map();
  private metricsBuffer: LockMetrics = {
    totalUpdates: 0,
    successfulUpdates: 0,
    conflictCount: 0,
    retryCount: 0,
    avgRetries: 0,
    conflictRate: 0,
    byEntity: {},
  };

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  /**
   * Register an entity for optimistic locking
   */
  registerEntity(config: EntityLockConfig): void {
    this.entityConfigs.set(config.entityType, {
      ...DEFAULT_LOCK_CONFIG,
      ...config,
    });
  }

  /**
   * Get version of an entity
   */
  async getVersion(
    entityType: string,
    entityId: string
  ): Promise<Result<VersionMetadata | null>> {
    const config = this.entityConfigs.get(entityType);
    if (!config) {
      return Result.fail(new Error(`Entity type ${entityType} not registered for locking`));
    }

    try {
      const query = `
        SELECT
          ${config.versionColumn} as version,
          created_at,
          ${config.updatedAtColumn} as updated_at
          ${config.updatedByColumn ? `, ${config.updatedByColumn} as updated_by` : ''}
        FROM ${config.tableName}
        WHERE id = $1
      `;

      const result = await this.pool.query(query, [entityId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      const row = rows[0];
      return Result.ok({
        version: row.version,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        updatedBy: row.updated_by,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get version'));
    }
  }

  /**
   * Update with optimistic locking
   */
  async updateWithLock<T extends Versionable>(
    entityType: string,
    update: VersionedUpdate<T>,
    options?: OptimisticLockOptions
  ): Promise<LockResult<T>> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const config = this.entityConfigs.get(entityType);

    if (!config) {
      throw new Error(`Entity type ${entityType} not registered for locking`);
    }

    this.metricsBuffer.totalUpdates++;
    this.initEntityMetrics(entityType);
    this.metricsBuffer.byEntity[entityType].updates++;

    let attempt = 0;
    let lastConflict: LockConflict<T> | undefined;

    while (attempt < (opts.retry?.maxAttempts || 1)) {
      attempt++;

      if (attempt > 1) {
        this.metricsBuffer.retryCount++;
        this.metricsBuffer.byEntity[entityType].retries++;

        // Wait before retry with backoff
        const delay = (opts.retry?.delayMs || 100) *
          Math.pow(opts.retry?.backoffMultiplier || 2, attempt - 2);
        await this.sleep(delay);
      }

      const result = await this.attemptUpdate<T>(entityType, update, config);

      if (result.success) {
        this.metricsBuffer.successfulUpdates++;
        this.updateMetricsAverage();
        return {
          success: true,
          data: result.data,
          retryCount: attempt - 1,
        };
      }

      lastConflict = result.conflict;

      // Try merge strategy if configured
      if (opts.mergeStrategy === 'merge' && lastConflict) {
        const mergeResult = await this.attemptMerge<T>(
          entityType,
          update,
          lastConflict,
          config
        );

        if (mergeResult.success) {
          this.metricsBuffer.successfulUpdates++;
          this.updateMetricsAverage();
          return {
            success: true,
            data: mergeResult.data,
            retryCount: attempt - 1,
          };
        }
      }

      // Last write wins strategy
      if (opts.mergeStrategy === 'last_write_wins' && lastConflict) {
        const overwriteResult = await this.forceUpdate<T>(
          entityType,
          update,
          lastConflict.actualVersion,
          config
        );

        if (overwriteResult.success) {
          this.metricsBuffer.successfulUpdates++;
          this.updateMetricsAverage();
          return {
            success: true,
            data: overwriteResult.data,
            retryCount: attempt - 1,
          };
        }
      }
    }

    // All attempts failed
    this.metricsBuffer.conflictCount++;
    this.metricsBuffer.byEntity[entityType].conflicts++;
    this.updateMetricsAverage();

    if (opts.throwOnConflict && lastConflict) {
      throw new ConcurrentUpdateError(
        entityType,
        update.id,
        update.version,
        lastConflict.actualVersion,
        lastConflict
      );
    }

    return {
      success: false,
      conflict: lastConflict,
      retryCount: attempt - 1,
    };
  }

  /**
   * Attempt a single update
   */
  private async attemptUpdate<T extends Versionable>(
    entityType: string,
    update: VersionedUpdate<T>,
    config: EntityLockConfig
  ): Promise<{ success: boolean; data?: T; conflict?: LockConflict<T> }> {
    try {
      // Build SET clause
      const setClauses: string[] = [];
      const values: unknown[] = [update.id, update.version];
      let paramIndex = 3;

      for (const [key, value] of Object.entries(update.changes)) {
        if (key === 'version' || key === 'id') continue;

        // Convert camelCase to snake_case for DB
        const columnName = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${columnName} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      // Always increment version and update timestamp
      setClauses.push(`${config.versionColumn} = ${config.versionColumn} + 1`);
      setClauses.push(`${config.updatedAtColumn} = NOW()`);

      if (config.updatedByColumn && update.updatedBy) {
        setClauses.push(`${config.updatedByColumn} = $${paramIndex}`);
        values.push(update.updatedBy);
        paramIndex++;
      }

      const query = `
        UPDATE ${config.tableName}
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND ${config.versionColumn} = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (result.isFailure) {
        throw new Error(result.error!);
      }

      const rows = result.getValue().rows;

      if (rows.length === 0) {
        // Version mismatch - get current state
        const currentResult = await this.pool.query(
          `SELECT * FROM ${config.tableName} WHERE id = $1`,
          [update.id]
        );

        if (currentResult.isFailure || currentResult.getValue().rows.length === 0) {
          throw new Error('Entity not found');
        }

        const currentData = this.mapRowToEntity<T>(currentResult.getValue().rows[0]);

        return {
          success: false,
          conflict: {
            entityType,
            entityId: update.id,
            expectedVersion: update.version,
            actualVersion: currentData.version,
            yourChanges: update.changes,
            currentData,
            lastModifiedBy: (currentData as any).updatedBy,
            lastModifiedAt: currentData.updatedAt,
          },
        };
      }

      return {
        success: true,
        data: this.mapRowToEntity<T>(rows[0]),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Attempt to merge changes
   */
  private async attemptMerge<T extends Versionable>(
    entityType: string,
    update: VersionedUpdate<T>,
    conflict: LockConflict<T>,
    config: EntityLockConfig
  ): Promise<{ success: boolean; data?: T }> {
    // Get the base version (the version we started from)
    const baseResult = await this.getEntityAtVersion<T>(
      config.tableName,
      update.id,
      update.version
    );

    if (!baseResult) {
      // Can't get base - fall back to simple merge
      const yourChangedFields = calculateChanges(
        conflict.currentData as Record<string, unknown>,
        update.changes as Record<string, unknown>
      );
      const theirChangedFields = calculateChanges(
        { version: update.version } as Record<string, unknown>,
        conflict.currentData as Record<string, unknown>
      );

      if (hasConflictingChanges(yourChangedFields, theirChangedFields)) {
        return { success: false };
      }

      // Apply your changes on top of current
      const mergedUpdate: VersionedUpdate<T> = {
        id: update.id,
        version: conflict.actualVersion,
        changes: update.changes,
        updatedBy: update.updatedBy,
      };

      const mergeAttempt = await this.attemptUpdate(entityType, mergedUpdate, config);
      return {
        success: mergeAttempt.success,
        data: mergeAttempt.data,
      };
    }

    // Calculate what each side changed
    const yourChangedFields = calculateChanges(
      baseResult as Record<string, unknown>,
      update.changes as Record<string, unknown>
    );
    const theirChangedFields = calculateChanges(
      baseResult as Record<string, unknown>,
      conflict.currentData as Record<string, unknown>
    );

    // Check for conflicts
    if (hasConflictingChanges(yourChangedFields, theirChangedFields)) {
      return { success: false };
    }

    // Merge non-conflicting changes
    const { merged } = mergeChanges(
      conflict.currentData as Record<string, unknown>,
      update.changes as Record<string, unknown>,
      {} as Record<string, unknown>,
      yourChangedFields,
      []
    );

    // Apply merged changes
    const mergedUpdate: VersionedUpdate<T> = {
      id: update.id,
      version: conflict.actualVersion,
      changes: merged as Partial<T>,
      updatedBy: update.updatedBy,
    };

    const mergeAttempt = await this.attemptUpdate(entityType, mergedUpdate, config);
    return {
      success: mergeAttempt.success,
      data: mergeAttempt.data,
    };
  }

  /**
   * Force update (last write wins)
   */
  private async forceUpdate<T extends Versionable>(
    entityType: string,
    update: VersionedUpdate<T>,
    currentVersion: number,
    config: EntityLockConfig
  ): Promise<{ success: boolean; data?: T }> {
    const forcedUpdate: VersionedUpdate<T> = {
      ...update,
      version: currentVersion,
    };

    const result = await this.attemptUpdate(entityType, forcedUpdate, config);
    return {
      success: result.success,
      data: result.data,
    };
  }

  /**
   * Get entity at specific version (from history if available)
   */
  private async getEntityAtVersion<T>(
    tableName: string,
    entityId: string,
    version: number
  ): Promise<T | null> {
    // Check if we have history table
    const historyTableName = `${tableName}_history`;

    try {
      const result = await this.pool.query(
        `SELECT * FROM ${historyTableName} WHERE id = $1 AND version = $2`,
        [entityId, version]
      );

      if (result.isSuccess && result.getValue().rows.length > 0) {
        return this.mapRowToEntity<T>(result.getValue().rows[0]);
      }
    } catch {
      // History table doesn't exist or query failed
    }

    return null;
  }

  /**
   * Record version history
   */
  async recordHistory<T extends Versionable>(
    entityType: string,
    entityId: string,
    data: T,
    changedFields: string[],
    userId?: string
  ): Promise<Result<void>> {
    const config = this.entityConfigs.get(entityType);
    if (!config || !config.enableHistory) {
      return Result.ok(undefined);
    }

    try {
      const historyEntry: VersionHistoryEntry = {
        version: data.version,
        timestamp: new Date(),
        userId,
        changes: changedFields,
        checksum: generateVersionChecksum(data as Record<string, unknown>),
      };

      const query = `
        INSERT INTO ${config.tableName}_history (
          id, entity_id, version, data, changes, checksum, user_id, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW()
        )
      `;

      await this.pool.query(query, [
        entityId,
        historyEntry.version,
        JSON.stringify(data),
        JSON.stringify(historyEntry.changes),
        historyEntry.checksum,
        userId,
      ]);

      return Result.ok(undefined);
    } catch (error) {
      // Don't fail the main operation if history recording fails
      console.error('[OptimisticLock] Failed to record history:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<Result<VersionHistoryEntry[]>> {
    const config = this.entityConfigs.get(entityType);
    if (!config || !config.enableHistory) {
      return Result.ok([]);
    }

    try {
      const query = `
        SELECT version, changes, checksum, user_id, created_at
        FROM ${config.tableName}_history
        WHERE entity_id = $1
        ORDER BY version DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [entityId, limit]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const history = result.getValue().rows.map((row: any) => ({
        version: row.version,
        timestamp: new Date(row.created_at),
        userId: row.user_id,
        changes: JSON.parse(row.changes),
        checksum: row.checksum,
      }));

      return Result.ok(history);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get history'));
    }
  }

  /**
   * Compare versions
   */
  async compareVersions<T>(
    entityType: string,
    entityId: string,
    version1: number,
    version2: number
  ): Promise<Result<{ fields: string[]; values: Record<string, { v1: unknown; v2: unknown }> }>> {
    const config = this.entityConfigs.get(entityType);
    if (!config || !config.enableHistory) {
      return Result.fail(new Error('Version history not enabled for this entity'));
    }

    try {
      const query = `
        SELECT version, data FROM ${config.tableName}_history
        WHERE entity_id = $1 AND version IN ($2, $3)
      `;

      const result = await this.pool.query(query, [entityId, version1, version2]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length < 2) {
        return Result.fail(new Error('Could not find both versions'));
      }

      const data1 = JSON.parse(rows.find((r: any) => r.version === version1)?.data || '{}');
      const data2 = JSON.parse(rows.find((r: any) => r.version === version2)?.data || '{}');

      const allFields = new Set([...Object.keys(data1), ...Object.keys(data2)]);
      const changedFields: string[] = [];
      const values: Record<string, { v1: unknown; v2: unknown }> = {};

      for (const field of allFields) {
        if (field === 'version' || field === 'updatedAt') continue;

        const v1 = data1[field];
        const v2 = data2[field];

        if (JSON.stringify(v1) !== JSON.stringify(v2)) {
          changedFields.push(field);
          values[field] = { v1, v2 };
        }
      }

      return Result.ok({ fields: changedFields, values });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to compare versions'));
    }
  }

  /**
   * Check if entity is stale
   */
  async isStale(
    entityType: string,
    entityId: string,
    yourVersion: number
  ): Promise<Result<boolean>> {
    const versionResult = await this.getVersion(entityType, entityId);
    if (versionResult.isFailure) {
      return Result.fail(versionResult.error!);
    }

    if (!versionResult.value) {
      return Result.fail(new Error('Entity not found'));
    }

    return Result.ok(versionResult.value.version > yourVersion);
  }

  /**
   * Get locking metrics
   */
  getMetrics(): LockMetrics {
    return { ...this.metricsBuffer };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metricsBuffer = {
      totalUpdates: 0,
      successfulUpdates: 0,
      conflictCount: 0,
      retryCount: 0,
      avgRetries: 0,
      conflictRate: 0,
      byEntity: {},
    };
  }

  // ============ Private Helpers ============

  private mapRowToEntity<T>(row: Record<string, unknown>): T {
    const entity: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      // Convert snake_case to camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      entity[camelKey] = value;
    }

    return entity as T;
  }

  private initEntityMetrics(entityType: string): void {
    if (!this.metricsBuffer.byEntity[entityType]) {
      this.metricsBuffer.byEntity[entityType] = {
        updates: 0,
        conflicts: 0,
        retries: 0,
      };
    }
  }

  private updateMetricsAverage(): void {
    if (this.metricsBuffer.totalUpdates > 0) {
      this.metricsBuffer.avgRetries =
        this.metricsBuffer.retryCount / this.metricsBuffer.totalUpdates;
      this.metricsBuffer.conflictRate =
        this.metricsBuffer.conflictCount / this.metricsBuffer.totalUpdates;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create optimistic lock service
 */
export function createOptimisticLockService(pool: DatabasePool): OptimisticLockService {
  return new OptimisticLockService(pool);
}
