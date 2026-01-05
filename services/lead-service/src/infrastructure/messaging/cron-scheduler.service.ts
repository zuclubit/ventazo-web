/**
 * Cron Scheduler Service
 * Manages scheduled jobs for automatic notifications and alerts
 *
 * This service runs periodic tasks for:
 * - Task due/overdue notifications
 * - Follow-up reminders
 * - Contract expiration alerts
 * - Quote expiration alerts
 * - Payment reminders
 * - Digest emails
 */

import { container } from 'tsyringe';
import { ScheduledAlertsService, ScheduledAlertResult } from './scheduled-alerts.service';
import { InvitationService } from '../auth';

interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression or interval description
  handler: () => Promise<ScheduledAlertResult | void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

interface CronSchedulerStats {
  isRunning: boolean;
  jobsConfigured: number;
  jobsEnabled: number;
  lastRunTime?: Date;
  nextRunTime?: Date;
  results: Record<string, {
    lastRun?: Date;
    success: boolean;
    sent: number;
    failed: number;
  }>;
}

/**
 * Cron Scheduler Service
 * Singleton service for managing scheduled notification jobs
 */
export class CronSchedulerService {
  private static instance: CronSchedulerService;
  private alertsService: ScheduledAlertsService;
  private jobs: Map<string, CronJobConfig> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private results: Map<string, {
    lastRun?: Date;
    success: boolean;
    sent: number;
    failed: number;
  }> = new Map();

  private constructor() {
    this.alertsService = ScheduledAlertsService.getInstance();
    this.initializeJobs();
  }

  static getInstance(): CronSchedulerService {
    if (!CronSchedulerService.instance) {
      CronSchedulerService.instance = new CronSchedulerService();
    }
    return CronSchedulerService.instance;
  }

  /**
   * Initialize all scheduled jobs
   */
  private initializeJobs(): void {
    // Task alerts - run every 15 minutes
    this.jobs.set('task-due-today', {
      name: 'Task Due Today Alerts',
      schedule: 'Every 15 minutes (8am-6pm)',
      handler: async () => this.alertsService.sendTaskDueTodayAlerts(),
      enabled: true,
    });

    this.jobs.set('task-overdue', {
      name: 'Task Overdue Alerts',
      schedule: 'Every hour',
      handler: async () => this.alertsService.sendTaskOverdueAlerts(),
      enabled: true,
    });

    // Follow-up alerts - run every 30 minutes
    this.jobs.set('follow-up-due-today', {
      name: 'Follow-up Due Today Alerts',
      schedule: 'Every 30 minutes (8am-6pm)',
      handler: async () => this.alertsService.sendFollowUpDueTodayAlerts(),
      enabled: true,
    });

    this.jobs.set('follow-up-overdue', {
      name: 'Follow-up Overdue Alerts',
      schedule: 'Every hour',
      handler: async () => this.alertsService.sendFollowUpOverdueAlerts(),
      enabled: true,
    });

    // Contract expiration alerts - run daily at 9am
    this.jobs.set('contract-expiring', {
      name: 'Contract Expiration Alerts',
      schedule: 'Daily at 9:00 AM',
      handler: async () => this.alertsService.sendContractExpiringAlerts(),
      enabled: true,
    });

    // Quote expiration alerts - run twice daily
    this.jobs.set('quote-expiring', {
      name: 'Quote Expiration Alerts',
      schedule: 'Twice daily (9am, 3pm)',
      handler: async () => this.alertsService.sendQuoteExpiringAlerts(),
      enabled: true,
    });

    // Opportunity overdue alerts - run daily
    this.jobs.set('opportunity-overdue', {
      name: 'Opportunity Overdue Alerts',
      schedule: 'Daily at 10:00 AM',
      handler: async () => this.alertsService.sendOpportunityOverdueAlerts(),
      enabled: true,
    });

    // Payment reminder alerts - run daily at 9am
    this.jobs.set('payment-reminders', {
      name: 'Payment Reminder Alerts',
      schedule: 'Daily at 9:00 AM',
      handler: async () => this.alertsService.sendPaymentReminderAlerts(),
      enabled: true,
    });

    // Invitation expiration cleanup - run daily at midnight
    this.jobs.set('invitation-expiration', {
      name: 'Invitation Expiration Cleanup',
      schedule: 'Daily at 00:00 AM',
      handler: async () => this.expireOldInvitations(),
      enabled: true,
    });

    // Invitation reminder - run daily at 10am (2 days before expiration)
    this.jobs.set('invitation-reminder', {
      name: 'Invitation Expiration Reminder',
      schedule: 'Daily at 10:00 AM',
      handler: async () => this.sendInvitationExpirationReminders(),
      enabled: true,
    });

    console.log(`[CronScheduler] Initialized ${this.jobs.size} scheduled jobs`);
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('[CronScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[CronScheduler] Starting scheduled jobs...');

    // Task due today - every 15 minutes during business hours
    this.scheduleBusinessHoursJob('task-due-today', 15 * 60 * 1000);

    // Task overdue - every hour
    this.scheduleJob('task-overdue', 60 * 60 * 1000);

    // Follow-up due today - every 30 minutes during business hours
    this.scheduleBusinessHoursJob('follow-up-due-today', 30 * 60 * 1000);

    // Follow-up overdue - every hour
    this.scheduleJob('follow-up-overdue', 60 * 60 * 1000);

    // Contract expiring - once daily at 9am (check every hour, run if 9am)
    this.scheduleDailyJob('contract-expiring', 9);

    // Quote expiring - twice daily (9am, 3pm)
    this.scheduleTwiceDailyJob('quote-expiring', 9, 15);

    // Opportunity overdue - daily at 10am
    this.scheduleDailyJob('opportunity-overdue', 10);

    // Payment reminders - daily at 9am
    this.scheduleDailyJob('payment-reminders', 9);

    // Invitation expiration cleanup - daily at midnight
    this.scheduleDailyJob('invitation-expiration', 0);

    // Invitation reminder - daily at 10am
    this.scheduleDailyJob('invitation-reminder', 10);

    console.log('[CronScheduler] All jobs scheduled successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('[CronScheduler] Not running');
      return;
    }

    console.log('[CronScheduler] Stopping scheduled jobs...');

    for (const [jobId, interval] of this.intervals) {
      clearInterval(interval);
      console.log(`[CronScheduler] Stopped job: ${jobId}`);
    }

    this.intervals.clear();
    this.isRunning = false;

    console.log('[CronScheduler] All jobs stopped');
  }

  /**
   * Schedule a job at a fixed interval
   */
  private scheduleJob(jobId: string, intervalMs: number): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    const interval = setInterval(async () => {
      await this.runJob(jobId);
    }, intervalMs);

    this.intervals.set(jobId, interval);
    console.log(`[CronScheduler] Scheduled ${jobId} every ${intervalMs / 60000} minutes`);
  }

  /**
   * Schedule a job during business hours only (8am - 6pm)
   */
  private scheduleBusinessHoursJob(jobId: string, intervalMs: number): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    const interval = setInterval(async () => {
      const hour = new Date().getHours();
      if (hour >= 8 && hour < 18) {
        await this.runJob(jobId);
      }
    }, intervalMs);

    this.intervals.set(jobId, interval);
    console.log(`[CronScheduler] Scheduled ${jobId} every ${intervalMs / 60000} minutes (8am-6pm)`);
  }

  /**
   * Schedule a job to run once daily at a specific hour
   */
  private scheduleDailyJob(jobId: string, hour: number): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    let lastRunDate: string | null = null;

    // Check every 30 minutes
    const interval = setInterval(async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDate = now.toDateString();

      // Run if it's the target hour and we haven't run today
      if (currentHour === hour && lastRunDate !== currentDate) {
        lastRunDate = currentDate;
        await this.runJob(jobId);
      }
    }, 30 * 60 * 1000);

    this.intervals.set(jobId, interval);
    console.log(`[CronScheduler] Scheduled ${jobId} daily at ${hour}:00`);
  }

  /**
   * Schedule a job to run twice daily
   */
  private scheduleTwiceDailyJob(jobId: string, hour1: number, hour2: number): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    let lastRunHour: number | null = null;

    // Check every 30 minutes
    const interval = setInterval(async () => {
      const currentHour = new Date().getHours();

      // Run at specified hours if we haven't run at this hour yet
      if ((currentHour === hour1 || currentHour === hour2) && lastRunHour !== currentHour) {
        lastRunHour = currentHour;
        await this.runJob(jobId);
      }
    }, 30 * 60 * 1000);

    this.intervals.set(jobId, interval);
    console.log(`[CronScheduler] Scheduled ${jobId} at ${hour1}:00 and ${hour2}:00`);
  }

  /**
   * Run a specific job
   */
  private async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`[CronScheduler] Job not found: ${jobId}`);
      return;
    }

    console.log(`[CronScheduler] Running job: ${jobId}`);
    const startTime = Date.now();

    try {
      const result = await job.handler();
      const duration = Date.now() - startTime;

      if (result) {
        this.results.set(jobId, {
          lastRun: new Date(),
          success: true,
          sent: result.sent,
          failed: result.failed,
        });
        console.log(`[CronScheduler] Job ${jobId} completed in ${duration}ms - sent: ${result.sent}, failed: ${result.failed}`);
      } else {
        this.results.set(jobId, {
          lastRun: new Date(),
          success: true,
          sent: 0,
          failed: 0,
        });
        console.log(`[CronScheduler] Job ${jobId} completed in ${duration}ms`);
      }

      job.lastRun = new Date();
    } catch (error) {
      this.results.set(jobId, {
        lastRun: new Date(),
        success: false,
        sent: 0,
        failed: 1,
      });
      console.error(`[CronScheduler] Job ${jobId} failed:`, error);
    }
  }

  /**
   * Run all alerts immediately (for testing/manual trigger)
   */
  async runAllNow(tenantId?: string): Promise<Record<string, ScheduledAlertResult>> {
    console.log('[CronScheduler] Running all alerts immediately...');

    const results: Record<string, ScheduledAlertResult> = {};

    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        try {
          const result = await job.handler();
          if (result) {
            results[jobId] = result;
          }
        } catch (error) {
          console.error(`[CronScheduler] Job ${jobId} failed:`, error);
          results[jobId] = { sent: 0, failed: 1, alerts: [] };
        }
      }
    }

    return results;
  }

  /**
   * Run a specific alert type immediately
   */
  async runNow(jobId: string): Promise<ScheduledAlertResult | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`[CronScheduler] Job not found: ${jobId}`);
      return null;
    }

    try {
      const result = await job.handler();
      return result || { sent: 0, failed: 0, alerts: [] };
    } catch (error) {
      console.error(`[CronScheduler] Job ${jobId} failed:`, error);
      return { sent: 0, failed: 1, alerts: [] };
    }
  }

  /**
   * Enable or disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = enabled;
      console.log(`[CronScheduler] Job ${jobId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats(): CronSchedulerStats {
    const resultsObj: CronSchedulerStats['results'] = {};

    for (const [jobId, result] of this.results) {
      resultsObj[jobId] = result;
    }

    return {
      isRunning: this.isRunning,
      jobsConfigured: this.jobs.size,
      jobsEnabled: Array.from(this.jobs.values()).filter(j => j.enabled).length,
      results: resultsObj,
    };
  }

  /**
   * Get list of all jobs with their configurations
   */
  getJobs(): Array<{
    id: string;
    name: string;
    schedule: string;
    enabled: boolean;
    lastRun?: Date;
    lastResult?: {
      success: boolean;
      sent: number;
      failed: number;
    };
  }> {
    return Array.from(this.jobs.entries()).map(([id, job]) => {
      const result = this.results.get(id);
      return {
        id,
        name: job.name,
        schedule: job.schedule,
        enabled: job.enabled,
        lastRun: job.lastRun,
        lastResult: result ? {
          success: result.success,
          sent: result.sent,
          failed: result.failed,
        } : undefined,
      };
    });
  }

  // ============================================
  // Invitation Expiration Jobs
  // ============================================

  /**
   * Expire old invitations that have passed their expiration date
   * Changes status from 'pending' to 'expired'
   */
  private async expireOldInvitations(): Promise<ScheduledAlertResult> {
    console.log('[CronScheduler] Running invitation expiration cleanup...');

    try {
      const invitationService = container.resolve(InvitationService);
      const result = await invitationService.expireOldInvitations();

      if (result.isSuccess) {
        const expiredCount = result.value || 0;
        console.log(`[CronScheduler] Expired ${expiredCount} invitations`);
        return {
          alertType: 'invitation_expiration',
          processed: expiredCount,
          notificationsSent: expiredCount,
          errors: [],
        };
      } else {
        console.error('[CronScheduler] Failed to expire invitations:', result.error);
        return {
          alertType: 'invitation_expiration',
          processed: 0,
          notificationsSent: 0,
          errors: [{ entityId: 'system', error: result.error || 'Unknown error' }],
        };
      }
    } catch (error) {
      console.error('[CronScheduler] Error expiring invitations:', error);
      return {
        alertType: 'invitation_expiration',
        processed: 0,
        notificationsSent: 0,
        errors: [{ entityId: 'system', error: String(error) }],
      };
    }
  }

  /**
   * Send reminder emails for invitations that will expire in 2 days
   */
  private async sendInvitationExpirationReminders(): Promise<ScheduledAlertResult> {
    console.log('[CronScheduler] Checking for invitations expiring soon...');

    try {
      const invitationService = container.resolve(InvitationService);
      const result = await invitationService.sendExpirationReminders();

      if (result.isSuccess) {
        const sentCount = result.value || 0;
        console.log(`[CronScheduler] Sent ${sentCount} invitation expiration reminders`);
        return {
          alertType: 'invitation_expiration_reminder',
          processed: sentCount,
          notificationsSent: sentCount,
          errors: [],
        };
      } else {
        console.error('[CronScheduler] Failed to send reminders:', result.error);
        return {
          alertType: 'invitation_expiration_reminder',
          processed: 0,
          notificationsSent: 0,
          errors: [{ entityId: 'system', error: result.error || 'Unknown error' }],
        };
      }
    } catch (error) {
      console.error('[CronScheduler] Error sending reminders:', error);
      return {
        alertType: 'invitation_expiration_reminder',
        processed: 0,
        notificationsSent: 0,
        errors: [{ entityId: 'system', error: String(error) }],
      };
    }
  }
}

/**
 * Get the cron scheduler instance
 */
export function getCronScheduler(): CronSchedulerService {
  return CronSchedulerService.getInstance();
}

/**
 * Start the cron scheduler
 */
export function startCronScheduler(): void {
  const scheduler = getCronScheduler();
  scheduler.start();
}

/**
 * Stop the cron scheduler
 */
export function stopCronScheduler(): void {
  const scheduler = getCronScheduler();
  scheduler.stop();
}
