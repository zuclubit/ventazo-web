/**
 * Microsoft Outlook Calendar Provider
 * Implements calendar integration with Microsoft Graph API
 *
 * @see https://learn.microsoft.com/en-us/graph/api/resources/calendar
 * @see https://www.npmjs.com/package/@microsoft/microsoft-graph-client
 */

import { ConfidentialClientApplication, Configuration } from '@azure/msal-node';
import { Client, PageCollection } from '@microsoft/microsoft-graph-client';
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
  EventRecurrence,
} from './types';

/**
 * Microsoft Calendar configuration
 */
export interface MicrosoftCalendarConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string; // Can be 'common' for multi-tenant apps
  redirectUri?: string;
}

/**
 * Microsoft Graph Event interface
 */
interface GraphEvent {
  id?: string;
  subject?: string;
  body?: { content?: string; contentType?: string };
  bodyPreview?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  location?: { displayName?: string };
  isAllDay?: boolean;
  isCancelled?: boolean;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  onlineMeeting?: { joinUrl?: string };
  organizer?: { emailAddress?: { address?: string; name?: string } };
  attendees?: Array<{
    emailAddress?: { address?: string; name?: string };
    status?: { response?: string };
    type?: string;
  }>;
  recurrence?: {
    pattern?: {
      type?: string;
      interval?: number;
      daysOfWeek?: string[];
      dayOfMonth?: number;
      month?: number;
    };
    range?: {
      type?: string;
      startDate?: string;
      endDate?: string;
      numberOfOccurrences?: number;
    };
  };
  showAs?: string;
  sensitivity?: string;
  importance?: string;
  reminderMinutesBeforeStart?: number;
  isReminderOn?: boolean;
  categories?: string[];
  seriesMasterId?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  changeKey?: string;
  extensions?: Array<{
    id?: string;
    [key: string]: unknown;
  }>;
}

/**
 * Microsoft Outlook Calendar Provider Implementation
 */
export class MicrosoftCalendarProvider implements ICalendarProvider {
  readonly provider = CalendarProvider.MICROSOFT;
  private config: MicrosoftCalendarConfig;
  private msalClient: ConfidentialClientApplication;

  constructor(config: MicrosoftCalendarConfig) {
    this.config = config;

    const msalConfig: Configuration = {
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);
  }

  /**
   * Create Microsoft Graph client with access token
   */
  private getGraphClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Default scopes for Microsoft Calendar
   */
  private getDefaultScopes(): string[] {
    return [
      'User.Read',
      'Calendars.ReadWrite',
      'Calendars.Read.Shared',
      'offline_access',
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

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      response_mode: 'query',
      state: request.state || '',
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(callback: CalendarAuthCallback): Promise<CalendarOAuthToken> {
    const tokenRequest = {
      code: callback.code,
      scopes: this.getDefaultScopes(),
      redirectUri: callback.redirectUri,
    };

    const response = await this.msalClient.acquireTokenByCode(tokenRequest);

    if (!response || !response.accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // MSAL doesn't directly expose refresh token, we need to get it from cache
    const accounts = await this.msalClient.getTokenCache().getAllAccounts();
    const account = accounts[0];

    // For refresh token, we'll use silent token acquisition pattern
    // The refresh token is managed internally by MSAL
    return {
      accessToken: response.accessToken,
      refreshToken: response.accessToken, // MSAL handles refresh internally
      expiresAt: response.expiresOn || new Date(Date.now() + 3600000),
      tokenType: 'Bearer',
      scope: response.scopes?.join(' '),
    };
  }

  /**
   * Refresh expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<CalendarOAuthToken> {
    // For Microsoft, we use the refresh token flow
    const tokenEndpoint = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: this.getDefaultScopes().join(' '),
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type || 'Bearer',
      scope: data.scope,
    };
  }

  /**
   * Revoke OAuth access
   */
  async revokeAccess(_accessToken: string): Promise<void> {
    // Microsoft doesn't have a direct revoke endpoint
    // The token will expire naturally or user can revoke from Microsoft account settings
    // We just clear our local cache
    const cache = this.msalClient.getTokenCache();
    const accounts = await cache.getAllAccounts();
    for (const account of accounts) {
      await cache.removeAccount(account);
    }
  }

  /**
   * List user's calendars
   */
  async listCalendars(accessToken: string): Promise<CalendarListItem[]> {
    const client = this.getGraphClient(accessToken);

    const response = await client.api('/me/calendars').get();
    const calendars = response.value || [];

    return calendars.map((cal: {
      id?: string;
      name?: string;
      color?: string;
      isDefaultCalendar?: boolean;
      canEdit?: boolean;
      hexColor?: string;
    }) => ({
      id: cal.id || '',
      name: cal.name || 'Untitled Calendar',
      description: undefined,
      color: cal.hexColor || cal.color || undefined,
      primary: cal.isDefaultCalendar || false,
      accessRole: cal.canEdit ? 'owner' : 'reader' as const,
      selected: true,
      hidden: false,
      timezone: undefined,
    }));
  }

  /**
   * List calendar events
   */
  async listEvents(accessToken: string, options: ListEventsOptions): Promise<ListEventsResponse> {
    const client = this.getGraphClient(accessToken);
    const calendarId = options.calendarId || 'primary';

    let endpoint = calendarId === 'primary'
      ? '/me/calendar/events'
      : `/me/calendars/${calendarId}/events`;

    // Build query parameters
    const queryParams: string[] = [];

    if (options.startTime) {
      queryParams.push(`$filter=start/dateTime ge '${options.startTime.toISOString()}'`);
    }

    if (options.endTime) {
      const filter = queryParams.find(q => q.startsWith('$filter'));
      if (filter) {
        queryParams[queryParams.indexOf(filter)] = `${filter} and end/dateTime le '${options.endTime.toISOString()}'`;
      } else {
        queryParams.push(`$filter=end/dateTime le '${options.endTime.toISOString()}'`);
      }
    }

    if (options.maxResults) {
      queryParams.push(`$top=${options.maxResults}`);
    }

    if (options.orderBy) {
      const orderField = options.orderBy === 'startTime' ? 'start/dateTime' : 'lastModifiedDateTime';
      queryParams.push(`$orderby=${orderField} desc`);
    }

    if (options.q) {
      const filter = queryParams.find(q => q.startsWith('$filter'));
      if (filter) {
        queryParams[queryParams.indexOf(filter)] = `${filter} and contains(subject,'${options.q}')`;
      } else {
        queryParams.push(`$filter=contains(subject,'${options.q}')`);
      }
    }

    if (queryParams.length > 0) {
      endpoint += '?' + queryParams.join('&');
    }

    const response: PageCollection = await client.api(endpoint).get();
    const events = (response.value || []) as GraphEvent[];

    return {
      events: events.map((event) => this.mapGraphEventToCalendarEvent(event, calendarId)),
      nextPageToken: response['@odata.nextLink'] ? encodeURIComponent(response['@odata.nextLink']) : undefined,
    };
  }

  /**
   * Get a single event
   */
  async getEvent(accessToken: string, calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    const client = this.getGraphClient(accessToken);

    try {
      const endpoint = calendarId === 'primary'
        ? `/me/calendar/events/${eventId}`
        : `/me/calendars/${calendarId}/events/${eventId}`;

      const event: GraphEvent = await client.api(endpoint).get();

      if (!event) {
        return null;
      }

      return this.mapGraphEventToCalendarEvent(event, calendarId);
    } catch (error: unknown) {
      const err = error as { statusCode?: number };
      if (err.statusCode === 404) {
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
    const client = this.getGraphClient(accessToken);

    const endpoint = calendarId === 'primary' || !calendarId
      ? '/me/calendar/events'
      : `/me/calendars/${calendarId}/events`;

    const eventResource: Record<string, unknown> = {
      subject: request.title,
      body: request.description ? { content: request.description, contentType: 'text' } : undefined,
      location: request.location ? { displayName: request.location } : undefined,
      start: {
        dateTime: request.startTime.toISOString(),
        timeZone: request.timezone || 'UTC',
      },
      end: {
        dateTime: request.endTime.toISOString(),
        timeZone: request.timezone || 'UTC',
      },
      isAllDay: request.allDay || false,
      attendees: request.attendees?.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.optional ? 'optional' : 'required',
      })),
      isReminderOn: request.reminders && request.reminders.length > 0,
      reminderMinutesBeforeStart: request.reminders?.[0]?.minutes || 15,
      sensitivity: this.mapVisibilityToGraph(request.visibility),
    };

    // Add recurrence if specified
    if (request.recurrence) {
      eventResource.recurrence = this.buildGraphRecurrence(request.recurrence, request.startTime);
    }

    // Add Teams meeting if requested
    if (request.createConference) {
      eventResource.isOnlineMeeting = true;
      eventResource.onlineMeetingProvider = 'teamsForBusiness';
    }

    // Add extension for CRM linking
    eventResource.extensions = [{
      '@odata.type': 'microsoft.graph.openTypeExtension',
      extensionName: 'com.zuclubit.crm',
      linkedLeadId: request.linkedLeadId || '',
      linkedCustomerId: request.linkedCustomerId || '',
      linkedOpportunityId: request.linkedOpportunityId || '',
      linkedTaskId: request.linkedTaskId || '',
    }];

    const response: GraphEvent = await client.api(endpoint).post(eventResource);

    if (!response) {
      throw new Error('Failed to create event');
    }

    return this.mapGraphEventToCalendarEvent(response, calendarId);
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
    const client = this.getGraphClient(accessToken);

    const endpoint = calendarId === 'primary'
      ? `/me/calendar/events/${eventId}`
      : `/me/calendars/${calendarId}/events/${eventId}`;

    const updateResource: Record<string, unknown> = {};

    if (request.title !== undefined) {
      updateResource.subject = request.title;
    }

    if (request.description !== undefined) {
      updateResource.body = { content: request.description, contentType: 'text' };
    }

    if (request.location !== undefined) {
      updateResource.location = { displayName: request.location };
    }

    if (request.startTime) {
      updateResource.start = {
        dateTime: request.startTime.toISOString(),
        timeZone: request.timezone || 'UTC',
      };
    }

    if (request.endTime) {
      updateResource.end = {
        dateTime: request.endTime.toISOString(),
        timeZone: request.timezone || 'UTC',
      };
    }

    if (request.allDay !== undefined) {
      updateResource.isAllDay = request.allDay;
    }

    if (request.attendees) {
      updateResource.attendees = request.attendees.map((a) => ({
        emailAddress: { address: a.email, name: a.name },
        type: a.optional ? 'optional' : 'required',
      }));
    }

    if (request.reminders) {
      updateResource.isReminderOn = request.reminders.length > 0;
      updateResource.reminderMinutesBeforeStart = request.reminders[0]?.minutes || 15;
    }

    if (request.visibility) {
      updateResource.sensitivity = this.mapVisibilityToGraph(request.visibility);
    }

    if (request.status === EventStatus.CANCELLED) {
      updateResource.isCancelled = true;
    }

    const response: GraphEvent = await client.api(endpoint).patch(updateResource);

    if (!response) {
      throw new Error('Failed to update event');
    }

    return this.mapGraphEventToCalendarEvent(response, calendarId);
  }

  /**
   * Delete an event
   */
  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const client = this.getGraphClient(accessToken);

    const endpoint = calendarId === 'primary'
      ? `/me/calendar/events/${eventId}`
      : `/me/calendars/${calendarId}/events/${eventId}`;

    await client.api(endpoint).delete();
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
    const client = this.getGraphClient(accessToken);

    // Get user email for the request
    const me = await client.api('/me').select('mail,userPrincipalName').get();
    const email = me.mail || me.userPrincipalName;

    const response = await client.api('/me/calendar/getSchedule').post({
      schedules: [email],
      startTime: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      endTime: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      availabilityViewInterval: 30,
    });

    const schedules = response.value || [];

    return schedules.map((schedule: {
      scheduleId: string;
      scheduleItems?: Array<{ start?: { dateTime: string }; end?: { dateTime: string } }>;
    }) => ({
      calendarId: schedule.scheduleId,
      busy: (schedule.scheduleItems || []).map((item: {
        start?: { dateTime: string };
        end?: { dateTime: string };
      }) => ({
        start: new Date(item.start?.dateTime || ''),
        end: new Date(item.end?.dateTime || ''),
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
    const client = this.getGraphClient(accessToken);

    // Microsoft subscriptions can last up to 3 days for calendar
    const expiration = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const resource = calendarId === 'primary'
      ? '/me/calendar/events'
      : `/me/calendars/${calendarId}/events`;

    const subscription = await client.api('/subscriptions').post({
      changeType: 'created,updated,deleted',
      notificationUrl: webhookUrl,
      resource,
      expirationDateTime: expiration.toISOString(),
      clientState: channelId,
    });

    return {
      resourceId: subscription.id,
      expiration: new Date(subscription.expirationDateTime),
    };
  }

  /**
   * Stop watching calendar
   */
  async stopWatch(accessToken: string, _channelId: string, resourceId: string): Promise<void> {
    const client = this.getGraphClient(accessToken);
    await client.api(`/subscriptions/${resourceId}`).delete();
  }

  /**
   * Map Microsoft Graph event to our CalendarEvent format
   */
  private mapGraphEventToCalendarEvent(event: GraphEvent, calendarId: string): CalendarEvent {
    const crmExtension = event.extensions?.find(
      (ext) => ext.id?.includes('com.zuclubit.crm')
    );

    return {
      id: event.id || '',
      externalId: event.id || undefined,
      tenantId: '', // Will be set by service
      userId: '', // Will be set by service
      integrationId: '', // Will be set by service
      calendarId,
      title: event.subject || 'Untitled Event',
      description: event.body?.content || event.bodyPreview || undefined,
      location: event.location?.displayName || undefined,
      startTime: new Date(event.start?.dateTime || Date.now()),
      endTime: new Date(event.end?.dateTime || Date.now()),
      allDay: event.isAllDay || false,
      timezone: event.start?.timeZone || 'UTC',
      recurrence: event.recurrence ? this.parseGraphRecurrence(event.recurrence) : undefined,
      recurringEventId: event.seriesMasterId || undefined,
      status: event.isCancelled ? EventStatus.CANCELLED : EventStatus.CONFIRMED,
      visibility: this.mapGraphSensitivity(event.sensitivity),
      organizer: event.organizer
        ? {
            email: event.organizer.emailAddress?.address || '',
            name: event.organizer.emailAddress?.name || undefined,
            responseStatus: AttendeeResponseStatus.ACCEPTED,
            optional: false,
            organizer: true,
            self: false,
            resource: false,
          }
        : undefined,
      attendees: (event.attendees || []).map((a) => ({
        email: a.emailAddress?.address || '',
        name: a.emailAddress?.name || undefined,
        responseStatus: this.mapGraphResponseStatus(a.status?.response),
        optional: a.type === 'optional',
        organizer: false,
        self: false,
        resource: a.type === 'resource',
      })),
      conferenceData: event.isOnlineMeeting && (event.onlineMeetingUrl || event.onlineMeeting?.joinUrl)
        ? {
            type: ConferenceType.MICROSOFT_TEAMS,
            conferenceUrl: event.onlineMeetingUrl || event.onlineMeeting?.joinUrl,
          }
        : undefined,
      reminders: event.isReminderOn
        ? [{ method: 'popup' as const, minutes: event.reminderMinutesBeforeStart || 15 }]
        : [],
      linkedLeadId: (crmExtension?.linkedLeadId as string) || undefined,
      linkedCustomerId: (crmExtension?.linkedCustomerId as string) || undefined,
      linkedOpportunityId: (crmExtension?.linkedOpportunityId as string) || undefined,
      linkedTaskId: (crmExtension?.linkedTaskId as string) || undefined,
      color: undefined,
      tags: event.categories || [],
      metadata: {},
      syncStatus: EventSyncStatus.SYNCED,
      lastSyncedAt: new Date(),
      etag: event.changeKey || undefined,
      createdAt: new Date(event.createdDateTime || Date.now()),
      updatedAt: new Date(event.lastModifiedDateTime || Date.now()),
    };
  }

  /**
   * Map our visibility to Microsoft Graph sensitivity
   */
  private mapVisibilityToGraph(visibility?: EventVisibility): string {
    switch (visibility) {
      case EventVisibility.PUBLIC:
        return 'normal';
      case EventVisibility.PRIVATE:
        return 'private';
      case EventVisibility.CONFIDENTIAL:
        return 'confidential';
      default:
        return 'normal';
    }
  }

  /**
   * Map Microsoft Graph sensitivity to our visibility
   */
  private mapGraphSensitivity(sensitivity?: string): EventVisibility {
    switch (sensitivity) {
      case 'private':
        return EventVisibility.PRIVATE;
      case 'confidential':
        return EventVisibility.CONFIDENTIAL;
      default:
        return EventVisibility.DEFAULT;
    }
  }

  /**
   * Map Microsoft Graph response status to our format
   */
  private mapGraphResponseStatus(status?: string): AttendeeResponseStatus {
    switch (status) {
      case 'accepted':
        return AttendeeResponseStatus.ACCEPTED;
      case 'declined':
        return AttendeeResponseStatus.DECLINED;
      case 'tentativelyAccepted':
        return AttendeeResponseStatus.TENTATIVE;
      default:
        return AttendeeResponseStatus.NEEDS_ACTION;
    }
  }

  /**
   * Build Microsoft Graph recurrence pattern
   */
  private buildGraphRecurrence(
    recurrence: EventRecurrence,
    startDate: Date
  ): Record<string, unknown> {
    const pattern: Record<string, unknown> = {
      interval: recurrence.interval,
    };

    switch (recurrence.frequency) {
      case 'daily':
        pattern.type = 'daily';
        break;
      case 'weekly':
        pattern.type = 'weekly';
        pattern.daysOfWeek = recurrence.byDay || ['monday'];
        break;
      case 'monthly':
        pattern.type = 'absoluteMonthly';
        pattern.dayOfMonth = recurrence.byMonthDay?.[0] || startDate.getDate();
        break;
      case 'yearly':
        pattern.type = 'absoluteYearly';
        pattern.dayOfMonth = startDate.getDate();
        pattern.month = (recurrence.byMonth?.[0] || startDate.getMonth()) + 1;
        break;
    }

    const range: Record<string, unknown> = {
      startDate: startDate.toISOString().split('T')[0],
    };

    if (recurrence.count) {
      range.type = 'numbered';
      range.numberOfOccurrences = recurrence.count;
    } else if (recurrence.until) {
      range.type = 'endDate';
      range.endDate = recurrence.until.toISOString().split('T')[0];
    } else {
      range.type = 'noEnd';
    }

    return { pattern, range };
  }

  /**
   * Parse Microsoft Graph recurrence to our format
   */
  private parseGraphRecurrence(recurrence: GraphEvent['recurrence']): EventRecurrence | undefined {
    if (!recurrence?.pattern) {
      return undefined;
    }

    const pattern = recurrence.pattern;
    let frequency: EventRecurrence['frequency'] = 'daily';

    switch (pattern.type) {
      case 'daily':
        frequency = 'daily';
        break;
      case 'weekly':
        frequency = 'weekly';
        break;
      case 'absoluteMonthly':
      case 'relativeMonthly':
        frequency = 'monthly';
        break;
      case 'absoluteYearly':
      case 'relativeYearly':
        frequency = 'yearly';
        break;
    }

    return {
      frequency,
      interval: pattern.interval || 1,
      count: recurrence.range?.numberOfOccurrences,
      until: recurrence.range?.endDate ? new Date(recurrence.range.endDate) : undefined,
      byDay: pattern.daysOfWeek?.map((d) => d.substring(0, 2).toUpperCase()),
      byMonthDay: pattern.dayOfMonth ? [pattern.dayOfMonth] : undefined,
      byMonth: pattern.month ? [pattern.month] : undefined,
    };
  }
}
