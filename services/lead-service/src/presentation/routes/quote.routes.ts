/**
 * Quote Routes
 * REST API endpoints for quotes/proposals management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { QuoteService } from '../../infrastructure/quotes';

// Validation schemas
const createQuoteSchema = z.object({
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  expirationDate: z.string().datetime(),
  currency: z.string().length(3).default('USD'),
  billingAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  signatureRequired: z.boolean().default(false),
  paymentTerms: z.string().max(500).optional(),
  paymentDueDays: z.number().int().min(0).max(365).optional(),
  depositRequired: z.boolean().default(false),
  depositPercentage: z.number().min(0).max(100).optional(),
  lineItems: z.array(z.object({
    type: z.enum(['product', 'service', 'subscription', 'discount', 'fee']),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    sku: z.string().max(50).optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().int(), // In cents
    discount: z.number().min(0).optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    tax: z.number().min(0).max(100).optional(),
    taxable: z.boolean().default(true),
  })).min(1),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.string()).optional(),
});

const updateQuoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  expirationDate: z.string().datetime().optional(),
  billingAddress: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(50).optional(),
  companyName: z.string().max(200).optional(),
  terms: z.string().max(5000).optional(),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
  signatureRequired: z.boolean().optional(),
  paymentTerms: z.string().max(500).optional(),
  paymentDueDays: z.number().int().min(0).max(365).optional(),
  depositRequired: z.boolean().optional(),
  depositPercentage: z.number().min(0).max(100).optional(),
  lineItems: z.array(z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['product', 'service', 'subscription', 'discount', 'fee']),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    sku: z.string().max(50).optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().int(),
    discount: z.number().min(0).optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    tax: z.number().min(0).max(100).optional(),
    taxable: z.boolean().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.string()).optional(),
});

const sendQuoteSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().max(100).optional(),
  subject: z.string().max(200).optional(),
  message: z.string().max(5000).optional(),
  ccEmails: z.array(z.string().email()).max(5).optional(),
  attachPdf: z.boolean().default(true),
});

const acceptQuoteSchema = z.object({
  signatureName: z.string().min(1).max(100),
  signatureEmail: z.string().email(),
  notes: z.string().max(1000).optional(),
});

const rejectQuoteSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  defaultTitle: z.string().max(200).optional(),
  defaultDescription: z.string().max(2000).optional(),
  defaultTerms: z.string().max(5000).optional(),
  defaultNotes: z.string().max(2000).optional(),
  defaultPaymentTerms: z.string().max(500).optional(),
  defaultPaymentDueDays: z.number().int().min(0).max(365).optional(),
  defaultValidityDays: z.number().int().min(1).max(365).optional(),
  defaultDepositRequired: z.boolean().optional(),
  defaultDepositPercentage: z.number().min(0).max(100).optional(),
  lineItems: z.array(z.object({
    type: z.enum(['product', 'service', 'subscription', 'discount', 'fee']),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    sku: z.string().max(50).optional(),
    quantity: z.number().min(0),
    unitPrice: z.number().int(),
    discount: z.number().min(0).optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    tax: z.number().min(0).max(100).optional(),
    taxable: z.boolean().default(true),
    total: z.number().int().min(0),
    position: z.number().int().min(0),
    metadata: z.record(z.string()).optional(),
  })).optional(),
  headerHtml: z.string().max(10000).optional(),
  footerHtml: z.string().max(10000).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

const listQuotesSchema = z.object({
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  status: z.union([
    z.enum(['draft', 'pending_review', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised']),
    z.array(z.enum(['draft', 'pending_review', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'])),
  ]).optional(),
  search: z.string().max(100).optional(),
  minTotal: z.coerce.number().int().min(0).optional(),
  maxTotal: z.coerce.number().int().min(0).optional(),
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),
  expirationFrom: z.string().datetime().optional(),
  expirationTo: z.string().datetime().optional(),
  createdBy: z.string().uuid().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'total', 'quoteNumber', 'expirationDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const quoteRoutes: FastifyPluginAsync = async (fastify) => {
  const quoteService = container.resolve(QuoteService);

  // Helper to get tenant and user from request
  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default',
    userId: request.headers['x-user-id'] as string || 'system',
    userName: request.headers['x-user-name'] as string,
    userEmail: request.headers['x-user-email'] as string,
  });

  // ============================================
  // Quote CRUD Operations
  // ============================================

  // Create quote
  fastify.post('/', async (request, reply) => {
    const context = getContext(request);
    const validation = createQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.createQuote(
      context.tenantId,
      context.userId,
      {
        ...validation.data,
        expirationDate: new Date(validation.data.expirationDate),
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get quote by ID
  fastify.get('/:quoteId', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };

    const result = await quoteService.getQuote(context.tenantId, quoteId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Update quote
  fastify.put('/:quoteId', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };
    const validation = updateQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const updateData = {
      ...validation.data,
      expirationDate: validation.data.expirationDate
        ? new Date(validation.data.expirationDate)
        : undefined,
    };

    const result = await quoteService.updateQuote(
      context.tenantId,
      quoteId,
      context.userId,
      updateData
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Delete quote
  fastify.delete('/:quoteId', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };

    const result = await quoteService.deleteQuote(context.tenantId, quoteId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // List quotes
  fastify.get('/', async (request, reply) => {
    const context = getContext(request);
    const validation = listQuotesSchema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const filter = {
      ...validation.data,
      tenantId: context.tenantId,
      tags: validation.data.tags
        ? (Array.isArray(validation.data.tags) ? validation.data.tags : [validation.data.tags])
        : undefined,
      createdFrom: validation.data.createdFrom ? new Date(validation.data.createdFrom) : undefined,
      createdTo: validation.data.createdTo ? new Date(validation.data.createdTo) : undefined,
      expirationFrom: validation.data.expirationFrom ? new Date(validation.data.expirationFrom) : undefined,
      expirationTo: validation.data.expirationTo ? new Date(validation.data.expirationTo) : undefined,
    };

    const result = await quoteService.listQuotes(filter);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Quote Status Operations
  // ============================================

  // Send quote
  fastify.post('/:quoteId/send', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };
    const validation = sendQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.sendQuote(
      context.tenantId,
      quoteId,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Accept quote
  fastify.post('/:quoteId/accept', async (request, reply) => {
    const { quoteId } = request.params as { quoteId: string };
    const validation = acceptQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.acceptQuote(
      quoteId,
      {
        ...validation.data,
        signatureIp: request.ip,
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Reject quote
  fastify.post('/:quoteId/reject', async (request, reply) => {
    const { quoteId } = request.params as { quoteId: string };
    const validation = rejectQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.rejectQuote(
      quoteId,
      validation.data.reason
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Revise quote (create new version)
  fastify.post('/:quoteId/revise', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };

    const result = await quoteService.createRevision(
      context.tenantId,
      quoteId,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // ============================================
  // Quote Line Items
  // ============================================

  // Get quote with line items
  fastify.get('/:quoteId/details', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };

    const result = await quoteService.getQuoteWithItems(context.tenantId, quoteId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Quote Activities
  // ============================================

  // Get activities for a quote
  fastify.get('/:quoteId/activities', async (request, reply) => {
    const context = getContext(request);
    const { quoteId } = request.params as { quoteId: string };
    const { limit } = request.query as { limit?: string };

    const result = await quoteService.getActivities(
      context.tenantId,
      quoteId,
      limit ? parseInt(limit, 10) : 50
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Quote Templates
  // ============================================

  // Create template
  fastify.post('/templates', async (request, reply) => {
    const context = getContext(request);
    const validation = createTemplateSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.createTemplate(
      context.tenantId,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List templates
  fastify.get('/templates', async (request, reply) => {
    const context = getContext(request);
    const { activeOnly } = request.query as { activeOnly?: string };

    const result = await quoteService.getTemplates(
      context.tenantId,
      activeOnly !== 'false'
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Public Quote Access (for customers)
  // ============================================

  // Get quote by public token (no auth required)
  fastify.get('/public/:publicToken', async (request, reply) => {
    const { publicToken } = request.params as { publicToken: string };

    const result = await quoteService.getQuoteByToken(publicToken);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Accept quote via public token (no auth required)
  fastify.post('/public/:publicToken/accept', async (request, reply) => {
    const { publicToken } = request.params as { publicToken: string };
    const validation = acceptQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    // First get the quote by token
    const quoteResult = await quoteService.getQuoteByToken(publicToken);
    if (quoteResult.isFailure || !quoteResult.value) {
      return reply.status(404).send({ error: quoteResult.error });
    }

    const quote = quoteResult.value.quote;

    const result = await quoteService.acceptQuote(
      quote.id,
      {
        ...validation.data,
        signatureIp: request.ip,
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Reject quote via public token (no auth required)
  fastify.post('/public/:publicToken/reject', async (request, reply) => {
    const { publicToken } = request.params as { publicToken: string };
    const validation = rejectQuoteSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    // First get the quote by token
    const quoteResult = await quoteService.getQuoteByToken(publicToken);
    if (quoteResult.isFailure || !quoteResult.value) {
      return reply.status(404).send({ error: quoteResult.error });
    }

    const quote = quoteResult.value.quote;

    const result = await quoteService.rejectQuote(
      quote.id,
      validation.data.reason
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Analytics
  // ============================================

  // Get quote analytics
  fastify.get('/analytics', async (request, reply) => {
    const context = getContext(request);
    const validation = analyticsQuerySchema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await quoteService.getAnalytics(
      context.tenantId,
      validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      validation.data.endDate ? new Date(validation.data.endDate) : undefined
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });
};
