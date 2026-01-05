/**
 * SMS Service Types
 * Types for SMS communication with Twilio integration
 */

/**
 * SMS Provider types
 */
export type SmsProvider = 'twilio' | 'vonage' | 'messagebird';

/**
 * SMS delivery status
 */
export type SmsStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'received';

/**
 * SMS direction
 */
export type SmsDirection = 'inbound' | 'outbound';

/**
 * SMS message record
 */
export interface SmsMessage {
  id: string;
  tenantId: string;

  // Provider info
  provider: SmsProvider;
  externalId?: string; // Provider's message ID (e.g., Twilio SID)

  // Message details
  from: string;
  to: string;
  body: string;

  // Status
  direction: SmsDirection;
  status: SmsStatus;
  errorCode?: string;
  errorMessage?: string;

  // Segments & pricing
  numSegments?: number;
  price?: number;
  priceUnit?: string;

  // CRM linking
  linkedEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkedEntityId?: string;
  userId?: string; // User who sent/received

  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SMS template
 */
export interface SmsTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  body: string; // Supports {{variable}} placeholders
  category?: string;
  tags: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Send SMS input
 */
export interface SendSmsInput {
  to: string;
  body: string;
  from?: string; // Optional, uses default if not provided

  // CRM linking
  linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkToEntityId?: string;

  // Template
  templateId?: string;
  templateVariables?: Record<string, string>;

  // Options
  scheduledAt?: Date;
  trackDelivery?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Send bulk SMS input
 */
export interface SendBulkSmsInput {
  recipients: Array<{
    to: string;
    variables?: Record<string, string>;
    linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
    linkToEntityId?: string;
  }>;
  body?: string;
  templateId?: string;
  from?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SMS send result
 */
export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  status: SmsStatus;
  numSegments?: number;
  price?: number;
  error?: string;
  errorCode?: string;
}

/**
 * Bulk SMS send result
 */
export interface BulkSmsSendResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    result: SmsSendResult;
  }>;
}

/**
 * Twilio webhook payload for status updates
 */
export interface TwilioStatusWebhook {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  AccountSid: string;
  ApiVersion: string;
}

/**
 * Twilio webhook payload for incoming SMS
 */
export interface TwilioIncomingSmsWebhook {
  MessageSid: string;
  SmsSid: string;
  AccountSid: string;
  MessagingServiceSid?: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  SmsStatus: string;
  ApiVersion: string;
}

/**
 * SMS phone number
 */
export interface SmsPhoneNumber {
  id: string;
  tenantId: string;
  phoneNumber: string;
  friendlyName?: string;
  provider: SmsProvider;
  capabilities: {
    sms: boolean;
    mms: boolean;
    voice: boolean;
  };
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List SMS options
 */
export interface ListSmsOptions {
  direction?: SmsDirection;
  status?: SmsStatus;
  from?: string;
  to?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated SMS response
 */
export interface PaginatedSmsResponse {
  messages: SmsMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * SMS statistics
 */
export interface SmsStats {
  totalSent: number;
  totalReceived: number;
  deliveryRate: number;
  failedCount: number;
  totalCost: number;
  byStatus: Record<SmsStatus, number>;
  byDay: Array<{
    date: string;
    sent: number;
    received: number;
    cost: number;
  }>;
}

/**
 * SMS provider interface
 */
export interface ISmsProvider {
  /**
   * Provider name
   */
  readonly name: SmsProvider;

  /**
   * Check if provider is available/configured
   */
  isAvailable(): boolean;

  /**
   * Send a single SMS
   */
  send(to: string, body: string, from?: string): Promise<SmsSendResult>;

  /**
   * Get message status by external ID
   */
  getStatus(externalId: string): Promise<SmsStatus>;

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    carrier?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }>;

  /**
   * Parse incoming webhook
   */
  parseIncomingWebhook(payload: unknown): {
    externalId: string;
    from: string;
    to: string;
    body: string;
    status: SmsStatus;
  } | null;

  /**
   * Parse status webhook
   */
  parseStatusWebhook(payload: unknown): {
    externalId: string;
    status: SmsStatus;
    errorCode?: string;
    errorMessage?: string;
  } | null;
}
