/**
 * SearchResults Primitive - Ventazo Design System 2025
 *
 * @description Container for search result items with header stats.
 *
 * @module components/search/primitives/SearchResults
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SearchResultItem } from './SearchResultItem';
import type { SearchResultsProps } from '../types';

// ============================================
// Translations
// ============================================

const translations = {
  es: {
    resultsFound: 'resultados encontrados',
    resultFound: 'resultado encontrado',
  },
  en: {
    resultsFound: 'results found',
    resultFound: 'result found',
  },
};

// ============================================
// Component
// ============================================

export const SearchResults = React.forwardRef<HTMLDivElement, SearchResultsProps>(
  (
    {
      results,
      selectedIndex,
      onSelect,
      onHover,
      totalResults,
      executionTimeMs,
      isLoading,
      locale = 'es',
      accentColor,
    },
    ref
  ) => {
    const t = translations[locale];

    // Scroll selected item into view
    React.useEffect(() => {
      if (ref && 'current' in ref && ref.current) {
        const selectedElement = ref.current.querySelector(
          `[data-index="${selectedIndex}"]`
        );
        if (selectedElement) {
          selectedElement.scrollIntoView({
            block: 'nearest',
            behavior: 'smooth',
          });
        }
      }
    }, [selectedIndex, ref]);

    return (
      <div ref={ref} className="p-3 sm:p-4">
        {/* Results Header */}
        {!isLoading && results.length > 0 && (
          <div className="flex items-center justify-between px-2 py-2 mb-2">
            <span className="text-sm text-white/60">
              {totalResults} {totalResults === 1 ? t.resultFound : t.resultsFound}
            </span>
            {executionTimeMs > 0 && (
              <span className="text-xs text-white/30">{executionTimeMs}ms</span>
            )}
          </div>
        )}

        {/* Results List */}
        <div className="space-y-1">
          {results.map((result, index) => (
            <div key={`${result.type}-${result.id}`} data-index={index}>
              <SearchResultItem
                result={result}
                isSelected={index === selectedIndex}
                onClick={() => onSelect(result)}
                onMouseEnter={() => onHover(index)}
                locale={locale}
                accentColor={accentColor}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SearchResults.displayName = 'SearchResults';
