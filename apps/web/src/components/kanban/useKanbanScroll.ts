'use client';

/**
 * useKanbanScroll Hook - v1.0
 *
 * Manages horizontal scroll state for Kanban boards with:
 * - Left/right scroll detection
 * - Smooth navigation
 * - Scroll snap support
 * - Performance optimized with throttling
 *
 * @module components/kanban/useKanbanScroll
 */

import { useCallback, useEffect, useState, type RefObject } from 'react';

// ============================================
// Types
// ============================================

export interface UseKanbanScrollOptions {
  /** Threshold in pixels to show indicators (default: 20) */
  threshold?: number;
  /** Column width for scroll amount calculation (default: 280) */
  columnWidth?: number;
  /** Gap between columns for scroll calculation (default: 16) */
  columnGap?: number;
  /** Enable smooth scroll behavior (default: true) */
  smoothScroll?: boolean;
}

export interface UseKanbanScrollReturn {
  /** Whether left scroll indicator should be visible */
  showLeftIndicator: boolean;
  /** Whether right scroll indicator should be visible */
  showRightIndicator: boolean;
  /** Current scroll position (0-1 percentage) */
  scrollProgress: number;
  /** Scroll one column to the left */
  scrollLeft: () => void;
  /** Scroll one column to the right */
  scrollRight: () => void;
  /** Scroll to a specific column index */
  scrollToColumn: (index: number) => void;
  /** Scroll to the start of the board */
  scrollToStart: () => void;
  /** Scroll to the end of the board */
  scrollToEnd: () => void;
  /** Whether the container is currently scrolling */
  isScrolling: boolean;
  /** Total number of columns visible */
  visibleColumns: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Throttle function calls for performance
 */
function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

// ============================================
// Main Hook
// ============================================

export function useKanbanScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  options: UseKanbanScrollOptions = {}
): UseKanbanScrollReturn {
  const {
    threshold = 20,
    columnWidth = 280,
    columnGap = 16,
    smoothScroll = true,
  } = options;

  // State
  const [showLeftIndicator, setShowLeftIndicator] = useState(false);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(0);

  // Calculate scroll amounts
  const scrollAmount = columnWidth + columnGap;

  // Update scroll state based on container position
  const updateScrollState = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Update indicators
    setShowLeftIndicator(scrollLeft > threshold);
    setShowRightIndicator(scrollLeft < maxScroll - threshold);

    // Update progress (0-1)
    setScrollProgress(maxScroll > 0 ? scrollLeft / maxScroll : 0);

    // Calculate visible columns
    const visible = Math.floor(clientWidth / scrollAmount);
    setVisibleColumns(visible);
  }, [containerRef, threshold, scrollAmount]);

  // Throttled scroll handler
  const handleScroll = useCallback(
    throttle(() => {
      updateScrollState();
    }, 16), // ~60fps
    [updateScrollState]
  );

  // Track scrolling state
  const handleScrollStart = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleScrollEnd = useCallback(
    throttle(() => {
      setIsScrolling(false);
    }, 150),
    []
  );

  // Scroll navigation functions
  const scrollLeft = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollBy({
      left: -scrollAmount,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [containerRef, scrollAmount, smoothScroll]);

  const scrollRight = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollBy({
      left: scrollAmount,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [containerRef, scrollAmount, smoothScroll]);

  const scrollToColumn = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const targetPosition = index * scrollAmount;
      container.scrollTo({
        left: targetPosition,
        behavior: smoothScroll ? 'smooth' : 'auto',
      });
    },
    [containerRef, scrollAmount, smoothScroll]
  );

  const scrollToStart = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      left: 0,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [containerRef, smoothScroll]);

  const scrollToEnd = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      left: container.scrollWidth,
      behavior: smoothScroll ? 'smooth' : 'auto',
    });
  }, [containerRef, smoothScroll]);

  // Set up scroll event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial state update
    updateScrollState();

    // Event listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('scroll', handleScrollStart, { passive: true });
    container.addEventListener('scroll', handleScrollEnd, { passive: true });

    // ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('scroll', handleScrollStart);
      container.removeEventListener('scroll', handleScrollEnd);
      resizeObserver.disconnect();
    };
  }, [containerRef, handleScroll, handleScrollStart, handleScrollEnd, updateScrollState]);

  return {
    showLeftIndicator,
    showRightIndicator,
    scrollProgress,
    scrollLeft,
    scrollRight,
    scrollToColumn,
    scrollToStart,
    scrollToEnd,
    isScrolling,
    visibleColumns,
  };
}

export default useKanbanScroll;
