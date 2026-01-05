/**
 * Calendar Integration Types
 * Unified types for Google Calendar and Microsoft Outlook Calendar integration
 */

/**
 * Supported calendar providers
 */
export enum CalendarProvider {
  GOOGLE = 'google',
  MICROSOFT = 'microsoft',
}

/**
 * OAuth token data stored for each integration
 */
export interface CalendarOAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope?: string;
}

/**
 * Calendar integration connection status
 */
export enum CalendarConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  EXPIRED = 'expired',
  ERROR = 'error',
}

/**
 * Calendar integration record stored in database
 */
export interface CalendarIntegration {
  id: string;
  tenantId: string;
  userId: string;
  provider: CalendarProvider;
  providerAccountId: string;
  providerEmail: string;
  tokens: CalendarOAuthToken;
  defaultCalendarId?: string;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  status: CalendarConnectionStatus;
  settings: CalendarIntegrationSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settings for calendar integration
 */
export interface CalendarIntegrationSettings {
  syncDirection: 'one_way_to_calendar' | 'one_way_from_calendar' | 'two_way';
  autoSyncTasks: boolean;
  autoSyncMeetings: boolean;
  syncPastEvents: boolean;
  syncFutureDays: number;
  defaultReminderMinutes: number;
  defaultEventDuration: number; // in minutes
  workingHours?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    workDays: number[]; // 0=Sunday, 1=Monday, etc.
    timezone: string;
  };
}

/**
 * Unified calendar event structure
 */
export interface CalendarEvent {
  id: string;
  externalId?: string; // Provider's event ID
  tenantId: string;
  userId: string;
  integrationId: string;
  calendarId: string;

  // Event details
  title: string;
  description?: string;
  location?: string;

  // Timing
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone: string;

  // Recurrence
  recurrence?: EventRecurrence;
  recurringEventId?: string;

  // Status
  status: EventStatus;
  visibility: EventVisibility;

  // Attendees
  organizer?: EventAttendee;
  attendees: EventAttendee[];

  // Conference/Video call
  conferenceData?: ConferenceData;

  // Reminders
  reminders: EventReminder[];

  // CRM linking
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  linkedTaskId?: string;

  // Metadata
  color?: string;
  tags: string[];
  metadata: Record<string, unknown>;

  // Sync info
  syncStatus: EventSyncStatus;
  lastSyncedAt?: Date;
  etag?: string; // For conflict detection

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event recurrence rule (RFC 5545 RRULE format)
 */
export interface EventRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: string[]; // 'MO', 'TU', 'WE', etc.
  byMonth?: number[];
  byMonthDay?: number[];
  exceptions?: Date[]; // Dates to exclude
}

/**
 * Event status
 */
export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

/**
 * Event visibility
 */
export enum EventVisibility {
  DEFAULT = 'default',
  PUBLIC = 'public',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential',
}

/**
 * Event attendee
 */
export interface EventAttendee {
  email: string;
  name?: string;
  responseStatus: AttendeeResponseStatus;
  optional: boolean;
  organizer: boolean;
  self: boolean;
  resource: boolean; // Is this a room/resource?
}

/**
 * Attendee response status
 */
export enum AttendeeResponseStatus {
  NEEDS_ACTION = 'needsAction',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  ACCEPTED = 'accepted',
}

/**
 * Conference/video call data
 */
export interface ConferenceData {
  type: ConferenceType;
  conferenceId?: string;
  conferenceUrl?: string;
  dialIn?: {
    phoneNumber: string;
    pin?: string;
    countryCode?: string;
  };
  entryPoints?: ConferenceEntryPoint[];
}

/**
 * Conference type
 */
export enum ConferenceType {
  GOOGLE_MEET = 'google_meet',
  ZOOM = 'zoom',
  MICROSOFT_TEAMS = 'microsoft_teams',
  PHONE = 'phone',
  OTHER = 'other',
}

/**
 * Conference entry point
 */
export interface ConferenceEntryPoint {
  type: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
}

/**
 * Event reminder
 */
export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

/**
 * Event sync status
 */
export enum EventSyncStatus {
  SYNCED = 'synced',
  PENDING_CREATE = 'pending_create',
  PENDING_UPDATE = 'pending_update',
  PENDING_DELETE = 'pending_delete',
  SYNC_ERROR = 'sync_error',
  CONFLICT = 'conflict',
}

/**
 * Calendar list item (calendars available in user's account)
 */
export interface CalendarListItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  primary: boolean;
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  selected: boolean;
  hidden: boolean;
  timezone?: string;
}

/**
 * Free/busy information
 */
export interface FreeBusyInfo {
  calendarId: string;
  busy: Array<{
    start: Date;
    end: Date;
  }>;
}

/**
 * Request to create a calendar event
 */
export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  timezone?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    optional?: boolean;
  }>;
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  visibility?: EventVisibility;
  conferenceType?: ConferenceType;
  createConference?: boolean;
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  linkedTaskId?: string;
  color?: string;
  calendarId?: string; // If not specified, uses default calendar
}

/**
 * Request to update a calendar event
 */
export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  timezone?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    optional?: boolean;
  }>;
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  visibility?: EventVisibility;
  status?: EventStatus;
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  linkedTaskId?: string;
  color?: string;
  notifyAttendees?: boolean;
}

/**
 * Query options for listing events
 */
export interface ListEventsOptions {
  calendarId?: string;
  startTime?: Date;
  endTime?: Date;
  maxResults?: number;
  pageToken?: string;
  showDeleted?: boolean;
  singleEvents?: boolean; // Expand recurring events
  orderBy?: 'startTime' | 'updated';
  q?: string; // Free text search
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  linkedTaskId?: string;
}

/**
 * Paginated list response
 */
export interface ListEventsResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/**
 * Sync result
 */
export interface CalendarSyncResult {
  success: boolean;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: Array<{
    eventId?: string;
    error: string;
  }>;
  nextSyncToken?: string;
  syncedAt: Date;
}

/**
 * OAuth authorization URL request
 */
export interface CalendarAuthRequest {
  provider: CalendarProvider;
  redirectUri: string;
  state?: string;
  scopes?: string[];
}

/**
 * OAuth callback data
 */
export interface CalendarAuthCallback {
  provider: CalendarProvider;
  code: string;
  state?: string;
  redirectUri: string;
}

/**
 * Webhook notification from calendar provider
 */
export interface CalendarWebhookPayload {
  provider: CalendarProvider;
  resourceId: string;
  resourceUri?: string;
  channelId: string;
  channelToken?: string;
  channelExpiration?: Date;
  messageNumber?: number;
  changeType?: 'created' | 'updated' | 'deleted';
}

/**
 * Calendar provider interface
 * Both Google and Microsoft implementations must implement this
 */
export interface ICalendarProvider {
  readonly provider: CalendarProvider;

  // OAuth
  getAuthorizationUrl(request: CalendarAuthRequest): string;
  exchangeCodeForTokens(callback: CalendarAuthCallback): Promise<CalendarOAuthToken>;
  refreshAccessToken(refreshToken: string): Promise<CalendarOAuthToken>;
  revokeAccess(accessToken: string): Promise<void>;

  // Calendar list
  listCalendars(accessToken: string): Promise<CalendarListItem[]>;

  // Events
  listEvents(accessToken: string, options: ListEventsOptions): Promise<ListEventsResponse>;
  getEvent(accessToken: string, calendarId: string, eventId: string): Promise<CalendarEvent | null>;
  createEvent(accessToken: string, calendarId: string, event: CreateCalendarEventRequest): Promise<CalendarEvent>;
  updateEvent(accessToken: string, calendarId: string, eventId: string, event: UpdateCalendarEventRequest): Promise<CalendarEvent>;
  deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;

  // Free/Busy
  getFreeBusy(accessToken: string, calendarIds: string[], startTime: Date, endTime: Date): Promise<FreeBusyInfo[]>;

  // Sync
  watchCalendar(accessToken: string, calendarId: string, webhookUrl: string, channelId: string): Promise<{ resourceId: string; expiration: Date }>;
  stopWatch(accessToken: string, channelId: string, resourceId: string): Promise<void>;
}

/**
 * Default integration settings
 */
export const DEFAULT_CALENDAR_SETTINGS: CalendarIntegrationSettings = {
  syncDirection: 'two_way',
  autoSyncTasks: true,
  autoSyncMeetings: true,
  syncPastEvents: false,
  syncFutureDays: 90,
  defaultReminderMinutes: 15,
  defaultEventDuration: 30,
  workingHours: {
    enabled: true,
    startHour: 9,
    endHour: 18,
    workDays: [1, 2, 3, 4, 5], // Monday to Friday
    timezone: 'America/Mexico_City',
  },
};
