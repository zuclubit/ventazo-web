/**
 * Webhook Service
 * Manages webhook configurations and deliveries
 */

import { createHmac, randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  WebhookConfig,
  WebhookDelivery,
  WebhookEvent,
  WebhookStatus,
  DeliveryStatus,
  WebhookPayload,
  WebhookEventData,
  CreateWebhookInput,
  UpdateWebhookInput,
  WebhookQueryOptions,
  DeliveryQueryOptions,
  DEFAULT_RETRY_POLICY,
  MAX_CONSECUTIVE_FAILURES,
  WEBHOOK_TIMEOUT_MS,
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WEBHOOK_ID_HEADER,
} from './types';

@injectable()
export class WebhookService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Create a new webhook configuration
   */
  async createWebhook(input: CreateWebhookInput): Promise<Result<WebhookConfig>> {
    try {
      const id = randomUUID();
      const now = new Date();

      const webhook: WebhookConfig = {
        id,
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        url: input.url,
        events: input.events,
        status: WebhookStatus.ACTIVE,
        secret: input.secret || this.generateSecret(),
        headers: input.headers,
        retryPolicy: {
          ...DEFAULT_RETRY_POLICY,
          ...input.retryPolicy,
        },
        filters: input.filters,
        createdAt: now,
        updatedAt: now,
        failureCount: 0,
      };

      const query = `
        INSERT INTO webhooks (
          id, tenant_id, name, description, url, events, status,
          secret, headers, retry_policy, filters, created_at, updated_at, failure_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        webhook.id,
        webhook.tenantId,
        webhook.name,
        webhook.description,
        webhook.url,
        JSON.stringify(webhook.events),
        webhook.status,
        webhook.secret,
        JSON.stringify(webhook.headers || {}),
        JSON.stringify(webhook.retryPolicy),
        JSON.stringify(webhook.filters || {}),
        webhook.createdAt.toISOString(),
        webhook.updatedAt.toISOString(),
        webhook.failureCount,
      ]);

      if (result.isFailure) {
        return Result.fail(`Failed to create webhook: ${result.error}`);
      }

      console.log(`[WebhookService] Created webhook: ${webhook.id}`);
      return Result.ok(webhook);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to create webhook: ${message}`);
    }
  }

  /**
   * Update a webhook configuration
   */
  async updateWebhook(
    id: string,
    tenantId: string,
    input: UpdateWebhookInput
  ): Promise<Result<WebhookConfig>> {
    try {
      const existing = await this.getWebhook(id, tenantId);
      if (existing.isFailure) return Result.fail(existing.error ?? 'Failed to get webhook');
      if (!existing.getValue()) {
        return Result.fail('Webhook not found');
      }

      const webhook = existing.getValue()!;
      const updated: WebhookConfig = {
        ...webhook,
        name: input.name ?? webhook.name,
        description: input.description ?? webhook.description,
        url: input.url ?? webhook.url,
        events: input.events ?? webhook.events,
        status: input.status ?? webhook.status,
        secret: input.secret ?? webhook.secret,
        headers: input.headers ?? webhook.headers,
        retryPolicy: input.retryPolicy
          ? { ...webhook.retryPolicy, ...input.retryPolicy }
          : webhook.retryPolicy,
        filters: input.filters ?? webhook.filters,
        updatedAt: new Date(),
        // Reset failure count if re-activating
        failureCount:
          input.status === WebhookStatus.ACTIVE && webhook.status !== WebhookStatus.ACTIVE
            ? 0
            : webhook.failureCount,
      };

      const query = `
        UPDATE webhooks SET
          name = $3, description = $4, url = $5, events = $6, status = $7,
          secret = $8, headers = $9, retry_policy = $10, filters = $11,
          updated_at = $12, failure_count = $13
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [
        id,
        tenantId,
        updated.name,
        updated.description,
        updated.url,
        JSON.stringify(updated.events),
        updated.status,
        updated.secret,
        JSON.stringify(updated.headers || {}),
        JSON.stringify(updated.retryPolicy),
        JSON.stringify(updated.filters || {}),
        updated.updatedAt.toISOString(),
        updated.failureCount,
      ]);

      console.log(`[WebhookService] Updated webhook: ${id}`);
      return Result.ok(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to update webhook: ${message}`);
    }
  }

  /**
   * Get a specific webhook
   */
  async getWebhook(id: string, tenantId: string): Promise<Result<WebhookConfig | null>> {
    try {
      const query = `
        SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [id, tenantId]);
      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToWebhook(rows[0]));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get webhook: ${message}`);
    }
  }

  /**
   * List webhooks for a tenant
   */
  async listWebhooks(
    options: WebhookQueryOptions
  ): Promise<Result<{ items: WebhookConfig[]; total: number }>> {
    try {
      const { tenantId, status, event, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'tenant_id = $1';
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (event) {
        whereClause += ` AND (events @> $${paramIndex}::jsonb OR events @> '"*"'::jsonb)`;
        params.push(JSON.stringify([event]));
        paramIndex++;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) as total FROM webhooks WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(countResult.error!);
      }
      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Data query
      const dataQuery = `
        SELECT * FROM webhooks
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) {
        return Result.fail(dataResult.error!);
      }

      const items = dataResult.getValue().rows.map(this.mapRowToWebhook);
      return Result.ok({ items, total });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to list webhooks: ${message}`);
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(id: string, tenantId: string): Promise<Result<void>> {
    try {
      const query = `DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2`;
      await this.pool.query(query, [id, tenantId]);

      console.log(`[WebhookService] Deleted webhook: ${id}`);
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to delete webhook: ${message}`);
    }
  }

  /**
   * Trigger webhooks for an event
   */
  async triggerWebhooks(
    tenantId: string,
    event: WebhookEvent,
    data: WebhookEventData
  ): Promise<Result<string[]>> {
    try {
      // Find active webhooks subscribed to this event
      const webhooksResult = await this.findActiveWebhooksForEvent(tenantId, event);
      if (webhooksResult.isFailure) {
        return Result.fail(webhooksResult.error!);
      }

      const webhooks = webhooksResult.getValue();
      if (webhooks.length === 0) {
        return Result.ok([]);
      }

      const deliveryIds: string[] = [];

      for (const webhook of webhooks) {
        // Check filters
        if (!this.passesFilters(webhook, data)) {
          continue;
        }

        // Create delivery record
        const deliveryId = await this.createDelivery(webhook, event, data);
        if (deliveryId) {
          deliveryIds.push(deliveryId);
        }
      }

      console.log(
        `[WebhookService] Triggered ${deliveryIds.length} webhooks for event: ${event}`
      );
      return Result.ok(deliveryIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to trigger webhooks: ${message}`);
    }
  }

  /**
   * Execute a webhook delivery
   */
  async executeDelivery(deliveryId: string): Promise<Result<WebhookDelivery>> {
    try {
      // Get delivery record
      const deliveryResult = await this.getDelivery(deliveryId);
      if (deliveryResult.isFailure || !deliveryResult.getValue()) {
        return Result.fail('Delivery not found');
      }

      const delivery = deliveryResult.getValue()!;

      // Get webhook config
      const webhookResult = await this.getWebhook(delivery.webhookId, delivery.tenantId);
      if (webhookResult.isFailure || !webhookResult.getValue()) {
        return Result.fail('Webhook not found');
      }

      const webhook = webhookResult.getValue()!;

      // Prepare request
      const timestamp = Date.now().toString();
      const payloadString = JSON.stringify(delivery.payload);
      const signature = this.generateSignature(payloadString, timestamp, webhook.secret!);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [WEBHOOK_ID_HEADER]: delivery.id,
        [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
        [WEBHOOK_SIGNATURE_HEADER]: signature,
        ...webhook.headers,
      };

      // Execute request
      const startTime = Date.now();
      let responseStatus: number | undefined;
      let responseBody: string | undefined;
      let responseHeaders: Record<string, string> | undefined;
      let error: string | undefined;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        responseStatus = response.status;
        responseBody = await response.text();
        responseHeaders = Object.fromEntries(response.headers.entries());

        if (!response.ok) {
          error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
        if (error.includes('aborted')) {
          error = 'Request timeout';
        }
      }

      const duration = Date.now() - startTime;
      const success = !error && responseStatus && responseStatus >= 200 && responseStatus < 300;

      // Update delivery record
      const updatedDelivery = await this.updateDeliveryStatus(
        delivery,
        webhook,
        success ? DeliveryStatus.SUCCESS : DeliveryStatus.FAILED,
        {
          responseStatus,
          responseBody,
          responseHeaders,
          error,
          duration,
        }
      );

      // Update webhook failure count
      if (!success) {
        await this.incrementFailureCount(webhook);
      } else {
        await this.resetFailureCount(webhook);
      }

      console.log(
        `[WebhookService] Delivery ${deliveryId}: ${success ? 'SUCCESS' : 'FAILED'} (${duration}ms)`
      );

      return Result.ok(updatedDelivery);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to execute delivery: ${message}`);
    }
  }

  /**
   * Get delivery history
   */
  async getDeliveryHistory(
    options: DeliveryQueryOptions
  ): Promise<Result<{ items: WebhookDelivery[]; total: number }>> {
    try {
      const {
        tenantId,
        webhookId,
        status,
        event,
        startDate,
        endDate,
        page = 1,
        limit = 20,
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

      if (event) {
        whereClause += ` AND event = $${paramIndex}`;
        params.push(event);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(startDate.toISOString());
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(endDate.toISOString());
        paramIndex++;
      }

      // Count
      const countQuery = `SELECT COUNT(*) as total FROM webhook_deliveries WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) return Result.fail(countResult.error!);
      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Data
      const dataQuery = `
        SELECT * FROM webhook_deliveries
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) return Result.fail(dataResult.error!);

      const items = dataResult.getValue().rows.map(this.mapRowToDelivery);
      return Result.ok({ items, total });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get delivery history: ${message}`);
    }
  }

  /**
   * Retry a failed delivery
   */
  async retryDelivery(deliveryId: string, tenantId: string): Promise<Result<string>> {
    try {
      const deliveryResult = await this.getDelivery(deliveryId);
      if (deliveryResult.isFailure || !deliveryResult.getValue()) {
        return Result.fail('Delivery not found');
      }

      const delivery = deliveryResult.getValue()!;
      if (delivery.tenantId !== tenantId) {
        return Result.fail('Delivery not found');
      }

      // Reset status and increment attempt
      await this.pool.query(
        `UPDATE webhook_deliveries SET status = $1, attempt_count = attempt_count + 1 WHERE id = $2`,
        [DeliveryStatus.RETRYING, deliveryId]
      );

      return Result.ok(deliveryId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to retry delivery: ${message}`);
    }
  }

  // ============ Private Helper Methods ============

  private async findActiveWebhooksForEvent(
    tenantId: string,
    event: WebhookEvent
  ): Promise<Result<WebhookConfig[]>> {
    const query = `
      SELECT * FROM webhooks
      WHERE tenant_id = $1
        AND status = $2
        AND (events @> $3::jsonb OR events @> '"*"'::jsonb)
    `;

    const result = await this.pool.query(query, [
      tenantId,
      WebhookStatus.ACTIVE,
      JSON.stringify([event]),
    ]);

    if (result.isFailure) {
      return Result.fail(result.error!);
    }

    return Result.ok(result.getValue().rows.map(this.mapRowToWebhook));
  }

  private passesFilters(webhook: WebhookConfig, data: WebhookEventData): boolean {
    if (!webhook.filters) return true;

    const { statuses, scoreRange, sources, owners } = webhook.filters;
    const current = data.current || {};

    if (statuses && statuses.length > 0) {
      if (!statuses.includes(current.status as string)) return false;
    }

    if (scoreRange) {
      const score = current.score as number;
      if (scoreRange.min !== undefined && score < scoreRange.min) return false;
      if (scoreRange.max !== undefined && score > scoreRange.max) return false;
    }

    if (sources && sources.length > 0) {
      if (!sources.includes(current.source as string)) return false;
    }

    if (owners && owners.length > 0) {
      if (!owners.includes(current.ownerId as string)) return false;
    }

    return true;
  }

  private async createDelivery(
    webhook: WebhookConfig,
    event: WebhookEvent,
    data: WebhookEventData
  ): Promise<string | null> {
    try {
      const id = randomUUID();
      const payload: WebhookPayload = {
        id,
        event,
        timestamp: new Date().toISOString(),
        tenantId: webhook.tenantId,
        data,
      };

      const query = `
        INSERT INTO webhook_deliveries (
          id, webhook_id, tenant_id, event, payload, status, url,
          request_headers, attempt_count, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await this.pool.query(query, [
        id,
        webhook.id,
        webhook.tenantId,
        event,
        JSON.stringify(payload),
        DeliveryStatus.PENDING,
        webhook.url,
        JSON.stringify({}),
        0,
        new Date().toISOString(),
      ]);

      return id;
    } catch (error) {
      console.error('[WebhookService] Failed to create delivery:', error);
      return null;
    }
  }

  private async getDelivery(id: string): Promise<Result<WebhookDelivery | null>> {
    const query = `SELECT * FROM webhook_deliveries WHERE id = $1`;
    const result = await this.pool.query(query, [id]);

    if (result.isFailure) return Result.fail(result.error!);
    if (result.getValue().rows.length === 0) return Result.ok(null);

    return Result.ok(this.mapRowToDelivery(result.getValue().rows[0]));
  }

  private async updateDeliveryStatus(
    delivery: WebhookDelivery,
    webhook: WebhookConfig,
    status: DeliveryStatus,
    details: {
      responseStatus?: number;
      responseBody?: string;
      responseHeaders?: Record<string, string>;
      error?: string;
      duration?: number;
    }
  ): Promise<WebhookDelivery> {
    const now = new Date();
    const shouldRetry =
      status === DeliveryStatus.FAILED &&
      delivery.attemptCount < webhook.retryPolicy.maxRetries;

    const nextRetryAt = shouldRetry
      ? new Date(
          now.getTime() +
            webhook.retryPolicy.retryDelayMs *
              Math.pow(webhook.retryPolicy.backoffMultiplier, delivery.attemptCount)
        )
      : undefined;

    const finalStatus = shouldRetry ? DeliveryStatus.RETRYING : status;

    const query = `
      UPDATE webhook_deliveries SET
        status = $2, response_status = $3, response_body = $4,
        response_headers = $5, error = $6, attempt_count = attempt_count + 1,
        next_retry_at = $7, delivered_at = $8, duration = $9
      WHERE id = $1
    `;

    await this.pool.query(query, [
      delivery.id,
      finalStatus,
      details.responseStatus,
      details.responseBody,
      JSON.stringify(details.responseHeaders || {}),
      details.error,
      nextRetryAt?.toISOString(),
      status === DeliveryStatus.SUCCESS ? now.toISOString() : null,
      details.duration,
    ]);

    return {
      ...delivery,
      status: finalStatus,
      responseStatus: details.responseStatus,
      responseBody: details.responseBody,
      responseHeaders: details.responseHeaders,
      error: details.error,
      attemptCount: delivery.attemptCount + 1,
      nextRetryAt,
      deliveredAt: status === DeliveryStatus.SUCCESS ? now : undefined,
      duration: details.duration,
    };
  }

  private async incrementFailureCount(webhook: WebhookConfig): Promise<void> {
    const newCount = webhook.failureCount + 1;
    const shouldDisable = newCount >= MAX_CONSECUTIVE_FAILURES;

    await this.pool.query(
      `UPDATE webhooks SET failure_count = $2, status = $3, updated_at = $4 WHERE id = $1`,
      [
        webhook.id,
        newCount,
        shouldDisable ? WebhookStatus.FAILED : webhook.status,
        new Date().toISOString(),
      ]
    );

    if (shouldDisable) {
      console.log(
        `[WebhookService] Webhook ${webhook.id} auto-disabled after ${MAX_CONSECUTIVE_FAILURES} failures`
      );
    }
  }

  private async resetFailureCount(webhook: WebhookConfig): Promise<void> {
    if (webhook.failureCount > 0) {
      await this.pool.query(
        `UPDATE webhooks SET failure_count = 0, updated_at = $2 WHERE id = $1`,
        [webhook.id, new Date().toISOString()]
      );
    }
  }

  private generateSecret(): string {
    return `whsec_${randomUUID().replace(/-/g, '')}`;
  }

  private generateSignature(payload: string, timestamp: string, secret: string): string {
    const signedPayload = `${timestamp}.${payload}`;
    return createHmac('sha256', secret).update(signedPayload).digest('hex');
  }

  private mapRowToWebhook(row: Record<string, unknown>): WebhookConfig {
    const parseJsonField = (value: unknown, defaultValue: unknown = {}) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      url: row.url as string,
      events: parseJsonField(row.events, []) as WebhookEvent[],
      status: row.status as WebhookStatus,
      secret: row.secret as string,
      headers: parseJsonField(row.headers, {}),
      retryPolicy: parseJsonField(row.retry_policy, DEFAULT_RETRY_POLICY),
      filters: parseJsonField(row.filters, {}),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      lastTriggeredAt: row.last_triggered_at
        ? new Date(row.last_triggered_at as string)
        : undefined,
      failureCount: row.failure_count as number,
    };
  }

  private mapRowToDelivery(row: Record<string, unknown>): WebhookDelivery {
    const parseJsonField = (value: unknown, defaultValue: unknown = {}) => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;
    };

    return {
      id: row.id as string,
      webhookId: row.webhook_id as string,
      tenantId: row.tenant_id as string,
      event: row.event as WebhookEvent,
      payload: parseJsonField(row.payload, {}),
      status: row.status as DeliveryStatus,
      url: row.url as string,
      requestHeaders: parseJsonField(row.request_headers, {}),
      responseStatus: row.response_status as number | undefined,
      responseBody: row.response_body as string | undefined,
      responseHeaders: row.response_headers
        ? parseJsonField(row.response_headers, {})
        : undefined,
      error: row.error as string | undefined,
      attemptCount: row.attempt_count as number,
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at as string) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      duration: row.duration as number | undefined,
    };
  }
}
