/**
 * SearchRecentList Primitive - Ventazo Design System 2025
 *
 * @description List of recent searches with timestamps.
 *
 * @module components/search/primitives/SearchRecentList
 */

'use client';

import * as React from 'react';
import { Clock, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchRecentListProps } from '../types';

// ============================================
// Translations
// ============================================

const translations = {
  es: {
    recentSearches: 'Búsquedas recientes',
    result: 'resultado',
    results: 'resultados',
  },
  en: {
    recentSearches: 'Recent searches',
    result: 'result',
    results: 'results',
  },
};

// ============================================
// Helper Functions
// ============================================

function formatTimeAgo(date: Date, locale: 'es' | 'en'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (locale === 'es') {
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  }

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Component
// ============================================

export function SearchRecentList({
  searches,
  onSelect,
  locale = 'es',
}: SearchRecentListProps) {
  const t = translations[locale];

  if (searches.length === 0) {
    return null;
  }

  return (
    <div className="p-3 sm:p-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-2 mb-2">
        <Clock className="w-4 h-4 text-white/40" />
        <span className="text-sm font-medium text-white/50">
          {t.recentSearches}
        </span>
      </div>

      {/* List */}
      <div className="space-y-1">
        {searches.slice(0, 5).map((search) => (
          <button
            key={search.id}
            onClick={() => onSelect(search)}
            className={cn(
              'w-full flex items-center gap-3',
              'p-3 sm:p-4 rounded-xl',
              'text-left',
              'bg-white/[0.02] hover:bg-white/[0.06]',
              'transition-all active:scale-[0.99]'
            )}
          >
            {/* Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-lg',
                'bg-white/5 flex items-center justify-center',
                'flex-shrink-0'
              )}
            >
              <Search className="w-4 h-4 text-white/40" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-white truncate block">
                {search.query}
              </span>
              <span className="text-xs text-white/40">
                {search.resultCount}{' '}
                {search.resultCount === 1 ? t.result : t.results}
              </span>
            </div>

            {/* Time */}
            <span className="text-xs text-white/30 flex-shrink-0">
              {formatTimeAgo(search.searchedAt, locale)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

SearchRecentList.displayName = 'SearchRecentList';
