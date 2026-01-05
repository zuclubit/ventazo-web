'use client';

/**
 * TaskKanbanColumn Component - v2.0 (Homologated)
 *
 * Droppable column for task Kanban board with:
 * - Drop zone visual feedback
 * - Validation indicators (green/red rings)
 * - Per-task loading states
 * - Premium glass container styling (kanban-column-premium)
 * - Smooth transitions
 *
 * Layout Architecture:
 * - Column has FULL height from parent (TaskKanbanBoard h-full)
 * - Fixed width using CSS clamp()
 * - Internal structure: Header (shrink-0) + Cards (flex-1 overflow-y-auto)
 *
 * Homologated with:
 * - LeadsKanbanColumn
 * - OpportunityKanbanColumn
 * - CustomerKanbanColumn
 *
 * @version 2.0.0
 * @module components/kanban/TaskKanbanColumn
 */

import * as React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PipelineColumnEmptyState,
  COLUMN_TOKENS,
} from '@/components/pipeline';
import type { Task, TaskKanbanColumn as TaskKanbanColumnType } from '@/lib/tasks/types';
import { TaskKanbanColumnHeader } from './TaskKanbanColumnHeader';
import { TaskCardMinimal } from '../TaskCardMinimal';

// ============================================
// Types
// ============================================

export interface TaskKanbanColumnProps {
  /** Column data with stage info and tasks */
  column: TaskKanbanColumnType;
  /** Whether a dragged item is over this column */
  isOver?: boolean;
  /** Whether the drop is valid (for visual feedback) - green ring */
  isValidDropTarget?: boolean;
  /** Whether the drop is invalid (for visual feedback) - red ring */
  isInvalidDropTarget?: boolean;
  /** Message to show when drop is invalid */
  dropValidationMessage?: string;
  /** Function to check if a specific task is being moved */
  isTaskMoving?: (taskId: string) => boolean;
  /** Click handler when a task card is clicked */
  onTaskClick?: (task: Task) => void;
  /** Edit handler */
  onTaskEdit?: (task: Task) => void;
  /** Delete handler */
  onTaskDelete?: (task: Task) => void;
  /** Complete handler */
  onTaskComplete?: (task: Task) => void;
  /** Additional CSS classes */
  className?: string;
}

// Column width configuration (from Design System)
const COLUMN_STYLE = {
  width: `clamp(${COLUMN_TOKENS.width.min}, 20vw, ${COLUMN_TOKENS.width.max})`,
};

// ============================================
// Main Component
// ============================================

export function TaskKanbanColumn({
  column,
  isOver = false,
  isValidDropTarget = false,
  isInvalidDropTarget = false,
  dropValidationMessage,
  isTaskMoving,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onTaskComplete,
  className,
}: TaskKanbanColumnProps) {
  const { stage, tasks, count } = column;

  // Make the column droppable
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  // Combine internal and external isOver states
  const isDropTarget = isOver || isDroppableOver;
  const isHighlighted = isDropTarget && !isValidDropTarget && !isInvalidDropTarget;

  // Get task IDs for SortableContext
  const taskIds = React.useMemo(() => tasks.map((task) => task.id), [tasks]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Premium glass container (homologated with leads/opportunities/customers)
        'kanban-column-premium',
        // Flex column layout
        'flex flex-col',
        // Full height from parent
        'h-full',
        // Never shrink
        'shrink-0 grow-0',
        // Relative for overlays
        'relative',
        // Transition for drop feedback
        'transition-all duration-300',
        // Valid drop target - success ring (uses task-status-completed color)
        isValidDropTarget && 'ring-2 ring-[var(--task-status-completed)] ring-offset-2 ring-offset-background',
        // Invalid drop target - error ring with dimming (uses task-status-cancelled color)
        isInvalidDropTarget && 'ring-2 ring-[var(--task-status-cancelled)] ring-offset-2 ring-offset-background opacity-75',
        // Neutral highlight when dragging over
        isHighlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={COLUMN_STYLE}
      data-kanban-column
      role="listbox"
      aria-label={`${stage.label} - ${count} tareas`}
    >
      {/* Column Header */}
      <div className="shrink-0 sticky top-0 z-10">
        <TaskKanbanColumnHeader
          status={stage.id}
          title={stage.label}
          count={count}
          color={stage.color}
        />
      </div>

      {/* Cards Container - Scrollable */}
      <div
        className={cn(
          'flex-1',
          'min-h-0',
          'p-2.5 sm:p-3',
          'pt-2',
          'overflow-y-auto overflow-x-hidden',
          '-webkit-overflow-scrolling-touch',
          'space-y-2.5 sm:space-y-3',
          'scrollbar-thin'
        )}
        role="list"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <PipelineColumnEmptyState
              stageId={stage.id}
              stageName={stage.label}
              stageColor={stage.color}
              pipelineType="leads"
              isDropTarget={isHighlighted}
              size="md"
            />
          ) : (
            tasks.map((task, index) => (
              <div
                key={task.id}
                className="animate-card-enter"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TaskCardMinimal
                  task={task}
                  isMoving={isTaskMoving?.(task.id)}
                  onClick={() => onTaskClick?.(task)}
                  onEdit={() => onTaskEdit?.(task)}
                  onDelete={() => onTaskDelete?.(task)}
                  onComplete={() => onTaskComplete?.(task)}
                />
              </div>
            ))
          )}
        </SortableContext>

        {/* Drop indicator when dragging over non-empty column */}
        {isHighlighted && tasks.length > 0 && (
          <div
            className={cn(
              'h-2 rounded-full mx-2',
              'bg-gradient-to-r from-transparent via-primary/40 to-transparent',
              'animate-pulse'
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Valid Drop Overlay - Success tint */}
      {isValidDropTarget && (
        <div
          className="absolute inset-0 rounded-xl bg-[var(--task-status-completed-bg)] pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Invalid Drop Overlay - Error tint with message */}
      {isInvalidDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-[var(--task-status-cancelled-bg)] pointer-events-none flex items-center justify-center z-20">
          <div className="bg-[var(--task-status-cancelled-bg)] border border-[var(--task-status-cancelled-border)] px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 max-w-[250px]">
            <Ban className="h-4 w-4 text-[var(--task-status-cancelled)] shrink-0" />
            <span className="text-xs text-[var(--task-status-cancelled-text)] font-medium">
              {dropValidationMessage || 'Acción no permitida'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskKanbanColumn;
