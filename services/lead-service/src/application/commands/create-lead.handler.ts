import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { CreateLeadCommand } from './create-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

/**
 * Result DTO for CreateLeadCommand
 */
export interface CreateLeadResult {
  leadId: string;
}

/**
 * Handler for CreateLeadCommand
 * Implements business logic for creating a new lead
 */
@injectable()
export class CreateLeadHandler implements ICommandHandler<CreateLeadCommand, CreateLeadResult> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: CreateLeadCommand): Promise<Result<CreateLeadResult>> {
    // Create lead aggregate
    const leadResult = Lead.create({
      tenantId: command.tenantId,
      companyName: command.companyName,
      email: command.email,
      source: command.source,
      phone: command.phone,
      website: command.website,
      industry: command.industry,
      employeeCount: command.employeeCount,
      annualRevenue: command.annualRevenue,
      notes: command.notes,
      customFields: command.customFields,
    });

    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();

    // Persist lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    return Result.ok({
      leadId: lead.id,
    });
  }
}
