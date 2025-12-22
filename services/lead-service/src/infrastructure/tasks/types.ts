/**
 * Task Types
 * Types for task management and reminders
 */

/**
 * Task Type Enum
 */
export enum TaskType {
  TASK = 'task',
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  FOLLOW_UP = 'follow_up',
  DEMO = 'demo',
  PROPOSAL = 'proposal',
  OTHER = 'other',
}

/**
 * Task Priority Enum
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Task Status Enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred',
}

/**
 * Task Entity Type - what the task is related to
 */
export enum TaskEntityType {
  LEAD = 'lead',
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
}

/**
 * Recurrence Frequency
 */
export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Recurrence Rule (iCal RRULE compatible)
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // Every N frequency units
  count?: number; // Number of occurrences
  until?: Date; // End date
  byDay?: string[]; // Days of week: MO, TU, WE, TH, FR, SA, SU
  byMonthDay?: number[]; // Days of month: 1-31
  byMonth?: number[]; // Months: 1-12
}

/**
 * Task DTO
 */
export interface TaskDTO {
  id: string;
  tenantId: string;

  // Related entity
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  entityType?: TaskEntityType;

  // Task details
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;

  // Assignment
  assignedTo?: string;
  assignedBy?: string;
  assignedToName?: string;

  // Scheduling
  dueDate?: Date;
  reminderAt?: Date;
  completedAt?: Date;

  // Recurrence
  isRecurring: boolean;
  recurrenceRule?: RecurrenceRule;
  nextTaskId?: string;

  // Outcome
  outcome?: string;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Computed
  isOverdue?: boolean;
  daysUntilDue?: number;
}

/**
 * Create Task Request
 */
export interface CreateTaskRequest {
  // Related entity (at least one required)
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

  // Assignee notification info (for email/SMS)
  assigneeName?: string;
  assigneeEmail?: string;
  assigneePhone?: string;

  // Scheduling
  dueDate?: Date;
  reminderAt?: Date;

  // Recurrence
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update Task Request
 */
export interface UpdateTaskRequest {
  title?: string;
  description?: string | null;
  type?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string | null;
  dueDate?: Date | null;
  reminderAt?: Date | null;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Complete Task Request
 */
export interface CompleteTaskRequest {
  outcome?: string;
  createFollowUp?: boolean;
  followUpDate?: Date;
  followUpTitle?: string;
}

/**
 * Task Filter Options
 */
export interface TaskFilterOptions {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  type?: TaskType | TaskType[];
  assignedTo?: string;
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  isOverdue?: boolean;
  includeCompleted?: boolean;
  searchTerm?: string;
}

/**
 * Task Sort Options
 */
export interface TaskSortOptions {
  sortBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Task Statistics
 */
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
  byType: Record<string, number>;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  completedThisWeek: number;
  completionRate: number; // Percentage
  averageCompletionTime: number; // In hours
}

/**
 * Upcoming Tasks Response
 */
export interface UpcomingTasksResponse {
  today: TaskDTO[];
  tomorrow: TaskDTO[];
  thisWeek: TaskDTO[];
  overdue: TaskDTO[];
}

/**
 * Bulk Task Operation
 */
export interface BulkTaskOperation {
  taskIds: string[];
  action: 'complete' | 'cancel' | 'defer' | 'reassign' | 'delete';
  assignTo?: string; // For reassign action
  deferTo?: Date; // For defer action
}

/**
 * Bulk Task Result
 */
export interface BulkTaskResult {
  successful: string[];
  failed: { taskId: string; error: string }[];
}

/**
 * Task Reminder
 */
export interface TaskReminder {
  taskId: string;
  userId: string;
  reminderAt: Date;
  sent: boolean;
  sentAt?: Date;
}

/**
 * Task Activity Log Entry
 */
export interface TaskActivityEntry {
  id: string;
  taskId: string;
  action: string;
  userId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  timestamp: Date;
}
