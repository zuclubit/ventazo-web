'use client';

/**
 * TaskKanbanCard Component - v2.1 (Homologated Design)
 *
 * Draggable task card for Kanban board with:
 * - Priority indicator with semantic colors
 * - Due date with overdue highlighting
 * - Type badge with icons
 * - Entity link
 * - Assignee avatar
 * - Quick actions
 *
 * Design homologated with Ventazo Design System 2025.
 * Uses CSS variables for dynamic theming.
 *
 * @version 2.1.0
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
 * @module components/kanban/TaskKanbanCard
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  GripVertical,
  Link2,
  Loader2,
  Minus,
  MoreHorizontal,
  Clock,
  Phone,
  Mail,
  Users,
  RefreshCw,
  Monitor,
  FileText,
  Circle,
  CheckSquare,
} from 'lucide-react';

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
  type TaskType,
  type TaskPriority,
  PRIORITY_LABELS,
  TYPE_LABELS,
  isTaskOverdue,
  formatDaysUntilDue,
  getEntityInfo,
} from '@/lib/tasks/types';

// ============================================
// Types
// ============================================

export interface TaskKanbanCardProps {
  task: Task;
  isDragging?: boolean;
  isOverlay?: boolean;
  isMoving?: boolean;
  stageName?: string;
  stageColor?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onComplete?: () => void;
  className?: string;
}

// ============================================
// Design Tokens - Dynamic Theming v2.0
// Uses CSS variables for full theme consistency
// ============================================

/**
 * Priority styles with full dark mode support
 * Explicit colors for both light and dark themes for proper visibility
 */
const PRIORITY_STYLES: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  low: {
    bg: 'bg-[var(--priority-low-bg)]',
    text: 'text-[var(--priority-low)]',
    border: 'border-[var(--priority-low-border)]',
  },
  medium: {
    bg: 'bg-[var(--priority-medium-bg)]',
    text: 'text-[var(--priority-medium)]',
    border: 'border-[var(--priority-medium-border)]',
  },
  high: {
    bg: 'bg-[var(--priority-high-bg)]',
    text: 'text-[var(--priority-high)]',
    border: 'border-[var(--priority-high-border)]',
  },
  urgent: {
    bg: 'bg-[var(--priority-urgent-bg)]',
    text: 'text-[var(--priority-urgent)]',
    border: 'border-[var(--priority-urgent-border)]',
  },
};

/**
 * Task type styles - semantic colors with full dark mode support
 * Each type has explicit light/dark colors for proper visibility
 */
const TYPE_STYLES: Record<TaskType, { bg: string; text: string; border: string }> = {
  task: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
  call: {
    bg: 'bg-[var(--type-call-bg)]',
    text: 'text-[var(--type-call)]',
    border: 'border-[var(--type-call-border)]',
  },
  email: {
    bg: 'bg-[var(--type-email-bg)]',
    text: 'text-[var(--type-email)]',
    border: 'border-[var(--type-email-border)]',
  },
  meeting: {
    bg: 'bg-[var(--type-meeting-bg)]',
    text: 'text-[var(--type-meeting)]',
    border: 'border-[var(--type-meeting-border)]',
  },
  follow_up: {
    bg: 'bg-[var(--type-followup-bg)]',
    text: 'text-[var(--type-followup)]',
    border: 'border-[var(--type-followup-border)]',
  },
  demo: {
    bg: 'bg-[var(--type-demo-bg)]',
    text: 'text-[var(--type-demo)]',
    border: 'border-[var(--type-demo-border)]',
  },
  proposal: {
    bg: 'bg-[var(--type-proposal-bg)]',
    text: 'text-[var(--type-proposal)]',
    border: 'border-[var(--type-proposal-border)]',
  },
  other: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
};

// ============================================
// Helper Functions
// ============================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

// ============================================
// Type Icon Component
// ============================================

const TYPE_ICON_MAP: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  follow_up: RefreshCw,
  demo: Monitor,
  proposal: FileText,
  other: Circle,
};

function TypeIcon({ type, className }: { type: TaskType; className?: string }) {
  const Icon = TYPE_ICON_MAP[type] ?? Circle;
  return <Icon className={className} />;
}

// ============================================
// Priority Badge Component (v2.0 - CSS Variables)
// ============================================

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const icons: Record<TaskPriority, React.ReactNode> = {
    urgent: <AlertTriangle className="h-3 w-3" />,
    high: <ArrowUp className="h-3 w-3" />,
    medium: <Minus className="h-3 w-3" />,
    low: <ArrowDown className="h-3 w-3" />,
  };

  const styles = PRIORITY_STYLES[priority];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'border',
        'text-[10px] font-medium',
        CARD_TOKENS.transition.micro,
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {icons[priority]}
      <span>{PRIORITY_LABELS[priority]}</span>
    </span>
  );
}

// ============================================
// Type Badge Component (v2.0 - CSS Variables)
// ============================================

function TypeBadge({ type }: { type: TaskType }) {
  const styles = TYPE_STYLES[type];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'border',
        'text-[10px] font-medium',
        CARD_TOKENS.transition.micro,
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      <TypeIcon type={type} className="h-2.5 w-2.5" />
      <span>{TYPE_LABELS[type]}</span>
    </span>
  );
}

// ============================================
// Due Date Badge Component (v2.1 - Semantic Tokens)
// Uses new --due-* tokens for proper urgency hierarchy
// ============================================

function getDueDateState(dueDate: string): 'overdue' | 'today' | 'soon' | 'future' {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'future';
}

const DUE_DATE_STYLES = {
  overdue: 'text-[var(--due-overdue-text)] font-medium',
  today: 'text-[var(--due-today-text)] font-medium',
  soon: 'text-[var(--due-soon-text)]',
  future: 'text-muted-foreground',
} as const;

function DueDateBadge({ dueDate, isCompleted }: { dueDate: string | null | undefined; isCompleted: boolean }) {
  if (!dueDate) return null;

  const daysText = formatDaysUntilDue(dueDate);
  const state = isCompleted ? 'future' : getDueDateState(dueDate);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1',
        'text-[10px]',
        isCompleted ? 'text-muted-foreground/70' : DUE_DATE_STYLES[state]
      )}
    >
      <Calendar className="h-3 w-3" />
      <span>{daysText}</span>
    </span>
  );
}

// ============================================
// Assignee Badge Component (v2.0 - Dark Mode Support)
// ============================================

function AssigneeBadge({ assignee }: { assignee: Task['assignee'] }) {
  if (!assignee) {
    return (
      <span className="text-[10px] text-muted-foreground/70 italic">
        Sin asignar
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="h-5 w-5 border border-border">
        <AvatarFallback className="bg-muted text-muted-foreground text-[9px] font-semibold">
          {getInitials(assignee.name)}
        </AvatarFallback>
      </Avatar>
      <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">
        {assignee.name.split(' ')[0]}
      </span>
    </div>
  );
}

// ============================================
// Main Component (v2.0 - Homologated Design)
// ============================================

export function TaskKanbanCard({
  task,
  isDragging = false,
  isOverlay = false,
  isMoving = false,
  stageName,
  stageColor,
  onClick,
  onEdit,
  onDelete,
  onComplete,
  className,
}: TaskKanbanCardProps) {
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
  const isUrgent = task.priority === 'urgent' || task.priority === 'high';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
  };

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
          // Base - Premium Card
          'group relative',
          'p-3',
          CARD_TOKENS.radius.card,
          'border',
          CARD_TOKENS.transition.fast,
          // Background - Theme-aware using shadcn tokens
          'bg-card border-border/50',
          // Shadow - Enhanced for dark mode
          'shadow-sm dark:shadow-lg dark:shadow-black/20',
          // Hover - Interactive card states from CARD_TOKENS
          CARD_TOKENS.card.interactive,
          // Left border indicator - semantic hierarchy (per Design System Audit 2026)
          // Priority: overdue > urgent > high > normal
          overdue && 'border-l-[3px] border-l-[var(--due-overdue)]',
          task.priority === 'urgent' && !overdue && 'border-l-2 border-l-[var(--urgency-critical)]',
          task.priority === 'high' && !overdue && 'border-l-2 border-l-[var(--urgency-high)]',
          // Completed/cancelled styling
          isCompleted && 'opacity-70',
          isCancelled && 'opacity-50',
          // Dragging - from CARD_TOKENS
          isCurrentlyDragging && CARD_TOKENS.card.dragging,
          // Moving indicator
          isMoving && 'ring-2 ring-[var(--tenant-primary)] ring-offset-2 animate-pulse',
          // Cursor
          isCurrentlyDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {/* Loading overlay when moving */}
        {isMoving && (
          <div className={cn('absolute inset-0 bg-background/50 flex items-center justify-center z-10', CARD_TOKENS.radius.card)}>
            <Loader2 className="h-5 w-5 animate-spin text-[var(--tenant-primary)]" />
          </div>
        )}

        {/* Drag Handle - Desktop only */}
        <div className="hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity absolute left-1 top-1/2 -translate-y-1/2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        </div>

        {/* Content */}
        <div className="space-y-2.5">
          {/* Top Row: Priority + Type + Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
              <PriorityBadge priority={task.priority} />
              <TypeBadge type={task.type} />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {!isCompleted && !isCancelled && onComplete && (
                <button
                  type="button"
                  onClick={onComplete}
                  className={cn(
                    'flex items-center justify-center',
                    CARD_TOKENS.touchTarget.buttonSm,
                    CARD_TOKENS.radius.cardSm,
                    'text-muted-foreground',
                    'hover:bg-[var(--action-complete-bg)] hover:text-[var(--action-complete)]',
                    'hover:scale-105 active:scale-95',
                    CARD_TOKENS.transition.micro,
                    CARD_TOKENS.focus.ring
                  )}
                  aria-label="Completar tarea"
                >
                  <CheckCircle className="h-[18px] w-[18px]" />
                </button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn(
                    'flex items-center justify-center',
                    CARD_TOKENS.touchTarget.buttonSm,
                    CARD_TOKENS.radius.cardSm,
                    'text-muted-foreground hover:bg-muted',
                    CARD_TOKENS.transition.micro,
                    CARD_TOKENS.focus.ring
                  )}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={onEdit} className="py-2">
                    Editar
                  </DropdownMenuItem>
                  {!isCompleted && !isCancelled && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onComplete} className="py-2 text-[var(--action-complete)]">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Completar
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="py-2 text-[var(--status-error-text)]">
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Title - Homologated typography with theme-aware colors */}
          <h4
            className={cn(
              'font-semibold text-[14px] leading-tight line-clamp-2',
              'text-foreground',
              isCompleted && 'line-through text-muted-foreground',
              isCancelled && 'line-through text-muted-foreground/70'
            )}
          >
            {task.title}
          </h4>

          {/* Description (if available) - theme-aware */}
          {task.description && (
            <p className="text-[12px] text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}

          {/* Entity Link - Enhanced styling with theme-aware tokens */}
          {entityInfo && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Link2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <span className="text-muted-foreground">
                {entityInfo.type === 'lead' ? 'Lead' : entityInfo.type === 'customer' ? 'Cliente' : 'Opp'}:
              </span>
              <span className="text-[var(--link-entity)] truncate max-w-[140px] font-medium">
                {entityInfo.name}
              </span>
            </div>
          )}

          {/* Bottom Row: Due Date + Assignee */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <DueDateBadge dueDate={task.dueDate} isCompleted={isCompleted || isCancelled} />
            <AssigneeBadge assignee={task.assignee} />
          </div>

          {/* Overdue Indicator - SUBTLE, no aggressive banner
              Per Design System Audit 2026: Reduce red visual noise
              Already has: left border + DueDateBadge with red text */}
          {overdue && (
            <div className="flex items-center gap-1 text-[9px] text-[var(--due-overdue-text)] font-medium opacity-80">
              <Clock className="h-3 w-3" />
              <span>Vencida</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Overlay Component
// ============================================

export function TaskKanbanCardOverlay({ task }: { task: Task }) {
  return (
    <div style={{ width: 'clamp(260px, 80vw, 300px)' }} className="cursor-grabbing">
      <TaskKanbanCard task={task} isOverlay />
    </div>
  );
}

export default TaskKanbanCard;
