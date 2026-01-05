'use client';

/**
 * Calendar Page - Premium 2026 Design
 *
 * State-of-the-art calendar implementation with:
 * - Dynamic viewport-aware layout system
 * - Fluid responsive design (no breakpoint jumps)
 * - Glassmorphism visual effects
 * - Smooth micro-interactions
 * - Real-time sync with optimistic updates
 *
 * Layout Architecture:
 * - Fills available space from DashboardShell (flex-1 min-h-0)
 * - Dynamic sidebar integration via CSS custom properties
 * - Proper containment chain for nested scroll contexts
 *
 * Device-Specific Layouts:
 * - Mobile (<768px): Full-width with FAB and sheet navigation
 * - Tablet (768px-1023px): Full-width with inline toolbar
 * - Desktop (≥1024px): Icon sidebar (72px) + main content
 *
 * References:
 * - Google Calendar layout patterns
 * - Notion toggle views (kanban/list/calendar)
 * - Calendly mobile-first design
 *
 * @module app/calendar/page
 */

import * as React from 'react';

import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import { useViewport } from '@/hooks/use-viewport';

import {
  useHasConnectedCalendar,
  calendarKeys,
  type CalendarEvent,
  type CalendarSyncState,
} from '@/lib/calendar';

import {
  CalendarGrid,
  CalendarIconSidebar,
  CalendarHeader,
  CalendarSkeleton,
  CalendarSyncIndicator,
  EventDetailSheet,
  EventFormSheet,
  type CalendarGridRef,
  type CalendarViewType,
} from './components';

import { useCalendarTheme } from './hooks';

// ============================================
// CSS Custom Properties for Dynamic Layout
// ============================================

const LAYOUT_TOKENS = {
  // Icon sidebar width (desktop only)
  sidebarWidth: 72,
  // Header heights
  headerHeightMobile: 56,
  headerHeightDesktop: 64,
  // Toolbar height
  toolbarHeight: 48,
  // Sync indicator offset
  syncIndicatorOffset: 24,
  // Animation durations
  transitionDuration: '300ms',
  transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ============================================
// Empty State Component - Glassmorphism Design
// ============================================

function CalendarEmptyState({ onConnect }: { onConnect?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-16 px-4">
      {/* Glassmorphism Card */}
      <div
        className={cn(
          'relative p-8 rounded-2xl max-w-md w-full text-center',
          'bg-gradient-to-br from-white/10 to-white/5',
          'dark:from-white/5 dark:to-white/[0.02]',
          'backdrop-blur-xl',
          'border border-white/10 dark:border-white/5',
          'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
          'dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
        )}
      >
        {/* Gradient Glow */}
        <div
          className="absolute -inset-px rounded-2xl opacity-50 blur-sm -z-10"
          style={{
            background: 'linear-gradient(135deg, var(--tenant-primary) 0%, var(--tenant-accent) 100%)',
          }}
        />

        {/* Icon */}
        <div
          className={cn(
            'mx-auto w-16 h-16 rounded-2xl mb-6',
            'flex items-center justify-center',
            'bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
            'shadow-lg shadow-[var(--tenant-primary)]/30'
          )}
        >
          <CalendarIcon className="h-8 w-8 text-white" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-[var(--calendar-text-primary)] mb-3">
          Conecta tu calendario
        </h3>
        <p className="text-[var(--calendar-text-muted)] text-sm leading-relaxed mb-6">
          Vincula Google Calendar o Microsoft Outlook para gestionar todos tus eventos desde un solo
          lugar.
        </p>

        {/* CTA Button */}
        <Button
          asChild
          className={cn(
            'w-full h-11 rounded-xl font-medium',
            'bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
            'hover:opacity-90 transition-opacity',
            'shadow-lg shadow-[var(--tenant-primary)]/30'
          )}
        >
          <Link href="/app/settings/integrations/calendar">
            <Settings className="h-4 w-4 mr-2" />
            Configurar calendario
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Mobile Header Component
// ============================================

interface MobileHeaderProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCreateEvent: () => void;
}

function MobileHeader({
  currentDate,
  onPrev,
  onNext,
  onToday,
  onCreateEvent,
}: MobileHeaderProps) {
  return (
    <div className="shrink-0 bg-[var(--calendar-header-bg)] backdrop-blur-xl border-b border-[var(--calendar-surface-border)]">
      {/* Title Row */}
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-semibold text-[var(--calendar-text-primary)]">
          Calendario
        </h1>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 rounded-xl">
            <Link href="/app/settings/integrations/calendar">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="icon"
            onClick={onCreateEvent}
            className={cn(
              'h-9 w-9 rounded-xl',
              'bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
              'shadow-lg shadow-[var(--tenant-primary)]/30'
            )}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToday}
            className="h-8 px-3 text-xs rounded-lg"
          >
            Hoy
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="h-8 w-8 rounded-lg"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-[var(--calendar-text-primary)] capitalize">
          {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Tablet/Desktop View Switcher
// ============================================

interface ViewSwitcherProps {
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onCreateEvent: () => void;
  compact?: boolean;
}

function ViewSwitcher({
  currentView,
  onViewChange,
  onCreateEvent,
  compact = false,
}: ViewSwitcherProps) {
  const views: { key: CalendarViewType; label: string }[] = [
    { key: 'dayGridMonth', label: 'Mes' },
    { key: 'timeGridWeek', label: 'Semana' },
    { key: 'timeGridDay', label: 'Día' },
  ];

  return (
    <div
      className={cn(
        'flex items-center justify-between shrink-0',
        'px-4 py-2.5 border-b border-[var(--calendar-surface-border)]',
        'bg-[var(--calendar-surface)]/80 backdrop-blur-sm'
      )}
    >
      {/* View Buttons */}
      <div
        className={cn(
          'flex items-center gap-1',
          'p-1 rounded-lg',
          'bg-[var(--calendar-surface-light)]',
          'border border-[var(--calendar-surface-border)]'
        )}
      >
        {views.map((view) => (
          <Button
            key={view.key}
            variant={currentView === view.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange(view.key)}
            className={cn(
              'h-7 px-3 text-xs rounded-md font-medium',
              'transition-all duration-200',
              currentView === view.key && [
                'bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
                'text-white shadow-sm',
              ]
            )}
          >
            {view.label}
          </Button>
        ))}
      </div>

      {/* Create Button */}
      <Button
        onClick={onCreateEvent}
        size="sm"
        className={cn(
          'h-8 rounded-lg font-medium',
          'bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)]',
          'shadow-md shadow-[var(--tenant-primary)]/20',
          'hover:shadow-lg hover:shadow-[var(--tenant-primary)]/30',
          'transition-all duration-200'
        )}
      >
        <Plus className="h-4 w-4 mr-1.5" />
        {compact ? 'Nuevo' : 'Nuevo evento'}
      </Button>
    </div>
  );
}

// ============================================
// Calendar Content Container
// ============================================

interface CalendarContentProps {
  calendarRef: React.RefObject<CalendarGridRef>;
  currentView: CalendarViewType;
  onEventClick: (event: CalendarEvent) => void;
  onDateSelect: (start: Date, end: Date, allDay: boolean) => void;
  onDatesChange: (start: Date, end: Date) => void;
  onSyncStateChange: (state: CalendarSyncState) => void;
  syncState: CalendarSyncState;
  onSyncNow: () => void;
  showSyncIndicator?: boolean;
}

function CalendarContent({
  calendarRef,
  currentView,
  onEventClick,
  onDateSelect,
  onDatesChange,
  onSyncStateChange,
  syncState,
  onSyncNow,
  showSyncIndicator = true,
}: CalendarContentProps) {
  return (
    <div className="relative flex-1 min-h-0 overflow-hidden">
      {/* Calendar Grid Container - Glassmorphism */}
      <div
        className={cn(
          'absolute inset-3 sm:inset-4 rounded-xl overflow-hidden',
          'bg-[var(--calendar-surface)]/60 backdrop-blur-md',
          'border border-[var(--calendar-surface-border)]',
          'shadow-[0_4px_24px_rgba(0,0,0,0.08)]',
          'dark:shadow-[0_4px_24px_rgba(0,0,0,0.24)]'
        )}
      >
        <CalendarGrid
          ref={calendarRef}
          initialView={currentView}
          onEventClick={onEventClick}
          onDateSelect={onDateSelect}
          onDatesChange={onDatesChange}
          onSyncStateChange={onSyncStateChange}
          height="100%"
        />
      </div>

      {/* Sync Indicator - Positioned absolutely */}
      {showSyncIndicator && (
        <div
          className={cn(
            'absolute z-40',
            'bottom-6 right-6 sm:bottom-7 sm:right-7'
          )}
        >
          <CalendarSyncIndicator
            syncState={syncState}
            onSyncNow={onSyncNow}
            className={cn(
              'bg-[var(--calendar-surface)]/90 backdrop-blur-lg',
              'shadow-lg shadow-black/10 dark:shadow-black/30'
            )}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Calendar Page Component
// ============================================

export default function CalendarPage() {
  // Apply dynamic theming (dark mode aware)
  useCalendarTheme();

  // Viewport detection for responsive layout
  const { device, isReady: viewportReady } = useViewport();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check if user has connected calendars
  const { hasConnectedCalendar, isLoading: isCheckingConnection } = useHasConnectedCalendar();

  // Calendar state
  const calendarRef = React.useRef<CalendarGridRef>(null);
  const [currentView, setCurrentView] = React.useState<CalendarViewType>('dayGridMonth');
  const [currentDate, setCurrentDate] = React.useState(new Date());

  // Event detail sheet state
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = React.useState(false);

  // Event form sheet state
  const [eventFormOpen, setEventFormOpen] = React.useState(false);
  const [eventToEdit, setEventToEdit] = React.useState<CalendarEvent | undefined>(undefined);
  const [newEventDates, setNewEventDates] = React.useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  // Sync state for real-time updates
  const [syncState, setSyncState] = React.useState<CalendarSyncState>({
    status: 'idle',
    lastSyncedAt: null,
    error: null,
    pendingChanges: 0,
  });

  // ============================================
  // Handlers
  // ============================================

  const handleSyncStateChange = React.useCallback((newState: CalendarSyncState) => {
    setSyncState(newState);
  }, []);

  const handleSyncNow = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
  }, [queryClient]);

  const handleViewChange = React.useCallback((view: CalendarViewType) => {
    setCurrentView(view);
    calendarRef.current?.changeView(view);
  }, []);

  const handleToday = React.useCallback(() => {
    calendarRef.current?.today();
    setCurrentDate(new Date());
  }, []);

  const handlePrev = React.useCallback(() => {
    calendarRef.current?.prev();
    const date = calendarRef.current?.getDate();
    if (date) setCurrentDate(date);
  }, []);

  const handleNext = React.useCallback(() => {
    calendarRef.current?.next();
    const date = calendarRef.current?.getDate();
    if (date) setCurrentDate(date);
  }, []);

  const handleEventClick = React.useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDetailOpen(true);
  }, []);

  const handleDateSelect = React.useCallback((start: Date, end: Date, allDay: boolean) => {
    setEventToEdit(undefined);
    setNewEventDates({ start, end, allDay });
    setEventFormOpen(true);
  }, []);

  const handleDatesChange = React.useCallback((start: Date, end: Date) => {
    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    setCurrentDate(midpoint);
  }, []);

  const handleCreateEvent = React.useCallback(() => {
    setEventToEdit(undefined);
    setNewEventDates({
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000),
      allDay: false,
    });
    setEventFormOpen(true);
  }, []);

  const handleEditEvent = React.useCallback((event: CalendarEvent) => {
    setEventDetailOpen(false);
    setEventToEdit(event);
    setNewEventDates(null);
    setEventFormOpen(true);
  }, []);

  const handleFormSuccess = React.useCallback(() => {
    setEventFormOpen(false);
    setEventToEdit(undefined);
    setNewEventDates(null);
    void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
  }, [queryClient]);

  const handleEventDeleted = React.useCallback(() => {
    setSelectedEvent(null);
    void queryClient.invalidateQueries({ queryKey: calendarKeys.events() });
  }, [queryClient]);

  const handleFormOpenChange = React.useCallback((open: boolean) => {
    setEventFormOpen(open);
    if (!open) {
      setEventToEdit(undefined);
      setNewEventDates(null);
    }
  }, []);

  const handleSearch = React.useCallback((query: string) => {
    console.log('Search calendar:', query);
    // TODO: Implement event search
  }, []);

  const handleAskAI = React.useCallback(() => {
    toast({ title: 'Próximamente', description: 'El asistente de IA estará disponible pronto.' });
  }, [toast]);

  // Get user info for icon sidebar
  const { user } = useAuthStore();
  const userName = user?.fullName || user?.email?.split('@')[0] || 'Usuario';

  // ============================================
  // Loading State
  // ============================================

  if (isCheckingConnection || !viewportReady) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CalendarSkeleton />
      </div>
    );
  }

  // ============================================
  // Mobile Layout (< 768px)
  // ============================================

  if (device.isMobile) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--calendar-surface)]">
        {/* Mobile Header */}
        <MobileHeader
          currentDate={currentDate}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onCreateEvent={handleCreateEvent}
        />

        {/* Content */}
        {!hasConnectedCalendar ? (
          <CalendarEmptyState />
        ) : (
          <CalendarContent
            calendarRef={calendarRef}
            currentView={currentView}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onDatesChange={handleDatesChange}
            onSyncStateChange={handleSyncStateChange}
            syncState={syncState}
            onSyncNow={handleSyncNow}
          />
        )}

        {/* Mobile Sync Indicator - Fixed bottom right above bottom bar */}
        {hasConnectedCalendar && (
          <div className="fixed bottom-20 right-4 z-40">
            <CalendarSyncIndicator
              syncState={syncState}
              onSyncNow={handleSyncNow}
              compact
              className="shadow-lg"
            />
          </div>
        )}

        {/* Sheets */}
        <EventDetailSheet
          event={selectedEvent}
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
          onEdit={handleEditEvent}
          onDeleted={handleEventDeleted}
        />
        <EventFormSheet
          open={eventFormOpen}
          onOpenChange={handleFormOpenChange}
          event={eventToEdit}
          initialDate={newEventDates?.start}
          initialEndDate={newEventDates?.end}
          initialAllDay={newEventDates?.allDay}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  // ============================================
  // Tablet Layout (768px - 1023px)
  // ============================================

  if (device.isTablet) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--calendar-surface)]">
        {/* Header with navigation */}
        <CalendarHeader
          currentDate={currentDate}
          onToday={handleToday}
          onPrev={handlePrev}
          onNext={handleNext}
          onSearch={handleSearch}
          onAskAI={handleAskAI}
          hasAIFeature={true}
        />

        {/* View Switcher */}
        <ViewSwitcher
          currentView={currentView}
          onViewChange={handleViewChange}
          onCreateEvent={handleCreateEvent}
          compact
        />

        {/* Content */}
        {!hasConnectedCalendar ? (
          <div className="flex-1 flex items-center justify-center">
            <CalendarEmptyState />
          </div>
        ) : (
          <CalendarContent
            calendarRef={calendarRef}
            currentView={currentView}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onDatesChange={handleDatesChange}
            onSyncStateChange={handleSyncStateChange}
            syncState={syncState}
            onSyncNow={handleSyncNow}
          />
        )}

        {/* Sheets */}
        <EventDetailSheet
          event={selectedEvent}
          open={eventDetailOpen}
          onOpenChange={setEventDetailOpen}
          onEdit={handleEditEvent}
          onDeleted={handleEventDeleted}
        />
        <EventFormSheet
          open={eventFormOpen}
          onOpenChange={handleFormOpenChange}
          event={eventToEdit}
          initialDate={newEventDates?.start}
          initialEndDate={newEventDates?.end}
          initialAllDay={newEventDates?.allDay}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  // ============================================
  // Desktop Layout (≥ 1024px)
  // ============================================

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--calendar-surface)]">
      {/*
        Desktop Layout: Icon Sidebar + Main Content
        Using CSS Grid for precise control over column widths

        IMPORTANT: The outer container has bg-[var(--calendar-surface)] to prevent
        any gap visibility between the main DashboardShell sidebar and this content
        during sidebar collapse/expand transitions.
      */}
      <div
        className="grid flex-1 min-h-0 overflow-hidden"
        style={{
          gridTemplateColumns: `${LAYOUT_TOKENS.sidebarWidth}px 1fr`,
        }}
      >
        {/* Icon Sidebar - Minimal Navigation */}
        <CalendarIconSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          onCreateEvent={handleCreateEvent}
          todayEventCount={0}
          userName={userName}
          userAvatar={user?.avatarUrl}
        />

        {/* Main Content Area */}
        <div className="flex flex-col min-w-0 overflow-hidden bg-[var(--calendar-surface)]">
          {/* Header - Date Navigation + Search + Actions */}
          <CalendarHeader
            currentDate={currentDate}
            onToday={handleToday}
            onPrev={handlePrev}
            onNext={handleNext}
            onSearch={handleSearch}
            onAskAI={handleAskAI}
            hasAIFeature={true}
          />

          {/* Content - Calendar Grid or Empty State */}
          {!hasConnectedCalendar ? (
            <div className="flex-1 flex items-center justify-center">
              <CalendarEmptyState />
            </div>
          ) : (
            <CalendarContent
              calendarRef={calendarRef}
              currentView={currentView}
              onEventClick={handleEventClick}
              onDateSelect={handleDateSelect}
              onDatesChange={handleDatesChange}
              onSyncStateChange={handleSyncStateChange}
              syncState={syncState}
              onSyncNow={handleSyncNow}
            />
          )}
        </div>
      </div>

      {/* Sheets */}
      <EventDetailSheet
        event={selectedEvent}
        open={eventDetailOpen}
        onOpenChange={setEventDetailOpen}
        onEdit={handleEditEvent}
        onDeleted={handleEventDeleted}
      />
      <EventFormSheet
        open={eventFormOpen}
        onOpenChange={handleFormOpenChange}
        event={eventToEdit}
        initialDate={newEventDates?.start}
        initialEndDate={newEventDates?.end}
        initialAllDay={newEventDates?.allDay}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
