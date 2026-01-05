/**
 * useResponsiveDrawer Hook - Ventazo 2025 Design System
 *
 * @description Provides responsive drawer behavior detection and configuration.
 * Determines optimal drawer size and behavior based on viewport.
 *
 * @features
 * - SSR-safe media query detection
 * - Debounced resize handling
 * - Preset configurations for common use cases
 *
 * @version 1.0.0
 */

'use client';

import * as React from 'react';

// ============================================
// Types
// ============================================

export type DrawerPreset = 'detail' | 'form' | 'preview' | 'full';

export interface DrawerConfig {
  /** Use full-screen mode on mobile */
  mobileFullScreen: boolean;
  /** Sheet size on desktop */
  size: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show drag handle for mobile */
  showDragHandle: boolean;
  /** Current viewport is mobile */
  isMobile: boolean;
}

// ============================================
// Preset Configurations
// ============================================

const DRAWER_PRESETS: Record<DrawerPreset, Omit<DrawerConfig, 'isMobile'>> = {
  // Detail views (leads, opportunities, customers)
  detail: {
    mobileFullScreen: true,
    size: 'lg',
    showDragHandle: true,
  },
  // Form dialogs (create, edit)
  form: {
    mobileFullScreen: true,
    size: 'md',
    showDragHandle: true,
  },
  // Quick preview panels
  preview: {
    mobileFullScreen: false,
    size: 'sm',
    showDragHandle: false,
  },
  // Full-screen overlays
  full: {
    mobileFullScreen: true,
    size: 'full',
    showDragHandle: false,
  },
};

// ============================================
// Mobile Breakpoint (matches Tailwind's sm)
// ============================================

const MOBILE_BREAKPOINT = 640;

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to get responsive drawer configuration
 *
 * @param preset - Drawer preset type
 * @returns DrawerConfig with responsive settings
 *
 * @example
 * const { mobileFullScreen, size, showDragHandle, isMobile } = useResponsiveDrawer('detail');
 *
 * <SheetContent
 *   mobileFullScreen={mobileFullScreen}
 *   size={size}
 *   showDragHandle={showDragHandle}
 * >
 *   ...
 * </SheetContent>
 */
export function useResponsiveDrawer(preset: DrawerPreset = 'detail'): DrawerConfig {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Check initial viewport
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const presetConfig = DRAWER_PRESETS[preset];

  return {
    ...presetConfig,
    isMobile,
  };
}

// ============================================
// SSR-Safe Media Query Hook
// ============================================

/**
 * Hook to detect if a media query matches
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    // Initial check
    setMatches(mediaQuery.matches);

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * Hook to check if viewport is mobile
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

/**
 * Hook to check if viewport is tablet
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 640px) and (max-width: 1023px)');
}

/**
 * Hook to check if viewport is desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

// ============================================
// Drawer Props Helper
// ============================================

/**
 * Get Sheet props for a specific preset
 *
 * @param preset - Drawer preset type
 * @returns Object with Sheet component props
 *
 * @example
 * const drawerProps = getDrawerProps('detail');
 * <SheetContent {...drawerProps}>...</SheetContent>
 */
export function getDrawerProps(preset: DrawerPreset = 'detail'): Omit<DrawerConfig, 'isMobile'> {
  return DRAWER_PRESETS[preset];
}
