// ============================================
// FASE 6.2 — AI Actions Queue
// Internal queue for AI action execution with retries and fallbacks
// ============================================

import type { AIActionParams, AIActionResult, AIQueueItem, AIQueuePriority, AIWorkflowAction } from './types';

// ============================================
// Types
// ============================================

export interface QueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  retryDelayMs: number;
  retryBackoffMultiplier: number;
  maxRetryDelayMs: number;
  processingTimeoutMs: number;
  staleItemTimeoutMs: number;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  totalProcessed: number;
  averageProcessingTimeMs: number;
  successRate: number;
}

export interface QueueEvent {
  type: 'item_added' | 'item_started' | 'item_completed' | 'item_failed' | 'item_cancelled' | 'item_retrying' | 'queue_cleared';
  itemId?: string;
  data?: unknown;
  timestamp: Date;
}

type QueueProcessor = (item: AIQueueItem) => Promise<AIActionResult>;

// ============================================
// Default Configuration
// ============================================

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrent: 3,
  maxRetries: 3,
  retryDelayMs: 2000,
  retryBackoffMultiplier: 2,
  maxRetryDelayMs: 30000,
  processingTimeoutMs: 60000,
  staleItemTimeoutMs: 300000, // 5 minutes
};

// ============================================
// Queue State
// ============================================

interface QueueState {
  items: Map<string, AIQueueItem>;
  processing: Set<string>;
  config: QueueConfig;
  processor: QueueProcessor | null;
  isProcessing: boolean;
  listeners: Set<(event: QueueEvent) => void>;
  stats: {
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    totalProcessingTimeMs: number;
  };
}

const queueState: QueueState = {
  items: new Map(),
  processing: new Set(),
  config: DEFAULT_QUEUE_CONFIG,
  processor: null,
  isProcessing: false,
  listeners: new Set(),
  stats: {
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    totalProcessingTimeMs: 0,
  },
};

// ============================================
// Utility Functions
// ============================================

function generateQueueItemId(): string {
  return `qi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function emitEvent(event: QueueEvent): void {
  queueState.listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[AI Queue] Error in event listener:', error);
    }
  });
}

function calculateRetryDelay(retryCount: number): number {
  const { retryDelayMs, retryBackoffMultiplier, maxRetryDelayMs } = queueState.config;
  const delay = retryDelayMs * Math.pow(retryBackoffMultiplier, retryCount);
  return Math.min(delay, maxRetryDelayMs);
}

function getPriorityValue(priority: AIQueuePriority): number {
  const priorityMap: Record<AIQueuePriority, number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };
  return priorityMap[priority];
}

// ============================================
// Queue Operations
// ============================================

/**
 * Add an item to the queue
 */
export function enqueue(options: {
  action: AIWorkflowAction;
  entityType: string;
  entityId: string;
  tenantId: string;
  userId?: string;
  workflowId?: string;
  params?: AIActionParams;
  priority?: AIQueuePriority;
  scheduledAt?: string;
}): AIQueueItem {
  const id = generateQueueItemId();
  const now = new Date().toISOString();

  const item: AIQueueItem = {
    id,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId,
    tenantId: options.tenantId,
    userId: options.userId,
    workflowId: options.workflowId,
    params: options.params || {},
    priority: options.priority || 'normal',
    status: 'pending',
    retryCount: 0,
    maxRetries: queueState.config.maxRetries,
    scheduledAt: options.scheduledAt,
    createdAt: now,
  };

  queueState.items.set(id, item);

  emitEvent({
    type: 'item_added',
    itemId: id,
    data: { action: options.action, priority: item.priority },
    timestamp: new Date(),
  });

  // Trigger processing if not already running
  void processQueue();

  return item;
}

/**
 * Add multiple items to the queue
 */
export function enqueueBatch(
  items: Array<{
    action: AIWorkflowAction;
    entityType: string;
    entityId: string;
    tenantId: string;
    params?: AIActionParams;
    priority?: AIQueuePriority;
  }>
): AIQueueItem[] {
  return items.map(item => enqueue(item));
}

/**
 * Remove an item from the queue
 */
export function dequeue(itemId: string): AIQueueItem | undefined {
  const item = queueState.items.get(itemId);
  if (item && item.status === 'pending') {
    item.status = 'cancelled';
    queueState.items.set(itemId, item);

    emitEvent({
      type: 'item_cancelled',
      itemId,
      timestamp: new Date(),
    });
  }
  return item;
}

/**
 * Get an item by ID
 */
export function getQueueItem(itemId: string): AIQueueItem | undefined {
  return queueState.items.get(itemId);
}

/**
 * Get all pending items sorted by priority and creation time
 */
export function getPendingItems(): AIQueueItem[] {
  const pending: AIQueueItem[] = [];
  const now = Date.now();

  queueState.items.forEach(item => {
    if (item.status !== 'pending') return;

    // Check if scheduled for future
    if (item.scheduledAt && new Date(item.scheduledAt).getTime() > now) return;

    pending.push(item);
  });

  return pending.sort((a, b) => {
    // Sort by priority first
    const priorityDiff = getPriorityValue(a.priority) - getPriorityValue(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    // Then by creation time
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * Get items by tenant
 */
export function getQueueItemsByTenant(
  tenantId: string,
  options?: {
    status?: AIQueueItem['status'];
    action?: AIWorkflowAction;
    limit?: number;
  }
): AIQueueItem[] {
  const items: AIQueueItem[] = [];

  queueState.items.forEach(item => {
    if (item.tenantId !== tenantId) return;
    if (options?.status && item.status !== options.status) return;
    if (options?.action && item.action !== options.action) return;
    items.push(item);
  });

  const sorted = items.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return options?.limit ? sorted.slice(0, options.limit) : sorted;
}

// ============================================
// Queue Processing
// ============================================

/**
 * Set the queue processor function
 */
export function setProcessor(processor: QueueProcessor): void {
  queueState.processor = processor;
}

/**
 * Process the queue
 */
export async function processQueue(): Promise<void> {
  if (queueState.isProcessing) return;
  if (!queueState.processor) {
    console.warn('[AI Queue] No processor set');
    return;
  }

  queueState.isProcessing = true;

  try {
    while (true) {
      // Check concurrent limit
      if (queueState.processing.size >= queueState.config.maxConcurrent) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Get next item
      const pendingItems = getPendingItems();
      const nextItem = pendingItems.find(item => !queueState.processing.has(item.id));

      if (!nextItem) break;

      // Process item (don't await, allow concurrent processing)
      void processItem(nextItem);
    }
  } finally {
    queueState.isProcessing = false;
  }
}

/**
 * Process a single item
 */
async function processItem(item: AIQueueItem): Promise<void> {
  if (!queueState.processor) return;

  const startTime = Date.now();
  queueState.processing.add(item.id);

  // Update item status
  item.status = 'processing';
  item.startedAt = new Date().toISOString();
  queueState.items.set(item.id, item);

  emitEvent({
    type: 'item_started',
    itemId: item.id,
    timestamp: new Date(),
  });

  try {
    // Execute with timeout
    const result = await Promise.race([
      queueState.processor(item),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Processing timeout')), queueState.config.processingTimeoutMs)
      ),
    ]);

    // Success
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
    item.result = result;
    queueState.items.set(item.id, item);

    queueState.stats.totalProcessed++;
    queueState.stats.totalSuccessful++;
    queueState.stats.totalProcessingTimeMs += Date.now() - startTime;

    emitEvent({
      type: 'item_completed',
      itemId: item.id,
      data: result,
      timestamp: new Date(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if should retry
    if (item.retryCount < item.maxRetries) {
      item.retryCount++;
      item.status = 'pending';
      item.error = errorMessage;

      // Schedule retry with backoff
      const delay = calculateRetryDelay(item.retryCount);
      item.scheduledAt = new Date(Date.now() + delay).toISOString();

      queueState.items.set(item.id, item);

      emitEvent({
        type: 'item_retrying',
        itemId: item.id,
        data: { retryCount: item.retryCount, delay, error: errorMessage },
        timestamp: new Date(),
      });

      // Schedule next processing
      setTimeout(() => void processQueue(), delay);
    } else {
      // Max retries exceeded
      item.status = 'failed';
      item.completedAt = new Date().toISOString();
      item.error = errorMessage;
      queueState.items.set(item.id, item);

      queueState.stats.totalProcessed++;
      queueState.stats.totalFailed++;
      queueState.stats.totalProcessingTimeMs += Date.now() - startTime;

      emitEvent({
        type: 'item_failed',
        itemId: item.id,
        data: { error: errorMessage, retryCount: item.retryCount },
        timestamp: new Date(),
      });
    }
  } finally {
    queueState.processing.delete(item.id);

    // Continue processing
    void processQueue();
  }
}

/**
 * Retry a failed item
 */
export function retryItem(itemId: string): boolean {
  const item = queueState.items.get(itemId);
  if (!item || item.status !== 'failed') return false;

  item.status = 'pending';
  item.retryCount = 0;
  item.error = undefined;
  item.scheduledAt = undefined;
  queueState.items.set(itemId, item);

  void processQueue();
  return true;
}

/**
 * Cancel all pending items for an entity
 */
export function cancelItemsForEntity(
  entityType: string,
  entityId: string,
  tenantId: string
): number {
  let cancelled = 0;

  queueState.items.forEach((item, id) => {
    if (
      item.tenantId === tenantId &&
      item.entityType === entityType &&
      item.entityId === entityId &&
      item.status === 'pending'
    ) {
      dequeue(id);
      cancelled++;
    }
  });

  return cancelled;
}

// ============================================
// Queue Configuration & Stats
// ============================================

/**
 * Configure the queue
 */
export function configureQueue(config: Partial<QueueConfig>): void {
  queueState.config = { ...queueState.config, ...config };
}

/**
 * Get queue configuration
 */
export function getQueueConfig(): QueueConfig {
  return { ...queueState.config };
}

/**
 * Get queue statistics
 */
export function getQueueStats(): QueueStats {
  let pending = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;
  let cancelled = 0;

  queueState.items.forEach(item => {
    switch (item.status) {
      case 'pending': pending++; break;
      case 'processing': processing++; break;
      case 'completed': completed++; break;
      case 'failed': failed++; break;
      case 'cancelled': cancelled++; break;
    }
  });

  const { totalProcessed, totalSuccessful, totalProcessingTimeMs } = queueState.stats;

  return {
    pending,
    processing,
    completed,
    failed,
    cancelled,
    totalProcessed,
    averageProcessingTimeMs: totalProcessed > 0 ? totalProcessingTimeMs / totalProcessed : 0,
    successRate: totalProcessed > 0 ? (totalSuccessful / totalProcessed) * 100 : 0,
  };
}

/**
 * Subscribe to queue events
 */
export function subscribeToQueue(listener: (event: QueueEvent) => void): () => void {
  queueState.listeners.add(listener);
  return () => {
    queueState.listeners.delete(listener);
  };
}

// ============================================
// Cleanup Operations
// ============================================

/**
 * Clear completed and failed items older than specified age
 */
export function clearOldItems(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
  const cutoff = new Date(Date.now() - maxAgeMs);
  let cleared = 0;

  queueState.items.forEach((item, id) => {
    if (
      (item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') &&
      item.completedAt &&
      new Date(item.completedAt) < cutoff
    ) {
      queueState.items.delete(id);
      cleared++;
    }
  });

  return cleared;
}

/**
 * Clear all items (use with caution)
 */
export function clearQueue(): void {
  queueState.items.clear();
  queueState.processing.clear();

  emitEvent({
    type: 'queue_cleared',
    timestamp: new Date(),
  });
}

/**
 * Clean up stale processing items
 */
export function cleanupStaleItems(): number {
  const cutoff = new Date(Date.now() - queueState.config.staleItemTimeoutMs);
  let cleaned = 0;

  queueState.items.forEach((item, id) => {
    if (
      item.status === 'processing' &&
      item.startedAt &&
      new Date(item.startedAt) < cutoff
    ) {
      // Reset stale items to pending for retry
      item.status = 'pending';
      item.startedAt = undefined;
      item.retryCount++;
      queueState.items.set(id, item);
      queueState.processing.delete(id);
      cleaned++;
    }
  });

  return cleaned;
}

// ============================================
// Priority Management
// ============================================

/**
 * Change item priority
 */
export function updateItemPriority(itemId: string, priority: AIQueuePriority): boolean {
  const item = queueState.items.get(itemId);
  if (!item || item.status !== 'pending') return false;

  item.priority = priority;
  queueState.items.set(itemId, item);
  return true;
}

/**
 * Move item to front of queue (set to critical priority)
 */
export function prioritizeItem(itemId: string): boolean {
  return updateItemPriority(itemId, 'critical');
}

// ============================================
// Dead Letter Queue (DLQ)
// ============================================

interface DLQItem extends AIQueueItem {
  failureReason: string;
  originalCreatedAt: string;
  movedToDLQAt: string;
}

const dlq: Map<string, DLQItem> = new Map();

/**
 * Move failed item to DLQ
 */
export function moveToDLQ(itemId: string): boolean {
  const item = queueState.items.get(itemId);
  if (!item || item.status !== 'failed') return false;

  const dlqItem: DLQItem = {
    ...item,
    failureReason: item.error || 'Unknown error',
    originalCreatedAt: item.createdAt,
    movedToDLQAt: new Date().toISOString(),
  };

  dlq.set(itemId, dlqItem);
  queueState.items.delete(itemId);

  return true;
}

/**
 * Get DLQ items
 */
export function getDLQItems(tenantId?: string): DLQItem[] {
  const items: DLQItem[] = [];
  dlq.forEach(item => {
    if (!tenantId || item.tenantId === tenantId) {
      items.push(item);
    }
  });
  return items;
}

/**
 * Requeue item from DLQ
 */
export function requeueFromDLQ(itemId: string): AIQueueItem | undefined {
  const dlqItem = dlq.get(itemId);
  if (!dlqItem) return undefined;

  dlq.delete(itemId);

  return enqueue({
    action: dlqItem.action,
    entityType: dlqItem.entityType,
    entityId: dlqItem.entityId,
    tenantId: dlqItem.tenantId,
    userId: dlqItem.userId,
    workflowId: dlqItem.workflowId,
    params: dlqItem.params,
    priority: dlqItem.priority,
  });
}

/**
 * Clear DLQ
 */
export function clearDLQ(tenantId?: string): number {
  if (!tenantId) {
    const count = dlq.size;
    dlq.clear();
    return count;
  }

  let cleared = 0;
  dlq.forEach((item, id) => {
    if (item.tenantId === tenantId) {
      dlq.delete(id);
      cleared++;
    }
  });
  return cleared;
}
