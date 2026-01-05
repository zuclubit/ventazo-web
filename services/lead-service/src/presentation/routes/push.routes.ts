/**
 * Push Notifications Routes
 * REST API endpoints for push notification management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import {
  PushNotificationService,
  RegisterDeviceInput,
  PushProvider,
} from '../../infrastructure/notifications/push.service';
import { NotificationPriority, NotificationType } from '../../infrastructure/notifications/types';

// Request schemas
interface RegisterDeviceBody {
  token: string;
  platform: 'ios' | 'android' | 'web';
  provider?: PushProvider;
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    appVersion?: string;
  };
}

interface UnregisterDeviceBody {
  token: string;
}

interface SendNotificationBody {
  title: string;
  body: string;
  data?: Record<string, string>;
  priority?: NotificationPriority;
  imageUrl?: string;
  actionUrl?: string;
}

interface SendToUsersBody extends SendNotificationBody {
  userIds: string[];
}

interface SendToTenantBody extends SendNotificationBody {
  // All tenant users
}

interface SendToTopicBody {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface SubscribeTopicBody {
  topic: string;
}

export async function pushRoutes(fastify: FastifyInstance): Promise<void> {
  const pushService = container.resolve<PushNotificationService>('PushNotificationService');

  /**
   * Check if push notifications are available
   * GET /api/v1/push/status
   */
  fastify.get(
    '/status',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      return reply.status(200).send({
        success: true,
        data: {
          available: pushService.isAvailable(),
          providers: pushService.getAvailableProviders(),
        },
      });
    }
  );

  /**
   * Register a device for push notifications
   * POST /api/v1/push/devices
   */
  fastify.post(
    '/devices',
    async (
      request: FastifyRequest<{ Body: RegisterDeviceBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const body = request.body;

      const input: RegisterDeviceInput = {
        userId,
        tenantId,
        token: body.token,
        platform: body.platform,
        provider: body.provider,
        deviceInfo: body.deviceInfo,
      };

      const result = await pushService.registerDevice(input);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Registration Failed',
          message: result.error || 'Failed to register device',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Unregister a device
   * DELETE /api/v1/push/devices
   */
  fastify.delete(
    '/devices',
    async (
      request: FastifyRequest<{ Body: UnregisterDeviceBody }>,
      reply: FastifyReply
    ) => {
      const userId = request.headers['x-user-id'] as string;

      if (!userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing user identification',
        });
      }

      const { token } = request.body;

      const result = await pushService.unregisterDevice(userId, token);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Unregister Failed',
          message: result.error || 'Failed to unregister device',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Device unregistered successfully',
      });
    }
  );

  /**
   * Get user's registered devices
   * GET /api/v1/push/devices
   */
  fastify.get(
    '/devices',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const devices = await pushService.getUserDevices(userId, tenantId);

      return reply.status(200).send({
        success: true,
        data: devices,
      });
    }
  );

  /**
   * Send notification to current user
   * POST /api/v1/push/send/me
   */
  fastify.post(
    '/send/me',
    async (
      request: FastifyRequest<{ Body: SendNotificationBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { title, body, data, priority, imageUrl, actionUrl } = request.body;

      const results = await pushService.sendToUser(userId, tenantId, {
        tenantId,
        type: NotificationType.LEAD_CREATED,
        priority: priority || NotificationPriority.MEDIUM,
        content: {
          title,
          body,
          data,
          imageUrl,
          actionUrl,
        },
        metadata: {
          source: 'push_api',
        },
      });

      const successCount = results.filter(r => r.success).length;

      return reply.status(200).send({
        success: true,
        data: {
          sent: successCount,
          failed: results.length - successCount,
          results,
        },
      });
    }
  );

  /**
   * Send notification to specific users
   * POST /api/v1/push/send/users
   */
  fastify.post(
    '/send/users',
    async (
      request: FastifyRequest<{ Body: SendToUsersBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { userIds, title, body, data, priority, imageUrl, actionUrl } =
        request.body;

      if (!userIds || userIds.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'No user IDs provided',
        });
      }

      const resultsMap = await pushService.sendToUsers(userIds, tenantId, {
        tenantId,
        type: NotificationType.LEAD_CREATED,
        priority: priority || NotificationPriority.MEDIUM,
        content: {
          title,
          body,
          data,
          imageUrl,
          actionUrl,
        },
        metadata: {
          source: 'push_api',
        },
      });

      let totalSent = 0;
      let totalFailed = 0;

      const userResults: Record<string, { sent: number; failed: number }> = {};

      for (const [userId, results] of resultsMap) {
        const sent = results.filter(r => r.success).length;
        const failed = results.length - sent;
        totalSent += sent;
        totalFailed += failed;
        userResults[userId] = { sent, failed };
      }

      return reply.status(200).send({
        success: true,
        data: {
          totalSent,
          totalFailed,
          userResults,
        },
      });
    }
  );

  /**
   * Send notification to all users in tenant
   * POST /api/v1/push/send/tenant
   */
  fastify.post(
    '/send/tenant',
    async (
      request: FastifyRequest<{ Body: SendToTenantBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { title, body, data, priority, imageUrl, actionUrl } = request.body;

      const result = await pushService.sendToTenant(tenantId, {
        tenantId,
        type: NotificationType.LEAD_CREATED,
        priority: priority || NotificationPriority.MEDIUM,
        content: {
          title,
          body,
          data,
          imageUrl,
          actionUrl,
        },
        metadata: {
          source: 'push_api',
        },
      });

      return reply.status(200).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * Send notification to topic (Firebase only)
   * POST /api/v1/push/send/topic
   */
  fastify.post(
    '/send/topic',
    async (
      request: FastifyRequest<{ Body: SendToTopicBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { topic, title, body, data } = request.body;

      // Prefix topic with tenant ID for isolation
      const fullTopic = `${tenantId}_${topic}`;

      const success = await pushService.sendToTopic(fullTopic, title, body, data);

      if (!success) {
        return reply.status(400).send({
          error: 'Send Failed',
          message: 'Failed to send notification to topic. Firebase may not be configured.',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Notification sent to topic',
      });
    }
  );

  /**
   * Subscribe current user to topic
   * POST /api/v1/push/topics/subscribe
   */
  fastify.post(
    '/topics/subscribe',
    async (
      request: FastifyRequest<{ Body: SubscribeTopicBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const { topic } = request.body;

      // Prefix topic with tenant ID for isolation
      const fullTopic = `${tenantId}_${topic}`;

      const success = await pushService.subscribeToTopic(userId, fullTopic);

      if (!success) {
        return reply.status(400).send({
          error: 'Subscribe Failed',
          message: 'Failed to subscribe to topic. Firebase may not be configured or no devices registered.',
        });
      }

      return reply.status(200).send({
        success: true,
        message: `Subscribed to topic: ${topic}`,
      });
    }
  );

  /**
   * Cleanup inactive devices (admin endpoint)
   * POST /api/v1/push/cleanup
   */
  fastify.post(
    '/cleanup',
    async (
      request: FastifyRequest<{ Body: { daysInactive?: number } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { daysInactive } = request.body;

      const cleanedCount = await pushService.cleanupInactiveDevices(
        daysInactive || 90
      );

      return reply.status(200).send({
        success: true,
        data: {
          devicesDeactivated: cleanedCount,
        },
      });
    }
  );
}
