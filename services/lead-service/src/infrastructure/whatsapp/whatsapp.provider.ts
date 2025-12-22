/**
 * WhatsApp Cloud API Provider
 * Integration with Meta WhatsApp Business Cloud API
 */

import * as crypto from 'crypto';
import {
  WhatsAppProviderConfig,
  WhatsAppProviderStatus,
  SendWhatsAppMessageInput,
  SendWhatsAppMessageResponse,
  WhatsAppTemplate,
  WhatsAppTemplateComponent,
  WhatsAppMediaUploadResponse,
  WhatsAppMediaInfo,
  WhatsAppBusinessProfile,
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  BulkWhatsAppMessageInput,
  BulkWhatsAppMessageResult,
} from './types';

/**
 * WhatsApp Cloud API Provider
 */
export class WhatsAppProvider {
  private config: WhatsAppProviderConfig;
  private baseUrl: string;

  constructor(config?: Partial<WhatsAppProviderConfig>) {
    this.config = {
      accessToken: config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: config?.businessAccountId || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      webhookVerifyToken: config?.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '',
      apiVersion: config?.apiVersion || process.env.WHATSAPP_API_VERSION || 'v18.0',
    };
    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  /**
   * Check if provider is available
   */
  isAvailable(): boolean {
    return !!(this.config.accessToken && this.config.phoneNumberId);
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<WhatsAppProviderStatus> {
    if (!this.isAvailable()) {
      return { available: false };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}?fields=display_phone_number,quality_rating,platform_type,throughput`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return { available: false };
      }

      const data = await response.json() as {
        display_phone_number?: string;
        quality_rating?: string;
        platform_type?: string;
        throughput?: { level?: string };
      };

      return {
        available: true,
        phoneNumberId: this.config.phoneNumberId,
        displayPhoneNumber: data.display_phone_number,
        qualityRating: data.quality_rating,
        platformType: data.platform_type,
        messagingLimit: data.throughput?.level,
      };
    } catch {
      return { available: false };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    input: SendWhatsAppMessageInput
  ): Promise<{ success: boolean; data?: SendWhatsAppMessageResponse; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: this.normalizePhoneNumber(input.to),
        type: input.type,
      };

      // Add message content based on type
      switch (input.type) {
        case 'text':
          payload.text = input.text;
          break;
        case 'image':
          payload.image = input.image;
          break;
        case 'video':
          payload.video = input.video;
          break;
        case 'audio':
          payload.audio = input.audio;
          break;
        case 'document':
          payload.document = input.document;
          break;
        case 'sticker':
          payload.sticker = input.sticker;
          break;
        case 'location':
          payload.location = input.location;
          break;
        case 'template':
          payload.template = input.template;
          break;
        case 'interactive':
          payload.interactive = input.interactive;
          break;
        case 'reaction':
          payload.reaction = input.reaction;
          break;
      }

      // Add context for replies
      if (input.context) {
        payload.context = input.context;
      }

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json() as SendWhatsAppMessageResponse & { error?: { message?: string } };

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
   * Send a text message (convenience method)
   */
  async sendTextMessage(
    to: string,
    text: string,
    previewUrl: boolean = false
  ): Promise<{ success: boolean; data?: SendWhatsAppMessageResponse; error?: string }> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body: text, preview_url: previewUrl },
    });
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
    components?: WhatsAppTemplateComponent[]
  ): Promise<{ success: boolean; data?: SendWhatsAppMessageResponse; error?: string }> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  /**
   * Send bulk template messages
   */
  async sendBulkTemplateMessages(
    input: BulkWhatsAppMessageInput
  ): Promise<BulkWhatsAppMessageResult> {
    const batchSize = input.batchSize || 50;
    const delayMs = input.delayBetweenBatches || 1000;
    const results: BulkWhatsAppMessageResult['results'] = [];
    let sent = 0;
    let failed = 0;

    // Process in batches
    for (let i = 0; i < input.recipients.length; i += batchSize) {
      const batch = input.recipients.slice(i, i + batchSize);

      // Send messages in parallel within batch
      const batchResults = await Promise.all(
        batch.map(async (phone) => {
          const result = await this.sendMessage({
            to: phone,
            type: 'template',
            template: input.template,
          });

          if (result.success && result.data) {
            sent++;
            return {
              phone,
              success: true,
              messageId: result.data.messages[0]?.id,
            };
          } else {
            failed++;
            return {
              phone,
              success: false,
              error: result.error,
            };
          }
        })
      );

      results.push(...batchResults);

      // Delay between batches (rate limiting)
      if (i + batchSize < input.recipients.length) {
        await this.delay(delayMs);
      }
    }

    return {
      total: input.recipients.length,
      sent,
      failed,
      results,
    };
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
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
   * Upload media file
   */
  async uploadMedia(
    file: Buffer,
    mimeType: string,
    filename?: string
  ): Promise<{ success: boolean; data?: WhatsAppMediaUploadResponse; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('file', new Blob([file], { type: mimeType }), filename || 'file');
      formData.append('messaging_product', 'whatsapp');
      formData.append('type', mimeType);

      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json() as { id?: string; error?: { message?: string } };

      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }

      return { success: true, data: { id: data.id || '' } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get media info
   */
  async getMediaInfo(mediaId: string): Promise<{ success: boolean; data?: WhatsAppMediaInfo; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      const data = await response.json() as WhatsAppMediaInfo & { error?: { message?: string } };

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
   * Download media file
   */
  async downloadMedia(mediaUrl: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        return { success: false, error: `Download failed: ${response.status}` };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return { success: true, data: buffer };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get message templates
   */
  async getTemplates(): Promise<{ success: boolean; data?: WhatsAppTemplate[]; error?: string }> {
    if (!this.isAvailable() || !this.config.businessAccountId) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates?limit=100`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      );

      const data = await response.json() as { data?: WhatsAppTemplate[]; error?: { message?: string } };

      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }

      return { success: true, data: data.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get business profile
   */
  async getBusinessProfile(): Promise<{ success: boolean; data?: WhatsAppBusinessProfile; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`,
        {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        }
      );

      const data = await response.json() as { data?: WhatsAppBusinessProfile[]; error?: { message?: string } };

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
   * Update business profile
   */
  async updateBusinessProfile(
    profile: Partial<WhatsAppBusinessProfile>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.config.phoneNumberId}/whatsapp_business_profile`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...profile,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json() as { error?: { message?: string } };
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
  verifyWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
  ): boolean {
    if (!signature.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Verify webhook challenge (for webhook setup)
   */
  verifyWebhookChallenge(
    mode: string,
    token: string,
    challenge: string
  ): { verified: boolean; challenge?: string } {
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return { verified: true, challenge };
    }
    return { verified: false };
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(payload: WhatsAppWebhookPayload): {
    messages: Array<{
      messageId: string;
      from: string;
      timestamp: Date;
      type: string;
      content: string;
      mediaId?: string;
      context?: { from: string; id: string };
    }>;
    statusUpdates: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipientId: string;
      errorCode?: number;
      errorMessage?: string;
    }>;
    phoneNumberId: string;
    displayPhoneNumber: string;
  } {
    const messages: Array<{
      messageId: string;
      from: string;
      timestamp: Date;
      type: string;
      content: string;
      mediaId?: string;
      context?: { from: string; id: string };
    }> = [];
    const statusUpdates: Array<{
      messageId: string;
      status: string;
      timestamp: Date;
      recipientId: string;
      errorCode?: number;
      errorMessage?: string;
    }> = [];
    let phoneNumberId = '';
    let displayPhoneNumber = '';

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const value = change.value;
        phoneNumberId = value.metadata.phone_number_id;
        displayPhoneNumber = value.metadata.display_phone_number;

        // Process incoming messages
        if (value.messages) {
          for (const msg of value.messages) {
            messages.push({
              messageId: msg.id,
              from: msg.from,
              timestamp: new Date(parseInt(msg.timestamp) * 1000),
              type: msg.type,
              content: this.extractMessageContent(msg),
              mediaId: this.extractMediaId(msg),
              context: msg.context,
            });
          }
        }

        // Process status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            statusUpdates.push({
              messageId: status.id,
              status: status.status,
              timestamp: new Date(parseInt(status.timestamp) * 1000),
              recipientId: status.recipient_id,
              errorCode: status.errors?.[0]?.code,
              errorMessage: status.errors?.[0]?.message,
            });
          }
        }
      }
    }

    return { messages, statusUpdates, phoneNumberId, displayPhoneNumber };
  }

  /**
   * Extract message content as text
   */
  private extractMessageContent(message: WhatsAppIncomingMessage): string {
    switch (message.type) {
      case 'text':
        return message.text?.body || '';
      case 'image':
        return message.image?.caption || '[Image]';
      case 'video':
        return message.video?.caption || '[Video]';
      case 'audio':
        return '[Audio]';
      case 'document':
        return message.document?.filename || '[Document]';
      case 'sticker':
        return '[Sticker]';
      case 'location':
        return `[Location: ${message.location?.name || ''} - ${message.location?.address || ''}]`;
      case 'contacts':
        return `[Contact: ${message.contacts?.[0]?.name?.formatted_name || ''}]`;
      case 'interactive':
        if (message.interactive?.type === 'button_reply') {
          return message.interactive.button_reply?.title || '';
        }
        if (message.interactive?.type === 'list_reply') {
          return message.interactive.list_reply?.title || '';
        }
        return '[Interactive]';
      case 'reaction':
        return message.reaction?.emoji || '';
      default:
        return '';
    }
  }

  /**
   * Extract media ID from message
   */
  private extractMediaId(message: WhatsAppIncomingMessage): string | undefined {
    switch (message.type) {
      case 'image':
        return message.image?.id;
      case 'video':
        return message.video?.id;
      case 'audio':
        return message.audio?.id;
      case 'document':
        return message.document?.id;
      case 'sticker':
        return message.sticker?.id;
      default:
        return undefined;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with country code
    if (!normalized.startsWith('+')) {
      // Assume missing +
      normalized = '+' + normalized;
    }

    return normalized.replace('+', ''); // WhatsApp API expects number without +
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
