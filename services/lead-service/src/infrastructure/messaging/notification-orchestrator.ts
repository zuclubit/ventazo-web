/**
 * Notification Orchestrator
 * Central hub for dispatching notifications across all channels (Email, SMS, WhatsApp, Push)
 * with intelligent routing, preferences, and analytics
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { MessagingService, getMessagingService } from './messaging.service';
import { MessageTemplate, SendMessageResult, MessagingChannel } from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import {
  NotificationPreferencesService,
  NotificationEventType,
  NotificationChannel,
  NotificationPriority,
  DEFAULT_NOTIFICATION_CONFIG,
} from './notification-preferences';

// ============================================================================
// Types
// ============================================================================

export interface NotificationRecipient {
  userId: string;
  role: 'owner' | 'assignee' | 'manager' | 'customer' | 'approver' | 'signatory' | 'finance' | 'team';
  name: string;
  email?: string;
  phone?: string;
  whatsappNumber?: string;
  language?: 'es' | 'en' | 'pt';
}

export interface NotificationPayload {
  tenantId: string;
  eventType: NotificationEventType;
  priority?: NotificationPriority;
  recipients: NotificationRecipient[];
  data: Record<string, unknown>;
  // Entity reference
  entityType: 'lead' | 'customer' | 'opportunity' | 'task' | 'contract' | 'quote' | 'payment';
  entityId: string;
  // Optional overrides
  forceChannels?: NotificationChannel[];
  skipPreferences?: boolean;
  scheduledAt?: Date;
  // Metadata
  triggeredBy?: string;
  correlationId?: string;
}

export interface NotificationResult {
  success: boolean;
  eventType: NotificationEventType;
  totalRecipients: number;
  channelResults: {
    email: { sent: number; failed: number; skipped: number };
    sms: { sent: number; failed: number; skipped: number };
    whatsapp: { sent: number; failed: number; skipped: number };
    push: { sent: number; failed: number; skipped: number };
  };
  errors: Array<{ recipient: string; channel: string; error: string }>;
  processingTimeMs: number;
}

export interface NotificationLog {
  id: string;
  tenantId: string;
  eventType: NotificationEventType;
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';
  externalId?: string;
  errorMessage?: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Template Mapping
// ============================================================================

const EVENT_TO_TEMPLATE_MAP: Record<NotificationEventType, {
  sms: MessageTemplate;
  whatsapp: MessageTemplate;
  email: EmailTemplate;
}> = {
  // Lead Events
  'lead.created': {
    sms: MessageTemplate.LEAD_CREATED,
    whatsapp: MessageTemplate.LEAD_CREATED,
    email: EmailTemplate.LEAD_NEW,
  },
  'lead.assigned': {
    sms: MessageTemplate.LEAD_ASSIGNED,
    whatsapp: MessageTemplate.LEAD_ASSIGNED,
    email: EmailTemplate.LEAD_ASSIGNED,
  },
  'lead.qualified': {
    sms: MessageTemplate.LEAD_QUALIFIED,
    whatsapp: MessageTemplate.LEAD_QUALIFIED,
    email: EmailTemplate.LEAD_QUALIFIED,
  },
  'lead.converted': {
    sms: MessageTemplate.LEAD_CONVERTED,
    whatsapp: MessageTemplate.LEAD_CONVERTED,
    email: EmailTemplate.LEAD_CONVERTED,
  },
  'lead.status_changed': {
    sms: MessageTemplate.LEAD_STATUS_CHANGED,
    whatsapp: MessageTemplate.LEAD_STATUS_CHANGED,
    email: EmailTemplate.LEAD_STATUS_CHANGED,
  },
  'lead.follow_up_scheduled': {
    sms: MessageTemplate.FOLLOW_UP_SCHEDULED,
    whatsapp: MessageTemplate.FOLLOW_UP_SCHEDULED,
    email: EmailTemplate.FOLLOW_UP_REMINDER,
  },
  'lead.follow_up_due': {
    sms: MessageTemplate.LEAD_FOLLOW_UP_REMINDER,
    whatsapp: MessageTemplate.LEAD_FOLLOW_UP_REMINDER,
    email: EmailTemplate.FOLLOW_UP_REMINDER,
  },
  'lead.follow_up_overdue': {
    sms: MessageTemplate.FOLLOW_UP_OVERDUE,
    whatsapp: MessageTemplate.FOLLOW_UP_OVERDUE,
    email: EmailTemplate.FOLLOW_UP_REMINDER,
  },

  // Task Events
  'task.assigned': {
    sms: MessageTemplate.TASK_ASSIGNED,
    whatsapp: MessageTemplate.TASK_ASSIGNED,
    email: EmailTemplate.TASK_ASSIGNED,
  },
  'task.due_soon': {
    sms: MessageTemplate.TASK_DUE_REMINDER,
    whatsapp: MessageTemplate.TASK_DUE_REMINDER,
    email: EmailTemplate.TASK_REMINDER,
  },
  'task.overdue': {
    sms: MessageTemplate.TASK_OVERDUE,
    whatsapp: MessageTemplate.TASK_OVERDUE,
    email: EmailTemplate.TASK_OVERDUE,
  },
  'task.completed': {
    sms: MessageTemplate.TASK_COMPLETED,
    whatsapp: MessageTemplate.TASK_COMPLETED,
    email: EmailTemplate.TASK_COMPLETED,
  },

  // Opportunity Events
  'opportunity.created': {
    sms: MessageTemplate.OPPORTUNITY_CREATED,
    whatsapp: MessageTemplate.OPPORTUNITY_CREATED,
    email: EmailTemplate.OPPORTUNITY_NEW,
  },
  'opportunity.stage_changed': {
    sms: MessageTemplate.OPPORTUNITY_STAGE_CHANGED,
    whatsapp: MessageTemplate.OPPORTUNITY_STAGE_CHANGED,
    email: EmailTemplate.OPPORTUNITY_STAGE_CHANGED,
  },
  'opportunity.won': {
    sms: MessageTemplate.OPPORTUNITY_WON,
    whatsapp: MessageTemplate.OPPORTUNITY_WON,
    email: EmailTemplate.OPPORTUNITY_WON,
  },
  'opportunity.lost': {
    sms: MessageTemplate.OPPORTUNITY_LOST,
    whatsapp: MessageTemplate.OPPORTUNITY_LOST,
    email: EmailTemplate.OPPORTUNITY_LOST,
  },
  'opportunity.overdue': {
    sms: MessageTemplate.OPPORTUNITY_OVERDUE,
    whatsapp: MessageTemplate.OPPORTUNITY_OVERDUE,
    email: EmailTemplate.OPPORTUNITY_OVERDUE,
  },

  // Contract Events
  'contract.created': {
    sms: MessageTemplate.CONTRACT_CREATED,
    whatsapp: MessageTemplate.CONTRACT_CREATED,
    email: EmailTemplate.CONTRACT_NEW,
  },
  'contract.status_changed': {
    sms: MessageTemplate.CONTRACT_STATUS_CHANGED,
    whatsapp: MessageTemplate.CONTRACT_STATUS_CHANGED,
    email: EmailTemplate.CONTRACT_STATUS_CHANGED,
  },
  'contract.expiring_soon': {
    sms: MessageTemplate.CONTRACT_EXPIRING,
    whatsapp: MessageTemplate.CONTRACT_EXPIRING,
    email: EmailTemplate.CONTRACT_EXPIRING,
  },
  'contract.expired': {
    sms: MessageTemplate.CONTRACT_EXPIRED,
    whatsapp: MessageTemplate.CONTRACT_EXPIRED,
    email: EmailTemplate.CONTRACT_EXPIRED,
  },
  'contract.approval_required': {
    sms: MessageTemplate.CONTRACT_APPROVAL,
    whatsapp: MessageTemplate.CONTRACT_APPROVAL,
    email: EmailTemplate.CONTRACT_APPROVAL_REQUEST,
  },
  'contract.signature_required': {
    sms: MessageTemplate.CONTRACT_SIGNATURE_REQUEST,
    whatsapp: MessageTemplate.CONTRACT_SIGNATURE_REQUEST,
    email: EmailTemplate.CONTRACT_SIGNATURE_REQUEST,
  },
  'contract.signed': {
    sms: MessageTemplate.CONTRACT_SIGNED,
    whatsapp: MessageTemplate.CONTRACT_SIGNED,
    email: EmailTemplate.CONTRACT_SIGNED,
  },

  // Quote Events
  'quote.created': {
    sms: MessageTemplate.QUOTE_CREATED,
    whatsapp: MessageTemplate.QUOTE_CREATED,
    email: EmailTemplate.QUOTE_NEW,
  },
  'quote.sent': {
    sms: MessageTemplate.QUOTE_SENT,
    whatsapp: MessageTemplate.QUOTE_SENT,
    email: EmailTemplate.QUOTE_SENT,
  },
  'quote.accepted': {
    sms: MessageTemplate.QUOTE_ACCEPTED,
    whatsapp: MessageTemplate.QUOTE_ACCEPTED,
    email: EmailTemplate.QUOTE_ACCEPTED,
  },
  'quote.rejected': {
    sms: MessageTemplate.QUOTE_REJECTED,
    whatsapp: MessageTemplate.QUOTE_REJECTED,
    email: EmailTemplate.QUOTE_REJECTED,
  },
  'quote.expiring_soon': {
    sms: MessageTemplate.QUOTE_EXPIRING,
    whatsapp: MessageTemplate.QUOTE_EXPIRING,
    email: EmailTemplate.QUOTE_EXPIRING,
  },

  // Payment Events
  'payment.received': {
    sms: MessageTemplate.PAYMENT_RECEIVED,
    whatsapp: MessageTemplate.PAYMENT_RECEIVED,
    email: EmailTemplate.PAYMENT_CONFIRMATION,
  },
  'payment.failed': {
    sms: MessageTemplate.PAYMENT_FAILED,
    whatsapp: MessageTemplate.PAYMENT_FAILED,
    email: EmailTemplate.PAYMENT_FAILED,
  },
  'payment.refunded': {
    sms: MessageTemplate.REFUND_PROCESSED,
    whatsapp: MessageTemplate.REFUND_PROCESSED,
    email: EmailTemplate.PAYMENT_REFUND,
  },
  'payment.reminder': {
    sms: MessageTemplate.PAYMENT_REMINDER,
    whatsapp: MessageTemplate.PAYMENT_REMINDER,
    email: EmailTemplate.PAYMENT_REMINDER,
  },
  'payment.overdue': {
    sms: MessageTemplate.PAYMENT_OVERDUE,
    whatsapp: MessageTemplate.PAYMENT_OVERDUE,
    email: EmailTemplate.PAYMENT_OVERDUE,
  },

  // Customer Events
  'customer.created': {
    sms: MessageTemplate.CUSTOMER_WELCOME,
    whatsapp: MessageTemplate.CUSTOMER_WELCOME,
    email: EmailTemplate.CUSTOMER_WELCOME,
  },
  'customer.onboarding_started': {
    sms: MessageTemplate.CUSTOMER_ONBOARDING,
    whatsapp: MessageTemplate.CUSTOMER_ONBOARDING,
    email: EmailTemplate.CUSTOMER_ONBOARDING,
  },
  'customer.health_score_changed': {
    sms: MessageTemplate.CUSTOMER_HEALTH_ALERT,
    whatsapp: MessageTemplate.CUSTOMER_HEALTH_ALERT,
    email: EmailTemplate.CUSTOMER_HEALTH_ALERT,
  },

  // Workflow Events
  'workflow.triggered': {
    sms: MessageTemplate.WORKFLOW_TRIGGERED,
    whatsapp: MessageTemplate.WORKFLOW_TRIGGERED,
    email: EmailTemplate.WORKFLOW_TRIGGERED,
  },
  'workflow.completed': {
    sms: MessageTemplate.WORKFLOW_COMPLETED,
    whatsapp: MessageTemplate.WORKFLOW_COMPLETED,
    email: EmailTemplate.WORKFLOW_COMPLETED,
  },
  'drip.enrolled': {
    sms: MessageTemplate.DRIP_ENROLLED,
    whatsapp: MessageTemplate.DRIP_ENROLLED,
    email: EmailTemplate.DRIP_WELCOME,
  },
  'drip.completed': {
    sms: MessageTemplate.DRIP_COMPLETED,
    whatsapp: MessageTemplate.DRIP_COMPLETED,
    email: EmailTemplate.DRIP_COMPLETED,
  },

  // Comment/Mention Events
  'comment.mention': {
    sms: MessageTemplate.COMMENT_MENTION,
    whatsapp: MessageTemplate.COMMENT_MENTION,
    email: EmailTemplate.COMMENT_MENTION,
  },
  'comment.group_mention': {
    sms: MessageTemplate.COMMENT_GROUP_MENTION,
    whatsapp: MessageTemplate.COMMENT_GROUP_MENTION,
    email: EmailTemplate.COMMENT_GROUP_MENTION,
  },
};

// ============================================================================
// Notification Orchestrator Service
// ============================================================================

@injectable()
export class NotificationOrchestrator {
  private messagingService: MessagingService;
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject('DatabasePool') private pool: DatabasePool,
    @inject(NotificationPreferencesService) private preferencesService: NotificationPreferencesService
  ) {
    this.messagingService = getMessagingService();
    this.initEmailProvider();
  }

  private async initEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      this.emailInitialized = true;
    }
  }

  // ============================================================================
  // Main Dispatch Methods
  // ============================================================================

  /**
   * Dispatch notification to all recipients across appropriate channels
   */
  async dispatch(payload: NotificationPayload): Promise<NotificationResult> {
    const startTime = Date.now();
    const result: NotificationResult = {
      success: true,
      eventType: payload.eventType,
      totalRecipients: payload.recipients.length,
      channelResults: {
        email: { sent: 0, failed: 0, skipped: 0 },
        sms: { sent: 0, failed: 0, skipped: 0 },
        whatsapp: { sent: 0, failed: 0, skipped: 0 },
        push: { sent: 0, failed: 0, skipped: 0 },
      },
      errors: [],
      processingTimeMs: 0,
    };

    const config = DEFAULT_NOTIFICATION_CONFIG[payload.eventType];
    const priority = payload.priority || config.priority;
    const appConfig = getAppConfig();

    // Process each recipient
    for (const recipient of payload.recipients) {
      try {
        // Determine which channels to use
        const channels = await this.determineChannels(
          payload.tenantId,
          recipient.userId,
          payload.eventType,
          payload.forceChannels,
          payload.skipPreferences
        );

        // Prepare template variables
        const variables = this.prepareVariables(payload.data, recipient, appConfig);

        // Send to each enabled channel
        for (const channel of channels) {
          try {
            const sendResult = await this.sendToChannel(
              channel,
              recipient,
              payload.eventType,
              variables,
              payload.entityType,
              payload.entityId,
              priority
            );

            if (sendResult.success) {
              result.channelResults[channel].sent++;
              await this.logNotification(payload, recipient, channel, 'sent', sendResult.externalId);
            } else {
              result.channelResults[channel].failed++;
              result.errors.push({
                recipient: recipient.email || recipient.phone || recipient.userId,
                channel,
                error: sendResult.error || 'Unknown error',
              });
              await this.logNotification(payload, recipient, channel, 'failed', undefined, sendResult.error);
            }
          } catch (channelError) {
            result.channelResults[channel].failed++;
            result.errors.push({
              recipient: recipient.email || recipient.phone || recipient.userId,
              channel,
              error: (channelError as Error).message,
            });
          }
        }

        // Track skipped channels
        const allChannels: NotificationChannel[] = ['email', 'sms', 'whatsapp', 'push'];
        for (const channel of allChannels) {
          if (!channels.includes(channel)) {
            result.channelResults[channel].skipped++;
          }
        }
      } catch (recipientError) {
        result.errors.push({
          recipient: recipient.email || recipient.phone || recipient.userId,
          channel: 'all',
          error: (recipientError as Error).message,
        });
      }
    }

    result.processingTimeMs = Date.now() - startTime;
    result.success = result.errors.length === 0;

    // Log aggregated result
    console.log(
      `[NotificationOrchestrator] ${payload.eventType}: ` +
      `${result.totalRecipients} recipients, ` +
      `Email: ${result.channelResults.email.sent}/${result.channelResults.email.failed}, ` +
      `SMS: ${result.channelResults.sms.sent}/${result.channelResults.sms.failed}, ` +
      `WhatsApp: ${result.channelResults.whatsapp.sent}/${result.channelResults.whatsapp.failed}, ` +
      `${result.processingTimeMs}ms`
    );

    return result;
  }

  /**
   * Quick dispatch for single recipient
   */
  async notify(
    tenantId: string,
    eventType: NotificationEventType,
    recipient: NotificationRecipient,
    data: Record<string, unknown>,
    entityType: NotificationPayload['entityType'],
    entityId: string
  ): Promise<NotificationResult> {
    return this.dispatch({
      tenantId,
      eventType,
      recipients: [recipient],
      data,
      entityType,
      entityId,
    });
  }

  /**
   * Broadcast to multiple recipients with same data
   */
  async broadcast(
    tenantId: string,
    eventType: NotificationEventType,
    recipients: NotificationRecipient[],
    data: Record<string, unknown>,
    entityType: NotificationPayload['entityType'],
    entityId: string
  ): Promise<NotificationResult> {
    return this.dispatch({
      tenantId,
      eventType,
      recipients,
      data,
      entityType,
      entityId,
    });
  }

  // ============================================================================
  // Channel Routing
  // ============================================================================

  private async determineChannels(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType,
    forceChannels?: NotificationChannel[],
    skipPreferences?: boolean
  ): Promise<NotificationChannel[]> {
    // If force channels are specified, use them
    if (forceChannels && forceChannels.length > 0) {
      return forceChannels;
    }

    // If skipping preferences, use default config
    if (skipPreferences) {
      const config = DEFAULT_NOTIFICATION_CONFIG[eventType];
      return config.defaultChannels;
    }

    // Get user preferences
    const channels: NotificationChannel[] = [];

    if (await this.preferencesService.shouldNotify(tenantId, userId, eventType, 'email')) {
      channels.push('email');
    }
    if (await this.preferencesService.shouldNotify(tenantId, userId, eventType, 'sms')) {
      channels.push('sms');
    }
    if (await this.preferencesService.shouldNotify(tenantId, userId, eventType, 'whatsapp')) {
      channels.push('whatsapp');
    }
    if (await this.preferencesService.shouldNotify(tenantId, userId, eventType, 'push')) {
      channels.push('push');
    }

    // If no channels from preferences, fall back to defaults
    if (channels.length === 0) {
      const config = DEFAULT_NOTIFICATION_CONFIG[eventType];
      return config.defaultChannels;
    }

    return channels;
  }

  // ============================================================================
  // Channel Sending
  // ============================================================================

  private async sendToChannel(
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    eventType: NotificationEventType,
    variables: Record<string, string>,
    entityType: string,
    entityId: string,
    priority: NotificationPriority
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const templates = EVENT_TO_TEMPLATE_MAP[eventType];

    switch (channel) {
      case 'email':
        return this.sendEmail(recipient, templates.email, variables, entityType, entityId);

      case 'sms':
        return this.sendSms(recipient, templates.sms, variables, entityType, entityId);

      case 'whatsapp':
        return this.sendWhatsApp(recipient, templates.whatsapp, variables, entityType, entityId, priority);

      case 'push':
        // Push notifications not implemented yet
        return { success: false, error: 'Push notifications not implemented' };

      default:
        return { success: false, error: `Unknown channel: ${channel}` };
    }
  }

  private async sendEmail(
    recipient: NotificationRecipient,
    template: EmailTemplate,
    variables: Record<string, string>,
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    if (!recipient.email) {
      return { success: false, error: 'No email address' };
    }

    if (!this.emailProvider) {
      return { success: false, error: 'Email provider not configured' };
    }

    try {
      const result = await this.emailProvider.send({
        to: recipient.email,
        subject: this.getEmailSubject(template, variables),
        template,
        variables,
        tags: [
          { name: 'entityType', value: entityType },
          { name: 'entityId', value: entityId },
        ],
      });

      return {
        success: result.isSuccess,
        externalId: result.isSuccess ? result.getValue().messageId : undefined,
        error: result.isFailure ? result.error : undefined,
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendSms(
    recipient: NotificationRecipient,
    template: MessageTemplate,
    variables: Record<string, string>,
    entityType: string,
    entityId: string
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    if (!recipient.phone) {
      return { success: false, error: 'No phone number' };
    }

    if (!this.messagingService.isSmsAvailable()) {
      return { success: false, error: 'SMS provider not configured' };
    }

    try {
      const result = await this.messagingService.sendTemplate(
        recipient.phone,
        template,
        variables,
        'sms',
        { entityType, entityId }
      );

      if (result.isSuccess) {
        const sendResult = result.getValue();
        return {
          success: sendResult.success,
          externalId: sendResult.externalId,
          error: sendResult.error,
        };
      }

      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async sendWhatsApp(
    recipient: NotificationRecipient,
    template: MessageTemplate,
    variables: Record<string, string>,
    entityType: string,
    entityId: string,
    priority: NotificationPriority
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    const whatsappNumber = recipient.whatsappNumber || recipient.phone;
    if (!whatsappNumber) {
      return { success: false, error: 'No WhatsApp number' };
    }

    if (!this.messagingService.isWhatsAppAvailable()) {
      return { success: false, error: 'WhatsApp provider not configured' };
    }

    try {
      const result = await this.messagingService.sendTemplate(
        whatsappNumber,
        template,
        variables,
        'whatsapp',
        { entityType, entityId }
      );

      if (result.isSuccess) {
        const sendResult = result.getValue();
        return {
          success: sendResult.success,
          externalId: sendResult.externalId,
          error: sendResult.error,
        };
      }

      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private prepareVariables(
    data: Record<string, unknown>,
    recipient: NotificationRecipient,
    appConfig: ReturnType<typeof getAppConfig>
  ): Record<string, string> {
    const variables: Record<string, string> = {
      // Default app variables
      appName: appConfig.appName,
      appUrl: appConfig.appUrl,
      supportEmail: appConfig.supportEmail,
      // Recipient variables
      recipientName: recipient.name,
      userName: recipient.name,
    };

    // Add all data as string variables
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          if (value instanceof Date) {
            variables[key] = value.toLocaleDateString('es-MX', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
          } else {
            variables[key] = JSON.stringify(value);
          }
        } else {
          variables[key] = String(value);
        }
      }
    }

    return variables;
  }

  private getEmailSubject(template: EmailTemplate, variables: Record<string, string>): string {
    const subjectMap: Record<string, string> = {
      [EmailTemplate.LEAD_NEW]: `Nuevo lead: ${variables.companyName || 'Lead'}`,
      [EmailTemplate.LEAD_ASSIGNED]: `Lead asignado: ${variables.companyName || 'Lead'}`,
      [EmailTemplate.LEAD_QUALIFIED]: `Lead calificado: ${variables.companyName || 'Lead'}`,
      [EmailTemplate.LEAD_CONVERTED]: `Lead convertido: ${variables.companyName || 'Lead'}`,
      [EmailTemplate.TASK_ASSIGNED]: `Nueva tarea asignada: ${variables.taskTitle || 'Tarea'}`,
      [EmailTemplate.TASK_REMINDER]: `Recordatorio de tarea: ${variables.taskTitle || 'Tarea'}`,
      [EmailTemplate.TASK_OVERDUE]: `Tarea vencida: ${variables.taskTitle || 'Tarea'}`,
      [EmailTemplate.OPPORTUNITY_WON]: `Oportunidad ganada: ${variables.opportunityName || 'Oportunidad'}`,
      [EmailTemplate.OPPORTUNITY_LOST]: `Oportunidad perdida: ${variables.opportunityName || 'Oportunidad'}`,
      [EmailTemplate.PAYMENT_CONFIRMATION]: `Pago recibido: ${variables.amount || ''}`,
      [EmailTemplate.PAYMENT_FAILED]: `Pago fallido: ${variables.amount || ''}`,
      [EmailTemplate.CONTRACT_EXPIRING]: `Contrato por vencer: ${variables.contractName || 'Contrato'}`,
      [EmailTemplate.QUOTE_SENT]: `Cotizacion enviada: ${variables.quoteNumber || ''}`,
      [EmailTemplate.QUOTE_ACCEPTED]: `Cotizacion aceptada: ${variables.quoteNumber || ''}`,
    };

    return subjectMap[template] || 'Notificacion de CRM';
  }

  private async logNotification(
    payload: NotificationPayload,
    recipient: NotificationRecipient,
    channel: NotificationChannel,
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped',
    externalId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO notification_logs (
          id, tenant_id, event_type, recipient_id, recipient_email, recipient_phone,
          channel, status, external_id, error_message, entity_type, entity_id,
          payload, sent_at, created_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11,
          $12, $13, NOW()
        )
      `;

      await this.pool.query(query, [
        payload.tenantId,
        payload.eventType,
        recipient.userId,
        recipient.email,
        recipient.phone,
        channel,
        status,
        externalId,
        errorMessage,
        payload.entityType,
        payload.entityId,
        JSON.stringify(payload.data),
        status === 'sent' ? new Date() : null,
      ]);
    } catch (error) {
      console.error('[NotificationOrchestrator] Failed to log notification:', error);
    }
  }

  // ============================================================================
  // Analytics & Reporting
  // ============================================================================

  async getNotificationStats(
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      eventType?: NotificationEventType;
      channel?: NotificationChannel;
    }
  ): Promise<Result<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    byChannel: Record<NotificationChannel, { sent: number; delivered: number; failed: number }>;
    byEvent: Record<string, { sent: number; delivered: number; failed: number }>;
  }>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramCount = 2;

      if (options?.startDate) {
        conditions.push(`created_at >= $${paramCount++}`);
        values.push(options.startDate);
      }
      if (options?.endDate) {
        conditions.push(`created_at <= $${paramCount++}`);
        values.push(options.endDate);
      }
      if (options?.eventType) {
        conditions.push(`event_type = $${paramCount++}`);
        values.push(options.eventType);
      }
      if (options?.channel) {
        conditions.push(`channel = $${paramCount++}`);
        values.push(options.channel);
      }

      const whereClause = conditions.join(' AND ');

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          channel,
          event_type
        FROM notification_logs
        WHERE ${whereClause}
        GROUP BY channel, event_type
      `;

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to get stats');
      }

      const stats = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        byChannel: {
          email: { sent: 0, delivered: 0, failed: 0 },
          sms: { sent: 0, delivered: 0, failed: 0 },
          whatsapp: { sent: 0, delivered: 0, failed: 0 },
          push: { sent: 0, delivered: 0, failed: 0 },
        } as Record<NotificationChannel, { sent: number; delivered: number; failed: number }>,
        byEvent: {} as Record<string, { sent: number; delivered: number; failed: number }>,
      };

      for (const row of result.value.rows) {
        const total = parseInt(row.total as string, 10);
        const sent = parseInt(row.sent as string, 10);
        const delivered = parseInt(row.delivered as string, 10);
        const failed = parseInt(row.failed as string, 10);
        const channel = row.channel as NotificationChannel;
        const eventType = row.event_type as string;

        stats.total += total;
        stats.sent += sent;
        stats.delivered += delivered;
        stats.failed += failed;

        if (stats.byChannel[channel]) {
          stats.byChannel[channel].sent += sent;
          stats.byChannel[channel].delivered += delivered;
          stats.byChannel[channel].failed += failed;
        }

        if (!stats.byEvent[eventType]) {
          stats.byEvent[eventType] = { sent: 0, delivered: 0, failed: 0 };
        }
        stats.byEvent[eventType].sent += sent;
        stats.byEvent[eventType].delivered += delivered;
        stats.byEvent[eventType].failed += failed;
      }

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(`Failed to get notification stats: ${error}`);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let orchestratorInstance: NotificationOrchestrator | null = null;

export function getNotificationOrchestrator(
  pool?: DatabasePool,
  preferencesService?: NotificationPreferencesService
): NotificationOrchestrator {
  if (!orchestratorInstance && pool && preferencesService) {
    orchestratorInstance = new NotificationOrchestrator(pool, preferencesService);
  }
  if (!orchestratorInstance) {
    throw new Error('NotificationOrchestrator not initialized. Provide pool and preferencesService.');
  }
  return orchestratorInstance;
}
