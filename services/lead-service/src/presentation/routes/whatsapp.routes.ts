/**
 * WhatsApp Routes
 * REST API endpoints for WhatsApp messaging
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { WhatsAppService } from '../../infrastructure/whatsapp';

// Validation schemas
const sendTextMessageSchema = z.object({
  to: z.string().min(10).max(20),
  message: z.string().min(1).max(4096),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

const sendTemplateMessageSchema = z.object({
  to: z.string().min(10).max(20),
  templateName: z.string().min(1).max(255),
  languageCode: z.string().min(2).max(10).default('en'),
  components: z.array(z.object({
    type: z.enum(['header', 'body', 'button']),
    sub_type: z.enum(['quick_reply', 'url']).optional(),
    index: z.number().optional(),
    parameters: z.array(z.object({
      type: z.enum(['text', 'currency', 'date_time', 'image', 'document', 'video']),
      text: z.string().optional(),
    })),
  })).optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

const sendBulkTemplateSchema = z.object({
  recipients: z.array(z.string()).min(1).max(1000),
  templateName: z.string().min(1).max(255),
  languageCode: z.string().min(2).max(10).default('en'),
  components: z.array(z.any()).optional(),
  batchSize: z.number().min(1).max(100).default(50),
  delayBetweenBatches: z.number().min(100).max(10000).default(1000),
});

const conversationFilterSchema = z.object({
  status: z.enum(['active', 'resolved', 'archived', 'blocked']).optional(),
  assignedTo: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  unreadOnly: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const messageFilterSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts', 'interactive', 'template', 'reaction']).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
  limit: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
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
 * WhatsApp Routes Plugin
 */
export async function whatsappRoutes(fastify: FastifyInstance): Promise<void> {
  const whatsappService = container.resolve(WhatsAppService);

  // Get provider status
  fastify.get('/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = await whatsappService.getProviderStatus();
    return reply.send({ success: true, data: status });
  });

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

    const result = await whatsappService.sendTextMessage(tenantId, to, message, {
      leadId,
      customerId,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send template message
  fastify.post('/messages/template', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendTemplateMessageSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { to, templateName, languageCode, components, leadId, customerId } = validation.data;

    const result = await whatsappService.sendTemplateMessage(
      tenantId,
      to,
      templateName,
      languageCode,
      components as any,
      { leadId, customerId }
    );

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.status(201).send({ success: true, data: result.value });
  });

  // Send bulk template messages
  fastify.post('/messages/bulk', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = sendBulkTemplateSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { recipients, templateName, languageCode, components, batchSize, delayBetweenBatches } = validation.data;

    const result = await whatsappService.sendBulkTemplateMessages(tenantId, {
      recipients,
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components as any,
      },
      batchSize,
      delayBetweenBatches,
    });

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

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

    const result = await whatsappService.getConversations({
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

    const result = await whatsappService.getConversation(tenantId, request.params.id);

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

    const result = await whatsappService.getMessages({
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

    const result = await whatsappService.markConversationAsRead(tenantId, request.params.id);

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

    const result = await whatsappService.updateConversationStatus(
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

    const result = await whatsappService.assignConversation(
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

    const result = await whatsappService.linkConversation(
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

  // Get conversation statistics
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await whatsappService.getConversationStats(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Get templates
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await whatsappService.getTemplates(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

  // Sync templates from provider
  fastify.post('/templates/sync', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({ success: false, error: 'Tenant ID required' });
    }

    const result = await whatsappService.syncTemplates(tenantId);

    if (result.isFailure) {
      return reply.status(500).send({ success: false, error: result.error });
    }

    return reply.send({ success: true, data: result.value });
  });

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

    const result = whatsappService.verifyWebhookChallenge(mode, token, challenge);

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
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      const signature = request.headers['x-hub-signature-256'] as string;
      const payload = JSON.stringify(request.body);

      if (!whatsappService.verifyWebhookSignature(payload, signature, appSecret)) {
        return reply.status(401).send({ success: false, error: 'Invalid signature' });
      }
    }

    // Process webhook
    const result = await whatsappService.processWebhook(tenantId, request.body as any);

    if (result.isFailure) {
      console.error('Webhook processing error:', result.error);
      // Return 200 to acknowledge receipt even on error (Meta will retry otherwise)
      return reply.send({ success: true, warning: 'Partial processing' });
    }

    return reply.send({ success: true, data: result.value });
  });
}
