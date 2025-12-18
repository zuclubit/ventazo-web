'use client';

/**
 * Auth Card Component
 *
 * Premium 2025 glassmorphism card for authentication forms.
 * Features glass effect styling and premium dark theme support.
 *
 * Design Features:
 * - Glassmorphism backdrop-blur
 * - Premium border glow
 * - Smooth hover interactions
 * - Accessible contrast ratios
 *
 * @module components/auth/ui/auth-card
 */

import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { BrandLogo } from './brand-logo';
import type { AuthCardProps } from './types';

// ============================================
// Extended Props
// ============================================

interface ExtendedAuthCardProps extends AuthCardProps {
  /** Use premium glass styling */
  variant?: 'default' | 'glass' | 'premium';
}

// ============================================
// Max Width Configuration
// ============================================

const maxWidthConfig = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

// ============================================
// Component
// ============================================

export function AuthCard({
  children,
  title,
  subtitle,
  showLogo = true,
  logoProps,
  maxWidth = 'md',
  className,
  variant = 'premium',
}: ExtendedAuthCardProps) {
  const isPremium = variant === 'premium' || variant === 'glass';

  return (
    <div className="flex flex-col items-center">
      {/* Logo Section */}
      {showLogo && (
        <div className="mb-8 animate-in fade-in-0 zoom-in-95 duration-500">
          <BrandLogo
            size="lg"
            variant={isPremium ? 'light' : 'default'}
            withGlow
            animated
            {...logoProps}
          />
        </div>
      )}

      {/* Card - Premium Glass Styling - Ventazo Brand */}
      <Card
        className={cn(
          'w-full',
          maxWidthConfig[maxWidth],
          // Premium glass styling - Ventazo
          isPremium && [
            'backdrop-blur-xl',
            'bg-[rgba(0,60,59,0.35)]',
            'border border-[rgba(255,255,255,0.1)]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(14,181,140,0.1)]',
            'rounded-2xl',
          ],
          // Default styling
          !isPremium && 'shadow-lg border-[#E6E6E6] bg-white rounded-2xl',
          className
        )}
      >
        {/* Header with Title/Subtitle */}
        {(title || subtitle) && (
          <CardHeader className="space-y-2 text-center pb-4">
            {title && (
              <CardTitle className={cn(
                'text-2xl font-bold tracking-tight',
                isPremium ? 'text-white' : 'text-[#1C1C1E]'
              )}>
                {title}
              </CardTitle>
            )}
            {subtitle && (
              <CardDescription className={cn(
                isPremium ? 'text-[#B8C4C4]' : 'text-[#7A8F8F]'
              )}>
                {subtitle}
              </CardDescription>
            )}
          </CardHeader>
        )}

        {/* Content */}
        <CardContent className={cn(!title && !subtitle && 'pt-6')}>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Display Name for DevTools
// ============================================

AuthCard.displayName = 'AuthCard';
