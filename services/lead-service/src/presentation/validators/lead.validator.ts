import { z } from 'zod';
import {
  phoneSchema,
  websiteSchema,
  emailSchema,
  optionalEmailSchema,
  companyNameSchema,
  industrySchema,
  employeeCountSchema,
  currencyAmountSchema,
  optionalUuidSchema,
  notesSchema,
  customFieldsSchema,
  addressSchema,
  socialLinksSchema,
  tagsSchema,
} from './validation-utils';

/**
 * Zod schemas for request validation
 * TypeScript types are automatically inferred from these schemas
 * Uses advanced validation utilities for robust field validation
 */

export const createLeadSchema = z.object({
  companyName: companyNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  industry: industrySchema,
  employeeCount: employeeCountSchema,
  annualRevenue: currencyAmountSchema,
  source: z.string().min(1, 'Source is required').max(100),
  ownerId: optionalUuidSchema,
  notes: notesSchema,
  customFields: customFieldsSchema,
  address: addressSchema,
  socialLinks: socialLinksSchema,
  tags: tagsSchema,
});

export const updateLeadSchema = z.object({
  companyName: companyNameSchema.optional(),
  email: optionalEmailSchema,
  phone: phoneSchema,
  website: websiteSchema,
  industry: industrySchema,
  employeeCount: employeeCountSchema,
  annualRevenue: currencyAmountSchema,
  notes: notesSchema,
  address: addressSchema,
  socialLinks: socialLinksSchema,
  tags: tagsSchema,
});

export const listLeadsQuerySchema = z.object({
  status: z
    .enum([
      'new',
      'contacted',
      'qualified',
      'proposal',
      'won',
      'lost',
    ])
    .optional(),
  ownerId: z.string().uuid().optional(),
  source: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  industry: z.string().optional(),
  searchTerm: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'score', 'companyName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid lead ID'),
});

export const qualifyLeadSchema = z.object({
  qualifiedBy: z.string().uuid('Invalid user ID'),
});

// Inferred TypeScript types
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type QualifyLeadInput = z.infer<typeof qualifyLeadSchema>;
