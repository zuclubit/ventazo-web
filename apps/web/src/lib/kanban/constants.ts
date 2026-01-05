// ============================================
// Kanban Constants - Enterprise CRM Module
// Version: 2.0.0
// ============================================

import type {
  KanbanFeatures,
  KanbanEntityType,
  PipelineStageConfig,
  WIPLimitConfig,
  ValidationConfig,
  AccessibilityConfig,
  KeyboardShortcut,
} from './types';

// ============================================
// Default Feature Configuration
// ============================================

export const DEFAULT_FEATURES: KanbanFeatures = {
  dragDrop: true,
  collapse: true,
  wipLimits: true,
  keyboard: true,
  undo: true,
  undoWindowMs: 5000,
  bulkOperations: true,
  realtime: false, // Enable when WebSocket is ready
  staleHighlighting: true,
  staleDays: 7,
};

export const DEFAULT_VALIDATION: ValidationConfig = {
  frontend: true,
  backend: true,
  showDropFeedback: true,
  shakeOnInvalid: true,
};

export const DEFAULT_ACCESSIBILITY: AccessibilityConfig = {
  announcements: true,
  keyboard: true,
  moveToButton: true,
  highContrast: true,
  respectReducedMotion: true,
};

// ============================================
// WIP Limit Defaults by Entity Type
// ============================================

export const DEFAULT_WIP_LIMITS: Record<string, WIPLimitConfig> = {
  // Leads
  lead_new: { soft: 40, hard: 50, requiresJustification: true },
  lead_contacted: { soft: 25, hard: 30, requiresJustification: true },
  lead_interested: { soft: 20, hard: 25, requiresJustification: false },
  lead_qualified: { soft: 15, hard: 20, requiresJustification: true },
  lead_proposal: { soft: 10, hard: 15, requiresJustification: true },

  // Opportunities
  opportunity_discovery: { soft: 20, hard: 25, requiresJustification: false },
  opportunity_qualified: { soft: 15, hard: 20, requiresJustification: false },
  opportunity_proposal: { soft: 12, hard: 15, requiresJustification: true },
  opportunity_negotiation: { soft: 8, hard: 10, requiresJustification: true },

  // Customers
  customer_onboarding: { soft: 8, hard: 10, requiresJustification: true },
  customer_at_risk: { soft: 4, hard: 5, requiresJustification: true },

  // Tasks
  task_in_progress: { soft: 5, hard: 8, requiresJustification: false },
};

// ============================================
// Lead Pipeline Stages
// ============================================

export const LEAD_STAGES: PipelineStageConfig[] = [
  {
    id: 'new',
    label: 'New',
    labelEs: 'Nuevo',
    color: '#64748b', // slate-500
    order: 0,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['lead_new'],
  },
  {
    id: 'contacted',
    label: 'Contacted',
    labelEs: 'Contactado',
    color: '#3b82f6', // blue-500
    order: 1,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['lead_contacted'],
  },
  {
    id: 'interested',
    label: 'Interested',
    labelEs: 'Interesado',
    color: '#f59e0b', // amber-500
    order: 2,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['lead_interested'],
  },
  {
    id: 'qualified',
    label: 'Qualified',
    labelEs: 'Calificado',
    color: '#f97316', // orange-500
    order: 3,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['lead_qualified'],
  },
  {
    id: 'proposal',
    label: 'Proposal',
    labelEs: 'Propuesta',
    color: '#f43f5e', // rose-500
    order: 4,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['lead_proposal'],
  },
  {
    id: 'won',
    label: 'Won',
    labelEs: 'Ganado',
    color: '#10b981', // emerald-500
    order: 5,
    type: 'won',
  },
  {
    id: 'lost',
    label: 'Lost',
    labelEs: 'Perdido',
    color: '#6b7280', // gray-500
    order: 6,
    type: 'lost',
  },
];

// ============================================
// Opportunity Pipeline Stages
// ============================================

export const OPPORTUNITY_STAGES: PipelineStageConfig[] = [
  {
    id: 'discovery',
    label: 'Discovery',
    labelEs: 'Descubrimiento',
    color: '#6366f1', // indigo-500
    order: 0,
    type: 'open',
    probability: 10,
    wipLimit: DEFAULT_WIP_LIMITS['opportunity_discovery'],
  },
  {
    id: 'qualified',
    label: 'Qualified',
    labelEs: 'Calificada',
    color: '#06b6d4', // cyan-500
    order: 1,
    type: 'open',
    probability: 30,
    wipLimit: DEFAULT_WIP_LIMITS['opportunity_qualified'],
  },
  {
    id: 'proposal',
    label: 'Proposal',
    labelEs: 'Propuesta',
    color: '#8b5cf6', // violet-500
    order: 2,
    type: 'open',
    probability: 50,
    wipLimit: DEFAULT_WIP_LIMITS['opportunity_proposal'],
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    labelEs: 'Negociación',
    color: '#d946ef', // fuchsia-500
    order: 3,
    type: 'open',
    probability: 70,
    wipLimit: DEFAULT_WIP_LIMITS['opportunity_negotiation'],
  },
  {
    id: 'won',
    label: 'Won',
    labelEs: 'Ganada',
    color: '#10b981', // emerald-500
    order: 4,
    type: 'won',
    probability: 100,
  },
  {
    id: 'lost',
    label: 'Lost',
    labelEs: 'Perdida',
    color: '#ef4444', // red-500
    order: 5,
    type: 'lost',
    probability: 0,
  },
];

// ============================================
// Customer Lifecycle Stages
// ============================================

export const CUSTOMER_STAGES: PipelineStageConfig[] = [
  {
    id: 'onboarding',
    label: 'Onboarding',
    labelEs: 'Onboarding',
    color: '#eab308', // yellow-500
    order: 0,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['customer_onboarding'],
  },
  {
    id: 'active',
    label: 'Active',
    labelEs: 'Activo',
    color: '#22c55e', // green-500
    order: 1,
    type: 'open',
  },
  {
    id: 'growing',
    label: 'Growing',
    labelEs: 'Creciendo',
    color: '#14b8a6', // teal-500
    order: 2,
    type: 'open',
  },
  {
    id: 'at_risk',
    label: 'At Risk',
    labelEs: 'En Riesgo',
    color: '#f97316', // orange-500
    order: 3,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['customer_at_risk'],
  },
  {
    id: 'renewal',
    label: 'Renewal',
    labelEs: 'Renovación',
    color: '#f59e0b', // amber-500
    order: 4,
    type: 'open',
  },
  {
    id: 'churned',
    label: 'Churned',
    labelEs: 'Perdido',
    color: '#6b7280', // gray-500
    order: 5,
    type: 'terminal',
  },
];

// ============================================
// Task Status Stages
// ============================================

export const TASK_STAGES: PipelineStageConfig[] = [
  {
    id: 'pending',
    label: 'Pending',
    labelEs: 'Pendiente',
    color: '#64748b', // slate-500
    order: 0,
    type: 'open',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    labelEs: 'En Progreso',
    color: '#3b82f6', // blue-500
    order: 1,
    type: 'open',
    wipLimit: DEFAULT_WIP_LIMITS['task_in_progress'],
  },
  {
    id: 'completed',
    label: 'Completed',
    labelEs: 'Completada',
    color: '#10b981', // emerald-500
    order: 2,
    type: 'won',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    labelEs: 'Cancelada',
    color: '#6b7280', // gray-500
    order: 3,
    type: 'lost',
  },
];

// ============================================
// Transition Rules Matrix
// ============================================

/**
 * Transition rules by entity type
 * Key: `${fromStageId}_${toStageId}`
 * Value: Transition type
 */
export const LEAD_TRANSITIONS: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'> = {
  // From new
  'new_contacted': 'allowed',
  'new_interested': 'warning', // Skipping stages
  'new_qualified': 'warning',
  'new_proposal': 'blocked',
  'new_won': 'blocked', // Use convert dialog
  'new_lost': 'requires_data', // Requires reason

  // From contacted
  'contacted_new': 'warning', // Going back
  'contacted_interested': 'allowed',
  'contacted_qualified': 'warning',
  'contacted_proposal': 'blocked',
  'contacted_won': 'blocked',
  'contacted_lost': 'requires_data',

  // From interested
  'interested_new': 'warning',
  'interested_contacted': 'allowed',
  'interested_qualified': 'allowed',
  'interested_proposal': 'warning',
  'interested_won': 'blocked',
  'interested_lost': 'requires_data',

  // From qualified
  'qualified_new': 'warning',
  'qualified_contacted': 'warning',
  'qualified_interested': 'allowed',
  'qualified_proposal': 'allowed',
  'qualified_won': 'blocked',
  'qualified_lost': 'requires_data',

  // From proposal
  'proposal_new': 'warning',
  'proposal_contacted': 'warning',
  'proposal_interested': 'warning',
  'proposal_qualified': 'allowed',
  'proposal_won': 'blocked', // Use convert dialog
  'proposal_lost': 'requires_data',

  // From won (terminal)
  'won_new': 'blocked',
  'won_contacted': 'blocked',
  'won_interested': 'blocked',
  'won_qualified': 'blocked',
  'won_proposal': 'blocked',
  'won_lost': 'blocked',

  // From lost (can reactivate)
  'lost_new': 'allowed',
  'lost_contacted': 'allowed',
  'lost_interested': 'allowed',
  'lost_qualified': 'allowed',
  'lost_proposal': 'allowed',
  'lost_won': 'blocked',
};

export const OPPORTUNITY_TRANSITIONS: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'> = {
  // From discovery
  'discovery_qualified': 'allowed',
  'discovery_proposal': 'warning',
  'discovery_negotiation': 'blocked',
  'discovery_won': 'blocked',
  'discovery_lost': 'requires_data',

  // From qualified
  'qualified_discovery': 'allowed',
  'qualified_proposal': 'allowed',
  'qualified_negotiation': 'warning',
  'qualified_won': 'blocked',
  'qualified_lost': 'requires_data',

  // From proposal (requires document)
  'proposal_discovery': 'warning',
  'proposal_qualified': 'allowed',
  'proposal_negotiation': 'allowed',
  'proposal_won': 'blocked',
  'proposal_lost': 'requires_data',

  // From negotiation
  'negotiation_discovery': 'warning',
  'negotiation_qualified': 'warning',
  'negotiation_proposal': 'allowed',
  'negotiation_won': 'requires_data', // Requires final value, close date
  'negotiation_lost': 'requires_data',

  // From won (terminal)
  'won_discovery': 'blocked',
  'won_qualified': 'blocked',
  'won_proposal': 'blocked',
  'won_negotiation': 'blocked',
  'won_lost': 'blocked',

  // From lost (terminal)
  'lost_discovery': 'blocked',
  'lost_qualified': 'blocked',
  'lost_proposal': 'blocked',
  'lost_negotiation': 'blocked',
  'lost_won': 'blocked',
};

export const CUSTOMER_TRANSITIONS: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'> = {
  // From onboarding
  'onboarding_active': 'requires_data', // Requires checklist complete
  'onboarding_growing': 'blocked',
  'onboarding_at_risk': 'warning',
  'onboarding_renewal': 'blocked',
  'onboarding_churned': 'requires_data',

  // From active
  'active_onboarding': 'warning',
  'active_growing': 'allowed',
  'active_at_risk': 'requires_data', // Requires reason + action plan
  'active_renewal': 'allowed',
  'active_churned': 'requires_data',

  // From growing
  'growing_onboarding': 'blocked',
  'growing_active': 'allowed',
  'growing_at_risk': 'requires_data',
  'growing_renewal': 'allowed',
  'growing_churned': 'requires_data',

  // From at_risk
  'at_risk_onboarding': 'blocked',
  'at_risk_active': 'allowed', // Successful rescue
  'at_risk_growing': 'warning',
  'at_risk_renewal': 'allowed',
  'at_risk_churned': 'requires_data', // Manager approval

  // From renewal
  'renewal_onboarding': 'blocked',
  'renewal_active': 'allowed', // Renewed
  'renewal_growing': 'allowed',
  'renewal_at_risk': 'requires_data',
  'renewal_churned': 'requires_data',

  // From churned (terminal)
  'churned_onboarding': 'requires_data', // New contract
  'churned_active': 'blocked',
  'churned_growing': 'blocked',
  'churned_at_risk': 'blocked',
  'churned_renewal': 'blocked',
};

// ============================================
// Keyboard Shortcuts
// ============================================

export const KANBAN_SHORTCUTS: KeyboardShortcut[] = [
  // Navigation
  {
    key: 'ArrowLeft',
    action: 'focus_prev_column',
    description: 'Move focus to previous column',
    scope: 'board',
  },
  {
    key: 'ArrowRight',
    action: 'focus_next_column',
    description: 'Move focus to next column',
    scope: 'board',
  },
  {
    key: 'ArrowUp',
    action: 'focus_prev_card',
    description: 'Move focus to previous card',
    scope: 'column',
  },
  {
    key: 'ArrowDown',
    action: 'focus_next_card',
    description: 'Move focus to next card',
    scope: 'column',
  },
  {
    key: 'Home',
    action: 'focus_first_card',
    description: 'Move focus to first card in column',
    scope: 'column',
  },
  {
    key: 'End',
    action: 'focus_last_card',
    description: 'Move focus to last card in column',
    scope: 'column',
  },

  // Card actions
  {
    key: 'Enter',
    action: 'open_card',
    description: 'Open card details',
    scope: 'card',
  },
  {
    key: ' ',
    action: 'toggle_grab',
    description: 'Grab/release card for moving',
    scope: 'card',
  },
  {
    key: 'Escape',
    action: 'cancel_grab',
    description: 'Cancel current grab operation',
    scope: 'card',
  },
  {
    key: 'm',
    action: 'open_move_dialog',
    description: 'Open move-to dialog',
    scope: 'card',
  },
  {
    key: 'e',
    action: 'edit_card',
    description: 'Edit card',
    scope: 'card',
  },
  {
    key: 'Delete',
    action: 'delete_card',
    description: 'Delete card',
    scope: 'card',
  },

  // Global
  {
    key: 'z',
    modifiers: ['ctrl'],
    action: 'undo',
    description: 'Undo last move',
    scope: 'global',
  },
  {
    key: '/',
    action: 'open_search',
    description: 'Open search',
    scope: 'global',
  },
  {
    key: 'n',
    action: 'new_item',
    description: 'Create new item',
    scope: 'global',
  },
  {
    key: '?',
    action: 'show_shortcuts',
    description: 'Show keyboard shortcuts',
    scope: 'global',
  },

  // Column
  {
    key: 'c',
    action: 'toggle_collapse',
    description: 'Collapse/expand column',
    scope: 'column',
  },
];

// ============================================
// Score/Health Thresholds
// ============================================

export const SCORE_THRESHOLDS = {
  cold: { min: 0, max: 30 },
  cool: { min: 31, max: 50 },
  warm: { min: 51, max: 70 },
  hot: { min: 71, max: 85 },
  veryHot: { min: 86, max: 99 },
  converted: { min: 100, max: 100 },
} as const;

export const HEALTH_THRESHOLDS = {
  critical: { min: 0, max: 29 },
  poor: { min: 30, max: 49 },
  fair: { min: 50, max: 69 },
  good: { min: 70, max: 89 },
  excellent: { min: 90, max: 100 },
} as const;

// ============================================
// Timing Constants
// ============================================

export const TIMING = {
  /** Delay before activating drag (touch) */
  touchActivationDelay: 200,
  /** Minimum distance for drag activation */
  dragActivationDistance: 8,
  /** Duration of shake animation */
  shakeAnimationDuration: 400,
  /** Duration of drop animation */
  dropAnimationDuration: 200,
  /** Debounce for search */
  searchDebounce: 300,
  /** Stale check interval */
  staleCheckInterval: 60000, // 1 minute
  /** Undo window */
  undoWindow: 5000,
} as const;

// ============================================
// Accessibility
// ============================================

export const ARIA_LABELS = {
  board: 'Tablero Kanban',
  column: (name: string, count: number) => `Columna ${name}, ${count} elementos`,
  card: (title: string) => `Tarjeta: ${title}`,
  dragHandle: 'Arrastrar para mover',
  moveButton: 'Mover a otra columna',
  collapseButton: 'Colapsar columna',
  expandButton: 'Expandir columna',
  wipWarning: (count: number, limit: number) =>
    `Advertencia: ${count} de ${limit} elementos. Cerca del límite.`,
  wipBlocked: (limit: number) =>
    `Bloqueado: Se alcanzó el límite de ${limit} elementos.`,
} as const;

export const ANNOUNCEMENTS = {
  grabbed: (title: string) => `${title} levantada. Usa las flechas para mover.`,
  dropped: (title: string, column: string) => `${title} movida a ${column}.`,
  cancelled: 'Movimiento cancelado.',
  invalid: (reason: string) => `No se puede mover: ${reason}`,
  undone: 'Movimiento deshecho.',
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get default WIP limits for an entity type
 */
export function getDefaultWIPLimits(entityType: KanbanEntityType): WIPLimitConfig {
  const limits = DEFAULT_WIP_LIMITS[entityType];
  const fallback = DEFAULT_WIP_LIMITS['lead'];
  if (limits) return limits;
  if (fallback) return fallback;
  // Default fallback if nothing found
  return { soft: 10, hard: 15, requiresJustification: true };
}

/**
 * Get stages for an entity type
 */
export function getStagesForEntity(entityType: KanbanEntityType): PipelineStageConfig[] {
  switch (entityType) {
    case 'lead':
      return LEAD_STAGES;
    case 'opportunity':
      return OPPORTUNITY_STAGES;
    case 'customer':
      return CUSTOMER_STAGES;
    case 'task':
      return TASK_STAGES;
    default:
      return LEAD_STAGES;
  }
}

/**
 * Get transitions for an entity type
 */
export function getTransitionsForEntity(
  entityType: KanbanEntityType
): Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'> {
  switch (entityType) {
    case 'lead':
      return LEAD_TRANSITIONS;
    case 'opportunity':
      return OPPORTUNITY_TRANSITIONS;
    case 'customer':
      return CUSTOMER_TRANSITIONS;
    default:
      return {};
  }
}
