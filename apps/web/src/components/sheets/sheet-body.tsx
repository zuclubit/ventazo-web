'use client';

/**
 * SheetBody - Modular Sheet Body Component (v1.0)
 *
 * Scrollable content area for sheet/modal panels.
 * Handles overflow, responsive behavior, and proper spacing.
 *
 * Features:
 * - Flex-1 to fill available space between header and footer
 * - Built-in overflow handling with smooth scrolling
 * - Responsive padding (compact on mobile, comfortable on desktop)
 * - Optional form wrapper for consistent spacing
 * - Safe area support for mobile devices
 * - Theme-aware background options
 *
 * Usage:
 * ```tsx
 * <SheetContent>
 *   <SheetHeader ... />
 *   <SheetBody>
 *     <SheetSection ... />
 *   </SheetBody>
 *   <SheetFooter ... />
 * </SheetContent>
 * ```
 *
 * @version 1.0.0
 * @module components/sheets/sheet-body
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SheetBodyProps {
  /** Content to render inside the body */
  children: React.ReactNode;
  /** Additional className for the container */
  className?: string;
  /** Use as a form element */
  asForm?: boolean;
  /** Form onSubmit handler (only when asForm is true) */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  /** Use compact padding */
  compact?: boolean;
  /** Disable default padding */
  noPadding?: boolean;
  /** Use max-width constraint for large screens */
  constrained?: boolean;
  /** Background variant */
  background?: 'default' | 'muted' | 'none';
}

// ============================================
// Component
// ============================================

export function SheetBody({
  children,
  className,
  asForm = false,
  onSubmit,
  compact = false,
  noPadding = false,
  constrained = false,
  background = 'default',
}: SheetBodyProps) {
  // Background variants
  const backgroundClasses = {
    default: 'bg-white dark:bg-slate-900',
    muted: 'bg-slate-50/50 dark:bg-slate-900/50',
    none: '',
  };

  // Padding classes
  const paddingClasses = noPadding
    ? ''
    : compact
    ? 'px-4 py-4 sm:px-5'
    : 'px-4 py-6 sm:px-6 sm:py-6';

  // Common classes for both form and div
  const commonClasses = cn(
    // Fill available space
    'flex-1',
    // Enable scrolling
    'overflow-y-auto overflow-x-hidden',
    // Smooth scrolling
    'scroll-smooth',
    // Hide scrollbar but keep functionality (webkit)
    'scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700',
    'scrollbar-track-transparent',
    // iOS momentum scrolling
    '-webkit-overflow-scrolling-touch',
    // Background
    backgroundClasses[background],
    // Padding
    paddingClasses,
    // Custom className
    className
  );

  // Content wrapper for constrained mode
  const contentWrapper = constrained ? (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {children}
    </div>
  ) : (
    <div className="space-y-6">{children}</div>
  );

  if (asForm) {
    return (
      <form
        onSubmit={onSubmit}
        className={commonClasses}
      >
        {contentWrapper}
      </form>
    );
  }

  return (
    <div className={commonClasses}>
      {contentWrapper}
    </div>
  );
}

// ============================================
// Subcomponents
// ============================================

/**
 * SheetBodySection - A wrapper for grouping related content with spacing
 */
export interface SheetBodySectionProps {
  children: React.ReactNode;
  className?: string;
  /** Add a separator line after this section */
  withSeparator?: boolean;
}

export function SheetBodySection({
  children,
  className,
  withSeparator = false,
}: SheetBodySectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
      {withSeparator && (
        <div className="border-t border-slate-200/60 dark:border-slate-700/50 mt-6" />
      )}
    </div>
  );
}

export default SheetBody;
