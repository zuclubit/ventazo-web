import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { UpdateLeadCommand } from './update-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

/**
 * Handler for UpdateLeadCommand
 */
@injectable()
export class UpdateLeadHandler implements ICommandHandler<UpdateLeadCommand, Lead> {
  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: UpdateLeadCommand): Promise<Result<Lead>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Update lead using the aggregate's update method
    const updateResult = lead.update({
      fullName: command.fullName,
      companyName: command.companyName,
      jobTitle: command.jobTitle,
      email: command.email,
      phone: command.phone,
      website: command.website,
      industry: command.industry,
      employeeCount: command.employeeCount,
      annualRevenue: command.annualRevenue,
      stageId: command.stageId,
      notes: command.notes,
      tags: command.tags,
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error as string);
    }

    // Save lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    return Result.ok(lead);
  }
}
