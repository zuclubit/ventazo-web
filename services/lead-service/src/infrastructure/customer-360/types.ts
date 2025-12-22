/**
 * Customer 360 View Types
 * Comprehensive types for unified customer data aggregation
 */

// ==================== Enums ====================

export type CustomerHealthScore = 'excellent' | 'good' | 'fair' | 'at_risk' | 'critical';

export type RelationshipStage =
  | 'prospect'
  | 'lead'
  | 'opportunity'
  | 'customer'
  | 'champion'
  | 'churned';

export type EngagementLevel = 'high' | 'medium' | 'low' | 'inactive';

export type SentimentType = 'positive' | 'neutral' | 'negative';

export type InteractionChannel =
  | 'email'
  | 'phone'
  | 'chat'
  | 'meeting'
  | 'sms'
  | 'whatsapp'
  | 'social'
  | 'web'
  | 'support_ticket'
  | 'in_person';

export type TimelineEventType =
  | 'communication'
  | 'meeting'
  | 'task'
  | 'deal'
  | 'payment'
  | 'contract'
  | 'support'
  | 'note'
  | 'activity'
  | 'subscription'
  | 'milestone';

// ==================== Core Profile ====================

export interface CustomerProfile {
  id: string;
  tenantId: string;

  // Basic Info
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;

  // Company Info
  company?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
  website?: string;

  // Location
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  timezone?: string;

  // Social Profiles
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };

  // Lifecycle
  relationshipStage: RelationshipStage;
  customerSince?: Date;
  lastInteraction?: Date;
  nextScheduledInteraction?: Date;

  // Assignment
  ownerId?: string;
  ownerName?: string;
  teamId?: string;
  teamName?: string;

  // Tags & Segments
  tags: string[];
  segments: string[];

  // Custom Fields
  customFields?: Record<string, unknown>;

  // Metadata
  source?: string;
  sourceDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Engagement Metrics ====================

export interface EngagementMetrics {
  // Overall Score
  engagementScore: number; // 0-100
  engagementLevel: EngagementLevel;
  healthScore: CustomerHealthScore;

  // Communication Metrics
  totalInteractions: number;
  interactionsLast30Days: number;
  interactionsLast90Days: number;

  // Channel Breakdown
  channelBreakdown: {
    channel: InteractionChannel;
    count: number;
    lastInteraction?: Date;
  }[];

  // Response Metrics
  averageResponseTime?: number; // in hours
  responseRate?: number; // percentage

  // Email Engagement
  emailMetrics?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
  };

  // Meeting Metrics
  meetingMetrics?: {
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
    totalDuration: number; // in minutes
  };

  // Web Activity
  webActivity?: {
    totalSessions: number;
    totalPageViews: number;
    lastVisit?: Date;
    averageSessionDuration?: number;
    topPages: { page: string; views: number }[];
  };

  // Sentiment
  sentimentTrend: SentimentType;
  npsScore?: number;
  satisfactionScore?: number;
}

// ==================== Financial Summary ====================

export interface FinancialSummary {
  // Revenue
  lifetimeValue: number;
  totalRevenue: number;
  averageOrderValue: number;

  // Current Period
  revenueThisMonth: number;
  revenueThisQuarter: number;
  revenueThisYear: number;

  // Comparison
  revenueGrowthPercent?: number;

  // Transactions
  totalTransactions: number;
  lastTransactionDate?: Date;
  lastTransactionAmount?: number;

  // Outstanding
  outstandingBalance: number;
  overdueAmount: number;

  // Payment Behavior
  paymentTerms?: string;
  averagePaymentTime?: number; // days
  onTimePaymentRate?: number; // percentage

  // Currency
  currency: string;
}

// ==================== Subscription Info ====================

export interface SubscriptionInfo {
  hasActiveSubscription: boolean;

  // Current Subscription
  currentPlan?: {
    id: string;
    name: string;
    tier: string;
    price: number;
    billingCycle: 'monthly' | 'quarterly' | 'annual';
    startDate: Date;
    currentPeriodEnd: Date;
    status: 'active' | 'past_due' | 'cancelled' | 'paused' | 'trial';
  };

  // Usage
  usage?: {
    metric: string;
    current: number;
    limit: number;
    percentUsed: number;
  }[];

  // History
  subscriptionHistory: {
    planName: string;
    startDate: Date;
    endDate?: Date;
    mrr: number;
    status: string;
  }[];

  // MRR Metrics
  mrr: number;
  arr: number;
  mrrGrowth?: number;

  // Renewal
  nextRenewalDate?: Date;
  autoRenew: boolean;
  renewalRisk?: 'low' | 'medium' | 'high';

  // Discounts
  activeDiscounts?: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    expiresAt?: Date;
  }[];
}

// ==================== Deal Pipeline ====================

export interface DealSummary {
  // Active Deals
  activeDeals: {
    id: string;
    name: string;
    stage: string;
    value: number;
    probability: number;
    expectedCloseDate?: Date;
    daysInStage: number;
    lastActivity?: Date;
    ownerId: string;
    ownerName: string;
  }[];

  // Pipeline Value
  totalPipelineValue: number;
  weightedPipelineValue: number;

  // Won Deals
  wonDeals: number;
  wonValue: number;
  averageDealSize: number;

  // Lost Deals
  lostDeals: number;
  lostValue: number;
  lostReasons?: { reason: string; count: number }[];

  // Conversion
  winRate: number;
  averageSalesCycle: number; // days

  // Forecast
  forecastedRevenue?: number;
  forecastedDeals?: number;
}

// ==================== Support & Cases ====================

export interface SupportSummary {
  // Overview
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;

  // Current Issues
  activeTickets: {
    id: string;
    subject: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    createdAt: Date;
    lastUpdated: Date;
    assignedTo?: string;
    category?: string;
  }[];

  // Metrics
  averageResolutionTime: number; // hours
  firstResponseTime: number; // hours
  escalationRate: number;
  reopenRate: number;

  // Satisfaction
  csat?: number;
  ticketSatisfaction: { positive: number; neutral: number; negative: number };

  // Categories
  ticketsByCategory: { category: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];

  // Trends
  ticketTrend: 'increasing' | 'stable' | 'decreasing';
}

// ==================== Contracts ====================

export interface ContractSummary {
  // Active Contracts
  activeContracts: {
    id: string;
    name: string;
    type: string;
    value: number;
    startDate: Date;
    endDate: Date;
    status: 'active' | 'pending' | 'expired' | 'cancelled';
    autoRenew: boolean;
    daysUntilExpiry: number;
  }[];

  // Overview
  totalContractValue: number;
  activeContractCount: number;

  // Renewals
  upcomingRenewals: number;
  contractsExpiringThisQuarter: number;
  renewalValue: number;

  // History
  contractHistory: {
    id: string;
    name: string;
    type: string;
    value: number;
    startDate: Date;
    endDate: Date;
    outcome: 'renewed' | 'expired' | 'cancelled' | 'upgraded';
  }[];
}

// ==================== Timeline Event ====================

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: Date;

  // Source
  sourceType: string;
  sourceId: string;

  // Participants
  userId?: string;
  userName?: string;

  // Channel
  channel?: InteractionChannel;

  // Metadata
  metadata?: Record<string, unknown>;

  // Status
  status?: string;
  outcome?: string;

  // Importance
  importance: 'high' | 'medium' | 'low';
  isPinned?: boolean;
}

// ==================== Related Entities ====================

export interface RelatedContacts {
  contacts: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    isPrimary: boolean;
    lastInteraction?: Date;
  }[];
  totalCount: number;
}

export interface RelatedCompanies {
  companies: {
    id: string;
    name: string;
    relationship: 'parent' | 'subsidiary' | 'partner' | 'vendor' | 'customer';
    industry?: string;
    website?: string;
  }[];
  totalCount: number;
}

// ==================== Insights & Recommendations ====================

export interface CustomerInsights {
  // Risk Indicators
  churnRisk: {
    score: number; // 0-100
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    recommendedActions: string[];
  };

  // Growth Opportunities
  expansionOpportunity: {
    score: number;
    potentialValue: number;
    products: string[];
    signals: string[];
  };

  // Engagement Alerts
  alerts: {
    type: 'warning' | 'info' | 'success';
    message: string;
    action?: string;
    createdAt: Date;
  }[];

  // Key Milestones
  milestones: {
    type: string;
    description: string;
    date: Date;
    significance: 'high' | 'medium' | 'low';
  }[];

  // AI Recommendations
  recommendations: {
    type: 'action' | 'insight' | 'opportunity';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
  }[];

  // Best Time to Contact
  bestContactTime?: {
    dayOfWeek: string;
    timeRange: string;
    timezone: string;
    confidence: number;
  };

  // Communication Preferences
  communicationPreferences?: {
    preferredChannel: InteractionChannel;
    preferredFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    optOuts: string[];
  };
}

// ==================== 360 View Response ====================

export interface Customer360View {
  // Core Profile
  profile: CustomerProfile;

  // Engagement
  engagement: EngagementMetrics;

  // Financial
  financial: FinancialSummary;

  // Subscription
  subscription: SubscriptionInfo;

  // Deals
  deals: DealSummary;

  // Support
  support: SupportSummary;

  // Contracts
  contracts: ContractSummary;

  // Timeline
  timeline: TimelineEvent[];

  // Related Entities
  relatedContacts: RelatedContacts;
  relatedCompanies: RelatedCompanies;

  // Insights
  insights: CustomerInsights;

  // Metadata
  lastRefreshed: Date;
  dataCompleteness: number; // percentage
}

// ==================== Summary Cards ====================

export interface Customer360Summary {
  customerId: string;
  name: string;
  company?: string;
  avatarUrl?: string;

  // Quick Stats
  healthScore: CustomerHealthScore;
  engagementLevel: EngagementLevel;
  lifetimeValue: number;
  mrr: number;

  // Status Indicators
  hasActiveSubscription: boolean;
  openTickets: number;
  activeDeals: number;
  upcomingRenewals: number;

  // Recent Activity
  lastInteraction?: Date;
  nextScheduledActivity?: Date;

  // Risk
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';

  // Owner
  ownerName?: string;
}

// ==================== Search & Filter ====================

export interface Customer360SearchParams {
  tenantId: string;

  // Text Search
  query?: string;

  // Filters
  healthScores?: CustomerHealthScore[];
  engagementLevels?: EngagementLevel[];
  relationshipStages?: RelationshipStage[];
  churnRiskLevels?: ('low' | 'medium' | 'high' | 'critical')[];

  // Financial Filters
  minLifetimeValue?: number;
  maxLifetimeValue?: number;
  minMrr?: number;
  maxMrr?: number;

  // Assignment
  ownerIds?: string[];
  teamIds?: string[];

  // Tags & Segments
  tags?: string[];
  segments?: string[];

  // Subscription
  hasActiveSubscription?: boolean;
  subscriptionPlans?: string[];

  // Activity
  lastInteractionAfter?: Date;
  lastInteractionBefore?: Date;

  // Pagination
  page?: number;
  limit?: number;

  // Sort
  sortBy?: 'name' | 'lifetimeValue' | 'mrr' | 'healthScore' | 'lastInteraction' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface Customer360SearchResult {
  customers: Customer360Summary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== Dashboard Metrics ====================

export interface Customer360Dashboard {
  tenantId: string;

  // Overview
  totalCustomers: number;
  newCustomersThisMonth: number;
  customerGrowthPercent: number;

  // Health Distribution
  healthDistribution: {
    excellent: number;
    good: number;
    fair: number;
    atRisk: number;
    critical: number;
  };

  // Engagement Distribution
  engagementDistribution: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };

  // Revenue Metrics
  totalMrr: number;
  totalArr: number;
  averageLifetimeValue: number;
  totalLifetimeValue: number;

  // Churn Risk
  customersAtRisk: number;
  atRiskRevenue: number;
  churnPrediction: {
    next30Days: number;
    next90Days: number;
    preventableChurn: number;
  };

  // Engagement Trends
  engagementTrends: {
    date: string;
    score: number;
    interactions: number;
  }[];

  // Top Customers
  topCustomersByRevenue: Customer360Summary[];
  topCustomersByEngagement: Customer360Summary[];

  // At Risk Customers
  atRiskCustomers: Customer360Summary[];

  // Recent Activity
  recentSignificantEvents: TimelineEvent[];

  // Generated At
  generatedAt: Date;
}

// ==================== Comparison ====================

export interface CustomerComparison {
  customers: {
    id: string;
    name: string;
    metrics: {
      lifetimeValue: number;
      mrr: number;
      healthScore: number;
      engagementScore: number;
      totalInteractions: number;
      supportTickets: number;
      dealValue: number;
    };
  }[];

  benchmarks: {
    avgLifetimeValue: number;
    avgMrr: number;
    avgHealthScore: number;
    avgEngagementScore: number;
  };
}

// ==================== Export Types ====================

export interface Customer360Export {
  format: 'csv' | 'xlsx' | 'json' | 'pdf';
  sections: (
    | 'profile'
    | 'engagement'
    | 'financial'
    | 'subscription'
    | 'deals'
    | 'support'
    | 'contracts'
    | 'timeline'
  )[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  customerId: string;
  tenantId: string;
}
