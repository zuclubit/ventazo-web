'use client';

/**
 * BaseCard - Ventazo Design System 2025
 *
 * @description Flexible, themeable card component using semantic tokens.
 * NOT a "card monstruo" - focused on structure and styling only.
 * Module-specific logic should be composed on top.
 *
 * @features
 * - CVA-based variants
 * - Semantic token integration
 * - Compound component pattern
 * - Interactive states (loading, selected, disabled)
 * - WCAG 2.1 AA compliant focus states
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================
// Card Variants
// ============================================

const baseCardVariants = cva(
  // Base styles
  [
    'relative',
    'rounded-[var(--card-radius-md)]',
    'border',
    'transition-all',
    'duration-[var(--transition-fast)]',
  ],
  {
    variants: {
      variant: {
        // Default card with subtle shadow
        default: [
          'bg-card',
          'border-border/50',
          'shadow-[var(--card-shadow-base)]',
        ],
        // Interactive card with hover effects
        interactive: [
          'bg-card',
          'border-border/50',
          'shadow-[var(--card-shadow-base)]',
          'cursor-pointer',
          'hover:shadow-[var(--card-shadow-hover)]',
          'hover:border-[color-mix(in_srgb,var(--tenant-primary)_30%,transparent)]',
          'hover:-translate-y-0.5',
          'active:translate-y-0',
          'active:shadow-[var(--card-shadow-base)]',
        ],
        // Elevated card with stronger shadow
        elevated: [
          'bg-card',
          'border-border/30',
          'shadow-[var(--card-shadow-elevated)]',
        ],
        // Glass morphism style
        glass: [
          'backdrop-blur-[var(--glass-blur)]',
          'bg-[var(--glass-background)]',
          'border-[var(--glass-border-color)]',
          'shadow-[var(--glass-shadow)]',
        ],
        // Kanban card style (matches kanban-card-ventazo)
        kanban: [
          'kanban-card-ventazo',
          'bg-card',
          'border-border/50',
          'shadow-[var(--card-shadow-base)]',
        ],
        // KPI/Metric card
        kpi: [
          'bg-card',
          'border-border/30',
          'shadow-[var(--card-shadow-base)]',
          'hover:shadow-[var(--card-shadow-hover)]',
          'hover:border-[color-mix(in_srgb,var(--tenant-primary)_20%,transparent)]',
          'transition-all duration-[var(--transition-normal)]',
        ],
        // Ghost card (minimal styling)
        ghost: [
          'bg-transparent',
          'border-transparent',
          'shadow-none',
        ],
        // Outline only
        outline: [
          'bg-transparent',
          'border-border',
          'shadow-none',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-[var(--card-padding-sm)]',
        md: 'p-[var(--card-padding-md)]',
        lg: 'p-[var(--card-padding-lg)]',
      },
      // For selected/focus states
      ring: {
        none: '',
        primary: [
          'ring-2',
          'ring-[var(--tenant-primary)]',
          'ring-offset-2',
          'ring-offset-background',
        ],
        accent: [
          'ring-2',
          'ring-[var(--tenant-accent)]',
          'ring-offset-2',
          'ring-offset-background',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      ring: 'none',
    },
  }
);

// ============================================
// Types
// ============================================

export interface BaseCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof baseCardVariants> {
  /** Loading state - shows overlay spinner */
  isLoading?: boolean;
  /** Selected state - adds ring */
  isSelected?: boolean;
  /** Disabled state */
  isDisabled?: boolean;
  /** Dragging state (for DnD) */
  isDragging?: boolean;
  /** As child element */
  asChild?: boolean;
}

// ============================================
// BaseCard Component
// ============================================

const BaseCard = React.forwardRef<HTMLDivElement, BaseCardProps>(
  (
    {
      className,
      variant,
      padding,
      ring,
      isLoading = false,
      isSelected = false,
      isDisabled = false,
      isDragging = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          baseCardVariants({
            variant,
            padding,
            ring: isSelected ? 'primary' : ring,
          }),
          // Dragging styles
          isDragging && [
            'opacity-90',
            'shadow-[var(--card-shadow-dragging)]',
            'border-[var(--tenant-primary)]',
            'rotate-2',
            'scale-105',
            'z-50',
          ],
          // Disabled styles
          isDisabled && 'opacity-50 pointer-events-none',
          // Loading styles (pointer events still work)
          isLoading && 'opacity-70',
          className
        )}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {children}

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-[inherit] z-10">
            <div className="h-5 w-5 border-2 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }
);

BaseCard.displayName = 'BaseCard';

// ============================================
// Compound Components
// ============================================

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Compact header with less padding */
  compact?: boolean;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, compact = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col gap-1',
        compact ? 'pb-2' : 'pb-3',
        className
      )}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'font-semibold text-sm leading-tight text-foreground line-clamp-1',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-xs text-muted-foreground line-clamp-1',
      className
    )}
    {...props}
  />
));

CardSubtitle.displayName = 'CardSubtitle';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('', className)}
    {...props}
  />
));

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Separator line above footer */
  separator?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, separator = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-2 pt-3',
        separator && 'border-t border-border/50 mt-3',
        className
      )}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

// ============================================
// Card Row Layout Helper
// ============================================

interface CardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Align items */
  align?: 'start' | 'center' | 'end';
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
}

const CardRow = React.forwardRef<HTMLDivElement, CardRowProps>(
  ({ className, align = 'center', justify = 'start', gap = 'md', ...props }, ref) => {
    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
    };

    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    const gapClasses = {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          alignClasses[align],
          justifyClasses[justify],
          gapClasses[gap],
          className
        )}
        {...props}
      />
    );
  }
);

CardRow.displayName = 'CardRow';

// ============================================
// Exports
// ============================================

export {
  BaseCard,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardFooter,
  CardRow,
  baseCardVariants,
};

export type {
  CardHeaderProps,
  CardFooterProps,
  CardRowProps,
};
