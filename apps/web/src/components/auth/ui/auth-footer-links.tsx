'use client';

/**
 * Auth Footer Links Component
 *
 * A component for displaying navigation links at the bottom of auth forms.
 * Used for "Already have an account?" / "Don't have an account?" patterns.
 *
 * @example
 * ```tsx
 * <AuthFooterLinks
 *   text="Don't have an account?"
 *   linkText="Sign up here"
 *   href="/register"
 * />
 * ```
 */

import Link from 'next/link';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface AuthFooterLinksProps {
  /** Prefix text */
  text: string;
  /** Link text */
  linkText: string;
  /** Link destination */
  href: string;
  /** Center align (default: true) */
  centered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function AuthFooterLinks({
  text,
  linkText,
  href,
  centered = true,
  className,
}: AuthFooterLinksProps) {
  return (
    <p
      className={cn(
        'text-sm',
        centered && 'text-center',
        className
      )}
    >
      {text}{' '}
      <Link
        href={href}
        className="font-medium text-[#0EB58C] hover:text-[#0CA57D] hover:underline transition-colors"
      >
        {linkText}
      </Link>
    </p>
  );
}

// ============================================
// Display Name for DevTools
// ============================================

AuthFooterLinks.displayName = 'AuthFooterLinks';
