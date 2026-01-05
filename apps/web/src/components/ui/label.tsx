'use client';

import * as React from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Label Component - Premium Form Label Styling
 *
 * Features:
 * - High contrast text for accessibility
 * - Subtle animations on hover
 * - Required indicator support
 * - Multiple size variants
 */
const labelVariants = cva(
  // Base styles with high contrast
  [
    'text-sm font-medium leading-none',
    // High contrast text colors
    'text-slate-700 dark:text-slate-200',
    // Disabled state
    'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
    // Smooth transition
    'transition-colors duration-150',
  ].join(' '),
  {
    variants: {
      variant: {
        default: '',
        // Premium - slightly larger, bolder
        premium: 'text-sm font-semibold text-slate-800 dark:text-slate-100',
        // Muted - for secondary labels
        muted: 'text-xs font-normal text-slate-500 dark:text-slate-400',
        // Required - with visual indicator
        required: 'after:content-["*"] after:ml-0.5 after:text-red-500 after:font-normal',
      },
      size: {
        default: 'text-sm',
        sm: 'text-xs',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  /** Show required asterisk */
  required?: boolean;
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, size, required, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      labelVariants({ variant: required ? 'required' : variant, size }),
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
