/**
 * Customer Routes
 * REST API endpoints for customer management
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import {
  CustomerService,
  CustomerStatus,
  CustomerType,
  CustomerTier,
} from '../../infrastructure/customers';
import { toJsonSchema } from '../../utils/zod-schema';

// Zod Schemas for validation
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const createCustomerSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(255).optional(),
  address: addressSchema.optional(),
  type: z.nativeEnum(CustomerType).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  accountManagerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const updateCustomerSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  website: z.string().url().max(255).nullable().optional(),
  address: addressSchema.nullable().optional(),
  type: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

const convertLeadSchema = z.object({
  leadId: z.string().uuid(),
  companyName: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url().max(255).optional(),
  address: addressSchema.optional(),
  type: z.nativeEnum(CustomerType).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  accountManagerId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  createOpportunity: z.boolean().optional(),
  opportunityName: z.string().max(255).optional(),
  opportunityAmount: z.number().positive().optional(),
  opportunityStage: z.string().max(100).optional(),
});

const bulkOperationSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['updateStatus', 'updateTier', 'reassign', 'addTags', 'removeTags', 'delete']),
  status: z.nativeEnum(CustomerStatus).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  accountManagerId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const filterQuerySchema = z.object({
  status: z.union([z.nativeEnum(CustomerStatus), z.array(z.nativeEnum(CustomerStatus))]).optional(),
  type: z.union([z.nativeEnum(CustomerType), z.array(z.nativeEnum(CustomerType))]).optional(),
  tier: z.union([z.nativeEnum(CustomerTier), z.array(z.nativeEnum(CustomerTier))]).optional(),
  accountManagerId: z.string().uuid().optional(),
  hasRevenue: z.coerce.boolean().optional(),
  revenueMin: z.coerce.number().optional(),
  revenueMax: z.coerce.number().optional(),
  searchTerm: z.string().optional(),
  convertedDateFrom: z.coerce.date().optional(),
  convertedDateTo: z.coerce.date().optional(),
  sortBy: z.enum(['companyName', 'email', 'totalRevenue', 'lifetimeValue', 'convertedAt', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const updateRevenueSchema = z.object({
  amount: z.number(),
});

// Customer Notes Schemas
const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  isPinned: z.boolean().optional(),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  isPinned: z.boolean().optional(),
});

const notesQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  isPinned: z.coerce.boolean().optional(),
});

// Customer Activity Query Schema
const activityQuerySchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  actionType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function customerRoutes(fastify: FastifyInstance) {
  const customerService = container.resolve(CustomerService);

  /**
   * POST /customers - Create a new customer
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Create a new customer',
        tags: ['Customers'],
        body: toJsonSchema(createCustomerSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createCustomerSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.createCustomer(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /customers - List customers with filters
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List customers with filters',
        tags: ['Customers'],
        querystring: toJsonSchema(filterQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof filterQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { page, limit, sortBy, sortOrder, ...filters } = request.query;

      const result = await customerService.getCustomers(
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
   * GET /customers/statistics - Get customer statistics
   */
  fastify.get(
    '/statistics',
    {
      schema: {
        description: 'Get customer statistics',
        tags: ['Customers'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const query = request.query as {
        accountManagerId?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const result = await customerService.getCustomerStatistics(tenantId, {
        accountManagerId: query.accountManagerId,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /customers/top-revenue - Get top customers by revenue
   */
  fastify.get(
    '/top-revenue',
    {
      schema: {
        description: 'Get top customers by revenue',
        tags: ['Customers'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 10;

      const result = await customerService.getTopCustomersByRevenue(tenantId, limit);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /customers/convert-lead - Convert a lead to a customer
   */
  fastify.post(
    '/convert-lead',
    {
      schema: {
        description: 'Convert a lead to a customer',
        tags: ['Customers'],
        body: toJsonSchema(convertLeadSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof convertLeadSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.convertLeadToCustomer(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /customers/:id - Get customer by ID
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get customer by ID',
        tags: ['Customers'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.getCustomerById(tenantId, id);

      if (result.isFailure) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * PATCH /customers/:id - Update customer
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update customer',
        tags: ['Customers'],
        body: toJsonSchema(updateCustomerSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateCustomerSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.updateCustomer(tenantId, id, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /customers/:id - Delete customer
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete customer',
        tags: ['Customers'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.deleteCustomer(tenantId, id);

      if (result.isFailure) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * GET /customers/:id/timeline - Get customer timeline
   */
  fastify.get(
    '/:id/timeline',
    {
      schema: {
        description: 'Get customer timeline',
        tags: ['Customers'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const query = request.query as { limit?: string };
      const limit = query.limit ? parseInt(query.limit, 10) : 50;

      const result = await customerService.getCustomerTimeline(tenantId, id, limit);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /customers/:id/health-score - Get customer health score
   */
  fastify.get(
    '/:id/health-score',
    {
      schema: {
        description: 'Get customer health score',
        tags: ['Customers'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.getCustomerHealthScore(tenantId, id);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /customers/:id/revenue - Update customer revenue (internal use)
   */
  fastify.post(
    '/:id/revenue',
    {
      schema: {
        description: 'Update customer revenue',
        tags: ['Customers'],
        body: toJsonSchema(updateRevenueSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateRevenueSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.updateCustomerRevenue(tenantId, id, request.body.amount);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send({ success: true });
    }
  );

  /**
   * POST /customers/bulk - Bulk operations on customers
   */
  fastify.post(
    '/bulk',
    {
      schema: {
        description: 'Bulk operations on customers',
        tags: ['Customers'],
        body: toJsonSchema(bulkOperationSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof bulkOperationSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string | undefined;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.bulkOperation(tenantId, request.body, userId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  // ============================================
  // Customer Notes Endpoints
  // ============================================

  /**
   * GET /customers/:id/notes - Get customer notes
   */
  fastify.get(
    '/:id/notes',
    {
      schema: {
        description: 'Get customer notes',
        tags: ['Customer Notes'],
        querystring: toJsonSchema(notesQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: z.infer<typeof notesQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;
      const { page = 1, limit = 20, isPinned } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.getCustomerNotes(tenantId, id, {
        page,
        limit,
        isPinned,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /customers/:id/notes - Add a note to a customer
   */
  fastify.post(
    '/:id/notes',
    {
      schema: {
        description: 'Add a note to a customer',
        tags: ['Customer Notes'],
        body: toJsonSchema(createNoteSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof createNoteSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      if (!userId) {
        return reply.status(400).send({ error: 'User ID required' });
      }

      const result = await customerService.addCustomerNote(tenantId, id, {
        ...request.body,
        createdBy: userId,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * PATCH /customers/:id/notes/:noteId - Update a customer note
   */
  fastify.patch(
    '/:id/notes/:noteId',
    {
      schema: {
        description: 'Update a customer note',
        tags: ['Customer Notes'],
        body: toJsonSchema(updateNoteSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; noteId: string };
        Body: z.infer<typeof updateNoteSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;
      const { id, noteId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.updateCustomerNote(
        tenantId,
        id,
        noteId,
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
   * DELETE /customers/:id/notes/:noteId - Delete a customer note
   */
  fastify.delete(
    '/:id/notes/:noteId',
    {
      schema: {
        description: 'Delete a customer note',
        tags: ['Customer Notes'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string; noteId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id, noteId } = request.params;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.deleteCustomerNote(tenantId, id, noteId);

      if (result.isFailure) {
        return reply.status(404).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  // ============================================
  // Customer Activity Endpoints
  // ============================================

  /**
   * GET /customers/:id/activity - Get customer activity log
   */
  fastify.get(
    '/:id/activity',
    {
      schema: {
        description: 'Get customer activity log',
        tags: ['Customer Activity'],
        querystring: toJsonSchema(activityQuerySchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: z.infer<typeof activityQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const { id } = request.params;
      const { page = 1, limit = 50, actionType, startDate, endDate } = request.query;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await customerService.getCustomerActivity(tenantId, id, {
        page,
        limit,
        actionType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );
}
