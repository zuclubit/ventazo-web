import { z } from 'zod';

/**
 * Zod schemas for request validation
 * TypeScript types are automatically inferred from these schemas
 */

export const createLeadSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  source: z.string().min(1, 'Source is required').max(100),
  ownerId: z.string().uuid('Invalid owner ID').optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const listLeadsQuerySchema = z.object({
  status: z
    .enum([
      'new',
      'contacted',
      'qualified',
      'proposal',
      'negotiation',
      'won',
      'lost',
      'unqualified',
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
