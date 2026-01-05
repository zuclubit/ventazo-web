/**
 * Campaigns Module Types
 *
 * Type definitions for the email campaign management system.
 * Supports campaign creation, scheduling, analytics, and A/B testing.
 *
 * @updated 2025-01-02 - Aligned with backend schema
 */

// ============================================
// Enums & Constants
// ============================================

export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'archived'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_TYPES = ['email', 'sms', 'social', 'ads', 'direct_mail', 'event', 'content', 'multi_channel'] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_CHANNELS = [
  'email', 'sms', 'whatsapp', 'facebook', 'instagram', 'linkedin', 'twitter',
  'google_ads', 'facebook_ads', 'linkedin_ads', 'push_notification', 'in_app', 'direct_mail', 'phone'
] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_GOAL_TYPES = ['awareness', 'engagement', 'leads', 'conversions', 'retention', 'reactivation'] as const;
export type CampaignGoalType = (typeof CAMPAIGN_GOAL_TYPES)[number];

export const RECIPIENT_ENTITY_TYPES = ['customer', 'lead', 'all'] as const;
export type RecipientEntityType = (typeof RECIPIENT_ENTITY_TYPES)[number];

// ============================================
// Core Interfaces (Aligned with Backend Schema)
// ============================================

export interface CampaignGoal {
  id: string;
  name: string;
  metric: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  isPrimary: boolean;
}

export interface CampaignSettings {
  trackOpens?: boolean;
  trackClicks?: boolean;
  enableUnsubscribe?: boolean;
  unsubscribeText?: string;
  sendRate?: number;
  throttleEnabled?: boolean;
  respectTimeZone?: boolean;
  sendWindow?: {
    enabled: boolean;
    startHour: number;
    endHour: number;
    days: number[];
  };
  abTestEnabled?: boolean;
  abTestId?: string;
  automationEnabled?: boolean;
  triggerType?: string;
  triggerConditions?: Record<string, unknown>;
  suppressionListIds?: string[];
  excludeUnsubscribed?: boolean;
  excludeBounced?: boolean;
  excludeComplained?: boolean;
  requireApproval?: boolean;
  approverIds?: string[];
  doubleOptIn?: boolean;
  personalizeContent?: boolean;
}

export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  goalType?: CampaignGoalType;

  // Channels
  channels: CampaignChannel[];
  primaryChannel?: CampaignChannel;

  // Scheduling
  startDate?: string;
  endDate?: string;
  timezone: string;
  publishedAt?: string;
  completedAt?: string;

  // Audience
  audienceId?: string;
  audienceName?: string;
  estimatedReach?: number;
  actualReach?: number;

  // Budget
  budgetAmount?: number;
  budgetCurrency: string;
  budgetSpent: number;

  // Goals
  goals: CampaignGoal[];

  // UTM Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;

  // Email Content
  subject?: string;
  previewText?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  templateId?: string;

  // Settings
  settings: CampaignSettings;

  // Organization
  tags: string[];
  folderId?: string;
  ownerId: string;
  ownerName?: string;
  customFields: Record<string, unknown>;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientFilters {
  entityType: RecipientEntityType;
  status?: string[];
  tier?: string[];
  tags?: string[];
  accountManagerId?: string;
  customSegmentId?: string;
  customQuery?: Record<string, unknown>;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  // Calculated rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

export interface ABTestConfig {
  enabled: boolean;
  testType: 'subject' | 'content' | 'sendTime';
  variants: ABTestVariant[];
  winnerCriteria: 'openRate' | 'clickRate';
  testPercentage: number; // Percentage of recipients for testing
  testDuration: number; // Hours before selecting winner
  winnerId?: string;
}

export interface ABTestVariant {
  id: string;
  name: string;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  stats: CampaignStats;
}

// ============================================
// Recipient Management
// ============================================

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  entityType: 'customer' | 'lead';
  entityId: string;
  email: string;
  name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'failed';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  bouncedAt?: string;
  bounceReason?: string;
  unsubscribedAt?: string;
  failedAt?: string;
  failureReason?: string;
}

export interface RecipientPreview {
  id: string;
  entityType: 'customer' | 'lead';
  name: string;
  email: string;
  avatarUrl?: string;
  status?: string;
  tier?: string;
}

// ============================================
// Campaign Editor
// ============================================

export interface EditorBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'social' | 'footer' | 'html';
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

export interface CampaignTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  channel: CampaignChannel;
  subject?: string;
  body: string;
  bodyHtml?: string;
  blocks?: EditorBlock[];
  variables: string[];
  isDefault: boolean;
  createdAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  channel: CampaignChannel;
  templateId?: string;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  previewText?: string;
  recipientFilters: RecipientFilters;
  excludedIds?: string[];
  scheduledAt?: string;
  tags?: string[];
}

export interface UpdateCampaignRequest {
  name?: string;
  description?: string;
  subject?: string;
  body?: string;
  bodyHtml?: string;
  previewText?: string;
  recipientFilters?: RecipientFilters;
  excludedIds?: string[];
  scheduledAt?: string;
  tags?: string[];
}

export interface CampaignsListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CampaignQueryParams {
  status?: CampaignStatus;
  channel?: CampaignChannel;
  search?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'scheduledAt' | 'sentAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SendCampaignRequest {
  campaignId: string;
  sendNow?: boolean;
  scheduledAt?: string;
}

export interface SendCampaignResult {
  success: boolean;
  campaignId: string;
  recipientCount: number;
  scheduledAt?: string;
  error?: string;
}

export interface CampaignRecipientsResponse {
  recipients: CampaignRecipient[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PreviewRecipientsResponse {
  recipients: RecipientPreview[];
  total: number;
  hasMore: boolean;
}

// ============================================
// Analytics
// ============================================

export interface CampaignAnalytics {
  campaignId: string;
  stats: CampaignStats;
  timeline: AnalyticsTimepoint[];
  topLinks: LinkClick[];
  deviceBreakdown: DeviceStats;
  locationBreakdown: LocationStats[];
}

export interface AnalyticsTimepoint {
  timestamp: string;
  opens: number;
  clicks: number;
  unsubscribes: number;
}

export interface LinkClick {
  url: string;
  clicks: number;
  uniqueClicks: number;
}

export interface DeviceStats {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface LocationStats {
  country: string;
  count: number;
  percentage: number;
}

// ============================================
// Dashboard KPIs
// ============================================

export interface CampaignsDashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  scheduledCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  recentCampaigns: Campaign[];
}

// ============================================
// Display Helpers
// ============================================

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  archived: 'Archivada',
};

export const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export const TYPE_LABELS: Record<CampaignType, string> = {
  email: 'Email',
  sms: 'SMS',
  social: 'Redes Sociales',
  ads: 'Publicidad',
  direct_mail: 'Correo Directo',
  event: 'Evento',
  content: 'Contenido',
  multi_channel: 'Multi-canal',
};

export const TYPE_COLORS: Record<CampaignType, string> = {
  email: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  sms: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  social: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  ads: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  direct_mail: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  event: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  content: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  multi_channel: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

export const GOAL_TYPE_LABELS: Record<CampaignGoalType, string> = {
  awareness: 'Conocimiento de marca',
  engagement: 'Engagement',
  leads: 'Generación de leads',
  conversions: 'Conversiones',
  retention: 'Retención',
  reactivation: 'Reactivación',
};

export const GOAL_TYPE_COLORS: Record<CampaignGoalType, string> = {
  awareness: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  engagement: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  leads: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  conversions: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  retention: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  reactivation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'Twitter/X',
  google_ads: 'Google Ads',
  facebook_ads: 'Facebook Ads',
  linkedin_ads: 'LinkedIn Ads',
  push_notification: 'Push Notification',
  in_app: 'In-App',
  direct_mail: 'Correo Directo',
  phone: 'Teléfono',
};

export const CHANNEL_ICONS: Record<CampaignChannel, string> = {
  email: 'Mail',
  sms: 'MessageSquare',
  whatsapp: 'MessageCircle',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'Linkedin',
  twitter: 'Twitter',
  google_ads: 'Search',
  facebook_ads: 'Target',
  linkedin_ads: 'Briefcase',
  push_notification: 'Bell',
  in_app: 'Smartphone',
  direct_mail: 'Mail',
  phone: 'Phone',
};
