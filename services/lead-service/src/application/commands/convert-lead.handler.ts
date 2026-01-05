import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { ICommandHandler } from '../common';
import { ConvertLeadCommand } from './convert-lead.command';
import { ILeadRepository } from '../../domain/repositories';
import { LeadStatusEnum } from '../../domain/value-objects';
import { LeadEvents } from '../../domain/events';
import { v4 as uuidv4 } from 'uuid';
import { ResendProvider } from '../../infrastructure/email/resend.provider';
import { EmailTemplate } from '../../infrastructure/email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../../infrastructure/messaging';

/**
 * Result of lead conversion
 */
export interface ConvertLeadResult {
  customerId: string;
  leadId: string;
}

/**
 * Handler for ConvertLeadCommand
 * Converts a qualified lead to a customer
 */
@injectable()
export class ConvertLeadHandler implements ICommandHandler<ConvertLeadCommand, ConvertLeadResult> {
  private emailProvider: ResendProvider | null = null;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    @inject(DatabasePool) private readonly pool: DatabasePool
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

  async execute(command: ConvertLeadCommand): Promise<Result<ConvertLeadResult>> {
    // 1. Get the lead
    const leadResult = await this.leadRepository.findById(command.leadId, command.tenantId);

    if (leadResult.isFailure) {
      return Result.fail(`Failed to find lead: ${leadResult.error}`);
    }

    const lead = leadResult.getValue();
    if (!lead) {
      return Result.fail(`Lead not found: ${command.leadId}`);
    }

    // 2. Validate lead can be converted
    const status = lead.getStatus().value;

    // Only leads in PROPOSAL can be converted directly to WON
    // (According to the simplified pipeline: NEW → CONTACTED → QUALIFIED → PROPOSAL → WON/LOST)
    const convertibleStatuses: LeadStatusEnum[] = [
      LeadStatusEnum.PROPOSAL,
    ];

    if (!convertibleStatuses.includes(status)) {
      return Result.fail(
        `Lead cannot be converted. Current status: ${status}. ` +
        `Lead must be in PROPOSAL status to convert. ` +
        `Current pipeline: NEW → CONTACTED → QUALIFIED → PROPOSAL → WON`
      );
    }

    // 3. Check if lead is already converted (has a customer record)
    const existingCustomerResult = await this.pool.query(
      'SELECT id FROM customers WHERE lead_id = $1 AND tenant_id = $2',
      [command.leadId, command.tenantId]
    );

    if (existingCustomerResult.isFailure) {
      return Result.fail(`Database error: ${existingCustomerResult.error}`);
    }

    if (existingCustomerResult.getValue().rows.length > 0) {
      return Result.fail(`Lead has already been converted to customer: ${existingCustomerResult.getValue().rows[0].id}`);
    }

    // 4. Create customer record
    const customerId = uuidv4();
    const now = new Date();

    // Build metadata with conversion details
    const metadata = {
      convertedAt: now.toISOString(),
      convertedBy: command.convertedBy,
      contractValue: command.contractValue || null,
      contractStartDate: command.contractStartDate || null,
      contractEndDate: command.contractEndDate || null,
      conversionNotes: command.notes || null,
    };

    const insertCustomerSql = `
      INSERT INTO customers (
        id, tenant_id, lead_id, name, company, email, phone,
        type, status, industry, website,
        total_revenue, lifetime_value, acquisition_date, assigned_to,
        custom_fields, tags, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20
      )
    `;

    // Use companyName for both name and company since Lead aggregate doesn't expose fullName
    const customerName = lead.getCompanyName() || 'Unknown';
    const companyName = lead.getCompanyName() || null;

    const customerValues = [
      customerId,
      command.tenantId,
      lead.id,
      customerName,              // name
      companyName,               // company
      lead.getEmail().value,     // email
      lead.getPhone(),           // phone
      'company',                 // type (default to company)
      'active',                  // status
      lead.getIndustry(),        // industry
      lead.getWebsite(),         // website
      command.contractValue || 0, // total_revenue (initial contract value)
      command.contractValue || 0, // lifetime_value (starts equal to contract value)
      now,                       // acquisition_date
      lead.getOwnerId(),         // assigned_to
      JSON.stringify(lead.getCustomFields() || {}), // custom_fields
      JSON.stringify([]),        // tags
      JSON.stringify(metadata),  // metadata
      now,                       // created_at
      now,                       // updated_at
    ];

    const insertResult = await this.pool.query(insertCustomerSql, customerValues);

    if (insertResult.isFailure) {
      return Result.fail(`Failed to create customer: ${insertResult.error}`);
    }

    // 5. Update lead status to WON (this adds the StatusChanged event internally)
    const statusChangeResult = lead.changeStatus(LeadStatusEnum.WON, command.convertedBy);
    if (statusChangeResult.isFailure) {
      // Rollback customer creation
      await this.pool.query(
        'DELETE FROM customers WHERE id = $1',
        [customerId]
      );
      return Result.fail(`Failed to update lead status: ${statusChangeResult.error}`);
    }

    // 6. Save lead with new status (events will be published via repository)
    const saveResult = await this.leadRepository.save(lead);

    if (saveResult.isFailure) {
      // Rollback customer creation
      await this.pool.query(
        'DELETE FROM customers WHERE id = $1',
        [customerId]
      );
      return Result.fail(`Failed to save lead: ${saveResult.error}`);
    }

    // 7. Send conversion notification email to owner
    if (this.emailProvider && command.ownerEmail) {
      try {
        const appConfig = getAppConfig();
        await this.emailProvider.send({
          to: command.ownerEmail,
          subject: `Lead convertido a cliente: ${lead.getCompanyName()}`,
          template: EmailTemplate.LEAD_CONVERTED,
          variables: {
            userName: command.ownerName || 'Team Member',
            companyName: lead.getCompanyName(),
            contactEmail: lead.getEmail().value,
            customerId,
            contractValue: command.contractValue || 0,
            leadId: lead.id,
            actionUrl: `${appConfig.appUrl}/customers/${customerId}`,
          },
          tags: [
            { name: 'type', value: 'lead-converted' },
            { name: 'leadId', value: lead.id },
            { name: 'customerId', value: customerId },
          ],
        });
        console.log(`[ConvertLeadHandler] Conversion notification sent for ${lead.id}`);
      } catch (emailError) {
        console.error('[ConvertLeadHandler] Failed to send conversion notification:', emailError);
      }
    }

    // Send SMS notification to owner if phone is configured
    if (command.ownerPhone) {
      try {
        const messagingService = getMessagingService();
        if (messagingService.isSmsAvailable()) {
          await messagingService.sendTemplate(
            command.ownerPhone,
            MessageTemplate.LEAD_CONVERTED,
            {
              companyName: lead.getCompanyName(),
              contractValue: String(command.contractValue || 0),
            },
            'sms',
            { entityType: 'lead', entityId: lead.id }
          );
          console.log(`[ConvertLeadHandler] Conversion SMS sent for ${lead.id}`);
        }
      } catch (smsError) {
        console.error('[ConvertLeadHandler] Failed to send conversion SMS:', smsError);
      }
    }

    return Result.ok({
      customerId,
      leadId: command.leadId,
    });
  }
}
