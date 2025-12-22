/**
 * Customer Segmentation Types
 * Dynamic segmentation engine for targeting and personalization
 */

/**
 * Segment status
 */
export type SegmentStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Segment type
 */
export type SegmentType =
  | 'static'      // Manually maintained list
  | 'dynamic'     // Rule-based automatic membership
  | 'predictive'  // ML-based segments
  | 'behavioral'; // Based on user behavior

/**
 * Rule operator types
 */
export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'not_between'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'date_before'
  | 'date_after'
  | 'date_between'
  | 'days_ago'
  | 'days_from_now'
  | 'regex_match';

/**
 * Rule logical operators
 */
export type LogicalOperator = 'AND' | 'OR';

/**
 * Field types for rules
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array'
  | 'enum';

/**
 * Entity types for segmentation
 */
export type SegmentEntityType =
  | 'lead'
  | 'contact'
  | 'customer'
  | 'opportunity'
  | 'account';

/**
 * Segmentation rule condition
 */
export interface SegmentCondition {
  id: string;
  field: string;
  fieldType: FieldType;
  operator: RuleOperator;
  value: unknown;
  secondValue?: unknown; // For 'between' operators
}

/**
 * Rule group for complex conditions
 */
export interface SegmentRuleGroup {
  id: string;
  operator: LogicalOperator;
  conditions: SegmentCondition[];
  groups?: SegmentRuleGroup[]; // Nested groups
}

/**
 * Behavioral trigger for segments
 */
export interface BehavioralTrigger {
  id: string;
  eventType: string;
  eventCount?: number;
  timeframeDays?: number;
  properties?: Record<string, unknown>;
}

/**
 * Segment definition
 */
export interface Segment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: SegmentType;
  entityType: SegmentEntityType;
  status: SegmentStatus;
  rules: SegmentRuleGroup;
  behavioralTriggers?: BehavioralTrigger[];
  tags?: string[];
  memberCount: number;
  lastCalculatedAt?: Date;
  refreshIntervalMinutes?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Segment member
 */
export interface SegmentMember {
  id: string;
  segmentId: string;
  entityId: string;
  entityType: SegmentEntityType;
  score?: number; // Relevance score
  addedAt: Date;
  addedBy?: string; // 'system' for dynamic, userId for manual
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Create segment request
 */
export interface CreateSegmentRequest {
  name: string;
  description?: string;
  type: SegmentType;
  entityType: SegmentEntityType;
  rules: SegmentRuleGroup;
  behavioralTriggers?: BehavioralTrigger[];
  tags?: string[];
  refreshIntervalMinutes?: number;
}

/**
 * Update segment request
 */
export interface UpdateSegmentRequest {
  name?: string;
  description?: string;
  status?: SegmentStatus;
  rules?: SegmentRuleGroup;
  behavioralTriggers?: BehavioralTrigger[];
  tags?: string[];
  refreshIntervalMinutes?: number;
}

/**
 * Segment query options
 */
export interface SegmentQueryOptions {
  status?: SegmentStatus;
  type?: SegmentType;
  entityType?: SegmentEntityType;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'memberCount' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Segment membership check result
 */
export interface MembershipCheckResult {
  entityId: string;
  isMember: boolean;
  score?: number;
  matchedRules?: string[];
  reason?: string;
}

/**
 * Segment calculation result
 */
export interface SegmentCalculationResult {
  segmentId: string;
  previousCount: number;
  newCount: number;
  added: number;
  removed: number;
  duration: number;
  timestamp: Date;
}

/**
 * Segment overlap analysis
 */
export interface SegmentOverlap {
  segmentAId: string;
  segmentBId: string;
  segmentAName: string;
  segmentBName: string;
  segmentACount: number;
  segmentBCount: number;
  overlapCount: number;
  overlapPercentageA: number;
  overlapPercentageB: number;
}

/**
 * Segment insights
 */
export interface SegmentInsights {
  segmentId: string;
  memberCount: number;
  growthRate: number; // Percentage change
  topAttributes: Array<{
    field: string;
    value: string;
    count: number;
    percentage: number;
  }>;
  behaviorMetrics: {
    avgEngagementScore: number;
    avgDealValue: number;
    conversionRate: number;
  };
  trends: Array<{
    date: Date;
    count: number;
  }>;
}

/**
 * Available segmentation fields by entity
 */
export interface SegmentFieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  operators: RuleOperator[];
  options?: string[]; // For enum fields
  entityTypes: SegmentEntityType[];
}

/**
 * Predefined segment templates
 */
export interface SegmentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  entityType: SegmentEntityType;
  rules: SegmentRuleGroup;
  icon?: string;
}

/**
 * Segment export format
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * Export request
 */
export interface SegmentExportRequest {
  segmentId: string;
  format: ExportFormat;
  fields?: string[];
  includeMetadata?: boolean;
}

/**
 * Segment metrics
 */
export interface SegmentMetrics {
  totalSegments: number;
  activeSegments: number;
  totalMembers: number;
  avgMembersPerSegment: number;
  calculationsToday: number;
  avgCalculationTime: number;
  byType: Record<SegmentType, number>;
  byEntityType: Record<SegmentEntityType, number>;
}

/**
 * Default field definitions
 */
export const DEFAULT_SEGMENT_FIELDS: SegmentFieldDefinition[] = [
  // Lead/Contact fields
  {
    name: 'email',
    label: 'Email',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'firstName',
    label: 'First Name',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'starts_with', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'starts_with', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'company',
    label: 'Company',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'starts_with', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'industry',
    label: 'Industry',
    type: 'enum',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Other'],
    entityTypes: ['lead', 'contact', 'customer', 'account'],
  },
  {
    name: 'country',
    label: 'Country',
    type: 'string',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'city',
    label: 'City',
    type: 'string',
    operators: ['equals', 'not_equals', 'contains', 'in', 'not_in'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'score',
    label: 'Lead Score',
    type: 'number',
    operators: ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['lead'],
  },
  {
    name: 'status',
    label: 'Status',
    type: 'enum',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
    entityTypes: ['lead', 'opportunity'],
  },
  {
    name: 'source',
    label: 'Lead Source',
    type: 'enum',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: ['Website', 'Referral', 'Cold Call', 'Email Campaign', 'Social Media', 'Event', 'Partner', 'Other'],
    entityTypes: ['lead'],
  },
  {
    name: 'createdAt',
    label: 'Created Date',
    type: 'date',
    operators: ['date_before', 'date_after', 'date_between', 'days_ago'],
    entityTypes: ['lead', 'contact', 'customer', 'opportunity'],
  },
  {
    name: 'lastActivityAt',
    label: 'Last Activity',
    type: 'date',
    operators: ['date_before', 'date_after', 'date_between', 'days_ago'],
    entityTypes: ['lead', 'contact', 'customer'],
  },
  {
    name: 'dealValue',
    label: 'Deal Value',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['opportunity'],
  },
  {
    name: 'probability',
    label: 'Win Probability',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['opportunity'],
  },
  {
    name: 'tags',
    label: 'Tags',
    type: 'array',
    operators: ['contains', 'not_contains', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'contact', 'customer', 'opportunity'],
  },
  {
    name: 'assignedTo',
    label: 'Assigned To',
    type: 'string',
    operators: ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'],
    entityTypes: ['lead', 'opportunity'],
  },
  {
    name: 'lifetimeValue',
    label: 'Lifetime Value',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['customer'],
  },
  {
    name: 'subscriptionTier',
    label: 'Subscription Tier',
    type: 'enum',
    operators: ['equals', 'not_equals', 'in', 'not_in'],
    options: ['Free', 'Starter', 'Professional', 'Enterprise'],
    entityTypes: ['customer'],
  },
  {
    name: 'employeeCount',
    label: 'Employee Count',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['lead', 'customer', 'account'],
  },
  {
    name: 'annualRevenue',
    label: 'Annual Revenue',
    type: 'number',
    operators: ['equals', 'greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'between'],
    entityTypes: ['lead', 'customer', 'account'],
  },
];

/**
 * Default segment templates
 */
export const DEFAULT_SEGMENT_TEMPLATES: SegmentTemplate[] = [
  {
    id: 'hot-leads',
    name: 'Hot Leads',
    description: 'Leads with high scores that are ready for sales outreach',
    category: 'Sales',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'score', fieldType: 'number', operator: 'greater_or_equal', value: 80 },
        { id: '2', field: 'status', fieldType: 'enum', operator: 'in', value: ['new', 'contacted', 'qualified'] },
      ],
    },
    icon: 'fire',
  },
  {
    id: 'cold-leads',
    name: 'Cold Leads',
    description: 'Leads that have been inactive for 30+ days',
    category: 'Re-engagement',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'lastActivityAt', fieldType: 'date', operator: 'days_ago', value: 30 },
        { id: '2', field: 'status', fieldType: 'enum', operator: 'not_in', value: ['won', 'lost'] },
      ],
    },
    icon: 'snowflake',
  },
  {
    id: 'enterprise-prospects',
    name: 'Enterprise Prospects',
    description: 'Large companies that match enterprise criteria',
    category: 'Sales',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'employeeCount', fieldType: 'number', operator: 'greater_or_equal', value: 500 },
        { id: '2', field: 'annualRevenue', fieldType: 'number', operator: 'greater_or_equal', value: 10000000 },
      ],
    },
    icon: 'building',
  },
  {
    id: 'high-value-customers',
    name: 'High Value Customers',
    description: 'Customers with high lifetime value',
    category: 'Customer Success',
    entityType: 'customer',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'lifetimeValue', fieldType: 'number', operator: 'greater_or_equal', value: 50000 },
      ],
    },
    icon: 'star',
  },
  {
    id: 'at-risk-customers',
    name: 'At-Risk Customers',
    description: 'Customers showing signs of potential churn',
    category: 'Customer Success',
    entityType: 'customer',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'lastActivityAt', fieldType: 'date', operator: 'days_ago', value: 45 },
      ],
    },
    icon: 'alert-triangle',
  },
  {
    id: 'tech-industry',
    name: 'Technology Industry',
    description: 'All leads and contacts in the technology industry',
    category: 'Industry',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'industry', fieldType: 'enum', operator: 'equals', value: 'Technology' },
      ],
    },
    icon: 'cpu',
  },
  {
    id: 'website-leads',
    name: 'Website Leads',
    description: 'Leads that came from the website',
    category: 'Marketing',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'source', fieldType: 'enum', operator: 'equals', value: 'Website' },
      ],
    },
    icon: 'globe',
  },
  {
    id: 'unassigned-leads',
    name: 'Unassigned Leads',
    description: 'Leads that have not been assigned to any sales rep',
    category: 'Operations',
    entityType: 'lead',
    rules: {
      id: 'root',
      operator: 'AND',
      conditions: [
        { id: '1', field: 'assignedTo', fieldType: 'string', operator: 'is_empty', value: null },
      ],
    },
    icon: 'user-x',
  },
];
