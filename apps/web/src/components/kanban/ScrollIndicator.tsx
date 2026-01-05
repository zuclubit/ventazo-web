'use client';

/**
 * ScrollIndicator Component - v1.0
 *
 * Visual indicators for horizontal scroll navigation in Kanban boards.
 * Features glassmorphism design with smooth animations.
 *
 * @module components/kanban/ScrollIndicator
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type ScrollIndicatorDirection = 'left' | 'right';

export interface ScrollIndicatorProps {
  /** Direction of the indicator */
  direction: ScrollIndicatorDirection;
  /** Whether the indicator is visible */
  visible: boolean;
  /** Click handler for navigation */
  onClick: () => void;
  /** Double-click to jump to start/end */
  onDoubleClick?: () => void;
  /** Tooltip text */
  tooltip?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show double-chevron for jump to edge */
  showJumpIcon?: boolean;
}

// ============================================
// Size Configurations
// ============================================

const SIZE_CLASSES = {
  sm: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
    gradient: 'w-6',
  },
  md: {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
    gradient: 'w-8',
  },
  lg: {
    button: 'h-12 w-12',
    icon: 'h-6 w-6',
    gradient: 'w-12',
  },
} as const;

// ============================================
// Main Component
// ============================================

export function ScrollIndicator({
  direction,
  visible,
  onClick,
  onDoubleClick,
  tooltip,
  className,
  size = 'md',
  showJumpIcon = false,
}: ScrollIndicatorProps) {
  const isLeft = direction === 'left';
  const sizeConfig = SIZE_CLASSES[size];

  // Choose icon based on direction and jump mode
  const Icon = showJumpIcon
    ? isLeft
      ? ChevronsLeft
      : ChevronsRight
    : isLeft
      ? ChevronLeft
      : ChevronRight;

  return (
    <div
      className={cn(
        // Position
        'absolute top-0 bottom-0 z-30',
        'flex items-center',
        // Direction-specific positioning
        isLeft ? 'left-0' : 'right-0',
        // Visibility transition
        'transition-all duration-300 ease-out',
        visible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none',
        // Transform for slide effect
        visible
          ? 'translate-x-0'
          : isLeft
            ? '-translate-x-4'
            : 'translate-x-4',
        className
      )}
      aria-hidden={!visible}
    >
      {/* Gradient fade effect - uses CSS variable for proper dark mode support */}
      <div
        className={cn(
          'absolute inset-y-0',
          sizeConfig.gradient,
          isLeft ? 'left-0' : 'right-0',
          'pointer-events-none'
        )}
        style={{
          background: isLeft
            ? 'linear-gradient(to right, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 40%, transparent 100%)'
            : 'linear-gradient(to left, hsl(var(--background)) 0%, hsl(var(--background) / 0.8) 40%, transparent 100%)'
        }}
        aria-hidden="true"
      />

      {/* Button */}
      <button
        type="button"
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        className={cn(
          // Size
          sizeConfig.button,
          // Layout
          'flex items-center justify-center',
          // Position adjustment
          isLeft ? 'ml-1.5' : 'mr-1.5',
          // Shape
          'rounded-full',
          // Glass morphism background - dark mode aware
          'bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm',
          // Border - subtle in dark mode
          'border border-gray-200/50 dark:border-white/10',
          // Shadow for depth
          'shadow-lg shadow-black/10 dark:shadow-black/30',
          // Focus ring
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          // Hover state
          'hover:bg-white hover:dark:bg-zinc-800 hover:border-gray-300 hover:dark:border-white/20 hover:shadow-xl',
          'hover:scale-105',
          // Active state
          'active:scale-95 active:shadow-md',
          // Transition
          'transition-all duration-200 ease-out',
          // Text color
          'text-gray-600 dark:text-gray-400 hover:text-gray-900 hover:dark:text-white'
        )}
        aria-label={tooltip || `Scroll ${direction}`}
        title={tooltip}
      >
        <Icon className={cn(sizeConfig.icon, 'transition-transform')} />
      </button>
    </div>
  );
}

// ============================================
// Compact Version (for tight spaces)
// ============================================

export interface CompactScrollIndicatorProps {
  showLeft: boolean;
  showRight: boolean;
  onScrollLeft: () => void;
  onScrollRight: () => void;
  onJumpToStart?: () => void;
  onJumpToEnd?: () => void;
  className?: string;
}

export function CompactScrollIndicators({
  showLeft,
  showRight,
  onScrollLeft,
  onScrollRight,
  onJumpToStart,
  onJumpToEnd,
  className,
}: CompactScrollIndicatorProps) {
  return (
    <>
      <ScrollIndicator
        direction="left"
        visible={showLeft}
        onClick={onScrollLeft}
        onDoubleClick={onJumpToStart}
        tooltip="Scroll izquierda (doble-clic: inicio)"
        size="md"
        className={className}
      />
      <ScrollIndicator
        direction="right"
        visible={showRight}
        onClick={onScrollRight}
        onDoubleClick={onJumpToEnd}
        tooltip="Scroll derecha (doble-clic: final)"
        size="md"
        className={className}
      />
    </>
  );
}

// ============================================
// Progress Bar (Optional)
// ============================================

export interface ScrollProgressBarProps {
  /** Progress value from 0 to 1 */
  progress: number;
  /** Whether the bar is visible */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ScrollProgressBar({
  progress,
  visible = true,
  className,
}: ScrollProgressBarProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 h-0.5',
        'bg-border/30',
        'transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Scroll progress"
    >
      <div
        className={cn(
          'h-full bg-primary/50',
          'transition-[width] duration-150 ease-out'
        )}
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export default ScrollIndicator;
