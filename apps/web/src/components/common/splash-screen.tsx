// ============================================
// Splash Screen Component - Premium Brand Experience
// Ventazo by Zuclubit - Smart CRM
// ============================================
// Design System Compliance: Uses official design tokens
// Accessibility: WCAG 2.1 AA compliant
// Performance: Optimized animations, no layout shifts

'use client';

import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface SplashScreenProps {
  /** Loading message to display */
  message?: string;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Variant style */
  variant?: 'default' | 'minimal' | 'branded';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Skeleton Component with Shimmer
// ============================================

function SplashSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-md',
        'bg-[var(--tenant-primary-glow,hsl(var(--muted)))]',
        'relative overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {/* Shimmer overlay */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-gradient-to-r from-transparent via-white/10 to-transparent',
          'animate-[splash-shimmer_2s_ease-in-out_infinite]'
        )}
      />
    </div>
  );
}

// ============================================
// Splash Screen Component
// ============================================

export function SplashScreen({
  message = 'Cargando...',
  showProgress = false,
  progress = 0,
  variant = 'branded',
  className,
}: SplashScreenProps) {
  // Fade-in state for smooth entrance
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    // Small delay for smooth fade-in
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // Minimal Variant
  // ============================================
  if (variant === 'minimal') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={message}
        className={cn(
          'flex min-h-screen items-center justify-center',
          'bg-[hsl(var(--background))]',
          'transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        <div className="flex flex-col items-center gap-4">
          {/* Logo with subtle pulse */}
          <div className="relative">
            <Image
              priority
              alt="Ventazo"
              className="animate-[splash-pulse_2s_ease-in-out_infinite]"
              height={48}
              width={48}
              src="/images/hero/logo.png"
            />
          </div>

          {/* Loading message */}
          <p className="text-sm text-[hsl(var(--muted-foreground))] animate-[splash-fade-in_0.5s_ease-out]">
            {message}
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // Branded Variant (Default)
  // ============================================
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'flex min-h-screen flex-col items-center justify-center',
        // Background with subtle gradient using design tokens
        'bg-[hsl(var(--background))]',
        'bg-gradient-to-b from-[hsl(var(--background))] via-[hsl(var(--background))] to-[var(--tenant-primary-glow,hsl(var(--muted)/0.3))]',
        // Smooth fade-in transition
        'transition-opacity duration-500 ease-out',
        isVisible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      {/* Main Content Container */}
      <div
        className={cn(
          'flex flex-col items-center gap-6 sm:gap-8',
          'animate-[splash-fade-in_0.6s_ease-out]'
        )}
      >
        {/* ======================================== */}
        {/* Logo Section with Ambient Glow */}
        {/* ======================================== */}
        <div className="relative">
          {/* Primary ambient glow - uses tenant primary color */}
          <div
            className={cn(
              'absolute -inset-6 sm:-inset-8 rounded-full',
              'bg-[var(--tenant-primary-glow,hsl(var(--primary)/0.15))]',
              'blur-2xl',
              'animate-[splash-glow_3s_ease-in-out_infinite]'
            )}
            aria-hidden="true"
          />

          {/* Secondary glow ring */}
          <div
            className={cn(
              'absolute -inset-3 sm:-inset-4 rounded-full',
              'bg-[var(--tenant-primary-glow,hsl(var(--primary)/0.1))]',
              'blur-xl',
              'animate-[splash-pulse_2s_ease-in-out_infinite]'
            )}
            aria-hidden="true"
          />

          {/* Logo Image */}
          <Image
            priority
            alt="Ventazo - Smart CRM para LATAM"
            className={cn(
              'relative z-10',
              'drop-shadow-lg',
              'animate-[splash-float_3s_ease-in-out_infinite]'
            )}
            height={72}
            width={72}
            src="/images/hero/logo.png"
            style={{
              filter: 'drop-shadow(0 4px 12px var(--tenant-primary-glow, rgba(14, 181, 140, 0.3)))',
            }}
          />
        </div>

        {/* ======================================== */}
        {/* Brand Text with Clear Hierarchy */}
        {/* ======================================== */}
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center">
          {/* Product Name - Primary hierarchy */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--tenant-primary, #0EB58C), var(--tenant-primary-hover, #0A9D79))',
              }}
            >
              Ventazo
            </span>
          </h1>

          {/* Company Attribution - Secondary hierarchy */}
          <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
            by{' '}
            <span
              className="font-semibold bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, var(--tenant-primary, #0EB58C), var(--tenant-accent, #10B981))',
              }}
            >
              Zuclubit
            </span>
          </p>

          {/* Tagline - Tertiary hierarchy */}
          <p className="text-xs text-[hsl(var(--muted-foreground)/0.7)] mt-0.5">
            Smart CRM para LATAM
          </p>
        </div>

        {/* ======================================== */}
        {/* Loading Section */}
        {/* ======================================== */}
        <div className="flex flex-col items-center gap-4 mt-2 sm:mt-4">
          {/* Skeleton loaders - visual progress feedback */}
          <div
            className="space-y-2.5 w-full max-w-[200px]"
            aria-hidden="true"
          >
            <SplashSkeleton className="h-3 w-full mx-auto" />
            <SplashSkeleton className="h-3 w-4/5 mx-auto" />
            <SplashSkeleton className="h-2.5 w-3/5 mx-auto" />
          </div>

          {/* Loading Message */}
          <p
            className={cn(
              'text-sm text-[hsl(var(--muted-foreground))]',
              'animate-[splash-fade-in_0.8s_ease-out_0.3s_both]'
            )}
          >
            {message}
          </p>

          {/* Progress Bar (optional) */}
          {showProgress && (
            <div
              className={cn(
                'w-48 h-1 rounded-full overflow-hidden',
                'bg-[hsl(var(--muted)/0.5)]'
              )}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  'h-full rounded-full',
                  'transition-all duration-300 ease-out'
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, progress))}%`,
                  backgroundImage: 'linear-gradient(90deg, var(--tenant-primary, #0EB58C), var(--tenant-primary-hover, #0A9D79))',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ======================================== */}
      {/* Footer Attribution */}
      {/* ======================================== */}
      <div
        className={cn(
          'absolute bottom-6 sm:bottom-8',
          'flex flex-col items-center gap-0.5',
          'animate-[splash-fade-in_1s_ease-out_0.5s_both]'
        )}
      >
        <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground)/0.4)]">
          Complete Technology Integration
        </p>
        <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground)/0.3)]">
          From Architecture to Automation
        </p>
      </div>
    </div>
  );
}

// ============================================
// Display Name
// ============================================

SplashScreen.displayName = 'SplashScreen';
