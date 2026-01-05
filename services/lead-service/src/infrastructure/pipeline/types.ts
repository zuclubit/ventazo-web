/**
 * Pipeline Configuration Types
 * Enables tenant-specific sales pipeline customization
 */

/**
 * Stage type categorization
 */
export enum StageType {
  OPEN = 'open',           // Active stages where leads can progress
  WON = 'won',             // Terminal success stage
  LOST = 'lost',           // Terminal failure stage
  DISQUALIFIED = 'disqualified', // Removed from pipeline
}

/**
 * Stage configuration
 */
export interface PipelineStage {
  id: string;
  name: string;
  slug?: string;             // URL-friendly identifier (optional, generated from name)
  type: StageType;
  order: number;             // Display order
  color?: string;            // UI color (hex)
  description?: string;
  probability?: number;      // Win probability (0-100)
  autoActions?: StageAutoAction[];
  isDefault?: boolean;       // Default stage for new leads
  isActive?: boolean;        // Defaults to true
}

/**
 * Automatic actions when entering a stage
 */
export interface StageAutoAction {
  type: 'notify' | 'assign' | 'tag' | 'schedule_followup' | 'webhook';
  config: Record<string, unknown>;
}

/**
 * Pipeline stage transition rule
 */
export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
  isAllowed: boolean;
  requiresApproval?: boolean;
  approverRoles?: string[];
  conditions?: TransitionCondition[];
}

/**
 * Condition for stage transition
 */
export interface TransitionCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'exists';
  value: unknown;
}

/**
 * Complete pipeline configuration
 */
export interface PipelineConfig {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  transitions: StageTransition[];
  settings: PipelineSettings;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pipeline-level settings
 */
export interface PipelineSettings {
  allowSkipStages?: boolean;
  requireReasonOnLost?: boolean;
  autoArchiveAfterDays?: number | null;
  scoreThreshold?: number;           // Min score to advance to qualified
  maxLeadsPerStage?: number | null;
  enableStageRotting?: boolean;      // Warn when lead is stale
  rottingDays?: Record<string, number>; // Days per stage before rotting
}

/**
 * Input for creating a pipeline
 */
export interface CreatePipelineInput {
  tenantId: string;
  name: string;
  description?: string;
  copyFromDefault?: boolean;
  stages?: Omit<PipelineStage, 'id'>[];
  settings?: Partial<PipelineSettings>;
}

/**
 * Input for updating a pipeline
 */
export interface UpdatePipelineInput {
  name?: string;
  description?: string | null;
  settings?: Partial<PipelineSettings>;
  isActive?: boolean;
}

/**
 * Input for adding/updating a stage
 */
export interface UpsertStageInput {
  id?: string;
  name: string;
  slug?: string;
  type: StageType;
  order: number;
  color?: string;
  description?: string;
  probability?: number;
  autoActions?: StageAutoAction[];
  isDefault?: boolean;
  isActive?: boolean;
}

/**
 * Pipeline service interface
 */
export interface IPipelineService {
  // Pipeline management
  createPipeline(input: CreatePipelineInput): Promise<PipelineConfig>;
  getPipeline(pipelineId: string, tenantId: string): Promise<PipelineConfig | null>;
  getDefaultPipeline(tenantId: string): Promise<PipelineConfig>;
  updatePipeline(pipelineId: string, tenantId: string, input: UpdatePipelineInput): Promise<PipelineConfig>;
  deletePipeline(pipelineId: string, tenantId: string): Promise<void>;
  listPipelines(tenantId: string): Promise<PipelineConfig[]>;

  // Stage management
  addStage(pipelineId: string, tenantId: string, stage: UpsertStageInput): Promise<PipelineStage>;
  updateStage(pipelineId: string, tenantId: string, stageId: string, stage: Partial<UpsertStageInput>): Promise<PipelineStage>;
  removeStage(pipelineId: string, tenantId: string, stageId: string): Promise<void>;
  reorderStages(pipelineId: string, tenantId: string, stageIds: string[]): Promise<void>;

  // Transition validation
  canTransition(pipelineId: string, fromStageSlug: string, toStageSlug: string): Promise<boolean>;
  getAvailableTransitions(pipelineId: string, currentStageSlug: string): Promise<PipelineStage[]>;

  // Utility
  getStageBySlug(pipelineId: string, slug: string): Promise<PipelineStage | null>;
  ensureDefaultPipeline(tenantId: string): Promise<PipelineConfig>;
}

/**
 * Default pipeline template
 */
export const DEFAULT_PIPELINE_STAGES: Omit<PipelineStage, 'id'>[] = [
  {
    name: 'Nuevo',
    slug: 'new',
    type: StageType.OPEN,
    order: 1,
    color: '#6B7280',
    description: 'Lead recién ingresado al sistema',
    probability: 10,
    isDefault: true,
    isActive: true,
  },
  {
    name: 'Contactado',
    slug: 'contacted',
    type: StageType.OPEN,
    order: 2,
    color: '#3B82F6',
    description: 'Se ha establecido primer contacto',
    probability: 20,
    isActive: true,
  },
  {
    name: 'Calificado',
    slug: 'qualified',
    type: StageType.OPEN,
    order: 3,
    color: '#8B5CF6',
    description: 'Lead calificado con potencial de compra',
    probability: 40,
    isActive: true,
  },
  {
    name: 'Propuesta',
    slug: 'proposal',
    type: StageType.OPEN,
    order: 4,
    color: '#F59E0B',
    description: 'Propuesta comercial enviada',
    probability: 60,
    isActive: true,
  },
  {
    name: 'Negociación',
    slug: 'negotiation',
    type: StageType.OPEN,
    order: 5,
    color: '#EF4444',
    description: 'En proceso de negociación',
    probability: 80,
    isActive: true,
  },
  {
    name: 'Ganado',
    slug: 'won',
    type: StageType.WON,
    order: 100,
    color: '#10B981',
    description: 'Lead convertido a cliente',
    probability: 100,
    isActive: true,
  },
  {
    name: 'Perdido',
    slug: 'lost',
    type: StageType.LOST,
    order: 101,
    color: '#DC2626',
    description: 'Oportunidad perdida',
    probability: 0,
    isActive: true,
  },
  {
    name: 'No Calificado',
    slug: 'unqualified',
    type: StageType.DISQUALIFIED,
    order: 102,
    color: '#9CA3AF',
    description: 'Lead no cumple criterios de calificación',
    probability: 0,
    isActive: true,
  },
];

export const DEFAULT_PIPELINE_SETTINGS: PipelineSettings = {
  allowSkipStages: false,
  requireReasonOnLost: true,
  autoArchiveAfterDays: 90,
  scoreThreshold: 70,
  enableStageRotting: true,
  rottingDays: {
    new: 3,
    contacted: 7,
    qualified: 14,
    proposal: 7,
    negotiation: 14,
  },
};
