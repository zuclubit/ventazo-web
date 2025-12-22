/**
 * Unified Messaging Schemas
 * Zod validation schemas for unified messaging endpoints
 *
 * @module presentation/schemas/messaging.schema
 */

import { z } from 'zod';

// ============================================
// Enums & Constants
// ============================================

export const MESSAGE_CHANNELS = ['email', 'sms', 'whatsapp', 'push', 'internal'] as const;
export const MESSAGE_STATUSES = [
  'pending',
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'bounced',
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

// ============================================
// Query Schemas
// ============================================

/**
 * Schema for listing messages with filters
 */
export const listMessagesQuerySchema = z.object({
  channel: z.enum(MESSAGE_CHANNELS).optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().max(200).optional(),
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

export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;

// ============================================
// Params Schemas
// ============================================

/**
 * Schema for message ID parameter
 */
export const messageIdParamsSchema = z.object({
  id: z.string().uuid('Invalid message ID format'),
});

export type MessageIdParams = z.infer<typeof messageIdParamsSchema>;

// ============================================
// Body Schemas
// ============================================

/**
 * Message metadata schema
 */
export const messageMetadataSchema = z.object({
  recipientName: z.string().max(255).optional(),
  recipientType: z.enum(RELATED_ENTITY_TYPES).optional(),
  recipientId: z.string().uuid().optional(),
  triggeredBy: z.enum(['manual', 'workflow', 'automation', 'system']).optional(),
  workflowId: z.string().uuid().optional(),
  workflowExecutionId: z.string().uuid().optional(),
});

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  channel: z.enum(MESSAGE_CHANNELS),
  to: z.string().min(1, 'Recipient is required').max(500),
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.unknown()).optional(),
  metadata: messageMetadataSchema.optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Bulk recipient schema
 */
export const bulkRecipientSchema = z.object({
  to: z.string().min(1).max(500),
  variables: z.record(z.unknown()).optional(),
  metadata: messageMetadataSchema.optional(),
});

/**
 * Schema for sending bulk messages
 */
export const sendBulkMessageSchema = z.object({
  channel: z.enum(MESSAGE_CHANNELS),
  recipients: z.array(bulkRecipientSchema).min(1).max(1000),
  templateId: z.string().uuid().optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(10000).optional(),
  scheduleAt: z.string().datetime().optional(),
});

export type SendBulkMessageInput = z.infer<typeof sendBulkMessageSchema>;

/**
 * Template variable schema
 */
export const templateVariableSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'number', 'date', 'boolean', 'entity']),
  entityType: z.enum(RELATED_ENTITY_TYPES).optional(),
  defaultValue: z.string().max(500).optional(),
  required: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

/**
 * Schema for creating a message template
 */
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  channel: z.enum(MESSAGE_CHANNELS),
  subjectTemplate: z.string().max(500).optional(),
  bodyTemplate: z.string().min(1, 'Body template is required').max(10000),
  variables: z.array(templateVariableSchema).optional(),
  category: z.string().max(100).optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

/**
 * Schema for updating a message template
 */
export const updateTemplateSchema = createTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

/**
 * Schema for previewing a template
 */
export const previewTemplateSchema = z.object({
  templateId: z.string().uuid().optional(),
  bodyTemplate: z.string().max(10000).optional(),
  subjectTemplate: z.string().max(500).optional(),
  variables: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
});

export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;

// ============================================
// Response Types
// ============================================

export interface MessageResponse {
  id: string;
  tenantId: string;
  channel: (typeof MESSAGE_CHANNELS)[number];
  to: string;
  from?: string;
  subject?: string;
  body: string;
  templateId?: string;
  status: (typeof MESSAGE_STATUSES)[number];
  error?: string | null;
  errorMessage?: string | null;
  attempts?: number;
  providerMessageId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  sentAt?: string | null;
  deliveredAt?: string | null;
}

export interface MessageStatsResponse {
  total: number;
  totalSent: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  byChannel: Record<(typeof MESSAGE_CHANNELS)[number], number>;
  byStatus: Record<(typeof MESSAGE_STATUSES)[number], number>;
}

export interface MessageTemplateResponse {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: (typeof MESSAGE_CHANNELS)[number];
  subjectTemplate?: string;
  bodyTemplate: string;
  variables: Array<{
    name: string;
    label: string;
    type: string;
    entityType?: string;
    defaultValue?: string;
    required?: boolean;
    description?: string;
  }>;
  isActive: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface TemplatePreviewResponse {
  subject?: string;
  body: string;
  errors?: string[];
}

export interface BulkMessageResultResponse {
  id: string;
  total: number;
  sent: number;
  failed: number;
  pending: number;
  status: 'processing' | 'completed' | 'failed';
  results: Array<{
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

// ============================================
// OpenAPI Schema Definitions
// ============================================

export const messagingSchemas = {
  Message: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tenantId: { type: 'string', format: 'uuid' },
      channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
      to: { type: 'string' },
      from: { type: 'string' },
      subject: { type: 'string' },
      body: { type: 'string' },
      templateId: { type: 'string', format: 'uuid' },
      status: { type: 'string', enum: [...MESSAGE_STATUSES] },
      error: { type: 'string', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      sentAt: { type: 'string', format: 'date-time', nullable: true },
      deliveredAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  MessageStats: {
    type: 'object',
    properties: {
      total: { type: 'integer' },
      totalSent: { type: 'integer' },
      sent: { type: 'integer' },
      delivered: { type: 'integer' },
      failed: { type: 'integer' },
      pending: { type: 'integer' },
      byChannel: { type: 'object', additionalProperties: { type: 'integer' } },
      byStatus: { type: 'object', additionalProperties: { type: 'integer' } },
    },
  },
  MessageTemplate: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      tenantId: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      description: { type: 'string' },
      channel: { type: 'string', enum: [...MESSAGE_CHANNELS] },
      subjectTemplate: { type: 'string' },
      bodyTemplate: { type: 'string' },
      variables: { type: 'array' },
      isActive: { type: 'boolean' },
      category: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
};
