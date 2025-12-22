/**
 * Standalone Contacts Routes
 * Provides API endpoints for managing contacts directly (not through leads)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Validation Schemas
const listContactsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  search: z.string().optional(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
});

const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  customerId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
});

export async function contactsStandaloneRoutes(fastify: FastifyInstance) {
  /**
   * GET /contacts
   * List all contacts for tenant
   */
  fastify.get('/', {
    schema: {
      description: 'List all contacts',
      tags: ['Contacts'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          search: { type: 'string' },
          customerId: { type: 'string', format: 'uuid' },
          leadId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (
    request: FastifyRequest<{ Querystring: z.infer<typeof listContactsQuerySchema> }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID required' });
    }

    const query = listContactsQuerySchema.parse(request.query);

    // Return empty list with pagination metadata
    // Real implementation would query the contacts table
    return reply.send({
      items: [],
      total: 0,
      limit: query.limit,
      offset: query.offset,
    });
  });

  /**
   * GET /contacts/:contactId
   * Get a specific contact
   */
  fastify.get('/:contactId', {
    schema: {
      description: 'Get a specific contact',
      tags: ['Contacts'],
      params: {
        type: 'object',
        properties: {
          contactId: { type: 'string', format: 'uuid' },
        },
        required: ['contactId'],
      },
    },
  }, async (
    request: FastifyRequest<{ Params: { contactId: string } }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID required' });
    }

    return reply.status(404).send({ error: 'Contact not found' });
  });

  /**
   * POST /contacts
   * Create a new contact
   */
  fastify.post('/', {
    schema: {
      description: 'Create a new contact',
      tags: ['Contacts'],
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          email: { type: 'string', format: 'email', maxLength: 255 },
          phone: { type: 'string', maxLength: 50 },
          mobile: { type: 'string', maxLength: 50 },
          title: { type: 'string', maxLength: 100 },
          department: { type: 'string', maxLength: 100 },
          company: { type: 'string', maxLength: 255 },
          customerId: { type: 'string', format: 'uuid' },
          leadId: { type: 'string', format: 'uuid' },
          notes: { type: 'string', maxLength: 2000 },
        },
        required: ['firstName', 'lastName', 'email'],
      },
    },
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof createContactSchema> }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant ID required' });
    }

    const data = createContactSchema.parse(request.body);

    return reply.status(201).send({
      id: crypto.randomUUID(),
      tenantId,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export default contactsStandaloneRoutes;
