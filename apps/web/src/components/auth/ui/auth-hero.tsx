'use client';

/**
 * Auth Hero Component
 *
 * Premium 2025 branded hero panel for split-screen authentication layouts.
 * Features glassmorphism, atmospheric effects, and sophisticated animations.
 *
 * Design Features:
 * - Premium dark gradient background
 * - Glass effect feature cards
 * - Subtle glow animations
 * - Trust-building social proof
 *
 * @module components/auth/ui/auth-hero
 */

import * as React from 'react';
import {
  Shield,
  Zap,
  Users,
  BarChart3,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { BrandLogo } from './brand-logo';

// ============================================
// Types
// ============================================

export interface AuthHeroProps {
  /** Hero variant style */
  variant?: 'default' | 'minimal' | 'gradient' | 'pattern' | 'premium';
  /** Show feature list */
  showFeatures?: boolean;
  /** Show testimonial */
  showTestimonial?: boolean;
  /** Custom headline */
  headline?: string;
  /** Custom subheadline */
  subheadline?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Feature Configuration (i18n keys)
// ============================================

const FEATURES_CONFIG = [
  { icon: Shield, key: 'security' },
  { icon: Zap, key: 'speed' },
  { icon: Users, key: 'collaboration' },
  { icon: BarChart3, key: 'analytics' },
] as const;

// ============================================
// Component
// ============================================

export function AuthHero({
  variant = 'premium',
  showFeatures = true,
  showTestimonial = false,
  headline,
  subheadline,
  className,
}: AuthHeroProps) {
  const { t } = useI18n();
  const isPremium = variant === 'premium';

  // Default content from i18n
  const heroContent = {
    headline: headline || t.auth.hero?.headline || 'Potencia tu negocio con Ventazo',
    subheadline: subheadline || t.auth.hero?.subheadline || 'El CRM inteligente que impulsa tus ventas',
  };

  // Feature list with i18n
  const features = [
    { icon: Shield, text: t.auth.hero?.features?.security || 'Seguridad empresarial' },
    { icon: Zap, text: t.auth.hero?.features?.speed || 'Velocidad sin igual' },
    { icon: Users, text: t.auth.hero?.features?.collaboration || 'Colaboracion en equipo' },
    { icon: BarChart3, text: t.auth.hero?.features?.analytics || 'Analisis avanzado' },
  ];

  // Stats with i18n
  const stats = {
    users: t.auth.hero?.stats?.users || '+10,000 usuarios activos',
    uptime: t.auth.hero?.stats?.uptime || '99.9% uptime',
  };

  return (
    <div
      className={cn(
        // Base styles
        'relative flex w-1/2 flex-col justify-between overflow-hidden',
        // Responsive: hidden on mobile, visible on lg+
        'hidden lg:flex',
        // Height
        'min-h-screen',
        // Padding
        'p-8 xl:p-12',
        className
      )}
    >
      {/* Premium Background Layers - Ventazo Brand */}
      {isPremium ? (
        <>
          {/* Glass overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#003C3B]/60 via-transparent to-[#001A1A]/40 backdrop-blur-sm" />

          {/* Decorative Glows - Ventazo Green */}
          <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-[#0EB58C]/15 blur-[120px]" />
          <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-[#0EB58C]/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[300px] rounded-full bg-[#F97316]/5 blur-[80px]" />

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="premium-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#premium-grid)" />
            </svg>
          </div>
        </>
      ) : (
        <>
          {/* Default Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        </>
      )}

      {/* Content Container */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Logo Section */}
        <div className="mb-auto">
          <BrandLogo
            size="lg"
            variant="light"
            showText
            showAttribution
            withGlow
          />
        </div>

        {/* Hero Content */}
        <div className="my-auto space-y-10">
          {/* Headline */}
          <div className="space-y-5">
            <h1 className={cn(
              'font-bold leading-[1.1] tracking-tight',
              'text-3xl xl:text-4xl 2xl:text-5xl',
              isPremium ? 'text-white' : 'text-primary-foreground'
            )}>
              {heroContent.headline}
            </h1>
            <p className={cn(
              'text-lg xl:text-xl leading-relaxed',
              isPremium ? 'text-[#94A3AB]' : 'text-primary-foreground/80'
            )}>
              {heroContent.subheadline}
            </p>
          </div>

          {/* Feature List - Glass Cards */}
          {showFeatures && (
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={cn(
                    'group flex items-center gap-4 p-3 rounded-xl transition-all duration-300',
                    isPremium
                      ? 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10'
                      : 'bg-white/10 hover:bg-white/15'
                  )}
                  style={{
                    animationDelay: `${200 + index * 100}ms`,
                  }}
                >
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-300',
                    isPremium
                      ? 'bg-gradient-to-br from-[#0EB58C]/20 to-[#003C3B]/30 group-hover:from-[#0EB58C]/30 group-hover:to-[#003C3B]/40'
                      : 'bg-white/10 backdrop-blur-sm'
                  )}>
                    <feature.icon className={cn(
                      'h-5 w-5 transition-colors',
                      isPremium ? 'text-[#0EB58C]' : 'text-white'
                    )} />
                  </div>
                  <span className={cn(
                    'text-sm font-medium xl:text-base',
                    isPremium ? 'text-[#E8ECEC]' : 'text-primary-foreground/90'
                  )}>
                    {feature.text}
                  </span>
                  <ArrowRight className={cn(
                    'ml-auto h-4 w-4 opacity-0 -translate-x-2 transition-all duration-300',
                    'group-hover:opacity-50 group-hover:translate-x-0',
                    isPremium ? 'text-[#0EB58C]' : 'text-white'
                  )} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats/Social Proof */}
        <div className="mt-auto pt-8">
          <div className={cn(
            'flex flex-wrap items-center gap-6 text-sm',
            isPremium ? 'text-[#7A8F8F]' : 'text-primary-foreground/70'
          )}>
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                isPremium ? 'bg-[#0EB58C]/20' : 'bg-white/10'
              )}>
                <Sparkles className={cn(
                  'h-3.5 w-3.5',
                  isPremium ? 'text-[#0EB58C]' : 'text-white'
                )} />
              </div>
              <span>{stats.users}</span>
            </div>
            <div className={cn(
              'h-4 w-px',
              isPremium ? 'bg-white/10' : 'bg-white/20'
            )} />
            <div className="flex items-center gap-2">
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                isPremium ? 'bg-[#0EB58C]/20' : 'bg-white/10'
              )}>
                <CheckCircle2 className={cn(
                  'h-3.5 w-3.5',
                  isPremium ? 'text-[#0EB58C]' : 'text-white'
                )} />
              </div>
              <span>{stats.uptime}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Display Name
// ============================================

AuthHero.displayName = 'AuthHero';
