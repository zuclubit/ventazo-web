'use client';

/**
 * Brand Logo Component
 *
 * A reusable brand logo component that matches the landing page design.
 * Supports multiple sizes, variants, and optional glow effects.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <BrandLogo />
 *
 * // Large with glow
 * <BrandLogo size="lg" withGlow />
 *
 * // Minimal for dark backgrounds
 * <BrandLogo variant="light" showText={false} />
 * ```
 */

import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { BrandLogoProps, LogoSize, LogoVariant } from './types';

// ============================================
// Size Configuration
// ============================================

const sizeConfig: Record<LogoSize, { image: number; text: string; gap: string }> = {
  sm: { image: 32, text: 'text-lg', gap: 'gap-2' },
  md: { image: 40, text: 'text-xl', gap: 'gap-3' },
  lg: { image: 48, text: 'text-2xl', gap: 'gap-3' },
  xl: { image: 56, text: 'text-3xl', gap: 'gap-4' },
};

// ============================================
// Variant Configuration - Ventazo Brand
// ============================================

const variantConfig: Record<LogoVariant, { text: string; glow: string }> = {
  default: {
    text: 'text-[#1C1C1E]',
    glow: 'bg-[#0EB58C]/40 group-hover:bg-[#0EB58C]/50',
  },
  light: {
    text: 'text-white group-hover:text-[#E6E6E6]',
    glow: 'bg-[#0EB58C]/40 group-hover:bg-[#0EB58C]/50',
  },
  dark: {
    text: 'text-[#003C3B] group-hover:text-[#002828]',
    glow: 'bg-[#0EB58C]/30 group-hover:bg-[#0EB58C]/40',
  },
  minimal: {
    text: 'text-[#1C1C1E]/80',
    glow: 'bg-transparent',
  },
};

// ============================================
// Component
// ============================================

export function BrandLogo({
  size = 'md',
  variant = 'default',
  showText = true,
  text = 'Ventazo',
  showAttribution = false,
  href = '/',
  className,
  withGlow = true,
  animated = true,
}: BrandLogoProps) {
  const { image: imageSize, text: textClass, gap } = sizeConfig[size];
  const { text: textColor, glow: glowColor } = variantConfig[variant];

  // Attribution text size based on main text size
  const attributionSizeMap: Record<LogoSize, string> = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-sm',
  };

  const logoContent = (
    <>
      {/* Logo image with organic glow */}
      <div className="relative">
        {/* Ambient glow - organic shape */}
        {withGlow && (
          <div
            className={cn(
              'absolute inset-0 blur-lg transition-all',
              animated && 'group-hover:blur-xl',
              glowColor
            )}
            style={{ borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%' }}
          />
        )}
        {/* Logo image */}
        <Image
          priority
          alt={`${text} logo`}
          className={cn(
            'relative object-contain drop-shadow-lg',
            animated && 'transition-transform group-hover:scale-105'
          )}
          height={imageSize}
          src="/images/hero/logo.png"
          width={imageSize}
        />
      </div>
      {/* Brand text with optional attribution */}
      {showText && (
        <div className="flex flex-col">
          <span
            className={cn(
              'font-bold transition-colors leading-tight',
              textClass,
              textColor
            )}
          >
            {text}
          </span>
          {showAttribution && (
            <span
              className={cn(
                'font-medium transition-colors opacity-70',
                attributionSizeMap[size]
              )}
            >
              by{' '}
              <span className="bg-gradient-to-r from-[#003C3B] to-[#0EB58C] bg-clip-text text-transparent font-semibold">
                Zuclubit
              </span>
            </span>
          )}
        </div>
      )}
    </>
  );

  const containerClasses = cn(
    'group flex items-center',
    gap,
    animated && 'transition-transform hover:scale-[1.02]',
    className
  );

  // If href is provided, wrap in Link
  if (href) {
    return (
      <Link className={containerClasses} href={href}>
        {logoContent}
      </Link>
    );
  }

  // Otherwise, render as div
  return <div className={containerClasses}>{logoContent}</div>;
}

// ============================================
// Display Name for DevTools
// ============================================

BrandLogo.displayName = 'BrandLogo';
