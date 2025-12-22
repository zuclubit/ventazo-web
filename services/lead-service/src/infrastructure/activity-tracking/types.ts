/**
 * Activity & Interaction Tracking Types
 *
 * Comprehensive tracking for all customer interactions:
 * - Calls, meetings, emails, notes
 * - Website visits and page views
 * - Form submissions and downloads
 * - Social media interactions
 * - Chat conversations
 * - Custom events and touchpoints
 */

/**
 * Activity Types
 */
export type ActivityType =
  | 'call'              // Phone call
  | 'email'             // Email sent/received
  | 'meeting'           // Meeting/appointment
  | 'note'              // Internal note
  | 'task'              // Task created/completed
  | 'sms'               // SMS/Text message
  | 'chat'              // Chat/live chat message
  | 'social'            // Social media interaction
  | 'page_view'         // Website page view
  | 'form_submission'   // Form submitted
  | 'download'          // Content download
  | 'event'             // Custom event
  | 'deal'              // Deal-related activity
  | 'quote'             // Quote activity
  | 'contract'          // Contract activity
  | 'payment'           // Payment activity
  | 'support_ticket'    // Support ticket
  | 'campaign_response' // Campaign response
  | 'webinar'           // Webinar attendance
  | 'demo'              // Demo/presentation
  | 'document'          // Document shared/viewed
  | 'integration'       // Third-party integration event
  | 'system';           // System-generated activity

/**
 * Activity Direction (for communications)
 */
export type ActivityDirection = 'inbound' | 'outbound' | 'internal';

/**
 * Activity Status
 */
export type ActivityStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'missed'
  | 'pending';

/**
 * Call Outcome
 */
export type CallOutcome =
  | 'connected'
  | 'voicemail'
  | 'busy'
  | 'no_answer'
  | 'wrong_number'
  | 'callback_scheduled'
  | 'not_interested'
  | 'qualified'
  | 'meeting_scheduled';

/**
 * Email Engagement Status
 */
export type EmailEngagementStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'replied'
  | 'bounced'
  | 'spam'
  | 'unsubscribed';

/**
 * Meeting Type
 */
export type MeetingType =
  | 'in_person'
  | 'video_call'
  | 'phone_call'
  | 'screen_share'
  | 'webinar'
  | 'conference';

/**
 * Activity Priority
 */
export type ActivityPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Entity Type for activity tracking
 */
export type TrackedEntityType =
  | 'lead'
  | 'contact'
  | 'customer'
  | 'deal'
  | 'opportunity'
  | 'account'
  | 'company';

/**
 * Activity
 */
export interface Activity {
  id: string;
  tenantId: string;

  // Entity reference
  entityType: TrackedEntityType;
  entityId: string;
  entityName?: string;

  // Activity details
  type: ActivityType;
  subtype?: string;
  subject: string;
  description?: string;
  direction?: ActivityDirection;
  status: ActivityStatus;
  priority?: ActivityPriority;

  // Timing
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
  scheduledAt?: Date;
  completedAt?: Date;

  // Assignment
  ownerId: string;
  ownerName?: string;
  assignedToId?: string;
  assignedToName?: string;

  // Related entities
  relatedLeadId?: string;
  relatedContactId?: string;
  relatedDealId?: string;
  relatedCampaignId?: string;
  relatedSequenceId?: string;
  relatedTaskId?: string;

  // Communication details
  callDetails?: CallDetails;
  emailDetails?: EmailDetails;
  meetingDetails?: MeetingDetails;
  smsDetails?: SMSDetails;
  chatDetails?: ChatDetails;

  // Web tracking
  webTrackingDetails?: WebTrackingDetails;

  // Form submission
  formSubmission?: FormSubmissionDetails;

  // Custom data
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];

  // Engagement score contribution
  engagementScore?: number;

  // Location
  location?: ActivityLocation;

  // Source
  source?: string;
  sourceSystem?: string;
  externalId?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

/**
 * Call Details
 */
export interface CallDetails {
  phoneNumber?: string;
  callerId?: string;
  outcome?: CallOutcome;
  recordingUrl?: string;
  recordingDuration?: number;
  transcription?: string;
  sentimentScore?: number;
  keyTopics?: string[];
  nextSteps?: string;
  callProvider?: string;
  callSid?: string;
}

/**
 * Email Details
 */
export interface EmailDetails {
  messageId?: string;
  threadId?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  bodyPreview?: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: EmailAttachment[];
  engagementStatus?: EmailEngagementStatus;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  clickedLinks?: string[];
  templateId?: string;
  sequenceStepId?: string;
}

/**
 * Email Attachment
 */
export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

/**
 * Meeting Details
 */
export interface MeetingDetails {
  meetingType?: MeetingType;
  location?: string;
  conferenceLink?: string;
  conferenceProvider?: string;
  calendarEventId?: string;
  attendees?: MeetingAttendee[];
  agenda?: string;
  notes?: string;
  outcome?: string;
  recordingUrl?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}

/**
 * Meeting Attendee
 */
export interface MeetingAttendee {
  id?: string;
  email: string;
  name?: string;
  isOrganizer?: boolean;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needs_action';
  isOptional?: boolean;
}

/**
 * SMS Details
 */
export interface SMSDetails {
  phoneNumber?: string;
  messageBody?: string;
  mediaUrls?: string[];
  deliveryStatus?: 'sent' | 'delivered' | 'failed' | 'undelivered';
  provider?: string;
  messageSid?: string;
}

/**
 * Chat Details
 */
export interface ChatDetails {
  channelId?: string;
  channelName?: string;
  platform?: 'website' | 'slack' | 'teams' | 'discord' | 'whatsapp' | 'messenger' | 'other';
  messages?: ChatMessage[];
  agentId?: string;
  agentName?: string;
  isResolved?: boolean;
  rating?: number;
  feedbackComment?: string;
}

/**
 * Chat Message
 */
export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'customer' | 'agent' | 'bot';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

/**
 * Web Tracking Details
 */
export interface WebTrackingDetails {
  sessionId?: string;
  visitorId?: string;
  pageUrl?: string;
  pageTitle?: string;
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
  timeOnPage?: number;
  scrollDepth?: number;
  eventName?: string;
  eventProperties?: Record<string, unknown>;
}

/**
 * Form Submission Details
 */
export interface FormSubmissionDetails {
  formId?: string;
  formName?: string;
  formUrl?: string;
  submittedData?: Record<string, unknown>;
  validationErrors?: string[];
  conversionValue?: number;
}

/**
 * Activity Location
 */
export interface ActivityLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Activity Timeline
 */
export interface ActivityTimeline {
  entityType: TrackedEntityType;
  entityId: string;
  activities: Activity[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Activity Summary
 */
export interface ActivitySummary {
  entityType: TrackedEntityType;
  entityId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all_time';
  periodStart?: Date;
  periodEnd?: Date;

  // Counts by type
  totalActivities: number;
  callCount: number;
  emailCount: number;
  meetingCount: number;
  noteCount: number;
  taskCount: number;
  smsCount: number;
  chatCount: number;
  webVisitCount: number;
  formSubmissionCount: number;
  otherCount: number;

  // Communication stats
  inboundCount: number;
  outboundCount: number;
  internalCount: number;

  // Engagement metrics
  totalEngagementScore: number;
  avgEngagementPerActivity: number;

  // Timing
  firstActivityAt?: Date;
  lastActivityAt?: Date;
  avgDaysBetweenActivities?: number;

  // Call metrics
  totalCallDuration?: number;
  avgCallDuration?: number;
  callConnectRate?: number;

  // Email metrics
  emailOpenRate?: number;
  emailClickRate?: number;
  emailReplyRate?: number;

  // Meeting metrics
  meetingAttendanceRate?: number;
  avgMeetingDuration?: number;
}

/**
 * Activity Stream
 */
export interface ActivityStream {
  tenantId: string;
  userId?: string;
  teamId?: string;

  activities: Activity[];
  hasMore: boolean;
  nextCursor?: string;

  filters?: ActivityStreamFilters;
}

/**
 * Activity Stream Filters
 */
export interface ActivityStreamFilters {
  entityTypes?: TrackedEntityType[];
  entityIds?: string[];
  activityTypes?: ActivityType[];
  ownerIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  status?: ActivityStatus[];
  direction?: ActivityDirection[];
  search?: string;
  tags?: string[];
}

/**
 * Activity Feed Item (enriched for display)
 */
export interface ActivityFeedItem {
  activity: Activity;
  entityDetails?: {
    type: TrackedEntityType;
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
    phone?: string;
  };
  ownerDetails?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  relatedActivities?: Activity[];
  engagementContext?: {
    previousActivity?: Activity;
    daysSinceLast?: number;
    totalInteractions?: number;
  };
}

/**
 * Activity Analytics
 */
export interface ActivityAnalytics {
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;

  // Overall metrics
  totalActivities: number;
  uniqueEntities: number;
  activeUsers: number;

  // By type breakdown
  byType: {
    type: ActivityType;
    count: number;
    percentage: number;
    avgDuration?: number;
    successRate?: number;
  }[];

  // By direction
  byDirection: {
    direction: ActivityDirection;
    count: number;
    percentage: number;
  }[];

  // By status
  byStatus: {
    status: ActivityStatus;
    count: number;
    percentage: number;
  }[];

  // By user
  byUser: {
    userId: string;
    userName: string;
    count: number;
    callCount: number;
    emailCount: number;
    meetingCount: number;
    avgEngagementScore: number;
  }[];

  // Time distribution
  byHour: { hour: number; count: number }[];
  byDayOfWeek: { day: number; count: number }[];

  // Trends
  dailyTrend: { date: Date; count: number; engagementScore: number }[];

  // Engagement metrics
  avgEngagementScore: number;
  highEngagementPercentage: number;

  // Response metrics
  avgResponseTime?: number;
  slaComplianceRate?: number;
}

/**
 * User Activity Stats
 */
export interface UserActivityStats {
  userId: string;
  userName: string;
  tenantId: string;

  period: 'day' | 'week' | 'month' | 'quarter';
  periodStart: Date;
  periodEnd: Date;

  // Activity counts
  totalActivities: number;
  callsMade: number;
  emailsSent: number;
  meetingsHeld: number;
  tasksCompleted: number;
  notesAdded: number;

  // Productivity
  avgActivitiesPerDay: number;
  mostActiveDay?: string;
  mostActiveHour?: number;

  // Call performance
  callConnectRate?: number;
  avgCallDuration?: number;
  totalCallTime?: number;

  // Email performance
  emailResponseRate?: number;
  avgEmailsPerDay?: number;

  // Meeting performance
  meetingsScheduled?: number;
  meetingsCompleted?: number;
  meetingCompletionRate?: number;

  // Engagement
  totalEngagementGenerated: number;
  avgEngagementPerActivity: number;

  // Comparison
  vsTeamAvg?: {
    activitiesVsAvg: number;
    engagementVsAvg: number;
    callsVsAvg: number;
    emailsVsAvg: number;
  };
}

/**
 * Team Activity Dashboard
 */
export interface TeamActivityDashboard {
  tenantId: string;
  teamId?: string;
  period: 'day' | 'week' | 'month';

  // Summary
  totalActivities: number;
  totalCalls: number;
  totalEmails: number;
  totalMeetings: number;

  // Active members
  activeMemberCount: number;
  avgActivitiesPerMember: number;

  // Top performers
  topPerformers: {
    userId: string;
    userName: string;
    activityCount: number;
    engagementScore: number;
    callConnectRate?: number;
  }[];

  // Recent activities
  recentActivities: Activity[];

  // Pending activities
  pendingActivities: Activity[];
  overdueActivities: Activity[];

  // Trends
  activityTrend: { date: Date; count: number }[];
  engagementTrend: { date: Date; score: number }[];
}

/**
 * Create Activity Input
 */
export interface CreateActivityInput {
  entityType: TrackedEntityType;
  entityId: string;
  entityName?: string;
  type: ActivityType;
  subtype?: string;
  subject: string;
  description?: string;
  direction?: ActivityDirection;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
  scheduledAt?: Date;
  assignedToId?: string;
  relatedLeadId?: string;
  relatedContactId?: string;
  relatedDealId?: string;
  relatedCampaignId?: string;
  relatedSequenceId?: string;
  relatedTaskId?: string;
  callDetails?: CallDetails;
  emailDetails?: EmailDetails;
  meetingDetails?: MeetingDetails;
  smsDetails?: SMSDetails;
  chatDetails?: ChatDetails;
  webTrackingDetails?: WebTrackingDetails;
  formSubmission?: FormSubmissionDetails;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  engagementScore?: number;
  location?: ActivityLocation;
  source?: string;
  sourceSystem?: string;
  externalId?: string;
}

/**
 * Update Activity Input
 */
export interface UpdateActivityInput {
  subject?: string;
  description?: string;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  startTime?: Date;
  endTime?: Date;
  durationMinutes?: number;
  completedAt?: Date;
  assignedToId?: string;
  callDetails?: Partial<CallDetails>;
  emailDetails?: Partial<EmailDetails>;
  meetingDetails?: Partial<MeetingDetails>;
  smsDetails?: Partial<SMSDetails>;
  chatDetails?: Partial<ChatDetails>;
  customFields?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
  engagementScore?: number;
}

/**
 * Activity Search Filters
 */
export interface ActivitySearchFilters {
  entityType?: TrackedEntityType;
  entityId?: string;
  entityIds?: string[];
  types?: ActivityType[];
  status?: ActivityStatus[];
  direction?: ActivityDirection[];
  priority?: ActivityPriority[];
  ownerId?: string;
  ownerIds?: string[];
  assignedToId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  search?: string;
  tags?: string[];
  hasEngagement?: boolean;
  minEngagementScore?: number;
  source?: string;
  relatedLeadId?: string;
  relatedContactId?: string;
  relatedDealId?: string;
  relatedCampaignId?: string;
}

/**
 * Activity Search Result
 */
export interface ActivitySearchResult {
  activities: Activity[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  aggregations?: {
    byType: { type: ActivityType; count: number }[];
    byStatus: { status: ActivityStatus; count: number }[];
    byOwner: { ownerId: string; ownerName: string; count: number }[];
  };
}

/**
 * Bulk Activity Operation
 */
export interface BulkActivityOperation {
  activityIds: string[];
  operation: 'update_status' | 'assign' | 'add_tags' | 'remove_tags' | 'delete';
  status?: ActivityStatus;
  assignToId?: string;
  tags?: string[];
}

/**
 * Bulk Activity Result
 */
export interface BulkActivityResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors?: { activityId: string; error: string }[];
}

/**
 * Activity Reminder
 */
export interface ActivityReminder {
  id: string;
  activityId: string;
  userId: string;
  tenantId: string;
  reminderAt: Date;
  message?: string;
  channels: ('email' | 'push' | 'sms')[];
  status: 'pending' | 'sent' | 'cancelled';
  sentAt?: Date;
  createdAt: Date;
}

/**
 * Activity Template
 */
export interface ActivityTemplate {
  id: string;
  tenantId: string;
  name: string;
  type: ActivityType;
  subject: string;
  description?: string;
  defaultDuration?: number;
  defaultPriority?: ActivityPriority;
  defaultTags?: string[];
  customFields?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
