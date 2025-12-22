// ============================================
// FASE 6.2 — AI Actions Types
// Type definitions for AI-powered workflow actions
// ============================================

// ============================================
// AI Action Types
// ============================================

export const AI_WORKFLOW_ACTIONS = [
  'ai_create_note',
  'ai_classify_lead',
  'ai_score_lead',
  'ai_generate_followup',
  'ai_enrich_lead',
  'ai_auto_stage',
  'ai_auto_assign',
  'ai_generate_summary',
  'ai_predict_conversion',
  'ai_detect_intent',
] as const;

export type AIWorkflowAction = (typeof AI_WORKFLOW_ACTIONS)[number];

export const AI_WORKFLOW_ACTION_LABELS: Record<AIWorkflowAction, string> = {
  ai_create_note: 'IA: Crear nota automática',
  ai_classify_lead: 'IA: Clasificar lead',
  ai_score_lead: 'IA: Recalcular score',
  ai_generate_followup: 'IA: Generar seguimiento',
  ai_enrich_lead: 'IA: Enriquecer datos',
  ai_auto_stage: 'IA: Actualizar etapa',
  ai_auto_assign: 'IA: Asignar automáticamente',
  ai_generate_summary: 'IA: Generar resumen',
  ai_predict_conversion: 'IA: Predecir conversión',
  ai_detect_intent: 'IA: Detectar intención',
};

export const AI_WORKFLOW_ACTION_ICONS: Record<AIWorkflowAction, string> = {
  ai_create_note: 'FileText',
  ai_classify_lead: 'Tag',
  ai_score_lead: 'Star',
  ai_generate_followup: 'MessageSquare',
  ai_enrich_lead: 'Sparkles',
  ai_auto_stage: 'ArrowRight',
  ai_auto_assign: 'UserCheck',
  ai_generate_summary: 'FileSearch',
  ai_predict_conversion: 'TrendingUp',
  ai_detect_intent: 'Target',
};

export const AI_WORKFLOW_ACTION_DESCRIPTIONS: Record<AIWorkflowAction, string> = {
  ai_create_note: 'Genera automáticamente una nota con resumen del lead, análisis de interacción y próximos pasos sugeridos',
  ai_classify_lead: 'Usa IA para etiquetar el lead, aplicar temperatura y actualizar campos sugeridos',
  ai_score_lead: 'Recalcula el score del lead usando el motor de IA y guarda el resultado',
  ai_generate_followup: 'Genera un mensaje de seguimiento personalizado y crea una tarea automáticamente',
  ai_enrich_lead: 'Completa información faltante como industria, persona, intención y razón de contacto',
  ai_auto_stage: 'Actualiza la etapa del lead basándose en la predicción de IA',
  ai_auto_assign: 'Asigna el lead al mejor usuario según disponibilidad, histórico y carga actual',
  ai_generate_summary: 'Genera un resumen completo del lead o oportunidad',
  ai_predict_conversion: 'Calcula la probabilidad de conversión y la guarda en el registro',
  ai_detect_intent: 'Detecta la intención del lead y actualiza los campos correspondientes',
};

// ============================================
// AI Event Triggers
// ============================================

export const AI_EVENT_TRIGGERS = [
  'ai.score_changed',
  'ai.intent_detected',
  'ai.risk_detected',
  'ai.stage_prediction_changed',
  'ai.drop_risk_detected',
  'ai.followup_recommended',
  'ai.duplicate_detected',
  'ai.high_value_detected',
  'ai.customer_ready_detected',
  'ai.low_engagement_detected',
  'ai.sentiment_changed',
  'ai.enrichment_completed',
] as const;

export type AIEventTrigger = (typeof AI_EVENT_TRIGGERS)[number];

export const AI_EVENT_TRIGGER_LABELS: Record<AIEventTrigger, string> = {
  'ai.score_changed': 'Score de IA cambió',
  'ai.intent_detected': 'Intención detectada por IA',
  'ai.risk_detected': 'Riesgo detectado por IA',
  'ai.stage_prediction_changed': 'Predicción de etapa cambió',
  'ai.drop_risk_detected': 'Riesgo de abandono detectado',
  'ai.followup_recommended': 'Seguimiento recomendado por IA',
  'ai.duplicate_detected': 'Duplicado detectado por IA',
  'ai.high_value_detected': 'Alto valor detectado',
  'ai.customer_ready_detected': 'Lead listo para convertir',
  'ai.low_engagement_detected': 'Bajo engagement detectado',
  'ai.sentiment_changed': 'Sentimiento cambió',
  'ai.enrichment_completed': 'Enriquecimiento completado',
};

export const AI_TRIGGER_GROUP = {
  ai: AI_EVENT_TRIGGERS,
} as const;

// ============================================
// AI Action Parameters
// ============================================

export interface AIActionParams {
  // Common params
  confidence_threshold?: number; // 0-1, minimum confidence to execute
  require_approval?: boolean; // Require user approval before applying
  fallback_action?: string; // Action to execute if AI fails
  max_retries?: number; // Maximum retry attempts

  // AI Note params
  note_type?: 'summary' | 'analysis' | 'recommendation' | 'followup';
  include_sentiment?: boolean;
  include_next_actions?: boolean;

  // Classification params
  apply_temperature?: boolean;
  apply_tags?: boolean;
  update_fields?: string[];

  // Score params
  score_type?: 'full' | 'quick';
  save_factors?: boolean;

  // Followup params
  followup_type?: 'email' | 'call' | 'meeting' | 'task';
  followup_priority?: 'low' | 'medium' | 'high';
  due_days?: number;

  // Enrich params
  enrich_fields?: ('industry' | 'persona' | 'intent' | 'contact_reason' | 'company_size')[];

  // Auto-stage params
  pipeline_id?: string;
  min_probability?: number;

  // Auto-assign params
  assign_strategy?: 'round_robin' | 'least_loaded' | 'best_match' | 'performance_based';
  team_id?: string;
  exclude_users?: string[];

  // Generic
  [key: string]: unknown;
}

// ============================================
// AI Action Result
// ============================================

export interface AIActionResult {
  success: boolean;
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  data?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metadata: {
    executionId: string;
    workflowId?: string;
    provider?: string;
    model?: string;
    tokensUsed?: number;
    latencyMs: number;
    confidence?: number;
    requiresApproval?: boolean;
  };
  audit: {
    prompt?: string;
    decision: string;
    reasoning?: string;
    appliedChanges?: Record<string, unknown>;
    timestamp: string;
  };
}

// ============================================
// AI Suggestion Types
// ============================================

export interface AISuggestion {
  id: string;
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  action: AIWorkflowAction;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high';
  suggestedChanges?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  status: 'pending' | 'applied' | 'dismissed' | 'expired';
}

export interface AISuggestionGroup {
  entityType: string;
  entityId: string;
  suggestions: AISuggestion[];
  totalCount: number;
  highPriorityCount: number;
}

// ============================================
// AI Queue Types
// ============================================

export type AIQueuePriority = 'low' | 'normal' | 'high' | 'critical';

export interface AIQueueItem {
  id: string;
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params: AIActionParams;
  priority: AIQueuePriority;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: AIActionResult;
  createdAt: string;
}

// ============================================
// AI Audit Log Types
// ============================================

export interface AIWorkflowAuditEntry {
  id: string;
  tenantId: string;
  workflowId?: string;
  executionId?: string;
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  userId?: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled';
  input: {
    params: AIActionParams;
    context?: Record<string, unknown>;
  };
  output?: {
    result?: AIActionResult;
    error?: string;
  };
  aiDetails: {
    provider?: string;
    model?: string;
    promptSummary?: string;
    decision?: string;
    reasoning?: string;
    confidence?: number;
    tokensUsed?: number;
  };
  appliedChanges?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  timing: {
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
  };
  metadata?: Record<string, unknown>;
}

// ============================================
// Action Parameter Configurations
// ============================================

export interface AIActionParameterConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'slider' | 'user_select' | 'multi_select';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}

export const AI_ACTION_PARAMETER_CONFIGS: Record<AIWorkflowAction, AIActionParameterConfig[]> = {
  ai_create_note: [
    {
      key: 'note_type',
      label: 'Tipo de nota',
      type: 'select',
      required: false,
      defaultValue: 'summary',
      options: [
        { value: 'summary', label: 'Resumen' },
        { value: 'analysis', label: 'Análisis' },
        { value: 'recommendation', label: 'Recomendación' },
        { value: 'followup', label: 'Seguimiento' },
      ],
    },
    { key: 'include_sentiment', label: 'Incluir sentimiento', type: 'checkbox', required: false, defaultValue: true },
    { key: 'include_next_actions', label: 'Incluir próximas acciones', type: 'checkbox', required: false, defaultValue: true },
    {
      key: 'confidence_threshold',
      label: 'Umbral de confianza',
      type: 'slider',
      required: false,
      defaultValue: 0.7,
      min: 0,
      max: 1,
      step: 0.1,
      description: 'Mínima confianza requerida para ejecutar',
    },
  ],
  ai_classify_lead: [
    { key: 'apply_temperature', label: 'Aplicar temperatura', type: 'checkbox', required: false, defaultValue: true },
    { key: 'apply_tags', label: 'Aplicar etiquetas', type: 'checkbox', required: false, defaultValue: true },
    {
      key: 'update_fields',
      label: 'Campos a actualizar',
      type: 'multi_select',
      required: false,
      options: [
        { value: 'industry', label: 'Industria' },
        { value: 'company_size', label: 'Tamaño de empresa' },
        { value: 'buyer_persona', label: 'Persona compradora' },
        { value: 'intent_level', label: 'Nivel de intención' },
      ],
    },
    { key: 'confidence_threshold', label: 'Umbral de confianza', type: 'slider', required: false, defaultValue: 0.75, min: 0, max: 1, step: 0.05 },
  ],
  ai_score_lead: [
    {
      key: 'score_type',
      label: 'Tipo de score',
      type: 'select',
      required: false,
      defaultValue: 'full',
      options: [
        { value: 'full', label: 'Completo' },
        { value: 'quick', label: 'Rápido' },
      ],
    },
    { key: 'save_factors', label: 'Guardar factores', type: 'checkbox', required: false, defaultValue: true },
  ],
  ai_generate_followup: [
    {
      key: 'followup_type',
      label: 'Tipo de seguimiento',
      type: 'select',
      required: true,
      options: [
        { value: 'email', label: 'Email' },
        { value: 'call', label: 'Llamada' },
        { value: 'meeting', label: 'Reunión' },
        { value: 'task', label: 'Tarea' },
      ],
    },
    {
      key: 'followup_priority',
      label: 'Prioridad',
      type: 'select',
      required: false,
      defaultValue: 'medium',
      options: [
        { value: 'low', label: 'Baja' },
        { value: 'medium', label: 'Media' },
        { value: 'high', label: 'Alta' },
      ],
    },
    { key: 'due_days', label: 'Días hasta vencimiento', type: 'number', required: false, defaultValue: 3, min: 1, max: 30 },
    { key: 'require_approval', label: 'Requiere aprobación', type: 'checkbox', required: false, defaultValue: true },
  ],
  ai_enrich_lead: [
    {
      key: 'enrich_fields',
      label: 'Campos a enriquecer',
      type: 'multi_select',
      required: false,
      options: [
        { value: 'industry', label: 'Industria' },
        { value: 'persona', label: 'Persona' },
        { value: 'intent', label: 'Intención' },
        { value: 'contact_reason', label: 'Razón de contacto' },
        { value: 'company_size', label: 'Tamaño de empresa' },
      ],
    },
    { key: 'confidence_threshold', label: 'Umbral de confianza', type: 'slider', required: false, defaultValue: 0.8, min: 0, max: 1, step: 0.05 },
  ],
  ai_auto_stage: [
    { key: 'pipeline_id', label: 'Pipeline', type: 'select', required: false, options: [] },
    { key: 'min_probability', label: 'Probabilidad mínima', type: 'slider', required: false, defaultValue: 0.7, min: 0, max: 1, step: 0.05 },
    { key: 'require_approval', label: 'Requiere aprobación', type: 'checkbox', required: false, defaultValue: true },
  ],
  ai_auto_assign: [
    {
      key: 'assign_strategy',
      label: 'Estrategia de asignación',
      type: 'select',
      required: true,
      options: [
        { value: 'round_robin', label: 'Round Robin' },
        { value: 'least_loaded', label: 'Menos cargado' },
        { value: 'best_match', label: 'Mejor coincidencia' },
        { value: 'performance_based', label: 'Basado en rendimiento' },
      ],
    },
    { key: 'team_id', label: 'Equipo', type: 'select', required: false, options: [] },
    { key: 'exclude_users', label: 'Excluir usuarios', type: 'multi_select', required: false, options: [] },
  ],
  ai_generate_summary: [
    { key: 'include_sentiment', label: 'Incluir sentimiento', type: 'checkbox', required: false, defaultValue: true },
    { key: 'include_next_actions', label: 'Incluir próximas acciones', type: 'checkbox', required: false, defaultValue: true },
  ],
  ai_predict_conversion: [
    { key: 'confidence_threshold', label: 'Umbral de confianza', type: 'slider', required: false, defaultValue: 0.6, min: 0, max: 1, step: 0.05 },
  ],
  ai_detect_intent: [
    { key: 'confidence_threshold', label: 'Umbral de confianza', type: 'slider', required: false, defaultValue: 0.7, min: 0, max: 1, step: 0.05 },
  ],
};

// ============================================
// Exports
// ============================================

export type CombinedWorkflowAction = AIWorkflowAction | string;
export type CombinedEventTrigger = AIEventTrigger | string;
