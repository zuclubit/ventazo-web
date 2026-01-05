/**
 * Calendar Module - API Client
 *
 * Client for calendar operations using the BFF (Backend For Frontend) pattern.
 * All requests are proxied through Next.js API routes.
 *
 * @module lib/calendar/api
 */

import { apiClient } from '@/lib/api/api-client';
import type {
  CalendarEvent,
  CalendarIntegration,
  CalendarListItem,
  CalendarProvider,
  CalendarProviderInfo,
  ConnectCalendarRequest,
  ConnectCalendarResponse,
  CreateEventRequest,
  EventsListResponse,
  FreeBusyInfo,
  FreeBusyRequest,
  ListEventsParams,
  ListEventsResponse,
  OAuthCallbackRequest,
  UpdateEventRequest,
  UpdateSettingsRequest,
} from './types';

// ============================================
// API Base Path
// ============================================

const CALENDAR_BASE = '/calendar';

// ============================================
// Provider & Integration Endpoints
// ============================================

/**
 * Get available calendar providers (Google, Microsoft)
 */
export async function getProviders(): Promise<{ providers: CalendarProviderInfo[] }> {
  return apiClient.get<{ providers: CalendarProviderInfo[] }>(
    `${CALENDAR_BASE}/providers`
  );
}

/**
 * Get user's calendar integrations
 */
export async function getIntegrations(): Promise<CalendarIntegration[]> {
  return apiClient.get<CalendarIntegration[]>(`${CALENDAR_BASE}/integrations`);
}

/**
 * Get a specific integration by ID
 */
export async function getIntegrationById(
  integrationId: string
): Promise<CalendarIntegration> {
  const integrations = await getIntegrations();
  const integration = integrations.find((i) => i.id === integrationId);
  if (!integration) {
    throw new Error(`Integration not found: ${integrationId}`);
  }
  return integration;
}

/**
 * Start OAuth flow - get authorization URL
 */
export async function connectIntegration(
  request: ConnectCalendarRequest
): Promise<ConnectCalendarResponse> {
  return apiClient.post<ConnectCalendarResponse>(
    `${CALENDAR_BASE}/connect`,
    request
  );
}

/**
 * Complete OAuth flow - exchange code for tokens
 */
export async function completeOAuthCallback(
  request: OAuthCallbackRequest
): Promise<CalendarIntegration> {
  return apiClient.post<CalendarIntegration>(
    `${CALENDAR_BASE}/callback`,
    request
  );
}

/**
 * Disconnect calendar integration
 */
export async function disconnectIntegration(integrationId: string): Promise<void> {
  await apiClient.delete(`${CALENDAR_BASE}/integrations/${integrationId}`);
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(
  integrationId: string,
  settings: UpdateSettingsRequest
): Promise<CalendarIntegration> {
  return apiClient.patch<CalendarIntegration>(
    `${CALENDAR_BASE}/integrations/${integrationId}/settings`,
    settings
  );
}

// ============================================
// Calendar List Endpoints
// ============================================

/**
 * List calendars for an integration
 */
export async function getCalendarsForIntegration(
  integrationId: string
): Promise<CalendarListItem[]> {
  return apiClient.get<CalendarListItem[]>(
    `${CALENDAR_BASE}/integrations/${integrationId}/calendars`
  );
}

/**
 * Get all user's calendars (from all integrations)
 */
export async function getCalendars(): Promise<{
  items: Array<{
    id: string;
    name: string;
    provider: CalendarProvider;
    email: string;
    isPrimary: boolean;
    isConnected: boolean;
    lastSyncAt?: string;
  }>;
  total: number;
}> {
  return apiClient.get(`${CALENDAR_BASE}/calendars`);
}

// ============================================
// Event Endpoints
// ============================================

/**
 * Get events with optional filters
 * Uses the consolidated /calendar/events endpoint
 */
export async function getEvents(params?: {
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  days?: number;
}): Promise<EventsListResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};

  if (params?.days) {
    queryParams['days'] = params.days;
  }
  if (params?.limit) {
    queryParams['limit'] = params.limit;
  }

  return apiClient.get<EventsListResponse>(`${CALENDAR_BASE}/events`, {
    params: queryParams,
  });
}

/**
 * Get upcoming events (default: 7 days)
 */
export async function getUpcomingEvents(days?: number): Promise<CalendarEvent[]> {
  const queryParams: Record<string, number | undefined> = {};
  if (days) {
    queryParams['days'] = days;
  }

  return apiClient.get<CalendarEvent[]>(`${CALENDAR_BASE}/upcoming`, {
    params: queryParams,
  });
}

/**
 * Get events from a specific integration
 */
export async function getEventsForIntegration(
  integrationId: string,
  params?: ListEventsParams
): Promise<ListEventsResponse> {
  const queryParams: Record<string, string | number | boolean | undefined> = {};

  if (params) {
    if (params.calendarId) queryParams['calendarId'] = params.calendarId;
    if (params.startTime) queryParams['startTime'] = params.startTime;
    if (params.endTime) queryParams['endTime'] = params.endTime;
    if (params.maxResults) queryParams['maxResults'] = params.maxResults;
    if (params.pageToken) queryParams['pageToken'] = params.pageToken;
    if (params.showDeleted !== undefined) queryParams['showDeleted'] = params.showDeleted;
    if (params.singleEvents !== undefined) queryParams['singleEvents'] = params.singleEvents;
    if (params.orderBy) queryParams['orderBy'] = params.orderBy;
    if (params.q) queryParams['q'] = params.q;
    if (params.linkedLeadId) queryParams['linkedLeadId'] = params.linkedLeadId;
    if (params.linkedCustomerId) queryParams['linkedCustomerId'] = params.linkedCustomerId;
    if (params.linkedOpportunityId) queryParams['linkedOpportunityId'] = params.linkedOpportunityId;
    if (params.linkedTaskId) queryParams['linkedTaskId'] = params.linkedTaskId;
  }

  return apiClient.get<ListEventsResponse>(
    `${CALENDAR_BASE}/integrations/${integrationId}/events`,
    { params: queryParams }
  );
}

/**
 * Get a specific event by ID
 */
export async function getEventById(
  integrationId: string,
  eventId: string,
  calendarId?: string
): Promise<CalendarEvent> {
  const queryParams: Record<string, string | undefined> = {};
  if (calendarId) {
    queryParams['calendarId'] = calendarId;
  }

  return apiClient.get<CalendarEvent>(
    `${CALENDAR_BASE}/integrations/${integrationId}/events/${eventId}`,
    { params: queryParams }
  );
}

/**
 * Create a new event
 */
export async function createEvent(
  integrationId: string,
  data: CreateEventRequest
): Promise<CalendarEvent> {
  return apiClient.post<CalendarEvent>(
    `${CALENDAR_BASE}/integrations/${integrationId}/events`,
    data
  );
}

/**
 * Update an event
 */
export async function updateEvent(
  integrationId: string,
  eventId: string,
  data: UpdateEventRequest,
  calendarId?: string
): Promise<CalendarEvent> {
  const queryParams: Record<string, string | undefined> = {};
  if (calendarId) {
    queryParams['calendarId'] = calendarId;
  }

  return apiClient.patch<CalendarEvent>(
    `${CALENDAR_BASE}/integrations/${integrationId}/events/${eventId}`,
    data,
    { params: queryParams }
  );
}

/**
 * Delete an event
 */
export async function deleteEvent(
  integrationId: string,
  eventId: string,
  calendarId?: string
): Promise<void> {
  const queryParams: Record<string, string | undefined> = {};
  if (calendarId) {
    queryParams['calendarId'] = calendarId;
  }

  await apiClient.delete(
    `${CALENDAR_BASE}/integrations/${integrationId}/events/${eventId}`,
    { params: queryParams }
  );
}

// ============================================
// Free/Busy Endpoints
// ============================================

/**
 * Get free/busy information for an integration
 */
export async function getFreeBusy(
  integrationId: string,
  request: FreeBusyRequest
): Promise<FreeBusyInfo[]> {
  return apiClient.post<FreeBusyInfo[]>(
    `${CALENDAR_BASE}/integrations/${integrationId}/freebusy`,
    request
  );
}

// ============================================
// CRM-Linked Events Endpoints
// ============================================

/**
 * Get events linked to a specific lead
 */
export async function getEventsForLead(leadId: string): Promise<CalendarEvent[]> {
  return apiClient.get<CalendarEvent[]>(
    `${CALENDAR_BASE}/leads/${leadId}/events`
  );
}

/**
 * Get events linked to a specific customer
 */
export async function getEventsForCustomer(
  customerId: string
): Promise<CalendarEvent[]> {
  return apiClient.get<CalendarEvent[]>(
    `${CALENDAR_BASE}/customers/${customerId}/events`
  );
}

// ============================================
// Utility Functions
// ============================================

/**
 * Helper to get date range for a specific view
 */
export function getDateRangeForView(
  view: 'day' | 'week' | 'month',
  date: Date
): { startTime: string; endTime: string } {
  const start = new Date(date);
  const end = new Date(date);

  switch (view) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + (6 - dayOfWeek));
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

// ============================================
// Exported API Object
// ============================================

/**
 * Calendar API client object
 * Provides all calendar-related API operations
 */
export const calendarApi = {
  // Providers & Integrations
  getProviders,
  getIntegrations,
  getIntegrationById,
  connectIntegration,
  completeOAuthCallback,
  disconnectIntegration,
  updateIntegrationSettings,

  // Calendar List
  getCalendarsForIntegration,
  getCalendars,

  // Events
  getEvents,
  getUpcomingEvents,
  getEventsForIntegration,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,

  // Free/Busy
  getFreeBusy,

  // CRM-Linked
  getEventsForLead,
  getEventsForCustomer,

  // Utilities
  getDateRangeForView,
} as const;

export default calendarApi;
