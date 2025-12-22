/**
 * Task Routes
 * Provides API endpoints for task management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { container } from 'tsyringe';
import {
  TaskService,
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskEntityType,
  RecurrenceFrequency,
} from '../../infrastructure/tasks';

// Validation Schemas
const recurrenceRuleSchema = z.object({
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
  until: z.coerce.date().optional(),
  byDay: z.array(z.string()).optional(),
  byMonthDay: z.array(z.number()).optional(),
  byMonth: z.array(z.number()).optional(),
});

const createTaskSchema = z.object({
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.nativeEnum(TaskType).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
  reminderAt: z.coerce.date().optional(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: recurrenceRuleSchema.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  type: z.nativeEnum(TaskType).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  reminderAt: z.coerce.date().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrenceRule: recurrenceRuleSchema.optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const completeTaskSchema = z.object({
  outcome: z.string().max(5000).optional(),
  createFollowUp: z.boolean().optional(),
  followUpDate: z.coerce.date().optional(),
  followUpTitle: z.string().max(500).optional(),
});

const taskQuerySchema = z.object({
  status: z.union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))]).optional(),
  priority: z.union([z.nativeEnum(TaskPriority), z.array(z.nativeEnum(TaskPriority))]).optional(),
  type: z.union([z.nativeEnum(TaskType), z.array(z.nativeEnum(TaskType))]).optional(),
  assignedTo: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  isOverdue: z.coerce.boolean().optional(),
  includeCompleted: z.coerce.boolean().optional(),
  searchTerm: z.string().optional(),
  sortBy: z.enum(['dueDate', 'priority', 'createdAt', 'updatedAt', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const bulkOperationSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['complete', 'cancel', 'defer', 'reassign', 'delete']),
  assignTo: z.string().uuid().optional(),
  deferTo: z.coerce.date().optional(),
});

const entityTasksQuerySchema = z.object({
  entityType: z.nativeEnum(TaskEntityType),
  entityId: z.string().uuid(),
  includeCompleted: z.coerce.boolean().optional(),
});

export async function taskRoutes(fastify: FastifyInstance) {
  const taskService = container.resolve(TaskService);

  /**
   * POST /tasks
   * Create a new task
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new task',
        tags: ['Tasks'],
        body: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            customerId: { type: 'string', format: 'uuid' },
            opportunityId: { type: 'string', format: 'uuid' },
            title: { type: 'string', minLength: 1, maxLength: 500 },
            description: { type: 'string', maxLength: 5000 },
            type: { type: 'string', enum: Object.values(TaskType) },
            priority: { type: 'string', enum: Object.values(TaskPriority) },
            assignedTo: { type: 'string', format: 'uuid' },
            dueDate: { type: 'string', format: 'date-time' },
            reminderAt: { type: 'string', format: 'date-time' },
            isRecurring: { type: 'boolean' },
            recurrenceRule: {
              type: 'object',
              properties: {
                frequency: { type: 'string', enum: Object.values(RecurrenceFrequency) },
                interval: { type: 'integer', minimum: 1 },
                count: { type: 'integer', minimum: 1 },
                until: { type: 'string', format: 'date-time' },
                byDay: { type: 'array', items: { type: 'string' } },
                byMonthDay: { type: 'array', items: { type: 'number' } },
                byMonth: { type: 'array', items: { type: 'number' } }
              },
              required: ['frequency']
            },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object', additionalProperties: true }
          },
          required: ['title']
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createTaskSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.createTask(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /tasks
   * Get tasks with filtering and pagination
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Get tasks with filters',
        tags: ['Tasks'],
        querystring: toJsonSchema(taskQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof taskQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      const result = await taskService.getTasks(
        tenantId,
        filters,
        { sortBy, sortOrder },
        page || 1,
        limit || 20
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /tasks/upcoming
   * Get upcoming tasks for the current user
   */
  fastify.get(
    '/upcoming',
    {
      schema: {
        description: 'Get upcoming tasks for current user',
        tags: ['Tasks'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' });
      }

      const result = await taskService.getUpcomingTasks(tenantId, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /tasks/statistics
   * Get task statistics
   */
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get task statistics',
        tags: ['Tasks'],
        querystring: toJsonSchema(z.object({
          userId: z.string().uuid().optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { userId?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.getTaskStatistics(tenantId, request.query.userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /tasks/by-entity
   * Get tasks by entity (lead, customer, opportunity)
   */
  fastify.get(
    '/by-entity',
    {
      schema: {
        description: 'Get tasks by entity',
        tags: ['Tasks'],
        querystring: toJsonSchema(entityTasksQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof entityTasksQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { entityType, entityId, includeCompleted } = request.query;

      const result = await taskService.getTasksByEntity(
        tenantId,
        entityType,
        entityId,
        includeCompleted
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({ tasks: result.getValue() });
    }
  );

  /**
   * GET /tasks/:id
   * Get a specific task
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get task by ID',
        tags: ['Tasks'],
        params: toJsonSchema(z.object({
          id: z.string().uuid(),
        })),
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.getTaskById(request.params.id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const task = result.getValue();
      if (!task) {
        return reply.status(404).send({ error: 'Task not found' });
      }

      return reply.send(task);
    }
  );

  /**
   * PATCH /tasks/:id
   * Update a task
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update task',
        tags: ['Tasks'],
        params: toJsonSchema(z.object({
          id: z.string().uuid(),
        })),
        body: toJsonSchema(updateTaskSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateTaskSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.updateTask(
        request.params.id,
        tenantId,
        request.body,
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /tasks/:id/complete
   * Complete a task
   */
  fastify.post(
    '/:id/complete',
    {
      schema: {
        description: 'Complete a task',
        tags: ['Tasks'],
        params: toJsonSchema(z.object({
          id: z.string().uuid(),
        })),
        body: toJsonSchema(completeTaskSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof completeTaskSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.completeTask(
        request.params.id,
        tenantId,
        request.body,
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /tasks/:id/cancel
   * Cancel a task
   */
  fastify.post(
    '/:id/cancel',
    {
      schema: {
        description: 'Cancel a task',
        tags: ['Tasks'],
        params: toJsonSchema(z.object({
          id: z.string().uuid(),
        })),
        body: toJsonSchema(z.object({
          reason: z.string().max(1000).optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { reason?: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.cancelTask(
        request.params.id,
        tenantId,
        request.body.reason || 'No reason provided',
        userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /tasks/:id
   * Delete a task
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete a task',
        tags: ['Tasks'],
        params: toJsonSchema(z.object({
          id: z.string().uuid(),
        })),
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.deleteTask(request.params.id, tenantId, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /tasks/bulk
   * Perform bulk operations on tasks
   */
  fastify.post(
    '/bulk',
    {
      schema: {
        description: 'Bulk task operations',
        tags: ['Tasks'],
        body: toJsonSchema(bulkOperationSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkOperationSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string || 'system';

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await taskService.bulkOperation(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );
}
