'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Palette,
  LayoutGrid,
  Clock,
  Check,
} from 'lucide-react';

import {
  OnboardingLayout,
  StepCard,
} from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  updateTenantBranding,
  updateTenantModules,
  updateBusinessHours,
} from '@/lib/onboarding';
import {
  CRM_MODULE_LABELS,
  DAY_LABELS,
  type CRMModules,
  type BusinessHours,
} from '@/lib/onboarding/types';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// Setup Steps
// ============================================

type SetupStep = 'branding' | 'modules' | 'hours';

const SETUP_STEPS: { key: SetupStep; label: string; icon: React.ReactNode }[] = [
  { key: 'branding', label: 'Marca', icon: <Palette className="h-4 w-4" /> },
  { key: 'modules', label: 'Módulos', icon: <LayoutGrid className="h-4 w-4" /> },
  { key: 'hours', label: 'Horarios', icon: <Clock className="h-4 w-4" /> },
];

// ============================================
// Setup Page
// ============================================

export default function SetupPage() {
  const router = useRouter();
  const { data, updateData, setStep, completeStep } = useOnboardingStore();

  const [currentSetupStep, setCurrentSetupStep] =
    React.useState<SetupStep>('branding');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Form states
  const [primaryColor, setPrimaryColor] = React.useState(
    data.primaryColor || '#0066FF'
  );
  const [secondaryColor, setSecondaryColor] = React.useState(
    data.secondaryColor || '#00CC88'
  );
  const [companyName, setCompanyName] = React.useState(
    data.companyName || data.businessName || ''
  );

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

  const handleSaveBranding = async () => {
    if (!data.tenantId) return;

    setIsSubmitting(true);
    try {
      await updateTenantBranding(data.tenantId, {
        primaryColor,
        secondaryColor,
        companyEmail: data.email,
      });

      updateData({ primaryColor, secondaryColor, companyName });
      completeStep('branding');
      setCurrentSetupStep('modules');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Error al guardar'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveModules = async () => {
    if (!data.tenantId) return;

    setIsSubmitting(true);
    try {
      await updateTenantModules(data.tenantId, modules);

      updateData({ modules });
      completeStep('modules');
      setCurrentSetupStep('hours');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Error al guardar'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveHours = async () => {
    if (!data.tenantId) return;

    setIsSubmitting(true);
    try {
      await updateBusinessHours(
        data.tenantId,
        businessHours,
        data.timezone || 'America/Mexico_City'
      );

      updateData({ businessHours });
      completeStep('business-hours');
      setStep('invite-team');

      void router.push('/onboarding/invite-team');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Error al guardar'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentSetupStep === 'branding') {
      void router.push('/onboarding/create-business');
    } else if (currentSetupStep === 'modules') {
      setCurrentSetupStep('branding');
    } else {
      setCurrentSetupStep('modules');
    }
  };

  const handleNext = () => {
    if (currentSetupStep === 'branding') {
      void handleSaveBranding();
    } else if (currentSetupStep === 'modules') {
      void handleSaveModules();
    } else {
      void handleSaveHours();
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

  const updateDayHours = (
    day: keyof BusinessHours,
    field: 'open' | 'close',
    value: string
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  return (
    <OnboardingLayout>
      {/* Sub-steps indicator */}
      <div className="mb-6 flex justify-center gap-2">
        {SETUP_STEPS.map((step, index) => {
          const isCurrent = currentSetupStep === step.key;
          const isCompleted =
            SETUP_STEPS.findIndex((s) => s.key === currentSetupStep) > index;

          return (
            <button
              key={step.key}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                isCurrent
                  ? 'bg-primary text-primary-foreground'
                  : isCompleted
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-muted text-muted-foreground'
              )}
              disabled={!isCompleted && !isCurrent}
              onClick={() => isCompleted && setCurrentSetupStep(step.key)}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          );
        })}
      </div>

      <StepCard
        description={
          currentSetupStep === 'branding'
            ? 'Elige los colores que representan tu negocio'
            : currentSetupStep === 'modules'
              ? 'Activa solo los módulos que necesitas'
              : 'Define los horarios de atención de tu negocio'
        }
        footer={
          <>
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>
            <Button disabled={isSubmitting} onClick={handleNext}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {currentSetupStep === 'hours' ? 'Continuar' : 'Siguiente'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        }
        title={
          currentSetupStep === 'branding'
            ? 'Personaliza tu marca'
            : currentSetupStep === 'modules'
              ? 'Selecciona los módulos'
              : 'Configura tus horarios'
        }
      >
        {/* Error message */}
        {submitError && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        {/* Branding Step */}
        {currentSetupStep === 'branding' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre comercial</Label>
              <Input
                id="companyName"
                placeholder="Mi Empresa"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color primario</Label>
                <div className="flex items-center gap-2">
                  <input
                    className="h-10 w-16 cursor-pointer rounded border"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Color secundario</Label>
                <div className="flex items-center gap-2">
                  <input
                    className="h-10 w-16 cursor-pointer rounded border"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                  <Input
                    className="flex-1"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg border p-4">
              <p className="mb-2 text-sm text-muted-foreground">Vista previa:</p>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {companyName.charAt(0).toUpperCase() || 'Z'}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: primaryColor }}>
                    {companyName || 'Tu Empresa'}
                  </p>
                  <p className="text-sm" style={{ color: secondaryColor }}>
                    CRM Profesional
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modules Step */}
        {currentSetupStep === 'modules' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Basado en tu tipo de negocio ({data.businessType}), te sugerimos
              estos módulos. Puedes activar o desactivar según necesites.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(CRM_MODULE_LABELS).map(([key, { name, description }]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                    modules[key as keyof CRMModules]
                      ? 'border-primary bg-primary/5'
                      : 'border-muted'
                  )}
                >
                  <Switch
                    checked={modules[key as keyof CRMModules]}
                    onCheckedChange={() => toggleModule(key as keyof CRMModules)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hours Step */}
        {currentSetupStep === 'hours' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configura los horarios de atención de tu negocio. Esto ayudará a
              programar citas y recordatorios.
            </p>

            <div className="space-y-3">
              {(Object.keys(DAY_LABELS) as Array<keyof BusinessHours>).map(
                (day) => (
                  <div
                    key={day}
                    className={cn(
                      'flex items-center gap-4 rounded-lg border p-3',
                      businessHours[day].enabled
                        ? 'border-primary/20 bg-primary/5'
                        : 'border-muted bg-muted/50'
                    )}
                  >
                    <Switch
                      checked={businessHours[day].enabled}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <span
                      className={cn(
                        'w-24 font-medium',
                        !businessHours[day].enabled && 'text-muted-foreground'
                      )}
                    >
                      {DAY_LABELS[day]}
                    </span>

                    {businessHours[day].enabled ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="w-28"
                          type="time"
                          value={businessHours[day].open}
                          onChange={(e) =>
                            updateDayHours(day, 'open', e.target.value)
                          }
                        />
                        <span className="text-muted-foreground">a</span>
                        <Input
                          className="w-28"
                          type="time"
                          value={businessHours[day].close}
                          onChange={(e) =>
                            updateDayHours(day, 'close', e.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Cerrado
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </StepCard>
    </OnboardingLayout>
  );
}
