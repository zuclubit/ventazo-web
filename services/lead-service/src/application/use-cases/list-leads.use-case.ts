import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { Lead } from '../../domain/aggregates';
import { ILeadRepository, FindLeadsQuery } from '../../domain/repositories';
import { LeadResponseDTO, PaginatedLeadsResponseDTO } from '../dtos';

/**
 * List Leads Use Case
 * Retrieves paginated list of leads with filtering
 */
@injectable()
export class ListLeadsUseCase {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(query: FindLeadsQuery): Promise<Result<PaginatedLeadsResponseDTO>> {
    const result = await this.leadRepository.findAll(query);

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const paginatedLeads = result.getValue();

    return Result.ok({
      items: paginatedLeads.items.map((lead) => this.toDTO(lead)),
      total: paginatedLeads.total,
      page: paginatedLeads.page,
      limit: paginatedLeads.limit,
      totalPages: paginatedLeads.totalPages,
    });
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
