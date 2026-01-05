'use client';

/**
 * CalendarToolbar Component - v2.0
 *
 * Navigation toolbar for the calendar.
 * Controls view switching and date navigation.
 *
 * v2.0: Improved responsive layout
 * - Proper flex-wrap to prevent overflow
 * - Mobile-first approach with progressive enhancement
 * - No elements get cut off at any viewport size
 *
 * @module app/calendar/components/CalendarToolbar
 */

import * as React from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  CalendarRange,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { CalendarViewType } from './CalendarGrid';

// ============================================
// Types
// ============================================

interface CalendarToolbarProps {
  currentDate: Date;
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCreateEvent?: () => void;
}

// ============================================
// View Configuration
// ============================================

const VIEW_OPTIONS: { value: CalendarViewType; label: string; icon: React.ElementType }[] = [
  { value: 'dayGridMonth', label: 'Mes', icon: Calendar },
  { value: 'timeGridWeek', label: 'Semana', icon: CalendarRange },
  { value: 'timeGridDay', label: 'Día', icon: CalendarDays },
];

// ============================================
// Date Formatting
// ============================================

function formatCurrentDate(date: Date, view: CalendarViewType): string {
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    year: 'numeric',
  };

  if (view === 'timeGridWeek') {
    // Show week range
    const start = new Date(date);
    const end = new Date(date);
    const day = start.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diffToMonday);
    end.setDate(start.getDate() + 6);

    const startStr = start.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const endStr = end.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  }

  if (view === 'timeGridDay') {
    return date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // Month view
  return date.toLocaleDateString('es-MX', options);
}

// ============================================
// CalendarToolbar Component
// ============================================

export function CalendarToolbar({
  currentDate,
  currentView,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onCreateEvent,
}: CalendarToolbarProps) {
  const formattedDate = formatCurrentDate(currentDate, currentView);

  return (
    <TooltipProvider>
      {/* Main container - wraps on small screens */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Navigation Group */}
        <div className="flex items-center gap-1 sm:gap-2 order-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 px-2 sm:px-3"
          >
            Hoy
          </Button>

          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onPrev} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Anterior</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onNext} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Siguiente</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Current Date Display - grows to fill, truncates if needed */}
        <h2 className="text-base sm:text-lg font-semibold capitalize min-w-0 truncate order-2 flex-1 sm:flex-initial">
          {formattedDate}
        </h2>

        {/* Spacer - pushes remaining items to the right on larger screens */}
        <div className="hidden md:block flex-1 order-3" />

        {/* View Toggle - full width on xs, inline on sm+ */}
        <div className="order-5 sm:order-4 w-full sm:w-auto mt-2 sm:mt-0">
          <ToggleGroup
            type="single"
            value={currentView}
            onValueChange={(value) => {
              if (value) onViewChange(value as CalendarViewType);
            }}
            className="bg-muted rounded-lg p-1 w-full sm:w-auto justify-center sm:justify-start"
          >
            {VIEW_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <ToggleGroupItem
                      value={option.value}
                      aria-label={option.label}
                      className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-3 flex-1 sm:flex-initial"
                    >
                      <Icon className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline text-sm">{option.label}</span>
                    </ToggleGroupItem>
                  </TooltipTrigger>
                  <TooltipContent className="sm:hidden">{option.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </ToggleGroup>
        </div>

        {/* Create Event Button */}
        {onCreateEvent && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onCreateEvent}
                size="sm"
                className="h-8 px-2 sm:px-3 order-4 sm:order-5 shrink-0"
              >
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Nuevo evento</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent className="sm:hidden">Nuevo evento</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export default CalendarToolbar;
