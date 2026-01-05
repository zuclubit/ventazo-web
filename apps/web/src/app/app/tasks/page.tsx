'use client';

/**
 * Tasks Page - v4.0 (Sheet-Based Modals)
 *
 * Updated to use Sheet components for consistent UX across modules.
 * Follows the same patterns as the Quotes module.
 *
 * Key improvements v4.0:
 * - Sheet-based create/edit modals (right side panel)
 * - Responsive: bottom sheet on mobile, right panel on desktop
 * - View mode in TaskDetailSheet for inline viewing
 * - Smooth transitions between view/edit modes
 *
 * @version 4.0.0
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RBACGuard } from '@/lib/auth';
import {
  getDueDateColor,
  getEntityInfo,
  isTaskOverdue,
  useTaskManagement,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type TaskViewMode,
} from '@/lib/tasks';

import { PageContainer } from '@/components/layout';
import { CompleteTaskDialog } from './components/complete-task-dialog';
import { DeleteTaskDialog } from './components/delete-task-dialog';
// Sheet components (new - homologated with Quotes module)
import { TaskCreateSheet } from './components/TaskCreateSheet';
import { TaskDetailSheet } from './components/TaskDetailSheet';
import { TaskKanbanBoard } from './components/kanban';
import { TaskStatsBar } from './components/TaskStatsBar';
import { TaskToolbar } from './components/TaskToolbar';
import {
  TaskListSkeleton,
  TaskKanbanBoardSkeleton,
  TaskStatsBarSkeleton,
  TaskToolbarSkeleton,
} from './components/TasksSkeleton';
import { useTasksKanban } from './hooks';
import { cn } from '@/lib/utils';

// ============================================
// Helper Functions
// ============================================

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
}

// Priority border colors for list view (using CSS variables from globals.css)
const PRIORITY_BORDER: Record<TaskPriority, string> = {
  urgent: 'border-l-[var(--urgency-critical)]',
  high: 'border-l-[var(--urgency-high)]',
  medium: 'border-l-[var(--urgency-medium)]',
  low: 'border-l-[var(--urgency-low)]',
};

// ============================================
// Tasks Page Component
// ============================================

export default function TasksPage() {
  const router = useRouter();

  // View mode
  const [viewMode, setViewMode] = React.useState<TaskViewMode>('kanban');

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = React.useState<TaskType | 'all'>('all');
  const [overdueFilter, setOverdueFilter] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Stats filter (from inline stats bar)
  const [statsFilter, setStatsFilter] = React.useState<'open' | 'overdue' | 'completed' | 'mine' | null>(null);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Apply stats filter to status filter
  React.useEffect(() => {
    if (statsFilter === 'open') {
      setStatusFilter('all');
      setOverdueFilter(false);
    } else if (statsFilter === 'overdue') {
      setOverdueFilter(true);
    } else if (statsFilter === 'completed') {
      setStatusFilter('completed');
      setOverdueFilter(false);
    } else if (statsFilter === 'mine') {
      // For 'mine' filter, we'd need to add assignedToMe filter
      // For now, just reset
      setStatusFilter('all');
      setOverdueFilter(false);
    }
  }, [statsFilter]);

  // Sheets & Dialogs
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [detailMode, setDetailMode] = React.useState<'view' | 'edit'>('view');
  const [deleteTask, setDeleteTask] = React.useState<Task | null>(null);
  const [completeTask, setCompleteTask] = React.useState<Task | null>(null);

  // Open task in view mode
  const handleViewTask = React.useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailMode('view');
  }, []);

  // Open task in edit mode
  const handleEditTask = React.useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailMode('edit');
  }, []);

  // Data for List view
  const {
    tasks,
    meta,
    statistics,
    isLoading: isListLoading,
    isStatisticsLoading,
    refetchTasks,
    completeTaskAsync,
    isCompleting,
  } = useTaskManagement({
    page,
    limit: pageSize,
    searchTerm: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    isOverdue: overdueFilter || undefined,
    includeCompleted: statusFilter === 'completed' || statusFilter === 'cancelled',
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  // Data for Kanban view
  const {
    columns,
    isLoading: isKanbanLoading,
    isMoving,
    isTaskMoving,
    moveToStatus,
    canMoveToStatus,
    refetchTasks: refetchKanban,
  } = useTasksKanban({
    includeCompleted: true,
    onCompletedAttempt: (task) => setCompleteTask(task),
    onCancelledAttempt: () => {},
  });

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, typeFilter, overdueFilter]);

  // Quick complete handler
  const handleQuickComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeTaskAsync({ taskId: task.id });
    } catch {
      // Error handled by mutation
    }
  };

  // Refresh
  const handleRefresh = () => {
    if (viewMode === 'kanban') {
      refetchKanban();
    } else {
      refetchTasks();
    }
  };

  const isLoading = viewMode === 'kanban' ? isKanbanLoading : isListLoading;

  return (
    <PageContainer variant={viewMode === 'kanban' ? 'full-bleed' : 'default'}>
      {/* Header - Homologated with Kanban design */}
      <div className="shrink-0 px-4 sm:px-6 pt-4 pb-3 header-container space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Tareas</h1>
            <p className="page-subtitle mt-0.5">
              Gestiona y organiza tus actividades
            </p>
          </div>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button size="sm" onClick={() => setIsCreateSheetOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nueva
            </Button>
          </RBACGuard>
        </div>

        {/* Stats Bar - inline, 44px */}
        <TaskStatsBar
          statistics={statistics}
          isLoading={isStatisticsLoading}
          activeFilter={statsFilter}
          onFilterClick={setStatsFilter}
        />

        {/* Toolbar - search + filters + view toggle */}
        <TaskToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          overdueFilter={overdueFilter}
          onOverdueFilterChange={setOverdueFilter}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Main Content */}
      <PageContainer.Body>
        <PageContainer.Content
          scroll={viewMode === 'kanban' ? 'horizontal' : 'vertical'}
          padding={viewMode === 'kanban' ? 'none' : 'md'}
        >
          {viewMode === 'kanban' ? (
            /* Kanban View */
            <TaskKanbanBoard
              columns={columns}
              isLoading={isKanbanLoading}
              isMoving={isMoving}
              canMoveToStatus={canMoveToStatus}
              isTaskMoving={isTaskMoving}
              onMoveToStatus={moveToStatus}
              onTaskClick={handleViewTask}
              onTaskEdit={handleEditTask}
              onTaskDelete={(task) => setDeleteTask(task)}
              onTaskComplete={(task) => setCompleteTask(task)}
            />
          ) : (
            /* List View - Simplified table */
            <div className="px-4 sm:px-6 pb-6">
              {isListLoading ? (
                <TaskListSkeleton rows={8} />
              ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ListTodo className="h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Sin tareas
                  </p>
                  <RBACGuard fallback={null} minRole="sales_rep">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-4"
                      onClick={() => setIsCreateSheetOpen(true)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Crear tarea
                    </Button>
                  </RBACGuard>
                </div>
              ) : (
                <>
                  {/* Minimal count */}
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {meta?.total ?? 0} tareas
                  </p>

                  {/* Table */}
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-8"></TableHead>
                          <TableHead className="text-xs">Tarea</TableHead>
                          <TableHead className="text-xs w-24">Vence</TableHead>
                          <TableHead className="text-xs w-20">Asignado</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.map((task) => {
                          const overdue = isTaskOverdue(task);
                          const entityInfo = getEntityInfo(task);
                          const isCompleted = task.status === 'completed';

                          return (
                            <TableRow
                              key={task.id}
                              className={cn(
                                'cursor-pointer transition-colors',
                                'hover:bg-muted/50',
                                // Priority left border
                                'border-l-[3px]',
                                PRIORITY_BORDER[task.priority],
                                // Overdue: subtle bg using semantic tokens
                                overdue && 'bg-[var(--due-overdue-bg)]'
                              )}
                              onClick={() => handleViewTask(task)}
                            >
                              {/* Complete button */}
                              <TableCell className="py-2 px-2">
                                {!isCompleted && task.status !== 'cancelled' ? (
                                  <Button
                                    className="h-6 w-6"
                                    disabled={isCompleting}
                                    size="icon"
                                    variant="ghost"
                                    onClick={(e) => handleQuickComplete(task, e)}
                                  >
                                    <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-[var(--task-status-completed)]" />
                                  </Button>
                                ) : isCompleted ? (
                                  <CheckCircle className="h-4 w-4 text-[var(--task-status-completed)] ml-1" />
                                ) : null}
                              </TableCell>

                              {/* Title + Entity */}
                              <TableCell className="py-2">
                                <div>
                                  <p className={cn(
                                    'text-[13px] font-medium line-clamp-1',
                                    isCompleted && 'line-through text-muted-foreground'
                                  )}>
                                    {task.title}
                                  </p>
                                  {entityInfo && (
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {entityInfo.name}
                                    </p>
                                  )}
                                </div>
                              </TableCell>

                              {/* Due date */}
                              <TableCell className="py-2">
                                <span className={cn(
                                  'text-[12px]',
                                  getDueDateColor(task.dueDate, isCompleted)
                                )}>
                                  {task.dueDate ? formatDate(task.dueDate) : '-'}
                                </span>
                              </TableCell>

                              {/* Assignee */}
                              <TableCell className="py-2">
                                {task.assignee ? (
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[9px]">
                                      {getInitials(task.assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/50">-</span>
                                )}
                              </TableCell>

                              {/* Actions - hidden by default */}
                              <TableCell className="py-2 px-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    >
                                      <span className="sr-only">Menú</span>
                                      ···
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-32">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditTask(task);
                                      }}
                                      className="text-[13px]"
                                    >
                                      Editar
                                    </DropdownMenuItem>
                                    {!isCompleted && task.status !== 'cancelled' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-[13px] text-[var(--task-status-completed-text)]"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCompleteTask(task);
                                          }}
                                        >
                                          Completar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-[13px] text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteTask(task);
                                      }}
                                    >
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination - simplified */}
                  {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-[11px] text-muted-foreground">
                        {meta.page}/{meta.totalPages}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          disabled={page <= 1}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          disabled={page >= meta.totalPages}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </PageContainer.Content>
      </PageContainer.Body>

      {/* Sheets (new - right side panel) */}
      <TaskCreateSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        onSuccess={() => {
          if (viewMode === 'kanban') {
            refetchKanban();
          } else {
            refetchTasks();
          }
        }}
      />

      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        defaultMode={detailMode}
        onSuccess={(updatedTask) => {
          setSelectedTask(updatedTask);
          if (viewMode === 'kanban') {
            refetchKanban();
          } else {
            refetchTasks();
          }
        }}
        onDelete={() => {
          setSelectedTask(null);
          if (viewMode === 'kanban') {
            refetchKanban();
          } else {
            refetchTasks();
          }
        }}
      />

      {/* Confirmation Dialogs */}
      <DeleteTaskDialog
        open={!!deleteTask}
        task={deleteTask}
        onClose={() => setDeleteTask(null)}
      />

      <CompleteTaskDialog
        open={!!completeTask}
        task={completeTask}
        onClose={() => setCompleteTask(null)}
      />
    </PageContainer>
  );
}
