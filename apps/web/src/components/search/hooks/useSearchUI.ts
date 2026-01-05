/**
 * useSearchUI Hook - Ventazo Design System 2025
 *
 * @description Provides responsive search UI configuration.
 * Determines optimal variant (bottom-sheet vs modal) based on viewport.
 *
 * @features
 * - SSR-safe media query detection
 * - Auto-detects mobile/tablet/desktop
 * - Returns optimal animation durations
 * - Touch target size recommendations
 *
 * @module components/search/hooks/useSearchUI
 */

'use client';

import * as React from 'react';
import type { SearchUIConfig, SearchVariant } from '../types';

// ============================================
// Breakpoints (matches Tailwind)
// ============================================

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

// ============================================
// Animation Durations
// ============================================

const ANIMATION_DURATIONS = {
  mobile: 300,
  tablet: 250,
  desktop: 200,
} as const;

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook to get responsive search UI configuration
 *
 * @returns SearchUIConfig with responsive settings
 *
 * @example
 * const { variant, isMobile, animationDuration } = useSearchUI();
 *
 * // Render different variants
 * {variant === 'bottom-sheet' ? (
 *   <SearchBottomSheet />
 * ) : (
 *   <SearchModal />
 * )}
 */
export function useSearchUI(): SearchUIConfig {
  const [config, setConfig] = React.useState<SearchUIConfig>({
    variant: 'modal',
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    animationDuration: ANIMATION_DURATIONS.desktop,
    touchTargetSize: 'default',
  });

  React.useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;

      const isMobile = width < BREAKPOINTS.sm;
      const isTablet = width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg;
      const isDesktop = width >= BREAKPOINTS.lg;

      // Determine variant: bottom-sheet for mobile, modal for tablet/desktop
      const variant: SearchVariant = isMobile ? 'bottom-sheet' : 'modal';

      // Animation duration based on viewport
      const animationDuration = isMobile
        ? ANIMATION_DURATIONS.mobile
        : isTablet
        ? ANIMATION_DURATIONS.tablet
        : ANIMATION_DURATIONS.desktop;

      // Touch targets larger on mobile/tablet
      const touchTargetSize = isMobile || isTablet ? 'large' : 'default';

      setConfig({
        variant,
        isMobile,
        isTablet,
        isDesktop,
        animationDuration,
        touchTargetSize,
      });
    };

    // Initial check
    updateConfig();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateConfig, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return config;
}

// ============================================
// Additional Hooks
// ============================================

/**
 * Hook to detect if we should use bottom sheet
 */
export function useIsBottomSheet(): boolean {
  const { variant } = useSearchUI();
  return variant === 'bottom-sheet';
}

/**
 * Hook to get search animation duration
 */
export function useSearchAnimationDuration(): number {
  const { animationDuration } = useSearchUI();
  return animationDuration;
}

/**
 * Hook to get viewport type
 */
export function useViewportType(): 'mobile' | 'tablet' | 'desktop' {
  const { isMobile, isTablet } = useSearchUI();
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}
