'use client';

/**
 * CalendarIconSidebar Component
 *
 * Minimal vertical sidebar with icon-only navigation for calendar views.
 * Follows the modern email client design pattern.
 *
 * Features:
 * - User avatar at top
 * - Icon-only view navigation (Month, Week, Day, Agenda)
 * - Tooltip labels on hover
 * - Today's event count badge
 * - Dynamic theming support
 */

import * as React from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  List,
  Settings,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CalendarViewType } from './CalendarGrid';

// ============================================
// Types
// ============================================

export interface CalendarIconSidebarProps {
  /** Current selected view */
  currentView: CalendarViewType;
  /** Handler for view change */
  onViewChange: (view: CalendarViewType) => void;
  /** Handler for create event */
  onCreateEvent: () => void;
  /** Today's event count */
  todayEventCount?: number;
  /** User name for avatar fallback */
  userName?: string;
  /** User avatar URL */
  userAvatar?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// View Configuration
// ============================================

interface ViewConfig {
  icon: React.ElementType;
  label: string;
  description?: string;
}

const VIEW_CONFIG: Record<CalendarViewType, ViewConfig> = {
  dayGridMonth: { icon: Calendar, label: 'Mes', description: 'Vista mensual' },
  timeGridWeek: { icon: CalendarRange, label: 'Semana', description: 'Vista semanal' },
  timeGridDay: { icon: CalendarDays, label: 'Día', description: 'Vista diaria' },
};

const VIEW_ORDER: CalendarViewType[] = ['dayGridMonth', 'timeGridWeek', 'timeGridDay'];

// ============================================
// Component
// ============================================

export function CalendarIconSidebar({
  currentView,
  onViewChange,
  onCreateEvent,
  todayEventCount = 0,
  userName = 'Usuario',
  userAvatar,
  className,
}: CalendarIconSidebarProps) {
  // Get initials from name
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'flex flex-col items-center py-4 h-full',
          'bg-gradient-to-b from-[var(--calendar-icon-sidebar-bg)] to-[var(--calendar-icon-sidebar-bg-end)]',
          'border-r border-[var(--calendar-surface-border)]',
          'w-[72px]',
          className
        )}
      >
        {/* User Avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="mb-6 relative group">
              <Avatar className="h-11 w-11 ring-2 ring-white/10 transition-all group-hover:ring-[var(--tenant-primary)]/30">
                <AvatarImage src={userAvatar} alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-[var(--tenant-primary)] to-[var(--tenant-accent)] text-white font-medium text-sm">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[var(--calendar-icon-sidebar-bg)]" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[var(--calendar-tooltip-bg)] text-white border-0">
            <p className="font-medium">{userName}</p>
            <p className="text-xs text-white/70">Calendario</p>
          </TooltipContent>
        </Tooltip>

        {/* Create Event Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onCreateEvent}
              size="icon"
              className={cn(
                'mb-6 h-11 w-11 rounded-xl',
                'bg-[var(--tenant-primary)]',
                'hover:bg-[var(--tenant-primary-hover)]',
                'text-white shadow-lg shadow-[var(--tenant-primary)]/25',
                'transition-all duration-200',
                'hover:shadow-xl hover:shadow-[var(--tenant-primary)]/30',
                'hover:scale-[1.05]'
              )}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-[var(--calendar-tooltip-bg)] text-white border-0">
            <p>Nuevo evento</p>
          </TooltipContent>
        </Tooltip>

        {/* View Navigation */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {VIEW_ORDER.map((view) => {
            const config = VIEW_CONFIG[view];
            const Icon = config.icon;
            const isActive = currentView === view;
            const showBadge = view === 'dayGridMonth' && todayEventCount > 0;

            return (
              <Tooltip key={view}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onViewChange(view)}
                    className={cn(
                      'relative flex items-center justify-center',
                      'h-11 w-11 rounded-xl',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-white/15 text-white shadow-lg shadow-white/5'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-[var(--tenant-accent)]')} />

                    {/* Today Events Badge */}
                    {showBadge && (
                      <span
                        className={cn(
                          'absolute -top-0.5 -right-0.5',
                          'min-w-[18px] h-[18px] px-1',
                          'flex items-center justify-center',
                          'text-[10px] font-semibold text-white',
                          'bg-[var(--tenant-primary)] rounded-full',
                          'shadow-sm shadow-[var(--tenant-primary)]/30'
                        )}
                      >
                        {todayEventCount > 99 ? '99+' : todayEventCount}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[var(--calendar-tooltip-bg)] text-white border-0">
                  <p>{config.label}</p>
                  {config.description && (
                    <p className="text-xs text-white/70">{config.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="flex flex-col items-center gap-1 mt-auto pt-4 border-t border-white/10">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/app/settings/integrations/calendar"
                className={cn(
                  'flex items-center justify-center',
                  'h-10 w-10 rounded-xl',
                  'transition-all duration-200',
                  'text-white/40 hover:text-white/70 hover:bg-white/5'
                )}
              >
                <Settings className="h-4.5 w-4.5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[var(--calendar-tooltip-bg)] text-white border-0">
              Configurar calendarios
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default CalendarIconSidebar;
