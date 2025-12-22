'use client';

/**
 * Sidebar Brand Component - v2.0
 *
 * Optimized dynamic company branding with tenant logo, app name, and colors.
 * Falls back to Ventazo branding if no custom branding is set.
 *
 * Features:
 * - Dynamic logo from tenant settings with preload
 * - App name support (separate from company name)
 * - Animated hover effects with GPU acceleration
 * - Organic ambient glow
 * - Responsive sizing (44px expanded, 40px collapsed)
 * - AMOLED-friendly design
 * - React.memo for performance optimization
 * - Proper error boundaries and loading states
 *
 * @module components/layout/sidebar-brand
 */

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================
// Types
// ============================================

interface SidebarBrandProps {
  isCollapsed?: boolean;
  className?: string;
}

// ============================================
// Logo Fallback Component (Memoized)
// ============================================

interface LogoFallbackProps {
  name: string;
  size: number;
  primaryColor: string;
}

const LogoFallback = React.memo(function LogoFallback({
  name,
  size,
  primaryColor,
}: LogoFallbackProps) {
  // Get initials from company name - memoized
  const initials = React.useMemo(() => {
    if (!name) return 'VZ';
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [name]);

  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold text-white will-change-transform"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)`,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
});

LogoFallback.displayName = 'LogoFallback';

// ============================================
// Brand Logo Component (Memoized with Preload)
// ============================================

interface BrandLogoProps {
  logoUrl: string;
  name: string;
  size: number;
  primaryColor: string;
}

const BrandLogo = React.memo(function BrandLogo({
  logoUrl,
  name,
  size,
  primaryColor,
}: BrandLogoProps) {
  const [hasError, setHasError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Reset error state when URL changes
  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [logoUrl]);

  // Preload image for faster subsequent loads
  React.useEffect(() => {
    if (!logoUrl || hasError) return;

    const img = new window.Image();
    img.src = logoUrl;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [logoUrl, hasError]);

  if (hasError || !logoUrl) {
    return <LogoFallback name={name} size={size} primaryColor={primaryColor} />;
  }

  return (
    <div className="relative will-change-transform" style={{ width: size, height: size }}>
      {/* Loading skeleton */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse rounded-xl"
          style={{ background: `${primaryColor}40` }}
          aria-hidden="true"
        />
      )}
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={cn(
          'object-contain rounded-xl transition-opacity duration-200',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        priority
        unoptimized={logoUrl.startsWith('http')} // Skip optimization for external URLs
      />
    </div>
  );
});

BrandLogo.displayName = 'BrandLogo';

// ============================================
// Main Component (Memoized)
// ============================================

function SidebarBrandComponent({ isCollapsed = false, className }: SidebarBrandProps) {
  const branding = useTenantBranding();

  // Memoize sizes for performance
  const logoSize = isCollapsed ? 40 : 44;

  // Memoize glow style to prevent recalculation
  const glowStyle = React.useMemo(() => ({
    background: `radial-gradient(circle, ${branding.primaryColor}60 0%, transparent 70%)`,
    borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%',
  }), [branding.primaryColor]);

  // Memoize badge style
  const badgeStyle = React.useMemo(() => ({
    background: `${branding.primaryColor}25`,
    color: branding.accentColor,
  }), [branding.primaryColor, branding.accentColor]);

  const brandContent = (
    <div
      className={cn(
        'group relative flex items-center transition-all duration-300',
        isCollapsed ? 'justify-center' : 'gap-3',
        className
      )}
    >
      {/* Logo container with ambient glow */}
      <div className="relative shrink-0">
        {/* Organic ambient glow - GPU accelerated */}
        <div
          className="absolute -inset-1 opacity-60 blur-xl transition-all duration-500 will-change-[opacity,filter] group-hover:opacity-80 group-hover:blur-2xl"
          style={glowStyle}
          aria-hidden="true"
        />

        {/* Logo with hover scale - GPU accelerated */}
        <div className="relative transition-transform duration-300 will-change-transform group-hover:scale-105">
          <BrandLogo
            logoUrl={branding.logoUrl}
            name={branding.appName}
            size={logoSize}
            primaryColor={branding.primaryColor}
          />
        </div>
      </div>

      {/* App name (hidden when collapsed) - Uses appName for display */}
      {!isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          <span
            className="truncate text-lg font-bold tracking-tight transition-colors duration-300 group-hover:text-[var(--sidebar-text-accent)]"
            style={{ color: 'var(--sidebar-text-primary)' }}
          >
            {branding.appName}
          </span>
          {/* Plan badge for pro/enterprise */}
          {branding.plan !== 'free' && branding.plan !== 'starter' && (
            <span
              className="mt-0.5 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={badgeStyle}
            >
              {branding.plan}
            </span>
          )}
        </div>
      )}
    </div>
  );

  // Collapsed view with tooltip
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href="/app"
            className="block rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-glass-bg)]"
            prefetch
          >
            {brandContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-[var(--sidebar-divider)] bg-[var(--sidebar-glass-bg)] text-[var(--sidebar-text-primary)] backdrop-blur-xl"
        >
          <div className="flex flex-col">
            <span className="font-semibold">{branding.appName}</span>
            <span className="text-xs text-[var(--sidebar-text-muted)]">
              Ir al Dashboard
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expanded view
  return (
    <Link
      href="/app"
      className="block rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-glass-bg)]"
      prefetch
    >
      {brandContent}
    </Link>
  );
}

// Export with React.memo for performance optimization
export const SidebarBrand = React.memo(SidebarBrandComponent);
SidebarBrand.displayName = 'SidebarBrand';
