import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg border text-card-foreground transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-card shadow-sm',
        elevated: 'bg-card shadow-md hover:shadow-lg hover:-translate-y-0.5',
        // Premium Glass Variants
        glass:
          'backdrop-blur-xl bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:bg-white/5 dark:border-white/10',
        'glass-hover':
          'backdrop-blur-xl bg-white/5 border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/[0.08] hover:border-white/15 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 dark:bg-white/5 dark:border-white/10',
        'glass-dark':
          'backdrop-blur-2xl bg-black/20 border-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.4)] dark:bg-black/20 dark:border-white/5',
        premium:
          'bg-gradient-to-br from-card via-card to-muted/50 border-white/10 shadow-lg',
        outline: 'bg-transparent border-border',
        ghost: 'bg-transparent border-transparent shadow-none',
      },
      padding: {
        default: '',
        none: '[&>*]:p-0',
        sm: '[&_.card-header]:p-4 [&_.card-content]:p-4 [&_.card-footer]:p-4',
        lg: '[&_.card-header]:p-8 [&_.card-content]:p-8 [&_.card-footer]:p-8',
      },
      rounded: {
        default: 'rounded-lg',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        '2xl': 'rounded-2xl',
        '3xl': 'rounded-3xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      rounded: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, rounded, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, rounded }), className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
