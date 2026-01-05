/**
 * Team & Territory Management Types
 * Comprehensive types for sales team organization, territories, and quota management
 */

// ==================== Team Types ====================

export type TeamRole = 'member' | 'team_lead' | 'manager' | 'director' | 'vp';

export type TeamType = 'sales' | 'support' | 'marketing' | 'customer_success' | 'operations';

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TeamType;
  parentTeamId?: string;
  managerId?: string;
  settings: TeamSettings;
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  autoAssignment?: boolean;
  roundRobinEnabled?: boolean;
  maxLeadsPerMember?: number;
  workingHours?: {
    start?: string;
    end?: string;
    timezone?: string;
    workDays?: number[];
  };
  notifications?: {
    newLeadAlert?: boolean;
    quotaReminders?: boolean;
    performanceReports?: boolean;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  position?: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamHierarchy {
  team: Team;
  manager?: TeamMemberProfile;
  members: TeamMemberProfile[];
  subTeams: TeamHierarchy[];
  stats: TeamStats;
}

export interface TeamMemberProfile {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: TeamRole;
  position?: string;
  territories: string[];
  currentLeadCount: number;
  quotaProgress: number;
}

export interface TeamStats {
  totalMembers: number;
  activeDeals: number;
  totalLeads: number;
  quotaAttainment: number;
  avgDealSize: number;
  winRate: number;
  avgCycleTime: number;
}

// ==================== Territory Types ====================

export type TerritoryType = 'geographic' | 'industry' | 'account_size' | 'product' | 'named_accounts' | 'hybrid';

export type TerritoryAssignmentType = 'exclusive' | 'shared' | 'overlay';

export interface Territory {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: TerritoryType;
  parentTerritoryId?: string;
  criteria: TerritoryCriteria;
  assignments: TerritoryAssignment[];
  quotas: TerritoryQuota[];
  settings: TerritorySettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TerritoryCriteria {
  geographic?: GeographicCriteria;
  industry?: string[];
  accountSize?: AccountSizeCriteria;
  revenueRange?: RevenueRangeCriteria;
  namedAccounts?: string[];
  customRules?: CustomRule[];
}

export interface GeographicCriteria {
  countries?: string[];
  states?: string[];
  cities?: string[];
  postalCodes?: string[];
  regions?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}

export interface AccountSizeCriteria {
  minEmployees?: number;
  maxEmployees?: number;
  segments?: string[];
}

export interface RevenueRangeCriteria {
  minRevenue?: number;
  maxRevenue?: number;
  currency: string;
}

export interface CustomRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'in' | 'not_in' | 'greater_than' | 'less_than';
  value?: unknown;
}

export interface TerritoryAssignment {
  id: string;
  territoryId: string;
  userId: string;
  teamId?: string;
  assignmentType: TerritoryAssignmentType;
  isPrimary: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TerritorySettings {
  autoLeadRouting: boolean;
  allowOverlap: boolean;
  roundRobinWithinTerritory: boolean;
  conflictResolution: 'first_assigned' | 'primary_owner' | 'manager_decides';
  leadCapacity?: number;
}

export interface TerritoryHierarchy {
  territory: Territory;
  assignments: TerritoryAssignmentDetail[];
  subTerritories: TerritoryHierarchy[];
  stats: TerritoryStats;
}

export interface TerritoryAssignmentDetail {
  assignment: TerritoryAssignment;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface TerritoryStats {
  totalAccounts: number;
  totalLeads: number;
  openOpportunities: number;
  revenue: number;
  coverage: number;
  assignedReps: number;
}

// ==================== Quota Types ====================

export type QuotaPeriod = 'monthly' | 'quarterly' | 'yearly';

export type QuotaType = 'revenue' | 'deals' | 'leads' | 'activities' | 'custom';

export type QuotaStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface Quota {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: QuotaType;
  period: QuotaPeriod;
  startDate: Date;
  endDate: Date;
  target: number;
  currency?: string;
  status: QuotaStatus;
  settings: QuotaSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaSettings {
  allowOverachievement: boolean;
  prorateForiNewHires: boolean;
  includeInForecasting: boolean;
  rollupToParent: boolean;
  accelerators?: QuotaAccelerator[];
}

export interface QuotaAccelerator {
  threshold: number;
  multiplier: number;
  name: string;
}

export interface QuotaAssignment {
  id: string;
  quotaId: string;
  userId?: string;
  teamId?: string;
  territoryId?: string;
  target: number;
  adjustments: QuotaAdjustment[];
  status: QuotaStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotaAdjustment {
  id: string;
  assignmentId: string;
  amount: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: Date;
}

export interface TerritoryQuota {
  quotaId: string;
  target: number;
  actual: number;
  attainment: number;
}

export interface QuotaProgress {
  assignment: QuotaAssignment;
  quota: Quota;
  actual: number;
  attainment: number;
  remaining: number;
  forecast: number;
  trend: 'up' | 'down' | 'stable';
  paceToQuota: number;
  daysRemaining: number;
}

export interface QuotaRollup {
  entityType: 'user' | 'team' | 'territory';
  entityId: string;
  entityName: string;
  target: number;
  actual: number;
  attainment: number;
  children?: QuotaRollup[];
}

// ==================== Performance Types ====================

export interface PerformanceMetrics {
  userId: string;
  teamId?: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    leadsGenerated: number;
    leadsConverted: number;
    conversionRate: number;
    dealsWon: number;
    dealsLost: number;
    winRate: number;
    revenue: number;
    avgDealSize: number;
    avgCycleTime: number;
    activitiesCompleted: number;
    quotaAttainment: number;
  };
  rankings: {
    inTeam: number;
    inCompany: number;
    percentile: number;
  };
}

export interface Leaderboard {
  period: {
    start: Date;
    end: Date;
  };
  metric: string;
  entries: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  teamName?: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

// ==================== Assignment Rules Types ====================

export type AssignmentMethod = 'round_robin' | 'weighted' | 'load_balanced' | 'geographic' | 'manual';

export interface AssignmentRule {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  method: AssignmentMethod;
  priority: number;
  conditions: AssignmentCondition[];
  actions: AssignmentAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignmentCondition {
  field: string;
  operator: string;
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

export interface AssignmentAction {
  type: 'assign_to_user' | 'assign_to_team' | 'assign_to_territory' | 'notify';
  target?: string;
  fallback?: string;
}

export interface AssignmentResult {
  leadId: string;
  assignedTo: {
    userId?: string;
    teamId?: string;
    territoryId?: string;
  };
  rule: AssignmentRule;
  reason: string;
  assignedAt: Date;
}

// ==================== DTOs ====================

export interface CreateTeamInput {
  name: string;
  description?: string;
  type?: TeamType;
  parentTeamId?: string;
  managerId?: string;
  settings?: Partial<TeamSettings>;
  metadata?: Record<string, unknown>;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  type?: TeamType;
  parentTeamId?: string | null;
  managerId?: string | null;
  settings?: Partial<TeamSettings>;
  metadata?: Record<string, unknown>;
  isActive?: boolean;
}

export interface AddTeamMemberInput {
  userId: string;
  role?: TeamRole;
  position?: string;
}

export interface CreateTerritoryInput {
  name: string;
  description?: string;
  type?: TerritoryType;
  parentTerritoryId?: string;
  criteria?: TerritoryCriteria;
  settings?: Partial<TerritorySettings>;
}

export interface UpdateTerritoryInput {
  name?: string;
  description?: string;
  type?: TerritoryType;
  parentTerritoryId?: string | null;
  criteria?: TerritoryCriteria;
  settings?: Partial<TerritorySettings>;
  isActive?: boolean;
}

export interface AssignTerritoryInput {
  userId: string;
  teamId?: string;
  assignmentType?: TerritoryAssignmentType;
  isPrimary?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateQuotaInput {
  name: string;
  description?: string;
  type?: QuotaType;
  period?: QuotaPeriod;
  startDate: Date;
  endDate: Date;
  target: number;
  currency?: string;
  settings?: Partial<QuotaSettings>;
}

export interface UpdateQuotaInput {
  name?: string;
  description?: string;
  target?: number;
  settings?: Partial<QuotaSettings>;
  status?: QuotaStatus;
}

export interface AssignQuotaInput {
  userId?: string;
  teamId?: string;
  territoryId?: string;
  target: number;
}

export interface AdjustQuotaInput {
  amount: number;
  reason: string;
}

export interface CreateAssignmentRuleInput {
  name: string;
  description?: string;
  method: AssignmentMethod;
  priority: number;
  conditions: AssignmentCondition[];
  actions: AssignmentAction[];
}

export interface UpdateAssignmentRuleInput {
  name?: string;
  description?: string;
  method?: AssignmentMethod;
  priority?: number;
  conditions?: AssignmentCondition[];
  actions?: AssignmentAction[];
  isActive?: boolean;
}
