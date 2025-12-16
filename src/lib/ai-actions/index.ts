// ============================================
// FASE 6.2 — AI Actions Module
// Export all AI action-related functionality
// ============================================

// Types
export type {
  AIActionParameterConfig,
  AIActionParams,
  AIActionResult,
  AIQueueItem,
  AIQueuePriority,
  AISuggestion,
  AISuggestionGroup,
  AIWorkflowAction,
  AIWorkflowAuditEntry,
  CombinedEventTrigger,
  CombinedWorkflowAction,
  AIEventTrigger,
} from './types';

export {
  AI_ACTION_PARAMETER_CONFIGS,
  AI_EVENT_TRIGGER_LABELS,
  AI_EVENT_TRIGGERS,
  AI_TRIGGER_GROUP,
  AI_WORKFLOW_ACTION_DESCRIPTIONS,
  AI_WORKFLOW_ACTION_ICONS,
  AI_WORKFLOW_ACTION_LABELS,
  AI_WORKFLOW_ACTIONS,
} from './types';

// Engine
export {
  checkRequiresApproval,
  executeAIAction,
  generateAISuggestions,
  getAIWorkflowAuditLog,
  logAIWorkflowAction,
  validateAIActionParams,
} from './engine';

// Scheduler
export type {
  RecurringPattern,
  ScheduledAction,
  SchedulerConfig,
} from './scheduler';

export {
  bulkScheduleActions,
  cancelActionsForEntity,
  cancelScheduledAction,
  cleanupOldActions,
  getDueActions,
  getScheduledAction,
  getScheduledActions,
  getSchedulerStats,
  isSchedulerRunning,
  pauseScheduledAction,
  rescheduleAction,
  resumeScheduledAction,
  scheduleAIAction,
  startScheduler,
  stopScheduler,
  subscribeToScheduler,
  toQueueItem,
} from './scheduler';

// Queue
export type {
  QueueConfig,
  QueueStats,
} from './queue';

export {
  cancelItemsForEntity,
  clearDLQ,
  clearOldItems,
  clearQueue,
  cleanupStaleItems,
  configureQueue,
  dequeue,
  enqueue,
  enqueueBatch,
  getDLQItems,
  getPendingItems,
  getQueueConfig,
  getQueueItem,
  getQueueItemsByTenant,
  getQueueStats,
  moveToDLQ,
  prioritizeItem,
  processQueue,
  requeueFromDLQ,
  retryItem,
  setProcessor,
  subscribeToQueue,
  updateItemPriority,
} from './queue';

// ============================================
// Convenience Functions
// ============================================

import { executeAIAction } from './engine';
import { enqueue, setProcessor } from './queue';

import type { AIQueueItem, AIWorkflowAction, AIActionParams } from './types';

/**
 * Initialize the AI Actions system
 * Sets up the queue processor to use the engine's executeAIAction
 */
export function initializeAIActions(): void {
  setProcessor(async (item: AIQueueItem) => {
    return executeAIAction(
      item.action,
      {
        tenantId: item.tenantId,
        entityType: item.entityType as 'lead' | 'opportunity' | 'customer',
        entityId: item.entityId,
        entityData: (item.params?.['entityData'] as Record<string, unknown>) ?? {},
        userId: item.userId,
        workflowId: item.workflowId,
      },
      item.params
    );
  });
}

/**
 * Queue an AI action for execution
 * Convenience wrapper that combines enqueue with proper typing
 */
export function queueAIAction(options: {
  action: AIWorkflowAction;
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}): AIQueueItem {
  return enqueue({
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId,
    tenantId: options.tenantId,
    userId: options.userId,
    workflowId: options.workflowId,
    params: options.params,
    priority: options.priority,
  });
}

/**
 * Execute an AI action immediately (bypass queue)
 * Use for high-priority or user-initiated actions
 */
export async function executeAIActionImmediate(options: {
  action: AIWorkflowAction;
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  entityData?: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
}) {
  return executeAIAction(
    options.action,
    {
      tenantId: options.tenantId,
      entityType: options.entityType,
      entityId: options.entityId,
      entityData: options.entityData ?? {},
      userId: options.userId,
      workflowId: options.workflowId,
    },
    options.params
  );
}

// ============================================
// React Query Hooks
// ============================================

export {
  // Query Keys
  aiActionsQueryKeys,
  // Suggestion Hooks
  useAISuggestions,
  useRefreshAISuggestions,
  useApplySuggestion,
  useOptimisticSuggestionUpdate,
  usePrefetchAISuggestions,
  // Action Execution Hooks
  useExecuteAIAction,
  useExecuteAIActionBatch,
  // Queue Hooks
  useQueueAIAction,
  useQueueItems,
  useQueueStats,
  useRetryQueueItem,
  useCancelQueueItems,
  useClearOldQueueItems,
  // Scheduler Hooks
  useScheduleAIAction,
  useScheduledActions,
  useSchedulerStats,
  useCancelScheduledAction,
  // Audit Log Hooks
  useAIWorkflowAuditLog,
  useRefreshAuditLog,
  // DLQ Hooks
  useDLQItems,
  // Status Hooks
  useAIActionsStatus,
  useAIActionsRealtime,
} from './hooks';
