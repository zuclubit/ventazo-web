/**
 * Integration Connectors Routes
 * API endpoints for managing third-party integrations
 */
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { IntegrationConnectorService } from '../../infrastructure/integration-connectors';
import { IntegrationCategory, ConnectionStatus } from '../../infrastructure/integration-connectors/types';

export async function integrationConnectorRoutes(fastify: FastifyInstance): Promise<void> {
  const integrationService = container.resolve(IntegrationConnectorService);

  // List available connectors
  fastify.get<{
    Querystring: {
      category?: string;
      search?: string;
      premium_only?: boolean;
    };
  }>('/connectors', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          search: { type: 'string' },
          premium_only: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const result = await integrationService.getConnectors({
      category: request.query.category as IntegrationCategory,
      search: request.query.search,
      premium_only: request.query.premium_only,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Get connector details
  fastify.get<{
    Params: { connectorId: string };
  }>('/connectors/:connectorId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectorId: { type: 'string' },
        },
        required: ['connectorId'],
      },
    },
  }, async (request, reply) => {
    const result = await integrationService.getConnector(request.params.connectorId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Connector not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Get OAuth URL
  fastify.get<{
    Params: { connectorSlug: string };
    Querystring: { redirect_uri: string; state?: string };
  }>('/connectors/:connectorSlug/oauth-url', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectorSlug: { type: 'string' },
        },
        required: ['connectorSlug'],
      },
      querystring: {
        type: 'object',
        properties: {
          redirect_uri: { type: 'string' },
          state: { type: 'string' },
        },
        required: ['redirect_uri'],
      },
    },
  }, async (request, reply) => {
    const state = request.query.state ?? crypto.randomUUID();

    const result = await integrationService.getOAuthUrl(
      request.params.connectorSlug,
      request.query.redirect_uri,
      state
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: {
        authorization_url: result.value,
        state,
      },
    });
  });

  // Exchange OAuth code
  fastify.post<{
    Params: { connectorSlug: string };
    Body: { code: string; redirect_uri: string };
  }>('/connectors/:connectorSlug/oauth-callback', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectorSlug: { type: 'string' },
        },
        required: ['connectorSlug'],
      },
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          redirect_uri: { type: 'string' },
        },
        required: ['code', 'redirect_uri'],
      },
    },
  }, async (request, reply) => {
    const result = await integrationService.exchangeOAuthCode(
      request.params.connectorSlug,
      request.body.code,
      request.body.redirect_uri
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // List connections
  fastify.get<{
    Querystring: {
      status?: string;
      category?: string;
      page?: number;
      limit?: number;
    };
  }>('/connections', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          category: { type: 'string' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.listConnections(tenantId, {
      status: request.query.status as ConnectionStatus,
      category: request.query.category as IntegrationCategory,
      page: request.query.page,
      limit: request.query.limit,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value.connections,
      meta: { total: result.value.total },
    });
  });

  // Create connection
  fastify.post<{
    Body: {
      connector_id: string;
      name: string;
      credentials: Record<string, unknown>;
      settings?: Record<string, unknown>;
      entity_mappings?: unknown[];
    };
  }>('/connections', {
    schema: {
      body: {
        type: 'object',
        properties: {
          connector_id: { type: 'string' },
          name: { type: 'string' },
          credentials: { type: 'object' },
          settings: { type: 'object' },
          entity_mappings: { type: 'array' },
        },
        required: ['connector_id', 'name', 'credentials'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';

    const result = await integrationService.createConnection(tenantId, userId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get connection
  fastify.get<{
    Params: { connectionId: string };
  }>('/connections/:connectionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.getConnection(tenantId, request.params.connectionId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Connection not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Update connection
  fastify.patch<{
    Params: { connectionId: string };
    Body: {
      name?: string;
      settings?: Record<string, unknown>;
      entity_mappings?: unknown[];
    };
  }>('/connections/:connectionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          settings: { type: 'object' },
          entity_mappings: { type: 'array' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.updateConnection(
      tenantId,
      request.params.connectionId,
      request.body as any
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Delete connection
  fastify.delete<{
    Params: { connectionId: string };
  }>('/connections/:connectionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.deleteConnection(tenantId, request.params.connectionId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Connection deleted successfully',
    });
  });

  // Test connection
  fastify.post<{
    Params: { connectionId: string };
  }>('/connections/:connectionId/test', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const connectionResult = await integrationService.getConnection(tenantId, request.params.connectionId);
    if (connectionResult.isFailure) {
      return reply.status(404).send({ error: 'Connection not found' });
    }

    // Test with existing credentials (would decrypt in production)
    const testResult = await integrationService.testConnection(connectionResult.value, {
      oauth: { access_token: 'test' },
    });

    if (testResult.isFailure) {
      return reply.status(400).send({ error: testResult.error.message });
    }

    return reply.send({
      success: true,
      data: testResult.value,
    });
  });

  // Reconnect with new credentials
  fastify.post<{
    Params: { connectionId: string };
    Body: { credentials: Record<string, unknown> };
  }>('/connections/:connectionId/reconnect', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      body: {
        type: 'object',
        properties: {
          credentials: { type: 'object' },
        },
        required: ['credentials'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.reconnect(
      tenantId,
      request.params.connectionId,
      request.body.credentials as any
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Update entity mappings
  fastify.put<{
    Params: { connectionId: string };
    Body: { mappings: unknown[] };
  }>('/connections/:connectionId/mappings', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      body: {
        type: 'object',
        properties: {
          mappings: { type: 'array' },
        },
        required: ['mappings'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.updateEntityMappings(
      tenantId,
      request.params.connectionId,
      request.body.mappings as any
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Start sync
  fastify.post<{
    Params: { connectionId: string };
    Body: {
      type: 'full' | 'incremental' | 'entity';
      entity_type?: string;
    };
  }>('/connections/:connectionId/sync', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['full', 'incremental', 'entity'] },
          entity_type: { type: 'string' },
        },
        required: ['type'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.startSync(tenantId, request.params.connectionId, request.body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get sync stats
  fastify.get<{
    Params: { connectionId: string };
    Querystring: { from?: string; to?: string };
  }>('/connections/:connectionId/stats', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const dateRange = request.query.from && request.query.to
      ? { from: new Date(request.query.from), to: new Date(request.query.to) }
      : undefined;

    const result = await integrationService.getSyncStats(
      tenantId,
      request.params.connectionId,
      dateRange
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // List sync jobs
  fastify.get<{
    Params: { connectionId: string };
    Querystring: { status?: string; page?: number; limit?: number };
  }>('/connections/:connectionId/sync-jobs', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.listSyncJobs(tenantId, request.params.connectionId, {
      status: request.query.status,
      page: request.query.page,
      limit: request.query.limit,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value.jobs,
      meta: { total: result.value.total },
    });
  });

  // Get sync job
  fastify.get<{
    Params: { jobId: string };
  }>('/sync-jobs/:jobId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.getSyncJob(tenantId, request.params.jobId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Sync job not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Cancel sync job
  fastify.post<{
    Params: { jobId: string };
  }>('/sync-jobs/:jobId/cancel', {
    schema: {
      params: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
        },
        required: ['jobId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.cancelSyncJob(tenantId, request.params.jobId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Sync job cancelled',
    });
  });

  // Get webhook events
  fastify.get<{
    Params: { connectionId: string };
    Querystring: { status?: string; from_date?: string; to_date?: string; page?: number; limit?: number };
  }>('/connections/:connectionId/webhooks', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectionId: { type: 'string' },
        },
        required: ['connectionId'],
      },
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          from_date: { type: 'string' },
          to_date: { type: 'string' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await integrationService.getWebhookEvents(tenantId, request.params.connectionId, {
      status: request.query.status,
      from_date: request.query.from_date ? new Date(request.query.from_date) : undefined,
      to_date: request.query.to_date ? new Date(request.query.to_date) : undefined,
      page: request.query.page,
      limit: request.query.limit,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value.events,
      meta: { total: result.value.total },
    });
  });

  // Webhook endpoint for receiving external webhooks
  fastify.post<{
    Params: { connectorSlug: string; connectionId: string };
    Body: Record<string, unknown>;
  }>('/webhooks/:connectorSlug/:connectionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          connectorSlug: { type: 'string' },
          connectionId: { type: 'string' },
        },
        required: ['connectorSlug', 'connectionId'],
      },
    },
  }, async (request, reply) => {
    const eventType = (request.headers['x-webhook-event'] as string) ||
                      (request.headers['x-event-type'] as string) ||
                      'unknown';

    const result = await integrationService.handleWebhook(
      request.params.connectorSlug,
      request.params.connectionId,
      eventType,
      request.body,
      request.headers as Record<string, string>
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: { event_id: result.value.id },
    });
  });
}
