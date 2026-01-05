/**
 * Unified Messaging Types
 * Supports multiple providers for SMS and WhatsApp
 */

// ============================================================================
// Provider Types
// ============================================================================

export type MessagingProvider = 'twilio' | 'vonage' | 'messagebird' | 'sinch' | 'infobip';
export type MessagingChannel = 'sms' | 'whatsapp';

export type MessageStatus =
  | 'pending'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'undelivered';

export type MessageDirection = 'inbound' | 'outbound';

// ============================================================================
// Message Templates
// ============================================================================

export enum MessageTemplate {
  // Lead Templates
  LEAD_CREATED = 'lead-created',
  LEAD_ASSIGNED = 'lead-assigned',
  LEAD_QUALIFIED = 'lead-qualified',
  LEAD_CONVERTED = 'lead-converted',
  LEAD_STATUS_CHANGED = 'lead-status-changed',
  LEAD_FOLLOW_UP_REMINDER = 'lead-follow-up-reminder',
  FOLLOW_UP_SCHEDULED = 'follow-up-scheduled',
  FOLLOW_UP_OVERDUE = 'follow-up-overdue',

  // Task Templates
  TASK_ASSIGNED = 'task-assigned',
  TASK_DUE_REMINDER = 'task-due-reminder',
  TASK_OVERDUE = 'task-overdue',
  TASK_COMPLETED = 'task-completed',

  // Opportunity Templates
  OPPORTUNITY_CREATED = 'opportunity-created',
  OPPORTUNITY_WON = 'opportunity-won',
  OPPORTUNITY_LOST = 'opportunity-lost',
  OPPORTUNITY_STAGE_CHANGED = 'opportunity-stage-changed',
  OPPORTUNITY_OVERDUE = 'opportunity-overdue',

  // Payment Templates
  PAYMENT_RECEIVED = 'payment-received',
  PAYMENT_REMINDER = 'payment-reminder',
  PAYMENT_OVERDUE = 'payment-overdue',
  PAYMENT_FAILED = 'payment-failed',
  REFUND_PROCESSED = 'refund-processed',

  // Contract Templates
  CONTRACT_CREATED = 'contract-created',
  CONTRACT_SENT = 'contract-sent',
  CONTRACT_SIGNED = 'contract-signed',
  CONTRACT_EXPIRING = 'contract-expiring',
  CONTRACT_EXPIRED = 'contract-expired',
  CONTRACT_STATUS_CHANGED = 'contract-status-changed',
  CONTRACT_APPROVAL = 'contract-approval',
  CONTRACT_SIGNATURE_REQUEST = 'contract-signature-request',

  // Quote Templates
  QUOTE_CREATED = 'quote-created',
  QUOTE_SENT = 'quote-sent',
  QUOTE_ACCEPTED = 'quote-accepted',
  QUOTE_REJECTED = 'quote-rejected',
  QUOTE_EXPIRING = 'quote-expiring',

  // Customer Templates
  CUSTOMER_WELCOME = 'customer-welcome',
  CUSTOMER_BIRTHDAY = 'customer-birthday',
  CUSTOMER_ONBOARDING = 'customer-onboarding',
  CUSTOMER_HEALTH_ALERT = 'customer-health-alert',

  // Appointment Templates
  APPOINTMENT_REMINDER = 'appointment-reminder',
  APPOINTMENT_CONFIRMED = 'appointment-confirmed',
  APPOINTMENT_CANCELLED = 'appointment-cancelled',

  // Workflow Templates
  WORKFLOW_TRIGGERED = 'workflow-triggered',
  WORKFLOW_COMPLETED = 'workflow-completed',
  DRIP_ENROLLED = 'drip-enrolled',
  DRIP_COMPLETED = 'drip-completed',

  // Comment/Mention Templates
  COMMENT_MENTION = 'comment-mention',
  COMMENT_GROUP_MENTION = 'comment-group-mention',

  // General Templates
  OTP_VERIFICATION = 'otp-verification',
  CUSTOM = 'custom',
}

// ============================================================================
// Message Content
// ============================================================================

export interface MessageContent {
  // For SMS - plain text
  body: string;

  // For WhatsApp templates
  templateName?: string;
  templateLanguage?: string;
  templateVariables?: Record<string, string>;

  // For WhatsApp media
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';

  // For Twilio Content API
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

// ============================================================================
// Send Message Input
// ============================================================================

export interface SendMessageInput {
  // Required
  to: string;
  channel: MessagingChannel;

  // Content (one of these)
  body?: string;
  template?: MessageTemplate;
  templateVariables?: Record<string, string>;

  // WhatsApp specific
  mediaUrl?: string;
  contentSid?: string;

  // Provider selection (optional - uses default if not specified)
  provider?: MessagingProvider;

  // CRM linking
  entityType?: 'lead' | 'contact' | 'customer' | 'opportunity' | 'task';
  entityId?: string;
  userId?: string;

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Scheduling
  scheduledAt?: Date;
}

export interface SendBulkMessageInput {
  recipients: Array<{
    to: string;
    variables?: Record<string, string>;
    entityType?: string;
    entityId?: string;
  }>;
  channel: MessagingChannel;
  template: MessageTemplate;
  provider?: MessagingProvider;
  batchSize?: number;
  delayBetweenBatches?: number;
}

// ============================================================================
// Message Results
// ============================================================================

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  provider: MessagingProvider;
  channel: MessagingChannel;
  status: MessageStatus;
  segments?: number;
  price?: number;
  error?: string;
  errorCode?: string;
}

export interface BulkMessageResult {
  total: number;
  sent: number;
  failed: number;
  results: Array<{
    to: string;
    result: SendMessageResult;
  }>;
}

// ============================================================================
// Message Record (for persistence)
// ============================================================================

export interface MessageRecord {
  id: string;
  tenantId: string;

  // Provider & Channel
  provider: MessagingProvider;
  channel: MessagingChannel;
  externalId?: string;

  // Participants
  from: string;
  to: string;

  // Content
  body: string;
  template?: MessageTemplate;
  mediaUrl?: string;

  // Status
  direction: MessageDirection;
  status: MessageStatus;
  errorCode?: string;
  errorMessage?: string;

  // Metrics
  segments?: number;
  price?: number;
  priceUnit?: string;

  // CRM linking
  entityType?: string;
  entityId?: string;
  userId?: string;

  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface IMessagingProvider {
  readonly name: MessagingProvider;

  // Availability
  isAvailable(): boolean;
  isSmsAvailable(): boolean;
  isWhatsAppAvailable(): boolean;

  // Send messages
  sendSms(to: string, body: string, from?: string): Promise<SendMessageResult>;
  sendWhatsApp(to: string, body: string, from?: string): Promise<SendMessageResult>;
  sendWhatsAppTemplate(
    to: string,
    contentSid: string,
    variables?: Record<string, string>
  ): Promise<SendMessageResult>;

  // Status
  getMessageStatus(externalId: string): Promise<MessageStatus>;

  // Validation
  validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    type?: 'mobile' | 'landline' | 'voip';
  }>;
}

// ============================================================================
// Messaging Configuration
// ============================================================================

export interface MessagingConfig {
  defaultSmsProvider: MessagingProvider;
  defaultWhatsAppProvider: MessagingProvider;

  // Provider configs
  twilio?: {
    accountSid: string;
    authToken?: string;
    apiKeySid?: string;
    apiKeySecret?: string;
    phoneNumber?: string;
    whatsappNumber?: string;
  };

  vonage?: {
    apiKey: string;
    apiSecret: string;
    phoneNumber?: string;
  };

  messagebird?: {
    accessKey: string;
    phoneNumber?: string;
  };

  // Trial mode limitations
  isTrialMode?: boolean;
  maxMessageLength?: number;

  // Rate limiting
  rateLimit?: {
    maxPerSecond: number;
    maxPerMinute: number;
  };
}

// ============================================================================
// Template Definitions
// ============================================================================

export interface MessageTemplateDefinition {
  template: MessageTemplate;
  channel: MessagingChannel;
  smsBody: string;
  whatsAppBody?: string;
  whatsAppContentSid?: string;
  maxLength?: number;
}

export const MESSAGE_TEMPLATES: Record<MessageTemplate, MessageTemplateDefinition> = {
  [MessageTemplate.LEAD_CREATED]: {
    template: MessageTemplate.LEAD_CREATED,
    channel: 'sms',
    smsBody: 'Nuevo lead: {{companyName}}. Contacto: {{contactName}}. Ver en {{appUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.LEAD_ASSIGNED]: {
    template: MessageTemplate.LEAD_ASSIGNED,
    channel: 'sms',
    smsBody: 'Lead asignado: {{companyName}} te ha sido asignado. Ver detalles: {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.LEAD_QUALIFIED]: {
    template: MessageTemplate.LEAD_QUALIFIED,
    channel: 'sms',
    smsBody: 'Lead calificado: {{companyName}} (Score: {{score}}). Contacta pronto!',
    maxLength: 160,
  },
  [MessageTemplate.LEAD_CONVERTED]: {
    template: MessageTemplate.LEAD_CONVERTED,
    channel: 'sms',
    smsBody: 'Felicidades! {{companyName}} es ahora cliente. Ver: {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.LEAD_FOLLOW_UP_REMINDER]: {
    template: MessageTemplate.LEAD_FOLLOW_UP_REMINDER,
    channel: 'sms',
    smsBody: 'Recordatorio: Follow-up con {{companyName}} programado para hoy.',
    maxLength: 160,
  },
  [MessageTemplate.FOLLOW_UP_SCHEDULED]: {
    template: MessageTemplate.FOLLOW_UP_SCHEDULED,
    channel: 'sms',
    smsBody: 'Follow-up programado: {{companyName}} el {{followUpDate}}.',
    maxLength: 160,
  },
  [MessageTemplate.TASK_ASSIGNED]: {
    template: MessageTemplate.TASK_ASSIGNED,
    channel: 'sms',
    smsBody: 'Nueva tarea: {{taskTitle}}. Vence: {{dueDate}}. Ver: {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.TASK_DUE_REMINDER]: {
    template: MessageTemplate.TASK_DUE_REMINDER,
    channel: 'sms',
    smsBody: 'Recordatorio: Tarea "{{taskTitle}}" vence hoy.',
    maxLength: 160,
  },
  [MessageTemplate.TASK_OVERDUE]: {
    template: MessageTemplate.TASK_OVERDUE,
    channel: 'sms',
    smsBody: 'URGENTE: Tarea "{{taskTitle}}" esta vencida. Completala ahora.',
    maxLength: 160,
  },
  [MessageTemplate.OPPORTUNITY_WON]: {
    template: MessageTemplate.OPPORTUNITY_WON,
    channel: 'sms',
    smsBody: 'Ganaste! {{opportunityName}} por {{amount}}. Felicidades!',
    maxLength: 160,
  },
  [MessageTemplate.OPPORTUNITY_LOST]: {
    template: MessageTemplate.OPPORTUNITY_LOST,
    channel: 'sms',
    smsBody: 'Oportunidad {{opportunityName}} marcada como perdida. Razon: {{reason}}',
    maxLength: 160,
  },
  [MessageTemplate.OPPORTUNITY_STAGE_CHANGED]: {
    template: MessageTemplate.OPPORTUNITY_STAGE_CHANGED,
    channel: 'sms',
    smsBody: '{{opportunityName}} movida a etapa: {{stageName}}.',
    maxLength: 160,
  },
  [MessageTemplate.PAYMENT_RECEIVED]: {
    template: MessageTemplate.PAYMENT_RECEIVED,
    channel: 'sms',
    smsBody: 'Pago recibido: {{amount}} de {{customerName}}. Ref: {{reference}}',
    maxLength: 160,
  },
  [MessageTemplate.PAYMENT_REMINDER]: {
    template: MessageTemplate.PAYMENT_REMINDER,
    channel: 'sms',
    smsBody: 'Recordatorio: Pago de {{amount}} vence el {{dueDate}}.',
    maxLength: 160,
  },
  [MessageTemplate.PAYMENT_OVERDUE]: {
    template: MessageTemplate.PAYMENT_OVERDUE,
    channel: 'sms',
    smsBody: 'URGENTE: Pago de {{amount}} vencido. Por favor paga ahora.',
    maxLength: 160,
  },
  [MessageTemplate.REFUND_PROCESSED]: {
    template: MessageTemplate.REFUND_PROCESSED,
    channel: 'sms',
    smsBody: 'Reembolso de {{amount}} procesado. Ref: {{reference}}',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_SENT]: {
    template: MessageTemplate.CONTRACT_SENT,
    channel: 'sms',
    smsBody: 'Contrato "{{contractTitle}}" enviado para firma. Ver: {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_SIGNED]: {
    template: MessageTemplate.CONTRACT_SIGNED,
    channel: 'sms',
    smsBody: 'Contrato "{{contractTitle}}" firmado exitosamente!',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_EXPIRING]: {
    template: MessageTemplate.CONTRACT_EXPIRING,
    channel: 'sms',
    smsBody: 'Contrato "{{contractTitle}}" vence el {{expiryDate}}. Renovar pronto.',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_APPROVAL]: {
    template: MessageTemplate.CONTRACT_APPROVAL,
    channel: 'sms',
    smsBody: 'Aprobacion requerida: {{contractName}} ({{contractNumber}}). Ver CRM.',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_SIGNATURE_REQUEST]: {
    template: MessageTemplate.CONTRACT_SIGNATURE_REQUEST,
    channel: 'sms',
    smsBody: '{{signatoryName}}: Firma requerida para {{contractName}}. Ver CRM.',
    maxLength: 160,
  },
  [MessageTemplate.QUOTE_SENT]: {
    template: MessageTemplate.QUOTE_SENT,
    channel: 'sms',
    smsBody: 'Cotizacion enviada a {{companyName}} por {{amount}}.',
    maxLength: 160,
  },
  [MessageTemplate.QUOTE_ACCEPTED]: {
    template: MessageTemplate.QUOTE_ACCEPTED,
    channel: 'sms',
    smsBody: 'Cotizacion aceptada! {{companyName}} aprobo {{amount}}.',
    maxLength: 160,
  },
  [MessageTemplate.QUOTE_EXPIRING]: {
    template: MessageTemplate.QUOTE_EXPIRING,
    channel: 'sms',
    smsBody: 'Cotizacion para {{companyName}} vence el {{expiryDate}}.',
    maxLength: 160,
  },
  [MessageTemplate.CUSTOMER_WELCOME]: {
    template: MessageTemplate.CUSTOMER_WELCOME,
    channel: 'sms',
    smsBody: 'Bienvenido {{customerName}}! Gracias por elegirnos.',
    maxLength: 160,
  },
  [MessageTemplate.CUSTOMER_BIRTHDAY]: {
    template: MessageTemplate.CUSTOMER_BIRTHDAY,
    channel: 'sms',
    smsBody: 'Feliz cumpleanos {{customerName}}! Te deseamos un gran dia.',
    maxLength: 160,
  },
  [MessageTemplate.APPOINTMENT_REMINDER]: {
    template: MessageTemplate.APPOINTMENT_REMINDER,
    channel: 'sms',
    smsBody: 'Recordatorio: Cita el {{date}} a las {{time}}.',
    whatsAppContentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // Twilio sandbox template
    maxLength: 160,
  },
  [MessageTemplate.APPOINTMENT_CONFIRMED]: {
    template: MessageTemplate.APPOINTMENT_CONFIRMED,
    channel: 'sms',
    smsBody: 'Cita confirmada: {{date}} a las {{time}}. Te esperamos!',
    maxLength: 160,
  },
  [MessageTemplate.APPOINTMENT_CANCELLED]: {
    template: MessageTemplate.APPOINTMENT_CANCELLED,
    channel: 'sms',
    smsBody: 'Cita del {{date}} cancelada. Contactanos para reagendar.',
    maxLength: 160,
  },
  [MessageTemplate.OTP_VERIFICATION]: {
    template: MessageTemplate.OTP_VERIFICATION,
    channel: 'sms',
    smsBody: 'Tu codigo de verificacion es: {{code}}. Valido por {{minutes}} min.',
    maxLength: 160,
  },
  [MessageTemplate.CUSTOM]: {
    template: MessageTemplate.CUSTOM,
    channel: 'sms',
    smsBody: '{{message}}',
    maxLength: 160,
  },

  // New templates - Lead Status Changed
  [MessageTemplate.LEAD_STATUS_CHANGED]: {
    template: MessageTemplate.LEAD_STATUS_CHANGED,
    channel: 'sms',
    smsBody: '{{companyName}}: Estado cambiado a {{newStatus}}. Ver CRM.',
    whatsAppBody: 'El lead *{{companyName}}* cambio de estado:\n\n*Anterior:* {{previousStatus}}\n*Nuevo:* {{newStatus}}\n\nPor: {{changedBy}}\n\n👉 Ver detalles: {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.FOLLOW_UP_OVERDUE]: {
    template: MessageTemplate.FOLLOW_UP_OVERDUE,
    channel: 'sms',
    smsBody: 'URGENTE: Follow-up con {{companyName}} vencido hace {{daysOverdue}} dias.',
    whatsAppBody: '⚠️ *Follow-up Vencido*\n\nLead: *{{companyName}}*\nVencido hace: {{daysOverdue}} dias\n\nContacta al cliente lo antes posible.\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Task Completed
  [MessageTemplate.TASK_COMPLETED]: {
    template: MessageTemplate.TASK_COMPLETED,
    channel: 'sms',
    smsBody: 'Tarea completada: "{{taskTitle}}" por {{completedBy}}.',
    whatsAppBody: '✅ *Tarea Completada*\n\nTarea: {{taskTitle}}\nCompletada por: {{completedBy}}\nFecha: {{completedAt}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Opportunity Created and Overdue
  [MessageTemplate.OPPORTUNITY_CREATED]: {
    template: MessageTemplate.OPPORTUNITY_CREATED,
    channel: 'sms',
    smsBody: 'Nueva oportunidad: {{opportunityName}} - {{amount}}. Ver CRM.',
    whatsAppBody: '🎯 *Nueva Oportunidad*\n\n*{{opportunityName}}*\nValor: {{amount}}\nCliente: {{customerName}}\nEtapa: {{stageName}}\n\nCierre esperado: {{closeDate}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.OPPORTUNITY_OVERDUE]: {
    template: MessageTemplate.OPPORTUNITY_OVERDUE,
    channel: 'sms',
    smsBody: 'ALERTA: {{opportunityName}} vencida. Actualiza el cierre esperado.',
    whatsAppBody: '⚠️ *Oportunidad Vencida*\n\n*{{opportunityName}}*\nValor: {{amount}}\nCierre esperado: {{closeDate}}\nDias vencida: {{daysOverdue}}\n\nActualiza la fecha o cierra la oportunidad.\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Payment Failed
  [MessageTemplate.PAYMENT_FAILED]: {
    template: MessageTemplate.PAYMENT_FAILED,
    channel: 'sms',
    smsBody: 'Pago rechazado: {{amount}}. Por favor intente nuevamente.',
    whatsAppBody: '❌ *Pago Rechazado*\n\nMonto: {{amount}}\nRazon: {{failureReason}}\n\nPor favor actualice su metodo de pago e intente nuevamente.\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Contract Created, Expired, Status Changed
  [MessageTemplate.CONTRACT_CREATED]: {
    template: MessageTemplate.CONTRACT_CREATED,
    channel: 'sms',
    smsBody: 'Nuevo contrato creado: {{contractName}}. Ver detalles en CRM.',
    whatsAppBody: '📄 *Nuevo Contrato*\n\n*{{contractName}}*\nNumero: {{contractNumber}}\nValor: {{contractValue}}\nCliente: {{customerName}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_EXPIRED]: {
    template: MessageTemplate.CONTRACT_EXPIRED,
    channel: 'sms',
    smsBody: 'URGENTE: Contrato {{contractName}} ha expirado. Renovar ahora.',
    whatsAppBody: '⚠️ *Contrato Expirado*\n\n*{{contractName}}*\nNumero: {{contractNumber}}\nCliente: {{customerName}}\n\nContacta al cliente para renovacion.\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.CONTRACT_STATUS_CHANGED]: {
    template: MessageTemplate.CONTRACT_STATUS_CHANGED,
    channel: 'sms',
    smsBody: 'Contrato {{contractName}}: Estado cambiado a {{newStatus}}.',
    whatsAppBody: '📄 *Contrato Actualizado*\n\n*{{contractName}}*\nNuevo estado: {{newStatus}}\nAnterior: {{previousStatus}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Quote Created, Rejected
  [MessageTemplate.QUOTE_CREATED]: {
    template: MessageTemplate.QUOTE_CREATED,
    channel: 'sms',
    smsBody: 'Cotizacion creada: {{quoteNumber}} para {{companyName}}.',
    whatsAppBody: '📋 *Nueva Cotizacion*\n\nNumero: {{quoteNumber}}\nCliente: {{companyName}}\nMonto: {{amount}}\n\nValida hasta: {{validUntil}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.QUOTE_REJECTED]: {
    template: MessageTemplate.QUOTE_REJECTED,
    channel: 'sms',
    smsBody: 'Cotizacion {{quoteNumber}} rechazada por {{companyName}}.',
    whatsAppBody: '❌ *Cotizacion Rechazada*\n\nNumero: {{quoteNumber}}\nCliente: {{companyName}}\nRazon: {{rejectReason}}\n\nConsidera hacer seguimiento.\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Customer Onboarding, Health Alert
  [MessageTemplate.CUSTOMER_ONBOARDING]: {
    template: MessageTemplate.CUSTOMER_ONBOARDING,
    channel: 'sms',
    smsBody: 'Bienvenido {{customerName}}! Tu onboarding comienza ahora.',
    whatsAppBody: '🚀 *Bienvenido a {{appName}}!*\n\nHola {{customerName}},\n\nTu proceso de onboarding ha comenzado. Tu account manager te contactara pronto.\n\nMientras tanto, explora nuestra guia:\n\n👉 {{onboardingUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.CUSTOMER_HEALTH_ALERT]: {
    template: MessageTemplate.CUSTOMER_HEALTH_ALERT,
    channel: 'sms',
    smsBody: 'ALERTA: {{customerName}} health score bajo ({{healthScore}}). Accion requerida.',
    whatsAppBody: '⚠️ *Alerta de Health Score*\n\n*{{customerName}}*\nHealth Score: {{healthScore}}/100\nCambio: {{changeDirection}} {{changePercent}}%\n\nRazon probable: {{alertReason}}\n\n👉 Tomar accion: {{actionUrl}}',
    maxLength: 160,
  },

  // Workflow Templates
  [MessageTemplate.WORKFLOW_TRIGGERED]: {
    template: MessageTemplate.WORKFLOW_TRIGGERED,
    channel: 'sms',
    smsBody: 'Workflow "{{workflowName}}" activado para {{entityName}}.',
    whatsAppBody: '⚡ *Workflow Activado*\n\nNombre: {{workflowName}}\nEntidad: {{entityType}} - {{entityName}}\nAcciones: {{actionCount}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.WORKFLOW_COMPLETED]: {
    template: MessageTemplate.WORKFLOW_COMPLETED,
    channel: 'sms',
    smsBody: 'Workflow "{{workflowName}}" completado. {{successCount}} acciones exitosas.',
    whatsAppBody: '✅ *Workflow Completado*\n\nNombre: {{workflowName}}\nAcciones exitosas: {{successCount}}\nAcciones fallidas: {{failedCount}}\n\nDuracion: {{duration}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Drip Campaign Templates
  [MessageTemplate.DRIP_ENROLLED]: {
    template: MessageTemplate.DRIP_ENROLLED,
    channel: 'sms',
    smsBody: '{{contactName}} inscrito en secuencia "{{sequenceName}}".',
    whatsAppBody: '📧 *Nuevo Inscrito*\n\nContacto: {{contactName}}\nSecuencia: {{sequenceName}}\nPasos: {{totalSteps}}\n\nPrimer mensaje: {{firstMessageDate}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.DRIP_COMPLETED]: {
    template: MessageTemplate.DRIP_COMPLETED,
    channel: 'sms',
    smsBody: '{{contactName}} completo secuencia "{{sequenceName}}". Listo para venta!',
    whatsAppBody: '🎯 *Lead Maduro!*\n\n*{{contactName}}* completo la secuencia *{{sequenceName}}*.\n\n*Engagement:*\nEmails abiertos: {{opensCount}}\nClicks: {{clicksCount}}\n\n¡Es momento de contactar!\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },

  // Comment/Mention Templates
  [MessageTemplate.COMMENT_MENTION]: {
    template: MessageTemplate.COMMENT_MENTION,
    channel: 'sms',
    smsBody: '{{mentionedBy}} te menciono en un comentario. Ver: {{actionUrl}}',
    whatsAppBody: '💬 *Te Mencionaron*\n\n*{{mentionedBy}}* te menciono en un comentario:\n\n"{{commentPreview}}"\n\nEn: {{entityType}} - {{entityName}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
  [MessageTemplate.COMMENT_GROUP_MENTION]: {
    template: MessageTemplate.COMMENT_GROUP_MENTION,
    channel: 'sms',
    smsBody: '{{mentionedBy}} menciono a @{{groupName}}. Ver: {{actionUrl}}',
    whatsAppBody: '💬 *Mencion de Grupo*\n\n*{{mentionedBy}}* menciono al grupo *@{{groupName}}*:\n\n"{{commentPreview}}"\n\nEn: {{entityType}} - {{entityName}}\n\n👉 {{actionUrl}}',
    maxLength: 160,
  },
};
