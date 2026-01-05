import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Input Component Variants - Premium Form Input Styling
 *
 * Features:
 * - High contrast text colors in both light and dark modes
 * - Solid backgrounds for readability (no transparent backgrounds in forms)
 * - Micro-interactions on focus and hover
 * - WCAG AA compliant contrast ratios
 * - Smooth transitions for all interactive states
 */
const inputVariants = cva(
  // Base styles with high-contrast text and smooth transitions
  [
    'flex w-full text-base font-normal',
    // High-contrast text colors - CRITICAL for visibility
    'text-slate-900 dark:text-white',
    // Solid backgrounds for readability
    'bg-white dark:bg-slate-800/90',
    // Ring offset for focus states
    'ring-offset-background',
    // File input styling
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    // Placeholder - visible but subdued
    'placeholder:text-slate-400 dark:placeholder:text-slate-400',
    // Focus states
    'focus-visible:outline-none',
    // Disabled states
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900',
    // Smooth transitions for all interactive states
    'transition-all duration-200 ease-out',
    // Subtle shadow for depth
    'shadow-sm',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default - solid background, clear borders
        default: [
          'border border-slate-200 dark:border-slate-600',
          'rounded-lg',
          'hover:border-slate-300 dark:hover:border-slate-500',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'focus-visible:shadow-[0_0_0_3px_rgba(var(--tenant-primary-rgb,14,181,140),0.12)]',
        ].join(' '),

        // Glass - for use in modals/sheets with blur backgrounds
        glass: [
          'backdrop-blur-sm',
          'bg-white/95 dark:bg-slate-800/95',
          'border border-slate-200/80 dark:border-slate-600/60',
          'rounded-xl',
          'hover:border-primary/40 dark:hover:border-primary/40',
          'hover:bg-white dark:hover:bg-slate-800',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
          'focus-visible:shadow-[0_0_0_4px_rgba(var(--tenant-primary-rgb,14,181,140),0.15)]',
          'focus-visible:bg-white dark:focus-visible:bg-slate-800',
        ].join(' '),

        // Glass Dark - darker variant for special contexts
        'glass-dark': [
          'backdrop-blur-md',
          'bg-slate-900/90 dark:bg-slate-900/95',
          'border border-slate-700/60',
          'rounded-xl',
          'text-white',
          'placeholder:text-slate-400',
          'hover:border-slate-600',
          'focus-visible:border-primary/60',
          'focus-visible:shadow-[0_0_0_4px_rgba(var(--tenant-primary-rgb,14,181,140),0.2)]',
        ].join(' '),

        // Premium - elevated look with subtle gradients
        premium: [
          'bg-gradient-to-b from-white to-slate-50/80',
          'dark:from-slate-800 dark:to-slate-800/90',
          'border border-slate-200 dark:border-slate-600',
          'rounded-xl',
          'hover:border-slate-300 dark:hover:border-slate-500',
          'hover:shadow-md',
          'focus-visible:border-primary',
          'focus-visible:ring-2 focus-visible:ring-primary/20',
          'focus-visible:shadow-lg focus-visible:shadow-primary/10',
        ].join(' '),

        // Minimal - clean underline style
        minimal: [
          'border-0 border-b-2 border-slate-200 dark:border-slate-600',
          'bg-transparent',
          'rounded-none',
          'px-0',
          'hover:border-slate-300 dark:hover:border-slate-500',
          'focus-visible:ring-0 focus-visible:border-primary',
        ].join(' '),

        // Filled - solid background without border emphasis
        filled: [
          'border border-transparent',
          'bg-slate-100 dark:bg-slate-700',
          'rounded-lg',
          'hover:bg-slate-50 dark:hover:bg-slate-600',
          'focus-visible:border-primary focus-visible:bg-white dark:focus-visible:bg-slate-800',
          'focus-visible:ring-2 focus-visible:ring-primary/20',
        ].join(' '),
      },
      inputSize: {
        // Responsive by default - 48px on mobile, 44px on desktop for touch targets
        default: 'h-12 sm:h-11 px-3.5 py-2.5',
        sm: 'h-10 sm:h-9 px-3 py-2 text-sm',
        lg: 'h-14 px-4 py-3',
        xl: 'h-16 px-5 py-4 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  error?: boolean;
  /** Add a subtle scale animation on focus */
  animateOnFocus?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, variant, inputSize, animateOnFocus, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          inputVariants({ variant, inputSize }),
          // Error state styling
          error && [
            'border-red-400 dark:border-red-500',
            'bg-red-50/50 dark:bg-red-950/20',
            'focus-visible:border-red-500 dark:focus-visible:border-red-400',
            'focus-visible:ring-red-500/20',
            'focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
          ].join(' '),
          // Optional scale animation on focus
          animateOnFocus && 'focus-visible:scale-[1.01] origin-center',
          className
        )}
        type={type}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
