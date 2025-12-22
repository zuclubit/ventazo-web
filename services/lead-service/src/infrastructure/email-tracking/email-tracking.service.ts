/**
 * Email Tracking Service
 * Provides email tracking functionality including pixel tracking, link tracking, and analytics
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  trackedEmails,
  trackedLinks,
  trackingEvents,
  emailSequences,
  sequenceSteps,
  sequenceEnrollments,
  emailTemplates,
  TrackedEmailRow,
  TrackedLinkRow,
  TrackingEventRow,
  EmailSequenceRow,
  SequenceStepRow,
  SequenceEnrollmentRow,
  EmailTemplateRow,
} from '../database/schema';
import type {
  TrackedEmail,
  TrackedLink,
  TrackingEvent,
  EmailAnalytics,
  LinkAnalytics,
  EmailPerformance,
  EmailSequence,
  SequenceStep,
  SequenceEnrollment,
  CreateTrackedEmailInput,
  RecordOpenInput,
  RecordClickInput,
  CreateSequenceInput,
  EnrollInSequenceInput,
  GetAnalyticsInput,
  TrackingEventType,
  EmailStatus,
  LinkType,
  SequenceSettings,
} from './types';

@injectable()
export class EmailTrackingService {
  private db: any;
  private baseTrackingUrl: string;

  constructor(@inject('Database') db: any) {
    this.db = db;
    this.baseTrackingUrl = process.env.TRACKING_BASE_URL || 'https://track.example.com';
  }

  // ==================== Tracked Email Operations ====================

  /**
   * Create a tracked email with pixel and link tracking
   */
  async createTrackedEmail(
    tenantId: string,
    userId: string,
    input: CreateTrackedEmailInput
  ): Promise<Result<TrackedEmail>> {
    try {
      const trackingId = this.generateTrackingId();
      const pixelUrl = this.generatePixelUrl(trackingId);
      const id = uuidv4();

      // Insert tracked email
      const [emailRow] = await this.db.insert(trackedEmails).values({
        id,
        tenantId,
        userId,
        messageId: input.messageId,
        threadId: input.threadId,
        subject: input.subject,
        fromEmail: input.fromEmail,
        fromName: input.fromName,
        toEmail: input.toEmail,
        toName: input.toName,
        ccEmails: input.ccEmails || [],
        bccEmails: input.bccEmails || [],
        entityType: input.entityType,
        entityId: input.entityId,
        trackingId,
        pixelUrl,
        status: 'sent',
        sentAt: new Date(),
      }).returning();

      // Process and create tracked links
      const trackedLinksData: TrackedLink[] = [];
      if (input.links && input.links.length > 0) {
        for (const link of input.links) {
          const linkId = uuidv4();
          const trackingUrl = this.generateLinkTrackingUrl(trackingId, linkId);

          const [linkRow] = await this.db.insert(trackedLinks).values({
            id: linkId,
            emailId: id,
            originalUrl: link.originalUrl,
            trackingUrl,
            linkType: link.linkType || 'other',
            anchorText: link.anchorText,
            position: link.position,
          }).returning();

          trackedLinksData.push(this.mapLinkRowToTrackedLink(linkRow));
        }
      }

      // Record sent event
      await this.recordEvent(tenantId, id, trackingId, 'sent', {});

      return Result.ok(this.mapEmailRowToTrackedEmail(emailRow, trackedLinksData));
    } catch (error) {
      return Result.fail(`Failed to create tracked email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tracked email by ID
   */
  async getTrackedEmail(tenantId: string, emailId: string): Promise<Result<TrackedEmail>> {
    try {
      const [emailRow] = await this.db.select()
        .from(trackedEmails)
        .where(and(eq(trackedEmails.tenantId, tenantId), eq(trackedEmails.id, emailId)));

      if (!emailRow) {
        return Result.fail('Tracked email not found');
      }

      const links = await this.db.select()
        .from(trackedLinks)
        .where(eq(trackedLinks.emailId, emailId));

      return Result.ok(this.mapEmailRowToTrackedEmail(emailRow, links.map((l: TrackedLinkRow) => this.mapLinkRowToTrackedLink(l))));
    } catch (error) {
      return Result.fail(`Failed to get tracked email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tracked email by tracking ID (for pixel/link callbacks)
   */
  async getTrackedEmailByTrackingId(trackingId: string): Promise<Result<TrackedEmail>> {
    try {
      const [emailRow] = await this.db.select()
        .from(trackedEmails)
        .where(eq(trackedEmails.trackingId, trackingId));

      if (!emailRow) {
        return Result.fail('Tracked email not found');
      }

      const links = await this.db.select()
        .from(trackedLinks)
        .where(eq(trackedLinks.emailId, emailRow.id));

      return Result.ok(this.mapEmailRowToTrackedEmail(emailRow, links.map((l: TrackedLinkRow) => this.mapLinkRowToTrackedLink(l))));
    } catch (error) {
      return Result.fail(`Failed to get tracked email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List tracked emails for a user
   */
  async listTrackedEmails(
    tenantId: string,
    userId: string,
    options: { entityType?: string; entityId?: string; status?: EmailStatus; limit?: number; offset?: number }
  ): Promise<Result<{ emails: TrackedEmail[]; total: number }>> {
    try {
      const conditions = [
        eq(trackedEmails.tenantId, tenantId),
        eq(trackedEmails.userId, userId),
      ];

      if (options.entityType) {
        conditions.push(eq(trackedEmails.entityType, options.entityType));
      }
      if (options.entityId) {
        conditions.push(eq(trackedEmails.entityId, options.entityId));
      }
      if (options.status) {
        conditions.push(eq(trackedEmails.status, options.status));
      }

      const [countResult] = await this.db.select({ count: sql<number>`count(*)` })
        .from(trackedEmails)
        .where(and(...conditions));

      const emailRows = await this.db.select()
        .from(trackedEmails)
        .where(and(...conditions))
        .orderBy(desc(trackedEmails.sentAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      const emails: TrackedEmail[] = [];
      for (const emailRow of emailRows) {
        const links = await this.db.select()
          .from(trackedLinks)
          .where(eq(trackedLinks.emailId, emailRow.id));
        emails.push(this.mapEmailRowToTrackedEmail(emailRow, links.map((l: TrackedLinkRow) => this.mapLinkRowToTrackedLink(l))));
      }

      return Result.ok({
        emails,
        total: Number(countResult.count),
      });
    } catch (error) {
      return Result.fail(`Failed to list tracked emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Tracking Event Operations ====================

  /**
   * Record an email open event (triggered by pixel load)
   */
  async recordOpen(input: RecordOpenInput): Promise<Result<void>> {
    try {
      const emailResult = await this.getTrackedEmailByTrackingId(input.trackingId);
      if (emailResult.isFailure || !emailResult.value) {
        return Result.fail('Email not found for tracking ID');
      }

      const email = emailResult.value;
      const now = new Date();
      const isFirstOpen = email.openCount === 0;

      // Check if this is a unique open (by IP + user agent)
      const isUnique = await this.isUniqueEvent(email.id, 'opened', input.ipAddress, input.userAgent);

      // Record the open event
      await this.recordEvent(email.tenantId, email.id, input.trackingId, 'opened', {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        isUnique,
        isFirstEvent: isFirstOpen,
      });

      // Update email metrics
      const updateData: Record<string, unknown> = {
        openCount: sql`${trackedEmails.openCount} + 1`,
        lastOpenedAt: now,
        updatedAt: now,
      };

      if (isFirstOpen) {
        updateData.firstOpenedAt = now;
        updateData.status = 'opened';
      }

      await this.db.update(trackedEmails)
        .set(updateData)
        .where(eq(trackedEmails.id, email.id));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record open: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a link click event
   */
  async recordClick(input: RecordClickInput): Promise<Result<{ redirectUrl: string }>> {
    try {
      const emailResult = await this.getTrackedEmailByTrackingId(input.trackingId);
      if (emailResult.isFailure || !emailResult.value) {
        return Result.fail('Email not found for tracking ID');
      }

      const email = emailResult.value;

      // Get the link
      const [linkRow] = await this.db.select()
        .from(trackedLinks)
        .where(eq(trackedLinks.id, input.linkId));

      if (!linkRow) {
        return Result.fail('Link not found');
      }

      const now = new Date();
      const isFirstEmailClick = email.clickCount === 0;
      const isFirstLinkClick = linkRow.clickCount === 0;

      // Check if this is a unique click
      const isUnique = await this.isUniqueEvent(email.id, 'clicked', input.ipAddress, input.userAgent, input.linkId);

      // Record the click event
      await this.recordEvent(email.tenantId, email.id, input.trackingId, 'clicked', {
        linkId: input.linkId,
        clickedUrl: linkRow.originalUrl,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        isUnique,
        isFirstEvent: isFirstLinkClick,
      });

      // Update link metrics
      const linkUpdateData: Record<string, unknown> = {
        clickCount: sql`${trackedLinks.clickCount} + 1`,
        lastClickedAt: now,
      };

      if (isFirstLinkClick) {
        linkUpdateData.firstClickedAt = now;
      }

      await this.db.update(trackedLinks)
        .set(linkUpdateData)
        .where(eq(trackedLinks.id, input.linkId));

      // Update email metrics
      const emailUpdateData: Record<string, unknown> = {
        clickCount: sql`${trackedEmails.clickCount} + 1`,
        lastClickedAt: now,
        updatedAt: now,
      };

      if (isFirstEmailClick) {
        emailUpdateData.firstClickedAt = now;
        emailUpdateData.status = 'clicked';
      }

      await this.db.update(trackedEmails)
        .set(emailUpdateData)
        .where(eq(trackedEmails.id, email.id));

      return Result.ok({ redirectUrl: linkRow.originalUrl });
    } catch (error) {
      return Result.fail(`Failed to record click: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record a bounce event
   */
  async recordBounce(
    trackingId: string,
    bounceType: 'soft' | 'hard',
    bounceReason: string,
    diagnosticCode?: string
  ): Promise<Result<void>> {
    try {
      const emailResult = await this.getTrackedEmailByTrackingId(trackingId);
      if (emailResult.isFailure || !emailResult.value) {
        return Result.fail('Email not found for tracking ID');
      }

      const email = emailResult.value;
      const now = new Date();

      // Record the bounce event
      await this.recordEvent(email.tenantId, email.id, trackingId, 'bounced', {
        bounceType,
        bounceReason,
        diagnosticCode,
      });

      // Update email status
      await this.db.update(trackedEmails)
        .set({
          status: 'bounced',
          bouncedAt: now,
          bounceType,
          bounceReason,
          updatedAt: now,
        })
        .where(eq(trackedEmails.id, email.id));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record bounce: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Record delivery confirmation
   */
  async recordDelivery(trackingId: string): Promise<Result<void>> {
    try {
      const emailResult = await this.getTrackedEmailByTrackingId(trackingId);
      if (emailResult.isFailure || !emailResult.value) {
        return Result.fail('Email not found for tracking ID');
      }

      const email = emailResult.value;
      const now = new Date();

      // Record the delivery event
      await this.recordEvent(email.tenantId, email.id, trackingId, 'delivered', {});

      // Update email status (only if not already opened/clicked)
      if (email.status === 'sent' || email.status === 'sending') {
        await this.db.update(trackedEmails)
          .set({
            status: 'delivered',
            deliveredAt: now,
            updatedAt: now,
          })
          .where(eq(trackedEmails.id, email.id));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record delivery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tracking events for an email
   */
  async getTrackingEvents(
    tenantId: string,
    emailId: string,
    eventType?: TrackingEventType
  ): Promise<Result<TrackingEvent[]>> {
    try {
      const conditions = [
        eq(trackingEvents.tenantId, tenantId),
        eq(trackingEvents.emailId, emailId),
      ];

      if (eventType) {
        conditions.push(eq(trackingEvents.eventType, eventType));
      }

      const events = await this.db.select()
        .from(trackingEvents)
        .where(and(...conditions))
        .orderBy(desc(trackingEvents.occurredAt));

      return Result.ok(events.map((e: TrackingEventRow) => this.mapEventRowToTrackingEvent(e)));
    } catch (error) {
      return Result.fail(`Failed to get tracking events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Analytics Operations ====================

  /**
   * Get email analytics for a period
   */
  async getAnalytics(tenantId: string, input: GetAnalyticsInput): Promise<Result<EmailAnalytics>> {
    try {
      const conditions = [
        eq(trackedEmails.tenantId, tenantId),
        gte(trackedEmails.sentAt, input.startDate),
        lte(trackedEmails.sentAt, input.endDate),
      ];

      if (input.userId) {
        conditions.push(eq(trackedEmails.userId, input.userId));
      }
      if (input.entityType) {
        conditions.push(eq(trackedEmails.entityType, input.entityType));
      }
      if (input.entityId) {
        conditions.push(eq(trackedEmails.entityId, input.entityId));
      }

      // Get totals
      const emails = await this.db.select()
        .from(trackedEmails)
        .where(and(...conditions));

      const totals = {
        sent: emails.length,
        delivered: emails.filter((e: TrackedEmailRow) => e.deliveredAt).length,
        opened: emails.filter((e: TrackedEmailRow) => e.firstOpenedAt).length,
        clicked: emails.filter((e: TrackedEmailRow) => e.firstClickedAt).length,
        bounced: emails.filter((e: TrackedEmailRow) => e.bouncedAt).length,
        complained: 0, // Would need a complained flag
        unsubscribed: 0, // Would need tracking for unsubscribes
      };

      // Calculate rates
      const rates = {
        deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
        openRate: totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0,
        clickRate: totals.delivered > 0 ? (totals.clicked / totals.delivered) * 100 : 0,
        clickToOpenRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
        bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
        complaintRate: 0,
        unsubscribeRate: 0,
      };

      // Get trends (group by day)
      const trends = await this.calculateTrends(tenantId, input.startDate, input.endDate, input.groupBy || 'day');

      return Result.ok({
        period: {
          start: input.startDate,
          end: input.endDate,
        },
        totals,
        rates,
        trends,
      });
    } catch (error) {
      return Result.fail(`Failed to get analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get link analytics for an email
   */
  async getLinkAnalytics(tenantId: string, emailId: string): Promise<Result<LinkAnalytics[]>> {
    try {
      // Verify email belongs to tenant
      const [email] = await this.db.select()
        .from(trackedEmails)
        .where(and(eq(trackedEmails.tenantId, tenantId), eq(trackedEmails.id, emailId)));

      if (!email) {
        return Result.fail('Email not found');
      }

      // Get all links for this email
      const links = await this.db.select()
        .from(trackedLinks)
        .where(eq(trackedLinks.emailId, emailId));

      const analytics: LinkAnalytics[] = [];

      for (const link of links) {
        // Get unique clicks
        const uniqueClicks = await this.db.select({ count: sql<number>`count(distinct ${trackingEvents.ipAddress})` })
          .from(trackingEvents)
          .where(and(
            eq(trackingEvents.emailId, emailId),
            eq(trackingEvents.linkId, link.id),
            eq(trackingEvents.eventType, 'clicked')
          ));

        // Get clicks by device
        const deviceClicks = await this.db.select({
          deviceType: trackingEvents.deviceType,
          count: sql<number>`count(*)`,
        })
          .from(trackingEvents)
          .where(and(
            eq(trackingEvents.emailId, emailId),
            eq(trackingEvents.linkId, link.id),
            eq(trackingEvents.eventType, 'clicked')
          ))
          .groupBy(trackingEvents.deviceType);

        // Get clicks by country
        const countryClicks = await this.db.select({
          country: trackingEvents.country,
          count: sql<number>`count(*)`,
        })
          .from(trackingEvents)
          .where(and(
            eq(trackingEvents.emailId, emailId),
            eq(trackingEvents.linkId, link.id),
            eq(trackingEvents.eventType, 'clicked')
          ))
          .groupBy(trackingEvents.country);

        analytics.push({
          linkId: link.id,
          originalUrl: link.originalUrl,
          linkType: link.linkType as LinkType,
          anchorText: link.anchorText || undefined,
          totalClicks: link.clickCount,
          uniqueClicks: Number(uniqueClicks[0]?.count || 0),
          clickRate: email.openCount > 0 ? (link.clickCount / email.openCount) * 100 : 0,
          clicksByDevice: Object.fromEntries(deviceClicks.map((d: { deviceType: string | null; count: number }) => [d.deviceType || 'unknown', Number(d.count)])),
          clicksByCountry: Object.fromEntries(countryClicks.map((c: { country: string | null; count: number }) => [c.country || 'unknown', Number(c.count)])),
        });
      }

      return Result.ok(analytics);
    } catch (error) {
      return Result.fail(`Failed to get link analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get email performance details
   */
  async getEmailPerformance(tenantId: string, emailId: string): Promise<Result<EmailPerformance>> {
    try {
      const emailResult = await this.getTrackedEmail(tenantId, emailId);
      if (emailResult.isFailure || !emailResult.value) {
        return Result.fail('Email not found');
      }

      const email = emailResult.value;

      // Get events
      const events = await this.db.select()
        .from(trackingEvents)
        .where(eq(trackingEvents.emailId, emailId))
        .orderBy(asc(trackingEvents.occurredAt));

      // Calculate unique opens and clicks
      const uniqueOpens = new Set(
        events
          .filter((e: TrackingEventRow) => e.eventType === 'opened')
          .map((e: TrackingEventRow) => `${e.ipAddress}-${e.userAgent}`)
      ).size;

      const uniqueClicks = new Set(
        events
          .filter((e: TrackingEventRow) => e.eventType === 'clicked')
          .map((e: TrackingEventRow) => `${e.ipAddress}-${e.userAgent}`)
      ).size;

      // Calculate engagement score (simple weighted score)
      const engagementScore = Math.min(100,
        (email.openCount * 10) +
        (email.clickCount * 25) +
        (uniqueOpens * 5) +
        (uniqueClicks * 15)
      );

      return Result.ok({
        emailId: email.id,
        subject: email.subject,
        sentAt: email.sentAt,
        recipientEmail: email.toEmail,
        recipientName: email.toName,
        status: email.status,
        openCount: email.openCount,
        clickCount: email.clickCount,
        uniqueOpens,
        uniqueClicks,
        engagementScore,
        timeline: events.map((e: TrackingEventRow) => this.mapEventRowToTrackingEvent(e)),
      });
    } catch (error) {
      return Result.fail(`Failed to get email performance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Email Sequence Operations ====================

  /**
   * Create an email sequence
   */
  async createSequence(
    tenantId: string,
    userId: string,
    input: CreateSequenceInput
  ): Promise<Result<EmailSequence>> {
    try {
      const sequenceId = uuidv4();

      const defaultSettings: SequenceSettings = {
        sendingWindow: {
          startTime: '09:00',
          endTime: '17:00',
          timezone: 'UTC',
          sendDays: [1, 2, 3, 4, 5], // Monday to Friday
        },
        exitConditions: {
          onReply: true,
          onClick: false,
          onUnsubscribe: true,
          onBounce: true,
          onConversion: true,
        },
        throttling: {
          maxPerDay: 100,
          delayBetweenEmails: 60, // seconds
        },
      };

      const [sequenceRow] = await this.db.insert(emailSequences).values({
        id: sequenceId,
        tenantId,
        name: input.name,
        description: input.description,
        steps: [],
        settings: input.settings ? { ...defaultSettings, ...input.settings } : defaultSettings,
        isActive: true,
        createdBy: userId,
      }).returning();

      // Create steps
      const stepsData: SequenceStep[] = [];
      for (let i = 0; i < input.steps.length; i++) {
        const step = input.steps[i];
        const stepId = uuidv4();

        const [stepRow] = await this.db.insert(sequenceSteps).values({
          id: stepId,
          sequenceId,
          order: i + 1,
          type: step.type,
          templateId: step.templateId,
          subject: step.subject,
          body: step.body,
          waitDays: step.waitDays,
          waitHours: step.waitHours,
          waitUntilTime: step.waitUntilTime,
          skipWeekends: step.skipWeekends || false,
          condition: step.condition,
        }).returning();

        stepsData.push(this.mapStepRowToSequenceStep(stepRow));
      }

      return Result.ok(this.mapSequenceRowToEmailSequence(sequenceRow, stepsData));
    } catch (error) {
      return Result.fail(`Failed to create sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get sequence by ID
   */
  async getSequence(tenantId: string, sequenceId: string): Promise<Result<EmailSequence>> {
    try {
      const [sequenceRow] = await this.db.select()
        .from(emailSequences)
        .where(and(eq(emailSequences.tenantId, tenantId), eq(emailSequences.id, sequenceId)));

      if (!sequenceRow) {
        return Result.fail('Sequence not found');
      }

      const steps = await this.db.select()
        .from(sequenceSteps)
        .where(eq(sequenceSteps.sequenceId, sequenceId))
        .orderBy(asc(sequenceSteps.order));

      return Result.ok(this.mapSequenceRowToEmailSequence(
        sequenceRow,
        steps.map((s: SequenceStepRow) => this.mapStepRowToSequenceStep(s))
      ));
    } catch (error) {
      return Result.fail(`Failed to get sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List sequences
   */
  async listSequences(
    tenantId: string,
    options: { isActive?: boolean; limit?: number; offset?: number }
  ): Promise<Result<{ sequences: EmailSequence[]; total: number }>> {
    try {
      const conditions = [eq(emailSequences.tenantId, tenantId)];

      if (options.isActive !== undefined) {
        conditions.push(eq(emailSequences.isActive, options.isActive));
      }

      const [countResult] = await this.db.select({ count: sql<number>`count(*)` })
        .from(emailSequences)
        .where(and(...conditions));

      const sequenceRows = await this.db.select()
        .from(emailSequences)
        .where(and(...conditions))
        .orderBy(desc(emailSequences.createdAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      const sequences: EmailSequence[] = [];
      for (const row of sequenceRows) {
        const steps = await this.db.select()
          .from(sequenceSteps)
          .where(eq(sequenceSteps.sequenceId, row.id))
          .orderBy(asc(sequenceSteps.order));

        sequences.push(this.mapSequenceRowToEmailSequence(
          row,
          steps.map((s: SequenceStepRow) => this.mapStepRowToSequenceStep(s))
        ));
      }

      return Result.ok({
        sequences,
        total: Number(countResult.count),
      });
    } catch (error) {
      return Result.fail(`Failed to list sequences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enroll an entity in a sequence
   */
  async enrollInSequence(
    tenantId: string,
    sequenceId: string,
    input: EnrollInSequenceInput
  ): Promise<Result<SequenceEnrollment>> {
    try {
      // Check if sequence exists and is active
      const sequenceResult = await this.getSequence(tenantId, sequenceId);
      if (sequenceResult.isFailure || !sequenceResult.value) {
        return Result.fail('Sequence not found');
      }

      const sequence = sequenceResult.value;
      if (!sequence.isActive) {
        return Result.fail('Sequence is not active');
      }

      // Check if already enrolled
      const [existing] = await this.db.select()
        .from(sequenceEnrollments)
        .where(and(
          eq(sequenceEnrollments.sequenceId, sequenceId),
          eq(sequenceEnrollments.entityType, input.entityType),
          eq(sequenceEnrollments.entityId, input.entityId)
        ));

      if (existing && existing.status === 'active') {
        return Result.fail('Entity is already enrolled in this sequence');
      }

      // Get first step
      const firstStep = sequence.steps.find((s: SequenceStep) => s.order === 1);

      const [enrollmentRow] = await this.db.insert(sequenceEnrollments).values({
        id: uuidv4(),
        tenantId,
        sequenceId,
        entityType: input.entityType,
        entityId: input.entityId,
        email: input.email,
        currentStepId: firstStep?.id,
        status: 'active',
        enrolledAt: new Date(),
        nextStepAt: this.calculateNextStepTime(sequence.settings, firstStep),
      }).returning();

      return Result.ok(this.mapEnrollmentRowToSequenceEnrollment(enrollmentRow));
    } catch (error) {
      return Result.fail(`Failed to enroll in sequence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Pause enrollment
   */
  async pauseEnrollment(tenantId: string, enrollmentId: string): Promise<Result<void>> {
    try {
      await this.db.update(sequenceEnrollments)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(and(
          eq(sequenceEnrollments.tenantId, tenantId),
          eq(sequenceEnrollments.id, enrollmentId)
        ));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to pause enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resume enrollment
   */
  async resumeEnrollment(tenantId: string, enrollmentId: string): Promise<Result<void>> {
    try {
      await this.db.update(sequenceEnrollments)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(and(
          eq(sequenceEnrollments.tenantId, tenantId),
          eq(sequenceEnrollments.id, enrollmentId),
          eq(sequenceEnrollments.status, 'paused')
        ));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to resume enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Exit enrollment
   */
  async exitEnrollment(tenantId: string, enrollmentId: string, reason: string): Promise<Result<void>> {
    try {
      await this.db.update(sequenceEnrollments)
        .set({
          status: 'exited',
          exitReason: reason,
          exitedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(sequenceEnrollments.tenantId, tenantId),
          eq(sequenceEnrollments.id, enrollmentId)
        ));

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to exit enrollment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enrollments for a sequence
   */
  async getSequenceEnrollments(
    tenantId: string,
    sequenceId: string,
    options: { status?: string; limit?: number; offset?: number }
  ): Promise<Result<{ enrollments: SequenceEnrollment[]; total: number }>> {
    try {
      const conditions = [
        eq(sequenceEnrollments.tenantId, tenantId),
        eq(sequenceEnrollments.sequenceId, sequenceId),
      ];

      if (options.status) {
        conditions.push(eq(sequenceEnrollments.status, options.status));
      }

      const [countResult] = await this.db.select({ count: sql<number>`count(*)` })
        .from(sequenceEnrollments)
        .where(and(...conditions));

      const rows = await this.db.select()
        .from(sequenceEnrollments)
        .where(and(...conditions))
        .orderBy(desc(sequenceEnrollments.enrolledAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      return Result.ok({
        enrollments: rows.map((r: SequenceEnrollmentRow) => this.mapEnrollmentRowToSequenceEnrollment(r)),
        total: Number(countResult.count),
      });
    } catch (error) {
      return Result.fail(`Failed to get enrollments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Email Templates Operations ====================

  /**
   * Create an email template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      subject: string;
      body: string;
      htmlBody?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<Result<EmailTemplateRow>> {
    try {
      const [templateRow] = await this.db.insert(emailTemplates).values({
        id: uuidv4(),
        tenantId,
        name: input.name,
        description: input.description,
        subject: input.subject,
        body: input.body,
        htmlBody: input.htmlBody,
        category: input.category,
        tags: input.tags || [],
        createdBy: userId,
      }).returning();

      return Result.ok(templateRow);
    } catch (error) {
      return Result.fail(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List templates
   */
  async listTemplates(
    tenantId: string,
    options: { category?: string; isActive?: boolean; limit?: number; offset?: number }
  ): Promise<Result<{ templates: EmailTemplateRow[]; total: number }>> {
    try {
      const conditions = [eq(emailTemplates.tenantId, tenantId)];

      if (options.category) {
        conditions.push(eq(emailTemplates.category, options.category));
      }
      if (options.isActive !== undefined) {
        conditions.push(eq(emailTemplates.isActive, options.isActive));
      }

      const [countResult] = await this.db.select({ count: sql<number>`count(*)` })
        .from(emailTemplates)
        .where(and(...conditions));

      const templates = await this.db.select()
        .from(emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(emailTemplates.createdAt))
        .limit(options.limit || 50)
        .offset(options.offset || 0);

      return Result.ok({
        templates,
        total: Number(countResult.count),
      });
    } catch (error) {
      return Result.fail(`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Helper Methods ====================

  private generateTrackingId(): string {
    return `trk_${uuidv4().replace(/-/g, '')}`;
  }

  private generatePixelUrl(trackingId: string): string {
    return `${this.baseTrackingUrl}/pixel/${trackingId}.gif`;
  }

  private generateLinkTrackingUrl(trackingId: string, linkId: string): string {
    return `${this.baseTrackingUrl}/click/${trackingId}/${linkId}`;
  }

  private async recordEvent(
    tenantId: string,
    emailId: string,
    trackingId: string,
    eventType: TrackingEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.db.insert(trackingEvents).values({
      id: uuidv4(),
      tenantId,
      emailId,
      trackingId,
      eventType,
      linkId: data.linkId as string | undefined,
      clickedUrl: data.clickedUrl as string | undefined,
      ipAddress: data.ipAddress as string | undefined,
      userAgent: data.userAgent as string | undefined,
      deviceType: this.parseDeviceType(data.userAgent as string),
      browser: this.parseBrowser(data.userAgent as string),
      os: this.parseOS(data.userAgent as string),
      isUnique: data.isUnique as boolean || false,
      isFirstEvent: data.isFirstEvent as boolean || false,
      metadata: data,
      occurredAt: new Date(),
    });
  }

  private async isUniqueEvent(
    emailId: string,
    eventType: string,
    ipAddress?: string,
    userAgent?: string,
    linkId?: string
  ): Promise<boolean> {
    const conditions = [
      eq(trackingEvents.emailId, emailId),
      eq(trackingEvents.eventType, eventType),
    ];

    if (ipAddress) {
      conditions.push(eq(trackingEvents.ipAddress, ipAddress));
    }
    if (linkId) {
      conditions.push(eq(trackingEvents.linkId, linkId));
    }

    const [existing] = await this.db.select({ count: sql<number>`count(*)` })
      .from(trackingEvents)
      .where(and(...conditions));

    return Number(existing.count) === 0;
  }

  private async calculateTrends(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month'
  ): Promise<{ date: string; sent: number; opened: number; clicked: number }[]> {
    // Simplified trend calculation
    const emails = await this.db.select()
      .from(trackedEmails)
      .where(and(
        eq(trackedEmails.tenantId, tenantId),
        gte(trackedEmails.sentAt, startDate),
        lte(trackedEmails.sentAt, endDate)
      ));

    const trendMap = new Map<string, { sent: number; opened: number; clicked: number }>();

    for (const email of emails) {
      if (!email.sentAt) continue;

      let dateKey: string;
      const date = new Date(email.sentAt);

      if (groupBy === 'day') {
        dateKey = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { sent: 0, opened: 0, clicked: 0 });
      }

      const trend = trendMap.get(dateKey)!;
      trend.sent++;
      if (email.firstOpenedAt) trend.opened++;
      if (email.firstClickedAt) trend.clicked++;
    }

    return Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateNextStepTime(settings: SequenceSettings, step?: SequenceStep): Date {
    const now = new Date();

    if (!step) {
      return now;
    }

    if (step.type === 'wait') {
      const waitMs = ((step.waitDays || 0) * 24 * 60 + (step.waitHours || 0) * 60) * 60 * 1000;
      return new Date(now.getTime() + waitMs);
    }

    // For email steps, schedule within sending window
    const startTime = settings.sendingWindow?.startTime || '09:00';
    const endTime = settings.sendingWindow?.endTime || '17:00';
    const [startHour] = startTime.split(':').map(Number);
    const [endHour] = endTime.split(':').map(Number);

    const nextTime = new Date(now);
    if (now.getHours() >= endHour) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    nextTime.setHours(startHour, 0, 0, 0);

    return nextTime;
  }

  private parseDeviceType(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private parseBrowser(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/chrome/i.test(userAgent)) return 'Chrome';
    if (/firefox/i.test(userAgent)) return 'Firefox';
    if (/safari/i.test(userAgent)) return 'Safari';
    if (/edge/i.test(userAgent)) return 'Edge';
    if (/msie|trident/i.test(userAgent)) return 'IE';
    return 'Other';
  }

  private parseOS(userAgent?: string): string {
    if (!userAgent) return 'unknown';
    if (/windows/i.test(userAgent)) return 'Windows';
    if (/mac/i.test(userAgent)) return 'macOS';
    if (/linux/i.test(userAgent)) return 'Linux';
    if (/android/i.test(userAgent)) return 'Android';
    if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
    return 'Other';
  }

  // ==================== Mapping Methods ====================

  private mapEmailRowToTrackedEmail(row: TrackedEmailRow, links: TrackedLink[]): TrackedEmail {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      messageId: row.messageId,
      threadId: row.threadId || undefined,
      subject: row.subject,
      fromEmail: row.fromEmail,
      fromName: row.fromName || undefined,
      toEmail: row.toEmail,
      toName: row.toName || undefined,
      ccEmails: row.ccEmails as string[],
      bccEmails: row.bccEmails as string[],
      entityType: row.entityType as TrackedEmail['entityType'],
      entityId: row.entityId || undefined,
      trackingId: row.trackingId,
      pixelUrl: row.pixelUrl,
      status: row.status as EmailStatus,
      openCount: row.openCount,
      clickCount: row.clickCount,
      firstOpenedAt: row.firstOpenedAt || undefined,
      lastOpenedAt: row.lastOpenedAt || undefined,
      firstClickedAt: row.firstClickedAt || undefined,
      lastClickedAt: row.lastClickedAt || undefined,
      trackedLinks: links,
      sentAt: row.sentAt || undefined,
      deliveredAt: row.deliveredAt || undefined,
      bouncedAt: row.bouncedAt || undefined,
      bounceType: row.bounceType as TrackedEmail['bounceType'],
      bounceReason: row.bounceReason || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapLinkRowToTrackedLink(row: TrackedLinkRow): TrackedLink {
    return {
      id: row.id,
      emailId: row.emailId,
      originalUrl: row.originalUrl,
      trackingUrl: row.trackingUrl,
      linkType: row.linkType as LinkType,
      anchorText: row.anchorText || undefined,
      position: row.position,
      clickCount: row.clickCount,
      firstClickedAt: row.firstClickedAt || undefined,
      lastClickedAt: row.lastClickedAt || undefined,
      createdAt: row.createdAt,
    };
  }

  private mapEventRowToTrackingEvent(row: TrackingEventRow): TrackingEvent {
    return {
      id: row.id,
      tenantId: row.tenantId,
      emailId: row.emailId,
      trackingId: row.trackingId,
      eventType: row.eventType as TrackingEventType,
      linkId: row.linkId || undefined,
      clickedUrl: row.clickedUrl || undefined,
      ipAddress: row.ipAddress || undefined,
      userAgent: row.userAgent || undefined,
      deviceType: row.deviceType || undefined,
      browser: row.browser || undefined,
      os: row.os || undefined,
      country: row.country || undefined,
      city: row.city || undefined,
      metadata: row.metadata as Record<string, unknown>,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    };
  }

  private mapSequenceRowToEmailSequence(row: EmailSequenceRow, steps: SequenceStep[]): EmailSequence {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description || undefined,
      steps,
      settings: row.settings as SequenceSettings,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapStepRowToSequenceStep(row: SequenceStepRow): SequenceStep {
    return {
      id: row.id,
      sequenceId: row.sequenceId,
      order: row.order,
      type: row.type as SequenceStep['type'],
      templateId: row.templateId || undefined,
      subject: row.subject || undefined,
      body: row.body || undefined,
      waitDays: row.waitDays || undefined,
      waitHours: row.waitHours || undefined,
      waitUntilTime: row.waitUntilTime || undefined,
      skipWeekends: row.skipWeekends,
      condition: row.condition as SequenceStep['condition'],
      sentCount: row.sentCount,
      openCount: row.openCount,
      clickCount: row.clickCount,
      replyCount: row.replyCount,
    };
  }

  private mapEnrollmentRowToSequenceEnrollment(row: SequenceEnrollmentRow): SequenceEnrollment {
    return {
      id: row.id,
      sequenceId: row.sequenceId,
      entityType: row.entityType as SequenceEnrollment['entityType'],
      entityId: row.entityId,
      email: row.email,
      currentStepId: row.currentStepId || '',
      status: row.status as SequenceEnrollment['status'],
      exitReason: row.exitReason || undefined,
      enrolledAt: row.enrolledAt,
      completedAt: row.completedAt || undefined,
      exitedAt: row.exitedAt || undefined,
      lastActivityAt: row.lastActivityAt || undefined,
    };
  }
}
