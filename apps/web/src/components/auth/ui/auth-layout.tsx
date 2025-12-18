'use client';

/**
 * Auth Layout Component
 *
 * Premium 2025 design with atmospheric dark gradient background.
 * Features split-screen on desktop with glassmorphism effects.
 *
 * Design Features:
 * - Premium dark gradient matching homepage
 * - Atmospheric glow effects
 * - Glassmorphism cards and inputs
 * - Smooth micro-interactions
 *
 * @module components/auth/ui/auth-layout
 */

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { AuthHero } from './auth-hero';

import type { AuthLayoutProps } from './types';

// ============================================
// Premium Background Component - Ventazo Brand
// ============================================

function PremiumBackground() {
  return (
    <>
      {/* Base Gradient - Ventazo Dark Green */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(165deg, #001A1A 0%, #002525 25%, #003C3B 50%, #002D2D 75%, #001E1E 100%)',
        }}
      />

      {/* Radial Gradient Overlay - Ventazo Green */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,181,140,0.12),transparent)]" />

      {/* Atmospheric Glows - Ventazo Brand Colors */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-right green glow */}
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#0EB58C]/12 blur-[150px]" />
        {/* Left green accent */}
        <div className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[#0EB58C]/8 blur-[120px]" />
        {/* Bottom subtle warmth */}
        <div className="absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-[#0EB58C]/6 blur-[100px]" />
      </div>

      {/* Noise Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(0, 30, 30, 0.4) 100%)',
        }}
      />
    </>
  );
}

// ============================================
// Background Variants (Light mode fallback)
// ============================================

const backgroundVariants: Record<'gradient' | 'solid' | 'pattern' | 'premium', string> = {
  gradient: 'bg-gradient-to-b from-background to-muted/50',
  solid: 'bg-background',
  pattern: 'bg-background bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,hsl(var(--primary)/0.08),rgba(255,255,255,0))]',
  premium: '', // Handled by PremiumBackground component
};

// ============================================
// Extended Props
// ============================================

interface ExtendedAuthLayoutProps extends AuthLayoutProps {
  /** Show hero panel on desktop (split-screen layout) */
  showHero?: boolean;
  /** Hero panel position */
  heroPosition?: 'left' | 'right';
  /** Custom hero content */
  heroContent?: React.ReactNode;
}

// ============================================
// Component
// ============================================

export function AuthLayout({
  children,
  variant = 'premium',
  showFooter = true,
  footer,
  className,
  showHero = true,
  heroPosition = 'left',
  heroContent,
}: ExtendedAuthLayoutProps) {
  const { t } = useI18n();
  const isPremium = variant === 'premium';

  // Split-screen layout for desktop with premium design
  if (showHero) {
    return (
      <div className="relative flex min-h-screen overflow-hidden">
        {/* Premium Background (full page) */}
        {isPremium && <PremiumBackground />}

        {/* Hero Panel - Left Side (Desktop Only) */}
        {heroPosition === 'left' && (heroContent || <AuthHero variant={isPremium ? 'premium' : 'default'} />)}

        {/* Form Panel - Right Side */}
        <div
          className={cn(
            // Full width on mobile, half on desktop
            'relative z-10 flex w-full flex-col lg:w-1/2',
            // Center content vertically and horizontally
            'items-center justify-center',
            // Background for non-premium
            !isPremium && backgroundVariants[variant],
            // Padding
            'px-4 py-8 sm:px-6 lg:px-8 xl:px-12',
            className
          )}
        >
          {/* Main Content Container */}
          <div className="flex w-full max-w-md flex-col justify-center">
            {/* Mobile Logo - Only shown on small screens */}
            <div className="mb-8 flex justify-center lg:hidden">
              <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02]">
                {/* Logo Image with Glow Effect */}
                <div className="relative">
                  {/* Ambient glow */}
                  <div
                    className="absolute inset-0 blur-lg bg-[#0EB58C]/40 group-hover:bg-[#0EB58C]/50 transition-all"
                    style={{ borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%' }}
                  />
                  <Image
                    src="/images/hero/logo.png"
                    alt="Ventazo logo"
                    width={44}
                    height={44}
                    className="relative object-contain drop-shadow-lg transition-transform group-hover:scale-105"
                    priority
                  />
                </div>
                <span className={cn(
                  'text-xl font-bold transition-colors',
                  isPremium ? 'text-white group-hover:text-[#E6E6E6]' : 'text-[#1C1C1E]'
                )}>
                  Ventazo
                </span>
              </Link>
            </div>

            {/* Form Content */}
            <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              {children}
            </div>

            {/* Footer */}
            {showFooter && (
              <footer className={cn(
                'mt-8 text-center text-sm animate-in fade-in-0 duration-700 delay-200',
                isPremium ? 'text-[#7A8F8F]' : 'text-muted-foreground'
              )}>
                {footer || (
                  <p>
                    {t.auth.login.termsPrefix}{' '}
                    <Link
                      className={cn(
                        'hover:underline transition-colors',
                        isPremium ? 'text-[#0EB58C] hover:text-[#0CA57D]' : 'text-[#0EB58C]'
                      )}
                      href="/terms"
                    >
                      {t.auth.login.termsLink}
                    </Link>{' '}
                    {t.auth.login.andText}{' '}
                    <Link
                      className={cn(
                        'hover:underline transition-colors',
                        isPremium ? 'text-[#0EB58C] hover:text-[#0CA57D]' : 'text-[#0EB58C]'
                      )}
                      href="/privacy"
                    >
                      {t.auth.login.privacyLink}
                    </Link>
                  </p>
                )}
              </footer>
            )}
          </div>
        </div>

        {/* Hero Panel - Right Side (if configured) */}
        {heroPosition === 'right' && (heroContent || <AuthHero variant={isPremium ? 'premium' : 'default'} />)}
      </div>
    );
  }

  // Simple centered layout (for pages without hero)
  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden',
        !isPremium && backgroundVariants[variant],
        className
      )}
    >
      {/* Premium Background */}
      {isPremium && <PremiumBackground />}

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        {children}
      </div>

      {/* Footer */}
      {showFooter && (
        <footer className={cn(
          'relative z-10 mt-8 text-center text-sm animate-in fade-in-0 duration-700 delay-200',
          isPremium ? 'text-[#7A8F8F]' : 'text-muted-foreground'
        )}>
          {footer || (
            <p>
              {t.auth.login.termsPrefix}{' '}
              <Link
                className={cn(
                  'hover:underline transition-colors',
                  isPremium ? 'text-[#0EB58C] hover:text-[#0CA57D]' : 'text-[#0EB58C]'
                )}
                href="/terms"
              >
                {t.auth.login.termsLink}
              </Link>{' '}
              {t.auth.login.andText}{' '}
              <Link
                className={cn(
                  'hover:underline transition-colors',
                  isPremium ? 'text-[#0EB58C] hover:text-[#0CA57D]' : 'text-[#0EB58C]'
                )}
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
