import { z } from 'zod';

/**
 * Advanced Validation Utilities
 * Provides reusable validation schemas for common field types
 */

/**
 * Phone Number Validation
 * Supports international formats with optional country code
 * Examples: +1234567890, +1 (234) 567-8901, (234) 567-8901
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((val) => {
    // Remove all whitespace and common separators for storage
    return val.replace(/[\s()-]/g, '');
  })
  .refine(
    (val) => {
      if (!val) return true; // Allow empty
      // Allow + at start, followed by 7-15 digits
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      return phoneRegex.test(val);
    },
    {
      message: 'Invalid phone number format. Use international format: +1234567890',
    }
  )
  .optional()
  .nullable();

/**
 * Strict Phone Number Validation (required)
 */
export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone number too short')
  .transform((val) => val.replace(/[\s()-]/g, ''))
  .refine(
    (val) => {
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      return phoneRegex.test(val);
    },
    {
      message: 'Invalid phone number format. Use international format: +1234567890',
    }
  );

/**
 * E.164 Phone Number Validation (strict international format)
 */
export const e164PhoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      // E.164 format: + followed by 1-15 digits
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(val);
    },
    {
      message: 'Phone must be in E.164 format: +12025551234',
    }
  )
  .optional()
  .nullable();

/**
 * Website URL Validation
 * Validates and normalizes URLs
 */
export const websiteSchema = z
  .string()
  .trim()
  .transform((val) => {
    if (!val) return val;
    // Add https:// if no protocol specified
    if (!/^https?:\/\//i.test(val)) {
      return `https://${val}`;
    }
    return val;
  })
  .refine(
    (val) => {
      if (!val) return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    {
      message: 'Invalid website URL format',
    }
  )
  .optional()
  .nullable();

/**
 * LinkedIn URL Validation
 */
export const linkedinUrlSchema = z
  .string()
  .trim()
  .transform((val) => {
    if (!val) return val;
    // Normalize to https if http
    if (val.startsWith('http://')) {
      return val.replace('http://', 'https://');
    }
    // Add https:// if no protocol
    if (!val.startsWith('https://')) {
      return `https://${val}`;
    }
    return val;
  })
  .refine(
    (val) => {
      if (!val) return true;
      // Must be a LinkedIn URL
      const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|company|school)\/[\w-]+\/?$/i;
      return linkedinRegex.test(val);
    },
    {
      message: 'Invalid LinkedIn URL. Use format: linkedin.com/in/username',
    }
  )
  .optional()
  .nullable();

/**
 * Company Name Validation
 */
export const companyNameSchema = z
  .string()
  .trim()
  .min(1, 'Company name is required')
  .max(255, 'Company name too long (max 255 characters)')
  .refine(
    (val) => {
      // Disallow only special characters
      return /[a-zA-Z0-9]/.test(val);
    },
    {
      message: 'Company name must contain at least one alphanumeric character',
    }
  );

/**
 * Email Validation with additional checks
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255, 'Email too long (max 255 characters)')
  .refine(
    (val) => {
      // Check for disposable email domains
      const disposableDomains = [
        'tempmail.com',
        'throwaway.email',
        'guerrillamail.com',
        'mailinator.com',
        'temp-mail.org',
        '10minutemail.com',
      ];
      const domain = val.split('@')[1];
      return !disposableDomains.includes(domain);
    },
    {
      message: 'Disposable email addresses are not allowed',
    }
  );

/**
 * Optional Email Validation
 */
export const optionalEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Invalid email format')
  .max(255)
  .optional()
  .nullable();

/**
 * Industry Validation
 * Common industry values for standardization
 */
export const industryValues = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Professional Services',
  'Media & Entertainment',
  'Telecommunications',
  'Energy',
  'Transportation',
  'Hospitality',
  'Agriculture',
  'Construction',
  'Government',
  'Non-Profit',
  'Other',
] as const;

export const industrySchema = z
  .string()
  .trim()
  .max(100, 'Industry name too long')
  .optional()
  .nullable();

/**
 * Strict Industry Validation (enum-based)
 */
export const strictIndustrySchema = z.enum(industryValues).optional().nullable();

/**
 * Currency Amount Validation
 */
export const currencyAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(999999999999.99, 'Amount too large')
  .transform((val) => Math.round(val * 100) / 100) // Round to 2 decimal places
  .optional()
  .nullable();

/**
 * Employee Count Validation
 */
export const employeeCountSchema = z
  .number()
  .int('Must be a whole number')
  .positive('Must be positive')
  .max(10000000, 'Employee count too large')
  .optional()
  .nullable();

/**
 * UUID Validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const optionalUuidSchema = z.string().uuid('Invalid UUID format').optional().nullable();

/**
 * Timezone Validation
 */
export const timezoneSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        Intl.DateTimeFormat(undefined, { timeZone: val });
        return true;
      } catch {
        return false;
      }
    },
    {
      message: 'Invalid timezone. Use IANA timezone format: America/New_York',
    }
  )
  .optional()
  .nullable();

/**
 * Date Range Validation
 */
export const dateRangeSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((data) => data.from <= data.to, {
    message: 'Start date must be before end date',
  });

/**
 * Score Validation (0-100)
 */
export const scoreSchema = z
  .number()
  .int('Score must be a whole number')
  .min(0, 'Score must be at least 0')
  .max(100, 'Score cannot exceed 100');

/**
 * Pagination Validation
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * Notes/Text Field Validation
 */
export const notesSchema = z.string().trim().max(10000, 'Notes too long (max 10000 characters)').optional().nullable();

/**
 * Tags Validation
 */
export const tagsSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(20, 'Maximum 20 tags allowed')
  .optional()
  .nullable();

/**
 * Custom Fields Validation
 */
export const customFieldsSchema = z
  .record(
    z.string().max(100), // key max length
    z.union([z.string().max(1000), z.number(), z.boolean(), z.null()])
  )
  .optional()
  .nullable();

/**
 * Address Validation
 */
export const addressSchema = z
  .object({
    street: z.string().trim().max(255).optional(),
    street2: z.string().trim().max(255).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().max(20).optional(),
    country: z.string().trim().max(100).optional(),
  })
  .optional()
  .nullable();

/**
 * Social Media Links Validation
 */
export const socialLinksSchema = z
  .object({
    linkedin: linkedinUrlSchema,
    twitter: z
      .string()
      .trim()
      .refine((val) => !val || /^https?:\/\/(www\.)?(twitter|x)\.com\/[\w]+\/?$/.test(val), {
        message: 'Invalid Twitter/X URL',
      })
      .optional()
      .nullable(),
    facebook: z
      .string()
      .trim()
      .refine((val) => !val || /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/?$/.test(val), {
        message: 'Invalid Facebook URL',
      })
      .optional()
      .nullable(),
    instagram: z
      .string()
      .trim()
      .refine((val) => !val || /^https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(val), {
        message: 'Invalid Instagram URL',
      })
      .optional()
      .nullable(),
  })
  .optional()
  .nullable();

/**
 * Validate and format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return `+${cleaned}`;
}

/**
 * Validate and normalize URL
 */
export function normalizeUrl(url: string): string {
  if (!url) return url;
  let normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

/**
 * Check if email is from a known business domain
 */
export function isBusinessEmail(email: string): boolean {
  const freeEmailDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'mail.com',
    'protonmail.com',
    'live.com',
    'msn.com',
  ];
  const domain = email.toLowerCase().split('@')[1];
  return !freeEmailDomains.includes(domain);
}

/**
 * Validate tax ID format (US EIN example)
 */
export const taxIdSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      // US EIN format: XX-XXXXXXX
      const einRegex = /^\d{2}-\d{7}$/;
      return einRegex.test(val);
    },
    {
      message: 'Invalid Tax ID format. Use format: XX-XXXXXXX',
    }
  )
  .optional()
  .nullable();

export type AddressInput = z.infer<typeof addressSchema>;
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
