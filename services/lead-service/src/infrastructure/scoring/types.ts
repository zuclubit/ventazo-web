/**
 * Lead Scoring Types and Interfaces
 * Defines scoring rules, conditions, and actions
 */

export enum ScoringRuleType {
  // Attribute-based rules
  COMPANY_SIZE = 'company_size',
  INDUSTRY = 'industry',
  LOCATION = 'location',
  SOURCE = 'source',
  BUDGET = 'budget',
  TITLE = 'title',

  // Behavior-based rules
  EMAIL_OPENED = 'email_opened',
  LINK_CLICKED = 'link_clicked',
  PAGE_VISITED = 'page_visited',
  FORM_SUBMITTED = 'form_submitted',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  MEETING_SCHEDULED = 'meeting_scheduled',

  // Engagement-based rules
  RESPONSE_TIME = 'response_time',
  INTERACTION_COUNT = 'interaction_count',
  DAYS_SINCE_LAST_ACTIVITY = 'days_since_last_activity',

  // Time-based rules
  CREATED_WITHIN = 'created_within',
  FOLLOW_UP_OVERDUE = 'follow_up_overdue',

  // Custom rules
  CUSTOM_FIELD = 'custom_field',
  FORMULA = 'formula',
}

export enum ScoringOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  MATCHES_REGEX = 'matches_regex',
}

export enum ScoringAction {
  ADD = 'add',
  SUBTRACT = 'subtract',
  SET = 'set',
  MULTIPLY = 'multiply',
}

export interface ScoringCondition {
  field: string;
  operator: ScoringOperator;
  value: unknown;
  secondaryValue?: unknown; // For BETWEEN operator
}

export interface ScoringRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ScoringRuleType;
  conditions: ScoringCondition[];
  conditionLogic: 'AND' | 'OR';
  action: ScoringAction;
  points: number;
  maxApplications?: number; // Max times this rule can apply to a single lead
  priority: number; // Lower = higher priority
  isActive: boolean;
  category?: string; // For grouping rules
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoringRuleSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  rules: ScoringRule[];
  baseScore: number; // Starting score for new leads
  minScore: number;
  maxScore: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScoreCalculationResult {
  leadId: string;
  previousScore: number;
  newScore: number;
  appliedRules: AppliedRule[];
  breakdown: ScoreBreakdown;
  calculatedAt: Date;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  action: ScoringAction;
  points: number;
  reason: string;
  matchedConditions: string[];
}

export interface ScoreBreakdown {
  baseScore: number;
  attributeScore: number;
  behaviorScore: number;
  engagementScore: number;
  decayScore: number;
  bonusScore: number;
  totalScore: number;
}

export interface CreateScoringRuleInput {
  tenantId: string;
  name: string;
  description?: string;
  type: ScoringRuleType;
  conditions: ScoringCondition[];
  conditionLogic?: 'AND' | 'OR';
  action: ScoringAction;
  points: number;
  maxApplications?: number;
  priority?: number;
  category?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
}

export interface UpdateScoringRuleInput {
  name?: string;
  description?: string;
  conditions?: ScoringCondition[];
  conditionLogic?: 'AND' | 'OR';
  action?: ScoringAction;
  points?: number;
  maxApplications?: number;
  priority?: number;
  isActive?: boolean;
  category?: string;
  tags?: string[];
  validFrom?: Date;
  validUntil?: Date;
}

export interface ScoringContext {
  lead: {
    id: string;
    tenantId: string;
    companyName: string;
    email: string;
    phone?: string;
    industry?: string;
    employeeCount?: string;
    annualRevenue?: string;
    source: string;
    status: string;
    score: number;
    ownerId?: string;
    customFields?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt?: Date;
    nextFollowUpAt?: Date;
  };
  activity?: {
    type: string;
    data: Record<string, unknown>;
    timestamp: Date;
  };
  metadata?: Record<string, unknown>;
}

// Default scoring rules templates
export const DEFAULT_SCORING_RULES: Omit<CreateScoringRuleInput, 'tenantId'>[] = [
  // Company Size Rules
  {
    name: 'Large Company (500+ employees)',
    type: ScoringRuleType.COMPANY_SIZE,
    conditions: [
      { field: 'employeeCount', operator: ScoringOperator.GREATER_THAN_OR_EQUAL, value: 500 },
    ],
    action: ScoringAction.ADD,
    points: 20,
    priority: 10,
    category: 'Demographics',
  },
  {
    name: 'Medium Company (100-499 employees)',
    type: ScoringRuleType.COMPANY_SIZE,
    conditions: [
      { field: 'employeeCount', operator: ScoringOperator.BETWEEN, value: 100, secondaryValue: 499 },
    ],
    action: ScoringAction.ADD,
    points: 15,
    priority: 10,
    category: 'Demographics',
  },
  {
    name: 'Small Company (10-99 employees)',
    type: ScoringRuleType.COMPANY_SIZE,
    conditions: [
      { field: 'employeeCount', operator: ScoringOperator.BETWEEN, value: 10, secondaryValue: 99 },
    ],
    action: ScoringAction.ADD,
    points: 10,
    priority: 10,
    category: 'Demographics',
  },

  // Industry Rules
  {
    name: 'Target Industry - Technology',
    type: ScoringRuleType.INDUSTRY,
    conditions: [
      { field: 'industry', operator: ScoringOperator.IN, value: ['Technology', 'Software', 'IT Services'] },
    ],
    action: ScoringAction.ADD,
    points: 15,
    priority: 20,
    category: 'Demographics',
  },
  {
    name: 'Target Industry - Finance',
    type: ScoringRuleType.INDUSTRY,
    conditions: [
      { field: 'industry', operator: ScoringOperator.IN, value: ['Finance', 'Banking', 'Insurance'] },
    ],
    action: ScoringAction.ADD,
    points: 15,
    priority: 20,
    category: 'Demographics',
  },

  // Source Rules
  {
    name: 'High-Value Source - Referral',
    type: ScoringRuleType.SOURCE,
    conditions: [
      { field: 'source', operator: ScoringOperator.EQUALS, value: 'Referral' },
    ],
    action: ScoringAction.ADD,
    points: 25,
    priority: 30,
    category: 'Source',
  },
  {
    name: 'High-Value Source - Demo Request',
    type: ScoringRuleType.SOURCE,
    conditions: [
      { field: 'source', operator: ScoringOperator.CONTAINS, value: 'demo' },
    ],
    action: ScoringAction.ADD,
    points: 20,
    priority: 30,
    category: 'Source',
  },
  {
    name: 'Organic Source - Website',
    type: ScoringRuleType.SOURCE,
    conditions: [
      { field: 'source', operator: ScoringOperator.IN, value: ['Website', 'Organic Search', 'Blog'] },
    ],
    action: ScoringAction.ADD,
    points: 10,
    priority: 30,
    category: 'Source',
  },

  // Engagement Rules
  {
    name: 'Recent Activity (within 7 days)',
    type: ScoringRuleType.DAYS_SINCE_LAST_ACTIVITY,
    conditions: [
      { field: 'daysSinceLastActivity', operator: ScoringOperator.LESS_THAN_OR_EQUAL, value: 7 },
    ],
    action: ScoringAction.ADD,
    points: 10,
    priority: 40,
    category: 'Engagement',
  },
  {
    name: 'Stale Lead (30+ days inactive)',
    type: ScoringRuleType.DAYS_SINCE_LAST_ACTIVITY,
    conditions: [
      { field: 'daysSinceLastActivity', operator: ScoringOperator.GREATER_THAN, value: 30 },
    ],
    action: ScoringAction.SUBTRACT,
    points: 15,
    priority: 40,
    category: 'Engagement',
  },

  // Follow-up Rules
  {
    name: 'Overdue Follow-up Penalty',
    type: ScoringRuleType.FOLLOW_UP_OVERDUE,
    conditions: [
      { field: 'followUpOverdue', operator: ScoringOperator.EQUALS, value: true },
    ],
    action: ScoringAction.SUBTRACT,
    points: 10,
    priority: 50,
    category: 'Follow-up',
  },

  // Complete Profile Bonus
  {
    name: 'Complete Profile Bonus',
    type: ScoringRuleType.CUSTOM_FIELD,
    conditions: [
      { field: 'phone', operator: ScoringOperator.IS_NOT_EMPTY, value: null },
      { field: 'industry', operator: ScoringOperator.IS_NOT_EMPTY, value: null },
      { field: 'employeeCount', operator: ScoringOperator.IS_NOT_EMPTY, value: null },
    ],
    conditionLogic: 'AND',
    action: ScoringAction.ADD,
    points: 10,
    priority: 60,
    category: 'Profile',
  },
];
