'use client';

import * as React from 'react';

import { Check } from 'lucide-react';
import Image from 'next/image';

import { Progress } from '@/components/ui/progress';
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
} from '@/lib/onboarding/types';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';


// ============================================
// Onboarding Layout
// ============================================

interface OnboardingLayoutProps {
  children: React.ReactNode;
  showProgress?: boolean;
  showSteps?: boolean;
}

export function OnboardingLayout({
  children,
  showProgress = true,
  showSteps = true,
}: OnboardingLayoutProps) {
  const { currentStep, completedSteps, getProgress } = useOnboardingStore();
  const progress = getProgress();

  // Steps to show (exclude signup and complete)
  const visibleSteps = ONBOARDING_STEPS.filter(
    (s) => s !== 'signup' && s !== 'complete'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 rounded-xl bg-ventazo-500/20 blur-md" />
                <Image
                  alt="Ventazo logo"
                  className="relative h-10 w-10 drop-shadow-lg"
                  height={40}
                  src="/images/hero/logo.png"
                  width={40}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold">Ventazo</span>
                <span className="text-xs font-medium text-muted-foreground">
                  by{' '}
                  <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                    Zuclubit
                  </span>
                </span>
              </div>
            </div>

            {/* Progress */}
            {showProgress && (
              <div className="hidden items-center gap-4 md:flex">
                <span className="text-sm text-muted-foreground">
                  Progreso: {progress}%
                </span>
                <Progress className="w-32" value={progress} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Steps indicator */}
      {showSteps && currentStep !== 'signup' && currentStep !== 'complete' && (
        <div className="border-b bg-white/50 dark:bg-slate-900/50">
          <div className="container mx-auto px-4 py-4">
            <nav aria-label="Progress">
              <ol className="flex items-center justify-center gap-2 md:gap-4">
                {visibleSteps.map((step, index) => {
                  const isCompleted = completedSteps.includes(step);
                  const isCurrent = currentStep === step;
                  const stepNumber = index + 1;

                  return (
                    <li key={step} className="flex items-center">
                      {/* Step */}
                      <div className="flex items-center">
                        <span
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                            isCompleted
                              ? 'bg-primary text-primary-foreground'
                              : isCurrent
                                ? 'border-2 border-primary bg-background text-primary'
                                : 'border-2 border-muted bg-background text-muted-foreground'
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            stepNumber
                          )}
                        </span>
                        <span
                          className={cn(
                            'ml-2 hidden text-sm font-medium md:block',
                            isCurrent
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          {ONBOARDING_STEP_LABELS[step]}
                        </span>
                      </div>

                      {/* Connector */}
                      {index < visibleSteps.length - 1 && (
                        <div
                          className={cn(
                            'mx-2 h-0.5 w-8 md:w-12',
                            isCompleted ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 py-4 dark:bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <Image
                alt="Ventazo logo"
                className="h-5 w-5"
                height={20}
                src="/images/hero/logo.png"
                width={20}
              />
              <span className="text-sm font-medium">
                Ventazo{' '}
                <span className="text-muted-foreground font-normal">by</span>{' '}
                <span className="bg-gradient-to-r from-[#00cfff] to-[#00e5c3] bg-clip-text text-transparent font-semibold">
                  Zuclubit
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================
// Step Card Component
// ============================================

interface StepCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function StepCard({
  title,
  description,
  children,
  footer,
}: StepCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-lg md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Content */}
      <div className="space-y-6">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          {footer}
        </div>
      )}
    </div>
  );
}
