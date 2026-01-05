/**
 * Facebook Messenger Platform API Provider
 * Integration with Meta's Send API and Webhooks
 */

import * as crypto from 'crypto';
import {
  MessengerProviderConfig,
  MessengerProviderStatus,
  SendMessengerMessageInput,
  SendMessengerMessageResponse,
  MessengerWebhookPayload,
  MessengerIncomingMessage,
  MessengerUserProfile,
  MessengerPageInfo,
  BulkMessengerMessageInput,
  BulkMessengerMessageResult,
  MessengerMessage,
  MessengerButton,
  MessengerQuickReply,
  MessengerTemplateElement,
  MessengerMessageTag,
  ParsedWebhookPayload,
  ParsedMessengerMessage,
  ParsedMessengerDelivery,
  ParsedMessengerRead,
  ParsedMessengerPostback,
  ParsedMessengerReaction,
  MessengerMessageType,
} from './types';

/**
 * Facebook Messenger Platform API Provider
 * Handles all communication with Meta's Messenger Send API
 */
export class MessengerProvider {
  private config: MessengerProviderConfig;
  private baseUrl: string;

  constructor(config?: Partial<MessengerProviderConfig>) {
    this.config = {
      pageAccessToken: config?.pageAccessToken || process.env.MESSENGER_PAGE_ACCESS_TOKEN || '',
      appSecret: config?.appSecret || process.env.MESSENGER_APP_SECRET || '',
      appId: config?.appId || process.env.MESSENGER_APP_ID || '',
      pageId: config?.pageId || process.env.MESSENGER_PAGE_ID || '',
      verifyToken: config?.verifyToken || process.env.MESSENGER_VERIFY_TOKEN || '',
      apiVersion: config?.apiVersion || process.env.MESSENGER_API_VERSION || 'v18.0',
    };
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!(this.config.pageAccessToken && this.config.pageId);
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<MessengerProviderStatus> {
    if (!this.isAvailable()) {
      return { available: false };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.pageId}?fields=name,id&access_token=${this.config.pageAccessToken}`
      );

      if (!response.ok) {
        return { available: false };
      }

      const data = (await response.json()) as MessengerPageInfo;

      return {
        available: true,
        pageId: data.id,
        pageName: data.name,
        isConnected: true,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Send a message via Messenger
   */
  async sendMessage(
    input: SendMessengerMessageInput
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Messenger provider not configured' };
    }

    try {
      const payload: Record<string, unknown> = {
        recipient: { id: input.recipientId },
        messaging_type: input.messageType,
        message: input.message,
      };

      if (input.tag) {
        payload.tag = input.tag;
      }

      const response = await fetch(
        `${this.baseUrl}/me/messages?access_token=${this.config.pageAccessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      const data = (await response.json()) as SendMessengerMessageResponse & {
        error?: { message?: string; code?: number };
      };

      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || `API error: ${response.status}`,
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send text message (convenience method)
   */
  async sendTextMessage(
    recipientId: string,
    text: string,
    quickReplies?: Array<{ title: string; payload: string; imageUrl?: string }>
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    const message: MessengerMessage = { text };

    if (quickReplies?.length) {
      message.quick_replies = quickReplies.map((qr) => ({
        content_type: 'text' as const,
        title: qr.title,
        payload: qr.payload,
        image_url: qr.imageUrl,
      }));
    }

    return this.sendMessage({
      recipientId,
      messageType: 'RESPONSE',
      message,
    });
  }

  /**
   * Send generic template (carousel)
   */
  async sendGenericTemplate(
    recipientId: string,
    elements: MessengerTemplateElement[]
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    return this.sendMessage({
      recipientId,
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
    });
  }

  /**
   * Send button template
   */
  async sendButtonTemplate(
    recipientId: string,
    text: string,
    buttons: MessengerButton[]
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    return this.sendMessage({
      recipientId,
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
    });
  }

  /**
   * Send media attachment (image/video/file/audio)
   */
  async sendMedia(
    recipientId: string,
    type: 'image' | 'video' | 'audio' | 'file',
    url: string,
    isReusable: boolean = true
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    return this.sendMessage({
      recipientId,
      messageType: 'RESPONSE',
      message: {
        attachment: {
          type,
          payload: {
            url,
            is_reusable: isReusable,
          },
        },
      },
    });
  }

  /**
   * Send message with tag (for sending outside 24h window)
   */
  async sendTaggedMessage(
    recipientId: string,
    message: MessengerMessage,
    tag: MessengerMessageTag
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    return this.sendMessage({
      recipientId,
      messageType: 'MESSAGE_TAG',
      tag,
      message,
    });
  }

  /**
   * Send quick replies
   */
  async sendQuickReplies(
    recipientId: string,
    text: string,
    quickReplies: MessengerQuickReply[]
  ): Promise<{ success: boolean; data?: SendMessengerMessageResponse; error?: string }> {
    return this.sendMessage({
      recipientId,
      messageType: 'RESPONSE',
      message: {
        text,
        quick_replies: quickReplies,
      },
    });
  }

  /**
   * Send bulk messages
   */
  async sendBulkMessages(input: BulkMessengerMessageInput): Promise<BulkMessengerMessageResult> {
    const batchSize = input.batchSize || 50;
    const delayMs = input.delayBetweenBatches || 1000;
    const results: BulkMessengerMessageResult['results'] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < input.recipients.length; i += batchSize) {
      const batch = input.recipients.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (psid) => {
          const result = await this.sendMessage({
            recipientId: psid,
            messageType: input.messageType,
            tag: input.tag,
            message: input.message,
          });

          if (result.success && result.data) {
            sent++;
            return { psid, success: true, messageId: result.data.message_id };
          } else {
            failed++;
            return { psid, success: false, error: result.error };
          }
        })
      );

      results.push(...batchResults);

      // Rate limiting delay between batches
      if (i + batchSize < input.recipients.length) {
        await this.delay(delayMs);
      }
    }

    return { total: input.recipients.length, sent, failed, results };
  }

  /**
   * Get user profile
   */
  async getUserProfile(
    psid: string,
    fields: string[] = ['name', 'first_name', 'last_name', 'profile_pic']
  ): Promise<{ success: boolean; data?: MessengerUserProfile; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Messenger provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${psid}?fields=${fields.join(',')}&access_token=${this.config.pageAccessToken}`
      );

      const data = (await response.json()) as MessengerUserProfile & {
        error?: { message?: string };
      };

      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark message as seen (sender action)
   */
  async markSeen(recipientId: string): Promise<{ success: boolean; error?: string }> {
    return this.sendSenderAction(recipientId, 'mark_seen');
  }

  /**
   * Show typing indicator
   */
  async typingOn(recipientId: string): Promise<{ success: boolean; error?: string }> {
    return this.sendSenderAction(recipientId, 'typing_on');
  }

  /**
   * Hide typing indicator
   */
  async typingOff(recipientId: string): Promise<{ success: boolean; error?: string }> {
    return this.sendSenderAction(recipientId, 'typing_off');
  }

  /**
   * Send sender action
   */
  private async sendSenderAction(
    recipientId: string,
    action: 'mark_seen' | 'typing_on' | 'typing_off'
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Messenger provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/me/messages?access_token=${this.config.pageAccessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            sender_action: action,
          }),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        return { success: false, error: data.error?.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get Messenger profile (greeting, get started button, persistent menu)
   */
  async getMessengerProfile(): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Messenger provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/me/messenger_profile?fields=greeting,get_started,persistent_menu,ice_breakers&access_token=${this.config.pageAccessToken}`
      );

      const data = (await response.json()) as { data?: Record<string, unknown>[]; error?: { message?: string } };

      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }

      return { success: true, data: data.data?.[0] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Set greeting text
   */
  async setGreeting(
    greetings: Array<{ locale: string; text: string }>
  ): Promise<{ success: boolean; error?: string }> {
    return this.setMessengerProfile({ greeting: greetings });
  }

  /**
   * Set Get Started button
   */
  async setGetStarted(payload: string): Promise<{ success: boolean; error?: string }> {
    return this.setMessengerProfile({ get_started: { payload } });
  }

  /**
   * Set Messenger profile
   */
  private async setMessengerProfile(
    profile: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Messenger provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/me/messenger_profile?access_token=${this.config.pageAccessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        return { success: false, error: data.error?.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.config.appSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Verify webhook challenge (for initial webhook setup)
   */
  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string
  ): { verified: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      return { verified: true, challenge };
    }
    return { verified: false };
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: MessengerWebhookPayload): ParsedWebhookPayload {
    const messages: ParsedMessengerMessage[] = [];
    const deliveries: ParsedMessengerDelivery[] = [];
    const reads: ParsedMessengerRead[] = [];
    const postbacks: ParsedMessengerPostback[] = [];
    const reactions: ParsedMessengerReaction[] = [];

    for (const entry of payload.entry) {
      const pageId = entry.id;

      for (const messaging of entry.messaging || []) {
        const psid = messaging.sender.id;
        const timestamp = new Date(messaging.timestamp);

        // Process incoming messages
        if (messaging.message && !messaging.message.is_echo) {
          const msg = messaging.message;
          messages.push({
            pageId,
            psid,
            messageId: msg.mid,
            timestamp,
            type: this.getMessageType(msg),
            content: this.extractMessageContent(msg),
            attachments: msg.attachments?.map((a) => ({
              type: a.type,
              url: a.payload?.url,
              coordinates: a.payload?.coordinates,
            })),
            quickReplyPayload: msg.quick_reply?.payload,
            replyToMessageId: msg.reply_to?.mid,
            referral: msg.referral || messaging.referral,
            isEcho: false,
            stickerId: msg.sticker_id,
          });
        }

        // Process echo messages (outbound confirmation)
        if (messaging.message?.is_echo) {
          const msg = messaging.message;
          messages.push({
            pageId,
            psid: messaging.recipient.id, // For echoes, recipient is the user
            messageId: msg.mid,
            timestamp,
            type: this.getMessageType(msg),
            content: this.extractMessageContent(msg),
            attachments: msg.attachments?.map((a) => ({
              type: a.type,
              url: a.payload?.url,
            })),
            isEcho: true,
          });
        }

        // Process delivery receipts
        if (messaging.delivery) {
          deliveries.push({
            pageId,
            psid,
            messageIds: messaging.delivery.mids || [],
            watermark: new Date(messaging.delivery.watermark),
          });
        }

        // Process read receipts
        if (messaging.read) {
          reads.push({
            pageId,
            psid,
            watermark: new Date(messaging.read.watermark),
          });
        }

        // Process postbacks
        if (messaging.postback) {
          postbacks.push({
            pageId,
            psid,
            title: messaging.postback.title,
            payload: messaging.postback.payload,
            referral: messaging.postback.referral,
            timestamp,
          });
        }

        // Process reactions
        if (messaging.reaction) {
          reactions.push({
            pageId,
            psid,
            messageId: messaging.reaction.mid,
            action: messaging.reaction.action,
            emoji: messaging.reaction.emoji,
            timestamp,
          });
        }
      }
    }

    return { messages, deliveries, reads, postbacks, reactions };
  }

  /**
   * Get message type from incoming message
   */
  private getMessageType(message: MessengerIncomingMessage): MessengerMessageType {
    if (message.sticker_id) return 'sticker';
    if (message.quick_reply) return 'quick_reply';
    if (message.attachments?.length) {
      const type = message.attachments[0].type;
      if (type === 'fallback') return 'text';
      return type as MessengerMessageType;
    }
    return 'text';
  }

  /**
   * Extract message content as text
   */
  private extractMessageContent(message: MessengerIncomingMessage): string {
    if (message.text) return message.text;

    if (message.sticker_id) return `[Sticker: ${message.sticker_id}]`;

    if (message.quick_reply) {
      return `[Quick Reply: ${message.quick_reply.payload}]`;
    }

    if (message.attachments?.length) {
      const att = message.attachments[0];
      switch (att.type) {
        case 'image':
          return att.payload?.url ? `[Image: ${att.payload.url}]` : '[Image]';
        case 'video':
          return att.payload?.url ? `[Video: ${att.payload.url}]` : '[Video]';
        case 'audio':
          return att.payload?.url ? `[Audio: ${att.payload.url}]` : '[Audio]';
        case 'file':
          return att.payload?.url ? `[File: ${att.payload.url}]` : '[File]';
        case 'location':
          if (att.payload?.coordinates) {
            return `[Location: ${att.payload.coordinates.lat}, ${att.payload.coordinates.long}]`;
          }
          return '[Location]';
        case 'fallback':
          return att.payload?.title || '[Unsupported attachment]';
        default:
          return `[${att.type}]`;
      }
    }

    return '';
  }

  /**
   * Normalize PSID (remove any formatting)
   */
  normalizePsid(psid: string): string {
    return psid.trim();
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
