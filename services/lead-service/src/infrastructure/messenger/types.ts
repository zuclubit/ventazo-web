/**
 * Facebook Messenger Types
 * Integration with Meta Messenger Platform API
 */

// ==================== Message Types ====================

export type MessengerMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'template'
  | 'quick_reply'
  | 'postback'
  | 'referral'
  | 'reaction'
  | 'read'
  | 'delivery'
  | 'location'
  | 'sticker';

export type MessengerMessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export type MessengerTemplateType =
  | 'generic'
  | 'button'
  | 'media'
  | 'receipt'
  | 'airline_boardingpass'
  | 'airline_checkin'
  | 'airline_itinerary'
  | 'airline_update'
  | 'one_time_notif_req';

export type MessengerConversationStatus =
  | 'active'
  | 'resolved'
  | 'archived'
  | 'blocked';

// ==================== Message Tags (for sending outside 24h window) ====================

export type MessengerMessageTag =
  | 'CONFIRMED_EVENT_UPDATE'
  | 'POST_PURCHASE_UPDATE'
  | 'ACCOUNT_UPDATE'
  | 'HUMAN_AGENT';

// ==================== Send Message Input ====================

export interface SendMessengerMessageInput {
  recipientId: string; // PSID (Page-Scoped User ID)
  messageType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  tag?: MessengerMessageTag;
  message: MessengerMessage;
}

export interface MessengerMessage {
  text?: string;
  attachment?: MessengerAttachment;
  quick_replies?: MessengerQuickReply[];
  metadata?: string;
}

export interface MessengerAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'template';
  payload: MessengerAttachmentPayload;
}

export interface MessengerAttachmentPayload {
  url?: string;
  is_reusable?: boolean;
  template_type?: MessengerTemplateType;
  elements?: MessengerTemplateElement[];
  buttons?: MessengerButton[];
  text?: string;
  attachment_id?: string;
}

export interface MessengerTemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: MessengerDefaultAction;
  buttons?: MessengerButton[];
}

export interface MessengerDefaultAction {
  type: 'web_url';
  url: string;
  webview_height_ratio?: 'compact' | 'tall' | 'full';
  messenger_extensions?: boolean;
  fallback_url?: string;
}

export interface MessengerButton {
  type: 'web_url' | 'postback' | 'call' | 'login' | 'logout' | 'game_play';
  title: string;
  url?: string;
  payload?: string;
  webview_height_ratio?: 'compact' | 'tall' | 'full';
  messenger_extensions?: boolean;
  fallback_url?: string;
}

export interface MessengerQuickReply {
  content_type: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
  image_url?: string;
}

// ==================== Webhook Payload ====================

export interface MessengerWebhookPayload {
  object: 'page';
  entry: MessengerWebhookEntry[];
}

export interface MessengerWebhookEntry {
  id: string; // Page ID
  time: number;
  messaging?: MessengerWebhookMessaging[];
  standby?: MessengerWebhookMessaging[];
  changes?: MessengerWebhookChange[];
}

export interface MessengerWebhookChange {
  field: string;
  value: Record<string, unknown>;
}

export interface MessengerWebhookMessaging {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MessengerIncomingMessage;
  postback?: MessengerPostback;
  referral?: MessengerReferral;
  delivery?: MessengerDelivery;
  read?: MessengerRead;
  reaction?: MessengerReaction;
  optin?: MessengerOptin;
  account_linking?: MessengerAccountLinking;
  pass_thread_control?: MessengerPassThreadControl;
  take_thread_control?: MessengerTakeThreadControl;
  request_thread_control?: MessengerRequestThreadControl;
}

export interface MessengerIncomingMessage {
  mid: string;
  text?: string;
  attachments?: MessengerIncomingAttachment[];
  quick_reply?: { payload: string };
  reply_to?: { mid: string };
  is_echo?: boolean;
  app_id?: string;
  metadata?: string;
  referral?: MessengerReferral;
  nlp?: MessengerNLP;
  sticker_id?: number;
}

export interface MessengerIncomingAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'fallback';
  payload: {
    url?: string;
    sticker_id?: number;
    coordinates?: { lat: number; long: number };
    title?: string;
  };
}

export interface MessengerNLP {
  entities?: Record<string, Array<{
    confidence: number;
    value: string;
  }>>;
  traits?: Record<string, Array<{
    confidence: number;
    value: string;
  }>>;
  detected_locales?: Array<{ locale: string; confidence: number }>;
}

export interface MessengerPostback {
  title: string;
  payload: string;
  referral?: MessengerReferral;
}

export interface MessengerReferral {
  ref?: string;
  source: string;
  type: string;
  ad_id?: string;
  ads_context_data?: {
    ad_title: string;
    photo_url?: string;
    video_url?: string;
    post_id?: string;
  };
  referer_uri?: string;
  is_guest_user?: boolean;
}

export interface MessengerDelivery {
  mids?: string[];
  watermark: number;
  seq?: number;
}

export interface MessengerRead {
  watermark: number;
  seq?: number;
}

export interface MessengerReaction {
  mid: string;
  action: 'react' | 'unreact';
  reaction?: string;
  emoji?: string;
}

export interface MessengerOptin {
  ref?: string;
  user_ref?: string;
  payload?: string;
  type?: 'one_time_notif_req';
  one_time_notif_token?: string;
  notification_messages_token?: string;
  notification_messages_frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notification_messages_timezone?: string;
  title?: string;
}

export interface MessengerAccountLinking {
  status: 'linked' | 'unlinked';
  authorization_code?: string;
}

export interface MessengerPassThreadControl {
  new_owner_app_id: string;
  metadata?: string;
}

export interface MessengerTakeThreadControl {
  previous_owner_app_id: string;
  metadata?: string;
}

export interface MessengerRequestThreadControl {
  requested_owner_app_id: string;
  metadata?: string;
}

// ==================== Configuration ====================

export interface MessengerProviderConfig {
  pageAccessToken: string;
  appSecret: string;
  appId: string;
  pageId: string;
  verifyToken: string;
  apiVersion?: string;
}

export interface MessengerProviderStatus {
  available: boolean;
  pageId?: string;
  pageName?: string;
  isConnected?: boolean;
  permissionsGranted?: string[];
}

// ==================== Conversation & Message Records ====================

export interface MessengerConversation {
  id: string;
  tenantId: string;
  pageId: string;
  psid: string;
  contactName?: string;
  contactProfilePic?: string;
  status: MessengerConversationStatus;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  lastMessageDirection: 'inbound' | 'outbound';
  unreadCount: number;
  totalMessages: number;
  assignedTo?: string;
  assignedAt?: Date;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  labels?: string[];
  windowExpiresAt?: Date;
  isWithinWindow: boolean;
  resolvedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessengerMessageRecord {
  id: string;
  tenantId: string;
  conversationId: string;
  fbMessageId?: string;
  direction: 'inbound' | 'outbound';
  type: MessengerMessageType;
  content?: string;
  contentJson?: Record<string, unknown>;
  attachmentType?: string;
  attachmentUrl?: string;
  attachmentPayload?: Record<string, unknown>;
  quickReplies?: MessengerQuickReply[];
  templateType?: MessengerTemplateType;
  status: MessengerMessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorCode?: number;
  errorMessage?: string;
  replyToMessageId?: string;
  referral?: MessengerReferral;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== API Responses ====================

export interface SendMessengerMessageResponse {
  recipient_id: string;
  message_id: string;
}

export interface MessengerUserProfile {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  locale?: string;
  timezone?: number;
  gender?: string;
}

export interface MessengerPageInfo {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
  access_token?: string;
}

// ==================== Bulk Operations ====================

export interface BulkMessengerMessageInput {
  recipients: string[];
  message: MessengerMessage;
  messageType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  tag?: MessengerMessageTag;
  batchSize?: number;
  delayBetweenBatches?: number;
}

export interface BulkMessengerMessageResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    psid: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ==================== Service Input Types ====================

export interface SendMessageInput {
  tenantId: string;
  to: string; // PSID
  type: MessengerMessageType;
  content: SendMessengerMessageInput;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  userId?: string;
}

export interface ConversationFilter {
  tenantId: string;
  status?: MessengerConversationStatus;
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
  type?: MessengerMessageType;
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

// ==================== Parsed Webhook Types ====================

export interface ParsedMessengerMessage {
  pageId: string;
  psid: string;
  messageId: string;
  timestamp: Date;
  type: MessengerMessageType;
  content: string;
  attachments?: Array<{ type: string; url?: string; coordinates?: { lat: number; long: number } }>;
  quickReplyPayload?: string;
  replyToMessageId?: string;
  referral?: MessengerReferral;
  isEcho: boolean;
  stickerId?: number;
}

export interface ParsedMessengerDelivery {
  pageId: string;
  psid: string;
  messageIds: string[];
  watermark: Date;
}

export interface ParsedMessengerRead {
  pageId: string;
  psid: string;
  watermark: Date;
}

export interface ParsedMessengerPostback {
  pageId: string;
  psid: string;
  title: string;
  payload: string;
  referral?: MessengerReferral;
  timestamp: Date;
}

export interface ParsedMessengerReaction {
  pageId: string;
  psid: string;
  messageId: string;
  action: 'react' | 'unreact';
  emoji?: string;
  timestamp: Date;
}

export interface ParsedWebhookPayload {
  messages: ParsedMessengerMessage[];
  deliveries: ParsedMessengerDelivery[];
  reads: ParsedMessengerRead[];
  postbacks: ParsedMessengerPostback[];
  reactions: ParsedMessengerReaction[];
}
