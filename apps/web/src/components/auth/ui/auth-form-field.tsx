'use client';

/**
 * Auth Form Field Component
 *
 * Premium 2025 form field with glass styling support.
 * Unified, accessible form field for authentication forms.
 *
 * Design Features:
 * - Glassmorphism variant for dark mode
 * - Real-time validation feedback
 * - Icon support (start/end)
 * - Consistent error styling
 *
 * @module components/auth/ui/auth-form-field
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================
// Types
// ============================================

export interface AuthFormFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field label */
  label: string;
  /** Field name/id - provided by react-hook-form register */
  name?: string;
  /** Error message */
  error?: string;
  /** Helper text (shown below input) */
  helperText?: string;
  /** Icon to show at start of input */
  startIcon?: React.ReactNode;
  /** Icon to show at end of input */
  endIcon?: React.ReactNode;
  /** Make label visually hidden but accessible */
  srOnlyLabel?: boolean;
  /** Container class name */
  containerClassName?: string;
  /** Label class name */
  labelClassName?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'glass' | 'premium';
}

// ============================================
// Size Configuration
// ============================================

const sizeConfig = {
  sm: {
    input: 'h-9 text-sm px-3',
    label: 'text-xs',
    icon: 'h-4 w-4',
    iconOffset: 'left-3',
  },
  md: {
    input: 'h-10 text-sm px-3',
    label: 'text-sm',
    icon: 'h-4 w-4',
    iconOffset: 'left-3',
  },
  lg: {
    input: 'h-12 text-base px-4',
    label: 'text-sm',
    icon: 'h-5 w-5',
    iconOffset: 'left-4',
  },
};

// ============================================
// Component
// ============================================

export const AuthFormField = React.forwardRef<HTMLInputElement, AuthFormFieldProps>(
  (
    {
      label,
      name,
      error,
      helperText,
      startIcon,
      endIcon,
      srOnlyLabel = false,
      containerClassName,
      labelClassName,
      size = 'md',
      variant = 'default',
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Generate stable ID
    const fieldId = name ? `auth-field-${name}` : `auth-field-${props.id || 'input'}`;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;
    const config = sizeConfig[size];

    const hasError = Boolean(error);
    const isPremium = variant === 'premium' || variant === 'glass';

    const describedBy = [
      hasError ? errorId : null,
      helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    // Premium glass input styles - Ventazo Brand
    const premiumInputStyles = cn(
      config.input,
      'w-full rounded-xl border transition-all duration-300',
      'backdrop-blur-sm',
      'bg-[rgba(0,60,59,0.4)]',
      'border-[rgba(255,255,255,0.1)]',
      'hover:border-[rgba(14,181,140,0.25)]',
      'text-white placeholder:text-[#7A8F8F]',
      'focus:outline-none focus:border-[#0EB58C] focus:shadow-[0_0_0_3px_rgba(14,181,140,0.2)]',
      startIcon && (size === 'lg' ? 'pl-12' : 'pl-10'),
      endIcon && 'pr-10',
      hasError && [
        'border-red-500/50',
        'focus:border-red-500',
        'focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]',
      ],
      disabled && 'opacity-50 cursor-not-allowed',
      className
    );

    // Default input styles
    const defaultInputStyles = cn(
      config.input,
      startIcon && 'pl-10',
      endIcon && 'pr-10',
      hasError && [
        'border-destructive',
        'focus-visible:ring-destructive/30',
        'focus-visible:border-destructive',
      ],
      'transition-colors duration-200',
      className
    );

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {/* Label */}
        <Label
          htmlFor={fieldId}
          className={cn(
            config.label,
            'font-medium leading-none',
            srOnlyLabel && 'sr-only',
            isPremium ? 'text-[#B8C4C4]' : 'text-[#1C1C1E]',
            disabled && 'opacity-50 cursor-not-allowed',
            labelClassName
          )}
        >
          {label}
        </Label>

        {/* Input Container */}
        <div className="relative">
          {/* Start Icon */}
          {startIcon && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 pointer-events-none',
                config.iconOffset,
                isPremium ? 'text-[#0EB58C]' : 'text-[#0EB58C]',
                config.icon
              )}
            >
              {startIcon}
            </div>
          )}

          {/* Input - Using native input for premium styling */}
          {isPremium ? (
            <input
              ref={ref}
              id={fieldId}
              name={name}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={describedBy}
              className={premiumInputStyles}
              {...props}
            />
          ) : (
            <Input
              ref={ref}
              id={fieldId}
              name={name}
              disabled={disabled}
              aria-invalid={hasError}
              aria-describedby={describedBy}
              className={defaultInputStyles}
              {...props}
            />
          )}

          {/* End Icon */}
          {endIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                isPremium ? 'text-[#6B7A7D]' : 'text-muted-foreground',
                config.icon
              )}
            >
              {endIcon}
            </div>
          )}
        </div>

        {/* Error Message */}
        {hasError && (
          <p
            id={errorId}
            role="alert"
            className={cn(
              'text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200',
              isPremium ? 'text-red-400' : 'text-destructive'
            )}
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !hasError && (
          <p
            id={helperId}
            className={cn(
              'text-xs',
              isPremium ? 'text-[#6B7A7D]' : 'text-muted-foreground'
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

// ============================================
// Display Name
// ============================================

AuthFormField.displayName = 'AuthFormField';
