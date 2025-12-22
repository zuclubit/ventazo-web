/**
 * Unified Messaging Service
 * Supports multiple providers for SMS and WhatsApp
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  IMessagingProvider,
  MessagingProvider,
  MessagingChannel,
  SendMessageInput,
  SendMessageResult,
  SendBulkMessageInput,
  BulkMessageResult,
  MessageTemplate,
  MESSAGE_TEMPLATES,
  MessageStatus,
} from './types';
import { TwilioMessagingProvider } from './providers/twilio.provider';
import { getAppConfig } from '../../config/environment';

@injectable()
export class MessagingService {
  private providers: Map<MessagingProvider, IMessagingProvider> = new Map();
  private defaultSmsProvider: MessagingProvider = 'twilio';
  private defaultWhatsAppProvider: MessagingProvider = 'twilio';
  private initialized = false;

  constructor() {
    this.initializeProviders();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  private initializeProviders(): void {
    if (this.initialized) return;

    try {
      // Initialize Twilio provider
      const twilioProvider = new TwilioMessagingProvider();
      if (twilioProvider.isAvailable()) {
        this.providers.set('twilio', twilioProvider);
        console.log('[MessagingService] Twilio provider initialized');

        if (twilioProvider.isSmsAvailable()) {
          console.log('[MessagingService] SMS available via Twilio');
        }
        if (twilioProvider.isWhatsAppAvailable()) {
          console.log('[MessagingService] WhatsApp available via Twilio');
        }
      }

      // Future: Initialize other providers here
      // const vonageProvider = new VonageMessagingProvider();
      // if (vonageProvider.isAvailable()) {
      //   this.providers.set('vonage', vonageProvider);
      // }

      this.initialized = true;
    } catch (error) {
      console.error('[MessagingService] Failed to initialize providers:', error);
    }
  }

  // ============================================================================
  // Availability Checks
  // ============================================================================

  isSmsAvailable(provider?: MessagingProvider): boolean {
    const p = this.getProvider(provider || this.defaultSmsProvider);
    return p?.isSmsAvailable() ?? false;
  }

  isWhatsAppAvailable(provider?: MessagingProvider): boolean {
    const p = this.getProvider(provider || this.defaultWhatsAppProvider);
    return p?.isWhatsAppAvailable() ?? false;
  }

  getAvailableProviders(): MessagingProvider[] {
    return Array.from(this.providers.keys());
  }

  // ============================================================================
  // Send Messages
  // ============================================================================

  /**
   * Send a message via SMS or WhatsApp
   */
  async send(input: SendMessageInput): Promise<Result<SendMessageResult>> {
    const provider = this.getProvider(input.provider || this.getDefaultProvider(input.channel));

    if (!provider) {
      return Result.fail('No messaging provider available');
    }

    try {
      // Build message body
      const body = this.buildMessageBody(input);

      let result: SendMessageResult;

      if (input.channel === 'whatsapp') {
        // Use template if contentSid is provided
        if (input.contentSid) {
          result = await provider.sendWhatsAppTemplate(
            input.to,
            input.contentSid,
            input.templateVariables
          );
        } else {
          result = await provider.sendWhatsApp(input.to, body);
        }
      } else {
        result = await provider.sendSms(input.to, body);
      }

      if (result.success) {
        console.log(`[MessagingService] ${input.channel.toUpperCase()} sent to ${input.to} via ${provider.name}`);
      } else {
        console.error(`[MessagingService] Failed to send ${input.channel} to ${input.to}:`, result.error);
      }

      return Result.ok(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[MessagingService] Send error:', errorMessage);
      return Result.fail(errorMessage);
    }
  }

  /**
   * Send SMS (convenience method)
   */
  async sendSms(
    to: string,
    body: string,
    options?: { provider?: MessagingProvider; entityType?: string; entityId?: string }
  ): Promise<Result<SendMessageResult>> {
    return this.send({
      to,
      body,
      channel: 'sms',
      provider: options?.provider,
      entityType: options?.entityType as SendMessageInput['entityType'],
      entityId: options?.entityId,
    });
  }

  /**
   * Send WhatsApp message (convenience method)
   */
  async sendWhatsApp(
    to: string,
    body: string,
    options?: { provider?: MessagingProvider; entityType?: string; entityId?: string }
  ): Promise<Result<SendMessageResult>> {
    return this.send({
      to,
      body,
      channel: 'whatsapp',
      provider: options?.provider,
      entityType: options?.entityType as SendMessageInput['entityType'],
      entityId: options?.entityId,
    });
  }

  /**
   * Send a templated message
   */
  async sendTemplate(
    to: string,
    template: MessageTemplate,
    variables: Record<string, string>,
    channel: MessagingChannel = 'sms',
    options?: { provider?: MessagingProvider; entityType?: string; entityId?: string }
  ): Promise<Result<SendMessageResult>> {
    return this.send({
      to,
      channel,
      template,
      templateVariables: variables,
      provider: options?.provider,
      entityType: options?.entityType as SendMessageInput['entityType'],
      entityId: options?.entityId,
    });
  }

  /**
   * Send bulk messages
   */
  async sendBulk(input: SendBulkMessageInput): Promise<Result<BulkMessageResult>> {
    const provider = this.getProvider(input.provider || this.getDefaultProvider(input.channel));

    if (!provider) {
      return Result.fail('No messaging provider available');
    }

    const batchSize = input.batchSize || 50;
    const delayMs = input.delayBetweenBatches || 1000;
    const results: BulkMessageResult['results'] = [];
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < input.recipients.length; i += batchSize) {
      const batch = input.recipients.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (recipient) => {
          const result = await this.send({
            to: recipient.to,
            channel: input.channel,
            template: input.template,
            templateVariables: recipient.variables,
            provider: input.provider,
            entityType: recipient.entityType as SendMessageInput['entityType'],
            entityId: recipient.entityId,
          });

          const sendResult = result.isSuccess ? result.getValue() : {
            success: false,
            provider: provider.name,
            channel: input.channel,
            status: 'failed' as MessageStatus,
            error: result.error,
          };

          if (sendResult.success) {
            sent++;
          } else {
            failed++;
          }

          return { to: recipient.to, result: sendResult };
        })
      );

      results.push(...batchResults);

      // Rate limiting delay between batches
      if (i + batchSize < input.recipients.length) {
        await this.delay(delayMs);
      }
    }

    return Result.ok({
      total: input.recipients.length,
      sent,
      failed,
      results,
    });
  }

  // ============================================================================
  // Status Methods
  // ============================================================================

  /**
   * Get message status
   */
  async getStatus(
    externalId: string,
    provider: MessagingProvider = 'twilio'
  ): Promise<Result<MessageStatus>> {
    const p = this.getProvider(provider);

    if (!p) {
      return Result.fail('Provider not available');
    }

    try {
      const status = await p.getMessageStatus(externalId);
      return Result.ok(status);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Validate phone number
   */
  async validatePhoneNumber(
    phoneNumber: string,
    provider: MessagingProvider = 'twilio'
  ): Promise<Result<{ valid: boolean; formatted?: string; type?: string }>> {
    const p = this.getProvider(provider);

    if (!p) {
      return Result.fail('Provider not available');
    }

    try {
      const result = await p.validatePhoneNumber(phoneNumber);
      return Result.ok(result);
    } catch (error) {
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getProvider(name: MessagingProvider): IMessagingProvider | undefined {
    return this.providers.get(name);
  }

  private getDefaultProvider(channel: MessagingChannel): MessagingProvider {
    return channel === 'whatsapp' ? this.defaultWhatsAppProvider : this.defaultSmsProvider;
  }

  private buildMessageBody(input: SendMessageInput): string {
    // If direct body is provided, use it
    if (input.body) {
      return input.body;
    }

    // If template is provided, build from template
    if (input.template) {
      const templateDef = MESSAGE_TEMPLATES[input.template];
      if (templateDef) {
        return this.interpolateTemplate(templateDef.smsBody, input.templateVariables || {});
      }
    }

    return '';
  }

  private interpolateTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    const appConfig = getAppConfig();

    // Add default variables
    const allVariables: Record<string, string> = {
      appName: appConfig.appName,
      appUrl: appConfig.appUrl,
      supportEmail: appConfig.supportEmail,
      ...variables,
    };

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return allVariables[key] !== undefined ? allVariables[key] : match;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance for easy access
let messagingServiceInstance: MessagingService | null = null;

export function getMessagingService(): MessagingService {
  if (!messagingServiceInstance) {
    messagingServiceInstance = new MessagingService();
  }
  return messagingServiceInstance;
}
