'use client';

/**
 * useKanbanBoard Hook
 *
 * Unified hook that combines all Kanban features into a single
 * easy-to-use interface. This is the primary hook for implementing
 * Kanban boards across the CRM.
 *
 * @version 2.0.0
 * @module hooks/useKanbanBoard
 */

import * as React from 'react';
import { useWIPLimits } from './use-wip-limits';
import { useKanbanKeyboard } from './use-kanban-keyboard';
import { useKanbanAnnouncements } from './use-kanban-announcements';
import type {
  KanbanEntityType,
  PipelineStageConfig,
  WIPLimitConfig,
  MoveOperation,
  DragState,
  DropZoneState,
  StageTransitionValidation,
  WIPStatus,
  KanbanItem,
  KanbanColumnState,
} from '../types';
import {
  validateStageTransition,
  calculateWIPStatus,
  getTransitionKey,
} from '../utils';
import {
  getDefaultWIPLimits,
  getStagesForEntity,
  getTransitionsForEntity,
} from '../constants';

// ============================================
// Types
// ============================================

export interface UseKanbanBoardOptions<T extends { id: string }> {
  /** Entity type for the Kanban board */
  entityType: KanbanEntityType;
  /** Items to display in the board */
  items: T[];
  /** Function to get the stage ID for an item */
  getItemStage: (item: T) => string;
  /** Custom stage configurations (optional, uses defaults) */
  stages?: PipelineStageConfig[];
  /** Custom WIP limits (optional, uses defaults) */
  wipLimits?: WIPLimitConfig;
  /** Enable keyboard navigation */
  enableKeyboard?: boolean;
  /** Enable screen reader announcements */
  enableAnnouncements?: boolean;
  /** Callback when move is requested */
  onMoveItem?: (operation: MoveOperation) => Promise<void>;
  /** Callback when move is cancelled */
  onMoveCancel?: () => void;
  /** Callback for telemetry/analytics */
  onTelemetry?: (event: string, data: Record<string, unknown>) => void;
}

export interface UseKanbanBoardReturn<T extends { id: string }> {
  // Configuration
  stages: PipelineStageConfig[];

  // Grouped items by stage
  itemsByStage: Map<string, T[]>;

  // Drag state
  dragState: DragState | null;
  setDragState: React.Dispatch<React.SetStateAction<DragState | null>>;
  isDragging: boolean;

  // WIP limits
  getWIPStatus: (stageId: string) => WIPStatus;
  canAddToStage: (stageId: string) => boolean;
  isStageAtWarning: (stageId: string) => boolean;
  isStageBlocked: (stageId: string) => boolean;

  // Validation
  validateMove: (fromStage: string, toStage: string) => StageTransitionValidation;
  getDropZoneState: (stageId: string) => DropZoneState;

  // Actions
  startDrag: (item: T, sourceStage: string) => void;
  endDrag: (targetStage: string, dropIndex?: number) => void;
  cancelDrag: () => void;
  moveItem: (itemId: string, fromStage: string, toStage: string, reason?: string) => Promise<void>;

  // Keyboard navigation
  keyboardProps: {
    onKeyDown: (event: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-label': string;
  };
  focusState: { columnIndex: number; itemIndex: number; isGrabbed: boolean };

  // Announcements
  announcements: ReturnType<typeof useKanbanAnnouncements>;

  // Undo/Redo
  undoStack: MoveOperation[];
  redoStack: MoveOperation[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;

  // Column collapse
  collapsedColumns: Record<string, boolean>;
  toggleColumnCollapse: (stageId: string) => void;
  collapseAllColumns: () => void;
  expandAllColumns: () => void;

  // Utilities
  getStageById: (stageId: string) => PipelineStageConfig | undefined;
  getItemById: (itemId: string) => T | undefined;
  getStageItemCount: (stageId: string) => number;
}

// ============================================
// Hook Implementation
// ============================================

export function useKanbanBoard<T extends { id: string }>({
  entityType,
  items,
  getItemStage,
  stages: customStages,
  wipLimits: customWipLimits,
  enableKeyboard = true,
  enableAnnouncements = true,
  onMoveItem,
  onMoveCancel,
  onTelemetry,
}: UseKanbanBoardOptions<T>): UseKanbanBoardReturn<T> {
  // Get default configurations
  const stages = customStages ?? getStagesForEntity(entityType);
  const wipLimits = customWipLimits ?? getDefaultWIPLimits(entityType);
  const transitions = getTransitionsForEntity(entityType);

  // ============================================
  // State
  // ============================================

  const [dragState, setDragState] = React.useState<DragState | null>(null);
  const [undoStack, setUndoStack] = React.useState<MoveOperation[]>([]);
  const [redoStack, setRedoStack] = React.useState<MoveOperation[]>([]);
  const [collapsedColumns, setCollapsedColumns] = React.useState<Record<string, boolean>>({});

  // ============================================
  // Memoized Values
  // ============================================

  // Group items by stage
  const itemsByStage = React.useMemo(() => {
    const map = new Map<string, T[]>();

    // Initialize all stages with empty arrays
    stages.forEach((stage) => {
      map.set(stage.id, []);
    });

    // Distribute items to their stages
    items.forEach((item) => {
      const stageId = getItemStage(item);
      const stageItems = map.get(stageId) || [];
      stageItems.push(item);
      map.set(stageId, stageItems);
    });

    return map;
  }, [items, stages, getItemStage]);

  // Calculate WIP counts per stage
  const wipCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    stages.forEach((stage) => {
      counts[stage.id] = itemsByStage.get(stage.id)?.length ?? 0;
    });
    return counts;
  }, [stages, itemsByStage]);

  // ============================================
  // Child Hooks
  // ============================================

  // WIP Limits hook (with correct interface)
  const wipHook = useWIPLimits({
    defaultLimits: stages.reduce((acc, stage) => {
      acc[stage.id] = wipLimits;
      return acc;
    }, {} as Record<string, WIPLimitConfig>),
    onSoftLimitReached: (stageId: string, status: WIPStatus) => {
      onTelemetry?.('wip_warning', { stageId, ...status });
    },
    onHardLimitReached: (stageId: string, status: WIPStatus) => {
      onTelemetry?.('wip_blocked', { stageId, ...status });
    },
  });

  // Build columns for keyboard hook
  const columns = React.useMemo<KanbanColumnState<T>[]>(() => {
    return stages.map((stage) => {
      const stageItems = itemsByStage.get(stage.id) ?? [];
      const count = stageItems.length;
      return {
        stage,
        items: stageItems.map(item => ({
          id: item.id,
          stageId: stage.id,
          data: item,
        })) as KanbanItem<T>[],
        count,
        wip: calculateWIPStatus(count, wipLimits),
        isCollapsed: collapsedColumns[stage.id] ?? false,
        isDropTarget: dragState?.overStageId === stage.id,
      };
    });
  }, [stages, itemsByStage, wipLimits, collapsedColumns, dragState]);

  // Keyboard Navigation (with correct interface)
  const keyboardHook = useKanbanKeyboard<T>({
    columns,
    enabled: enableKeyboard,
    onDrop: async (itemId: string, targetStageId: string) => {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const fromStage = getItemStage(item);
        await moveItem(itemId, fromStage, targetStageId);
      }
    },
  });

  // Announcements
  const announcements = useKanbanAnnouncements({
    enabled: enableAnnouncements,
  });

  // ============================================
  // Helper Functions
  // ============================================

  const getStageById = React.useCallback(
    (stageId: string) => stages.find((s) => s.id === stageId),
    [stages]
  );

  const getItemById = React.useCallback(
    (itemId: string) => items.find((i) => i.id === itemId),
    [items]
  );

  const getStageItemCount = React.useCallback(
    (stageId: string) => itemsByStage.get(stageId)?.length ?? 0,
    [itemsByStage]
  );

  // WIP status helpers that use the counts we have
  const getWIPStatus = React.useCallback(
    (stageId: string): WIPStatus => {
      const count = wipCounts[stageId] ?? 0;
      return wipHook.getWIPStatus(stageId, count);
    },
    [wipCounts, wipHook]
  );

  const canAddToStage = React.useCallback(
    (stageId: string): boolean => {
      const count = wipCounts[stageId] ?? 0;
      return wipHook.canAddToColumn(stageId, count);
    },
    [wipCounts, wipHook]
  );

  const isStageAtWarning = React.useCallback(
    (stageId: string): boolean => {
      const count = wipCounts[stageId] ?? 0;
      return wipHook.isAtWarning(stageId, count);
    },
    [wipCounts, wipHook]
  );

  const isStageBlocked = React.useCallback(
    (stageId: string): boolean => {
      const count = wipCounts[stageId] ?? 0;
      return wipHook.isBlocked(stageId, count);
    },
    [wipCounts, wipHook]
  );

  // ============================================
  // Validation
  // ============================================

  const validateMove = React.useCallback(
    (fromStageId: string, toStageId: string): StageTransitionValidation => {
      const fromStage = stages.find((s) => s.id === fromStageId);
      const toStage = stages.find((s) => s.id === toStageId);

      if (!fromStage || !toStage) {
        return {
          allowed: false,
          type: 'blocked',
          reason: 'Invalid stage',
          reasonEs: 'Etapa inválida',
        };
      }

      return validateStageTransition(entityType, fromStage, toStage);
    },
    [stages, entityType]
  );

  const getDropZoneState = React.useCallback(
    (stageId: string): DropZoneState => {
      if (!dragState || !dragState.activeItem) {
        return {
          isOver: false,
          isValidDrop: false,
          isInvalidDrop: false,
        };
      }

      const sourceStageId = dragState.activeItem.stageId;
      const isOver = dragState.overStageId === stageId;
      const validation = validateMove(sourceStageId, stageId);
      const wipStatus = getWIPStatus(stageId);

      // Same stage - no drop
      if (sourceStageId === stageId) {
        return {
          isOver,
          isValidDrop: true, // Reordering is always valid
          isInvalidDrop: false,
        };
      }

      // Check WIP blocking
      if (wipStatus.level === 'blocked') {
        return {
          isOver,
          isValidDrop: false,
          isInvalidDrop: true,
          validation: {
            allowed: false,
            type: 'blocked',
            reason: 'WIP limit reached',
            reasonEs: 'Límite WIP alcanzado',
          },
        };
      }

      // Check transition rules
      if (validation.type === 'blocked') {
        return {
          isOver,
          isValidDrop: false,
          isInvalidDrop: true,
          validation,
        };
      }

      return {
        isOver,
        isValidDrop: true,
        isInvalidDrop: false,
        validation,
      };
    },
    [dragState, validateMove, getWIPStatus]
  );

  // ============================================
  // Drag & Drop Actions
  // ============================================

  const startDrag = React.useCallback(
    (item: T, sourceStage: string) => {
      const stage = getStageById(sourceStage);

      setDragState({
        isDragging: true,
        activeId: item.id,
        activeItem: {
          id: item.id,
          stageId: sourceStage,
          data: item,
        },
        overId: null,
        overStageId: null,
      });

      if (stage) {
        const stageLabel = stage.labelEs || stage.label;
        announcements.announceGrab(`${item.id} en ${stageLabel}`);
      }

      onTelemetry?.('drag_start', {
        entityType,
        itemId: item.id,
        sourceStage,
      });
    },
    [getStageById, announcements, onTelemetry, entityType]
  );

  const endDrag = React.useCallback(
    async (targetStage: string, _dropIndex?: number) => {
      if (!dragState || !dragState.activeItem) return;

      const targetStageConfig = getStageById(targetStage);
      const sourceStageId = dragState.activeItem.stageId;
      const validation = validateMove(sourceStageId, targetStage);
      const wipStatus = getWIPStatus(targetStage);

      // Validate the move
      if (validation.type === 'blocked' || wipStatus.level === 'blocked') {
        announcements.announceInvalid(
          validation.reasonEs || validation.reason || 'Movimiento no permitido'
        );
        setDragState(null);
        return;
      }

      // Perform the move
      try {
        await moveItem(
          dragState.activeId ?? '',
          sourceStageId,
          targetStage
        );

        if (targetStageConfig) {
          announcements.announceDrop(
            dragState.activeId ?? '',
            targetStageConfig.labelEs || targetStageConfig.label
          );
        }
      } catch (error) {
        announcements.announceInvalid('Error al mover el elemento');
        console.error('Failed to move item:', error);
      }

      setDragState(null);
    },
    [dragState, getStageById, validateMove, getWIPStatus, announcements]
  );

  const cancelDrag = React.useCallback(() => {
    if (dragState) {
      announcements.announceCancel();
      onMoveCancel?.();
    }
    setDragState(null);
  }, [dragState, announcements, onMoveCancel]);

  const moveItem = React.useCallback(
    async (
      itemId: string,
      fromStage: string,
      toStage: string,
      reason?: string
    ) => {
      // Skip if same stage
      if (fromStage === toStage) return;

      const operation: MoveOperation = {
        id: crypto.randomUUID(),
        itemId,
        sourceStageId: fromStage,
        targetStageId: toStage,
        timestamp: Date.now(),
        metadata: reason ? { reason } : undefined,
      };

      // Add to undo stack
      setUndoStack((prev) => [...prev.slice(-19), operation]);
      setRedoStack([]); // Clear redo on new action

      // Perform the move
      await onMoveItem?.(operation);

      onTelemetry?.('item_moved', {
        entityType,
        itemId,
        fromStage,
        toStage,
        hasReason: !!reason,
      });
    },
    [onMoveItem, onTelemetry, entityType]
  );

  // ============================================
  // Undo/Redo
  // ============================================

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const undo = React.useCallback(async () => {
    if (!canUndo) return;

    const lastOperation = undoStack[undoStack.length - 1];
    if (!lastOperation) return;

    const reverseOperation: MoveOperation = {
      id: crypto.randomUUID(),
      itemId: lastOperation.itemId,
      sourceStageId: lastOperation.targetStageId,
      targetStageId: lastOperation.sourceStageId,
      timestamp: Date.now(),
      metadata: { reason: 'Undo' },
    };

    // Move to redo stack
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastOperation]);

    // Perform reverse move
    await onMoveItem?.(reverseOperation);

    onTelemetry?.('undo', {
      entityType,
      itemId: lastOperation.itemId,
    });
  }, [canUndo, undoStack, onMoveItem, onTelemetry, entityType]);

  const redo = React.useCallback(async () => {
    if (!canRedo) return;

    const lastRedo = redoStack[redoStack.length - 1];
    if (!lastRedo) return;

    // Move back to undo stack
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, lastRedo]);

    // Perform the move
    await onMoveItem?.(lastRedo);

    onTelemetry?.('redo', {
      entityType,
      itemId: lastRedo.itemId,
    });
  }, [canRedo, redoStack, onMoveItem, onTelemetry, entityType]);

  // ============================================
  // Column Collapse
  // ============================================

  const toggleColumnCollapse = React.useCallback((stageId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }, []);

  const collapseAllColumns = React.useCallback(() => {
    const collapsed: Record<string, boolean> = {};
    stages.forEach((stage) => {
      collapsed[stage.id] = true;
    });
    setCollapsedColumns(collapsed);
  }, [stages]);

  const expandAllColumns = React.useCallback(() => {
    setCollapsedColumns({});
  }, []);

  // ============================================
  // Return Value
  // ============================================

  return {
    // Configuration
    stages,

    // Grouped items
    itemsByStage,

    // Drag state
    dragState,
    setDragState,
    isDragging: dragState?.isDragging ?? false,

    // WIP limits
    getWIPStatus,
    canAddToStage,
    isStageAtWarning,
    isStageBlocked,

    // Validation
    validateMove,
    getDropZoneState,

    // Actions
    startDrag,
    endDrag,
    cancelDrag,
    moveItem,

    // Keyboard
    keyboardProps: keyboardHook.keyboardProps,
    focusState: keyboardHook.focusState,

    // Announcements
    announcements,

    // Undo/Redo
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    undo,
    redo,

    // Column collapse
    collapsedColumns,
    toggleColumnCollapse,
    collapseAllColumns,
    expandAllColumns,

    // Utilities
    getStageById,
    getItemById,
    getStageItemCount,
  };
}
