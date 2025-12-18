// ============================================
// FASE 5.7 — Workflows & Automations Types
// Extended in FASE 6.2 with AI Actions & Triggers
// ============================================

import {
  AI_EVENT_TRIGGER_LABELS,
  AI_EVENT_TRIGGERS,
  AI_TRIGGER_GROUP,
  AI_WORKFLOW_ACTION_ICONS,
  AI_WORKFLOW_ACTION_LABELS,
  AI_WORKFLOW_ACTIONS,
  AI_ACTION_PARAMETER_CONFIGS,
  type AIWorkflowAction,
  type AIEventTrigger,
  type AIActionParams,
} from '@/lib/ai-actions/types';

// ============================================
// Enums & Constants
// ============================================

export const WORKFLOW_TRIGGER_TYPE = ['event', 'schedule'] as const;
export type WorkflowTriggerType = (typeof WORKFLOW_TRIGGER_TYPE)[number];

export const WORKFLOW_STATUS = ['active', 'inactive', 'draft'] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUS)[number];

export const EXECUTION_STATUS = ['pending', 'running', 'success', 'failed', 'skipped'] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUS)[number];

// ============================================
// Event Triggers
// ============================================

export const EVENT_TRIGGERS = [
  // Lead events
  'lead.created',
  'lead.updated',
  'lead.stage_changed',
  'lead.score_changed',
  'lead.assigned',
  'lead.qualified',
  'lead.converted',
  'lead.deleted',
  // Opportunity events
  'opportunity.created',
  'opportunity.updated',
  'opportunity.stage_changed',
  'opportunity.won',
  'opportunity.lost',
  'opportunity.deleted',
  // Customer events
  'customer.created',
  'customer.updated',
  'customer.deleted',
  // Task events
  'task.created',
  'task.updated',
  'task.completed',
  'task.due_soon',
  'task.overdue',
  'task.assigned',
  'task.deleted',
  // Service events
  'service.created',
  'service.updated',
  'service.archived',
  // Activity events
  'activity.created',
  'activity.logged',
  // Contact events
  'contact.created',
  'contact.updated',
] as const;

export type EventTrigger = (typeof EVENT_TRIGGERS)[number];

// Human-readable labels for triggers
export const EVENT_TRIGGER_LABELS: Record<EventTrigger, string> = {
  'lead.created': 'Lead creado',
  'lead.updated': 'Lead actualizado',
  'lead.stage_changed': 'Lead cambia de etapa',
  'lead.score_changed': 'Score de lead cambia',
  'lead.assigned': 'Lead asignado',
  'lead.qualified': 'Lead calificado',
  'lead.converted': 'Lead convertido a cliente',
  'lead.deleted': 'Lead eliminado',
  'opportunity.created': 'Oportunidad creada',
  'opportunity.updated': 'Oportunidad actualizada',
  'opportunity.stage_changed': 'Oportunidad cambia de etapa',
  'opportunity.won': 'Oportunidad ganada',
  'opportunity.lost': 'Oportunidad perdida',
  'opportunity.deleted': 'Oportunidad eliminada',
  'customer.created': 'Cliente creado',
  'customer.updated': 'Cliente actualizado',
  'customer.deleted': 'Cliente eliminado',
  'task.created': 'Tarea creada',
  'task.updated': 'Tarea actualizada',
  'task.completed': 'Tarea completada',
  'task.due_soon': 'Tarea próxima a vencer',
  'task.overdue': 'Tarea vencida',
  'task.assigned': 'Tarea asignada',
  'task.deleted': 'Tarea eliminada',
  'service.created': 'Servicio creado',
  'service.updated': 'Servicio actualizado',
  'service.archived': 'Servicio archivado',
  'activity.created': 'Actividad creada',
  'activity.logged': 'Actividad registrada',
  'contact.created': 'Contacto creado',
  'contact.updated': 'Contacto actualizado',
};

// Group triggers by module
export const TRIGGER_GROUPS = {
  leads: [
    'lead.created',
    'lead.updated',
    'lead.stage_changed',
    'lead.score_changed',
    'lead.assigned',
    'lead.qualified',
    'lead.converted',
    'lead.deleted',
  ],
  opportunities: [
    'opportunity.created',
    'opportunity.updated',
    'opportunity.stage_changed',
    'opportunity.won',
    'opportunity.lost',
    'opportunity.deleted',
  ],
  customers: ['customer.created', 'customer.updated', 'customer.deleted'],
  tasks: [
    'task.created',
    'task.updated',
    'task.completed',
    'task.due_soon',
    'task.overdue',
    'task.assigned',
    'task.deleted',
  ],
  services: ['service.created', 'service.updated', 'service.archived'],
  activities: ['activity.created', 'activity.logged'],
  contacts: ['contact.created', 'contact.updated'],
} as const;

export const TRIGGER_GROUP_LABELS: Record<keyof typeof TRIGGER_GROUPS, string> = {
  leads: 'Leads',
  opportunities: 'Oportunidades',
  customers: 'Clientes',
  tasks: 'Tareas',
  services: 'Servicios',
  activities: 'Actividades',
  contacts: 'Contactos',
};

// ============================================
// Action Types
// ============================================

export const WORKFLOW_ACTIONS = [
  'create_task',
  'update_task',
  'complete_task',
  'send_email',
  'send_notification',
  'update_entity',
  'assign_user',
  'change_stage',
  'create_note',
  'create_activity',
  'trigger_webhook',
  'delay',
  'create_opportunity',
  'create_customer',
  'send_sms',
  'add_tag',
  'remove_tag',
] as const;

export type WorkflowAction = (typeof WORKFLOW_ACTIONS)[number];

export const WORKFLOW_ACTION_LABELS: Record<WorkflowAction, string> = {
  create_task: 'Crear tarea',
  update_task: 'Actualizar tarea',
  complete_task: 'Completar tarea',
  send_email: 'Enviar email',
  send_notification: 'Enviar notificación',
  update_entity: 'Actualizar registro',
  assign_user: 'Asignar usuario',
  change_stage: 'Cambiar etapa',
  create_note: 'Crear nota',
  create_activity: 'Registrar actividad',
  trigger_webhook: 'Disparar webhook',
  delay: 'Esperar (delay)',
  create_opportunity: 'Crear oportunidad',
  create_customer: 'Crear cliente',
  send_sms: 'Enviar SMS',
  add_tag: 'Agregar etiqueta',
  remove_tag: 'Quitar etiqueta',
};

export const WORKFLOW_ACTION_ICONS: Record<WorkflowAction, string> = {
  create_task: 'CheckSquare',
  update_task: 'Edit',
  complete_task: 'CheckCircle',
  send_email: 'Mail',
  send_notification: 'Bell',
  update_entity: 'RefreshCw',
  assign_user: 'UserPlus',
  change_stage: 'ArrowRight',
  create_note: 'FileText',
  create_activity: 'Activity',
  trigger_webhook: 'Webhook',
  delay: 'Clock',
  create_opportunity: 'Target',
  create_customer: 'UserCheck',
  send_sms: 'MessageSquare',
  add_tag: 'Tag',
  remove_tag: 'X',
};

// ============================================
// Condition Operators
// ============================================

export const CONDITION_OPERATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'greater_than',
  'less_than',
  'greater_or_equal',
  'less_or_equal',
  'is_empty',
  'is_not_empty',
  'in',
  'not_in',
  'changed_to',
  'changed_from',
] as const;

export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: 'es igual a',
  not_equals: 'no es igual a',
  contains: 'contiene',
  not_contains: 'no contiene',
  starts_with: 'empieza con',
  ends_with: 'termina con',
  greater_than: 'es mayor que',
  less_than: 'es menor que',
  greater_or_equal: 'es mayor o igual a',
  less_or_equal: 'es menor o igual a',
  is_empty: 'está vacío',
  is_not_empty: 'no está vacío',
  in: 'está en',
  not_in: 'no está en',
  changed_to: 'cambió a',
  changed_from: 'cambió de',
};

// ============================================
// Interfaces
// ============================================

export interface WorkflowCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  trigger: EventTrigger;
  conditions: WorkflowCondition[];
  created_at: string;
  updated_at?: string;
}

export interface WorkflowActionParams {
  // Task action params
  task_title?: string;
  task_description?: string;
  task_priority?: 'low' | 'medium' | 'high' | 'urgent';
  task_due_days?: number;
  task_assigned_to?: string;
  task_type?: string;

  // Email action params
  email_to?: string;
  email_subject?: string;
  email_body?: string;
  email_template_id?: string;

  // Notification params
  notification_title?: string;
  notification_body?: string;
  notification_type?: 'info' | 'warning' | 'success' | 'error';

  // Update entity params
  entity_field?: string;
  entity_value?: unknown;
  entity_type?: string;

  // Assign user params
  assign_to?: string;
  assign_type?: 'specific' | 'round_robin' | 'owner' | 'creator';

  // Stage change params
  stage_id?: string;
  pipeline_id?: string;

  // Note params
  note_content?: string;
  note_type?: string;

  // Activity params
  activity_type?: string;
  activity_description?: string;

  // Webhook params
  webhook_url?: string;
  webhook_method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  webhook_headers?: Record<string, string>;
  webhook_body?: Record<string, unknown>;

  // Delay params
  delay_minutes?: number;
  delay_hours?: number;
  delay_days?: number;

  // SMS params
  sms_to?: string;
  sms_body?: string;

  // Tag params
  tag_name?: string;
  tag_id?: string;

  // Generic params
  [key: string]: unknown;
}

export interface WorkflowActionConfig {
  id: string;
  workflow_id: string;
  action: WorkflowAction;
  params: WorkflowActionParams;
  order: number;
  created_at: string;
  updated_at?: string;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // Relations
  triggers?: WorkflowTrigger[];
  actions?: WorkflowActionConfig[];
  // Computed
  trigger_count?: number;
  action_count?: number;
  execution_count?: number;
  last_execution?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  triggered_at: string;
  completed_at?: string;
  status: ExecutionStatus;
  error_message?: string;
  metadata: {
    trigger_event?: string;
    entity_id?: string;
    entity_type?: string;
    actions_executed?: number;
    actions_failed?: number;
    duration_ms?: number;
    [key: string]: unknown;
  };
  // Relations
  workflow?: Workflow;
}

// ============================================
// Form Types
// ============================================

export interface WorkflowFormData {
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  is_active: boolean;
}

export interface TriggerFormData {
  trigger: EventTrigger;
  conditions: WorkflowCondition[];
}

export interface ActionFormData {
  action: WorkflowAction;
  params: WorkflowActionParams;
  order?: number;
}

// ============================================
// Filter & Query Types
// ============================================

export interface WorkflowFilters {
  search?: string;
  trigger_type?: WorkflowTriggerType;
  is_active?: boolean;
  trigger?: EventTrigger;
}

export interface ExecutionFilters {
  workflow_id?: string;
  status?: ExecutionStatus;
  from_date?: string;
  to_date?: string;
}

// ============================================
// Statistics
// ============================================

export interface WorkflowStatistics {
  total_workflows: number;
  active_workflows: number;
  inactive_workflows: number;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  executions_today: number;
  executions_this_week: number;
}

// ============================================
// Event Payload Types
// ============================================

export interface WorkflowEvent {
  id: string;
  tenant_id: string;
  event_type: EventTrigger;
  entity_type: string;
  entity_id: string;
  data: Record<string, unknown>;
  previous_data?: Record<string, unknown>;
  user_id?: string;
  timestamp: string;
}

// ============================================
// Action Parameter Configurations
// ============================================

export interface ActionParameterConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'user_select' | 'email' | 'url' | 'json';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
  description?: string;
}

export const ACTION_PARAMETER_CONFIGS: Record<WorkflowAction, ActionParameterConfig[]> = {
  create_task: [
    { key: 'task_title', label: 'Título', type: 'text', required: true, placeholder: 'Título de la tarea' },
    {
      key: 'task_description',
      label: 'Descripción',
      type: 'textarea',
      required: false,
      placeholder: 'Descripción opcional',
    },
    {
      key: 'task_priority',
      label: 'Prioridad',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ],
    },
    {
      key: 'task_due_days',
      label: 'Días hasta vencimiento',
      type: 'number',
      required: false,
      placeholder: '3',
      description: 'Número de días desde hoy',
    },
    { key: 'task_assigned_to', label: 'Asignar a', type: 'user_select', required: false },
  ],
  update_task: [
    { key: 'task_title', label: 'Nuevo título', type: 'text', required: false },
    {
      key: 'task_priority',
      label: 'Nueva prioridad',
      type: 'select',
      required: false,
      options: [
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
        { value: 'urgent', label: 'Urgente' },
      ],
    },
  ],
  complete_task: [],
  send_email: [
    {
      key: 'email_to',
      label: 'Destinatario',
      type: 'text',
      required: true,
      placeholder: '{{lead.email}} o email fijo',
    },
    { key: 'email_subject', label: 'Asunto', type: 'text', required: true, placeholder: 'Asunto del email' },
    { key: 'email_body', label: 'Cuerpo', type: 'textarea', required: true, placeholder: 'Contenido del email' },
  ],
  send_notification: [
    { key: 'notification_title', label: 'Título', type: 'text', required: true },
    { key: 'notification_body', label: 'Mensaje', type: 'textarea', required: true },
    {
      key: 'notification_type',
      label: 'Tipo',
      type: 'select',
      required: false,
      options: [
        { value: 'info', label: 'Información' },
        { value: 'warning', label: 'Advertencia' },
        { value: 'success', label: 'Éxito' },
        { value: 'error', label: 'Error' },
      ],
    },
  ],
  update_entity: [
    { key: 'entity_field', label: 'Campo a actualizar', type: 'text', required: true, placeholder: 'status' },
    { key: 'entity_value', label: 'Nuevo valor', type: 'text', required: true, placeholder: 'Nuevo valor' },
  ],
  assign_user: [
    {
      key: 'assign_type',
      label: 'Tipo de asignación',
      type: 'select',
      required: true,
      options: [
        { value: 'specific', label: 'Usuario específico' },
        { value: 'round_robin', label: 'Round Robin' },
        { value: 'owner', label: 'Dueño actual' },
        { value: 'creator', label: 'Creador' },
      ],
    },
    { key: 'assign_to', label: 'Usuario', type: 'user_select', required: false },
  ],
  change_stage: [
    { key: 'pipeline_id', label: 'Pipeline', type: 'select', required: true, options: [] },
    { key: 'stage_id', label: 'Nueva etapa', type: 'select', required: true, options: [] },
  ],
  create_note: [
    { key: 'note_content', label: 'Contenido', type: 'textarea', required: true, placeholder: 'Contenido de la nota' },
  ],
  create_activity: [
    {
      key: 'activity_type',
      label: 'Tipo',
      type: 'select',
      required: true,
      options: [
        { value: 'call', label: 'Llamada' },
        { value: 'email', label: 'Email' },
        { value: 'meeting', label: 'Reunión' },
        { value: 'note', label: 'Nota' },
        { value: 'task', label: 'Tarea' },
      ],
    },
    { key: 'activity_description', label: 'Descripción', type: 'textarea', required: true },
  ],
  trigger_webhook: [
    { key: 'webhook_url', label: 'URL', type: 'url', required: true, placeholder: 'https://...' },
    {
      key: 'webhook_method',
      label: 'Método',
      type: 'select',
      required: true,
      options: [
        { value: 'POST', label: 'POST' },
        { value: 'GET', label: 'GET' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
      ],
    },
    { key: 'webhook_body', label: 'Body (JSON)', type: 'json', required: false },
  ],
  delay: [
    { key: 'delay_minutes', label: 'Minutos', type: 'number', required: false, placeholder: '0' },
    { key: 'delay_hours', label: 'Horas', type: 'number', required: false, placeholder: '0' },
    { key: 'delay_days', label: 'Días', type: 'number', required: false, placeholder: '0' },
  ],
  create_opportunity: [
    { key: 'opportunity_name', label: 'Nombre', type: 'text', required: true, placeholder: 'Nombre de la oportunidad' },
    { key: 'opportunity_value', label: 'Valor', type: 'number', required: false, placeholder: '0' },
  ],
  create_customer: [],
  send_sms: [
    { key: 'sms_to', label: 'Teléfono', type: 'text', required: true, placeholder: '{{lead.phone}}' },
    { key: 'sms_body', label: 'Mensaje', type: 'textarea', required: true, placeholder: 'Contenido del SMS' },
  ],
  add_tag: [{ key: 'tag_name', label: 'Etiqueta', type: 'text', required: true, placeholder: 'Nombre de la etiqueta' }],
  remove_tag: [
    { key: 'tag_name', label: 'Etiqueta', type: 'text', required: true, placeholder: 'Nombre de la etiqueta' },
  ],
};

// ============================================
// Template Variables
// ============================================

export const TEMPLATE_VARIABLES = {
  lead: ['{{lead.name}}', '{{lead.email}}', '{{lead.phone}}', '{{lead.company}}', '{{lead.score}}', '{{lead.stage}}'],
  opportunity: [
    '{{opportunity.name}}',
    '{{opportunity.value}}',
    '{{opportunity.stage}}',
    '{{opportunity.probability}}',
  ],
  customer: ['{{customer.name}}', '{{customer.email}}', '{{customer.phone}}', '{{customer.company}}'],
  task: ['{{task.title}}', '{{task.description}}', '{{task.due_date}}', '{{task.priority}}'],
  user: ['{{user.name}}', '{{user.email}}', '{{assigned_user.name}}', '{{assigned_user.email}}'],
  system: ['{{current_date}}', '{{current_time}}', '{{tenant.name}}'],
} as const;

// ============================================
// FASE 6.2 — AI Actions & Triggers Integration
// ============================================

// Combined action types (standard + AI)
export const ALL_WORKFLOW_ACTIONS = [...WORKFLOW_ACTIONS, ...AI_WORKFLOW_ACTIONS] as const;
export type AllWorkflowAction = WorkflowAction | AIWorkflowAction;

// Combined trigger types (standard + AI)
export const ALL_EVENT_TRIGGERS = [...EVENT_TRIGGERS, ...AI_EVENT_TRIGGERS] as const;
export type AllEventTrigger = EventTrigger | AIEventTrigger;

// Combined action labels
export const ALL_WORKFLOW_ACTION_LABELS: Record<AllWorkflowAction, string> = {
  ...WORKFLOW_ACTION_LABELS,
  ...AI_WORKFLOW_ACTION_LABELS,
};

// Combined action icons
export const ALL_WORKFLOW_ACTION_ICONS: Record<AllWorkflowAction, string> = {
  ...WORKFLOW_ACTION_ICONS,
  ...AI_WORKFLOW_ACTION_ICONS,
};

// Combined trigger labels
export const ALL_EVENT_TRIGGER_LABELS: Record<AllEventTrigger, string> = {
  ...EVENT_TRIGGER_LABELS,
  ...AI_EVENT_TRIGGER_LABELS,
};

// Combined trigger groups
export const ALL_TRIGGER_GROUPS = {
  ...TRIGGER_GROUPS,
  ...AI_TRIGGER_GROUP,
} as const;

export const ALL_TRIGGER_GROUP_LABELS: Record<keyof typeof ALL_TRIGGER_GROUPS, string> = {
  ...TRIGGER_GROUP_LABELS,
  ai: 'Inteligencia Artificial',
};

// Action categories for UI grouping
export const ACTION_CATEGORIES = {
  standard: {
    label: 'Acciones Estándar',
    actions: WORKFLOW_ACTIONS,
  },
  ai: {
    label: 'Acciones de IA',
    actions: AI_WORKFLOW_ACTIONS,
    icon: 'Sparkles',
    badge: 'AI',
  },
} as const;

// ============================================
// Extended Action Parameter Configs
// ============================================

export const ALL_ACTION_PARAMETER_CONFIGS = {
  ...ACTION_PARAMETER_CONFIGS,
  ...AI_ACTION_PARAMETER_CONFIGS,
};

// ============================================
// AI Workflow Extensions
// ============================================

export interface WorkflowAIConfig {
  enabled: boolean;
  confidenceThreshold?: number;
  requireApproval?: boolean;
  maxRetries?: number;
  fallbackAction?: WorkflowAction;
}

export interface ExtendedWorkflow extends Workflow {
  aiConfig?: WorkflowAIConfig;
  hasAIActions?: boolean;
  hasAITriggers?: boolean;
}

export interface ExtendedWorkflowActionConfig extends Omit<WorkflowActionConfig, 'action'> {
  action: AllWorkflowAction;
  params: WorkflowActionParams | AIActionParams;
  aiSettings?: {
    confidenceThreshold?: number;
    requireApproval?: boolean;
    retryOnFailure?: boolean;
    fallbackAction?: WorkflowAction;
  };
}

export interface ExtendedWorkflowTrigger extends Omit<WorkflowTrigger, 'trigger'> {
  trigger: AllEventTrigger;
  aiConditions?: {
    minConfidence?: number;
    minScore?: number;
    intentTypes?: string[];
    riskLevels?: string[];
  };
}

// ============================================
// AI Workflow Execution Extensions
// ============================================

export interface AIExecutionMetadata {
  aiProvider?: string;
  aiModel?: string;
  promptSummary?: string;
  aiDecision?: string;
  aiReasoning?: string;
  aiConfidence?: number;
  tokensUsed?: number;
  aiLatencyMs?: number;
}

export interface ExtendedWorkflowExecution extends WorkflowExecution {
  metadata: WorkflowExecution['metadata'] & {
    aiExecutions?: AIExecutionMetadata[];
    hasAIActions?: boolean;
    aiActionsExecuted?: number;
    aiActionsFailed?: number;
  };
}

// Re-export AI types for convenience
export type { AIWorkflowAction, AIEventTrigger, AIActionParams };
