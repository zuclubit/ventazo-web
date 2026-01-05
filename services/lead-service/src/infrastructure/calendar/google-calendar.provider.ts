/**
 * Google Calendar Provider
 * Implements calendar integration with Google Calendar API v3
 *
 * @see https://developers.google.com/calendar/api/quickstart/nodejs
 * @see https://www.npmjs.com/package/@googleapis/calendar
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import {
  ICalendarProvider,
  CalendarProvider,
  CalendarOAuthToken,
  CalendarListItem,
  CalendarEvent,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  ListEventsOptions,
  ListEventsResponse,
  FreeBusyInfo,
  CalendarAuthRequest,
  CalendarAuthCallback,
  EventStatus,
  EventVisibility,
  AttendeeResponseStatus,
  EventSyncStatus,
  ConferenceType,
} from './types';

/**
 * Google Calendar configuration
 */
export interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * Google Calendar Provider Implementation
 */
export class GoogleCalendarProvider implements ICalendarProvider {
  readonly provider = CalendarProvider.GOOGLE;
  private config: GoogleCalendarConfig;
  private oauth2Client: OAuth2Client;

  constructor(config: GoogleCalendarConfig) {
    this.config = config;
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Create OAuth2 client with access token
   */
  private getAuthClient(accessToken: string): OAuth2Client {
    const client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );
    client.setCredentials({ access_token: accessToken });
    return client;
  }

  /**
   * Get Calendar API instance
   */
  private getCalendarApi(accessToken: string): calendar_v3.Calendar {
    const auth = this.getAuthClient(accessToken);
    return google.calendar({ version: 'v3', auth });
  }

  /**
   * Default scopes for Google Calendar
   */
  private getDefaultScopes(): string[] {
    return [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(request: CalendarAuthRequest): string {
    const scopes = request.scopes || this.getDefaultScopes();
    const redirectUri = request.redirectUri || this.config.redirectUri;

    if (!redirectUri) {
      throw new Error('Redirect URI is required');
    }

    const authClient = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      redirectUri
    );

    return authClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: request.state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(callback: CalendarAuthCallback): Promise<CalendarOAuthToken> {
    const authClient = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      callback.redirectUri
    );

    const { tokens } = await authClient.getToken(callback.code);

    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token');
    }

    if (!tokens.refresh_token) {
      throw new Error('Failed to obtain refresh token. Please revoke app access and try again.');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000),
      tokenType: tokens.token_type || 'Bearer',
      scope: tokens.scope,
    };
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<CalendarOAuthToken> {
    const authClient = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );

    authClient.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await authClient.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || refreshToken,
      expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600000),
      tokenType: credentials.token_type || 'Bearer',
      scope: credentials.scope,
    };
  }

  /**
   * Revoke OAuth access
   */
  async revokeAccess(accessToken: string): Promise<void> {
    const authClient = this.getAuthClient(accessToken);
    await authClient.revokeToken(accessToken);
  }

  /**
   * List user's calendars
   */
  async listCalendars(accessToken: string): Promise<CalendarListItem[]> {
    const calendar = this.getCalendarApi(accessToken);

    const response = await calendar.calendarList.list({
      showHidden: false,
      showDeleted: false,
    });

    const items = response.data.items || [];

    return items.map((item) => ({
      id: item.id || '',
      name: item.summary || 'Untitled Calendar',
      description: item.description || undefined,
      color: item.backgroundColor || undefined,
      primary: item.primary || false,
      accessRole: this.mapAccessRole(item.accessRole),
      selected: item.selected || false,
      hidden: item.hidden || false,
      timezone: item.timeZone || undefined,
    }));
  }

  /**
   * Map Google access role to our format
   */
  private mapAccessRole(role?: string | null): CalendarListItem['accessRole'] {
    switch (role) {
      case 'owner':
        return 'owner';
      case 'writer':
        return 'writer';
      case 'reader':
        return 'reader';
      case 'freeBusyReader':
        return 'freeBusyReader';
      default:
        return 'reader';
    }
  }

  /**
   * List calendar events
   */
  async listEvents(accessToken: string, options: ListEventsOptions): Promise<ListEventsResponse> {
    const calendar = this.getCalendarApi(accessToken);
    const calendarId = options.calendarId || 'primary';

    const response = await calendar.events.list({
      calendarId,
      timeMin: options.startTime?.toISOString(),
      timeMax: options.endTime?.toISOString(),
      maxResults: options.maxResults || 250,
      pageToken: options.pageToken,
      showDeleted: options.showDeleted || false,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy === 'updated' ? 'updated' : 'startTime',
      q: options.q,
    });

    const events = (response.data.items || []).map((item) =>
      this.mapGoogleEventToCalendarEvent(item, calendarId)
    );

    return {
      events,
      nextPageToken: response.data.nextPageToken || undefined,
      nextSyncToken: response.data.nextSyncToken || undefined,
    };
  }

  /**
   * Get a single event
   */
  async getEvent(accessToken: string, calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    const calendar = this.getCalendarApi(accessToken);

    try {
      const response = await calendar.events.get({
        calendarId,
        eventId,
      });

      if (!response.data) {
        return null;
      }

      return this.mapGoogleEventToCalendarEvent(response.data, calendarId);
    } catch (error: unknown) {
      const err = error as { code?: number };
      if (err.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    request: CreateCalendarEventRequest
  ): Promise<CalendarEvent> {
    const calendar = this.getCalendarApi(accessToken);

    const eventResource: calendar_v3.Schema$Event = {
      summary: request.title,
      description: request.description,
      location: request.location,
      start: request.allDay
        ? { date: this.formatDateOnly(request.startTime) }
        : { dateTime: request.startTime.toISOString(), timeZone: request.timezone },
      end: request.allDay
        ? { date: this.formatDateOnly(request.endTime) }
        : { dateTime: request.endTime.toISOString(), timeZone: request.timezone },
      attendees: request.attendees?.map((a) => ({
        email: a.email,
        displayName: a.name,
        optional: a.optional || false,
      })),
      reminders: request.reminders
        ? {
            useDefault: false,
            overrides: request.reminders.map((r) => ({
              method: r.method === 'popup' ? 'popup' : 'email',
              minutes: r.minutes,
            })),
          }
        : { useDefault: true },
      visibility: this.mapVisibilityToGoogle(request.visibility),
      colorId: request.color,
      recurrence: request.recurrence
        ? [this.buildRruleString(request.recurrence)]
        : undefined,
      extendedProperties: {
        private: {
          linkedLeadId: request.linkedLeadId || '',
          linkedCustomerId: request.linkedCustomerId || '',
          linkedOpportunityId: request.linkedOpportunityId || '',
          linkedTaskId: request.linkedTaskId || '',
        },
      },
    };

    // Add conference data if requested
    let conferenceDataVersion = 0;
    if (request.createConference) {
      conferenceDataVersion = 1;
      eventResource.conferenceData = {
        createRequest: {
          requestId: `crm-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      requestBody: eventResource,
      conferenceDataVersion,
      sendUpdates: request.attendees?.length ? 'all' : 'none',
    });

    if (!response.data) {
      throw new Error('Failed to create event');
    }

    return this.mapGoogleEventToCalendarEvent(response.data, calendarId);
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    request: UpdateCalendarEventRequest
  ): Promise<CalendarEvent> {
    const calendar = this.getCalendarApi(accessToken);

    // First get the existing event
    const existingResponse = await calendar.events.get({
      calendarId,
      eventId,
    });

    const existing = existingResponse.data;
    if (!existing) {
      throw new Error('Event not found');
    }

    // Merge updates
    const eventResource: calendar_v3.Schema$Event = {
      ...existing,
      summary: request.title ?? existing.summary,
      description: request.description ?? existing.description,
      location: request.location ?? existing.location,
    };

    if (request.startTime) {
      eventResource.start = request.allDay
        ? { date: this.formatDateOnly(request.startTime) }
        : { dateTime: request.startTime.toISOString(), timeZone: request.timezone };
    }

    if (request.endTime) {
      eventResource.end = request.allDay
        ? { date: this.formatDateOnly(request.endTime) }
        : { dateTime: request.endTime.toISOString(), timeZone: request.timezone };
    }

    if (request.attendees) {
      eventResource.attendees = request.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
        optional: a.optional || false,
      }));
    }

    if (request.reminders) {
      eventResource.reminders = {
        useDefault: false,
        overrides: request.reminders.map((r) => ({
          method: r.method === 'popup' ? 'popup' : 'email',
          minutes: r.minutes,
        })),
      };
    }

    if (request.visibility) {
      eventResource.visibility = this.mapVisibilityToGoogle(request.visibility);
    }

    if (request.status) {
      eventResource.status = this.mapStatusToGoogle(request.status);
    }

    if (request.color) {
      eventResource.colorId = request.color;
    }

    // Update extended properties for CRM linking
    eventResource.extendedProperties = {
      private: {
        linkedLeadId: request.linkedLeadId ?? existing.extendedProperties?.private?.linkedLeadId ?? '',
        linkedCustomerId: request.linkedCustomerId ?? existing.extendedProperties?.private?.linkedCustomerId ?? '',
        linkedOpportunityId: request.linkedOpportunityId ?? existing.extendedProperties?.private?.linkedOpportunityId ?? '',
        linkedTaskId: request.linkedTaskId ?? existing.extendedProperties?.private?.linkedTaskId ?? '',
      },
    };

    const response = await calendar.events.update({
      calendarId,
      eventId,
      requestBody: eventResource,
      sendUpdates: request.notifyAttendees ? 'all' : 'none',
    });

    if (!response.data) {
      throw new Error('Failed to update event');
    }

    return this.mapGoogleEventToCalendarEvent(response.data, calendarId);
  }

  /**
   * Delete an event
   */
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const calendar = this.getCalendarApi(accessToken);

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all',
    });
  }

  /**
   * Get free/busy information
   */
  async getFreeBusy(
    accessToken: string,
    calendarIds: string[],
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyInfo[]> {
    const calendar = this.getCalendarApi(accessToken);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: calendarIds.map((id) => ({ id })),
      },
    });

    const calendars = response.data.calendars || {};

    return Object.entries(calendars).map(([calendarId, data]) => ({
      calendarId,
      busy: (data.busy || []).map((b) => ({
        start: new Date(b.start || ''),
        end: new Date(b.end || ''),
      })),
    }));
  }

  /**
   * Watch calendar for changes (webhook setup)
   */
  async watchCalendar(
    accessToken: string,
    calendarId: string,
    webhookUrl: string,
    channelId: string
  ): Promise<{ resourceId: string; expiration: Date }> {
    const calendar = this.getCalendarApi(accessToken);

    // Channels expire after 7 days max
    const expiration = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration.getTime().toString(),
      },
    });

    if (!response.data.resourceId) {
      throw new Error('Failed to set up calendar watch');
    }

    return {
      resourceId: response.data.resourceId,
      expiration: new Date(Number(response.data.expiration) || expiration.getTime()),
    };
  }

  /**
   * Stop watching calendar
   */
  async stopWatch(accessToken: string, channelId: string, resourceId: string): Promise<void> {
    const calendar = this.getCalendarApi(accessToken);

    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  }

  /**
   * Map Google event to our CalendarEvent format
   */
  private mapGoogleEventToCalendarEvent(
    event: calendar_v3.Schema$Event,
    calendarId: string
  ): CalendarEvent {
    const startDateTime = event.start?.dateTime || event.start?.date;
    const endDateTime = event.end?.dateTime || event.end?.date;
    const isAllDay = !event.start?.dateTime;

    const extProps = event.extendedProperties?.private || {};

    return {
      id: event.id || '',
      externalId: event.id || undefined,
      tenantId: '', // Will be set by service
      userId: '', // Will be set by service
      integrationId: '', // Will be set by service
      calendarId,
      title: event.summary || 'Untitled Event',
      description: event.description || undefined,
      location: event.location || undefined,
      startTime: new Date(startDateTime || Date.now()),
      endTime: new Date(endDateTime || Date.now()),
      allDay: isAllDay,
      timezone: event.start?.timeZone || 'UTC',
      recurrence: event.recurrence ? this.parseRrule(event.recurrence[0]) : undefined,
      recurringEventId: event.recurringEventId || undefined,
      status: this.mapGoogleStatus(event.status),
      visibility: this.mapGoogleVisibility(event.visibility),
      organizer: event.organizer
        ? {
            email: event.organizer.email || '',
            name: event.organizer.displayName || undefined,
            responseStatus: AttendeeResponseStatus.ACCEPTED,
            optional: false,
            organizer: true,
            self: event.organizer.self || false,
            resource: false,
          }
        : undefined,
      attendees: (event.attendees || []).map((a) => ({
        email: a.email || '',
        name: a.displayName || undefined,
        responseStatus: this.mapGoogleResponseStatus(a.responseStatus),
        optional: a.optional || false,
        organizer: a.organizer || false,
        self: a.self || false,
        resource: a.resource || false,
      })),
      conferenceData: event.conferenceData
        ? {
            type: ConferenceType.GOOGLE_MEET,
            conferenceId: event.conferenceData.conferenceId || undefined,
            conferenceUrl: event.conferenceData.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || undefined,
            entryPoints: event.conferenceData.entryPoints?.map((e) => ({
              type: e.entryPointType as 'video' | 'phone' | 'sip' | 'more',
              uri: e.uri || '',
              label: e.label || undefined,
              pin: e.pin || undefined,
              accessCode: e.accessCode || undefined,
            })),
          }
        : undefined,
      reminders: event.reminders?.useDefault
        ? [{ method: 'popup' as const, minutes: 10 }]
        : (event.reminders?.overrides || []).map((r) => ({
            method: r.method as 'email' | 'popup',
            minutes: r.minutes || 10,
          })),
      linkedLeadId: extProps.linkedLeadId || undefined,
      linkedCustomerId: extProps.linkedCustomerId || undefined,
      linkedOpportunityId: extProps.linkedOpportunityId || undefined,
      linkedTaskId: extProps.linkedTaskId || undefined,
      color: event.colorId || undefined,
      tags: [],
      metadata: {},
      syncStatus: EventSyncStatus.SYNCED,
      lastSyncedAt: new Date(),
      etag: event.etag || undefined,
      createdAt: new Date(event.created || Date.now()),
      updatedAt: new Date(event.updated || Date.now()),
    };
  }

  /**
   * Map Google event status to our format
   */
  private mapGoogleStatus(status?: string | null): EventStatus {
    switch (status) {
      case 'confirmed':
        return EventStatus.CONFIRMED;
      case 'tentative':
        return EventStatus.TENTATIVE;
      case 'cancelled':
        return EventStatus.CANCELLED;
      default:
        return EventStatus.CONFIRMED;
    }
  }

  /**
   * Map our status to Google format
   */
  private mapStatusToGoogle(status: EventStatus): string {
    switch (status) {
      case EventStatus.CONFIRMED:
        return 'confirmed';
      case EventStatus.TENTATIVE:
        return 'tentative';
      case EventStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'confirmed';
    }
  }

  /**
   * Map Google visibility to our format
   */
  private mapGoogleVisibility(visibility?: string | null): EventVisibility {
    switch (visibility) {
      case 'public':
        return EventVisibility.PUBLIC;
      case 'private':
        return EventVisibility.PRIVATE;
      case 'confidential':
        return EventVisibility.CONFIDENTIAL;
      default:
        return EventVisibility.DEFAULT;
    }
  }

  /**
   * Map our visibility to Google format
   */
  private mapVisibilityToGoogle(visibility?: EventVisibility): string {
    switch (visibility) {
      case EventVisibility.PUBLIC:
        return 'public';
      case EventVisibility.PRIVATE:
        return 'private';
      case EventVisibility.CONFIDENTIAL:
        return 'confidential';
      default:
        return 'default';
    }
  }

  /**
   * Map Google response status to our format
   */
  private mapGoogleResponseStatus(status?: string | null): AttendeeResponseStatus {
    switch (status) {
      case 'accepted':
        return AttendeeResponseStatus.ACCEPTED;
      case 'declined':
        return AttendeeResponseStatus.DECLINED;
      case 'tentative':
        return AttendeeResponseStatus.TENTATIVE;
      default:
        return AttendeeResponseStatus.NEEDS_ACTION;
    }
  }

  /**
   * Format date as YYYY-MM-DD for all-day events
   */
  private formatDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Build RRULE string from recurrence object
   */
  private buildRruleString(recurrence: CreateCalendarEventRequest['recurrence']): string {
    if (!recurrence) return '';

    const parts = [`RRULE:FREQ=${recurrence.frequency.toUpperCase()}`];

    if (recurrence.interval > 1) {
      parts.push(`INTERVAL=${recurrence.interval}`);
    }

    if (recurrence.count) {
      parts.push(`COUNT=${recurrence.count}`);
    }

    if (recurrence.until) {
      parts.push(`UNTIL=${recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    }

    if (recurrence.byDay?.length) {
      parts.push(`BYDAY=${recurrence.byDay.join(',')}`);
    }

    if (recurrence.byMonth?.length) {
      parts.push(`BYMONTH=${recurrence.byMonth.join(',')}`);
    }

    if (recurrence.byMonthDay?.length) {
      parts.push(`BYMONTHDAY=${recurrence.byMonthDay.join(',')}`);
    }

    return parts.join(';');
  }

  /**
   * Parse RRULE string to recurrence object
   */
  private parseRrule(rrule: string): CalendarEvent['recurrence'] | undefined {
    if (!rrule || !rrule.startsWith('RRULE:')) {
      return undefined;
    }

    const parts = rrule.replace('RRULE:', '').split(';');
    const parsed: Record<string, string> = {};

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key && value) {
        parsed[key] = value;
      }
    }

    const frequency = (parsed.FREQ?.toLowerCase() || 'daily') as 'daily' | 'weekly' | 'monthly' | 'yearly';

    return {
      frequency,
      interval: parsed.INTERVAL ? parseInt(parsed.INTERVAL, 10) : 1,
      count: parsed.COUNT ? parseInt(parsed.COUNT, 10) : undefined,
      until: parsed.UNTIL ? new Date(parsed.UNTIL) : undefined,
      byDay: parsed.BYDAY?.split(','),
      byMonth: parsed.BYMONTH?.split(',').map(Number),
      byMonthDay: parsed.BYMONTHDAY?.split(',').map(Number),
    };
  }
}
