import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { ChangeLeadStatusCommand } from './change-lead-status.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';
import { getAppConfig } from '../../config/environment';

/**
 * Handler for ChangeLeadStatusCommand
 * Includes multi-channel notifications (Email, SMS, WhatsApp) on status changes
 */
@injectable()
export class ChangeLeadStatusHandler implements ICommandHandler<ChangeLeadStatusCommand, Lead> {
  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: ChangeLeadStatusCommand): Promise<Result<Lead>> {
    // Find lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);
    if (leadResult.isFailure) {
      return Result.fail(leadResult.error as string);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // Get previous status before changing
    const previousStatus = lead.getStatus();

    // Change status
    const result = lead.changeStatus(command.newStatus, command.changedBy);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    // Save lead
    const saveResult = await this.leadRepository.save(lead);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error as string);
    }

    // Send multi-channel notifications based on status transition
    await this.sendStatusChangeNotifications(
      lead,
      previousStatus,
      command.newStatus,
      command.changedBy,
      command.ownerPhone
    );

    return Result.ok(lead);
  }

  /**
   * Send notifications for lead status changes
   * Routes to appropriate channels based on the type of transition
   */
  private async sendStatusChangeNotifications(
    lead: Lead,
    previousStatus: string,
    newStatus: string,
    changedBy: string,
    ownerPhone?: string
  ): Promise<void> {
    try {
      // Skip notifications for minor status changes
      const significantChanges = ['qualified', 'converted', 'customer', 'lost', 'proposal', 'won'];
      if (!significantChanges.includes(newStatus)) {
        return;
      }

      // Send SMS/WhatsApp notification if phone provided
      if (ownerPhone) {
        const messagingService = getMessagingService();
        const appConfig = getAppConfig();

        // Determine template based on new status
        let template = MessageTemplate.LEAD_STATUS_CHANGED;
        if (newStatus === 'qualified') {
          template = MessageTemplate.LEAD_QUALIFIED;
        } else if (newStatus === 'converted' || newStatus === 'customer') {
          template = MessageTemplate.LEAD_CONVERTED;
        }

        // Send via WhatsApp if available, otherwise SMS
        const channel = messagingService.isWhatsAppAvailable() ? 'whatsapp' : 'sms';

        if ((channel === 'whatsapp' && messagingService.isWhatsAppAvailable()) ||
            (channel === 'sms' && messagingService.isSmsAvailable())) {
          await messagingService.sendTemplate(
            ownerPhone,
            template,
            {
              leadId: lead.id.toString(),
              previousStatus,
              newStatus,
              changedBy,
              actionUrl: `${appConfig.appUrl}/leads/${lead.id}`,
            },
            channel,
            { entityType: 'lead', entityId: lead.id.toString() }
          );
          console.log(`[ChangeLeadStatusHandler] Status change ${channel} notification sent to ${ownerPhone}`);
        }
      }

      // Log significant status changes
      if (newStatus === 'qualified') {
        console.log(`[ChangeLeadStatusHandler] Lead ${lead.id} qualified`);
      } else if (newStatus === 'converted') {
        console.log(`[ChangeLeadStatusHandler] Lead ${lead.id} converted to customer`);
      } else if (newStatus === 'lost') {
        console.log(`[ChangeLeadStatusHandler] Lead ${lead.id} marked as lost`);
      }

    } catch (error) {
      // Log error but don't fail the main operation
      console.error('[ChangeLeadStatusHandler] Failed to send status change notifications:', error);
    }
  }
}
