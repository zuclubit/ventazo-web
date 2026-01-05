/**
 * Notification Preferences System
 * Manages user/tenant notification preferences for SMS/WhatsApp/Email channels
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export type NotificationEventType =
  // Lead Events
  | 'lead.created'
  | 'lead.assigned'
  | 'lead.qualified'
  | 'lead.converted'
  | 'lead.status_changed'
  | 'lead.follow_up_scheduled'
  | 'lead.follow_up_due'
  | 'lead.follow_up_overdue'
  // Task Events
  | 'task.assigned'
  | 'task.due_soon'
  | 'task.overdue'
  | 'task.completed'
  // Opportunity Events
  | 'opportunity.created'
  | 'opportunity.stage_changed'
  | 'opportunity.won'
  | 'opportunity.lost'
  | 'opportunity.overdue'
  // Contract Events
  | 'contract.created'
  | 'contract.status_changed'
  | 'contract.expiring_soon'
  | 'contract.expired'
  | 'contract.approval_required'
  | 'contract.signature_required'
  | 'contract.signed'
  // Quote Events
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'quote.expiring_soon'
  // Payment Events
  | 'payment.received'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.reminder'
  | 'payment.overdue'
  // Customer Events
  | 'customer.created'
  | 'customer.onboarding_started'
  | 'customer.health_score_changed'
  // Workflow Events
  | 'workflow.triggered'
  | 'workflow.completed'
  | 'drip.enrolled'
  | 'drip.completed'
  // Comment/Mention Events
  | 'comment.mention'
  | 'comment.group_mention';

export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId?: string; // null = tenant default
  eventType: NotificationEventType;
  channels: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  // Quiet hours (no notifications during this window)
  quietHours?: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
    timezone: string;
  };
  // Batching preferences
  batching?: {
    enabled: boolean;
    intervalMinutes: number; // Batch notifications every X minutes
    maxBatchSize: number;
  };
  // Priority override (always notify for urgent regardless of quiet hours)
  priorityOverride: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationSettings {
  userId: string;
  tenantId: string;
  // Global settings
  globalEnabled: boolean;
  preferredChannel: NotificationChannel;
  // Contact info
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  // Quiet hours
  quietHours: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    timezone: string;
    weekendOnly: boolean;
  };
  // Per-event preferences
  eventPreferences: Map<NotificationEventType, NotificationPreference>;
  // Language preference
  language: 'es' | 'en' | 'pt';
  createdAt: Date;
  updatedAt: Date;
}

// Default notification configuration by event type
export const DEFAULT_NOTIFICATION_CONFIG: Record<NotificationEventType, {
  defaultChannels: NotificationChannel[];
  priority: NotificationPriority;
  allowBatching: boolean;
  recipientRoles: string[];
}> = {
  // Lead Events
  'lead.created': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },
  'lead.assigned': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['assignee', 'previous_owner'],
  },
  'lead.qualified': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },
  'lead.converted': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager', 'finance'],
  },
  'lead.status_changed': {
    defaultChannels: ['email', 'sms'],
    priority: 'medium',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'lead.follow_up_scheduled': {
    defaultChannels: ['email', 'sms'],
    priority: 'medium',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'lead.follow_up_due': {
    defaultChannels: ['sms', 'whatsapp'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner'],
  },
  'lead.follow_up_overdue': {
    defaultChannels: ['sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },

  // Task Events
  'task.assigned': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['assignee'],
  },
  'task.due_soon': {
    defaultChannels: ['sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['assignee'],
  },
  'task.overdue': {
    defaultChannels: ['sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['assignee', 'manager'],
  },
  'task.completed': {
    defaultChannels: ['email'],
    priority: 'low',
    allowBatching: true,
    recipientRoles: ['manager'],
  },

  // Opportunity Events
  'opportunity.created': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },
  'opportunity.stage_changed': {
    defaultChannels: ['email'],
    priority: 'medium',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'opportunity.won': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager', 'team', 'finance'],
  },
  'opportunity.lost': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },
  'opportunity.overdue': {
    defaultChannels: ['sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },

  // Contract Events
  'contract.created': {
    defaultChannels: ['email'],
    priority: 'medium',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'contract.status_changed': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'customer'],
  },
  'contract.expiring_soon': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'customer', 'manager'],
  },
  'contract.expired': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'customer', 'manager'],
  },
  'contract.approval_required': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['approver'],
  },
  'contract.signature_required': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['signatory'],
  },
  'contract.signed': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'customer'],
  },

  // Quote Events
  'quote.created': {
    defaultChannels: ['email'],
    priority: 'low',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'quote.sent': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['customer'],
  },
  'quote.accepted': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['owner', 'manager', 'finance'],
  },
  'quote.rejected': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'manager'],
  },
  'quote.expiring_soon': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['owner', 'customer'],
  },

  // Payment Events
  'payment.received': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['customer', 'finance'],
  },
  'payment.failed': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['customer', 'account_manager'],
  },
  'payment.refunded': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['customer'],
  },
  'payment.reminder': {
    defaultChannels: ['email', 'sms'],
    priority: 'medium',
    allowBatching: false,
    recipientRoles: ['customer'],
  },
  'payment.overdue': {
    defaultChannels: ['email', 'sms', 'whatsapp'],
    priority: 'urgent',
    allowBatching: false,
    recipientRoles: ['customer', 'account_manager', 'finance'],
  },

  // Customer Events
  'customer.created': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['customer', 'account_manager'],
  },
  'customer.onboarding_started': {
    defaultChannels: ['email', 'whatsapp'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['customer', 'account_manager'],
  },
  'customer.health_score_changed': {
    defaultChannels: ['email', 'sms'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['account_manager', 'manager'],
  },

  // Workflow Events
  'workflow.triggered': {
    defaultChannels: ['email'],
    priority: 'low',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'workflow.completed': {
    defaultChannels: ['email'],
    priority: 'low',
    allowBatching: true,
    recipientRoles: ['owner'],
  },
  'drip.enrolled': {
    defaultChannels: ['email'],
    priority: 'low',
    allowBatching: true,
    recipientRoles: ['customer'],
  },
  'drip.completed': {
    defaultChannels: ['email', 'sms'],
    priority: 'medium',
    allowBatching: false,
    recipientRoles: ['owner'],
  },

  // Comment/Mention Events
  'comment.mention': {
    defaultChannels: ['email', 'push'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['mentioned_user'],
  },
  'comment.group_mention': {
    defaultChannels: ['email', 'push'],
    priority: 'high',
    allowBatching: false,
    recipientRoles: ['group_members'],
  },
};

// ============================================================================
// Notification Preferences Service
// ============================================================================

@injectable()
export class NotificationPreferencesService {
  constructor(@inject('DatabasePool') private pool: DatabasePool) {}

  /**
   * Get user notification settings with fallback to tenant defaults
   */
  async getUserSettings(
    tenantId: string,
    userId: string
  ): Promise<Result<UserNotificationSettings>> {
    try {
      const query = `
        SELECT * FROM notification_settings
        WHERE tenant_id = $1 AND (user_id = $2 OR user_id IS NULL)
        ORDER BY user_id NULLS LAST
        LIMIT 1
      `;
      const result = await this.pool.query(query, [tenantId, userId]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        // Return default settings
        return Result.ok(this.getDefaultUserSettings(tenantId, userId));
      }

      return Result.ok(this.mapRowToSettings(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get user settings: ${error}`);
    }
  }

  /**
   * Update user notification settings
   */
  async updateUserSettings(
    tenantId: string,
    userId: string,
    updates: Partial<UserNotificationSettings>
  ): Promise<Result<UserNotificationSettings>> {
    try {
      const query = `
        INSERT INTO notification_settings (
          id, tenant_id, user_id, global_enabled, preferred_channel,
          phone, whatsapp_number, email, quiet_hours, language,
          created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9,
          NOW(), NOW()
        )
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET
          global_enabled = COALESCE($3, notification_settings.global_enabled),
          preferred_channel = COALESCE($4, notification_settings.preferred_channel),
          phone = COALESCE($5, notification_settings.phone),
          whatsapp_number = COALESCE($6, notification_settings.whatsapp_number),
          email = COALESCE($7, notification_settings.email),
          quiet_hours = COALESCE($8, notification_settings.quiet_hours),
          language = COALESCE($9, notification_settings.language),
          updated_at = NOW()
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        tenantId,
        userId,
        updates.globalEnabled ?? true,
        updates.preferredChannel ?? 'email',
        updates.phone,
        updates.whatsappNumber,
        updates.email,
        JSON.stringify(updates.quietHours || {}),
        updates.language ?? 'es',
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to update settings');
      }

      return Result.ok(this.mapRowToSettings(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update settings: ${error}`);
    }
  }

  /**
   * Get event preference for a specific user/event combination
   */
  async getEventPreference(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType
  ): Promise<Result<NotificationPreference>> {
    try {
      const query = `
        SELECT * FROM notification_preferences
        WHERE tenant_id = $1
          AND (user_id = $2 OR user_id IS NULL)
          AND event_type = $3
        ORDER BY user_id NULLS LAST
        LIMIT 1
      `;
      const result = await this.pool.query(query, [tenantId, userId, eventType]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        // Return default preference for this event
        return Result.ok(this.getDefaultEventPreference(tenantId, userId, eventType));
      }

      return Result.ok(this.mapRowToPreference(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get event preference: ${error}`);
    }
  }

  /**
   * Update event preference
   */
  async updateEventPreference(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType,
    channels: { email?: boolean; sms?: boolean; whatsapp?: boolean; push?: boolean }
  ): Promise<Result<NotificationPreference>> {
    try {
      const query = `
        INSERT INTO notification_preferences (
          id, tenant_id, user_id, event_type, channels,
          priority_override, created_at, updated_at
        )
        VALUES (
          gen_random_uuid(), $1, $2, $3, $4, false, NOW(), NOW()
        )
        ON CONFLICT (tenant_id, user_id, event_type)
        DO UPDATE SET
          channels = $4,
          updated_at = NOW()
        RETURNING *
      `;

      const defaultConfig = DEFAULT_NOTIFICATION_CONFIG[eventType];
      const channelsJson = JSON.stringify({
        email: channels.email ?? defaultConfig.defaultChannels.includes('email'),
        sms: channels.sms ?? defaultConfig.defaultChannels.includes('sms'),
        whatsapp: channels.whatsapp ?? defaultConfig.defaultChannels.includes('whatsapp'),
        push: channels.push ?? defaultConfig.defaultChannels.includes('push'),
      });

      const result = await this.pool.query(query, [
        tenantId,
        userId,
        eventType,
        channelsJson,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to update preference');
      }

      return Result.ok(this.mapRowToPreference(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update preference: ${error}`);
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  async shouldNotify(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType,
    channel: NotificationChannel
  ): Promise<boolean> {
    // Get user settings
    const settingsResult = await this.getUserSettings(tenantId, userId);
    if (settingsResult.isFailure || !settingsResult.value?.globalEnabled) {
      return false;
    }

    const settings = settingsResult.value;

    // Check quiet hours
    if (settings.quietHours.enabled) {
      const now = new Date();
      const hour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;

      if (settings.quietHours.weekendOnly && !isWeekend) {
        // Don't check quiet hours on weekdays if weekendOnly is true
      } else if (
        hour >= settings.quietHours.startHour ||
        hour < settings.quietHours.endHour
      ) {
        // In quiet hours, only send urgent notifications
        const config = DEFAULT_NOTIFICATION_CONFIG[eventType];
        if (config.priority !== 'urgent') {
          return false;
        }
      }
    }

    // Get event preference
    const prefResult = await this.getEventPreference(tenantId, userId, eventType);
    if (prefResult.isFailure) {
      return false;
    }

    const pref = prefResult.value;
    return pref.channels[channel] ?? false;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getDefaultUserSettings(tenantId: string, userId: string): UserNotificationSettings {
    return {
      userId,
      tenantId,
      globalEnabled: true,
      preferredChannel: 'email',
      quietHours: {
        enabled: false,
        startHour: 22,
        endHour: 8,
        timezone: 'America/Mexico_City',
        weekendOnly: false,
      },
      eventPreferences: new Map(),
      language: 'es',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultEventPreference(
    tenantId: string,
    userId: string,
    eventType: NotificationEventType
  ): NotificationPreference {
    const config = DEFAULT_NOTIFICATION_CONFIG[eventType];
    return {
      id: '',
      tenantId,
      userId,
      eventType,
      channels: {
        email: config.defaultChannels.includes('email'),
        sms: config.defaultChannels.includes('sms'),
        whatsapp: config.defaultChannels.includes('whatsapp'),
        push: config.defaultChannels.includes('push'),
      },
      priorityOverride: config.priority === 'urgent',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private mapRowToSettings(row: Record<string, unknown>): UserNotificationSettings {
    return {
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      globalEnabled: row.global_enabled as boolean,
      preferredChannel: row.preferred_channel as NotificationChannel,
      phone: row.phone as string | undefined,
      whatsappNumber: row.whatsapp_number as string | undefined,
      email: row.email as string | undefined,
      quietHours: typeof row.quiet_hours === 'string'
        ? JSON.parse(row.quiet_hours)
        : row.quiet_hours as UserNotificationSettings['quietHours'],
      eventPreferences: new Map(),
      language: (row.language as 'es' | 'en' | 'pt') || 'es',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToPreference(row: Record<string, unknown>): NotificationPreference {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string | undefined,
      eventType: row.event_type as NotificationEventType,
      channels: typeof row.channels === 'string'
        ? JSON.parse(row.channels)
        : row.channels as NotificationPreference['channels'],
      quietHours: row.quiet_hours
        ? (typeof row.quiet_hours === 'string'
          ? JSON.parse(row.quiet_hours)
          : row.quiet_hours as NotificationPreference['quietHours'])
        : undefined,
      batching: row.batching
        ? (typeof row.batching === 'string'
          ? JSON.parse(row.batching)
          : row.batching as NotificationPreference['batching'])
        : undefined,
      priorityOverride: row.priority_override as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
