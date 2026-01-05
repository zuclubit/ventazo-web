/**
 * Communication Routes
 * Provides API endpoints for communication tracking with leads
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { container } from 'tsyringe';
import {
  CommunicationService,
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CallOutcome,
  EmailStatus,
  MeetingType,
} from '../../infrastructure/communications';

// Validation Schemas
const participantSchema = z.object({
  type: z.enum(['lead', 'contact', 'user', 'external']),
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
});

const attachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string(),
  size: z.number().int().positive(),
  url: z.string().url(),
  uploadedAt: z.coerce.date(),
});

const callDetailsSchema = z.object({
  phoneNumber: z.string().min(1),
  duration: z.number().int().positive().optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  recordingUrl: z.string().url().optional(),
  transcription: z.string().optional(),
});

const emailDetailsSchema = z.object({
  subject: z.string().min(1),
  from: z.string().email(),
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  htmlBody: z.string().optional(),
  textBody: z.string().optional(),
  status: z.nativeEnum(EmailStatus),
  openedAt: z.coerce.date().optional(),
  clickedAt: z.coerce.date().optional(),
  threadId: z.string().optional(),
  messageId: z.string().optional(),
});

const meetingDetailsSchema = z.object({
  title: z.string().min(1),
  type: z.nativeEnum(MeetingType),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  timezone: z.string().optional(),
  agenda: z.string().optional(),
  attendees: z.array(participantSchema).optional(),
  calendarEventId: z.string().optional(),
});

const createCommunicationSchema = z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  type: z.nativeEnum(CommunicationType),
  direction: z.nativeEnum(CommunicationDirection),
  status: z.nativeEnum(CommunicationStatus).optional(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  summary: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
  occurredAt: z.coerce.date().optional(),
  duration: z.number().int().positive().optional(),
  assignedTo: z.string().uuid().optional(),
  callDetails: callDetailsSchema.optional(),
  emailDetails: emailDetailsSchema.optional(),
  meetingDetails: meetingDetailsSchema.optional(),
  participants: z.array(participantSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateCommunicationSchema = z.object({
  status: z.nativeEnum(CommunicationStatus).optional(),
  subject: z.string().max(500).nullable().optional(),
  body: z.string().max(50000).nullable().optional(),
  summary: z.string().max(2000).nullable().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  occurredAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().nullable().optional(),
  duration: z.number().int().positive().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  callDetails: callDetailsSchema.nullable().optional(),
  emailDetails: emailDetailsSchema.nullable().optional(),
  meetingDetails: meetingDetailsSchema.nullable().optional(),
  participants: z.array(participantSchema).optional(),
  attachments: z.array(attachmentSchema).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const communicationFilterSchema = z.object({
  type: z.nativeEnum(CommunicationType).optional(),
  direction: z.nativeEnum(CommunicationDirection).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  createdBy: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  tags: z
    .string()
    .transform((val) => val.split(','))
    .optional(),
  searchTerm: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sortBy: z.enum(['occurredAt', 'createdAt', 'scheduledAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const scheduleFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  type: z.nativeEnum(CommunicationType),
  scheduledAt: z.coerce.date(),
  subject: z.string().max(500).optional(),
  body: z.string().max(50000).optional(),
  assignedTo: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

export async function communicationRoutes(fastify: FastifyInstance) {
  const communicationService = container.resolve(CommunicationService);

  /**
   * GET /communications
   * List communications
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List communications',
        tags: ['Communications'],
        querystring: toJsonSchema(z.object({
          limit: z.coerce.number().int().positive().max(100).optional(),
          userId: z.string().uuid().optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { limit?: number; userId?: string } }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const { limit = 50, userId } = request.query;

      const result = await communicationService.getUpcomingCommunications(
        tenantId,
        userId,
        30 // 30 days
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const communications = result.getValue() || [];
      return reply.send({
        items: communications.slice(0, limit),
        total: communications.length,
      });
    }
  );

  /**
   * POST /communications
   * Log a new communication
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Log a new communication',
        tags: ['Communications'],
        body: toJsonSchema(createCommunicationSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createCommunicationSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.logCommunication(
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
   * GET /communications/:id
   * Get a specific communication
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get a specific communication',
        tags: ['Communications'],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getCommunicationById(request.params.id, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      const communication = result.getValue();
      if (!communication) {
        return reply.status(404).send({ error: 'Communication not found' });
      }

      return reply.send(communication);
    }
  );

  /**
   * GET /communications/lead/:leadId
   * Get communications for a lead
   */
  fastify.get(
    '/lead/:leadId',
    {
      schema: {
        description: 'Get communications for a lead',
        tags: ['Communications'],
        params: { type: 'object', properties: { leadId: { type: 'string', format: 'uuid' } }, required: ['leadId'] },
        querystring: toJsonSchema(communicationFilterSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Querystring: z.infer<typeof communicationFilterSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getCommunicationsByLead(
        request.params.leadId,
        tenantId,
        request.query
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * GET /communications/lead/:leadId/timeline
   * Get communication timeline for a lead
   */
  fastify.get(
    '/lead/:leadId/timeline',
    {
      schema: {
        description: 'Get communication timeline for a lead',
        tags: ['Communications'],
        params: { type: 'object', properties: { leadId: { type: 'string', format: 'uuid' } }, required: ['leadId'] },
        querystring: toJsonSchema(z.object({
          limit: z.coerce.number().int().positive().max(100).optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { leadId: string };
        Querystring: { limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getTimeline(
        request.params.leadId,
        tenantId,
        request.query.limit
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        timeline: result.getValue(),
        count: result.getValue().length,
      });
    }
  );

  /**
   * GET /communications/lead/:leadId/stats
   * Get communication statistics for a lead
   */
  fastify.get(
    '/lead/:leadId/stats',
    {
      schema: {
        description: 'Get communication statistics for a lead',
        tags: ['Communications'],
        params: { type: 'object', properties: { leadId: { type: 'string', format: 'uuid' } }, required: ['leadId'] },
      },
    },
    async (request: FastifyRequest<{ Params: { leadId: string } }>, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getStats(request.params.leadId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  /**
   * PATCH /communications/:id
   * Update a communication
   */
  fastify.patch(
    '/:id',
    {
      schema: {
        description: 'Update a communication',
        tags: ['Communications'],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
        body: toJsonSchema(updateCommunicationSchema),
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof updateCommunicationSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.updateCommunication(
        request.params.id,
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
   * DELETE /communications/:id
   * Delete a communication
   */
  fastify.delete(
    '/:id',
    {
      schema: {
        description: 'Delete a communication',
        tags: ['Communications'],
        params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } }, required: ['id'] },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.deleteCommunication(
        request.params.id,
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
   * POST /communications/schedule
   * Schedule a follow-up communication
   */
  fastify.post(
    '/schedule',
    {
      schema: {
        description: 'Schedule a follow-up communication',
        tags: ['Communications'],
        body: toJsonSchema(scheduleFollowUpSchema),
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof scheduleFollowUpSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.scheduleFollowUp(
        request.body.leadId,
        tenantId,
        {
          type: request.body.type,
          scheduledAt: request.body.scheduledAt,
          subject: request.body.subject,
          body: request.body.body,
          assignedTo: request.body.assignedTo,
          contactId: request.body.contactId,
        },
        userId || 'system'
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(201).send(result.getValue());
    }
  );

  /**
   * GET /communications/upcoming
   * Get upcoming scheduled communications
   */
  fastify.get(
    '/upcoming',
    {
      schema: {
        description: 'Get upcoming scheduled communications',
        tags: ['Communications'],
        querystring: toJsonSchema(z.object({
          days: z.coerce.number().int().positive().max(30).optional(),
          userId: z.string().uuid().optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { days?: number; userId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getUpcomingCommunications(
        tenantId,
        request.query.userId,
        request.query.days
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        communications: result.getValue(),
        count: result.getValue().length,
      });
    }
  );

  /**
   * GET /communications/overdue
   * Get overdue scheduled communications
   */
  fastify.get(
    '/overdue',
    {
      schema: {
        description: 'Get overdue scheduled communications',
        tags: ['Communications'],
        querystring: toJsonSchema(z.object({
          userId: z.string().uuid().optional(),
        })),
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { userId?: string };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant ID required' });
      }

      const result = await communicationService.getOverdueCommunications(
        tenantId,
        request.query.userId
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send({
        communications: result.getValue(),
        count: result.getValue().length,
      });
    }
  );

  /**
   * GET /communications/config
   * Get available communication configuration options
   */
  fastify.get(
    '/config',
    {
      schema: {
        description: 'Get available communication configuration options',
        tags: ['Communications'],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        types: Object.values(CommunicationType),
        directions: Object.values(CommunicationDirection),
        statuses: Object.values(CommunicationStatus),
        callOutcomes: Object.values(CallOutcome),
        emailStatuses: Object.values(EmailStatus),
        meetingTypes: Object.values(MeetingType),
      });
    }
  );
}
