'use client';

/**
 * Auth Layout Component
 *
 * A consistent layout wrapper for all authentication pages.
 * Provides background styling, centered content, and optional footer.
 *
 * @example
 * ```tsx
 * <AuthLayout variant="gradient" showFooter>
 *   <AuthCard title="Sign In">
 *     <LoginForm />
 *   </AuthCard>
 * </AuthLayout>
 * ```
 */

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

import type { AuthLayoutProps } from './types';

// ============================================
// Background Variants
// ============================================

const backgroundVariants = {
  gradient: 'bg-gradient-to-b from-background to-muted/50',
  solid: 'bg-background',
  pattern: 'bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.1),rgba(255,255,255,0))]',
};

// ============================================
// Component
// ============================================

export function AuthLayout({
  children,
  variant = 'gradient',
  showFooter = true,
  footer,
  className,
}: AuthLayoutProps) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center p-4',
        backgroundVariants[variant],
        className
      )}
    >
      {/* Main Content */}
      <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        {children}
      </div>

      {/* Footer */}
      {showFooter && (
        <footer className="mt-8 text-center text-sm text-muted-foreground animate-in fade-in-0 duration-700 delay-200">
          {footer || (
            <p>
              {t.auth.login.termsPrefix}{' '}
              <Link
                className="text-primary hover:underline transition-colors"
                href="/terms"
              >
                {t.auth.login.termsLink}
              </Link>{' '}
              {t.auth.login.andText}{' '}
              <Link
                className="text-primary hover:underline transition-colors"
                href="/privacy"
              >
                {t.auth.login.privacyLink}
              </Link>
            </p>
          )}
        </footer>
      )}
    </div>
  );
}

// ============================================
// Display Name for DevTools
// ============================================

AuthLayout.displayName = 'AuthLayout';
