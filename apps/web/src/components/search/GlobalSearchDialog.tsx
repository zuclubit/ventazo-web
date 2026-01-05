'use client';

/**
 * GlobalSearchDialog Component - Ventazo Design System 2025
 *
 * Production-ready global search modal with:
 * - React Portal for proper z-index stacking
 * - Body scroll lock when open
 * - Focus trap for accessibility
 * - Responsive: fullscreen mobile, centered modal desktop
 * - ESC key, click outside, X button to close
 * - Smooth animations (150-200ms)
 * - ARIA attributes for accessibility
 *
 * Z-Index Architecture (2025 Best Practices):
 * - Uses centralized z-index tokens from @/lib/theme/z-index
 * - Overlay: z-[90] (globalSearchOverlay) - highest overlay
 * - Content: z-[95] (globalSearch) - above all other modals
 *
 * @module components/search/GlobalSearchDialog
 * @version 2.0.0
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Search, Loader2, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { zIndex } from '@/lib/theme/z-index';
import {
  useGlobalSearch,
  useRecentSearches,
  useSearchLocale,
  SearchEntityType,
  type SearchResultItem,
} from '@/lib/search';

// Import modular primitives
import { SearchFilters } from './primitives/SearchFilters';
import { SearchResults } from './primitives/SearchResults';
import { SearchEmptyState } from './primitives/SearchEmptyState';
import { SearchRecentList } from './primitives/SearchRecentList';
import { SearchFooter } from './primitives/SearchFooter';
import type { EntityFilter } from './types';

// ============================================
// Constants
// ============================================

// Using centralized z-index system for consistency
const Z_INDEX = {
  OVERLAY: zIndex.globalSearchOverlay, // 90
  MODAL: zIndex.globalSearch, // 95
} as const;

const ANIMATION_DURATION = 200; // ms

// ============================================
// Types
// ============================================

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
  locale?: 'es' | 'en';
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to detect viewport size
 */
function useViewport() {
  const [viewport, setViewport] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  React.useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setViewport('mobile');
      } else if (width < 1024) {
        setViewport('tablet');
      } else {
        setViewport('desktop');
      }
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return viewport;
}

/**
 * Hook to lock body scroll
 */
function useBodyScrollLock(lock: boolean) {
  React.useEffect(() => {
    if (!lock) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

    // Calculate scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = originalStyle;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [lock]);
}

/**
 * Hook for focus trap
 */
function useFocusTrap(containerRef: React.RefObject<HTMLDivElement>, enabled: boolean) {
  React.useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [containerRef, enabled]);
}

// ============================================
// Helper Functions
// ============================================

function getResultUrl(result: SearchResultItem): string {
  switch (result.type) {
    case 'lead':
      return `/app/leads?id=${result.id}`;
    case 'contact':
      return `/app/leads?id=${result.leadId}&contact=${result.id}`;
    case 'customer':
      return `/app/customers?id=${result.id}`;
    case 'opportunity':
      return `/app/opportunities?id=${result.id}`;
    case 'task':
      return `/app/tasks?id=${result.id}`;
    case 'communication':
      return `/app/leads?id=${result.leadId}&comm=${result.id}`;
    default:
      return '/app';
  }
}

// ============================================
// GlobalSearchDialog Component
// ============================================

export function GlobalSearchDialog({
  open,
  onClose,
  locale: initialLocale = 'es',
}: GlobalSearchDialogProps) {
  const router = useRouter();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const { primaryColor, isCustomBranding } = useTenantBranding();
  const { t, locale } = useSearchLocale(initialLocale);
  const viewport = useViewport();

  // Animation state
  const [isVisible, setIsVisible] = React.useState(false);
  const [isAnimatingIn, setIsAnimatingIn] = React.useState(false);

  // Search state
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [activeFilter, setActiveFilter] = React.useState<EntityFilter>('all');

  // Hooks
  useBodyScrollLock(open);
  useFocusTrap(containerRef, open);

  // Search hook
  const {
    query,
    setQuery,
    isSearching,
    results,
    totalResults,
    executionTimeMs,
    clearResults,
  } = useGlobalSearch({
    debounceMs: 300,
    minQueryLength: 2,
    limit: 20,
    entityTypes: activeFilter === 'all' ? undefined : [activeFilter as SearchEntityType],
  });

  // Recent searches
  const { recentSearches } = useRecentSearches();

  // Filter results
  const filteredResults = React.useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter((r) => r.type === activeFilter);
  }, [results, activeFilter]);

  // Handle open/close animations
  React.useEffect(() => {
    if (open) {
      setIsVisible(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimatingIn(true);
        });
      });
      // Focus input after animation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, ANIMATION_DURATION + 50);
      return () => clearTimeout(timer);
    } else {
      setIsAnimatingIn(false);
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
        clearResults();
        setSelectedIndex(0);
        setActiveFilter('all');
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [open, clearResults]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Handle ESC key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i < filteredResults.length - 1 ? i + 1 : 0));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i > 0 ? i - 1 : filteredResults.length - 1));
      }
      if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredResults[selectedIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose, filteredResults, selectedIndex]);

  // Handle selection
  const handleSelect = React.useCallback(
    (result: SearchResultItem) => {
      const url = getResultUrl(result);
      router.push(url);
      onClose();
    },
    [router, onClose]
  );

  // Handle recent search selection
  const handleRecentSelect = React.useCallback(
    (search: { query: string }) => {
      setQuery(search.query);
    },
    [setQuery]
  );

  // Handle filter change
  const handleFilterChange = React.useCallback((filter: EntityFilter) => {
    setActiveFilter(filter);
  }, []);

  // Handle backdrop click
  const handleBackdropClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Accent color
  const accentColor = isCustomBranding ? primaryColor : undefined;

  // Determine content visibility
  const showResults = query.length >= 2;
  const showRecent = !showResults && recentSearches.length > 0;
  const showEmpty = showResults && !isSearching && filteredResults.length === 0;
  const showInitial = !showResults && !showRecent;

  // Viewport-specific styles
  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';

  // Don't render if not visible
  if (!isVisible) return null;

  // Modal content
  const modalContent = (
    <>
      {/* ============================================ */}
      {/* Backdrop/Overlay */}
      {/* ============================================ */}
      <div
        className={cn(
          'fixed inset-0',
          'bg-black/80 backdrop-blur-sm',
          'transition-opacity duration-200',
          isAnimatingIn ? 'opacity-100' : 'opacity-0'
        )}
        style={{ zIndex: Z_INDEX.OVERLAY }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* ============================================ */}
      {/* Modal Container */}
      {/* ============================================ */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-dialog-title"
        className={cn(
          'fixed',
          // Mobile: Fullscreen
          isMobile && [
            'inset-0',
            'transition-transform duration-200 ease-out',
            isAnimatingIn ? 'translate-y-0' : 'translate-y-full',
          ],
          // Tablet: 80% width, centered
          isTablet && [
            'top-1/2 left-1/2',
            'w-[80%] max-h-[70vh]',
            'transition-all duration-200 ease-out',
            isAnimatingIn
              ? 'opacity-100 scale-100 -translate-x-1/2 -translate-y-1/2'
              : 'opacity-0 scale-95 -translate-x-1/2 -translate-y-1/2',
          ],
          // Desktop: max-width 600px, centered
          !isMobile && !isTablet && [
            'top-1/2 left-1/2',
            'w-full max-w-[600px] max-h-[60vh]',
            'transition-all duration-200 ease-out',
            isAnimatingIn
              ? 'opacity-100 scale-100 -translate-x-1/2 -translate-y-1/2'
              : 'opacity-0 scale-95 -translate-x-1/2 -translate-y-1/2',
          ]
        )}
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        {/* ============================================ */}
        {/* Modal Content */}
        {/* ============================================ */}
        <div
          className={cn(
            'flex flex-col h-full',
            'overflow-hidden',
            // Background - Glassmorphism
            'bg-slate-900/95 backdrop-blur-xl',
            // Border & Shadow (non-mobile)
            !isMobile && [
              'border border-white/10',
              'shadow-2xl shadow-black/60',
              'rounded-2xl',
            ],
            // Mobile: safe area padding
            isMobile && 'pt-safe'
          )}
        >
          {/* ============================================ */}
          {/* Header */}
          {/* ============================================ */}
          <div className="flex-shrink-0 relative">
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>
            )}

            {/* Search Input Row - Premium Glass Design */}
            <div className="px-4 pt-4 pb-3">
              {/* Input Container with Glass Effect */}
              <div
                className={cn(
                  'flex items-center gap-3',
                  'px-4 py-3 rounded-xl',
                  // Glass background
                  'bg-white/[0.06] backdrop-blur-sm',
                  // Border with focus enhancement
                  'border border-white/10',
                  'focus-within:border-[var(--tenant-primary,#0EB58C)]/50',
                  'focus-within:ring-2 focus-within:ring-[var(--tenant-primary,#0EB58C)]/20',
                  // Smooth transition
                  'transition-all duration-200 ease-out'
                )}
              >
                {/* Search Icon / Loader */}
                <div className="flex-shrink-0">
                  {isSearching ? (
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: accentColor || 'var(--tenant-primary, #0EB58C)' }}
                    />
                  ) : (
                    <Search
                      className={cn(
                        'w-5 h-5 transition-colors duration-200',
                        query ? 'text-[var(--tenant-primary,#0EB58C)]' : 'text-white/40'
                      )}
                    />
                  )}
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  id="search-dialog-title"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.placeholder}
                  className={cn(
                    'flex-1 bg-transparent outline-none',
                    'text-white placeholder-white/40',
                    'text-base font-medium',
                    'min-w-0',
                    // Caret color matches brand
                    'caret-[var(--tenant-primary,#0EB58C)]'
                  )}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Clear query */}
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className={cn(
                        'p-2 rounded-lg',
                        'bg-white/5 hover:bg-white/10 active:bg-white/15',
                        'text-white/50 hover:text-white',
                        'transition-all duration-150 active:scale-95'
                      )}
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Keyboard hint - desktop only */}
                  {!isMobile && !query && (
                    <kbd
                      className={cn(
                        'hidden sm:flex items-center gap-0.5',
                        'px-2 py-1 text-[11px] font-medium',
                        'text-white/35 bg-white/5 rounded-md',
                        'border border-white/10'
                      )}
                    >
                      <span>ESC</span>
                    </kbd>
                  )}
                </div>
              </div>
            </div>

            {/* Close button - Top right absolute */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-4 right-4',
                'p-2 rounded-xl',
                'bg-white/5 hover:bg-white/10 active:bg-white/15',
                'text-white/50 hover:text-white',
                'transition-all duration-150 active:scale-95',
                'border border-white/10 hover:border-white/20',
                // Hide on mobile since we have drag handle
                isMobile && 'hidden'
              )}
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ============================================ */}
          {/* Entity Filters */}
          {/* ============================================ */}
          <SearchFilters
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            locale={locale}
            accentColor={accentColor}
          />

          {/* ============================================ */}
          {/* Scrollable Content */}
          {/* ============================================ */}
          <div
            className={cn(
              'flex-1 overflow-y-auto overscroll-contain',
              'scroll-smooth',
              // Custom scrollbar
              '[&::-webkit-scrollbar]:w-1.5',
              '[&::-webkit-scrollbar-track]:bg-transparent',
              '[&::-webkit-scrollbar-thumb]:bg-white/10',
              '[&::-webkit-scrollbar-thumb]:rounded-full',
              '[&::-webkit-scrollbar-thumb:hover]:bg-white/20'
            )}
          >
            {/* Search Results */}
            {showResults && !showEmpty && (
              <SearchResults
                ref={resultsRef}
                results={filteredResults}
                selectedIndex={selectedIndex}
                onSelect={handleSelect}
                onHover={setSelectedIndex}
                totalResults={totalResults}
                executionTimeMs={executionTimeMs}
                isLoading={isSearching}
                locale={locale}
                accentColor={accentColor}
              />
            )}

            {/* Recent Searches */}
            {showRecent && (
              <SearchRecentList
                searches={recentSearches.map((s) => ({
                  ...s,
                  searchedAt: new Date(s.searchedAt),
                }))}
                onSelect={handleRecentSelect}
                locale={locale}
              />
            )}

            {/* Empty / Initial State */}
            {(showEmpty || showInitial) && (
              <SearchEmptyState
                query={showEmpty ? query : ''}
                onSuggestionClick={setQuery}
                locale={locale}
                accentColor={accentColor}
              />
            )}
          </div>

          {/* ============================================ */}
          {/* Footer (Non-mobile) */}
          {/* ============================================ */}
          {!isMobile && <SearchFooter locale={locale} />}

          {/* ============================================ */}
          {/* Mobile Safe Area */}
          {/* ============================================ */}
          {isMobile && <div className="flex-shrink-0 pb-safe" />}
        </div>
      </div>
    </>
  );

  // Use portal to render at document.body level
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}

GlobalSearchDialog.displayName = 'GlobalSearchDialog';
