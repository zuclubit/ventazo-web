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

export const STATUS_COLORS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [LeadStatus.CONTACTED]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [LeadStatus.QUALIFIED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  [LeadStatus.PROPOSAL]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  [LeadStatus.WON]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [LeadStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
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

// Score category colors
export const SCORE_CATEGORY_COLORS: Record<ScoreCategory, string> = {
  hot: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  warm: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  cold: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
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

export const SOURCE_COLORS: Record<LeadSource, string> = {
  [LeadSource.REFERRAL]: 'bg-indigo-100 text-indigo-800',
  [LeadSource.SOCIAL]: 'bg-pink-100 text-pink-800',
  [LeadSource.WEBSITE]: 'bg-cyan-100 text-cyan-800',
  [LeadSource.AD]: 'bg-orange-100 text-orange-800',
  [LeadSource.ORGANIC]: 'bg-emerald-100 text-emerald-800',
  [LeadSource.MANUAL]: 'bg-slate-100 text-slate-800',
  [LeadSource.OTHER]: 'bg-gray-100 text-gray-800',
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
