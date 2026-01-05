/**
 * Opportunity Types
 * Types for sales opportunity/deal management
 */

/**
 * Opportunity Status Enum
 */
export enum OpportunityStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
  ON_HOLD = 'on_hold',
}

/**
 * Opportunity Stage Enum - Customizable per pipeline
 */
export enum DefaultOpportunityStage {
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

/**
 * Opportunity Source
 */
export enum OpportunitySource {
  LEAD_CONVERSION = 'lead_conversion',
  DIRECT = 'direct',
  REFERRAL = 'referral',
  UPSELL = 'upsell',
  CROSS_SELL = 'cross_sell',
}

/**
 * Opportunity Priority
 */
export enum OpportunityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Opportunity DTO
 */
export interface OpportunityDTO {
  id: string;
  tenantId: string;

  // Related entities
  leadId?: string;
  customerId?: string;
  pipelineId?: string;

  // Opportunity details
  name: string;
  description?: string;
  status: OpportunityStatus;
  stage: string;

  // Financial
  amount?: number;
  currency: string;
  probability: number; // 0-100

  // Assignment
  ownerId?: string;
  ownerName?: string;

  // Scheduling
  expectedCloseDate?: Date;
  actualCloseDate?: Date;

  // Won/Lost info
  wonReason?: string;
  lostReason?: string;
  competitorId?: string;

  // Source
  source?: OpportunitySource;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;

  // Computed fields
  weightedAmount?: number; // amount * (probability / 100)
  daysInStage?: number;
  daysToClose?: number;
  isOverdue?: boolean;

  // Related counts
  taskCount?: number;
  noteCount?: number;
}

/**
 * Create Opportunity Request
 */
export interface CreateOpportunityRequest {
  // Related entity (at least one recommended)
  leadId?: string;
  customerId?: string;
  pipelineId?: string;

  // Required fields
  name: string;
  stage: string;

  // Optional fields
  description?: string;
  amount?: number;
  currency?: string;
  probability?: number;
  ownerId?: string;
  expectedCloseDate?: Date;
  source?: OpportunitySource;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update Opportunity Request
 */
export interface UpdateOpportunityRequest {
  name?: string;
  description?: string | null;
  stage?: string;
  amount?: number | null;
  currency?: string;
  probability?: number;
  ownerId?: string | null;
  expectedCloseDate?: Date | null;
  pipelineId?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Win Opportunity Request
 */
export interface WinOpportunityRequest {
  wonReason?: string;
  actualCloseDate?: Date;
  notes?: string;
}

/**
 * Lose Opportunity Request
 */
export interface LoseOpportunityRequest {
  lostReason: string;
  competitorId?: string;
  actualCloseDate?: Date;
  notes?: string;
}

/**
 * Opportunity Filter Options
 */
export interface OpportunityFilterOptions {
  status?: OpportunityStatus | OpportunityStatus[];
  stage?: string | string[];
  ownerId?: string;
  leadId?: string;
  customerId?: string;
  pipelineId?: string;
  source?: OpportunitySource | OpportunitySource[];
  amountMin?: number;
  amountMax?: number;
  probabilityMin?: number;
  probabilityMax?: number;
  expectedCloseDateFrom?: Date;
  expectedCloseDateTo?: Date;
  isOverdue?: boolean;
  searchTerm?: string;
}

/**
 * Opportunity Sort Options
 */
export interface OpportunitySortOptions {
  sortBy?: 'name' | 'amount' | 'probability' | 'expectedCloseDate' | 'createdAt' | 'updatedAt' | 'stage';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Opportunity Statistics
 */
export interface OpportunityStatistics {
  total: number;
  byStatus: {
    open: number;
    won: number;
    lost: number;
    onHold: number;
  };
  byStage: Record<string, number>;
  totalValue: number;
  weightedValue: number;
  averageDealSize: number;
  winRate: number; // Percentage
  averageTimeToClose: number; // In days
  closingThisMonth: number;
  closingThisQuarter: number;
  overdueCount: number;
}

/**
 * Pipeline Forecast
 */
export interface PipelineForecast {
  period: string;
  openOpportunities: number;
  totalValue: number;
  weightedValue: number;
  expectedCloses: number;
  expectedValue: number;
}

/**
 * Stage Movement
 */
export interface StageMovement {
  opportunityId: string;
  fromStage: string;
  toStage: string;
  movedAt: Date;
  movedBy?: string;
}

/**
 * Bulk Opportunity Operation
 */
export interface BulkOpportunityOperation {
  opportunityIds: string[];
  action: 'reassign' | 'updateStage' | 'delete' | 'updatePipeline';
  ownerId?: string; // For reassign action
  stage?: string; // For updateStage action
  pipelineId?: string; // For updatePipeline action
}

/**
 * Bulk Opportunity Result
 */
export interface BulkOpportunityResult {
  successful: string[];
  failed: { opportunityId: string; error: string }[];
}

/**
 * Opportunity Activity Entry
 */
export interface OpportunityActivityEntry {
  id: string;
  opportunityId: string;
  action: string;
  userId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  timestamp: Date;
}

/**
 * Convert Lead to Opportunity Request
 */
export interface ConvertLeadToOpportunityRequest {
  leadId: string;
  opportunityName: string;
  stage?: string;
  amount?: number;
  probability?: number;
  expectedCloseDate?: Date;
  pipelineId?: string;
  createCustomer?: boolean;
  customerName?: string;
}
