/**
 * WhatsApp Service
 * Unified service for WhatsApp messaging operations with CRM integration
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import { WhatsAppProvider } from './whatsapp.provider';
import {
  SendWhatsAppMessageInput,
  WhatsAppWebhookPayload,
  WhatsAppMessageType,
  WhatsAppConversation,
  WhatsAppMessageRecord,
  WhatsAppProviderStatus,
  WhatsAppTemplate,
  WhatsAppTemplateComponent,
  BulkWhatsAppMessageInput,
  BulkWhatsAppMessageResult,
} from './types';

/**
 * Service input types
 */
export interface SendMessageInput {
  tenantId: string;
  to: string;
  type: WhatsAppMessageType;
  content: SendWhatsAppMessageInput;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  userId?: string;
}

export interface ConversationFilter {
  tenantId: string;
  status?: 'active' | 'resolved' | 'archived' | 'blocked';
  assignedTo?: string;
  leadId?: string;
  customerId?: string;
  unreadOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MessageFilter {
  conversationId: string;
  tenantId: string;
  type?: WhatsAppMessageType;
  direction?: 'inbound' | 'outbound';
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface ConversationStats {
  total: number;
  active: number;
  resolved: number;
  archived: number;
  unreadCount: number;
  avgResponseTimeMinutes: number;
}

@injectable()
export class WhatsAppService {
  private provider: WhatsAppProvider;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.provider = new WhatsAppProvider();
  }

  /**
   * Get provider status
   */
  async getProviderStatus(): Promise<WhatsAppProviderStatus> {
    return this.provider.getStatus();
  }

  /**
   * Send a message
   */
  async sendMessage(input: SendMessageInput): Promise<Result<WhatsAppMessageRecord>> {
    const { tenantId, to, content, leadId, customerId, contactId, userId } = input;

    // Send via provider
    const result = await this.provider.sendMessage(content);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to send message');
    }

    const waMessageId = result.data?.messages[0]?.id;
    if (!waMessageId) {
      return Result.fail('No message ID returned from WhatsApp');
    }

    // Get or create conversation
    const conversationResult = await this.getOrCreateConversation({
      tenantId,
      contactPhone: to,
      contactWaId: result.data?.contacts[0]?.wa_id || to,
      contactName: result.data?.contacts[0]?.input,
    });

    if (conversationResult.isFailure || !conversationResult.value) {
      return Result.fail(conversationResult.error || 'Failed to get/create conversation');
    }

    const conversation = conversationResult.value;

    // Store message record
    const messageId = uuidv4();
    const now = new Date();
    const messageContent = this.extractMessageContent(content);

    try {
      await this.pool.query(
        `INSERT INTO whatsapp_messages (
          id, tenant_id, conversation_id, wa_message_id, direction, type,
          content, content_json, status, sent_at, timestamp, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'outbound', $5, $6, $7, 'sent', $8, $8, $8, $8)`,
        [
          messageId,
          tenantId,
          conversation.id,
          waMessageId,
          content.type,
          messageContent,
          JSON.stringify(content),
          now,
        ]
      );

      // Update conversation
      await this.pool.query(
        `UPDATE whatsapp_conversations SET
          last_message_at = $1,
          last_message_preview = $2,
          last_message_direction = 'outbound',
          total_messages = total_messages + 1,
          window_expires_at = $3,
          is_within_window = true,
          lead_id = COALESCE($4, lead_id),
          customer_id = COALESCE($5, customer_id),
          contact_id = COALESCE($6, contact_id),
          updated_at = $1
        WHERE id = $7`,
        [
          now,
          messageContent.substring(0, 200),
          new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours window
          leadId || null,
          customerId || null,
          contactId || null,
          conversation.id,
        ]
      );

      const messageRecord: WhatsAppMessageRecord = {
        id: messageId,
        tenantId,
        conversationId: conversation.id,
        waMessageId,
        direction: 'outbound',
        type: content.type,
        content: messageContent,
        status: 'sent',
        sentAt: now,
        createdAt: now,
        updatedAt: now,
      };

      return Result.ok(messageRecord);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Send a text message (convenience method)
   */
  async sendTextMessage(
    tenantId: string,
    to: string,
    text: string,
    options?: { leadId?: string; customerId?: string; userId?: string }
  ): Promise<Result<WhatsAppMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type: 'text',
      content: {
        to,
        type: 'text',
        text: { body: text },
      },
      ...options,
    });
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    tenantId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components?: WhatsAppTemplateComponent[],
    options?: { leadId?: string; customerId?: string; userId?: string }
  ): Promise<Result<WhatsAppMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type: 'template',
      content: {
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      ...options,
    });
  }

  /**
   * Send bulk template messages
   */
  async sendBulkTemplateMessages(
    tenantId: string,
    input: BulkWhatsAppMessageInput
  ): Promise<Result<BulkWhatsAppMessageResult>> {
    const result = await this.provider.sendBulkTemplateMessages(input);

    // Store results for successful messages
    for (const messageResult of result.results) {
      if (messageResult.success && messageResult.messageId) {
        try {
          const conversationResult = await this.getOrCreateConversation({
            tenantId,
            contactPhone: messageResult.phone,
            contactWaId: messageResult.phone,
          });

          if (conversationResult.isSuccess && conversationResult.value) {
            const now = new Date();
            await this.pool.query(
              `INSERT INTO whatsapp_messages (
                id, tenant_id, conversation_id, wa_message_id, direction, type,
                content, template_name, template_language, status, sent_at, timestamp,
                created_at, updated_at
              ) VALUES ($1, $2, $3, $4, 'outbound', 'template', $5, $6, $7, 'sent', $8, $8, $8, $8)`,
              [
                uuidv4(),
                tenantId,
                conversationResult.value.id,
                messageResult.messageId,
                `Template: ${input.template.name}`,
                input.template.name,
                input.template.language.code,
                now,
              ]
            );
          }
        } catch (error) {
          console.error('Failed to store bulk message:', error);
        }
      }
    }

    return Result.ok(result);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    tenantId: string,
    payload: WhatsAppWebhookPayload
  ): Promise<Result<{ messagesProcessed: number; statusUpdates: number }>> {
    const parsed = this.provider.parseWebhookPayload(payload);
    let messagesProcessed = 0;
    let statusUpdates = 0;

    // Process incoming messages
    for (const msg of parsed.messages) {
      try {
        // Get or create conversation
        const conversationResult = await this.getOrCreateConversation({
          tenantId,
          contactPhone: msg.from,
          contactWaId: msg.from,
          phoneNumberId: parsed.phoneNumberId,
          displayPhoneNumber: parsed.displayPhoneNumber,
        });

        if (conversationResult.isFailure || !conversationResult.value) {
          console.error('Failed to get/create conversation:', conversationResult.error);
          continue;
        }

        const conversation = conversationResult.value;

        // Store message
        await this.pool.query(
          `INSERT INTO whatsapp_messages (
            id, tenant_id, conversation_id, wa_message_id, direction, type,
            content, media_id, reply_to_message_id, status, timestamp, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'inbound', $5, $6, $7, $8, 'delivered', $9, NOW(), NOW())
          ON CONFLICT (wa_message_id) DO NOTHING`,
          [
            uuidv4(),
            tenantId,
            conversation.id,
            msg.messageId,
            msg.type,
            msg.content,
            msg.mediaId || null,
            msg.context?.id || null,
            msg.timestamp,
          ]
        );

        // Update conversation
        await this.pool.query(
          `UPDATE whatsapp_conversations SET
            last_message_at = $1,
            last_message_preview = $2,
            last_message_direction = 'inbound',
            total_messages = total_messages + 1,
            unread_count = unread_count + 1,
            window_expires_at = $3,
            is_within_window = true,
            status = CASE WHEN status = 'resolved' THEN 'active' ELSE status END,
            updated_at = NOW()
          WHERE id = $4`,
          [
            msg.timestamp,
            msg.content.substring(0, 200),
            new Date(msg.timestamp.getTime() + 24 * 60 * 60 * 1000),
            conversation.id,
          ]
        );

        messagesProcessed++;
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    }

    // Process status updates
    for (const status of parsed.statusUpdates) {
      try {
        const statusColumn = this.getStatusColumn(status.status);
        if (statusColumn) {
          await this.pool.query(
            `UPDATE whatsapp_messages SET
              status = $1,
              ${statusColumn} = $2,
              error_code = $3,
              error_message = $4,
              updated_at = NOW()
            WHERE wa_message_id = $5`,
            [
              status.status,
              status.timestamp,
              status.errorCode,
              status.errorMessage,
              status.messageId,
            ]
          );
          statusUpdates++;
        }
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    }

    return Result.ok({ messagesProcessed, statusUpdates });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret: string): boolean {
    return this.provider.verifyWebhookSignature(payload, signature, appSecret);
  }

  /**
   * Verify webhook challenge (for setup)
   */
  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string
  ): { verified: boolean; challenge?: string } {
    return this.provider.verifyWebhookChallenge(mode, token, challenge);
  }

  /**
   * Get conversations
   */
  async getConversations(filter: ConversationFilter): Promise<Result<{ conversations: WhatsAppConversation[]; total: number }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const params: (string | number | boolean)[] = [filter.tenantId];
    let paramIndex = 2;

    if (filter.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(filter.status);
    }

    if (filter.assignedTo) {
      conditions.push(`assigned_to = $${paramIndex++}`);
      params.push(filter.assignedTo);
    }

    if (filter.leadId) {
      conditions.push(`lead_id = $${paramIndex++}`);
      params.push(filter.leadId);
    }

    if (filter.customerId) {
      conditions.push(`customer_id = $${paramIndex++}`);
      params.push(filter.customerId);
    }

    if (filter.unreadOnly) {
      conditions.push('unread_count > 0');
    }

    if (filter.search) {
      conditions.push(`(contact_name ILIKE $${paramIndex} OR contact_phone ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    try {
      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM whatsapp_conversations WHERE ${whereClause}`,
        params
      );
      if (countResult.isFailure || !countResult.value?.rows?.[0]) {
        return Result.fail('Failed to count conversations');
      }
      const total = parseInt(countResult.value.rows[0].count as string, 10);

      // Get conversations
      const limit = filter.limit || 50;
      const offset = filter.offset || 0;

      const result = await this.pool.query(
        `SELECT * FROM whatsapp_conversations
         WHERE ${whereClause}
         ORDER BY last_message_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch conversations');
      }

      const conversations = result.value.rows.map((row: Record<string, unknown>) => this.mapConversationRow(row));

      return Result.ok({ conversations, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(tenantId: string, conversationId: string): Promise<Result<WhatsAppConversation>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM whatsapp_conversations WHERE id = $1 AND tenant_id = $2',
        [conversationId, tenantId]
      );

      if (result.isFailure || !result.value?.rows?.length) {
        return Result.fail('Conversation not found');
      }

      return Result.ok(this.mapConversationRow(result.value.rows[0] as Record<string, unknown>));
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(filter: MessageFilter): Promise<Result<{ messages: WhatsAppMessageRecord[]; total: number }>> {
    const conditions: string[] = ['conversation_id = $1', 'tenant_id = $2'];
    const params: (string | number | Date)[] = [filter.conversationId, filter.tenantId];
    let paramIndex = 3;

    if (filter.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(filter.type);
    }

    if (filter.direction) {
      conditions.push(`direction = $${paramIndex++}`);
      params.push(filter.direction);
    }

    if (filter.before) {
      conditions.push(`timestamp < $${paramIndex++}`);
      params.push(filter.before);
    }

    if (filter.after) {
      conditions.push(`timestamp > $${paramIndex++}`);
      params.push(filter.after);
    }

    const whereClause = conditions.join(' AND ');

    try {
      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM whatsapp_messages WHERE ${whereClause}`,
        params
      );
      if (countResult.isFailure || !countResult.value?.rows?.[0]) {
        return Result.fail('Failed to count messages');
      }
      const total = parseInt(countResult.value.rows[0].count as string, 10);

      // Get messages
      const limit = filter.limit || 100;
      const offset = filter.offset || 0;

      const result = await this.pool.query(
        `SELECT * FROM whatsapp_messages
         WHERE ${whereClause}
         ORDER BY timestamp DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch messages');
      }

      const messages = result.value.rows.map((row: Record<string, unknown>) => this.mapMessageRow(row));

      return Result.ok({ messages, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(tenantId: string, conversationId: string): Promise<Result<void>> {
    try {
      await this.pool.query(
        `UPDATE whatsapp_conversations SET unread_count = 0, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [conversationId, tenantId]
      );

      // Mark all messages as read
      await this.pool.query(
        `UPDATE whatsapp_messages SET read_at = NOW(), updated_at = NOW()
         WHERE conversation_id = $1 AND tenant_id = $2 AND direction = 'inbound' AND read_at IS NULL`,
        [conversationId, tenantId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Assign conversation to user
   */
  async assignConversation(
    tenantId: string,
    conversationId: string,
    userId: string | null
  ): Promise<Result<void>> {
    try {
      await this.pool.query(
        `UPDATE whatsapp_conversations SET
          assigned_to = $1,
          assigned_at = $2,
          updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4`,
        [userId, userId ? new Date() : null, conversationId, tenantId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(
    tenantId: string,
    conversationId: string,
    status: 'active' | 'resolved' | 'archived' | 'blocked'
  ): Promise<Result<void>> {
    try {
      const timestampField = status === 'resolved' ? 'resolved_at' :
                            status === 'archived' ? 'archived_at' : null;

      let query = `UPDATE whatsapp_conversations SET status = $1, updated_at = NOW()`;
      const params: (string | Date)[] = [status];

      if (timestampField) {
        query += `, ${timestampField} = $4`;
        params.push(conversationId, tenantId, new Date());
      } else {
        params.push(conversationId, tenantId);
      }

      query += ` WHERE id = $2 AND tenant_id = $3`;

      await this.pool.query(query, params);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Link conversation to CRM entity
   */
  async linkConversation(
    tenantId: string,
    conversationId: string,
    linkType: 'lead' | 'customer' | 'contact',
    entityId: string
  ): Promise<Result<void>> {
    try {
      const columnMap = {
        lead: 'lead_id',
        customer: 'customer_id',
        contact: 'contact_id',
      };

      await this.pool.query(
        `UPDATE whatsapp_conversations SET ${columnMap[linkType]} = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [entityId, conversationId, tenantId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(tenantId: string): Promise<Result<ConversationStats>> {
    try {
      const result = await this.pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
          COUNT(*) FILTER (WHERE status = 'archived') as archived,
          SUM(unread_count) as unread_total
        FROM whatsapp_conversations
        WHERE tenant_id = $1`,
        [tenantId]
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to get statistics');
      }

      const row = result.value.rows[0] as Record<string, unknown>;

      return Result.ok({
        total: parseInt(row.total as string, 10),
        active: parseInt(row.active as string, 10),
        resolved: parseInt(row.resolved as string, 10),
        archived: parseInt(row.archived as string, 10),
        unreadCount: parseInt((row.unread_total as string) || '0', 10),
        avgResponseTimeMinutes: 0, // TODO: Calculate from message timestamps
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Get templates (cached from provider)
   */
  async getTemplates(tenantId: string): Promise<Result<WhatsAppTemplate[]>> {
    // First try to get from cache
    try {
      const cached = await this.pool.query(
        `SELECT * FROM whatsapp_templates
         WHERE tenant_id = $1 AND status = 'APPROVED'
         ORDER BY name`,
        [tenantId]
      );

      if (cached.isSuccess && cached.value?.rows?.length) {
        return Result.ok(cached.value.rows.map((row: Record<string, unknown>) => ({
          id: row.template_id as string,
          name: row.name as string,
          status: row.status as 'APPROVED' | 'PENDING' | 'REJECTED',
          category: row.category as 'AUTHENTICATION' | 'MARKETING' | 'UTILITY',
          language: row.language as string,
          components: row.components as WhatsAppTemplate['components'],
        })));
      }
    } catch {
      // Continue to fetch from provider
    }

    // Fetch from provider
    const result = await this.provider.getTemplates();
    if (!result.success || !result.data) {
      return Result.fail(result.error || 'Failed to fetch templates');
    }

    // Cache templates
    for (const template of result.data) {
      try {
        await this.pool.query(
          `INSERT INTO whatsapp_templates (
            id, tenant_id, template_id, name, status, category, language, components,
            last_synced_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
          ON CONFLICT (tenant_id, template_id, language)
          DO UPDATE SET status = $5, components = $8, last_synced_at = NOW(), updated_at = NOW()`,
          [
            uuidv4(),
            tenantId,
            template.id,
            template.name,
            template.status,
            template.category,
            template.language,
            JSON.stringify(template.components),
          ]
        );
      } catch (error) {
        console.error('Failed to cache template:', error);
      }
    }

    return Result.ok(result.data);
  }

  /**
   * Sync templates from provider
   */
  async syncTemplates(tenantId: string): Promise<Result<{ synced: number }>> {
    const result = await this.getTemplates(tenantId);
    if (result.isFailure || !result.value) {
      return Result.fail(result.error || 'Failed to sync templates');
    }

    return Result.ok({ synced: result.value.length });
  }

  // Private helper methods

  private async getOrCreateConversation(data: {
    tenantId: string;
    contactPhone: string;
    contactWaId: string;
    contactName?: string;
    phoneNumberId?: string;
    displayPhoneNumber?: string;
  }): Promise<Result<WhatsAppConversation>> {
    const { tenantId, contactPhone, contactWaId, contactName, phoneNumberId, displayPhoneNumber } = data;

    try {
      // Try to find existing conversation
      const existing = await this.pool.query(
        `SELECT * FROM whatsapp_conversations
         WHERE tenant_id = $1 AND contact_wa_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, contactWaId]
      );

      if (existing.isSuccess && existing.value?.rows?.length) {
        return Result.ok(this.mapConversationRow(existing.value.rows[0] as Record<string, unknown>));
      }

      // Create new conversation
      const id = uuidv4();
      const now = new Date();

      await this.pool.query(
        `INSERT INTO whatsapp_conversations (
          id, tenant_id, phone_number_id, display_phone_number, contact_wa_id, contact_phone,
          contact_name, status, last_message_at, last_message_direction, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, 'outbound', $8, $8)`,
        [
          id,
          tenantId,
          phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
          displayPhoneNumber,
          contactWaId,
          contactPhone,
          contactName,
          now,
        ]
      );

      const conversation: WhatsAppConversation = {
        id,
        tenantId,
        phoneNumberId: phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        contactWaId,
        contactPhone,
        contactName,
        lastMessageAt: now,
        lastMessageDirection: 'outbound',
        unreadCount: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      return Result.ok(conversation);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  private extractMessageContent(input: SendWhatsAppMessageInput): string {
    switch (input.type) {
      case 'text':
        return input.text?.body || '';
      case 'template':
        return `Template: ${input.template?.name}`;
      case 'image':
        return input.image?.caption || '[Image]';
      case 'video':
        return input.video?.caption || '[Video]';
      case 'audio':
        return '[Audio]';
      case 'document':
        return input.document?.filename || '[Document]';
      case 'location':
        return `[Location: ${input.location?.name || ''}]`;
      case 'interactive':
        return input.interactive?.body?.text || '[Interactive]';
      case 'reaction':
        return input.reaction?.emoji || '';
      default:
        return '';
    }
  }

  private getStatusColumn(status: string): string | null {
    switch (status) {
      case 'sent':
        return 'sent_at';
      case 'delivered':
        return 'delivered_at';
      case 'read':
        return 'read_at';
      case 'failed':
        return 'failed_at';
      default:
        return null;
    }
  }

  private mapConversationRow(row: Record<string, unknown>): WhatsAppConversation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      phoneNumberId: row.phone_number_id as string,
      contactWaId: row.contact_wa_id as string,
      contactName: row.contact_name as string | undefined,
      contactPhone: row.contact_phone as string,
      lastMessageAt: new Date(row.last_message_at as string),
      lastMessagePreview: row.last_message_preview as string | undefined,
      lastMessageDirection: row.last_message_direction as 'inbound' | 'outbound',
      unreadCount: row.unread_count as number,
      status: row.status as 'active' | 'resolved' | 'archived',
      assignedTo: row.assigned_to as string | undefined,
      leadId: row.lead_id as string | undefined,
      customerId: row.customer_id as string | undefined,
      labels: row.labels as string[] | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapMessageRow(row: Record<string, unknown>): WhatsAppMessageRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      conversationId: row.conversation_id as string,
      waMessageId: row.wa_message_id as string,
      direction: row.direction as 'inbound' | 'outbound',
      type: row.type as WhatsAppMessageType,
      content: row.content as string,
      mediaUrl: row.media_url as string | undefined,
      mediaType: row.media_mime_type as string | undefined,
      mediaSize: row.media_size as number | undefined,
      status: row.status as 'sent' | 'delivered' | 'read' | 'failed' | 'deleted',
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
      readAt: row.read_at ? new Date(row.read_at as string) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at as string) : undefined,
      errorCode: row.error_code as number | undefined,
      errorMessage: row.error_message as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
