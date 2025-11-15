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

/**
 * Mapper to convert Lead aggregate to DTOs
 */
import { Lead } from '../../domain/aggregates';

export class LeadMapper {
  static toResponseDTO(lead: Lead): LeadResponseDTO {
    const now = new Date();
    const nextFollowUp = lead.getNextFollowUpAt();
    const isFollowUpOverdue = nextFollowUp ? nextFollowUp < now : false;

    return {
      id: lead.id,
      tenantId: lead.tenantId,
      companyName: lead.getCompanyName(),
      email: lead.getEmail().value,
      phone: lead.getPhone() || null,
      website: lead.getWebsite() || null,
      industry: lead.getIndustry() || null,
      employeeCount: lead.getEmployeeCount() || null,
      annualRevenue: lead.getAnnualRevenue() || null,
      status: lead.getStatus().value,
      score: lead.getScore().value,
      scoreCategory: lead.getScore().getCategory(),
      source: lead.getSource(),
      ownerId: lead.getOwnerId() || null,
      notes: lead.getNotes() || null,
      customFields: lead.getCustomFields(),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.getUpdatedAt().toISOString(),
      lastActivityAt: lead.getLastActivityAt()?.toISOString() || null,
      nextFollowUpAt: nextFollowUp?.toISOString() || null,
      isFollowUpOverdue,
    };
  }

  static toResponseDTOArray(leads: Lead[]): LeadResponseDTO[] {
    return leads.map(lead => this.toResponseDTO(lead));
  }
}
