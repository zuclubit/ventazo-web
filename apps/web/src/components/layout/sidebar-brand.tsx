'use client';

/**
 * Sidebar Brand Component
 *
 * Dynamic company branding with tenant logo and name.
 * Falls back to Ventazo branding if no custom branding is set.
 *
 * Features:
 * - Dynamic logo from tenant settings
 * - Animated hover effects
 * - Organic ambient glow
 * - Responsive sizing
 * - AMOLED-friendly design
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
// Logo Fallback Component
// ============================================

function LogoFallback({
  name,
  size,
  primaryColor,
}: {
  name: string;
  size: number;
  primaryColor: string;
}) {
  // Get initials from company name
  const initials = name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex items-center justify-center rounded-xl font-bold text-white"
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
}

// ============================================
// Brand Logo Component
// ============================================

function BrandLogo({
  logoUrl,
  name,
  size,
  primaryColor,
}: {
  logoUrl: string;
  name: string;
  size: number;
  primaryColor: string;
}) {
  const [hasError, setHasError] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Reset error state when URL changes
  React.useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [logoUrl]);

  if (hasError || !logoUrl) {
    return <LogoFallback name={name} size={size} primaryColor={primaryColor} />;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Loading skeleton */}
      {!isLoaded && (
        <div
          className="absolute inset-0 animate-pulse rounded-xl"
          style={{ background: `${primaryColor}40` }}
        />
      )}
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        className={cn(
          'object-contain rounded-xl transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        priority
      />
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SidebarBrand({ isCollapsed = false, className }: SidebarBrandProps) {
  const branding = useTenantBranding();

  const logoSize = isCollapsed ? 40 : 44;

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
        {/* Organic ambient glow */}
        <div
          className="absolute -inset-1 opacity-60 blur-xl transition-all duration-500 group-hover:opacity-80 group-hover:blur-2xl"
          style={{
            background: `radial-gradient(circle, ${branding.primaryColor}60 0%, transparent 70%)`,
            borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%',
          }}
          aria-hidden="true"
        />

        {/* Logo with hover scale */}
        <div className="relative transition-transform duration-300 group-hover:scale-105">
          <BrandLogo
            logoUrl={branding.logoUrl}
            name={branding.name}
            size={logoSize}
            primaryColor={branding.primaryColor}
          />
        </div>
      </div>

      {/* Brand name (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          <span
            className="truncate text-lg font-bold tracking-tight transition-colors duration-300 group-hover:text-[var(--sidebar-text-accent)]"
            style={{ color: 'var(--sidebar-text-primary)' }}
          >
            {branding.name}
          </span>
          {/* Plan badge for pro/enterprise/starter */}
          {branding.plan !== 'free' && branding.plan !== 'starter' && (
            <span
              className="mt-0.5 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: `${branding.primaryColor}25`,
                color: branding.accentColor,
              }}
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
            <span className="font-semibold">{branding.name}</span>
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
    >
      {brandContent}
    </Link>
  );
}

SidebarBrand.displayName = 'SidebarBrand';
