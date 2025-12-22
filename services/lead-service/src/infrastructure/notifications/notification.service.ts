/**
 * Notification Service Implementation
 * Handles multi-channel notification delivery
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Notification,
  CreateNotificationInput,
  INotificationService,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';

/**
 * Default notification templates
 */
const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; body: string }> = {
  [NotificationType.LEAD_CREATED]: {
    title: 'New Lead Created',
    body: 'A new lead "{{companyName}}" has been created.',
  },
  [NotificationType.LEAD_ASSIGNED]: {
    title: 'Lead Assigned to You',
    body: 'Lead "{{companyName}}" has been assigned to you.',
  },
  [NotificationType.LEAD_QUALIFIED]: {
    title: 'Lead Qualified',
    body: 'Lead "{{companyName}}" has been qualified with score {{score}}.',
  },
  [NotificationType.LEAD_STATUS_CHANGED]: {
    title: 'Lead Status Changed',
    body: 'Lead "{{companyName}}" status changed from {{oldStatus}} to {{newStatus}}.',
  },
  [NotificationType.LEAD_CONVERTED]: {
    title: 'Lead Converted!',
    body: 'Lead "{{companyName}}" has been converted to a customer.',
  },
  [NotificationType.LEAD_LOST]: {
    title: 'Lead Lost',
    body: 'Lead "{{companyName}}" has been marked as lost.',
  },
  [NotificationType.FOLLOW_UP_SCHEDULED]: {
    title: 'Follow-up Scheduled',
    body: 'A follow-up has been scheduled for lead "{{companyName}}" on {{date}}.',
  },
  [NotificationType.FOLLOW_UP_DUE]: {
    title: 'Follow-up Due Today',
    body: 'Your follow-up with "{{companyName}}" is due today.',
  },
  [NotificationType.FOLLOW_UP_OVERDUE]: {
    title: 'Overdue Follow-up',
    body: 'Your follow-up with "{{companyName}}" is overdue.',
  },
  [NotificationType.LEAD_SCORE_INCREASED]: {
    title: 'Lead Score Increased',
    body: 'Lead "{{companyName}}" score increased to {{score}}.',
  },
  [NotificationType.LEAD_SCORE_DECREASED]: {
    title: 'Lead Score Decreased',
    body: 'Lead "{{companyName}}" score decreased to {{score}}.',
  },
  [NotificationType.LEAD_REACHED_THRESHOLD]: {
    title: 'Lead Ready for Qualification',
    body: 'Lead "{{companyName}}" has reached the qualification threshold.',
  },
  [NotificationType.DAILY_SUMMARY]: {
    title: 'Daily Summary',
    body: 'Your daily summary: {{newLeads}} new leads, {{followUps}} pending follow-ups.',
  },
  [NotificationType.WEEKLY_REPORT]: {
    title: 'Weekly Report',
    body: 'Your weekly report is ready. {{conversions}} conversions this week.',
  },
};

/**
 * Map notification types to email templates
 */
const NOTIFICATION_TO_EMAIL_TEMPLATE: Partial<Record<NotificationType, EmailTemplate>> = {
  [NotificationType.LEAD_CREATED]: EmailTemplate.LEAD_WELCOME,
  [NotificationType.LEAD_ASSIGNED]: EmailTemplate.LEAD_ASSIGNED,
  [NotificationType.LEAD_QUALIFIED]: EmailTemplate.LEAD_QUALIFIED,
  [NotificationType.LEAD_CONVERTED]: EmailTemplate.LEAD_CONVERTED,
  [NotificationType.LEAD_LOST]: EmailTemplate.LEAD_LOST,
  [NotificationType.FOLLOW_UP_DUE]: EmailTemplate.LEAD_FOLLOW_UP_REMINDER,
  [NotificationType.FOLLOW_UP_OVERDUE]: EmailTemplate.LEAD_OVERDUE_ALERT,
  [NotificationType.DAILY_SUMMARY]: EmailTemplate.USER_DAILY_DIGEST,
  [NotificationType.WEEKLY_REPORT]: EmailTemplate.USER_WEEKLY_REPORT,
};

/**
 * Notification Service
 * Manages notification creation, storage, and delivery
 */
@injectable()
export class NotificationService implements INotificationService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {
    this.initializeEmailProvider();
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
        console.log('[NotificationService] Email provider initialized');
      }
    }
  }

  /**
   * Send a notification
   */
  async send(input: CreateNotificationInput): Promise<void> {
    const channels = input.channels || [NotificationChannel.IN_APP];

    for (const channel of channels) {
      await this.createNotification(input, channel);
    }
  }

  /**
   * Send multiple notifications in batch
   */
  async sendBatch(inputs: CreateNotificationInput[]): Promise<void> {
    for (const input of inputs) {
      await this.send(input);
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const sql = `
      UPDATE notifications
      SET status = $1, read_at = NOW(), updated_at = NOW()
      WHERE id = $2 AND recipient_user_id = $3 AND status != $1
    `;

    await this.pool.query(sql, [NotificationStatus.READ, notificationId, userId]);
  }

  /**
   * Get unread notifications for a user
   */
  async getUnread(userId: string, tenantId: string): Promise<Notification[]> {
    const sql = `
      SELECT * FROM notifications
      WHERE recipient_user_id = $1 AND tenant_id = $2 AND status NOT IN ($3, $4)
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await this.pool.query(sql, [
      userId,
      tenantId,
      NotificationStatus.READ,
      NotificationStatus.FAILED,
    ]);

    if (result.isFailure) {
      return [];
    }

    return result.getValue().rows.map(this.mapRowToNotification);
  }

  /**
   * Get notifications for a user
   */
  async getByUser(userId: string, tenantId: string, limit = 20): Promise<Notification[]> {
    const sql = `
      SELECT * FROM notifications
      WHERE recipient_user_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;

    const result = await this.pool.query(sql, [userId, tenantId, limit]);

    if (result.isFailure) {
      return [];
    }

    return result.getValue().rows.map(this.mapRowToNotification);
  }

  /**
   * Create and store a notification
   */
  private async createNotification(
    input: CreateNotificationInput,
    channel: NotificationChannel
  ): Promise<Result<Notification>> {
    const id = uuidv4();
    const now = new Date();

    // Get template and interpolate
    const template = NOTIFICATION_TEMPLATES[input.type] || {
      title: input.content.title,
      body: input.content.body,
    };

    const content = {
      title: this.interpolate(input.content.title || template.title, input.metadata || {}),
      body: this.interpolate(input.content.body || template.body, input.metadata || {}),
      data: input.content.data,
      actionUrl: input.content.actionUrl,
      imageUrl: input.content.imageUrl,
    };

    const sql = `
      INSERT INTO notifications (
        id, tenant_id, type, priority, recipient_user_id,
        channel, status, title, body, data, action_url,
        metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *
    `;

    const values = [
      id,
      input.tenantId,
      input.type,
      input.priority || NotificationPriority.MEDIUM,
      input.recipientUserId,
      channel,
      NotificationStatus.PENDING,
      content.title,
      content.body,
      JSON.stringify(content.data || {}),
      content.actionUrl || null,
      JSON.stringify(input.metadata || {}),
      now,
      now,
    ];

    const result = await this.pool.query(sql, values);

    if (result.isFailure) {
      return Result.fail(`Failed to create notification: ${result.error}`);
    }

    const notification = this.mapRowToNotification(result.getValue().rows[0]);

    // Dispatch to appropriate channel provider
    if (channel === NotificationChannel.IN_APP) {
      await this.markAsSent(id);
    } else if (channel === NotificationChannel.EMAIL) {
      await this.sendEmailNotification(id, notification, input);
    }
    // TODO: Implement PUSH and SMS channels

    return Result.ok(notification);
  }

  /**
   * Mark notification as sent
   */
  private async markAsSent(notificationId: string): Promise<void> {
    const sql = `
      UPDATE notifications
      SET status = $1, sent_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(sql, [NotificationStatus.SENT, notificationId]);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notificationId: string,
    notification: Notification,
    input: CreateNotificationInput
  ): Promise<void> {
    if (!this.emailProvider) {
      await this.markAsFailed(notificationId, 'Email provider not initialized');
      return;
    }

    // Get recipient email from metadata or input
    const recipientEmail = input.metadata?.email as string;
    if (!recipientEmail) {
      await this.markAsFailed(notificationId, 'No recipient email provided');
      return;
    }

    try {
      const appConfig = getAppConfig();
      const emailTemplate = NOTIFICATION_TO_EMAIL_TEMPLATE[input.type];

      const emailResult = await this.emailProvider.send({
        to: recipientEmail,
        subject: notification.content.title,
        template: emailTemplate,
        html: emailTemplate ? undefined : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>${notification.content.title}</h2>
            <p>${notification.content.body}</p>
            ${notification.content.actionUrl ? `<a href="${appConfig.appUrl}${notification.content.actionUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px;">Ver Detalles</a>` : ''}
          </div>
        `,
        variables: {
          userName: input.metadata?.userName as string || 'Usuario',
          companyName: input.metadata?.companyName as string || '',
          contactName: input.metadata?.contactName as string || '',
          contactEmail: input.metadata?.contactEmail as string || '',
          leadScore: input.metadata?.score as number || 0,
          leadStatus: input.metadata?.newStatus as string || '',
          followUpDate: input.metadata?.date as string || '',
          actionUrl: notification.content.actionUrl ? `${appConfig.appUrl}${notification.content.actionUrl}` : appConfig.appUrl,
          ...input.metadata,
        },
        tags: [
          { name: 'type', value: `notification-${input.type}` },
          { name: 'notificationId', value: notificationId },
        ],
      });

      if (emailResult.isSuccess) {
        await this.markAsSent(notificationId);
        console.log(`[NotificationService] Email notification sent: ${notificationId}`);
      } else {
        await this.markAsFailed(notificationId, emailResult.error || 'Unknown error');
        console.error(`[NotificationService] Email notification failed: ${notificationId}`, emailResult.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markAsFailed(notificationId, errorMessage);
      console.error(`[NotificationService] Email notification error: ${notificationId}`, error);
    }
  }

  /**
   * Mark notification as failed
   */
  private async markAsFailed(notificationId: string, reason: string): Promise<void> {
    const sql = `
      UPDATE notifications
      SET status = $1, failed_at = NOW(), failure_reason = $2, updated_at = NOW()
      WHERE id = $3
    `;

    await this.pool.query(sql, [NotificationStatus.FAILED, reason, notificationId]);
  }

  /**
   * Interpolate template variables
   */
  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return String(data[key] ?? '');
    });
  }

  /**
   * Map database row to Notification
   */
  private mapRowToNotification(row: Record<string, unknown>): Notification {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as NotificationType,
      priority: row.priority as NotificationPriority,
      recipient: {
        userId: row.recipient_user_id as string,
        channels: [row.channel as NotificationChannel],
      },
      content: {
        title: row.title as string,
        body: row.body as string,
        data: row.data as Record<string, unknown>,
        actionUrl: row.action_url as string | undefined,
      },
      channel: row.channel as NotificationChannel,
      status: row.status as NotificationStatus,
      metadata: row.metadata as Record<string, unknown>,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at as string) : undefined,
      readAt: row.read_at ? new Date(row.read_at as string) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at as string) : undefined,
      failureReason: row.failure_reason as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

/**
 * Helper function to create notification for lead events
 */
export function createLeadNotification(
  type: NotificationType,
  tenantId: string,
  recipientUserId: string,
  leadData: {
    leadId: string;
    companyName: string;
    score?: number;
    oldStatus?: string;
    newStatus?: string;
    date?: string;
  }
): CreateNotificationInput {
  return {
    tenantId,
    type,
    recipientUserId,
    channels: [NotificationChannel.IN_APP],
    content: {
      title: '',
      body: '',
      data: { leadId: leadData.leadId },
      actionUrl: `/leads/${leadData.leadId}`,
    },
    metadata: {
      companyName: leadData.companyName,
      score: leadData.score,
      oldStatus: leadData.oldStatus,
      newStatus: leadData.newStatus,
      date: leadData.date,
    },
  };
}
