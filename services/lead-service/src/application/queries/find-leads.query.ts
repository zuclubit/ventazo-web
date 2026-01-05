import { IQuery } from '../common';
import { PaginatedLeadsResponseDTO } from '../dtos';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Query to find leads with filters and pagination
 */
export class FindLeadsQuery implements IQuery<PaginatedLeadsResponseDTO> {
  readonly type = 'FindLeadsQuery';

  constructor(
    public readonly tenantId: string,
    public readonly page?: number,
    public readonly limit?: number,
    public readonly status?: LeadStatusEnum,
    public readonly ownerId?: string,
    public readonly source?: string,
    public readonly industry?: string,
    public readonly minScore?: number,
    public readonly maxScore?: number,
    public readonly searchTerm?: string,
    public readonly sortBy?: 'createdAt' | 'updatedAt' | 'score' | 'companyName',
    public readonly sortOrder?: 'asc' | 'desc'
  ) {}
}
