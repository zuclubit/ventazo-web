/**
 * CalendarService Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import {
  CalendarService,
  CalendarProvider,
  EventStatus,
  EventVisibility,
  EventSyncStatus,
  CalendarConnectionStatus,
  ConferenceType,
  GoogleCalendarProvider,
  MicrosoftCalendarProvider,
} from './index';
import type { CalendarEvent, CalendarIntegration, CalendarOAuthToken, ICalendarProvider } from './types';

// Mock DatabasePool
const mockPool = {
  query: vi.fn(),
};

// Create mock provider factory
const createMockProvider = (provider: CalendarProvider): ICalendarProvider => ({
  provider,
  getAuthorizationUrl: vi.fn().mockReturnValue(`https://oauth.${provider}.com/authorize`),
  exchangeCodeForTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeAccess: vi.fn(),
  listCalendars: vi.fn(),
  listEvents: vi.fn(),
  getEvent: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getFreeBusy: vi.fn(),
  watchCalendar: vi.fn(),
  stopWatch: vi.fn(),
});

// Mock Google Calendar Provider
const mockGoogleProvider = createMockProvider(CalendarProvider.GOOGLE);

// Mock Microsoft Calendar Provider
const mockMicrosoftProvider = createMockProvider(CalendarProvider.MICROSOFT);

// Sample data
const sampleToken: CalendarOAuthToken = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
  expiresAt: new Date(Date.now() + 3600000),
  tokenType: 'Bearer',
  scope: 'calendar.read calendar.write',
};

const sampleIntegration: CalendarIntegration = {
  id: 'integration-1',
  tenantId: 'tenant-1',
  userId: 'user-1',
  provider: CalendarProvider.GOOGLE,
  providerAccountId: 'user@gmail.com',
  providerEmail: 'user@gmail.com',
  tokens: sampleToken,
  defaultCalendarId: 'primary',
  syncEnabled: true,
  lastSyncAt: new Date(),
  status: CalendarConnectionStatus.CONNECTED,
  settings: {
    syncDirection: 'two_way',
    autoSyncTasks: true,
    autoSyncMeetings: true,
    syncPastEvents: false,
    syncFutureDays: 90,
    defaultReminderMinutes: 15,
    defaultEventDuration: 30,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const sampleEvent: CalendarEvent = {
  id: 'event-1',
  externalId: 'google-event-123',
  tenantId: 'tenant-1',
  userId: 'user-1',
  integrationId: 'integration-1',
  calendarId: 'primary',
  title: 'Meeting with Client',
  description: 'Discuss project requirements',
  location: 'Conference Room A',
  startTime: new Date('2024-01-15T10:00:00Z'),
  endTime: new Date('2024-01-15T11:00:00Z'),
  allDay: false,
  timezone: 'America/Mexico_City',
  status: EventStatus.CONFIRMED,
  visibility: EventVisibility.DEFAULT,
  organizer: {
    email: 'user@gmail.com',
    name: 'User',
    responseStatus: { toString: () => 'accepted' } as any,
    optional: false,
    organizer: true,
    self: true,
    resource: false,
  },
  attendees: [],
  reminders: [{ method: 'popup', minutes: 15 }],
  tags: [],
  metadata: {},
  syncStatus: EventSyncStatus.SYNCED,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CalendarService', () => {
  let calendarService: CalendarService;

  beforeEach(() => {
    vi.clearAllMocks();
    calendarService = new CalendarService(mockPool as any);

    // Set up providers
    (calendarService as any).providers.set(CalendarProvider.GOOGLE, mockGoogleProvider);
    (calendarService as any).providers.set(CalendarProvider.MICROSOFT, mockMicrosoftProvider);
  });

  describe('getAvailableProviders', () => {
    it('should return configured providers', () => {
      const providers = calendarService.getAvailableProviders();

      expect(providers).toContain(CalendarProvider.GOOGLE);
      expect(providers).toContain(CalendarProvider.MICROSOFT);
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return Google authorization URL', () => {
      (mockGoogleProvider.getAuthorizationUrl as any).mockReturnValue('https://accounts.google.com/oauth/authorize?...');

      const result = calendarService.getAuthorizationUrl(
        CalendarProvider.GOOGLE,
        'http://localhost:3000/callback'
      );

      expect(result).toContain('accounts.google.com');
      expect(mockGoogleProvider.getAuthorizationUrl).toHaveBeenCalledWith({
        provider: CalendarProvider.GOOGLE,
        redirectUri: 'http://localhost:3000/callback',
        state: undefined,
      });
    });

    it('should return Microsoft authorization URL', () => {
      (mockMicrosoftProvider.getAuthorizationUrl as any).mockReturnValue('https://login.microsoftonline.com/oauth2/authorize?...');

      const result = calendarService.getAuthorizationUrl(
        CalendarProvider.MICROSOFT,
        'http://localhost:3000/callback'
      );

      expect(result).toContain('login.microsoftonline.com');
    });
  });

  describe('getUserIntegrations', () => {
    it('should return all integrations for a user', async () => {
      const mockIntegrations = [sampleIntegration];
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: mockIntegrations, rowCount: 1 })
      );

      const result = await calendarService.getUserIntegrations('tenant-1', 'user-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM calendar_integrations'),
        expect.arrayContaining(['tenant-1', 'user-1'])
      );
    });

    it('should return empty array when no integrations found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await calendarService.getUserIntegrations('tenant-1', 'user-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.fail('Database connection error')
      );

      const result = await calendarService.getUserIntegrations('tenant-1', 'user-1');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database');
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration by ID', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );

      const result = await calendarService.getIntegrationById('integration-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(sampleIntegration);
    });

    it('should return null when integration not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await calendarService.getIntegrationById('non-existent-id');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('disconnectCalendar', () => {
    it('should disconnect and revoke access', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.revokeAccess.mockResolvedValue(undefined);
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [{ ...sampleIntegration, isActive: false }], rowCount: 1 })
      );

      const result = await calendarService.disconnectCalendar('integration-1');

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleProvider.revokeAccess).toHaveBeenCalledWith(sampleToken.accessToken);
    });

    it('should fail when integration not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await calendarService.disconnectCalendar('non-existent-id');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('listCalendars', () => {
    it('should list calendars for an integration', async () => {
      const mockCalendars = [
        { id: 'primary', name: 'Primary', primary: true, accessRole: 'owner', selected: true, hidden: false },
        { id: 'work', name: 'Work', primary: false, accessRole: 'writer', selected: true, hidden: false },
      ];
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.listCalendars.mockResolvedValue(mockCalendars);

      const result = await calendarService.listCalendars('integration-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(mockGoogleProvider.listCalendars).toHaveBeenCalledWith(sampleToken.accessToken);
    });

    it('should fail when integration not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await calendarService.listCalendars('non-existent-id');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('listEvents', () => {
    it('should list events from calendar provider', async () => {
      const mockEvents = { events: [sampleEvent], nextPageToken: null };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.listEvents.mockResolvedValue(mockEvents);

      const result = await calendarService.listEvents('integration-1', {
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-31'),
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.events).toHaveLength(1);
    });

    it('should filter events by lead ID', async () => {
      const mockEvents = { events: [sampleEvent], nextPageToken: null };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.listEvents.mockResolvedValue(mockEvents);

      const result = await calendarService.listEvents('integration-1', {
        linkedLeadId: 'lead-123',
      });

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleProvider.listEvents).toHaveBeenCalledWith(
        sampleToken.accessToken,
        expect.objectContaining({ linkedLeadId: 'lead-123' })
      );
    });
  });

  describe('createEvent', () => {
    it('should create event in calendar provider', async () => {
      const eventRequest = {
        title: 'New Meeting',
        startTime: new Date('2024-01-20T14:00:00Z'),
        endTime: new Date('2024-01-20T15:00:00Z'),
        description: 'Team sync',
      };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.createEvent.mockResolvedValue(sampleEvent);
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleEvent], rowCount: 1 })
      );

      const result = await calendarService.createEvent('integration-1', eventRequest);

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleProvider.createEvent).toHaveBeenCalledWith(
        sampleToken.accessToken,
        'primary',
        eventRequest
      );
    });

    it('should create event with conference link', async () => {
      const eventRequest = {
        title: 'Video Call',
        startTime: new Date('2024-01-20T14:00:00Z'),
        endTime: new Date('2024-01-20T15:00:00Z'),
        createConference: true,
      };
      const eventWithConference = {
        ...sampleEvent,
        conferenceData: {
          type: ConferenceType.GOOGLE_MEET,
          conferenceUrl: 'https://meet.google.com/abc-defg-hij',
        },
      };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.createEvent.mockResolvedValue(eventWithConference);
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [eventWithConference], rowCount: 1 })
      );

      const result = await calendarService.createEvent('integration-1', eventRequest);

      expect(result.isSuccess).toBe(true);
      expect(result.value?.conferenceData).toBeDefined();
    });

    it('should link event to lead', async () => {
      const eventRequest = {
        title: 'Client Call',
        startTime: new Date('2024-01-20T14:00:00Z'),
        endTime: new Date('2024-01-20T15:00:00Z'),
        linkedLeadId: 'lead-123',
      };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.createEvent.mockResolvedValue({
        ...sampleEvent,
        linkedLeadId: 'lead-123',
      });
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleEvent], rowCount: 1 })
      );

      const result = await calendarService.createEvent('integration-1', eventRequest);

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleProvider.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ linkedLeadId: 'lead-123' })
      );
    });
  });

  describe('updateEvent', () => {
    it('should update event in calendar provider', async () => {
      const updateRequest = {
        title: 'Updated Meeting Title',
        description: 'Updated description',
      };
      const updatedEvent = { ...sampleEvent, ...updateRequest };
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.updateEvent.mockResolvedValue(updatedEvent);
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [updatedEvent], rowCount: 1 })
      );

      const result = await calendarService.updateEvent(
        'integration-1',
        'event-1',
        updateRequest,
        'primary'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value?.title).toBe('Updated Meeting Title');
    });

    it('should handle event not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.updateEvent.mockRejectedValue(new Error('Event not found'));

      const result = await calendarService.updateEvent(
        'integration-1',
        'non-existent-event',
        { title: 'New Title' },
        'primary'
      );

      expect(result.isFailure).toBe(true);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event from calendar provider', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.deleteEvent.mockResolvedValue(undefined);
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rowCount: 1 })
      );

      const result = await calendarService.deleteEvent('integration-1', 'event-1', 'primary');

      expect(result.isSuccess).toBe(true);
      expect(mockGoogleProvider.deleteEvent).toHaveBeenCalledWith(
        sampleToken.accessToken,
        'primary',
        'event-1'
      );
    });
  });

  describe('getFreeBusy', () => {
    it('should return free/busy information', async () => {
      const mockFreeBusy = [
        {
          calendarId: 'primary',
          busy: [
            { start: new Date('2024-01-15T10:00:00Z'), end: new Date('2024-01-15T11:00:00Z') },
          ],
        },
      ];
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.getFreeBusy.mockResolvedValue(mockFreeBusy);

      const result = await calendarService.getFreeBusy(
        'integration-1',
        ['primary'],
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-16T00:00:00Z')
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value?.[0].busy).toHaveLength(1);
    });
  });

  
  describe('getUpcomingEvents', () => {
    it('should return upcoming events for user', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockGoogleProvider.listEvents.mockResolvedValue({
        events: [sampleEvent],
        nextPageToken: null,
      });

      const result = await calendarService.getUpcomingEvents('tenant-1', 'user-1', 7);

      expect(result.isSuccess).toBe(true);
    });
  });

  describe('getEventsForLead', () => {
    it('should return events linked to a lead', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [{ ...sampleEvent, linkedLeadId: 'lead-123' }],
          rowCount: 1,
        })
      );

      const result = await calendarService.getEventsForLead('tenant-1', 'lead-123');

      expect(result.isSuccess).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('lead_id'),
        expect.arrayContaining(['lead-123'])
      );
    });
  });

  describe('getEventsForCustomer', () => {
    it('should return events linked to a customer', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [sampleIntegration], rowCount: 1 })
      );
      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [{ ...sampleEvent, linkedCustomerId: 'customer-456' }],
          rowCount: 1,
        })
      );

      const result = await calendarService.getEventsForCustomer('tenant-1', 'customer-456');

      expect(result.isSuccess).toBe(true);
    });
  });
});

describe('CalendarProvider enums', () => {
  it('should have correct Google provider value', () => {
    expect(CalendarProvider.GOOGLE).toBe('google');
  });

  it('should have correct Microsoft provider value', () => {
    expect(CalendarProvider.MICROSOFT).toBe('microsoft');
  });
});

describe('EventStatus enum', () => {
  it('should have correct status values', () => {
    expect(EventStatus.CONFIRMED).toBe('confirmed');
    expect(EventStatus.TENTATIVE).toBe('tentative');
    expect(EventStatus.CANCELLED).toBe('cancelled');
  });
});

describe('EventVisibility enum', () => {
  it('should have correct visibility values', () => {
    expect(EventVisibility.DEFAULT).toBe('default');
    expect(EventVisibility.PUBLIC).toBe('public');
    expect(EventVisibility.PRIVATE).toBe('private');
    expect(EventVisibility.CONFIDENTIAL).toBe('confidential');
  });
});

describe('EventSyncStatus enum', () => {
  it('should have correct sync status values', () => {
    expect(EventSyncStatus.SYNCED).toBe('synced');
    expect(EventSyncStatus.PENDING_CREATE).toBe('pending_create');
    expect(EventSyncStatus.PENDING_UPDATE).toBe('pending_update');
    expect(EventSyncStatus.PENDING_DELETE).toBe('pending_delete');
    expect(EventSyncStatus.SYNC_ERROR).toBe('sync_error');
    expect(EventSyncStatus.CONFLICT).toBe('conflict');
  });
});

describe('ConferenceType enum', () => {
  it('should have correct conference type values', () => {
    expect(ConferenceType.GOOGLE_MEET).toBe('google_meet');
    expect(ConferenceType.ZOOM).toBe('zoom');
    expect(ConferenceType.MICROSOFT_TEAMS).toBe('microsoft_teams');
  });
});
