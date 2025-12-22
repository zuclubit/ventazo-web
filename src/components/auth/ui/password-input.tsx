'use client';

/**
 * Password Input Component
 *
 * A styled password input with visibility toggle and optional strength indicator.
 * Follows accessibility best practices with proper ARIA attributes.
 *
 * @example
 * ```tsx
 * <PasswordInput
 *   label="Password"
 *   showStrength
 *   strengthLevel={3}
 *   {...register('password')}
 * />
 * ```
 */

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// ============================================
// Types
// ============================================

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label */
  label?: string;
  /** Error message */
  error?: string;
  /** Show password strength indicator */
  showStrength?: boolean;
  /** Password strength level (0-4) */
  strengthLevel?: number;
  /** Strength label text */
  strengthLabel?: string;
  /** Toggle visibility labels */
  showLabel?: string;
  hideLabel?: string;
  /** Label for forgot password link */
  forgotPasswordLabel?: string;
  /** Forgot password href */
  forgotPasswordHref?: string;
}

// ============================================
// Strength Configuration
// ============================================

const strengthConfig = [
  { level: 0, label: 'Very Weak', color: 'bg-destructive', width: 'w-1/5' },
  { level: 1, label: 'Weak', color: 'bg-destructive', width: 'w-2/5' },
  { level: 2, label: 'Fair', color: 'bg-warning', width: 'w-3/5' },
  { level: 3, label: 'Good', color: 'bg-success/70', width: 'w-4/5' },
  { level: 4, label: 'Strong', color: 'bg-success', width: 'w-full' },
];

// ============================================
// Component
// ============================================

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      error,
      showStrength = false,
      strengthLevel = 0,
      strengthLabel,
      showLabel = 'Show password',
      hideLabel = 'Hide password',
      forgotPasswordLabel,
      forgotPasswordHref,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || 'password-input';
    const errorId = `${inputId}-error`;

    const strengthIndex = Math.min(Math.max(strengthLevel, 0), 4);
    const currentStrength = strengthConfig[strengthIndex] || { level: 0, label: 'Very Weak', color: 'bg-destructive', width: 'w-1/5' };

    return (
      <div className="space-y-2">
        {/* Label Row */}
        {(label || forgotPasswordLabel) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={inputId}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </label>
            )}
            {forgotPasswordLabel && forgotPasswordHref && (
              <a
                href={forgotPasswordHref}
                className="text-sm text-primary hover:underline transition-colors"
              >
                {forgotPasswordLabel}
              </a>
            )}
          </div>
        )}

        {/* Input with Toggle */}
        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            className={cn(
              'pr-10',
              error && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2',
              'text-muted-foreground hover:text-foreground',
              'transition-colors focus:outline-none'
            )}
            aria-label={showPassword ? hideLabel : showLabel}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {showStrength && (
          <div className="space-y-1.5 animate-in fade-in-0 duration-200">
            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  currentStrength.color,
                  currentStrength.width
                )}
              />
            </div>
            {/* Label */}
            <p className="text-xs text-muted-foreground">
              {strengthLabel || currentStrength.label}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

// ============================================
// Display Name for DevTools
// ============================================

PasswordInput.displayName = 'PasswordInput';
