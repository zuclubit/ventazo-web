import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { IQueryHandler } from '../common';
import { GetLeadStatsQuery } from './get-lead-stats.query';
import { ILeadRepository } from '../../domain/repositories';
import { LeadStatsDTO } from '../dtos';

/**
 * Handler for GetLeadStatsQuery
 */
@injectable()
export class GetLeadStatsHandler implements IQueryHandler<GetLeadStatsQuery, LeadStatsDTO> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(query: GetLeadStatsQuery): Promise<Result<LeadStatsDTO>> {
    // Get all leads count
    const allLeadsResult = await this.leadRepository.findAll({
      tenantId: query.tenantId,
      page: 1,
      limit: 1,
    });

    if (allLeadsResult.isFailure) {
      return Result.fail(allLeadsResult.error as string);
    }

    const totalLeads = allLeadsResult.getValue().total;

    // Get counts by status
    const byStatusResult = await this.leadRepository.countByStatus(query.tenantId);
    if (byStatusResult.isFailure) {
      return Result.fail(byStatusResult.error as string);
    }

    // Get average scores by status
    const avgScoresResult = await this.leadRepository.getAverageScoreByStatus(query.tenantId);
    if (avgScoresResult.isFailure) {
      return Result.fail(avgScoresResult.error as string);
    }

    return Result.ok({
      totalLeads,
      leadsByStatus: byStatusResult.getValue(),
      averageScoreByStatus: avgScoresResult.getValue(),
    });
  }
}
