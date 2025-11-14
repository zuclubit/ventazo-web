import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ILeadRepository } from '../../domain/repositories';
import { LeadResponseDTO } from '../dtos';
import { Lead } from '../../domain/aggregates';

/**
 * Qualify Lead Use Case
 * Qualifies a lead based on score threshold
 */
@injectable()
export class QualifyLeadUseCase {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(
    id: string,
    tenantId: string,
    qualifiedBy: string
  ): Promise<Result<LeadResponseDTO>> {
    // Fetch lead
    const findResult = await this.leadRepository.findById(id, tenantId);
    if (findResult.isFailure) {
      return Result.fail(findResult.error as string);
    }

    const lead = findResult.getValue();
    if (!lead) {
      return Result.fail('Lead not found');
    }

    // Qualify lead
    const qualifyResult = lead.qualify(qualifiedBy);
    if (qualifyResult.isFailure) {
      return Result.fail(qualifyResult.error as string);
    }

    // Persist changes
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    return Result.ok(this.toDTO(lead));
  }

  private toDTO(lead: Lead): LeadResponseDTO {
    return {
      id: lead.id,
      tenantId: lead.tenantId,
      companyName: lead.getCompanyName(),
      email: lead.getEmail().value,
      phone: lead.getPhone(),
      website: lead.getWebsite(),
      industry: lead.getIndustry(),
      employeeCount: lead.getEmployeeCount(),
      annualRevenue: lead.getAnnualRevenue(),
      status: lead.getStatus().value,
      score: lead.getScore().value,
      scoreCategory: lead.getScore().getCategory(),
      source: lead.getSource(),
      ownerId: lead.getOwnerId(),
      notes: lead.getNotes(),
      customFields: lead.getCustomFields(),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.getUpdatedAt().toISOString(),
      lastActivityAt: lead.getLastActivityAt()?.toISOString() || null,
      nextFollowUpAt: lead.getNextFollowUpAt()?.toISOString() || null,
      isFollowUpOverdue: lead.isFollowUpOverdue(),
    };
  }
}
