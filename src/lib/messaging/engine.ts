// ============================================
// FASE 5.9 — Messaging Engine
// Multi-channel messaging with adapters
// ============================================

import type {
  MessageChannel,
  MessageMetadata,
  MessageResult,
  MessageStatus,
  ProviderConfig,
  RetryConfig,
  SendEmailOptions,
  SendNotificationOptions,
  SendSMSOptions,
  SendWhatsAppOptions,
} from './types';

// ============================================
// Abstract Provider Interfaces
// ============================================

export interface EmailAdapter {
  name: string;
  send(options: SendEmailOptions): Promise<MessageResult>;
  validateConfig(): boolean;
}

export interface SMSAdapter {
  name: string;
  send(options: SendSMSOptions): Promise<MessageResult>;
  validateConfig(): boolean;
}

export interface WhatsAppAdapter {
  name: string;
  send(options: SendWhatsAppOptions): Promise<MessageResult>;
  validateConfig(): boolean;
}

export interface NotificationAdapter {
  name: string;
  send(options: SendNotificationOptions): Promise<MessageResult>;
}

// ============================================
// Mock Adapters (for development/testing)
// ============================================

export class MockEmailAdapter implements EmailAdapter {
  name = 'mock-email';

  async send(options: SendEmailOptions): Promise<MessageResult> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line no-console
    console.log('[MockEmail] Sending email:', {
      to: options.to,
      subject: options.subject,
      bodyLength: options.body.length,
    });

    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
      providerMessageId: `mock-provider-${Date.now()}`,
    };
  }

  validateConfig(): boolean {
    return true;
  }
}

export class MockSMSAdapter implements SMSAdapter {
  name = 'mock-sms';

  async send(options: SendSMSOptions): Promise<MessageResult> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line no-console
    console.log('[MockSMS] Sending SMS:', {
      to: options.to,
      bodyLength: options.body.length,
    });

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      providerMessageId: `mock-provider-${Date.now()}`,
    };
  }

  validateConfig(): boolean {
    return true;
  }
}

export class MockWhatsAppAdapter implements WhatsAppAdapter {
  name = 'mock-whatsapp';

  async send(options: SendWhatsAppOptions): Promise<MessageResult> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // eslint-disable-next-line no-console
    console.log('[MockWhatsApp] Sending WhatsApp:', {
      to: options.to,
      bodyLength: options.body.length,
      hasMedia: !!options.mediaUrl,
    });

    return {
      success: true,
      messageId: `mock-whatsapp-${Date.now()}`,
      providerMessageId: `mock-provider-${Date.now()}`,
    };
  }

  validateConfig(): boolean {
    return true;
  }
}

// ============================================
// Internal Notification Adapter
// ============================================

export class InternalNotificationAdapter implements NotificationAdapter {
  name = 'internal';

  private apiEndpoint: string;

  constructor(apiEndpoint = '/api/notifications') {
    this.apiEndpoint = apiEndpoint;
  }

  async send(options: SendNotificationOptions): Promise<MessageResult> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          success: false,
          error: `Failed to create notification: ${error}`,
          retryable: response.status >= 500,
        };
      }

      const result = (await response.json()) as { id: string };
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      };
    }
  }
}

// ============================================
// Messaging Engine
// ============================================

export interface MessagingEngineConfig {
  providers?: ProviderConfig;
  retryConfig?: RetryConfig;
  defaultFrom?: {
    email?: string;
    sms?: string;
    whatsapp?: string;
  };
}

export interface SendOptions {
  channel: MessageChannel;
  to: string | string[];
  subject?: string;
  body: string;
  html?: string;
  from?: string;
  metadata?: MessageMetadata;
  templateId?: string;
}

export interface MessageLog {
  id: string;
  channel: MessageChannel;
  to: string;
  subject?: string;
  status: MessageStatus;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  createdAt: Date;
  sentAt?: Date;
}

export class MessagingEngine {
  private emailAdapter: EmailAdapter;
  private smsAdapter: SMSAdapter;
  private whatsAppAdapter: WhatsAppAdapter;
  private notificationAdapter: NotificationAdapter;
  private retryConfig: RetryConfig;
  private defaultFrom: MessagingEngineConfig['defaultFrom'];
  private logs: MessageLog[] = [];

  constructor(config: MessagingEngineConfig = {}) {
    // Initialize adapters (use mocks for now)
    this.emailAdapter = new MockEmailAdapter();
    this.smsAdapter = new MockSMSAdapter();
    this.whatsAppAdapter = new MockWhatsAppAdapter();
    this.notificationAdapter = new InternalNotificationAdapter();

    this.retryConfig = config.retryConfig ?? {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
    };

    this.defaultFrom = config.defaultFrom;
  }

  // ============================================
  // Adapter Setters
  // ============================================

  setEmailAdapter(adapter: EmailAdapter): void {
    this.emailAdapter = adapter;
  }

  setSMSAdapter(adapter: SMSAdapter): void {
    this.smsAdapter = adapter;
  }

  setWhatsAppAdapter(adapter: WhatsAppAdapter): void {
    this.whatsAppAdapter = adapter;
  }

  setNotificationAdapter(adapter: NotificationAdapter): void {
    this.notificationAdapter = adapter;
  }

  // ============================================
  // Send Methods
  // ============================================

  async send(options: SendOptions): Promise<MessageResult> {
    const { channel } = options;

    switch (channel) {
      case 'email':
        return this.sendEmail({
          to: options.to,
          subject: options.subject ?? '',
          body: options.body,
          html: options.html,
          from: options.from ?? this.defaultFrom?.email,
          metadata: options.metadata,
        });

      case 'sms':
        return this.sendSMS({
          to: Array.isArray(options.to) ? (options.to[0] ?? '') : options.to,
          body: options.body,
          from: options.from ?? this.defaultFrom?.sms,
          metadata: options.metadata,
        });

      case 'whatsapp':
        return this.sendWhatsApp({
          to: Array.isArray(options.to) ? (options.to[0] ?? '') : options.to,
          body: options.body,
          from: options.from ?? this.defaultFrom?.whatsapp,
          metadata: options.metadata,
        });

      case 'internal':
        // Internal notifications require more specific data
        return {
          success: false,
          error: 'Use sendNotification for internal notifications',
        };

      default:
        return {
          success: false,
          error: `Unsupported channel: ${channel}`,
        };
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<MessageResult> {
    return this.executeWithRetry('email', async () => {
      return this.emailAdapter.send(options);
    });
  }

  async sendSMS(options: SendSMSOptions): Promise<MessageResult> {
    return this.executeWithRetry('sms', async () => {
      return this.smsAdapter.send(options);
    });
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<MessageResult> {
    return this.executeWithRetry('whatsapp', async () => {
      return this.whatsAppAdapter.send(options);
    });
  }

  async sendNotification(options: SendNotificationOptions): Promise<MessageResult> {
    return this.notificationAdapter.send(options);
  }

  // ============================================
  // Bulk Send
  // ============================================

  async sendBulk(
    channel: MessageChannel,
    recipients: Array<{
      to: string;
      subject?: string;
      body: string;
      metadata?: MessageMetadata;
    }>
  ): Promise<{
    total: number;
    sent: number;
    failed: number;
    results: Array<{ to: string; result: MessageResult }>;
  }> {
    const results: Array<{ to: string; result: MessageResult }> = [];
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.send({
        channel,
        to: recipient.to,
        subject: recipient.subject,
        body: recipient.body,
        metadata: recipient.metadata,
      });

      if (result.success) {
        sent++;
      } else {
        failed++;
      }

      results.push({ to: recipient.to, result });
    }

    return {
      total: recipients.length,
      sent,
      failed,
      results,
    };
  }

  // ============================================
  // Retry Logic
  // ============================================

  private async executeWithRetry(
    channel: MessageChannel,
    operation: () => Promise<MessageResult>
  ): Promise<MessageResult> {
    let lastError: string | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();

        if (result.success) {
          return result;
        }

        if (!result.retryable) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
      }

      if (attempt < this.retryConfig.maxRetries) {
        await this.sleep(delay);
        delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelayMs);
      }
    }

    return {
      success: false,
      error: `Failed after ${this.retryConfig.maxRetries} retries: ${lastError}`,
      retryable: false,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // Validation
  // ============================================

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    // Basic phone validation (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  validateChannel(channel: string): channel is MessageChannel {
    return ['email', 'sms', 'whatsapp', 'push', 'internal'].includes(channel);
  }

  // ============================================
  // Logs
  // ============================================

  getLogs(): MessageLog[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// ============================================
// Singleton Instance
// ============================================

let engineInstance: MessagingEngine | null = null;

export function getMessagingEngine(config?: MessagingEngineConfig): MessagingEngine {
  if (!engineInstance) {
    engineInstance = new MessagingEngine(config);
  }
  return engineInstance;
}

export function resetMessagingEngine(): void {
  engineInstance = null;
}
