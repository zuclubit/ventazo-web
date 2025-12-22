// ============================================
// Splash Screen Component - Premium Brand Experience
// Ventazo by Zuclubit - Smart CRM
// ============================================

'use client';

import * as React from 'react';

import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';
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
// Splash Screen Component
// ============================================

export function SplashScreen({
  message = 'Cargando...',
  showProgress = false,
  progress = 0,
  variant = 'branded',
  className,
}: SplashScreenProps) {
  const [dots, setDots] = React.useState('');

  // Animated dots for loading message
  React.useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'flex min-h-screen items-center justify-center bg-background',
          className
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Image
              priority
              alt="Ventazo logo"
              className="animate-pulse"
              height={48}
              src="/images/hero/logo.png"
              width={48}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {message}
            <span className="inline-block w-4">{dots}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center',
        'bg-gradient-to-br from-background via-background to-muted/30',
        className
      )}
    >
      {/* Main Content Container */}
      <div className="flex flex-col items-center gap-8">
        {/* Logo Section with Glow Effect */}
        <div className="relative">
          {/* Ambient Glow - Primary */}
          <div
            className={cn(
              'absolute -inset-4 rounded-full opacity-60',
              'bg-gradient-to-r from-ventazo-500/40 via-ventazo-400/30 to-coral-500/20',
              'blur-2xl animate-glow-pulse'
            )}
          />

          {/* Secondary Glow Ring */}
          <div
            className={cn(
              'absolute -inset-2 rounded-full opacity-40',
              'bg-ventazo-500/30',
              'blur-xl animate-pulse'
            )}
          />

          {/* Logo Image */}
          <Image
            priority
            alt="Ventazo - Smart CRM para LATAM"
            className={cn(
              'relative z-10 drop-shadow-2xl',
              'animate-float-slow'
            )}
            height={80}
            src="/images/hero/logo.png"
            width={80}
          />
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          {/* Product Name */}
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            <span className="bg-gradient-to-r from-ventazo-600 to-ventazo-500 bg-clip-text text-transparent">
              Ventazo
            </span>
          </h1>

          {/* Company Attribution */}
          <p className="text-sm font-medium text-muted-foreground">
            by{' '}
            <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
              Zuclubit
            </span>
          </p>

          {/* Tagline */}
          <p className="mt-1 text-xs text-muted-foreground/70">
            Smart CRM para LATAM
          </p>
        </div>

        {/* Loading Section - Skeleton */}
        <div className="flex flex-col items-center gap-4 mt-4">
          {/* Skeleton loaders */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-48 mx-auto" />
            <Skeleton className="h-4 w-36 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>

          {/* Loading Message */}
          <p className="text-sm text-muted-foreground mt-2">
            {message}
            <span className="inline-block w-6 text-left">{dots}</span>
          </p>

          {/* Progress Bar (optional) */}
          {showProgress && (
            <div className="w-48 h-1 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  'bg-gradient-to-r from-ventazo-600 to-ventazo-400'
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer Attribution */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1">
        <p className="text-2xs text-muted-foreground/50">
          Complete Technology Integration
        </p>
        <p className="text-2xs text-muted-foreground/40">
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
