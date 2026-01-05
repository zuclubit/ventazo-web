'use client';

/**
 * Premium Onboarding Layout Component
 *
 * Modern 2025 design with:
 * - Dark gradient background matching login
 * - Glassmorphism cards
 * - Premium atmospheric effects
 * - Animated progress stepper
 * - Mobile-first responsive
 *
 * @module components/onboarding/onboarding-layout
 */

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';
import { getTranslations as getOnboardingTranslations, type SupportedLocale } from '@/lib/i18n/onboarding';
import {
  OnboardingStepper,
  StepperProgressBar,
  MobileStepper,
  calculateProgress,
} from './onboarding-stepper';

// ============================================
// Types
// ============================================

interface OnboardingLayoutProps {
  children: React.ReactNode;
  showProgress?: boolean;
  showSteps?: boolean;
  locale?: SupportedLocale;
}

// ============================================
// Premium Background Component - Ventazo Brand
// ============================================

function PremiumBackground() {
  return (
    <>
      {/* Base Gradient - Ventazo Dark Green */}
      <div
        className="fixed inset-0"
        style={{
          background: 'linear-gradient(165deg, #001A1A 0%, #002525 25%, #003C3B 50%, #002D2D 75%, #001E1E 100%)',
        }}
      />

      {/* Radial Gradient Overlay - Ventazo Green */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(14,181,140,0.12),transparent)]" />

      {/* Atmospheric Glows - Ventazo Brand Colors */}
      <div className="pointer-events-none fixed inset-0">
        {/* Top-right green glow */}
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#0EB58C]/12 blur-[150px]" />
        {/* Left green accent */}
        <div className="absolute -left-20 top-1/3 h-[400px] w-[400px] rounded-full bg-[#0EB58C]/8 blur-[120px]" />
        {/* Bottom subtle warmth */}
        <div className="absolute -bottom-32 right-1/4 h-[350px] w-[350px] rounded-full bg-[#0EB58C]/6 blur-[100px]" />
      </div>

      {/* Noise Texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(0, 30, 30, 0.4) 100%)',
        }}
      />
    </>
  );
}

// ============================================
// Main Layout Component
// ============================================

export function OnboardingLayout({
  children,
  showProgress = true,
  showSteps = true,
  locale = 'es',
}: OnboardingLayoutProps) {
  const { currentStep, completedSteps } = useOnboardingStore();
  const t = getOnboardingTranslations(locale);

  const shouldShowStepper = showSteps && currentStep !== 'signup' && currentStep !== 'complete';
  const progress = calculateProgress(completedSteps);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Premium Background */}
      <PremiumBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[rgba(0,30,30,0.7)] border-b border-white/[0.05]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo />

            {/* Progress Bar (Desktop only) */}
            {showProgress && (
              <div className="hidden md:flex items-center gap-6">
                <StepperProgressBar completedSteps={completedSteps} locale={locale} />
              </div>
            )}

            {/* Mobile progress indicator */}
            {showProgress && (
              <div className="flex md:hidden items-center gap-2">
                <span className="text-lg font-bold text-[#0EB58C]">
                  {progress}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Stepper */}
        {shouldShowStepper && (
          <div className="md:hidden border-t border-white/[0.05] bg-[rgba(0,30,30,0.5)]">
            <MobileStepper
              completedSteps={completedSteps}
              currentStep={currentStep}
              locale={locale}
            />
          </div>
        )}
      </header>

      {/* Desktop Stepper */}
      {shouldShowStepper && (
        <div className="hidden md:block relative z-10 border-b border-white/[0.05] bg-[rgba(0,30,30,0.3)] backdrop-blur-sm">
          <div className="container mx-auto px-4 lg:px-8 py-8">
            <OnboardingStepper
              completedSteps={completedSteps}
              currentStep={currentStep}
              variant="default"
              locale={locale}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 relative z-10">
        <div className="container mx-auto px-4 lg:px-8 py-8 md:py-12">
          <div className="mx-auto max-w-2xl">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <Footer locale={locale} />
    </div>
  );
}

// ============================================
// Logo Component - Premium Style
// ============================================

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-[1.02]">
      {/* Logo Image with Glow Effect */}
      <div className="relative">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 blur-lg bg-[#0EB58C]/40 group-hover:bg-[#0EB58C]/50 transition-all"
          style={{ borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%' }}
        />
        <Image
          alt="Ventazo logo"
          className="relative h-10 w-10 drop-shadow-lg transition-transform group-hover:scale-105"
          height={40}
          src="/images/hero/logo.png"
          width={40}
          priority
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#E6E6E6] transition-colors">
          Ventazo
        </span>
        <span className="text-xs font-medium text-[#7A8F8F]">
          by{' '}
          <span className="bg-gradient-to-r from-[#003C3B] to-[#0EB58C] bg-clip-text font-semibold text-transparent">
            Zuclubit
          </span>
        </span>
      </div>
    </Link>
  );
}

// ============================================
// Footer Component - Premium Style
// ============================================

interface FooterProps {
  locale?: SupportedLocale;
}

function Footer({ locale = 'es' }: FooterProps) {
  const t = getOnboardingTranslations(locale);

  return (
    <footer className="relative z-10 border-t border-white/[0.05] bg-[rgba(0,30,30,0.5)] backdrop-blur-sm py-6">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-3">
            <Image
              alt="Ventazo logo"
              className="h-6 w-6 opacity-80"
              height={24}
              src="/images/hero/logo.png"
              width={24}
            />
            <span className="text-sm font-medium">
              <span className="text-white">Ventazo</span>{' '}
              <span className="font-normal text-[#7A8F8F]">by</span>{' '}
              <span className="bg-gradient-to-r from-[#003C3B] to-[#0EB58C] bg-clip-text font-semibold text-transparent">
                Zuclubit
              </span>
            </span>
          </div>
          <p className="text-xs text-[#7A8F8F]">
            {t.footer.copyright} {new Date().getFullYear()} {t.footer.allRightsReserved}
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Step Card Component - Premium Glassmorphism
// ============================================

interface StepCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function StepCard({
  title,
  description,
  children,
  footer,
  className,
  icon,
}: StepCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        // Premium glass styling
        'backdrop-blur-xl',
        'bg-[rgba(0,60,59,0.35)]',
        'border border-[rgba(255,255,255,0.1)]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(14,181,140,0.1)]',
        className
      )}
    >
      {/* Decorative gradient top bar */}
      <div className="h-1.5 bg-gradient-to-r from-[#003C3B] via-[#0EB58C] to-[#003C3B]" />

      <div className="p-6 md:p-8">
        {/* Header */}
        {(title || description) && (
          <div className="mb-8">
            {icon && (
              <div className="mb-4 inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-br from-[#003C3B] to-[#0EB58C] text-white shadow-lg shadow-[#0EB58C]/25">
                {icon}
              </div>
            )}
            {title && (
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-2 text-base text-[#B8C4C4]">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/[0.08]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Form Section Component - Premium Style
// ============================================

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-[#7A8F8F]">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================
// Option Card Component - Premium Style
// ============================================

interface OptionCardProps {
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
  disabled,
  className,
  children,
}: OptionCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
        'hover:border-[#0EB58C]/50 hover:bg-[rgba(14,181,140,0.05)]',
        'focus:outline-none focus:ring-2 focus:ring-[#0EB58C] focus:ring-offset-2 focus:ring-offset-[#001A1A]',
        selected
          ? 'border-[#0EB58C] bg-[rgba(14,181,140,0.1)] shadow-md shadow-[#0EB58C]/10'
          : 'border-white/[0.1] bg-[rgba(0,60,59,0.2)]',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className={cn(
            'flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg text-lg',
            selected
              ? 'bg-[#0EB58C]/20 text-[#0EB58C]'
              : 'bg-white/[0.05] text-[#7A8F8F]'
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-medium',
            selected ? 'text-[#0EB58C]' : 'text-white'
          )}>
            {title}
          </p>
          {description && (
            <p className="mt-0.5 text-sm text-[#7A8F8F]">
              {description}
            </p>
          )}
          {children}
        </div>
        {selected && (
          <div className="flex-shrink-0">
            <div className="h-5 w-5 rounded-full bg-[#0EB58C] flex items-center justify-center">
              <svg
                className="h-3 w-3 text-white"
                fill="currentColor"
                viewBox="0 0 12 12"
              >
                <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================
// Module Toggle Component - Premium Style
// ============================================

interface ModuleToggleProps {
  enabled: boolean;
  onToggle: () => void;
  icon?: string;
  title: string;
  description?: string;
  recommended?: boolean;
  disabled?: boolean;
}

export function ModuleToggle({
  enabled,
  onToggle,
  icon,
  title,
  description,
  recommended,
  disabled,
}: ModuleToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'relative w-full rounded-xl border-2 p-4 text-left transition-all duration-200',
        'hover:border-[#0EB58C]/30 hover:shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-[#0EB58C]/50 focus:ring-offset-1 focus:ring-offset-[#001A1A]',
        enabled
          ? 'border-[#0EB58C]/40 bg-[rgba(14,181,140,0.1)]'
          : 'border-white/[0.08] bg-[rgba(0,60,59,0.2)]',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {recommended && (
        <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white rounded-full shadow-sm">
          Recomendado
        </span>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="text-xl flex-shrink-0">{icon}</span>
          )}
          <div>
            <p className="font-medium text-white">{title}</p>
            {description && (
              <p className="text-sm text-[#7A8F8F]">{description}</p>
            )}
          </div>
        </div>
        <div
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors duration-200',
            enabled ? 'bg-[#0EB58C]' : 'bg-white/[0.15]'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200',
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </div>
      </div>
    </button>
  );
}

// ============================================
// Exports
// ============================================

export { OnboardingStepper, StepperProgressBar, MobileStepper } from './onboarding-stepper';
