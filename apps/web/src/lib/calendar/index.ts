/**
 * Calendar Module - Barrel Export
 *
 * @module lib/calendar
 */

// Types
export * from './types';

// API Client
export { calendarApi, getDateRangeForView } from './api';

// Hooks
export {
  // Query Keys
  calendarKeys,
  // Provider & Integration Hooks
  useCalendarProviders,
  useCalendarIntegrations,
  useCalendarIntegration,
  useConnectCalendar,
  useDisconnectCalendar,
  useUpdateIntegrationSettings,
  // Calendar List Hooks
  useCalendars,
  useCalendarsForIntegration,
  // Event Hooks
  useCalendarEvents,
  useUpcomingEvents,
  useEventsForIntegration,
  useCalendarEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  // CRM-Linked Hooks
  useEventsForLead,
  useEventsForCustomer,
  // Free/Busy Hooks
  useFreeBusy,
  // Utility Hooks
  useHasConnectedCalendar,
  usePrimaryIntegration,
  // Real-time & Optimistic Update Hooks
  useRealtimeCalendarEvents,
  useCreateEventOptimistic,
  useUpdateEventOptimistic,
  useDeleteEventOptimistic,
  // Sync State Types
  type CalendarSyncState,
  type SyncStatus,
} from './hooks';
