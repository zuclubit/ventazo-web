/**
 * Email Template Routes
 * REST API endpoints for email template management
 */

import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { EmailTemplateService } from '../../infrastructure/email-templates';
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateQueryOptions,
  PreviewData,
} from '../../infrastructure/email-templates/types';

interface RouteParams {
  templateId: string;
  versionNumber: string;
  starterId: string;
}

interface RouteQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  tags?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Email template routes
 */
export async function emailTemplateRoutes(fastify: FastifyInstance): Promise<void> {
  const getTenantId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-tenant-id'] as string) || 'default';
  };

  const getUserId = (request: { headers: Record<string, unknown> }): string => {
    return (request.headers['x-user-id'] as string) || 'system';
  };

  // ============ Template CRUD ============

  /**
   * Create a new template
   */
  fastify.post<{ Body: CreateTemplateRequest }>('/', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.createTemplate(tenantId, userId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create template',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * List templates
   */
  fastify.get<{ Querystring: RouteQuery }>('/', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const {
        page,
        limit,
        status,
        category,
        tags,
        search,
        sortBy,
        sortOrder,
      } = request.query;

      const options: TemplateQueryOptions = {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        status: status as TemplateQueryOptions['status'],
        category: category as TemplateQueryOptions['category'],
        tags: tags ? tags.split(',') : undefined,
        search,
        sortBy: sortBy as TemplateQueryOptions['sortBy'],
        sortOrder: sortOrder as TemplateQueryOptions['sortOrder'],
      };

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.listTemplates(tenantId, options);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to list templates',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value?.templates,
        pagination: {
          total: result.value?.total,
          page: options.page || 1,
          limit: options.limit || 20,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to list templates');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get template by ID
   */
  fastify.get<{ Params: Pick<RouteParams, 'templateId'> }>(
    '/:templateId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { templateId } = request.params;

        const service = container.resolve<EmailTemplateService>('EmailTemplateService');
        const result = await service.getTemplate(tenantId, templateId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get template',
          });
        }

        if (!result.value) {
          return reply.status(404).send({
            success: false,
            error: 'Template not found',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get template');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Update template
   */
  fastify.put<{
    Params: Pick<RouteParams, 'templateId'>;
    Body: UpdateTemplateRequest;
  }>('/:templateId', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { templateId } = request.params;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.updateTemplate(tenantId, templateId, userId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to update template',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Delete template
   */
  fastify.delete<{ Params: Pick<RouteParams, 'templateId'> }>(
    '/:templateId',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { templateId } = request.params;

        const service = container.resolve<EmailTemplateService>('EmailTemplateService');
        const result = await service.deleteTemplate(tenantId, templateId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to delete template',
          });
        }

        return reply.status(200).send({
          success: true,
          message: 'Template deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to delete template');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Duplicate template
   */
  fastify.post<{
    Params: Pick<RouteParams, 'templateId'>;
    Body: { name?: string };
  }>('/:templateId/duplicate', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { templateId } = request.params;
      const { name } = request.body;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.duplicateTemplate(tenantId, templateId, userId, name);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to duplicate template',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to duplicate template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Version Management ============

  /**
   * Get template versions
   */
  fastify.get<{ Params: Pick<RouteParams, 'templateId'> }>(
    '/:templateId/versions',
    async (request, reply) => {
      try {
        const tenantId = getTenantId(request);
        const { templateId } = request.params;

        const service = container.resolve<EmailTemplateService>('EmailTemplateService');
        const result = await service.getVersions(tenantId, templateId);

        if (result.isFailure) {
          return reply.status(400).send({
            success: false,
            error: result.error?.message || 'Failed to get versions',
          });
        }

        return reply.status(200).send({
          success: true,
          data: result.value,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Failed to get versions');
        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * Restore template to version
   */
  fastify.post<{
    Params: Pick<RouteParams, 'templateId' | 'versionNumber'>;
  }>('/:templateId/versions/:versionNumber/restore', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { templateId, versionNumber } = request.params;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.restoreVersion(
        tenantId,
        templateId,
        parseInt(versionNumber, 10),
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to restore version',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to restore version');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // ============ Rendering & Preview ============

  /**
   * Render template with data
   */
  fastify.post<{
    Params: Pick<RouteParams, 'templateId'>;
    Body: PreviewData;
  }>('/:templateId/render', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { templateId } = request.params;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.renderTemplate(tenantId, templateId, request.body);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to render template',
        });
      }

      // Track usage
      await service.trackUsage(tenantId, templateId);

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to render template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Preview template with sample data
   */
  fastify.get<{
    Params: Pick<RouteParams, 'templateId'>;
  }>('/:templateId/preview', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { templateId } = request.params;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.previewTemplate(tenantId, templateId);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to preview template',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to preview template');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Preview template as HTML (returns raw HTML)
   */
  fastify.get<{
    Params: Pick<RouteParams, 'templateId'>;
  }>('/:templateId/preview/html', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const { templateId } = request.params;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.previewTemplate(tenantId, templateId);

      if (result.isFailure || !result.value) {
        return reply.status(400).send('Failed to preview template');
      }

      return reply.type('text/html').send(result.value.html);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to preview template HTML');
      return reply.status(500).send('Internal server error');
    }
  });

  // ============ Tokens & Starter Templates ============

  /**
   * Get available personalization tokens
   */
  fastify.get('/tokens', async (_request, reply) => {
    try {
      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const tokens = service.getAvailableTokens();

      // Group by category
      const grouped: Record<string, typeof tokens> = {};
      for (const token of tokens) {
        const category = token.category || 'Other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(token);
      }

      return reply.status(200).send({
        success: true,
        data: {
          tokens,
          grouped,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get tokens');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Get starter templates
   */
  fastify.get('/starters', async (_request, reply) => {
    try {
      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const starters = service.getStarterTemplates();

      return reply.status(200).send({
        success: true,
        data: starters,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get starters');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  /**
   * Create template from starter
   */
  fastify.post<{
    Params: Pick<RouteParams, 'starterId'>;
    Body: { name?: string };
  }>('/starters/:starterId/create', async (request, reply) => {
    try {
      const tenantId = getTenantId(request);
      const userId = getUserId(request);
      const { starterId } = request.params;
      const { name } = request.body;

      const service = container.resolve<EmailTemplateService>('EmailTemplateService');
      const result = await service.createFromStarter(tenantId, userId, starterId, name);

      if (result.isFailure) {
        return reply.status(400).send({
          success: false,
          error: result.error?.message || 'Failed to create from starter',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create from starter');
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });
}
