/**
 * Campaign Management Types
 *
 * Comprehensive marketing campaign management:
 * - Multi-channel campaigns (email, SMS, social, ads)
 * - Audience segmentation and targeting
 * - A/B testing
 * - Campaign automation and scheduling
 * - Performance tracking and analytics
 * - Budget management
 * - UTM tracking
 */

/**
 * Campaign Status
 */
export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'archived';

/**
 * Campaign Type
 */
export type CampaignType =
  | 'email'           // Email marketing
  | 'sms'             // SMS/Text messaging
  | 'social'          // Social media
  | 'ads'             // Paid advertising
  | 'direct_mail'     // Direct mail
  | 'event'           // Events/Webinars
  | 'content'         // Content marketing
  | 'multi_channel';  // Multi-channel campaigns

/**
 * Channel Type
 */
export type ChannelType =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'twitter'
  | 'google_ads'
  | 'facebook_ads'
  | 'linkedin_ads'
  | 'push_notification'
  | 'in_app'
  | 'direct_mail'
  | 'phone';

/**
 * Audience Segment Operator
 */
export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'before'
  | 'after'
  | 'within_last'
  | 'not_within_last';

/**
 * Campaign Goal Type
 */
export type CampaignGoalType =
  | 'awareness'       // Brand awareness
  | 'engagement'      // User engagement
  | 'leads'           // Lead generation
  | 'conversions'     // Conversions/Sales
  | 'retention'       // Customer retention
  | 'reactivation';   // Win-back campaigns

/**
 * A/B Test Status
 */
export type ABTestStatus = 'draft' | 'running' | 'completed' | 'cancelled';

/**
 * Campaign
 */
export interface Campaign {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  type: CampaignType;
  status: CampaignStatus;
  goalType: CampaignGoalType;

  // Channels
  channels: ChannelType[];
  primaryChannel?: ChannelType;

  // Schedule
  startDate?: Date;
  endDate?: Date;
  timezone: string;

  // Audience
  audienceId?: string;
  audienceName?: string;
  estimatedReach?: number;
  actualReach?: number;

  // Budget
  budgetAmount?: number;
  budgetCurrency: string;
  budgetSpent?: number;

  // Goals/KPIs
  goals: CampaignGoal[];

  // UTM Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Content
  subject?: string;
  previewText?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  templateId?: string;

  // Settings
  settings: CampaignSettings;

  // Tags and categorization
  tags: string[];
  folderId?: string;

  // Owner
  ownerId: string;
  ownerName?: string;

  // Metadata
  customFields: Record<string, unknown>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  publishedAt?: Date;
  completedAt?: Date;
}

/**
 * Campaign Goal
 */
export interface CampaignGoal {
  id: string;
  name: string;
  metric: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  isPrimary: boolean;
}

/**
 * Campaign Settings
 */
export interface CampaignSettings {
  // Email settings
  trackOpens?: boolean;
  trackClicks?: boolean;
  enableUnsubscribe?: boolean;
  unsubscribeText?: string;

  // Delivery settings
  sendRate?: number;            // Emails per hour
  throttleEnabled?: boolean;
  respectTimeZone?: boolean;
  sendWindow?: SendWindow;

  // A/B testing
  abTestEnabled?: boolean;
  abTestId?: string;

  // Automation
  automationEnabled?: boolean;
  triggerType?: string;
  triggerConditions?: Record<string, unknown>;

  // Suppression
  suppressionListIds?: string[];
  excludeUnsubscribed?: boolean;
  excludeBounced?: boolean;
  excludeComplained?: boolean;

  // Approval
  requireApproval?: boolean;
  approverIds?: string[];

  // Other
  doubleOptIn?: boolean;
  personalizeContent?: boolean;
}

/**
 * Send Window
 */
export interface SendWindow {
  enabled: boolean;
  startHour: number;
  endHour: number;
  days: number[];  // 0-6, Sunday-Saturday
}

/**
 * Audience/Segment
 */
export interface Audience {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  type: 'static' | 'dynamic';

  // For dynamic audiences
  rules?: AudienceRule[];
  ruleLogic?: 'and' | 'or';

  // For static audiences
  memberIds?: string[];

  // Metrics
  memberCount: number;
  lastCalculatedAt?: Date;

  // Settings
  refreshInterval?: number;  // Minutes
  autoRefresh?: boolean;

  // Tags
  tags: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Audience Rule
 */
export interface AudienceRule {
  id: string;
  field: string;
  operator: SegmentOperator;
  value?: unknown;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'array';
  sourceTable?: string;
}

/**
 * Campaign Message
 */
export interface CampaignMessage {
  id: string;
  campaignId: string;
  tenantId: string;

  channel: ChannelType;
  name: string;

  // Content
  subject?: string;
  previewText?: string;
  bodyHtml?: string;
  bodyText?: string;
  bodyJson?: Record<string, unknown>;  // For rich content
  templateId?: string;

  // Personalization
  mergeFields: MergeField[];
  dynamicContent?: DynamicContent[];

  // Media
  attachments?: Attachment[];
  images?: string[];

  // A/B testing
  isVariant: boolean;
  variantName?: string;
  variantWeight?: number;  // Percentage

  // Schedule
  sendAt?: Date;
  delayMinutes?: number;

  // Status
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Merge Field
 */
export interface MergeField {
  tag: string;           // e.g., {{first_name}}
  field: string;         // e.g., contact.firstName
  fallback?: string;     // Default value if empty
}

/**
 * Dynamic Content
 */
export interface DynamicContent {
  id: string;
  placeholder: string;
  rules: DynamicContentRule[];
  defaultContent: string;
}

/**
 * Dynamic Content Rule
 */
export interface DynamicContentRule {
  condition: AudienceRule;
  content: string;
  priority: number;
}

/**
 * Attachment
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * A/B Test
 */
export interface ABTest {
  id: string;
  campaignId: string;
  tenantId: string;

  name: string;
  status: ABTestStatus;

  // Test configuration
  testType: 'subject' | 'content' | 'from_name' | 'send_time' | 'full_message';
  variants: ABTestVariant[];

  // Sample configuration
  sampleSize: number;           // Percentage of audience
  sampleCount?: number;         // Actual number
  winnerCriteria: 'open_rate' | 'click_rate' | 'conversion_rate' | 'revenue';
  testDurationHours: number;

  // Results
  winnerId?: string;
  winnerDeclaredAt?: Date;
  winnerDeclaredBy?: 'automatic' | 'manual';
  results?: ABTestResults;

  // Schedule
  startedAt?: Date;
  completedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * A/B Test Variant
 */
export interface ABTestVariant {
  id: string;
  name: string;
  weight: number;  // Percentage
  messageId: string;

  // Results
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  converted?: number;
  revenue?: number;

  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
}

/**
 * A/B Test Results
 */
export interface ABTestResults {
  totalSent: number;
  variants: ABTestVariant[];
  confidenceLevel?: number;
  significantDifference: boolean;
}

/**
 * Campaign Send
 */
export interface CampaignSend {
  id: string;
  campaignId: string;
  messageId: string;
  tenantId: string;

  // Recipient
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: ChannelType;

  // Status
  status: 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed' | 'complained';

  // Delivery info
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  failedAt?: Date;

  // Bounce/failure info
  bounceType?: 'hard' | 'soft' | 'block';
  bounceReason?: string;
  failureReason?: string;

  // External tracking
  externalId?: string;
  messageId_external?: string;

  // A/B test
  variantId?: string;

  // Metadata
  metadata: Record<string, unknown>;

  createdAt: Date;
}

/**
 * Campaign Click
 */
export interface CampaignClick {
  id: string;
  sendId: string;
  campaignId: string;
  tenantId: string;

  url: string;
  linkId?: string;
  linkName?: string;

  clickedAt: Date;

  // Device/location info
  deviceType?: string;
  browser?: string;
  os?: string;
  ip?: string;
  country?: string;
  city?: string;
}

/**
 * Campaign Conversion
 */
export interface CampaignConversion {
  id: string;
  sendId: string;
  campaignId: string;
  tenantId: string;

  recipientId: string;

  conversionType: string;
  conversionValue?: number;
  currency?: string;

  // Attribution
  attributionModel: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
  attributionWeight?: number;

  convertedAt: Date;

  metadata: Record<string, unknown>;
}

/**
 * Suppression List
 */
export interface SuppressionList {
  id: string;
  tenantId: string;

  name: string;
  description?: string;
  type: 'manual' | 'unsubscribed' | 'bounced' | 'complained' | 'imported';

  memberCount: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Suppression Entry
 */
export interface SuppressionEntry {
  id: string;
  listId: string;
  tenantId: string;

  email?: string;
  phone?: string;
  contactId?: string;

  reason?: string;
  source?: string;

  addedAt: Date;
  addedBy: string;
}

/**
 * Email Template
 */
export interface EmailTemplate {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  type: 'marketing' | 'transactional' | 'notification' | 'system';
  category?: string;

  subject?: string;
  previewText?: string;
  bodyHtml: string;
  bodyText?: string;

  // Design
  designJson?: Record<string, unknown>;  // For drag-drop editor
  thumbnailUrl?: string;

  // Merge fields
  mergeFields: MergeField[];

  // Settings
  isPublic: boolean;
  isDefault: boolean;

  // Tags
  tags: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Campaign Analytics
 */
export interface CampaignAnalytics {
  campaignId: string;
  tenantId: string;

  // Volume
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalFailed: number;

  // Engagement
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;

  // Rates
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;

  // Unsubscribes & complaints
  unsubscribes: number;
  complaints: number;
  unsubscribeRate: number;
  complaintRate: number;

  // Conversions
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerRecipient: number;

  // Cost
  cost?: number;
  costPerSend?: number;
  costPerClick?: number;
  costPerConversion?: number;
  roi?: number;

  // Device breakdown
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };

  // Geographic breakdown
  topCountries: { country: string; count: number }[];
  topCities: { city: string; count: number }[];

  // Time-based
  opensByHour: number[];
  clicksByHour: number[];

  // Top links
  topLinks: {
    url: string;
    name?: string;
    clicks: number;
    uniqueClicks: number;
  }[];

  lastUpdatedAt: Date;
}

/**
 * Campaign Dashboard
 */
export interface CampaignDashboard {
  tenantId: string;

  // Overview
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  draftCampaigns: number;

  // Performance (last 30 days)
  totalSent: number;
  averageOpenRate: number;
  averageClickRate: number;
  averageConversionRate: number;
  totalRevenue: number;

  // Trends
  sendTrend: { date: string; value: number }[];
  openRateTrend: { date: string; value: number }[];
  clickRateTrend: { date: string; value: number }[];

  // Top campaigns
  topCampaignsByOpens: {
    campaignId: string;
    name: string;
    openRate: number;
    sent: number;
  }[];

  topCampaignsByClicks: {
    campaignId: string;
    name: string;
    clickRate: number;
    sent: number;
  }[];

  topCampaignsByConversions: {
    campaignId: string;
    name: string;
    conversions: number;
    revenue: number;
  }[];

  // Audience health
  totalSubscribers: number;
  subscriberGrowth: number;
  unsubscribeRate: number;
  bounceRate: number;

  // Budget
  totalBudget: number;
  totalSpent: number;
  budgetRemaining: number;
}

/**
 * Campaign Search Filters
 */
export interface CampaignSearchFilters {
  search?: string;
  status?: CampaignStatus[];
  type?: CampaignType[];
  channel?: ChannelType[];
  goalType?: CampaignGoalType[];
  tags?: string[];
  ownerId?: string;
  folderId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
}

/**
 * Campaign Folder
 */
export interface CampaignFolder {
  id: string;
  tenantId: string;

  name: string;
  parentId?: string;
  color?: string;

  campaignCount: number;

  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Send Schedule
 */
export interface SendSchedule {
  type: 'immediate' | 'scheduled' | 'optimal' | 'recipient_timezone';
  scheduledTime?: Date;
  timezone?: string;
  optimalSendTimeEnabled?: boolean;
}

/**
 * Campaign Automation Trigger
 */
export interface AutomationTrigger {
  id: string;
  campaignId: string;
  tenantId: string;

  triggerType: 'event' | 'date' | 'segment_entry' | 'segment_exit' | 'api' | 'form_submission' | 'page_visit' | 'email_event';
  triggerEvent?: string;
  triggerConditions?: AudienceRule[];

  // Delay
  delayType?: 'none' | 'fixed' | 'until_time';
  delayMinutes?: number;
  delayUntilHour?: number;
  delayUntilDay?: number;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}
