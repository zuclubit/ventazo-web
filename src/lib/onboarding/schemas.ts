// ============================================
// Onboarding Form Validation Schemas - FASE 5.11
// Comprehensive Zod schemas for onboarding forms
// ============================================

import { z } from 'zod';

import { getPhoneLength, getPhoneRegex } from '@/components/common/phone-input';

import { BUSINESS_SIZES, BUSINESS_TYPES, CRM_MODULES } from './types';

// ============================================
// Base Field Schemas
// ============================================

/**
 * Business name validation
 * - Required
 * - Min 2 characters
 * - Max 100 characters
 * - No special characters except common business punctuation
 */
export const businessNameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100, 'El nombre no puede exceder 100 caracteres')
  .regex(
    /^[a-zA-Z0-9\u00C0-\u017F\s.,&'-]+$/,
    'El nombre contiene caracteres no permitidos'
  );

/**
 * Legal name / RFC validation (Mexico specific)
 */
export const legalNameSchema = z
  .string()
  .min(2, 'La razon social debe tener al menos 2 caracteres')
  .max(150, 'La razon social no puede exceder 150 caracteres')
  .optional()
  .or(z.literal(''));

/**
 * RFC validation (Mexican tax ID)
 * - 12 characters for companies (moral persons)
 * - 13 characters for individuals (physical persons)
 */
export const rfcSchema = z
  .string()
  .regex(
    /^([A-Z&N]{3,4})(\d{6})([A-Z0-9]{3})$/,
    'RFC invalido. Formato: AAA000000XXX o AAAA000000XXX'
  )
  .optional()
  .or(z.literal(''));

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Ingresa un correo electronico valido')
  .max(254, 'El correo es demasiado largo');

/**
 * Website URL validation
 */
export const websiteSchema = z
  .string()
  .url('Ingresa una URL valida (ej: https://ejemplo.com)')
  .or(z.literal(''))
  .optional();

/**
 * Phone number validation with country-specific rules
 */
export const createPhoneSchema = (countryCode: string = 'MX') => {
  const { min, max } = getPhoneLength(countryCode);
  const regex = getPhoneRegex(countryCode);

  return z
    .string()
    .min(min, `El telefono debe tener al menos ${min} digitos`)
    .max(max, `El telefono no puede exceder ${max} digitos`)
    .regex(/^\d+$/, 'El telefono solo debe contener numeros')
    .refine((val) => regex.test(val), {
      message: `Formato de telefono invalido para el pais seleccionado`,
    });
};

/**
 * Generic phone schema (will be validated based on country)
 */
export const phoneSchema = z
  .string()
  .min(7, 'El telefono debe tener al menos 7 digitos')
  .max(15, 'El telefono no puede exceder 15 digitos')
  .regex(/^\d+$/, 'El telefono solo debe contener numeros');

/**
 * Country code validation
 */
export const countryCodeSchema = z.enum(['MX', 'CO', 'AR', 'CL', 'PE', 'BR', 'US'], {
  errorMap: () => ({ message: 'Selecciona un pais valido' }),
});

/**
 * Timezone validation
 */
export const timezoneSchema = z.string().min(1, 'Selecciona una zona horaria');

/**
 * Business type validation
 */
export const businessTypeSchema = z.enum(
  BUSINESS_TYPES.map((t) => t.value) as [string, ...string[]],
  { errorMap: () => ({ message: 'Selecciona un tipo de negocio' }) }
);

/**
 * Business size validation
 */
export const businessSizeSchema = z.enum(
  BUSINESS_SIZES.map((s) => s.value) as [string, ...string[]],
  { errorMap: () => ({ message: 'Selecciona el tamano de tu equipo' }) }
);

/**
 * Industry/sector validation
 */
export const industrySchema = z
  .string()
  .min(2, 'Selecciona o ingresa una industria')
  .max(100, 'La industria no puede exceder 100 caracteres')
  .optional()
  .or(z.literal(''));

/**
 * CRM modules selection validation
 */
export const crmModulesSchema = z
  .array(
    z.enum(CRM_MODULES.map((m) => m.value) as [string, ...string[]])
  )
  .min(1, 'Selecciona al menos un modulo');

// ============================================
// Composite Form Schemas
// ============================================

/**
 * Create Business Form Schema (Step 1)
 * Initial business information
 */
export const createBusinessSchema = z.object({
  // Basic Info
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  businessSize: businessSizeSchema,
  industry: industrySchema,

  // Contact Info
  email: emailSchema,
  phone: phoneSchema,
  phoneCountryCode: countryCodeSchema.default('MX'),

  // Location
  country: countryCodeSchema,
  timezone: timezoneSchema,

  // Optional Legal Info
  legalName: legalNameSchema,
  taxId: rfcSchema, // RFC for Mexico, or other tax ID

  // Website
  website: websiteSchema,
});

export type CreateBusinessFormData = z.infer<typeof createBusinessSchema>;

/**
 * Business Setup Form Schema (Step 2)
 * Branding and preferences
 */
export const businessSetupSchema = z.object({
  // Branding
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color invalido')
    .default('#3B82F6'),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color invalido')
    .optional(),

  // Preferences
  language: z.enum(['es-MX', 'pt-BR', 'en-US']).default('es-MX'),
  dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).default('dd/MM/yyyy'),
  currency: z.enum(['MXN', 'USD', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']).default('MXN'),

  // Modules Selection
  modules: crmModulesSchema,
});

export type BusinessSetupFormData = z.infer<typeof businessSetupSchema>;

/**
 * Business Hours Schema
 */
export const businessHourSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora invalida').optional(),
  closeTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora invalida').optional(),
});

export const businessHoursSchema = z
  .array(businessHourSchema)
  .refine(
    (hours) => {
      // Validate that open days have both open and close times
      return hours.every((hour) => {
        if (hour.isOpen) {
          return hour.openTime && hour.closeTime;
        }
        return true;
      });
    },
    { message: 'Los dias abiertos deben tener horarios de apertura y cierre' }
  );

export type BusinessHourData = z.infer<typeof businessHourSchema>;

/**
 * Complete Onboarding Schema
 * Combines all onboarding steps
 */
export const completeOnboardingSchema = createBusinessSchema
  .merge(businessSetupSchema)
  .extend({
    businessHours: businessHoursSchema.optional(),
  });

export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate phone number for a specific country
 */
export function validatePhoneForCountry(phone: string, countryCode: string): boolean {
  const regex = getPhoneRegex(countryCode);
  return regex.test(phone);
}

/**
 * Validate RFC format (Mexican tax ID)
 */
export function validateRFC(rfc: string): { valid: boolean; type: 'moral' | 'fisica' | null } {
  const cleanRfc = rfc.toUpperCase().trim();

  // Moral person (company): 12 characters
  const moralRegex = /^[A-Z&N]{3}\d{6}[A-Z0-9]{3}$/;
  if (moralRegex.test(cleanRfc)) {
    return { valid: true, type: 'moral' };
  }

  // Physical person (individual): 13 characters
  const fisicaRegex = /^[A-Z&N]{4}\d{6}[A-Z0-9]{3}$/;
  if (fisicaRegex.test(cleanRfc)) {
    return { valid: true, type: 'fisica' };
  }

  return { valid: false, type: null };
}

/**
 * Sanitize business name (remove extra spaces, trim)
 */
export function sanitizeBusinessName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/[^\w\u00C0-\u017F\s.,&'-]/g, ''); // Remove invalid chars
}

/**
 * Format phone number for storage (digits only)
 */
export function formatPhoneForStorage(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Build international phone format
 */
export function buildInternationalPhone(phone: string, countryCode: string): string {
  const phoneCodeMap: Record<string, string> = {
    MX: '+52',
    CO: '+57',
    AR: '+54',
    CL: '+56',
    PE: '+51',
    BR: '+55',
    US: '+1',
  };

  const cleanPhone = formatPhoneForStorage(phone);
  const phoneCode = phoneCodeMap[countryCode] || '+52';

  return `${phoneCode}${cleanPhone}`;
}

// ============================================
// Default Values
// ============================================

export const defaultCreateBusinessValues: Partial<CreateBusinessFormData> = {
  businessName: '',
  businessType: undefined,
  businessSize: undefined,
  industry: '',
  email: '',
  phone: '',
  phoneCountryCode: 'MX',
  country: 'MX',
  timezone: 'America/Mexico_City',
  legalName: '',
  taxId: '',
  website: '',
};

export const defaultBusinessSetupValues: Partial<BusinessSetupFormData> = {
  logoUrl: '',
  primaryColor: '#3B82F6',
  secondaryColor: '',
  language: 'es-MX',
  dateFormat: 'dd/MM/yyyy',
  currency: 'MXN',
  modules: ['leads', 'contacts'],
};

export const defaultBusinessHours: BusinessHourData[] = [
  { day: 'monday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'friday', isOpen: true, openTime: '09:00', closeTime: '18:00' },
  { day: 'saturday', isOpen: false },
  { day: 'sunday', isOpen: false },
];
