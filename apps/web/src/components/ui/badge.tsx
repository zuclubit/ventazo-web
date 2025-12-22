import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning:
          'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        // Lead score variants - Using CSS Variables
        hot: 'border-transparent bg-[var(--score-hot-bg)] text-[var(--score-hot)] dark:bg-emerald-900/50 dark:text-emerald-300',
        warm: 'border-transparent bg-[var(--score-warm-bg)] text-[var(--score-warm)] dark:bg-amber-900/50 dark:text-amber-300',
        cold: 'border-transparent bg-[var(--score-cold-bg)] text-[var(--score-cold)] dark:bg-red-900/50 dark:text-red-300',
        // Lead stage variants - Using CSS Variables
        new: 'border-transparent bg-[var(--stage-new)]/15 text-[var(--stage-new)] dark:bg-blue-900/30 dark:text-blue-300',
        contacted:
          'border-transparent bg-[var(--stage-contacted)]/15 text-[var(--stage-contacted)] dark:bg-amber-900/30 dark:text-amber-300',
        qualified:
          'border-transparent bg-[var(--stage-qualified)]/15 text-[var(--stage-qualified)] dark:bg-purple-900/30 dark:text-purple-300',
        proposal:
          'border-transparent bg-[var(--stage-proposal)]/15 text-[var(--stage-proposal)] dark:bg-teal-900/30 dark:text-teal-300',
        negotiation:
          'border-transparent bg-[var(--brand-orange)]/15 text-[var(--brand-orange)] dark:bg-orange-900/30 dark:text-orange-300',
        won: 'border-transparent bg-[var(--stage-won)] text-white',
        lost: 'border-transparent bg-[var(--stage-lost)]/80 text-white',
        // VENTAZO 2025 Premium Variants
        'hot-glow': 'border-[var(--hot-orange-border)] bg-[var(--hot-orange)]/15 text-[var(--hot-orange)] shadow-[0_0_12px_var(--hot-orange-glow)]',
        'score-hot': 'score-indicator hot',
        'score-warm': 'score-indicator warm',
        'score-cold': 'score-indicator cold',
        glass: 'backdrop-blur-md bg-white/10 border-white/20 text-white/90',
        'glass-dark': 'backdrop-blur-md bg-black/20 border-white/10 text-white/80',
        // Source badges
        whatsapp: 'source-badge whatsapp',
        website: 'source-badge website',
        referral: 'source-badge referral',
        social: 'source-badge social',
        email: 'source-badge email',
        phone: 'source-badge phone',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
