/**
 * Twilio Messaging Provider
 * Implements SMS and WhatsApp messaging via Twilio API
 */

import {
  IMessagingProvider,
  MessagingProvider,
  SendMessageResult,
  MessageStatus,
} from '../types';
import { getTwilioConfig } from '../../../config/environment';

interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  num_segments: string;
  price?: string;
  error_code?: string;
  error_message?: string;
}

export class TwilioMessagingProvider implements IMessagingProvider {
  readonly name: MessagingProvider = 'twilio';

  private accountSid: string;
  private authCredentials: { user: string; pass: string };
  private smsFromNumber: string;
  private whatsappFromNumber: string;
  private baseUrl: string;
  private isTrialMode: boolean;

  constructor() {
    const config = getTwilioConfig();

    this.accountSid = config.accountSid;
    this.smsFromNumber = config.phoneNumber;
    this.whatsappFromNumber = config.whatsappNumber;
    this.isTrialMode = true; // Detect based on account or set via config

    // Use API Key if available, otherwise Auth Token
    if (config.apiKeySid && config.apiKeySecret) {
      this.authCredentials = { user: config.apiKeySid, pass: config.apiKeySecret };
    } else {
      this.authCredentials = { user: config.accountSid, pass: config.authToken };
    }

    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  // ============================================================================
  // Availability Checks
  // ============================================================================

  isAvailable(): boolean {
    return !!(this.accountSid && this.authCredentials.pass);
  }

  isSmsAvailable(): boolean {
    return this.isAvailable() && !!this.smsFromNumber;
  }

  isWhatsAppAvailable(): boolean {
    return this.isAvailable() && !!this.whatsappFromNumber;
  }

  // ============================================================================
  // SMS Methods
  // ============================================================================

  async sendSms(to: string, body: string, from?: string): Promise<SendMessageResult> {
    if (!this.isSmsAvailable()) {
      return this.errorResult('SMS not configured');
    }

    // Truncate message for trial accounts
    const truncatedBody = this.isTrialMode ? this.truncateForTrial(body) : body;

    return this.sendMessage(
      this.normalizePhoneNumber(to),
      from || this.smsFromNumber,
      truncatedBody,
      'sms'
    );
  }

  // ============================================================================
  // WhatsApp Methods
  // ============================================================================

  async sendWhatsApp(to: string, body: string, from?: string): Promise<SendMessageResult> {
    if (!this.isWhatsAppAvailable()) {
      return this.errorResult('WhatsApp not configured');
    }

    const whatsappTo = `whatsapp:${this.normalizePhoneNumber(to)}`;
    const whatsappFrom = `whatsapp:${from || this.whatsappFromNumber}`;

    return this.sendMessage(whatsappTo, whatsappFrom, body, 'whatsapp');
  }

  async sendWhatsAppTemplate(
    to: string,
    contentSid: string,
    variables?: Record<string, string>
  ): Promise<SendMessageResult> {
    if (!this.isWhatsAppAvailable()) {
      return this.errorResult('WhatsApp not configured');
    }

    try {
      const whatsappTo = `whatsapp:${this.normalizePhoneNumber(to)}`;
      const whatsappFrom = `whatsapp:${this.whatsappFromNumber}`;

      const formData = new URLSearchParams();
      formData.append('To', whatsappTo);
      formData.append('From', whatsappFrom);
      formData.append('ContentSid', contentSid);

      if (variables) {
        formData.append('ContentVariables', JSON.stringify(variables));
      }

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      return this.parseResponse(response, 'whatsapp');
    } catch (error) {
      return this.errorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // ============================================================================
  // Status Methods
  // ============================================================================

  async getMessageStatus(externalId: string): Promise<MessageStatus> {
    if (!this.isAvailable()) {
      return 'failed';
    }

    try {
      const response = await fetch(`${this.baseUrl}/Messages/${externalId}.json`, {
        headers: { 'Authorization': this.getAuthHeader() },
      });

      if (!response.ok) {
        return 'failed';
      }

      const data = await response.json() as TwilioMessageResponse;
      return this.mapTwilioStatus(data.status);
    } catch {
      return 'failed';
    }
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }> {
    if (!this.isAvailable()) {
      return { valid: false };
    }

    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      const lookupUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(normalized)}`;

      const response = await fetch(lookupUrl, {
        headers: { 'Authorization': this.getAuthHeader() },
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json() as {
        valid: boolean;
        phone_number: string;
        line_type_intelligence?: { type: string };
      };

      return {
        valid: data.valid,
        formatted: data.phone_number,
        type: this.mapLineType(data.line_type_intelligence?.type),
      };
    } catch {
      return { valid: false };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async sendMessage(
    to: string,
    from: string,
    body: string,
    channel: 'sms' | 'whatsapp'
  ): Promise<SendMessageResult> {
    try {
      const formData = new URLSearchParams();
      formData.append('To', to);
      formData.append('From', from);
      formData.append('Body', body);

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      return this.parseResponse(response, channel);
    } catch (error) {
      return this.errorResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async parseResponse(
    response: Response,
    channel: 'sms' | 'whatsapp'
  ): Promise<SendMessageResult> {
    const data = await response.json() as TwilioMessageResponse & { message?: string; code?: number };

    if (!response.ok) {
      return {
        success: false,
        provider: 'twilio',
        channel,
        status: 'failed',
        error: data.message || `HTTP ${response.status}`,
        errorCode: String(data.code || response.status),
      };
    }

    return {
      success: true,
      messageId: data.sid,
      externalId: data.sid,
      provider: 'twilio',
      channel,
      status: this.mapTwilioStatus(data.status),
      segments: parseInt(data.num_segments, 10) || 1,
      price: data.price ? parseFloat(data.price) : undefined,
    };
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(
      `${this.authCredentials.user}:${this.authCredentials.pass}`
    ).toString('base64');
    return `Basic ${credentials}`;
  }

  private normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/[^\d+]/g, '');

    if (!normalized.startsWith('+')) {
      if (normalized.length === 10) {
        normalized = `+1${normalized}`;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = `+${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  private truncateForTrial(body: string): string {
    // Trial accounts have message length limits
    // Keep under 160 chars (1 segment) to avoid error 30044
    const maxLength = 140; // Leave room for "Sent from your Twilio trial account - "
    if (body.length <= maxLength) {
      return body;
    }
    return body.substring(0, maxLength - 3) + '...';
  }

  private mapTwilioStatus(status: string): MessageStatus {
    const statusMap: Record<string, MessageStatus> = {
      'accepted': 'queued',
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'undelivered': 'undelivered',
      'failed': 'failed',
    };
    return statusMap[status.toLowerCase()] || 'failed';
  }

  private mapLineType(type?: string): 'mobile' | 'landline' | 'voip' | undefined {
    if (!type) return undefined;
    const typeMap: Record<string, 'mobile' | 'landline' | 'voip'> = {
      'mobile': 'mobile',
      'landline': 'landline',
      'fixedVoip': 'voip',
      'nonFixedVoip': 'voip',
      'voip': 'voip',
    };
    return typeMap[type];
  }

  private errorResult(error: string): SendMessageResult {
    return {
      success: false,
      provider: 'twilio',
      channel: 'sms',
      status: 'failed',
      error,
      errorCode: 'PROVIDER_ERROR',
    };
  }
}
