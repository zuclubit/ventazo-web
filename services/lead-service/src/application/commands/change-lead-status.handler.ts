import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { ChangeLeadStatusCommand } from './change-lead-status.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for ChangeLeadStatusCommand
 */
@injectable()
export class ChangeLeadStatusHandler implements ICommandHandler<ChangeLeadStatusCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: ChangeLeadStatusCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Change status
    const result = lead.changeStatus(command.newStatus, command.userId);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
