/**
 * Activity Tracking Service
 *
 * Comprehensive tracking for all customer interactions
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc, asc, sql, gte, lte, inArray, or, like } from 'drizzle-orm';
import {
  activities,
  activityReminders,
  activityTemplates,
  activityAnalytics,
  webTrackingSessions,
  webPageViews,
  webEvents,
} from '../database/schema';
import {
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  ActivitySearchFilters,
  ActivitySearchResult,
  ActivityTimeline,
  ActivitySummary,
  ActivityAnalytics,
  UserActivityStats,
  TeamActivityDashboard,
  ActivityReminder,
  ActivityTemplate,
  BulkActivityOperation,
  BulkActivityResult,
  ActivityFeedItem,
  TrackedEntityType,
  ActivityType,
  ActivityStatus,
} from './types';

@injectable()
export class ActivityTrackingService {
  private db: any;

  constructor(@inject('Database') db: any) {
    this.db = db;
  }

  // ============================================================================
  // Activity CRUD Operations
  // ============================================================================

  /**
   * Create a new activity
   */
  async createActivity(
    tenantId: string,
    input: CreateActivityInput,
    userId: string
  ): Promise<Result<Activity>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const [row] = await this.db
        .insert(activities)
        .values({
          id,
          tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          entityName: input.entityName,
          type: input.type,
          subtype: input.subtype,
          subject: input.subject,
          description: input.description,
          direction: input.direction,
          status: input.status || 'completed',
          priority: input.priority,
          startTime: input.startTime,
          endTime: input.endTime,
          durationMinutes: input.durationMinutes,
          scheduledAt: input.scheduledAt,
          ownerId: userId,
          assignedToId: input.assignedToId,
          relatedLeadId: input.relatedLeadId,
          relatedContactId: input.relatedContactId,
          relatedDealId: input.relatedDealId,
          relatedCampaignId: input.relatedCampaignId,
          relatedSequenceId: input.relatedSequenceId,
          relatedTaskId: input.relatedTaskId,
          callDetails: input.callDetails,
          emailDetails: input.emailDetails,
          meetingDetails: input.meetingDetails,
          smsDetails: input.smsDetails,
          chatDetails: input.chatDetails,
          webTrackingDetails: input.webTrackingDetails,
          formSubmission: input.formSubmission,
          customFields: input.customFields || {},
          metadata: input.metadata || {},
          tags: input.tags || [],
          engagementScore: input.engagementScore || this.calculateEngagementScore(input),
          location: input.location,
          source: input.source,
          sourceSystem: input.sourceSystem,
          externalId: input.externalId,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        })
        .returning();

      return Result.ok(this.mapRowToActivity(row));
    } catch (error) {
      return Result.fail(`Failed to create activity: ${error}`);
    }
  }

  /**
   * Get activity by ID
   */
  async getActivity(tenantId: string, activityId: string): Promise<Result<Activity>> {
    try {
      const [row] = await this.db
        .select()
        .from(activities)
        .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));

      if (!row) {
        return Result.fail('Activity not found');
      }

      return Result.ok(this.mapRowToActivity(row));
    } catch (error) {
      return Result.fail(`Failed to get activity: ${error}`);
    }
  }

  /**
   * Update activity
   */
  async updateActivity(
    tenantId: string,
    activityId: string,
    input: UpdateActivityInput,
    userId: string
  ): Promise<Result<Activity>> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedBy: userId,
      };

      if (input.subject !== undefined) updateData.subject = input.subject;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.startTime !== undefined) updateData.startTime = input.startTime;
      if (input.endTime !== undefined) updateData.endTime = input.endTime;
      if (input.durationMinutes !== undefined) updateData.durationMinutes = input.durationMinutes;
      if (input.completedAt !== undefined) updateData.completedAt = input.completedAt;
      if (input.assignedToId !== undefined) updateData.assignedToId = input.assignedToId;
      if (input.callDetails !== undefined) updateData.callDetails = input.callDetails;
      if (input.emailDetails !== undefined) updateData.emailDetails = input.emailDetails;
      if (input.meetingDetails !== undefined) updateData.meetingDetails = input.meetingDetails;
      if (input.smsDetails !== undefined) updateData.smsDetails = input.smsDetails;
      if (input.chatDetails !== undefined) updateData.chatDetails = input.chatDetails;
      if (input.customFields !== undefined) updateData.customFields = input.customFields;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.engagementScore !== undefined) updateData.engagementScore = input.engagementScore;

      const [row] = await this.db
        .update(activities)
        .set(updateData)
        .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)))
        .returning();

      if (!row) {
        return Result.fail('Activity not found');
      }

      return Result.ok(this.mapRowToActivity(row));
    } catch (error) {
      return Result.fail(`Failed to update activity: ${error}`);
    }
  }

  /**
   * Delete activity
   */
  async deleteActivity(tenantId: string, activityId: string): Promise<Result<void>> {
    try {
      const result = await this.db
        .delete(activities)
        .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));

      if (result.rowCount === 0) {
        return Result.fail('Activity not found');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete activity: ${error}`);
    }
  }

  /**
   * Search activities with filters
   */
  async searchActivities(
    tenantId: string,
    filters: ActivitySearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<ActivitySearchResult>> {
    try {
      const conditions = [eq(activities.tenantId, tenantId)];

      if (filters.entityType) {
        conditions.push(eq(activities.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(activities.entityId, filters.entityId));
      }
      if (filters.entityIds && filters.entityIds.length > 0) {
        conditions.push(inArray(activities.entityId, filters.entityIds));
      }
      if (filters.types && filters.types.length > 0) {
        conditions.push(inArray(activities.type, filters.types));
      }
      if (filters.status && filters.status.length > 0) {
        conditions.push(inArray(activities.status, filters.status));
      }
      if (filters.direction && filters.direction.length > 0) {
        conditions.push(inArray(activities.direction, filters.direction));
      }
      if (filters.priority && filters.priority.length > 0) {
        conditions.push(inArray(activities.priority, filters.priority));
      }
      if (filters.ownerId) {
        conditions.push(eq(activities.ownerId, filters.ownerId));
      }
      if (filters.ownerIds && filters.ownerIds.length > 0) {
        conditions.push(inArray(activities.ownerId, filters.ownerIds));
      }
      if (filters.assignedToId) {
        conditions.push(eq(activities.assignedToId, filters.assignedToId));
      }
      if (filters.dateFrom) {
        conditions.push(gte(activities.createdAt, filters.dateFrom));
      }
      if (filters.dateTo) {
        conditions.push(lte(activities.createdAt, filters.dateTo));
      }
      if (filters.scheduledFrom) {
        conditions.push(gte(activities.scheduledAt, filters.scheduledFrom));
      }
      if (filters.scheduledTo) {
        conditions.push(lte(activities.scheduledAt, filters.scheduledTo));
      }
      if (filters.search) {
        conditions.push(
          or(
            like(activities.subject, `%${filters.search}%`),
            like(activities.description, `%${filters.search}%`)
          )!
        );
      }
      if (filters.relatedLeadId) {
        conditions.push(eq(activities.relatedLeadId, filters.relatedLeadId));
      }
      if (filters.relatedContactId) {
        conditions.push(eq(activities.relatedContactId, filters.relatedContactId));
      }
      if (filters.relatedDealId) {
        conditions.push(eq(activities.relatedDealId, filters.relatedDealId));
      }
      if (filters.relatedCampaignId) {
        conditions.push(eq(activities.relatedCampaignId, filters.relatedCampaignId));
      }
      if (filters.source) {
        conditions.push(eq(activities.source, filters.source));
      }
      if (filters.minEngagementScore !== undefined) {
        conditions.push(gte(activities.engagementScore, filters.minEngagementScore));
      }

      const whereClause = and(...conditions);
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(whereClause);
      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const rows = await this.db
        .select()
        .from(activities)
        .where(whereClause)
        .orderBy(desc(activities.createdAt))
        .limit(limit)
        .offset(offset);

      // Get aggregations
      const typeAggResult = await this.db
        .select({
          type: activities.type,
          count: sql<number>`count(*)`,
        })
        .from(activities)
        .where(whereClause)
        .groupBy(activities.type);

      const statusAggResult = await this.db
        .select({
          status: activities.status,
          count: sql<number>`count(*)`,
        })
        .from(activities)
        .where(whereClause)
        .groupBy(activities.status);

      const ownerAggResult = await this.db
        .select({
          ownerId: activities.ownerId,
          ownerName: activities.ownerName,
          count: sql<number>`count(*)`,
        })
        .from(activities)
        .where(whereClause)
        .groupBy(activities.ownerId, activities.ownerName)
        .limit(10);

      return Result.ok({
        activities: rows.map((row: any) => this.mapRowToActivity(row)),
        total,
        page,
        limit,
        hasMore: offset + rows.length < total,
        aggregations: {
          byType: typeAggResult.map((r: any) => ({ type: r.type as ActivityType, count: Number(r.count) })),
          byStatus: statusAggResult.map((r: any) => ({ status: r.status as ActivityStatus, count: Number(r.count) })),
          byOwner: ownerAggResult.map((r: any) => ({
            ownerId: r.ownerId,
            ownerName: r.ownerName || 'Unknown',
            count: Number(r.count),
          })),
        },
      });
    } catch (error) {
      return Result.fail(`Failed to search activities: ${error}`);
    }
  }

  /**
   * Get activity timeline for an entity
   */
  async getEntityTimeline(
    tenantId: string,
    entityType: TrackedEntityType,
    entityId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<Result<ActivityTimeline>> {
    try {
      const conditions = [
        eq(activities.tenantId, tenantId),
        eq(activities.entityType, entityType),
        eq(activities.entityId, entityId),
      ];

      if (cursor) {
        conditions.push(lte(activities.createdAt, new Date(cursor)));
      }

      const rows = await this.db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(desc(activities.createdAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      // Get total count
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(activities)
        .where(
          and(
            eq(activities.tenantId, tenantId),
            eq(activities.entityType, entityType),
            eq(activities.entityId, entityId)
          )
        );

      return Result.ok({
        entityType,
        entityId,
        activities: items.map((row: any) => this.mapRowToActivity(row)),
        totalCount: Number(countResult[0]?.count || 0),
        hasMore,
        nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : undefined,
      });
    } catch (error) {
      return Result.fail(`Failed to get entity timeline: ${error}`);
    }
  }

  /**
   * Get activity summary for an entity
   */
  async getActivitySummary(
    tenantId: string,
    entityType: TrackedEntityType,
    entityId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all_time' = 'all_time'
  ): Promise<Result<ActivitySummary>> {
    try {
      const conditions = [
        eq(activities.tenantId, tenantId),
        eq(activities.entityType, entityType),
        eq(activities.entityId, entityId),
      ];

      let periodStart: Date | undefined;
      const periodEnd = new Date();

      if (period !== 'all_time') {
        periodStart = this.getPeriodStart(period);
        conditions.push(gte(activities.createdAt, periodStart));
      }

      const rows = await this.db
        .select()
        .from(activities)
        .where(and(...conditions));

      const summary: ActivitySummary = {
        entityType,
        entityId,
        period,
        periodStart,
        periodEnd,
        totalActivities: rows.length,
        callCount: 0,
        emailCount: 0,
        meetingCount: 0,
        noteCount: 0,
        taskCount: 0,
        smsCount: 0,
        chatCount: 0,
        webVisitCount: 0,
        formSubmissionCount: 0,
        otherCount: 0,
        inboundCount: 0,
        outboundCount: 0,
        internalCount: 0,
        totalEngagementScore: 0,
        avgEngagementPerActivity: 0,
      };

      let totalCallDuration = 0;
      let callsWithDuration = 0;
      let emailsOpened = 0;
      let emailsClicked = 0;
      let emailsReplied = 0;
      let emailsSent = 0;

      for (const row of rows) {
        // Count by type
        switch (row.type) {
          case 'call':
            summary.callCount++;
            if (row.durationMinutes) {
              totalCallDuration += row.durationMinutes;
              callsWithDuration++;
            }
            break;
          case 'email':
            summary.emailCount++;
            emailsSent++;
            if (row.emailDetails?.openedAt) emailsOpened++;
            if (row.emailDetails?.clickedAt) emailsClicked++;
            if (row.emailDetails?.repliedAt) emailsReplied++;
            break;
          case 'meeting':
            summary.meetingCount++;
            break;
          case 'note':
            summary.noteCount++;
            break;
          case 'task':
            summary.taskCount++;
            break;
          case 'sms':
            summary.smsCount++;
            break;
          case 'chat':
            summary.chatCount++;
            break;
          case 'page_view':
            summary.webVisitCount++;
            break;
          case 'form_submission':
            summary.formSubmissionCount++;
            break;
          default:
            summary.otherCount++;
        }

        // Count by direction
        switch (row.direction) {
          case 'inbound':
            summary.inboundCount++;
            break;
          case 'outbound':
            summary.outboundCount++;
            break;
          case 'internal':
            summary.internalCount++;
            break;
        }

        // Engagement
        summary.totalEngagementScore += row.engagementScore || 0;

        // Track timing
        if (!summary.firstActivityAt || row.createdAt < summary.firstActivityAt) {
          summary.firstActivityAt = row.createdAt;
        }
        if (!summary.lastActivityAt || row.createdAt > summary.lastActivityAt) {
          summary.lastActivityAt = row.createdAt;
        }
      }

      // Calculate averages
      if (summary.totalActivities > 0) {
        summary.avgEngagementPerActivity = summary.totalEngagementScore / summary.totalActivities;
      }

      // Call metrics
      if (callsWithDuration > 0) {
        summary.totalCallDuration = totalCallDuration;
        summary.avgCallDuration = totalCallDuration / callsWithDuration;
      }

      // Email metrics
      if (emailsSent > 0) {
        summary.emailOpenRate = emailsOpened / emailsSent;
        summary.emailClickRate = emailsClicked / emailsSent;
        summary.emailReplyRate = emailsReplied / emailsSent;
      }

      // Calculate avg days between activities
      if (summary.firstActivityAt && summary.lastActivityAt && summary.totalActivities > 1) {
        const daysDiff =
          (summary.lastActivityAt.getTime() - summary.firstActivityAt.getTime()) / (1000 * 60 * 60 * 24);
        summary.avgDaysBetweenActivities = daysDiff / (summary.totalActivities - 1);
      }

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(`Failed to get activity summary: ${error}`);
    }
  }

  /**
   * Bulk update activities
   */
  async bulkUpdateActivities(
    tenantId: string,
    operation: BulkActivityOperation,
    userId: string
  ): Promise<Result<BulkActivityResult>> {
    try {
      const result: BulkActivityResult = {
        totalRequested: operation.activityIds.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      for (const activityId of operation.activityIds) {
        try {
          switch (operation.operation) {
            case 'update_status':
              if (operation.status) {
                await this.db
                  .update(activities)
                  .set({
                    status: operation.status,
                    updatedAt: new Date(),
                    updatedBy: userId,
                  })
                  .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
              }
              break;

            case 'assign':
              if (operation.assignToId) {
                await this.db
                  .update(activities)
                  .set({
                    assignedToId: operation.assignToId,
                    updatedAt: new Date(),
                    updatedBy: userId,
                  })
                  .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
              }
              break;

            case 'add_tags':
              if (operation.tags && operation.tags.length > 0) {
                const [existing] = await this.db
                  .select({ tags: activities.tags })
                  .from(activities)
                  .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));

                if (existing) {
                  const currentTags = (existing.tags as string[]) || [];
                  const newTags = [...new Set([...currentTags, ...operation.tags])];
                  await this.db
                    .update(activities)
                    .set({
                      tags: newTags,
                      updatedAt: new Date(),
                      updatedBy: userId,
                    })
                    .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
                }
              }
              break;

            case 'remove_tags':
              if (operation.tags && operation.tags.length > 0) {
                const [existing] = await this.db
                  .select({ tags: activities.tags })
                  .from(activities)
                  .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));

                if (existing) {
                  const currentTags = (existing.tags as string[]) || [];
                  const newTags = currentTags.filter((t) => !operation.tags!.includes(t));
                  await this.db
                    .update(activities)
                    .set({
                      tags: newTags,
                      updatedAt: new Date(),
                      updatedBy: userId,
                    })
                    .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
                }
              }
              break;

            case 'delete':
              await this.db
                .delete(activities)
                .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)));
              break;
          }

          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors!.push({ activityId, error: String(error) });
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to bulk update activities: ${error}`);
    }
  }

  // ============================================================================
  // Activity Reminders
  // ============================================================================

  /**
   * Create activity reminder
   */
  async createReminder(
    tenantId: string,
    activityId: string,
    userId: string,
    reminderAt: Date,
    message?: string,
    channels: ('email' | 'push' | 'sms')[] = ['email']
  ): Promise<Result<ActivityReminder>> {
    try {
      const id = uuidv4();

      const [row] = await this.db
        .insert(activityReminders)
        .values({
          id,
          activityId,
          userId,
          tenantId,
          reminderAt,
          message,
          channels,
          status: 'pending',
          createdAt: new Date(),
        })
        .returning();

      return Result.ok(this.mapRowToReminder(row));
    } catch (error) {
      return Result.fail(`Failed to create reminder: ${error}`);
    }
  }

  /**
   * Get pending reminders
   */
  async getPendingReminders(tenantId: string): Promise<Result<ActivityReminder[]>> {
    try {
      const now = new Date();

      const rows = await this.db
        .select()
        .from(activityReminders)
        .where(
          and(
            eq(activityReminders.tenantId, tenantId),
            eq(activityReminders.status, 'pending'),
            lte(activityReminders.reminderAt, now)
          )
        )
        .orderBy(asc(activityReminders.reminderAt));

      return Result.ok(rows.map((row: any) => this.mapRowToReminder(row)));
    } catch (error) {
      return Result.fail(`Failed to get pending reminders: ${error}`);
    }
  }

  /**
   * Mark reminder as sent
   */
  async markReminderSent(reminderId: string): Promise<Result<void>> {
    try {
      await this.db
        .update(activityReminders)
        .set({
          status: 'sent',
          sentAt: new Date(),
        })
        .where(eq(activityReminders.id, reminderId));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to mark reminder as sent: ${error}`);
    }
  }

  /**
   * Cancel reminder
   */
  async cancelReminder(tenantId: string, reminderId: string): Promise<Result<void>> {
    try {
      await this.db
        .update(activityReminders)
        .set({ status: 'cancelled' })
        .where(and(eq(activityReminders.id, reminderId), eq(activityReminders.tenantId, tenantId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to cancel reminder: ${error}`);
    }
  }

  // ============================================================================
  // Activity Templates
  // ============================================================================

  /**
   * Create activity template
   */
  async createTemplate(
    tenantId: string,
    input: Omit<ActivityTemplate, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string
  ): Promise<Result<ActivityTemplate>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const [row] = await this.db
        .insert(activityTemplates)
        .values({
          id,
          tenantId,
          name: input.name,
          type: input.type,
          subject: input.subject,
          description: input.description,
          defaultDuration: input.defaultDuration,
          defaultPriority: input.defaultPriority,
          defaultTags: input.defaultTags || [],
          customFields: input.customFields || {},
          isActive: input.isActive ?? true,
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
        })
        .returning();

      return Result.ok(this.mapRowToTemplate(row));
    } catch (error) {
      return Result.fail(`Failed to create template: ${error}`);
    }
  }

  /**
   * List activity templates
   */
  async listTemplates(
    tenantId: string,
    type?: ActivityType,
    activeOnly: boolean = true
  ): Promise<Result<ActivityTemplate[]>> {
    try {
      const conditions = [eq(activityTemplates.tenantId, tenantId)];

      if (type) {
        conditions.push(eq(activityTemplates.type, type));
      }
      if (activeOnly) {
        conditions.push(eq(activityTemplates.isActive, true));
      }

      const rows = await this.db
        .select()
        .from(activityTemplates)
        .where(and(...conditions))
        .orderBy(asc(activityTemplates.name));

      return Result.ok(rows.map((row: any) => this.mapRowToTemplate(row)));
    } catch (error) {
      return Result.fail(`Failed to list templates: ${error}`);
    }
  }

  /**
   * Delete activity template
   */
  async deleteTemplate(tenantId: string, templateId: string): Promise<Result<void>> {
    try {
      await this.db
        .delete(activityTemplates)
        .where(and(eq(activityTemplates.id, templateId), eq(activityTemplates.tenantId, tenantId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete template: ${error}`);
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get activity analytics
   */
  async getActivityAnalytics(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    userId?: string,
    teamId?: string
  ): Promise<Result<ActivityAnalytics>> {
    try {
      const periodStart = this.getPeriodStart(period);
      const periodEnd = new Date();

      const conditions = [
        eq(activities.tenantId, tenantId),
        gte(activities.createdAt, periodStart),
        lte(activities.createdAt, periodEnd),
      ];

      if (userId) {
        conditions.push(eq(activities.ownerId, userId));
      }

      const whereClause = and(...conditions);

      // Get all activities in period
      const rows = await this.db.select().from(activities).where(whereClause);

      // Count by type
      const byType: Record<string, number> = {};
      const byDirection: Record<string, number> = {};
      const byStatus: Record<string, number> = {};
      const byUser: Record<string, { count: number; callCount: number; emailCount: number; meetingCount: number; engagementScore: number }> = {};
      const byHour: number[] = new Array(24).fill(0);
      const byDayOfWeek: number[] = new Array(7).fill(0);
      const dailyTrendMap: Record<string, { count: number; engagementScore: number }> = {};

      let totalEngagement = 0;
      const uniqueEntities = new Set<string>();
      const activeUsers = new Set<string>();

      for (const row of rows) {
        // By type
        byType[row.type] = (byType[row.type] || 0) + 1;

        // By direction
        if (row.direction) {
          byDirection[row.direction] = (byDirection[row.direction] || 0) + 1;
        }

        // By status
        byStatus[row.status] = (byStatus[row.status] || 0) + 1;

        // By user
        if (!byUser[row.ownerId]) {
          byUser[row.ownerId] = { count: 0, callCount: 0, emailCount: 0, meetingCount: 0, engagementScore: 0 };
        }
        byUser[row.ownerId].count++;
        if (row.type === 'call') byUser[row.ownerId].callCount++;
        if (row.type === 'email') byUser[row.ownerId].emailCount++;
        if (row.type === 'meeting') byUser[row.ownerId].meetingCount++;
        byUser[row.ownerId].engagementScore += row.engagementScore || 0;

        // By hour
        const hour = new Date(row.createdAt).getHours();
        byHour[hour]++;

        // By day of week
        const dayOfWeek = new Date(row.createdAt).getDay();
        byDayOfWeek[dayOfWeek]++;

        // Daily trend
        const dateKey = new Date(row.createdAt).toISOString().split('T')[0];
        if (!dailyTrendMap[dateKey]) {
          dailyTrendMap[dateKey] = { count: 0, engagementScore: 0 };
        }
        dailyTrendMap[dateKey].count++;
        dailyTrendMap[dateKey].engagementScore += row.engagementScore || 0;

        // Tracking
        totalEngagement += row.engagementScore || 0;
        uniqueEntities.add(`${row.entityType}:${row.entityId}`);
        activeUsers.add(row.ownerId);
      }

      const totalActivities = rows.length;

      return Result.ok({
        tenantId,
        period,
        periodStart,
        periodEnd,
        totalActivities,
        uniqueEntities: uniqueEntities.size,
        activeUsers: activeUsers.size,
        byType: Object.entries(byType).map(([type, count]) => ({
          type: type as ActivityType,
          count,
          percentage: totalActivities > 0 ? count / totalActivities : 0,
        })),
        byDirection: Object.entries(byDirection).map(([direction, count]) => ({
          direction: direction as 'inbound' | 'outbound' | 'internal',
          count,
          percentage: totalActivities > 0 ? count / totalActivities : 0,
        })),
        byStatus: Object.entries(byStatus).map(([status, count]) => ({
          status: status as ActivityStatus,
          count,
          percentage: totalActivities > 0 ? count / totalActivities : 0,
        })),
        byUser: Object.entries(byUser).map(([userId, data]) => ({
          userId,
          userName: 'Unknown', // Would need to join with users table
          count: data.count,
          callCount: data.callCount,
          emailCount: data.emailCount,
          meetingCount: data.meetingCount,
          avgEngagementScore: data.count > 0 ? data.engagementScore / data.count : 0,
        })),
        byHour: byHour.map((count, hour) => ({ hour, count })),
        byDayOfWeek: byDayOfWeek.map((count, day) => ({ day, count })),
        dailyTrend: Object.entries(dailyTrendMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date: new Date(date),
            count: data.count,
            engagementScore: data.engagementScore,
          })),
        avgEngagementScore: totalActivities > 0 ? totalEngagement / totalActivities : 0,
        highEngagementPercentage: 0, // Would need to define threshold
      });
    } catch (error) {
      return Result.fail(`Failed to get activity analytics: ${error}`);
    }
  }

  /**
   * Get user activity stats
   */
  async getUserActivityStats(
    tenantId: string,
    userId: string,
    period: 'day' | 'week' | 'month' | 'quarter' = 'week'
  ): Promise<Result<UserActivityStats>> {
    try {
      const periodStart = this.getPeriodStart(period);
      const periodEnd = new Date();

      const rows = await this.db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.tenantId, tenantId),
            eq(activities.ownerId, userId),
            gte(activities.createdAt, periodStart),
            lte(activities.createdAt, periodEnd)
          )
        );

      let callsMade = 0;
      let emailsSent = 0;
      let meetingsHeld = 0;
      let tasksCompleted = 0;
      let notesAdded = 0;
      let totalEngagement = 0;
      let totalCallDuration = 0;
      const hourlyActivity: number[] = new Array(24).fill(0);
      const dailyActivity: Record<string, number> = {};

      for (const row of rows) {
        switch (row.type) {
          case 'call':
            callsMade++;
            totalCallDuration += row.durationMinutes || 0;
            break;
          case 'email':
            emailsSent++;
            break;
          case 'meeting':
            meetingsHeld++;
            break;
          case 'task':
            if (row.status === 'completed') tasksCompleted++;
            break;
          case 'note':
            notesAdded++;
            break;
        }

        totalEngagement += row.engagementScore || 0;

        const hour = new Date(row.createdAt).getHours();
        hourlyActivity[hour]++;

        const dayKey = new Date(row.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
        dailyActivity[dayKey] = (dailyActivity[dayKey] || 0) + 1;
      }

      const totalActivities = rows.length;
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));

      // Find most active day and hour
      let mostActiveDay: string | undefined;
      let maxDayActivity = 0;
      for (const [day, count] of Object.entries(dailyActivity)) {
        if (count > maxDayActivity) {
          maxDayActivity = count;
          mostActiveDay = day;
        }
      }

      let mostActiveHour = 0;
      let maxHourActivity = 0;
      for (let hour = 0; hour < 24; hour++) {
        if (hourlyActivity[hour] > maxHourActivity) {
          maxHourActivity = hourlyActivity[hour];
          mostActiveHour = hour;
        }
      }

      return Result.ok({
        userId,
        userName: 'Unknown', // Would need to join with users table
        tenantId,
        period,
        periodStart,
        periodEnd,
        totalActivities,
        callsMade,
        emailsSent,
        meetingsHeld,
        tasksCompleted,
        notesAdded,
        avgActivitiesPerDay: daysInPeriod > 0 ? totalActivities / daysInPeriod : 0,
        mostActiveDay,
        mostActiveHour,
        avgCallDuration: callsMade > 0 ? totalCallDuration / callsMade : undefined,
        totalCallTime: totalCallDuration,
        totalEngagementGenerated: totalEngagement,
        avgEngagementPerActivity: totalActivities > 0 ? totalEngagement / totalActivities : 0,
      });
    } catch (error) {
      return Result.fail(`Failed to get user activity stats: ${error}`);
    }
  }

  /**
   * Get team activity dashboard
   */
  async getTeamDashboard(
    tenantId: string,
    teamId?: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<Result<TeamActivityDashboard>> {
    try {
      const periodStart = this.getPeriodStart(period);

      const conditions = [eq(activities.tenantId, tenantId), gte(activities.createdAt, periodStart)];

      const rows = await this.db.select().from(activities).where(and(...conditions));

      let totalCalls = 0;
      let totalEmails = 0;
      let totalMeetings = 0;
      const userStats: Record<string, { count: number; engagement: number; callConnects: number; totalCalls: number }> = {};
      const dailyTrendMap: Record<string, number> = {};
      const engagementTrendMap: Record<string, number> = {};

      for (const row of rows) {
        switch (row.type) {
          case 'call':
            totalCalls++;
            break;
          case 'email':
            totalEmails++;
            break;
          case 'meeting':
            totalMeetings++;
            break;
        }

        if (!userStats[row.ownerId]) {
          userStats[row.ownerId] = { count: 0, engagement: 0, callConnects: 0, totalCalls: 0 };
        }
        userStats[row.ownerId].count++;
        userStats[row.ownerId].engagement += row.engagementScore || 0;

        if (row.type === 'call') {
          userStats[row.ownerId].totalCalls++;
          if (row.callDetails?.outcome === 'connected') {
            userStats[row.ownerId].callConnects++;
          }
        }

        const dateKey = new Date(row.createdAt).toISOString().split('T')[0];
        dailyTrendMap[dateKey] = (dailyTrendMap[dateKey] || 0) + 1;
        engagementTrendMap[dateKey] = (engagementTrendMap[dateKey] || 0) + (row.engagementScore || 0);
      }

      const topPerformers = Object.entries(userStats)
        .map(([userId, stats]) => ({
          userId,
          userName: 'Unknown',
          activityCount: stats.count,
          engagementScore: stats.engagement,
          callConnectRate: stats.totalCalls > 0 ? stats.callConnects / stats.totalCalls : undefined,
        }))
        .sort((a, b) => b.activityCount - a.activityCount)
        .slice(0, 5);

      // Get recent activities
      const recentActivities = await this.db
        .select()
        .from(activities)
        .where(and(...conditions))
        .orderBy(desc(activities.createdAt))
        .limit(10);

      // Get pending activities
      const pendingActivities = await this.db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.tenantId, tenantId),
            eq(activities.status, 'scheduled'),
            gte(activities.scheduledAt, new Date())
          )
        )
        .orderBy(asc(activities.scheduledAt))
        .limit(10);

      // Get overdue activities
      const overdueActivities = await this.db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.tenantId, tenantId),
            eq(activities.status, 'scheduled'),
            lte(activities.scheduledAt, new Date())
          )
        )
        .orderBy(desc(activities.scheduledAt))
        .limit(10);

      return Result.ok({
        tenantId,
        teamId,
        period,
        totalActivities: rows.length,
        totalCalls,
        totalEmails,
        totalMeetings,
        activeMemberCount: Object.keys(userStats).length,
        avgActivitiesPerMember: Object.keys(userStats).length > 0 ? rows.length / Object.keys(userStats).length : 0,
        topPerformers,
        recentActivities: recentActivities.map((row: any) => this.mapRowToActivity(row)),
        pendingActivities: pendingActivities.map((row: any) => this.mapRowToActivity(row)),
        overdueActivities: overdueActivities.map((row: any) => this.mapRowToActivity(row)),
        activityTrend: Object.entries(dailyTrendMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date: new Date(date), count })),
        engagementTrend: Object.entries(engagementTrendMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, score]) => ({ date: new Date(date), score })),
      });
    } catch (error) {
      return Result.fail(`Failed to get team dashboard: ${error}`);
    }
  }

  // ============================================================================
  // Web Tracking
  // ============================================================================

  /**
   * Create web tracking session
   */
  async createWebSession(
    tenantId: string,
    visitorId: string,
    data: {
      entryUrl?: string;
      entryTitle?: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmTerm?: string;
      utmContent?: string;
      device?: string;
      browser?: string;
      os?: string;
      country?: string;
      city?: string;
      region?: string;
      ipAddress?: string;
    }
  ): Promise<Result<{ id: string }>> {
    try {
      const id = uuidv4();
      const now = new Date();

      await this.db.insert(webTrackingSessions).values({
        id,
        tenantId,
        visitorId,
        sessionStart: now,
        pageViews: 0,
        ...data,
        createdAt: now,
        updatedAt: now,
      });

      return Result.ok({ id });
    } catch (error) {
      return Result.fail(`Failed to create web session: ${error}`);
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    sessionId: string,
    tenantId: string,
    data: {
      pageUrl: string;
      pageTitle?: string;
      pagePath?: string;
      referrer?: string;
      previousPageUrl?: string;
    }
  ): Promise<Result<{ id: string }>> {
    try {
      const id = uuidv4();

      await this.db.insert(webPageViews).values({
        id,
        sessionId,
        tenantId,
        ...data,
        timestamp: new Date(),
      });

      // Update session page view count
      await this.db
        .update(webTrackingSessions)
        .set({
          pageViews: sql`${webTrackingSessions.pageViews} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(webTrackingSessions.id, sessionId));

      return Result.ok({ id });
    } catch (error) {
      return Result.fail(`Failed to track page view: ${error}`);
    }
  }

  /**
   * Track web event
   */
  async trackWebEvent(
    sessionId: string,
    tenantId: string,
    data: {
      eventName: string;
      eventCategory?: string;
      eventLabel?: string;
      eventValue?: number;
      pageUrl?: string;
      pageTitle?: string;
      properties?: Record<string, unknown>;
    }
  ): Promise<Result<{ id: string }>> {
    try {
      const id = uuidv4();

      await this.db.insert(webEvents).values({
        id,
        sessionId,
        tenantId,
        ...data,
        timestamp: new Date(),
      });

      return Result.ok({ id });
    } catch (error) {
      return Result.fail(`Failed to track web event: ${error}`);
    }
  }

  /**
   * Link web session to contact/lead
   */
  async linkWebSession(
    sessionId: string,
    tenantId: string,
    linkData: { contactId?: string; leadId?: string }
  ): Promise<Result<void>> {
    try {
      await this.db
        .update(webTrackingSessions)
        .set({
          ...linkData,
          updatedAt: new Date(),
        })
        .where(and(eq(webTrackingSessions.id, sessionId), eq(webTrackingSessions.tenantId, tenantId)));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to link web session: ${error}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateEngagementScore(input: CreateActivityInput): number {
    let score = 0;

    // Base score by type
    switch (input.type) {
      case 'meeting':
        score += 20;
        break;
      case 'call':
        score += 15;
        break;
      case 'email':
        score += 10;
        break;
      case 'form_submission':
        score += 25;
        break;
      case 'demo':
        score += 30;
        break;
      case 'page_view':
        score += 1;
        break;
      case 'chat':
        score += 12;
        break;
      default:
        score += 5;
    }

    // Direction bonus
    if (input.direction === 'inbound') {
      score += 5;
    }

    // Duration bonus
    if (input.durationMinutes && input.durationMinutes > 30) {
      score += 10;
    }

    return score;
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week':
        const dayOfWeek = now.getDay();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(0);
    }
  }

  private mapRowToActivity(row: any): Activity {
    return {
      id: row.id,
      tenantId: row.tenantId,
      entityType: row.entityType as TrackedEntityType,
      entityId: row.entityId,
      entityName: row.entityName,
      type: row.type as ActivityType,
      subtype: row.subtype,
      subject: row.subject,
      description: row.description,
      direction: row.direction,
      status: row.status as ActivityStatus,
      priority: row.priority,
      startTime: row.startTime,
      endTime: row.endTime,
      durationMinutes: row.durationMinutes,
      scheduledAt: row.scheduledAt,
      completedAt: row.completedAt,
      ownerId: row.ownerId,
      ownerName: row.ownerName,
      assignedToId: row.assignedToId,
      assignedToName: row.assignedToName,
      relatedLeadId: row.relatedLeadId,
      relatedContactId: row.relatedContactId,
      relatedDealId: row.relatedDealId,
      relatedCampaignId: row.relatedCampaignId,
      relatedSequenceId: row.relatedSequenceId,
      relatedTaskId: row.relatedTaskId,
      callDetails: row.callDetails,
      emailDetails: row.emailDetails,
      meetingDetails: row.meetingDetails,
      smsDetails: row.smsDetails,
      chatDetails: row.chatDetails,
      webTrackingDetails: row.webTrackingDetails,
      formSubmission: row.formSubmission,
      customFields: row.customFields,
      metadata: row.metadata,
      tags: row.tags,
      engagementScore: row.engagementScore,
      location: row.location,
      source: row.source,
      sourceSystem: row.sourceSystem,
      externalId: row.externalId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  }

  private mapRowToReminder(row: any): ActivityReminder {
    return {
      id: row.id,
      activityId: row.activityId,
      userId: row.userId,
      tenantId: row.tenantId,
      reminderAt: row.reminderAt,
      message: row.message,
      channels: row.channels,
      status: row.status,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    };
  }

  private mapRowToTemplate(row: any): ActivityTemplate {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      type: row.type as ActivityType,
      subject: row.subject,
      description: row.description,
      defaultDuration: row.defaultDuration,
      defaultPriority: row.defaultPriority,
      defaultTags: row.defaultTags,
      customFields: row.customFields,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
    };
  }
}
