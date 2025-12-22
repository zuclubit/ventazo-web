import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { QualifyLeadCommand } from './qualify-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';
import { ResendProvider } from '../../infrastructure/email/resend.provider';
import { EmailTemplate } from '../../infrastructure/email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';

/**
 * Handler for QualifyLeadCommand
 */
@injectable()
export class QualifyLeadHandler implements ICommandHandler<QualifyLeadCommand, Lead> {
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

  async execute(command: QualifyLeadCommand): Promise<Result<Lead>> {
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
    const result = lead.qualify(command.qualifiedBy);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Send qualification notification email to owner
    if (this.emailProvider && command.ownerEmail) {
      try {
        const appConfig = getAppConfig();
        await this.emailProvider.send({
          to: command.ownerEmail,
          subject: `Lead calificado: ${lead.getCompanyName()}`,
          template: EmailTemplate.LEAD_QUALIFIED,
          variables: {
            userName: command.ownerName || 'Team Member',
            companyName: lead.getCompanyName(),
            leadScore: lead.getScore(),
            leadId: lead.id,
            actionUrl: `${appConfig.appUrl}/leads/${lead.id}`,
          },
          tags: [
            { name: 'type', value: 'lead-qualified' },
            { name: 'leadId', value: lead.id },
          ],
        });
        console.log(`[QualifyLeadHandler] Qualification notification sent for ${lead.id}`);
      } catch (emailError) {
        console.error('[QualifyLeadHandler] Failed to send qualification notification:', emailError);
      }
    }

    // Send SMS notification to owner if phone is configured
    if (command.ownerPhone) {
      try {
        const messagingService = getMessagingService();
        if (messagingService.isSmsAvailable()) {
          await messagingService.sendTemplate(
            command.ownerPhone,
            MessageTemplate.LEAD_QUALIFIED,
            {
              companyName: lead.getCompanyName(),
              score: String(lead.getScore()),
            },
            'sms',
            { entityType: 'lead', entityId: lead.id }
          );
          console.log(`[QualifyLeadHandler] Qualification SMS sent for ${lead.id}`);
        }
      } catch (smsError) {
        console.error('[QualifyLeadHandler] Failed to send qualification SMS:', smsError);
      }
    }

    return Result.ok(lead);
  }
}
