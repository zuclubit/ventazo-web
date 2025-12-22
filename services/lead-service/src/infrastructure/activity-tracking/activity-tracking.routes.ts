/**
 * Activity Tracking Routes
 *
 * REST API endpoints for activity/interaction tracking
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { container } from 'tsyringe';
import { ActivityTrackingService } from './activity-tracking.service';

// ============================================================================
// Zod Schemas
// ============================================================================

const activityTypeSchema = z.enum([
  'call',
  'email',
  'meeting',
  'note',
  'task',
  'sms',
  'chat',
  'social',
  'page_view',
  'form_submission',
  'download',
  'event',
  'deal',
  'quote',
  'contract',
  'payment',
  'support_ticket',
  'campaign_response',
  'webinar',
  'demo',
  'document',
  'integration',
  'system',
]);

const entityTypeSchema = z.enum([
  'lead',
  'contact',
  'customer',
  'deal',
  'opportunity',
  'account',
  'company',
]);

const activityStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'failed',
  'missed',
  'pending',
]);

const activityDirectionSchema = z.enum(['inbound', 'outbound', 'internal']);

const activityPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

const callDetailsSchema = z.object({
  phoneNumber: z.string().optional(),
  callerId: z.string().optional(),
  outcome: z.enum([
    'connected',
    'voicemail',
    'busy',
    'no_answer',
    'wrong_number',
    'callback_scheduled',
    'not_interested',
    'qualified',
    'meeting_scheduled',
  ]).optional(),
  recordingUrl: z.string().optional(),
  recordingDuration: z.number().optional(),
  transcription: z.string().optional(),
  sentimentScore: z.number().optional(),
  keyTopics: z.array(z.string()).optional(),
  nextSteps: z.string().optional(),
}).optional();

const emailDetailsSchema = z.object({
  messageId: z.string().optional(),
  threadId: z.string().optional(),
  from: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string().optional(),
  bodyPreview: z.string().optional(),
  bodyHtml: z.string().optional(),
  bodyText: z.string().optional(),
  engagementStatus: z.enum([
    'sent',
    'delivered',
    'opened',
    'clicked',
    'replied',
    'bounced',
    'spam',
    'unsubscribed',
  ]).optional(),
  openedAt: z.string().datetime().optional(),
  clickedAt: z.string().datetime().optional(),
  repliedAt: z.string().datetime().optional(),
  clickedLinks: z.array(z.string()).optional(),
  templateId: z.string().optional(),
  sequenceStepId: z.string().optional(),
}).optional();

const meetingDetailsSchema = z.object({
  meetingType: z.enum([
    'in_person',
    'video_call',
    'phone_call',
    'screen_share',
    'webinar',
    'conference',
  ]).optional(),
  location: z.string().optional(),
  conferenceLink: z.string().optional(),
  conferenceProvider: z.string().optional(),
  calendarEventId: z.string().optional(),
  agenda: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  recordingUrl: z.string().optional(),
  isRecurring: z.boolean().optional(),
}).optional();

const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
}).optional();

const createActivitySchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string().optional(),
  type: activityTypeSchema,
  subtype: z.string().optional(),
  subject: z.string().min(1).max(500),
  description: z.string().optional(),
  direction: activityDirectionSchema.optional(),
  status: activityStatusSchema.optional(),
  priority: activityPrioritySchema.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  scheduledAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  relatedLeadId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  relatedDealId: z.string().uuid().optional(),
  relatedCampaignId: z.string().uuid().optional(),
  relatedSequenceId: z.string().uuid().optional(),
  relatedTaskId: z.string().uuid().optional(),
  callDetails: callDetailsSchema,
  emailDetails: emailDetailsSchema,
  meetingDetails: meetingDetailsSchema,
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  engagementScore: z.number().int().optional(),
  location: locationSchema,
  source: z.string().optional(),
  sourceSystem: z.string().optional(),
  externalId: z.string().optional(),
});

const updateActivitySchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  status: activityStatusSchema.optional(),
  priority: activityPrioritySchema.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),
  completedAt: z.string().datetime().optional(),
  assignedToId: z.string().uuid().optional(),
  callDetails: callDetailsSchema,
  emailDetails: emailDetailsSchema,
  meetingDetails: meetingDetailsSchema,
  customFields: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  engagementScore: z.number().int().optional(),
});

const searchFiltersSchema = z.object({
  entityType: entityTypeSchema.optional(),
  entityId: z.string().uuid().optional(),
  entityIds: z.array(z.string().uuid()).optional(),
  types: z.array(activityTypeSchema).optional(),
  status: z.array(activityStatusSchema).optional(),
  direction: z.array(activityDirectionSchema).optional(),
  priority: z.array(activityPrioritySchema).optional(),
  ownerId: z.string().uuid().optional(),
  ownerIds: z.array(z.string().uuid()).optional(),
  assignedToId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  scheduledFrom: z.string().datetime().optional(),
  scheduledTo: z.string().datetime().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  hasEngagement: z.boolean().optional(),
  minEngagementScore: z.number().int().optional(),
  source: z.string().optional(),
  relatedLeadId: z.string().uuid().optional(),
  relatedContactId: z.string().uuid().optional(),
  relatedDealId: z.string().uuid().optional(),
  relatedCampaignId: z.string().uuid().optional(),
});

const bulkOperationSchema = z.object({
  activityIds: z.array(z.string().uuid()).min(1).max(100),
  operation: z.enum(['update_status', 'assign', 'add_tags', 'remove_tags', 'delete']),
  status: activityStatusSchema.optional(),
  assignToId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

const createReminderSchema = z.object({
  activityId: z.string().uuid(),
  reminderAt: z.string().datetime(),
  message: z.string().optional(),
  channels: z.array(z.enum(['email', 'push', 'sms'])).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  type: activityTypeSchema,
  subject: z.string().min(1).max(500),
  description: z.string().optional(),
  defaultDuration: z.number().int().positive().optional(),
  defaultPriority: activityPrioritySchema.optional(),
  defaultTags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

const webSessionSchema = z.object({
  visitorId: z.string(),
  entryUrl: z.string().optional(),
  entryTitle: z.string().optional(),
  referrer: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  device: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  ipAddress: z.string().optional(),
});

const pageViewSchema = z.object({
  sessionId: z.string().uuid(),
  pageUrl: z.string(),
  pageTitle: z.string().optional(),
  pagePath: z.string().optional(),
  referrer: z.string().optional(),
  previousPageUrl: z.string().optional(),
});

const webEventSchema = z.object({
  sessionId: z.string().uuid(),
  eventName: z.string(),
  eventCategory: z.string().optional(),
  eventLabel: z.string().optional(),
  eventValue: z.number().optional(),
  pageUrl: z.string().optional(),
  pageTitle: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

const getTenantId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
  const tenantId = request.headers['x-tenant-id'];
  return typeof tenantId === 'string' ? tenantId : 'default-tenant';
};

const getUserId = (request: { headers: Record<string, string | string[] | undefined> }): string => {
  const userId = request.headers['x-user-id'];
  return typeof userId === 'string' ? userId : 'system';
};

// ============================================================================
// Routes
// ============================================================================

export const activityTrackingRoutes: FastifyPluginAsync = async (fastify) => {
  const service = container.resolve(ActivityTrackingService);

  // ============================================================================
  // Activity CRUD
  // ============================================================================

  // List activities
  fastify.get('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const page = parseInt((request.query as any).page || '1', 10);
    const limit = parseInt((request.query as any).limit || '20', 10);

    const result = await service.searchActivities(tenantId, {}, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Create activity
  fastify.post('/', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = createActivitySchema.parse(request.body);

    const result = await service.createActivity(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Get activity by ID
  fastify.get<{ Params: { activityId: string } }>('/:activityId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { activityId } = request.params;

    const result = await service.getActivity(tenantId, activityId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Update activity
  fastify.patch<{ Params: { activityId: string } }>('/:activityId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { activityId } = request.params;
    const body = updateActivitySchema.parse(request.body);

    const result = await service.updateActivity(tenantId, activityId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Delete activity
  fastify.delete<{ Params: { activityId: string } }>('/:activityId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { activityId } = request.params;

    const result = await service.deleteActivity(tenantId, activityId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.status(204).send();
  });

  // Search activities
  fastify.post('/search', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = searchFiltersSchema.parse(request.body);
    const page = parseInt((request.query as any).page || '1', 10);
    const limit = parseInt((request.query as any).limit || '20', 10);

    const result = await service.searchActivities(tenantId, body as any, page, limit);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Get entity timeline
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/timeline/:entityType/:entityId',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { entityType, entityId } = request.params;
      const cursor = (request.query as any).cursor;
      const limit = parseInt((request.query as any).limit || '20', 10);

      const result = await service.getEntityTimeline(
        tenantId,
        entityType as any,
        entityId,
        cursor,
        limit
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  // Get activity summary
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/summary/:entityType/:entityId',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { entityType, entityId } = request.params;
      const period = (request.query as any).period || 'all_time';

      const result = await service.getActivitySummary(
        tenantId,
        entityType as any,
        entityId,
        period
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.send(result.getValue());
    }
  );

  // Bulk operations
  fastify.post('/bulk', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = bulkOperationSchema.parse(request.body);

    const result = await service.bulkUpdateActivities(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // ============================================================================
  // Reminders
  // ============================================================================

  // Create reminder
  fastify.post('/reminders', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = createReminderSchema.parse(request.body);

    const result = await service.createReminder(
      tenantId,
      body.activityId,
      userId,
      new Date(body.reminderAt),
      body.message,
      body.channels
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Get pending reminders
  fastify.get('/reminders/pending', async (request, reply) => {
    const tenantId = getTenantId(request);

    const result = await service.getPendingReminders(tenantId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Cancel reminder
  fastify.delete<{ Params: { reminderId: string } }>(
    '/reminders/:reminderId',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { reminderId } = request.params;

      const result = await service.cancelReminder(tenantId, reminderId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  // ============================================================================
  // Templates
  // ============================================================================

  // Create template
  fastify.post('/templates', async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = createTemplateSchema.parse(request.body);

    const result = await service.createTemplate(tenantId, body as any, userId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // List templates
  fastify.get('/templates', async (request, reply) => {
    const tenantId = getTenantId(request);
    const type = (request.query as any).type;
    const activeOnly = (request.query as any).activeOnly !== 'false';

    const result = await service.listTemplates(tenantId, type, activeOnly);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Delete template
  fastify.delete<{ Params: { templateId: string } }>(
    '/templates/:templateId',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { templateId } = request.params;

      const result = await service.deleteTemplate(tenantId, templateId);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(204).send();
    }
  );

  // ============================================================================
  // Analytics
  // ============================================================================

  // Get activity analytics
  fastify.get('/analytics', async (request, reply) => {
    const tenantId = getTenantId(request);
    const period = ((request.query as any).period || 'week') as any;
    const userId = (request.query as any).userId;
    const teamId = (request.query as any).teamId;

    const result = await service.getActivityAnalytics(tenantId, period, userId, teamId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Get user stats
  fastify.get<{ Params: { userId: string } }>('/analytics/user/:userId', async (request, reply) => {
    const tenantId = getTenantId(request);
    const { userId } = request.params;
    const period = ((request.query as any).period || 'week') as any;

    const result = await service.getUserActivityStats(tenantId, userId, period);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // Get team dashboard
  fastify.get('/dashboard', async (request, reply) => {
    const tenantId = getTenantId(request);
    const teamId = (request.query as any).teamId;
    const period = ((request.query as any).period || 'week') as any;

    const result = await service.getTeamDashboard(tenantId, teamId, period);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.getValue());
  });

  // ============================================================================
  // Web Tracking
  // ============================================================================

  // Create web session
  fastify.post('/web/sessions', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = webSessionSchema.parse(request.body);

    const result = await service.createWebSession(tenantId, body.visitorId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Track page view
  fastify.post('/web/pageviews', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = pageViewSchema.parse(request.body);

    const result = await service.trackPageView(body.sessionId, tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Track web event
  fastify.post('/web/events', async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = webEventSchema.parse(request.body);

    const result = await service.trackWebEvent(body.sessionId, tenantId, body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.getValue());
  });

  // Link web session to contact/lead
  fastify.post<{ Params: { sessionId: string } }>(
    '/web/sessions/:sessionId/link',
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const { sessionId } = request.params;
      const body = z
        .object({
          contactId: z.string().uuid().optional(),
          leadId: z.string().uuid().optional(),
        })
        .parse(request.body);

      const result = await service.linkWebSession(sessionId, tenantId, body);

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error });
      }

      return reply.status(200).send({ success: true });
    }
  );
};
