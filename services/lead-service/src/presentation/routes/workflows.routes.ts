/**
 * Workflows Routes
 * REST API endpoints for workflow automation management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { WorkflowService } from '../../infrastructure/workflows';
import {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ListWorkflowsOptions,
  ListExecutionsOptions,
  TriggerContext,
  WorkflowEntityType,
  WorkflowTriggerType,
  WorkflowExecutionStatus,
} from '../../infrastructure/workflows/types';

// Request schemas
interface WorkflowParams {
  id: string;
}

interface ExecutionParams {
  id: string;
}

interface ListWorkflowsQuery {
  entityType?: WorkflowEntityType;
  triggerType?: WorkflowTriggerType;
  isActive?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface ListExecutionsQuery {
  workflowId?: string;
  status?: WorkflowExecutionStatus;
  entityType?: WorkflowEntityType;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

interface TriggerWorkflowBody {
  entityType: WorkflowEntityType;
  entityId: string;
  entity: Record<string, unknown>;
  event: WorkflowTriggerType;
  previousEntity?: Record<string, unknown>;
  changedFields?: string[];
  metadata?: Record<string, unknown>;
}

export async function workflowsRoutes(fastify: FastifyInstance): Promise<void> {
  const workflowService = container.resolve<WorkflowService>('WorkflowService');

  /**
   * Create a new workflow
   * POST /api/v1/workflows
   */
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Body: CreateWorkflowInput }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const result = await workflowService.createWorkflow(
        tenantId,
        userId,
        request.body
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Creation Failed',
          message: result.error || 'Failed to create workflow',
        });
      }

      return reply.status(201).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * List workflows
   * GET /api/v1/workflows
   */
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Querystring: ListWorkflowsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { entityType, triggerType, isActive, search, page, limit } =
        request.query;

      const options: ListWorkflowsOptions = {
        entityType,
        triggerType,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const result = await workflowService.listWorkflows(tenantId, options);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list workflows',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get workflow by ID
   * GET /api/v1/workflows/:id
   */
  fastify.get(
    '/:id',
    async (
      request: FastifyRequest<{ Params: WorkflowParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.getWorkflowById(id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get workflow',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Workflow not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Update workflow
   * PATCH /api/v1/workflows/:id
   */
  fastify.patch(
    '/:id',
    async (
      request: FastifyRequest<{
        Params: WorkflowParams;
        Body: UpdateWorkflowInput;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.updateWorkflow(
        id,
        tenantId,
        request.body
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Update Failed',
          message: result.error || 'Failed to update workflow',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Delete workflow
   * DELETE /api/v1/workflows/:id
   */
  fastify.delete(
    '/:id',
    async (
      request: FastifyRequest<{ Params: WorkflowParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.deleteWorkflow(id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Delete Failed',
          message: result.error || 'Failed to delete workflow',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Workflow deleted successfully',
      });
    }
  );

  /**
   * Activate workflow
   * POST /api/v1/workflows/:id/activate
   */
  fastify.post(
    '/:id/activate',
    async (
      request: FastifyRequest<{ Params: WorkflowParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.updateWorkflow(id, tenantId, {
        isActive: true,
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Activation Failed',
          message: result.error || 'Failed to activate workflow',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Deactivate workflow
   * POST /api/v1/workflows/:id/deactivate
   */
  fastify.post(
    '/:id/deactivate',
    async (
      request: FastifyRequest<{ Params: WorkflowParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.updateWorkflow(id, tenantId, {
        isActive: false,
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Deactivation Failed',
          message: result.error || 'Failed to deactivate workflow',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Trigger workflow manually
   * POST /api/v1/workflows/trigger
   */
  fastify.post(
    '/trigger',
    async (
      request: FastifyRequest<{ Body: TriggerWorkflowBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const body = request.body;

      const context: TriggerContext = {
        entityType: body.entityType,
        entityId: body.entityId,
        entity: body.entity,
        event: body.event,
        previousEntity: body.previousEntity,
        changedFields: body.changedFields,
        userId,
        tenantId,
        metadata: body.metadata,
      };

      const result = await workflowService.processTrigger(context);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Trigger Failed',
          message: result.error || 'Failed to process trigger',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          executionsStarted: result.value?.length || 0,
          executions: result.value,
        },
      });
    }
  );

  /**
   * List workflow executions
   * GET /api/v1/workflows/executions
   */
  fastify.get(
    '/executions',
    async (
      request: FastifyRequest<{ Querystring: ListExecutionsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const {
        workflowId,
        status,
        entityType,
        entityId,
        from,
        to,
        page,
        limit,
      } = request.query;

      const options: ListExecutionsOptions = {
        workflowId,
        status,
        entityType,
        entityId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const result = await workflowService.listExecutions(tenantId, options);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list executions',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get execution by ID
   * GET /api/v1/workflows/executions/:id
   */
  fastify.get(
    '/executions/:id',
    async (
      request: FastifyRequest<{ Params: ExecutionParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { id } = request.params;

      const result = await workflowService.getExecutionById(id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get execution',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Execution not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );
}
