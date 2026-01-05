/**
 * Contact Routes
 * Provides API endpoints for managing contacts associated with leads
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { ContactService } from '../../infrastructure/contacts';
import { ContactType, ContactRole } from '../../domain/value-objects';

// Validation Schemas
const contactPreferencesSchema = z.object({
  preferredContactMethod: z.enum(['email', 'phone', 'both']),
  timezone: z.string().optional(),
  bestTimeToCall: z.string().optional(),
  doNotCall: z.boolean().optional(),
  doNotEmail: z.boolean().optional(),
  language: z.string().optional(),
});

const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  mobilePhone: z.string().max(50).optional(),
  jobTitle: z.string().max(150).optional(),
  department: z.string().max(100).optional(),
  type: z.nativeEnum(ContactType).optional(),
  role: z.nativeEnum(ContactRole).optional(),
  isPrimary: z.boolean().optional(),
  preferences: contactPreferencesSchema.optional(),
  linkedInUrl: z.string().url().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

const updateContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).nullable().optional(),
  mobilePhone: z.string().max(50).nullable().optional(),
  jobTitle: z.string().max(150).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  type: z.nativeEnum(ContactType).optional(),
  role: z.nativeEnum(ContactRole).nullable().optional(),
  isPrimary: z.boolean().optional(),
  preferences: contactPreferencesSchema.nullable().optional(),
  linkedInUrl: z.string().url().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const contactFilterSchema = z.object({
  type: z.nativeEnum(ContactType).optional(),
  role: z.nativeEnum(ContactRole).optional(),
  isPrimary: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  searchTerm: z.string().optional(),
});

const bulkImportSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(100),
  skipDuplicates: z.boolean().optional(),
});

export async function contactRoutes(fastify: FastifyInstance) {
  const contactService = container.resolve(ContactService);

  /**
   * GET /leads/:leadId/contacts
   * Get all contacts for a lead
   */
  fastify.get(
    '/:leadId/contacts',
    {
      schema: {
        description: 'Get all contacts for a lead',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId']
        },
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: Object.values(ContactType) },
            role: { type: 'string', enum: Object.values(ContactRole) },
            isPrimary: { type: 'string' },
            searchTerm: { type: 'string' }
          }
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Querystring: z.infer<typeof contactFilterSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.getContactsByLead(
        request.params.leadId,
        tenantId,
        request.query
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        contacts: result.getValue(),
        count: result.getValue().length,
      });
    }
  );

  /**
   * GET /leads/:leadId/contacts/primary
   * Get primary contact for a lead
   */
  fastify.get(
    '/:leadId/contacts/primary',
    {
      schema: {
        description: 'Get primary contact for a lead',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.getPrimaryContact(request.params.leadId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const contact = result.getValue();
      if (!contact) {
        return reply.status(404).send({ error: 'No primary contact found' });
      }

      return reply.send(contact);
    }
  );

  /**
   * GET /leads/:leadId/contacts/:contactId
   * Get a specific contact
   */
  fastify.get(
    '/:leadId/contacts/:contactId',
    {
      schema: {
        description: 'Get a specific contact',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId', 'contactId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string; contactId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.getContactById(
        request.params.contactId,
        request.params.leadId,
        tenantId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const contact = result.getValue();
      if (!contact) {
        return reply.status(404).send({ error: 'Contact not found' });
      }

      return reply.send(contact);
    }
  );

  /**
   * POST /leads/:leadId/contacts
   * Create a new contact for a lead
   */
  fastify.post(
    '/:leadId/contacts',
    {
      schema: {
        description: 'Create a new contact for a lead',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId']
        },
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            phone: { type: 'string', maxLength: 50 },
            mobilePhone: { type: 'string', maxLength: 50 },
            jobTitle: { type: 'string', maxLength: 150 },
            department: { type: 'string', maxLength: 100 },
            type: { type: 'string', enum: Object.values(ContactType) },
            role: { type: 'string', enum: Object.values(ContactRole) },
            isPrimary: { type: 'boolean' },
            preferences: {
              type: 'object',
              properties: {
                preferredContactMethod: { type: 'string', enum: ['email', 'phone', 'both'] },
                timezone: { type: 'string' },
                bestTimeToCall: { type: 'string' },
                doNotCall: { type: 'boolean' },
                doNotEmail: { type: 'boolean' },
                language: { type: 'string' }
              },
              required: ['preferredContactMethod']
            },
            linkedInUrl: { type: 'string', format: 'uri', maxLength: 500 },
            notes: { type: 'string', maxLength: 2000 }
          },
          required: ['firstName', 'lastName', 'email']
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Body: z.infer<typeof createContactSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.createContact(
        request.params.leadId,
        tenantId,
        request.body,
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * PATCH /leads/:leadId/contacts/:contactId
   * Update a contact
   */
  fastify.patch(
    '/:leadId/contacts/:contactId',
    {
      schema: {
        description: 'Update a contact',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId', 'contactId']
        },
        body: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            phone: { type: ['string', 'null'], maxLength: 50 },
            mobilePhone: { type: ['string', 'null'], maxLength: 50 },
            jobTitle: { type: ['string', 'null'], maxLength: 150 },
            department: { type: ['string', 'null'], maxLength: 100 },
            type: { type: 'string', enum: Object.values(ContactType) },
            role: { type: ['string', 'null'], enum: Object.values(ContactRole) },
            isPrimary: { type: 'boolean' },
            preferences: {
              type: ['object', 'null'],
              properties: {
                preferredContactMethod: { type: 'string', enum: ['email', 'phone', 'both'] },
                timezone: { type: 'string' },
                bestTimeToCall: { type: 'string' },
                doNotCall: { type: 'boolean' },
                doNotEmail: { type: 'boolean' },
                language: { type: 'string' }
              }
            },
            linkedInUrl: { type: ['string', 'null'], format: 'uri', maxLength: 500 },
            notes: { type: ['string', 'null'], maxLength: 2000 }
          }
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string; contactId: string };
        Body: z.infer<typeof updateContactSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.updateContact(
        request.params.contactId,
        request.params.leadId,
        tenantId,
        request.body,
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * DELETE /leads/:leadId/contacts/:contactId
   * Delete a contact
   */
  fastify.delete(
    '/:leadId/contacts/:contactId',
    {
      schema: {
        description: 'Delete a contact',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId', 'contactId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string; contactId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.deleteContact(
        request.params.contactId,
        request.params.leadId,
        tenantId,
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  /**
   * POST /leads/:leadId/contacts/:contactId/primary
   * Set a contact as primary
   */
  fastify.post(
    '/:leadId/contacts/:contactId/primary',
    {
      schema: {
        description: 'Set a contact as primary',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId', 'contactId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string; contactId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.setPrimaryContact(
        request.params.contactId,
        request.params.leadId,
        tenantId,
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * POST /leads/:leadId/contacts/bulk
   * Bulk import contacts for a lead
   */
  fastify.post(
    '/:leadId/contacts/bulk',
    {
      schema: {
        description: 'Bulk import contacts for a lead',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId']
        },
        body: {
          type: 'object',
          properties: {
            contacts: {
              type: 'array',
              minItems: 1,
              maxItems: 100,
              items: {
                type: 'object',
                properties: {
                  firstName: { type: 'string', minLength: 1, maxLength: 100 },
                  lastName: { type: 'string', minLength: 1, maxLength: 100 },
                  email: { type: 'string', format: 'email', maxLength: 255 },
                  phone: { type: 'string', maxLength: 50 },
                  mobilePhone: { type: 'string', maxLength: 50 },
                  jobTitle: { type: 'string', maxLength: 150 },
                  department: { type: 'string', maxLength: 100 },
                  type: { type: 'string', enum: Object.values(ContactType) },
                  role: { type: 'string', enum: Object.values(ContactRole) },
                  isPrimary: { type: 'boolean' },
                  preferences: {
                    type: 'object',
                    properties: {
                      preferredContactMethod: { type: 'string', enum: ['email', 'phone', 'both'] },
                      timezone: { type: 'string' },
                      bestTimeToCall: { type: 'string' },
                      doNotCall: { type: 'boolean' },
                      doNotEmail: { type: 'boolean' },
                      language: { type: 'string' }
                    },
                    required: ['preferredContactMethod']
                  },
                  linkedInUrl: { type: 'string', format: 'uri', maxLength: 500 },
                  notes: { type: 'string', maxLength: 2000 }
                },
                required: ['firstName', 'lastName', 'email']
              }
            },
            skipDuplicates: { type: 'boolean' }
          },
          required: ['contacts']
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Body: z.infer<typeof bulkImportSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.bulkImportContacts(
        request.params.leadId,
        tenantId,
        request.body,
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /leads/:leadId/contacts/:contactId/history
   * Get contact history
   */
  fastify.get(
    '/:leadId/contacts/:contactId/history',
    {
      schema: {
        description: 'Get contact change history',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId', 'contactId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string; contactId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await contactService.getContactHistory(request.params.contactId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        history: result.getValue(),
        count: result.getValue().length,
      });
    }
  );

  /**
   * GET /leads/:leadId/contacts/stats
   * Get contact statistics for a lead
   */
  fastify.get(
    '/:leadId/contacts/stats',
    {
      schema: {
        description: 'Get contact statistics for a lead',
        tags: ['Contacts'],
        params: {
          type: 'object',
          properties: {
            leadId: { type: 'string', format: 'uuid' }
          },
          required: ['leadId']
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: { leadId: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const countResult = await contactService.countContactsByType(
        request.params.leadId,
        tenantId
      );

      if (countResult.isFailure) {
        return reply.status(400).send({ error: countResult.error });
      }

      const counts = countResult.getValue();
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

      return reply.send({
        total,
        byType: counts,
        availableTypes: Object.values(ContactType),
        availableRoles: Object.values(ContactRole),
      });
    }
  );
}
