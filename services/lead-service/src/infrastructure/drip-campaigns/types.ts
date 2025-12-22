/**
 * Drip Campaign & Email Sequence Types
 *
 * Comprehensive automated email/messaging sequence management:
 * - Multi-step drip campaigns
 * - Trigger-based sequences
 * - Conditional branching
 * - Time-based delays
 * - Performance tracking
 * - A/B testing at each step
 */

/**
 * Sequence Status
 */
export type SequenceStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';

/**
 * Sequence Type
 */
export type SequenceType =
  | 'drip'            // Time-based drip campaign
  | 'nurture'         // Lead nurturing sequence
  | 'onboarding'      // Customer onboarding
  | 'reengagement'    // Re-engagement campaign
  | 'follow_up'       // Sales follow-up
  | 'transactional'   // Transactional sequences
  | 'event_based';    // Event-triggered sequences

/**
 * Enrollment Trigger Type
 */
export type EnrollmentTriggerType =
  | 'manual'          // Manual enrollment
  | 'form_submission' // Form submission
  | 'list_membership' // Added to a list/segment
  | 'tag_added'       // Tag added to contact
  | 'lead_created'    // New lead created
  | 'deal_stage'      // Deal moved to stage
  | 'page_view'       // Specific page viewed
  | 'event'           // Custom event
  | 'api'             // API enrollment
  | 'import'          // Bulk import
  | 'workflow';       // Workflow action

/**
 * Step Type
 */
export type StepType =
  | 'email'           // Send email
  | 'sms'             // Send SMS
  | 'task'            // Create task
  | 'notification'    // Internal notification
  | 'webhook'         // Webhook call
  | 'delay'           // Time delay
  | 'condition'       // Conditional branch
  | 'split'           // A/B split
  | 'goal'            // Goal check
  | 'update_field'    // Update contact field
  | 'add_tag'         // Add tag
  | 'remove_tag'      // Remove tag
  | 'add_to_list'     // Add to list
  | 'remove_from_list' // Remove from list
  | 'enroll_sequence' // Enroll in another sequence
  | 'unenroll';       // Unenroll from sequence

/**
 * Delay Type
 */
export type DelayType =
  | 'fixed'           // Fixed duration
  | 'until_day'       // Until specific day of week
  | 'until_date'      // Until specific date
  | 'until_time'      // Until specific time
  | 'business_hours'  // During business hours only
  | 'smart';          // AI-optimized timing

/**
 * Condition Operator
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'has_opened'
  | 'has_clicked'
  | 'has_replied'
  | 'has_bounced'
  | 'has_unsubscribed';

/**
 * Enrollment Status
 */
export type EnrollmentStatus =
  | 'active'          // Currently in sequence
  | 'completed'       // Completed all steps
  | 'paused'          // Manually paused
  | 'unenrolled'      // Removed from sequence
  | 'bounced'         // Email bounced
  | 'unsubscribed'    // Contact unsubscribed
  | 'goal_reached'    // Reached goal and exited
  | 'failed';         // Error during execution

/**
 * Drip Sequence
 */
export interface DripSequence {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  type: SequenceType;
  status: SequenceStatus;

  // Enrollment settings
  enrollmentTrigger: EnrollmentTriggerType;
  enrollmentConditions?: SequenceCondition[];
  allowReenrollment: boolean;
  reenrollmentCooldownDays?: number;

  // Exit conditions
  exitConditions?: SequenceCondition[];
  goalConditions?: SequenceCondition[];

  // Settings
  settings: SequenceSettings;

  // Steps (ordered)
  steps: SequenceStep[];

  // Metrics
  totalEnrolled: number;
  activeEnrollments: number;
  completedCount: number;
  conversionCount: number;
  conversionRate?: number;

  // Tags and organization
  tags: string[];
  folderId?: string;

  // Owner
  ownerId: string;
  ownerName?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  publishedAt?: Date;
  archivedAt?: Date;
}

/**
 * Sequence Settings
 */
export interface SequenceSettings {
  // Timing
  timezone?: string;
  businessHoursOnly?: boolean;
  businessHoursStart?: number;  // Hour (0-23)
  businessHoursEnd?: number;
  businessDays?: number[];      // 0-6 (Sunday-Saturday)

  // Email settings
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;

  // Limits
  maxEnrollmentsPerDay?: number;
  pauseOnReply?: boolean;
  pauseOnClick?: boolean;
  pauseOnBounce?: boolean;
  pauseOnUnsubscribe?: boolean;

  // Suppression
  suppressionListIds?: string[];
  excludeUnsubscribed?: boolean;
  respectGlobalSuppressions?: boolean;

  // A/B Testing
  enableABTesting?: boolean;
  abTestSampleSize?: number;    // Percentage
  abTestDurationHours?: number;
}

/**
 * Sequence Step
 */
export interface SequenceStep {
  id: string;
  sequenceId: string;
  tenantId: string;

  order: number;
  name: string;
  type: StepType;

  // Content (for email/SMS steps)
  content?: StepContent;

  // Delay settings
  delay?: StepDelay;

  // Condition settings
  condition?: StepCondition;

  // A/B split settings
  abSplit?: ABSplitConfig;

  // Action settings
  action?: StepAction;

  // Branch targets
  nextStepId?: string;          // Default next step
  trueBranchStepId?: string;    // For conditions - when true
  falseBranchStepId?: string;   // For conditions - when false

  // Status
  isActive: boolean;

  // Metrics
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
  unsubscribed?: number;
  converted?: number;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Step Content (for email/SMS)
 */
export interface StepContent {
  subject?: string;
  previewText?: string;
  bodyHtml?: string;
  bodyText?: string;
  templateId?: string;

  // SMS specific
  smsBody?: string;

  // Personalization
  mergeFields?: MergeField[];
  dynamicContent?: DynamicContentBlock[];

  // Attachments
  attachments?: ContentAttachment[];
}

/**
 * Merge Field
 */
export interface MergeField {
  tag: string;
  field: string;
  fallback?: string;
}

/**
 * Dynamic Content Block
 */
export interface DynamicContentBlock {
  id: string;
  placeholder: string;
  variants: DynamicVariant[];
  defaultContent: string;
}

/**
 * Dynamic Variant
 */
export interface DynamicVariant {
  condition: SequenceCondition;
  content: string;
}

/**
 * Content Attachment
 */
export interface ContentAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

/**
 * Step Delay
 */
export interface StepDelay {
  type: DelayType;
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';

  // For until_day
  targetDay?: number;    // 0-6

  // For until_time
  targetHour?: number;   // 0-23
  targetMinute?: number;

  // For business_hours
  skipWeekends?: boolean;
  skipHolidays?: boolean;
}

/**
 * Step Condition
 */
export interface StepCondition {
  logic: 'and' | 'or';
  rules: SequenceCondition[];
}

/**
 * Sequence Condition
 */
export interface SequenceCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';

  // For email engagement conditions
  stepId?: string;         // Reference to a previous step
  withinDays?: number;     // Time window for engagement
}

/**
 * A/B Split Configuration
 */
export interface ABSplitConfig {
  variants: ABVariant[];
  winnerCriteria: 'opens' | 'clicks' | 'conversions' | 'manual';
  testDurationHours?: number;
  autoSelectWinner?: boolean;
  winnerId?: string;
}

/**
 * A/B Variant
 */
export interface ABVariant {
  id: string;
  name: string;
  weight: number;           // Percentage
  content: StepContent;
  nextStepId?: string;

  // Metrics
  sent?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
}

/**
 * Step Action (for non-email steps)
 */
export interface StepAction {
  // For update_field
  fieldName?: string;
  fieldValue?: unknown;

  // For tags
  tagName?: string;
  tagIds?: string[];

  // For lists
  listId?: string;

  // For tasks
  taskTitle?: string;
  taskDescription?: string;
  taskAssigneeId?: string;
  taskDueInDays?: number;
  taskPriority?: 'low' | 'medium' | 'high';

  // For notifications
  notificationMessage?: string;
  notifyUserIds?: string[];
  notifyChannel?: 'email' | 'push' | 'sms' | 'slack';

  // For webhooks
  webhookUrl?: string;
  webhookMethod?: 'GET' | 'POST' | 'PUT';
  webhookHeaders?: Record<string, string>;
  webhookBody?: Record<string, unknown>;

  // For sequence enrollment
  targetSequenceId?: string;
}

/**
 * Sequence Enrollment
 */
export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  tenantId: string;

  // Contact info
  contactId: string;
  contactEmail?: string;
  contactName?: string;

  // Status
  status: EnrollmentStatus;
  currentStepId?: string;
  currentStepOrder?: number;

  // Progress
  stepsCompleted: number;
  totalSteps: number;
  percentComplete: number;

  // Timing
  enrolledAt: Date;
  nextStepAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  unenrolledAt?: Date;

  // Engagement
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;

  // Reason for exit
  exitReason?: string;
  goalReached?: boolean;

  // Enrollment source
  enrollmentSource: EnrollmentTriggerType;
  enrolledBy?: string;      // User ID if manual

  // Custom data passed at enrollment
  enrollmentData?: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Step Execution
 */
export interface StepExecution {
  id: string;
  enrollmentId: string;
  stepId: string;
  tenantId: string;

  // Timing
  scheduledAt: Date;
  executedAt?: Date;
  completedAt?: Date;

  // Status
  status: 'scheduled' | 'executing' | 'completed' | 'skipped' | 'failed';

  // For email steps
  messageId?: string;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';

  // Engagement
  openedAt?: Date;
  clickedAt?: Date;
  clickedLinks?: string[];
  repliedAt?: Date;

  // For conditional steps
  conditionResult?: boolean;
  branchTaken?: 'true' | 'false' | 'default';

  // For A/B splits
  variantId?: string;

  // Error handling
  errorMessage?: string;
  retryCount?: number;
  nextRetryAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sequence Analytics
 */
export interface SequenceAnalytics {
  sequenceId: string;
  tenantId: string;

  period: 'day' | 'week' | 'month' | 'quarter' | 'all_time';
  periodStart?: Date;
  periodEnd?: Date;

  // Enrollment metrics
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  unenrolledCount: number;

  // Engagement metrics
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  totalBounced: number;
  totalUnsubscribed: number;

  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  completionRate: number;

  // Conversion
  totalConversions: number;
  conversionRate: number;
  conversionValue?: number;

  // Timing
  avgTimeToComplete?: number;    // Minutes
  avgStepsCompleted?: number;

  // By step breakdown
  stepMetrics?: StepMetrics[];

  // Calculated
  calculatedAt: Date;
}

/**
 * Step Metrics
 */
export interface StepMetrics {
  stepId: string;
  stepOrder: number;
  stepName: string;
  stepType: StepType;

  reached: number;
  completed: number;
  skipped: number;

  // Email metrics
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;

  // Rates
  completionRate: number;
  openRate?: number;
  clickRate?: number;

  // Drop-off
  dropOffCount: number;
  dropOffRate: number;
}

/**
 * Sequence Dashboard
 */
export interface SequenceDashboard {
  tenantId: string;

  // Summary
  totalSequences: number;
  activeSequences: number;
  draftSequences: number;
  pausedSequences: number;

  // Enrollment summary
  totalActiveEnrollments: number;
  enrollmentsToday: number;
  completionsToday: number;

  // Performance
  avgOpenRate: number;
  avgClickRate: number;
  avgCompletionRate: number;
  avgConversionRate: number;

  // Top performers
  topPerformingSequences: {
    sequenceId: string;
    sequenceName: string;
    conversionRate: number;
    completionRate: number;
    activeEnrollments: number;
  }[];

  // Needs attention
  lowPerformingSequences: {
    sequenceId: string;
    sequenceName: string;
    openRate: number;
    completionRate: number;
    issue: string;
  }[];

  // Scheduled sends
  upcomingSteps: {
    sequenceId: string;
    sequenceName: string;
    stepName: string;
    scheduledCount: number;
    scheduledAt: Date;
  }[];

  // Recent activity
  recentEnrollments: {
    enrollmentId: string;
    sequenceId: string;
    sequenceName: string;
    contactName: string;
    enrolledAt: Date;
  }[];

  recentCompletions: {
    enrollmentId: string;
    sequenceId: string;
    sequenceName: string;
    contactName: string;
    completedAt: Date;
    converted: boolean;
  }[];
}

/**
 * Sequence Search Filters
 */
export interface SequenceSearchFilters {
  search?: string;
  type?: SequenceType[];
  status?: SequenceStatus[];
  tags?: string[];
  folderId?: string;
  ownerId?: string;
  hasActiveEnrollments?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Enrollment Search Filters
 */
export interface EnrollmentSearchFilters {
  sequenceId?: string;
  contactId?: string;
  status?: EnrollmentStatus[];
  enrollmentSource?: EnrollmentTriggerType;
  enrolledAfter?: Date;
  enrolledBefore?: Date;
  currentStepId?: string;
  hasEngaged?: boolean;
}

/**
 * Bulk Enrollment Request
 */
export interface BulkEnrollmentRequest {
  sequenceId: string;
  contactIds: string[];
  enrollmentData?: Record<string, unknown>;
  startAtStep?: string;
  skipExisting?: boolean;
}

/**
 * Bulk Enrollment Result
 */
export interface BulkEnrollmentResult {
  sequenceId: string;
  totalRequested: number;
  successfulEnrollments: number;
  failedEnrollments: number;
  skippedAlreadyEnrolled: number;
  skippedSuppressed: number;
  enrollmentIds: string[];
  errors?: {
    contactId: string;
    reason: string;
  }[];
}
