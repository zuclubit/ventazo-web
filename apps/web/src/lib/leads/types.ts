// ============================================
// Lead Types - FASE 5.3 + Dynamic Stages
// ============================================

// Lead Status - Core states for business logic
// These represent the actual state of a lead in the sales process
export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  WON = 'won',
  LOST = 'lost',
}

// Score Category - returned by backend
export type ScoreCategory = 'hot' | 'warm' | 'cold';

// Lead Source
export enum LeadSource {
  REFERRAL = 'referral',
  SOCIAL = 'social',
  WEBSITE = 'website',
  AD = 'ad',
  ORGANIC = 'organic',
  MANUAL = 'manual',
  OTHER = 'other',
}

// Display Labels for Status
export const STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'Nuevo',
  [LeadStatus.CONTACTED]: 'Contactado',
  [LeadStatus.QUALIFIED]: 'Calificado',
  [LeadStatus.PROPOSAL]: 'Propuesta',
  [LeadStatus.WON]: 'Ganado',
  [LeadStatus.LOST]: 'Perdido',
};

// Using CSS variables for dynamic theming
export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'bg-[var(--pipeline-new-bg)] text-[var(--pipeline-new-text)] border border-[var(--pipeline-new-border)]',
  [LeadStatus.CONTACTED]: 'bg-[var(--pipeline-contacted-bg)] text-[var(--pipeline-contacted-text)] border border-[var(--pipeline-contacted-border)]',
  [LeadStatus.QUALIFIED]: 'bg-[var(--pipeline-qualified-bg)] text-[var(--pipeline-qualified-text)] border border-[var(--pipeline-qualified-border)]',
  [LeadStatus.PROPOSAL]: 'bg-[var(--pipeline-proposal-bg)] text-[var(--pipeline-proposal-text)] border border-[var(--pipeline-proposal-border)]',
  [LeadStatus.WON]: 'bg-[var(--pipeline-won-bg)] text-[var(--pipeline-won-text)] border border-[var(--pipeline-won-border)]',
  [LeadStatus.LOST]: 'bg-[var(--pipeline-lost-bg)] text-[var(--pipeline-lost-text)] border border-[var(--pipeline-lost-border)]',
};

// ============================================
// Default Pipeline Stages (4 Core Stages)
// These are the default Kanban columns
// Users can add custom stages between these
// ============================================

export interface DefaultStageConfig {
  id: string;
  label: string;
  color: string;
  order: number;
  isDefault: boolean;
  description: string;
}

export const DEFAULT_PIPELINE_STAGES: DefaultStageConfig[] = [
  {
    id: 'stage-new',
    label: 'Nuevo',
    color: '#3B82F6', // blue-500
    order: 0,
    isDefault: true,
    description: 'Leads recién ingresados al pipeline',
  },
  {
    id: 'stage-contacted',
    label: 'Contactado',
    color: '#F59E0B', // amber-500
    order: 1,
    isDefault: true,
    description: 'Se ha establecido primer contacto',
  },
  {
    id: 'stage-qualified',
    label: 'Calificado',
    color: '#10B981', // emerald-500
    order: 2,
    isDefault: true,
    description: 'Lead calificado y listo para propuesta',
  },
  {
    id: 'stage-proposal',
    label: 'Propuesta',
    color: '#06B6D4', // cyan-500
    order: 3,
    isDefault: true,
    description: 'Propuesta enviada, esperando respuesta',
  },
];

// Terminal stages (shown separately or as filters)
export const TERMINAL_STAGES: DefaultStageConfig[] = [
  {
    id: 'stage-won',
    label: 'Ganado',
    color: '#22C55E', // green-500
    order: 100,
    isDefault: true,
    description: 'Lead convertido a cliente',
  },
  {
    id: 'stage-lost',
    label: 'Perdido',
    color: '#EF4444', // red-500
    order: 101,
    isDefault: true,
    description: 'Lead perdido o descartado',
  },
];

// Stage type for custom stages
export type StageType = 'open' | 'won' | 'lost';

// Color palette for new stages
export const STAGE_COLOR_PALETTE = [
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#84CC16', // lime
];

// Score category colors - Using CSS variables
// Note: Hot uses orange (priority feel), Warm uses amber, Cold uses gray
export const SCORE_CATEGORY_COLORS: Record<ScoreCategory, string> = {
  hot: 'bg-[var(--score-hot-bg)] text-[var(--score-hot)] border border-[var(--score-hot-border)]',
  warm: 'bg-[var(--score-warm-bg)] text-[var(--score-warm)] border border-[var(--score-warm-border)]',
  cold: 'bg-[var(--score-cold-bg)] text-[var(--score-cold)] border border-[var(--score-cold-border)]',
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'Referido',
  [LeadSource.SOCIAL]: 'Redes Sociales',
  [LeadSource.WEBSITE]: 'Sitio Web',
  [LeadSource.AD]: 'Publicidad',
  [LeadSource.ORGANIC]: 'Organico',
  [LeadSource.MANUAL]: 'Manual',
  [LeadSource.OTHER]: 'Otro',
};

// Source colors - Using channel CSS variables
export const SOURCE_COLORS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'bg-[var(--channel-referral-bg,rgba(99,102,241,0.12))] text-[var(--channel-referral)]',
  [LeadSource.SOCIAL]: 'bg-[var(--channel-social-bg,rgba(236,72,153,0.12))] text-[var(--channel-social)]',
  [LeadSource.WEBSITE]: 'bg-[var(--channel-website-bg,rgba(6,182,212,0.12))] text-[var(--channel-website)]',
  [LeadSource.AD]: 'bg-[var(--channel-ad-bg,rgba(249,115,22,0.12))] text-[var(--channel-ad)]',
  [LeadSource.ORGANIC]: 'bg-[var(--channel-organic-bg,rgba(16,185,129,0.12))] text-[var(--channel-organic)]',
  [LeadSource.MANUAL]: 'bg-muted text-muted-foreground',
  [LeadSource.OTHER]: 'bg-muted text-muted-foreground',
};

// Lead Activity Types
export type LeadActivityType =
  | 'created'
  | 'updated'
  | 'note_added'
  | 'note_deleted'
  | 'assigned'
  | 'status_changed'
  | 'stage_changed'
  | 'score_updated'
  | 'qualified'
  | 'converted'
  | 'follow_up_scheduled';

export const ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  created: 'Lead creado',
  updated: 'Lead actualizado',
  note_added: 'Nota agregada',
  note_deleted: 'Nota eliminada',
  assigned: 'Lead asignado',
  status_changed: 'Estado cambiado',
  stage_changed: 'Etapa cambiada',
  score_updated: 'Score actualizado',
  qualified: 'Lead calificado',
  converted: 'Lead convertido',
  follow_up_scheduled: 'Seguimiento programado',
};

export const ACTIVITY_COLORS: Record<LeadActivityType, string> = {
  created: 'text-green-600',
  updated: 'text-blue-600',
  note_added: 'text-purple-600',
  note_deleted: 'text-gray-600',
  assigned: 'text-indigo-600',
  status_changed: 'text-yellow-600',
  stage_changed: 'text-cyan-600',
  score_updated: 'text-orange-600',
  qualified: 'text-emerald-600',
  converted: 'text-violet-600',
  follow_up_scheduled: 'text-pink-600',
};

// ============================================
// Interfaces
// ============================================

export interface Lead {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  status: LeadStatus;
  stageId?: string;
  score: number;
  scoreCategory: ScoreCategory;
  source: LeadSource;
  ownerId?: string;
  notes?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  nextFollowUpAt?: string;
  isFollowUpOverdue: boolean;
  convertedAt?: string;
  convertedToCustomerId?: string;
}

export interface LeadNote {
  id: string;
  tenantId: string;
  leadId: string;
  createdBy: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadActivity {
  id: string;
  tenantId: string;
  leadId: string;
  userId?: string;
  actionType: LeadActivityType;
  description?: string;
  metadata: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdAt: string;
}

export interface PipelineStage {
  id: string;
  tenantId: string;
  label: string;
  description?: string;
  order: number;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineColumn {
  stage: PipelineStage;
  leads: Lead[];
  count: number;
}

export interface PipelineView {
  stages: PipelineColumn[];
  totalLeads: number;
}

// ============================================
// API Response Types
// ============================================

export interface LeadsListResponse {
  data: Lead[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadNotesResponse {
  data: LeadNote[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadStatsResponse {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: Record<LeadSource, number>;
  averageScore: number;
  convertedThisMonth: number;
  newThisMonth: number;
}

export interface ConvertLeadResponse {
  customerId: string;
  lead: Lead;
  message: string;
}

// ============================================
// Request Types
// ============================================

export interface CreateLeadRequest {
  fullName: string;
  email: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  source?: LeadSource;
  industry?: string;
  website?: string;
  employeeCount?: number;
  annualRevenue?: number;
  ownerId?: string;
  stageId?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadRequest {
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  jobTitle?: string;
  industry?: string;
  website?: string;
  employeeCount?: number;
  annualRevenue?: number;
  stageId?: string;
  notes?: string;
  tags?: string[];
}

export interface LeadsQueryParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: LeadStatus;
  stageId?: string;
  assignedTo?: string;
  source?: LeadSource;
  industry?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?: 'fullName' | 'companyName' | 'email' | 'score' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface ConvertLeadRequest {
  contractValue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
}

// ============================================
// Bulk Operations Types - FASE 5.10
// ============================================

export type BulkOperationType = 'assign' | 'delete' | 'status' | 'stage' | 'export' | 'tag';

export interface BulkOperationRequest {
  leadIds: string[];
  operation: BulkOperationType;
}

export interface BulkAssignRequest extends BulkOperationRequest {
  operation: 'assign';
  assignedTo: string;
}

export interface BulkDeleteRequest extends BulkOperationRequest {
  operation: 'delete';
}

export interface BulkStatusRequest extends BulkOperationRequest {
  operation: 'status';
  status: LeadStatus;
  reason?: string;
}

export interface BulkStageRequest extends BulkOperationRequest {
  operation: 'stage';
  stageId: string;
}

export interface BulkExportRequest extends BulkOperationRequest {
  operation: 'export';
  format: 'csv' | 'xlsx' | 'json';
  fields?: string[];
}

export interface BulkTagRequest extends BulkOperationRequest {
  operation: 'tag';
  action: 'add' | 'remove';
  tags: string[];
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{
    leadId: string;
    error: string;
  }>;
}

export interface BulkExportResult {
  success: boolean;
  downloadUrl: string;
  expiresAt: string;
  recordCount: number;
}

// Advanced Filters - FASE 5.10
export interface AdvancedLeadFilters extends LeadsQueryParams {
  createdAtFrom?: string;
  createdAtTo?: string;
  updatedAtFrom?: string;
  updatedAtTo?: string;
  hasFollowUp?: boolean;
  followUpOverdue?: boolean;
  tags?: string[];
  customFields?: Record<string, unknown>;
}
