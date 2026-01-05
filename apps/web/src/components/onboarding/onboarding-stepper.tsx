'use client';

/**
 * Premium Onboarding Stepper Component
 *
 * Modern 2025 design with:
 * - Smooth animations
 * - Premium glassmorphism design
 * - Mobile-responsive layout
 * - i18n support
 * - Accessibility features
 * - Ventazo brand colors
 *
 * @module components/onboarding/onboarding-stepper
 */

import * as React from 'react';
import {
  Check,
  Building2,
  Palette,
  LayoutGrid,
  Clock,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTranslations as getOnboardingTranslations, type SupportedLocale } from '@/lib/i18n/onboarding';
import type { OnboardingStep } from '@/lib/onboarding/types';

// ============================================
// Step Configuration
// ============================================

export interface StepConfig {
  id: OnboardingStep;
  labelKey: 'business' | 'branding' | 'modules' | 'hours' | 'team';
  icon: React.ReactNode;
}

/**
 * Main stepper steps configuration - Ventazo Brand
 */
export const STEPPER_STEPS: StepConfig[] = [
  {
    id: 'create-business',
    labelKey: 'business',
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    id: 'branding',
    labelKey: 'branding',
    icon: <Palette className="h-5 w-5" />,
  },
  {
    id: 'modules',
    labelKey: 'modules',
    icon: <LayoutGrid className="h-5 w-5" />,
  },
  {
    id: 'business-hours',
    labelKey: 'hours',
    icon: <Clock className="h-5 w-5" />,
  },
  {
    id: 'invite-team',
    labelKey: 'team',
    icon: <Users className="h-5 w-5" />,
  },
];

// ============================================
// Types
// ============================================

export interface OnboardingStepperProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  variant?: 'default' | 'compact' | 'minimal';
  showMobileLabels?: boolean;
  className?: string;
  onStepClick?: (step: OnboardingStep) => void;
  locale?: SupportedLocale;
}

// ============================================
// Helper Functions
// ============================================

export function getStepIndex(step: OnboardingStep): number {
  return STEPPER_STEPS.findIndex((s) => s.id === step);
}

export function getStepConfig(step: OnboardingStep): StepConfig | undefined {
  return STEPPER_STEPS.find((s) => s.id === step);
}

export function isStepVisible(step: OnboardingStep): boolean {
  return STEPPER_STEPS.some((s) => s.id === step);
}

export function calculateProgress(completedSteps: OnboardingStep[]): number {
  const visibleCompleted = completedSteps.filter(isStepVisible);
  return Math.round((visibleCompleted.length / STEPPER_STEPS.length) * 100);
}

// ============================================
// Main Component - Premium Style
// ============================================

export function OnboardingStepper({
  currentStep,
  completedSteps,
  variant = 'default',
  className,
  onStepClick,
  locale = 'es',
}: OnboardingStepperProps) {
  const t = getOnboardingTranslations(locale);

  if (currentStep === 'signup' || currentStep === 'complete') {
    return null;
  }

  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="Progreso del onboarding" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between" role="list">
        {STEPPER_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isPast = index < currentIndex;
          const isClickable = isCompleted && onStepClick;
          const stepTranslations = t.steps[step.labelKey];

          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center',
                index < STEPPER_STEPS.length - 1 && 'flex-1'
              )}
            >
              {/* Step indicator */}
              <StepIndicator
                config={step}
                index={index}
                isClickable={!!isClickable}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                label={variant === 'compact' ? stepTranslations.shortTitle : stepTranslations.title}
                description={stepTranslations.description}
                showLabel={variant !== 'minimal'}
                variant={variant}
                onClick={isClickable ? () => onStepClick(step.id) : undefined}
              />

              {/* Connector line */}
              {index < STEPPER_STEPS.length - 1 && variant !== 'minimal' && (
                <StepConnector
                  isCompleted={isPast || isCompleted}
                  isCurrent={isCurrent}
                  variant={variant}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================
// Step Indicator Component - Premium Style
// ============================================

interface StepIndicatorProps {
  config: StepConfig;
  index: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isClickable: boolean;
  label: string;
  description: string;
  variant: 'default' | 'compact' | 'minimal';
  showLabel: boolean;
  onClick?: () => void;
}

function StepIndicator({
  config,
  index,
  isCompleted,
  isCurrent,
  isClickable,
  label,
  description,
  variant,
  showLabel,
  onClick,
}: StepIndicatorProps) {
  const Component = isClickable ? 'button' : 'div';

  const circleSize = variant === 'compact' ? 'h-10 w-10' : 'h-12 w-12';

  const circleClasses = cn(
    'relative flex items-center justify-center rounded-full transition-all duration-300 ease-out',
    circleSize,
    isCompleted
      ? 'bg-gradient-to-br from-[#003C3B] to-[#0EB58C] text-white shadow-lg shadow-[#0EB58C]/25'
      : isCurrent
        ? 'bg-gradient-to-br from-[#003C3B] to-[#0EB58C] text-white shadow-lg shadow-[#0EB58C]/30 ring-4 ring-[#0EB58C]/20'
        : 'bg-white/[0.05] border border-white/[0.1] text-[#7A8F8F]',
    isClickable && 'cursor-pointer hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#0EB58C] focus:ring-offset-2 focus:ring-offset-[#001A1A]'
  );

  const labelClasses = cn(
    'font-medium transition-colors duration-200 text-center',
    variant === 'compact' ? 'text-xs' : 'text-sm',
    isCurrent
      ? 'text-white'
      : isCompleted
        ? 'text-[#B8C4C4]'
        : 'text-[#7A8F8F]'
  );

  return (
    <div className="flex flex-col items-center gap-3 min-w-0">
      <Component
        aria-current={isCurrent ? 'step' : undefined}
        aria-label={`${label}${isCompleted ? ' (completado)' : isCurrent ? ' (actual)' : ''}`}
        className={circleClasses}
        type={isClickable ? 'button' : undefined}
        onClick={onClick}
      >
        {/* Pulse animation for current step */}
        {isCurrent && (
          <span className="absolute inset-0 rounded-full animate-ping bg-[#0EB58C]/30" />
        )}

        {/* Icon or checkmark */}
        <span className="relative z-10">
          {isCompleted ? (
            <Check className="h-6 w-6" aria-hidden="true" />
          ) : (
            config.icon
          )}
        </span>
      </Component>

      {/* Label */}
      {showLabel && (
        <div className="text-center max-w-[100px]">
          <span className={labelClasses}>{label}</span>
          {variant === 'default' && (
            <p className="text-xs text-[#7A8F8F] mt-0.5 hidden lg:block">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step Connector Component - Premium Style
// ============================================

interface StepConnectorProps {
  isCompleted: boolean;
  isCurrent: boolean;
  variant: 'default' | 'compact' | 'minimal';
}

function StepConnector({ isCompleted, isCurrent, variant }: StepConnectorProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex-1 relative overflow-hidden',
        variant === 'compact' ? 'mx-2 h-0.5' : 'mx-4 h-1 rounded-full',
        'bg-white/[0.08]'
      )}
    >
      {/* Animated fill - Ventazo green gradient */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 bg-gradient-to-r from-[#003C3B] to-[#0EB58C] transition-all duration-500 ease-out rounded-full',
          isCompleted ? 'w-full' : isCurrent ? 'w-1/2' : 'w-0'
        )}
      />
    </div>
  );
}

// ============================================
// Progress Bar Component - Premium Style
// ============================================

interface StepperProgressBarProps {
  completedSteps: OnboardingStep[];
  className?: string;
  locale?: SupportedLocale;
}

export function StepperProgressBar({
  completedSteps,
  className,
  locale = 'es',
}: StepperProgressBarProps) {
  const t = getOnboardingTranslations(locale);
  const progress = calculateProgress(completedSteps);

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-[#0EB58C]">
          {progress}%
        </span>
        <span className="text-sm text-[#7A8F8F]">
          {t.progress.completed}
        </span>
      </div>
      <div className="relative h-2.5 w-40 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#003C3B] via-[#0EB58C] to-[#0EB58C] transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Mobile Stepper Component - Premium Style
// ============================================

interface MobileStepperProps {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  className?: string;
  locale?: SupportedLocale;
}

export function MobileStepper({
  currentStep,
  completedSteps,
  className,
  locale = 'es',
}: MobileStepperProps) {
  const t = getOnboardingTranslations(locale);
  const currentConfig = getStepConfig(currentStep);
  const currentIndex = getStepIndex(currentStep);
  const totalSteps = STEPPER_STEPS.length;

  if (!currentConfig || currentStep === 'signup' || currentStep === 'complete') {
    return null;
  }

  const stepTranslations = t.steps[currentConfig.labelKey];

  return (
    <div className={cn('px-4 py-4', className)}>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">
            {stepTranslations.title}
          </span>
          <span className="text-sm font-medium text-[#7A8F8F]">
            {t.progress.step} {currentIndex + 1} {t.progress.of} {totalSteps}
          </span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-[#003C3B] to-[#0EB58C]"
            style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2">
        {STEPPER_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;

          return (
            <div
              key={step.id}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                isCurrent ? 'w-8' : 'w-2.5',
                isCompleted || isCurrent
                  ? 'bg-gradient-to-r from-[#003C3B] to-[#0EB58C]'
                  : 'bg-white/[0.15]'
              )}
            />
          );
        })}
      </div>

      {/* Current step description */}
      <p className="mt-3 text-center text-sm text-[#7A8F8F]">
        {stepTranslations.description}
      </p>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export { STEPPER_STEPS as ONBOARDING_STEPS_CONFIG };
