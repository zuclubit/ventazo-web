/**
 * Report Export Routes
 * REST API endpoints for generating and exporting reports
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ReportService, ReportType, ReportStatus, ReportFormat } from '../../infrastructure/reports';

// Request schemas
const generateReportSchema = z.object({
  type: z.enum(['leads', 'pipeline', 'sales', 'activity', 'conversion', 'performance', 'custom']),
  format: z.enum(['pdf', 'excel', 'csv', 'json']),
  title: z.string().optional(),
  description: z.string().optional(),
  options: z.object({
    // Lead report options
    status: z.array(z.string()).optional(),
    source: z.array(z.string()).optional(),
    assignedTo: z.array(z.string().uuid()).optional(),
    pipelineStage: z.array(z.string()).optional(),
    scoreRange: z.object({
      min: z.number(),
      max: z.number(),
    }).optional(),
    dateRange: z.object({
      startDate: z.string().datetime(),
      endDate: z.string().datetime(),
    }).optional(),
    columns: z.array(z.string()).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    groupBy: z.enum(['status', 'source', 'assignedTo', 'pipelineStage', 'month', 'week']).optional(),
    includeSummary: z.boolean().optional(),
    includeCharts: z.boolean().optional(),
    // Pipeline report options
    pipelineId: z.string().uuid().optional(),
    includeStageMetrics: z.boolean().optional(),
    includeConversionRates: z.boolean().optional(),
    // Activity options
    activityTypes: z.array(z.string()).optional(),
    userId: z.array(z.string().uuid()).optional(),
  }).optional(),
});

const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['leads', 'pipeline', 'sales', 'activity', 'conversion', 'performance', 'custom']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']).optional(),
});

const jobIdParamsSchema = z.object({
  jobId: z.string().uuid(),
});

/**
 * Register report routes
 */
export async function reportsRoutes(fastify: FastifyInstance): Promise<void> {
  const reportService = container.resolve(ReportService);

  /**
   * POST /generate - Generate a new report
   */
  fastify.post<{
    Body: z.infer<typeof generateReportSchema>;
  }>('/generate', {
    schema: {
      description: 'Generate a new report in the specified format',
      tags: ['Reports'],
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['leads', 'pipeline', 'sales', 'activity', 'conversion', 'performance', 'custom'] },
          format: { type: 'string', enum: ['pdf', 'excel', 'csv', 'json'] },
          title: { type: 'string' },
          description: { type: 'string' },
          options: { type: 'object' },
        },
        required: ['type', 'format'],
      },
    },
  }, async (request: FastifyRequest<{ Body: z.infer<typeof generateReportSchema> }>, reply: FastifyReply) => {
    const bodyResult = generateReportSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid request body',
        details: bodyResult.error.issues,
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

    // Transform date strings to Date objects if present
    const options = bodyResult.data.options ? {
      ...bodyResult.data.options,
      dateRange: bodyResult.data.options.dateRange ? {
        startDate: new Date(bodyResult.data.options.dateRange.startDate),
        endDate: new Date(bodyResult.data.options.dateRange.endDate),
      } : undefined,
    } : undefined;

    const result = await reportService.generateReport(
      tenantId,
      {
        type: bodyResult.data.type,
        format: bodyResult.data.format,
        title: bodyResult.data.title,
        description: bodyResult.data.description,
        options,
      },
      userId
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to generate report',
      });
    }

    // For inline exports, return the file directly
    if (result.value.data) {
      reply.header('Content-Type', result.value.mimeType || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${result.value.fileName}"`);
      return reply.send(result.value.data);
    }

    return reply.status(200).send({
      success: true,
      data: {
        jobId: result.value.jobId,
        fileName: result.value.fileName,
        fileUrl: result.value.fileUrl,
        fileSizeBytes: result.value.fileSizeBytes,
        format: result.value.format,
      },
    });
  });

  /**
   * GET /jobs - List report jobs
   */
  fastify.get<{
    Querystring: z.infer<typeof listJobsQuerySchema>;
  }>('/jobs', {
    schema: {
      description: 'List report generation jobs',
      tags: ['Reports'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          type: { type: 'string', enum: ['leads', 'pipeline', 'sales', 'activity', 'conversion', 'performance', 'custom'] },
          status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'expired'] },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listJobsQuerySchema> }>, reply: FastifyReply) => {
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

    const { page, limit, type, status } = queryResult.data;

    const result = await reportService.listReportJobs(tenantId, {
      page,
      limit,
      type: type as ReportType | undefined,
      status: status as ReportStatus | undefined,
    });

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to list report jobs',
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
   * GET /jobs/:jobId - Get a specific report job
   */
  fastify.get<{
    Params: z.infer<typeof jobIdParamsSchema>;
  }>('/jobs/:jobId', {
    schema: {
      description: 'Get details of a specific report job',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string', format: 'uuid' },
        },
        required: ['jobId'],
      },
    },
  }, async (request: FastifyRequest<{ Params: z.infer<typeof jobIdParamsSchema> }>, reply: FastifyReply) => {
    const paramsResult = jobIdParamsSchema.safeParse(request.params);
    if (!paramsResult.success) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid job ID',
      });
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const result = await reportService.getReportJob(paramsResult.data.jobId, tenantId);

    if (result.isFailure) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to get report job',
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        success: false,
        error: 'Report job not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });

  /**
   * GET /types - List available report types
   */
  fastify.get('/types', {
    schema: {
      description: 'List all available report types and their configurations',
      tags: ['Reports'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const reportTypes = [
      {
        type: 'leads',
        name: 'Lead Report',
        description: 'Export lead data with filters and grouping',
        formats: ['pdf', 'excel', 'csv', 'json'],
        supportedFilters: ['status', 'source', 'assignedTo', 'pipelineStage', 'scoreRange', 'dateRange'],
        supportedGrouping: ['status', 'source', 'assignedTo', 'pipelineStage', 'month', 'week'],
      },
      {
        type: 'pipeline',
        name: 'Pipeline Report',
        description: 'Pipeline stage metrics and conversion analysis',
        formats: ['pdf', 'excel', 'csv', 'json'],
        supportedFilters: ['pipelineId', 'dateRange'],
        supportedGrouping: [],
      },
      {
        type: 'activity',
        name: 'Activity Report',
        description: 'User and system activity tracking',
        formats: ['pdf', 'excel', 'csv', 'json'],
        supportedFilters: ['activityTypes', 'userId', 'dateRange'],
        supportedGrouping: ['type', 'user', 'day', 'week'],
      },
      {
        type: 'sales',
        name: 'Sales Report',
        description: 'Revenue and sales performance metrics',
        formats: ['pdf', 'excel', 'csv', 'json'],
        supportedFilters: ['dateRange', 'assignedTo'],
        supportedGrouping: ['day', 'week', 'month', 'quarter', 'user'],
      },
      {
        type: 'conversion',
        name: 'Conversion Report',
        description: 'Lead conversion rates and funnel analysis',
        formats: ['pdf', 'excel', 'csv', 'json'],
        supportedFilters: ['dateRange', 'source'],
        supportedGrouping: ['source', 'month'],
      },
    ];

    return reply.status(200).send({
      success: true,
      data: reportTypes,
    });
  });

  /**
   * GET /formats - List supported export formats
   */
  fastify.get('/formats', {
    schema: {
      description: 'List all supported export formats',
      tags: ['Reports'],
    },
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    const formats = [
      {
        format: 'pdf',
        name: 'PDF Document',
        mimeType: 'application/pdf',
        description: 'Portable Document Format - ideal for printing and sharing',
      },
      {
        format: 'excel',
        name: 'Excel Spreadsheet',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: 'Microsoft Excel format - ideal for data analysis',
      },
      {
        format: 'csv',
        name: 'CSV File',
        mimeType: 'text/csv',
        description: 'Comma-separated values - universal format for data import/export',
      },
      {
        format: 'json',
        name: 'JSON Data',
        mimeType: 'application/json',
        description: 'JavaScript Object Notation - ideal for API integration',
      },
    ];

    return reply.status(200).send({
      success: true,
      data: formats,
    });
  });

  /**
   * POST /leads/quick - Quick lead export
   */
  fastify.post<{
    Querystring: { format?: string };
  }>('/leads/quick', {
    schema: {
      description: 'Quick export of all leads in specified format',
      tags: ['Reports'],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['pdf', 'excel', 'csv', 'json'], default: 'csv' },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { format?: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: 'Tenant ID is required',
      });
    }

    const format = (request.query.format || 'csv') as ReportFormat;

    const result = await reportService.generateReport(
      tenantId,
      {
        type: 'leads',
        format,
        title: 'Lead Export',
        options: {
          includeSummary: true,
        },
      },
      userId
    );

    if (result.isFailure || !result.value) {
      return reply.status(400).send({
        success: false,
        error: result.error || 'Failed to export leads',
      });
    }

    // Return file directly
    if (result.value.data) {
      reply.header('Content-Type', result.value.mimeType || 'application/octet-stream');
      reply.header('Content-Disposition', `attachment; filename="${result.value.fileName}"`);
      return reply.send(result.value.data);
    }

    return reply.status(200).send({
      success: true,
      data: result.value,
    });
  });
}

export default reportsRoutes;
