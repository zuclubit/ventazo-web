'use client';

import { useState, useEffect, useCallback } from 'react';

import { Menu } from 'lucide-react';

import { CountrySelector } from '@/components/i18n';
import { useI18n } from '@/lib/i18n/context';
import { cn } from '@/lib/utils';

import { HeaderCTA } from './header-cta';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { NavLinks } from './nav-links';

import type { LandingHeaderConfig, LandingHeaderProps } from './types';

/**
 * LandingHeader Component
 *
 * Main header component for landing pages.
 * Features:
 * - Responsive design with mobile menu
 * - Scroll-aware styling (transparent → blur)
 * - Organic visual design matching hero
 * - i18n support
 * - Accessibility compliant
 */
export function LandingHeader({
  config,
  className,
  variant = 'transparent',
  sticky = true,
}: LandingHeaderProps) {
  const { t } = useI18n();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Default configuration with full i18n integration
  const defaultConfig: LandingHeaderConfig = {
    logo: {
      text: 'Ventazo',
      href: '/',
    },
    navigation: [
      { label: t.nav.features, href: '#features' },
      { label: t.nav.ai, href: '#ai' },
      { label: t.nav.pricing, href: '#pricing' },
      {
        label: t.nav.apiDocs,
        href: process.env['NEXT_PUBLIC_API_DOCS_URL'] || 'https://zuclubit-lead-service.fly.dev/reference',
        isExternal: true,
      },
    ],
    ctaButtons: [
      {
        label: t.nav.startFree,
        href: '/signup',
        variant: 'primary',
      },
    ],
    showCountrySelector: true,
    showCurrency: true,
  };

  // Merge custom config with defaults
  const mergedConfig: LandingHeaderConfig = {
    ...defaultConfig,
    ...config,
    logo: {
      text: config?.logo?.text || defaultConfig.logo?.text || 'Ventazo',
      href: config?.logo?.href || defaultConfig.logo?.href || '/',
      icon: config?.logo?.icon || defaultConfig.logo?.icon,
    },
    navigation: config?.navigation || defaultConfig.navigation,
    ctaButtons: config?.ctaButtons || defaultConfig.ctaButtons,
  };

  // Scroll detection with throttling
  const handleScroll = useCallback(() => {
    const scrollThreshold = 50;
    setIsScrolled(window.scrollY > scrollThreshold);
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  // Header variant styles
  const getHeaderStyles = () => {
    const baseStyles = 'w-full transition-all duration-500 ease-out';

    if (isScrolled) {
      return cn(
        baseStyles,
        'bg-[#062C2C]/90 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/10'
      );
    }

    switch (variant) {
      case 'solid':
        return cn(baseStyles, 'bg-[#062C2C]');
      case 'blur':
        return cn(baseStyles, 'bg-[#062C2C]/50 backdrop-blur-md');
      case 'transparent':
      default:
        return cn(baseStyles, 'bg-transparent');
    }
  };

  return (
    <>
      <header
        className={cn(
          'relative z-50',
          getHeaderStyles(),
          sticky && 'sticky top-0',
          className
        )}
        role="banner"
      >
        <div className="container">
          <div className="relative flex h-20 items-center justify-between">
            {/* Logo */}
            <Logo
              href={mergedConfig.logo?.href}
              showAttribution
              text={mergedConfig.logo?.text || 'Ventazo'}
            />

            {/* Desktop Navigation - Centered */}
            <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
              <NavLinks items={mergedConfig.navigation} variant="pill" />
            </div>

            {/* Right side: Country Selector + CTAs */}
            <div className="flex items-center gap-4">
              {/* Country Selector - Hidden on mobile */}
              {mergedConfig.showCountrySelector && (
                <div className="hidden sm:block">
                  <CountrySelector
                    showCurrency={mergedConfig.showCurrency}
                    variant="compact"
                  />
                </div>
              )}

              {/* CTA Buttons - Hidden on mobile */}
              <div className="hidden md:block">
                <HeaderCTA buttons={mergedConfig.ctaButtons} />
              </div>

              {/* Mobile Menu Toggle */}
              <button
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                aria-label="Open menu"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Organic accent line when scrolled */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ventazo-500/30 to-transparent transition-opacity duration-500',
            isScrolled ? 'opacity-100' : 'opacity-0'
          )}
        />
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        ctaButtons={mergedConfig.ctaButtons}
        isOpen={isMobileMenuOpen}
        items={mergedConfig.navigation}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  );
}
