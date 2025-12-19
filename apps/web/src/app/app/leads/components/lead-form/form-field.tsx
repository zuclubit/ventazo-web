'use client';

/**
 * Enhanced Form Field Component
 *
 * A refined, accessible form field with:
 * - Icon support
 * - Validation states
 * - Character counter
 * - Animated error messages
 * - Responsive design
 *
 * Best Practices:
 * - Minimum 44px touch targets on mobile (WCAG 2.1 AAA)
 * - Clear focus indicators
 * - Proper label association
 * - Screen reader support
 *
 * @module leads/components/lead-form/form-field
 */

import * as React from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, type LucideIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface FormFieldProps {
  /** Field label */
  label: string;
  /** HTML id for the input */
  id: string;
  /** Error message */
  error?: string;
  /** Whether field is required */
  required?: boolean;
  /** Hint text (e.g., "Optional") */
  hint?: string;
  /** Icon to show in the input */
  icon?: LucideIcon;
  /** Show character count */
  showCharCount?: boolean;
  /** Max characters (for char count) */
  maxLength?: number;
  /** Current value length (for char count) */
  currentLength?: number;
  /** Whether the field is valid */
  isValid?: boolean;
  /** Children (the input element) */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================
// Component
// ============================================

export function FormField({
  label,
  id,
  error,
  required,
  hint,
  icon: Icon,
  showCharCount,
  maxLength,
  currentLength = 0,
  isValid,
  children,
  className,
}: FormFieldProps) {
  const hasError = !!error;
  const showValidState = isValid && !hasError;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label Row */}
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className={cn(
            // Typography
            'text-sm font-medium',
            // Transitions
            'transition-colors',
            // Error state
            hasError && 'text-destructive'
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-hidden="true">
              *
            </span>
          )}
        </Label>

        <div className="flex items-center gap-2 shrink-0">
          {hint && !showCharCount && (
            <span className="text-xs text-muted-foreground">{hint}</span>
          )}
          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs tabular-nums transition-colors',
                currentLength > maxLength * 0.9
                  ? 'text-amber-500'
                  : 'text-muted-foreground',
                currentLength >= maxLength && 'text-destructive'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
          {showValidState && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-primary"
              aria-label="Campo valido"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </div>
      </div>

      {/* Input */}
      {children}

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-destructive flex items-center gap-1.5"
            role="alert"
            id={`${id}-error`}
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Input with Icon Component
// ============================================

export interface InputWithIconProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: boolean;
  inputClassName?: string;
}

export const InputWithIcon = React.forwardRef<
  HTMLInputElement,
  InputWithIconProps
>(({ icon: Icon, error, className, inputClassName, ...props }, ref) => {
  return (
    <div className={cn('relative w-full', className)}>
      <Input
        ref={ref}
        className={cn(
          // Full width to prevent overflow
          'w-full',
          // Responsive height - larger on mobile for touch targets
          'h-12 sm:h-11',
          // Transitions
          'transition-all duration-200',
          // Icon padding - optimized for mobile (40px instead of 44px)
          Icon && 'pl-10 sm:pl-10',
          // Error state
          error && 'border-destructive focus-visible:ring-destructive/20',
          // Focus state
          'focus-visible:ring-2 focus-visible:ring-primary/20',
          inputClassName
        )}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {Icon && (
        <Icon
          className={cn(
            // Position - adjusted for smaller padding
            'absolute left-3 top-1/2 -translate-y-1/2',
            // Size - consistent across devices
            'h-4 w-4',
            // Color
            'text-muted-foreground pointer-events-none',
            // Error state
            error && 'text-destructive'
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
});

InputWithIcon.displayName = 'InputWithIcon';

// ============================================
// Textarea with Counter Component
// ============================================

export interface TextareaWithCounterProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const TextareaWithCounter = React.forwardRef<
  HTMLTextAreaElement,
  TextareaWithCounterProps
>(({ error, className, ...props }, ref) => {
  return (
    <Textarea
      ref={ref}
      className={cn(
        // Responsive sizing
        'min-h-[120px] sm:min-h-[100px]',
        // Responsive padding - larger on mobile
        'p-3.5 sm:p-3',
        // Disable resize for consistent UX
        'resize-none',
        // Transitions
        'transition-all duration-200',
        // Error state
        error && 'border-destructive focus-visible:ring-destructive/20',
        // Focus state
        'focus-visible:ring-2 focus-visible:ring-primary/20',
        className
      )}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
});

TextareaWithCounter.displayName = 'TextareaWithCounter';

// ============================================
// Display Names
// ============================================

FormField.displayName = 'FormField';
