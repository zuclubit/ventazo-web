/**
 * WhatsApp Cloud API Types
 * Types for WhatsApp Business Cloud API integration
 */

/**
 * WhatsApp message types
 */
export type WhatsAppMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'template'
  | 'reaction';

/**
 * WhatsApp message status
 */
export type WhatsAppMessageStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'deleted';

/**
 * WhatsApp conversation category
 */
export type WhatsAppConversationCategory =
  | 'authentication'
  | 'marketing'
  | 'utility'
  | 'service'
  | 'referral_conversion';

/**
 * WhatsApp contact
 */
export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

/**
 * WhatsApp text message
 */
export interface WhatsAppTextMessage {
  body: string;
  preview_url?: boolean;
}

/**
 * WhatsApp media message
 */
export interface WhatsAppMediaMessage {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

/**
 * WhatsApp location message
 */
export interface WhatsAppLocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/**
 * WhatsApp template component
 */
export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: number;
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
    text?: string;
    currency?: {
      fallback_value: string;
      code: string;
      amount_1000: number;
    };
    date_time?: {
      fallback_value: string;
    };
    image?: WhatsAppMediaMessage;
    document?: WhatsAppMediaMessage;
    video?: WhatsAppMediaMessage;
  }>;
}

/**
 * WhatsApp template message
 */
export interface WhatsAppTemplateMessage {
  name: string;
  language: {
    code: string;
  };
  components?: WhatsAppTemplateComponent[];
}

/**
 * WhatsApp interactive message button
 */
export interface WhatsAppInteractiveButton {
  type: 'reply' | 'url' | 'phone_number';
  reply?: {
    id: string;
    title: string;
  };
  url?: string;
  phone_number?: string;
}

/**
 * WhatsApp interactive list section
 */
export interface WhatsAppListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

/**
 * WhatsApp interactive message
 */
export interface WhatsAppInteractiveMessage {
  type: 'button' | 'list' | 'product' | 'product_list';
  header?: {
    type: 'text' | 'image' | 'video' | 'document';
    text?: string;
    image?: WhatsAppMediaMessage;
    video?: WhatsAppMediaMessage;
    document?: WhatsAppMediaMessage;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    button?: string;
    buttons?: WhatsAppInteractiveButton[];
    sections?: WhatsAppListSection[];
  };
}

/**
 * WhatsApp reaction message
 */
export interface WhatsAppReactionMessage {
  message_id: string;
  emoji: string;
}

/**
 * Send message input
 */
export interface SendWhatsAppMessageInput {
  to: string; // Phone number with country code
  type: WhatsAppMessageType;
  text?: WhatsAppTextMessage;
  image?: WhatsAppMediaMessage;
  video?: WhatsAppMediaMessage;
  audio?: WhatsAppMediaMessage;
  document?: WhatsAppMediaMessage;
  sticker?: WhatsAppMediaMessage;
  location?: WhatsAppLocationMessage;
  template?: WhatsAppTemplateMessage;
  interactive?: WhatsAppInteractiveMessage;
  reaction?: WhatsAppReactionMessage;
  context?: {
    message_id: string; // For replies
  };
}

/**
 * Send message response
 */
export interface SendWhatsAppMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

/**
 * WhatsApp incoming message
 */
export interface WhatsAppIncomingMessage {
  id: string;
  from: string;
  timestamp: string;
  type: WhatsAppMessageType;
  text?: WhatsAppTextMessage;
  image?: WhatsAppMediaMessage & { sha256: string; mime_type: string };
  video?: WhatsAppMediaMessage & { sha256: string; mime_type: string };
  audio?: WhatsAppMediaMessage & { sha256: string; mime_type: string };
  document?: WhatsAppMediaMessage & { sha256: string; mime_type: string };
  sticker?: WhatsAppMediaMessage & { sha256: string; mime_type: string; animated: boolean };
  location?: WhatsAppLocationMessage;
  contacts?: Array<{
    name: { formatted_name: string; first_name?: string; last_name?: string };
    phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  }>;
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
  reaction?: WhatsAppReactionMessage;
  context?: {
    from: string;
    id: string;
  };
  referral?: {
    source_url: string;
    source_type: string;
    source_id: string;
    headline?: string;
    body?: string;
    media_type?: string;
    image_url?: string;
    video_url?: string;
  };
}

/**
 * WhatsApp webhook status update
 */
export interface WhatsAppStatusUpdate {
  id: string;
  status: WhatsAppMessageStatus;
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: WhatsAppConversationCategory;
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: WhatsAppConversationCategory;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

/**
 * WhatsApp webhook payload
 */
export interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: WhatsAppContact[];
        messages?: WhatsAppIncomingMessage[];
        statuses?: WhatsAppStatusUpdate[];
        errors?: Array<{
          code: number;
          title: string;
          message: string;
          error_data?: { details: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

/**
 * WhatsApp template
 */
export interface WhatsAppTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
    text?: string;
    example?: {
      header_text?: string[];
      body_text?: string[][];
      header_handle?: string[];
    };
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

/**
 * WhatsApp business profile
 */
export interface WhatsAppBusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
}

/**
 * WhatsApp conversation
 */
export interface WhatsAppConversation {
  id: string;
  tenantId: string;
  phoneNumberId: string;
  contactWaId: string;
  contactName?: string;
  contactPhone: string;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
  status: 'active' | 'resolved' | 'archived';
  assignedTo?: string;
  leadId?: string;
  customerId?: string;
  labels?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp message record
 */
export interface WhatsAppMessageRecord {
  id: string;
  tenantId: string;
  conversationId: string;
  waMessageId: string;
  direction: 'inbound' | 'outbound';
  type: WhatsAppMessageType;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  status: WhatsAppMessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorCode?: number;
  errorMessage?: string;
  context?: {
    replyToMessageId?: string;
    forwarded?: boolean;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WhatsApp provider configuration
 */
export interface WhatsAppProviderConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  webhookVerifyToken: string;
  apiVersion?: string;
}

/**
 * WhatsApp provider status
 */
export interface WhatsAppProviderStatus {
  available: boolean;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
  messagingLimit?: string;
  platformType?: string;
}

/**
 * Media upload response
 */
export interface WhatsAppMediaUploadResponse {
  id: string;
}

/**
 * Media info response
 */
export interface WhatsAppMediaInfo {
  id: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
}

/**
 * Bulk message input
 */
export interface BulkWhatsAppMessageInput {
  recipients: string[];
  template: WhatsAppTemplateMessage;
  batchSize?: number;
  delayBetweenBatches?: number;
}

/**
 * Bulk message result
 */
export interface BulkWhatsAppMessageResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}
