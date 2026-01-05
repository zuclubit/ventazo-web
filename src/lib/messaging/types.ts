// ============================================
// FASE 5.9 — Messaging & Notifications Types
// ============================================

// ============================================
// Notification Types
// ============================================

export const NOTIFICATION_TYPES = [
  'info',
  'success',
  'warning',
  'error',
  'workflow',
  'task',
  'lead',
  'opportunity',
  'customer',
  'mention',
  'reminder',
  'system',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  info: 'Informativo',
  success: 'Exitoso',
  warning: 'Advertencia',
  error: 'Error',
  workflow: 'Workflow',
  task: 'Tarea',
  lead: 'Lead',
  opportunity: 'Oportunidad',
  customer: 'Cliente',
  mention: 'Mención',
  reminder: 'Recordatorio',
  system: 'Sistema',
};

export const RELATED_ENTITY_TYPES = [
  'lead',
  'task',
  'customer',
  'opportunity',
  'workflow',
  'service',
  'quote',
  'invoice',
  'user',
] as const;

export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number];

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedType?: RelatedEntityType;
  relatedId?: string;
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
  relatedType?: RelatedEntityType;
  limit?: number;
  offset?: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  byType: Record<NotificationType, number>;
}

// ============================================
// Message Channel Types
// ============================================

export const MESSAGE_CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'internal'] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push',
  internal: 'Interno',
};

export const MESSAGE_STATUSES = ['pending', 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced'] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Pendiente',
  queued: 'En cola',
  sending: 'Enviando',
  sent: 'Enviado',
  delivered: 'Entregado',
  failed: 'Fallido',
  bounced: 'Rebotado',
};

// ============================================
// Message Types
// ============================================

export interface Message {
  id: string;
  tenantId: string;
  channel: MessageChannel;
  to: string;
  from?: string;
  subject?: string;
  body: string;
  templateId?: string;
  status: MessageStatus;
  error?: string | null;
  errorMessage?: string | null;
  attempts?: number;
  providerMessageId?: string;
  metadata?: MessageMetadata;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
}

export interface MessageMetadata {
  recipientName?: string;
  recipientType?: RelatedEntityType;
  recipientId?: string;
  triggeredBy?: 'manual' | 'workflow' | 'automation' | 'system';
  workflowId?: string;
  workflowExecutionId?: string;
  retryCount?: number;
  provider?: string;
  providerMessageId?: string;
  [key: string]: unknown;
}

export interface SendMessageRequest {
  channel: MessageChannel;
  to: string;
  subject?: string;
  body?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  metadata?: MessageMetadata;
}

export interface MessageFilters {
  channel?: MessageChannel;
  status?: MessageStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MessageStats {
  total: number;
  totalSent: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: Record<MessageChannel, number>;
  byStatus: Record<MessageStatus, number>;
}

// ============================================
// Message Template Types
// ============================================

export interface MessageTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: MessageChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: TemplateVariable[];
  isActive: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'entity';
  entityType?: RelatedEntityType;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  channel: MessageChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables?: TemplateVariable[];
  category?: string;
}

export interface UpdateTemplateRequest extends Partial<CreateTemplateRequest> {
  isActive?: boolean;
}

export interface TemplatePreviewRequest {
  templateId?: string;
  bodyTemplate?: string;
  subjectTemplate?: string;
  variables?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface TemplatePreviewResult {
  subject?: string;
  body: string;
  errors?: string[];
}

// Predefined template variables
export const TEMPLATE_VARIABLES = {
  lead: [
    { name: 'lead.name', label: 'Nombre del Lead', type: 'text' as const },
    { name: 'lead.email', label: 'Email del Lead', type: 'text' as const },
    { name: 'lead.phone', label: 'Teléfono', type: 'text' as const },
    { name: 'lead.company', label: 'Empresa', type: 'text' as const },
    { name: 'lead.status', label: 'Estado', type: 'text' as const },
    { name: 'lead.score', label: 'Score', type: 'number' as const },
    { name: 'lead.source', label: 'Fuente', type: 'text' as const },
  ],
  customer: [
    { name: 'customer.name', label: 'Nombre del Cliente', type: 'text' as const },
    { name: 'customer.email', label: 'Email', type: 'text' as const },
    { name: 'customer.phone', label: 'Teléfono', type: 'text' as const },
    { name: 'customer.company', label: 'Empresa', type: 'text' as const },
  ],
  opportunity: [
    { name: 'opportunity.name', label: 'Nombre de Oportunidad', type: 'text' as const },
    { name: 'opportunity.amount', label: 'Monto', type: 'number' as const },
    { name: 'opportunity.stage', label: 'Etapa', type: 'text' as const },
    { name: 'opportunity.probability', label: 'Probabilidad', type: 'number' as const },
    { name: 'opportunity.closeDate', label: 'Fecha de Cierre', type: 'date' as const },
  ],
  task: [
    { name: 'task.title', label: 'Título', type: 'text' as const },
    { name: 'task.description', label: 'Descripción', type: 'text' as const },
    { name: 'task.dueDate', label: 'Fecha Límite', type: 'date' as const },
    { name: 'task.priority', label: 'Prioridad', type: 'text' as const },
    { name: 'task.status', label: 'Estado', type: 'text' as const },
  ],
  user: [
    { name: 'user.name', label: 'Nombre del Usuario', type: 'text' as const },
    { name: 'user.email', label: 'Email', type: 'text' as const },
    { name: 'user.role', label: 'Rol', type: 'text' as const },
  ],
  tenant: [
    { name: 'tenant.name', label: 'Nombre de la Empresa', type: 'text' as const },
    { name: 'tenant.email', label: 'Email de la Empresa', type: 'text' as const },
    { name: 'tenant.phone', label: 'Teléfono', type: 'text' as const },
    { name: 'tenant.website', label: 'Sitio Web', type: 'text' as const },
  ],
  system: [
    { name: 'system.date', label: 'Fecha Actual', type: 'date' as const },
    { name: 'system.time', label: 'Hora Actual', type: 'text' as const },
    { name: 'system.appUrl', label: 'URL de la App', type: 'text' as const },
  ],
};

// ============================================
// Notification Preferences Types
// ============================================

export interface NotificationPreferences {
  id: string;
  userId: string;
  tenantId: string;

  // Channel preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  internalEnabled: boolean;
  pushEnabled: boolean;

  // Email settings
  emailAddress?: string;

  // Digest settings
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  digestTime?: string; // HH:mm format
  digestDay?: number; // 0-6 for weekly

  // Notification type preferences
  typePreferences: NotificationTypePreferences;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string;
  quietHoursTimezone?: string;

  createdAt: string;
  updatedAt: string;
}

export type NotificationTypePreferences = {
  [key in NotificationType]?: ChannelPreferences;
};

export interface ChannelPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  internal: boolean;
  push: boolean;
}

export interface UpdatePreferencesRequest {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  internalEnabled?: boolean;
  pushEnabled?: boolean;
  emailAddress?: string;
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly' | 'never';
  digestTime?: string;
  digestDay?: number;
  typePreferences?: Partial<NotificationTypePreferences>;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}

// Default preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'userId' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  emailEnabled: true,
  smsEnabled: false,
  whatsappEnabled: false,
  internalEnabled: true,
  pushEnabled: true,
  digestEnabled: false,
  digestFrequency: 'weekly',
  quietHoursEnabled: false,
  typePreferences: {
    info: { email: true, sms: false, whatsapp: false, internal: true, push: false },
    success: { email: true, sms: false, whatsapp: false, internal: true, push: false },
    warning: { email: true, sms: false, whatsapp: false, internal: true, push: true },
    error: { email: true, sms: true, whatsapp: false, internal: true, push: true },
    workflow: { email: false, sms: false, whatsapp: false, internal: true, push: false },
    task: { email: true, sms: false, whatsapp: false, internal: true, push: true },
    lead: { email: true, sms: false, whatsapp: false, internal: true, push: true },
    opportunity: { email: true, sms: false, whatsapp: false, internal: true, push: true },
    customer: { email: true, sms: false, whatsapp: false, internal: true, push: false },
    mention: { email: true, sms: false, whatsapp: false, internal: true, push: true },
    reminder: { email: true, sms: true, whatsapp: false, internal: true, push: true },
    system: { email: true, sms: false, whatsapp: false, internal: true, push: false },
  },
};

// ============================================
// Provider Configuration Types
// ============================================

export const EMAIL_PROVIDERS = ['resend', 'sendgrid', 'smtp', 'ses'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const SMS_PROVIDERS = ['twilio', 'vonage', 'messagebird'] as const;
export type SMSProvider = (typeof SMS_PROVIDERS)[number];

export const WHATSAPP_PROVIDERS = ['twilio', 'messagebird', 'whatsapp-business'] as const;
export type WhatsAppProvider = (typeof WHATSAPP_PROVIDERS)[number];

export interface ProviderConfig {
  email?: {
    provider: EmailProvider;
    apiKey?: string;
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
    // SMTP specific
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    password?: string;
  };
  sms?: {
    provider: SMSProvider;
    accountSid?: string;
    authToken?: string;
    fromNumber: string;
  };
  whatsapp?: {
    provider: WhatsAppProvider;
    accountSid?: string;
    authToken?: string;
    fromNumber: string;
    businessId?: string;
  };
}

// ============================================
// Messaging Engine Types
// ============================================

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  metadata?: MessageMetadata;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface SendSMSOptions {
  to: string;
  body: string;
  from?: string;
  metadata?: MessageMetadata;
}

export interface SendWhatsAppOptions {
  to: string;
  body: string;
  mediaUrl?: string;
  from?: string;
  metadata?: MessageMetadata;
}

export interface SendNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedType?: RelatedEntityType;
  relatedId?: string;
  actionUrl?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  providerMessageId?: string;
  error?: string;
  retryable?: boolean;
}

// ============================================
// Webhook & Delivery Types
// ============================================

export interface DeliveryWebhook {
  id: string;
  messageId: string;
  event: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: MessageStatus;
  events: DeliveryWebhook[];
  lastUpdated: string;
}

// ============================================
// Retry Configuration
// ============================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
};

// ============================================
// Bulk Messaging Types
// ============================================

export interface BulkMessageRequest {
  channel: MessageChannel;
  recipients: BulkRecipient[];
  templateId?: string;
  subject?: string;
  body?: string;
  scheduleAt?: string;
}

export interface BulkRecipient {
  to: string;
  variables?: Record<string, unknown>;
  metadata?: MessageMetadata;
}

export interface BulkMessageResult {
  id: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  status: 'processing' | 'completed' | 'failed';
  results: {
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}
