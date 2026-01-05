'use client';

/**
 * KanbanContainer Component - v1.0
 *
 * Main container for Kanban boards with:
 * - Horizontal scroll with snap behavior
 * - Visual scroll indicators (arrows)
 * - Fade gradients at edges
 * - Keyboard navigation support
 * - Responsive design
 *
 * Usage:
 * <KanbanContainer>
 *   <YourKanbanBoard />
 * </KanbanContainer>
 *
 * @module components/kanban/KanbanContainer
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useKanbanScroll, type UseKanbanScrollOptions } from './useKanbanScroll';
import { ScrollHints } from './ScrollHints';

// ============================================
// Types
// ============================================

export interface KanbanContainerProps {
  /** Children (the Kanban board content) */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the scroll area */
  scrollClassName?: string;
  /** Scroll options */
  scrollOptions?: UseKanbanScrollOptions;
  /** Show progress bar at bottom */
  showProgressBar?: boolean;
  /** Enable scroll snap (default: true for desktop, false for mobile) */
  enableScrollSnap?: boolean;
  /** Aria label for the container */
  'aria-label'?: string;
}

// ============================================
// Main Component
// ============================================

export function KanbanContainer({
  children,
  className,
  scrollClassName,
  scrollOptions,
  showProgressBar = false,
  enableScrollSnap = true,
  'aria-label': ariaLabel = 'Tablero Kanban',
}: KanbanContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Use the scroll hook
  const {
    showLeftIndicator,
    showRightIndicator,
    scrollProgress,
    scrollLeft,
    scrollRight,
    scrollToStart,
    scrollToEnd,
    isScrolling,
  } = useKanbanScroll(containerRef, {
    threshold: 20,
    columnWidth: 280,
    columnGap: 16,
    smoothScroll: true,
    ...scrollOptions,
  });

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      // Arrow key navigation
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          scrollToStart();
        } else {
          scrollLeft();
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.metaKey || event.ctrlKey) {
          scrollToEnd();
        } else {
          scrollRight();
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        scrollToStart();
      } else if (event.key === 'End') {
        event.preventDefault();
        scrollToEnd();
      }
    },
    [scrollLeft, scrollRight, scrollToStart, scrollToEnd]
  );

  return (
    <div
      className={cn(
        // Full height container
        'relative h-full w-full',
        // Overflow handling
        'overflow-hidden',
        className
      )}
      role="region"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Minimalist scroll indicators */}
      <ScrollHints
        showLeft={showLeftIndicator}
        showRight={showRightIndicator}
        onScrollLeft={scrollLeft}
        onScrollRight={scrollRight}
        variant="lines"
      />

      {/* Scrollable area */}
      <div
        ref={containerRef}
        className={cn(
          // Full dimensions
          'h-full w-full',
          // Horizontal scroll
          'overflow-x-auto overflow-y-hidden',
          // Scroll snap behavior (optional)
          enableScrollSnap && [
            'snap-x snap-mandatory',
            'scroll-smooth',
          ],
          // Custom scrollbar with auto-hide and dynamic theming
          'scrollbar-kanban',
          // Add is-scrolling class for CSS transitions
          isScrolling && 'is-scrolling',
          // Scroll padding for edge visibility
          'scroll-pl-4 scroll-pr-4',
          // Smooth scrolling
          isScrolling ? 'cursor-grabbing' : 'cursor-default',
          scrollClassName
        )}
        style={{
          // Ensure smooth scroll behavior
          scrollBehavior: 'smooth',
          // Add scroll padding for first/last column visibility
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// Skeleton Loader for Container
// ============================================

export interface KanbanContainerSkeletonProps {
  /** Number of column skeletons to show */
  columns?: number;
  /** Additional CSS classes */
  className?: string;
}

export function KanbanContainerSkeleton({
  columns = 5,
  className,
}: KanbanContainerSkeletonProps) {
  return (
    <div className={cn('h-full w-full overflow-hidden', className)}>
      <div className="inline-flex gap-4 px-4 h-full">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={cn(
              // Column dimensions
              'w-[280px] min-w-[280px] h-full',
              'flex flex-col',
              'rounded-xl',
              'bg-muted/30',
              'animate-pulse'
            )}
          >
            {/* Header skeleton */}
            <div className="h-14 px-3 py-2 border-b border-border/30">
              <div className="h-4 w-24 bg-muted/50 rounded" />
              <div className="h-3 w-12 bg-muted/30 rounded mt-1" />
            </div>
            {/* Cards skeleton */}
            <div className="flex-1 p-2 space-y-2">
              {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
                <div
                  key={j}
                  className="h-24 bg-muted/20 rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KanbanContainer;
