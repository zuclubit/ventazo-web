'use client';

/**
 * CalendarHeader Component
 *
 * Modern header with date navigation, search, AI assistant, and create button.
 * Follows the modern email client design pattern.
 *
 * Features:
 * - Current date display with navigation
 * - Global search with placeholder
 * - Ask AI button with sparkle icon
 * - Today button
 * - Dynamic theming support
 */

import * as React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface CalendarHeaderProps {
  /** Current displayed date */
  currentDate: Date;
  /** Handler for today click */
  onToday: () => void;
  /** Handler for previous navigation */
  onPrev: () => void;
  /** Handler for next navigation */
  onNext: () => void;
  /** Handler for search input */
  onSearch?: (query: string) => void;
  /** Handler for Ask AI click */
  onAskAI?: () => void;
  /** Current search query */
  searchQuery?: string;
  /** Is AI feature available */
  hasAIFeature?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function CalendarHeader({
  currentDate,
  onToday,
  onPrev,
  onNext,
  onSearch,
  onAskAI,
  searchQuery = '',
  hasAIFeature = true,
  className,
}: CalendarHeaderProps) {
  const [query, setQuery] = React.useState(searchQuery);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Format date for display
  const formattedDate = format(currentDate, "MMMM 'de' yyyy", { locale: es });
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  };

  // Handle keyboard shortcut for search focus
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={cn(
        'flex items-center gap-3 lg:gap-4 px-4 lg:px-6 py-3 lg:py-4',
        'bg-[var(--calendar-header-bg)]',
        'border-b border-[var(--calendar-surface-border)]',
        'shrink-0',
        className
      )}
    >
      {/* Date Navigation */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Today Button */}
        <Button
          variant="outline"
          onClick={onToday}
          size="sm"
          className={cn(
            'gap-1.5 lg:gap-2 px-3 lg:px-4 h-9',
            'bg-[var(--calendar-surface-light)]',
            'border-[var(--calendar-surface-border)]',
            'text-[var(--calendar-text-primary)]',
            'hover:bg-[var(--calendar-surface-hover)]',
            'hover:border-[var(--tenant-primary)]/50',
            'transition-all duration-200'
          )}
        >
          <Calendar className="h-4 w-4 text-[var(--tenant-primary)]" />
          <span className="hidden sm:inline">Hoy</span>
        </Button>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className={cn(
              'h-8 w-8 lg:h-9 lg:w-9 rounded-lg',
              'text-[var(--calendar-text-secondary)]',
              'hover:bg-[var(--calendar-surface-hover)]',
              'hover:text-[var(--calendar-text-primary)]'
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className={cn(
              'h-8 w-8 lg:h-9 lg:w-9 rounded-lg',
              'text-[var(--calendar-text-secondary)]',
              'hover:bg-[var(--calendar-surface-hover)]',
              'hover:text-[var(--calendar-text-primary)]'
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Current Date Display */}
        <h2 className="text-base lg:text-lg font-semibold text-[var(--calendar-text-primary)] whitespace-nowrap">
          {capitalizedDate}
        </h2>
      </div>

      {/* Search Bar */}
      <div className="flex-1 relative max-w-md lg:max-w-xl min-w-0">
        <div
          className={cn(
            'relative flex items-center',
            'bg-[var(--calendar-search-bg)]',
            'border border-[var(--calendar-search-border)]',
            'rounded-lg lg:rounded-xl overflow-hidden',
            'transition-all duration-200',
            'focus-within:ring-2 focus-within:ring-[var(--tenant-primary)]/20',
            'focus-within:border-[var(--tenant-primary)]/50'
          )}
        >
          <Search className="absolute left-3 lg:left-4 h-4 w-4 text-[var(--calendar-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Buscar eventos..."
            className={cn(
              'w-full py-2.5 lg:py-3 pl-9 lg:pl-11 pr-3 lg:pr-4',
              'bg-transparent',
              'text-sm text-[var(--calendar-text-primary)]',
              'placeholder:text-[var(--calendar-text-muted)]',
              'focus:outline-none'
            )}
          />

          {/* Keyboard shortcut hint */}
          <div className="hidden lg:flex items-center gap-1 pr-4">
            <kbd
              className={cn(
                'px-1.5 py-0.5 rounded',
                'bg-[var(--calendar-surface-light)]',
                'text-[10px] font-medium text-[var(--calendar-text-muted)]',
                'border border-[var(--calendar-surface-border)]'
              )}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Ask AI Button */}
        {hasAIFeature && (
          <Button
            variant="outline"
            onClick={onAskAI}
            size="sm"
            className={cn(
              'gap-1.5 lg:gap-2 px-3 lg:px-4 h-9',
              'bg-[var(--calendar-surface-light)]',
              'border-[var(--calendar-surface-border)]',
              'text-[var(--calendar-text-secondary)]',
              'hover:bg-[var(--calendar-surface-hover)]',
              'hover:text-[var(--calendar-text-primary)]',
              'hover:border-[var(--tenant-accent)]/50',
              'transition-all duration-200'
            )}
          >
            <Sparkles className="h-4 w-4 text-[var(--tenant-accent)]" />
            <span className="hidden lg:inline">Preguntar IA</span>
          </Button>
        )}
      </div>
    </header>
  );
}

export default CalendarHeader;
