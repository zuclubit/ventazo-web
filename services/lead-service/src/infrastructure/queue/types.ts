/**
 * Queue Types and Interfaces
 * Defines job types, payloads, and queue configuration
 */

export enum QueueName {
  LEAD_PROCESSING = 'lead-processing',
  EMAIL_NOTIFICATIONS = 'email-notifications',
  WEBHOOKS = 'webhooks',
  SCORING = 'lead-scoring',
  ANALYTICS = 'analytics',
  FOLLOW_UP_REMINDERS = 'follow-up-reminders',
}

export enum JobType {
  // Lead Processing Jobs
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_STATUS_CHANGED = 'lead.status_changed',
  LEAD_CONVERTED = 'lead.converted',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_SCORE_UPDATED = 'lead.score_updated',

  // Email Jobs
  SEND_WELCOME_EMAIL = 'email.welcome',
  SEND_FOLLOW_UP_REMINDER = 'email.follow_up_reminder',
  SEND_LEAD_ASSIGNMENT = 'email.lead_assignment',
  SEND_DAILY_DIGEST = 'email.daily_digest',
  SEND_WEEKLY_REPORT = 'email.weekly_report',

  // Webhook Jobs
  WEBHOOK_DELIVERY = 'webhook.delivery',
  WEBHOOK_RETRY = 'webhook.retry',

  // Scoring Jobs
  CALCULATE_LEAD_SCORE = 'scoring.calculate',
  RECALCULATE_ALL_SCORES = 'scoring.recalculate_all',
  APPLY_SCORING_RULES = 'scoring.apply_rules',

  // Analytics Jobs
  AGGREGATE_DAILY_STATS = 'analytics.daily_stats',
  GENERATE_REPORT = 'analytics.generate_report',
  SYNC_METRICS = 'analytics.sync_metrics',

  // Follow-up Jobs
  CHECK_OVERDUE_FOLLOW_UPS = 'follow_up.check_overdue',
  SEND_FOLLOW_UP_NOTIFICATION = 'follow_up.send_notification',
}

export interface BaseJobData {
  tenantId: string;
  correlationId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Lead Processing Job Payloads
export interface LeadCreatedJobData extends BaseJobData {
  leadId: string;
  companyName: string;
  email: string;
  source: string;
  createdBy?: string;
}

export interface LeadUpdatedJobData extends BaseJobData {
  leadId: string;
  changes: Record<string, { before: unknown; after: unknown }>;
  updatedBy?: string;
}

export interface LeadStatusChangedJobData extends BaseJobData {
  leadId: string;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  changedBy?: string;
}

export interface LeadConvertedJobData extends BaseJobData {
  leadId: string;
  customerId: string;
  convertedBy?: string;
  conversionData?: Record<string, unknown>;
}

export interface LeadAssignedJobData extends BaseJobData {
  leadId: string;
  previousOwnerId?: string | null;
  newOwnerId: string;
  assignedBy?: string;
}

export interface LeadScoreUpdatedJobData extends BaseJobData {
  leadId: string;
  previousScore: number;
  newScore: number;
  reason?: string;
  triggeredBy?: 'manual' | 'automatic' | 'rule';
}

// Email Job Payloads
export interface SendEmailJobData extends BaseJobData {
  to: string;
  toName?: string;
  subject: string;
  template: string;
  variables: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface DailyDigestJobData extends BaseJobData {
  userId: string;
  userEmail: string;
  userName?: string;
}

export interface WeeklyReportJobData extends BaseJobData {
  userId: string;
  userEmail: string;
  startDate: Date;
  endDate: Date;
}

// Webhook Job Payloads
export interface WebhookDeliveryJobData extends BaseJobData {
  webhookId: string;
  url: string;
  event: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  retryCount?: number;
  maxRetries?: number;
}

// Scoring Job Payloads
export interface CalculateLeadScoreJobData extends BaseJobData {
  leadId: string;
  triggeredBy?: 'event' | 'manual' | 'scheduled';
}

export interface ApplyScoringRulesJobData extends BaseJobData {
  leadId: string;
  ruleIds?: string[];
}

// Analytics Job Payloads
export interface AggregateDailyStatsJobData extends BaseJobData {
  date: Date;
}

export interface GenerateReportJobData extends BaseJobData {
  reportType: 'conversion' | 'pipeline' | 'performance' | 'custom';
  userId: string;
  parameters: Record<string, unknown>;
  outputFormat: 'json' | 'csv' | 'pdf';
}

// Follow-up Job Payloads
export interface CheckOverdueFollowUpsJobData extends BaseJobData {
  checkDate?: Date;
}

export interface FollowUpNotificationJobData extends BaseJobData {
  leadId: string;
  ownerId: string;
  ownerEmail: string;
  followUpDate: Date;
  companyName: string;
}

// Job Result Types
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

// Queue Configuration
export interface QueueConfig {
  name: QueueName;
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete: boolean | number;
    removeOnFail: boolean | number;
  };
  limiter?: {
    max: number;
    duration: number;
  };
  concurrency: number;
}

export const DEFAULT_QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  [QueueName.LEAD_PROCESSING]: {
    name: QueueName.LEAD_PROCESSING,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
    concurrency: 10,
  },
  [QueueName.EMAIL_NOTIFICATIONS]: {
    name: QueueName.EMAIL_NOTIFICATIONS,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
    limiter: { max: 100, duration: 60000 }, // 100 emails per minute
    concurrency: 5,
  },
  [QueueName.WEBHOOKS]: {
    name: QueueName.WEBHOOKS,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    },
    limiter: { max: 50, duration: 60000 },
    concurrency: 10,
  },
  [QueueName.SCORING]: {
    name: QueueName.SCORING,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
    concurrency: 5,
  },
  [QueueName.ANALYTICS]: {
    name: QueueName.ANALYTICS,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
    concurrency: 2,
  },
  [QueueName.FOLLOW_UP_REMINDERS]: {
    name: QueueName.FOLLOW_UP_REMINDERS,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
    concurrency: 5,
  },
};
