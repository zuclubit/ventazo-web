/**
 * Proposal Template Routes
 * REST API endpoints for PDF layout/styling template management
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ProposalTemplateService } from '../../infrastructure/proposals/index.js';

// ============================================================================
// Validation Schemas
// ============================================================================

const sectionConfigSchema = z.object({
  showLogo: z.boolean().optional(),
  showDate: z.boolean().optional(),
  showQuoteNumber: z.boolean().optional(),
  showClientAddress: z.boolean().optional(),
  columns: z.number().int().min(1).max(6).optional(),
  showItemNumber: z.boolean().optional(),
  showDescription: z.boolean().optional(),
  showQuantity: z.boolean().optional(),
  showUnitPrice: z.boolean().optional(),
  showTotal: z.boolean().optional(),
  showSubtotal: z.boolean().optional(),
  showTax: z.boolean().optional(),
  showDiscount: z.boolean().optional(),
  termsTitle: z.string().max(100).optional(),
  showSignatureLine: z.boolean().optional(),
  showDateLine: z.boolean().optional(),
  signatureLabel: z.string().max(100).optional(),
  title: z.string().max(200).optional(),
  content: z.string().max(10000).optional(),
}).passthrough();

const sectionSchema = z.object({
  id: z.string().min(1).max(50),
  type: z.enum(['cover', 'summary', 'details', 'totals', 'terms', 'signature', 'custom_text']),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(99),
  config: sectionConfigSchema,
});

const colorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  tableHeader: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  tableRowAlt: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const fontsSchema = z.object({
  heading: z.string().max(50),
  body: z.string().max(50),
  sizes: z.object({
    title: z.number().int().min(8).max(72),
    heading: z.number().int().min(8).max(48),
    body: z.number().int().min(6).max(24),
    small: z.number().int().min(6).max(18),
  }),
});

const spacingSchema = z.object({
  margins: z.number().int().min(5).max(50),
  padding: z.number().int().min(0).max(50),
  lineHeight: z.number().min(1).max(3),
  sectionGap: z.number().int().min(0).max(100).optional(),
});

const stylesSchema = z.object({
  theme: z.enum(['dark', 'light']),
  colors: colorsSchema,
  fonts: fontsSchema,
  spacing: spacingSchema,
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  sections: z.array(sectionSchema).min(1).max(20),
  styles: stylesSchema,
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  sections: z.array(sectionSchema).min(1).max(20).optional(),
  styles: stylesSchema.optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const duplicateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

const previewQuerySchema = z.object({
  type: z.enum(['thumbnail', 'full']).default('thumbnail'),
});

// ============================================================================
// Routes
// ============================================================================

export const proposalTemplateRoutes: FastifyPluginAsync = async (fastify) => {
  const templateService = container.resolve(ProposalTemplateService);

  // Helper to get tenant and user from request
  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default',
    userId: request.headers['x-user-id'] as string || 'system',
  });

  // ============================================
  // Template CRUD Operations
  // ============================================

  /**
   * POST /proposal-templates
   * Create a new proposal template
   */
  fastify.post('/', async (request, reply) => {
    const context = getContext(request);
    const validation = createTemplateSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await templateService.createTemplate(
      context.tenantId,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * GET /proposal-templates
   * List all proposal templates for the tenant
   */
  fastify.get('/', async (request, reply) => {
    const context = getContext(request);
    const query = request.query as { includeInactive?: string };

    const result = await templateService.listTemplates(context.tenantId, {
      includeInactive: query.includeInactive === 'true',
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.send({ templates: result.value });
  });

  /**
   * GET /proposal-templates/default
   * Get or create the default template for the tenant
   */
  fastify.get('/default', async (request, reply) => {
    const context = getContext(request);

    const result = await templateService.getDefaultTemplate(
      context.tenantId,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.send(result.value);
  });

  /**
   * GET /proposal-templates/:id
   * Get a single proposal template by ID
   */
  fastify.get('/:id', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };

    const result = await templateService.getTemplate(context.tenantId, id);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    if (!result.value) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return reply.send(result.value);
  });

  /**
   * PUT /proposal-templates/:id
   * Update a proposal template
   */
  fastify.put('/:id', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };
    const validation = updateTemplateSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await templateService.updateTemplate(
      context.tenantId,
      id,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.send(result.value);
  });

  /**
   * DELETE /proposal-templates/:id
   * Soft delete a proposal template
   */
  fastify.delete('/:id', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };

    const result = await templateService.deleteTemplate(context.tenantId, id);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.status(204).send();
  });

  // ============================================
  // Template Actions
  // ============================================

  /**
   * POST /proposal-templates/:id/duplicate
   * Duplicate a proposal template
   */
  fastify.post('/:id/duplicate', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };
    const validation = duplicateTemplateSchema.safeParse(request.body || {});

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await templateService.duplicateTemplate(
      context.tenantId,
      id,
      context.userId,
      validation.data.name
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * POST /proposal-templates/:id/set-default
   * Set a template as the default for the tenant
   */
  fastify.post('/:id/set-default', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };

    const result = await templateService.setDefaultTemplate(
      context.tenantId,
      id,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    return reply.send(result.value);
  });

  /**
   * GET /proposal-templates/:id/preview
   * Generate a preview PDF for the template
   */
  fastify.get('/:id/preview', async (request, reply) => {
    const context = getContext(request);
    const { id } = request.params as { id: string };
    const query = request.query as { type?: 'thumbnail' | 'full' };
    const previewType = query.type || 'thumbnail';

    const result = await templateService.generatePreview(
      context.tenantId,
      id,
      previewType
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error?.message });
    }

    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `inline; filename="template-preview-${id}.pdf"`
    );
    return reply.send(result.value);
  });
};
