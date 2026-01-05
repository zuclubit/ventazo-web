'use client';

/**
 * useMobileDetection - Centralized mobile/tablet detection
 *
 * OPTIMIZATION: Instead of each KanbanCard having its own resize listener,
 * we provide a single listener at the app level via Context.
 *
 * Before: n cards = n resize listeners
 * After: 1 listener for entire app
 *
 * @see docs/RESOURCE_OPTIMIZATION_REPORT.md (P0-1)
 */

import * as React from 'react';

interface MobileDetectionContextValue {
  /** True if viewport < 1024px (lg breakpoint) */
  isMobile: boolean;
  /** True if viewport < 768px (md breakpoint) */
  isSmallMobile: boolean;
  /** True if viewport >= 1024px */
  isDesktop: boolean;
}

const MobileDetectionContext = React.createContext<MobileDetectionContextValue | null>(null);

// Debounce helper
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

interface MobileDetectionProviderProps {
  children: React.ReactNode;
}

export function MobileDetectionProvider({ children }: MobileDetectionProviderProps) {
  const [state, setState] = React.useState<MobileDetectionContextValue>(() => {
    // SSR safe - default to desktop
    if (typeof window === 'undefined') {
      return { isMobile: false, isSmallMobile: false, isDesktop: true };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < 1024,
      isSmallMobile: width < 768,
      isDesktop: width >= 1024,
    };
  });

  React.useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 1024,
        isSmallMobile: width < 768,
        isDesktop: width >= 1024,
      });
    };

    // Initial check
    checkViewport();

    // Debounced resize handler (150ms)
    const debouncedCheck = debounce(checkViewport, 150);

    window.addEventListener('resize', debouncedCheck);
    return () => window.removeEventListener('resize', debouncedCheck);
  }, []);

  return (
    <MobileDetectionContext.Provider value={state}>
      {children}
    </MobileDetectionContext.Provider>
  );
}

/**
 * Hook to get mobile detection state
 * Must be used within MobileDetectionProvider
 */
export function useMobileDetection(): MobileDetectionContextValue {
  const context = React.useContext(MobileDetectionContext);
  if (!context) {
    // Fallback for components outside provider
    // This shouldn't happen in production but provides safety
    if (typeof window === 'undefined') {
      return { isMobile: false, isSmallMobile: false, isDesktop: true };
    }
    const width = window.innerWidth;
    return {
      isMobile: width < 1024,
      isSmallMobile: width < 768,
      isDesktop: width >= 1024,
    };
  }
  return context;
}

/**
 * Optional hook that doesn't throw if outside provider
 */
export function useMobileDetectionOptional(): MobileDetectionContextValue | null {
  return React.useContext(MobileDetectionContext);
}
