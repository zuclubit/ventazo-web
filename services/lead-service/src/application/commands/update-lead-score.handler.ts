import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { UpdateLeadScoreCommand } from './update-lead-score.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for UpdateLeadScoreCommand
 */
@injectable()
export class UpdateLeadScoreHandler implements ICommandHandler<UpdateLeadScoreCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: UpdateLeadScoreCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Update score
    const result = lead.updateScore(command.newScore, command.reason);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
