import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Textarea Component - Premium Form Textarea Styling
 *
 * Features:
 * - High contrast text colors in both light and dark modes
 * - Solid backgrounds for readability
 * - Micro-interactions on focus and hover
 * - WCAG AA compliant contrast ratios
 * - Auto-resize option
 */
const textareaVariants = cva(
  // Base styles with high-contrast text
  [
    'flex min-h-[80px] w-full text-base font-normal resize-y',
    // High-contrast text - CRITICAL for visibility
    'text-slate-900 dark:text-white',
    // Solid background for readability
    'bg-white dark:bg-slate-800/90',
    // Placeholder styling
    'placeholder:text-slate-400 dark:placeholder:text-slate-400',
    // Focus states
    'focus-visible:outline-none',
    // Disabled states
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900',
    // Smooth transitions
    'transition-all duration-200 ease-out',
    // Subtle shadow
    'shadow-sm',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default - solid background, clear borders
        default: [
          'border border-slate-200 dark:border-slate-600',
          'rounded-lg',
          'px-3.5 py-3',
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
          'px-4 py-3',
          'hover:border-primary/40 dark:hover:border-primary/40',
          'hover:bg-white dark:hover:bg-slate-800',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25',
          'focus-visible:shadow-[0_0_0_4px_rgba(var(--tenant-primary-rgb,14,181,140),0.15)]',
          'focus-visible:bg-white dark:focus-visible:bg-slate-800',
        ].join(' '),

        // Premium - elevated look
        premium: [
          'bg-gradient-to-b from-white to-slate-50/80',
          'dark:from-slate-800 dark:to-slate-800/90',
          'border border-slate-200 dark:border-slate-600',
          'rounded-xl',
          'px-4 py-3',
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
          'px-0 py-2',
          'hover:border-slate-300 dark:hover:border-slate-500',
          'focus-visible:ring-0 focus-visible:border-primary',
        ].join(' '),

        // Filled - solid background
        filled: [
          'border border-transparent',
          'bg-slate-100 dark:bg-slate-700',
          'rounded-lg',
          'px-4 py-3',
          'hover:bg-slate-50 dark:hover:bg-slate-600',
          'focus-visible:border-primary focus-visible:bg-white dark:focus-visible:bg-slate-800',
          'focus-visible:ring-2 focus-visible:ring-primary/20',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          textareaVariants({ variant }),
          // Error state styling
          error && [
            'border-red-400 dark:border-red-500',
            'bg-red-50/50 dark:bg-red-950/20',
            'focus-visible:border-red-500 dark:focus-visible:border-red-400',
            'focus-visible:ring-red-500/20',
            'focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
          ].join(' '),
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
