'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Rocket,
  Users,
  BarChart3,
  Calendar,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

import {
  OnboardingLayout,
  StepCard,
} from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// Feature Cards
// ============================================

const QUICK_START_FEATURES = [
  {
    icon: Users,
    title: 'Agrega tu primer lead',
    description: 'Comienza a capturar oportunidades de negocio',
    href: '/leads/new',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
  },
  {
    icon: BarChart3,
    title: 'Explora el dashboard',
    description: 'Visualiza métricas y KPIs de tu negocio',
    href: '/dashboard',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950',
  },
  {
    icon: Calendar,
    title: 'Programa una tarea',
    description: 'Organiza tu día con recordatorios',
    href: '/tasks/new',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
  },
];

// ============================================
// Complete Page
// ============================================

export default function CompletePage() {
  const router = useRouter();
  const { data, reset } = useOnboardingStore();
  const [showFeatures, setShowFeatures] = React.useState(false);

  // Trigger confetti on mount
  React.useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        setShowFeatures(true);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Confetti from both sides
      void confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      void confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    // Show features after animation
    const timer = setTimeout(() => {
      setShowFeatures(true);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleGoToDashboard = () => {
    // Clear onboarding state
    reset();
    // Navigate to dashboard
    void router.push('/dashboard');
  };

  const handleQuickAction = (href: string) => {
    reset();
    void router.push(href);
  };

  return (
    <OnboardingLayout>
      <StepCard
        description=""
        footer={
          <Button
            className="w-full"
            size="lg"
            onClick={handleGoToDashboard}
          >
            <Rocket className="mr-2 h-5 w-5" />
            Ir al Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        }
        title=""
      >
        {/* Success Animation */}
        <div className="text-center">
          <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-25" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="mb-2 text-3xl font-bold text-foreground">
            ¡Felicidades, {data.firstName || 'Usuario'}!
          </h1>
          <p className="mb-2 text-lg text-muted-foreground">
            Tu CRM está listo para usar
          </p>

          {data.businessName && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              {data.businessName}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mb-8 rounded-lg bg-muted/50 p-4">
          <h3 className="mb-3 font-semibold">Resumen de configuración</h3>
          <div className="grid gap-2 text-sm">
            {data.businessType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo de negocio:</span>
                <span className="font-medium capitalize">
                  {data.businessType.replace('_', ' ')}
                </span>
              </div>
            )}
            {data.businessSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tamaño:</span>
                <span className="font-medium capitalize">
                  {data.businessSize.replace('_', ' ')}
                </span>
              </div>
            )}
            {data.modules && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Módulos activos:</span>
                <span className="font-medium">
                  {Object.values(data.modules).filter(Boolean).length} módulos
                </span>
              </div>
            )}
            {data.invitations && data.invitations.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Invitaciones enviadas:
                </span>
                <span className="font-medium">
                  {data.invitations.length} personas
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Start Features */}
        <div
          className={cn(
            'space-y-4 transition-all duration-500',
            showFeatures
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          )}
        >
          <h3 className="font-semibold">¿Por dónde empezar?</h3>
          <div className="grid gap-3">
            {QUICK_START_FEATURES.map((feature) => (
              <button
                key={feature.href}
                className={cn(
                  'flex items-center gap-4 rounded-lg border p-4 text-left transition-all hover:border-primary/50 hover:shadow-md',
                  feature.bgColor
                )}
                onClick={() => handleQuickAction(feature.href)}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg bg-white dark:bg-gray-800',
                    feature.color
                  )}
                >
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Necesitas ayuda? Visita nuestra{' '}
          <a className="text-primary hover:underline" href="/help">
            base de conocimiento
          </a>{' '}
          o{' '}
          <a className="text-primary hover:underline" href="/support">
            contacta a soporte
          </a>
        </p>
      </StepCard>
    </OnboardingLayout>
  );
}
