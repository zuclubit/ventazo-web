/**
 * SMS Service
 * Unified SMS service with template support and CRM integration
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  SmsMessage,
  SmsTemplate,
  SendSmsInput,
  SendBulkSmsInput,
  SmsSendResult,
  BulkSmsSendResult,
  ListSmsOptions,
  PaginatedSmsResponse,
  SmsStats,
  SmsStatus,
  SmsDirection,
  ISmsProvider,
} from './types';
import { TwilioProvider } from './twilio.provider';

/**
 * SMS Service
 * Handles SMS sending, receiving, templates, and CRM linking
 */
@injectable()
export class SmsService {
  private providers: Map<string, ISmsProvider> = new Map();
  private defaultProvider: ISmsProvider | null = null;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize available SMS providers
   */
  private initializeProviders(): void {
    const twilioProvider = new TwilioProvider();
    if (twilioProvider.isAvailable()) {
      this.providers.set('twilio', twilioProvider);
      this.defaultProvider = twilioProvider;
    }

    // Add more providers here as needed (Vonage, MessageBird, etc.)
  }

  /**
   * Check if SMS is available
   */
  isAvailable(): boolean {
    return this.defaultProvider !== null && this.defaultProvider.isAvailable();
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Send a single SMS
   */
  async sendSms(
    tenantId: string,
    userId: string,
    input: SendSmsInput
  ): Promise<Result<SmsMessage>> {
    try {
      if (!this.defaultProvider) {
        return Result.fail('No SMS provider configured');
      }

      // Get body from template if provided
      let body = input.body;
      if (input.templateId) {
        const templateResult = await this.getTemplateById(input.templateId, tenantId);
        if (templateResult.isFailure || !templateResult.value) {
          return Result.fail('Template not found');
        }
        body = this.interpolateTemplate(templateResult.value.body, input.templateVariables || {});
      }

      if (!body) {
        return Result.fail('Message body is required');
      }

      // Send via provider
      const result = await this.defaultProvider.send(input.to, body, input.from);

      // Create message record
      const messageId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO sms_messages (
          id, tenant_id, provider, external_id,
          from_number, to_number, body,
          direction, status, error_code, error_message,
          num_segments, price, price_unit,
          linked_entity_type, linked_entity_id, user_id,
          sent_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;

      const dbResult = await this.pool.query(query, [
        messageId,
        tenantId,
        this.defaultProvider.name,
        result.externalId || null,
        input.from || process.env.TWILIO_PHONE_NUMBER || '',
        input.to,
        body,
        'outbound',
        result.status,
        result.errorCode || null,
        result.error || null,
        result.numSegments || null,
        result.price || null,
        'USD',
        input.linkToEntityType || null,
        input.linkToEntityId || null,
        userId,
        result.success ? now : null,
        now,
        now,
      ]);

      if (dbResult.isFailure || !dbResult.value?.rows?.[0]) {
        // Even if DB save fails, message may have been sent
        if (result.success) {
          console.error('SMS sent but failed to save to database');
        }
        return Result.fail('Failed to save SMS record');
      }

      // Log communication if linked to entity
      if (input.linkToEntityType === 'lead' && input.linkToEntityId) {
        await this.logCommunication(tenantId, userId, input.linkToEntityId, body, result.success);
      }

      return Result.ok(this.mapRowToMessage(dbResult.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to send SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSms(
    tenantId: string,
    userId: string,
    input: SendBulkSmsInput
  ): Promise<Result<BulkSmsSendResult>> {
    try {
      if (!this.defaultProvider) {
        return Result.fail('No SMS provider configured');
      }

      let templateBody: string | undefined;
      if (input.templateId) {
        const templateResult = await this.getTemplateById(input.templateId, tenantId);
        if (templateResult.isFailure || !templateResult.value) {
          return Result.fail('Template not found');
        }
        templateBody = templateResult.value.body;
      }

      const results: BulkSmsSendResult = {
        total: input.recipients.length,
        sent: 0,
        failed: 0,
        results: [],
      };

      // Process each recipient
      for (const recipient of input.recipients) {
        const body = templateBody
          ? this.interpolateTemplate(templateBody, recipient.variables || {})
          : input.body || '';

        const sendResult = await this.sendSms(tenantId, userId, {
          to: recipient.to,
          body,
          from: input.from,
          linkToEntityType: recipient.linkToEntityType,
          linkToEntityId: recipient.linkToEntityId,
          metadata: input.metadata,
        });

        if (sendResult.isSuccess && sendResult.value) {
          results.sent++;
          results.results.push({
            to: recipient.to,
            result: {
              success: true,
              messageId: sendResult.value.id,
              externalId: sendResult.value.externalId,
              status: sendResult.value.status,
            },
          });
        } else {
          results.failed++;
          results.results.push({
            to: recipient.to,
            result: {
              success: false,
              status: 'failed',
              error: sendResult.error || 'Send failed',
            },
          });
        }
      }

      return Result.ok(results);
    } catch (error) {
      return Result.fail(`Failed to send bulk SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle incoming SMS webhook
   */
  async handleIncomingSms(
    payload: unknown,
    providerName: string = 'twilio'
  ): Promise<Result<SmsMessage>> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return Result.fail(`Provider ${providerName} not available`);
      }

      const parsed = provider.parseIncomingWebhook(payload);
      if (!parsed) {
        return Result.fail('Invalid webhook payload');
      }

      // Try to find matching tenant/entity by phone number
      const matchResult = await this.findMatchByPhoneNumber(parsed.to, parsed.from);

      const messageId = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO sms_messages (
          id, tenant_id, provider, external_id,
          from_number, to_number, body,
          direction, status,
          linked_entity_type, linked_entity_id,
          received_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const dbResult = await this.pool.query(query, [
        messageId,
        matchResult?.tenantId || null,
        providerName,
        parsed.externalId,
        parsed.from,
        parsed.to,
        parsed.body,
        'inbound',
        'received',
        matchResult?.entityType || null,
        matchResult?.entityId || null,
        now,
        now,
        now,
      ]);

      if (dbResult.isFailure || !dbResult.value?.rows?.[0]) {
        return Result.fail('Failed to save incoming SMS');
      }

      return Result.ok(this.mapRowToMessage(dbResult.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to handle incoming SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle status webhook
   */
  async handleStatusWebhook(
    payload: unknown,
    providerName: string = 'twilio'
  ): Promise<Result<void>> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        return Result.fail(`Provider ${providerName} not available`);
      }

      const parsed = provider.parseStatusWebhook(payload);
      if (!parsed) {
        return Result.fail('Invalid status webhook payload');
      }

      const updates: string[] = ['status = $1', 'updated_at = NOW()'];
      const values: unknown[] = [parsed.status];
      let paramIndex = 2;

      if (parsed.errorCode) {
        updates.push(`error_code = $${paramIndex++}`);
        values.push(parsed.errorCode);
      }

      if (parsed.errorMessage) {
        updates.push(`error_message = $${paramIndex++}`);
        values.push(parsed.errorMessage);
      }

      if (parsed.status === 'delivered') {
        updates.push(`delivered_at = NOW()`);
      }

      const query = `
        UPDATE sms_messages
        SET ${updates.join(', ')}
        WHERE external_id = $${paramIndex}
      `;

      values.push(parsed.externalId);

      await this.pool.query(query, values);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to handle status webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get SMS by ID
   */
  async getSmsById(messageId: string, tenantId: string): Promise<Result<SmsMessage | null>> {
    try {
      const query = `SELECT * FROM sms_messages WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [messageId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to get SMS');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToMessage(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List SMS messages
   */
  async listSms(
    tenantId: string,
    options: ListSmsOptions
  ): Promise<Result<PaginatedSmsResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.direction) {
        conditions.push(`direction = $${paramIndex++}`);
        values.push(options.direction);
      }

      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options.from) {
        conditions.push(`from_number = $${paramIndex++}`);
        values.push(options.from);
      }

      if (options.to) {
        conditions.push(`to_number = $${paramIndex++}`);
        values.push(options.to);
      }

      if (options.linkedEntityType) {
        conditions.push(`linked_entity_type = $${paramIndex++}`);
        values.push(options.linkedEntityType);
      }

      if (options.linkedEntityId) {
        conditions.push(`linked_entity_id = $${paramIndex++}`);
        values.push(options.linkedEntityId);
      }

      if (options.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(options.userId);
      }

      if (options.dateFrom) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(options.dateFrom);
      }

      if (options.dateTo) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(options.dateTo);
      }

      if (options.search) {
        conditions.push(`(body ILIKE $${paramIndex} OR to_number LIKE $${paramIndex} OR from_number LIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM sms_messages WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count SMS');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get messages
      const query = `
        SELECT * FROM sms_messages
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list SMS');
      }

      const messages = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToMessage(row)
      );

      return Result.ok({
        messages,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get SMS statistics
   */
  async getStats(
    tenantId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Result<SmsStats>> {
    try {
      const dateCondition = dateFrom && dateTo
        ? `AND created_at BETWEEN $2 AND $3`
        : '';
      const params: unknown[] = [tenantId];
      if (dateFrom) params.push(dateFrom);
      if (dateTo) params.push(dateTo);

      // Get totals
      const totalsQuery = `
        SELECT
          COUNT(*) FILTER (WHERE direction = 'outbound') as total_sent,
          COUNT(*) FILTER (WHERE direction = 'inbound') as total_received,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COALESCE(SUM(price), 0) as total_cost
        FROM sms_messages
        WHERE tenant_id = $1 ${dateCondition}
      `;

      const totalsResult = await this.pool.query(totalsQuery, params);

      if (totalsResult.isFailure || !totalsResult.value?.rows?.[0]) {
        return Result.fail('Failed to get SMS stats');
      }

      const totals = totalsResult.value.rows[0];

      // Get by status
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM sms_messages
        WHERE tenant_id = $1 ${dateCondition}
        GROUP BY status
      `;

      const statusResult = await this.pool.query(statusQuery, params);

      const byStatus: Record<SmsStatus, number> = {
        queued: 0,
        sending: 0,
        sent: 0,
        delivered: 0,
        undelivered: 0,
        failed: 0,
        received: 0,
      };

      if (statusResult.isSuccess && statusResult.value?.rows) {
        for (const row of statusResult.value.rows) {
          byStatus[row.status as SmsStatus] = parseInt(row.count, 10);
        }
      }

      // Get by day
      const dailyQuery = `
        SELECT
          DATE(created_at) as date,
          COUNT(*) FILTER (WHERE direction = 'outbound') as sent,
          COUNT(*) FILTER (WHERE direction = 'inbound') as received,
          COALESCE(SUM(price), 0) as cost
        FROM sms_messages
        WHERE tenant_id = $1 ${dateCondition}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const dailyResult = await this.pool.query(dailyQuery, params);

      const byDay = dailyResult.isSuccess && dailyResult.value?.rows
        ? dailyResult.value.rows.map((row: Record<string, unknown>) => ({
            date: (row.date as Date).toISOString().split('T')[0],
            sent: parseInt(row.sent as string, 10) || 0,
            received: parseInt(row.received as string, 10) || 0,
            cost: parseFloat(row.cost as string) || 0,
          }))
        : [];

      const totalSent = parseInt(totals.total_sent, 10) || 0;
      const delivered = parseInt(totals.delivered, 10) || 0;

      return Result.ok({
        totalSent,
        totalReceived: parseInt(totals.total_received, 10) || 0,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        failedCount: parseInt(totals.failed, 10) || 0,
        totalCost: parseFloat(totals.total_cost) || 0,
        byStatus,
        byDay,
      });
    } catch (error) {
      return Result.fail(`Failed to get SMS stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== SMS Templates ====================

  /**
   * Create SMS template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    data: {
      name: string;
      body: string;
      description?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<Result<SmsTemplate>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO sms_templates (
          id, tenant_id, name, description, body,
          category, tags, is_active, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        data.name,
        data.description || null,
        data.body,
        data.category || null,
        JSON.stringify(data.tags || []),
        true,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to create template');
      }

      return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string, tenantId: string): Promise<Result<SmsTemplate | null>> {
    try {
      const query = `SELECT * FROM sms_templates WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [templateId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to get template');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List templates
   */
  async listTemplates(
    tenantId: string,
    options?: { category?: string; search?: string; isActive?: boolean }
  ): Promise<Result<SmsTemplate[]>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options?.category) {
        conditions.push(`category = $${paramIndex++}`);
        values.push(options.category);
      }

      if (options?.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(options.isActive);
      }

      if (options?.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR body ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      const query = `
        SELECT * FROM sms_templates
        WHERE ${conditions.join(' AND ')}
        ORDER BY name ASC
      `;

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list templates');
      }

      return Result.ok(
        result.value.rows.map((row: Record<string, unknown>) =>
          this.mapRowToTemplate(row)
        )
      );
    } catch (error) {
      return Result.fail(`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    tenantId: string,
    updates: Partial<{
      name: string;
      body: string;
      description: string;
      category: string;
      tags: string[];
      isActive: boolean;
    }>
  ): Promise<Result<SmsTemplate>> {
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.body !== undefined) {
        setClauses.push(`body = $${paramIndex++}`);
        values.push(updates.body);
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }

      if (updates.category !== undefined) {
        setClauses.push(`category = $${paramIndex++}`);
        values.push(updates.category);
      }

      if (updates.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(updates.tags));
      }

      if (updates.isActive !== undefined) {
        setClauses.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      const query = `
        UPDATE sms_templates
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        RETURNING *
      `;

      values.push(templateId, tenantId);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to update template');
      }

      return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, tenantId: string): Promise<Result<void>> {
    try {
      const query = `DELETE FROM sms_templates WHERE id = $1 AND tenant_id = $2`;
      await this.pool.query(query, [templateId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Interpolate template variables
   */
  private interpolateTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] ?? match;
    });
  }

  /**
   * Find entity match by phone number
   */
  private async findMatchByPhoneNumber(
    ourNumber: string,
    theirNumber: string
  ): Promise<{ tenantId: string; entityType: string; entityId: string } | null> {
    try {
      // Try to find a lead with this phone number
      const leadQuery = `
        SELECT id, tenant_id FROM leads
        WHERE phone = $1 OR mobile = $1
        LIMIT 1
      `;

      const leadResult = await this.pool.query(leadQuery, [theirNumber]);

      if (leadResult.isSuccess && leadResult.value?.rows?.[0]) {
        return {
          tenantId: leadResult.value.rows[0].tenant_id,
          entityType: 'lead',
          entityId: leadResult.value.rows[0].id,
        };
      }

      // Try to find by SMS phone number
      const phoneQuery = `
        SELECT tenant_id FROM sms_phone_numbers
        WHERE phone_number = $1 AND is_active = true
        LIMIT 1
      `;

      const phoneResult = await this.pool.query(phoneQuery, [ourNumber]);

      if (phoneResult.isSuccess && phoneResult.value?.rows?.[0]) {
        return {
          tenantId: phoneResult.value.rows[0].tenant_id,
          entityType: 'unknown',
          entityId: '',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Log communication for lead
   */
  private async logCommunication(
    tenantId: string,
    userId: string,
    leadId: string,
    body: string,
    success: boolean
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO lead_communications (
          id, tenant_id, lead_id, type, direction, status,
          body, summary, occurred_at, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `;

      await this.pool.query(query, [
        uuidv4(),
        tenantId,
        leadId,
        'sms',
        'outbound',
        success ? 'completed' : 'failed',
        body,
        body.substring(0, 100),
        new Date(),
        userId,
      ]);
    } catch (error) {
      console.error('Failed to log SMS communication:', error);
    }
  }

  /**
   * Map database row to SmsMessage
   */
  private mapRowToMessage(row: Record<string, unknown>): SmsMessage {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      provider: row.provider as SmsMessage['provider'],
      externalId: row.external_id as string | undefined,
      from: row.from_number as string,
      to: row.to_number as string,
      body: row.body as string,
      direction: row.direction as SmsDirection,
      status: row.status as SmsStatus,
      errorCode: row.error_code as string | undefined,
      errorMessage: row.error_message as string | undefined,
      numSegments: row.num_segments as number | undefined,
      price: row.price as number | undefined,
      priceUnit: row.price_unit as string | undefined,
      linkedEntityType: row.linked_entity_type as SmsMessage['linkedEntityType'],
      linkedEntityId: row.linked_entity_id as string | undefined,
      userId: row.user_id as string | undefined,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
      receivedAt: row.received_at ? new Date(row.received_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to SmsTemplate
   */
  private mapRowToTemplate(row: Record<string, unknown>): SmsTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      body: row.body as string,
      category: row.category as string | undefined,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags as string[],
      isActive: row.is_active as boolean,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
