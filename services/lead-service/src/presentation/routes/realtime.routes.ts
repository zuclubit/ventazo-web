/**
 * Real-Time Routes
 * REST API endpoints for real-time notifications management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { WebSocketService } from '../../infrastructure/websocket';

// Validation schemas
const sendNotificationSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(5000),
  icon: z.string().max(255).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  actionUrl: z.string().max(500).optional(),
  actionLabel: z.string().max(100).optional(),
  data: z.record(z.unknown()).optional(),
  userIds: z.array(z.string().uuid()).optional(),
  expiresAt: z.string().datetime().optional(),
  requiresAck: z.boolean().default(false),
});

const sendFromTemplateSchema = z.object({
  templateType: z.string().min(1).max(100),
  variables: z.record(z.string()),
  userIds: z.array(z.string().uuid()).optional(),
});

const createTemplateSchema = z.object({
  type: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(5000),
  icon: z.string().max(255).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  actionUrl: z.string().max(500).optional(),
  variables: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const updatePreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  leadUpdates: z.boolean().optional(),
  taskReminders: z.boolean().optional(),
  dealChanges: z.boolean().optional(),
  teamActivity: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(50).optional(),
});

const listNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const notificationIdParamSchema = z.object({
  notificationId: z.string().uuid(),
});

const templateTypeParamSchema = z.object({
  type: z.string().min(1),
});

const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});

export const realtimeRoutes: FastifyPluginAsync = async (fastify) => {
  const wsService = container.resolve(WebSocketService);

  // Helper to get tenant and user from request
  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default',
    userId: request.headers['x-user-id'] as string || 'system',
  });

  // ============================================
  // Notifications
  // ============================================

  // Send notification
  fastify.post('/notifications', {
    schema: {
      body: toJsonSchema(sendNotificationSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const validation = sendNotificationSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await wsService.sendNotification(
      context.tenantId,
      {
        type: validation.data.type,
        title: validation.data.title,
        body: validation.data.body,
        icon: validation.data.icon,
        priority: validation.data.priority,
        actionUrl: validation.data.actionUrl,
        actionLabel: validation.data.actionLabel,
        data: validation.data.data,
        expiresAt: validation.data.expiresAt ? new Date(validation.data.expiresAt) : undefined,
        requiresAck: validation.data.requiresAck,
      },
      validation.data.userIds
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send({ success: true });
  });

  // Send from template
  fastify.post('/notifications/template', {
    schema: {
      body: toJsonSchema(sendFromTemplateSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const validation = sendFromTemplateSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await wsService.sendFromTemplate(
      context.tenantId,
      validation.data.templateType,
      validation.data.variables,
      validation.data.userIds
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send({ success: true });
  });

  // Get user notifications
  fastify.get('/notifications', {
    schema: {
      querystring: toJsonSchema(listNotificationsSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const validation = listNotificationsSchema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await wsService.getUserNotifications(
      context.tenantId,
      context.userId,
      validation.data.unreadOnly,
      validation.data.limit
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get unread count
  fastify.get('/notifications/unread-count', async (request, reply) => {
    const context = getContext(request);

    const result = await wsService.getUnreadCount(context.tenantId, context.userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ count: result.value });
  });

  // Mark notification as read
  fastify.put('/notifications/:notificationId/read', {
    schema: {
      params: toJsonSchema(notificationIdParamSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const { notificationId } = request.params as { notificationId: string };

    const result = await wsService.markAsRead(
      context.tenantId,
      context.userId,
      notificationId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // Mark all as read
  fastify.put('/notifications/read-all', async (request, reply) => {
    const context = getContext(request);

    const result = await wsService.markAllAsRead(context.tenantId, context.userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ count: result.value });
  });

  // ============================================
  // Templates
  // ============================================

  // Create template
  fastify.post('/templates', {
    schema: {
      body: toJsonSchema(createTemplateSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const validation = createTemplateSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await wsService.createTemplate(context.tenantId, validation.data);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get template
  fastify.get('/templates/:type', {
    schema: {
      params: toJsonSchema(templateTypeParamSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const { type } = request.params as { type: string };

    const result = await wsService.getTemplate(context.tenantId, type);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Preferences
  // ============================================

  // Get preferences
  fastify.get('/preferences', async (request, reply) => {
    const context = getContext(request);

    const result = await wsService.getPreferences(context.tenantId, context.userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update preferences
  fastify.put('/preferences', {
    schema: {
      body: toJsonSchema(updatePreferencesSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const validation = updatePreferencesSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await wsService.updatePreferences(
      context.tenantId,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Online Status
  // ============================================

  // Get online users
  fastify.get('/online-users', async (request, reply) => {
    const context = getContext(request);

    const users = wsService.getOnlineUsers(context.tenantId);

    return reply.send({
      users: users.map((u) => ({
        userId: u.userId,
        connectedAt: u.connectedAt,
        lastActivityAt: u.lastActivityAt,
      })),
      count: users.length,
    });
  });

  // Check if user is online
  fastify.get('/online-users/:userId', {
    schema: {
      params: toJsonSchema(userIdParamSchema),
    },
  }, async (request, reply) => {
    const context = getContext(request);
    const { userId } = request.params as { userId: string };

    const isOnline = wsService.isUserOnline(context.tenantId, userId);

    return reply.send({ userId, isOnline });
  });

  // ============================================
  // Stats
  // ============================================

  // Get WebSocket stats
  fastify.get('/stats', async (request, reply) => {
    const stats = wsService.getStats();
    return reply.send(stats);
  });
};
