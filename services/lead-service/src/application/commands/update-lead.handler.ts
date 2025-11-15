import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { UpdateLeadCommand } from './update-lead.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for UpdateLeadCommand
 */
@injectable()
export class UpdateLeadHandler implements ICommandHandler<UpdateLeadCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: UpdateLeadCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Update lead
    const updateData: Record<string, unknown> = {};
    if (command.companyName !== undefined) updateData.companyName = command.companyName;
    if (command.email !== undefined) updateData.email = command.email;
    if (command.phone !== undefined) updateData.phone = command.phone;
    if (command.website !== undefined) updateData.website = command.website;
    if (command.industry !== undefined) updateData.industry = command.industry;
    if (command.employeeCount !== undefined) updateData.employeeCount = command.employeeCount;
    if (command.annualRevenue !== undefined) updateData.annualRevenue = command.annualRevenue;
    if (command.notes !== undefined) updateData.notes = command.notes;
    if (command.customFields !== undefined) updateData.customFields = command.customFields;

    const result = lead.updateInfo(updateData);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
