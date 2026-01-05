'use client';

/**
 * TaskKanbanBoard Component - v2.0
 *
 * Main orchestrator for the task Kanban board with:
 * - Scroll indicators with navigation arrows (NEW)
 * - Fade gradients at edges (NEW)
 * - Keyboard navigation (Arrow keys, Home/End) (NEW)
 * - Drag & drop via @dnd-kit
 * - Status transition validation with visual feedback
 * - Per-task loading states
 * - Drop validation (green/red rings on columns)
 * - Drag overlay with premium card design
 *
 * Layout Architecture:
 * - KanbanContainer provides scroll handling with indicators
 * - TaskKanbanBoard is a flex row that MUST fill 100% height of parent
 * - Columns are fixed-width, flex-shrink-0, with FULL height
 * - Cards container inside each column has overflow-y-auto
 *
 * @version 2.0.0
 * @module components/kanban/TaskKanbanBoard
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanContainer } from '@/components/kanban';
import { TaskKanbanBoardSkeleton } from '../TasksSkeleton';
import {
  type Task,
  type TaskStatus,
  type TaskKanbanColumn,
  type TaskKanbanTransitionValidation,
} from '@/lib/tasks/types';
import { TaskKanbanColumn as TaskKanbanColumnComponent } from './TaskKanbanColumn';
import { TaskCardMinimalOverlay } from '../TaskCardMinimal';

// ============================================
// Types
// ============================================

export interface TaskKanbanBoardProps {
  /** Kanban columns with tasks */
  columns: TaskKanbanColumn[];
  /** Whether the board is loading */
  isLoading?: boolean;
  /** Whether a move operation is in progress */
  isMoving?: boolean;
  /** Validate if a move is allowed */
  canMoveToStatus?: (taskId: string, status: TaskStatus) => TaskKanbanTransitionValidation;
  /** Check if a specific task is being moved */
  isTaskMoving?: (taskId: string) => boolean;
  /** Handler when task is moved to a new status */
  onMoveToStatus?: (taskId: string, status: TaskStatus) => void;
  /** Callback when a task is clicked */
  onTaskClick?: (task: Task) => void;
  /** Callback when edit is requested */
  onTaskEdit?: (task: Task) => void;
  /** Callback when delete is requested */
  onTaskDelete?: (task: Task) => void;
  /** Callback when complete is requested */
  onTaskComplete?: (task: Task) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function TaskKanbanBoard({
  columns,
  isLoading = false,
  isMoving = false,
  canMoveToStatus,
  isTaskMoving,
  onMoveToStatus,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTaskComplete,
  className,
}: TaskKanbanBoardProps) {
  // State for tracking the active drag
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dropValidation, setDropValidation] = React.useState<TaskKanbanTransitionValidation | null>(null);

  // Configure sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required before drag starts
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // 200ms hold before drag starts
      tolerance: 8, // 8px movement tolerance during delay
    },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  // Find task by ID
  const findTaskById = React.useCallback(
    (id: string): Task | undefined => {
      for (const column of columns) {
        const found = column.tasks.find((task) => task.id === id);
        if (found) return found;
      }
      return undefined;
    },
    [columns]
  );

  // Find column by task ID
  const findColumnByTaskId = React.useCallback(
    (id: string): TaskKanbanColumn | undefined => {
      return columns.find((column) =>
        column.tasks.some((task) => task.id === id)
      );
    },
    [columns]
  );

  // Handle drag start
  const handleDragStart = React.useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const task = findTaskById(active.id as string);
      setActiveTask(task || null);
    },
    [findTaskById]
  );

  // Handle drag over with validation
  const handleDragOver = React.useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const overIdValue = (over?.id as string) || null;
      setOverId(overIdValue);

      // Validate drop target
      if (active && overIdValue && canMoveToStatus) {
        const activeId = active.id as string;

        // Determine target status
        let targetStatus: TaskStatus | null = null;
        const overColumn = columns.find((col) => col.stage.id === overIdValue);
        if (overColumn) {
          targetStatus = overColumn.stage.id;
        } else {
          // Over a task, find its column
          const taskColumn = columns.find((col) =>
            col.tasks.some((task) => task.id === overIdValue)
          );
          if (taskColumn) {
            targetStatus = taskColumn.stage.id;
          }
        }

        if (targetStatus) {
          const validation = canMoveToStatus(activeId, targetStatus);
          setDropValidation(validation);
        } else {
          setDropValidation(null);
        }
      } else {
        setDropValidation(null);
      }
    },
    [columns, canMoveToStatus]
  );

  // Handle drag end
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset state
      setActiveTask(null);
      setOverId(null);
      setDropValidation(null);

      // No drop target
      if (!over) return;

      const activeId = active.id as string;
      const overIdValue = over.id as string;

      // Find current column
      const currentColumn = findColumnByTaskId(activeId);
      if (!currentColumn) return;

      // Determine target status
      let targetStatus: TaskStatus;

      // Check if over a column directly
      const overColumn = columns.find((col) => col.stage.id === overIdValue);
      if (overColumn) {
        targetStatus = overColumn.stage.id;
      } else {
        // Over a task, find its column
        const taskColumn = findColumnByTaskId(overIdValue);
        if (!taskColumn) return;
        targetStatus = taskColumn.stage.id;
      }

      // If same column, no action needed
      if (currentColumn.stage.id === targetStatus) return;

      // Trigger move (validation happens in the handler)
      onMoveToStatus?.(activeId, targetStatus);
    },
    [columns, findColumnByTaskId, onMoveToStatus]
  );

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveTask(null);
    setOverId(null);
    setDropValidation(null);
  }, []);

  // Loading state
  if (isLoading) {
    return <TaskKanbanBoardSkeleton columns={5} />;
  }

  // Empty state
  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <div className="h-8 w-8 rounded-full bg-muted" />
        </div>
        <h3 className="text-lg font-medium mb-2">Sin columnas de estado</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          No hay columnas de estado configuradas para el tablero de tareas.
        </p>
      </div>
    );
  }

  return (
    <KanbanContainer
      aria-label="Tablero Kanban de Tareas"
      className={className}
      scrollOptions={{
        columnWidth: 280,
        columnGap: 16,
        threshold: 20,
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* Moving indicator */}
        {isMoving && (
          <div className="absolute top-2 right-2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Moviendo...</span>
          </div>
        )}

        {/*
          Board Container
          CRITICAL: Uses inline flex with nowrap to enable horizontal scroll
          Height is 100% of parent (KanbanContainer)
        */}
        <div
          className={cn(
            // Inline flex for horizontal layout
            'inline-flex flex-nowrap',
            'h-full',
            'min-h-0',
            'items-stretch',
            // Gap between columns (16px per spec)
            'gap-3 sm:gap-4 lg:gap-5',
            // Padding
            'px-3 sm:px-4 lg:px-5',
            'pb-3'
          )}
          role="region"
          aria-label="Columnas de Tareas"
        >
          {columns.map((column) => {
            // Determine if this column is a valid drop target
            const isOver = overId === column.stage.id;
            const isValidDropTarget = isOver && dropValidation?.allowed !== false;
            const isInvalidDropTarget = isOver && dropValidation?.allowed === false;

            return (
              <TaskKanbanColumnComponent
                key={column.stage.id}
                column={column}
                isOver={isOver}
                isValidDropTarget={isValidDropTarget}
                isInvalidDropTarget={isInvalidDropTarget}
                dropValidationMessage={isInvalidDropTarget ? dropValidation?.reason : undefined}
                isTaskMoving={isTaskMoving}
                onTaskClick={onTaskClick}
                onTaskEdit={onTaskEdit}
                onTaskDelete={onTaskDelete}
                onTaskComplete={onTaskComplete}
              />
            );
          })}
        </div>

        {/* Drag Overlay - Shows the dragged card */}
        <DragOverlay dropAnimation={null}>
          {activeTask && <TaskCardMinimalOverlay task={activeTask} />}
        </DragOverlay>
      </DndContext>
    </KanbanContainer>
  );
}

export default TaskKanbanBoard;
