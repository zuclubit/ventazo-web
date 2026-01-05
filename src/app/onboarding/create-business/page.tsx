'use client';

// ============================================
// Create Business Page - Multi-language & Modular
// Responsive, accessible, and following design system
// ============================================

import * as React from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  OnboardingLayout,
  StepCard,
} from '@/components/onboarding/onboarding-layout';
import {
  CountrySelectField,
  TimezoneSelectField,
  useAutoDetectLocation,
} from '@/components/common/country-timezone-fields';
import { PhoneInput } from '@/components/common/phone-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { createTenantAction } from '@/lib/session/actions';
import { useI18n } from '@/lib/i18n/context';
import { useOnboardingStore } from '@/store/onboarding.store';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type BusinessTypeKey =
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

type BusinessSizeKey =
  | 'solo'
  | '2_5'
  | '6_10'
  | '11_25'
  | '26_50'
  | '51_100'
  | '100_plus';

// ============================================
// Form Schema Factory (with i18n messages)
// ============================================

function createFormSchema(validation: {
  businessNameMin: string;
  businessNameMax: string;
  businessNameInvalid: string;
  businessTypeRequired: string;
  businessSizeRequired: string;
  phoneMin: string;
  phoneMax: string;
  cityMin: string;
  countryRequired: string;
  timezoneRequired: string;
  emailInvalid: string;
  websiteInvalid: string;
  legalNameMin: string;
  legalNameMax: string;
}) {
  return z.object({
    // Required fields
    businessName: z
      .string()
      .min(2, validation.businessNameMin)
      .max(100, validation.businessNameMax)
      .regex(/^[a-zA-Z0-9\u00C0-\u017F\s.,&'-]+$/, validation.businessNameInvalid),
    businessType: z.string().min(1, validation.businessTypeRequired),
    businessSize: z.string().min(1, validation.businessSizeRequired),
    phone: z.string().min(7, validation.phoneMin).max(15, validation.phoneMax),
    phoneCountryCode: z.string().default('MX'),
    country: z.string().min(1, validation.countryRequired),
    timezone: z.string().min(1, validation.timezoneRequired),
    city: z.string().min(2, validation.cityMin),

    // Optional fields (advanced)
    email: z.string().email(validation.emailInvalid).optional().or(z.literal('')),
    website: z.string().url(validation.websiteInvalid).optional().or(z.literal('')),
    legalName: z
      .string()
      .min(2, validation.legalNameMin)
      .max(150, validation.legalNameMax)
      .optional()
      .or(z.literal('')),
    taxId: z.string().optional().or(z.literal('')),
    industry: z.string().optional().or(z.literal('')),
  });
}

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

// ============================================
// Business Type Icons
// ============================================

const BUSINESS_TYPE_ICONS: Record<BusinessTypeKey, string> = {
  dental: '🦷',
  medical: '⚕️',
  automotive: '🚗',
  real_estate: '🏠',
  beauty_salon: '💇',
  education: '📚',
  professional_services: '💼',
  retail: '🛒',
  restaurant: '🍽️',
  fitness: '💪',
  other: '📋',
};

// ============================================
// Mapping functions for translation keys
// ============================================

const businessTypeToBenefitsKey = (type: string): string => {
  const mapping: Record<string, string> = {
    dental: 'dental',
    medical: 'medical',
    automotive: 'automotive',
    real_estate: 'realEstate',
    beauty_salon: 'beautySalon',
    education: 'education',
    professional_services: 'professionalServices',
    retail: 'retail',
    restaurant: 'restaurant',
    fitness: 'fitness',
    other: 'other',
  };
  return mapping[type] || 'other';
};

const businessTypeToTranslationKey = (type: string): string => {
  const mapping: Record<string, string> = {
    dental: 'dental',
    medical: 'medical',
    automotive: 'automotive',
    real_estate: 'realEstate',
    beauty_salon: 'beautySalon',
    education: 'education',
    professional_services: 'professionalServices',
    retail: 'retail',
    restaurant: 'restaurant',
    fitness: 'fitness',
    other: 'other',
  };
  return mapping[type] || 'other';
};

const businessSizeToTranslationKey = (size: string): string => {
  const mapping: Record<string, string> = {
    solo: 'solo',
    '2_5': 'small',
    '6_10': 'medium',
    '11_25': 'growing',
    '26_50': 'established',
    '51_100': 'large',
    '100_plus': 'enterprise',
  };
  return mapping[size] || 'solo';
};

// ============================================
// Form Section Component (Modular & Responsive)
// ============================================

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2;
  className?: string;
}

function FormSection({
  title,
  description,
  children,
  columns = 1,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div
        className={cn(
          'grid gap-4',
          columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================
// Business Type Benefits Component (i18n)
// ============================================

interface BusinessTypeBenefitsProps {
  businessType: string;
  translations: ReturnType<typeof useI18n>['t'];
}

function BusinessTypeBenefits({ businessType, translations }: BusinessTypeBenefitsProps) {
  if (!businessType) return null;

  const benefitsKey = businessTypeToBenefitsKey(businessType);
  const typeKey = businessTypeToTranslationKey(businessType);

  const benefitsObj = translations.onboarding.createBusiness.benefits;
  const benefits = benefitsObj[benefitsKey as keyof typeof benefitsObj];
  const typeName = translations.onboarding.businessTypes[typeKey as keyof typeof translations.onboarding.businessTypes];

  if (!benefits || !Array.isArray(benefits) || benefits.length === 0) {
    return null;
  }

  return (
    <Alert className="border-primary/20 bg-primary/5 animate-in fade-in-50 slide-in-from-top-2 duration-300">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription>
        <span className="font-medium text-foreground">
          {translations.onboarding.createBusiness.benefits.title} {typeName}:
        </span>
        <ul className="mt-2 space-y-1">
          {benefits.map((benefit: string, index: number) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              {benefit}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

// ============================================
// Loading Skeleton (Responsive)
// ============================================

function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// ============================================
// Success Indicator Component (i18n)
// ============================================

interface SuccessIndicatorProps {
  translations: ReturnType<typeof useI18n>['t'];
}

function SuccessIndicator({ translations }: SuccessIndicatorProps) {
  const texts = translations.onboarding.createBusiness.success;

  return (
    <div className="rounded-lg border border-success/20 bg-success/5 p-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">{texts.title}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{texts.description}</p>
    </div>
  );
}

// ============================================
// Create Business Page Component
// ============================================

export default function CreateBusinessPage() {
  const router = useRouter();
  const { t, country: selectedCountry } = useI18n();
  const { data, updateData, setStep, completeStep } = useOnboardingStore();

  // Get translations
  const texts = t.onboarding.createBusiness;
  const businessTypes = t.onboarding.businessTypes;
  const businessSizes = t.onboarding.businessSizes;

  // Auto-detect user location
  const { detectedCountry, detectedTimezone, isDetecting } = useAutoDetectLocation();

  // State
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Create schema with current translations
  const formSchema = React.useMemo(
    () => createFormSchema(texts.validation),
    [texts.validation]
  );

  // Form setup with React Hook Form + Zod
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: data.businessName || '',
      businessType: data.businessType || '',
      businessSize: data.businessSize || 'solo',
      phone: data.phone || '',
      phoneCountryCode: selectedCountry.code || 'MX',
      country: data.country || selectedCountry.code || 'MX',
      city: data.city || '',
      timezone: data.timezone || 'America/Mexico_City',
      email: '',
      website: '',
      legalName: '',
      taxId: '',
      industry: '',
    },
    mode: 'onBlur',
  });

  const { control, handleSubmit, setValue, watch, formState } = form;
  const watchedBusinessType = watch('businessType');
  const watchedCountry = watch('country');

  // Initialize form with detected location
  React.useEffect(() => {
    if (!isDetecting && !isInitialized) {
      if (!data.country) {
        setValue('country', detectedCountry);
        setValue('timezone', detectedTimezone);
        setValue('phoneCountryCode', detectedCountry);
      }
      setIsInitialized(true);
    }
  }, [isDetecting, detectedCountry, detectedTimezone, data.country, setValue, isInitialized]);

  // Sync phone country with country selection
  React.useEffect(() => {
    if (watchedCountry) {
      setValue('phoneCountryCode', watchedCountry);
    }
  }, [watchedCountry, setValue]);

  // Handle form submission
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
        city: formData.city,
        timezone: formData.timezone,
        ...(formData.email && { email: formData.email }),
        ...(formData.website && { website: formData.website }),
        ...(formData.legalName && { legalName: formData.legalName }),
        ...(formData.taxId && { taxId: formData.taxId }),
        ...(formData.industry && { industry: formData.industry }),
      });

      if (!result.success) {
        setSubmitError(result.error || texts.errors.createFailed);
        return;
      }

      updateData({
        tenantId: result.tenantId,
        businessName: formData.businessName,
        businessType: formData.businessType,
        businessSize: formData.businessSize,
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        timezone: formData.timezone,
      });

      completeStep('create-business');
      setStep('branding');
      router.push(result.redirectTo || '/onboarding/setup');
    } catch (error) {
      const message = error instanceof Error ? error.message : texts.errors.generic;
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push('/signup');
  };

  // Determine if Mexico for RFC-specific labels
  const isMexico = watchedCountry === 'MX';

  // Show skeleton while detecting location
  if (isDetecting) {
    return (
      <OnboardingLayout>
        <StepCard description={texts.detectingLocation} title={texts.title}>
          <FormSkeleton />
        </StepCard>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout>
      <StepCard
        description={texts.subtitle}
        footer={
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {texts.actions.back}
            </Button>
            <Button
              disabled={isSubmitting || !formState.isValid}
              type="submit"
              form="create-business-form"
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {texts.actions.creating}
                </>
              ) : (
                <>
                  {texts.actions.continue}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        }
        title={texts.title}
      >
        <Form {...form}>
          <form
            className="space-y-6"
            id="create-business-form"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* ============================================ */}
            {/* Business Information Section */}
            {/* ============================================ */}

            <FormSection
              title={texts.sections.businessInfo.title}
              description={texts.sections.businessInfo.description}
            >
              {/* Business Name */}
              <FormField
                control={control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {texts.fields.businessName.label}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={texts.fields.businessName.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {texts.fields.businessName.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Type */}
              <FormField
                control={control}
                name="businessType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {texts.fields.businessType.label}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={texts.fields.businessType.placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(BUSINESS_TYPE_ICONS) as BusinessTypeKey[]).map((type) => {
                          const translationKey = businessTypeToTranslationKey(type);
                          const label = businessTypes[translationKey as keyof typeof businessTypes];
                          return (
                            <SelectItem key={type} value={type}>
                              <span className="flex items-center gap-2">
                                <span>{BUSINESS_TYPE_ICONS[type]}</span>
                                <span>{label}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {texts.fields.businessType.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Type Benefits */}
              {watchedBusinessType && (
                <BusinessTypeBenefits businessType={watchedBusinessType} translations={t} />
              )}

              {/* Business Size */}
              <FormField
                control={control}
                name="businessSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {texts.fields.businessSize.label}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={texts.fields.businessSize.placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(['solo', '2_5', '6_10', '11_25', '26_50', '51_100', '100_plus'] as BusinessSizeKey[]).map(
                          (size) => {
                            const translationKey = businessSizeToTranslationKey(size);
                            const sizeData = businessSizes[translationKey as keyof typeof businessSizes];
                            return (
                              <SelectItem key={size} value={size}>
                                <span className="flex flex-col">
                                  <span>{sizeData.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {sizeData.description}
                                  </span>
                                </span>
                              </SelectItem>
                            );
                          }
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {texts.fields.businessSize.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* ============================================ */}
            {/* Contact Information Section */}
            {/* ============================================ */}

            <FormSection
              title={texts.sections.contact.title}
              description={texts.sections.contact.description}
            >
              {/* Phone with Country Selector */}
              <PhoneInput
                control={control}
                name="phone"
                countryCodeName="phoneCountryCode"
                label={texts.fields.phone.label}
                required
                description={texts.fields.phone.description}
                defaultCountryCode={watchedCountry || 'MX'}
              />

              {/* City */}
              <FormField
                control={control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {texts.fields.city.label}
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder={texts.fields.city.placeholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormSection>

            {/* ============================================ */}
            {/* Location Section (Responsive Grid) */}
            {/* ============================================ */}

            <FormSection
              title={texts.sections.location.title}
              description={texts.sections.location.description}
              columns={2}
            >
              <CountrySelectField
                control={control}
                name="country"
                label={texts.fields.country.label}
                required
                timezoneFieldName="timezone"
                phoneCountryFieldName="phoneCountryCode"
              />

              <TimezoneSelectField
                control={control}
                name="timezone"
                label={texts.fields.timezone.label}
                required
                countryFieldName="country"
              />
            </FormSection>

            {/* ============================================ */}
            {/* Advanced Options (Collapsible) */}
            {/* ============================================ */}

            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="w-full justify-between text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {texts.actions.advancedOptions}
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-6 pt-4 animate-in slide-in-from-top-2 duration-200">
                <FormSection
                  title={texts.sections.fiscal.title}
                  description={texts.sections.fiscal.description}
                >
                  {/* Legal Name */}
                  <FormField
                    control={control}
                    name="legalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{texts.fields.legalName.label}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={texts.fields.legalName.placeholder}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {texts.fields.legalName.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Tax ID */}
                  <TooltipProvider>
                    <FormField
                      control={control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>
                              {isMexico ? texts.fields.taxId.label : texts.fields.taxId.labelAlt}
                            </FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" type="button" className="h-5 w-5">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">
                                  {isMexico ? texts.fields.taxId.tooltip : texts.fields.taxId.tooltipAlt}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <Input
                              placeholder={
                                isMexico ? texts.fields.taxId.placeholder : texts.fields.taxId.placeholderAlt
                              }
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TooltipProvider>
                </FormSection>

                <FormSection
                  title={texts.sections.digital.title}
                  description={texts.sections.digital.description}
                >
                  {/* Business Email */}
                  <FormField
                    control={control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{texts.fields.email.label}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={texts.fields.email.placeholder}
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {texts.fields.email.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Website */}
                  <FormField
                    control={control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{texts.fields.website.label}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={texts.fields.website.placeholder}
                            type="url"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          {texts.fields.website.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Industry/Sector */}
                  <FormField
                    control={control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{texts.fields.industry.label}</FormLabel>
                        <FormControl>
                          <Input placeholder={texts.fields.industry.placeholder} {...field} />
                        </FormControl>
                        <FormDescription>
                          {texts.fields.industry.description}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormSection>
              </CollapsibleContent>
            </Collapsible>

            {/* ============================================ */}
            {/* Success Indicator */}
            {/* ============================================ */}

            {formState.isValid && <SuccessIndicator translations={t} />}
          </form>
        </Form>
      </StepCard>
    </OnboardingLayout>
  );
}
