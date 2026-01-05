/**
 * Webhook Dead Letter Queue Service
 * Manages failed webhook deliveries and recovery
 */

import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  DLQEntry,
  DLQStatus,
  DLQStats,
  DLQQueryOptions,
  DLQConfig,
  BulkActionResult,
  RecoveryOptions,
  FailureCategory,
  DEFAULT_DLQ_CONFIG,
  categorizeFailure,
} from './webhook-dlq.types';
import { WebhookDelivery, WebhookEvent, WebhookPayload } from './types';

@injectable()
export class WebhookDLQService {
  private config: DLQConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private autoRetryInterval: NodeJS.Timeout | null = null;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    config?: Partial<DLQConfig>
  ) {
    this.config = { ...DEFAULT_DLQ_CONFIG, ...config };
  }

  /**
   * Initialize the DLQ service
   */
  async initialize(): Promise<Result<void>> {
    try {
      // Start cleanup job
      if (this.config.cleanup.enabled) {
        this.startCleanupJob();
      }

      // Start auto-retry job
      if (this.config.autoRetry.enabled) {
        this.startAutoRetryJob();
      }

      console.log('[WebhookDLQ] Service initialized');
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to initialize DLQ'));
    }
  }

  /**
   * Add a failed delivery to the DLQ
   */
  async addToDLQ(
    delivery: WebhookDelivery,
    webhookName: string,
    failureReason: string,
    lastError: string,
    lastResponseStatus?: number,
    lastResponseBody?: string
  ): Promise<Result<DLQEntry>> {
    try {
      // Check tenant quota
      const countResult = await this.getEntryCount(delivery.tenantId);
      if (countResult.isSuccess && countResult.value >= this.config.maxEntriesPerTenant) {
        // Remove oldest pending entry to make room
        await this.removeOldestEntry(delivery.tenantId);
      }

      const failureCategory = categorizeFailure(lastError, lastResponseStatus);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.config.entryTTLDays * 24 * 60 * 60 * 1000);

      const entry: DLQEntry = {
        id: randomUUID(),
        tenantId: delivery.tenantId,
        webhookId: delivery.webhookId,
        webhookName,
        webhookUrl: delivery.url,
        deliveryId: delivery.id,
        event: delivery.event,
        payload: delivery.payload as Record<string, unknown>,

        failureCategory,
        failureReason,
        lastError,
        lastResponseStatus,
        lastResponseBody,

        totalAttempts: delivery.attemptCount,
        firstAttemptAt: delivery.createdAt,
        lastAttemptAt: now,

        status: 'pending',
        addedToDLQAt: now,
        expiresAt,

        recoveryAttempts: 0,
        tags: [],
      };

      const query = `
        INSERT INTO webhook_dlq (
          id, tenant_id, webhook_id, webhook_name, webhook_url, delivery_id,
          event, payload, failure_category, failure_reason, last_error,
          last_response_status, last_response_body, total_attempts,
          first_attempt_at, last_attempt_at, status, added_to_dlq_at,
          expires_at, recovery_attempts, tags
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, $18, $19, $20, $21
        )
      `;

      const result = await this.pool.query(query, [
        entry.id,
        entry.tenantId,
        entry.webhookId,
        entry.webhookName,
        entry.webhookUrl,
        entry.deliveryId,
        entry.event,
        JSON.stringify(entry.payload),
        entry.failureCategory,
        entry.failureReason,
        entry.lastError,
        entry.lastResponseStatus,
        entry.lastResponseBody,
        entry.totalAttempts,
        entry.firstAttemptAt.toISOString(),
        entry.lastAttemptAt.toISOString(),
        entry.status,
        entry.addedToDLQAt.toISOString(),
        entry.expiresAt.toISOString(),
        entry.recoveryAttempts,
        JSON.stringify(entry.tags),
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(`Failed to add to DLQ: ${result.error}`));
      }

      console.log(`[WebhookDLQ] Added entry ${entry.id} for delivery ${delivery.id}`);

      // Check notification threshold
      await this.checkNotificationThreshold(entry.tenantId);

      return Result.ok(entry);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add to DLQ'));
    }
  }

  /**
   * Get a DLQ entry by ID
   */
  async getEntry(id: string, tenantId: string): Promise<Result<DLQEntry | null>> {
    try {
      const query = `SELECT * FROM webhook_dlq WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [id, tenantId]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToEntry(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get DLQ entry'));
    }
  }

  /**
   * List DLQ entries with filtering
   */
  async listEntries(
    options: DLQQueryOptions
  ): Promise<Result<{ items: DLQEntry[]; total: number }>> {
    try {
      const {
        tenantId,
        webhookId,
        status,
        category,
        event,
        startDate,
        endDate,
        tags,
        page = 1,
        limit = 20,
        sortBy = 'addedToDLQAt',
        sortOrder = 'desc',
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = 'tenant_id = $1';
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (webhookId) {
        whereClause += ` AND webhook_id = $${paramIndex}`;
        params.push(webhookId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND failure_category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (event) {
        whereClause += ` AND event = $${paramIndex}`;
        params.push(event);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND added_to_dlq_at >= $${paramIndex}`;
        params.push(startDate.toISOString());
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND added_to_dlq_at <= $${paramIndex}`;
        params.push(endDate.toISOString());
        paramIndex++;
      }

      if (tags && tags.length > 0) {
        whereClause += ` AND tags @> $${paramIndex}::jsonb`;
        params.push(JSON.stringify(tags));
        paramIndex++;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) as total FROM webhook_dlq WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(new Error(countResult.error!));
      }
      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Map sort field
      const sortColumn = this.mapSortField(sortBy);

      // Data query
      const dataQuery = `
        SELECT * FROM webhook_dlq
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) {
        return Result.fail(new Error(dataResult.error!));
      }

      const items = dataResult.getValue().rows.map(this.mapRowToEntry);
      return Result.ok({ items, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list DLQ entries'));
    }
  }

  /**
   * Get DLQ statistics
   */
  async getStats(tenantId: string): Promise<Result<DLQStats>> {
    try {
      // Total and by status
      const statusQuery = `
        SELECT status, COUNT(*) as count FROM webhook_dlq
        WHERE tenant_id = $1
        GROUP BY status
      `;
      const statusResult = await this.pool.query(statusQuery, [tenantId]);
      if (statusResult.isFailure) {
        return Result.fail(new Error(statusResult.error!));
      }

      const byStatus: Record<DLQStatus, number> = {
        pending: 0,
        retrying: 0,
        recovered: 0,
        discarded: 0,
        expired: 0,
      };
      let totalEntries = 0;
      for (const row of statusResult.getValue().rows) {
        byStatus[row.status as DLQStatus] = parseInt(row.count, 10);
        totalEntries += parseInt(row.count, 10);
      }

      // By category
      const categoryQuery = `
        SELECT failure_category, COUNT(*) as count FROM webhook_dlq
        WHERE tenant_id = $1
        GROUP BY failure_category
      `;
      const categoryResult = await this.pool.query(categoryQuery, [tenantId]);
      if (categoryResult.isFailure) {
        return Result.fail(new Error(categoryResult.error!));
      }

      const byCategory: Record<FailureCategory, number> = {
        network_error: 0,
        server_error: 0,
        client_error: 0,
        timeout: 0,
        invalid_response: 0,
        circuit_open: 0,
        rate_limited: 0,
        unknown: 0,
      };
      for (const row of categoryResult.getValue().rows) {
        byCategory[row.failure_category as FailureCategory] = parseInt(row.count, 10);
      }

      // By webhook
      const webhookQuery = `
        SELECT webhook_id, webhook_name, COUNT(*) as count FROM webhook_dlq
        WHERE tenant_id = $1
        GROUP BY webhook_id, webhook_name
        ORDER BY count DESC
        LIMIT 10
      `;
      const webhookResult = await this.pool.query(webhookQuery, [tenantId]);
      const byWebhook = webhookResult.isSuccess
        ? webhookResult.getValue().rows.map(row => ({
            webhookId: row.webhook_id,
            webhookName: row.webhook_name,
            count: parseInt(row.count, 10),
          }))
        : [];

      // By event
      const eventQuery = `
        SELECT event, COUNT(*) as count FROM webhook_dlq
        WHERE tenant_id = $1
        GROUP BY event
      `;
      const eventResult = await this.pool.query(eventQuery, [tenantId]);
      const byEvent: Record<WebhookEvent, number> = {} as Record<WebhookEvent, number>;
      if (eventResult.isSuccess) {
        for (const row of eventResult.getValue().rows) {
          byEvent[row.event as WebhookEvent] = parseInt(row.count, 10);
        }
      }

      // Date range and avg attempts
      const aggregateQuery = `
        SELECT
          MIN(added_to_dlq_at) as oldest,
          MAX(added_to_dlq_at) as newest,
          AVG(total_attempts) as avg_attempts
        FROM webhook_dlq
        WHERE tenant_id = $1
      `;
      const aggregateResult = await this.pool.query(aggregateQuery, [tenantId]);
      const aggRow = aggregateResult.isSuccess ? aggregateResult.getValue().rows[0] : {};

      // Recovery rate
      const recoveryRate = totalEntries > 0 ? byStatus.recovered / totalEntries : 0;

      // Entries expiring soon (within 7 days)
      const expiringQuery = `
        SELECT COUNT(*) as count FROM webhook_dlq
        WHERE tenant_id = $1 AND status = 'pending'
        AND expires_at <= NOW() + INTERVAL '7 days'
      `;
      const expiringResult = await this.pool.query(expiringQuery, [tenantId]);
      const entriesExpiringSoon = expiringResult.isSuccess
        ? parseInt(expiringResult.getValue().rows[0].count, 10)
        : 0;

      return Result.ok({
        totalEntries,
        byStatus,
        byCategory,
        byWebhook,
        byEvent,
        oldestEntry: aggRow.oldest ? new Date(aggRow.oldest) : undefined,
        newestEntry: aggRow.newest ? new Date(aggRow.newest) : undefined,
        avgAttempts: parseFloat(aggRow.avg_attempts) || 0,
        recoveryRate,
        entriesExpiringSoon,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get DLQ stats'));
    }
  }

  /**
   * Retry a single DLQ entry
   */
  async retryEntry(
    id: string,
    tenantId: string,
    options?: RecoveryOptions
  ): Promise<Result<DLQEntry>> {
    try {
      const entryResult = await this.getEntry(id, tenantId);
      if (entryResult.isFailure || !entryResult.value) {
        return Result.fail(new Error('DLQ entry not found'));
      }

      const entry = entryResult.value;
      if (entry.status !== 'pending' && entry.status !== 'retrying') {
        return Result.fail(new Error(`Cannot retry entry with status: ${entry.status}`));
      }

      // Update status to retrying
      const now = new Date();
      const query = `
        UPDATE webhook_dlq SET
          status = 'retrying',
          recovery_attempts = recovery_attempts + 1,
          last_recovery_attempt_at = $3
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [id, tenantId, now.toISOString()]);

      // Return updated entry
      const updated: DLQEntry = {
        ...entry,
        status: 'retrying',
        recoveryAttempts: entry.recoveryAttempts + 1,
        lastRecoveryAttemptAt: now,
      };

      console.log(`[WebhookDLQ] Retrying entry ${id}`);
      return Result.ok(updated);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to retry entry'));
    }
  }

  /**
   * Bulk retry entries
   */
  async bulkRetry(
    tenantId: string,
    filter: Partial<DLQQueryOptions>
  ): Promise<Result<BulkActionResult>> {
    try {
      const listResult = await this.listEntries({
        ...filter,
        tenantId,
        status: 'pending',
        limit: 1000,
      });

      if (listResult.isFailure) {
        return Result.fail(listResult.error!);
      }

      const result: BulkActionResult = {
        total: listResult.value.items.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      for (const entry of listResult.value.items) {
        const retryResult = await this.retryEntry(entry.id, tenantId);
        if (retryResult.isSuccess) {
          result.successful++;
        } else {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            error: retryResult.error?.message || 'Unknown error',
          });
        }
      }

      console.log(`[WebhookDLQ] Bulk retry: ${result.successful}/${result.total} successful`);
      return Result.ok(result);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to bulk retry'));
    }
  }

  /**
   * Mark entry as recovered
   */
  async markRecovered(id: string, tenantId: string): Promise<Result<void>> {
    try {
      const now = new Date();
      const query = `
        UPDATE webhook_dlq SET
          status = 'recovered',
          recovered_at = $3
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [id, tenantId, now.toISOString()]);
      console.log(`[WebhookDLQ] Entry ${id} marked as recovered`);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to mark recovered'));
    }
  }

  /**
   * Discard an entry
   */
  async discardEntry(
    id: string,
    tenantId: string,
    discardedBy: string,
    reason?: string
  ): Promise<Result<void>> {
    try {
      const now = new Date();
      const query = `
        UPDATE webhook_dlq SET
          status = 'discarded',
          discarded_at = $3,
          discarded_by = $4,
          discard_reason = $5
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [id, tenantId, now.toISOString(), discardedBy, reason]);
      console.log(`[WebhookDLQ] Entry ${id} discarded by ${discardedBy}`);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to discard entry'));
    }
  }

  /**
   * Bulk discard entries
   */
  async bulkDiscard(
    tenantId: string,
    filter: Partial<DLQQueryOptions>,
    discardedBy: string,
    reason?: string
  ): Promise<Result<BulkActionResult>> {
    try {
      const listResult = await this.listEntries({
        ...filter,
        tenantId,
        limit: 1000,
      });

      if (listResult.isFailure) {
        return Result.fail(listResult.error!);
      }

      const result: BulkActionResult = {
        total: listResult.value.items.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      for (const entry of listResult.value.items) {
        const discardResult = await this.discardEntry(entry.id, tenantId, discardedBy, reason);
        if (discardResult.isSuccess) {
          result.successful++;
        } else {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            error: discardResult.error?.message || 'Unknown error',
          });
        }
      }

      console.log(`[WebhookDLQ] Bulk discard: ${result.successful}/${result.total} successful`);
      return Result.ok(result);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to bulk discard'));
    }
  }

  /**
   * Add tags to an entry
   */
  async addTags(id: string, tenantId: string, tags: string[]): Promise<Result<void>> {
    try {
      const query = `
        UPDATE webhook_dlq SET
          tags = tags || $3::jsonb
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [id, tenantId, JSON.stringify(tags)]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add tags'));
    }
  }

  /**
   * Add note to an entry
   */
  async addNote(id: string, tenantId: string, note: string): Promise<Result<void>> {
    try {
      const query = `
        UPDATE webhook_dlq SET notes = $3
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [id, tenantId, note]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add note'));
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanupExpired(): Promise<Result<number>> {
    try {
      // Mark expired
      const expireQuery = `
        UPDATE webhook_dlq SET status = 'expired'
        WHERE status = 'pending' AND expires_at < NOW()
      `;
      await this.pool.query(expireQuery, []);

      // Delete old recovered entries
      const keepRecovered = new Date(
        Date.now() - this.config.cleanup.keepRecoveredDays * 24 * 60 * 60 * 1000
      );
      const deleteRecoveredQuery = `
        DELETE FROM webhook_dlq
        WHERE status = 'recovered' AND recovered_at < $1
      `;
      await this.pool.query(deleteRecoveredQuery, [keepRecovered.toISOString()]);

      // Delete old discarded entries
      const keepDiscarded = new Date(
        Date.now() - this.config.cleanup.keepDiscardedDays * 24 * 60 * 60 * 1000
      );
      const deleteDiscardedQuery = `
        DELETE FROM webhook_dlq
        WHERE status = 'discarded' AND discarded_at < $1
      `;
      await this.pool.query(deleteDiscardedQuery, [keepDiscarded.toISOString()]);

      // Delete old expired entries (keep for 1 day)
      const keepExpired = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const deleteExpiredQuery = `
        DELETE FROM webhook_dlq
        WHERE status = 'expired' AND expires_at < $1
        RETURNING id
      `;
      const deleteResult = await this.pool.query(deleteExpiredQuery, [keepExpired.toISOString()]);

      const deletedCount = deleteResult.isSuccess ? deleteResult.getValue().rows.length : 0;
      console.log(`[WebhookDLQ] Cleanup completed: ${deletedCount} entries removed`);

      return Result.ok(deletedCount);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to cleanup'));
    }
  }

  // ============ Private Methods ============

  private async getEntryCount(tenantId: string): Promise<Result<number>> {
    const query = `SELECT COUNT(*) as count FROM webhook_dlq WHERE tenant_id = $1`;
    const result = await this.pool.query(query, [tenantId]);

    if (result.isFailure) {
      return Result.fail(new Error(result.error!));
    }

    return Result.ok(parseInt(result.getValue().rows[0].count, 10));
  }

  private async removeOldestEntry(tenantId: string): Promise<void> {
    const query = `
      DELETE FROM webhook_dlq
      WHERE id = (
        SELECT id FROM webhook_dlq
        WHERE tenant_id = $1 AND status = 'pending'
        ORDER BY added_to_dlq_at ASC
        LIMIT 1
      )
    `;
    await this.pool.query(query, [tenantId]);
  }

  private async checkNotificationThreshold(tenantId: string): Promise<void> {
    if (!this.config.notifications.enabled) return;

    const countResult = await this.getEntryCount(tenantId);
    if (countResult.isFailure) return;

    if (countResult.value >= this.config.notifications.thresholdCount) {
      console.log(
        `[WebhookDLQ] Notification threshold reached for tenant ${tenantId}: ${countResult.value} entries`
      );
      // Notification logic would be implemented here
    }
  }

  private startCleanupJob(): void {
    const intervalMs = this.config.cleanup.intervalHours * 60 * 60 * 1000;
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpired();
    }, intervalMs);
  }

  private startAutoRetryJob(): void {
    const intervalMs = this.config.autoRetry.intervalMinutes * 60 * 1000;
    this.autoRetryInterval = setInterval(async () => {
      await this.processAutoRetries();
    }, intervalMs);
  }

  private async processAutoRetries(): Promise<void> {
    try {
      const query = `
        SELECT DISTINCT tenant_id FROM webhook_dlq
        WHERE status = 'pending'
        AND failure_category = ANY($1)
        AND recovery_attempts < $2
      `;

      const result = await this.pool.query(query, [
        this.config.autoRetry.categories,
        this.config.autoRetry.maxAttempts,
      ]);

      if (result.isFailure) return;

      for (const row of result.getValue().rows) {
        await this.bulkRetry(row.tenant_id, {
          category: undefined, // Will be filtered by SQL
        });
      }
    } catch (error) {
      console.error('[WebhookDLQ] Auto-retry error:', error);
    }
  }

  private mapSortField(field: string): string {
    const mapping: Record<string, string> = {
      addedToDLQAt: 'added_to_dlq_at',
      lastAttemptAt: 'last_attempt_at',
      totalAttempts: 'total_attempts',
    };
    return mapping[field] || 'added_to_dlq_at';
  }

  private mapRowToEntry(row: Record<string, unknown>): DLQEntry {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      webhookId: row.webhook_id as string,
      webhookName: row.webhook_name as string,
      webhookUrl: row.webhook_url as string,
      deliveryId: row.delivery_id as string,
      event: row.event as WebhookEvent,
      payload: JSON.parse(row.payload as string),

      failureCategory: row.failure_category as FailureCategory,
      failureReason: row.failure_reason as string,
      lastError: row.last_error as string,
      lastResponseStatus: row.last_response_status as number | undefined,
      lastResponseBody: row.last_response_body as string | undefined,

      totalAttempts: row.total_attempts as number,
      firstAttemptAt: new Date(row.first_attempt_at as string),
      lastAttemptAt: new Date(row.last_attempt_at as string),

      status: row.status as DLQStatus,
      addedToDLQAt: new Date(row.added_to_dlq_at as string),
      expiresAt: new Date(row.expires_at as string),

      recoveryAttempts: row.recovery_attempts as number,
      lastRecoveryAttemptAt: row.last_recovery_attempt_at
        ? new Date(row.last_recovery_attempt_at as string)
        : undefined,
      recoveredAt: row.recovered_at ? new Date(row.recovered_at as string) : undefined,
      discardedAt: row.discarded_at ? new Date(row.discarded_at as string) : undefined,
      discardedBy: row.discarded_by as string | undefined,
      discardReason: row.discard_reason as string | undefined,

      tags: JSON.parse((row.tags as string) || '[]'),
      notes: row.notes as string | undefined,
    };
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.autoRetryInterval) {
      clearInterval(this.autoRetryInterval);
    }
  }
}
