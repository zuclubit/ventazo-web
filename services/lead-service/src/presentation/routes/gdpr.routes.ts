/**
 * GDPR Compliance Routes
 * REST API endpoints for GDPR data subject requests, consent management, and compliance
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { GdprService, DsrType, DsrStatus, ExportFormat } from '../../infrastructure/gdpr';

// Request schemas
const createDsrSchema = z.object({
  type: z.enum(['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection']),
  subjectEmail: z.string().email(),
  subjectName: z.string().optional(),
  requestSource: z.enum(['web_form', 'email', 'phone', 'mail', 'api']),
  requestNotes: z.string().optional(),
  exportFormat: z.enum(['json', 'csv', 'xml']).optional(),
  erasureScope: z.enum(['all', 'specific']).optional(),
  erasureExclusions: z.array(z.string()).optional(),
  verificationMethod: z.enum(['email', 'identity_document', 'manual']).optional(),
});

const recordConsentSchema = z.object({
  subjectId: z.string().uuid().optional(),
  subjectType: z.enum(['lead', 'customer', 'contact', 'external']).optional(),
  email: z.string().email(),
  purpose: z.string(),
  consentBasis: z.enum(['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest']),
  dataCategories: z.array(z.enum(['identity', 'contact', 'financial', 'professional', 'behavioral', 'technical', 'communication', 'preferences'])),
  consentMethod: z.enum(['web_form', 'email', 'verbal', 'written', 'api']),
  consentSource: z.string(),
  consentVersion: z.string(),
  expiresAt: z.string().datetime().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const listDsrsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['pending', 'in_progress', 'verification_required', 'completed', 'rejected', 'expired']).optional(),
  type: z.enum(['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection']).optional(),
});

const exportDataQuerySchema = z.object({
  format: z.enum(['json', 'csv', 'xml']).optional().default('json'),
});

// Params schemas
const dsrIdParamsSchema = z.object({
  dsrId: z.string().uuid(),
});

const consentIdParamsSchema = z.object({
  consentId: z.string().uuid(),
});

const verifyDsrSchema = z.object({
  token: z.string(),
});

const withdrawConsentSchema = z.object({
  withdrawalMethod: z.string(),
});

/**
 * Register GDPR routes
 */
export async function gdprRoutes(fastify: FastifyInstance): Promise<void> {
  const gdprService = container.resolve(GdprService);

  // ==================== Data Subject Requests (DSR) ====================

  /**
   * POST /dsr - Create a new data subject request
   */
  fastify.post<{
    Body: z.infer<typeof createDsrSchema>;
  }>('/dsr', {
    schema: {
      description: 'Create a new data subject request (GDPR)',
      tags: ['GDPR'],
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'] },
          subjectEmail: { type: 'string', format: 'email' },
          subjectName: { type: 'string' },
          requestSource: { type: 'string', enum: ['web_form', 'email', 'phone', 'mail', 'api'] },
          requestNotes: { type: 'string' },
          exportFormat: { type: 'string', enum: ['json', 'csv', 'xml'] },
          erasureScope: { type: 'string', enum: ['all', 'specific'] },
          erasureExclusions: { type: 'array', items: { type: 'string' } },
          verificationMethod: { type: 'string', enum: ['email', 'identity_document', 'manual'] },
        },
        required: ['type', 'subjectEmail', 'requestSource'],
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createDsrSchema> }>, reply: FastifyReply) => {
    const bodyResult = createDsrSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.createDsr(tenantId, bodyResult.data);

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to create DSR',
      });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
      message: 'Data subject request created. Verification email will be sent.',
    });
  });

  /**
   * GET /dsr - List data subject requests
   */
  fastify.get<{
    Querystring: z.infer<typeof listDsrsQuerySchema>;
  }>('/dsr', {
    schema: {
      description: 'List data subject requests',
      tags: ['GDPR'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'in_progress', 'verification_required', 'completed', 'rejected', 'expired'] },
          type: { type: 'string', enum: ['access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'] },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listDsrsQuerySchema> }>, reply: FastifyReply) => {
    const queryResult = listDsrsQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid query parameters',
        details: queryResult.error.issues,
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const { page, limit, status, type } = queryResult.data;

    const result = await gdprService.listDsrs(tenantId, {
      page,
      limit,
      status: status as DsrStatus | undefined,
      type: type as DsrType | undefined,
    });

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to list DSRs',
      });
    }

    const { requests, total } = result.value;
    const totalPages = Math.ceil(total / limit);

    return reply.status(200).send({
      success: true,
      data: {
        requests,
        total,
        page,
        limit,
        totalPages,
      },
    });
  });

  /**
   * GET /dsr/:dsrId - Get a specific DSR
   */
  fastify.get<{
    Params: z.infer<typeof dsrIdParamsSchema>;
  }>('/dsr/:dsrId', {
    schema: {
      description: 'Get a specific data subject request',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          dsrId: { type: 'string', format: 'uuid' },
        },
        required: ['dsrId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: z.infer<typeof dsrIdParamsSchema> }>, reply: FastifyReply) => {
    const paramsResult = dsrIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid DSR ID',
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.getDsr(paramsResult.data.dsrId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to get DSR',
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        success: false,
        error: 'DSR not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * POST /dsr/:dsrId/verify - Verify a DSR
   */
  fastify.post<{
    Params: z.infer<typeof dsrIdParamsSchema>;
    Body: z.infer<typeof verifyDsrSchema>;
  }>('/dsr/:dsrId/verify', {
    schema: {
      description: 'Verify a data subject request using token',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          dsrId: { type: 'string', format: 'uuid' },
        },
        required: ['dsrId'],
      },
      body: {
        type: 'object',
        properties: {
          token: { type: 'string' },
        },
        required: ['token'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: z.infer<typeof dsrIdParamsSchema>;
    Body: z.infer<typeof verifyDsrSchema>;
  }>, reply: FastifyReply) => {
    const paramsResult = dsrIdParamsSchema.safeParse(request.params);
    const bodyResult = verifyDsrSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request',
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.verifyDsr(
      paramsResult.data.dsrId,
      bodyResult.data.token,
      tenantId
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to verify DSR',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
      message: 'DSR verified successfully',
    });
  });

  /**
   * POST /dsr/:dsrId/process - Process a DSR
   */
  fastify.post<{
    Params: z.infer<typeof dsrIdParamsSchema>;
  }>('/dsr/:dsrId/process', {
    schema: {
      description: 'Process a data subject request (execute access/erasure)',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          dsrId: { type: 'string', format: 'uuid' },
        },
        required: ['dsrId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: z.infer<typeof dsrIdParamsSchema> }>, reply: FastifyReply) => {
    const paramsResult = dsrIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid DSR ID',
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.processDsr(
      paramsResult.data.dsrId,
      tenantId,
      userId || 'system'
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to process DSR',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
      message: 'DSR processed successfully',
    });
  });

  // ==================== Data Export ====================

  /**
   * GET /export/:email - Export personal data for a subject
   */
  fastify.get<{
    Params: { email: string };
    Querystring: z.infer<typeof exportDataQuerySchema>;
  }>('/export/:email', {
    schema: {
      description: 'Export personal data for a data subject (right of access)',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv', 'xml'], default: 'json' },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: { email: string };
    Querystring: z.infer<typeof exportDataQuerySchema>;
  }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const format = (request.query.format || 'json') as ExportFormat;

    const result = await gdprService.exportPersonalData(
      tenantId,
      request.params.email,
      format
    );

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to export data',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  // ==================== Consent Management ====================

  /**
   * GET /consent - List consent records
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; status?: string };
  }>('/consent', {
    schema: {
      description: 'List consent records for the tenant',
      tags: ['GDPR'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          status: { type: 'string', enum: ['active', 'withdrawn', 'expired'] },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { limit?: number; offset?: number; status?: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const { limit = 20, offset = 0 } = request.query;
    const result = await gdprService.listConsents(tenantId, { limit, offset });

    return reply.status(200).send({
      success: true,
      data: result,
    });
  });

  /**
   * POST /consent - Record consent
   */
  fastify.post<{
    Body: z.infer<typeof recordConsentSchema>;
  }>('/consent', {
    schema: {
      description: 'Record consent from a data subject',
      tags: ['GDPR'],
      body: {
        type: 'object',
        properties: {
          subjectId: { type: 'string', format: 'uuid' },
          subjectType: { type: 'string', enum: ['lead', 'customer', 'contact', 'external'] },
          email: { type: 'string', format: 'email' },
          purpose: { type: 'string' },
          consentBasis: { type: 'string', enum: ['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest'] },
          dataCategories: { type: 'array', items: { type: 'string' } },
          consentMethod: { type: 'string', enum: ['web_form', 'email', 'verbal', 'written', 'api'] },
          consentSource: { type: 'string' },
          consentVersion: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          ipAddress: { type: 'string' },
          userAgent: { type: 'string' },
        },
        required: ['email', 'purpose', 'consentBasis', 'dataCategories', 'consentMethod', 'consentSource', 'consentVersion'],
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof recordConsentSchema> }>, reply: FastifyReply) => {
    const bodyResult = recordConsentSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: bodyResult.error.issues,
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const input = {
      ...bodyResult.data,
      expiresAt: bodyResult.data.expiresAt ? new Date(bodyResult.data.expiresAt) : undefined,
    };

    const result = await gdprService.recordConsent(tenantId, input);

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to record consent',
      });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * GET /consent/:email - Get consents for a subject
   */
  fastify.get<{
    Params: { email: string };
  }>('/consent/:email', {
    schema: {
      description: 'Get all consent records for a data subject',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
        required: ['email'],
      },
    },
  }, async (request: FastifyRequest<{ Params: { email: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const consents = await gdprService.getConsentsForSubject(tenantId, request.params.email);

    return reply.status(200).send({
      success: true,
      data: consents,
    });
  });

  /**
   * POST /consent/:consentId/withdraw - Withdraw consent
   */
  fastify.post<{
    Params: z.infer<typeof consentIdParamsSchema>;
    Body: z.infer<typeof withdrawConsentSchema>;
  }>('/consent/:consentId/withdraw', {
    schema: {
      description: 'Withdraw consent',
      tags: ['GDPR'],
      params: {
        type: 'object',
        properties: {
          consentId: { type: 'string', format: 'uuid' },
        },
        required: ['consentId'],
      },
      body: {
        type: 'object',
        properties: {
          withdrawalMethod: { type: 'string' },
        },
        required: ['withdrawalMethod'],
      },
    },
  }, async (request: FastifyRequest<{
    Params: z.infer<typeof consentIdParamsSchema>;
    Body: z.infer<typeof withdrawConsentSchema>;
  }>, reply: FastifyReply) => {
    const paramsResult = consentIdParamsSchema.safeParse(request.params);
    const bodyResult = withdrawConsentSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request',
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.withdrawConsent(
      paramsResult.data.consentId,
      tenantId,
      bodyResult.data.withdrawalMethod
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to withdraw consent',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
      message: 'Consent withdrawn successfully',
    });
  });

  /**
   * GET /consent/check - Check if subject has valid consent
   */
  fastify.get<{
    Querystring: { email: string; purpose: string };
  }>('/consent/check', {
    schema: {
      description: 'Check if a data subject has valid consent for a purpose',
      tags: ['GDPR'],
      querystring: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          purpose: { type: 'string' },
        },
        required: ['email', 'purpose'],
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { email: string; purpose: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const { email, purpose } = request.query;
    const hasConsent = await gdprService.hasValidConsent(tenantId, email, purpose);

    return reply.status(200).send({
      success: true,
      data: {
        email,
        purpose,
        hasValidConsent: hasConsent,
      },
    });
  });

  // ==================== Compliance Reports ====================

  /**
   * GET /compliance/summary - Get GDPR compliance summary
   */
  fastify.get('/compliance/summary', {
    schema: {
      description: 'Get GDPR compliance summary for the tenant',
      tags: ['GDPR'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await gdprService.getComplianceSummary(tenantId);

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to get compliance summary',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });
}

export default gdprRoutes;
