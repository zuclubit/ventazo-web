import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { ScheduleFollowUpCommand } from './schedule-follow-up.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for ScheduleFollowUpCommand
 */
@injectable()
export class ScheduleFollowUpHandler implements ICommandHandler<ScheduleFollowUpCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: ScheduleFollowUpCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Schedule follow-up
    const result = lead.scheduleFollowUp(command.followUpDate, command.userId);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
