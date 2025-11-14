/**
 * Data Transfer Objects for Lead Service
 */

export interface CreateLeadDTO {
  tenantId: string;
  companyName: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  source: string;
  ownerId?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadDTO {
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  notes?: string;
}

export interface LeadResponseDTO {
  id: string;
  tenantId: string;
  companyName: string;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  status: string;
  score: number;
  scoreCategory: 'hot' | 'warm' | 'cold';
  source: string;
  ownerId: string | null;
  notes: string | null;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  isFollowUpOverdue: boolean;
}

export interface PaginatedLeadsResponseDTO {
  items: LeadResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadStatsDTO {
  totalLeads: number;
  leadsByStatus: Record<string, number>;
  averageScoreByStatus: Record<string, number>;
}
