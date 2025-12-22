import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { CreateLeadCommand } from './create-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';
import { ResendProvider } from '../../infrastructure/email/resend.provider';
import { getResendConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';

/**
 * Result DTO for CreateLeadCommand
 */
export interface CreateLeadResult {
  leadId: string;
}

/**
 * Handler for CreateLeadCommand
 * Implements business logic for creating a new lead
 */
@injectable()
export class CreateLeadHandler implements ICommandHandler<CreateLeadCommand, CreateLeadResult> {
  private emailProvider: ResendProvider | null = null;

  constructor(@inject('ILeadRepository') private readonly leadRepository: ILeadRepository) {
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

  async execute(command: CreateLeadCommand): Promise<Result<CreateLeadResult>> {
    // Create lead aggregate
    const leadResult = Lead.create({
      tenantId: command.tenantId,
      fullName: command.fullName,
      companyName: command.companyName,
      jobTitle: command.jobTitle,
      email: command.email,
      source: command.source,
      phone: command.phone,
      website: command.website,
      industry: command.industry,
      employeeCount: command.employeeCount,
      annualRevenue: command.annualRevenue,
      stageId: command.stageId,
      ownerId: command.ownerId,
      notes: command.notes,
      tags: command.tags,
      customFields: command.customFields,
    });

    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();

    // Persist lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Send notification email to lead owner if configured
    if (this.emailProvider && command.ownerEmail) {
      try {
        await this.emailProvider.sendLeadNotification(command.ownerEmail, {
          userName: command.ownerName || 'Team Member',
          companyName: command.companyName || command.fullName,
          contactName: command.fullName,
          contactEmail: command.email,
          leadSource: command.source,
          leadScore: 0, // New leads start at 0
          leadId: lead.id,
        });
        console.log(`[CreateLeadHandler] Lead notification email sent for ${lead.id}`);
      } catch (emailError) {
        // Don't fail lead creation if email fails
        console.error('[CreateLeadHandler] Failed to send lead notification email:', emailError);
      }
    }

    return Result.ok({
      leadId: lead.id,
    });
  }
}
