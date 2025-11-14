import { Result } from '@zuclubit/domain';
import { Lead } from '../aggregates';
import { LeadStatusEnum } from '../value-objects';

/**
 * Query parameters for filtering leads
 */
export interface FindLeadsQuery {
  tenantId: string;
  status?: LeadStatusEnum;
  ownerId?: string;
  source?: string;
  minScore?: number;
  maxScore?: number;
  industry?: string;
  searchTerm?: string; // Search in company name, email
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'companyName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Lead Repository Interface
 * Defines the contract for lead persistence
 */
export interface ILeadRepository {
  /**
   * Find lead by ID
   */
  findById(id: string, tenantId: string): Promise<Result<Lead | null>>;

  /**
   * Find all leads matching query
   */
  findAll(query: FindLeadsQuery): Promise<Result<PaginatedResult<Lead>>>;

  /**
   * Find leads by owner
   */
  findByOwner(ownerId: string, tenantId: string): Promise<Result<Lead[]>>;

  /**
   * Find leads by status
   */
  findByStatus(status: LeadStatusEnum, tenantId: string): Promise<Result<Lead[]>>;

  /**
   * Find overdue follow-ups
   */
  findOverdueFollowUps(tenantId: string): Promise<Result<Lead[]>>;

  /**
   * Save lead (create or update)
   */
  save(lead: Lead): Promise<Result<void>>;

  /**
   * Delete lead
   */
  delete(id: string, tenantId: string): Promise<Result<void>>;

  /**
   * Check if lead exists
   */
  exists(id: string, tenantId: string): Promise<Result<boolean>>;

  /**
   * Count leads by status
   */
  countByStatus(tenantId: string): Promise<Result<Record<string, number>>>;

  /**
   * Get average score by status
   */
  getAverageScoreByStatus(tenantId: string): Promise<Result<Record<string, number>>>;
}
