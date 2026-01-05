/**
 * SearchEmptyState Primitive - Ventazo Design System 2025
 *
 * @description Empty state when no results found, with suggestions.
 *
 * @module components/search/primitives/SearchEmptyState
 */

'use client';

import * as React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchEmptyStateProps } from '../types';

// ============================================
// Translations
// ============================================

const translations = {
  es: {
    noResultsFor: 'Sin resultados para',
    tryOtherKeywords: 'Intenta con otras palabras clave',
    typeToSearch: 'Escribe para buscar',
    searchIn: 'Busca en',
    suggestions: ['leads', 'clientes', 'oportunidades', 'tareas'],
  },
  en: {
    noResultsFor: 'No results for',
    tryOtherKeywords: 'Try other keywords',
    typeToSearch: 'Type to search',
    searchIn: 'Search in',
    suggestions: ['leads', 'customers', 'opportunities', 'tasks'],
  },
};

// ============================================
// Component
// ============================================

export function SearchEmptyState({
  query,
  onSuggestionClick,
  locale = 'es',
  accentColor,
}: SearchEmptyStateProps) {
  const t = translations[locale];
  const color = accentColor || 'hsl(var(--primary))';

  // If query is empty, show initial state
  if (!query) {
    return (
      <div className="py-16 sm:py-20 text-center px-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: `${color}15` }}
        >
          <Sparkles className="w-7 h-7" style={{ color }} />
        </div>
        <p className="text-base font-semibold text-white mb-1">
          {t.typeToSearch}
        </p>
        <p className="text-sm text-white/50">
          {t.searchIn} leads, clientes, oportunidades, tareas...
        </p>
      </div>
    );
  }

  // No results state
  return (
    <div className="py-16 sm:py-20 text-center px-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${color}15` }}
      >
        <Search className="w-7 h-7" style={{ color }} />
      </div>
      <p className="text-base font-semibold text-white mb-1">
        {t.noResultsFor} &quot;{query}&quot;
      </p>
      <p className="text-sm text-white/50 mb-6">{t.tryOtherKeywords}</p>

      {/* Suggestions */}
      <div className="flex flex-wrap justify-center gap-2">
        {t.suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestionClick(suggestion)}
            className={cn(
              'px-4 py-2 text-sm rounded-xl',
              'bg-white/5 hover:bg-white/10',
              'text-white/60 hover:text-white',
              'transition-all border border-white/10',
              'active:scale-95'
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

SearchEmptyState.displayName = 'SearchEmptyState';
