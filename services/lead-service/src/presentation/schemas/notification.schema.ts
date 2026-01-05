/**
 * Notification Schemas
 * Zod validation schemas for notification endpoints
 *
 * @module presentation/schemas/notification.schema
 */

import { z } from 'zod';

// ============================================
// Enums & Constants
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

export const DIGEST_FREQUENCIES = ['daily', 'weekly', 'never'] as const;

// ============================================
// Query Schemas
// ============================================

/**
 * Schema for listing notifications with filters
 */
export const listNotificationsQuerySchema = z.object({
  type: z.enum(NOTIFICATION_TYPES).optional(),
  unreadOnly: z
    .union([z.string(), z.boolean()])
    .transform((val) => val === 'true' || val === true)
    .optional(),
  relatedType: z.enum(RELATED_ENTITY_TYPES).optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
    .pipe(z.number().int().min(1).max(100))
    .optional()
    .default(20),
  offset: z
    .union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
    .pipe(z.number().int().min(0))
    .optional()
    .default(0),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;

// ============================================
// Params Schemas
// ============================================

/**
 * Schema for notification ID parameter
 */
export const notificationIdParamsSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
});

export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;

// ============================================
// Body Schemas
// ============================================

/**
 * Schema for creating a notification (internal use)
 */
export const createNotificationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().min(1, 'Message is required').max(2000),
  type: z.enum(NOTIFICATION_TYPES).default('info'),
  relatedType: z.enum(RELATED_ENTITY_TYPES).optional(),
  relatedId: z.string().uuid('Invalid related entity ID').optional(),
  actionUrl: z.string().url('Invalid action URL').max(500).optional(),
  recipientUserId: z.string().uuid('Invalid recipient user ID'),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

/**
 * Schema for notification preferences
 */
export const notificationPreferencesSchema = z.object({
  // Global channel toggles
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  internalEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),

  // Email settings
  emailAddress: z.string().email('Invalid email').optional(),

  // Digest settings
  digestEnabled: z.boolean().optional(),
  digestFrequency: z.enum(DIGEST_FREQUENCIES).optional(),
  digestTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)')
    .optional(),
  digestDay: z.number().int().min(0).max(6).optional(),

  // Type preferences (nested object)
  typePreferences: z
    .record(
      z.enum(NOTIFICATION_TYPES),
      z.object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        internal: z.boolean().optional(),
        push: z.boolean().optional(),
      })
    )
    .optional(),

  // Quiet hours
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)')
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)')
    .optional(),
  quietHoursTimezone: z.string().max(50).optional(),
});

export type UpdateNotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

// ============================================
// Response Types (for documentation)
// ============================================

export interface NotificationResponse {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: (typeof NOTIFICATION_TYPES)[number];
  relatedType?: (typeof RELATED_ENTITY_TYPES)[number];
  relatedId?: string;
  actionUrl?: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationStatsResponse {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  byType: Record<(typeof NOTIFICATION_TYPES)[number], number>;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationPreferencesResponse {
  id: string;
  userId: string;
  tenantId: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  internalEnabled: boolean;
  pushEnabled: boolean;
  emailAddress?: string;
  digestEnabled: boolean;
  digestFrequency: (typeof DIGEST_FREQUENCIES)[number];
  digestTime?: string;
  digestDay?: number;
  typePreferences: Record<
    (typeof NOTIFICATION_TYPES)[number],
    {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
      internal: boolean;
      push: boolean;
    }
  >;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkOperationResponse {
  count: number;
}

// ============================================
// OpenAPI Schema Definitions (for Swagger)
// ============================================

export const notificationSchemas = {
  Notification: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tenantId: { type: 'string', format: 'uuid' },
      userId: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      message: { type: 'string' },
      type: { type: 'string', enum: NOTIFICATION_TYPES },
      relatedType: { type: 'string', enum: RELATED_ENTITY_TYPES },
      relatedId: { type: 'string', format: 'uuid' },
      actionUrl: { type: 'string', format: 'uri' },
      readAt: { type: 'string', format: 'date-time', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
  NotificationStats: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      unread: { type: 'integer' },
      today: { type: 'integer' },
      thisWeek: { type: 'integer' },
      byType: {
        type: 'object',
        additionalProperties: { type: 'integer' },
      },
    },
  },
  NotificationPreferences: {
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
      digestFrequency: { type: 'string', enum: DIGEST_FREQUENCIES },
      quietHoursEnabled: { type: 'boolean' },
    },
  },
};
