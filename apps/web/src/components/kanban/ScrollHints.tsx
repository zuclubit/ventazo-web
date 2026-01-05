'use client';

/**
 * ScrollHints Component - Minimalist scroll indicators
 *
 * State-of-the-art, non-intrusive scroll indicators that:
 * - Use tenant dynamic colors
 * - Are fully responsive (mobile/tablet/desktop)
 * - Don't obstruct content
 * - Animate smoothly
 * - Support touch devices
 *
 * @module components/kanban/ScrollHints
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface ScrollHintsProps {
  /** Show left indicator */
  showLeft: boolean;
  /** Show right indicator */
  showRight: boolean;
  /** Optional click handlers for navigation */
  onScrollLeft?: () => void;
  onScrollRight?: () => void;
  /** Variant style */
  variant?: 'dots' | 'lines' | 'gradient' | 'chevron';
  /** Size */
  size?: 'sm' | 'md';
  /** Additional classes */
  className?: string;
}

// ============================================
// Minimalist Dot Indicators
// ============================================

function DotIndicator({
  direction,
  visible,
  onClick,
  size = 'md'
}: {
  direction: 'left' | 'right';
  visible: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const isLeft = direction === 'left';
  const sizeClasses = size === 'sm' ? 'w-1.5 h-8' : 'w-2 h-10';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      className={cn(
        // Position
        'absolute top-1/2 -translate-y-1/2 z-30',
        isLeft ? 'left-1' : 'right-1',
        // Size
        sizeClasses,
        // Shape
        'rounded-full',
        // Background - uses tenant primary with transparency
        'bg-[var(--tenant-primary,#0EB58C)]',
        // Visibility & animation
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-40 hover:opacity-70 scale-100'
          : 'opacity-0 scale-75 pointer-events-none',
        // Hover effect
        'hover:scale-110',
        // Focus
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        // Cursor
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      aria-label={`Scroll ${direction}`}
      aria-hidden={!visible}
    />
  );
}

// ============================================
// Line Indicators (More subtle)
// ============================================

function LineIndicator({
  direction,
  visible,
  size = 'md'
}: {
  direction: 'left' | 'right';
  visible: boolean;
  size?: 'sm' | 'md';
}) {
  const isLeft = direction === 'left';
  const height = size === 'sm' ? 'h-12' : 'h-16';

  return (
    <div
      className={cn(
        // Position
        'absolute top-1/2 -translate-y-1/2 z-30',
        isLeft ? 'left-0.5' : 'right-0.5',
        // Size
        'w-0.5',
        height,
        // Shape
        'rounded-full',
        // Background gradient using tenant color
        isLeft
          ? 'bg-gradient-to-b from-transparent via-[var(--tenant-primary,#0EB58C)] to-transparent'
          : 'bg-gradient-to-b from-transparent via-[var(--tenant-primary,#0EB58C)] to-transparent',
        // Visibility
        'transition-all duration-500 ease-out',
        visible
          ? 'opacity-50'
          : 'opacity-0',
        // Pointer
        'pointer-events-none'
      )}
      aria-hidden="true"
    />
  );
}

// ============================================
// Gradient Fade Indicators
// ============================================

function GradientIndicator({
  direction,
  visible
}: {
  direction: 'left' | 'right';
  visible: boolean;
}) {
  const isLeft = direction === 'left';

  return (
    <div
      className={cn(
        // Position
        'absolute inset-y-0 z-20',
        isLeft ? 'left-0' : 'right-0',
        // Size - very subtle
        'w-6',
        // Visibility
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
        // Pointer
        'pointer-events-none'
      )}
      style={{
        background: isLeft
          ? `linear-gradient(to right, color-mix(in srgb, var(--tenant-primary, #0EB58C) 15%, hsl(var(--background))) 0%, transparent 100%)`
          : `linear-gradient(to left, color-mix(in srgb, var(--tenant-primary, #0EB58C) 15%, hsl(var(--background))) 0%, transparent 100%)`
      }}
      aria-hidden="true"
    />
  );
}

// ============================================
// Chevron Indicators (Animated)
// ============================================

function ChevronIndicator({
  direction,
  visible,
  onClick,
  size = 'md'
}: {
  direction: 'left' | 'right';
  visible: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const isLeft = direction === 'left';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!visible}
      className={cn(
        // Position
        'absolute top-1/2 -translate-y-1/2 z-30',
        isLeft ? 'left-0' : 'right-0',
        // Layout
        'flex items-center justify-center',
        // Size
        size === 'sm' ? 'w-6 h-12' : 'w-8 h-14',
        // Background - glass effect
        'backdrop-blur-sm',
        'bg-background/30 dark:bg-background/20',
        // Border
        isLeft
          ? 'rounded-r-lg border-r border-y border-[var(--tenant-primary,#0EB58C)]/20'
          : 'rounded-l-lg border-l border-y border-[var(--tenant-primary,#0EB58C)]/20',
        // Visibility
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 translate-x-0'
          : cn(
              'opacity-0 pointer-events-none',
              isLeft ? '-translate-x-2' : 'translate-x-2'
            ),
        // Hover
        'hover:bg-background/50 dark:hover:bg-background/30',
        'hover:border-[var(--tenant-primary,#0EB58C)]/40',
        // Focus
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--tenant-primary,#0EB58C)]/50',
        // Cursor
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      aria-label={`Scroll ${direction}`}
      aria-hidden={!visible}
    >
      {/* Animated chevron */}
      <svg
        className={cn(
          iconSize,
          'text-[var(--tenant-primary,#0EB58C)]',
          'transition-transform duration-300',
          // Pulse animation on hover
          'group-hover:scale-110',
          // Animate direction
          visible && (isLeft ? 'animate-pulse-left' : 'animate-pulse-right')
        )}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={isLeft ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  );
}

// ============================================
// Main Component
// ============================================

export function ScrollHints({
  showLeft,
  showRight,
  onScrollLeft,
  onScrollRight,
  variant = 'lines',
  size = 'md',
  className,
}: ScrollHintsProps) {
  // Responsive: use dots on mobile, lines on desktop
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-select variant based on device
  const effectiveVariant = isMobile ? 'dots' : variant;

  return (
    <div className={cn('contents', className)}>
      {effectiveVariant === 'dots' && (
        <>
          <DotIndicator
            direction="left"
            visible={showLeft}
            onClick={onScrollLeft}
            size={size}
          />
          <DotIndicator
            direction="right"
            visible={showRight}
            onClick={onScrollRight}
            size={size}
          />
        </>
      )}

      {effectiveVariant === 'lines' && (
        <>
          <LineIndicator direction="left" visible={showLeft} size={size} />
          <LineIndicator direction="right" visible={showRight} size={size} />
        </>
      )}

      {effectiveVariant === 'gradient' && (
        <>
          <GradientIndicator direction="left" visible={showLeft} />
          <GradientIndicator direction="right" visible={showRight} />
        </>
      )}

      {effectiveVariant === 'chevron' && (
        <>
          <ChevronIndicator
            direction="left"
            visible={showLeft}
            onClick={onScrollLeft}
            size={size}
          />
          <ChevronIndicator
            direction="right"
            visible={showRight}
            onClick={onScrollRight}
            size={size}
          />
        </>
      )}
    </div>
  );
}

// ============================================
// Compact preset for tight spaces
// ============================================

export function CompactScrollHints(props: Omit<ScrollHintsProps, 'size'>) {
  return <ScrollHints {...props} size="sm" />;
}

export default ScrollHints;
