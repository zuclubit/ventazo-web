'use client';

/**
 * Create Business Page - Premium Dark Theme
 *
 * Streamlined business setup with only 5 essential fields:
 * - Business Name
 * - Business Type
 * - Business Size
 * - Phone
 * - Country (auto-detects timezone)
 *
 * Design: Premium glassmorphism dark theme matching Ventazo brand.
 *
 * @module app/onboarding/create-business/page
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ArrowLeft, Loader2, Sparkles, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OnboardingLayout, StepCard } from '@/components/onboarding/onboarding-layout';
import { CountrySelectField, useAutoDetectLocation } from '@/components/common/country-timezone-fields';
import { PhoneInput } from '@/components/common/phone-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { createTenantAction } from '@/lib/session/actions';
import { getTranslations, detectLocale, type SupportedLocale } from '@/lib/i18n/onboarding';
import { useOnboardingStore } from '@/store/onboarding.store';
import { cn } from '@/lib/utils';

// ============================================
// Premium Styling Classes
// ============================================

const premiumInputClasses = cn(
  'h-12 rounded-xl border-white/10 bg-white/[0.03]',
  'text-white placeholder:text-[var(--onboarding-text-muted)]',
  'focus:border-[var(--tenant-primary)]/50 focus:ring-2 focus:ring-[var(--tenant-primary)]/20',
  'hover:border-white/20 transition-all duration-200'
);

const premiumSelectTriggerClasses = cn(
  'h-12 rounded-xl border-white/10 bg-white/[0.03]',
  'text-white data-[placeholder]:text-[var(--onboarding-text-muted)]',
  'focus:border-[var(--tenant-primary)]/50 focus:ring-2 focus:ring-[var(--tenant-primary)]/20',
  'hover:border-white/20 transition-all duration-200'
);

const premiumSelectContentClasses = cn(
  'rounded-xl border-white/10 bg-[var(--onboarding-bg-dark)]/95 backdrop-blur-xl',
  'shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
);

const premiumSelectItemClasses = cn(
  'text-white rounded-lg cursor-pointer',
  'focus:bg-[var(--tenant-primary)]/20 focus:text-white',
  'data-[state=checked]:bg-[var(--tenant-primary)]/20'
);

const premiumLabelClasses = 'text-[var(--onboarding-text-label)] font-medium';

const premiumButtonPrimary = cn(
  'h-12 rounded-xl font-semibold',
  'bg-gradient-to-r from-[var(--ventazo-dark)] to-[var(--tenant-primary)]',
  'text-white shadow-lg shadow-[var(--tenant-primary)]/25',
  'hover:shadow-xl hover:shadow-[var(--tenant-primary)]/30 hover:scale-[1.02]',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
  'transition-all duration-200'
);

const premiumButtonGhost = cn(
  'h-12 rounded-xl font-medium',
  'text-[var(--onboarding-text-secondary)] hover:text-white',
  'hover:bg-white/[0.05]',
  'transition-all duration-200'
);

// ============================================
// Types
// ============================================

type BusinessType =
  | 'dental'
  | 'medical'
  | 'automotive'
  | 'real_estate'
  | 'beauty_salon'
  | 'education'
  | 'professional_services'
  | 'retail'
  | 'restaurant'
  | 'fitness'
  | 'other';

type BusinessSize = 'solo' | '2_5' | '6_10' | '11_25' | '26_50' | '51_plus';

// ============================================
// Constants
// ============================================

const BUSINESS_TYPES: Array<{ value: BusinessType; label: string; icon: string }> = [
  { value: 'dental', label: 'Consultorio Dental', icon: '🦷' },
  { value: 'medical', label: 'Consultorio Médico', icon: '⚕️' },
  { value: 'automotive', label: 'Taller Automotriz', icon: '🚗' },
  { value: 'real_estate', label: 'Inmobiliaria', icon: '🏠' },
  { value: 'beauty_salon', label: 'Salón de Belleza', icon: '💇' },
  { value: 'education', label: 'Escuela / Academia', icon: '📚' },
  { value: 'professional_services', label: 'Servicios Profesionales', icon: '💼' },
  { value: 'retail', label: 'Comercio / Tienda', icon: '🛒' },
  { value: 'restaurant', label: 'Restaurante / Café', icon: '🍽️' },
  { value: 'fitness', label: 'Gimnasio / Fitness', icon: '💪' },
  { value: 'other', label: 'Otro', icon: '📋' },
];

const BUSINESS_SIZES: Array<{ value: BusinessSize; label: string }> = [
  { value: 'solo', label: 'Solo yo' },
  { value: '2_5', label: '2-5 personas' },
  { value: '6_10', label: '6-10 personas' },
  { value: '11_25', label: '11-25 personas' },
  { value: '26_50', label: '26-50 personas' },
  { value: '51_plus', label: 'Más de 50' },
];

const BUSINESS_TYPE_BENEFITS: Record<BusinessType, string[]> = {
  dental: ['Agenda de citas integrada', 'Historial de pacientes', 'Recordatorios automáticos'],
  medical: ['Gestión de pacientes', 'Citas y seguimiento', 'Reportes médicos'],
  automotive: ['Órdenes de trabajo', 'Inventario de refacciones', 'Historial de vehículos'],
  real_estate: ['Pipeline de propiedades', 'Seguimiento de clientes', 'Portafolio digital'],
  beauty_salon: ['Reservas en línea', 'Clientes frecuentes', 'Promociones'],
  education: ['Inscripciones', 'Seguimiento de alumnos', 'Comunicación'],
  professional_services: ['Proyectos y cotizaciones', 'Facturación', 'Seguimiento'],
  retail: ['Inventario', 'Ventas', 'Clientes frecuentes'],
  restaurant: ['Reservaciones', 'Clientes VIP', 'Pedidos'],
  fitness: ['Membresías', 'Clases', 'Seguimiento de miembros'],
  other: ['Leads y clientes', 'Tareas', 'Seguimiento'],
};

// ============================================
// Form Schema
// ============================================

const formSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  businessType: z.string().min(1, 'Selecciona un tipo'),
  businessSize: z.string().min(1, 'Selecciona un tamaño'),
  phone: z.string().min(7, 'Teléfono inválido').max(15),
  phoneCountryCode: z.string().default('MX'),
  country: z.string().min(1, 'Selecciona un país'),
});

type FormData = z.infer<typeof formSchema>;

// ============================================
// Loading Skeleton - Premium Dark
// ============================================

function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
        <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
      <Skeleton className="h-12 w-full rounded-xl bg-white/[0.05]" />
    </div>
  );
}

// ============================================
// Business Type Benefits - Premium Glass Style
// ============================================

function BusinessBenefits({ type }: { type: BusinessType }) {
  const benefits = BUSINESS_TYPE_BENEFITS[type];
  const typeInfo = BUSINESS_TYPES.find((t) => t.value === type);

  if (!benefits || !typeInfo) return null;

  return (
    <div className={cn(
      'rounded-xl p-4 animate-in fade-in-50 duration-300',
      'bg-[var(--tenant-primary)]/10 border border-[var(--tenant-primary)]/20',
      'backdrop-blur-sm'
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tenant-primary)]/20">
          <Sparkles className="h-4 w-4 text-[var(--tenant-primary)]" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">Perfecto para {typeInfo.label}:</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--onboarding-text-secondary)]">
            {benefits.map((benefit, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--tenant-primary)]" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Page Component
// ============================================

export default function CreateBusinessPage() {
  const router = useRouter();
  const { data, updateData, setStep, completeStep } = useOnboardingStore();

  const { detectedCountry, detectedTimezone, isDetecting } = useAutoDetectLocation();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // i18n
  const [locale] = React.useState<SupportedLocale>(detectLocale());
  const t = getTranslations(locale);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: data.businessName || '',
      businessType: data.businessType || '',
      businessSize: data.businessSize || '',
      phone: data.phone || '',
      phoneCountryCode: data.country || 'MX',
      country: data.country || 'MX',
    },
    mode: 'onBlur',
  });

  const { control, handleSubmit, setValue, watch, formState } = form;
  const watchedType = watch('businessType') as BusinessType;
  const watchedCountry = watch('country');

  // Initialize with detected location
  React.useEffect(() => {
    if (!isDetecting && !data.country) {
      setValue('country', detectedCountry);
      setValue('phoneCountryCode', detectedCountry);
    }
  }, [isDetecting, detectedCountry, data.country, setValue]);

  // Sync phone country with country
  React.useEffect(() => {
    if (watchedCountry) {
      setValue('phoneCountryCode', watchedCountry);
    }
  }, [watchedCountry, setValue]);

  const onSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await createTenantAction({
        businessName: formData.businessName,
        businessType: formData.businessType,
        businessSize: formData.businessSize,
        phone: formData.phone,
        country: formData.country,
        city: '', // Optional, can be filled later
        timezone: detectedTimezone || 'America/Mexico_City',
      });

      if (!result.success) {
        setSubmitError(result.error || 'Error al crear el negocio');
        return;
      }

      updateData({
        tenantId: result.tenantId,
        businessName: formData.businessName,
        businessType: formData.businessType,
        businessSize: formData.businessSize,
        phone: formData.phone,
        country: formData.country,
        timezone: detectedTimezone || 'America/Mexico_City',
      });

      completeStep('create-business');
      setStep('branding');
      router.push('/onboarding/setup');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/signup');
  };

  if (isDetecting) {
    return (
      <OnboardingLayout locale={locale}>
        <StepCard
          title={t.createBusiness.title}
          description={t.common.loading}
        >
          <FormSkeleton />
        </StepCard>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout locale={locale}>
      <StepCard
        title={t.createBusiness.title}
        description={t.createBusiness.subtitle}
        icon={<Building2 className="h-6 w-6" />}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
              className={premiumButtonGhost}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.common.back}
            </Button>
            <Button
              type="submit"
              form="create-business-form"
              disabled={isSubmitting || !formState.isValid}
              className={premiumButtonPrimary}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.common.saving}
                </>
              ) : (
                <>
                  {t.common.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            id="create-business-form"
            className="space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Error - Premium Glass Style */}
            {submitError && (
              <div className={cn(
                'rounded-xl p-4',
                'bg-red-500/10 border border-red-500/30',
                'text-red-300'
              )}>
                {submitError}
              </div>
            )}

            {/* Business Name */}
            <FormField
              control={control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={premiumLabelClasses}>
                    {t.createBusiness.fields.businessName}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.createBusiness.fields.businessNamePlaceholder}
                      autoComplete="organization"
                      disabled={isSubmitting}
                      className={premiumInputClasses}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-400" />
                </FormItem>
              )}
            />

            {/* Type & Size - side by side */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Business Type */}
              <FormField
                control={control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={premiumLabelClasses}>
                      {t.createBusiness.fields.businessType}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={premiumSelectTriggerClasses}>
                          <SelectValue placeholder={t.createBusiness.fields.businessTypePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={premiumSelectContentClasses}>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem
                            key={type.value}
                            value={type.value}
                            className={premiumSelectItemClasses}
                          >
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />

              {/* Business Size */}
              <FormField
                control={control}
                name="businessSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={premiumLabelClasses}>
                      {t.createBusiness.fields.businessSize}
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className={premiumSelectTriggerClasses}>
                          <SelectValue placeholder={t.createBusiness.fields.businessTypePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={premiumSelectContentClasses}>
                        {BUSINESS_SIZES.map((size) => (
                          <SelectItem
                            key={size.value}
                            value={size.value}
                            className={premiumSelectItemClasses}
                          >
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-400" />
                  </FormItem>
                )}
              />
            </div>

            {/* Benefits based on type */}
            {watchedType && <BusinessBenefits type={watchedType} />}

            {/* Phone & Country - side by side */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Phone */}
              <PhoneInput
                control={control}
                name="phone"
                countryCodeName="phoneCountryCode"
                label={t.createBusiness.fields.phone}
                required
                defaultCountryCode={watchedCountry || 'MX'}
                className="[&_label]:text-[var(--onboarding-text-label)] [&_input]:h-12 [&_input]:rounded-xl [&_input]:border-white/10 [&_input]:bg-white/[0.03] [&_input]:text-white [&_input]:placeholder:text-[var(--onboarding-text-muted)] [&_button]:h-12 [&_button]:rounded-xl [&_button]:border-white/10 [&_button]:bg-white/[0.03] [&_button]:text-white"
              />

              {/* Country */}
              <CountrySelectField
                control={control}
                name="country"
                label={t.createBusiness.fields.country}
                required
                className="[&_label]:text-[var(--onboarding-text-label)] [&_button]:h-12 [&_button]:rounded-xl [&_button]:border-white/10 [&_button]:bg-white/[0.03] [&_button]:text-white [&_[role=listbox]]:bg-[var(--onboarding-bg-dark)]/95 [&_[role=listbox]]:border-white/10 [&_[role=option]]:text-white"
              />
            </div>
          </form>
        </Form>
      </StepCard>
    </OnboardingLayout>
  );
}
