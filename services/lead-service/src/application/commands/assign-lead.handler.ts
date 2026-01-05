import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { AssignLeadCommand } from './assign-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';
import { ResendProvider } from '../../infrastructure/email/resend.provider';
import { EmailTemplate } from '../../infrastructure/email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';

/**
 * Handler for AssignLeadCommand
 * Assigns a lead to a specific user/owner
 */
@injectable()
export class AssignLeadHandler implements ICommandHandler<AssignLeadCommand, Lead> {
  private emailProvider: ResendProvider | null = null;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {
    this.initEmailProvider();
  }

  private async initEmailProvider(): Promise<void> {
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    }
  }

  async execute(command: AssignLeadCommand): Promise<Result<Lead>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Assign lead to owner
    const result = lead.assignTo(command.ownerId, command.assignedBy);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Send assignment notification email
    if (this.emailProvider && command.assigneeEmail) {
      try {
        const appConfig = getAppConfig();
        await this.emailProvider.send({
          to: command.assigneeEmail,
          subject: `Nuevo lead asignado: ${lead.getCompanyName()}`,
          template: EmailTemplate.LEAD_ASSIGNED,
          variables: {
            userName: command.assigneeName || 'Team Member',
            companyName: lead.getCompanyName(),
            contactName: lead.getContactName() || 'Sin nombre',
            contactEmail: lead.getEmail().value,
            leadScore: lead.getScore(),
            leadStatus: lead.getStatus().value,
            leadId: lead.id,
            actionUrl: `${appConfig.appUrl}/leads/${lead.id}`,
          },
          tags: [
            { name: 'type', value: 'lead-assigned' },
            { name: 'leadId', value: lead.id },
          ],
        });
        console.log(`[AssignLeadHandler] Assignment notification sent for ${lead.id}`);
      } catch (emailError) {
        console.error('[AssignLeadHandler] Failed to send assignment notification:', emailError);
      }
    }

    // Send SMS notification to assignee if phone is configured
    if (command.assigneePhone) {
      try {
        const messagingService = getMessagingService();
        if (messagingService.isSmsAvailable()) {
          await messagingService.sendTemplate(
            command.assigneePhone,
            MessageTemplate.LEAD_ASSIGNED,
            {
              companyName: lead.getCompanyName(),
              contactName: lead.getContactName() || 'N/A',
            },
            'sms',
            { entityType: 'lead', entityId: lead.id }
          );
          console.log(`[AssignLeadHandler] Assignment SMS sent for ${lead.id}`);
        }
      } catch (smsError) {
        console.error('[AssignLeadHandler] Failed to send assignment SMS:', smsError);
      }
    }

    return Result.ok(lead);
  }
}
