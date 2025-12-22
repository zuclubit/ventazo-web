/**
 * Workflow Automation Types
 * Types for the workflow automation engine
 */

/**
 * Entity types that can trigger workflows
 */
export type WorkflowEntityType =
  | 'lead'
  | 'contact'
  | 'opportunity'
  | 'customer'
  | 'task'
  | 'communication';

/**
 * Workflow trigger types
 */
export type WorkflowTriggerType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'score_changed'
  | 'stage_changed'
  | 'field_changed'
  | 'scheduled'
  | 'manual';

/**
 * Workflow action types
 */
export type WorkflowActionType =
  | 'send_email'
  | 'send_notification'
  | 'send_push'
  | 'create_task'
  | 'update_field'
  | 'assign_to'
  | 'add_tag'
  | 'remove_tag'
  | 'change_status'
  | 'change_stage'
  | 'create_note'
  | 'send_webhook'
  | 'delay'
  | 'condition';

/**
 * Workflow execution status
 */
export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/**
 * Condition operator types
 */
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in';

/**
 * Workflow condition
 */
export interface WorkflowCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logicalOperator?: 'and' | 'or';
}

/**
 * Workflow trigger configuration
 */
export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  entityType: WorkflowEntityType;
  conditions?: WorkflowCondition[];
  // For field_changed trigger
  field?: string;
  // For scheduled trigger
  schedule?: {
    type: 'once' | 'recurring';
    cron?: string;
    runAt?: Date;
    timezone?: string;
  };
}

/**
 * Email action configuration
 */
export interface SendEmailAction {
  type: 'send_email';
  templateId?: string;
  to: string | string[]; // Can use {{field}} placeholders
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

/**
 * Notification action configuration
 */
export interface SendNotificationAction {
  type: 'send_notification';
  recipientType: 'owner' | 'assignee' | 'team' | 'specific';
  recipientIds?: string[];
  title: string;
  body: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Push notification action configuration
 */
export interface SendPushAction {
  type: 'send_push';
  recipientType: 'owner' | 'assignee' | 'team' | 'specific';
  recipientIds?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Create task action configuration
 */
export interface CreateTaskAction {
  type: 'create_task';
  title: string;
  description?: string;
  assigneeType: 'owner' | 'assignee' | 'specific';
  assigneeId?: string;
  dueInDays?: number;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  taskType?: string;
}

/**
 * Update field action configuration
 */
export interface UpdateFieldAction {
  type: 'update_field';
  field: string;
  value: unknown;
}

/**
 * Assign action configuration
 */
export interface AssignToAction {
  type: 'assign_to';
  assigneeType: 'specific' | 'round_robin' | 'least_busy';
  assigneeId?: string;
  teamId?: string;
}

/**
 * Tag action configuration
 */
export interface TagAction {
  type: 'add_tag' | 'remove_tag';
  tags: string[];
}

/**
 * Status/Stage change action configuration
 */
export interface ChangeStatusAction {
  type: 'change_status' | 'change_stage';
  value: string;
}

/**
 * Create note action configuration
 */
export interface CreateNoteAction {
  type: 'create_note';
  content: string;
  noteType?: string;
  isPrivate?: boolean;
}

/**
 * Webhook action configuration
 */
export interface SendWebhookAction {
  type: 'send_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

/**
 * Delay action configuration
 */
export interface DelayAction {
  type: 'delay';
  duration: number; // in seconds
  unit?: 'seconds' | 'minutes' | 'hours' | 'days';
}

/**
 * Condition action configuration (branching)
 */
export interface ConditionAction {
  type: 'condition';
  conditions: WorkflowCondition[];
  thenActions: WorkflowAction[];
  elseActions?: WorkflowAction[];
}

/**
 * All action types
 */
export type WorkflowAction =
  | SendEmailAction
  | SendNotificationAction
  | SendPushAction
  | CreateTaskAction
  | UpdateFieldAction
  | AssignToAction
  | TagAction
  | ChangeStatusAction
  | CreateNoteAction
  | SendWebhookAction
  | DelayAction
  | ConditionAction;

/**
 * Workflow definition
 */
export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  priority: number;
  executionLimit?: number;
  cooldownMinutes?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Workflow execution record
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId: string;
  triggerEntityType?: WorkflowEntityType;
  triggerEntityId?: string;
  triggerEvent: string;
  triggerData: Record<string, unknown>;
  status: WorkflowExecutionStatus;
  actionsExecuted: ActionExecutionResult[];
  totalActions: number;
  completedActions: number;
  failedActions: number;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Action execution result
 */
export interface ActionExecutionResult {
  actionType: WorkflowActionType;
  actionIndex: number;
  status: 'pending' | 'completed' | 'failed' | 'skipped';
  result?: Record<string, unknown>;
  error?: string;
  executedAt: Date;
  durationMs?: number;
}

/**
 * Create workflow input
 */
export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive?: boolean;
  priority?: number;
  executionLimit?: number;
  cooldownMinutes?: number;
}

/**
 * Update workflow input
 */
export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  actions?: WorkflowAction[];
  isActive?: boolean;
  priority?: number;
  executionLimit?: number;
  cooldownMinutes?: number;
}

/**
 * Trigger context (passed to workflow execution)
 */
export interface TriggerContext {
  entityType: WorkflowEntityType;
  entityId: string;
  entity: Record<string, unknown>;
  previousEntity?: Record<string, unknown>;
  event: WorkflowTriggerType;
  changedFields?: string[];
  userId?: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

/**
 * List workflows options
 */
export interface ListWorkflowsOptions {
  entityType?: WorkflowEntityType;
  triggerType?: WorkflowTriggerType;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Paginated workflows response
 */
export interface PaginatedWorkflowsResponse {
  workflows: Workflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * List executions options
 */
export interface ListExecutionsOptions {
  workflowId?: string;
  status?: WorkflowExecutionStatus;
  entityType?: WorkflowEntityType;
  entityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/**
 * Paginated executions response
 */
export interface PaginatedExecutionsResponse {
  executions: WorkflowExecution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
