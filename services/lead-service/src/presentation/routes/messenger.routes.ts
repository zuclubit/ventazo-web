/**
 * Facebook Messenger Routes
 * REST API endpoints for Facebook Messenger messaging
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { MessengerService } from '../../infrastructure/messenger';

// Validation schemas
const sendTextMessageSchema = z.object({
  to: z.string().min(1).max(50), // PSID (Page-Scoped User ID)
  message: z.string().min(1).max(2000),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendGenericTemplateSchema = z.object({
  to: z.string().min(1).max(50),
  elements: z.array(z.object({
    title: z.string().min(1).max(80),
    subtitle: z.string().max(80).optional(),
    image_url: z.string().url().optional(),
    default_action: z.object({
      type: z.literal('web_url'),
      url: z.string().url(),
      webview_height_ratio: z.enum(['compact', 'tall', 'full']).optional(),
    }).optional(),
    buttons: z.array(z.object({
      type: z.enum(['web_url', 'postback', 'call']),
      title: z.string().min(1).max(20),
      url: z.string().url().optional(),
      payload: z.string().optional(),
    })).max(3).optional(),
  })).min(1).max(10),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendButtonTemplateSchema = z.object({
  to: z.string().min(1).max(50),
  text: z.string().min(1).max(640),
  buttons: z.array(z.object({
    type: z.enum(['web_url', 'postback', 'call']),
    title: z.string().min(1).max(20),
    url: z.string().url().optional(),
    payload: z.string().optional(),
  })).min(1).max(3),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendMediaMessageSchema = z.object({
  to: z.string().min(1).max(50),
  mediaType: z.enum(['image', 'video', 'audio', 'file']),
  mediaUrl: z.string().url(),
  isReusable: z.boolean().default(false),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendTaggedMessageSchema = z.object({
  to: z.string().min(1).max(50),
  message: z.string().min(1).max(2000),
  tag: z.enum([
    'CONFIRMED_EVENT_UPDATE',
    'POST_PURCHASE_UPDATE',
    'ACCOUNT_UPDATE',
    'HUMAN_AGENT',
  ]),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendBulkMessagesSchema = z.object({
  recipients: z.array(z.string()).min(1).max(1000),
  messageType: z.enum(['text', 'template']),
  text: z.string().min(1).max(2000).optional(),
  template: z.object({
    type: z.enum(['generic', 'button']),
    elements: z.array(z.any()).optional(),
    text: z.string().optional(),
    buttons: z.array(z.any()).optional(),
  }).optional(),
  tag: z.enum([
    'CONFIRMED_EVENT_UPDATE',
    'POST_PURCHASE_UPDATE',
    'ACCOUNT_UPDATE',
    'HUMAN_AGENT',
  ]).optional(),
  batchSize: z.number().min(1).max(100).default(50),
  delayBetweenBatches: z.number().min(100).max(10000).default(1000),
});

const conversationFilterSchema = z.object({
  status: z.enum(['active', 'resolved', 'archived', 'blocked']).optional(),
  assignedTo: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const messageFilterSchema = z.object({
  type: z.enum([
    'text', 'image', 'video', 'audio', 'file', 'template',
    'quick_reply', 'postback', 'referral', 'reaction', 'read',
    'delivery', 'location', 'sticker',
  ]).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'resolved', 'archived', 'blocked']),
});

const assignConversationSchema = z.object({
  userId: z.string().uuid().nullable(),
});

const linkConversationSchema = z.object({
  linkType: z.enum(['lead', 'customer', 'contact']),
  entityId: z.string().uuid(),
});

const webhookQuerySchema = z.object({
  'hub.mode': z.string().optional(),
  'hub.verify_token': z.string().optional(),
  'hub.challenge': z.string().optional(),
});

/**
 * Facebook Messenger Routes Plugin
 */
export async function messengerRoutes(fastify: FastifyInstance): Promise<void> {
  const messengerService = container.resolve(MessengerService);

  // ==================== Status & Health ====================

  // Get provider status (legacy - for backward compatibility)
  fastify.get('/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const status = await messengerService.getProviderStatus(tenantId);
    return reply.send({ success: true, data: status });
  });

  // Get health status (comprehensive)
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await messengerService.getHealthStatus(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // ==================== Send Messages ====================

  // Send text message
  fastify.post('/messages/text', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendTextMessageSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, message, leadId, customerId, contactId } = validation.data;

    const result = await messengerService.sendTextMessage(tenantId, to, message, {
      leadId,
      customerId,
      contactId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send generic template
  fastify.post('/messages/template/generic', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendGenericTemplateSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, elements, leadId, customerId, contactId } = validation.data;

    const result = await messengerService.sendGenericTemplate(tenantId, to, elements as any, {
      leadId,
      customerId,
      contactId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send button template
  fastify.post('/messages/template/button', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendButtonTemplateSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, text, buttons, leadId, customerId, contactId } = validation.data;

    const result = await messengerService.sendButtonTemplate(tenantId, to, text, buttons as any, {
      leadId,
      customerId,
      contactId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send media message
  fastify.post('/messages/media', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendMediaMessageSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, mediaType, mediaUrl, isReusable, leadId, customerId, contactId } = validation.data;

    const result = await messengerService.sendMedia(tenantId, to, mediaType, mediaUrl, isReusable, {
      leadId,
      customerId,
      contactId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send tagged message (outside 24h window)
  fastify.post('/messages/tagged', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendTaggedMessageSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, message, tag, leadId, customerId, contactId } = validation.data;

    const result = await messengerService.sendTaggedMessage(tenantId, to, message, tag, {
      leadId,
      customerId,
      contactId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send bulk messages
  fastify.post('/messages/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendBulkMessagesSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const data = validation.data;

    const result = await messengerService.sendBulkMessages(tenantId, {
      recipients: data.recipients,
      messageType: data.messageType === 'text' ? 'RESPONSE' : 'MESSAGE_TAG',
      tag: data.tag,
      message: data.messageType === 'text'
        ? { text: data.text }
        : {
            attachment: {
              type: 'template',
              payload: data.template?.type === 'generic'
                ? {
                    template_type: 'generic',
                    elements: data.template.elements,
                  }
                : {
                    template_type: 'button',
                    text: data.template?.text,
                    buttons: data.template?.buttons,
                  },
            },
          },
      batchSize: data.batchSize,
      delayBetweenBatches: data.delayBetweenBatches,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Conversations ====================

  // Get conversations
  fastify.get('/conversations', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = conversationFilterSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await messengerService.getConversations({
      tenantId,
      ...validation.data,
    });

    if (result.isFailure || !result.value) {
      return reply.status(500).send({ success: false, error: result.error || 'Failed to get conversations' });
    }

    return reply.send({
      success: true,
      data: result.value.conversations,
      meta: {
        total: result.value.total,
        limit: validation.data.limit,
        offset: validation.data.offset,
      },
    });
  });

  // Get conversation by ID
  fastify.get('/conversations/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await messengerService.getConversation(tenantId, request.params.id);

    if (result.isFailure) {
      return reply.status(404).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Get messages for conversation
  fastify.get('/conversations/:id/messages', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = messageFilterSchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const filter = validation.data;

    const result = await messengerService.getMessages({
      conversationId: request.params.id,
      tenantId,
      type: filter.type as any,
      direction: filter.direction,
      limit: filter.limit,
      offset: filter.offset,
      before: filter.before ? new Date(filter.before) : undefined,
      after: filter.after ? new Date(filter.after) : undefined,
    });

    if (result.isFailure || !result.value) {
      return reply.status(500).send({ success: false, error: result.error || 'Failed to get messages' });
    }

    return reply.send({
      success: true,
      data: result.value.messages,
      meta: {
        total: result.value.total,
        limit: filter.limit,
        offset: filter.offset,
      },
    });
  });

  // Mark conversation as read
  fastify.post('/conversations/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await messengerService.markConversationAsRead(tenantId, request.params.id);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // Update conversation status
  fastify.patch('/conversations/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = updateStatusSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await messengerService.updateConversationStatus(
      tenantId,
      request.params.id,
      validation.data.status
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // Assign conversation
  fastify.patch('/conversations/:id/assign', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = assignConversationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await messengerService.assignConversation(
      tenantId,
      request.params.id,
      validation.data.userId
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // Link conversation to CRM entity
  fastify.post('/conversations/:id/link', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = linkConversationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const result = await messengerService.linkConversation(
      tenantId,
      request.params.id,
      validation.data.linkType,
      validation.data.entityId
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true });
  });

  // ==================== Statistics ====================

  // Get conversation statistics
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await messengerService.getConversationStats(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // ==================== Webhook ====================

  // Webhook verification (GET)
  fastify.get('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = webhookQuerySchema.safeParse(request.query);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: 'Invalid webhook parameters' });
    }

    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = validation.data;

    if (!mode || !token || !challenge) {
      return reply.status(400).send({ success: false, error: 'Missing webhook parameters' });
    }

    const result = messengerService.verifyWebhookChallenge(mode, token, challenge);

    if (result.verified) {
      return reply.send(result.challenge);
    }

    return reply.status(403).send({ success: false, error: 'Webhook verification failed' });
  });

  // Webhook handler (POST)
  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string || process.env.DEFAULT_TENANT_ID;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    // Verify signature if app secret is configured
    const appSecret = process.env.MESSENGER_APP_SECRET;
    if (appSecret) {
      const signature = request.headers['x-hub-signature-256'] as string;
      const payload = JSON.stringify(request.body);

      if (!messengerService.verifyWebhookSignature(payload, signature, appSecret)) {
        return reply.status(401).send({ success: false, error: 'Invalid signature' });
      }
    }

    // Process webhook
    const result = await messengerService.processWebhook(tenantId, request.body as any);

    if (result.isFailure) {
      console.error('Messenger webhook processing error:', result.error);
      // Return 200 to acknowledge receipt even on error (Meta will retry otherwise)
      return reply.send({ success: true, warning: 'Partial processing' });
    }

    return reply.send({ success: true, data: result.value });
  });
}
