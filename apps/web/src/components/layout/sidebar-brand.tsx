'use client';

/**
 * Sidebar Brand Component - v2.1
 *
 * Optimized dynamic company branding with tenant logo, app name, and colors.
 * Falls back to Ventazo branding if no custom branding is set.
 *
 * Features:
 * - Dynamic logo from tenant settings with preload
 * - App name support (separate from company name)
 * - Animated hover effects with GPU acceleration
 * - Color Intelligence ambient glow (HCT-derived)
 * - Responsive sizing (44px expanded, 40px collapsed)
 * - AMOLED-friendly design
 * - React.memo for performance optimization
 * - Proper error boundaries and loading states
 *
 * v2.1 - Color Intelligence Integration
 * - HCT-derived logo glow effect
 * - OKLCH radial gradients for organic glow
 * - Brand analysis for optimal glow intensity
 * - APCA-validated text colors
 *
 * CSS Variables Used (from Color Intelligence):
 * - --sidebar-ci-logo-glow: Radial gradient for logo ambient glow
 * - --sidebar-ci-accent-highlight: Interpolated accent color
 * - --sidebar-ci-active-border: Focus ring color
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
import { useSidebarColorIntelligence } from './hooks';

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

  // Color Intelligence: Get ambient effects for logo glow
  const { ambient, brandAnalysis, isDarkSidebar } = useSidebarColorIntelligence();

  // Memoize sizes for performance
  const logoSize = isCollapsed ? 40 : 44;

  // Color Intelligence: Enhanced glow style using HCT-derived colors
  // Uses OKLCH radial gradient for perceptually uniform glow
  const glowStyle = React.useMemo(() => ({
    // Use Color Intelligence logo glow or fallback to brand-derived glow
    background: ambient?.logoGlow || `radial-gradient(circle, ${branding.primaryColor}60 0%, transparent 70%)`,
    borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%',
  }), [ambient?.logoGlow, branding.primaryColor]);

  // Color Intelligence: Enhanced badge style with accent highlight
  const badgeStyle = React.useMemo(() => ({
    background: `${branding.primaryColor}25`,
    // Use Color Intelligence interpolated accent or fallback
    color: ambient?.accentHighlight || branding.accentColor,
  }), [branding.primaryColor, ambient?.accentHighlight, branding.accentColor]);

  const brandContent = (
    <div
      className={cn(
        'group relative flex items-center transition-all duration-300',
        isCollapsed ? 'justify-center' : 'gap-3',
        className
      )}
    >
      {/* Logo container with Color Intelligence ambient glow */}
      <div className="relative shrink-0">
        {/* Color Intelligence: OKLCH radial glow - GPU accelerated */}
        {/* Uses HCT-derived brand color with optimal intensity based on sidebar contrast mode */}
        <div
          className={cn(
            'absolute -inset-1 blur-xl transition-all duration-500 will-change-[opacity,filter]',
            'group-hover:blur-2xl',
            // Adjust base opacity based on sidebar darkness
            isDarkSidebar ? 'opacity-70 group-hover:opacity-90' : 'opacity-50 group-hover:opacity-70'
          )}
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

      {/* App name (hidden when collapsed) - Color Intelligence Enhanced */}
      {!isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          <span
            className="truncate text-lg font-bold tracking-tight transition-colors duration-300"
            style={{
              // Color Intelligence: APCA-validated text color
              color: 'var(--sidebar-ci-text, var(--sidebar-text-primary))',
            }}
          >
            {branding.appName}
          </span>
          {/* Plan badge for pro/enterprise - uses Color Intelligence accent */}
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
