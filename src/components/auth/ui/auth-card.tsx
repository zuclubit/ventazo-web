'use client';

/**
 * Auth Card Component
 *
 * A styled card container for authentication forms.
 * Includes optional logo, title, and subtitle sections.
 *
 * @example
 * ```tsx
 * <AuthCard
 *   title="Sign In"
 *   subtitle="Enter your credentials"
 *   showLogo
 * >
 *   <form>...</form>
 * </AuthCard>
 * ```
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
}: AuthCardProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Logo Section */}
      {showLogo && (
        <div className="mb-8 animate-in fade-in-0 zoom-in-95 duration-500">
          <BrandLogo
            size="lg"
            variant="default"
            withGlow
            animated
            {...logoProps}
          />
        </div>
      )}

      {/* Card */}
      <Card
        className={cn(
          'w-full shadow-lg border-border/50',
          maxWidthConfig[maxWidth],
          className
        )}
      >
        {/* Header with Title/Subtitle */}
        {(title || subtitle) && (
          <CardHeader className="space-y-1 text-center pb-4">
            {title && (
              <CardTitle className="text-2xl font-bold tracking-tight">
                {title}
              </CardTitle>
            )}
            {subtitle && (
              <CardDescription className="text-muted-foreground">
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
