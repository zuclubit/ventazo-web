'use client';

/**
 * TaskKanbanEmptyColumn Component - v2.0 (Minimal)
 *
 * Empty state: text only, no large icons.
 * Just a simple message.
 *
 * @version 2.0.0
 * @module components/kanban/TaskKanbanEmptyColumn
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/tasks/types';

// ============================================
// Types
// ============================================

export interface TaskKanbanEmptyColumnProps {
  status: TaskStatus;
  statusName: string;
  statusColor: string;
  isOver?: boolean;
  className?: string;
}

// ============================================
// Messages per status
// ============================================

const EMPTY_MESSAGES: Record<TaskStatus, string> = {
  pending: 'Sin tareas',
  in_progress: 'Sin tareas',
  completed: 'Sin completadas',
  deferred: 'Sin diferidas',
  cancelled: 'Sin canceladas',
};

// ============================================
// Main Component
// ============================================

export function TaskKanbanEmptyColumn({
  status,
  isOver = false,
  className,
}: TaskKanbanEmptyColumnProps) {
  return (
    <div
      className={cn(
        // Base
        'flex items-center justify-center',
        'py-6 px-3',
        // Border - minimal dashed
        'border border-dashed rounded-lg',
        'border-border/50',
        // Transition
        'transition-all duration-150',
        // Drop target highlight
        isOver && 'border-primary/40 bg-primary/5 border-solid',
        className
      )}
    >
      {/* Text only */}
      <p className={cn(
        'text-[12px] text-muted-foreground/50',
        isOver && 'text-primary font-medium'
      )}>
        {isOver ? 'Soltar aquí' : EMPTY_MESSAGES[status]}
      </p>
    </div>
  );
}

export default TaskKanbanEmptyColumn;
