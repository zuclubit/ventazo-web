/**
 * Lead Processor
 * Handles async lead-related job processing
 */

import { Job } from 'bullmq';
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  JobType,
  JobResult,
  LeadCreatedJobData,
  LeadUpdatedJobData,
  LeadStatusChangedJobData,
  LeadConvertedJobData,
  LeadAssignedJobData,
  LeadScoreUpdatedJobData,
} from '../types';
import { ILeadRepository } from '../../../domain/repositories';
import { NotificationService, createLeadNotification } from '../../notifications';
import { NotificationType } from '../../notifications/types';
import { ActivityLogService, ActionType, EntityType } from '../../services/activity-log.service';

@injectable()
export class LeadProcessor {
  constructor(
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository,
    @inject('NotificationService') private readonly notificationService: NotificationService,
    @inject('ActivityLogService') private readonly activityLogService: ActivityLogService
  ) {}

  /**
   * Process lead created event
   */
  async processLeadCreated(job: Job<LeadCreatedJobData>): Promise<JobResult> {
    const { leadId, tenantId, companyName, email, source, createdBy } = job.data;

    try {
      // Log activity
      await this.activityLogService.log({
        tenantId,
        userId: createdBy,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'created' as ActionType,
        changes: {
          companyName: { before: null, after: companyName },
          email: { before: null, after: email },
          source: { before: null, after: source },
        },
        metadata: {
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      // Get lead details for notifications
      const leadResult = await this.leadRepository.findById(leadId, tenantId);
      if (leadResult.isFailure || !leadResult.getValue()) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.getValue()!;

      // If lead has an owner, notify them
      if (lead.getOwnerId()) {
        // In real implementation, fetch owner details from user service
        const notification = createLeadNotification(
          NotificationType.LEAD_CREATED,
          tenantId,
          lead.getOwnerId()!,
          {
            leadId,
            companyName,
          }
        );
        await this.notificationService.send(notification);
      }

      return {
        success: true,
        data: {
          leadId,
          actionsPerformed: ['activity_logged', 'notifications_sent'],
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process lead updated event
   */
  async processLeadUpdated(job: Job<LeadUpdatedJobData>): Promise<JobResult> {
    const { leadId, tenantId, changes, updatedBy } = job.data;

    try {
      // Log activity with changes
      await this.activityLogService.log({
        tenantId,
        userId: updatedBy,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'updated' as ActionType,
        changes,
        metadata: {
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      return {
        success: true,
        data: {
          leadId,
          changesRecorded: Object.keys(changes).length,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process lead status changed event
   */
  async processLeadStatusChanged(
    job: Job<LeadStatusChangedJobData>
  ): Promise<JobResult> {
    const { leadId, tenantId, previousStatus, newStatus, reason, changedBy } =
      job.data;

    try {
      // Log activity
      await this.activityLogService.log({
        tenantId,
        userId: changedBy,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'status_changed' as ActionType,
        changes: {
          status: { before: previousStatus, after: newStatus },
        },
        metadata: {
          reason,
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      // Get lead for notifications
      const leadResult = await this.leadRepository.findById(leadId, tenantId);
      if (leadResult.isSuccess && leadResult.getValue()?.getOwnerId()) {
        const lead = leadResult.getValue()!;

        const notification = createLeadNotification(
          NotificationType.LEAD_STATUS_CHANGED,
          tenantId,
          lead.getOwnerId()!,
          {
            leadId,
            companyName: lead.getCompanyName(),
            oldStatus: previousStatus,
            newStatus,
          }
        );
        await this.notificationService.send(notification);
      }

      // Handle special status transitions
      if (newStatus === 'qualified') {
        // Could trigger additional workflows here
        console.log(`[LeadProcessor] Lead ${leadId} qualified - trigger workflows`);
      } else if (newStatus === 'won' || newStatus === 'lost') {
        // Lead closed - update metrics, trigger reports
        console.log(`[LeadProcessor] Lead ${leadId} closed as ${newStatus}`);
      }

      return {
        success: true,
        data: {
          leadId,
          transition: `${previousStatus} -> ${newStatus}`,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process lead converted event
   */
  async processLeadConverted(job: Job<LeadConvertedJobData>): Promise<JobResult> {
    const { leadId, tenantId, customerId, convertedBy, conversionData } = job.data;

    try {
      // Log activity
      await this.activityLogService.log({
        tenantId,
        userId: convertedBy,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'converted' as ActionType,
        changes: {
          customerId: { before: null, after: customerId },
          status: { before: 'qualified', after: 'won' },
        },
        metadata: {
          conversionData,
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      // Get lead for notifications
      const leadResult = await this.leadRepository.findById(leadId, tenantId);
      if (leadResult.isSuccess && leadResult.getValue()?.getOwnerId()) {
        const lead = leadResult.getValue()!;

        const notification = createLeadNotification(
          NotificationType.LEAD_CONVERTED,
          tenantId,
          lead.getOwnerId()!,
          {
            leadId,
            companyName: lead.getCompanyName(),
          }
        );
        await this.notificationService.send(notification);
      }

      return {
        success: true,
        data: {
          leadId,
          customerId,
          message: 'Lead successfully converted',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process lead assigned event
   */
  async processLeadAssigned(job: Job<LeadAssignedJobData>): Promise<JobResult> {
    const { leadId, tenantId, previousOwnerId, newOwnerId, assignedBy } = job.data;

    try {
      // Log activity
      await this.activityLogService.log({
        tenantId,
        userId: assignedBy,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'assigned' as ActionType,
        changes: {
          ownerId: { before: previousOwnerId, after: newOwnerId },
        },
        metadata: {
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      // Get lead details
      const leadResult = await this.leadRepository.findById(leadId, tenantId);
      if (leadResult.isFailure || !leadResult.getValue()) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.getValue()!;

      // Notify new owner
      const notification = createLeadNotification(
        NotificationType.LEAD_ASSIGNED,
        tenantId,
        newOwnerId,
        {
          leadId,
          companyName: lead.getCompanyName(),
        }
      );
      await this.notificationService.send(notification);

      return {
        success: true,
        data: {
          leadId,
          assignedTo: newOwnerId,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Process lead score updated event
   */
  async processLeadScoreUpdated(
    job: Job<LeadScoreUpdatedJobData>
  ): Promise<JobResult> {
    const { leadId, tenantId, previousScore, newScore, reason, triggeredBy } =
      job.data;

    try {
      // Log activity
      await this.activityLogService.log({
        tenantId,
        entityType: 'lead' as EntityType,
        entityId: leadId,
        action: 'score_changed' as ActionType,
        changes: {
          score: { before: previousScore, after: newScore },
        },
        metadata: {
          reason,
          triggeredBy,
          correlationId: job.data.correlationId,
          jobId: job.id,
        },
      });

      // Get lead for notifications
      const leadResult = await this.leadRepository.findById(leadId, tenantId);
      if (leadResult.isFailure || !leadResult.getValue()) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.getValue()!;

      // Notify if score crossed important thresholds
      const crossedThreshold = this.checkScoreThreshold(previousScore, newScore);

      if (crossedThreshold && lead.getOwnerId()) {
        const notificationType =
          newScore > previousScore
            ? NotificationType.LEAD_SCORE_INCREASED
            : NotificationType.LEAD_SCORE_DECREASED;

        const notification = createLeadNotification(
          notificationType,
          tenantId,
          lead.getOwnerId()!,
          {
            leadId,
            companyName: lead.getCompanyName(),
            score: newScore,
          }
        );
        await this.notificationService.send(notification);
      }

      return {
        success: true,
        data: {
          leadId,
          previousScore,
          newScore,
          crossedThreshold,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    }
  }

  /**
   * Check if score crossed important thresholds (cold/warm/hot)
   */
  private checkScoreThreshold(previousScore: number, newScore: number): boolean {
    const thresholds = [50, 75]; // warm at 50, hot at 75

    for (const threshold of thresholds) {
      if (
        (previousScore < threshold && newScore >= threshold) ||
        (previousScore >= threshold && newScore < threshold)
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all job handlers for registration
   */
  getHandlers(): Map<JobType, (job: Job<unknown>) => Promise<JobResult>> {
    const handlers = new Map<JobType, (job: Job<unknown>) => Promise<JobResult>>();

    handlers.set(JobType.LEAD_CREATED, (job) => this.processLeadCreated(job as Job<LeadCreatedJobData>));
    handlers.set(JobType.LEAD_UPDATED, (job) => this.processLeadUpdated(job as Job<LeadUpdatedJobData>));
    handlers.set(JobType.LEAD_STATUS_CHANGED, (job) => this.processLeadStatusChanged(job as Job<LeadStatusChangedJobData>));
    handlers.set(JobType.LEAD_CONVERTED, (job) => this.processLeadConverted(job as Job<LeadConvertedJobData>));
    handlers.set(JobType.LEAD_ASSIGNED, (job) => this.processLeadAssigned(job as Job<LeadAssignedJobData>));
    handlers.set(JobType.LEAD_SCORE_UPDATED, (job) => this.processLeadScoreUpdated(job as Job<LeadScoreUpdatedJobData>));

    return handlers;
  }
}
