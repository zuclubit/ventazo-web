/**
 * SearchFilters Primitive - Ventazo Design System 2025
 *
 * @description Horizontal scrollable entity type filters.
 * Touch-friendly with responsive sizing.
 *
 * @module components/search/primitives/SearchFilters
 */

'use client';

import * as React from 'react';
import {
  Sparkles,
  Building2,
  Users,
  Target,
  CheckSquare,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchFiltersProps, EntityFilter } from '../types';

// ============================================
// Filter Configuration
// ============================================

const ENTITY_FILTERS: Array<{
  id: EntityFilter;
  labelEs: string;
  labelEn: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'all', labelEs: 'Todo', labelEn: 'All', Icon: Sparkles },
  { id: 'lead', labelEs: 'Leads', labelEn: 'Leads', Icon: Building2 },
  { id: 'customer', labelEs: 'Clientes', labelEn: 'Customers', Icon: Users },
  { id: 'opportunity', labelEs: 'Oportunidades', labelEn: 'Opportunities', Icon: Target },
  { id: 'task', labelEs: 'Tareas', labelEn: 'Tasks', Icon: CheckSquare },
  { id: 'contact', labelEs: 'Contactos', labelEn: 'Contacts', Icon: User },
];

// ============================================
// Component
// ============================================

export function SearchFilters({
  activeFilter,
  onFilterChange,
  locale = 'es',
  accentColor,
}: SearchFiltersProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Scroll active filter into view
  React.useEffect(() => {
    if (scrollRef.current) {
      const activeButton = scrollRef.current.querySelector('[data-active="true"]');
      if (activeButton) {
        activeButton.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeFilter]);

  return (
    <div
      ref={scrollRef}
      className={cn(
        'flex items-center gap-2',
        'px-4 sm:px-5 py-3',
        'border-b border-white/5',
        'overflow-x-auto scrollbar-hide',
        'bg-white/[0.01]',
        // Smooth scrolling on touch devices
        'scroll-smooth snap-x snap-mandatory',
        // Hide scrollbar on all browsers
        '[&::-webkit-scrollbar]:hidden',
        '[-ms-overflow-style:none]',
        '[scrollbar-width:none]'
      )}
    >
      {ENTITY_FILTERS.map((filter) => {
        const isActive = activeFilter === filter.id;
        const { Icon } = filter;

        return (
          <button
            key={filter.id}
            data-active={isActive}
            onClick={() => onFilterChange(filter.id)}
            className={cn(
              // Base styles
              'flex items-center gap-2',
              'px-3 sm:px-4 py-2 sm:py-2.5',
              'rounded-xl text-sm font-medium',
              'whitespace-nowrap flex-shrink-0',
              'snap-start',
              // Transitions
              'transition-all duration-200',
              'active:scale-95',
              // Border
              'border',
              // States
              isActive
                ? 'bg-white/10 text-white border-white/20 shadow-lg shadow-white/5'
                : 'bg-transparent text-white/50 border-transparent hover:bg-white/5 hover:text-white/70'
            )}
            style={
              isActive && accentColor
                ? {
                    backgroundColor: `${accentColor}20`,
                    borderColor: `${accentColor}40`,
                    color: 'white',
                  }
                : undefined
            }
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {locale === 'es' ? filter.labelEs : filter.labelEn}
            </span>
          </button>
        );
      })}
    </div>
  );
}

SearchFilters.displayName = 'SearchFilters';
