import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { ScheduleFollowUpCommand } from './schedule-follow-up.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';

/**
 * Handler for ScheduleFollowUpCommand
 */
@injectable()
export class ScheduleFollowUpHandler implements ICommandHandler<ScheduleFollowUpCommand, Lead> {
  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: ScheduleFollowUpCommand): Promise<Result<Lead>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Schedule follow-up (only takes date as argument)
    const result = lead.scheduleFollowUp(command.followUpDate);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Send SMS reminder to owner if phone is configured
    if (command.ownerPhone) {
      try {
        const messagingService = getMessagingService();
        if (messagingService.isSmsAvailable()) {
          const followUpDate = command.followUpDate.toLocaleDateString('es-MX', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          await messagingService.sendTemplate(
            command.ownerPhone,
            MessageTemplate.FOLLOW_UP_SCHEDULED,
            {
              companyName: lead.getCompanyName(),
              followUpDate,
            },
            'sms',
            { entityType: 'lead', entityId: lead.id }
          );
          console.log(`[ScheduleFollowUpHandler] Follow-up SMS sent for ${lead.id}`);
        }
      } catch (smsError) {
        console.error('[ScheduleFollowUpHandler] Failed to send follow-up SMS:', smsError);
      }
    }

    return Result.ok(lead);
  }
}
