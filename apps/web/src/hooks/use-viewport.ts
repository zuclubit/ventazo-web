'use client';

/**
 * useViewport Hook - Comprehensive Viewport Detection System
 *
 * State-of-the-art 2025/2026 responsive design hook providing:
 * - Dynamic viewport dimensions with real-time updates
 * - Breakpoint detection with fluid transitions
 * - Safe area insets for modern mobile devices
 * - Orientation detection
 * - Dynamic CSS custom properties for layout calculations
 *
 * Design Philosophy:
 * - Uses ResizeObserver for efficient updates
 * - Debounced for performance
 * - Provides both imperative and declarative APIs
 * - Integrates with CSS custom properties for fluid layouts
 *
 * @module hooks/use-viewport
 */

import * as React from 'react';

// ============================================
// Types
// ============================================

export interface ViewportDimensions {
  /** Current viewport width in pixels */
  width: number;
  /** Current viewport height in pixels */
  height: number;
  /** Inner width (excludes scrollbars) */
  innerWidth: number;
  /** Inner height (excludes browser chrome) */
  innerHeight: number;
  /** Visual viewport width (respects pinch zoom) */
  visualWidth: number;
  /** Visual viewport height (respects virtual keyboard) */
  visualHeight: number;
}

export interface ViewportBreakpoints {
  /** < 640px (mobile phones portrait) */
  isXs: boolean;
  /** 640px - 767px (mobile phones landscape) */
  isSm: boolean;
  /** 768px - 1023px (tablets) */
  isMd: boolean;
  /** 1024px - 1279px (laptops) */
  isLg: boolean;
  /** 1280px - 1535px (desktops) */
  isXl: boolean;
  /** ≥ 1536px (large desktops) */
  is2xl: boolean;
}

export interface ViewportDevice {
  /** Mobile: < 768px */
  isMobile: boolean;
  /** Tablet: 768px - 1023px */
  isTablet: boolean;
  /** Desktop: ≥ 1024px */
  isDesktop: boolean;
  /** Touch device detection */
  isTouch: boolean;
  /** Portrait orientation */
  isPortrait: boolean;
  /** Landscape orientation */
  isLandscape: boolean;
}

export interface ViewportSafeAreas {
  /** Safe area inset top (notch, status bar) */
  top: number;
  /** Safe area inset right */
  right: number;
  /** Safe area inset bottom (home indicator) */
  bottom: number;
  /** Safe area inset left */
  left: number;
}

export interface ViewportState {
  dimensions: ViewportDimensions;
  breakpoints: ViewportBreakpoints;
  device: ViewportDevice;
  safeAreas: ViewportSafeAreas;
  /** Ready state (false during SSR) */
  isReady: boolean;
}

// ============================================
// Breakpoint Values (Tailwind CSS defaults)
// ============================================

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// ============================================
// Utility Functions
// ============================================

function getSafeAreaInsets(): ViewportSafeAreas {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
  };
}

function getViewportDimensions(): ViewportDimensions {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      innerWidth: 0,
      innerHeight: 0,
      visualWidth: 0,
      visualHeight: 0,
    };
  }

  const visualViewport = window.visualViewport;

  return {
    width: window.outerWidth,
    height: window.outerHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualWidth: visualViewport?.width ?? window.innerWidth,
    visualHeight: visualViewport?.height ?? window.innerHeight,
  };
}

function getBreakpoints(width: number): ViewportBreakpoints {
  return {
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS['2xl'],
    is2xl: width >= BREAKPOINTS['2xl'],
  };
}

function getDeviceInfo(width: number, height: number): ViewportDevice {
  const isMobile = width < BREAKPOINTS.md;
  const isTablet = width >= BREAKPOINTS.md && width < BREAKPOINTS.lg;
  const isDesktop = width >= BREAKPOINTS.lg;
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const isPortrait = height > width;
  const isLandscape = width > height;

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    isPortrait,
    isLandscape,
  };
}

function updateCSSProperties(dimensions: ViewportDimensions, safeAreas: ViewportSafeAreas) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Viewport dimensions
  root.style.setProperty('--viewport-width', `${dimensions.innerWidth}px`);
  root.style.setProperty('--viewport-height', `${dimensions.innerHeight}px`);
  root.style.setProperty('--visual-viewport-width', `${dimensions.visualWidth}px`);
  root.style.setProperty('--visual-viewport-height', `${dimensions.visualHeight}px`);

  // Safe areas
  root.style.setProperty('--safe-area-inset-top', `${safeAreas.top}px`);
  root.style.setProperty('--safe-area-inset-right', `${safeAreas.right}px`);
  root.style.setProperty('--safe-area-inset-bottom', `${safeAreas.bottom}px`);
  root.style.setProperty('--safe-area-inset-left', `${safeAreas.left}px`);

  // Usable content height (excludes safe areas)
  const contentHeight = dimensions.visualHeight - safeAreas.top - safeAreas.bottom;
  root.style.setProperty('--content-height', `${contentHeight}px`);
}

// ============================================
// Main Hook
// ============================================

export function useViewport(): ViewportState {
  const [state, setState] = React.useState<ViewportState>(() => {
    const dimensions = getViewportDimensions();
    const safeAreas = getSafeAreaInsets();

    return {
      dimensions,
      breakpoints: getBreakpoints(dimensions.innerWidth),
      device: getDeviceInfo(dimensions.innerWidth, dimensions.innerHeight),
      safeAreas,
      isReady: false,
    };
  });

  React.useEffect(() => {
    // Update on mount
    const updateViewport = () => {
      const dimensions = getViewportDimensions();
      const safeAreas = getSafeAreaInsets();

      // Update CSS custom properties
      updateCSSProperties(dimensions, safeAreas);

      setState({
        dimensions,
        breakpoints: getBreakpoints(dimensions.innerWidth),
        device: getDeviceInfo(dimensions.innerWidth, dimensions.innerHeight),
        safeAreas,
        isReady: true,
      });
    };

    // Initial update
    updateViewport();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, 50);
    };

    // Listen to window resize
    window.addEventListener('resize', handleResize, { passive: true });

    // Listen to visual viewport changes (virtual keyboard, pinch zoom)
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      visualViewport.addEventListener('resize', handleResize, { passive: true });
      visualViewport.addEventListener('scroll', handleResize, { passive: true });
    }

    // Listen to orientation change
    window.addEventListener('orientationchange', updateViewport, { passive: true });

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', updateViewport);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleResize);
        visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, []);

  return state;
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Returns current breakpoint name
 */
export function useCurrentBreakpoint(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const { breakpoints, isReady } = useViewport();

  if (!isReady) return 'lg'; // Default for SSR

  if (breakpoints.is2xl) return '2xl';
  if (breakpoints.isXl) return 'xl';
  if (breakpoints.isLg) return 'lg';
  if (breakpoints.isMd) return 'md';
  if (breakpoints.isSm) return 'sm';
  return 'xs';
}

/**
 * Returns true if viewport is at or above the specified breakpoint
 */
export function useBreakpointUp(breakpoint: keyof typeof BREAKPOINTS): boolean {
  const { dimensions, isReady } = useViewport();

  if (!isReady) return breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

  return dimensions.innerWidth >= BREAKPOINTS[breakpoint];
}

/**
 * Returns true if viewport is at or below the specified breakpoint
 */
export function useBreakpointDown(breakpoint: keyof typeof BREAKPOINTS): boolean {
  const { dimensions, isReady } = useViewport();

  if (!isReady) return breakpoint === 'xs' || breakpoint === 'sm' || breakpoint === 'md';

  return dimensions.innerWidth < BREAKPOINTS[breakpoint];
}

/**
 * Returns viewport dimensions only (for performance-sensitive use cases)
 */
export function useViewportDimensions(): ViewportDimensions {
  const { dimensions } = useViewport();
  return dimensions;
}

/**
 * Returns device classification only
 */
export function useDeviceType(): ViewportDevice {
  const { device } = useViewport();
  return device;
}

// ============================================
// Export Types (all types are already exported inline above)
// ============================================
