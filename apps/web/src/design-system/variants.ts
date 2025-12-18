// ============================================
// Component Variants - FASE 4
// Reusable variant patterns for components
// ============================================

import { cva, type VariantProps } from 'class-variance-authority';

// ============================================
// Button Variants
// ============================================

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-success-foreground hover:bg-success/90',
        warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

// ============================================
// Badge Variants
// ============================================

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        // Lead status variants
        new: 'border-transparent bg-blue-500 text-white',
        contacted: 'border-transparent bg-purple-500 text-white',
        qualified: 'border-transparent bg-green-500 text-white',
        proposal: 'border-transparent bg-amber-500 text-white',
        negotiation: 'border-transparent bg-pink-500 text-white',
        won: 'border-transparent bg-emerald-500 text-white',
        lost: 'border-transparent bg-red-500 text-white',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;

// ============================================
// Input Variants
// ============================================

export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-10 px-3 py-2',
        sm: 'h-8 px-2 py-1 text-xs',
        lg: 'h-12 px-4 py-3',
      },
      state: {
        default: '',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-success focus-visible:ring-success',
      },
    },
    defaultVariants: {
      size: 'default',
      state: 'default',
    },
  }
);

export type InputVariants = VariantProps<typeof inputVariants>;

// ============================================
// Card Variants
// ============================================

export const cardVariants = cva('rounded-lg border bg-card text-card-foreground', {
  variants: {
    variant: {
      default: 'shadow-sm',
      elevated: 'shadow-md',
      outlined: 'shadow-none',
      ghost: 'border-transparent shadow-none',
    },
    padding: {
      none: '',
      sm: 'p-4',
      default: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default',
  },
});

export type CardVariants = VariantProps<typeof cardVariants>;

// ============================================
// Avatar Variants
// ============================================

export const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'h-6 w-6',
        sm: 'h-8 w-8',
        default: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16',
        '2xl': 'h-20 w-20',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

export type AvatarVariants = VariantProps<typeof avatarVariants>;

// ============================================
// Alert Variants
// ============================================

export const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success:
          'border-success/50 bg-success/10 text-success dark:border-success [&>svg]:text-success',
        warning:
          'border-warning/50 bg-warning/10 text-warning dark:border-warning [&>svg]:text-warning',
        info: 'border-info/50 bg-info/10 text-info dark:border-info [&>svg]:text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type AlertVariants = VariantProps<typeof alertVariants>;

// ============================================
// Text Variants
// ============================================

export const textVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
      h2: 'scroll-m-20 text-3xl font-semibold tracking-tight',
      h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
      h4: 'scroll-m-20 text-xl font-semibold tracking-tight',
      p: 'leading-7',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
      subtle: 'text-xs text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'p',
  },
});

export type TextVariants = VariantProps<typeof textVariants>;

// ============================================
// Container Variants
// ============================================

export const containerVariants = cva('mx-auto w-full', {
  variants: {
    size: {
      sm: 'max-w-screen-sm',
      md: 'max-w-screen-md',
      lg: 'max-w-screen-lg',
      xl: 'max-w-screen-xl',
      '2xl': 'max-w-screen-2xl',
      full: 'max-w-full',
    },
    padding: {
      none: '',
      default: 'px-4 sm:px-6 lg:px-8',
      tight: 'px-2 sm:px-4',
      loose: 'px-6 sm:px-8 lg:px-12',
    },
  },
  defaultVariants: {
    size: 'xl',
    padding: 'default',
  },
});

export type ContainerVariants = VariantProps<typeof containerVariants>;

// ============================================
// Stack Variants (Flex layouts)
// ============================================

export const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
      rowReverse: 'flex-row-reverse',
      colReverse: 'flex-col-reverse',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    },
    justify: {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
    wrap: {
      wrap: 'flex-wrap',
      nowrap: 'flex-nowrap',
      reverse: 'flex-wrap-reverse',
    },
  },
  defaultVariants: {
    direction: 'row',
    align: 'center',
    gap: 'md',
  },
});

export type StackVariants = VariantProps<typeof stackVariants>;

// ============================================
// Grid Variants
// ============================================

export const gridVariants = cva('grid', {
  variants: {
    cols: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      12: 'grid-cols-12',
      auto: 'grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
    },
    gap: {
      none: 'gap-0',
      xs: 'gap-1',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    },
  },
  defaultVariants: {
    cols: 1,
    gap: 'md',
  },
});

export type GridVariants = VariantProps<typeof gridVariants>;
