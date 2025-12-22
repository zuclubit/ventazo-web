/**
 * Unified Inbox Routes
 * REST API endpoints for omnichannel communication management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { UnifiedInboxService } from './unified-inbox.service';

// ==================== Validation Schemas ====================

const conversationParamsSchema = z.object({
  conversationId: z.string().uuid(),
});

const searchQuerySchema = z.object({
  query: z.string().optional(),
  channels: z.string().optional(), // comma-separated
  statuses: z.string().optional(), // comma-separated
  priorities: z.string().optional(), // comma-separated
  assignedToIds: z.string().optional(), // comma-separated
  hasUnread: z.coerce.boolean().optional(),
  isStarred: z.coerce.boolean().optional(),
  tags: z.string().optional(), // comma-separated
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['newest', 'oldest', 'priority', 'waiting_longest', 'sla'])
    .default('newest'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  viewId: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['new', 'open', 'pending', 'resolved', 'closed', 'snoozed']),
});

const assignSchema = z.object({
  assigneeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});

const snoozeSchema = z.object({
  snoozeUntil: z.coerce.date(),
});

const tagsSchema = z.object({
  tags: z.array(z.string()).min(1),
});

const sendMessageSchema = z.object({
  channel: z.enum([
    'email',
    'sms',
    'whatsapp',
    'chat',
    'messenger',
    'instagram',
    'twitter',
    'linkedin',
    'phone',
    'video',
    'in_app',
  ]),
  accountId: z.string().optional(),
  to: z.array(
    z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
  ),
  cc: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .optional(),
  bcc: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      })
    )
    .optional(),
  subject: z.string().optional(),
  body: z.string(),
  bodyHtml: z.string().optional(),
  replyToConversationId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  templateData: z.record(z.unknown()).optional(),
  scheduledFor: z.coerce.date().optional(),
  linkedEntityType: z.string().optional(),
  linkedEntityId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const replySchema = z.object({
  body: z.string(),
  bodyHtml: z.string().optional(),
});

const bulkActionSchema = z.object({
  action: z.enum([
    'assign',
    'close',
    'reopen',
    'snooze',
    'archive',
    'mark_read',
    'mark_unread',
    'add_tag',
    'remove_tag',
    'change_priority',
    'change_status',
  ]),
  conversationIds: z.array(z.string().uuid()).min(1).max(100),
  params: z
    .object({
      assigneeId: z.string().uuid().optional(),
      teamId: z.string().uuid().optional(),
      snoozeUntil: z.coerce.date().optional(),
      tags: z.array(z.string()).optional(),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
      status: z.enum(['new', 'open', 'pending', 'resolved', 'closed', 'snoozed']).optional(),
    })
    .optional(),
});

const getCannedResponsesQuerySchema = z.object({
  channel: z.string().optional(),
});

const cannedResponseSchema = z.object({
  name: z.string(),
  shortcut: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  body: z.string(),
  bodyHtml: z.string().optional(),
  channels: z
    .array(
      z.enum([
        'email',
        'sms',
        'whatsapp',
        'chat',
        'messenger',
        'instagram',
        'twitter',
        'linkedin',
        'phone',
        'video',
        'in_app',
      ])
    )
    .optional(),
  isPublic: z.boolean().default(true),
});

const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(200).default(50),
  before: z.coerce.date().optional(),
});

const searchMessagesSchema = z.object({
  query: z.string(),
  channels: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ==================== Helper Functions ====================

function getTenantId(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  return (headers['x-tenant-id'] as string) || 'default';
}

function getUserId(request: FastifyRequest): string {
  const headers = request.headers as Record<string, string | string[] | undefined>;
  return (headers['x-user-id'] as string) || 'system';
}

function parseCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ==================== Route Handler ====================

export async function unifiedInboxRoutes(fastify: FastifyInstance) {
  const service = container.resolve(UnifiedInboxService);

  /**
   * List inbox messages (alias for /conversations)
   * GET /api/v1/inbox
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'List inbox messages',
        description: 'Returns a list of messages from all channels',
        querystring: toJsonSchema(searchQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const rawQuery = searchQuerySchema.parse(request.query);

      const searchParams = {
        tenantId,
        userId,
        viewId: rawQuery.viewId,
        filters: {
          channels: parseCommaSeparated(rawQuery.channels) as any,
          statuses: parseCommaSeparated(rawQuery.statuses) as any,
          priorities: parseCommaSeparated(rawQuery.priorities) as any,
          assignedToIds: parseCommaSeparated(rawQuery.assignedToIds),
          hasUnread: rawQuery.hasUnread,
          isStarred: rawQuery.isStarred,
          tags: parseCommaSeparated(rawQuery.tags),
          searchQuery: rawQuery.query,
          dateRange: {
            start: rawQuery.startDate,
            end: rawQuery.endDate,
          },
        },
        page: rawQuery.page,
        limit: rawQuery.limit,
        sortBy: rawQuery.sortBy,
        sortOrder: rawQuery.sortOrder,
      };

      const result = await service.getUnifiedInbox(tenantId, searchParams as any);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        messages: result.value.conversations,
        total: result.value.total,
        page: result.value.page,
        limit: result.value.limit,
      });
    }
  );

  /**
   * Get conversations (unified inbox)
   * GET /api/v1/inbox/conversations
   */
  fastify.get(
    '/conversations',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get conversations from all channels',
        description:
          'Returns a unified view of conversations across email, SMS, WhatsApp, and other channels',
        querystring: toJsonSchema(searchQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const rawQuery = searchQuerySchema.parse(request.query);

      const searchParams = {
        tenantId,
        userId,
        viewId: rawQuery.viewId,
        filters: {
          channels: parseCommaSeparated(rawQuery.channels) as any,
          statuses: parseCommaSeparated(rawQuery.statuses) as any,
          priorities: parseCommaSeparated(rawQuery.priorities) as any,
          assignedToIds: parseCommaSeparated(rawQuery.assignedToIds),
          hasUnread: rawQuery.hasUnread,
          isStarred: rawQuery.isStarred,
          tags: parseCommaSeparated(rawQuery.tags),
          searchQuery: rawQuery.query,
          dateRange: {
            start: rawQuery.startDate,
            end: rawQuery.endDate,
          },
        },
        page: rawQuery.page,
        limit: rawQuery.limit,
        sortBy: rawQuery.sortBy,
        sortOrder: rawQuery.sortOrder,
      };

      const result = await service.getUnifiedInbox(tenantId, searchParams as any);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value.conversations,
        meta: {
          total: result.value.total,
          page: result.value.page,
          limit: result.value.limit,
          totalPages: result.value.totalPages,
          unreadTotal: result.value.unreadTotal,
        },
      });
    }
  );

  /**
   * Get a single conversation with messages
   * GET /api/v1/inbox/conversations/:conversationId
   */
  fastify.get(
    '/conversations/:conversationId',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get a conversation with all messages',
        params: toJsonSchema(conversationParamsSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);

      const result = await service.getConversation(tenantId, params.conversationId);

      if (result.isFailure) {
        return reply.status(404).send({
          success: false,
          error: result.error,
        });
      }

      // Mark as read
      await service.markAsRead(tenantId, params.conversationId, true);

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Update conversation status
   * PATCH /api/v1/inbox/conversations/:conversationId/status
   */
  fastify.patch(
    '/conversations/:conversationId/status',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Update conversation status',
        params: toJsonSchema(conversationParamsSchema),
        body: toJsonSchema(updateStatusSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);
      const body = updateStatusSchema.parse(request.body);

      const result = await service.updateConversationStatus(
        tenantId,
        params.conversationId,
        body.status
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Status updated',
      });
    }
  );

  /**
   * Assign conversation
   * PATCH /api/v1/inbox/conversations/:conversationId/assign
   */
  fastify.patch(
    '/conversations/:conversationId/assign',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Assign conversation to user or team',
        params: toJsonSchema(conversationParamsSchema),
        body: toJsonSchema(assignSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);
      const body = assignSchema.parse(request.body);

      const result = await service.assignConversation(
        tenantId,
        params.conversationId,
        body.assigneeId,
        body.teamId
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Conversation assigned',
      });
    }
  );

  /**
   * Mark conversation as read/unread
   * POST /api/v1/inbox/conversations/:conversationId/read
   */
  fastify.post(
    '/conversations/:conversationId/read',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Mark conversation as read',
        params: toJsonSchema(conversationParamsSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);

      const result = await service.markAsRead(tenantId, params.conversationId, true);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Marked as read',
      });
    }
  );

  /**
   * Mark conversation as unread
   * POST /api/v1/inbox/conversations/:conversationId/unread
   */
  fastify.post(
    '/conversations/:conversationId/unread',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Mark conversation as unread',
        params: toJsonSchema(conversationParamsSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);

      const result = await service.markAsRead(tenantId, params.conversationId, false);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Marked as unread',
      });
    }
  );

  /**
   * Snooze conversation
   * POST /api/v1/inbox/conversations/:conversationId/snooze
   */
  fastify.post(
    '/conversations/:conversationId/snooze',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Snooze conversation until a specific time',
        params: toJsonSchema(conversationParamsSchema),
        body: toJsonSchema(snoozeSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);
      const body = snoozeSchema.parse(request.body);

      const result = await service.snoozeConversation(
        tenantId,
        params.conversationId,
        body.snoozeUntil
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Conversation snoozed',
      });
    }
  );

  /**
   * Add tags to conversation
   * POST /api/v1/inbox/conversations/:conversationId/tags
   */
  fastify.post(
    '/conversations/:conversationId/tags',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Add tags to a conversation',
        params: toJsonSchema(conversationParamsSchema),
        body: toJsonSchema(tagsSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);
      const body = tagsSchema.parse(request.body);

      const result = await service.addTags(
        tenantId,
        params.conversationId,
        body.tags
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        message: 'Tags added',
      });
    }
  );

  /**
   * Get messages for a conversation
   * GET /api/v1/inbox/conversations/:conversationId/messages
   */
  fastify.get(
    '/conversations/:conversationId/messages',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get messages in a conversation',
        params: toJsonSchema(conversationParamsSchema),
        querystring: toJsonSchema(getMessagesQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = conversationParamsSchema.parse(request.params);
      const query = getMessagesQuerySchema.parse(request.query);

      const result = await service.getMessages(
        tenantId,
        params.conversationId,
        query.limit,
        query.before
      );

      if (result.isFailure) {
        return reply.status(404).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Reply to a conversation
   * POST /api/v1/inbox/conversations/:conversationId/reply
   */
  fastify.post(
    '/conversations/:conversationId/reply',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Reply to a conversation',
        params: toJsonSchema(conversationParamsSchema),
        body: toJsonSchema(replySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const params = conversationParamsSchema.parse(request.params);
      const body = replySchema.parse(request.body);

      const result = await service.replyToConversation(
        tenantId,
        userId,
        params.conversationId,
        body.body,
        body.bodyHtml
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Send a new message
   * POST /api/v1/inbox/messages
   */
  fastify.post(
    '/messages',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Send a new message',
        body: toJsonSchema(sendMessageSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const body = sendMessageSchema.parse(request.body);

      const result = await service.sendMessage(tenantId, userId, body as any);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Perform bulk action on conversations
   * POST /api/v1/inbox/bulk
   */
  fastify.post(
    '/bulk',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Perform bulk action on conversations',
        body: toJsonSchema(bulkActionSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const body = bulkActionSchema.parse(request.body);

      const result = await service.performBulkAction(tenantId, userId, body as any);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get inbox views
   * GET /api/v1/inbox/views
   */
  fastify.get(
    '/views',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get inbox views (folders)',
        description: 'Returns system and custom inbox views with message counts',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const result = await service.getInboxViews(tenantId, userId);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get canned responses
   * GET /api/v1/inbox/canned-responses
   */
  fastify.get(
    '/canned-responses',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get canned responses',
        querystring: toJsonSchema(getCannedResponsesQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const query = getCannedResponsesQuerySchema.parse(request.query);

      const result = await service.getCannedResponses(tenantId, query.channel);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Create canned response
   * POST /api/v1/inbox/canned-responses
   */
  fastify.post(
    '/canned-responses',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Create a canned response',
        body: toJsonSchema(cannedResponseSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const body = cannedResponseSchema.parse(request.body);

      const result = await service.createCannedResponse(tenantId, userId, body as any);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error,
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Search messages
   * GET /api/v1/inbox/search
   */
  fastify.get(
    '/search',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Search across all messages',
        querystring: toJsonSchema(searchMessagesSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const params = searchMessagesSchema.parse(request.query);

      const result = await service.searchMessages(tenantId, params.query, {
        channels: parseCommaSeparated(params.channels) as any,
        dateRange: {
          start: params.startDate,
          end: params.endDate,
        },
        limit: params.limit,
        offset: params.offset,
      });

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value.messages,
        meta: {
          total: result.value.total,
        },
      });
    }
  );

  /**
   * Get inbox dashboard
   * GET /api/v1/inbox/dashboard
   */
  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Unified Inbox'],
        summary: 'Get inbox dashboard metrics',
        description:
          'Returns aggregated metrics including conversation counts, channel breakdown, and performance stats',
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const result = await service.getDashboard(tenantId, userId);

      if (result.isFailure) {
        return reply.status(500).send({
          success: false,
          error: result.error,
        });
      }

      return reply.send({
        success: true,
        data: result.value,
      });
    }
  );
}
