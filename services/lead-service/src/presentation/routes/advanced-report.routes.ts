/**
 * Advanced Report Routes
 * REST API endpoints for advanced reporting
 */

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { AdvancedReportService } from '../../infrastructure/advanced-reports';
import {
  CreateReportRequest,
  UpdateReportRequest,
  CreateDashboardRequest,
  ReportQueryOptions,
  ReportQuery,
  ReportFilter,
  DateRangePreset,
} from '../../infrastructure/advanced-reports/types';

interface RouteParams {
  reportId: string;
  dashboardId: string;
  scheduleId: string;
  templateId: string;
}

interface RouteQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  tags?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  preset?: string;
  field?: string;
}

/**
 * Advanced report routes
 */
export async function advancedReportRoutes(fastify: FastifyInstance): Promise<void> {
  const getTenantId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-tenant-id'] as string) || 'default';
  };

  const getUserId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-user-id'] as string) || 'system';
  };

  // ============ Report CRUD ============

  /**
   * Create a new report
   */
  fastify.post<{ Body: CreateReportRequest }>('/reports', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.createReport(tenantId, userId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create report',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create report');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * List reports
   */
  fastify.get<{ Querystring: RouteQuery }>('/reports', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { page, limit, status, type, tags, search, sortBy, sortOrder } = request.query;

      const options: ReportQueryOptions = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as ReportQueryOptions['status'],
        type: type as ReportQueryOptions['type'],
        tags: tags ? tags.split(',') : undefined,
        search,
        sortBy: sortBy as ReportQueryOptions['sortBy'],
        sortOrder: sortOrder as ReportQueryOptions['sortOrder'],
      };

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.listReports(tenantId, options);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to list reports',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value?.reports,
        pagination: {
          total: result.value?.total,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to list reports');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get report by ID
   */
  fastify.get<{ Params: Pick<RouteParams, 'reportId'> }>(
    '/reports/:reportId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { reportId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.getReport(tenantId, reportId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get report',
          });
        }

        if (!result.value) {
          return reply.status(404).send({
            success: false,
            error: 'Report not found',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get report');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Update report
   */
  fastify.put<{
    Params: Pick<RouteParams, 'reportId'>;
    Body: UpdateReportRequest;
  }>('/reports/:reportId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { reportId } = request.params;

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.updateReport(tenantId, reportId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to update report',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update report');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Delete report
   */
  fastify.delete<{ Params: Pick<RouteParams, 'reportId'> }>(
    '/reports/:reportId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { reportId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.deleteReport(tenantId, reportId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to delete report',
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Report deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete report');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // ============ Report Execution ============

  /**
   * Execute report
   */
  fastify.post<{
    Params: Pick<RouteParams, 'reportId'>;
    Body: { filters?: ReportFilter[] };
  }>('/reports/:reportId/execute', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { reportId } = request.params;
      const { filters } = request.body;

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.executeReport(tenantId, reportId, filters);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to execute report',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to execute report');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Execute ad-hoc query
   */
  fastify.post<{ Body: ReportQuery }>('/query', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.executeQuery(tenantId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to execute query',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to execute query');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Dashboard Management ============

  /**
   * Create dashboard
   */
  fastify.post<{ Body: CreateDashboardRequest }>('/dashboards', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.createDashboard(tenantId, userId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create dashboard',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create dashboard');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * List dashboards
   */
  fastify.get<{ Querystring: Pick<RouteQuery, 'page' | 'limit'> }>(
    '/dashboards',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { page = 1, limit = 20 } = request.query;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.listDashboards(tenantId, Number(page), Number(limit));

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to list dashboards',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value?.dashboards,
          pagination: {
            total: result.value?.total,
            page: Number(page),
            limit: Number(limit),
          },
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to list dashboards');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Get dashboard by ID
   */
  fastify.get<{ Params: Pick<RouteParams, 'dashboardId'> }>(
    '/dashboards/:dashboardId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { dashboardId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.getDashboard(tenantId, dashboardId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get dashboard',
          });
        }

        if (!result.value) {
          return reply.status(404).send({
            success: false,
            error: 'Dashboard not found',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get dashboard');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Update dashboard
   */
  fastify.put<{
    Params: Pick<RouteParams, 'dashboardId'>;
    Body: Partial<CreateDashboardRequest>;
  }>('/dashboards/:dashboardId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { dashboardId } = request.params;

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.updateDashboard(tenantId, dashboardId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to update dashboard',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update dashboard');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Delete dashboard
   */
  fastify.delete<{ Params: Pick<RouteParams, 'dashboardId'> }>(
    '/dashboards/:dashboardId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { dashboardId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.deleteDashboard(tenantId, dashboardId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to delete dashboard',
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Dashboard deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete dashboard');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // ============ Scheduling ============

  /**
   * Get report schedules
   */
  fastify.get<{ Params: Pick<RouteParams, 'reportId'> }>(
    '/reports/:reportId/schedules',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { reportId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.getSchedules(tenantId, reportId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get schedules',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get schedules');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Create report schedule
   */
  fastify.post<{
    Params: Pick<RouteParams, 'reportId'>;
    Body: {
      frequency: string;
      dayOfWeek?: number;
      dayOfMonth?: number;
      hour: number;
      minute: number;
      timezone: string;
      enabled: boolean;
      recipients: Array<{ email: string; name?: string }>;
      format: string;
      filters?: ReportFilter[];
    };
  }>('/reports/:reportId/schedules', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { reportId } = request.params;

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.createSchedule(tenantId, reportId, request.body as any);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create schedule',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create schedule');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Delete schedule
   */
  fastify.delete<{ Params: Pick<RouteParams, 'scheduleId'> }>(
    '/schedules/:scheduleId',
    async (request, reply) => {
      try {
        const { scheduleId } = request.params;

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const result = await service.deleteSchedule(scheduleId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to delete schedule',
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Schedule deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete schedule');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  // ============ Templates & Metrics ============

  /**
   * Get available metrics
   */
  fastify.get('/metrics', async (_request, reply) => {
    try {
      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const metrics = service.getAvailableMetrics();

      // Group by category
      const grouped: Record<string, typeof metrics> = {};
      for (const metric of metrics) {
        if (!grouped[metric.category]) {
          grouped[metric.category] = [];
        }
        grouped[metric.category].push(metric);
      }

      return reply.status(200).send({
        success: true,
        data: { metrics, grouped },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get metrics');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get report templates
   */
  fastify.get('/templates', async (_request, reply) => {
    try {
      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const templates = service.getTemplates();

      return reply.status(200).send({
        success: true,
        data: templates,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get templates');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Create report from template
   */
  fastify.post<{
    Params: Pick<RouteParams, 'templateId'>;
    Body: { name?: string };
  }>('/templates/:templateId/create', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { templateId } = request.params;
      const { name } = request.body;

      const service = container.resolve<AdvancedReportService>('AdvancedReportService');
      const result = await service.createFromTemplate(tenantId, userId, templateId, name);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create from template',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create from template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get date range filters for preset
   */
  fastify.get<{ Querystring: Pick<RouteQuery, 'preset' | 'field'> }>(
    '/date-range',
    async (request, reply) => {
      try {
        const { preset, field } = request.query;

        if (!preset || !field) {
          return reply.status(400).send({
            success: false,
            error: 'Both preset and field parameters are required',
          });
        }

        const service = container.resolve<AdvancedReportService>('AdvancedReportService');
        const filters = service.getDateRangeFilter(preset as DateRangePreset, field);

        return reply.status(200).send({
          success: true,
          data: filters,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get date range');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
