// ============================================
// FASE 6.2 — AI Actions Scheduler
// Handles scheduled AI action execution
// ============================================

import type { AIActionParams, AIQueueItem, AIQueuePriority, AIWorkflowAction } from './types';

// ============================================
// Types
// ============================================

export interface ScheduledAction {
  id: string;
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params: AIActionParams;
  priority: AIQueuePriority;
  scheduledAt: Date;
  recurringPattern?: RecurringPattern;
  maxExecutions?: number;
  executionCount: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringPattern {
  type: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';
  interval?: number; // For hourly/daily (every N hours/days)
  daysOfWeek?: number[]; // For weekly (0-6, Sunday = 0)
  dayOfMonth?: number; // For monthly
  cronExpression?: string; // For cron type
  timezone?: string;
}

export interface SchedulerConfig {
  maxConcurrentExecutions: number;
  defaultPriority: AIQueuePriority;
  retryDelayMs: number;
  maxRetries: number;
  batchSize: number;
  pollingIntervalMs: number;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrentExecutions: 5,
  defaultPriority: 'normal',
  retryDelayMs: 5000,
  maxRetries: 3,
  batchSize: 10,
  pollingIntervalMs: 30000,
};

// ============================================
// In-memory Scheduler State
// ============================================

interface SchedulerState {
  scheduledActions: Map<string, ScheduledAction>;
  isRunning: boolean;
  intervalId: NodeJS.Timeout | null;
  config: SchedulerConfig;
  listeners: Set<(event: SchedulerEvent) => void>;
}

interface SchedulerEvent {
  type: 'action_scheduled' | 'action_executed' | 'action_failed' | 'action_cancelled' | 'scheduler_started' | 'scheduler_stopped';
  actionId?: string;
  data?: unknown;
  timestamp: Date;
}

const schedulerState: SchedulerState = {
  scheduledActions: new Map(),
  isRunning: false,
  intervalId: null,
  config: DEFAULT_SCHEDULER_CONFIG,
  listeners: new Set(),
};

// ============================================
// Utility Functions
// ============================================

function generateScheduledActionId(): string {
  return `scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateNextExecution(pattern: RecurringPattern, fromDate: Date = new Date()): Date | null {
  const next = new Date(fromDate);

  switch (pattern.type) {
    case 'once':
      return null; // No next execution for one-time actions

    case 'hourly': {
      const hours = pattern.interval || 1;
      next.setHours(next.getHours() + hours);
      return next;
    }

    case 'daily': {
      const days = pattern.interval || 1;
      next.setDate(next.getDate() + days);
      return next;
    }

    case 'weekly': {
      if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
        next.setDate(next.getDate() + 7);
        return next;
      }

      const currentDay = next.getDay();
      const sortedDays = [...pattern.daysOfWeek].sort((a, b) => a - b);

      // Find next day of week
      let nextDay = sortedDays.find(d => d > currentDay);
      if (nextDay === undefined) {
        nextDay = sortedDays[0] ?? 1;
        next.setDate(next.getDate() + (7 - currentDay + nextDay));
      } else {
        next.setDate(next.getDate() + (nextDay - currentDay));
      }
      return next;
    }

    case 'monthly': {
      const dayOfMonth = pattern.dayOfMonth || 1;
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      return next;
    }

    case 'cron':
      // Simplified cron parsing - in production, use a library like 'cron-parser'
      // For now, default to daily
      next.setDate(next.getDate() + 1);
      return next;

    default:
      return null;
  }
}

function emitEvent(event: SchedulerEvent): void {
  schedulerState.listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[AI Scheduler] Error in event listener:', error);
    }
  });
}

// ============================================
// Scheduler Core Functions
// ============================================

/**
 * Schedule an AI action for execution
 */
export function scheduleAIAction(options: {
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
  priority?: AIQueuePriority;
  scheduledAt?: Date;
  recurringPattern?: RecurringPattern;
  maxExecutions?: number;
}): ScheduledAction {
  const id = generateScheduledActionId();
  const now = new Date();
  const scheduledAt = options.scheduledAt || now;

  const scheduledAction: ScheduledAction = {
    id,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId,
    tenantId: options.tenantId,
    userId: options.userId,
    workflowId: options.workflowId,
    params: options.params || {},
    priority: options.priority || schedulerState.config.defaultPriority,
    scheduledAt,
    recurringPattern: options.recurringPattern,
    maxExecutions: options.maxExecutions,
    executionCount: 0,
    status: 'active',
    nextExecutionAt: scheduledAt,
    createdAt: now,
    updatedAt: now,
  };

  schedulerState.scheduledActions.set(id, scheduledAction);

  emitEvent({
    type: 'action_scheduled',
    actionId: id,
    data: { action: options.action, scheduledAt },
    timestamp: now,
  });

  return scheduledAction;
}

/**
 * Cancel a scheduled action
 */
export function cancelScheduledAction(actionId: string): boolean {
  const action = schedulerState.scheduledActions.get(actionId);
  if (!action) return false;

  action.status = 'cancelled';
  action.updatedAt = new Date();
  schedulerState.scheduledActions.set(actionId, action);

  emitEvent({
    type: 'action_cancelled',
    actionId,
    timestamp: new Date(),
  });

  return true;
}

/**
 * Pause a scheduled action
 */
export function pauseScheduledAction(actionId: string): boolean {
  const action = schedulerState.scheduledActions.get(actionId);
  if (!action || action.status !== 'active') return false;

  action.status = 'paused';
  action.updatedAt = new Date();
  schedulerState.scheduledActions.set(actionId, action);

  return true;
}

/**
 * Resume a paused action
 */
export function resumeScheduledAction(actionId: string): boolean {
  const action = schedulerState.scheduledActions.get(actionId);
  if (!action || action.status !== 'paused') return false;

  action.status = 'active';
  action.updatedAt = new Date();
  schedulerState.scheduledActions.set(actionId, action);

  return true;
}

/**
 * Get a scheduled action by ID
 */
export function getScheduledAction(actionId: string): ScheduledAction | undefined {
  return schedulerState.scheduledActions.get(actionId);
}

/**
 * Get all scheduled actions for a tenant
 */
export function getScheduledActions(tenantId: string, filters?: {
  status?: ScheduledAction['status'];
  action?: AIWorkflowAction;
  entityType?: string;
}): ScheduledAction[] {
  const actions: ScheduledAction[] = [];

  schedulerState.scheduledActions.forEach(action => {
    if (action.tenantId !== tenantId) return;
    if (filters?.status && action.status !== filters.status) return;
    if (filters?.action && action.action !== filters.action) return;
    if (filters?.entityType && action.entityType !== filters.entityType) return;
    actions.push(action);
  });

  return actions.sort((a, b) =>
    (a.nextExecutionAt?.getTime() || 0) - (b.nextExecutionAt?.getTime() || 0)
  );
}

/**
 * Get actions due for execution
 */
export function getDueActions(limit: number = 10): ScheduledAction[] {
  const now = new Date();
  const dueActions: ScheduledAction[] = [];

  schedulerState.scheduledActions.forEach(action => {
    if (action.status !== 'active') return;
    if (!action.nextExecutionAt) return;
    if (action.nextExecutionAt > now) return;

    // Check max executions
    if (action.maxExecutions && action.executionCount >= action.maxExecutions) {
      action.status = 'completed';
      action.updatedAt = now;
      return;
    }

    dueActions.push(action);
  });

  // Sort by priority and scheduled time
  const priorityOrder: Record<AIQueuePriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  return dueActions
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.nextExecutionAt?.getTime() || 0) - (b.nextExecutionAt?.getTime() || 0);
    })
    .slice(0, limit);
}

/**
 * Mark an action as executed and calculate next execution
 */
export function markActionExecuted(
  actionId: string,
  success: boolean,
  result?: unknown
): void {
  const action = schedulerState.scheduledActions.get(actionId);
  if (!action) return;

  const now = new Date();
  action.executionCount++;
  action.lastExecutedAt = now;
  action.updatedAt = now;

  // Calculate next execution for recurring actions
  if (action.recurringPattern) {
    const nextExecution = calculateNextExecution(action.recurringPattern, now);

    if (nextExecution) {
      // Check if max executions reached
      if (action.maxExecutions && action.executionCount >= action.maxExecutions) {
        action.status = 'completed';
        action.nextExecutionAt = undefined;
      } else {
        action.nextExecutionAt = nextExecution;
      }
    } else {
      // One-time action completed
      action.status = 'completed';
      action.nextExecutionAt = undefined;
    }
  } else {
    // Non-recurring action completed
    action.status = 'completed';
    action.nextExecutionAt = undefined;
  }

  schedulerState.scheduledActions.set(actionId, action);

  emitEvent({
    type: success ? 'action_executed' : 'action_failed',
    actionId,
    data: result,
    timestamp: now,
  });
}

// ============================================
// Scheduler Lifecycle
// ============================================

/**
 * Start the scheduler
 */
export function startScheduler(config?: Partial<SchedulerConfig>): void {
  if (schedulerState.isRunning) return;

  if (config) {
    schedulerState.config = { ...schedulerState.config, ...config };
  }

  schedulerState.isRunning = true;

  emitEvent({
    type: 'scheduler_started',
    timestamp: new Date(),
  });

  // Note: In production, this would trigger actual execution
  // For now, we just mark the scheduler as running
  console.log('[AI Scheduler] Started with config:', schedulerState.config);
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (!schedulerState.isRunning) return;

  if (schedulerState.intervalId) {
    clearInterval(schedulerState.intervalId);
    schedulerState.intervalId = null;
  }

  schedulerState.isRunning = false;

  emitEvent({
    type: 'scheduler_stopped',
    timestamp: new Date(),
  });

  console.log('[AI Scheduler] Stopped');
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return schedulerState.isRunning;
}

/**
 * Subscribe to scheduler events
 */
export function subscribeToScheduler(listener: (event: SchedulerEvent) => void): () => void {
  schedulerState.listeners.add(listener);
  return () => {
    schedulerState.listeners.delete(listener);
  };
}

/**
 * Get scheduler statistics
 */
export function getSchedulerStats(): {
  isRunning: boolean;
  totalScheduled: number;
  activeCount: number;
  pausedCount: number;
  completedCount: number;
  cancelledCount: number;
  dueCount: number;
} {
  let activeCount = 0;
  let pausedCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  schedulerState.scheduledActions.forEach(action => {
    switch (action.status) {
      case 'active': activeCount++; break;
      case 'paused': pausedCount++; break;
      case 'completed': completedCount++; break;
      case 'cancelled': cancelledCount++; break;
    }
  });

  return {
    isRunning: schedulerState.isRunning,
    totalScheduled: schedulerState.scheduledActions.size,
    activeCount,
    pausedCount,
    completedCount,
    cancelledCount,
    dueCount: getDueActions().length,
  };
}

/**
 * Clear all completed/cancelled actions older than specified age
 */
export function cleanupOldActions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAgeMs);
  let removed = 0;

  schedulerState.scheduledActions.forEach((action, id) => {
    if (
      (action.status === 'completed' || action.status === 'cancelled') &&
      action.updatedAt < cutoff
    ) {
      schedulerState.scheduledActions.delete(id);
      removed++;
    }
  });

  return removed;
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Schedule multiple actions at once
 */
export function bulkScheduleActions(
  actions: Array<{
    action: AIWorkflowAction;
    entityType: string;
    entityId: string;
    tenantId: string;
    params?: AIActionParams;
    scheduledAt?: Date;
  }>
): ScheduledAction[] {
  return actions.map(opts => scheduleAIAction(opts));
}

/**
 * Cancel all scheduled actions for an entity
 */
export function cancelActionsForEntity(
  entityType: string,
  entityId: string,
  tenantId: string
): number {
  let cancelled = 0;

  schedulerState.scheduledActions.forEach((action, id) => {
    if (
      action.tenantId === tenantId &&
      action.entityType === entityType &&
      action.entityId === entityId &&
      action.status === 'active'
    ) {
      cancelScheduledAction(id);
      cancelled++;
    }
  });

  return cancelled;
}

/**
 * Reschedule an action
 */
export function rescheduleAction(actionId: string, newScheduledAt: Date): boolean {
  const action = schedulerState.scheduledActions.get(actionId);
  if (!action || action.status !== 'active') return false;

  action.nextExecutionAt = newScheduledAt;
  action.updatedAt = new Date();
  schedulerState.scheduledActions.set(actionId, action);

  return true;
}

// ============================================
// Convert to Queue Item
// ============================================

/**
 * Convert a scheduled action to a queue item for execution
 */
export function toQueueItem(scheduledAction: ScheduledAction): AIQueueItem {
  return {
    id: `queue_${scheduledAction.id}_${Date.now()}`,
    action: scheduledAction.action,
    entityType: scheduledAction.entityType,
    entityId: scheduledAction.entityId,
    tenantId: scheduledAction.tenantId,
    userId: scheduledAction.userId,
    workflowId: scheduledAction.workflowId,
    params: scheduledAction.params,
    priority: scheduledAction.priority,
    status: 'pending',
    retryCount: 0,
    maxRetries: schedulerState.config.maxRetries,
    scheduledAt: scheduledAction.nextExecutionAt?.toISOString(),
    createdAt: new Date().toISOString(),
  };
}
