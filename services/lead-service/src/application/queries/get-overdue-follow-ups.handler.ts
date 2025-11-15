import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { IQueryHandler } from '../common';
import { GetOverdueFollowUpsQuery } from './get-overdue-follow-ups.query';
import { ILeadRepository } from '../../domain/repositories';
import { LeadResponseDTO, LeadMapper } from '../dtos';

/**
 * Handler for GetOverdueFollowUpsQuery
 */
@injectable()
export class GetOverdueFollowUpsHandler
  implements IQueryHandler<GetOverdueFollowUpsQuery, LeadResponseDTO[]>
{
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(query: GetOverdueFollowUpsQuery): Promise<Result<LeadResponseDTO[]>> {
    const result = await this.leadRepository.findOverdueFollowUps(query.tenantId);

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const leads = result.getValue();
    return Result.ok(LeadMapper.toResponseDTOArray(leads));
  }
}
