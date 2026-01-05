import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { UpdateLeadScoreCommand } from './update-lead-score.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

/**
 * Handler for UpdateLeadScoreCommand
 */
@injectable()
export class UpdateLeadScoreHandler implements ICommandHandler<UpdateLeadScoreCommand, Lead> {
  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: UpdateLeadScoreCommand): Promise<Result<Lead>> {
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
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    return Result.ok(lead);
  }
}
