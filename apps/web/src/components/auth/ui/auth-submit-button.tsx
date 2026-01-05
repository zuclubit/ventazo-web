'use client';

/**
 * Auth Submit Button Component
 *
 * A styled submit button for authentication forms with loading state.
 * Matches the design system with proper focus states and animations.
 *
 * @example
 * ```tsx
 * <AuthSubmitButton isLoading={isSubmitting}>
 *   Sign In
 * </AuthSubmitButton>
 * ```
 */

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

interface AuthSubmitButtonProps {
  /** Button content when not loading */
  children: React.ReactNode;
  /** Loading state */
  isLoading?: boolean;
  /** Loading text */
  loadingText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Button type */
  type?: 'submit' | 'button';
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function AuthSubmitButton({
  children,
  isLoading = false,
  loadingText,
  disabled = false,
  type = 'submit',
  onClick,
  className,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type={type}
      disabled={isLoading || disabled}
      onClick={onClick}
      className={cn(
        'w-full h-11 text-base font-medium',
        'transition-all duration-200',
        'shadow-sm hover:shadow-md',
        className
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

// ============================================
// Display Name for DevTools
// ============================================

AuthSubmitButton.displayName = 'AuthSubmitButton';
