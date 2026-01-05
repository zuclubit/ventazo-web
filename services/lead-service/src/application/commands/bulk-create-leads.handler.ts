import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import { BulkCreateLeadsCommand, BulkLeadData } from './bulk-create-leads.command';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

/**
 * Result for individual lead in bulk operation
 */
export interface BulkLeadResult {
  index: number;
  success: boolean;
  leadId?: string;
  error?: string;
  isDuplicate?: boolean;
}

/**
 * Overall result of bulk create operation
 */
export interface BulkCreateLeadsResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
  results: BulkLeadResult[];
}

/**
 * Handler for BulkCreateLeadsCommand
 * Creates multiple leads efficiently with duplicate detection
 */
@injectable()
export class BulkCreateLeadsHandler
  implements ICommandHandler<BulkCreateLeadsCommand, BulkCreateLeadsResult>
{
  private readonly MAX_BATCH_SIZE = 1000;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: BulkCreateLeadsCommand): Promise<Result<BulkCreateLeadsResult>> {
    const { tenantId, leads, createdBy, options } = command;

    // Validate batch size
    if (leads.length > this.MAX_BATCH_SIZE) {
      return Result.fail(
        `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}. ` +
        `Received: ${leads.length}`
      );
    }

    if (leads.length === 0) {
      return Result.fail('No leads provided for bulk creation');
    }

    const results: BulkLeadResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    let duplicateCount = 0;

    // Build duplicate check set if enabled
    const existingEmails = new Set<string>();
    const existingCompanies = new Set<string>();
    const existingPhones = new Set<string>();

    if (options?.skipDuplicates) {
      const checkFields = options.duplicateCheckFields || ['email'];

      // Get existing leads for duplicate check
      const existingResult = await this.leadRepository.findAll({
        tenantId,
        page: 1,
        limit: 10000, // Get all for duplicate check
      });

      if (existingResult.isSuccess && existingResult.getValue()) {
        const existing = existingResult.getValue()!;
        for (const lead of existing.items) {
          if (checkFields.includes('email')) {
            existingEmails.add(lead.getEmail().value.toLowerCase());
          }
          if (checkFields.includes('companyName')) {
            existingCompanies.add(lead.getCompanyName().toLowerCase());
          }
          if (checkFields.includes('phone') && lead.getPhone()) {
            existingPhones.add(this.normalizePhone(lead.getPhone()!));
          }
        }
      }
    }

    // Track duplicates within the batch itself
    const batchEmails = new Set<string>();
    const batchCompanies = new Set<string>();
    const batchPhones = new Set<string>();

    // Process each lead
    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];

      try {
        // Check for duplicates if enabled
        if (options?.skipDuplicates) {
          const checkFields = options.duplicateCheckFields || ['email'];
          let isDuplicate = false;

          if (checkFields.includes('email')) {
            const normalizedEmail = leadData.email.toLowerCase();
            if (existingEmails.has(normalizedEmail) || batchEmails.has(normalizedEmail)) {
              isDuplicate = true;
            }
            batchEmails.add(normalizedEmail);
          }

          if (checkFields.includes('companyName')) {
            const normalizedCompany = leadData.companyName.toLowerCase();
            if (existingCompanies.has(normalizedCompany) || batchCompanies.has(normalizedCompany)) {
              isDuplicate = true;
            }
            batchCompanies.add(normalizedCompany);
          }

          if (checkFields.includes('phone') && leadData.phone) {
            const normalizedPhone = this.normalizePhone(leadData.phone);
            if (existingPhones.has(normalizedPhone) || batchPhones.has(normalizedPhone)) {
              isDuplicate = true;
            }
            batchPhones.add(normalizedPhone);
          }

          if (isDuplicate) {
            duplicateCount++;
            results.push({
              index: i,
              success: false,
              isDuplicate: true,
              error: 'Duplicate lead detected',
            });
            continue;
          }
        }

        // Validate only mode - don't actually create
        if (options?.validateOnly) {
          const validationResult = this.validateLeadData(leadData);
          if (validationResult.isFailure) {
            failureCount++;
            results.push({
              index: i,
              success: false,
              error: validationResult.error,
            });
          } else {
            successCount++;
            results.push({
              index: i,
              success: true,
            });
          }
          continue;
        }

        // Create the lead
        const leadResult = Lead.create({
          tenantId,
          companyName: leadData.companyName,
          email: leadData.email,
          source: leadData.source,
          phone: leadData.phone,
          website: leadData.website,
          industry: leadData.industry,
          employeeCount: leadData.employeeCount,
          annualRevenue: leadData.annualRevenue,
          notes: leadData.notes,
          customFields: leadData.customFields,
          ownerId: leadData.ownerId,
        });

        if (leadResult.isFailure) {
          failureCount++;
          results.push({
            index: i,
            success: false,
            error: leadResult.error,
          });
          continue;
        }

        const lead = leadResult.getValue();

        // Save the lead
        const saveResult = await this.leadRepository.save(lead);

        if (saveResult.isFailure) {
          failureCount++;
          results.push({
            index: i,
            success: false,
            error: saveResult.error,
          });
          continue;
        }

        successCount++;
        results.push({
          index: i,
          success: true,
          leadId: lead.id,
        });

        // Update duplicate check sets for subsequent items
        if (options?.skipDuplicates) {
          existingEmails.add(leadData.email.toLowerCase());
          existingCompanies.add(leadData.companyName.toLowerCase());
          if (leadData.phone) {
            existingPhones.add(this.normalizePhone(leadData.phone));
          }
        }
      } catch (error) {
        failureCount++;
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Result.ok({
      totalProcessed: leads.length,
      successCount,
      failureCount,
      duplicateCount,
      results,
    });
  }

  /**
   * Validate lead data without creating
   */
  private validateLeadData(data: BulkLeadData): Result<void> {
    if (!data.companyName || data.companyName.trim().length === 0) {
      return Result.fail('Company name is required');
    }

    if (data.companyName.length > 255) {
      return Result.fail('Company name is too long (max 255 characters)');
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      return Result.fail('Valid email is required');
    }

    if (!data.source || data.source.trim().length === 0) {
      return Result.fail('Lead source is required');
    }

    if (data.website && !this.isValidUrl(data.website)) {
      return Result.fail('Invalid website URL');
    }

    if (data.phone && !this.isValidPhone(data.phone)) {
      return Result.fail('Invalid phone number format');
    }

    return Result.ok();
  }

  /**
   * Normalize phone number for comparison
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\+\.]/g, '');
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Basic phone validation (allows international formats)
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  }
}
