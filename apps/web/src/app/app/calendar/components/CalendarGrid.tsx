'use client';

/**
 * CalendarGrid Component - Sprint 5
 *
 * Main calendar view using FullCalendar.
 * Supports month, week, and day views with event rendering.
 * Enhanced with Drag & Drop support for event repositioning.
 *
 * @module app/calendar/components/CalendarGrid
 */

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type {
  EventClickArg,
  DateSelectArg,
  DatesSetArg,
  EventDropArg,
} from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import type { CalendarApi } from '@fullcalendar/core';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import {
  useRealtimeCalendarEvents,
  useUpdateEventOptimistic,
  type CalendarEvent,
  type UpdateEventRequest,
  type CalendarSyncState,
} from '@/lib/calendar';

// ============================================
// Types
// ============================================

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

export interface CalendarGridRef {
  getApi: () => CalendarApi | null;
  changeView: (view: CalendarViewType) => void;
  today: () => void;
  prev: () => void;
  next: () => void;
  getDate: () => Date;
}

export interface CalendarGridProps {
  onEventClick?: (event: CalendarEvent) => void;
  onDateSelect?: (start: Date, end: Date, allDay: boolean) => void;
  onDatesChange?: (start: Date, end: Date) => void;
  onEventUpdated?: () => void;
  onSyncStateChange?: (syncState: CalendarSyncState) => void;
  initialView?: CalendarViewType;
  height?: string | number;
  editable?: boolean;
  /** Auto-refetch interval in milliseconds (default: 30000) */
  refetchInterval?: number;
}

// ============================================
// Event Color Mapping
// ============================================

function getEventColor(event: CalendarEvent): string {
  // Color based on linked entity or status - using CSS variables with fallbacks
  if (event.linkedLeadId) return 'var(--cal-event-lead, #8B5CF6)';
  if (event.linkedCustomerId) return 'var(--cal-event-customer, #10B981)';
  if (event.linkedOpportunityId) return 'var(--cal-event-opportunity, #F59E0B)';
  if (event.linkedTaskId) return 'var(--cal-event-task, #3B82F6)';

  // Color based on status
  switch (event.status) {
    case 'confirmed':
      return 'var(--cal-event-confirmed, #6366F1)';
    case 'tentative':
      return 'var(--cal-event-tentative, #94A3B8)';
    case 'cancelled':
      return 'var(--cal-event-cancelled, #EF4444)';
    default:
      return 'var(--cal-event-confirmed, #6366F1)';
  }
}

// ============================================
// Transform CalendarEvent to FullCalendar format
// ============================================

function transformToFullCalendarEvent(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    allDay: event.allDay,
    backgroundColor: getEventColor(event),
    borderColor: getEventColor(event),
    extendedProps: {
      originalEvent: event,
      description: event.description,
      location: event.location,
      status: event.status,
      linkedLeadId: event.linkedLeadId,
      linkedCustomerId: event.linkedCustomerId,
      linkedOpportunityId: event.linkedOpportunityId,
      linkedTaskId: event.linkedTaskId,
    },
  };
}

// ============================================
// Loading Skeleton - Responsive Multi-Device
// ============================================

function CalendarSkeleton() {
  return (
    <div className="h-full w-full flex flex-col space-y-3 sm:space-y-4 p-2 sm:p-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between flex-shrink-0">
        <Skeleton className="h-6 w-32 sm:h-8 sm:w-48" />
        <Skeleton className="h-6 w-20 sm:h-8 sm:w-32" />
      </div>

      {/* Day headers - responsive columns */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 flex-shrink-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-5 sm:h-6 w-full rounded-sm" />
        ))}
      </div>

      {/* Calendar grid - adaptive rows with proper height distribution */}
      <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-5 gap-0.5 sm:gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-full min-h-[3rem] sm:min-h-[4rem] lg:min-h-[5rem] w-full rounded-sm sm:rounded-md"
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// CalendarGrid Component
// ============================================

export const CalendarGrid = React.forwardRef<CalendarGridRef, CalendarGridProps>(
  function CalendarGrid(
    {
      onEventClick,
      onDateSelect,
      onDatesChange,
      onEventUpdated,
      onSyncStateChange,
      initialView = 'dayGridMonth',
      height = 'auto',
      editable = true,
      refetchInterval = 30000,
    },
    ref
  ) {
    const calendarRef = React.useRef<FullCalendar>(null);
    const [dateRange, setDateRange] = React.useState<{ start: Date; end: Date } | null>(null);
    const { toast } = useToast();
    const updateEvent = useUpdateEventOptimistic();

    // Use real-time events hook with auto-refetch and optimistic updates
    const {
      data: eventsData,
      isLoading,
      error,
      refetch,
      syncState,
      optimisticUpdateEvent,
    } = useRealtimeCalendarEvents({
      days: 90,
      refetchInterval,
    });

    // Notify parent of sync state changes
    React.useEffect(() => {
      onSyncStateChange?.(syncState);
    }, [syncState, onSyncStateChange]);

    // Transform events for FullCalendar
    const fullCalendarEvents = React.useMemo(() => {
      if (!eventsData?.items) return [];
      return eventsData.items.map(transformToFullCalendarEvent);
    }, [eventsData?.items]);

    // Expose API methods via ref
    React.useImperativeHandle(ref, () => ({
      getApi: () => calendarRef.current?.getApi() ?? null,
      changeView: (view: CalendarViewType) => {
        calendarRef.current?.getApi()?.changeView(view);
      },
      today: () => {
        calendarRef.current?.getApi()?.today();
      },
      prev: () => {
        calendarRef.current?.getApi()?.prev();
      },
      next: () => {
        calendarRef.current?.getApi()?.next();
      },
      getDate: () => {
        return calendarRef.current?.getApi()?.getDate() ?? new Date();
      },
    }));

    // Handle event click
    const handleEventClick = React.useCallback(
      (clickInfo: EventClickArg) => {
        const originalEvent = clickInfo.event.extendedProps['originalEvent'] as CalendarEvent;
        onEventClick?.(originalEvent);
      },
      [onEventClick]
    );

    // Handle date selection (for creating new events)
    const handleDateSelect = React.useCallback(
      (selectInfo: DateSelectArg) => {
        onDateSelect?.(selectInfo.start, selectInfo.end, selectInfo.allDay);
        // Clear selection after handling
        calendarRef.current?.getApi()?.unselect();
      },
      [onDateSelect]
    );

    // Handle dates change (navigation)
    const handleDatesSet = React.useCallback(
      (dateInfo: DatesSetArg) => {
        setDateRange({ start: dateInfo.start, end: dateInfo.end });
        onDatesChange?.(dateInfo.start, dateInfo.end);
      },
      [onDatesChange]
    );

    // Handle event drop (drag & drop repositioning) with optimistic update
    const handleEventDrop = React.useCallback(
      async (dropInfo: EventDropArg) => {
        const originalEvent = dropInfo.event.extendedProps['originalEvent'] as CalendarEvent;
        const newStart = dropInfo.event.start;
        const newEnd = dropInfo.event.end;

        if (!newStart || !originalEvent) {
          dropInfo.revert();
          return;
        }

        const newStartTime = newStart.toISOString();
        const newEndTime = (newEnd ?? new Date(newStart.getTime() + 60 * 60 * 1000)).toISOString();
        const newAllDay = dropInfo.event.allDay;

        const updateData: UpdateEventRequest = {
          startTime: newStartTime,
          endTime: newEndTime,
          allDay: newAllDay,
        };

        // Apply optimistic update immediately for smooth UX
        const updatedEvent: CalendarEvent = {
          ...originalEvent,
          startTime: newStartTime,
          endTime: newEndTime,
          allDay: newAllDay,
        };
        optimisticUpdateEvent(originalEvent.id, updatedEvent);

        try {
          await updateEvent.mutateAsync({
            integrationId: originalEvent.integrationId,
            eventId: originalEvent.id,
            calendarId: originalEvent.calendarId,
            data: updateData,
          });

          toast({
            title: 'Evento actualizado',
            description: 'El evento se ha movido correctamente.',
          });

          onEventUpdated?.();
        } catch (err) {
          console.error('Error updating event:', err);
          // Revert both FullCalendar and optimistic update
          dropInfo.revert();
          void refetch(); // Refetch to restore original data
          toast({
            title: 'Error al mover evento',
            description: 'No se pudo actualizar el evento. Se ha revertido el cambio.',
            variant: 'destructive',
          });
        }
      },
      [updateEvent, toast, onEventUpdated, refetch, optimisticUpdateEvent]
    );

    // Handle event resize (change duration) with optimistic update
    const handleEventResize = React.useCallback(
      async (resizeInfo: EventResizeDoneArg) => {
        const originalEvent = resizeInfo.event.extendedProps['originalEvent'] as CalendarEvent;
        const newStart = resizeInfo.event.start;
        const newEnd = resizeInfo.event.end;

        if (!newStart || !newEnd || !originalEvent) {
          resizeInfo.revert();
          return;
        }

        // Extract values with proper types
        const newStartTime = newStart.toISOString();
        const newEndTime = newEnd.toISOString();
        const newAllDay = resizeInfo.event.allDay;

        const updateData: UpdateEventRequest = {
          startTime: newStartTime,
          endTime: newEndTime,
          allDay: newAllDay,
        };

        // Apply optimistic update immediately for smooth UX
        const updatedEvent: CalendarEvent = {
          ...originalEvent,
          startTime: newStartTime,
          endTime: newEndTime,
          allDay: newAllDay,
        };
        optimisticUpdateEvent(originalEvent.id, updatedEvent);

        try {
          await updateEvent.mutateAsync({
            integrationId: originalEvent.integrationId,
            eventId: originalEvent.id,
            calendarId: originalEvent.calendarId,
            data: updateData,
          });

          toast({
            title: 'Evento actualizado',
            description: 'La duración del evento se ha modificado correctamente.',
          });

          onEventUpdated?.();
        } catch (err) {
          console.error('Error resizing event:', err);
          // Revert both FullCalendar and optimistic update
          resizeInfo.revert();
          void refetch(); // Refetch to restore original data
          toast({
            title: 'Error al redimensionar evento',
            description: 'No se pudo actualizar la duración. Se ha revertido el cambio.',
            variant: 'destructive',
          });
        }
      },
      [updateEvent, toast, onEventUpdated, refetch, optimisticUpdateEvent]
    );

    // Show loading state with proper skeleton (prevents CLS)
    if (isLoading && !eventsData) {
      return <CalendarSkeleton />;
    }

    // Show error state
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los eventos. {String(error)}
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="calendar-grid-wrapper h-full w-full">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={initialView}
          headerToolbar={false} // We use custom toolbar
          events={fullCalendarEvents}
          height="100%"
          // Locale & Time
          locale="es"
          timeZone="local"
          firstDay={1} // Monday
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          // Interaction
          selectable={true}
          selectMirror={true}
          editable={editable}
          eventStartEditable={editable}
          eventDurationEditable={editable}
          eventClick={handleEventClick}
          select={handleDateSelect}
          datesSet={handleDatesSet}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          // Display
          nowIndicator={true}
          dayMaxEvents={3}
          weekends={true}
          expandRows={true}
          stickyHeaderDates={true}
          // Week view settings
          allDaySlot={true}
          slotEventOverlap={false}
          // Styling
          eventDisplay="block"
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          dayHeaderFormat={{
            weekday: 'short',
            day: 'numeric',
          }}
          // Loading indicator
          loading={(isLoading) => {
            // Could show loading indicator here
          }}
        />

        {/* FullCalendar Custom Styles - Responsive & Touch-Optimized */}
        <style jsx global>{`
          .calendar-grid-wrapper {
            /* Ensure wrapper fills container */
            display: flex;
            flex-direction: column;

            /* FullCalendar uses these CSS variables - map to our dynamic calendar theme */
            --fc-border-color: var(--calendar-surface-border, hsl(var(--border)));
            --fc-button-bg-color: var(--calendar-btn-primary-bg, var(--tenant-primary));
            --fc-button-border-color: var(--calendar-btn-primary-bg, var(--tenant-primary));
            --fc-button-hover-bg-color: var(--calendar-btn-primary-hover, var(--tenant-primary-hover));
            --fc-button-hover-border-color: var(--calendar-btn-primary-hover, var(--tenant-primary-hover));
            --fc-button-active-bg-color: var(--calendar-btn-primary-hover, var(--tenant-primary-hover));
            --fc-button-active-border-color: var(--calendar-btn-primary-hover, var(--tenant-primary-hover));
            --fc-today-bg-color: var(--calendar-today-bg, var(--tenant-primary-lighter));
            --fc-neutral-bg-color: var(--calendar-surface-light);
            --fc-page-bg-color: var(--calendar-bg, transparent);
            --fc-event-border-color: transparent;
          }

          .calendar-grid-wrapper .fc {
            flex: 1;
            min-height: 0;
          }

          .fc {
            font-family: inherit;
            background-color: var(--calendar-bg);
          }

          .fc-theme-standard td,
          .fc-theme-standard th {
            border-color: var(--calendar-surface-border);
          }

          .fc-theme-standard .fc-scrollgrid {
            border-color: var(--calendar-border);
          }

          .fc .fc-daygrid-day-number {
            padding: 4px;
            color: var(--calendar-text-primary);
            font-weight: 500;
            font-size: 0.75rem;
          }

          .fc .fc-col-header-cell-cushion {
            padding: 4px;
            color: var(--calendar-text-secondary);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.625rem;
          }

          .fc .fc-daygrid-day.fc-day-today {
            background-color: var(--calendar-today-bg);
          }

          .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
            color: var(--tenant-primary);
            font-weight: 700;
          }

          .fc .fc-timegrid-now-indicator-line {
            border-color: var(--calendar-now-indicator);
          }

          .fc .fc-timegrid-now-indicator-arrow {
            border-color: var(--calendar-now-indicator);
            border-top-color: transparent;
            border-bottom-color: transparent;
          }

          /* Event Styling - Touch-Optimized with minimum tap target */
          .fc-event {
            cursor: pointer;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.6875rem;
            font-weight: 500;
            transition: opacity 0.15s ease, transform 0.1s ease;
            color: var(--calendar-event-text);
            min-height: 20px;
            /* Touch target minimum (Apple HIG: 44px, but constrained by grid) */
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
          }

          .fc-event:hover {
            opacity: 0.85;
          }

          /* Drag & Drop Cursor - Desktop only */
          @media (hover: hover) and (pointer: fine) {
            .fc-event {
              cursor: grab;
            }

            .fc-event:active {
              cursor: grabbing;
            }
          }

          .fc-event-dragging {
            opacity: 0.7;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: scale(1.02);
          }

          .fc-event-resizing {
            opacity: 0.7;
          }

          .fc-daygrid-event {
            margin: 1px 2px;
          }

          .fc-timegrid-event {
            border-radius: 4px;
          }

          .fc .fc-more-link {
            color: var(--tenant-primary);
            font-weight: 500;
            font-size: 0.6875rem;
            padding: 2px 4px;
            min-height: 24px;
            display: flex;
            align-items: center;
          }

          .fc .fc-highlight {
            background-color: var(--tenant-primary-light);
          }

          .fc-direction-ltr .fc-timegrid-slot-label-frame {
            text-align: right;
          }

          .fc .fc-timegrid-slot-label-cushion {
            color: var(--calendar-text-muted);
            font-size: 0.625rem;
          }

          .fc .fc-timegrid-axis-cushion {
            color: var(--calendar-text-muted);
            font-size: 0.625rem;
          }

          .fc .fc-timegrid-slot {
            border-color: var(--calendar-slot-border);
            height: 2rem;
          }

          .fc .fc-timegrid-slot:hover {
            background-color: var(--calendar-slot-hover);
          }

          /* Day cells */
          .fc .fc-daygrid-day {
            background-color: var(--calendar-day-bg);
          }

          .fc .fc-daygrid-day:hover {
            background-color: var(--calendar-day-hover);
          }

          /* Weekend styling */
          .fc .fc-day-sat,
          .fc .fc-day-sun {
            background-color: var(--calendar-weekend-bg);
          }

          /* All day section */
          .fc .fc-daygrid-day-events {
            min-height: 1.5em;
          }

          /* Header background */
          .fc .fc-col-header {
            background-color: var(--calendar-header-bg);
          }

          .fc .fc-scrollgrid-section-header {
            background-color: var(--calendar-header-bg);
          }

          /* ======================================
           * RESPONSIVE BREAKPOINTS
           * ====================================== */

          /* Small devices (640px+) */
          @media (min-width: 640px) {
            .fc .fc-daygrid-day-number {
              padding: 6px;
              font-size: 0.8125rem;
            }

            .fc .fc-col-header-cell-cushion {
              padding: 6px;
              font-size: 0.6875rem;
            }

            .fc-event {
              font-size: 0.75rem;
              padding: 2px 6px;
              min-height: 22px;
            }

            .fc .fc-more-link {
              font-size: 0.75rem;
            }

            .fc .fc-timegrid-slot {
              height: 2.5rem;
            }

            .fc .fc-timegrid-slot-label-cushion,
            .fc .fc-timegrid-axis-cushion {
              font-size: 0.6875rem;
            }

            .fc .fc-daygrid-day-events {
              min-height: 1.75em;
            }
          }

          /* Medium devices (768px+) */
          @media (min-width: 768px) {
            .fc .fc-daygrid-day-number {
              padding: 8px;
              font-size: 0.875rem;
            }

            .fc .fc-col-header-cell-cushion {
              padding: 8px;
              font-size: 0.75rem;
            }

            .fc-event {
              font-size: 0.8125rem;
              padding: 3px 8px;
              min-height: 24px;
            }

            .fc .fc-more-link {
              font-size: 0.8125rem;
              min-height: 28px;
            }

            .fc .fc-timegrid-slot {
              height: 3rem;
            }

            .fc .fc-timegrid-slot-label-cushion,
            .fc .fc-timegrid-axis-cushion {
              font-size: 0.75rem;
            }

            .fc .fc-daygrid-day-events {
              min-height: 2em;
            }
          }

          /* Large devices (1024px+) */
          @media (min-width: 1024px) {
            .fc .fc-daygrid-day-number {
              padding: 10px;
              font-size: 0.9375rem;
            }

            .fc .fc-col-header-cell-cushion {
              padding: 10px;
            }

            .fc-event {
              font-size: 0.8125rem;
              padding: 4px 10px;
            }

            .fc .fc-timegrid-slot {
              height: 3.5rem;
            }
          }

          /* ======================================
           * TOUCH DEVICE OPTIMIZATIONS
           * ====================================== */
          @media (hover: none) and (pointer: coarse) {
            /* Larger touch targets for events */
            .fc-event {
              min-height: 28px;
              padding: 4px 8px;
            }

            /* Larger tap area for more link */
            .fc .fc-more-link {
              min-height: 32px;
              padding: 4px 8px;
            }

            /* Disable hover states on touch */
            .fc .fc-daygrid-day:hover {
              background-color: var(--calendar-day-bg);
            }

            .fc .fc-timegrid-slot:hover {
              background-color: transparent;
            }

            /* Visual feedback on touch */
            .fc-event:active {
              transform: scale(0.98);
              opacity: 0.9;
            }

            /* Better slot height for touch selection */
            .fc .fc-timegrid-slot {
              height: 3rem;
            }
          }

          /* Portrait mobile optimization */
          @media (max-width: 639px) and (orientation: portrait) {
            /* Compact day numbers */
            .fc .fc-daygrid-day-number {
              padding: 2px 4px;
              font-size: 0.6875rem;
            }

            /* Ultra-compact headers */
            .fc .fc-col-header-cell-cushion {
              padding: 4px 2px;
              font-size: 0.5625rem;
              letter-spacing: 0;
            }

            /* Hide day name, show only first letter on very small screens */
            .fc .fc-col-header-cell-cushion {
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }

            /* Compact events */
            .fc-event {
              font-size: 0.625rem;
              padding: 1px 3px;
              line-height: 1.2;
            }

            /* Limit visible events */
            .fc .fc-daygrid-day-events {
              min-height: 1.25em;
            }
          }

          /* Landscape mobile optimization */
          @media (max-width: 767px) and (orientation: landscape) {
            .fc .fc-timegrid-slot {
              height: 2rem;
            }

            .fc .fc-daygrid-day-number {
              padding: 4px;
              font-size: 0.75rem;
            }
          }

          /* High DPI displays */
          @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
            .fc-event {
              /* Sharper borders on retina */
              border-width: 0.5px;
            }
          }
        `}</style>
      </div>
    );
  }
);

export default CalendarGrid;
