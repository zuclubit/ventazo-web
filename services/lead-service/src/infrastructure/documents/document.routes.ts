/**
 * Document Management Routes
 *
 * REST API endpoints for documents and templates
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { DocumentService } from './document.service';

// ============================================================================
// Zod Schemas
// ============================================================================

const documentTypeSchema = z.enum([
  'proposal',
  'contract',
  'quote',
  'invoice',
  'agreement',
  'nda',
  'sow',
  'sla',
  'order_form',
  'letter',
  'report',
  'presentation',
  'brochure',
  'case_study',
  'onboarding',
  'policy',
  'other',
]);

const templateStatusSchema = z.enum(['draft', 'active', 'archived']);

const documentStatusSchema = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'sent',
  'viewed',
  'signed',
  'completed',
  'rejected',
  'expired',
  'voided',
  'archived',
]);

const signatureStatusSchema = z.enum(['not_required', 'pending', 'signed', 'declined', 'expired']);

const mergeFieldSchema = z.object({
  tag: z.string(),
  name: z.string(),
  source: z.enum(['lead', 'contact', 'customer', 'deal', 'quote', 'product', 'company', 'user', 'custom']),
  field: z.string(),
  fallback: z.string().optional(),
  format: z.string().optional(),
  isRequired: z.boolean().optional(),
  description: z.string().optional(),
});

const signatureFieldSchema = z.object({
  label: z.string(),
  signerType: z.enum(['sender', 'recipient', 'witness']),
  signerEmail: z.string().email().optional(),
  isRequired: z.boolean(),
  order: z.number().int().positive(),
  position: z
    .object({
      page: z.number().int().positive(),
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: documentTypeSchema,
  format: z.enum(['html', 'markdown', 'pdf', 'docx']).optional(),
  content: z.string().min(1),
  headerContent: z.string().optional(),
  footerContent: z.string().optional(),
  cssStyles: z.string().optional(),
  pageSize: z.enum(['letter', 'a4', 'legal']).optional(),
  orientation: z.enum(['portrait', 'landscape']).optional(),
  margins: z
    .object({
      top: z.number(),
      right: z.number(),
      bottom: z.number(),
      left: z.number(),
    })
    .optional(),
  mergeFields: z.array(mergeFieldSchema).optional(),
  hasCoverPage: z.boolean().optional(),
  coverPageContent: z.string().optional(),
  requiresSignature: z.boolean().optional(),
  signatureFields: z.array(signatureFieldSchema).optional(),
  logoUrl: z.string().url().optional(),
  brandColor: z.string().optional(),
  fontFamily: z.string().optional(),
  requiresApproval: z.boolean().optional(),
  approverIds: z.array(z.string().uuid()).optional(),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  status: templateStatusSchema.optional(),
});

const generateDocumentSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
  entityType: z.enum(['lead', 'contact', 'customer', 'deal', 'opportunity', 'quote']).optional(),
  entityId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  mergeData: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  generatePdf: z.boolean().optional(),
});

const createDocumentSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().optional(),
  type: documentTypeSchema,
  format: z.enum(['html', 'markdown', 'pdf', 'docx']).optional(),
  content: z.string().min(1),
  entityType: z.enum(['lead', 'contact', 'customer', 'deal', 'opportunity', 'quote']).optional(),
  entityId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  requiresSignature: z.boolean().optional(),
  signatureFields: z.array(signatureFieldSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: documentStatusSchema.optional(),
  content: z.string().optional(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const sendDocumentSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().optional(),
  ccEmails: z.array(z.string().email()).optional(),
  requestSignature: z.boolean().optional(),
  reminderDays: z.array(z.number().int().positive()).optional(),
  expiresInDays: z.number().int().positive().optional(),
});

const templateSearchSchema = z.object({
  search: z.string().optional(),
  type: z.array(documentTypeSchema).optional(),
  status: z.array(templateStatusSchema).optional(),
  folderId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  createdBy: z.string().uuid().optional(),
  requiresSignature: z.boolean().optional(),
});

const documentSearchSchema = z.object({
  search: z.string().optional(),
  type: z.array(documentTypeSchema).optional(),
  status: z.array(documentStatusSchema).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  signatureStatus: z.array(signatureStatusSchema).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  expiringBefore: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
});

const bulkOperationSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  operation: z.enum(['archive', 'void', 'delete', 'send_reminder']),
});

const cloneTemplateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().uuid().optional(),
});

const recordViewSchema = z.object({
  viewerEmail: z.string().email().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const addSignatureSchema = z.object({
  signerEmail: z.string().email(),
  signerName: z.string().optional(),
  signerType: z.enum(['sender', 'recipient', 'witness']),
  order: z.number().int().positive().optional(),
});

const recordSignatureSchema = z.object({
  ipAddress: z.string().optional(),
  signatureImageUrl: z.string().url().optional(),
});

const declineSignatureSchema = z.object({
  reason: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
  const tenantId = request.headers['x-tenant-id'];
  return typeof tenantId === 'string' ? tenantId : 'default-tenant';
};

const getUserId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
  const userId = request.headers['x-user-id'];
  return typeof userId === 'string' ? userId : 'system';
};

// ============================================================================
// Routes
// ============================================================================

export const documentRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(DocumentService);

  // ============================================================================
  // Template Routes
  // ============================================================================

  // Create template
  fastify.post('/templates', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = createTemplateSchema.parse(request.body);

    const result = await service.createTemplate(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Get template
  fastify.get<{ Params: { templateId: string } }>('/templates/:templateId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { templateId } = request.params;

    const result = await service.getTemplate(tenantId, templateId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Update template
  fastify.patch<{ Params: { templateId: string } }>('/templates/:templateId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { templateId } = request.params;
    const body = updateTemplateSchema.parse(request.body);

    const result = await service.updateTemplate(tenantId, templateId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Delete template
  fastify.delete<{ Params: { templateId: string } }>('/templates/:templateId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { templateId } = request.params;

    const result = await service.deleteTemplate(tenantId, templateId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Search templates
  fastify.post('/templates/search', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = templateSearchSchema.parse(request.body);
    const page = parseInt((request.query as any).page || '1', 10);
    const limit = parseInt((request.query as any).limit || '20', 10);

    const result = await service.searchTemplates(tenantId, body as any, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Clone template
  fastify.post<{ Params: { templateId: string } }>(
    '/templates/:templateId/clone',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { templateId } = request.params;
      const body = cloneTemplateSchema.parse(request.body);

      const result = await service.cloneTemplate(tenantId, templateId, body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  // ============================================================================
  // Document Routes
  // ============================================================================

  // List documents
  fastify.get('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const page = parseInt((request.query as any).page || '1', 10);
    const limit = parseInt((request.query as any).limit || '20', 10);

    const result = await service.searchDocuments(tenantId, {}, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Generate document from template
  fastify.post('/generate', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = generateDocumentSchema.parse(request.body);

    const result = await service.generateDocument(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Create document without template
  fastify.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = createDocumentSchema.parse(request.body);

    const result = await service.createDocument(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Get document
  fastify.get<{ Params: { documentId: string } }>('/:documentId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { documentId } = request.params;

    const result = await service.getDocument(tenantId, documentId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Update document
  fastify.patch<{ Params: { documentId: string } }>('/:documentId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { documentId } = request.params;
    const body = updateDocumentSchema.parse(request.body);

    const result = await service.updateDocument(tenantId, documentId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Delete document
  fastify.delete<{ Params: { documentId: string } }>('/:documentId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { documentId } = request.params;

    const result = await service.deleteDocument(tenantId, documentId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Search documents
  fastify.post('/search', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = documentSearchSchema.parse(request.body);
    const page = parseInt((request.query as any).page || '1', 10);
    const limit = parseInt((request.query as any).limit || '20', 10);

    const result = await service.searchDocuments(tenantId, body as any, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Send document
  fastify.post<{ Params: { documentId: string } }>('/:documentId/send', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { documentId } = request.params;
    const body = sendDocumentSchema.parse(request.body);

    const result = await service.sendDocument(tenantId, documentId, body, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Record view
  fastify.post<{ Params: { documentId: string } }>('/:documentId/view', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { documentId } = request.params;
    const body = recordViewSchema.parse(request.body);

    const result = await service.recordView(
      tenantId,
      documentId,
      body.viewerEmail,
      body.ipAddress,
      body.userAgent
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // Record download
  fastify.post<{ Params: { documentId: string } }>('/:documentId/download', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { documentId } = request.params;

    const result = await service.recordDownload(tenantId, documentId, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send({ success: true });
  });

  // Bulk operations
  fastify.post('/bulk', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = bulkOperationSchema.parse(request.body);

    const result = await service.bulkOperation(tenantId, body, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Get dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const tenantId = getTenantId(request);

    const result = await service.getDashboard(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Get document activity
  fastify.get<{ Params: { documentId: string } }>('/:documentId/activity', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { documentId } = request.params;

    const result = await service.getDocumentActivity(tenantId, documentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // ============================================================================
  // Signature Routes
  // ============================================================================

  // Add signature
  fastify.post<{ Params: { documentId: string } }>(
    '/:documentId/signatures',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { documentId } = request.params;
      const body = addSignatureSchema.parse(request.body);

      const result = await service.addSignature(
        tenantId,
        documentId,
        body.signerEmail,
        body.signerName,
        body.signerType,
        body.order
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  // Record signature
  fastify.post<{ Params: { signatureId: string } }>(
    '/signatures/:signatureId/sign',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { signatureId } = request.params;
      const body = recordSignatureSchema.parse(request.body);

      const result = await service.recordSignature(
        tenantId,
        signatureId,
        body.ipAddress,
        body.signatureImageUrl
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  // Decline signature
  fastify.post<{ Params: { signatureId: string } }>(
    '/signatures/:signatureId/decline',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { signatureId } = request.params;
      const body = declineSignatureSchema.parse(request.body);

      const result = await service.declineSignature(tenantId, signatureId, body.reason);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  // ============================================================================
  // Folder Routes
  // ============================================================================

  // Create folder
  fastify.post('/folders', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = z
      .object({
        name: z.string().min(1).max(255),
        parentId: z.string().uuid().optional(),
      })
      .parse(request.body);

    const result = await service.createFolder(tenantId, body.name, body.parentId, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // List folders
  fastify.get('/folders', async (request, reply) => {
    const tenantId = getTenantId(request);
    const parentId = (request.query as any).parentId;

    const result = await service.listFolders(tenantId, parentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Delete folder
  fastify.delete<{ Params: { folderId: string } }>('/folders/:folderId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { folderId } = request.params;

    const result = await service.deleteFolder(tenantId, folderId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(204).send();
  });
};
