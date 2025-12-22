/**
 * WebSocket Service
 * High-level service for real-time notifications
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { WebSocketServer } from './websocket.server';
import {
  WebSocketMessage,
  WebSocketMessageType,
  ConnectionInfo,
  RealtimeNotification,
  NotificationPriority,
  WebSocketStats,
} from './types';

/**
 * Notification template
 */
interface NotificationTemplate {
  id: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  priority: NotificationPriority;
  actionUrl?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User notification preferences
 */
interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  leadUpdates: boolean;
  taskReminders: boolean;
  dealChanges: boolean;
  teamActivity: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

@injectable()
export class WebSocketService {
  private wsServer: WebSocketServer;

  constructor(private pool: DatabasePool) {
    this.wsServer = new WebSocketServer(pool);
  }

  /**
   * Get WebSocket server instance
   */
  getServer(): WebSocketServer {
    return this.wsServer;
  }

  // ==================== Notifications ====================

  /**
   * Send notification to users
   */
  async sendNotification(
    tenantId: string,
    notification: Omit<RealtimeNotification, 'id'>,
    userIds?: string[]
  ): Promise<Result<void>> {
    const fullNotification: RealtimeNotification = {
      ...notification,
      id: crypto.randomUUID(),
    };

    // Store notification
    await this.storeNotification(tenantId, fullNotification, userIds);

    // Send via WebSocket
    this.wsServer.publishNotification(tenantId, fullNotification, userIds);

    return Result.ok(undefined);
  }

  /**
   * Send notification from template
   */
  async sendFromTemplate(
    tenantId: string,
    templateType: string,
    variables: Record<string, string>,
    userIds?: string[]
  ): Promise<Result<void>> {
    // Get template
    const templateResult = await this.getTemplate(tenantId, templateType);
    if (templateResult.isFailure || !templateResult.value) {
      return Result.fail(templateResult.error || 'Template not found');
    }

    const template = templateResult.value;

    // Replace variables
    let title = template.title;
    let body = template.body;
    let actionUrl = template.actionUrl;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, value);
      body = body.replace(regex, value);
      if (actionUrl) {
        actionUrl = actionUrl.replace(regex, value);
      }
    }

    return this.sendNotification(tenantId, {
      type: template.type,
      title,
      body,
      icon: template.icon,
      priority: template.priority,
      actionUrl,
    }, userIds);
  }

  /**
   * Store notification in database
   */
  private async storeNotification(
    tenantId: string,
    notification: RealtimeNotification,
    userIds?: string[]
  ): Promise<void> {
    if (userIds && userIds.length > 0) {
      // Store for specific users using existing notifications table
      for (const userId of userIds) {
        await this.pool.query(`
          INSERT INTO notifications (
            id, tenant_id, recipient_user_id, type, title, body, priority, action_url, data, channel, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'in_app', 'delivered')
        `, [
          notification.id,
          tenantId,
          userId,
          notification.type,
          notification.title,
          notification.body,
          notification.priority,
          notification.actionUrl || null,
          JSON.stringify(notification.data || {}),
        ]);
      }
    } else {
      // Store as broadcast
      await this.pool.query(`
        INSERT INTO realtime_broadcasts (
          id, tenant_id, type, title, body, icon, priority, action_url, data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        notification.id,
        tenantId,
        notification.type,
        notification.title,
        notification.body,
        notification.icon || null,
        notification.priority,
        notification.actionUrl || null,
        JSON.stringify(notification.data || {}),
      ]);
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    tenantId: string,
    userId: string,
    unreadOnly = false,
    limit = 50
  ): Promise<Result<Array<RealtimeNotification & { read: boolean; readAt?: Date }>>> {
    let query = `
      SELECT * FROM notifications
      WHERE tenant_id = $1 AND user_id = $2
    `;
    const values: unknown[] = [tenantId, userId];

    if (unreadOnly) {
      query += ` AND read_at IS NULL`;
    }

    query += ` ORDER BY created_at DESC LIMIT $3`;
    values.push(limit);

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to get notifications');
    }

    const notifications = result.value.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      type: row.type as string,
      title: row.title as string,
      body: row.body as string,
      icon: row.icon as string | undefined,
      priority: row.priority as NotificationPriority,
      actionUrl: row.action_url as string | undefined,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      read: !!row.read_at,
      readAt: row.read_at ? new Date(row.read_at as string) : undefined,
    }));

    return Result.ok(notifications);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(
    tenantId: string,
    userId: string,
    notificationId: string
  ): Promise<Result<void>> {
    await this.pool.query(`
      UPDATE notifications
      SET read_at = NOW()
      WHERE tenant_id = $1 AND user_id = $2 AND id = $3
    `, [tenantId, userId, notificationId]);

    return Result.ok(undefined);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(tenantId: string, userId: string): Promise<Result<number>> {
    const result = await this.pool.query(`
      UPDATE notifications
      SET read_at = NOW()
      WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL
    `, [tenantId, userId]);

    const count = result.isSuccess ? (result.value?.rowCount || 0) : 0;
    return Result.ok(count);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(tenantId: string, userId: string): Promise<Result<number>> {
    const result = await this.pool.query(`
      SELECT COUNT(*) FROM notifications
      WHERE tenant_id = $1 AND user_id = $2 AND read_at IS NULL
    `, [tenantId, userId]);

    const count = result.isSuccess && result.value?.rows?.[0]
      ? parseInt(result.value.rows[0].count as string, 10)
      : 0;

    return Result.ok(count);
  }

  // ==================== Templates ====================

  /**
   * Get notification template
   */
  async getTemplate(
    tenantId: string,
    type: string
  ): Promise<Result<NotificationTemplate>> {
    const result = await this.pool.query(`
      SELECT * FROM notification_templates
      WHERE tenant_id = $1 AND type = $2 AND is_active = true
    `, [tenantId, type]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Template not found');
    }

    const row = result.value.rows[0];
    return Result.ok({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as string,
      title: row.title as string,
      body: row.body as string,
      icon: row.icon as string | undefined,
      priority: row.priority as NotificationPriority,
      actionUrl: row.action_url as string | undefined,
      variables: typeof row.variables === 'string' ? JSON.parse(row.variables) : row.variables || [],
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    });
  }

  /**
   * Create notification template
   */
  async createTemplate(
    tenantId: string,
    template: Omit<NotificationTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<NotificationTemplate>> {
    const result = await this.pool.query(`
      INSERT INTO notification_templates (
        tenant_id, type, title, body, icon, priority, action_url, variables, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      tenantId,
      template.type,
      template.title,
      template.body,
      template.icon || null,
      template.priority,
      template.actionUrl || null,
      JSON.stringify(template.variables || []),
      template.isActive ?? true,
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to create template');
    }

    return this.getTemplate(tenantId, template.type);
  }

  // ==================== Preferences ====================

  /**
   * Get user preferences
   */
  async getPreferences(
    tenantId: string,
    userId: string
  ): Promise<Result<NotificationPreferences>> {
    const result = await this.pool.query(`
      SELECT * FROM notification_preferences
      WHERE tenant_id = $1 AND user_id = $2
    `, [tenantId, userId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      // Return defaults
      return Result.ok({
        userId,
        email: true,
        push: true,
        inApp: true,
        leadUpdates: true,
        taskReminders: true,
        dealChanges: true,
        teamActivity: true,
        timezone: 'UTC',
      });
    }

    const row = result.value.rows[0];
    return Result.ok({
      userId: row.user_id as string,
      email: row.email as boolean,
      push: row.push as boolean,
      inApp: row.in_app as boolean,
      leadUpdates: row.lead_updates as boolean,
      taskReminders: row.task_reminders as boolean,
      dealChanges: row.deal_changes as boolean,
      teamActivity: row.team_activity as boolean,
      quietHoursStart: row.quiet_hours_start as string | undefined,
      quietHoursEnd: row.quiet_hours_end as string | undefined,
      timezone: row.timezone as string,
    });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    tenantId: string,
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<Result<NotificationPreferences>> {
    await this.pool.query(`
      INSERT INTO notification_preferences (
        tenant_id, user_id, email, push, in_app,
        lead_updates, task_reminders, deal_changes, team_activity,
        quiet_hours_start, quiet_hours_end, timezone
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (tenant_id, user_id) DO UPDATE SET
        email = COALESCE($3, notification_preferences.email),
        push = COALESCE($4, notification_preferences.push),
        in_app = COALESCE($5, notification_preferences.in_app),
        lead_updates = COALESCE($6, notification_preferences.lead_updates),
        task_reminders = COALESCE($7, notification_preferences.task_reminders),
        deal_changes = COALESCE($8, notification_preferences.deal_changes),
        team_activity = COALESCE($9, notification_preferences.team_activity),
        quiet_hours_start = COALESCE($10, notification_preferences.quiet_hours_start),
        quiet_hours_end = COALESCE($11, notification_preferences.quiet_hours_end),
        timezone = COALESCE($12, notification_preferences.timezone),
        updated_at = NOW()
    `, [
      tenantId,
      userId,
      preferences.email,
      preferences.push,
      preferences.inApp,
      preferences.leadUpdates,
      preferences.taskReminders,
      preferences.dealChanges,
      preferences.teamActivity,
      preferences.quietHoursStart,
      preferences.quietHoursEnd,
      preferences.timezone,
    ]);

    return this.getPreferences(tenantId, userId);
  }

  // ==================== Event Publishing ====================

  /**
   * Publish lead event
   */
  publishLeadEvent(
    tenantId: string,
    type: WebSocketMessageType,
    lead: Record<string, unknown>,
    userId?: string
  ): void {
    this.wsServer.publishLeadEvent(tenantId, type, lead, userId);
  }

  /**
   * Publish task event
   */
  publishTaskEvent(
    tenantId: string,
    type: WebSocketMessageType,
    task: Record<string, unknown>,
    userId?: string
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload: task,
      timestamp: new Date(),
    };

    this.wsServer.broadcast(
      { tenantId, subscriptionType: 'task', entityId: task.id as string },
      message
    );
  }

  /**
   * Publish opportunity event
   */
  publishOpportunityEvent(
    tenantId: string,
    type: WebSocketMessageType,
    opportunity: Record<string, unknown>,
    userId?: string
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload: opportunity,
      timestamp: new Date(),
    };

    this.wsServer.broadcast(
      { tenantId, subscriptionType: 'opportunity', entityId: opportunity.id as string },
      message
    );
  }

  /**
   * Publish quote event
   */
  publishQuoteEvent(
    tenantId: string,
    type: WebSocketMessageType,
    quote: Record<string, unknown>,
    userId?: string
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload: quote,
      timestamp: new Date(),
    };

    this.wsServer.broadcast(
      { tenantId, subscriptionType: 'quote', entityId: quote.id as string },
      message
    );
  }

  /**
   * Publish communication event
   */
  publishCommunicationEvent(
    tenantId: string,
    type: WebSocketMessageType,
    communication: Record<string, unknown>,
    userId?: string
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload: communication,
      timestamp: new Date(),
    };

    this.wsServer.broadcastToTenant(tenantId, message);
  }

  // ==================== Online Status ====================

  /**
   * Get online users
   */
  getOnlineUsers(tenantId: string): ConnectionInfo[] {
    return this.wsServer.getConnections(tenantId);
  }

  /**
   * Check if user is online
   */
  isUserOnline(tenantId: string, userId: string): boolean {
    const connections = this.wsServer.getConnections(tenantId);
    return connections.some((c) => c.userId === userId);
  }

  // ==================== Stats ====================

  /**
   * Get WebSocket stats
   */
  getStats(): WebSocketStats {
    return this.wsServer.getStats();
  }
}
