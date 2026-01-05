/**
 * Kanban Enterprise API Module
 *
 * Centralized API client for all Kanban board operations including:
 * - Board state management
 * - Move operations with validation
 * - Undo/Redo functionality
 * - Configuration management
 * - History & audit trails
 * - Analytics & metrics
 *
 * @version 1.0.0
 * @module lib/kanban/api
 */

import { apiClient } from '@/lib/api/api-client';

// ============================================
// Types
// ============================================

export type KanbanEntityType = 'lead' | 'opportunity' | 'task' | 'customer';

export interface WIPStatus {
  current: number;
  softLimit: number;
  hardLimit: number;
  level: 'normal' | 'warning' | 'critical' | 'blocked';
  percentage: number;
}

export interface KanbanStage {
  id: string;
  label: string;
  color: string;
  order: number;
  wipStatus: WIPStatus;
  items: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export interface KanbanConfig {
  wipLimits: Record<string, { softLimit: number; hardLimit: number }>;
  collapsedColumns: string[];
  stageOrder: string[];
  transitions?: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'>;
  version: number;
}

export interface KanbanBoardData {
  entityType: KanbanEntityType;
  stages: KanbanStage[];
  config: KanbanConfig;
  lastUpdated: string;
}

export interface KanbanMoveRequest {
  entityType: KanbanEntityType;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  newPosition?: number;
  reason?: string;
  forceWipOverride?: boolean;
  metadata?: {
    source?: 'drag' | 'keyboard' | 'dialog' | 'api';
  };
}

export interface KanbanMoveResult {
  moveId: string;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  newPosition: number;
  timestamp: string;
  validation: {
    type: 'allowed' | 'warning' | 'forced';
    message?: string;
  };
  undoAvailable: boolean;
  wipStatus?: {
    stageId: string;
    current: number;
    limit: number;
    level: string;
  };
}

export interface KanbanHistoryEntry {
  id: string;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  userId: string;
  userName?: string;
  reason?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface KanbanMetrics {
  entityType: KanbanEntityType;
  period: string;
  stageMetrics: Array<{
    stageId: string;
    avgTimeInStage: number; // hours
    throughput: number;
    wipUtilization: number;
    entryCount: number;
    exitCount: number;
  }>;
  overallMetrics: {
    totalMoves: number;
    avgCycleTime: number;
    undoRate: number;
    wipViolations: number;
  };
}

// ============================================
// API Functions
// ============================================

/**
 * Get full Kanban board state for an entity type
 */
export async function getKanbanBoard(
  entityType: KanbanEntityType,
  options: { pageSize?: number } = {}
): Promise<KanbanBoardData> {
  const params = new URLSearchParams();
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const response = await apiClient.get<{ success: boolean; data: KanbanBoardData }>(
    `/kanban/board/${entityType}?${params.toString()}`
  );

  if (!response.success) {
    throw new Error('Failed to load Kanban board');
  }

  return response.data;
}

/**
 * Get paginated items for a specific stage
 */
export async function getKanbanStageItems(
  entityType: KanbanEntityType,
  stageId: string,
  options: { page?: number; pageSize?: number; cursor?: string } = {}
): Promise<{ items: unknown[]; pagination: { page: number; total: number; hasMore: boolean } }> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));
  if (options.cursor) params.set('cursor', options.cursor);

  const response = await apiClient.get<{
    success: boolean;
    data: { items: unknown[]; pagination: { page: number; total: number; hasMore: boolean } };
  }>(`/kanban/stage/${entityType}/${stageId}?${params.toString()}`);

  if (!response.success) {
    throw new Error(`Failed to load stage items for ${stageId}`);
  }

  return response.data;
}

/**
 * Move an item on the Kanban board
 */
export async function moveKanbanItem(request: KanbanMoveRequest): Promise<KanbanMoveResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: KanbanMoveResult;
    error?: { code: string; message: string };
  }>('/kanban/move', request);

  if (!response.success) {
    const errorMessage = response.error?.message || 'Failed to move item';
    const error = new Error(errorMessage);
    (error as Error & { code?: string }).code = response.error?.code;
    throw error;
  }

  return response.data;
}

/**
 * Undo the last move operation
 */
export async function undoKanbanMove(
  entityType: KanbanEntityType,
  moveId?: string
): Promise<KanbanMoveResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: KanbanMoveResult;
    error?: { code: string; message: string };
  }>('/kanban/undo', { entityType, moveId });

  if (!response.success) {
    throw new Error(response.error?.message || 'No moves to undo');
  }

  return response.data;
}

/**
 * Redo a previously undone move
 */
export async function redoKanbanMove(
  entityType: KanbanEntityType,
  moveId?: string
): Promise<KanbanMoveResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: KanbanMoveResult;
    error?: { code: string; message: string };
  }>('/kanban/redo', { entityType, moveId });

  if (!response.success) {
    throw new Error(response.error?.message || 'No moves to redo');
  }

  return response.data;
}

/**
 * Get Kanban configuration for an entity type
 */
export async function getKanbanConfig(entityType: KanbanEntityType): Promise<KanbanConfig> {
  const response = await apiClient.get<{ success: boolean; data: KanbanConfig }>(
    `/kanban/config/${entityType}`
  );

  if (!response.success) {
    throw new Error('Failed to load Kanban configuration');
  }

  return response.data;
}

/**
 * Update Kanban configuration
 */
export async function updateKanbanConfig(
  entityType: KanbanEntityType,
  updates: Partial<Omit<KanbanConfig, 'version'>>,
  expectedVersion: number
): Promise<KanbanConfig> {
  const response = await apiClient.put<{
    success: boolean;
    data: KanbanConfig;
    error?: { code: string; message: string };
  }>(`/kanban/config/${entityType}`, { ...updates, version: expectedVersion });

  if (!response.success) {
    const errorMessage = response.error?.message || 'Failed to update configuration';
    const error = new Error(errorMessage);
    (error as Error & { code?: string }).code = response.error?.code;
    throw error;
  }

  return response.data;
}

/**
 * Get move history for a specific item
 */
export async function getKanbanItemHistory(
  entityType: KanbanEntityType,
  entityId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ moves: KanbanHistoryEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));

  const response = await apiClient.get<{
    success: boolean;
    data: { moves: KanbanHistoryEntry[]; total: number };
  }>(`/kanban/history/${entityType}/${entityId}?${params.toString()}`);

  if (!response.success) {
    throw new Error('Failed to load item history');
  }

  return response.data;
}

/**
 * Get board-level move history
 */
export async function getKanbanBoardHistory(
  entityType: KanbanEntityType,
  options: { limit?: number; offset?: number; startDate?: string; endDate?: string } = {}
): Promise<{ moves: KanbanHistoryEntry[]; total: number }> {
  const params = new URLSearchParams();
  if (options.limit) params.set('limit', String(options.limit));
  if (options.offset) params.set('offset', String(options.offset));
  if (options.startDate) params.set('startDate', options.startDate);
  if (options.endDate) params.set('endDate', options.endDate);

  const response = await apiClient.get<{
    success: boolean;
    data: { moves: KanbanHistoryEntry[]; total: number };
  }>(`/kanban/history/${entityType}?${params.toString()}`);

  if (!response.success) {
    throw new Error('Failed to load board history');
  }

  return response.data;
}

/**
 * Acquire a lock on an item for editing
 */
export async function acquireKanbanLock(
  entityType: KanbanEntityType,
  entityId: string,
  ttlSeconds = 30
): Promise<{ lockId: string; expiresAt: string }> {
  const response = await apiClient.post<{
    success: boolean;
    data: { lockId: string; expiresAt: string };
    error?: { code: string; message: string };
  }>(`/kanban/lock/${entityType}/${entityId}`, { ttlSeconds });

  if (!response.success) {
    const error = new Error(response.error?.message || 'Failed to acquire lock');
    (error as Error & { code?: string }).code = response.error?.code;
    throw error;
  }

  return response.data;
}

/**
 * Release a lock on an item
 */
export async function releaseKanbanLock(
  entityType: KanbanEntityType,
  entityId: string
): Promise<void> {
  const response = await apiClient.delete<{ success: boolean }>(
    `/kanban/lock/${entityType}/${entityId}`
  );

  if (!response.success) {
    throw new Error('Failed to release lock');
  }
}

/**
 * Get Kanban analytics and metrics
 */
export async function getKanbanMetrics(
  entityType: KanbanEntityType,
  options: {
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    stageIds?: string[];
  }
): Promise<KanbanMetrics> {
  const params = new URLSearchParams();
  params.set('periodType', options.periodType);
  params.set('startDate', options.startDate);
  params.set('endDate', options.endDate);
  if (options.stageIds) params.set('stageIds', options.stageIds.join(','));

  const response = await apiClient.get<{ success: boolean; data: KanbanMetrics }>(
    `/kanban/metrics/${entityType}?${params.toString()}`
  );

  if (!response.success) {
    throw new Error('Failed to load Kanban metrics');
  }

  return response.data;
}

// ============================================
// Query Keys
// ============================================

export const kanbanKeys = {
  all: ['kanban'] as const,
  board: (entityType: KanbanEntityType) => [...kanbanKeys.all, 'board', entityType] as const,
  stage: (entityType: KanbanEntityType, stageId: string) =>
    [...kanbanKeys.all, 'stage', entityType, stageId] as const,
  config: (entityType: KanbanEntityType) => [...kanbanKeys.all, 'config', entityType] as const,
  history: (entityType: KanbanEntityType, entityId?: string) =>
    entityId
      ? ([...kanbanKeys.all, 'history', entityType, entityId] as const)
      : ([...kanbanKeys.all, 'history', entityType] as const),
  metrics: (entityType: KanbanEntityType) => [...kanbanKeys.all, 'metrics', entityType] as const,
};
