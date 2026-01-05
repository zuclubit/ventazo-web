/**
 * Customer Success / Health Scoring Types
 *
 * Implements a comprehensive customer health scoring system with:
 * - Multi-dimensional health scoring (usage, engagement, support, financial)
 * - Lifecycle stage tracking
 * - Risk detection and early warning
 * - Expansion opportunity identification
 * - Automated playbook triggers
 */

/**
 * Health Score Categories
 */
export type HealthStatus = 'healthy' | 'at_risk' | 'critical';
export type HealthTrend = 'improving' | 'stable' | 'declining';
export type LifecycleStage = 'onboarding' | 'adoption' | 'growth' | 'maturity' | 'renewal';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ExpansionPotential = 'none' | 'low' | 'medium' | 'high';

/**
 * Health Score Component Weights
 */
export interface HealthScoreWeights {
  productUsage: number;      // Weight for product usage metrics (0-100)
  engagement: number;        // Weight for engagement metrics (0-100)
  support: number;           // Weight for support metrics (0-100)
  financial: number;         // Weight for financial metrics (0-100)
  relationship: number;      // Weight for relationship metrics (0-100)
}

/**
 * Product Usage Metrics
 */
export interface ProductUsageMetrics {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  licenseUtilization: number;        // Percentage of licenses used
  featureAdoptionRate: number;       // Percentage of features being used
  coreFeatureUsage: number;          // Usage of sticky/core features
  loginFrequency: number;            // Average logins per user per week
  sessionDuration: number;           // Average session duration in minutes
  apiCallVolume: number;             // API calls (for integrations)
  dataVolumeGrowth: number;          // Growth in data stored/processed
  integrationCount: number;          // Number of active integrations
  lastActivityDate: Date;
}

/**
 * Engagement Metrics
 */
export interface EngagementMetrics {
  npsScore: number | null;           // Net Promoter Score (-100 to 100)
  csatScore: number | null;          // Customer Satisfaction Score (0-100)
  surveyResponseRate: number;        // Percentage of surveys responded
  emailOpenRate: number;             // Email engagement rate
  meetingAttendance: number;         // QBR/check-in attendance rate
  trainingCompletion: number;        // Training/onboarding completion
  communityParticipation: number;    // Community/forum engagement
  eventAttendance: number;           // Webinar/event attendance
  feedbackSubmissions: number;       // Feature requests, feedback count
  executiveSponsorEngagement: boolean;
}

/**
 * Support Metrics
 */
export interface SupportMetrics {
  totalTickets: number;              // Total support tickets
  openTickets: number;               // Current open tickets
  escalatedTickets: number;          // Escalated ticket count
  avgResolutionTime: number;         // Average resolution time in hours
  firstResponseTime: number;         // Average first response time in hours
  ticketSentiment: number;           // Sentiment analysis score (0-100)
  repeatIssues: number;              // Recurring issue count
  criticalIssues: number;            // P1/Critical issue count
  supportSatisfaction: number;       // Support CSAT score
  documentationUsage: number;        // Self-service documentation views
}

/**
 * Financial Metrics
 */
export interface FinancialMetrics {
  currentMrr: number;                // Current Monthly Recurring Revenue
  contractValue: number;             // Total contract value
  paymentHistory: number;            // Payment timeliness score (0-100)
  daysToRenewal: number;             // Days until renewal
  expansionRevenue: number;          // Expansion revenue in period
  contractionRisk: number;           // Risk of contraction (0-100)
  lifetimeValue: number;             // Customer lifetime value
  billingIssues: number;             // Number of billing issues
  discountLevel: number;             // Current discount percentage
  priceIncreaseAcceptance: boolean;  // Accepted last price increase
}

/**
 * Relationship Metrics
 */
export interface RelationshipMetrics {
  executiveSponsorLevel: string;     // Level of executive sponsor
  championCount: number;             // Number of internal champions
  decisionMakerEngagement: number;   // Decision maker engagement score
  stakeholderCoverage: number;       // Stakeholder coverage percentage
  lastExecutiveMeeting: Date | null;
  communicationFrequency: number;    // Touchpoints per month
  relationshipAge: number;           // Months as customer
  referralsMade: number;             // Number of referrals given
  caseStudyParticipant: boolean;     // Participated in case study
  advisoryBoardMember: boolean;      // Part of customer advisory board
}

/**
 * Customer Health Score
 */
export interface CustomerHealthScore {
  id: string;
  customerId: string;
  tenantId: string;

  // Overall scores
  overallScore: number;              // Composite score (0-100)
  healthStatus: HealthStatus;
  healthTrend: HealthTrend;

  // Component scores
  productUsageScore: number;
  engagementScore: number;
  supportScore: number;
  financialScore: number;
  relationshipScore: number;

  // Detailed metrics
  productUsageMetrics: ProductUsageMetrics;
  engagementMetrics: EngagementMetrics;
  supportMetrics: SupportMetrics;
  financialMetrics: FinancialMetrics;
  relationshipMetrics: RelationshipMetrics;

  // AI insights
  aiPredictedChurnRisk: number;      // AI-predicted churn probability (0-100)
  aiConfidenceLevel: number;         // AI prediction confidence
  aiRecommendations: string[];

  // Lifecycle
  lifecycleStage: LifecycleStage;
  daysInStage: number;

  // Risk & opportunity
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  expansionPotential: ExpansionPotential;
  expansionOpportunities: ExpansionOpportunity[];

  // Timestamps
  calculatedAt: Date;
  nextCalculation: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Health Score History
 */
export interface HealthScoreHistory {
  id: string;
  customerId: string;
  tenantId: string;
  overallScore: number;
  healthStatus: HealthStatus;
  productUsageScore: number;
  engagementScore: number;
  supportScore: number;
  financialScore: number;
  relationshipScore: number;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

/**
 * Risk Factor
 */
export interface RiskFactor {
  id: string;
  customerId: string;
  tenantId: string;
  category: 'usage' | 'engagement' | 'support' | 'financial' | 'relationship';
  severity: RiskLevel;
  description: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  impact: number;                    // Impact on health score
  suggestedAction: string;
  detectedAt: Date;
  resolvedAt: Date | null;
  isActive: boolean;
}

/**
 * Expansion Opportunity
 */
export interface ExpansionOpportunity {
  id: string;
  customerId: string;
  tenantId: string;
  type: 'upsell' | 'cross_sell' | 'upgrade' | 'seats' | 'add_on';
  product: string;
  estimatedValue: number;
  confidence: number;
  signals: string[];
  reasoning: string;
  suggestedApproach: string;
  status: 'identified' | 'qualified' | 'pursuing' | 'won' | 'lost';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Health Score Threshold Configuration
 */
export interface HealthThreshold {
  id: string;
  tenantId: string;
  name: string;
  metric: string;
  healthyMin: number;
  atRiskMin: number;
  criticalMax: number;
  weight: number;
  lifecycleStage: LifecycleStage | null;  // null = applies to all stages
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Customer Success Playbook
 */
export interface SuccessPlaybook {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  triggerType: 'health_score' | 'risk_factor' | 'lifecycle' | 'manual' | 'scheduled';
  triggerConditions: PlaybookTriggerCondition[];
  steps: PlaybookStep[];
  targetLifecycleStages: LifecycleStage[];
  targetHealthStatuses: HealthStatus[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Playbook Trigger Condition
 */
export interface PlaybookTriggerCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in';
  value: string | number | boolean | string[];
}

/**
 * Playbook Step
 */
export interface PlaybookStep {
  order: number;
  type: 'task' | 'email' | 'notification' | 'meeting' | 'survey' | 'escalation';
  name: string;
  description: string;
  assigneeRole: string;
  delayDays: number;
  templateId?: string;
  isRequired: boolean;
}

/**
 * Playbook Execution
 */
export interface PlaybookExecution {
  id: string;
  playbookId: string;
  customerId: string;
  tenantId: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  currentStep: number;
  startedAt: Date;
  completedAt: Date | null;
  completedSteps: CompletedStep[];
  triggeredBy: string;
  assignedTo: string;
  notes: string;
}

/**
 * Completed Playbook Step
 */
export interface CompletedStep {
  stepOrder: number;
  completedAt: Date;
  completedBy: string;
  outcome: string;
  notes: string;
}

/**
 * Customer Success Task
 */
export interface SuccessTask {
  id: string;
  customerId: string;
  tenantId: string;
  playbookExecutionId?: string;
  type: 'check_in' | 'qbr' | 'onboarding' | 'training' | 'renewal' | 'escalation' | 'custom';
  title: string;
  description: string;
  priority: RiskLevel;
  dueDate: Date;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  outcome?: string;
  createdAt: Date;
  completedAt: Date | null;
}

/**
 * Customer Touchpoint
 */
export interface CustomerTouchpoint {
  id: string;
  customerId: string;
  tenantId: string;
  type: 'call' | 'meeting' | 'email' | 'chat' | 'support' | 'event' | 'qbr';
  subject: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  participants: string[];
  duration: number;                  // Duration in minutes
  nextSteps: string[];
  recordedBy: string;
  occurredAt: Date;
  createdAt: Date;
}

/**
 * Health Score Calculation Request
 */
export interface CalculateHealthScoreRequest {
  customerId: string;
  tenantId: string;
  forceRecalculation?: boolean;
}

/**
 * Health Score Dashboard Data
 */
export interface HealthDashboard {
  tenantId: string;
  summary: {
    totalCustomers: number;
    healthyCount: number;
    atRiskCount: number;
    criticalCount: number;
    avgHealthScore: number;
    scoreChange30d: number;
  };
  distribution: {
    score: string;
    count: number;
  }[];
  trendData: {
    date: string;
    avgScore: number;
    healthyPct: number;
    atRiskPct: number;
    criticalPct: number;
  }[];
  topRisks: RiskFactor[];
  topExpansions: ExpansionOpportunity[];
  upcomingRenewals: {
    customerId: string;
    customerName: string;
    renewalDate: Date;
    mrr: number;
    healthScore: number;
    healthStatus: HealthStatus;
  }[];
  recentPlaybooks: PlaybookExecution[];
}

/**
 * Customer Success Metrics (aggregate)
 */
export interface SuccessMetrics {
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  periodStart: Date;
  periodEnd: Date;

  // Retention metrics
  grossRetentionRate: number;
  netRetentionRate: number;
  churnRate: number;
  churnedCustomers: number;
  churnedMrr: number;

  // Expansion metrics
  expansionMrr: number;
  expansionCustomers: number;
  upsellRevenue: number;
  crossSellRevenue: number;

  // Health metrics
  avgHealthScore: number;
  healthScoreImprovement: number;
  customersImproved: number;
  customersDeclined: number;

  // Engagement metrics
  avgNps: number;
  avgCsat: number;
  qbrsCompleted: number;
  trainingCompleted: number;

  // Risk metrics
  activeRisks: number;
  risksResolved: number;
  avgTimeToResolve: number;
}

/**
 * Segment for Health Analysis
 */
export interface CustomerSegment {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  filters: SegmentFilter[];
  customerCount: number;
  avgHealthScore: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Segment Filter
 */
export interface SegmentFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: string | number | boolean | string[];
}
