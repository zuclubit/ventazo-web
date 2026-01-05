/**
 * Subscription & Billing Analytics Types
 * Comprehensive types for subscription metrics, revenue analytics, and billing insights
 */

// ==================== Enums ====================

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'cancelled'
  | 'paused'
  | 'expired'
  | 'pending';

export type BillingCycle = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';

export type ChurnReason =
  | 'price'
  | 'features'
  | 'support'
  | 'competitor'
  | 'no_longer_needed'
  | 'budget_cuts'
  | 'company_closed'
  | 'merged'
  | 'other';

export type RevenueEventType =
  | 'new'
  | 'expansion'
  | 'contraction'
  | 'churn'
  | 'reactivation'
  | 'upgrade'
  | 'downgrade'
  | 'refund'
  | 'credit';

export type CohortType = 'monthly' | 'quarterly' | 'yearly' | 'plan' | 'channel' | 'region';

// ==================== MRR Metrics ====================

export interface MRRMetrics {
  tenantId: string;
  date: Date;

  // Current MRR
  totalMrr: number;
  newMrr: number;
  expansionMrr: number;
  contractionMrr: number;
  churnedMrr: number;
  reactivationMrr: number;
  netNewMrr: number;

  // ARR
  arr: number;

  // Growth
  mrrGrowthPercent: number;
  mrrGrowthAbsolute: number;

  // By Plan
  mrrByPlan: {
    planId: string;
    planName: string;
    mrr: number;
    subscriptions: number;
    percentOfTotal: number;
  }[];

  // By Billing Cycle
  mrrByBillingCycle: {
    cycle: BillingCycle;
    mrr: number;
    subscriptions: number;
  }[];

  // Customer Counts
  totalSubscribers: number;
  newSubscribers: number;
  churnedSubscribers: number;
  netNewSubscribers: number;
}

// ==================== Churn Analytics ====================

export interface ChurnMetrics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Rates
  customerChurnRate: number; // % of customers lost
  revenueChurnRate: number; // % of MRR lost
  netRevenueChurnRate: number; // Including expansion
  grossChurnRate: number;

  // Absolute Numbers
  customersChurned: number;
  mrrChurned: number;

  // Retention
  customerRetentionRate: number;
  revenueRetentionRate: number;
  netRevenueRetention: number; // NRR

  // Voluntary vs Involuntary
  voluntaryChurn: {
    customers: number;
    mrr: number;
    rate: number;
  };
  involuntaryChurn: {
    customers: number;
    mrr: number;
    rate: number;
  };

  // Churn Reasons
  churnByReason: {
    reason: ChurnReason;
    count: number;
    mrr: number;
    percentOfTotal: number;
  }[];

  // At Risk
  atRiskCustomers: number;
  atRiskMrr: number;

  // Cohort Retention
  cohortRetention?: {
    cohort: string;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  }[];
}

// ==================== Customer Lifetime Value ====================

export interface CLVMetrics {
  tenantId: string;

  // Overall CLV
  averageCLV: number;
  medianCLV: number;
  totalCLV: number;

  // CLV by Segment
  clvByPlan: {
    planId: string;
    planName: string;
    averageCLV: number;
    customerCount: number;
  }[];

  clvByChannel: {
    channel: string;
    averageCLV: number;
    customerCount: number;
  }[];

  clvByRegion: {
    region: string;
    averageCLV: number;
    customerCount: number;
  }[];

  // CLV:CAC Ratio
  clvCacRatio: number;
  averageCAC: number;
  paybackPeriodMonths: number;

  // Average Revenue Per User
  arpu: number;
  arpuGrowth: number;

  // Average Revenue Per Account
  arpa: number;
  arpaGrowth: number;

  // Customer Duration
  averageLifetimeMonths: number;
  medianLifetimeMonths: number;
}

// ==================== Cohort Analysis ====================

export interface CohortAnalysis {
  tenantId: string;
  cohortType: CohortType;

  cohorts: {
    cohortId: string;
    cohortName: string;
    startDate: Date;
    initialCustomers: number;
    initialMrr: number;

    // Retention by period
    retention: {
      period: number; // Month/Quarter number
      customers: number;
      mrr: number;
      customerRetention: number;
      revenueRetention: number;
    }[];

    // Final metrics
    currentCustomers: number;
    currentMrr: number;
    totalChurned: number;
    totalExpansion: number;
    clv: number;
  }[];

  // Summary
  averageRetentionByPeriod: {
    period: number;
    customerRetention: number;
    revenueRetention: number;
  }[];
}

// ==================== Revenue Events ====================

export interface RevenueEvent {
  id: string;
  tenantId: string;
  customerId: string;
  subscriptionId: string;

  type: RevenueEventType;
  amount: number;
  previousMrr: number;
  newMrr: number;
  delta: number;

  // Context
  previousPlanId?: string;
  newPlanId?: string;
  reason?: string;
  notes?: string;

  // Attribution
  attributedTo?: string;
  campaign?: string;
  channel?: string;

  occurredAt: Date;
  createdAt: Date;
}

// ==================== Forecast ====================

export interface RevenueForcast {
  tenantId: string;
  generatedAt: Date;

  // Current State
  currentMrr: number;
  currentArr: number;
  currentSubscribers: number;

  // Projections
  projections: {
    date: Date;
    mrr: number;
    arr: number;
    subscribers: number;
    confidence: number;
  }[];

  // Assumptions
  assumptions: {
    churnRate: number;
    growthRate: number;
    expansionRate: number;
    newCustomersPerMonth: number;
    avgNewMrr: number;
  };

  // Scenarios
  bestCase: {
    mrr12Months: number;
    arr12Months: number;
  };
  baseCase: {
    mrr12Months: number;
    arr12Months: number;
  };
  worstCase: {
    mrr12Months: number;
    arr12Months: number;
  };

  // Targets
  targetMrr?: number;
  targetDate?: Date;
  probabilityOfTarget?: number;
}

// ==================== Plan Performance ====================

export interface PlanPerformance {
  tenantId: string;
  planId: string;
  planName: string;
  planTier: string;

  // Current State
  activeSubscriptions: number;
  totalMrr: number;
  percentOfTotalMrr: number;

  // Growth
  netNewSubscriptions30d: number;
  mrrGrowth30d: number;
  mrrGrowthPercent30d: number;

  // Churn
  churnRate: number;
  churnedSubscriptions30d: number;
  churnedMrr30d: number;

  // Conversion
  trialToPayingRate: number;
  upgradeRate: number;
  downgradeRate: number;

  // Revenue Metrics
  averageMrrPerSubscription: number;
  clv: number;

  // Engagement
  avgDailyActiveUsers?: number;
  avgSessionDuration?: number;
  featureAdoptionRate?: number;
}

// ==================== Billing Analytics ====================

export interface BillingAnalytics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Invoice Metrics
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueAmount: number;

  // Collection Rates
  collectionRate: number;
  averageDaysToCollect: number;

  // Invoice Status
  invoicesByStatus: {
    status: 'paid' | 'pending' | 'overdue' | 'failed' | 'refunded';
    count: number;
    amount: number;
  }[];

  // Payment Methods
  byPaymentMethod: {
    method: string;
    transactions: number;
    amount: number;
    failureRate: number;
  }[];

  // Failed Payments
  failedPayments: {
    total: number;
    amount: number;
    recoveredAmount: number;
    recoveryRate: number;
    byReason: {
      reason: string;
      count: number;
      amount: number;
    }[];
  };

  // Dunning
  dunningMetrics?: {
    customersInDunning: number;
    amountAtRisk: number;
    recovered: number;
    churned: number;
  };
}

// ==================== Dashboard ====================

export interface SubscriptionDashboard {
  tenantId: string;
  generatedAt: Date;

  // Key Metrics
  mrr: number;
  arr: number;
  mrrGrowth: number;
  netNewMrr: number;

  // Subscribers
  totalSubscribers: number;
  newSubscribers30d: number;
  churnedSubscribers30d: number;
  trialSubscribers: number;

  // Churn
  customerChurnRate: number;
  revenueChurnRate: number;
  netRevenueRetention: number;

  // CLV
  averageCLV: number;
  clvCacRatio: number;
  arpu: number;

  // Trends
  mrrTrend: {
    date: string;
    mrr: number;
    newMrr: number;
    churnedMrr: number;
  }[];

  subscriberTrend: {
    date: string;
    total: number;
    new: number;
    churned: number;
  }[];

  // Top Plans
  topPlans: {
    planName: string;
    mrr: number;
    subscribers: number;
    growth: number;
  }[];

  // At Risk
  atRiskSummary: {
    customers: number;
    mrr: number;
    topRiskFactors: string[];
  };

  // Upcoming Renewals
  upcomingRenewals: {
    next7Days: { count: number; mrr: number };
    next30Days: { count: number; mrr: number };
    next90Days: { count: number; mrr: number };
  };

  // Quick Wins
  quickWins: {
    trialsEndingSoon: number;
    expansionOpportunities: number;
    failedPaymentsRecoverable: number;
    atRiskSaveable: number;
  };
}

// ==================== Expansion Revenue ====================

export interface ExpansionMetrics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Overall
  totalExpansionMrr: number;
  expansionRate: number;
  expandedCustomers: number;

  // By Type
  byType: {
    type: 'upgrade' | 'addon' | 'seats' | 'usage' | 'cross_sell';
    mrr: number;
    customers: number;
  }[];

  // By Plan
  byFromPlan: {
    fromPlan: string;
    toPlan: string;
    count: number;
    mrr: number;
  }[];

  // Opportunities
  expansionPipeline: {
    customerId: string;
    customerName: string;
    currentMrr: number;
    potentialMrr: number;
    likelihood: number;
    trigger: string;
  }[];
}

// ==================== Trial Analytics ====================

export interface TrialAnalytics {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };

  // Current State
  activeTrials: number;
  trialsStarted: number;
  trialsConverted: number;
  trialsExpired: number;

  // Conversion
  trialConversionRate: number;
  avgTrialDuration: number;
  avgTimeToConvert: number;

  // By Plan
  byTargetPlan: {
    planId: string;
    planName: string;
    trials: number;
    converted: number;
    conversionRate: number;
  }[];

  // Conversion Funnel
  conversionFunnel: {
    stage: string;
    count: number;
    dropoffRate: number;
  }[];

  // Engagement During Trial
  engagementCorrelation: {
    metric: string;
    conversionRateHigh: number;
    conversionRateLow: number;
    impact: number;
  }[];

  // At Risk Trials
  trialsAtRisk: {
    trialId: string;
    customerId: string;
    daysRemaining: number;
    engagementScore: number;
    riskFactors: string[];
  }[];
}

// ==================== Search & Filter ====================

export interface SubscriptionAnalyticsParams {
  tenantId: string;
  period?: {
    start: Date;
    end: Date;
  };
  granularity?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  planIds?: string[];
  segments?: string[];
  compareWithPrevious?: boolean;
}
