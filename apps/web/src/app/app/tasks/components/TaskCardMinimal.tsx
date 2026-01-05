'use client';

/**
 * TaskCardMinimal - 72px height task card
 *
 * Layout:
 * ┌─────────────────────────────────┐
 * │ Título de la tarea              │  ← max 2 lines, truncate
 * │ Cliente · Vence hoy        [AV] │  ← meta + avatar
 * └─────────────────────────────────┘
 *   ↑ left border 3px = priority (red/yellow/green)
 *
 * Removed:
 * - Contact icons (phone, email, chat)
 * - Tier badges (PREMIUM/ENTERPRISE)
 * - Score with heart
 * - Vague timestamps ("~9 hours ago")
 * - Visible menu (only on hover)
 * - Redundant status badges
 *
 * @version 1.1.0
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle, Loader2, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CARD_TOKENS } from '@/components/cards';
import {
  type Task,
  type TaskPriority,
  formatDaysUntilDue,
  getEntityInfo,
  isTaskOverdue,
} from '@/lib/tasks/types';

// ============================================
// Types
// ============================================

export interface TaskCardMinimalProps {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
  isMoving?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  className?: string;
}

// ============================================
// Priority border colors
// ============================================

const PRIORITY_BORDER_COLORS: Record<TaskPriority, string> = {
  urgent: 'border-l-[var(--priority-urgent)]',
  high: 'border-l-[var(--priority-high)]',
  medium: 'border-l-[var(--priority-medium)]',
  low: 'border-l-[var(--priority-low)]',
};

// ============================================
// Helper Functions
// ============================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getDueDateDisplay(dueDate: string | null | undefined, isCompleted: boolean): string | null {
  if (!dueDate || isCompleted) return null;
  return formatDaysUntilDue(dueDate);
}

// ============================================
// Main Component
// ============================================

export function TaskCardMinimal({
  task,
  isDragging = false,
  isOverlay = false,
  isMoving = false,
  onClick,
  onEdit,
  onDelete,
  onComplete,
  className,
}: TaskCardMinimalProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const overdue = isTaskOverdue(task);
  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const entityInfo = getEntityInfo(task);
  const dueDateDisplay = getDueDateDisplay(task.dueDate, isCompleted || isCancelled);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
  };

  // Build meta line: "Cliente · Vence hoy"
  const metaParts: string[] = [];
  if (entityInfo?.name) {
    metaParts.push(entityInfo.name);
  }
  if (dueDateDisplay) {
    metaParts.push(dueDateDisplay);
  }
  const metaLine = metaParts.join(' · ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isCurrentlyDragging && !isOverlay && 'z-0',
        isOverlay && 'shadow-2xl',
        className
      )}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={!isOverlay && !isCurrentlyDragging ? onClick : undefined}
        className={cn(
          // Base - 72px height via padding
          'group relative',
          'h-[72px]',
          'px-3 py-2.5',
          CARD_TOKENS.radius.card,
          CARD_TOKENS.transition.fast,
          // Background
          'bg-card',
          'border border-border',
          // Priority border left (3px)
          'border-l-[3px]',
          PRIORITY_BORDER_COLORS[task.priority],
          // Shadow
          'shadow-sm',
          // Hover - Interactive card states from CARD_TOKENS
          CARD_TOKENS.card.interactive,
          // Completed/cancelled styling
          isCompleted && 'opacity-70',
          isCancelled && 'opacity-50',
          // Overdue subtle highlight
          overdue && 'bg-[var(--urgency-overdue-bg)]',
          // Dragging
          isCurrentlyDragging && CARD_TOKENS.card.dragging,
          // Moving indicator
          isMoving && 'ring-2 ring-primary ring-offset-2 animate-pulse',
          // Cursor
          isCurrentlyDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {/* Loading overlay when moving */}
        {isMoving && (
          <div className={cn('absolute inset-0 bg-background/50 flex items-center justify-center z-10', CARD_TOKENS.radius.card)}>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        )}

        {/* Content Layout */}
        <div className="h-full flex flex-col justify-between">
          {/* Title - max 2 lines */}
          <h4
            className={cn(
              'font-medium text-[13px] leading-tight line-clamp-2',
              'text-foreground',
              isCompleted && 'line-through text-muted-foreground',
              isCancelled && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </h4>

          {/* Meta line + Avatar */}
          <div className="flex items-center justify-between gap-2">
            {/* Meta: Cliente · Vence hoy */}
            <span
              className={cn(
                'text-[11px] truncate flex-1',
                overdue ? 'text-[var(--urgency-overdue-text)] font-medium' : 'text-muted-foreground'
              )}
            >
              {metaLine || '\u00A0'}
            </span>

            {/* Avatar + Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Quick complete - only visible on hover */}
              {!isCompleted && !isCancelled && onComplete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  className={cn(
                    'opacity-0 group-hover:opacity-100',
                    'flex items-center justify-center',
                    CARD_TOKENS.touchTarget.icon,
                    CARD_TOKENS.radius.cardSm,
                    'text-muted-foreground hover:text-[var(--action-complete)]',
                    'hover:bg-[var(--action-complete-bg)]',
                    CARD_TOKENS.transition.micro,
                    CARD_TOKENS.focus.ring
                  )}
                  aria-label="Completar tarea"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Menu - only visible on hover */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'opacity-0 group-hover:opacity-100',
                      'flex items-center justify-center',
                      CARD_TOKENS.touchTarget.icon,
                      CARD_TOKENS.radius.cardSm,
                      'text-muted-foreground hover:text-foreground',
                      'hover:bg-muted',
                      CARD_TOKENS.transition.micro,
                      CARD_TOKENS.focus.ring
                    )}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={onEdit} className="text-[13px]">
                    Editar
                  </DropdownMenuItem>
                  {!isCompleted && !isCancelled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onComplete}
                        className="text-[13px] text-[var(--action-complete)]"
                      >
                        Completar
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-[13px] text-destructive"
                  >
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Avatar */}
              {task.assignee ? (
                <Avatar className="h-5 w-5 border border-border">
                  <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-semibold">
                    {getInitials(task.assignee.name)}
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Overlay Component
// ============================================

export function TaskCardMinimalOverlay({ task }: { task: Task }) {
  return (
    <div style={{ width: '280px' }} className="cursor-grabbing">
      <TaskCardMinimal task={task} isOverlay />
    </div>
  );
}

export default TaskCardMinimal;
