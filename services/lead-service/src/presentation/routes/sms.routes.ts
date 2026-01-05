/**
 * SMS Routes
 * REST API endpoints for SMS communication
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { SmsService } from '../../infrastructure/sms';
import {
  SendSmsInput,
  SendBulkSmsInput,
  ListSmsOptions,
  SmsDirection,
  SmsStatus,
} from '../../infrastructure/sms/types';

// Request schemas
interface SendSmsBody {
  to: string;
  body: string;
  from?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkToEntityId?: string;
  metadata?: Record<string, unknown>;
}

interface SendBulkSmsBody {
  recipients: Array<{
    to: string;
    variables?: Record<string, string>;
    linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
    linkToEntityId?: string;
  }>;
  body?: string;
  templateId?: string;
  from?: string;
  metadata?: Record<string, unknown>;
}

interface ListSmsQuery {
  direction?: SmsDirection;
  status?: SmsStatus;
  from?: string;
  to?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface SmsParams {
  id: string;
}

interface TemplateParams {
  templateId: string;
}

interface CreateTemplateBody {
  name: string;
  body: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface UpdateTemplateBody {
  name?: string;
  body?: string;
  description?: string;
  category?: string;
  tags?: string[];
  isActive?: boolean;
}

interface StatsQuery {
  dateFrom?: string;
  dateTo?: string;
}

export async function smsRoutes(fastify: FastifyInstance): Promise<void> {
  const smsService = container.resolve<SmsService>('SmsService');

  /**
   * Check if SMS is available
   * GET /api/v1/sms/status
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
          available: smsService.isAvailable(),
          providers: smsService.getAvailableProviders(),
        },
      });
    }
  );

  /**
   * Send single SMS
   * POST /api/v1/sms/send
   */
  fastify.post(
    '/send',
    async (
      request: FastifyRequest<{ Body: SendSmsBody }>,
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

      if (!body.to) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Recipient phone number is required',
        });
      }

      if (!body.body && !body.templateId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Message body or template ID is required',
        });
      }

      const input: SendSmsInput = {
        to: body.to,
        body: body.body || '',
        from: body.from,
        templateId: body.templateId,
        templateVariables: body.templateVariables,
        linkToEntityType: body.linkToEntityType,
        linkToEntityId: body.linkToEntityId,
        metadata: body.metadata,
      };

      const result = await smsService.sendSms(tenantId, userId, input);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Send Failed',
          message: result.error || 'Failed to send SMS',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Send bulk SMS
   * POST /api/v1/sms/send-bulk
   */
  fastify.post(
    '/send-bulk',
    async (
      request: FastifyRequest<{ Body: SendBulkSmsBody }>,
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

      if (!body.recipients || body.recipients.length === 0) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'At least one recipient is required',
        });
      }

      if (!body.body && !body.templateId) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Message body or template ID is required',
        });
      }

      const input: SendBulkSmsInput = {
        recipients: body.recipients,
        body: body.body,
        templateId: body.templateId,
        from: body.from,
        metadata: body.metadata,
      };

      const result = await smsService.sendBulkSms(tenantId, userId, input);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Bulk Send Failed',
          message: result.error || 'Failed to send bulk SMS',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * List SMS messages
   * GET /api/v1/sms
   */
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListSmsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const query = request.query;

      const options: ListSmsOptions = {
        direction: query.direction,
        status: query.status,
        from: query.from,
        to: query.to,
        linkedEntityType: query.linkedEntityType,
        linkedEntityId: query.linkedEntityId,
        userId: query.userId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        search: query.search,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };

      const result = await smsService.listSms(tenantId, options);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list SMS messages',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get SMS by ID
   * GET /api/v1/sms/:id
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: SmsParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await smsService.getSmsById(id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get SMS',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'SMS message not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get SMS statistics
   * GET /api/v1/sms/stats
   */
  fastify.get(
    '/stats',
    async (
      request: FastifyRequest<{ Querystring: StatsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { dateFrom, dateTo } = request.query;

      const result = await smsService.getStats(
        tenantId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get SMS stats',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get SMS for entity
   * GET /api/v1/sms/entity/:entityType/:entityId
   */
  fastify.get(
    '/entity/:entityType/:entityId',
    async (
      request: FastifyRequest<{
        Params: { entityType: string; entityId: string };
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { entityType, entityId } = request.params;
      const { page, limit } = request.query;

      const result = await smsService.listSms(tenantId, {
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list SMS for entity',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  // ==================== Webhook Endpoints ====================

  /**
   * Twilio incoming SMS webhook
   * POST /api/v1/sms/webhooks/twilio/incoming
   */
  fastify.post(
    '/webhooks/twilio/incoming',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const result = await smsService.handleIncomingSms(request.body, 'twilio');

      if (result.isFailure) {
        console.error('Failed to handle incoming SMS:', result.error);
        // Still return 200 to acknowledge receipt
      }

      // Return TwiML response (empty to not send auto-reply)
      reply.header('Content-Type', 'text/xml');
      return reply.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  );

  /**
   * Twilio status webhook
   * POST /api/v1/sms/webhooks/twilio/status
   */
  fastify.post(
    '/webhooks/twilio/status',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const result = await smsService.handleStatusWebhook(request.body, 'twilio');

      if (result.isFailure) {
        console.error('Failed to handle status webhook:', result.error);
      }

      return reply.status(200).send({ received: true });
    }
  );

  // ==================== Template Endpoints ====================

  /**
   * Create SMS template
   * POST /api/v1/sms/templates
   */
  fastify.post(
    '/templates',
    async (
      request: FastifyRequest<{ Body: CreateTemplateBody }>,
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

      if (!body.name || !body.body) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Template name and body are required',
        });
      }

      const result = await smsService.createTemplate(tenantId, userId, {
        name: body.name,
        body: body.body,
        description: body.description,
        category: body.category,
        tags: body.tags,
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Creation Failed',
          message: result.error || 'Failed to create template',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * List SMS templates
   * GET /api/v1/sms/templates
   */
  fastify.get(
    '/templates',
    async (
      request: FastifyRequest<{
        Querystring: { category?: string; search?: string; isActive?: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { category, search, isActive } = request.query;

      const result = await smsService.listTemplates(tenantId, {
        category,
        search,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list templates',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get template by ID
   * GET /api/v1/sms/templates/:templateId
   */
  fastify.get(
    '/templates/:templateId',
    async (
      request: FastifyRequest<{ Params: TemplateParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { templateId } = request.params;

      const result = await smsService.getTemplateById(templateId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get template',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Template not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Update template
   * PATCH /api/v1/sms/templates/:templateId
   */
  fastify.patch(
    '/templates/:templateId',
    async (
      request: FastifyRequest<{
        Params: TemplateParams;
        Body: UpdateTemplateBody;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { templateId } = request.params;

      const result = await smsService.updateTemplate(
        templateId,
        tenantId,
        request.body
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Update Failed',
          message: result.error || 'Failed to update template',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Delete template
   * DELETE /api/v1/sms/templates/:templateId
   */
  fastify.delete(
    '/templates/:templateId',
    async (
      request: FastifyRequest<{ Params: TemplateParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { templateId } = request.params;

      const result = await smsService.deleteTemplate(templateId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Delete Failed',
          message: result.error || 'Failed to delete template',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Template deleted successfully',
      });
    }
  );
}
