// ============================================
// Form Data Sanitizer
// Applies security sanitization to form submissions
// ============================================

import { sanitizeText, sanitizeUrl, sanitizeRichText, escapeHtml, sanitizeForDisplay } from './index';

/**
 * Field types for different sanitization strategies
 */
type FieldType = 'text' | 'richtext' | 'url' | 'email' | 'phone' | 'number' | 'array' | 'object' | 'skip';

/**
 * Field sanitization configuration
 */
interface FieldConfig {
  type: FieldType;
  maxLength?: number;
}

/**
 * Schema defining how to sanitize each field
 */
type SanitizationSchema<T> = {
  [K in keyof T]?: FieldConfig;
};

/**
 * Sanitize a single value based on its type
 */
function sanitizeValue(value: unknown, config: FieldConfig): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  switch (config.type) {
    case 'text':
      if (typeof value !== 'string') return '';
      const sanitized = sanitizeText(value);
      return config.maxLength ? sanitized.slice(0, config.maxLength) : sanitized;

    case 'richtext':
      if (typeof value !== 'string') return '';
      return sanitizeRichText(value);

    case 'url':
      if (typeof value !== 'string') return '';
      return sanitizeUrl(value);

    case 'email':
      if (typeof value !== 'string') return '';
      // Basic email sanitization - trim and lowercase
      return value.trim().toLowerCase().slice(0, 254);

    case 'phone':
      if (typeof value !== 'string') return '';
      // Remove non-phone characters but keep + for country code
      return value.replace(/[^\d+\-\s()]/g, '').trim().slice(0, 30);

    case 'number':
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      }
      return 0;

    case 'array':
      if (!Array.isArray(value)) return [];
      return value.map(item => {
        if (typeof item === 'string') {
          return sanitizeText(item);
        }
        return item;
      });

    case 'object':
      // Skip sanitization for complex objects (should be handled separately)
      return value;

    case 'skip':
      // Don't sanitize (for special fields like IDs, dates, etc.)
      return value;

    default:
      // Default: treat as text
      if (typeof value === 'string') {
        return sanitizeText(value);
      }
      return value;
  }
}

/**
 * Sanitize form data using a schema
 */
export function sanitizeFormData<T extends Record<string, unknown>>(
  data: T,
  schema: SanitizationSchema<T>
): T {
  const result = { ...data };

  for (const key of Object.keys(result) as (keyof T)[]) {
    const config = schema[key];
    if (config) {
      result[key] = sanitizeValue(result[key], config) as T[keyof T];
    } else {
      // Default sanitization for unspecified string fields
      if (typeof result[key] === 'string') {
        result[key] = sanitizeText(result[key] as string) as T[keyof T];
      }
    }
  }

  return result;
}

/**
 * Default schemas for common CRM entities
 */
export const CRM_SANITIZATION_SCHEMAS = {
  lead: {
    fullName: { type: 'text' as const, maxLength: 200 },
    email: { type: 'email' as const },
    phone: { type: 'phone' as const },
    company: { type: 'text' as const, maxLength: 200 },
    website: { type: 'url' as const },
    notes: { type: 'richtext' as const },
    tags: { type: 'array' as const },
    source: { type: 'text' as const, maxLength: 100 },
    // IDs and system fields
    id: { type: 'skip' as const },
    status: { type: 'skip' as const },
    score: { type: 'number' as const },
    ownerId: { type: 'skip' as const },
    pipelineId: { type: 'skip' as const },
    stageId: { type: 'skip' as const },
  },

  customer: {
    companyName: { type: 'text' as const, maxLength: 200 },
    email: { type: 'email' as const },
    phone: { type: 'phone' as const },
    website: { type: 'url' as const },
    address: { type: 'text' as const, maxLength: 500 },
    city: { type: 'text' as const, maxLength: 100 },
    state: { type: 'text' as const, maxLength: 100 },
    country: { type: 'text' as const, maxLength: 100 },
    postalCode: { type: 'text' as const, maxLength: 20 },
    notes: { type: 'richtext' as const },
    tags: { type: 'array' as const },
    // IDs
    id: { type: 'skip' as const },
    primaryContactId: { type: 'skip' as const },
    ownerId: { type: 'skip' as const },
  },

  opportunity: {
    title: { type: 'text' as const, maxLength: 200 },
    description: { type: 'richtext' as const },
    notes: { type: 'richtext' as const },
    tags: { type: 'array' as const },
    // Numbers
    amount: { type: 'number' as const },
    probability: { type: 'number' as const },
    // IDs and system fields
    id: { type: 'skip' as const },
    customerId: { type: 'skip' as const },
    leadId: { type: 'skip' as const },
    ownerId: { type: 'skip' as const },
    stageId: { type: 'skip' as const },
    pipelineId: { type: 'skip' as const },
    status: { type: 'skip' as const },
    closeDate: { type: 'skip' as const },
  },

  task: {
    title: { type: 'text' as const, maxLength: 200 },
    description: { type: 'richtext' as const },
    notes: { type: 'richtext' as const },
    tags: { type: 'array' as const },
    // IDs and system fields
    id: { type: 'skip' as const },
    assigneeId: { type: 'skip' as const },
    relatedEntityId: { type: 'skip' as const },
    relatedEntityType: { type: 'skip' as const },
    status: { type: 'skip' as const },
    priority: { type: 'skip' as const },
    dueDate: { type: 'skip' as const },
    startDate: { type: 'skip' as const },
  },

  service: {
    name: { type: 'text' as const, maxLength: 200 },
    description: { type: 'richtext' as const },
    // Numbers
    price: { type: 'number' as const },
    cost: { type: 'number' as const },
    duration_minutes: { type: 'number' as const },
    tax_rate: { type: 'number' as const },
    // IDs and system fields
    id: { type: 'skip' as const },
    category_id: { type: 'skip' as const },
    is_active: { type: 'skip' as const },
    custom_fields: { type: 'object' as const },
  },

  contact: {
    firstName: { type: 'text' as const, maxLength: 100 },
    lastName: { type: 'text' as const, maxLength: 100 },
    email: { type: 'email' as const },
    phone: { type: 'phone' as const },
    jobTitle: { type: 'text' as const, maxLength: 100 },
    department: { type: 'text' as const, maxLength: 100 },
    notes: { type: 'richtext' as const },
    // IDs
    id: { type: 'skip' as const },
    customerId: { type: 'skip' as const },
    isPrimary: { type: 'skip' as const },
  },
} as const;

/**
 * Helper to quickly sanitize lead data
 */
export function sanitizeLeadData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.lead);
}

/**
 * Helper to quickly sanitize customer data
 */
export function sanitizeCustomerData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.customer);
}

/**
 * Helper to quickly sanitize opportunity data
 */
export function sanitizeOpportunityData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.opportunity);
}

/**
 * Helper to quickly sanitize task data
 */
export function sanitizeTaskData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.task);
}

/**
 * Helper to quickly sanitize service data
 */
export function sanitizeServiceData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.service);
}

/**
 * Helper to quickly sanitize contact data
 */
export function sanitizeContactData<T extends Record<string, unknown>>(data: T): T {
  return sanitizeFormData(data, CRM_SANITIZATION_SCHEMAS.contact);
}

/**
 * Sanitize tags array (common across entities)
 */
export function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map(tag => sanitizeText(tag).slice(0, 50)) // Max 50 chars per tag
    .filter(tag => tag.length > 0)
    .slice(0, 20); // Max 20 tags
}

/**
 * Escape HTML for display (use when rendering user input)
 */
export { escapeHtml, sanitizeForDisplay };
