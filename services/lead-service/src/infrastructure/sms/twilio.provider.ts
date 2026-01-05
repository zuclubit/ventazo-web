/**
 * Twilio SMS & WhatsApp Provider
 * Implementation of SMS and WhatsApp messaging via Twilio API
 * Supports both Auth Token and API Key authentication
 */

import {
  ISmsProvider,
  SmsProvider,
  SmsStatus,
  SmsSendResult,
  TwilioStatusWebhook,
  TwilioIncomingSmsWebhook,
} from './types';

/**
 * Twilio API response types
 */
interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  num_segments: string;
  price?: string;
  price_unit?: string;
  error_code?: string;
  error_message?: string;
  date_sent?: string;
  date_created: string;
}

interface TwilioLookupResponse {
  phone_number: string;
  national_format: string;
  country_code: string;
  carrier?: {
    name: string;
    type: string;
  };
  valid: boolean;
  validation_errors?: string[];
}

/**
 * Twilio configuration options
 */
export interface TwilioConfig {
  accountSid: string;
  // Authentication: either authToken OR apiKey + apiSecret
  authToken?: string;
  apiKeySid?: string;
  apiKeySecret?: string;
  // Phone numbers
  phoneNumber?: string;
  whatsappNumber?: string;
  // Messaging Service SID (optional, for advanced use)
  messagingServiceSid?: string;
}

/**
 * WhatsApp message options
 */
export interface WhatsAppMessageOptions {
  to: string;
  body?: string;
  mediaUrl?: string;
  contentSid?: string; // For templates
  contentVariables?: Record<string, string>;
}

/**
 * Twilio SMS & WhatsApp Provider
 */
export class TwilioProvider implements ISmsProvider {
  readonly name: SmsProvider = 'twilio';

  private accountSid: string;
  private authCredentials: { user: string; pass: string };
  private defaultFromNumber: string;
  private whatsappFromNumber: string;
  private messagingServiceSid: string;
  private baseUrl: string;

  constructor(config?: Partial<TwilioConfig>) {
    this.accountSid = config?.accountSid || process.env.TWILIO_ACCOUNT_SID || '';

    // Support both Auth Token and API Key authentication
    const apiKeySid = config?.apiKeySid || process.env.TWILIO_API_KEY_SID || '';
    const apiKeySecret = config?.apiKeySecret || process.env.TWILIO_API_KEY_SECRET || '';
    const authToken = config?.authToken || process.env.TWILIO_AUTH_TOKEN || '';

    // Use API Key if available, otherwise fall back to Auth Token
    if (apiKeySid && apiKeySecret) {
      this.authCredentials = { user: apiKeySid, pass: apiKeySecret };
    } else {
      this.authCredentials = { user: this.accountSid, pass: authToken };
    }

    this.defaultFromNumber = config?.phoneNumber || process.env.TWILIO_PHONE_NUMBER || '';
    this.whatsappFromNumber = config?.whatsappNumber || process.env.TWILIO_WHATSAPP_NUMBER || '';
    this.messagingServiceSid = config?.messagingServiceSid || process.env.TWILIO_MESSAGING_SERVICE_SID || '';
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  /**
   * Check if Twilio is configured for SMS
   */
  isAvailable(): boolean {
    return !!(this.accountSid && this.authCredentials.pass && this.defaultFromNumber);
  }

  /**
   * Check if WhatsApp is configured
   */
  isWhatsAppAvailable(): boolean {
    return !!(this.accountSid && this.authCredentials.pass && this.whatsappFromNumber);
  }

  /**
   * Get authorization header
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.authCredentials.user}:${this.authCredentials.pass}`).toString('base64');
    return `Basic ${credentials}`;
  }

  // ============================================================================
  // WhatsApp Methods
  // ============================================================================

  /**
   * Send WhatsApp message via Twilio
   * Note: For WhatsApp, phone numbers must be in E.164 format with 'whatsapp:' prefix
   */
  async sendWhatsApp(options: WhatsAppMessageOptions): Promise<SmsSendResult> {
    if (!this.isWhatsAppAvailable()) {
      return {
        success: false,
        status: 'failed',
        error: 'Twilio WhatsApp not configured. Set TWILIO_WHATSAPP_NUMBER',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      const normalizedTo = this.normalizePhoneNumber(options.to);
      const whatsappTo = `whatsapp:${normalizedTo}`;
      const whatsappFrom = `whatsapp:${this.whatsappFromNumber}`;

      // Build form data
      const formData = new URLSearchParams();
      formData.append('To', whatsappTo);
      formData.append('From', whatsappFrom);

      // Add body or template
      if (options.body) {
        formData.append('Body', options.body);
      }

      // Add media URL if provided
      if (options.mediaUrl) {
        formData.append('MediaUrl', options.mediaUrl);
      }

      // For Content Templates (Twilio Content API)
      if (options.contentSid) {
        formData.append('ContentSid', options.contentSid);
        if (options.contentVariables) {
          formData.append('ContentVariables', JSON.stringify(options.contentVariables));
        }
      }

      // Use Messaging Service if configured
      if (this.messagingServiceSid && !options.contentSid) {
        formData.delete('From');
        formData.append('MessagingServiceSid', this.messagingServiceSid);
      }

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string; code?: number };
        return {
          success: false,
          status: 'failed',
          error: errorData.message || `HTTP ${response.status}`,
          errorCode: String(errorData.code || response.status),
        };
      }

      const data = await response.json() as TwilioMessageResponse;

      return {
        success: true,
        messageId: data.sid,
        externalId: data.sid,
        status: this.mapTwilioStatus(data.status),
        numSegments: parseInt(data.num_segments, 10) || 1,
        price: data.price ? parseFloat(data.price) : undefined,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Send WhatsApp template message
   * Templates must be pre-approved by WhatsApp
   */
  async sendWhatsAppTemplate(
    to: string,
    contentSid: string,
    variables?: Record<string, string>
  ): Promise<SmsSendResult> {
    return this.sendWhatsApp({
      to,
      contentSid,
      contentVariables: variables,
    });
  }

  /**
   * Send WhatsApp message with media
   */
  async sendWhatsAppMedia(
    to: string,
    mediaUrl: string,
    caption?: string
  ): Promise<SmsSendResult> {
    return this.sendWhatsApp({
      to,
      body: caption,
      mediaUrl,
    });
  }

  // ============================================================================
  // SMS Methods
  // ============================================================================

  /**
   * Send SMS via Twilio
   */
  async send(to: string, body: string, from?: string): Promise<SmsSendResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        status: 'failed',
        error: 'Twilio provider not configured',
        errorCode: 'NOT_CONFIGURED',
      };
    }

    try {
      // Normalize phone number (ensure E.164 format)
      const normalizedTo = this.normalizePhoneNumber(to);
      const fromNumber = from || this.defaultFromNumber;

      // Build form data
      const formData = new URLSearchParams();
      formData.append('To', normalizedTo);
      formData.append('From', fromNumber);
      formData.append('Body', body);

      // Send request to Twilio
      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string; code?: number };
        return {
          success: false,
          status: 'failed',
          error: errorData.message || `HTTP ${response.status}`,
          errorCode: String(errorData.code || response.status),
        };
      }

      const data = await response.json() as TwilioMessageResponse;

      return {
        success: true,
        messageId: data.sid,
        externalId: data.sid,
        status: this.mapTwilioStatus(data.status),
        numSegments: parseInt(data.num_segments, 10) || 1,
        price: data.price ? parseFloat(data.price) : undefined,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'SEND_ERROR',
      };
    }
  }

  /**
   * Get message status from Twilio
   */
  async getStatus(externalId: string): Promise<SmsStatus> {
    if (!this.isAvailable()) {
      return 'failed';
    }

    try {
      const response = await fetch(`${this.baseUrl}/Messages/${externalId}.json`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
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

  /**
   * Validate phone number using Twilio Lookup API
   */
  async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }> {
    if (!this.isAvailable()) {
      return { valid: false };
    }

    try {
      const normalized = this.normalizePhoneNumber(phoneNumber);
      const lookupUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(normalized)}?Fields=line_type_intelligence`;

      const response = await fetch(lookupUrl, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
        },
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json() as TwilioLookupResponse;

      return {
        valid: data.valid,
        formatted: data.phone_number,
        carrier: data.carrier?.name,
        type: this.mapCarrierType(data.carrier?.type),
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Parse incoming SMS webhook from Twilio
   */
  parseIncomingWebhook(payload: unknown): {
    externalId: string;
    from: string;
    to: string;
    body: string;
    status: SmsStatus;
  } | null {
    const data = payload as TwilioIncomingSmsWebhook;

    if (!data.MessageSid || !data.From || !data.To || !data.Body) {
      return null;
    }

    return {
      externalId: data.MessageSid,
      from: data.From,
      to: data.To,
      body: data.Body,
      status: 'received',
    };
  }

  /**
   * Parse status webhook from Twilio
   */
  parseStatusWebhook(payload: unknown): {
    externalId: string;
    status: SmsStatus;
    errorCode?: string;
    errorMessage?: string;
  } | null {
    const data = payload as TwilioStatusWebhook;

    if (!data.MessageSid || !data.MessageStatus) {
      return null;
    }

    return {
      externalId: data.MessageSid,
      status: this.mapTwilioStatus(data.MessageStatus),
      errorCode: data.ErrorCode,
      errorMessage: data.ErrorMessage,
    };
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // Add + if not present and starts with country code
    if (!normalized.startsWith('+')) {
      // Assume US number if 10 digits
      if (normalized.length === 10) {
        normalized = `+1${normalized}`;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = `+${normalized}`;
      } else {
        // Try adding +
        normalized = `+${normalized}`;
      }
    }

    return normalized;
  }

  /**
   * Map Twilio status to our status type
   */
  private mapTwilioStatus(twilioStatus: string): SmsStatus {
    const statusMap: Record<string, SmsStatus> = {
      'accepted': 'queued',
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed',
      'received': 'received',
    };

    return statusMap[twilioStatus.toLowerCase()] || 'failed';
  }

  /**
   * Map carrier type to our type
   */
  private mapCarrierType(carrierType?: string): 'mobile' | 'landline' | 'voip' | undefined {
    if (!carrierType) return undefined;

    const typeMap: Record<string, 'mobile' | 'landline' | 'voip'> = {
      'mobile': 'mobile',
      'landline': 'landline',
      'voip': 'voip',
      'fixed': 'landline',
      'non-fixed voip': 'voip',
      'pager': 'landline',
      'personal number': 'mobile',
      'toll free': 'landline',
      'premium rate': 'landline',
      'shared cost': 'landline',
      'universal access': 'landline',
    };

    return typeMap[carrierType.toLowerCase()];
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>
  ): boolean {
    // Twilio uses HMAC-SHA1 for webhook signatures
    // This implementation requires the crypto module
    try {
      const crypto = require('crypto');

      // Sort and concatenate parameters
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url);

      // Create HMAC
      const hmac = crypto.createHmac('sha1', this.authToken);
      hmac.update(sortedParams);
      const expectedSignature = hmac.digest('base64');

      return signature === expectedSignature;
    } catch {
      return false;
    }
  }
}
