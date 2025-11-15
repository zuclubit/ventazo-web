import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { AssignLeadCommand } from './assign-lead.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for AssignLeadCommand
 */
@injectable()
export class AssignLeadHandler implements ICommandHandler<AssignLeadCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: AssignLeadCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Assign lead
    const result = lead.assignTo(command.ownerId, command.assignedBy);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
