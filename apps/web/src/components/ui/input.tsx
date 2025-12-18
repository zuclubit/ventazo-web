import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300',
  {
    variants: {
      variant: {
        default:
          'border border-input bg-background rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        glass:
          'backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/40 focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(13,148,136,0.15)] dark:bg-white/5 dark:border-white/10',
        'glass-dark':
          'backdrop-blur-md bg-black/20 border border-white/5 rounded-xl text-white placeholder:text-white/30 focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_3px_rgba(13,148,136,0.2)] dark:bg-black/20 dark:border-white/5',
        premium:
          'bg-muted/50 border border-border rounded-lg focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        minimal:
          'border-0 border-b border-input bg-transparent rounded-none focus-visible:ring-0 focus-visible:border-primary',
      },
      inputSize: {
        default: 'h-10 px-3 py-2',
        sm: 'h-9 px-3 py-1 text-xs',
        lg: 'h-12 px-4 py-3',
        xl: 'h-14 px-5 py-4 text-base',
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
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, variant, inputSize, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          inputVariants({ variant, inputSize }),
          error && 'border-destructive focus-visible:ring-destructive focus-visible:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
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
