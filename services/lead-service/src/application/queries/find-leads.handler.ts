import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { IQueryHandler } from '../common';
import { FindLeadsQuery } from './find-leads.query';
import { ILeadRepository } from '../../domain/repositories';
import { PaginatedLeadsResponseDTO, LeadMapper } from '../dtos';

/**
 * Handler for FindLeadsQuery
 */
@injectable()
export class FindLeadsHandler implements IQueryHandler<FindLeadsQuery, PaginatedLeadsResponseDTO> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(query: FindLeadsQuery): Promise<Result<PaginatedLeadsResponseDTO>> {
    const result = await this.leadRepository.findAll({
      tenantId: query.tenantId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      ownerId: query.ownerId,
      source: query.source,
      industry: query.industry,
      minScore: query.minScore,
      maxScore: query.maxScore,
      searchTerm: query.searchTerm,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const paginatedResult = result.getValue();

    return Result.ok({
      items: LeadMapper.toResponseDTOArray(paginatedResult.items),
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
      totalPages: paginatedResult.totalPages,
    });
  }
}
