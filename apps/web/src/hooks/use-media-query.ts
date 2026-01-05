'use client';

import * as React from 'react';

/**
 * useMediaQuery Hook
 *
 * Returns true if the media query matches.
 * Uses useSyncExternalStore for proper SSR hydration without layout shift.
 *
 * For SSR, assumes desktop viewport (min-width queries return true) since
 * CRM applications are typically used on desktop devices.
 *
 * @param query - CSS media query string (e.g., "(min-width: 768px)")
 * @param serverDefault - Optional explicit default for SSR (auto-detected if not provided)
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string, serverDefault?: boolean): boolean {
  // Determine a sensible SSR default based on the query pattern
  // For CRM apps, we assume desktop-first since most users are on desktop
  const getServerSnapshot = React.useCallback((): boolean => {
    if (serverDefault !== undefined) return serverDefault;
    // For (min-width: Xpx) queries, assume desktop → true
    if (query.includes('min-width')) return true;
    // For (max-width: Xpx) queries, assume desktop → false
    return false;
  }, [query, serverDefault]);

  // Subscribe to media query changes
  const subscribe = React.useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {};

      const media = window.matchMedia(query);

      // Use addEventListener for modern browsers, addListener for older ones
      if (media.addEventListener) {
        media.addEventListener('change', callback);
      } else {
        media.addListener(callback);
      }

      return () => {
        if (media.removeEventListener) {
          media.removeEventListener('change', callback);
        } else {
          media.removeListener(callback);
        }
      };
    },
    [query]
  );

  // Get current snapshot from browser
  const getSnapshot = React.useCallback((): boolean => {
    if (typeof window === 'undefined') return getServerSnapshot();
    return window.matchMedia(query).matches;
  }, [query, getServerSnapshot]);

  // useSyncExternalStore ensures consistent SSR/CSR hydration
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * useIsMobile Hook
 *
 * Convenience hook that returns true if viewport is mobile sized.
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/**
 * useIsTablet Hook
 *
 * Returns true if viewport is tablet sized.
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

/**
 * useIsDesktop Hook
 *
 * Returns true if viewport is desktop sized.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}
