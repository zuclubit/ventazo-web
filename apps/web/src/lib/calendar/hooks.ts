'use client';

/**
 * Calendar Module - React Hooks
 *
 * React Query hooks for calendar operations.
 * Provides data fetching, caching, mutations, and real-time updates.
 *
 * @module lib/calendar/hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useTenantValidation } from '@/lib/tenant';

import { calendarApi } from './api';
import type {
  CalendarEvent,
  CalendarIntegration,
  CalendarProvider,
  CreateEventRequest,
  FreeBusyRequest,
  ListEventsParams,
  UpdateEventRequest,
  UpdateSettingsRequest,
} from './types';

// ============================================
// Real-Time Sync Types
// ============================================

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface CalendarSyncState {
  status: SyncStatus;
  lastSyncedAt: Date | null;
  error: string | null;
  pendingChanges: number;
}

// ============================================
// Query Keys Factory
// ============================================

export const calendarKeys = {
  all: ['calendar'] as const,

  // Providers
  providers: () => [...calendarKeys.all, 'providers'] as const,

  // Integrations
  integrations: () => [...calendarKeys.all, 'integrations'] as const,
  integration: (id: string) => [...calendarKeys.integrations(), id] as const,

  // Calendars
  calendars: () => [...calendarKeys.all, 'calendars'] as const,
  calendarsForIntegration: (integrationId: string) =>
    [...calendarKeys.calendars(), 'integration', integrationId] as const,

  // Events
  events: () => [...calendarKeys.all, 'events'] as const,
  eventsList: (params?: { days?: number; limit?: number }) =>
    [...calendarKeys.events(), 'list', params ?? {}] as const,
  eventsUpcoming: (days?: number) =>
    [...calendarKeys.events(), 'upcoming', days ?? 7] as const,
  eventsForIntegration: (integrationId: string, params?: ListEventsParams) =>
    [...calendarKeys.events(), 'integration', integrationId, params ?? {}] as const,
  event: (integrationId: string, eventId: string) =>
    [...calendarKeys.events(), 'detail', integrationId, eventId] as const,

  // CRM-Linked Events
  eventsForLead: (leadId: string) =>
    [...calendarKeys.events(), 'lead', leadId] as const,
  eventsForCustomer: (customerId: string) =>
    [...calendarKeys.events(), 'customer', customerId] as const,

  // Free/Busy
  freeBusy: (integrationId: string) =>
    [...calendarKeys.all, 'freeBusy', integrationId] as const,
} as const;

// ============================================
// Provider & Integration Hooks
// ============================================

/**
 * Hook to get available calendar providers
 */
export function useCalendarProviders() {
  return useQuery({
    queryKey: calendarKeys.providers(),
    queryFn: () => calendarApi.getProviders(),
    staleTime: 1000 * 60 * 60, // 1 hour - providers rarely change
  });
}

/**
 * Hook to get user's calendar integrations
 */
export function useCalendarIntegrations() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.integrations(),
    queryFn: () => calendarApi.getIntegrations(),
    enabled: isValid && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get a specific integration
 */
export function useCalendarIntegration(integrationId: string | undefined) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.integration(integrationId ?? ''),
    queryFn: () => calendarApi.getIntegrationById(integrationId!),
    enabled: isValid && !!tenantId && !!integrationId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to connect a new calendar integration
 */
export function useConnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      provider,
      redirectUri,
    }: {
      provider: CalendarProvider;
      redirectUri: string;
    }) => {
      return calendarApi.connectIntegration({ provider, redirectUri });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.integrations() });
    },
  });
}

/**
 * Hook to disconnect a calendar integration
 */
export function useDisconnectCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (integrationId: string) =>
      calendarApi.disconnectIntegration(integrationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.integrations() });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.calendars() });
    },
  });
}

/**
 * Hook to update integration settings
 */
export function useUpdateIntegrationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      settings,
    }: {
      integrationId: string;
      settings: UpdateSettingsRequest;
    }) => calendarApi.updateIntegrationSettings(integrationId, settings),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.integration(variables.integrationId),
      });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.integrations() });
    },
  });
}

// ============================================
// Calendar List Hooks
// ============================================

/**
 * Hook to get all user's calendars
 */
export function useCalendars() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.calendars(),
    queryFn: () => calendarApi.getCalendars(),
    enabled: isValid && !!tenantId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to get calendars for a specific integration
 */
export function useCalendarsForIntegration(integrationId: string | undefined) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.calendarsForIntegration(integrationId ?? ''),
    queryFn: () => calendarApi.getCalendarsForIntegration(integrationId!),
    enabled: isValid && !!tenantId && !!integrationId,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================
// Event Hooks
// ============================================

/**
 * Hook to get calendar events (consolidated view)
 */
export function useCalendarEvents(options?: { days?: number; limit?: number }) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.eventsList(options),
    queryFn: () => calendarApi.getEvents(options),
    enabled: isValid && !!tenantId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to get upcoming events
 */
export function useUpcomingEvents(days: number = 7) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.eventsUpcoming(days),
    queryFn: () => calendarApi.getUpcomingEvents(days),
    enabled: isValid && !!tenantId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to get events for a specific integration
 */
export function useEventsForIntegration(
  integrationId: string | undefined,
  params?: ListEventsParams
) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.eventsForIntegration(integrationId ?? '', params),
    queryFn: () => calendarApi.getEventsForIntegration(integrationId!, params),
    enabled: isValid && !!tenantId && !!integrationId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to get a single event
 */
export function useCalendarEvent(
  integrationId: string | undefined,
  eventId: string | undefined,
  calendarId?: string
) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.event(integrationId ?? '', eventId ?? ''),
    queryFn: () => calendarApi.getEventById(integrationId!, eventId!, calendarId),
    enabled: isValid && !!tenantId && !!integrationId && !!eventId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: CreateEventRequest;
    }) => calendarApi.createEvent(integrationId, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsForIntegration(variables.integrationId),
      });
    },
  });
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      eventId,
      data,
      calendarId,
    }: {
      integrationId: string;
      eventId: string;
      data: UpdateEventRequest;
      calendarId?: string;
    }) => calendarApi.updateEvent(integrationId, eventId, data, calendarId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.integrationId, variables.eventId),
      });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsForIntegration(variables.integrationId),
      });
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      eventId,
      calendarId,
    }: {
      integrationId: string;
      eventId: string;
      calendarId?: string;
    }) => calendarApi.deleteEvent(integrationId, eventId, calendarId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.eventsForIntegration(variables.integrationId),
      });
      // Remove the event from cache
      queryClient.removeQueries({
        queryKey: calendarKeys.event(variables.integrationId, variables.eventId),
      });
    },
  });
}

// ============================================
// CRM-Linked Event Hooks
// ============================================

/**
 * Hook to get events linked to a lead
 */
export function useEventsForLead(leadId: string | undefined) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.eventsForLead(leadId ?? ''),
    queryFn: () => calendarApi.getEventsForLead(leadId!),
    enabled: isValid && !!tenantId && !!leadId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook to get events linked to a customer
 */
export function useEventsForCustomer(customerId: string | undefined) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.eventsForCustomer(customerId ?? ''),
    queryFn: () => calendarApi.getEventsForCustomer(customerId!),
    enabled: isValid && !!tenantId && !!customerId,
    staleTime: 1000 * 60 * 2,
  });
}

// ============================================
// Free/Busy Hooks
// ============================================

/**
 * Hook to get free/busy information
 */
export function useFreeBusy(
  integrationId: string | undefined,
  request: FreeBusyRequest | undefined
) {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: calendarKeys.freeBusy(integrationId ?? ''),
    queryFn: () => calendarApi.getFreeBusy(integrationId!, request!),
    enabled: isValid && !!tenantId && !!integrationId && !!request,
    staleTime: 1000 * 60 * 1, // 1 minute - free/busy changes frequently
  });
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to check if user has any connected calendars
 */
export function useHasConnectedCalendar() {
  const { data: integrations, isLoading } = useCalendarIntegrations();

  return {
    hasConnectedCalendar:
      integrations?.some((i) => i.status === 'connected') ?? false,
    isLoading,
    connectedCount: integrations?.filter((i) => i.status === 'connected').length ?? 0,
  };
}

/**
 * Hook to get the primary/default integration
 */
export function usePrimaryIntegration() {
  const { data: integrations, isLoading, error } = useCalendarIntegrations();

  const primaryIntegration = integrations?.find(
    (i) => i.status === 'connected'
  );

  return {
    integration: primaryIntegration,
    isLoading,
    error,
    hasIntegration: !!primaryIntegration,
  };
}

// ============================================
// Real-Time Calendar Hook with Optimistic Updates
// ============================================

/**
 * Hook for real-time calendar events with optimistic updates
 * Provides smooth UX with background sync and visual feedback
 */
export function useRealtimeCalendarEvents(options?: {
  days?: number;
  limit?: number;
  refetchInterval?: number;
}) {
  const { isValid, tenantId } = useTenantValidation();
  const queryClient = useQueryClient();
  const [syncState, setSyncState] = useState<CalendarSyncState>({
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
  });
  const refetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Base query for calendar events
  const query = useQuery({
    queryKey: calendarKeys.eventsList(options),
    queryFn: async () => {
      setSyncState((prev) => ({ ...prev, status: 'syncing' }));
      try {
        const result = await calendarApi.getEvents(options);
        setSyncState({
          status: 'synced',
          lastSyncedAt: new Date(),
          error: null,
          pendingChanges: 0,
        });
        return result;
      } catch (error) {
        setSyncState((prev) => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
        throw error;
      }
    },
    enabled: isValid && !!tenantId,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Auto-refetch interval for real-time updates
  useEffect(() => {
    if (!isValid || !tenantId) return;

    const interval = options?.refetchInterval ?? 30000; // Default 30 seconds

    refetchTimerRef.current = setInterval(() => {
      void query.refetch();
    }, interval);

    return () => {
      if (refetchTimerRef.current) {
        clearInterval(refetchTimerRef.current);
      }
    };
  }, [isValid, tenantId, options?.refetchInterval, query]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    setSyncState((prev) => ({ ...prev, status: 'syncing' }));
    await query.refetch();
  }, [query]);

  // Optimistic add event
  const optimisticAddEvent = useCallback(
    (event: CalendarEvent) => {
      queryClient.setQueryData(
        calendarKeys.eventsList(options),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return { items: [event], total: 1 };
          return {
            items: [...old.items, event],
            total: old.total + 1,
          };
        }
      );
      setSyncState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges + 1,
      }));
    },
    [queryClient, options]
  );

  // Optimistic update event
  const optimisticUpdateEvent = useCallback(
    (eventId: string, updates: Partial<CalendarEvent>) => {
      queryClient.setQueryData(
        calendarKeys.eventsList(options),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((e) =>
              e.id === eventId ? { ...e, ...updates } : e
            ),
          };
        }
      );
      setSyncState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges + 1,
      }));
    },
    [queryClient, options]
  );

  // Optimistic remove event
  const optimisticRemoveEvent = useCallback(
    (eventId: string) => {
      queryClient.setQueryData(
        calendarKeys.eventsList(options),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            items: old.items.filter((e) => e.id !== eventId),
            total: old.total - 1,
          };
        }
      );
      setSyncState((prev) => ({
        ...prev,
        pendingChanges: prev.pendingChanges + 1,
      }));
    },
    [queryClient, options]
  );

  // Rollback optimistic update
  const rollback = useCallback(() => {
    void query.refetch();
    setSyncState((prev) => ({
      ...prev,
      pendingChanges: 0,
    }));
  }, [query]);

  return {
    ...query,
    syncState,
    syncNow,
    optimisticAddEvent,
    optimisticUpdateEvent,
    optimisticRemoveEvent,
    rollback,
  };
}

/**
 * Hook for creating events with optimistic updates
 */
export function useCreateEventOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      data,
    }: {
      integrationId: string;
      data: CreateEventRequest;
    }) => calendarApi.createEvent(integrationId, data),

    onMutate: async ({ data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: calendarKeys.events() });

      // Snapshot current state
      const previousEvents = queryClient.getQueryData(calendarKeys.eventsList({}));

      // Optimistically add the event
      const optimisticEvent: Partial<CalendarEvent> = {
        id: `temp-${Date.now()}`,
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay,
        status: 'confirmed',
        visibility: 'default',
      };

      queryClient.setQueryData(
        calendarKeys.eventsList({}),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return { items: [optimisticEvent as CalendarEvent], total: 1 };
          return {
            items: [...old.items, optimisticEvent as CalendarEvent],
            total: old.total + 1,
          };
        }
      );

      return { previousEvents };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousEvents) {
        queryClient.setQueryData(calendarKeys.eventsList({}), context.previousEvents);
      }
    },

    onSettled: () => {
      // Refetch to sync with server
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
}

/**
 * Hook for updating events with optimistic updates
 */
export function useUpdateEventOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      eventId,
      data,
      calendarId,
    }: {
      integrationId: string;
      eventId: string;
      data: UpdateEventRequest;
      calendarId?: string;
    }) => calendarApi.updateEvent(integrationId, eventId, data, calendarId),

    onMutate: async ({ eventId, data }) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.events() });

      const previousEvents = queryClient.getQueryData(calendarKeys.eventsList({}));

      // Optimistically update
      queryClient.setQueryData(
        calendarKeys.eventsList({}),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((event) =>
              event.id === eventId
                ? {
                    ...event,
                    ...data,
                    startTime: data.startTime ?? event.startTime,
                    endTime: data.endTime ?? event.endTime,
                  }
                : event
            ),
          };
        }
      );

      return { previousEvents };
    },

    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(calendarKeys.eventsList({}), context.previousEvents);
      }
    },

    onSettled: (_, __, variables) => {
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.integrationId, variables.eventId),
      });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
}

/**
 * Hook for deleting events with optimistic updates
 */
export function useDeleteEventOptimistic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      integrationId,
      eventId,
      calendarId,
    }: {
      integrationId: string;
      eventId: string;
      calendarId?: string;
    }) => calendarApi.deleteEvent(integrationId, eventId, calendarId),

    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: calendarKeys.events() });

      const previousEvents = queryClient.getQueryData(calendarKeys.eventsList({}));

      // Optimistically remove
      queryClient.setQueryData(
        calendarKeys.eventsList({}),
        (old: { items: CalendarEvent[]; total: number } | undefined) => {
          if (!old) return old;
          return {
            items: old.items.filter((event) => event.id !== eventId),
            total: old.total - 1,
          };
        }
      );

      return { previousEvents };
    },

    onError: (err, variables, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(calendarKeys.eventsList({}), context.previousEvents);
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
    },
  });
}

/**
 * Hook for calendar sync status
 */
export function useCalendarSyncStatus() {
  const [syncState, setSyncState] = useState<CalendarSyncState>({
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
  });

  const { data: integrations } = useCalendarIntegrations();

  useEffect(() => {
    if (integrations && integrations.length > 0) {
      const connectedIntegration = integrations.find((i) => i.status === 'connected');
      if (connectedIntegration?.lastSyncAt) {
        setSyncState((prev) => ({
          ...prev,
          lastSyncedAt: new Date(connectedIntegration.lastSyncAt!),
          status: 'synced',
        }));
      }
    }
  }, [integrations]);

  return syncState;
}

// ============================================
// Re-export types for convenience
// ============================================

export type { CalendarEvent, CalendarIntegration };
