/**
 * Notification Routes
 * API endpoints for notification management
 *
 * @module presentation/routes/notification.routes
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import { getTenantId, getUserId } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import { HttpError } from '../middlewares/error-handler.middleware';
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
  notificationPreferencesSchema,
  type ListNotificationsQuery,
  type NotificationIdParams,
  type UpdateNotificationPreferences,
  type NotificationResponse,
  type NotificationStatsResponse,
  type NotificationPreferencesResponse,
  NOTIFICATION_TYPES,
} from '../schemas/notification.schema';
import { DatabasePool } from '../../infrastructure/database/pool';

// ============================================
// Type Definitions
// ============================================

interface NotificationRow {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read: boolean;
  read_at?: Date;
  action_url?: string;
  created_at: Date;
}

interface PreferencesRow {
  id: string;
  user_id: string;
  tenant_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  internal_enabled: boolean;
  push_enabled: boolean;
  email_address?: string;
  digest_enabled: boolean;
  digest_frequency: string;
  digest_time?: string;
  digest_day?: number;
  type_preferences: Record<string, unknown>;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Notification Type Mapping
// ============================================

/**
 * Maps backend notification types to frontend-expected types
 */
function mapNotificationType(backendType: string): string {
  const typeMap: Record<string, string> = {
    'lead.created': 'lead',
    'lead.assigned': 'lead',
    'lead.qualified': 'lead',
    'lead.status_changed': 'lead',
    'lead.converted': 'success',
    'lead.lost': 'warning',
    'follow_up.scheduled': 'reminder',
    'follow_up.due': 'reminder',
    'follow_up.overdue': 'warning',
    'lead.score_increased': 'info',
    'lead.score_decreased': 'warning',
    'lead.reached_threshold': 'success',
    'system.daily_summary': 'system',
    'system.weekly_report': 'system',
  };

  return typeMap[backendType] || 'info';
}

/**
 * Extracts related entity info from notification metadata
 */
function extractRelatedEntity(
  type: string,
  metadata?: Record<string, unknown>
): { relatedType?: string; relatedId?: string } {
  if (!metadata) return {};

  // Lead-related notifications
  if (type.startsWith('lead.') || type.startsWith('follow_up.')) {
    return {
      relatedType: 'lead',
      relatedId: metadata.leadId as string | undefined,
    };
  }

  // Task notifications
  if (type.startsWith('task.')) {
    return {
      relatedType: 'task',
      relatedId: metadata.taskId as string | undefined,
    };
  }

  // Workflow notifications
  if (type.startsWith('workflow.')) {
    return {
      relatedType: 'workflow',
      relatedId: metadata.workflowId as string | undefined,
    };
  }

  return {};
}

/**
 * Maps database row to frontend notification response
 */
function mapRowToNotificationResponse(row: NotificationRow): NotificationResponse {
  const frontendType = mapNotificationType(row.type);
  const { relatedType, relatedId } = extractRelatedEntity(row.type, row.data);

  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: frontendType as (typeof NOTIFICATION_TYPES)[number],
    relatedType: relatedType as NotificationResponse['relatedType'],
    relatedId,
    actionUrl: row.action_url,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Maps database row to preferences response
 */
function mapRowToPreferencesResponse(row: PreferencesRow): NotificationPreferencesResponse {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    emailEnabled: row.email_enabled,
    smsEnabled: row.sms_enabled,
    whatsappEnabled: row.whatsapp_enabled,
    internalEnabled: row.internal_enabled,
    pushEnabled: row.push_enabled,
    emailAddress: row.email_address,
    digestEnabled: row.digest_enabled,
    digestFrequency: row.digest_frequency as 'daily' | 'weekly' | 'never',
    digestTime: row.digest_time,
    digestDay: row.digest_day,
    typePreferences: row.type_preferences as NotificationPreferencesResponse['typePreferences'],
    quietHoursEnabled: row.quiet_hours_enabled,
    quietHoursStart: row.quiet_hours_start,
    quietHoursEnd: row.quiet_hours_end,
    quietHoursTimezone: row.quiet_hours_timezone,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ============================================
// Default Preferences
// ============================================

const DEFAULT_TYPE_PREFERENCES: Record<string, Record<string, boolean>> = {
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
};

// ============================================
// JSON Schemas for Response Serialization
// ============================================

const NotificationSchema = {
  $id: 'Notification',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    recipientUserId: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    body: { type: 'string' },
    type: { type: 'string' },
    channel: { type: 'string' },
    status: { type: 'string' },
    actionUrl: { type: 'string', nullable: true },
    data: { type: 'object', nullable: true },
    metadata: { type: 'object', nullable: true },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const NotificationStatsSchema = {
  $id: 'NotificationStats',
  type: 'object',
  properties: {
    total: { type: 'integer' },
    unread: { type: 'integer' },
    today: { type: 'integer' },
    byType: {
      type: 'object',
      additionalProperties: { type: 'integer' },
    },
  },
};

const NotificationPreferencesSchema = {
  $id: 'NotificationPreferences',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    tenantId: { type: 'string', format: 'uuid' },
    emailEnabled: { type: 'boolean' },
    smsEnabled: { type: 'boolean' },
    whatsappEnabled: { type: 'boolean' },
    internalEnabled: { type: 'boolean' },
    pushEnabled: { type: 'boolean' },
    digestEnabled: { type: 'boolean' },
    digestFrequency: { type: 'string' },
    quietHoursEnabled: { type: 'boolean' },
    quietHoursStart: { type: 'string', nullable: true },
    quietHoursEnd: { type: 'string', nullable: true },
    typePreferences: { type: 'object' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

// ============================================
// Routes
// ============================================

export async function notificationRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const pool = container.resolve<DatabasePool>('DatabasePool');

  // Register schemas for serialization
  if (!server.getSchema('Notification')) {
    server.addSchema(NotificationSchema);
  }
  if (!server.getSchema('NotificationStats')) {
    server.addSchema(NotificationStatsSchema);
  }
  if (!server.getSchema('NotificationPreferences')) {
    server.addSchema(NotificationPreferencesSchema);
  }

  // ============================================
  // GET /notifications - List notifications
  // ============================================
  server.get<{
    Querystring: ListNotificationsQuery;
  }>(
    '/',
    {
      preHandler: validate({ querystring: listNotificationsQuerySchema }),
      schema: {
        description: 'List notifications for the current user with optional filters',
        tags: ['Notifications'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: [...NOTIFICATION_TYPES] },
            unreadOnly: { type: 'boolean' },
            relatedType: { type: 'string' },
            limit: { type: 'integer', default: 20, maximum: 100 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { $ref: 'Notification' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: ListNotificationsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const { type, unreadOnly, relatedType, limit, offset } = request.query;

      // Build query with filters
      // Note: actual DB column is 'user_id' not 'user_id'
      let sql = `
        SELECT * FROM notifications
        WHERE tenant_id = $1 AND user_id = $2
      `;
      const params: unknown[] = [tenantId, userId];
      let paramIndex = 3;

      // Filter by unread only
      if (unreadOnly) {
        sql += ` AND is_read = false`;
      }

      // Filter by type (map frontend type to backend types)
      if (type) {
        const backendTypes = getBackendTypesForFrontendType(type);
        if (backendTypes.length > 0) {
          sql += ` AND type = ANY($${paramIndex})`;
          params.push(backendTypes);
          paramIndex++;
        }
      }

      // Filter by related type (check metadata)
      if (relatedType) {
        sql += ` AND (
          (type LIKE $${paramIndex} || '.%') OR
          (metadata->>'relatedType' = $${paramIndex})
        )`;
        params.push(relatedType);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit || 20, offset || 0);

      const result = await pool.query(sql, params);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch notifications');
      }

      const notifications = result.getValue().rows.map(mapRowToNotificationResponse);

      return reply.status(200).send(notifications);
    }
  );

  // ============================================
  // GET /notifications/stats - Get statistics
  // ============================================
  server.get(
    '/stats',
    {
      schema: {
        description: 'Get notification statistics for the current user',
        tags: ['Notifications'],
        response: {
          200: { $ref: 'NotificationStats' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const sql = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_read = false) as unread,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as this_week,
          type,
          COUNT(*) as type_count
        FROM notifications
        WHERE tenant_id = $1 AND user_id = $2
        GROUP BY GROUPING SETS ((), (type))
      `;

      const result = await pool.query(sql, [tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch notification stats');
      }

      const rows = result.getValue().rows;

      // Extract totals from the row without type (grouping set ())
      const totalsRow = rows.find((r) => r.type === null) || {
        total: 0,
        unread: 0,
        today: 0,
        this_week: 0,
      };

      // Build byType from rows with type values
      const byType: Record<string, number> = {};
      NOTIFICATION_TYPES.forEach((t) => {
        byType[t] = 0;
      });

      rows
        .filter((r) => r.type !== null)
        .forEach((r) => {
          const frontendType = mapNotificationType(r.type);
          byType[frontendType] = (byType[frontendType] || 0) + parseInt(r.type_count, 10);
        });

      const stats: NotificationStatsResponse = {
        total: parseInt(totalsRow.total, 10) || 0,
        unread: parseInt(totalsRow.unread, 10) || 0,
        today: parseInt(totalsRow.today, 10) || 0,
        thisWeek: parseInt(totalsRow.this_week, 10) || 0,
        byType: byType as NotificationStatsResponse['byType'],
      };

      return reply.status(200).send(stats);
    }
  );

  // ============================================
  // GET /notifications/unread-count - Get unread count
  // ============================================
  server.get(
    '/unread-count',
    {
      schema: {
        description: 'Get count of unread notifications',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const sql = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE tenant_id = $1
          AND user_id = $2
          AND is_read = false
      `;

      const result = await pool.query(sql, [tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch unread count');
      }

      const count = parseInt(result.getValue().rows[0]?.count || '0', 10);

      return reply.status(200).send({ count });
    }
  );

  // ============================================
  // PATCH /notifications/:id/read - Mark as read
  // ============================================
  server.patch<{
    Params: NotificationIdParams;
  }>(
    '/:id/read',
    {
      preHandler: validate({ params: notificationIdParamsSchema }),
      schema: {
        description: 'Mark a notification as read',
        tags: ['Notifications'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { $ref: 'Notification' },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: NotificationIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { id } = request.params;

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // DB uses is_read boolean, not status string
      const sql = `
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND user_id = $3
        RETURNING *
      `;

      const result = await pool.query(sql, [id, tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to mark notification as read');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Notification not found: ${id}`);
      }

      const notification = mapRowToNotificationResponse(result.getValue().rows[0]);

      return reply.status(200).send(notification);
    }
  );

  // ============================================
  // PATCH /notifications/read-all - Mark all as read
  // ============================================
  server.patch(
    '/read-all',
    {
      schema: {
        description: 'Mark all notifications as read',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // DB uses is_read boolean, not status string
      const sql = `
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE tenant_id = $1
          AND user_id = $2
          AND is_read = false
      `;

      const result = await pool.query(sql, [tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to mark all as read');
      }

      const count = result.getValue().rowCount || 0;

      return reply.status(200).send({ count });
    }
  );

  // ============================================
  // DELETE /notifications/:id - Delete notification
  // ============================================
  server.delete<{
    Params: NotificationIdParams;
  }>(
    '/:id',
    {
      preHandler: validate({ params: notificationIdParamsSchema }),
      schema: {
        description: 'Delete a notification',
        tags: ['Notifications'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          204: { type: 'null' },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: NotificationIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { id } = request.params;

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const sql = `
        DELETE FROM notifications
        WHERE id = $1 AND tenant_id = $2 AND user_id = $3
      `;

      const result = await pool.query(sql, [id, tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to delete notification');
      }

      if (result.getValue().rowCount === 0) {
        throw new HttpError(404, 'Not Found', `Notification not found: ${id}`);
      }

      return reply.status(204).send();
    }
  );

  // ============================================
  // DELETE /notifications - Delete all notifications
  // ============================================
  server.delete(
    '/',
    {
      schema: {
        description: 'Delete all notifications for the current user',
        tags: ['Notifications'],
        response: {
          200: {
            type: 'object',
            properties: {
              count: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const sql = `
        DELETE FROM notifications
        WHERE tenant_id = $1 AND user_id = $2
      `;

      const result = await pool.query(sql, [tenantId, userId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to delete notifications');
      }

      const count = result.getValue().rowCount || 0;

      return reply.status(200).send({ count });
    }
  );

  // ============================================
  // NOTIFICATION PREFERENCES ENDPOINTS
  // ============================================

  // ============================================
  // GET /notification-preferences - Get preferences
  // ============================================
  server.get(
    '-preferences',
    {
      schema: {
        description: 'Get notification preferences for the current user',
        tags: ['Notification Preferences'],
        response: {
          200: { $ref: 'NotificationPreferences' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // Try to get existing preferences
      const selectSql = `
        SELECT * FROM notification_preferences
        WHERE user_id = $1 AND tenant_id = $2
      `;

      let result = await pool.query(selectSql, [userId, tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch preferences');
      }

      // If no preferences exist, create defaults
      if (result.getValue().rows.length === 0) {
        const id = uuidv4();
        const now = new Date();

        const insertSql = `
          INSERT INTO notification_preferences (
            id, user_id, tenant_id,
            email_enabled, sms_enabled, whatsapp_enabled, internal_enabled, push_enabled,
            digest_enabled, digest_frequency, type_preferences,
            quiet_hours_enabled, created_at, updated_at
          ) VALUES (
            $1, $2, $3,
            true, false, false, true, true,
            false, 'weekly', $4,
            false, $5, $6
          )
          RETURNING *
        `;

        result = await pool.query(insertSql, [
          id,
          userId,
          tenantId,
          JSON.stringify(DEFAULT_TYPE_PREFERENCES),
          now,
          now,
        ]);

        if (result.isFailure) {
          throw new HttpError(500, 'Internal Server Error', 'Failed to create default preferences');
        }
      }

      const preferences = mapRowToPreferencesResponse(result.getValue().rows[0]);

      return reply.status(200).send(preferences);
    }
  );

  // ============================================
  // PATCH /notification-preferences - Update preferences
  // ============================================
  server.patch<{
    Body: UpdateNotificationPreferences;
  }>(
    '-preferences',
    {
      preHandler: validate({ body: notificationPreferencesSchema }),
      schema: {
        description: 'Update notification preferences',
        tags: ['Notification Preferences'],
        body: {
          type: 'object',
          properties: {
            emailEnabled: { type: 'boolean' },
            smsEnabled: { type: 'boolean' },
            whatsappEnabled: { type: 'boolean' },
            internalEnabled: { type: 'boolean' },
            pushEnabled: { type: 'boolean' },
            digestEnabled: { type: 'boolean' },
            digestFrequency: { type: 'string', enum: ['daily', 'weekly', 'never'] },
            quietHoursEnabled: { type: 'boolean' },
            quietHoursStart: { type: 'string' },
            quietHoursEnd: { type: 'string' },
          },
        },
        response: {
          200: { $ref: 'NotificationPreferences' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: UpdateNotificationPreferences }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const updates = request.body;

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // Build dynamic update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      const fieldMapping: Record<string, string> = {
        emailEnabled: 'email_enabled',
        smsEnabled: 'sms_enabled',
        whatsappEnabled: 'whatsapp_enabled',
        internalEnabled: 'internal_enabled',
        pushEnabled: 'push_enabled',
        emailAddress: 'email_address',
        digestEnabled: 'digest_enabled',
        digestFrequency: 'digest_frequency',
        digestTime: 'digest_time',
        digestDay: 'digest_day',
        quietHoursEnabled: 'quiet_hours_enabled',
        quietHoursStart: 'quiet_hours_start',
        quietHoursEnd: 'quiet_hours_end',
        quietHoursTimezone: 'quiet_hours_timezone',
      };

      for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (updates[key as keyof UpdateNotificationPreferences] !== undefined) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          params.push(updates[key as keyof UpdateNotificationPreferences]);
          paramIndex++;
        }
      }

      // Handle typePreferences separately (JSONB merge)
      if (updates.typePreferences) {
        setClauses.push(`type_preferences = type_preferences || $${paramIndex}::jsonb`);
        params.push(JSON.stringify(updates.typePreferences));
        paramIndex++;
      }

      params.push(userId, tenantId);

      const sql = `
        UPDATE notification_preferences
        SET ${setClauses.join(', ')}
        WHERE user_id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await pool.query(sql, params);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to update preferences');
      }

      if (result.getValue().rows.length === 0) {
        // Create preferences if they don't exist (upsert behavior)
        const id = uuidv4();
        const now = new Date();

        const insertSql = `
          INSERT INTO notification_preferences (
            id, user_id, tenant_id,
            email_enabled, sms_enabled, whatsapp_enabled, internal_enabled, push_enabled,
            email_address, digest_enabled, digest_frequency, digest_time, digest_day,
            type_preferences, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
            quiet_hours_timezone, created_at, updated_at
          ) VALUES (
            $1, $2, $3,
            $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19, $20
          )
          RETURNING *
        `;

        const insertResult = await pool.query(insertSql, [
          id,
          userId,
          tenantId,
          updates.emailEnabled ?? true,
          updates.smsEnabled ?? false,
          updates.whatsappEnabled ?? false,
          updates.internalEnabled ?? true,
          updates.pushEnabled ?? true,
          updates.emailAddress ?? null,
          updates.digestEnabled ?? false,
          updates.digestFrequency ?? 'weekly',
          updates.digestTime ?? null,
          updates.digestDay ?? null,
          JSON.stringify(updates.typePreferences ?? DEFAULT_TYPE_PREFERENCES),
          updates.quietHoursEnabled ?? false,
          updates.quietHoursStart ?? null,
          updates.quietHoursEnd ?? null,
          updates.quietHoursTimezone ?? null,
          now,
          now,
        ]);

        if (insertResult.isFailure) {
          throw new HttpError(500, 'Internal Server Error', 'Failed to create preferences');
        }

        const preferences = mapRowToPreferencesResponse(insertResult.getValue().rows[0]);
        return reply.status(200).send(preferences);
      }

      const preferences = mapRowToPreferencesResponse(result.getValue().rows[0]);

      return reply.status(200).send(preferences);
    }
  );

  // ============================================
  // POST /notification-preferences/reset - Reset to defaults
  // ============================================
  server.post(
    '-preferences/reset',
    {
      schema: {
        description: 'Reset notification preferences to defaults',
        tags: ['Notification Preferences'],
        response: {
          200: { $ref: 'NotificationPreferences' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const sql = `
        UPDATE notification_preferences
        SET
          email_enabled = true,
          sms_enabled = false,
          whatsapp_enabled = false,
          internal_enabled = true,
          push_enabled = true,
          email_address = NULL,
          digest_enabled = false,
          digest_frequency = 'weekly',
          digest_time = NULL,
          digest_day = NULL,
          type_preferences = $1,
          quiet_hours_enabled = false,
          quiet_hours_start = NULL,
          quiet_hours_end = NULL,
          quiet_hours_timezone = NULL,
          updated_at = NOW()
        WHERE user_id = $2 AND tenant_id = $3
        RETURNING *
      `;

      const result = await pool.query(sql, [
        JSON.stringify(DEFAULT_TYPE_PREFERENCES),
        userId,
        tenantId,
      ]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to reset preferences');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', 'Preferences not found');
      }

      const preferences = mapRowToPreferencesResponse(result.getValue().rows[0]);

      return reply.status(200).send(preferences);
    }
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Maps frontend notification type to backend types
 */
function getBackendTypesForFrontendType(frontendType: string): string[] {
  const typeMapping: Record<string, string[]> = {
    lead: [
      'lead.created',
      'lead.assigned',
      'lead.qualified',
      'lead.status_changed',
    ],
    success: ['lead.converted'],
    warning: ['lead.lost', 'follow_up.overdue', 'lead.score_decreased'],
    reminder: ['follow_up.scheduled', 'follow_up.due'],
    info: ['lead.score_increased'],
    system: ['system.daily_summary', 'system.weekly_report'],
    task: [], // Add task types when implemented
    opportunity: [], // Add opportunity types when implemented
    customer: [], // Add customer types when implemented
    workflow: [], // Add workflow types when implemented
    mention: [], // Add mention types when implemented
    error: [], // Add error types when implemented
  };

  return typeMapping[frontendType] || [];
}

export default notificationRoutes;
