'use client';

/**
 * Onboarding Complete Page - Premium Celebration
 *
 * Celebration screen with:
 * - Premium confetti animation
 * - Configuration summary with glassmorphism cards
 * - Quick start actions with correct navigation
 * - Responsive design for all devices
 *
 * Design: Premium glassmorphism dark theme matching Ventazo brand.
 *
 * @module app/onboarding/complete/page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Rocket,
  UserPlus,
  BarChart3,
  Settings,
  ArrowRight,
  Building2,
  Palette,
  LayoutGrid,
  Clock,
  Users,
  Sparkles,
  PartyPopper,
} from 'lucide-react';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTranslations, detectLocale, type SupportedLocale } from '@/lib/i18n/onboarding';
import { useOnboardingStore } from '@/store/onboarding.store';
import { completeOnboardingAction } from '@/lib/session/actions';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_SIZE_LABELS,
  CRM_MODULE_LABELS,
  type BusinessType,
  type BusinessSize,
  type CRMModules,
} from '@/lib/onboarding/types';

// ============================================
// Premium Styling Classes
// ============================================

const premiumButtonPrimary = cn(
  'h-14 rounded-xl font-semibold text-base',
  'bg-gradient-to-r from-[#003C3B] to-[#0EB58C]',
  'text-white shadow-lg shadow-[#0EB58C]/25',
  'hover:shadow-xl hover:shadow-[#0EB58C]/30 hover:scale-[1.02]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
  'transition-all duration-200'
);

const glassCard = cn(
  'rounded-2xl',
  'bg-white/[0.03] border border-white/10',
  'backdrop-blur-sm'
);

// ============================================
// Complete Page
// ============================================

export default function CompletePage() {
  const router = useRouter();
  const { data, reset } = useOnboardingStore();
  const [showContent, setShowContent] = React.useState(false);
  const [isNavigating, setIsNavigating] = React.useState(false);

  // i18n
  const [locale] = React.useState<SupportedLocale>(detectLocale());
  const t = getTranslations(locale);

  // Quick Actions with translations and correct routes
  const QUICK_ACTIONS = [
    {
      icon: UserPlus,
      title: locale === 'en' ? 'Add your first lead' : 'Agregar primer lead',
      description: locale === 'en' ? 'Start capturing opportunities' : 'Comienza a capturar oportunidades',
      href: '/app/leads',
      color: 'from-[#0EB58C] to-[#059669]',
      bgColor: 'bg-[#0EB58C]/10',
    },
    {
      icon: BarChart3,
      title: locale === 'en' ? 'View dashboard' : 'Ver dashboard',
      description: locale === 'en' ? 'Metrics and KPIs of your business' : 'Métricas y KPIs de tu negocio',
      href: '/app/dashboard',
      color: 'from-[#3B82F6] to-[#1D4ED8]',
      bgColor: 'bg-[#3B82F6]/10',
    },
    {
      icon: Settings,
      title: locale === 'en' ? 'Settings' : 'Configuración',
      description: locale === 'en' ? 'Customize your CRM' : 'Ajusta tu CRM a tu medida',
      href: '/app/settings/profile',
      color: 'from-[#F97316] to-[#EA580C]',
      bgColor: 'bg-[#F97316]/10',
    },
  ];

  // Premium confetti animation with Ventazo colors
  React.useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ['#0EB58C', '#003C3B', '#F97316', '#FFFFFF'];

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      void confetti({
        particleCount,
        spread: 100,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors,
        ticks: 80,
        gravity: 1.2,
        scalar: 1.2,
        shapes: ['circle', 'square'],
      });
      void confetti({
        particleCount,
        spread: 100,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors,
        ticks: 80,
        gravity: 1.2,
        scalar: 1.2,
        shapes: ['circle', 'square'],
      });
    }, 200);

    const timer = setTimeout(() => setShowContent(true), 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  // Complete onboarding and navigate
  const handleNavigation = async (href: string) => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      // Mark onboarding as complete in backend
      await completeOnboardingAction();
      // Clear local store
      reset();
      // Navigate
      void router.push(href);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Navigate anyway
      reset();
      void router.push(href);
    }
  };

  const handleGoToDashboard = () => handleNavigation('/app/dashboard');

  // Get active modules list
  const activeModules = data.modules
    ? (Object.entries(data.modules) as [keyof CRMModules, boolean][])
        .filter(([, enabled]) => enabled)
        .map(([key]) => CRM_MODULE_LABELS[key]?.name || key)
    : [];

  // Count enabled business days
  const enabledDays = data.businessHours
    ? Object.values(data.businessHours).filter((d) => d.enabled).length
    : 0;

  return (
    <OnboardingLayout showSteps={false} showProgress={false} locale={locale}>
      <div className="space-y-6">
        {/* Hero Section - Success Animation */}
        <div className={cn(glassCard, 'p-6 md:p-8 text-center')}>
          {/* Decorative gradient top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003C3B] via-[#0EB58C] to-[#F97316] rounded-t-2xl" />

          {/* Success Icon */}
          <div className="relative mx-auto mb-6 flex h-24 w-24 md:h-28 md:w-28 items-center justify-center">
            {/* Animated rings */}
            <div className="absolute inset-0 animate-ping rounded-full bg-[#0EB58C] opacity-20" />
            <div className="absolute inset-2 animate-pulse rounded-full bg-[#0EB58C]/30" />
            {/* Icon container */}
            <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#003C3B] to-[#0EB58C] shadow-2xl shadow-[#0EB58C]/40">
              <CheckCircle2 className="h-10 w-10 md:h-12 md:w-12 text-white" />
            </div>
            {/* Decorative elements */}
            <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-[#F97316] animate-pulse" />
            <PartyPopper className="absolute -bottom-1 -left-1 h-5 w-5 text-[#0EB58C] animate-bounce" />
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-white">
            {t.complete.title}! <span className="inline-block animate-bounce">🎉</span>
          </h1>
          <p className="text-base md:text-lg text-[#B8C4C4] max-w-md mx-auto">
            Tu CRM está configurado y listo para usar.
          </p>
        </div>

        {/* Configuration Summary Card */}
        <div className={cn(
          glassCard,
          'p-5 md:p-6',
          'transition-all duration-500',
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-white">
            <CheckCircle2 className="h-4 w-4 text-[#0EB58C]" />
            Tu configuración
          </h3>

          {/* Summary Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Business Info */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003C3B]/50 to-[#0EB58C]/30">
                <Building2 className="h-5 w-5 text-[#0EB58C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#7A8F8F] mb-0.5">Negocio</p>
                <p className="text-sm font-medium text-white truncate">
                  {data.businessName || (data.businessType ? BUSINESS_TYPE_LABELS[data.businessType as BusinessType] : 'No especificado')}
                </p>
                {data.businessSize && (
                  <p className="text-xs text-[#B8C4C4]">
                    {BUSINESS_SIZE_LABELS[data.businessSize as BusinessSize]}
                  </p>
                )}
              </div>
            </div>

            {/* Brand Colors */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003C3B]/50 to-[#0EB58C]/30">
                <Palette className="h-5 w-5 text-[#0EB58C]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#7A8F8F] mb-0.5">Marca</p>
                <div className="flex items-center gap-2">
                  {data.primaryColor && (
                    <div
                      className="h-6 w-6 rounded-lg border border-white/20 shadow-sm"
                      style={{ backgroundColor: data.primaryColor }}
                      title={`Primario: ${data.primaryColor}`}
                    />
                  )}
                  {data.secondaryColor && (
                    <div
                      className="h-6 w-6 rounded-lg border border-white/20 shadow-sm"
                      style={{ backgroundColor: data.secondaryColor }}
                      title={`Secundario: ${data.secondaryColor}`}
                    />
                  )}
                  <span className="text-xs text-[#B8C4C4]">
                    {data.primaryColor ? 'Personalizados' : 'Por defecto'}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Modules */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003C3B]/50 to-[#0EB58C]/30">
                <LayoutGrid className="h-5 w-5 text-[#0EB58C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#7A8F8F] mb-0.5">Módulos activos</p>
                <p className="text-sm text-white">
                  <span className="font-semibold text-[#0EB58C]">{activeModules.length}</span>
                  {activeModules.length > 0 && (
                    <span className="text-xs text-[#B8C4C4] ml-1">
                      ({activeModules.slice(0, 3).join(', ')}
                      {activeModules.length > 3 && `, +${activeModules.length - 3}`})
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Business Hours */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003C3B]/50 to-[#0EB58C]/30">
                <Clock className="h-5 w-5 text-[#0EB58C]" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#7A8F8F] mb-0.5">Horarios</p>
                <p className="text-sm text-white">
                  <span className="font-semibold text-[#0EB58C]">{enabledDays}</span>
                  <span className="text-xs text-[#B8C4C4] ml-1">
                    día{enabledDays !== 1 ? 's' : ''} configurado{enabledDays !== 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>

            {/* Team Invitations - Full width if exists */}
            {data.invitations && data.invitations.length > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 sm:col-span-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#003C3B]/50 to-[#0EB58C]/30">
                  <Users className="h-5 w-5 text-[#0EB58C]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#7A8F8F] mb-0.5">Equipo</p>
                  <p className="text-sm text-white">
                    <span className="font-semibold text-[#0EB58C]">{data.invitations.length}</span>
                    <span className="text-xs text-[#B8C4C4] ml-1">
                      invitación{data.invitations.length !== 1 ? 'es' : ''} enviada{data.invitations.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className={cn(
          'space-y-4',
          'transition-all duration-500 delay-200',
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          <h3 className="text-sm font-semibold text-white px-1">
            ¿Por dónde empezar?
          </h3>

          {/* Actions Grid - Responsive */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.href}
                disabled={isNavigating}
                className={cn(
                  glassCard,
                  'flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-2 p-4 md:p-5 text-left transition-all duration-200',
                  'hover:border-[#0EB58C]/40 hover:bg-[#0EB58C]/5 hover:scale-[1.02]',
                  'active:scale-[0.98]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                  'group'
                )}
                onClick={() => handleNavigation(action.href)}
              >
                <div className={cn(
                  'flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl',
                  action.bgColor,
                  'transition-all duration-200 group-hover:scale-110'
                )}>
                  <action.icon className="h-6 w-6 md:h-7 md:w-7 text-[#0EB58C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-semibold text-white group-hover:text-[#0EB58C] transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs md:text-sm text-[#7A8F8F] mt-0.5 line-clamp-2">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-[#7A8F8F] shrink-0 md:hidden group-hover:text-[#0EB58C] group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* Main CTA Button */}
        <div className={cn(
          'pt-2',
          'transition-all duration-500 delay-300',
          showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        )}>
          <Button
            className={cn(premiumButtonPrimary, 'w-full')}
            size="lg"
            onClick={handleGoToDashboard}
            disabled={isNavigating}
          >
            {isNavigating ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cargando...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Comenzar a usar el CRM
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
