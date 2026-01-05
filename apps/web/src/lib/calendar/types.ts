/**
 * Calendar Module - Type Definitions
 *
 * Unified types for calendar integration aligned with backend CalendarService.
 * Supports Google Calendar and Microsoft Outlook providers.
 *
 * @module lib/calendar/types
 * @see services/lead-service/src/infrastructure/calendar/types.ts
 */

// ============================================
// Provider & Connection Types
// ============================================

/**
 * Supported calendar providers
 */
export type CalendarProvider = 'google' | 'microsoft';

/**
 * Internal calendar for events without external provider
 */
export type CalendarProviderExtended = CalendarProvider | 'internal';

/**
 * Connection status for calendar integrations
 */
export type CalendarConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'expired'
  | 'error';

/**
 * Sync direction for calendar integration
 */
export type SyncDirection =
  | 'one_way_to_calendar'
  | 'one_way_from_calendar'
  | 'two_way';

// ============================================
// Calendar Integration
// ============================================

/**
 * Working hours configuration
 */
export interface WorkingHours {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  workDays: number[]; // 0=Sunday, 1=Monday, etc.
  timezone: string; // IANA timezone
}

/**
 * Settings for calendar integration
 */
export interface CalendarIntegrationSettings {
  syncDirection: SyncDirection;
  autoSyncTasks: boolean;
  autoSyncMeetings: boolean;
  syncPastEvents: boolean;
  syncFutureDays: number;
  defaultReminderMinutes: number;
  defaultEventDuration: number; // in minutes
  workingHours?: WorkingHours;
}

/**
 * Calendar integration record
 * Represents a connected calendar account (Google or Microsoft)
 */
export interface CalendarIntegration {
  id: string;
  tenantId: string;
  userId: string;
  provider: CalendarProvider;
  providerAccountId: string;
  providerEmail: string;
  defaultCalendarId?: string;
  syncEnabled: boolean;
  lastSyncAt?: string; // ISO date string
  status: CalendarConnectionStatus;
  settings: CalendarIntegrationSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Available provider info for connection UI
 */
export interface CalendarProviderInfo {
  id: CalendarProvider;
  name: string;
  icon: 'google' | 'microsoft';
}

// ============================================
// Event Types
// ============================================

/**
 * Event status
 */
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

/**
 * Event visibility
 */
export type EventVisibility = 'default' | 'public' | 'private' | 'confidential';

/**
 * Event sync status
 */
export type EventSyncStatus =
  | 'synced'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'sync_error'
  | 'conflict';

/**
 * Attendee response status
 */
export type AttendeeResponseStatus =
  | 'needsAction'
  | 'declined'
  | 'tentative'
  | 'accepted';

/**
 * Conference type for video meetings
 */
export type ConferenceType =
  | 'google_meet'
  | 'zoom'
  | 'microsoft_teams'
  | 'phone'
  | 'other';

// ============================================
// Event Recurrence (RFC 5545 RRULE)
// ============================================

/**
 * Recurrence frequency
 */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Week day codes (RFC 5545)
 */
export type WeekDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

/**
 * Event recurrence rule (RFC 5545 RRULE format)
 */
export interface EventRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  count?: number;
  until?: string; // ISO date string
  byDay?: WeekDay[];
  byMonth?: number[];
  byMonthDay?: number[];
  exceptions?: string[]; // ISO date strings to exclude
}

// ============================================
// Attendees & Conference
// ============================================

/**
 * Event attendee
 */
export interface CalendarAttendee {
  email: string;
  name?: string;
  responseStatus: AttendeeResponseStatus;
  optional: boolean;
  organizer: boolean;
  self: boolean;
  resource: boolean; // Is this a room/resource?
}

/**
 * Conference entry point (video, phone, etc.)
 */
export interface ConferenceEntryPoint {
  type: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
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
 * Event reminder
 */
export interface EventReminder {
  method: 'email' | 'popup' | 'sms';
  minutes: number;
}

// ============================================
// Calendar Event
// ============================================

/**
 * Unified calendar event structure
 * Core entity representing an event in the calendar
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
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  allDay: boolean;
  timezone: string; // IANA timezone

  // Recurrence
  recurrence?: EventRecurrence;
  recurringEventId?: string;

  // Status
  status: EventStatus;
  visibility: EventVisibility;

  // Attendees
  organizer?: CalendarAttendee;
  attendees: CalendarAttendee[];

  // Conference/Video call
  conferenceData?: ConferenceData;

  // Reminders
  reminders: EventReminder[];

  // CRM entity linking
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
  lastSyncedAt?: string;
  etag?: string; // For conflict detection

  createdAt: string;
  updatedAt: string;
}

// ============================================
// Free/Busy
// ============================================

/**
 * Time slot representing a busy period
 */
export interface BusySlot {
  start: string; // ISO date string
  end: string; // ISO date string
}

/**
 * Free/busy information for a calendar
 */
export interface FreeBusyInfo {
  calendarId: string;
  busy: BusySlot[];
}

// ============================================
// Calendar List
// ============================================

/**
 * Calendar access role
 */
export type CalendarAccessRole = 'owner' | 'writer' | 'reader' | 'freeBusyReader';

/**
 * Calendar list item (calendars available in user's account)
 */
export interface CalendarListItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  primary: boolean;
  accessRole: CalendarAccessRole;
  selected: boolean;
  hidden: boolean;
  timezone?: string;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Attendee input for creating events
 */
export interface AttendeeInput {
  email: string;
  name?: string;
  optional?: boolean;
}

/**
 * Request to create a calendar event
 */
export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  allDay?: boolean;
  timezone?: string;
  attendees?: AttendeeInput[];
  recurrence?: EventRecurrence;
  reminders?: EventReminder[];
  visibility?: EventVisibility;
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
export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  timezone?: string;
  attendees?: AttendeeInput[];
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
export interface ListEventsParams {
  calendarId?: string;
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
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
 * Paginated events response
 */
export interface ListEventsResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/**
 * Consolidated events response (for /calendar/events)
 */
export interface EventsListResponse {
  items: CalendarEvent[];
  total: number;
}

/**
 * Free/busy query request
 */
export interface FreeBusyRequest {
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  calendarIds?: string[];
}

/**
 * OAuth connect request
 */
export interface ConnectCalendarRequest {
  provider: CalendarProvider;
  redirectUri: string;
}

/**
 * OAuth connect response
 */
export interface ConnectCalendarResponse {
  authUrl: string;
  state: string;
}

/**
 * OAuth callback request
 */
export interface OAuthCallbackRequest {
  provider: CalendarProvider;
  code: string;
  state?: string;
  redirectUri: string;
}

/**
 * Update integration settings request
 */
export interface UpdateSettingsRequest {
  syncDirection?: SyncDirection;
  autoSyncTasks?: boolean;
  autoSyncMeetings?: boolean;
  syncPastEvents?: boolean;
  syncFutureDays?: number;
  defaultReminderMinutes?: number;
  defaultEventDuration?: number;
  workingHours?: WorkingHours;
}

// ============================================
// View State Types (for UI)
// ============================================

/**
 * Calendar view modes
 */
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

/**
 * Calendar view state
 */
export interface CalendarViewState {
  view: CalendarView;
  currentDate: Date;
  selectedEventId?: string;
  filters: CalendarFilters;
}

/**
 * Filters for calendar events
 */
export interface CalendarFilters {
  integrationIds: string[];
  eventTypes: string[];
  linkedEntityType?: 'lead' | 'customer' | 'opportunity' | 'task';
  linkedEntityId?: string;
}

// ============================================
// Default Values
// ============================================

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

/**
 * Default event reminder
 */
export const DEFAULT_EVENT_REMINDER: EventReminder = {
  method: 'popup',
  minutes: 15,
};
