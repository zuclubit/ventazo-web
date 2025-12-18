'use client';

/**
 * Onboarding Setup Page - Premium Dark Theme
 *
 * This page handles three sequential setup steps:
 * 1. Branding - Colors and company identity
 * 2. Modules - CRM feature selection
 * 3. Business Hours - Operating schedule
 *
 * Design: Premium glassmorphism dark theme matching Ventazo brand.
 *
 * @module app/onboarding/setup/page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ArrowLeft, Palette, LayoutGrid, Clock } from 'lucide-react';

import { OnboardingLayout, StepCard } from '@/components/onboarding/onboarding-layout';
import { SmartBranding } from '@/components/onboarding/smart-branding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  updateTenantBrandingAction,
  updateTenantModulesAction,
  updateBusinessHoursAction,
  getSessionUserAction,
} from '@/lib/session/actions';
import {
  CRM_MODULE_LABELS,
  type CRMModules,
  type BusinessHours,
  type OnboardingStep,
} from '@/lib/onboarding/types';
import { getTranslations, detectLocale, type SupportedLocale } from '@/lib/i18n/onboarding';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// Premium Styling Classes
// ============================================

const premiumInputClasses = cn(
  'h-12 rounded-xl border-white/10 bg-white/[0.03]',
  'text-white placeholder:text-[#7A8F8F]',
  'focus:border-[#0EB58C]/50 focus:ring-2 focus:ring-[#0EB58C]/20',
  'hover:border-white/20 transition-all duration-200'
);

const premiumButtonPrimary = cn(
  'h-12 rounded-xl font-semibold',
  'bg-gradient-to-r from-[#003C3B] to-[#0EB58C]',
  'text-white shadow-lg shadow-[#0EB58C]/25',
  'hover:shadow-xl hover:shadow-[#0EB58C]/30 hover:scale-[1.02]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
  'transition-all duration-200'
);

const premiumButtonGhost = cn(
  'h-12 rounded-xl font-medium',
  'text-[#B8C4C4] hover:text-white',
  'hover:bg-white/[0.05]',
  'transition-all duration-200'
);

// ============================================
// Setup Sub-step Configuration
// ============================================

/**
 * Maps internal setup sub-steps to the main stepper steps
 * This ensures the main stepper shows the correct current step
 */
const SETUP_SUBSTEP_MAP: Record<string, OnboardingStep> = {
  branding: 'branding',
  modules: 'modules',
  hours: 'business-hours',
};

type SetupSubStep = 'branding' | 'modules' | 'hours';

const SETUP_SUBSTEPS: SetupSubStep[] = ['branding', 'modules', 'hours'];

// ============================================
// Step Content Configuration (i18n-aware) - With Icons
// ============================================

const getStepConfig = (t: ReturnType<typeof getTranslations>) => ({
  branding: {
    title: t.branding.title,
    description: t.branding.subtitle,
    icon: <Palette className="h-6 w-6" />,
  },
  modules: {
    title: t.modules.title,
    description: t.modules.subtitle,
    icon: <LayoutGrid className="h-6 w-6" />,
  },
  hours: {
    title: t.businessHours.title,
    description: t.businessHours.subtitle,
    icon: <Clock className="h-6 w-6" />,
  },
});

// ============================================
// Setup Page Component
// ============================================

export default function SetupPage() {
  const router = useRouter();
  const { currentStep, data, updateData, setStep, completeStep } = useOnboardingStore();

  // i18n
  const [locale] = React.useState<SupportedLocale>(detectLocale());
  const t = getTranslations(locale);

  // Determine the current sub-step based on the main stepper's current step
  const getInitialSubStep = (): SetupSubStep => {
    if (currentStep === 'modules') return 'modules';
    if (currentStep === 'business-hours') return 'hours';
    return 'branding';
  };

  const [currentSubStep, setCurrentSubStep] = React.useState<SetupSubStep>(getInitialSubStep);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isRecoveringSession, setIsRecoveringSession] = React.useState(!data.tenantId);

  // Recover tenantId from server session if missing from local store
  React.useEffect(() => {
    const recoverSession = async () => {
      if (data.tenantId) {
        setIsRecoveringSession(false);
        return;
      }

      try {
        const sessionData = await getSessionUserAction();

        if (sessionData?.tenantId) {
          // Recover tenantId and other data from server session
          updateData({
            tenantId: sessionData.tenantId,
            userId: sessionData.userId,
            email: sessionData.email,
          });
          setIsRecoveringSession(false);
        } else {
          // No tenant found - redirect to create-business
          router.push('/onboarding/create-business');
        }
      } catch (error) {
        console.error('Failed to recover session:', error);
        router.push('/onboarding/create-business');
      }
    };

    recoverSession();
  }, [data.tenantId, updateData, router]);

  // Form states - Ventazo brand colors as defaults
  // Primary: Teal #0D9488 | Secondary/Accent: Coral #F97316
  const [logoUrl, setLogoUrl] = React.useState<string | null>(data.logoUrl || null);
  const [primaryColor, setPrimaryColor] = React.useState(data.primaryColor || '#0D9488');
  const [secondaryColor, setSecondaryColor] = React.useState(data.secondaryColor || '#F97316');
  const [companyName, setCompanyName] = React.useState(data.companyName || data.businessName || '');

  const [modules, setModules] = React.useState<CRMModules>(
    data.modules || {
      leads: true,
      customers: true,
      opportunities: false,
      tasks: true,
      calendar: false,
      invoicing: false,
      products: false,
      teams: false,
      pipelines: false,
      marketing: false,
      whatsapp: false,
      reports: false,
    }
  );

  const [businessHours, setBusinessHours] = React.useState<BusinessHours>(
    data.businessHours || {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '09:00', close: '14:00', enabled: false },
      sunday: { open: '00:00', close: '00:00', enabled: false },
    }
  );

  // Sync main stepper with current sub-step
  React.useEffect(() => {
    const mainStep = SETUP_SUBSTEP_MAP[currentSubStep];
    if (mainStep && currentStep !== mainStep) {
      setStep(mainStep);
    }
  }, [currentSubStep, currentStep, setStep]);

  // ============================================
  // Handlers
  // ============================================

  const handleSaveBranding = async () => {
    if (!data.tenantId) {
      // Try to recover or redirect
      router.push('/onboarding/create-business');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await updateTenantBrandingAction(data.tenantId, {
        logoUrl: logoUrl ?? undefined,
        primaryColor,
        secondaryColor,
        companyEmail: data.email,
      });

      if (!result.success) {
        setSubmitError(result.error || 'Error al guardar el branding');
        return;
      }

      // Update store and move to next step
      updateData({ logoUrl: logoUrl ?? undefined, primaryColor, secondaryColor, companyName });
      completeStep('branding');
      setStep('modules');
      setCurrentSubStep('modules');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveModules = async () => {
    if (!data.tenantId) {
      router.push('/onboarding/create-business');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await updateTenantModulesAction(data.tenantId, modules as unknown as Record<string, boolean>);

      if (!result.success) {
        setSubmitError(result.error || 'Error al guardar los módulos');
        return;
      }

      // Update store and move to next step
      updateData({ modules });
      completeStep('modules');
      setStep('business-hours');
      setCurrentSubStep('hours');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHours = async () => {
    if (!data.tenantId) {
      router.push('/onboarding/create-business');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await updateBusinessHoursAction(
        data.tenantId,
        businessHours as unknown as Record<string, { open: string; close: string; enabled: boolean }>,
        data.timezone || 'America/Mexico_City'
      );

      if (!result.success) {
        setSubmitError(result.error || 'Error al guardar los horarios');
        return;
      }

      // Update store and navigate to next page
      updateData({ businessHours });
      completeStep('business-hours');
      setStep('invite-team');
      router.push('/onboarding/invite-team');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    const currentIndex = SETUP_SUBSTEPS.indexOf(currentSubStep);

    if (currentIndex === 0) {
      // Go back to create-business page
      router.push('/onboarding/create-business');
    } else {
      // Go to previous sub-step
      const prevSubStep = SETUP_SUBSTEPS[currentIndex - 1];
      const prevMainStep = prevSubStep ? SETUP_SUBSTEP_MAP[prevSubStep] : undefined;
      if (prevSubStep && prevMainStep) {
        setCurrentSubStep(prevSubStep);
        setStep(prevMainStep);
      }
    }
  };

  const handleNext = () => {
    setSubmitError(null);

    switch (currentSubStep) {
      case 'branding':
        handleSaveBranding();
        break;
      case 'modules':
        handleSaveModules();
        break;
      case 'hours':
        handleSaveHours();
        break;
    }
  };

  const toggleModule = (key: keyof CRMModules) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDay = (day: keyof BusinessHours) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateDayHours = (day: keyof BusinessHours, field: 'open' | 'close', value: string) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // ============================================
  // Render
  // ============================================

  const stepConfigs = getStepConfig(t);
  const stepConfig = stepConfigs[currentSubStep];

  // Show loading while recovering session
  if (isRecoveringSession) {
    return (
      <OnboardingLayout locale={locale}>
        <StepCard
          title={t.branding.title}
          description={t.common.loading}
          icon={<Palette className="h-6 w-6" />}
        >
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-[#0EB58C]" />
            <p className="text-[#7A8F8F] text-sm">{t.common.loading}</p>
          </div>
        </StepCard>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout locale={locale}>
      <StepCard
        description={stepConfig.description}
        title={stepConfig.title}
        icon={stepConfig.icon}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              disabled={isSubmitting}
              variant="ghost"
              onClick={handleBack}
              className={premiumButtonGhost}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            <Button
              disabled={isSubmitting}
              onClick={handleNext}
              className={premiumButtonPrimary}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  {currentSubStep === 'hours' ? t.common.continue : t.common.next}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
      >
        {/* Error message - Premium Glass Style */}
        {submitError && (
          <div className={cn(
            'rounded-xl p-4 mb-4',
            'bg-red-500/10 border border-red-500/30',
            'text-red-300'
          )}>
            {submitError}
          </div>
        )}

        {/* Branding Step */}
        {currentSubStep === 'branding' && (
          <BrandingForm
            companyName={companyName}
            logoUrl={logoUrl}
            isLoading={isSubmitting}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            translations={t}
            onCompanyNameChange={setCompanyName}
            onLogoChange={setLogoUrl}
            onPrimaryColorChange={setPrimaryColor}
            onSecondaryColorChange={setSecondaryColor}
          />
        )}

        {/* Modules Step */}
        {currentSubStep === 'modules' && (
          <ModulesForm
            businessType={data.businessType}
            isLoading={isSubmitting}
            modules={modules}
            translations={t}
            onToggle={toggleModule}
            onSetModules={setModules}
          />
        )}

        {/* Hours Step */}
        {currentSubStep === 'hours' && (
          <BusinessHoursForm
            businessHours={businessHours}
            isLoading={isSubmitting}
            translations={t}
            onToggleDay={toggleDay}
            onUpdateHours={updateDayHours}
            onSetBusinessHours={setBusinessHours}
          />
        )}
      </StepCard>
    </OnboardingLayout>
  );
}

// ============================================
// Branding Form Component - Smart with color extraction
// ============================================

interface BrandingFormProps {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  isLoading: boolean;
  translations: ReturnType<typeof getTranslations>;
  onLogoChange: (url: string | null) => void;
  onPrimaryColorChange: (color: string) => void;
  onSecondaryColorChange: (color: string) => void;
  onCompanyNameChange: (name: string) => void;
}

function BrandingForm({
  logoUrl,
  primaryColor,
  secondaryColor,
  companyName,
  isLoading,
  translations: t,
  onLogoChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onCompanyNameChange,
}: BrandingFormProps) {
  return (
    <SmartBranding
      companyName={companyName}
      onCompanyNameChange={onCompanyNameChange}
      logoUrl={logoUrl}
      onLogoChange={onLogoChange}
      primaryColor={primaryColor}
      onPrimaryColorChange={onPrimaryColorChange}
      secondaryColor={secondaryColor}
      onSecondaryColorChange={onSecondaryColorChange}
      isLoading={isLoading}
      translations={{
        companyName: t.branding.fields.companyName,
        companyNamePlaceholder: t.branding.fields.companyNamePlaceholder,
        uploadLogo: t.branding.dragDrop,
        primaryColor: t.branding.fields.primaryColor,
        secondaryColor: t.branding.fields.secondaryColor,
        preview: t.branding.preview,
      }}
    />
  );
}

// ============================================
// Modules Form Component - Categorized with Presets
// ============================================

// Module categories for better organization
const MODULE_CATEGORIES = {
  essential: {
    label: 'Esenciales',
    description: 'Lo básico para empezar',
    modules: ['leads', 'customers', 'tasks'] as const,
  },
  sales: {
    label: 'Ventas',
    description: 'Aumenta tus ventas',
    modules: ['opportunities', 'pipelines', 'products', 'invoicing'] as const,
  },
  productivity: {
    label: 'Productividad',
    description: 'Trabaja más eficiente',
    modules: ['calendar', 'teams', 'reports'] as const,
  },
  communication: {
    label: 'Comunicación',
    description: 'Conecta con clientes',
    modules: ['whatsapp', 'marketing'] as const,
  },
};

// Preset configurations
const MODULE_PRESETS = {
  essential: {
    label: 'Solo lo esencial',
    description: 'Leads, clientes y tareas',
    modules: { leads: true, customers: true, tasks: true },
  },
  sales: {
    label: 'Enfoque en ventas',
    description: 'Para equipos comerciales',
    modules: {
      leads: true,
      customers: true,
      tasks: true,
      opportunities: true,
      pipelines: true,
      products: true,
    },
  },
  full: {
    label: 'Todo activado',
    description: 'Máximas funcionalidades',
    modules: {
      leads: true,
      customers: true,
      tasks: true,
      opportunities: true,
      pipelines: true,
      products: true,
      invoicing: true,
      calendar: true,
      teams: true,
      reports: true,
      whatsapp: true,
      marketing: true,
    },
  },
};

interface ModulesFormProps {
  modules: CRMModules;
  businessType?: string;
  isLoading: boolean;
  translations: ReturnType<typeof getTranslations>;
  onToggle: (key: keyof CRMModules) => void;
  onSetModules?: (modules: CRMModules) => void;
}

function ModulesForm({ modules, businessType, isLoading, translations: t, onToggle, onSetModules }: ModulesFormProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);

  const applyPreset = (presetKey: keyof typeof MODULE_PRESETS) => {
    if (!onSetModules) return;

    // Base modules with all set to false
    const baseModules: CRMModules = {
      leads: false,
      customers: false,
      opportunities: false,
      tasks: false,
      calendar: false,
      invoicing: false,
      products: false,
      teams: false,
      pipelines: false,
      marketing: false,
      whatsapp: false,
      reports: false,
    };

    // Apply preset values on top of base
    const newModules: CRMModules = {
      ...baseModules,
      ...MODULE_PRESETS[presetKey].modules,
    };

    onSetModules(newModules);
    setSelectedPreset(presetKey);
  };

  const activeCount = Object.values(modules).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Quick Presets - Premium Glass Style */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[#E8ECEC]">Configuración rápida</p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(MODULE_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              disabled={isLoading}
              onClick={() => applyPreset(key as keyof typeof MODULE_PRESETS)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                selectedPreset === key
                  ? 'border-[#0EB58C]/50 bg-[#0EB58C]/10 ring-1 ring-[#0EB58C]/30'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              )}
            >
              <p className="text-sm font-medium text-white">{preset.label}</p>
              <p className="text-xs text-[#7A8F8F]">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Active modules count - Premium Glass Badge */}
      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3">
        <span className="text-sm text-[#B8C4C4]">Módulos activos:</span>
        <span className="font-semibold text-[#0EB58C]">{activeCount} de 12</span>
      </div>

      {/* Categorized modules - Premium Style */}
      <div className="space-y-4">
        {Object.entries(MODULE_CATEGORIES).map(([catKey, category]) => (
          <div key={catKey} className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-[#E8ECEC]">{category.label}</p>
              <span className="text-xs text-[#7A8F8F]">• {category.description}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {category.modules.map((moduleKey) => {
                const moduleInfo = CRM_MODULE_LABELS[moduleKey];
                if (!moduleInfo) return null;

                return (
                  <div
                    key={moduleKey}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer',
                      modules[moduleKey]
                        ? 'border-[#0EB58C]/30 bg-[#0EB58C]/10'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                    onClick={() => !isLoading && onToggle(moduleKey)}
                  >
                    <Switch
                      checked={modules[moduleKey]}
                      disabled={isLoading}
                      onCheckedChange={() => onToggle(moduleKey)}
                      className="data-[state=checked]:bg-[#0EB58C]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'font-medium text-sm',
                        modules[moduleKey] ? 'text-white' : 'text-[#B8C4C4]'
                      )}>{moduleInfo.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Business Hours Form Component - Premium Responsive
// ============================================

// Quick schedule presets
const SCHEDULE_PRESETS = {
  standard: {
    label: 'Horario estándar',
    description: 'Lun-Vie 9:00-18:00',
    icon: '🏢',
    config: {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '09:00', close: '14:00', enabled: false },
      sunday: { open: '09:00', close: '14:00', enabled: false },
    },
  },
  extended: {
    label: 'Horario extendido',
    description: 'Lun-Sáb 8:00-20:00',
    icon: '⏰',
    config: {
      monday: { open: '08:00', close: '20:00', enabled: true },
      tuesday: { open: '08:00', close: '20:00', enabled: true },
      wednesday: { open: '08:00', close: '20:00', enabled: true },
      thursday: { open: '08:00', close: '20:00', enabled: true },
      friday: { open: '08:00', close: '20:00', enabled: true },
      saturday: { open: '09:00', close: '15:00', enabled: true },
      sunday: { open: '09:00', close: '14:00', enabled: false },
    },
  },
  '24_7': {
    label: '24/7',
    description: 'Todos los días',
    icon: '🌐',
    config: {
      monday: { open: '00:00', close: '23:59', enabled: true },
      tuesday: { open: '00:00', close: '23:59', enabled: true },
      wednesday: { open: '00:00', close: '23:59', enabled: true },
      thursday: { open: '00:00', close: '23:59', enabled: true },
      friday: { open: '00:00', close: '23:59', enabled: true },
      saturday: { open: '00:00', close: '23:59', enabled: true },
      sunday: { open: '00:00', close: '23:59', enabled: true },
    },
  },
};

interface BusinessHoursFormProps {
  businessHours: BusinessHours;
  isLoading: boolean;
  translations: ReturnType<typeof getTranslations>;
  onToggleDay: (day: keyof BusinessHours) => void;
  onUpdateHours: (day: keyof BusinessHours, field: 'open' | 'close', value: string) => void;
  onSetBusinessHours?: (hours: BusinessHours) => void;
}

function BusinessHoursForm({
  businessHours,
  isLoading,
  translations: t,
  onToggleDay,
  onUpdateHours,
  onSetBusinessHours,
}: BusinessHoursFormProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [copyFromDay, setCopyFromDay] = React.useState<keyof BusinessHours | null>(null);

  // Day configurations
  const weekdays: Array<keyof BusinessHours> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const weekend: Array<keyof BusinessHours> = ['saturday', 'sunday'];
  const allDays: Array<keyof BusinessHours> = [...weekdays, ...weekend];

  // Use translations for day labels with short versions for mobile
  const dayLabels: Record<keyof BusinessHours, { full: string; short: string }> = {
    monday: { full: t.businessHours.days.monday, short: 'Lun' },
    tuesday: { full: t.businessHours.days.tuesday, short: 'Mar' },
    wednesday: { full: t.businessHours.days.wednesday, short: 'Mié' },
    thursday: { full: t.businessHours.days.thursday, short: 'Jue' },
    friday: { full: t.businessHours.days.friday, short: 'Vie' },
    saturday: { full: t.businessHours.days.saturday, short: 'Sáb' },
    sunday: { full: t.businessHours.days.sunday, short: 'Dom' },
  };

  // Apply preset
  const applyPreset = (presetKey: keyof typeof SCHEDULE_PRESETS) => {
    if (!onSetBusinessHours) return;
    onSetBusinessHours(SCHEDULE_PRESETS[presetKey].config as BusinessHours);
    setSelectedPreset(presetKey);
  };

  // Copy hours to all enabled days
  const copyToAllDays = (sourceDay: keyof BusinessHours) => {
    if (!onSetBusinessHours) return;
    const sourceHours = businessHours[sourceDay];
    const newHours = { ...businessHours };

    allDays.forEach((day) => {
      if (newHours[day].enabled) {
        newHours[day] = { ...newHours[day], open: sourceHours.open, close: sourceHours.close };
      }
    });

    onSetBusinessHours(newHours);
    setCopyFromDay(null);
  };

  // Count active days
  const activeDays = allDays.filter((day) => businessHours[day].enabled).length;

  // Premium time input styling - responsive
  const timeInputClasses = cn(
    'h-10 sm:h-11 rounded-lg border-white/10 bg-white/[0.03]',
    'text-white text-center text-sm sm:text-base',
    'focus:border-[#0EB58C]/50 focus:ring-2 focus:ring-[#0EB58C]/20',
    '[color-scheme:dark]',
    'w-[4.5rem] sm:w-24' // Smaller on mobile
  );

  // Render a single day row - responsive
  const renderDayRow = (day: keyof BusinessHours, isWeekend: boolean = false) => (
    <div
      key={day}
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl border p-3 sm:p-4 transition-all',
        businessHours[day].enabled
          ? 'border-[#0EB58C]/30 bg-[#0EB58C]/10'
          : 'border-white/10 bg-white/[0.02]',
        isWeekend && 'opacity-90'
      )}
    >
      {/* Day name and toggle - row on all sizes */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Switch
          checked={businessHours[day].enabled}
          disabled={isLoading}
          onCheckedChange={() => onToggleDay(day)}
          className="data-[state=checked]:bg-[#0EB58C] shrink-0"
        />
        <span
          className={cn(
            'font-medium truncate',
            businessHours[day].enabled ? 'text-white' : 'text-[#7A8F8F]'
          )}
        >
          {/* Show short label on mobile, full on desktop */}
          <span className="sm:hidden">{dayLabels[day].short}</span>
          <span className="hidden sm:inline">{dayLabels[day].full}</span>
        </span>
      </div>

      {/* Time inputs or closed label */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        {businessHours[day].enabled ? (
          <>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Input
                className={timeInputClasses}
                disabled={isLoading}
                type="time"
                value={businessHours[day].open}
                onChange={(e) => onUpdateHours(day, 'open', e.target.value)}
                aria-label={`Hora de apertura ${dayLabels[day].full}`}
              />
              <span className="text-[#7A8F8F] text-sm">a</span>
              <Input
                className={timeInputClasses}
                disabled={isLoading}
                type="time"
                value={businessHours[day].close}
                onChange={(e) => onUpdateHours(day, 'close', e.target.value)}
                aria-label={`Hora de cierre ${dayLabels[day].full}`}
              />
            </div>
            {/* Copy button - only show on hover/focus on desktop, always on mobile */}
            {onSetBusinessHours && (
              <button
                type="button"
                onClick={() => copyToAllDays(day)}
                disabled={isLoading}
                className={cn(
                  'p-1.5 sm:p-2 rounded-lg text-[#7A8F8F] hover:text-[#0EB58C] hover:bg-[#0EB58C]/10',
                  'transition-all shrink-0',
                  'sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100'
                )}
                title="Copiar a todos los días activos"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </>
        ) : (
          <span className="text-sm text-[#7A8F8F] px-2">{t.businessHours.closed}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Quick Presets - Premium Glass Style */}
      {onSetBusinessHours && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#E8ECEC]">Configuración rápida</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(SCHEDULE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                disabled={isLoading}
                onClick={() => applyPreset(key as keyof typeof SCHEDULE_PRESETS)}
                className={cn(
                  'rounded-xl border p-3 sm:p-4 text-left transition-all',
                  'flex items-start gap-3',
                  selectedPreset === key
                    ? 'border-[#0EB58C]/50 bg-[#0EB58C]/10 ring-1 ring-[#0EB58C]/30'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                  'active:scale-[0.98]' // Touch feedback
                )}
              >
                <span className="text-xl sm:text-2xl">{preset.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{preset.label}</p>
                  <p className="text-xs text-[#7A8F8F] truncate">{preset.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active days summary - Premium Glass Badge */}
      <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3">
        <span className="text-sm text-[#B8C4C4]">Días activos:</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0EB58C]">{activeDays} de 7</span>
          {activeDays === 7 && (
            <span className="text-xs bg-[#0EB58C]/20 text-[#0EB58C] px-2 py-0.5 rounded-full">24/7</span>
          )}
        </div>
      </div>

      {/* Days list - Weekdays */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-[#7A8F8F] uppercase tracking-wider">Días laborables</p>
        <div className="space-y-2 group">
          {weekdays.map((day) => renderDayRow(day, false))}
        </div>
      </div>

      {/* Days list - Weekend */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-[#7A8F8F] uppercase tracking-wider">Fin de semana</p>
        <div className="space-y-2 group">
          {weekend.map((day) => renderDayRow(day, true))}
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-[#7A8F8F] text-center">
        💡 Tip: Puedes copiar un horario a todos los días activos usando el ícono de copiar
      </p>
    </div>
  );
}
