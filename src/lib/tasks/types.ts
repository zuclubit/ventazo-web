// ============================================
// Tasks Module Types - FASE 5.5
// TypeScript types and interfaces for tasks
// ============================================

// ============================================
// Enums & Constants
// ============================================

export const TASK_TYPE = [
  'task',
  'call',
  'email',
  'meeting',
  'follow_up',
  'demo',
  'proposal',
  'other',
] as const;
export type TaskType = typeof TASK_TYPE[number];

export const TASK_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = typeof TASK_PRIORITY[number];

export const TASK_STATUS = ['pending', 'in_progress', 'completed', 'cancelled', 'deferred'] as const;
export type TaskStatus = typeof TASK_STATUS[number];

export const TASK_ENTITY_TYPE = ['lead', 'customer', 'opportunity'] as const;
export type TaskEntityType = typeof TASK_ENTITY_TYPE[number];

export const RECURRENCE_FREQUENCY = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;
export type RecurrenceFrequency = typeof RECURRENCE_FREQUENCY[number];

export const TASK_ACTIVITY_ACTION = [
  'created',
  'updated',
  'completed',
  'cancelled',
  'deferred',
  'reassigned',
  'status_changed',
  'priority_changed',
  'due_date_changed',
  'comment_added',
  'comment_updated',
  'comment_deleted',
] as const;
export type TaskActivityAction = typeof TASK_ACTIVITY_ACTION[number];

// ============================================
// Display Labels & Colors
// ============================================

export const TYPE_LABELS: Record<TaskType, string> = {
  task: 'Tarea',
  call: 'Llamada',
  email: 'Correo',
  meeting: 'Reunion',
  follow_up: 'Seguimiento',
  demo: 'Demo',
  proposal: 'Propuesta',
  other: 'Otro',
};

export const TYPE_ICONS: Record<TaskType, string> = {
  task: 'check-square',
  call: 'phone',
  email: 'mail',
  meeting: 'users',
  follow_up: 'refresh-cw',
  demo: 'monitor',
  proposal: 'file-text',
  other: 'circle',
};

export const TYPE_COLORS: Record<TaskType, string> = {
  task: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  call: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  follow_up: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  demo: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  proposal: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export const PRIORITY_ICONS: Record<TaskPriority, string> = {
  low: 'arrow-down',
  medium: 'minus',
  high: 'arrow-up',
  urgent: 'alert-triangle',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  deferred: 'Diferida',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  deferred: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

export const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: 'clock',
  in_progress: 'loader',
  completed: 'check-circle',
  cancelled: 'x-circle',
  deferred: 'pause-circle',
};

export const ENTITY_TYPE_LABELS: Record<TaskEntityType, string> = {
  lead: 'Lead',
  customer: 'Cliente',
  opportunity: 'Oportunidad',
};

export const ENTITY_TYPE_COLORS: Record<TaskEntityType, string> = {
  lead: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  customer: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  opportunity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export const ACTIVITY_LABELS: Record<TaskActivityAction, string> = {
  created: 'Tarea creada',
  updated: 'Tarea actualizada',
  completed: 'Tarea completada',
  cancelled: 'Tarea cancelada',
  deferred: 'Tarea diferida',
  reassigned: 'Tarea reasignada',
  status_changed: 'Estado cambiado',
  priority_changed: 'Prioridad cambiada',
  due_date_changed: 'Fecha vencimiento cambiada',
  comment_added: 'Comentario agregado',
  comment_updated: 'Comentario actualizado',
  comment_deleted: 'Comentario eliminado',
};

export const ACTIVITY_COLORS: Record<TaskActivityAction, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  deferred: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  reassigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  status_changed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  priority_changed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  due_date_changed: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  comment_added: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  comment_updated: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  comment_deleted: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
};

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

// ============================================
// Core Interfaces
// ============================================

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  count?: number;
  until?: string;
  byDay?: string[];
  byMonthDay?: number[];
  byMonth?: number[];
}

export interface Task {
  id: string;
  tenantId: string;

  // Related entity
  leadId?: string | null;
  customerId?: string | null;
  opportunityId?: string | null;
  entityType?: TaskEntityType;

  // Task details
  title: string;
  description?: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;

  // Assignment
  assignedTo?: string | null;
  assignedBy?: string | null;
  createdBy: string;

  // Scheduling
  dueDate?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule | null;
  nextTaskId?: string | null;

  // Outcome
  outcome?: string | null;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Computed
  isOverdue?: boolean;
  daysUntilDue?: number;

  // Relations (optional, populated by API)
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
  opportunity?: {
    id: string;
    title: string;
    amount: number;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaskComment {
  id: string;
  tenantId: string;
  taskId: string;
  createdBy: string;
  content: string;
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

export interface TaskActivity {
  id: string;
  tenantId: string;
  taskId: string;
  userId: string;
  action: TaskActivityAction;
  description?: string | null;
  changes?: Record<string, { from: unknown; to: unknown }>;
  metadata: Record<string, unknown>;
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
// Request/Response Types
// ============================================

export interface CreateTaskData {
  // Related entity (optional)
  leadId?: string;
  customerId?: string;
  opportunityId?: string;

  // Task details
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;

  // Assignment
  assignedTo?: string;

  // Scheduling
  dueDate?: string;
  reminderAt?: string;

  // Recurrence
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CompleteTaskData {
  outcome?: string;
  createFollowUp?: boolean;
  followUpDate?: string;
  followUpTitle?: string;
}

export interface CancelTaskData {
  reason?: string;
}

export interface AssignTaskData {
  assignedTo: string | null;
}

export interface DeferTaskData {
  deferTo: string;
  reason?: string;
}

export interface CreateTaskCommentData {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskCommentData {
  content: string;
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

export interface TasksResponse {
  data: Task[];
  meta: PaginationMeta;
}

export interface TaskCommentsResponse {
  data: TaskComment[];
  meta: PaginationMeta;
}

export interface TaskActivityResponse {
  data: TaskActivity[];
  meta: PaginationMeta;
}

export interface TaskStatistics {
  total: number;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    deferred: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  byType: Record<TaskType, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completedThisWeek: number;
  completedToday: number;
  assignedToMe: number;
  completionRate: number; // Percentage
  averageCompletionTime: number; // In hours
}

export interface UpcomingTasks {
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  overdue: Task[];
}

export interface BulkTaskOperation {
  taskIds: string[];
  action: 'complete' | 'cancel' | 'defer' | 'reassign' | 'delete';
  assignTo?: string;
  deferTo?: string;
}

export interface BulkTaskResult {
  successful: string[];
  failed: { taskId: string; error: string }[];
}

// ============================================
// Filter & Sort Types
// ============================================

export interface TaskFilters {
  searchTerm?: string;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType | TaskType[];
  assignedTo?: string;
  createdBy?: string;
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  isOverdue?: boolean;
  includeCompleted?: boolean;
  tags?: string[];
}

export interface TaskSort {
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt' | 'status' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export type TaskCommentsFilters = Record<string, never>;

export interface TaskActivityFilters {
  action?: TaskActivityAction;
  startDate?: string;
  endDate?: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate || task.completedAt || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.dueDate) < new Date();
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format days until due for display
 */
export function formatDaysUntilDue(dueDate: string | null | undefined): string {
  const days = getDaysUntilDue(dueDate);
  if (days === null) return 'Sin fecha';
  if (days < 0) return `Vencida hace ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence manana';
  return `Vence en ${days} dias`;
}

/**
 * Get color for days until due
 */
export function getDueDateColor(dueDate: string | null | undefined, isCompleted: boolean): string {
  if (isCompleted) return 'text-gray-500';
  const days = getDaysUntilDue(dueDate);
  if (days === null) return 'text-gray-500';
  if (days < 0) return 'text-red-600 font-medium';
  if (days === 0) return 'text-orange-600 font-medium';
  if (days <= 3) return 'text-amber-600';
  return 'text-gray-600';
}

/**
 * Get status icon name (for lucide-react)
 */
export function getStatusIcon(status: TaskStatus): string {
  return STATUS_ICONS[status] || 'circle';
}

/**
 * Get priority icon name (for lucide-react)
 */
export function getPriorityIcon(priority: TaskPriority): string {
  return PRIORITY_ICONS[priority] || 'minus';
}

/**
 * Get type icon name (for lucide-react)
 */
export function getTypeIcon(type: TaskType): string {
  return TYPE_ICONS[type] || 'circle';
}

/**
 * Format task type for display
 */
export function formatTaskType(type: TaskType): string {
  return TYPE_LABELS[type] || type;
}

/**
 * Format task priority for display
 */
export function formatTaskPriority(priority: TaskPriority): string {
  return PRIORITY_LABELS[priority] || priority;
}

/**
 * Format task status for display
 */
export function formatTaskStatus(status: TaskStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get entity link info for a task
 */
export function getEntityInfo(task: Task): {
  type: TaskEntityType;
  id: string;
  name: string;
  path: string;
} | null {
  if (task.leadId && task.lead) {
    return {
      type: 'lead',
      id: task.leadId,
      name: task.lead.fullName,
      path: `/app/leads/${task.leadId}`,
    };
  }
  if (task.customerId && task.customer) {
    return {
      type: 'customer',
      id: task.customerId,
      name: task.customer.name,
      path: `/app/customers/${task.customerId}`,
    };
  }
  if (task.opportunityId && task.opportunity) {
    return {
      type: 'opportunity',
      id: task.opportunityId,
      name: task.opportunity.title,
      path: `/app/opportunities/${task.opportunityId}`,
    };
  }
  return null;
}
