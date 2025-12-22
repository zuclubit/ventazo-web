/**
 * Workflow Builder Routes
 * API endpoints for visual workflow automation
 */
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { WorkflowBuilderService } from '../../infrastructure/workflow-builder';
import { WorkflowStatus, ExecutionStatus } from '../../infrastructure/workflow-builder/types';

export async function workflowBuilderRoutes(fastify: FastifyInstance): Promise<void> {
  const workflowBuilderService = container.resolve(WorkflowBuilderService);

  // List workflows
  fastify.get<{
    Querystring: {
      status?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    };
  }>('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          category: { type: 'string' },
          search: { type: 'string' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await workflowBuilderService.listWorkflows(tenantId, {
      status: request.query.status as WorkflowStatus,
      category: request.query.category,
      search: request.query.search,
      page: request.query.page,
      limit: request.query.limit,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value.workflows,
      meta: { total: result.value.total },
    });
  });

  // Get workflow templates
  fastify.get('/templates', async (_request, reply) => {
    const result = await workflowBuilderService.getTemplates();

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Create workflow
  fastify.post<{
    Body: {
      name: string;
      description?: string;
      category?: string;
      tags?: string[];
      nodes?: unknown[];
      connections?: unknown[];
      variables?: unknown[];
      settings?: Record<string, unknown>;
    };
  }>('/', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          nodes: { type: 'array' },
          connections: { type: 'array' },
          variables: { type: 'array' },
          settings: { type: 'object' },
        },
        required: ['name'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';

    const result = await workflowBuilderService.createWorkflow(tenantId, userId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Create from template
  fastify.post<{
    Body: {
      template_index: number;
      name?: string;
    };
  }>('/from-template', {
    schema: {
      body: {
        type: 'object',
        properties: {
          template_index: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['template_index'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';

    const result = await workflowBuilderService.createFromTemplate(
      tenantId,
      userId,
      request.body.template_index,
      request.body.name
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get workflow
  fastify.get<{
    Params: { workflowId: string };
  }>('/:workflowId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.getWorkflow(tenantId, workflowId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Update workflow
  fastify.patch<{
    Params: { workflowId: string };
    Body: {
      name?: string;
      description?: string;
      category?: string;
      tags?: string[];
      nodes?: unknown[];
      connections?: unknown[];
      variables?: unknown[];
      settings?: Record<string, unknown>;
    };
  }>('/:workflowId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          nodes: { type: 'array' },
          connections: { type: 'array' },
          variables: { type: 'array' },
          settings: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.updateWorkflow(tenantId, workflowId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Activate workflow
  fastify.post<{
    Params: { workflowId: string };
  }>('/:workflowId/activate', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.activateWorkflow(tenantId, workflowId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Pause workflow
  fastify.post<{
    Params: { workflowId: string };
  }>('/:workflowId/pause', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.pauseWorkflow(tenantId, workflowId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Archive workflow
  fastify.post<{
    Params: { workflowId: string };
  }>('/:workflowId/archive', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.archiveWorkflow(tenantId, workflowId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Workflow archived successfully',
    });
  });

  // Clone workflow
  fastify.post<{
    Params: { workflowId: string };
    Body: { name?: string };
  }>('/:workflowId/clone', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.cloneWorkflow(
      tenantId,
      workflowId,
      userId,
      request.body.name
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Validate workflow
  fastify.get<{
    Params: { workflowId: string };
  }>('/:workflowId/validate', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.validateWorkflow(tenantId, workflowId);

    return reply.send({
      success: true,
      data: result,
    });
  });

  // Trigger workflow
  fastify.post<{
    Params: { workflowId: string };
    Body: {
      context?: Record<string, unknown>;
      target_entity_id?: string;
      target_entity_type?: string;
    };
  }>('/:workflowId/trigger', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      body: {
        type: 'object',
        properties: {
          context: { type: 'object' },
          target_entity_id: { type: 'string' },
          target_entity_type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.triggerWorkflow(tenantId, workflowId, request.body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get workflow statistics
  fastify.get<{
    Params: { workflowId: string };
    Querystring: { from?: string; to?: string };
  }>('/:workflowId/stats', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
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
    const { workflowId } = request.params;

    const dateRange = request.query.from && request.query.to
      ? { from: new Date(request.query.from), to: new Date(request.query.to) }
      : undefined;

    const result = await workflowBuilderService.getWorkflowStats(tenantId, workflowId, dateRange);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // List workflow executions
  fastify.get<{
    Params: { workflowId: string };
    Querystring: {
      status?: string;
      from_date?: string;
      to_date?: string;
      page?: number;
      limit?: number;
    };
  }>('/:workflowId/executions', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
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
    const { workflowId } = request.params;

    const result = await workflowBuilderService.listExecutions(tenantId, workflowId, {
      status: request.query.status as ExecutionStatus,
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
      data: result.value.executions,
      meta: { total: result.value.total },
    });
  });

  // Get execution details
  fastify.get<{
    Params: { executionId: string };
  }>('/executions/:executionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
        },
        required: ['executionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { executionId } = request.params;

    const result = await workflowBuilderService.getExecution(tenantId, executionId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Execution not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Cancel execution
  fastify.post<{
    Params: { executionId: string };
  }>('/executions/:executionId/cancel', {
    schema: {
      params: {
        type: 'object',
        properties: {
          executionId: { type: 'string' },
        },
        required: ['executionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { executionId } = request.params;

    const result = await workflowBuilderService.cancelExecution(tenantId, executionId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Execution cancelled',
    });
  });

  // Add node to workflow
  fastify.post<{
    Params: { workflowId: string };
    Body: {
      type: string;
      name: string;
      description?: string;
      position: { x: number; y: number };
      trigger_config?: unknown;
      action_config?: unknown;
      condition?: unknown;
      delay_config?: unknown;
    };
  }>('/:workflowId/nodes', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      body: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
            },
            required: ['x', 'y'],
          },
          trigger_config: { type: 'object' },
          action_config: { type: 'object' },
          condition: { type: 'object' },
          delay_config: { type: 'object' },
        },
        required: ['type', 'name', 'position'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.addNode(tenantId, workflowId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Update node
  fastify.patch<{
    Params: { workflowId: string; nodeId: string };
    Body: Partial<{
      name: string;
      description: string;
      position: { x: number; y: number };
      trigger_config: unknown;
      action_config: unknown;
      condition: unknown;
      delay_config: unknown;
    }>;
  }>('/:workflowId/nodes/:nodeId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
          nodeId: { type: 'string' },
        },
        required: ['workflowId', 'nodeId'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId, nodeId } = request.params;

    const result = await workflowBuilderService.updateNode(
      tenantId,
      workflowId,
      nodeId,
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

  // Delete node
  fastify.delete<{
    Params: { workflowId: string; nodeId: string };
  }>('/:workflowId/nodes/:nodeId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
          nodeId: { type: 'string' },
        },
        required: ['workflowId', 'nodeId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId, nodeId } = request.params;

    const result = await workflowBuilderService.deleteNode(tenantId, workflowId, nodeId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Node deleted',
    });
  });

  // Add connection
  fastify.post<{
    Params: { workflowId: string };
    Body: {
      source_node_id: string;
      target_node_id: string;
      source_port?: string;
      target_port?: string;
      label?: string;
      condition_branch?: string;
    };
  }>('/:workflowId/connections', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
        },
        required: ['workflowId'],
      },
      body: {
        type: 'object',
        properties: {
          source_node_id: { type: 'string' },
          target_node_id: { type: 'string' },
          source_port: { type: 'string' },
          target_port: { type: 'string' },
          label: { type: 'string' },
          condition_branch: { type: 'string' },
        },
        required: ['source_node_id', 'target_node_id'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId } = request.params;

    const result = await workflowBuilderService.addConnection(tenantId, workflowId, request.body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Delete connection
  fastify.delete<{
    Params: { workflowId: string; connectionId: string };
  }>('/:workflowId/connections/:connectionId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          workflowId: { type: 'string' },
          connectionId: { type: 'string' },
        },
        required: ['workflowId', 'connectionId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { workflowId, connectionId } = request.params;

    const result = await workflowBuilderService.deleteConnection(tenantId, workflowId, connectionId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Connection deleted',
    });
  });
}
