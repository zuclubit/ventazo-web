import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { QualifyLeadCommand } from './qualify-lead.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Handler for QualifyLeadCommand
 */
@injectable()
export class QualifyLeadHandler implements ICommandHandler<QualifyLeadCommand, void> {
  constructor(private readonly leadRepository: ILeadRepository) {}

  async execute(command: QualifyLeadCommand): Promise<Result<void>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Qualify lead
    const result = lead.qualify(command.userId);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    return this.leadRepository.save(lead);
  }
}
