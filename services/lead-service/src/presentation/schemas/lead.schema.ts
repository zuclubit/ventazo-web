import { z } from 'zod';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Zod schemas for Lead API validation
 * TypeScript-first validation with automatic type inference
 */

// Lead Source enum
export const LEAD_SOURCES = ['referral', 'social', 'website', 'ad', 'organic', 'manual', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// Create Lead Schema
// NOTE: tenantId is extracted from x-tenant-id header for consistency with other modules
export const createLeadSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Invalid email format'),
  phone: z.string().max(50).optional(),
  companyName: z.string().max(255).optional(),
  jobTitle: z.string().max(100).optional(),
  source: z.enum(LEAD_SOURCES).default('manual'),
  industry: z.string().max(100).optional(),
  website: z.string().max(255).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().min(0).optional(),
  ownerId: z.string().uuid('Invalid owner ID format').optional(),
  stageId: z.string().uuid('Invalid stage ID format').optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export type CreateLeadSchema = z.infer<typeof createLeadSchema>;

// Update Lead Schema
export const updateLeadSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  companyName: z.string().max(255).optional(),
  jobTitle: z.string().max(100).optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  website: z.string().max(255).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().min(0).optional(),
  stageId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export type UpdateLeadSchema = z.infer<typeof updateLeadSchema>;

// Change Status Schema
export const changeStatusSchema = z.object({
  status: z.nativeEnum(LeadStatusEnum, {
    errorMap: () => ({ message: 'Invalid status value' }),
  }),
  reason: z.string().min(1).max(500),
});

export type ChangeStatusSchema = z.infer<typeof changeStatusSchema>;

// Update Score Schema
export const updateScoreSchema = z.object({
  score: z.number().int().min(0, 'Score must be at least 0').max(100, 'Score must be at most 100'),
  reason: z.string().min(1).max(500),
});

export type UpdateScoreSchema = z.infer<typeof updateScoreSchema>;

// Assign Lead Schema
export const assignLeadSchema = z.object({
  assignedTo: z.string().uuid('Invalid assignee ID format'),
});

export type AssignLeadSchema = z.infer<typeof assignLeadSchema>;

// Qualify Lead Schema
export const qualifyLeadSchema = z.object({
  qualifiedBy: z.string().uuid('Invalid user ID format'),
});

export type QualifyLeadSchema = z.infer<typeof qualifyLeadSchema>;

// Schedule Follow-up Schema
export const scheduleFollowUpSchema = z.object({
  scheduledAt: z.string().datetime('Invalid datetime format'),
  notes: z.string().min(1).max(1000),
});

export type ScheduleFollowUpSchema = z.infer<typeof scheduleFollowUpSchema>;

// Find Leads Query Schema
export const findLeadsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  searchTerm: z.string().optional(),
  status: z.nativeEnum(LeadStatusEnum).optional(),
  stageId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  industry: z.string().optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  maxScore: z.coerce.number().int().min(0).max(100).optional(),
  sortBy: z.enum(['fullName', 'companyName', 'email', 'score', 'createdAt', 'updatedAt']).default('createdAt'),
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

// Convert Lead Schema
export const convertLeadSchema = z.object({
  contractValue: z.number().positive('Contract value must be positive').optional(),
  contractStartDate: z.string().datetime('Invalid datetime format').optional(),
  contractEndDate: z.string().datetime('Invalid datetime format').optional(),
  notes: z.string().max(2000).optional(),
});

export type ConvertLeadSchema = z.infer<typeof convertLeadSchema>;

// Activity Log Query Schema
export const activityLogQuerySchema = z.object({
  entityType: z.enum(['lead', 'customer', 'user', 'tenant', 'membership']).optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ActivityLogQuerySchema = z.infer<typeof activityLogQuerySchema>;
