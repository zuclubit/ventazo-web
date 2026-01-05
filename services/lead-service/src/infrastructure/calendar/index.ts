/**
 * Calendar Integration Module
 * Exports for Google Calendar and Microsoft Outlook calendar integration
 */

// Types
export * from './types';

// Providers
export { GoogleCalendarProvider, type GoogleCalendarConfig } from './google-calendar.provider';
export { MicrosoftCalendarProvider, type MicrosoftCalendarConfig } from './microsoft-calendar.provider';

// Service
export { CalendarService, getCalendarConfig, type CalendarServiceConfig } from './calendar.service';
