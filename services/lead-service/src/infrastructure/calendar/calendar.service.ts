/**
 * Calendar Service
 * Unified calendar management service for Google and Microsoft integrations
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  CalendarProvider,
  CalendarIntegration,
  CalendarIntegrationSettings,
  CalendarEvent,
  CalendarListItem,
  CreateCalendarEventRequest,
  UpdateCalendarEventRequest,
  ListEventsOptions,
  ListEventsResponse,
  FreeBusyInfo,
  CalendarSyncResult,
  CalendarAuthRequest,
  CalendarAuthCallback,
  CalendarOAuthToken,
  CalendarConnectionStatus,
  EventSyncStatus,
  ICalendarProvider,
  DEFAULT_CALENDAR_SETTINGS,
} from './types';
import { GoogleCalendarProvider, GoogleCalendarConfig } from './google-calendar.provider';
import { MicrosoftCalendarProvider, MicrosoftCalendarConfig } from './microsoft-calendar.provider';

/**
 * Calendar service configuration
 */
export interface CalendarServiceConfig {
  google?: GoogleCalendarConfig;
  microsoft?: MicrosoftCalendarConfig;
}

/**
 * Get calendar configuration from environment
 */
export function getCalendarConfig(): CalendarServiceConfig {
  return {
    google: process.env.GOOGLE_CLIENT_ID
      ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirectUri: process.env.GOOGLE_REDIRECT_URI,
        }
      : undefined,
    microsoft: process.env.MICROSOFT_CLIENT_ID
      ? {
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
          tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
          redirectUri: process.env.MICROSOFT_REDIRECT_URI,
        }
      : undefined,
  };
}

@injectable()
export class CalendarService {
  private providers: Map<CalendarProvider, ICalendarProvider> = new Map();

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    config?: CalendarServiceConfig
  ) {
    const calendarConfig = config || getCalendarConfig();

    // Initialize Google provider if configured
    if (calendarConfig.google) {
      this.providers.set(
        CalendarProvider.GOOGLE,
        new GoogleCalendarProvider(calendarConfig.google)
      );
    }

    // Initialize Microsoft provider if configured
    if (calendarConfig.microsoft) {
      this.providers.set(
        CalendarProvider.MICROSOFT,
        new MicrosoftCalendarProvider(calendarConfig.microsoft)
      );
    }
  }

  /**
   * Get available calendar providers
   */
  getAvailableProviders(): CalendarProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider instance
   */
  private getProvider(provider: CalendarProvider): ICalendarProvider {
    const p = this.providers.get(provider);
    if (!p) {
      throw new Error(`Calendar provider ${provider} is not configured`);
    }
    return p;
  }

  /**
   * Start OAuth flow - get authorization URL
   */
  getAuthorizationUrl(
    provider: CalendarProvider,
    redirectUri: string,
    state?: string
  ): string {
    const p = this.getProvider(provider);
    return p.getAuthorizationUrl({ provider, redirectUri, state });
  }

  /**
   * Complete OAuth flow - exchange code for tokens and save integration
   */
  async connectCalendar(
    tenantId: string,
    userId: string,
    callback: CalendarAuthCallback
  ): Promise<Result<CalendarIntegration>> {
    try {
      const provider = this.getProvider(callback.provider);

      // Exchange code for tokens
      const tokens = await provider.exchangeCodeForTokens(callback);

      // Get user's calendars to find primary/email
      const calendars = await provider.listCalendars(tokens.accessToken);
      const primaryCalendar = calendars.find((c) => c.primary) || calendars[0];

      if (!primaryCalendar) {
        return Result.fail('No calendars found in account');
      }

      // Get provider account info (email)
      let providerEmail = '';
      if (callback.provider === CalendarProvider.GOOGLE) {
        // For Google, we can get email from calendar list
        providerEmail = primaryCalendar.id.includes('@')
          ? primaryCalendar.id
          : primaryCalendar.name;
      } else {
        // For Microsoft, email is typically in the calendar name or we need to fetch user info
        providerEmail = primaryCalendar.name;
      }

      // Check if integration already exists
      const existingResult = await this.getIntegrationByProvider(
        tenantId,
        userId,
        callback.provider
      );

      if (existingResult.isSuccess && existingResult.value) {
        // Update existing integration
        return this.updateIntegrationTokens(
          existingResult.value.id,
          tokens,
          CalendarConnectionStatus.CONNECTED
        );
      }

      // Create new integration
      const integration = await this.createIntegration(
        tenantId,
        userId,
        callback.provider,
        primaryCalendar.id,
        providerEmail,
        tokens
      );

      return integration;
    } catch (error) {
      return Result.fail(
        `Failed to connect calendar: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create new calendar integration
   * Uses actual database columns: tokens (JSONB), settings (JSONB), status (varchar)
   */
  private async createIntegration(
    tenantId: string,
    userId: string,
    provider: CalendarProvider,
    defaultCalendarId: string,
    providerEmail: string,
    tokens: CalendarOAuthToken
  ): Promise<Result<CalendarIntegration>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CalendarIntegration>(
        `INSERT INTO calendar_integrations
         (id, tenant_id, user_id, provider, provider_account_id, provider_email,
          tokens, calendar_id, sync_enabled, status, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          id,
          tenantId,
          userId,
          provider,
          providerEmail,
          providerEmail,
          JSON.stringify(tokens),
          defaultCalendarId,
          true,
          CalendarConnectionStatus.CONNECTED,
          JSON.stringify(DEFAULT_CALENDAR_SETTINGS),
          now,
          now,
        ]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to create integration');
      }

      const row = result.value.rows[0];
      return Result.ok(this.transformIntegrationRow(row));
    } catch (error) {
      return Result.fail(
        `Failed to create integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Transform database row to CalendarIntegration format
   * Handles actual DB columns: tokens (JSONB), settings (JSONB), status (varchar)
   */
  private transformIntegrationRow(row: Record<string, unknown>): CalendarIntegration {
    // Parse tokens from JSONB or use as object
    let tokens: CalendarOAuthToken;
    if (typeof row.tokens === 'string') {
      tokens = JSON.parse(row.tokens);
    } else if (row.tokens && typeof row.tokens === 'object') {
      tokens = row.tokens as CalendarOAuthToken;
    } else {
      tokens = { accessToken: '', scopes: [] };
    }

    // Parse settings from JSONB or use defaults
    let settings: CalendarIntegrationSettings;
    if (typeof row.settings === 'string') {
      settings = JSON.parse(row.settings);
    } else if (row.settings && typeof row.settings === 'object') {
      settings = row.settings as CalendarIntegrationSettings;
    } else {
      settings = DEFAULT_CALENDAR_SETTINGS;
    }

    return {
      id: row.id as string,
      tenantId: row.tenantId as string,
      userId: row.userId as string,
      provider: row.provider as CalendarProvider,
      providerAccountId: row.providerAccountId as string,
      providerEmail: row.providerEmail as string || row.providerAccountId as string,
      defaultCalendarId: row.defaultCalendarId as string,
      tokens,
      syncEnabled: row.syncEnabled as boolean,
      lastSyncAt: row.lastSyncAt as string | undefined,
      status: row.status as CalendarConnectionStatus || CalendarConnectionStatus.CONNECTED,
      settings,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
    };
  }

  /**
   * Update integration tokens
   * Uses actual database columns
   */
  private async updateIntegrationTokens(
    integrationId: string,
    tokens: CalendarOAuthToken,
    status: CalendarConnectionStatus
  ): Promise<Result<CalendarIntegration>> {
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `UPDATE calendar_integrations
         SET tokens = $1, status = $2, updated_at = $3
         WHERE id = $4
         RETURNING
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [JSON.stringify(tokens), status, new Date(), integrationId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to update tokens');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Integration not found');
      }

      return Result.ok(this.transformIntegrationRow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(
        `Failed to update tokens: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get integration by provider
   * Uses actual database columns
   */
  async getIntegrationByProvider(
    tenantId: string,
    userId: string,
    provider: CalendarProvider
  ): Promise<Result<CalendarIntegration | null>> {
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `SELECT
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM calendar_integrations
         WHERE tenant_id = $1 AND user_id = $2 AND provider = $3`,
        [tenantId, userId, provider]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.transformIntegrationRow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(
        `Failed to get integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get integration by ID
   * Uses actual database columns
   */
  async getIntegrationById(integrationId: string): Promise<Result<CalendarIntegration | null>> {
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `SELECT
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM calendar_integrations
         WHERE id = $1`,
        [integrationId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.transformIntegrationRow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(
        `Failed to get integration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all integrations for a user
   * Uses actual database columns
   */
  async getUserIntegrations(
    tenantId: string,
    userId: string
  ): Promise<Result<CalendarIntegration[]>> {
    try {
      const result = await this.pool.query<Record<string, unknown>>(
        `SELECT
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM calendar_integrations
         WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC`,
        [tenantId, userId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows.map(row => this.transformIntegrationRow(row)));
    } catch (error) {
      return Result.fail(
        `Failed to get integrations: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect calendar integration
   */
  async disconnectCalendar(integrationId: string): Promise<Result<void>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const provider = this.getProvider(integration.provider as CalendarProvider);

      // Try to revoke access (ignore errors)
      try {
        await provider.revokeAccess(integration.tokens.accessToken);
      } catch {
        // Ignore revocation errors
      }

      // Delete integration
      const result = await this.pool.query(
        'DELETE FROM calendar_integrations WHERE id = $1',
        [integrationId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to delete integration');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to disconnect: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update integration settings
   * Uses actual database columns (settings is JSONB)
   */
  async updateIntegrationSettings(
    integrationId: string,
    settings: Partial<CalendarIntegrationSettings>
  ): Promise<Result<CalendarIntegration>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const currentSettings = integrationResult.value.settings;
      const newSettings = { ...currentSettings, ...settings };

      // Update sync_enabled if syncEvents setting is provided
      const syncEnabled = settings.syncEvents !== undefined
        ? settings.syncEvents
        : integrationResult.value.syncEnabled;

      const result = await this.pool.query<Record<string, unknown>>(
        `UPDATE calendar_integrations
         SET settings = $1, sync_enabled = $2, updated_at = $3
         WHERE id = $4
         RETURNING
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           provider,
           provider_account_id as "providerAccountId",
           provider_email as "providerEmail",
           tokens,
           calendar_id as "defaultCalendarId",
           sync_enabled as "syncEnabled",
           last_sync_at as "lastSyncAt",
           status,
           settings,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [JSON.stringify(newSettings), syncEnabled, new Date(), integrationId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to update settings');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Integration not found');
      }

      return Result.ok(this.transformIntegrationRow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(
        `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Ensure valid access token (refresh if needed)
   */
  private async ensureValidToken(integration: CalendarIntegration): Promise<string> {
    const tokens = integration.tokens;

    // Check if token is expired (with 5 minute buffer)
    if (new Date(tokens.expiresAt) > new Date(Date.now() + 5 * 60 * 1000)) {
      return tokens.accessToken;
    }

    // Refresh token
    const provider = this.getProvider(integration.provider as CalendarProvider);
    const newTokens = await provider.refreshAccessToken(tokens.refreshToken);

    // Update stored tokens
    await this.updateIntegrationTokens(
      integration.id,
      newTokens,
      CalendarConnectionStatus.CONNECTED
    );

    return newTokens.accessToken;
  }

  /**
   * List calendars for an integration
   */
  async listCalendars(integrationId: string): Promise<Result<CalendarListItem[]>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calendars = await provider.listCalendars(accessToken);

      return Result.ok(calendars);
    } catch (error) {
      return Result.fail(
        `Failed to list calendars: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List events from calendar
   */
  async listEvents(
    integrationId: string,
    options: ListEventsOptions
  ): Promise<Result<ListEventsResponse>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calendarId = options.calendarId || integration.defaultCalendarId || 'primary';
      const response = await provider.listEvents(accessToken, { ...options, calendarId });

      // Enrich events with CRM data
      const enrichedEvents = response.events.map((event) => ({
        ...event,
        tenantId: integration.tenantId,
        userId: integration.userId,
        integrationId: integration.id,
      }));

      return Result.ok({ ...response, events: enrichedEvents });
    } catch (error) {
      return Result.fail(
        `Failed to list events: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a single event
   */
  async getEvent(
    integrationId: string,
    eventId: string,
    calendarId?: string
  ): Promise<Result<CalendarEvent | null>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calId = calendarId || integration.defaultCalendarId || 'primary';
      const event = await provider.getEvent(accessToken, calId, eventId);

      if (!event) {
        return Result.ok(null);
      }

      return Result.ok({
        ...event,
        tenantId: integration.tenantId,
        userId: integration.userId,
        integrationId: integration.id,
      });
    } catch (error) {
      return Result.fail(
        `Failed to get event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    integrationId: string,
    request: CreateCalendarEventRequest
  ): Promise<Result<CalendarEvent>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calendarId = request.calendarId || integration.defaultCalendarId || 'primary';
      const event = await provider.createEvent(accessToken, calendarId, request);

      // Save event to our database for tracking
      await this.saveEventToDatabase(integration, event);

      return Result.ok({
        ...event,
        tenantId: integration.tenantId,
        userId: integration.userId,
        integrationId: integration.id,
      });
    } catch (error) {
      return Result.fail(
        `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    integrationId: string,
    eventId: string,
    request: UpdateCalendarEventRequest,
    calendarId?: string
  ): Promise<Result<CalendarEvent>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calId = calendarId || integration.defaultCalendarId || 'primary';
      const event = await provider.updateEvent(accessToken, calId, eventId, request);

      // Update event in our database
      await this.updateEventInDatabase(eventId, event);

      return Result.ok({
        ...event,
        tenantId: integration.tenantId,
        userId: integration.userId,
        integrationId: integration.id,
      });
    } catch (error) {
      return Result.fail(
        `Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    integrationId: string,
    eventId: string,
    calendarId?: string
  ): Promise<Result<void>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calId = calendarId || integration.defaultCalendarId || 'primary';
      await provider.deleteEvent(accessToken, calId, eventId);

      // Delete from our database
      await this.deleteEventFromDatabase(eventId);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get free/busy information
   */
  async getFreeBusy(
    integrationId: string,
    startTime: Date,
    endTime: Date,
    calendarIds?: string[]
  ): Promise<Result<FreeBusyInfo[]>> {
    try {
      const integrationResult = await this.getIntegrationById(integrationId);
      if (integrationResult.isFailure || !integrationResult.value) {
        return Result.fail('Integration not found');
      }

      const integration = integrationResult.value;
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider as CalendarProvider);

      const calIds = calendarIds || [integration.defaultCalendarId || 'primary'];
      const freeBusy = await provider.getFreeBusy(accessToken, calIds, startTime, endTime);

      return Result.ok(freeBusy);
    } catch (error) {
      return Result.fail(
        `Failed to get free/busy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create event from CRM task
   */
  async createEventFromTask(
    integrationId: string,
    task: {
      id: string;
      title: string;
      description?: string;
      dueDate?: Date;
      assignedTo?: string;
      leadId?: string;
      customerId?: string;
      opportunityId?: string;
    }
  ): Promise<Result<CalendarEvent>> {
    const dueDate = task.dueDate || new Date();
    const integrationResult = await this.getIntegrationById(integrationId);

    if (integrationResult.isFailure || !integrationResult.value) {
      return Result.fail('Integration not found');
    }

    const settings = integrationResult.value.settings;
    const duration = settings.defaultEventDuration || 30;

    const request: CreateCalendarEventRequest = {
      title: task.title,
      description: task.description,
      startTime: dueDate,
      endTime: new Date(dueDate.getTime() + duration * 60 * 1000),
      reminders: [{ method: 'popup', minutes: settings.defaultReminderMinutes || 15 }],
      linkedLeadId: task.leadId,
      linkedCustomerId: task.customerId,
      linkedOpportunityId: task.opportunityId,
      linkedTaskId: task.id,
    };

    return this.createEvent(integrationId, request);
  }

  /**
   * Save event to database for tracking
   */
  private async saveEventToDatabase(
    integration: CalendarIntegration,
    event: CalendarEvent
  ): Promise<void> {
    const id = uuidv4();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO calendar_events
       (id, external_id, tenant_id, user_id, integration_id, calendar_id, title, description,
        location, start_time, end_time, all_day, timezone, status, visibility, organizer,
        attendees, conference_data, reminders, recurrence, linked_lead_id, linked_customer_id,
        linked_opportunity_id, linked_task_id, sync_status, last_synced_at, etag, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
       ON CONFLICT (external_id, integration_id) DO UPDATE
       SET title = EXCLUDED.title, description = EXCLUDED.description, location = EXCLUDED.location,
           start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, status = EXCLUDED.status,
           attendees = EXCLUDED.attendees, sync_status = EXCLUDED.sync_status,
           last_synced_at = EXCLUDED.last_synced_at, etag = EXCLUDED.etag, updated_at = EXCLUDED.updated_at`,
      [
        id,
        event.externalId,
        integration.tenantId,
        integration.userId,
        integration.id,
        event.calendarId,
        event.title,
        event.description,
        event.location,
        event.startTime,
        event.endTime,
        event.allDay,
        event.timezone,
        event.status,
        event.visibility,
        JSON.stringify(event.organizer),
        JSON.stringify(event.attendees),
        JSON.stringify(event.conferenceData),
        JSON.stringify(event.reminders),
        JSON.stringify(event.recurrence),
        event.linkedLeadId,
        event.linkedCustomerId,
        event.linkedOpportunityId,
        event.linkedTaskId,
        EventSyncStatus.SYNCED,
        now,
        event.etag,
        now,
        now,
      ]
    );
  }

  /**
   * Update event in database
   */
  private async updateEventInDatabase(externalId: string, event: CalendarEvent): Promise<void> {
    await this.pool.query(
      `UPDATE calendar_events
       SET title = $1, description = $2, location = $3, start_time = $4, end_time = $5,
           status = $6, attendees = $7, sync_status = $8, last_synced_at = $9, etag = $10, updated_at = $11
       WHERE external_id = $12`,
      [
        event.title,
        event.description,
        event.location,
        event.startTime,
        event.endTime,
        event.status,
        JSON.stringify(event.attendees),
        EventSyncStatus.SYNCED,
        new Date(),
        event.etag,
        new Date(),
        externalId,
      ]
    );
  }

  /**
   * Delete event from database
   */
  private async deleteEventFromDatabase(externalId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM calendar_events WHERE external_id = $1',
      [externalId]
    );
  }

  /**
   * Get events linked to a lead
   */
  async getEventsForLead(
    tenantId: string,
    leadId: string
  ): Promise<Result<CalendarEvent[]>> {
    try {
      const result = await this.pool.query<CalendarEvent>(
        `SELECT * FROM calendar_events
         WHERE tenant_id = $1 AND linked_lead_id = $2
         ORDER BY start_time DESC`,
        [tenantId, leadId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(
        `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get events linked to a customer
   */
  async getEventsForCustomer(
    tenantId: string,
    customerId: string
  ): Promise<Result<CalendarEvent[]>> {
    try {
      const result = await this.pool.query<CalendarEvent>(
        `SELECT * FROM calendar_events
         WHERE tenant_id = $1 AND linked_customer_id = $2
         ORDER BY start_time DESC`,
        [tenantId, customerId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(
        `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get upcoming events for user
   */
  async getUpcomingEvents(
    tenantId: string,
    userId: string,
    days: number = 7
  ): Promise<Result<CalendarEvent[]>> {
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const result = await this.pool.query<CalendarEvent>(
        `SELECT * FROM calendar_events
         WHERE tenant_id = $1 AND user_id = $2
           AND start_time >= $3 AND start_time <= $4
           AND status != 'cancelled'
         ORDER BY start_time ASC`,
        [tenantId, userId, now, endDate]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(
        `Failed to get events: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
