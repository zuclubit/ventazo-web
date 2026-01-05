/**
 * Kanban Enterprise Service
 *
 * Core service for Kanban board operations including:
 * - Board state management
 * - Move operations with validation
 * - Undo/Redo functionality
 * - WIP limit enforcement
 * - Real-time collaboration support
 *
 * @version 1.0.0
 * @module infrastructure/kanban
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, desc, sql, isNull, gt, lt, between } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { v4 as uuid } from 'uuid';
import * as schema from '../database/schema';
import {
  kanbanConfigs,
  kanbanMoves,
  kanbanSnapshots,
  kanbanMetrics,
  kanbanLocks,
  leads,
  opportunities,
  customers,
  tasks,
  outboxEvents,
  activityLogs,
  type KanbanConfigRow,
  type KanbanMoveRow,
  type NewKanbanMoveRow,
} from '../database/schema';

// ============================================
// Types
// ============================================

export type KanbanEntityType = 'lead' | 'opportunity' | 'task' | 'customer';

export interface KanbanMoveRequest {
  entityType: KanbanEntityType;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  newPosition?: number;
  reason?: string;
  forceWipOverride?: boolean;
  metadata?: {
    source?: 'drag' | 'keyboard' | 'dialog' | 'api' | 'automation';
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface KanbanMoveResult {
  moveId: string;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  newPosition: number;
  timestamp: Date;
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

export interface KanbanBoardData {
  entityType: KanbanEntityType;
  stages: Array<{
    id: string;
    label: string;
    color: string;
    order: number;
    wipStatus: {
      current: number;
      softLimit: number;
      hardLimit: number;
      level: 'normal' | 'warning' | 'critical' | 'blocked';
      percentage: number;
    };
    items: Array<Record<string, unknown>>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    };
  }>;
  config: {
    wipLimits: Record<string, { softLimit: number; hardLimit: number }>;
    collapsedColumns: string[];
    stageOrder: string[];
    version: number;
  };
  permissions: {
    canMove: boolean;
    canConfigureWip: boolean;
    canForceWip: boolean;
    canUndo: boolean;
    moveableStages: string[];
  };
  metadata: {
    lastUpdated: Date;
    activeUsers: number;
    undoAvailable: boolean;
    redoAvailable: boolean;
  };
}

export interface WIPStatus {
  current: number;
  softLimit: number;
  hardLimit: number;
  level: 'normal' | 'warning' | 'critical' | 'blocked';
  percentage: number;
}

export interface TransitionValidation {
  type: 'allowed' | 'warning' | 'requires_data' | 'blocked';
  reason?: string;
  reasonEs?: string;
}

export interface KanbanMetricsData {
  entityType: KanbanEntityType;
  stageId: string;
  period: {
    type: 'hourly' | 'daily' | 'weekly';
    start: Date;
    end: Date;
  };
  metrics: {
    avgLeadTimeSeconds: number;
    medianLeadTimeSeconds: number;
    p90LeadTimeSeconds: number;
    itemsEntered: number;
    itemsExited: number;
    throughput: number;
    peakWipCount: number;
    avgWipCount: number;
    wipBlockedCount: number;
    wipWarningCount: number;
    undoCount: number;
    redoCount: number;
    bottleneckScore: number;
  };
}

export interface KanbanMoveRequestWithIdempotency extends KanbanMoveRequest {
  idempotencyKey?: string;
}

// ============================================
// Default Stage Configurations
// ============================================

const DEFAULT_LEAD_STAGES = [
  { id: 'new', label: 'Nuevo', color: '#64748b', order: 0 },
  { id: 'contacted', label: 'Contactado', color: '#3b82f6', order: 1 },
  { id: 'qualified', label: 'Calificado', color: '#8b5cf6', order: 2 },
  { id: 'proposal', label: 'Propuesta', color: '#f59e0b', order: 3 },
  { id: 'negotiation', label: 'Negociación', color: '#ec4899', order: 4 },
  { id: 'won', label: 'Ganado', color: '#10b981', order: 5 },
  { id: 'lost', label: 'Perdido', color: '#ef4444', order: 6 },
];

const DEFAULT_OPPORTUNITY_STAGES = [
  { id: 'discovery', label: 'Descubrimiento', color: '#64748b', order: 0 },
  { id: 'qualification', label: 'Calificación', color: '#3b82f6', order: 1 },
  { id: 'proposal', label: 'Propuesta', color: '#8b5cf6', order: 2 },
  { id: 'negotiation', label: 'Negociación', color: '#f59e0b', order: 3 },
  { id: 'closed_won', label: 'Cerrado Ganado', color: '#10b981', order: 4 },
  { id: 'closed_lost', label: 'Cerrado Perdido', color: '#ef4444', order: 5 },
];

const DEFAULT_TASK_STAGES = [
  { id: 'backlog', label: 'Backlog', color: '#64748b', order: 0 },
  { id: 'todo', label: 'Por Hacer', color: '#3b82f6', order: 1 },
  { id: 'in_progress', label: 'En Progreso', color: '#f59e0b', order: 2 },
  { id: 'review', label: 'Revisión', color: '#8b5cf6', order: 3 },
  { id: 'done', label: 'Completado', color: '#10b981', order: 4 },
];

const DEFAULT_CUSTOMER_STAGES = [
  { id: 'onboarding', label: 'Onboarding', color: '#3b82f6', order: 0 },
  { id: 'active', label: 'Activo', color: '#10b981', order: 1 },
  { id: 'at_risk', label: 'En Riesgo', color: '#f59e0b', order: 2 },
  { id: 'churned', label: 'Perdido', color: '#ef4444', order: 3 },
];

const DEFAULT_WIP_LIMITS: Record<KanbanEntityType, Record<string, { softLimit: number; hardLimit: number; warningThreshold: number }>> = {
  lead: {
    new: { softLimit: 20, hardLimit: 30, warningThreshold: 15 },
    contacted: { softLimit: 15, hardLimit: 25, warningThreshold: 12 },
    qualified: { softLimit: 10, hardLimit: 20, warningThreshold: 8 },
    proposal: { softLimit: 8, hardLimit: 15, warningThreshold: 6 },
    negotiation: { softLimit: 5, hardLimit: 10, warningThreshold: 4 },
  },
  opportunity: {
    discovery: { softLimit: 15, hardLimit: 25, warningThreshold: 12 },
    qualification: { softLimit: 10, hardLimit: 20, warningThreshold: 8 },
    proposal: { softLimit: 8, hardLimit: 15, warningThreshold: 6 },
    negotiation: { softLimit: 5, hardLimit: 10, warningThreshold: 4 },
  },
  task: {
    in_progress: { softLimit: 3, hardLimit: 5, warningThreshold: 2 },
    review: { softLimit: 5, hardLimit: 8, warningThreshold: 4 },
  },
  customer: {
    onboarding: { softLimit: 10, hardLimit: 20, warningThreshold: 8 },
    at_risk: { softLimit: 5, hardLimit: 10, warningThreshold: 4 },
  },
};

// ============================================
// Kanban Service
// ============================================

@injectable()
export class KanbanService {
  constructor(
    @inject('Database') private db: NodePgDatabase<typeof schema>
  ) {}

  // ============================================
  // Board Operations
  // ============================================

  async getBoard(
    tenantId: string,
    entityType: KanbanEntityType,
    userId: string,
    options: {
      pageSize?: number;
      stageFilters?: string[];
    } = {}
  ): Promise<KanbanBoardData> {
    const { pageSize = 50 } = options;

    // Get or create config
    const config = await this.getOrCreateConfig(tenantId, entityType);

    // Get stages for this entity type
    const stages = this.getStagesForEntity(entityType);

    // Get items grouped by stage
    const stageData = await Promise.all(
      stages.map(async (stage) => {
        const { items, total } = await this.getStageItems(
          tenantId,
          entityType,
          stage.id,
          pageSize
        );

        const wipLimit = config.wipLimits[stage.id] || { softLimit: 999, hardLimit: 999 };
        const wipStatus = this.calculateWIPStatus(total, wipLimit);

        return {
          id: stage.id,
          label: stage.label,
          color: stage.color,
          order: stage.order,
          wipStatus,
          items,
          pagination: {
            page: 1,
            pageSize,
            total,
            hasMore: total > pageSize,
          },
        };
      })
    );

    // Check undo availability
    const lastMove = await this.getLastMoveByUser(tenantId, entityType, userId);
    const undoAvailable = !!lastMove && !lastMove.undoneAt;

    // Check redo availability
    const lastUndo = await this.getLastUndoByUser(tenantId, entityType, userId);
    const redoAvailable = !!lastUndo;

    // Get active users count
    const activeUsers = await this.getActiveUsersCount(tenantId, entityType);

    return {
      entityType,
      stages: stageData,
      config: {
        wipLimits: config.wipLimits,
        collapsedColumns: config.collapsedColumns,
        stageOrder: config.stageOrder,
        version: config.version,
      },
      permissions: {
        canMove: true, // Permission check delegated to route layer (RBAC middleware)
        canConfigureWip: true,
        canForceWip: true,
        canUndo: true,
        moveableStages: stages.map((s) => s.id),
      },
      metadata: {
        lastUpdated: new Date(),
        activeUsers,
        undoAvailable,
        redoAvailable,
      },
    };
  }

  async getStageItems(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string,
    limit: number,
    cursor?: string
  ): Promise<{ items: Array<Record<string, unknown>>; total: number; nextCursor?: string }> {
    const table = this.getTableForEntity(entityType);
    const stageColumn = this.getStageColumnForEntity(entityType);

    // Build where conditions
    const conditions = [
      eq(table.tenantId, tenantId),
      eq(table[stageColumn], stageId),
    ];

    if (cursor) {
      conditions.push(gt(table.id, cursor));
    }

    // Get items
    const items = await this.db
      .select()
      .from(table)
      .where(and(...conditions))
      .orderBy(table.createdAt)
      .limit(limit + 1);

    // Check if there are more items
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    // Get total count
    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(table)
      .where(and(
        eq(table.tenantId, tenantId),
        eq(table[stageColumn], stageId)
      ));

    return {
      items: items as Array<Record<string, unknown>>,
      total: countResult[0]?.count || 0,
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }

  // ============================================
  // Move Operations
  // ============================================

  async moveItem(
    tenantId: string,
    userId: string,
    request: KanbanMoveRequest
  ): Promise<KanbanMoveResult> {
    const { entityType, entityId, fromStageId, toStageId, reason, forceWipOverride, metadata } = request;

    // 1. Validate transition
    const transitionValidation = await this.validateTransition(
      tenantId,
      entityType,
      fromStageId,
      toStageId
    );

    if (transitionValidation.type === 'blocked') {
      throw new Error(`TRANSITION_BLOCKED: ${transitionValidation.reasonEs || transitionValidation.reason}`);
    }

    if (transitionValidation.type === 'requires_data' && !reason) {
      throw new Error('REASON_REQUIRED: Esta transición requiere una razón');
    }

    // 2. Check WIP limits
    const wipStatus = await this.getWIPStatus(tenantId, entityType, toStageId);

    if (wipStatus.level === 'blocked' && !forceWipOverride) {
      throw new Error(`WIP_LIMIT_EXCEEDED: Límite WIP alcanzado (${wipStatus.current}/${wipStatus.hardLimit})`);
    }

    // 3. Verify entity exists and is in expected stage
    const entity = await this.getEntity(entityType, entityId, tenantId);
    if (!entity) {
      throw new Error('ENTITY_NOT_FOUND: Entidad no encontrada');
    }

    const currentStage = this.getEntityStage(entity, entityType);
    if (currentStage !== fromStageId) {
      throw new Error(`CONFLICT: El elemento ha sido movido por otro usuario (esperado: ${fromStageId}, actual: ${currentStage})`);
    }

    // 4. Execute move in transaction
    const moveId = uuid();
    const now = new Date();

    await this.db.transaction(async (tx) => {
      // Update entity stage
      await this.updateEntityStage(tx, entityType, entityId, toStageId);

      // Record move
      await tx.insert(kanbanMoves).values({
        id: moveId,
        tenantId,
        entityType,
        entityId,
        fromStageId,
        toStageId,
        userId,
        reason,
        metadata: {
          ...metadata,
          validationType: forceWipOverride ? 'forced' : transitionValidation.type === 'warning' ? 'warning' : 'allowed',
          wipOverride: forceWipOverride,
        },
        createdAt: now,
      });

      // Create outbox event
      await tx.insert(outboxEvents).values({
        eventType: 'kanban.item.moved',
        eventData: {
          moveId,
          entityType,
          entityId,
          fromStageId,
          toStageId,
          userId,
          reason,
          timestamp: now.toISOString(),
        },
        tenantId,
        aggregateId: moveId,
      });

      // Create activity log
      await tx.insert(activityLogs).values({
        tenantId,
        userId,
        entityType,
        entityId,
        action: 'stage_changed',
        changes: {
          before: { stage: fromStageId },
          after: { stage: toStageId },
        },
        metadata: {
          moveId,
          source: metadata?.source || 'api',
          reason,
        },
      });
    });

    return {
      moveId,
      entityId,
      fromStageId,
      toStageId,
      newPosition: 0, // TODO: Implement position tracking
      timestamp: now,
      validation: {
        type: forceWipOverride ? 'forced' : transitionValidation.type === 'warning' ? 'warning' : 'allowed',
        message: transitionValidation.reasonEs,
      },
      undoAvailable: true,
      wipStatus: wipStatus.level !== 'normal' ? {
        stageId: toStageId,
        current: wipStatus.current + 1,
        limit: wipStatus.hardLimit,
        level: wipStatus.level,
      } : undefined,
    };
  }

  async undoMove(
    tenantId: string,
    userId: string,
    entityType: KanbanEntityType,
    moveId?: string
  ): Promise<{ undoMoveId: string; originalMove: KanbanMoveRow; restoredTo: { stageId: string; position: number } }> {
    // Get the move to undo
    let moveToUndo: KanbanMoveRow | undefined;

    if (moveId) {
      const result = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.id, moveId),
          eq(kanbanMoves.tenantId, tenantId),
          isNull(kanbanMoves.undoneAt)
        ))
        .limit(1);
      moveToUndo = result[0];
    } else {
      moveToUndo = await this.getLastMoveByUser(tenantId, entityType, userId);
    }

    if (!moveToUndo) {
      throw new Error('NO_UNDO_AVAILABLE: No hay movimientos para deshacer');
    }

    if (moveToUndo.undoneAt) {
      throw new Error('ALREADY_UNDONE: Este movimiento ya fue deshecho');
    }

    // Create reverse move
    const undoMoveId = uuid();
    const now = new Date();

    await this.db.transaction(async (tx) => {
      // Update entity stage back to original
      await this.updateEntityStage(tx, entityType as KanbanEntityType, moveToUndo!.entityId, moveToUndo!.fromStageId);

      // Mark original move as undone
      await tx
        .update(kanbanMoves)
        .set({
          undoneAt: now,
          undoneBy: userId,
        })
        .where(eq(kanbanMoves.id, moveToUndo!.id));

      // Record undo move
      await tx.insert(kanbanMoves).values({
        id: undoMoveId,
        tenantId,
        entityType: entityType,
        entityId: moveToUndo!.entityId,
        fromStageId: moveToUndo!.toStageId,
        toStageId: moveToUndo!.fromStageId,
        userId,
        reason: 'Undo',
        undoMoveId: moveToUndo!.id,
        metadata: {
          source: 'api',
          validationType: 'allowed',
        },
        createdAt: now,
      });

      // Create outbox event
      await tx.insert(outboxEvents).values({
        eventType: 'kanban.undo.performed',
        eventData: {
          undoMoveId,
          originalMoveId: moveToUndo!.id,
          entityType,
          entityId: moveToUndo!.entityId,
          userId,
          timestamp: now.toISOString(),
        },
        tenantId,
        aggregateId: undoMoveId,
      });
    });

    return {
      undoMoveId,
      originalMove: moveToUndo,
      restoredTo: {
        stageId: moveToUndo.fromStageId,
        position: moveToUndo.previousPosition || 0,
      },
    };
  }

  async redoMove(
    tenantId: string,
    userId: string,
    entityType: KanbanEntityType
  ): Promise<KanbanMoveResult> {
    // Find the last undone move
    const lastUndo = await this.getLastUndoByUser(tenantId, entityType, userId);

    if (!lastUndo) {
      throw new Error('NO_REDO_AVAILABLE: No hay movimientos para rehacer');
    }

    // Re-execute the original move
    return this.moveItem(tenantId, userId, {
      entityType,
      entityId: lastUndo.entityId,
      fromStageId: lastUndo.toStageId, // Undo put it here
      toStageId: lastUndo.fromStageId, // Original destination
      metadata: { source: 'api' },
    });
  }

  // ============================================
  // Configuration Operations
  // ============================================

  async getOrCreateConfig(
    tenantId: string,
    entityType: KanbanEntityType
  ): Promise<KanbanConfigRow> {
    const existing = await this.db
      .select()
      .from(kanbanConfigs)
      .where(and(
        eq(kanbanConfigs.tenantId, tenantId),
        eq(kanbanConfigs.entityType, entityType)
      ))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    // Create default config
    const stages = this.getStagesForEntity(entityType);
    const defaultWip = DEFAULT_WIP_LIMITS[entityType] || {};

    const [newConfig] = await this.db
      .insert(kanbanConfigs)
      .values({
        tenantId,
        entityType,
        wipLimits: defaultWip,
        stageOrder: stages.map((s) => s.id),
        collapsedColumns: [],
        version: 1,
      })
      .returning();

    return newConfig;
  }

  async updateConfig(
    tenantId: string,
    entityType: KanbanEntityType,
    updates: {
      wipLimits?: Record<string, { softLimit?: number; hardLimit?: number; warningThreshold?: number }>;
      collapsedColumns?: string[];
      stageOrder?: string[];
      transitions?: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'>;
    },
    expectedVersion: number
  ): Promise<KanbanConfigRow> {
    // Build the update object dynamically to avoid type issues
    const setValues: Record<string, unknown> = {
      version: sql`${kanbanConfigs.version} + 1`,
      updatedAt: new Date(),
    };

    if (updates.wipLimits) {
      // Merge with defaults to ensure all fields are present
      const normalizedLimits: Record<string, { softLimit: number; hardLimit: number; warningThreshold: number }> = {};
      for (const [stageId, limits] of Object.entries(updates.wipLimits)) {
        normalizedLimits[stageId] = {
          softLimit: limits.softLimit ?? 999,
          hardLimit: limits.hardLimit ?? 999,
          warningThreshold: limits.warningThreshold ?? Math.floor((limits.softLimit ?? 999) * 0.8),
        };
      }
      setValues.wipLimits = normalizedLimits;
    }
    if (updates.collapsedColumns) setValues.collapsedColumns = updates.collapsedColumns;
    if (updates.stageOrder) setValues.stageOrder = updates.stageOrder;
    if (updates.transitions) setValues.transitions = updates.transitions;

    const [updated] = await this.db
      .update(kanbanConfigs)
      .set(setValues as typeof kanbanConfigs.$inferInsert)
      .where(and(
        eq(kanbanConfigs.tenantId, tenantId),
        eq(kanbanConfigs.entityType, entityType),
        eq(kanbanConfigs.version, expectedVersion)
      ))
      .returning();

    if (!updated) {
      throw new Error('VERSION_CONFLICT: La configuración fue modificada por otro usuario');
    }

    return updated;
  }

  // ============================================
  // History & Audit
  // ============================================

  async getItemHistory(
    tenantId: string,
    entityType: KanbanEntityType,
    entityId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ moves: KanbanMoveRow[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const moves = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.entityId, entityId)
      ))
      .orderBy(desc(kanbanMoves.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.entityId, entityId)
      ));

    return {
      moves,
      total: countResult[0]?.count || 0,
    };
  }

  async getBoardHistory(
    tenantId: string,
    entityType: KanbanEntityType,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ moves: KanbanMoveRow[]; total: number }> {
    const { startDate, endDate, limit = 100, offset = 0 } = options;

    const conditions = [
      eq(kanbanMoves.tenantId, tenantId),
      eq(kanbanMoves.entityType, entityType),
    ];

    if (startDate && endDate) {
      conditions.push(between(kanbanMoves.createdAt, startDate, endDate));
    }

    const moves = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(...conditions))
      .orderBy(desc(kanbanMoves.createdAt))
      .limit(limit)
      .offset(offset);

    const countResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(...conditions));

    return {
      moves,
      total: countResult[0]?.count || 0,
    };
  }

  // ============================================
  // Lock Operations
  // ============================================

  async acquireLock(
    tenantId: string,
    entityType: KanbanEntityType,
    entityId: string,
    userId: string,
    sessionId: string
  ): Promise<{ success: boolean; expiresAt?: Date; conflictingUser?: string }> {
    const lockDuration = 30 * 1000; // 30 seconds
    const expiresAt = new Date(Date.now() + lockDuration);

    try {
      await this.db.insert(kanbanLocks).values({
        entityType,
        entityId,
        tenantId,
        lockedBy: userId,
        expiresAt,
        sessionId,
      }).onConflictDoUpdate({
        target: [kanbanLocks.entityType, kanbanLocks.entityId],
        set: {
          lockedBy: sql`CASE
            WHEN ${kanbanLocks.expiresAt} < NOW() THEN ${userId}
            WHEN ${kanbanLocks.lockedBy} = ${userId} THEN ${userId}
            ELSE ${kanbanLocks.lockedBy}
          END`,
          expiresAt: sql`CASE
            WHEN ${kanbanLocks.expiresAt} < NOW() THEN ${expiresAt}
            WHEN ${kanbanLocks.lockedBy} = ${userId} THEN ${expiresAt}
            ELSE ${kanbanLocks.expiresAt}
          END`,
          sessionId: sql`CASE
            WHEN ${kanbanLocks.expiresAt} < NOW() THEN ${sessionId}
            WHEN ${kanbanLocks.lockedBy} = ${userId} THEN ${sessionId}
            ELSE ${kanbanLocks.sessionId}
          END`,
        },
      });

      // Check if we got the lock
      const result = await this.db
        .select()
        .from(kanbanLocks)
        .where(and(
          eq(kanbanLocks.entityType, entityType),
          eq(kanbanLocks.entityId, entityId)
        ))
        .limit(1);

      if (result[0]?.lockedBy === userId) {
        return { success: true, expiresAt };
      }

      return { success: false, conflictingUser: result[0]?.lockedBy };
    } catch (error) {
      return { success: false };
    }
  }

  async releaseLock(
    entityType: KanbanEntityType,
    entityId: string,
    userId: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(kanbanLocks)
      .where(and(
        eq(kanbanLocks.entityType, entityType),
        eq(kanbanLocks.entityId, entityId),
        eq(kanbanLocks.lockedBy, userId)
      ));

    return true;
  }

  async cleanExpiredLocks(): Promise<number> {
    const result = await this.db
      .delete(kanbanLocks)
      .where(lt(kanbanLocks.expiresAt, new Date()));

    return 0; // Drizzle doesn't return affected rows count easily
  }

  // ============================================
  // Snapshot Operations
  // ============================================

  async createSnapshot(
    tenantId: string,
    entityType: KanbanEntityType,
    reason: string
  ): Promise<string> {
    // Get current board state
    const stages = this.getStagesForEntity(entityType);
    const stageItems: Array<{ id: string; items: Array<{ id: string; position: number; stageId: string }> }> = [];

    for (const stage of stages) {
      const { items } = await this.getStageItems(tenantId, entityType, stage.id, 10000);
      stageItems.push({
        id: stage.id,
        items: items.map((item, index) => ({
          id: item.id as string,
          position: index,
          stageId: stage.id,
        })),
      });
    }

    // Get current config
    const config = await this.getOrCreateConfig(tenantId, entityType);

    // Count moves since last snapshot
    const lastSnapshot = await this.db
      .select()
      .from(kanbanSnapshots)
      .where(and(
        eq(kanbanSnapshots.tenantId, tenantId),
        eq(kanbanSnapshots.entityType, entityType)
      ))
      .orderBy(desc(kanbanSnapshots.version))
      .limit(1);

    const lastSnapshotTime = lastSnapshot[0]?.createdAt || new Date(0);
    const moveCountResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        gt(kanbanMoves.createdAt, lastSnapshotTime)
      ));

    const newVersion = (lastSnapshot[0]?.version || 0) + 1;

    const [snapshot] = await this.db
      .insert(kanbanSnapshots)
      .values({
        tenantId,
        entityType,
        boardState: {
          stages: stageItems,
          config: {
            wipLimits: Object.fromEntries(
              Object.entries(config.wipLimits).map(([k, v]) => [k, (v as { hardLimit: number }).hardLimit])
            ),
            collapsedColumns: config.collapsedColumns,
          },
        },
        version: newVersion,
        moveCount: moveCountResult[0]?.count || 0,
        reason,
      })
      .returning();

    return snapshot.id;
  }

  // ============================================
  // Helper Methods
  // ============================================

  private getStagesForEntity(entityType: KanbanEntityType) {
    switch (entityType) {
      case 'lead':
        return DEFAULT_LEAD_STAGES;
      case 'opportunity':
        return DEFAULT_OPPORTUNITY_STAGES;
      case 'task':
        return DEFAULT_TASK_STAGES;
      case 'customer':
        return DEFAULT_CUSTOMER_STAGES;
      default:
        return [];
    }
  }

  private getTableForEntity(entityType: KanbanEntityType) {
    switch (entityType) {
      case 'lead':
        return leads;
      case 'opportunity':
        return opportunities;
      case 'task':
        return tasks;
      case 'customer':
        return customers;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private getStageColumnForEntity(entityType: KanbanEntityType): string {
    switch (entityType) {
      case 'lead':
        return 'status';
      case 'opportunity':
        return 'stage';
      case 'task':
        return 'status';
      case 'customer':
        return 'status';
      default:
        return 'status';
    }
  }

  private async getEntity(
    entityType: KanbanEntityType,
    entityId: string,
    tenantId: string
  ): Promise<Record<string, unknown> | null> {
    const table = this.getTableForEntity(entityType);
    const result = await this.db
      .select()
      .from(table)
      .where(and(
        eq(table.id, entityId),
        eq(table.tenantId, tenantId)
      ))
      .limit(1);

    return result[0] as Record<string, unknown> | null;
  }

  private getEntityStage(entity: Record<string, unknown>, entityType: KanbanEntityType): string {
    const column = this.getStageColumnForEntity(entityType);
    return entity[column] as string;
  }

  private async updateEntityStage(
    tx: NodePgDatabase<typeof schema>,
    entityType: KanbanEntityType,
    entityId: string,
    newStage: string
  ): Promise<void> {
    const table = this.getTableForEntity(entityType);
    const column = this.getStageColumnForEntity(entityType);

    await tx
      .update(table)
      .set({ [column]: newStage, updatedAt: new Date() })
      .where(eq(table.id, entityId));
  }

  private async validateTransition(
    tenantId: string,
    entityType: KanbanEntityType,
    fromStageId: string,
    toStageId: string
  ): Promise<TransitionValidation> {
    // Get custom transitions from config
    const config = await this.getOrCreateConfig(tenantId, entityType);

    const transitionKey = `${fromStageId}_${toStageId}`;

    if (config.transitions && config.transitions[transitionKey]) {
      const type = config.transitions[transitionKey];
      return {
        type,
        reason: type === 'blocked' ? 'Transition not allowed' : undefined,
        reasonEs: type === 'blocked' ? 'Transición no permitida' : undefined,
      };
    }

    // Default: all transitions allowed
    return { type: 'allowed' };
  }

  private async getWIPStatus(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string
  ): Promise<WIPStatus> {
    const config = await this.getOrCreateConfig(tenantId, entityType);
    const wipLimit = config.wipLimits[stageId] || { softLimit: 999, hardLimit: 999 };

    // Get current count
    const { total } = await this.getStageItems(tenantId, entityType, stageId, 1);

    return this.calculateWIPStatus(total, wipLimit);
  }

  private calculateWIPStatus(
    current: number,
    limits: { softLimit: number; hardLimit: number }
  ): WIPStatus {
    const { softLimit, hardLimit } = limits;
    const percentage = Math.round((current / hardLimit) * 100);

    let level: 'normal' | 'warning' | 'critical' | 'blocked' = 'normal';

    if (current >= hardLimit) {
      level = 'blocked';
    } else if (current >= softLimit + Math.floor((hardLimit - softLimit) / 2)) {
      level = 'critical';
    } else if (current >= softLimit) {
      level = 'warning';
    }

    return {
      current,
      softLimit,
      hardLimit,
      level,
      percentage,
    };
  }

  private async getLastMoveByUser(
    tenantId: string,
    entityType: KanbanEntityType,
    userId: string
  ): Promise<KanbanMoveRow | undefined> {
    const result = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.userId, userId),
        isNull(kanbanMoves.undoMoveId) // Not an undo move
      ))
      .orderBy(desc(kanbanMoves.createdAt))
      .limit(1);

    return result[0];
  }

  private async getLastUndoByUser(
    tenantId: string,
    entityType: KanbanEntityType,
    userId: string
  ): Promise<KanbanMoveRow | undefined> {
    // Find moves that were undone by this user
    const result = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.undoneBy, userId)
      ))
      .orderBy(desc(kanbanMoves.undoneAt))
      .limit(1);

    return result[0];
  }

  // ============================================
  // Metrics & Analytics (Enterprise Hardening)
  // ============================================

  /**
   * Calculate and store Kanban metrics for a given period
   * Includes: lead time, cycle time, throughput, WIP violations
   */
  async calculateMetrics(
    tenantId: string,
    entityType: KanbanEntityType,
    periodType: 'hourly' | 'daily' | 'weekly',
    periodStart: Date
  ): Promise<KanbanMetricsData[]> {
    const stages = this.getStagesForEntity(entityType);
    const periodEnd = this.getPeriodEnd(periodStart, periodType);
    const results: KanbanMetricsData[] = [];

    for (const stage of stages) {
      // Get moves INTO this stage during period
      const entryMoves = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.tenantId, tenantId),
          eq(kanbanMoves.entityType, entityType),
          eq(kanbanMoves.toStageId, stage.id),
          between(kanbanMoves.createdAt, periodStart, periodEnd),
          isNull(kanbanMoves.undoneAt)
        ));

      // Get moves OUT OF this stage during period
      const exitMoves = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.tenantId, tenantId),
          eq(kanbanMoves.entityType, entityType),
          eq(kanbanMoves.fromStageId, stage.id),
          between(kanbanMoves.createdAt, periodStart, periodEnd),
          isNull(kanbanMoves.undoneAt)
        ));

      // Calculate lead times (time spent in stage)
      const leadTimes = await this.calculateStageDurations(tenantId, entityType, stage.id, periodStart, periodEnd);

      // Count undo/redo operations
      const undoCount = await this.countUndoOperations(tenantId, entityType, stage.id, periodStart, periodEnd);

      // Count WIP violations
      const wipViolations = await this.countWIPViolations(tenantId, entityType, stage.id, periodStart, periodEnd);

      // Calculate bottleneck score (higher = more congested)
      const bottleneckScore = this.calculateBottleneckScore(
        entryMoves.length,
        exitMoves.length,
        leadTimes.avg
      );

      const metrics: KanbanMetricsData = {
        entityType,
        stageId: stage.id,
        period: {
          type: periodType,
          start: periodStart,
          end: periodEnd,
        },
        metrics: {
          avgLeadTimeSeconds: leadTimes.avg,
          medianLeadTimeSeconds: leadTimes.median,
          p90LeadTimeSeconds: leadTimes.p90,
          itemsEntered: entryMoves.length,
          itemsExited: exitMoves.length,
          throughput: exitMoves.length,
          peakWipCount: wipViolations.peak,
          avgWipCount: wipViolations.avg,
          wipBlockedCount: wipViolations.blocked,
          wipWarningCount: wipViolations.warning,
          undoCount: undoCount.undo,
          redoCount: undoCount.redo,
          bottleneckScore,
        },
      };

      // Store metrics
      await this.storeMetrics(tenantId, metrics);
      results.push(metrics);
    }

    return results;
  }

  /**
   * Get aggregated metrics for dashboard display
   */
  async getMetricsDashboard(
    tenantId: string,
    entityType: KanbanEntityType,
    options: {
      periodType?: 'hourly' | 'daily' | 'weekly';
      limit?: number;
    } = {}
  ): Promise<{
    stages: Array<{ stageId: string; label: string; metrics: KanbanMetricsData['metrics'] }>;
    totals: {
      totalThroughput: number;
      avgLeadTime: number;
      totalWipViolations: number;
      bottlenecks: string[];
    };
  }> {
    const { periodType = 'daily', limit = 7 } = options;
    const stages = this.getStagesForEntity(entityType);

    // Get recent metrics from database
    const metricsRows = await this.db
      .select()
      .from(kanbanMetrics)
      .where(and(
        eq(kanbanMetrics.tenantId, tenantId),
        eq(kanbanMetrics.entityType, entityType),
        eq(kanbanMetrics.periodType, periodType)
      ))
      .orderBy(desc(kanbanMetrics.periodStart))
      .limit(limit * stages.length);

    // Group by stage
    const byStage = new Map<string, typeof metricsRows>();
    for (const row of metricsRows) {
      const existing = byStage.get(row.stageId) || [];
      existing.push(row);
      byStage.set(row.stageId, existing);
    }

    // Calculate per-stage averages
    const stageMetrics = stages.map((stage) => {
      const rows = byStage.get(stage.id) || [];
      if (rows.length === 0) {
        return {
          stageId: stage.id,
          label: stage.label,
          metrics: this.getEmptyMetrics(),
        };
      }

      return {
        stageId: stage.id,
        label: stage.label,
        metrics: this.aggregateMetricsRows(rows),
      };
    });

    // Calculate totals
    const totals = {
      totalThroughput: stageMetrics.reduce((sum, s) => sum + s.metrics.throughput, 0),
      avgLeadTime: Math.round(
        stageMetrics.reduce((sum, s) => sum + s.metrics.avgLeadTimeSeconds, 0) / stages.length
      ),
      totalWipViolations: stageMetrics.reduce(
        (sum, s) => sum + s.metrics.wipBlockedCount + s.metrics.wipWarningCount,
        0
      ),
      bottlenecks: stageMetrics
        .filter((s) => s.metrics.bottleneckScore > 0.7)
        .map((s) => s.stageId),
    };

    return { stages: stageMetrics, totals };
  }

  /**
   * Check for idempotent move (prevent duplicate operations)
   */
  async checkIdempotentMove(
    tenantId: string,
    idempotencyKey: string
  ): Promise<KanbanMoveResult | null> {
    if (!idempotencyKey) return null;

    // Check if move with this key already exists
    const existing = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        sql`${kanbanMoves.metadata}->>'idempotencyKey' = ${idempotencyKey}`
      ))
      .limit(1);

    if (existing[0]) {
      return {
        moveId: existing[0].id,
        entityId: existing[0].entityId,
        fromStageId: existing[0].fromStageId,
        toStageId: existing[0].toStageId,
        newPosition: 0,
        timestamp: existing[0].createdAt,
        validation: { type: 'allowed', message: 'Idempotent replay' },
        undoAvailable: !existing[0].undoneAt,
      };
    }

    return null;
  }

  /**
   * Get active users count for a board (from WebSocket connections)
   * This integrates with WebSocketService for real-time tracking
   */
  async getActiveUsersCount(
    tenantId: string,
    entityType: KanbanEntityType
  ): Promise<number> {
    // Query kanban_locks to count unique users with active locks
    const activeLocks = await this.db
      .select({ userId: kanbanLocks.lockedBy })
      .from(kanbanLocks)
      .where(and(
        eq(kanbanLocks.tenantId, tenantId),
        eq(kanbanLocks.entityType, entityType),
        gt(kanbanLocks.expiresAt, new Date())
      ))
      .groupBy(kanbanLocks.lockedBy);

    return activeLocks.length;
  }

  /**
   * Verify event sourcing consistency
   * Replays moves to ensure board state matches expected
   */
  async verifyConsistency(
    tenantId: string,
    entityType: KanbanEntityType
  ): Promise<{
    isConsistent: boolean;
    discrepancies: Array<{ entityId: string; expected: string; actual: string }>;
  }> {
    const discrepancies: Array<{ entityId: string; expected: string; actual: string }> = [];

    // Get all entities
    const table = this.getTableForEntity(entityType);
    const stageColumn = this.getStageColumnForEntity(entityType);

    const entities = await this.db
      .select()
      .from(table)
      .where(eq(table.tenantId, tenantId));

    for (const entity of entities) {
      const entityId = entity.id as string;
      const actualStage = entity[stageColumn] as string;

      // Get the last valid move for this entity
      const lastMove = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.tenantId, tenantId),
          eq(kanbanMoves.entityType, entityType),
          eq(kanbanMoves.entityId, entityId),
          isNull(kanbanMoves.undoneAt)
        ))
        .orderBy(desc(kanbanMoves.createdAt))
        .limit(1);

      if (lastMove[0]) {
        const expectedStage = lastMove[0].toStageId;
        if (expectedStage !== actualStage) {
          discrepancies.push({
            entityId,
            expected: expectedStage,
            actual: actualStage,
          });
        }
      }
    }

    return {
      isConsistent: discrepancies.length === 0,
      discrepancies,
    };
  }

  /**
   * Repair consistency issues by replaying last valid move
   */
  async repairConsistency(
    tenantId: string,
    entityType: KanbanEntityType,
    entityId: string
  ): Promise<{ repaired: boolean; newStage: string }> {
    const lastMove = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.entityId, entityId),
        isNull(kanbanMoves.undoneAt)
      ))
      .orderBy(desc(kanbanMoves.createdAt))
      .limit(1);

    if (!lastMove[0]) {
      return { repaired: false, newStage: '' };
    }

    const expectedStage = lastMove[0].toStageId;

    // Update entity to expected stage
    await this.db.transaction(async (tx) => {
      await this.updateEntityStage(tx, entityType, entityId, expectedStage);
    });

    return { repaired: true, newStage: expectedStage };
  }

  // ============================================
  // Private Metrics Helpers
  // ============================================

  private getPeriodEnd(start: Date, type: 'hourly' | 'daily' | 'weekly'): Date {
    const end = new Date(start);
    switch (type) {
      case 'hourly':
        end.setHours(end.getHours() + 1);
        break;
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        end.setDate(end.getDate() + 7);
        break;
    }
    return end;
  }

  private async calculateStageDurations(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ avg: number; median: number; p90: number }> {
    // Get pairs of entry/exit moves to calculate durations
    const durations: number[] = [];

    const entryMoves = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.toStageId, stageId),
        between(kanbanMoves.createdAt, periodStart, periodEnd),
        isNull(kanbanMoves.undoneAt)
      ));

    for (const entry of entryMoves) {
      // Find exit move for same entity
      const exitMove = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.tenantId, tenantId),
          eq(kanbanMoves.entityType, entityType),
          eq(kanbanMoves.entityId, entry.entityId),
          eq(kanbanMoves.fromStageId, stageId),
          gt(kanbanMoves.createdAt, entry.createdAt),
          isNull(kanbanMoves.undoneAt)
        ))
        .orderBy(kanbanMoves.createdAt)
        .limit(1);

      if (exitMove[0]) {
        const duration = (exitMove[0].createdAt.getTime() - entry.createdAt.getTime()) / 1000;
        durations.push(duration);
      }
    }

    if (durations.length === 0) {
      return { avg: 0, median: 0, p90: 0 };
    }

    durations.sort((a, b) => a - b);

    return {
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      median: durations[Math.floor(durations.length / 2)],
      p90: durations[Math.floor(durations.length * 0.9)] || durations[durations.length - 1],
    };
  }

  private async countUndoOperations(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ undo: number; redo: number }> {
    // Count undo moves (moves with undoMoveId)
    const undoResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.toStageId, stageId),
        between(kanbanMoves.createdAt, periodStart, periodEnd),
        sql`${kanbanMoves.undoMoveId} IS NOT NULL`
      ));

    // Count redo (undo of undo)
    const redoResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.toStageId, stageId),
        between(kanbanMoves.createdAt, periodStart, periodEnd),
        sql`${kanbanMoves.metadata}->>'source' = 'redo'`
      ));

    return {
      undo: undoResult[0]?.count || 0,
      redo: redoResult[0]?.count || 0,
    };
  }

  private async countWIPViolations(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{ blocked: number; warning: number; peak: number; avg: number }> {
    // Count moves that were forced due to WIP limits
    const blockedResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.toStageId, stageId),
        between(kanbanMoves.createdAt, periodStart, periodEnd),
        sql`${kanbanMoves.metadata}->>'wipOverride' = 'true'`
      ));

    const warningResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        eq(kanbanMoves.toStageId, stageId),
        between(kanbanMoves.createdAt, periodStart, periodEnd),
        sql`${kanbanMoves.metadata}->>'validationType' = 'warning'`
      ));

    // Get current WIP for peak/avg estimation
    const { total } = await this.getStageItems(tenantId, entityType, stageId, 1);

    return {
      blocked: blockedResult[0]?.count || 0,
      warning: warningResult[0]?.count || 0,
      peak: total, // Simplified - actual peak would require time-series tracking
      avg: total,
    };
  }

  private calculateBottleneckScore(itemsIn: number, itemsOut: number, avgLeadTime: number): number {
    // Score 0-1 where higher = more bottlenecked
    // Based on: more items entering than leaving, longer lead times
    if (itemsIn === 0 && itemsOut === 0) return 0;

    const flowRatio = itemsIn > 0 ? itemsOut / itemsIn : 1;
    const leadTimeScore = Math.min(avgLeadTime / (86400 * 7), 1); // Cap at 1 week

    return Math.round((1 - flowRatio * 0.5 + leadTimeScore * 0.5) * 100) / 100;
  }

  private async storeMetrics(tenantId: string, metrics: KanbanMetricsData): Promise<void> {
    await this.db.insert(kanbanMetrics).values({
      tenantId,
      entityType: metrics.entityType,
      stageId: metrics.stageId,
      periodStart: metrics.period.start,
      periodEnd: metrics.period.end,
      periodType: metrics.period.type,
      avgLeadTimeSeconds: metrics.metrics.avgLeadTimeSeconds,
      medianLeadTimeSeconds: metrics.metrics.medianLeadTimeSeconds,
      p90LeadTimeSeconds: metrics.metrics.p90LeadTimeSeconds,
      itemsEntered: metrics.metrics.itemsEntered,
      itemsExited: metrics.metrics.itemsExited,
      throughput: metrics.metrics.throughput,
      peakWipCount: metrics.metrics.peakWipCount,
      avgWipCount: metrics.metrics.avgWipCount,
      wipBlockedCount: metrics.metrics.wipBlockedCount,
      wipWarningCount: metrics.metrics.wipWarningCount,
      undoCount: metrics.metrics.undoCount,
      redoCount: metrics.metrics.redoCount,
      bottleneckScore: metrics.metrics.bottleneckScore,
    }).onConflictDoUpdate({
      target: [kanbanMetrics.tenantId, kanbanMetrics.entityType, kanbanMetrics.stageId, kanbanMetrics.periodStart],
      set: {
        avgLeadTimeSeconds: metrics.metrics.avgLeadTimeSeconds,
        medianLeadTimeSeconds: metrics.metrics.medianLeadTimeSeconds,
        p90LeadTimeSeconds: metrics.metrics.p90LeadTimeSeconds,
        itemsEntered: metrics.metrics.itemsEntered,
        itemsExited: metrics.metrics.itemsExited,
        throughput: metrics.metrics.throughput,
        peakWipCount: metrics.metrics.peakWipCount,
        avgWipCount: metrics.metrics.avgWipCount,
        wipBlockedCount: metrics.metrics.wipBlockedCount,
        wipWarningCount: metrics.metrics.wipWarningCount,
        undoCount: metrics.metrics.undoCount,
        redoCount: metrics.metrics.redoCount,
        bottleneckScore: metrics.metrics.bottleneckScore,
        updatedAt: new Date(),
      },
    });
  }

  private getEmptyMetrics(): KanbanMetricsData['metrics'] {
    return {
      avgLeadTimeSeconds: 0,
      medianLeadTimeSeconds: 0,
      p90LeadTimeSeconds: 0,
      itemsEntered: 0,
      itemsExited: 0,
      throughput: 0,
      peakWipCount: 0,
      avgWipCount: 0,
      wipBlockedCount: 0,
      wipWarningCount: 0,
      undoCount: 0,
      redoCount: 0,
      bottleneckScore: 0,
    };
  }

  private aggregateMetricsRows(rows: Array<typeof kanbanMetrics.$inferSelect>): KanbanMetricsData['metrics'] {
    if (rows.length === 0) return this.getEmptyMetrics();

    const sum = (key: keyof typeof rows[0]) =>
      rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    const avg = (key: keyof typeof rows[0]) =>
      Math.round(sum(key) / rows.length);

    return {
      avgLeadTimeSeconds: avg('avgLeadTimeSeconds'),
      medianLeadTimeSeconds: avg('medianLeadTimeSeconds'),
      p90LeadTimeSeconds: avg('p90LeadTimeSeconds'),
      itemsEntered: sum('itemsEntered'),
      itemsExited: sum('itemsExited'),
      throughput: sum('throughput'),
      peakWipCount: Math.max(...rows.map((r) => r.peakWipCount || 0)),
      avgWipCount: avg('avgWipCount'),
      wipBlockedCount: sum('wipBlockedCount'),
      wipWarningCount: sum('wipWarningCount'),
      undoCount: sum('undoCount'),
      redoCount: sum('redoCount'),
      bottleneckScore: avg('bottleneckScore'),
    };
  }
}
