import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { Lead } from '../../domain/aggregates';
import { ILeadRepository } from '../../domain/repositories';
import { CreateLeadDTO, LeadResponseDTO } from '../dtos';

/**
 * Create Lead Use Case
 * Handles creation of new leads with validation and business rules
 */
@injectable()
export class CreateLeadUseCase {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(dto: CreateLeadDTO): Promise<Result<LeadResponseDTO>> {
    // Create lead aggregate
    const leadResult = Lead.create({
      tenantId: dto.tenantId,
      companyName: dto.companyName,
      email: dto.email,
      phone: dto.phone,
      website: dto.website,
      industry: dto.industry,
      employeeCount: dto.employeeCount,
      annualRevenue: dto.annualRevenue,
      source: dto.source,
      ownerId: dto.ownerId,
      notes: dto.notes,
      customFields: dto.customFields,
    });

    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();

    // Persist lead (this will also publish domain events)
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Map to DTO
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
