import { z } from 'zod';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Zod schemas for Lead API validation
 * TypeScript-first validation with automatic type inference
 */

// Create Lead Schema
export const createLeadSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID format'),
  companyName: z.string().min(1, 'Company name is required').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  source: z.string().min(1, 'Source is required').max(100),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export type CreateLeadSchema = z.infer<typeof createLeadSchema>;

// Update Lead Schema
export const updateLeadSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().positive().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

export type UpdateLeadSchema = z.infer<typeof updateLeadSchema>;

// Change Status Schema
export const changeStatusSchema = z.object({
  status: z.nativeEnum(LeadStatusEnum, {
    errorMap: () => ({ message: 'Invalid status value' }),
  }),
  userId: z.string().uuid('Invalid user ID format'),
});

export type ChangeStatusSchema = z.infer<typeof changeStatusSchema>;

// Update Score Schema
export const updateScoreSchema = z.object({
  score: z.number().int().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
  reason: z.string().optional(),
});

export type UpdateScoreSchema = z.infer<typeof updateScoreSchema>;

// Assign Lead Schema
export const assignLeadSchema = z.object({
  ownerId: z.string().uuid('Invalid owner ID format'),
  assignedBy: z.string().uuid('Invalid assigned by ID format'),
});

export type AssignLeadSchema = z.infer<typeof assignLeadSchema>;

// Qualify Lead Schema
export const qualifyLeadSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export type QualifyLeadSchema = z.infer<typeof qualifyLeadSchema>;

// Schedule Follow-up Schema
export const scheduleFollowUpSchema = z.object({
  followUpDate: z.string().datetime('Invalid datetime format').transform((val) => new Date(val)),
  userId: z.string().uuid('Invalid user ID format'),
});

export type ScheduleFollowUpSchema = z.infer<typeof scheduleFollowUpSchema>;

// Find Leads Query Schema
export const findLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(LeadStatusEnum).optional(),
  ownerId: z.string().uuid().optional(),
  source: z.string().optional(),
  industry: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  searchTerm: z.string().optional(),
  sortBy: z.enum(['companyName', 'email', 'score', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FindLeadsQuerySchema = z.infer<typeof findLeadsQuerySchema>;

// UUID Param Schema
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export type UuidParamSchema = z.infer<typeof uuidParamSchema>;

// Tenant ID Header Schema
export const tenantHeaderSchema = z.object({
  'x-tenant-id': z.string().uuid('Invalid tenant ID format'),
});

export type TenantHeaderSchema = z.infer<typeof tenantHeaderSchema>;
