/**
 * Facebook Messenger Service
 * Unified service for Messenger messaging operations with CRM integration
 *
 * Multi-tenant: Each tenant connects their own Facebook Page via OAuth.
 * Page tokens are stored encrypted in the messenger_pages table.
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { MessengerProvider } from './messenger.provider';
import {
  SendMessageInput,
  SendMessengerMessageInput,
  MessengerWebhookPayload,
  MessengerMessageType,
  MessengerConversation,
  MessengerMessageRecord,
  MessengerProviderStatus,
  MessengerProviderConfig,
  MessengerTemplateElement,
  MessengerButton,
  MessengerQuickReply,
  MessengerMessageTag,
  BulkMessengerMessageInput,
  BulkMessengerMessageResult,
  ConversationFilter,
  MessageFilter,
  ConversationStats,
  MessengerConversationStatus,
  ParsedMessengerPostback,
} from './types';

// Token encryption key (should be in env)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Decrypt page access token from database
 */
function decryptToken(encryptedToken: string): string {
  try {
    const [ivHex, encrypted] = encryptedToken.split(':');
    if (!ivHex || !encrypted) return encryptedToken; // Not encrypted (backward compat)
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedToken; // Return as-is if decryption fails
  }
}

/**
 * Tenant page configuration from database
 */
interface TenantPageConfig {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  appId: string;
  webhookVerifyToken?: string;
}

@injectable()
export class MessengerService {
  // Cache providers per tenant to avoid repeated DB lookups
  private providerCache: Map<string, { provider: MessengerProvider; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Get provider for a specific tenant
   * Loads page configuration from database
   */
  private async getProviderForTenant(tenantId: string): Promise<MessengerProvider | null> {
    // Check cache first
    const cached = this.providerCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.provider;
    }

    // Load from database
    const config = await this.getTenantPageConfig(tenantId);
    if (!config) {
      return null;
    }

    // Create provider with tenant-specific config
    const provider = new MessengerProvider({
      pageAccessToken: config.pageAccessToken,
      pageId: config.pageId,
      appId: config.appId,
      appSecret: process.env.MESSENGER_APP_SECRET || '',
      verifyToken: config.webhookVerifyToken || process.env.MESSENGER_VERIFY_TOKEN || '',
    });

    // Cache it
    this.providerCache.set(tenantId, {
      provider,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return provider;
  }

  /**
   * Get tenant's page configuration from database
   */
  private async getTenantPageConfig(tenantId: string): Promise<TenantPageConfig | null> {
    try {
      const result = await this.pool.query(
        `SELECT page_id, page_name, page_access_token, app_id, webhook_verify_token
         FROM messenger_pages
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY is_default DESC
         LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        pageId: row.page_id,
        pageName: row.page_name,
        pageAccessToken: decryptToken(row.page_access_token),
        appId: row.app_id,
        webhookVerifyToken: row.webhook_verify_token,
      };
    } catch (error) {
      console.error('Failed to get tenant page config:', error);
      return null;
    }
  }

  /**
   * Clear provider cache for a tenant (call after reconnecting)
   */
  clearProviderCache(tenantId: string): void {
    this.providerCache.delete(tenantId);
  }

  /**
   * Get provider status for a tenant
   */
  async getProviderStatus(tenantId?: string): Promise<MessengerProviderStatus> {
    // If tenantId provided, get tenant-specific status
    if (tenantId) {
      const provider = await this.getProviderForTenant(tenantId);
      if (!provider) {
        return {
          available: false,
          isConnected: false,
        };
      }
      return provider.getStatus();
    }

    // Fallback to env-based provider (for backward compatibility)
    const defaultProvider = new MessengerProvider();
    return defaultProvider.getStatus();
  }

  /**
   * Send a message
   */
  async sendMessage(input: SendMessageInput): Promise<Result<MessengerMessageRecord>> {
    const { tenantId, to, content, leadId, customerId, contactId } = input;

    // Get provider for this tenant
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return Result.fail('Messenger not configured. Please connect a Facebook Page in Settings > Integrations.');
    }

    // Send via provider
    const result = await provider.sendMessage(content);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to send message');
    }

    const fbMessageId = result.data?.message_id;
    if (!fbMessageId) {
      return Result.fail('No message ID returned from Messenger');
    }

    // Get or create conversation
    const conversationResult = await this.getOrCreateConversation({
      tenantId,
      psid: to,
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
        `INSERT INTO messenger_messages (
          id, tenant_id, conversation_id, fb_message_id, direction, type,
          content, content_json, status, sent_at, timestamp, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'outbound', $5, $6, $7, 'sent', $8, $8, $8, $8)`,
        [
          messageId,
          tenantId,
          conversation.id,
          fbMessageId,
          content.message.attachment?.type || 'text',
          messageContent,
          JSON.stringify(content.message),
          now,
        ]
      );

      // Update conversation
      await this.pool.query(
        `UPDATE messenger_conversations SET
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

      const messageRecord: MessengerMessageRecord = {
        id: messageId,
        tenantId,
        conversationId: conversation.id,
        fbMessageId,
        direction: 'outbound',
        type: (content.message.attachment?.type || 'text') as MessengerMessageType,
        content: messageContent,
        status: 'sent',
        sentAt: now,
        timestamp: now,
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
    options?: {
      leadId?: string;
      customerId?: string;
      quickReplies?: Array<{ title: string; payload: string }>;
    }
  ): Promise<Result<MessengerMessageRecord>> {
    const message: SendMessengerMessageInput['message'] = { text };

    if (options?.quickReplies?.length) {
      message.quick_replies = options.quickReplies.map((qr) => ({
        content_type: 'text' as const,
        title: qr.title,
        payload: qr.payload,
      }));
    }

    return this.sendMessage({
      tenantId,
      to,
      type: 'text',
      content: {
        recipientId: to,
        messageType: 'RESPONSE',
        message,
      },
      leadId: options?.leadId,
      customerId: options?.customerId,
    });
  }

  /**
   * Send a generic template (carousel)
   */
  async sendGenericTemplate(
    tenantId: string,
    to: string,
    elements: MessengerTemplateElement[],
    options?: { leadId?: string; customerId?: string }
  ): Promise<Result<MessengerMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type: 'template',
      content: {
        recipientId: to,
        messageType: 'RESPONSE',
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'generic',
              elements,
            },
          },
        },
      },
      ...options,
    });
  }

  /**
   * Send a button template
   */
  async sendButtonTemplate(
    tenantId: string,
    to: string,
    text: string,
    buttons: MessengerButton[],
    options?: { leadId?: string; customerId?: string }
  ): Promise<Result<MessengerMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type: 'template',
      content: {
        recipientId: to,
        messageType: 'RESPONSE',
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              text,
              buttons,
            },
          },
        },
      },
      ...options,
    });
  }

  /**
   * Send media attachment
   */
  async sendMedia(
    tenantId: string,
    to: string,
    type: 'image' | 'video' | 'audio' | 'file',
    url: string,
    options?: { leadId?: string; customerId?: string }
  ): Promise<Result<MessengerMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type,
      content: {
        recipientId: to,
        messageType: 'RESPONSE',
        message: {
          attachment: {
            type,
            payload: {
              url,
              is_reusable: true,
            },
          },
        },
      },
      ...options,
    });
  }

  /**
   * Send tagged message (for sending outside 24h window)
   */
  async sendTaggedMessage(
    tenantId: string,
    to: string,
    text: string,
    tag: MessengerMessageTag,
    options?: { leadId?: string; customerId?: string }
  ): Promise<Result<MessengerMessageRecord>> {
    return this.sendMessage({
      tenantId,
      to,
      type: 'text',
      content: {
        recipientId: to,
        messageType: 'MESSAGE_TAG',
        tag,
        message: { text },
      },
      ...options,
    });
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(
    tenantId: string,
    input: BulkMessengerMessageInput
  ): Promise<Result<BulkMessengerMessageResult>> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return Result.fail('Messenger not configured. Please connect a Facebook Page in Settings > Integrations.');
    }

    const result = await provider.sendBulkMessages(input);

    // Store results for successful messages
    for (const messageResult of result.results) {
      if (messageResult.success && messageResult.messageId) {
        try {
          const conversationResult = await this.getOrCreateConversation({
            tenantId,
            psid: messageResult.psid,
          });

          if (conversationResult.isSuccess && conversationResult.value) {
            const now = new Date();
            await this.pool.query(
              `INSERT INTO messenger_messages (
                id, tenant_id, conversation_id, fb_message_id, direction, type,
                content, status, sent_at, timestamp, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, 'outbound', 'text', $5, 'sent', $6, $6, $6, $6)`,
              [
                uuidv4(),
                tenantId,
                conversationResult.value.id,
                messageResult.messageId,
                input.message.text || '[Template Message]',
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
    payload: MessengerWebhookPayload
  ): Promise<Result<{ messagesProcessed: number; statusUpdates: number; postbacksProcessed: number }>> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      // Log but don't fail - webhook should always return 200
      console.warn(`Messenger webhook received but no provider configured for tenant ${tenantId}`);
      return Result.ok({ messagesProcessed: 0, statusUpdates: 0, postbacksProcessed: 0 });
    }

    const parsed = provider.parseWebhookPayload(payload);
    let messagesProcessed = 0;
    let statusUpdates = 0;
    let postbacksProcessed = 0;

    // Update last webhook timestamp for observability
    await this.updateLastWebhookTimestamp(tenantId);

    // Process incoming messages
    for (const msg of parsed.messages) {
      if (msg.isEcho) continue; // Skip echo messages

      try {
        // Get user profile for contact info
        let contactName: string | undefined;
        let contactProfilePic: string | undefined;

        const profileResult = await provider.getUserProfile(msg.psid);
        if (profileResult.success && profileResult.data) {
          contactName = profileResult.data.name;
          contactProfilePic = profileResult.data.profile_pic;
        }

        // Get or create conversation
        const conversationResult = await this.getOrCreateConversation({
          tenantId,
          psid: msg.psid,
          pageId: msg.pageId,
          contactName,
          contactProfilePic,
        });

        if (conversationResult.isFailure || !conversationResult.value) {
          console.error('Failed to get/create conversation:', conversationResult.error);
          continue;
        }

        const conversation = conversationResult.value;

        // Store message
        await this.pool.query(
          `INSERT INTO messenger_messages (
            id, tenant_id, conversation_id, fb_message_id, direction, type,
            content, attachment_type, attachment_url, reply_to_message_id,
            referral, status, timestamp, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'inbound', $5, $6, $7, $8, $9, $10, 'delivered', $11, NOW(), NOW())
          ON CONFLICT (fb_message_id) DO NOTHING`,
          [
            uuidv4(),
            tenantId,
            conversation.id,
            msg.messageId,
            msg.type,
            msg.content,
            msg.attachments?.[0]?.type || null,
            msg.attachments?.[0]?.url || null,
            msg.replyToMessageId || null,
            msg.referral ? JSON.stringify(msg.referral) : null,
            msg.timestamp,
          ]
        );

        // Update conversation
        await this.pool.query(
          `UPDATE messenger_conversations SET
            last_message_at = $1,
            last_message_preview = $2,
            last_message_direction = 'inbound',
            total_messages = total_messages + 1,
            unread_count = unread_count + 1,
            window_expires_at = $3,
            is_within_window = true,
            contact_name = COALESCE($4, contact_name),
            contact_profile_pic = COALESCE($5, contact_profile_pic),
            status = CASE WHEN status = 'resolved' THEN 'active' ELSE status END,
            updated_at = NOW()
          WHERE id = $6`,
          [
            msg.timestamp,
            msg.content.substring(0, 200),
            new Date(msg.timestamp.getTime() + 24 * 60 * 60 * 1000),
            contactName,
            contactProfilePic,
            conversation.id,
          ]
        );

        messagesProcessed++;
      } catch (error) {
        console.error('Failed to process message:', error);
      }
    }

    // Process delivery receipts
    for (const delivery of parsed.deliveries) {
      try {
        for (const msgId of delivery.messageIds) {
          await this.pool.query(
            `UPDATE messenger_messages SET
              status = 'delivered',
              delivered_at = $1,
              updated_at = NOW()
            WHERE fb_message_id = $2 AND status = 'sent'`,
            [delivery.watermark, msgId]
          );
          statusUpdates++;
        }
      } catch (error) {
        console.error('Failed to update delivery status:', error);
      }
    }

    // Process read receipts
    for (const read of parsed.reads) {
      try {
        // Mark all messages before watermark as read
        await this.pool.query(
          `UPDATE messenger_messages SET
            status = 'read',
            read_at = $1,
            updated_at = NOW()
          WHERE conversation_id IN (
            SELECT id FROM messenger_conversations
            WHERE tenant_id = $2 AND psid = $3
          )
          AND direction = 'outbound'
          AND timestamp <= $1
          AND status IN ('sent', 'delivered')`,
          [read.watermark, tenantId, read.psid]
        );
        statusUpdates++;
      } catch (error) {
        console.error('Failed to update read status:', error);
      }
    }

    // Process postbacks
    for (const postback of parsed.postbacks) {
      try {
        await this.processPostback(tenantId, postback);
        postbacksProcessed++;
      } catch (error) {
        console.error('Failed to process postback:', error);
      }
    }

    return Result.ok({ messagesProcessed, statusUpdates, postbacksProcessed });
  }

  /**
   * Process postback (button click, get started, etc.)
   */
  private async processPostback(tenantId: string, postback: ParsedMessengerPostback): Promise<void> {
    // Get or create conversation
    const conversationResult = await this.getOrCreateConversation({
      tenantId,
      psid: postback.psid,
      pageId: postback.pageId,
    });

    if (conversationResult.isFailure || !conversationResult.value) {
      return;
    }

    const conversation = conversationResult.value;

    // Store as a message
    await this.pool.query(
      `INSERT INTO messenger_messages (
        id, tenant_id, conversation_id, direction, type, content,
        referral, status, timestamp, created_at, updated_at
      ) VALUES ($1, $2, $3, 'inbound', 'postback', $4, $5, 'delivered', $6, NOW(), NOW())`,
      [
        uuidv4(),
        tenantId,
        conversation.id,
        `[Postback: ${postback.title}] ${postback.payload}`,
        postback.referral ? JSON.stringify(postback.referral) : null,
        postback.timestamp,
      ]
    );

    // Update conversation
    await this.pool.query(
      `UPDATE messenger_conversations SET
        last_message_at = $1,
        last_message_preview = $2,
        last_message_direction = 'inbound',
        total_messages = total_messages + 1,
        unread_count = unread_count + 1,
        is_within_window = true,
        window_expires_at = $3,
        updated_at = NOW()
      WHERE id = $4`,
      [
        postback.timestamp,
        `[Button: ${postback.title}]`,
        new Date(postback.timestamp.getTime() + 24 * 60 * 60 * 1000),
        conversation.id,
      ]
    );
  }

  /**
   * Verify webhook signature
   * Uses global app secret (same for all tenants)
   */
  verifyWebhookSignature(payload: string, signature: string, appSecret?: string): boolean {
    // Use a default provider for signature verification (app secret is global)
    const provider = new MessengerProvider({
      appSecret: appSecret || process.env.MESSENGER_APP_SECRET || '',
      pageAccessToken: '',
      pageId: '',
      appId: '',
      verifyToken: '',
    });
    return provider.verifyWebhookSignature(payload, signature);
  }

  /**
   * Verify webhook challenge (for setup)
   * Uses global verify token or tenant-specific
   */
  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string,
    tenantVerifyToken?: string
  ): { verified: boolean; challenge?: string } {
    const verifyToken = tenantVerifyToken || process.env.MESSENGER_VERIFY_TOKEN || '';
    const provider = new MessengerProvider({
      verifyToken,
      pageAccessToken: '',
      pageId: '',
      appId: '',
      appSecret: '',
    });
    return provider.verifyWebhookChallenge(mode, token, challenge);
  }

  /**
   * Get conversations
   */
  async getConversations(
    filter: ConversationFilter
  ): Promise<Result<{ conversations: MessengerConversation[]; total: number }>> {
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
      conditions.push(`(contact_name ILIKE $${paramIndex} OR psid ILIKE $${paramIndex})`);
      params.push(`%${filter.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    try {
      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM messenger_conversations WHERE ${whereClause}`,
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
        `SELECT * FROM messenger_conversations
         WHERE ${whereClause}
         ORDER BY last_message_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch conversations');
      }

      const conversations = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapConversationRow(row)
      );

      return Result.ok({ conversations, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<Result<MessengerConversation>> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM messenger_conversations WHERE id = $1 AND tenant_id = $2',
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
  async getMessages(
    filter: MessageFilter
  ): Promise<Result<{ messages: MessengerMessageRecord[]; total: number }>> {
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
        `SELECT COUNT(*) as count FROM messenger_messages WHERE ${whereClause}`,
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
        `SELECT * FROM messenger_messages
         WHERE ${whereClause}
         ORDER BY timestamp DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch messages');
      }

      const messages = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapMessageRow(row)
      );

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
      // Get provider and conversation to send mark_seen action
      const provider = await this.getProviderForTenant(tenantId);
      const convResult = await this.getConversation(tenantId, conversationId);
      if (provider && convResult.isSuccess && convResult.value) {
        await provider.markSeen(convResult.value.psid);
      }

      await this.pool.query(
        `UPDATE messenger_conversations SET unread_count = 0, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [conversationId, tenantId]
      );

      await this.pool.query(
        `UPDATE messenger_messages SET read_at = NOW(), updated_at = NOW()
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
        `UPDATE messenger_conversations SET
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
    status: MessengerConversationStatus
  ): Promise<Result<void>> {
    try {
      const timestampField =
        status === 'resolved' ? 'resolved_at' : status === 'archived' ? 'archived_at' : null;

      let query = `UPDATE messenger_conversations SET status = $1, updated_at = NOW()`;
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
        `UPDATE messenger_conversations SET ${columnMap[linkType]} = $1, updated_at = NOW()
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
        FROM messenger_conversations
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
   * Get user profile from Facebook
   */
  async getUserProfile(tenantId: string, psid: string): Promise<Result<{ name?: string; profilePic?: string }>> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return Result.fail('Messenger not configured');
    }

    const result = await provider.getUserProfile(psid);

    if (!result.success || !result.data) {
      return Result.fail(result.error || 'Failed to get user profile');
    }

    return Result.ok({
      name: result.data.name,
      profilePic: result.data.profile_pic,
    });
  }

  /**
   * Show typing indicator
   */
  async typingOn(tenantId: string, psid: string): Promise<Result<void>> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return Result.fail('Messenger not configured');
    }

    const result = await provider.typingOn(psid);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to show typing indicator');
    }
    return Result.ok(undefined);
  }

  /**
   * Hide typing indicator
   */
  async typingOff(tenantId: string, psid: string): Promise<Result<void>> {
    const provider = await this.getProviderForTenant(tenantId);
    if (!provider) {
      return Result.fail('Messenger not configured');
    }

    const result = await provider.typingOff(psid);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to hide typing indicator');
    }
    return Result.ok(undefined);
  }

  /**
   * Update last webhook timestamp for observability
   */
  private async updateLastWebhookTimestamp(tenantId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE messenger_pages SET
          updated_at = NOW()
         WHERE tenant_id = $1 AND is_active = true`,
        [tenantId]
      );
    } catch (error) {
      console.error('Failed to update webhook timestamp:', error);
    }
  }

  /**
   * Get integration health status for a tenant
   */
  async getHealthStatus(tenantId: string): Promise<Result<{
    connected: boolean;
    pageId?: string;
    pageName?: string;
    lastWebhookAt?: Date;
    permissionsGranted?: string[];
    tokenStatus: 'valid' | 'expired' | 'not_configured';
  }>> {
    try {
      const result = await this.pool.query(
        `SELECT page_id, page_name, page_access_token, permissions_granted, updated_at
         FROM messenger_pages
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY is_default DESC
         LIMIT 1`,
        [tenantId]
      );

      if (result.isFailure || !result.value?.rows?.length) {
        return Result.ok({
          connected: false,
          tokenStatus: 'not_configured',
        });
      }

      const row = result.value.rows[0];

      // Test if token is still valid
      const provider = await this.getProviderForTenant(tenantId);
      if (!provider) {
        return Result.ok({
          connected: false,
          pageId: row.page_id,
          pageName: row.page_name,
          tokenStatus: 'expired',
        });
      }

      const status = await provider.getStatus();

      return Result.ok({
        connected: status.isConnected || false,
        pageId: row.page_id,
        pageName: row.page_name,
        lastWebhookAt: row.updated_at,
        permissionsGranted: row.permissions_granted || [],
        tokenStatus: status.isConnected ? 'valid' : 'expired',
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  // ==================== Private Helper Methods ====================

  private async getOrCreateConversation(data: {
    tenantId: string;
    psid: string;
    pageId?: string;
    contactName?: string;
    contactProfilePic?: string;
  }): Promise<Result<MessengerConversation>> {
    const { tenantId, psid, pageId, contactName, contactProfilePic } = data;

    try {
      // Try to find existing conversation
      const existing = await this.pool.query(
        `SELECT * FROM messenger_conversations
         WHERE tenant_id = $1 AND psid = $2
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, psid]
      );

      if (existing.isSuccess && existing.value?.rows?.length) {
        return Result.ok(this.mapConversationRow(existing.value.rows[0] as Record<string, unknown>));
      }

      // Create new conversation
      const id = uuidv4();
      const now = new Date();

      await this.pool.query(
        `INSERT INTO messenger_conversations (
          id, tenant_id, page_id, psid, contact_name, contact_profile_pic,
          status, last_message_at, last_message_direction, unread_count,
          total_messages, is_within_window, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, 'outbound', 0, 0, true, $7, $7)`,
        [
          id,
          tenantId,
          pageId || process.env.MESSENGER_PAGE_ID || '',
          psid,
          contactName,
          contactProfilePic,
          now,
        ]
      );

      const conversation: MessengerConversation = {
        id,
        tenantId,
        pageId: pageId || process.env.MESSENGER_PAGE_ID || '',
        psid,
        contactName,
        contactProfilePic,
        status: 'active',
        lastMessageAt: now,
        lastMessageDirection: 'outbound',
        unreadCount: 0,
        totalMessages: 0,
        isWithinWindow: true,
        createdAt: now,
        updatedAt: now,
      };

      return Result.ok(conversation);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Database error');
    }
  }

  private extractMessageContent(input: SendMessengerMessageInput): string {
    const msg = input.message;

    if (msg.text) return msg.text;

    if (msg.attachment) {
      const att = msg.attachment;
      if (att.type === 'template') {
        const templateType = att.payload.template_type;
        if (templateType === 'generic') {
          const firstElement = att.payload.elements?.[0];
          return firstElement ? `[Template: ${firstElement.title}]` : '[Template]';
        }
        if (templateType === 'button') {
          return att.payload.text || '[Button Template]';
        }
        return `[${templateType} Template]`;
      }
      return `[${att.type}${att.payload.url ? ': ' + att.payload.url : ''}]`;
    }

    if (msg.quick_replies?.length) {
      return '[Quick Replies]';
    }

    return '';
  }

  private mapConversationRow(row: Record<string, unknown>): MessengerConversation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      pageId: row.page_id as string,
      psid: row.psid as string,
      contactName: row.contact_name as string | undefined,
      contactProfilePic: row.contact_profile_pic as string | undefined,
      status: row.status as MessengerConversationStatus,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at as string) : undefined,
      lastMessagePreview: row.last_message_preview as string | undefined,
      lastMessageDirection: row.last_message_direction as 'inbound' | 'outbound',
      unreadCount: row.unread_count as number,
      totalMessages: row.total_messages as number,
      assignedTo: row.assigned_to as string | undefined,
      assignedAt: row.assigned_at ? new Date(row.assigned_at as string) : undefined,
      leadId: row.lead_id as string | undefined,
      customerId: row.customer_id as string | undefined,
      contactId: row.contact_id as string | undefined,
      labels: row.labels as string[] | undefined,
      windowExpiresAt: row.window_expires_at ? new Date(row.window_expires_at as string) : undefined,
      isWithinWindow: row.is_within_window as boolean,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
      archivedAt: row.archived_at ? new Date(row.archived_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapMessageRow(row: Record<string, unknown>): MessengerMessageRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      conversationId: row.conversation_id as string,
      fbMessageId: row.fb_message_id as string | undefined,
      direction: row.direction as 'inbound' | 'outbound',
      type: row.type as MessengerMessageType,
      content: row.content as string | undefined,
      contentJson: row.content_json as Record<string, unknown> | undefined,
      attachmentType: row.attachment_type as string | undefined,
      attachmentUrl: row.attachment_url as string | undefined,
      attachmentPayload: row.attachment_payload as Record<string, unknown> | undefined,
      quickReplies: row.quick_replies as MessengerQuickReply[] | undefined,
      templateType: row.template_type as MessengerMessageRecord['templateType'],
      status: row.status as MessengerMessageRecord['status'],
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
      readAt: row.read_at ? new Date(row.read_at as string) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at as string) : undefined,
      errorCode: row.error_code as number | undefined,
      errorMessage: row.error_message as string | undefined,
      replyToMessageId: row.reply_to_message_id as string | undefined,
      referral: row.referral as MessengerMessageRecord['referral'],
      timestamp: new Date(row.timestamp as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
