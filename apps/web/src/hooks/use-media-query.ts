'use client';

import * as React from 'react';

/**
 * useMediaQuery Hook
 *
 * Returns true if the media query matches.
 * Uses window.matchMedia for accurate CSS media query matching.
 *
 * @param query - CSS media query string (e.g., "(max-width: 768px)")
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    // Check if we're on the client
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Define listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener
    // Use addEventListener for modern browsers, addListener for older ones
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }

    // Cleanup
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        media.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
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
