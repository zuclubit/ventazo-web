/**
 * Enrichment Routes
 * REST API endpoints for lead/company data enrichment via Apollo.io, Clearbit, etc.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { EnrichmentService, EnrichmentProvider } from '../../infrastructure/enrichment';

// Request schemas
const enrichLeadSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  phone: z.string().optional(),
  domain: z.string().optional(),
  companyName: z.string().optional(),
  enrichPerson: z.boolean().optional().default(true),
  enrichCompany: z.boolean().optional().default(true),
  revealPhoneNumber: z.boolean().optional().default(false),
  revealPersonalEmail: z.boolean().optional().default(false),
  preferredProvider: z.enum(['apollo', 'clearbit', 'hunter', 'zoominfo']).optional(),
});

const enrichCompanySchema = z.object({
  domain: z.string().optional(),
  companyName: z.string().optional(),
  website: z.string().url().optional(),
  preferredProvider: z.enum(['apollo', 'clearbit', 'hunter', 'zoominfo']).optional(),
});

const bulkEnrichSchema = z.object({
  records: z.array(z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    domain: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
  })).min(1).max(100),
  enrichPerson: z.boolean().optional().default(true),
  enrichCompany: z.boolean().optional().default(true),
  preferredProvider: z.enum(['apollo', 'clearbit', 'hunter', 'zoominfo']).optional(),
});

const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']).optional(),
  provider: z.enum(['apollo', 'clearbit', 'hunter', 'zoominfo']).optional(),
});

// Params schemas
const leadIdParamsSchema = z.object({
  leadId: z.string().uuid(),
});

const jobIdParamsSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * Register enrichment routes
 */
export async function enrichmentRoutes(fastify: FastifyInstance): Promise<void> {
  const enrichmentService = container.resolve(EnrichmentService);

  /**
   * POST /enrich/:leadId - Enrich a specific lead
   */
  fastify.post<{
    Params: z.infer<typeof leadIdParamsSchema>;
    Body: z.infer<typeof enrichLeadSchema>;
  }>('/enrich/:leadId', {
    schema: {
      description: 'Enrich a specific lead with external data',
      tags: ['Enrichment'],
      params: {
        type: 'object',
        properties: {
          leadId: { type: 'string', format: 'uuid' },
        },
        required: ['leadId'],
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          linkedinUrl: { type: 'string', format: 'uri' },
          phone: { type: 'string' },
          domain: { type: 'string' },
          companyName: { type: 'string' },
          enrichPerson: { type: 'boolean', default: true },
          enrichCompany: { type: 'boolean', default: true },
          revealPhoneNumber: { type: 'boolean', default: false },
          revealPersonalEmail: { type: 'boolean', default: false },
          preferredProvider: { type: 'string', enum: ['apollo', 'clearbit', 'hunter', 'zoominfo'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: z.infer<typeof leadIdParamsSchema>;
    Body: z.infer<typeof enrichLeadSchema>;
  }>, reply: FastifyReply) => {
    const paramsResult = leadIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid lead ID',
        details: paramsResult.error.issues,
      });
    }

    const bodyResult = enrichLeadSchema.safeParse(request.body);
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

    const result = await enrichmentService.enrichLead(
      tenantId,
      paramsResult.data.leadId,
      bodyResult.data
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Enrichment failed',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * POST /enrich/company - Enrich company data only
   */
  fastify.post<{
    Body: z.infer<typeof enrichCompanySchema>;
  }>('/enrich/company', {
    schema: {
      description: 'Enrich company data without linking to a lead',
      tags: ['Enrichment'],
      body: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          companyName: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          preferredProvider: { type: 'string', enum: ['apollo', 'clearbit', 'hunter', 'zoominfo'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: z.infer<typeof enrichCompanySchema>;
  }>, reply: FastifyReply) => {
    const bodyResult = enrichCompanySchema.safeParse(request.body);
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

    const result = await enrichmentService.enrichCompany(tenantId, bodyResult.data);

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Company enrichment failed',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * POST /enrich/bulk - Bulk enrich multiple leads
   */
  fastify.post<{
    Body: z.infer<typeof bulkEnrichSchema>;
  }>('/enrich/bulk', {
    schema: {
      description: 'Bulk enrich multiple leads (max 100 at a time)',
      tags: ['Enrichment'],
      body: {
        type: 'object',
        properties: {
          records: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                domain: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                companyName: { type: 'string' },
                linkedinUrl: { type: 'string', format: 'uri' },
              },
              required: ['id'],
            },
            minItems: 1,
            maxItems: 100,
          },
          enrichPerson: { type: 'boolean', default: true },
          enrichCompany: { type: 'boolean', default: true },
          preferredProvider: { type: 'string', enum: ['apollo', 'clearbit', 'hunter', 'zoominfo'] },
        },
        required: ['records'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: z.infer<typeof bulkEnrichSchema>;
  }>, reply: FastifyReply) => {
    const bodyResult = bulkEnrichSchema.safeParse(request.body);
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

    const result = await enrichmentService.bulkEnrichLeads(tenantId, bodyResult.data);

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Bulk enrichment failed',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * GET /jobs - List enrichment jobs
   */
  fastify.get<{
    Querystring: z.infer<typeof listJobsQuerySchema>;
  }>('/jobs', {
    schema: {
      description: 'List enrichment jobs with pagination and filtering',
      tags: ['Enrichment'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'partial'] },
          provider: { type: 'string', enum: ['apollo', 'clearbit', 'hunter', 'zoominfo'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                jobs: { type: 'array' },
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: z.infer<typeof listJobsQuerySchema>;
  }>, reply: FastifyReply) => {
    const queryResult = listJobsQuerySchema.safeParse(request.query);
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

    const { page, limit, status, provider } = queryResult.data;

    const result = await enrichmentService.listEnrichmentJobs(tenantId, {
      page,
      limit,
      status: status as 'pending' | 'processing' | 'completed' | 'failed' | 'partial' | undefined,
      provider: provider as EnrichmentProvider | undefined,
    });

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to list enrichment jobs',
      });
    }

    const { jobs, total } = result.value;
    const totalPages = Math.ceil(total / limit);

    return reply.status(200).send({
      success: true,
      data: {
        jobs,
        total,
        page,
        limit,
        totalPages,
      },
    });
  });

  /**
   * GET /jobs/:jobId - Get a specific enrichment job
   */
  fastify.get<{
    Params: z.infer<typeof jobIdParamsSchema>;
  }>('/jobs/:jobId', {
    schema: {
      description: 'Get details of a specific enrichment job',
      tags: ['Enrichment'],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' },
        },
        required: ['jobId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Params: z.infer<typeof jobIdParamsSchema>;
  }>, reply: FastifyReply) => {
    const paramsResult = jobIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid job ID',
        details: paramsResult.error.issues,
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await enrichmentService.getEnrichmentJob(
      paramsResult.data.jobId,
      tenantId
    );

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to get enrichment job',
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        success: false,
        error: 'Enrichment job not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * GET /status - Get provider availability status
   */
  fastify.get('/status', {
    schema: {
      description: 'Get the availability status of all enrichment providers',
      tags: ['Enrichment'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                providers: { type: 'array' },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const statuses = await enrichmentService.getProviderStatuses();

    return reply.status(200).send({
      success: true,
      data: {
        providers: statuses,
      },
    });
  });

  /**
   * GET /providers - List available providers
   */
  fastify.get('/providers', {
    schema: {
      description: 'List all configured enrichment providers',
      tags: ['Enrichment'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  available: { type: 'boolean' },
                  features: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const providers = [
      {
        name: 'apollo',
        available: !!process.env.APOLLO_API_KEY,
        features: ['person_enrichment', 'company_enrichment', 'bulk_enrichment', 'phone_reveal', 'email_reveal'],
      },
      {
        name: 'clearbit',
        available: !!process.env.CLEARBIT_API_KEY,
        features: ['person_enrichment', 'company_enrichment', 'combined_lookup'],
      },
      {
        name: 'hunter',
        available: !!process.env.HUNTER_API_KEY,
        features: ['email_finder', 'email_verifier', 'domain_search'],
      },
      {
        name: 'zoominfo',
        available: !!process.env.ZOOMINFO_API_KEY,
        features: ['person_enrichment', 'company_enrichment', 'intent_data'],
      },
    ];

    return reply.status(200).send({
      success: true,
      data: providers,
    });
  });
}

export default enrichmentRoutes;
