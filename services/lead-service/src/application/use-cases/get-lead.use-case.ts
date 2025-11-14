import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { Lead } from '../../domain/aggregates';
import { ILeadRepository } from '../../domain/repositories';
import { LeadResponseDTO } from '../dtos';

/**
 * Get Lead Use Case
 * Retrieves a single lead by ID
 */
@injectable()
export class GetLeadUseCase {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(id: string, tenantId: string): Promise<Result<LeadResponseDTO | null>> {
    const result = await this.leadRepository.findById(id, tenantId);

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const lead = result.getValue();
    if (!lead) {
      return Result.ok(null);
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
