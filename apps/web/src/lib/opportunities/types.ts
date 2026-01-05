// ============================================
// Opportunities Module Types - FASE 5.4
// TypeScript types and interfaces for opportunities
// ============================================

// ============================================
// Enums & Constants
// ============================================

export const OPPORTUNITY_STATUS = ['open', 'won', 'lost', 'stalled'] as const;
export type OpportunityStatus = typeof OPPORTUNITY_STATUS[number];

export const OPPORTUNITY_PRIORITY = ['low', 'medium', 'high', 'critical'] as const;
export type OpportunityPriority = typeof OPPORTUNITY_PRIORITY[number];

export const OPPORTUNITY_STAGE_TYPE = ['open', 'won', 'lost'] as const;
export type OpportunityStageType = typeof OPPORTUNITY_STAGE_TYPE[number];

export const OPPORTUNITY_SOURCE = ['lead_conversion', 'direct', 'referral', 'upsell', 'cross_sell'] as const;
export type OpportunitySource = typeof OPPORTUNITY_SOURCE[number];

export const SOURCE_LABELS: Record<OpportunitySource, string> = {
  lead_conversion: 'Conversión de Lead',
  direct: 'Directo',
  referral: 'Referido',
  upsell: 'Upsell',
  cross_sell: 'Cross-sell',
};

export const OPPORTUNITY_ACTIVITY_TYPE = [
  'created',
  'updated',
  'status_changed',
  'stage_changed',
  'owner_changed',
  'amount_changed',
  'probability_changed',
  'won',
  'lost',
  'reopened',
  'note_added',
  'note_updated',
  'note_deleted',
  'close_date_changed',
  'contact_linked',
  'contact_unlinked',
] as const;
export type OpportunityActivityType = typeof OPPORTUNITY_ACTIVITY_TYPE[number];

// ============================================
// Display Labels & Colors
// ============================================

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
  stalled: 'Estancada',
};

export const STATUS_COLORS: Record<OpportunityStatus, string> = {
  open: 'bg-[var(--opportunity-open-bg)] text-[var(--opportunity-open)] border border-[var(--opportunity-open-border)]',
  won: 'bg-[var(--opportunity-won-bg)] text-[var(--opportunity-won)] border border-[var(--opportunity-won-border)]',
  lost: 'bg-[var(--opportunity-lost-bg)] text-[var(--opportunity-lost)] border border-[var(--opportunity-lost-border)]',
  stalled: 'bg-[var(--opportunity-stalled-bg)] text-[var(--opportunity-stalled)] border border-[var(--opportunity-stalled-border)]',
};

export const PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export const PRIORITY_COLORS: Record<OpportunityPriority, string> = {
  low: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)] border border-[var(--priority-low-border)]',
  medium: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border border-[var(--priority-medium-border)]',
  high: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)] border border-[var(--priority-high-border)]',
  critical: 'bg-[var(--priority-critical-bg)] text-[var(--priority-critical)] border border-[var(--priority-critical-border)]',
};

export const STAGE_TYPE_LABELS: Record<OpportunityStageType, string> = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
};

export const STAGE_TYPE_COLORS: Record<OpportunityStageType, string> = {
  open: 'bg-[var(--opportunity-open)]',
  won: 'bg-[var(--opportunity-won)]',
  lost: 'bg-[var(--opportunity-lost)]',
};

export const ACTIVITY_LABELS: Record<OpportunityActivityType, string> = {
  created: 'Oportunidad creada',
  updated: 'Oportunidad actualizada',
  status_changed: 'Estado cambiado',
  stage_changed: 'Etapa cambiada',
  owner_changed: 'Propietario cambiado',
  amount_changed: 'Monto actualizado',
  probability_changed: 'Probabilidad actualizada',
  won: 'Oportunidad ganada',
  lost: 'Oportunidad perdida',
  reopened: 'Oportunidad reabierta',
  note_added: 'Nota agregada',
  note_updated: 'Nota actualizada',
  note_deleted: 'Nota eliminada',
  close_date_changed: 'Fecha de cierre cambiada',
  contact_linked: 'Contacto vinculado',
  contact_unlinked: 'Contacto desvinculado',
};

export const ACTIVITY_COLORS: Record<OpportunityActivityType, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  status_changed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  stage_changed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  owner_changed: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  amount_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  probability_changed: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  reopened: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  note_added: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  note_updated: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  note_deleted: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  close_date_changed: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  contact_linked: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
  contact_unlinked: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
};

// ============================================
// Core Interfaces
// ============================================

export interface OpportunityPipelineStage {
  id: string;
  tenantId: string;
  label: string;
  description: string | null;
  order: number;
  color: string;
  probability: number;
  stageType: OpportunityStageType;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  tenantId: string;
  leadId: string | null;
  customerId: string | null;
  contactId: string | null;
  ownerId: string | null;
  teamId?: string | null; // FASE 6.4 — Added for team assignment
  pipelineId: string | null; // FASE 6.4 — Added for pipeline association
  name: string; // Backend uses 'name', not 'title'
  stageLabel?: string | null; // Stage label (string from backend)
  description: string | null;
  stageId: string | null;
  status: OpportunityStatus;
  priority: OpportunityPriority;
  amount: number;
  currency: string;
  probability: number;
  // FASE 6.4 — Recurring revenue fields
  recurringAmount?: number | null;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annually' | null;
  expectedCloseDate: string | null;
  actualCloseDate: string | null;
  lostReason: string | null;
  lostReasonId?: string | null; // FASE 6.4 — Reference to lost reasons
  competitorId?: string | null; // FASE 6.4 — Reference to competitor
  wonNotes: string | null;
  source?: string | null; // FASE 6.4 — Lead source tracking
  campaignId?: string | null; // FASE 6.4 — Campaign attribution
  tags: string[];
  customFields?: Record<string, unknown>; // FASE 6.4 — Custom fields
  metadata: Record<string, unknown>;
  lastActivityAt?: string | null; // FASE 6.4 — Activity tracking
  createdAt: string;
  updatedAt: string;
  // Computed
  forecast?: number;
  // Relations (optional, populated by API)
  stage?: OpportunityPipelineStage;
  lead?: {
    id: string;
    fullName: string;
    email: string | null;
  };
  customer?: {
    id: string;
    name: string;
    email: string | null;
  };
  contact?: {
    id: string;
    name: string;
    email: string | null;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface OpportunityNote {
  id: string;
  tenantId: string;
  opportunityId: string;
  createdBy: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Relations (optional)
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface OpportunityActivity {
  id: string;
  tenantId: string;
  opportunityId: string;
  userId: string | null;
  actionType: OpportunityActivityType;
  description: string | null;
  metadata: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdAt: string;
  // Relations (optional)
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

// ============================================
// Pipeline View Types
// ============================================

export interface PipelineColumn {
  stage: OpportunityPipelineStage;
  opportunities: Opportunity[];
  totalAmount: number;
  totalForecast: number;
  count: number;
}

export interface PipelineView {
  columns: PipelineColumn[];
  totalOpportunities: number;
  totalAmount: number;
  totalForecast: number;
  wonAmount: number;
  lostAmount: number;
}

// ============================================
// Request/Response Types
// ============================================

export interface CreateOpportunityData {
  name: string; // Backend uses 'name', not 'title'
  description?: string;
  leadId?: string;
  customerId?: string;
  contactId?: string;
  ownerId?: string;
  pipelineId?: string;
  stage: string; // Required: stage label (e.g., "Prospección") - backend requires this
  stageId?: string; // Optional: for frontend reference
  status?: OpportunityStatus;
  priority?: OpportunityPriority;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateOpportunityData {
  name?: string; // Backend uses 'name', not 'title'
  description?: string;
  leadId?: string | null;
  customerId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  pipelineId?: string | null;
  stage?: string; // Stage label (e.g., "Propuesta") - backend uses this
  priority?: OpportunityPriority;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateOpportunityStageData {
  stageId: string;
}

export interface UpdateOpportunityStatusData {
  status: OpportunityStatus;
  reason?: string; // For lost status
  notes?: string; // For won status
}

export interface AssignOpportunityOwnerData {
  ownerId: string;
}

export interface WinOpportunityData {
  notes?: string;
  actualCloseDate?: string;
}

export interface LoseOpportunityData {
  reason: string;
  actualCloseDate?: string;
}

export interface CreateOpportunityNoteData {
  content: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateOpportunityNoteData {
  content?: string;
  isPinned?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreatePipelineStageData {
  label: string;
  description?: string;
  order?: number;
  color?: string;
  probability?: number;
  stageType?: OpportunityStageType;
  isDefault?: boolean;
}

// ============================================
// API Response Types
// ============================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OpportunitiesResponse {
  data: Opportunity[];
  meta: PaginationMeta;
}

export interface OpportunityNotesResponse {
  data: OpportunityNote[];
  meta: PaginationMeta;
}

export interface OpportunityActivityResponse {
  data: OpportunityActivity[];
  meta: PaginationMeta;
}

export interface OpportunityStatistics {
  total: number;
  open: number;
  won: number;
  lost: number;
  stalled: number;
  totalAmount: number;
  totalForecast: number;
  wonAmount: number;
  lostAmount: number;
  averageDealSize: number;
  winRate: number;
  averageSalesCycle: number; // days
  byStage: {
    stageId: string;
    stageName: string;
    count: number;
    amount: number;
    forecast: number;
  }[];
  byOwner: {
    ownerId: string;
    ownerName: string;
    count: number;
    amount: number;
    wonAmount: number;
  }[];
}

// ============================================
// Filter & Sort Types
// ============================================

export interface OpportunityFilters {
  searchTerm?: string;
  status?: OpportunityStatus | OpportunityStatus[];
  stageId?: string | string[];
  ownerId?: string | string[];
  priority?: OpportunityPriority | OpportunityPriority[];
  customerId?: string;
  leadId?: string;
  contactId?: string;
  amountMin?: number;
  amountMax?: number;
  probabilityMin?: number;
  probabilityMax?: number;
  expectedCloseDateFrom?: string;
  expectedCloseDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  tags?: string[];
}

export interface OpportunitySort {
  sortBy?: 'name' | 'amount' | 'probability' | 'expectedCloseDate' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface OpportunityNotesFilters {
  isPinned?: boolean;
}

export interface OpportunityActivityFilters {
  actionType?: OpportunityActivityType;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Utility Types
// ============================================

export type OpportunityWithRelations = Opportunity & {
  stage: OpportunityPipelineStage;
  lead?: { id: string; fullName: string; email: string | null };
  customer?: { id: string; name: string; email: string | null };
  contact?: { id: string; name: string; email: string | null };
  owner?: { id: string; name: string; email: string };
};

// Helper function to calculate forecast
export function calculateForecast(amount: number, probability: number): number {
  return amount * (probability / 100);
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper function to get status icon name (for lucide-react)
export function getStatusIcon(status: OpportunityStatus): string {
  switch (status) {
    case 'open':
      return 'circle-dot';
    case 'won':
      return 'trophy';
    case 'lost':
      return 'x-circle';
    case 'stalled':
      return 'pause-circle';
    default:
      return 'circle';
  }
}

// Helper function to get priority icon name
export function getPriorityIcon(priority: OpportunityPriority): string {
  switch (priority) {
    case 'critical':
      return 'alert-triangle';
    case 'high':
      return 'arrow-up';
    case 'medium':
      return 'minus';
    case 'low':
      return 'arrow-down';
    default:
      return 'minus';
  }
}

// ============================================
// Bulk Operations Types - FASE 5.10
// ============================================

export type BulkOpportunityOperationType = 'assign' | 'delete' | 'status' | 'stage' | 'export';

export interface BulkOpportunityOperationRequest {
  opportunityIds: string[];
  operation: BulkOpportunityOperationType;
}

export interface BulkOpportunityAssignRequest extends BulkOpportunityOperationRequest {
  operation: 'assign';
  ownerId: string;
}

export interface BulkOpportunityDeleteRequest extends BulkOpportunityOperationRequest {
  operation: 'delete';
}

export interface BulkOpportunityStatusRequest extends BulkOpportunityOperationRequest {
  operation: 'status';
  status: OpportunityStatus;
  reason?: string;
}

export interface BulkOpportunityStageRequest extends BulkOpportunityOperationRequest {
  operation: 'stage';
  stageId: string;
}

export interface BulkOpportunityExportRequest extends BulkOpportunityOperationRequest {
  operation: 'export';
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
}

export interface BulkOpportunityOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    opportunityId: string;
    error: string;
  }>;
}

export interface BulkOpportunityExportResult {
  success: boolean;
  downloadUrl: string;
  expiresAt: string;
  recordCount: number;
}

// Reopen Request - FASE 5.10
export interface ReopenOpportunityData {
  reason?: string;
  targetStageId?: string;
}

// Forecast Types - FASE 5.10
export interface OpportunityForecast {
  period: string;
  bestCase: number;
  committed: number;
  pipeline: number;
  closed: number;
  target?: number;
  variance?: number;
}

export interface ForecastSummary {
  currentPeriod: OpportunityForecast;
  previousPeriod?: OpportunityForecast;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  byOwner: Array<{
    ownerId: string;
    ownerName: string;
    forecast: OpportunityForecast;
  }>;
  byStage: Array<{
    stageId: string;
    stageName: string;
    amount: number;
    count: number;
    weightedAmount: number;
  }>;
}
