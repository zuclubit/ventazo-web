/**
 * Email Tracking Types
 * Types for tracking email opens, clicks, and engagement analytics
 */

// ==================== Event Types ====================

export type TrackingEventType = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';

export type EmailStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export type BounceType = 'soft' | 'hard';

export type LinkType = 'primary_cta' | 'secondary_cta' | 'inline' | 'footer' | 'unsubscribe' | 'social' | 'other';

// ==================== Tracked Email ====================

export interface TrackedEmail {
  id: string;
  tenantId: string;
  userId: string;

  // Email details
  messageId: string;
  threadId?: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];

  // Entity association
  entityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  entityId?: string;

  // Tracking
  trackingId: string;
  pixelUrl: string;
  status: EmailStatus;

  // Engagement metrics
  openCount: number;
  clickCount: number;
  firstOpenedAt?: Date;
  lastOpenedAt?: Date;
  firstClickedAt?: Date;
  lastClickedAt?: Date;

  // Links
  trackedLinks: TrackedLink[];

  // Timestamps
  sentAt?: Date;
  deliveredAt?: Date;
  bouncedAt?: Date;
  bounceType?: BounceType;
  bounceReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrackedLink {
  id: string;
  emailId: string;
  originalUrl: string;
  trackingUrl: string;
  linkType: LinkType;
  anchorText?: string;
  position: number;
  clickCount: number;
  firstClickedAt?: Date;
  lastClickedAt?: Date;
  createdAt: Date;
}

// ==================== Tracking Events ====================

export interface TrackingEvent {
  id: string;
  tenantId: string;
  emailId: string;
  trackingId: string;

  eventType: TrackingEventType;

  // Event details
  linkId?: string;
  clickedUrl?: string;

  // Device/Client info
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  country?: string;
  city?: string;

  // Metadata
  metadata: Record<string, unknown>;

  // Timestamp
  occurredAt: Date;
  createdAt: Date;
}

export interface OpenEvent extends TrackingEvent {
  eventType: 'opened';
  isFirstOpen: boolean;
  isUnique: boolean;
}

export interface ClickEvent extends TrackingEvent {
  eventType: 'clicked';
  linkId: string;
  clickedUrl: string;
  isFirstClick: boolean;
  isUnique: boolean;
}

export interface BounceEvent extends TrackingEvent {
  eventType: 'bounced';
  bounceType: BounceType;
  bounceReason: string;
  diagnosticCode?: string;
}

// ==================== Analytics ====================

export interface EmailAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    bounceRate: number;
    complaintRate: number;
    unsubscribeRate: number;
  };
  trends: {
    date: string;
    sent: number;
    opened: number;
    clicked: number;
  }[];
}

export interface LinkAnalytics {
  linkId: string;
  originalUrl: string;
  linkType: LinkType;
  anchorText?: string;
  totalClicks: number;
  uniqueClicks: number;
  clickRate: number;
  clicksByDevice: Record<string, number>;
  clicksByCountry: Record<string, number>;
}

export interface EmailPerformance {
  emailId: string;
  subject: string;
  sentAt?: Date;
  recipientEmail: string;
  recipientName?: string;
  status: EmailStatus;
  openCount: number;
  clickCount: number;
  uniqueOpens: number;
  uniqueClicks: number;
  engagementScore: number;
  timeline: TrackingEvent[];
}

export interface CampaignAnalytics {
  campaignId: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    emailsSent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  topPerformingEmails: EmailPerformance[];
  linkPerformance: LinkAnalytics[];
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
}

export interface UserEmailStats {
  userId: string;
  period: {
    start: Date;
    end: Date;
  };
  totals: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
  };
  rates: {
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
  };
  recentActivity: TrackedEmail[];
  topEngaged: {
    entityType: string;
    entityId: string;
    entityName: string;
    emailCount: number;
    openCount: number;
    clickCount: number;
  }[];
}

// ==================== Sequence/Cadence ====================

export interface EmailSequence {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  settings: SequenceSettings;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  order: number;
  type: 'email' | 'wait' | 'condition';

  // For email steps
  templateId?: string;
  subject?: string;
  body?: string;

  // For wait steps
  waitDays?: number;
  waitHours?: number;
  waitUntilTime?: string;
  skipWeekends?: boolean;

  // For condition steps
  condition?: {
    field: string;
    operator: string;
    value: unknown;
  };

  // Stats
  sentCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
}

export interface SequenceSettings {
  sendingWindow?: {
    startTime?: string;
    endTime?: string;
    timezone?: string;
    sendDays?: number[];
  };
  exitConditions?: {
    onReply?: boolean;
    onClick?: boolean;
    onUnsubscribe?: boolean;
    onBounce?: boolean;
    onConversion?: boolean;
  };
  throttling?: {
    maxPerDay?: number;
    delayBetweenEmails?: number;
  };
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  entityType: 'lead' | 'contact' | 'customer';
  entityId: string;
  email: string;
  currentStepId: string;
  status: 'active' | 'paused' | 'completed' | 'exited' | 'bounced';
  exitReason?: string;
  enrolledAt: Date;
  completedAt?: Date;
  exitedAt?: Date;
  lastActivityAt?: Date;
}

// ==================== DTOs ====================

export interface CreateTrackedEmailInput {
  messageId: string;
  threadId?: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  entityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  entityId?: string;
  htmlBody: string;
  links?: Array<{
    originalUrl: string;
    anchorText?: string;
    linkType?: LinkType;
    position: number;
  }>;
}

export interface RecordOpenInput {
  trackingId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordClickInput {
  trackingId: string;
  linkId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  steps: Array<{
    type: 'email' | 'wait' | 'condition';
    templateId?: string;
    subject?: string;
    body?: string;
    waitDays?: number;
    waitHours?: number;
    waitUntilTime?: string;
    skipWeekends?: boolean;
    condition?: {
      field: string;
      operator: string;
      value?: unknown;
    };
  }>;
  settings?: Partial<SequenceSettings>;
}

export interface EnrollInSequenceInput {
  entityType: 'lead' | 'contact' | 'customer';
  entityId: string;
  email: string;
}

export interface GetAnalyticsInput {
  startDate: Date;
  endDate: Date;
  userId?: string;
  entityType?: string;
  entityId?: string;
  groupBy?: 'day' | 'week' | 'month';
}
