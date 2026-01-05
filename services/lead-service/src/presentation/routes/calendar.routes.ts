/**
 * Calendar Integration Routes
 * API endpoints for Google Calendar and Microsoft Outlook integration
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import { CalendarService, CalendarProvider, EventVisibility, EventStatus } from '../../infrastructure/calendar';
import { authenticate, getAuthUser } from '../middlewares/auth.middleware';

// Helper to map string visibility to EventVisibility enum
const mapVisibility = (visibility?: string): EventVisibility | undefined => {
  if (!visibility) return undefined;
  const visibilityMap: Record<string, EventVisibility> = {
    default: EventVisibility.DEFAULT,
    public: EventVisibility.PUBLIC,
    private: EventVisibility.PRIVATE,
    confidential: EventVisibility.CONFIDENTIAL,
  };
  return visibilityMap[visibility];
};

// Helper to map string status to EventStatus enum
const mapStatus = (status?: string): EventStatus | undefined => {
  if (!status) return undefined;
  const statusMap: Record<string, EventStatus> = {
    confirmed: EventStatus.CONFIRMED,
    tentative: EventStatus.TENTATIVE,
    cancelled: EventStatus.CANCELLED,
  };
  return statusMap[status];
};

// Validation schemas
const providerSchema = z.nativeEnum(CalendarProvider);

const connectCalendarSchema = z.object({
  provider: providerSchema,
  redirectUri: z.string().url(),
});

const oauthCallbackSchema = z.object({
  provider: providerSchema,
  code: z.string().min(1),
  state: z.string().optional(),
  redirectUri: z.string().url(),
});

const listEventsQuerySchema = z.object({
  calendarId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  maxResults: z.coerce.number().min(1).max(500).optional(),
  pageToken: z.string().optional(),
  q: z.string().optional(),
  linkedLeadId: z.string().uuid().optional(),
  linkedCustomerId: z.string().uuid().optional(),
  linkedOpportunityId: z.string().uuid().optional(),
});

const createEventSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    optional: z.boolean().optional(),
  })).optional(),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().min(1).optional(),
    count: z.number().min(1).optional(),
    until: z.string().datetime().optional(),
    byDay: z.array(z.string()).optional(),
    byMonth: z.array(z.number()).optional(),
    byMonthDay: z.array(z.number()).optional(),
  }).optional(),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup', 'sms']),
    minutes: z.number().min(0).max(40320),
  })).optional(),
  visibility: z.enum(['default', 'public', 'private', 'confidential']).optional(),
  createConference: z.boolean().optional(),
  linkedLeadId: z.string().uuid().optional(),
  linkedCustomerId: z.string().uuid().optional(),
  linkedOpportunityId: z.string().uuid().optional(),
  linkedTaskId: z.string().uuid().optional(),
  calendarId: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial().extend({
  notifyAttendees: z.boolean().optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional(),
});

const updateSettingsSchema = z.object({
  syncDirection: z.enum(['one_way_to_calendar', 'one_way_from_calendar', 'two_way']).optional(),
  autoSyncTasks: z.boolean().optional(),
  autoSyncMeetings: z.boolean().optional(),
  syncPastEvents: z.boolean().optional(),
  syncFutureDays: z.number().min(1).max(365).optional(),
  defaultReminderMinutes: z.number().min(0).max(10080).optional(),
  defaultEventDuration: z.number().min(5).max(480).optional(),
  workingHours: z.object({
    enabled: z.boolean(),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
    workDays: z.array(z.number().min(0).max(6)),
    timezone: z.string(),
  }).optional(),
});

const freeBusySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  calendarIds: z.array(z.string()).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const eventParamsSchema = z.object({
  integrationId: z.string().uuid(),
  eventId: z.string().min(1),
});

/**
 * Calendar routes plugin
 */
export const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get available calendar providers
   */
  fastify.get('/providers', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get available calendar providers',
      description: 'Returns list of configured calendar providers (Google, Microsoft)',
    },
  }, async (_request, reply) => {
    const calendarService = container.resolve(CalendarService);
    const providers = calendarService.getAvailableProviders();

    return {
      providers: providers.map((p) => ({
        id: p,
        name: p === CalendarProvider.GOOGLE ? 'Google Calendar' : 'Microsoft Outlook',
        icon: p === CalendarProvider.GOOGLE ? 'google' : 'microsoft',
      })),
    };
  });

  /**
   * Get user's calendar integrations
   */
  fastify.get('/integrations', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get calendar integrations',
      description: 'Returns all calendar integrations for the authenticated user',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getUserIntegrations(user.tenantId, user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Start OAuth flow - get authorization URL
   */
  fastify.post('/connect', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Start calendar connection',
      description: 'Generates OAuth authorization URL for connecting a calendar',
      body: toJsonSchema(connectCalendarSchema),
    },
  }, async (request, reply) => {
    const body = connectCalendarSchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    try {
      const state = `${body.provider}_${Date.now()}`;
      const authUrl = calendarService.getAuthorizationUrl(
        body.provider,
        body.redirectUri,
        state
      );

      return { authUrl, state };
    } catch (error) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Failed to generate auth URL',
      });
    }
  });

  /**
   * Complete OAuth flow - exchange code for tokens
   */
  fastify.post('/callback', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Complete calendar connection',
      description: 'Exchanges OAuth code for tokens and creates integration',
      body: toJsonSchema(oauthCallbackSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = oauthCallbackSchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.connectCalendar(user.tenantId, user.id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Disconnect calendar integration
   */
  fastify.delete('/integrations/:id', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Disconnect calendar',
      description: 'Removes calendar integration and revokes access',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.disconnectCalendar(id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(204).send();
  });

  /**
   * Update integration settings
   */
  fastify.patch('/integrations/:id/settings', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Update integration settings',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(updateSettingsSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const body = updateSettingsSchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.updateIntegrationSettings(id, body);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * List calendars for an integration
   */
  fastify.get('/integrations/:id/calendars', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'List calendars',
      description: 'Returns all calendars available in the connected account',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.listCalendars(id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * List events from an integration
   */
  fastify.get('/integrations/:id/events', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'List calendar events',
      params: toJsonSchema(uuidParamSchema),
      querystring: toJsonSchema(listEventsQuerySchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const query = listEventsQuerySchema.parse(request.query);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.listEvents(id, {
      ...query,
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get a specific event
   */
  fastify.get('/integrations/:integrationId/events/:eventId', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get event',
      params: toJsonSchema(eventParamsSchema),
      querystring: toJsonSchema(z.object({
        calendarId: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const { integrationId, eventId } = eventParamsSchema.parse(request.params);
    const { calendarId } = request.query as { calendarId?: string };
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getEvent(integrationId, eventId, calendarId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    if (!result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Event not found',
      });
    }

    return result.value;
  });

  /**
   * Create a new event
   */
  fastify.post('/integrations/:id/events', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Create event',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(createEventSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const body = createEventSchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.createEvent(id, {
      ...body,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      visibility: mapVisibility(body.visibility),
      recurrence: body.recurrence
        ? {
            ...body.recurrence,
            interval: body.recurrence.interval || 1,
            until: body.recurrence.until ? new Date(body.recurrence.until) : undefined,
          }
        : undefined,
    });

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Update an event
   */
  fastify.patch('/integrations/:integrationId/events/:eventId', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Update event',
      params: toJsonSchema(eventParamsSchema),
      body: toJsonSchema(updateEventSchema),
      querystring: toJsonSchema(z.object({
        calendarId: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const { integrationId, eventId } = eventParamsSchema.parse(request.params);
    const { calendarId } = request.query as { calendarId?: string };
    const body = updateEventSchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.updateEvent(integrationId, eventId, {
      ...body,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      visibility: mapVisibility(body.visibility),
      status: mapStatus(body.status),
      recurrence: body.recurrence
        ? {
            ...body.recurrence,
            interval: body.recurrence.interval || 1,
            until: body.recurrence.until ? new Date(body.recurrence.until) : undefined,
          }
        : undefined,
    }, calendarId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Delete an event
   */
  fastify.delete('/integrations/:integrationId/events/:eventId', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Delete event',
      params: toJsonSchema(eventParamsSchema),
      querystring: toJsonSchema(z.object({
        calendarId: z.string().optional(),
      })),
    },
  }, async (request, reply) => {
    const { integrationId, eventId } = eventParamsSchema.parse(request.params);
    const { calendarId } = request.query as { calendarId?: string };
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.deleteEvent(integrationId, eventId, calendarId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(204).send();
  });

  /**
   * Get free/busy information
   */
  fastify.post('/integrations/:id/freebusy', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get free/busy',
      description: 'Returns free/busy information for the specified time range',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(freeBusySchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);
    const body = freeBusySchema.parse(request.body);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getFreeBusy(
      id,
      new Date(body.startTime),
      new Date(body.endTime),
      body.calendarIds
    );

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get upcoming events for current user
   */
  fastify.get('/upcoming', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get upcoming events',
      description: 'Returns upcoming events from all connected calendars',
      querystring: toJsonSchema(z.object({
        days: z.coerce.number().min(1).max(90).optional(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { days } = request.query as { days?: number };
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getUpcomingEvents(
      user.tenantId,
      user.id,
      days || 7
    );

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * List events from all connected integrations
   * Fetches directly from calendar providers (Google, Microsoft)
   */
  fastify.get('/events', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'List calendar events',
      description: 'Returns events from all connected calendars with pagination',
      querystring: toJsonSchema(z.object({
        limit: z.coerce.number().min(1).max(100).optional(),
        days: z.coerce.number().min(1).max(90).optional(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { days, limit } = request.query as { days?: number; limit?: number };
    const calendarService = container.resolve(CalendarService);

    // Get user's connected integrations
    const integrationsResult = await calendarService.getUserIntegrations(
      user.tenantId,
      user.id
    );

    if (integrationsResult.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: integrationsResult.error,
      });
    }

    const integrations = integrationsResult.value || [];
    const connectedIntegrations = integrations.filter(i => i.status === 'connected');

    if (connectedIntegrations.length === 0) {
      return { items: [], total: 0 };
    }

    // Calculate date range - include past 30 days for calendar view
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days in the past
    const endDate = new Date(now.getTime() + (days || 30) * 24 * 60 * 60 * 1000);

    // Fetch events from all connected integrations
    const allEvents: Array<{
      id: string;
      title: string;
      startTime: string;
      endTime: string;
      [key: string]: unknown;
    }> = [];

    for (const integration of connectedIntegrations) {
      try {
        const eventsResult = await calendarService.listEvents(integration.id, {
          startTime: startDate,
          endTime: endDate,
          maxResults: 100,
        });

        if (eventsResult.isSuccess && eventsResult.value?.events) {
          allEvents.push(...eventsResult.value.events.map(e => ({
            ...e,
            integrationId: integration.id,
            provider: integration.provider,
          })));
        }
      } catch (err) {
        // Log error but continue with other integrations
        request.log.warn({ integrationId: integration.id, error: err }, 'Failed to fetch events from integration');
      }
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Apply limit
    const limitedEvents = limit ? allEvents.slice(0, limit) : allEvents;

    return {
      items: limitedEvents,
      total: allEvents.length,
    };
  });

  /**
   * List user's calendars
   */
  fastify.get('/calendars', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'List user calendars',
      description: 'Returns all calendars from connected calendar integrations',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getUserIntegrations(user.tenantId, user.id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // Transform integrations to calendar list format
    const calendars = (result.value || []).map((integration: any) => ({
      id: integration.id,
      name: integration.calendarName || `${integration.provider} Calendar`,
      provider: integration.provider,
      email: integration.calendarEmail || integration.providerEmail,
      isPrimary: integration.isPrimary || false,
      isConnected: integration.status === 'connected',
      lastSyncAt: integration.lastSyncAt,
    }));

    return {
      items: calendars,
      total: calendars.length,
    };
  });

  /**
   * Get events linked to a lead
   */
  fastify.get('/leads/:leadId/events', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get events for lead',
      params: toJsonSchema(z.object({
        leadId: z.string().uuid(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { leadId } = request.params as { leadId: string };
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getEventsForLead(user.tenantId, leadId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });

  /**
   * Get events linked to a customer
   */
  fastify.get('/customers/:customerId/events', {
    preHandler: [authenticate],
    schema: {
      tags: ['Calendar'],
      summary: 'Get events for customer',
      params: toJsonSchema(z.object({
        customerId: z.string().uuid(),
      })),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { customerId } = request.params as { customerId: string };
    const calendarService = container.resolve(CalendarService);

    const result = await calendarService.getEventsForCustomer(user.tenantId, customerId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return result.value;
  });
};
