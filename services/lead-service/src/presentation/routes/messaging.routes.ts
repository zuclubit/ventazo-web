/**
 * Unified Messaging Routes
 * API endpoints for unified multi-channel messaging
 *
 * This module provides a unified API for managing messages across
 * different channels (Email, SMS, WhatsApp, Push, Internal).
 *
 * @module presentation/routes/messaging.routes
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import { getTenantId, getUserId } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import { HttpError } from '../middlewares/error-handler.middleware';
import {
  listMessagesQuerySchema,
  messageIdParamsSchema,
  sendMessageSchema,
  sendBulkMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  previewTemplateSchema,
  type ListMessagesQuery,
  type MessageIdParams,
  type SendMessageInput,
  type SendBulkMessageInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type PreviewTemplateInput,
  type MessageResponse,
  type MessageStatsResponse,
  type MessageTemplateResponse,
  type TemplatePreviewResponse,
  type BulkMessageResultResponse,
  MESSAGE_CHANNELS,
  MESSAGE_STATUSES,
} from '../schemas/messaging.schema';
import { DatabasePool } from '../../infrastructure/database/pool';
import { ResendProvider } from '../../infrastructure/email/resend.provider';
import { getResendConfig } from '../../config/environment';

// ============================================
// Type Definitions
// ============================================

interface MessageRow {
  id: string;
  tenant_id: string;
  channel: string;
  to_address: string;
  from_address?: string;
  subject?: string;
  body: string;
  template_id?: string;
  status: string;
  error?: string;
  error_message?: string;
  attempts?: number;
  provider_message_id?: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  sent_at?: Date;
  delivered_at?: Date;
}

interface TemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  channel: string;
  subject_template?: string;
  body_template: string;
  variables: unknown[];
  is_active: boolean;
  category?: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ============================================
// Mappers
// ============================================

function mapRowToMessageResponse(row: MessageRow): MessageResponse {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    channel: row.channel as MessageResponse['channel'],
    to: row.to_address,
    from: row.from_address,
    subject: row.subject,
    body: row.body,
    templateId: row.template_id,
    status: row.status as MessageResponse['status'],
    error: row.error,
    errorMessage: row.error_message,
    attempts: row.attempts,
    providerMessageId: row.provider_message_id,
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    sentAt: row.sent_at?.toISOString() || null,
    deliveredAt: row.delivered_at?.toISOString() || null,
  };
}

function mapRowToTemplateResponse(row: TemplateRow): MessageTemplateResponse {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    channel: row.channel as MessageTemplateResponse['channel'],
    subjectTemplate: row.subject_template,
    bodyTemplate: row.body_template,
    variables: (row.variables || []) as MessageTemplateResponse['variables'],
    isActive: row.is_active,
    category: row.category,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    createdBy: row.created_by,
  };
}

/**
 * Interpolates template variables
 */
function interpolateTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().split('.');
    let value: unknown = variables;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return `{{${path}}}`;
      }
    }

    return String(value ?? '');
  });
}

// ============================================
// Routes
// ============================================

export async function messagingRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  // Register JSON schemas for Fastify serialization
  if (!server.getSchemas()['Message']) {
    server.addSchema({
      $id: 'Message',
      type: 'object',
      properties: {
        id: { type: 'string' },
        tenantId: { type: 'string' },
        channel: { type: 'string' },
        to: { type: 'string' },
        from: { type: ['string', 'null'] },
        subject: { type: ['string', 'null'] },
        body: { type: 'string' },
        templateId: { type: ['string', 'null'] },
        status: { type: 'string' },
        error: { type: ['string', 'null'] },
        errorMessage: { type: ['string', 'null'] },
        attempts: { type: ['integer', 'null'] },
        providerMessageId: { type: ['string', 'null'] },
        metadata: { type: ['object', 'null'] },
        createdAt: { type: 'string' },
        sentAt: { type: ['string', 'null'] },
        deliveredAt: { type: ['string', 'null'] },
      },
    });
  }

  if (!server.getSchemas()['MessageStats']) {
    server.addSchema({
      $id: 'MessageStats',
      type: 'object',
      properties: {
        totalSent: { type: 'integer' },
        totalDelivered: { type: 'integer' },
        totalFailed: { type: 'integer' },
        totalPending: { type: 'integer' },
        byChannel: { type: 'object' },
        byStatus: { type: 'object' },
        deliveryRate: { type: 'number' },
        failureRate: { type: 'number' },
      },
    });
  }

  if (!server.getSchemas()['MessageTemplate']) {
    server.addSchema({
      $id: 'MessageTemplate',
      type: 'object',
      properties: {
        id: { type: 'string' },
        tenantId: { type: 'string' },
        name: { type: 'string' },
        description: { type: ['string', 'null'] },
        channel: { type: 'string' },
        subjectTemplate: { type: ['string', 'null'] },
        bodyTemplate: { type: 'string' },
        variables: { type: 'array' },
        isActive: { type: 'boolean' },
        category: { type: ['string', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        createdBy: { type: ['string', 'null'] },
      },
    });
  }

  const pool = container.resolve<DatabasePool>('DatabasePool');

  // Initialize Resend provider
  const resendConfig = getResendConfig();
  let resendProvider: ResendProvider | null = null;

  if (resendConfig.isEnabled) {
    resendProvider = new ResendProvider();
    const initResult = await resendProvider.initialize({
      apiKey: resendConfig.apiKey,
      fromEmail: resendConfig.fromEmail,
      fromName: resendConfig.fromName,
    });

    if (initResult.isFailure) {
      console.warn('[MessagingRoutes] Failed to initialize Resend:', initResult.error);
      resendProvider = null;
    } else {
      console.log('[MessagingRoutes] Resend provider initialized successfully');
    }
  } else {
    console.log('[MessagingRoutes] Resend not configured, email sending disabled');
  }

  // ============================================
  // GET /messages - List messages (unified)
  // ============================================
  server.get<{
    Querystring: ListMessagesQuery;
  }>(
    '/',
    {
      preHandler: validate({ querystring: listMessagesQuerySchema }),
      schema: {
        description: 'List messages across all channels with optional filters',
        tags: ['Messages'],
        querystring: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
            status: { type: 'string', enum: [...MESSAGE_STATUSES] },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            search: { type: 'string' },
            limit: { type: 'integer', default: 20, maximum: 100 },
            offset: { type: 'integer', default: 0 },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { $ref: 'Message' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: ListMessagesQuery }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { channel, status, startDate, endDate, search, limit, offset } = request.query;

      // Build query for unified messages table or union across channel tables
      // Fixed to match actual sms_messages table schema
      let sql = `
        SELECT
          id, tenant_id, 'sms' as channel, to_number as to_address, from_number as from_address,
          NULL as subject, body, NULL as template_id, status, error_message as error,
          0 as attempts, external_id as provider_message_id, NULL as metadata, created_at, sent_at, delivered_at
        FROM sms_messages
        WHERE tenant_id = $1
      `;
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      // Add filters
      if (channel === 'sms') {
        // Already filtered by the base query
      } else if (channel) {
        // For other channels, we'd need to union different tables
        // For now, return empty if not sms (to be extended)
        return reply.status(200).send([]);
      }

      if (status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (startDate) {
        sql += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        sql += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      if (search) {
        sql += ` AND (to_number ILIKE $${paramIndex} OR body ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit || 20, offset || 0);

      const result = await pool.query(sql, params);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch messages');
      }

      const messages = result.getValue().rows.map(mapRowToMessageResponse);

      return reply.status(200).send(messages);
    }
  );

  // ============================================
  // GET /messages/stats - Get message statistics
  // ============================================
  server.get(
    '/stats',
    {
      schema: {
        description: 'Get message statistics across all channels',
        tags: ['Messages'],
        response: {
          200: { $ref: 'MessageStats' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      // Query stats from SMS messages (to be extended for other channels)
      const sql = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) as total_sent,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          status,
          COUNT(*) as status_count
        FROM sms_messages
        WHERE tenant_id = $1
        GROUP BY GROUPING SETS ((), (status))
      `;

      const result = await pool.query(sql, [tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch message stats');
      }

      const rows = result.getValue().rows;
      const totalsRow = rows.find((r) => r.status === null) || {};

      // Initialize channel and status counts
      const byChannel: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      MESSAGE_CHANNELS.forEach((c) => {
        byChannel[c] = 0;
      });
      MESSAGE_STATUSES.forEach((s) => {
        byStatus[s] = 0;
      });

      // For now, all are SMS
      byChannel['sms'] = parseInt(totalsRow.total || '0', 10);

      rows
        .filter((r) => r.status !== null)
        .forEach((r) => {
          byStatus[r.status] = parseInt(r.status_count, 10);
        });

      const stats: MessageStatsResponse = {
        total: parseInt(totalsRow.total || '0', 10),
        totalSent: parseInt(totalsRow.total_sent || '0', 10),
        sent: parseInt(totalsRow.sent || '0', 10),
        delivered: parseInt(totalsRow.delivered || '0', 10),
        failed: parseInt(totalsRow.failed || '0', 10),
        pending: parseInt(totalsRow.pending || '0', 10),
        byChannel: byChannel as MessageStatsResponse['byChannel'],
        byStatus: byStatus as MessageStatsResponse['byStatus'],
      };

      return reply.status(200).send(stats);
    }
  );

  // ============================================
  // GET /messages/:id - Get message by ID
  // ============================================
  server.get<{
    Params: MessageIdParams;
  }>(
    '/:id',
    {
      preHandler: validate({ params: messageIdParamsSchema }),
      schema: {
        description: 'Get a specific message by ID',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { $ref: 'Message' },
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
    async (request: FastifyRequest<{ Params: MessageIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;

      // Try SMS messages first
      const sql = `
        SELECT
          id, tenant_id, 'sms' as channel, to_number as to_address, from_number as from_address,
          NULL as subject, body, template_id, status, error, NULL as error_message,
          attempts, provider_message_id, metadata, created_at, sent_at, delivered_at
        FROM sms_messages
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(sql, [id, tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch message');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Message not found: ${id}`);
      }

      const message = mapRowToMessageResponse(result.getValue().rows[0]);

      return reply.status(200).send(message);
    }
  );

  // ============================================
  // POST /messages/send - Send a message
  // ============================================
  server.post<{
    Body: SendMessageInput;
  }>(
    '/send',
    {
      preHandler: validate({ body: sendMessageSchema }),
      schema: {
        description: 'Send a message through the specified channel',
        tags: ['Messages'],
        body: {
          type: 'object',
          required: ['channel', 'to'],
          properties: {
            channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
            to: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            templateId: { type: 'string', format: 'uuid' },
            templateVariables: { type: 'object' },
            metadata: { type: 'object' },
          },
        },
        response: {
          201: { $ref: 'Message' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SendMessageInput }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { channel, to, subject, body, templateId, templateVariables, metadata } = request.body;

      let finalBody = body || '';
      let finalSubject = subject;

      // If using template, resolve it
      if (templateId) {
        const templateSql = `
          SELECT * FROM message_templates
          WHERE id = $1 AND tenant_id = $2 AND is_active = true
        `;
        const templateResult = await pool.query(templateSql, [templateId, tenantId]);

        if (templateResult.isFailure || templateResult.getValue().rows.length === 0) {
          throw new HttpError(404, 'Not Found', `Template not found or inactive: ${templateId}`);
        }

        const template = templateResult.getValue().rows[0];
        finalBody = interpolateTemplate(template.body_template, templateVariables || {});
        if (template.subject_template) {
          finalSubject = interpolateTemplate(template.subject_template, templateVariables || {});
        }
      }

      // Route to appropriate channel service
      let messageId: string;
      let messageResponse: MessageResponse;

      switch (channel) {
        case 'sms': {
          // Insert into sms_messages
          const id = uuidv4();
          const now = new Date();

          const insertSql = `
            INSERT INTO sms_messages (
              id, tenant_id, user_id, to_number, from_number, body,
              template_id, status, metadata, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
            RETURNING *,
              'sms' as channel,
              to_number as to_address,
              from_number as from_address,
              NULL as subject,
              NULL as error_message
          `;

          const result = await pool.query(insertSql, [
            id,
            tenantId,
            userId,
            to,
            process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            finalBody,
            templateId,
            'pending',
            JSON.stringify({ ...metadata, triggeredBy: 'manual' }),
            now,
            now,
          ]);

          if (result.isFailure) {
            throw new HttpError(500, 'Internal Server Error', 'Failed to create SMS message');
          }

          messageResponse = mapRowToMessageResponse(result.getValue().rows[0]);
          messageId = id;

          // TODO: Trigger actual SMS sending via queue/service
          break;
        }

        case 'email': {
          // Send email via Resend provider
          messageId = uuidv4();
          const now = new Date();
          let emailStatus: 'sent' | 'failed' | 'pending' = 'pending';
          let emailError: string | undefined;
          let providerMessageId: string | undefined;

          if (resendProvider) {
            const emailResult = await resendProvider.send({
              to,
              subject: finalSubject || 'Message from Zuclubit CRM',
              html: finalBody,
              tags: [
                { name: 'type', value: 'manual-message' },
                { name: 'tenantId', value: tenantId },
                { name: 'messageId', value: messageId },
              ],
            });

            if (emailResult.isSuccess) {
              const result = emailResult.getValue();
              if (result.success) {
                emailStatus = 'sent';
                providerMessageId = result.messageId;
              } else {
                emailStatus = 'failed';
                emailError = result.error;
              }
            } else {
              emailStatus = 'failed';
              emailError = emailResult.error || 'Unknown error';
            }
          } else {
            emailStatus = 'failed';
            emailError = 'Email provider not configured';
          }

          // Store email in database (optional - for tracking)
          try {
            const insertEmailSql = `
              INSERT INTO email_messages (
                id, tenant_id, user_id, to_address, from_address, subject, body,
                template_id, status, error, provider_message_id, metadata, created_at, sent_at, updated_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
              )
            `;
            await pool.query(insertEmailSql, [
              messageId,
              tenantId,
              userId,
              to,
              `${resendConfig.fromName} <${resendConfig.fromEmail}>`,
              finalSubject,
              finalBody,
              templateId,
              emailStatus,
              emailError,
              providerMessageId,
              JSON.stringify({ ...metadata, triggeredBy: 'manual' }),
              now,
              emailStatus === 'sent' ? now : null,
              now,
            ]);
          } catch (dbError) {
            // Log but don't fail - email was already sent
            console.warn('[MessagingRoutes] Failed to store email record:', dbError);
          }

          messageResponse = {
            id: messageId,
            tenantId,
            channel: 'email',
            to,
            from: `${resendConfig.fromName} <${resendConfig.fromEmail}>`,
            subject: finalSubject,
            body: finalBody,
            templateId,
            status: emailStatus,
            error: emailError,
            providerMessageId,
            metadata: metadata as Record<string, unknown>,
            createdAt: now.toISOString(),
            sentAt: emailStatus === 'sent' ? now.toISOString() : null,
            deliveredAt: null,
          };
          break;
        }

        case 'whatsapp': {
          // For WhatsApp, similar pattern
          messageId = uuidv4();
          messageResponse = {
            id: messageId,
            tenantId,
            channel: 'whatsapp',
            to,
            body: finalBody,
            templateId,
            status: 'pending',
            metadata: metadata as Record<string, unknown>,
            createdAt: new Date().toISOString(),
            sentAt: null,
            deliveredAt: null,
          };
          break;
        }

        case 'push': {
          // For push notifications
          messageId = uuidv4();
          messageResponse = {
            id: messageId,
            tenantId,
            channel: 'push',
            to,
            subject: finalSubject,
            body: finalBody,
            status: 'pending',
            metadata: metadata as Record<string, unknown>,
            createdAt: new Date().toISOString(),
            sentAt: null,
            deliveredAt: null,
          };
          break;
        }

        case 'internal': {
          // For internal notifications, create in notifications table
          const id = uuidv4();
          const now = new Date();

          const insertSql = `
            INSERT INTO notifications (
              id, tenant_id, type, priority, recipient_user_id,
              channel, status, title, body, metadata, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            )
            RETURNING *
          `;

          const result = await pool.query(insertSql, [
            id,
            tenantId,
            'system',
            'medium',
            to, // to is the userId for internal
            'in_app',
            'sent',
            finalSubject || 'Message',
            finalBody,
            JSON.stringify(metadata || {}),
            now,
            now,
          ]);

          if (result.isFailure) {
            throw new HttpError(500, 'Internal Server Error', 'Failed to create internal message');
          }

          messageResponse = {
            id,
            tenantId,
            channel: 'internal',
            to,
            subject: finalSubject,
            body: finalBody,
            status: 'sent',
            metadata: metadata as Record<string, unknown>,
            createdAt: now.toISOString(),
            sentAt: now.toISOString(),
            deliveredAt: null,
          };
          break;
        }

        default:
          throw new HttpError(400, 'Bad Request', `Unsupported channel: ${channel}`);
      }

      return reply.status(201).send(messageResponse);
    }
  );

  // ============================================
  // POST /messages/send-bulk - Send bulk messages
  // ============================================
  server.post<{
    Body: SendBulkMessageInput;
  }>(
    '/send-bulk',
    {
      preHandler: validate({ body: sendBulkMessageSchema }),
      schema: {
        description: 'Send messages to multiple recipients',
        tags: ['Messages'],
        body: {
          type: 'object',
          required: ['channel', 'recipients'],
          properties: {
            channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
            recipients: { type: 'array', items: { type: 'object' } },
            templateId: { type: 'string', format: 'uuid' },
            subject: { type: 'string' },
            body: { type: 'string' },
            scheduleAt: { type: 'string', format: 'date-time' },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              total: { type: 'integer' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SendBulkMessageInput }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { channel, recipients, templateId, subject, body, scheduleAt } = request.body;

      const batchId = uuidv4();
      const results: BulkMessageResultResponse['results'] = [];

      // Process each recipient
      for (const recipient of recipients) {
        try {
          let finalBody = body || '';
          let finalSubject = subject;

          // Resolve template if provided
          if (templateId) {
            const templateSql = `
              SELECT * FROM message_templates
              WHERE id = $1 AND tenant_id = $2
            `;
            const templateResult = await pool.query(templateSql, [templateId, tenantId]);

            if (templateResult.getValue()?.rows.length > 0) {
              const template = templateResult.getValue().rows[0];
              const variables = { ...recipient.variables, ...recipient.metadata };
              finalBody = interpolateTemplate(template.body_template, variables);
              if (template.subject_template) {
                finalSubject = interpolateTemplate(template.subject_template, variables);
              }
            }
          }

          // Create message based on channel (simplified for bulk)
          const messageId = uuidv4();

          results.push({
            to: recipient.to,
            success: true,
            messageId,
          });
        } catch (error) {
          results.push({
            to: recipient.to,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const response: BulkMessageResultResponse = {
        id: batchId,
        total: recipients.length,
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        pending: 0,
        status: 'processing',
        results,
      };

      return reply.status(202).send(response);
    }
  );

  // ============================================
  // POST /messages/:id/retry - Retry failed message
  // ============================================
  server.post<{
    Params: MessageIdParams;
  }>(
    '/:id/retry',
    {
      preHandler: validate({ params: messageIdParamsSchema }),
      schema: {
        description: 'Retry sending a failed message',
        tags: ['Messages'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        response: {
          200: { $ref: 'Message' },
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
    async (request: FastifyRequest<{ Params: MessageIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;

      // Update status back to pending and increment attempts
      const sql = `
        UPDATE sms_messages
        SET status = 'pending', attempts = COALESCE(attempts, 0) + 1, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'failed'
        RETURNING *,
          'sms' as channel,
          to_number as to_address,
          from_number as from_address,
          NULL as subject,
          NULL as error_message
      `;

      const result = await pool.query(sql, [id, tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to retry message');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Message not found or not in failed state: ${id}`);
      }

      const message = mapRowToMessageResponse(result.getValue().rows[0]);

      // TODO: Trigger actual retry via queue/service

      return reply.status(200).send(message);
    }
  );

  // ============================================
  // MESSAGE TEMPLATES ENDPOINTS
  // ============================================

  // ============================================
  // GET /message-templates - List templates
  // ============================================
  server.get(
    '-templates',
    {
      schema: {
        description: 'List message templates',
        tags: ['Message Templates'],
        querystring: {
          type: 'object',
          properties: {
            channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
          },
        },
        response: {
          200: {
            type: 'array',
            items: { $ref: 'MessageTemplate' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { channel?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);
      const { channel } = request.query;

      let sql = `
        SELECT * FROM message_templates
        WHERE tenant_id = $1
      `;
      const params: unknown[] = [tenantId];

      if (channel) {
        sql += ` AND channel = $2`;
        params.push(channel);
      }

      sql += ` ORDER BY created_at DESC`;

      const result = await pool.query(sql, params);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch templates');
      }

      const templates = result.getValue().rows.map(mapRowToTemplateResponse);

      return reply.status(200).send(templates);
    }
  );

  // ============================================
  // GET /message-templates/:id - Get template by ID
  // ============================================
  server.get<{
    Params: MessageIdParams;
  }>(
    '-templates/:id',
    {
      preHandler: validate({ params: messageIdParamsSchema }),
      schema: {
        description: 'Get a specific message template',
        tags: ['Message Templates'],
        response: {
          200: { $ref: 'MessageTemplate' },
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
    async (request: FastifyRequest<{ Params: MessageIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;

      const sql = `
        SELECT * FROM message_templates
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(sql, [id, tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to fetch template');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Template not found: ${id}`);
      }

      const template = mapRowToTemplateResponse(result.getValue().rows[0]);

      return reply.status(200).send(template);
    }
  );

  // ============================================
  // POST /message-templates - Create template
  // ============================================
  server.post<{
    Body: CreateTemplateInput;
  }>(
    '-templates',
    {
      preHandler: validate({ body: createTemplateSchema }),
      schema: {
        description: 'Create a new message template',
        tags: ['Message Templates'],
        response: {
          201: { $ref: 'MessageTemplate' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateTemplateInput }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { name, description, channel, subjectTemplate, bodyTemplate, variables, category } =
        request.body;

      const id = uuidv4();
      const now = new Date();

      const sql = `
        INSERT INTO message_templates (
          id, tenant_id, name, description, channel, subject_template,
          body_template, variables, is_active, category, created_by,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `;

      const result = await pool.query(sql, [
        id,
        tenantId,
        name,
        description,
        channel,
        subjectTemplate,
        bodyTemplate,
        JSON.stringify(variables || []),
        true,
        category,
        userId,
        now,
        now,
      ]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to create template');
      }

      const template = mapRowToTemplateResponse(result.getValue().rows[0]);

      return reply.status(201).send(template);
    }
  );

  // ============================================
  // PATCH /message-templates/:id - Update template
  // ============================================
  server.patch<{
    Params: MessageIdParams;
    Body: UpdateTemplateInput;
  }>(
    '-templates/:id',
    {
      preHandler: validate({ params: messageIdParamsSchema, body: updateTemplateSchema }),
      schema: {
        description: 'Update a message template',
        tags: ['Message Templates'],
        response: {
          200: { $ref: 'MessageTemplate' },
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
    async (
      request: FastifyRequest<{ Params: MessageIdParams; Body: UpdateTemplateInput }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;
      const updates = request.body;

      // Build dynamic update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      const fieldMapping: Record<string, string> = {
        name: 'name',
        description: 'description',
        channel: 'channel',
        subjectTemplate: 'subject_template',
        bodyTemplate: 'body_template',
        category: 'category',
        isActive: 'is_active',
      };

      for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (updates[key as keyof UpdateTemplateInput] !== undefined) {
          setClauses.push(`${dbField} = $${paramIndex}`);
          params.push(updates[key as keyof UpdateTemplateInput]);
          paramIndex++;
        }
      }

      if (updates.variables) {
        setClauses.push(`variables = $${paramIndex}`);
        params.push(JSON.stringify(updates.variables));
        paramIndex++;
      }

      params.push(id, tenantId);

      const sql = `
        UPDATE message_templates
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await pool.query(sql, params);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to update template');
      }

      if (result.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Template not found: ${id}`);
      }

      const template = mapRowToTemplateResponse(result.getValue().rows[0]);

      return reply.status(200).send(template);
    }
  );

  // ============================================
  // DELETE /message-templates/:id - Delete template
  // ============================================
  server.delete<{
    Params: MessageIdParams;
  }>(
    '-templates/:id',
    {
      preHandler: validate({ params: messageIdParamsSchema }),
      schema: {
        description: 'Delete a message template',
        tags: ['Message Templates'],
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
    async (request: FastifyRequest<{ Params: MessageIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { id } = request.params;

      const sql = `
        DELETE FROM message_templates
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await pool.query(sql, [id, tenantId]);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to delete template');
      }

      if (result.getValue().rowCount === 0) {
        throw new HttpError(404, 'Not Found', `Template not found: ${id}`);
      }

      return reply.status(204).send();
    }
  );

  // ============================================
  // POST /message-templates/preview - Preview template
  // ============================================
  server.post<{
    Body: PreviewTemplateInput;
  }>(
    '-templates/preview',
    {
      preHandler: validate({ body: previewTemplateSchema }),
      schema: {
        description: 'Preview a template with variables',
        tags: ['Message Templates'],
        response: {
          200: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              body: { type: 'string' },
              errors: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: PreviewTemplateInput }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const { templateId, bodyTemplate, subjectTemplate, variables, context } = request.body;

      let finalBodyTemplate = bodyTemplate;
      let finalSubjectTemplate = subjectTemplate;

      // If templateId provided, fetch template
      if (templateId) {
        const sql = `
          SELECT * FROM message_templates
          WHERE id = $1 AND tenant_id = $2
        `;

        const result = await pool.query(sql, [templateId, tenantId]);

        if (result.getValue()?.rows.length > 0) {
          const template = result.getValue().rows[0];
          finalBodyTemplate = finalBodyTemplate || template.body_template;
          finalSubjectTemplate = finalSubjectTemplate || template.subject_template;
        }
      }

      const mergedVariables = { ...context, ...variables };
      const errors: string[] = [];

      let renderedBody = '';
      let renderedSubject = '';

      try {
        renderedBody = interpolateTemplate(finalBodyTemplate || '', mergedVariables);
      } catch (error) {
        errors.push(`Body interpolation error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      try {
        if (finalSubjectTemplate) {
          renderedSubject = interpolateTemplate(finalSubjectTemplate, mergedVariables);
        }
      } catch (error) {
        errors.push(`Subject interpolation error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      const response: TemplatePreviewResponse = {
        subject: renderedSubject,
        body: renderedBody,
        errors: errors.length > 0 ? errors : undefined,
      };

      return reply.status(200).send(response);
    }
  );

  // ============================================
  // POST /message-templates/:id/duplicate - Duplicate template
  // ============================================
  server.post<{
    Params: MessageIdParams;
  }>(
    '-templates/:id/duplicate',
    {
      preHandler: validate({ params: messageIdParamsSchema }),
      schema: {
        description: 'Duplicate a message template',
        tags: ['Message Templates'],
        response: {
          201: { $ref: 'MessageTemplate' },
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
    async (request: FastifyRequest<{ Params: MessageIdParams }>, reply: FastifyReply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { id } = request.params;

      // Fetch original template
      const selectSql = `
        SELECT * FROM message_templates
        WHERE id = $1 AND tenant_id = $2
      `;

      const selectResult = await pool.query(selectSql, [id, tenantId]);

      if (selectResult.isFailure || selectResult.getValue().rows.length === 0) {
        throw new HttpError(404, 'Not Found', `Template not found: ${id}`);
      }

      const original = selectResult.getValue().rows[0];
      const newId = uuidv4();
      const now = new Date();

      // Insert copy
      const insertSql = `
        INSERT INTO message_templates (
          id, tenant_id, name, description, channel, subject_template,
          body_template, variables, is_active, category, created_by,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `;

      const insertResult = await pool.query(insertSql, [
        newId,
        tenantId,
        `${original.name} (Copy)`,
        original.description,
        original.channel,
        original.subject_template,
        original.body_template,
        JSON.stringify(original.variables || []),
        false, // Start as inactive
        original.category,
        userId,
        now,
        now,
      ]);

      if (insertResult.isFailure) {
        throw new HttpError(500, 'Internal Server Error', 'Failed to duplicate template');
      }

      const template = mapRowToTemplateResponse(insertResult.getValue().rows[0]);

      return reply.status(201).send(template);
    }
  );
}

export default messagingRoutes;
