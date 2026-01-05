import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { ICommandHandler } from '../common';
import {
  BulkUpdateLeadsCommand,
  BulkAssignLeadsCommand,
  BulkChangeStatusCommand,
  BulkDeleteLeadsCommand,
  BulkLeadUpdateData,
} from './bulk-update-leads.command';
import { ILeadRepository } from '../../domain/repositories';

/**
 * Result for individual lead in bulk operation
 */
export interface BulkOperationResult {
  leadId: string;
  success: boolean;
  error?: string;
}

/**
 * Overall result of bulk operation
 */
export interface BulkOperationSummary {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  results: BulkOperationResult[];
}

/**
 * Handler for BulkUpdateLeadsCommand
 */
@injectable()
export class BulkUpdateLeadsHandler
  implements ICommandHandler<BulkUpdateLeadsCommand, BulkOperationSummary>
{
  private readonly MAX_BATCH_SIZE = 500;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: BulkUpdateLeadsCommand): Promise<Result<BulkOperationSummary>> {
    const { tenantId, updates, updatedBy } = command;

    if (updates.length > this.MAX_BATCH_SIZE) {
      return Result.fail(
        `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}. Received: ${updates.length}`
      );
    }

    if (updates.length === 0) {
      return Result.fail('No updates provided');
    }

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const update of updates) {
      try {
        const leadResult = await this.leadRepository.findById(update.leadId, tenantId);

        if (leadResult.isFailure || !leadResult.getValue()) {
          failureCount++;
          results.push({
            leadId: update.leadId,
            success: false,
            error: 'Lead not found',
          });
          continue;
        }

        const lead = leadResult.getValue()!;

        // Check if lead is closed
        if (lead.getStatus().isClosed()) {
          failureCount++;
          results.push({
            leadId: update.leadId,
            success: false,
            error: 'Cannot update closed lead',
          });
          continue;
        }

        // Apply updates
        const updateResult = lead.update({
          companyName: update.companyName,
          email: update.email,
          phone: update.phone,
          website: update.website,
          industry: update.industry,
          employeeCount: update.employeeCount,
          annualRevenue: update.annualRevenue,
          notes: update.notes,
        });

        if (updateResult.isFailure) {
          failureCount++;
          results.push({
            leadId: update.leadId,
            success: false,
            error: updateResult.error,
          });
          continue;
        }

        // Save the lead
        const saveResult = await this.leadRepository.save(lead);

        if (saveResult.isFailure) {
          failureCount++;
          results.push({
            leadId: update.leadId,
            success: false,
            error: saveResult.error,
          });
          continue;
        }

        successCount++;
        results.push({
          leadId: update.leadId,
          success: true,
        });
      } catch (error) {
        failureCount++;
        results.push({
          leadId: update.leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Result.ok({
      totalProcessed: updates.length,
      successCount,
      failureCount,
      results,
    });
  }
}

/**
 * Handler for BulkAssignLeadsCommand
 */
@injectable()
export class BulkAssignLeadsHandler
  implements ICommandHandler<BulkAssignLeadsCommand, BulkOperationSummary>
{
  private readonly MAX_BATCH_SIZE = 500;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: BulkAssignLeadsCommand): Promise<Result<BulkOperationSummary>> {
    const { tenantId, leadIds, newOwnerId, assignedBy } = command;

    if (leadIds.length > this.MAX_BATCH_SIZE) {
      return Result.fail(
        `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}. Received: ${leadIds.length}`
      );
    }

    if (leadIds.length === 0) {
      return Result.fail('No lead IDs provided');
    }

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const leadId of leadIds) {
      try {
        const leadResult = await this.leadRepository.findById(leadId, tenantId);

        if (leadResult.isFailure || !leadResult.getValue()) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: 'Lead not found',
          });
          continue;
        }

        const lead = leadResult.getValue()!;

        // Check if lead is closed
        if (lead.getStatus().isClosed()) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: 'Cannot assign closed lead',
          });
          continue;
        }

        // Assign the lead
        const assignResult = lead.assignTo(newOwnerId, assignedBy);

        if (assignResult.isFailure) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: assignResult.error,
          });
          continue;
        }

        // Save the lead
        const saveResult = await this.leadRepository.save(lead);

        if (saveResult.isFailure) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: saveResult.error,
          });
          continue;
        }

        successCount++;
        results.push({
          leadId,
          success: true,
        });
      } catch (error) {
        failureCount++;
        results.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Result.ok({
      totalProcessed: leadIds.length,
      successCount,
      failureCount,
      results,
    });
  }
}

/**
 * Handler for BulkChangeStatusCommand
 */
@injectable()
export class BulkChangeStatusHandler
  implements ICommandHandler<BulkChangeStatusCommand, BulkOperationSummary>
{
  private readonly MAX_BATCH_SIZE = 500;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: BulkChangeStatusCommand): Promise<Result<BulkOperationSummary>> {
    const { tenantId, leadIds, newStatus, changedBy } = command;

    if (leadIds.length > this.MAX_BATCH_SIZE) {
      return Result.fail(
        `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}. Received: ${leadIds.length}`
      );
    }

    if (leadIds.length === 0) {
      return Result.fail('No lead IDs provided');
    }

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const leadId of leadIds) {
      try {
        const leadResult = await this.leadRepository.findById(leadId, tenantId);

        if (leadResult.isFailure || !leadResult.getValue()) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: 'Lead not found',
          });
          continue;
        }

        const lead = leadResult.getValue()!;

        // Change status
        const changeResult = lead.changeStatus(newStatus, changedBy);

        if (changeResult.isFailure) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: changeResult.error,
          });
          continue;
        }

        // Save the lead
        const saveResult = await this.leadRepository.save(lead);

        if (saveResult.isFailure) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: saveResult.error,
          });
          continue;
        }

        successCount++;
        results.push({
          leadId,
          success: true,
        });
      } catch (error) {
        failureCount++;
        results.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Result.ok({
      totalProcessed: leadIds.length,
      successCount,
      failureCount,
      results,
    });
  }
}

/**
 * Handler for BulkDeleteLeadsCommand
 */
@injectable()
export class BulkDeleteLeadsHandler
  implements ICommandHandler<BulkDeleteLeadsCommand, BulkOperationSummary>
{
  private readonly MAX_BATCH_SIZE = 500;

  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  async execute(command: BulkDeleteLeadsCommand): Promise<Result<BulkOperationSummary>> {
    const { tenantId, leadIds, deletedBy, hardDelete } = command;

    if (leadIds.length > this.MAX_BATCH_SIZE) {
      return Result.fail(
        `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}. Received: ${leadIds.length}`
      );
    }

    if (leadIds.length === 0) {
      return Result.fail('No lead IDs provided');
    }

    const results: BulkOperationResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const leadId of leadIds) {
      try {
        // Verify lead exists
        const existsResult = await this.leadRepository.exists(leadId, tenantId);

        if (existsResult.isFailure || !existsResult.getValue()) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: 'Lead not found',
          });
          continue;
        }

        // Delete the lead
        const deleteResult = await this.leadRepository.delete(leadId, tenantId);

        if (deleteResult.isFailure) {
          failureCount++;
          results.push({
            leadId,
            success: false,
            error: deleteResult.error,
          });
          continue;
        }

        successCount++;
        results.push({
          leadId,
          success: true,
        });
      } catch (error) {
        failureCount++;
        results.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return Result.ok({
      totalProcessed: leadIds.length,
      successCount,
      failureCount,
      results,
    });
  }
}
