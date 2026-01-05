import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { IQueryHandler } from '../common';
import { GetLeadByIdQuery } from './get-lead-by-id.query';
import { ILeadRepository } from '../../domain/repositories';
import { LeadResponseDTO, LeadMapper } from '../dtos';

/**
 * Handler for GetLeadByIdQuery
 */
@injectable()
export class GetLeadByIdHandler implements IQueryHandler<GetLeadByIdQuery, LeadResponseDTO | null> {
  constructor(@inject('ILeadRepository') private readonly leadRepository: ILeadRepository) {}

  async execute(query: GetLeadByIdQuery): Promise<Result<LeadResponseDTO | null>> {
    const result = await this.leadRepository.findById(query.leadId, query.tenantId);

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const lead = result.getValue();
    if (!lead) {
      return Result.ok(null);
    }

    return Result.ok(LeadMapper.toResponseDTO(lead));
  }
}
