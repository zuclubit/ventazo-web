/**
 * Email Tracking Routes
 * REST API endpoints for email tracking, sequences, and analytics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { container } from 'tsyringe';
import { EmailTrackingService } from '../../infrastructure/email-tracking';

// ==================== Validation Schemas ====================

const createTrackedEmailSchema = z.object({
  messageId: z.string().min(1),
  threadId: z.string().optional(),
  subject: z.string().min(1),
  fromEmail: z.string().email(),
  fromName: z.string().optional(),
  toEmail: z.string().email(),
  toName: z.string().optional(),
  ccEmails: z.array(z.string().email()).optional(),
  bccEmails: z.array(z.string().email()).optional(),
  entityType: z.enum(['lead', 'contact', 'customer', 'opportunity']).optional(),
  entityId: z.string().uuid().optional(),
  htmlBody: z.string().min(1),
  links: z.array(z.object({
    originalUrl: z.string().url(),
    anchorText: z.string().optional(),
    linkType: z.enum(['primary_cta', 'secondary_cta', 'inline', 'footer', 'unsubscribe', 'social', 'other']).optional(),
    position: z.number().int().min(0),
  })).optional(),
});

const listEmailsQuerySchema = z.object({
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const analyticsQuerySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  userId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

const createSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  steps: z.array(z.object({
    type: z.enum(['email', 'wait', 'condition']),
    templateId: z.string().uuid().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    waitDays: z.number().int().min(0).optional(),
    waitHours: z.number().int().min(0).max(23).optional(),
    waitUntilTime: z.string().optional(),
    skipWeekends: z.boolean().optional(),
    condition: z.object({
      field: z.string(),
      operator: z.string(),
      value: z.unknown(),
    }).optional(),
  })).min(1),
  settings: z.object({
    sendingWindow: z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      timezone: z.string().optional(),
      sendDays: z.array(z.number().int().min(0).max(6)).optional(),
    }).optional(),
    exitConditions: z.object({
      onReply: z.boolean().optional(),
      onClick: z.boolean().optional(),
      onUnsubscribe: z.boolean().optional(),
      onBounce: z.boolean().optional(),
      onConversion: z.boolean().optional(),
    }).optional(),
    throttling: z.object({
      maxPerDay: z.number().int().min(1).optional(),
      delayBetweenEmails: z.number().int().min(0).optional(),
    }).optional(),
  }).optional(),
});

const enrollInSequenceSchema = z.object({
  entityType: z.enum(['lead', 'contact', 'customer']),
  entityId: z.string().uuid(),
  email: z.string().email(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ==================== Route Handlers ====================

export async function emailTrackingRoutes(fastify: FastifyInstance) {
  const emailTrackingService = container.resolve(EmailTrackingService);

  // ==================== Events List ====================

  // List all tracking events
  fastify.get('/api/v1/email-tracking/events', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'List all email tracking events',
      querystring: toJsonSchema(z.object({
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
        eventType: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed']).optional(),
      })),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || request.headers['x-tenant-id'] || 'default-tenant';
    const query = request.query as { limit?: number; offset?: number; eventType?: string };

    // Return empty list with metadata for now
    return reply.send({
      items: [],
      total: 0,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });
  });

  // ==================== Tracked Emails ====================

  // Create tracked email
  fastify.post('/api/v1/email-tracking/emails', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Create a tracked email',
      body: toJsonSchema(createTrackedEmailSchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const userId = (request as any).userId || 'default-user';
    const input = createTrackedEmailSchema.parse(request.body);

    const result = await emailTrackingService.createTrackedEmail(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get tracked email by ID
  fastify.get('/api/v1/email-tracking/emails/:emailId', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Get tracked email by ID',
      params: toJsonSchema(z.object({
        emailId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { emailId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { emailId } = request.params;

    const result = await emailTrackingService.getTrackedEmail(tenantId, emailId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // List tracked emails
  fastify.get('/api/v1/email-tracking/emails', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'List tracked emails',
      querystring: toJsonSchema(listEmailsQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const userId = (request as any).userId || 'default-user';
    const query = listEmailsQuerySchema.parse(request.query);

    const result = await emailTrackingService.listTrackedEmails(tenantId, userId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get email performance
  fastify.get('/api/v1/email-tracking/emails/:emailId/performance', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Get email performance details',
      params: toJsonSchema(z.object({
        emailId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { emailId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { emailId } = request.params;

    const result = await emailTrackingService.getEmailPerformance(tenantId, emailId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get link analytics for an email
  fastify.get('/api/v1/email-tracking/emails/:emailId/links', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Get link analytics for an email',
      params: toJsonSchema(z.object({
        emailId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { emailId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { emailId } = request.params;

    const result = await emailTrackingService.getLinkAnalytics(tenantId, emailId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get tracking events for an email
  fastify.get('/api/v1/email-tracking/emails/:emailId/events', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Get tracking events for an email',
      params: toJsonSchema(z.object({
        emailId: z.string().uuid(),
      })),
      querystring: toJsonSchema(z.object({
        eventType: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed']).optional(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { emailId: string }; Querystring: { eventType?: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { emailId } = request.params;
    const { eventType } = request.query;

    const result = await emailTrackingService.getTrackingEvents(tenantId, emailId, eventType as any);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Tracking Endpoints (Pixel & Links) ====================

  // Record open (pixel endpoint) - Returns 1x1 transparent GIF
  fastify.get('/api/v1/email-tracking/pixel/:trackingId.gif', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Record email open (tracking pixel)',
      params: toJsonSchema(z.object({
        trackingId: z.string(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { trackingId: string } }>, reply: FastifyReply) => {
    const { trackingId } = request.params;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    // Record the open asynchronously
    emailTrackingService.recordOpen({
      trackingId,
      ipAddress,
      userAgent,
    }).catch(err => console.error('Failed to record open:', err));

    // Return 1x1 transparent GIF
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    return reply
      .header('Content-Type', 'image/gif')
      .header('Cache-Control', 'no-cache, no-store, must-revalidate')
      .header('Pragma', 'no-cache')
      .header('Expires', '0')
      .send(transparentGif);
  });

  // Record click (link redirect)
  fastify.get('/api/v1/email-tracking/click/:trackingId/:linkId', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Record link click and redirect',
      params: toJsonSchema(z.object({
        trackingId: z.string(),
        linkId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { trackingId: string; linkId: string } }>, reply: FastifyReply) => {
    const { trackingId, linkId } = request.params;
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await emailTrackingService.recordClick({
      trackingId,
      linkId,
      ipAddress,
      userAgent,
    });

    if (result.isFailure || !result.value) {
      return reply.status(404).send({ error: 'Link not found' });
    }

    return reply.redirect(302, result.value.redirectUrl);
  });

  // Webhook for delivery confirmation
  fastify.post('/api/v1/email-tracking/webhook/delivery', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Webhook for delivery confirmation',
      body: toJsonSchema(z.object({
        trackingId: z.string(),
      })),
    },
  }, async (request: FastifyRequest<{ Body: { trackingId: string } }>, reply: FastifyReply) => {
    const { trackingId } = request.body;

    const result = await emailTrackingService.recordDelivery(trackingId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ success: true });
  });

  // Webhook for bounce
  fastify.post('/api/v1/email-tracking/webhook/bounce', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Webhook for bounce notification',
      body: toJsonSchema(z.object({
        trackingId: z.string(),
        bounceType: z.enum(['soft', 'hard']),
        bounceReason: z.string(),
        diagnosticCode: z.string().optional(),
      })),
    },
  }, async (request: FastifyRequest<{ Body: { trackingId: string; bounceType: 'soft' | 'hard'; bounceReason: string; diagnosticCode?: string } }>, reply: FastifyReply) => {
    const { trackingId, bounceType, bounceReason, diagnosticCode } = request.body;

    const result = await emailTrackingService.recordBounce(trackingId, bounceType, bounceReason, diagnosticCode);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ success: true });
  });

  // ==================== Analytics ====================

  // Get analytics
  fastify.get('/api/v1/email-tracking/analytics', {
    schema: {
      tags: ['Email Tracking'],
      summary: 'Get email analytics',
      querystring: toJsonSchema(analyticsQuerySchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const query = analyticsQuerySchema.parse(request.query);

    const result = await emailTrackingService.getAnalytics(tenantId, query);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ==================== Email Sequences ====================

  // Create sequence
  fastify.post('/api/v1/email-tracking/sequences', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Create an email sequence',
      body: toJsonSchema(createSequenceSchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const userId = (request as any).userId || 'default-user';
    const input = createSequenceSchema.parse(request.body);

    const result = await emailTrackingService.createSequence(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get sequence by ID
  fastify.get('/api/v1/email-tracking/sequences/:sequenceId', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Get sequence by ID',
      params: toJsonSchema(z.object({
        sequenceId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { sequenceId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { sequenceId } = request.params;

    const result = await emailTrackingService.getSequence(tenantId, sequenceId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // List sequences
  fastify.get('/api/v1/email-tracking/sequences', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'List email sequences',
      querystring: toJsonSchema(z.object({
        isActive: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
      })),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const query = (request.query as any);

    const result = await emailTrackingService.listSequences(tenantId, {
      isActive: query.isActive,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Enroll in sequence
  fastify.post('/api/v1/email-tracking/sequences/:sequenceId/enroll', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Enroll an entity in a sequence',
      params: toJsonSchema(z.object({
        sequenceId: z.string().uuid(),
      })),
      body: toJsonSchema(enrollInSequenceSchema),
    },
  }, async (request: FastifyRequest<{ Params: { sequenceId: string }; Body: any }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { sequenceId } = request.params;
    const input = enrollInSequenceSchema.parse(request.body);

    const result = await emailTrackingService.enrollInSequence(tenantId, sequenceId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Get sequence enrollments
  fastify.get('/api/v1/email-tracking/sequences/:sequenceId/enrollments', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Get sequence enrollments',
      params: toJsonSchema(z.object({
        sequenceId: z.string().uuid(),
      })),
      querystring: toJsonSchema(z.object({
        status: z.enum(['active', 'paused', 'completed', 'exited', 'bounced']).optional(),
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { sequenceId: string }; Querystring: { status?: string; limit?: number; offset?: number } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { sequenceId } = request.params;
    const query = request.query;

    const result = await emailTrackingService.getSequenceEnrollments(tenantId, sequenceId, {
      status: query.status,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Pause enrollment
  fastify.post('/api/v1/email-tracking/enrollments/:enrollmentId/pause', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Pause an enrollment',
      params: toJsonSchema(z.object({
        enrollmentId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { enrollmentId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { enrollmentId } = request.params;

    const result = await emailTrackingService.pauseEnrollment(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ success: true });
  });

  // Resume enrollment
  fastify.post('/api/v1/email-tracking/enrollments/:enrollmentId/resume', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Resume an enrollment',
      params: toJsonSchema(z.object({
        enrollmentId: z.string().uuid(),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { enrollmentId: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { enrollmentId } = request.params;

    const result = await emailTrackingService.resumeEnrollment(tenantId, enrollmentId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ success: true });
  });

  // Exit enrollment
  fastify.post('/api/v1/email-tracking/enrollments/:enrollmentId/exit', {
    schema: {
      tags: ['Email Sequences'],
      summary: 'Exit an enrollment',
      params: toJsonSchema(z.object({
        enrollmentId: z.string().uuid(),
      })),
      body: toJsonSchema(z.object({
        reason: z.string().min(1),
      })),
    },
  }, async (request: FastifyRequest<{ Params: { enrollmentId: string }; Body: { reason: string } }>, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const { enrollmentId } = request.params;
    const { reason } = request.body;

    const result = await emailTrackingService.exitEnrollment(tenantId, enrollmentId, reason);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(200).send({ success: true });
  });

  // ==================== Email Templates ====================

  // Create template
  fastify.post('/api/v1/email-tracking/templates', {
    schema: {
      tags: ['Email Templates'],
      summary: 'Create an email template',
      body: toJsonSchema(createTemplateSchema),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const userId = (request as any).userId || 'default-user';
    const input = createTemplateSchema.parse(request.body);

    const result = await emailTrackingService.createTemplate(tenantId, userId, input);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List templates
  fastify.get('/api/v1/email-tracking/templates', {
    schema: {
      tags: ['Email Templates'],
      summary: 'List email templates',
      querystring: toJsonSchema(z.object({
        category: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        limit: z.coerce.number().int().min(1).max(100).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
      })),
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId || 'default-tenant';
    const query = (request.query as any);

    const result = await emailTrackingService.listTemplates(tenantId, {
      category: query.category,
      isActive: query.isActive,
      limit: query.limit || 50,
      offset: query.offset || 0,
    });

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });
}

export default emailTrackingRoutes;
