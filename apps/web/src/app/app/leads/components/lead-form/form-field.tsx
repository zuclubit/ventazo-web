'use client';

/**
 * Form Field Components - v3.0 (2025 World-Class)
 *
 * Mobile-first form components with consistent sizing.
 *
 * Design Principles:
 * - Consistent sizing: 44px height for all inputs (Material/Apple standard)
 * - 16px font prevents iOS zoom on focus
 * - Labels always above fields
 * - WCAG 2.1 AAA compliant
 * - No dynamic sizing based on device detection
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
  /** Hint text */
  hint?: string;
  /** Show character count */
  showCharCount?: boolean;
  /** Max characters */
  maxLength?: number;
  /** Current value length */
  currentLength?: number;
  /** Whether the field is valid */
  isValid?: boolean;
  /** Children (the input element) */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================
// Error Animation
// ============================================

const errorAnimation = {
  initial: { opacity: 0, y: -4, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit: { opacity: 0, y: -4, height: 0 },
  transition: { duration: 0.15 },
};

// ============================================
// Form Field Component
// ============================================

export function FormField({
  label,
  id,
  error,
  required,
  hint,
  showCharCount,
  maxLength,
  currentLength = 0,
  isValid,
  children,
  className,
}: FormFieldProps) {
  const hasError = !!error;
  const showValidState = isValid && !hasError;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Clone children to add aria-describedby
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const describedBy = [hasError ? errorId : null, hint ? hintId : null]
        .filter(Boolean)
        .join(' ');

      return React.cloneElement(
        child as React.ReactElement<{ 'aria-describedby'?: string }>,
        { 'aria-describedby': describedBy || undefined }
      );
    }
    return child;
  });

  return (
    <div className={cn('w-full min-w-0 space-y-1.5', className)}>
      {/* Label Row */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium leading-none shrink-0',
            hasError && 'text-destructive'
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only">(requerido)</span>}
        </Label>

        {/* Right side indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Hint text */}
          {hint && !showCharCount && (
            <span id={hintId} className="text-xs text-muted-foreground">
              {hint}
            </span>
          )}

          {/* Character counter */}
          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs tabular-nums',
                currentLength > maxLength * 0.9
                  ? 'text-amber-500 font-medium'
                  : 'text-muted-foreground',
                currentLength >= maxLength && 'text-destructive font-medium'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}

          {/* Valid indicator */}
          {showValidState && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-primary"
              aria-label="Campo válido"
            >
              <Check className="h-4 w-4" />
            </motion.span>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="w-full">{enhancedChildren}</div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {hasError && (
          <motion.p
            id={errorId}
            role="alert"
            {...errorAnimation}
            className="flex items-start gap-1.5 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
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
}

export const InputWithIcon = React.forwardRef<
  HTMLInputElement,
  InputWithIconProps
>(({ icon: Icon, error, className, ...props }, ref) => {
  return (
    <div className="relative w-full">
      <Input
        ref={ref}
        className={cn(
          // Full width
          'w-full',
          // Consistent height - 44px (touch-friendly)
          'h-11',
          // 16px font prevents iOS zoom
          'text-base',
          // Padding with icon
          Icon ? 'pl-10 pr-3' : 'px-3',
          // Border radius
          'rounded-lg',
          // Background
          'bg-background/80',
          // Border
          'border-input/60',
          // Focus state
          'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
          // Error state
          error && 'border-destructive focus-visible:ring-destructive/20',
          // Disabled
          'disabled:opacity-50 disabled:bg-muted/30',
          className
        )}
        aria-invalid={error}
        {...props}
      />
      {Icon && (
        <Icon
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2',
            'h-4 w-4',
            'text-muted-foreground pointer-events-none',
            error && 'text-destructive'
          )}
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
        // Full width
        'w-full',
        // Height
        'min-h-[100px]',
        // 16px font prevents iOS zoom
        'text-base',
        // Padding
        'p-3',
        // Border radius
        'rounded-lg',
        // Background
        'bg-background/80',
        // Border
        'border-input/60',
        // No resize for consistent UX
        'resize-none',
        // Focus state
        'focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary',
        // Error state
        error && 'border-destructive focus-visible:ring-destructive/20',
        // Disabled
        'disabled:opacity-50 disabled:bg-muted/30',
        className
      )}
      aria-invalid={error}
      {...props}
    />
  );
});

TextareaWithCounter.displayName = 'TextareaWithCounter';

// ============================================
// Display Names
// ============================================

FormField.displayName = 'FormField';
