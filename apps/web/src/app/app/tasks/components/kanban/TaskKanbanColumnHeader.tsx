'use client';

/**
 * TaskKanbanColumnHeader Component - v2.0 (Minimal)
 *
 * Simplified header: UPPERCASE title + count only.
 * No icons, no decorations.
 *
 * @version 2.0.0
 * @module components/kanban/TaskKanbanColumnHeader
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/tasks/types';

// ============================================
// Types
// ============================================

export interface TaskKanbanColumnHeaderProps {
  status: TaskStatus;
  title: string;
  count: number;
  color: string;
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function TaskKanbanColumnHeader({
  title,
  count,
  color,
  className,
}: TaskKanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        // Container
        'flex items-center justify-between',
        'px-3 py-2',
        // Background
        'bg-transparent',
        // Border bottom with stage color
        'border-b-2',
        className
      )}
      style={{ borderBottomColor: color }}
    >
      {/* Title - UPPERCASE */}
      <h3 className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>

      {/* Count */}
      <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  );
}

export default TaskKanbanColumnHeader;
