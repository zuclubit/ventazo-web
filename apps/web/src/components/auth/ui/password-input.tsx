'use client';

/**
 * Password Input Component
 *
 * Premium 2025 password input with visibility toggle and glass styling.
 * Features password strength indicator and accessibility support.
 *
 * Design Features:
 * - Glassmorphism styling for dark mode
 * - Smooth visibility toggle
 * - Optional strength indicator
 * - ARIA accessibility
 *
 * @module components/auth/ui/password-input
 */

import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ============================================
// Types
// ============================================

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
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
  /** Custom label className */
  labelClassName?: string;
  /** Show lock icon */
  showIcon?: boolean;
  /** Visual variant */
  variant?: 'default' | 'glass' | 'premium';
  /** Size variant */
  size?: 'md' | 'lg';
}

// ============================================
// Strength Configuration
// ============================================

const strengthConfig = [
  { level: 0, label: 'Very Weak', color: 'bg-red-500', width: 'w-1/5' },
  { level: 1, label: 'Weak', color: 'bg-red-400', width: 'w-2/5' },
  { level: 2, label: 'Fair', color: 'bg-yellow-500', width: 'w-3/5' },
  { level: 3, label: 'Good', color: 'bg-emerald-400', width: 'w-4/5' },
  { level: 4, label: 'Strong', color: 'bg-emerald-500', width: 'w-full' },
];

// ============================================
// Size Configuration
// ============================================

const sizeConfig = {
  md: {
    input: 'h-10 text-sm px-3',
    label: 'text-sm',
    icon: 'h-4 w-4',
    iconOffset: 'left-3',
    toggleOffset: 'right-3',
  },
  lg: {
    input: 'h-12 text-base px-4',
    label: 'text-sm',
    icon: 'h-5 w-5',
    iconOffset: 'left-4',
    toggleOffset: 'right-4',
  },
};

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
      labelClassName,
      showIcon = false,
      variant = 'default',
      size = 'md',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const inputId = id || 'password-input';
    const errorId = `${inputId}-error`;

    const strengthIndex = Math.min(Math.max(strengthLevel, 0), 4);
    const currentStrength = strengthConfig[strengthIndex] || strengthConfig[0];

    const isPremium = variant === 'premium' || variant === 'glass';
    const config = sizeConfig[size];

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
      showIcon && (size === 'lg' ? 'pl-12' : 'pl-10'),
      'pr-10', // Space for toggle button
      error && [
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
      'pr-10',
      showIcon && 'pl-10',
      error && 'border-destructive focus-visible:ring-destructive',
      className
    );

    return (
      <div className="space-y-2">
        {/* Label Row */}
        {(label || forgotPasswordLabel) && (
          <div className="flex items-center justify-between">
            {label && (
              <Label
                htmlFor={inputId}
                className={cn(
                  config.label,
                  'font-medium leading-none',
                  isPremium ? 'text-[#B8C4C4]' : 'text-[#1C1C1E]',
                  disabled && 'opacity-50 cursor-not-allowed',
                  labelClassName
                )}
              >
                {label}
              </Label>
            )}
            {forgotPasswordLabel && forgotPasswordHref && (
              <a
                href={forgotPasswordHref}
                className={cn(
                  'text-sm transition-colors',
                  isPremium
                    ? 'text-[#0EB58C] hover:text-[#0CA57D]'
                    : 'text-[#0EB58C] hover:text-[#0CA57D]'
                )}
              >
                {forgotPasswordLabel}
              </a>
            )}
          </div>
        )}

        {/* Input with Toggle */}
        <div className="relative">
          {/* Lock Icon */}
          {showIcon && (
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 pointer-events-none',
                config.iconOffset,
                isPremium ? 'text-[#0EB58C]' : 'text-[#0EB58C]',
                config.icon
              )}
            >
              <Lock className={config.icon} />
            </div>
          )}

          {/* Input */}
          {isPremium ? (
            <input
              ref={ref}
              id={inputId}
              type={showPassword ? 'text' : 'password'}
              disabled={disabled}
              className={premiumInputStyles}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              {...props}
            />
          ) : (
            <Input
              ref={ref}
              id={inputId}
              type={showPassword ? 'text' : 'password'}
              disabled={disabled}
              className={defaultInputStyles}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              {...props}
            />
          )}

          {/* Toggle Button */}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              config.toggleOffset,
              'transition-colors focus:outline-none',
              isPremium
                ? 'text-[#7A8F8F] hover:text-[#0EB58C]'
                : 'text-[#7A8F8F] hover:text-[#0EB58C]'
            )}
            aria-label={showPassword ? hideLabel : showLabel}
          >
            {showPassword ? (
              <EyeOff className={config.icon} />
            ) : (
              <Eye className={config.icon} />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {showStrength && (
          <div className="space-y-1.5 animate-in fade-in-0 duration-200">
            {/* Progress Bar */}
            <div
              className={cn(
                'h-1.5 w-full rounded-full overflow-hidden',
                isPremium ? 'bg-white/[0.05]' : 'bg-muted'
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  currentStrength?.color,
                  currentStrength?.width
                )}
              />
            </div>
            {/* Label */}
            <p
              className={cn(
                'text-xs',
                isPremium ? 'text-[#6B7A7D]' : 'text-muted-foreground'
              )}
            >
              {strengthLabel || currentStrength?.label}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={errorId}
            className={cn(
              'text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200',
              isPremium ? 'text-red-400' : 'text-destructive'
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

// ============================================
// Display Name
// ============================================

PasswordInput.displayName = 'PasswordInput';
