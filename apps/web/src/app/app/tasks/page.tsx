'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListTodo,
  Loader2,
  Minus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  ENTITY_TYPE_LABELS,
  formatDaysUntilDue,
  getDueDateColor,
  getEntityInfo,
  isTaskOverdue,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_PRIORITY,
  TASK_STATUS,
  TASK_TYPE,
  TYPE_LABELS,
  useTaskManagement,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from '@/lib/tasks';

import { CompleteTaskDialog } from './components/complete-task-dialog';
import { DeleteTaskDialog } from './components/delete-task-dialog';
import { TaskFormDialog } from './components/task-form-dialog';

// ============================================
// Tasks List Page
// ============================================

export default function TasksPage() {
  const router = useRouter();

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<TaskPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = React.useState<TaskType | 'all'>('all');
  const [overdueFilter, setOverdueFilter] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editTask, setEditTask] = React.useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = React.useState<Task | null>(null);
  const [completeTask, setCompleteTask] = React.useState<Task | null>(null);

  // Data
  const {
    tasks,
    meta,
    statistics,
    isLoading,
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

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, typeFilter, overdueFilter]);

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get priority icon
  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-3 w-3" />;
      case 'high':
        return <ArrowUp className="h-3 w-3" />;
      case 'low':
        return <ArrowDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  // Quick complete handler
  const handleQuickComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeTaskAsync({ taskId: task.id });
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona tus tareas y actividades pendientes
          </p>
        </div>
        <RBACGuard fallback={null} minRole="sales_rep">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Tarea
          </Button>
        </RBACGuard>
      </div>

      <Separator />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                (statistics?.byStatus?.pending ?? 0) + (statistics?.byStatus?.inProgress ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              tareas pendientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.overdue ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              requieren atencion
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas Hoy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.completedToday ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              tareas finalizadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asignadas a Mi</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.assignedToMe ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar tareas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {TASK_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TASK_PRIORITY.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={typeFilter}
              onValueChange={(value) => setTypeFilter(value as TaskType | 'all')}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TASK_TYPE.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Overdue Filter */}
            <Button
              className={overdueFilter ? 'bg-red-500 hover:bg-red-600' : ''}
              size="sm"
              variant={overdueFilter ? 'default' : 'outline'}
              onClick={() => setOverdueFilter(!overdueFilter)}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Solo Vencidas
            </Button>

            {/* Refresh */}
            <Button size="icon" variant="outline" onClick={() => refetchTasks()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Tareas</CardTitle>
          <CardDescription>
            {meta?.total ?? 0} tareas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ListTodo className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Sin tareas</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron tareas con los filtros seleccionados
              </p>
              <RBACGuard fallback={null} minRole="sales_rep">
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera tarea
                </Button>
              </RBACGuard>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Tarea</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Relacionado</TableHead>
                    <TableHead>Asignado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
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
                        className={`cursor-pointer ${overdue ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                        onClick={() => router.push(`/app/tasks/${task.id}`)}
                      >
                        {/* Quick Complete Button */}
                        <TableCell>
                          {!isCompleted && task.status !== 'cancelled' && (
                            <Button
                              className="h-6 w-6"
                              disabled={isCompleting}
                              size="icon"
                              variant="ghost"
                              onClick={(e) => handleQuickComplete(task, e)}
                            >
                              <CheckCircle className="h-4 w-4 text-muted-foreground hover:text-green-500" />
                            </Button>
                          )}
                          {isCompleted && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </TableCell>

                        {/* Task Title */}
                        <TableCell>
                          <div>
                            <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge className={STATUS_COLORS[task.status]}>
                            {STATUS_LABELS[task.status]}
                          </Badge>
                        </TableCell>

                        {/* Type */}
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {TYPE_LABELS[task.type]}
                          </span>
                        </TableCell>

                        {/* Priority */}
                        <TableCell>
                          <Badge className={PRIORITY_COLORS[task.priority]}>
                            {getPriorityIcon(task.priority)}
                            <span className="ml-1">{PRIORITY_LABELS[task.priority]}</span>
                          </Badge>
                        </TableCell>

                        {/* Due Date */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className={getDueDateColor(task.dueDate, isCompleted)}>
                              {task.dueDate ? formatDaysUntilDue(task.dueDate) : '-'}
                            </span>
                          </div>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              {formatDate(task.dueDate)}
                            </p>
                          )}
                        </TableCell>

                        {/* Related Entity */}
                        <TableCell>
                          {entityInfo ? (
                            <div
                              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(entityInfo.path);
                              }}
                            >
                              <Badge className="text-xs" variant="outline">
                                {ENTITY_TYPE_LABELS[entityInfo.type]}
                              </Badge>
                              <span className="truncate max-w-[100px]">{entityInfo.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Assignee */}
                        <TableCell>
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(task.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate max-w-[80px]">
                                {task.assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/app/tasks/${task.id}`);
                                }}
                              >
                                Ver detalles
                              </DropdownMenuItem>
                              <RBACGuard fallback={null} minRole="sales_rep">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTask(task);
                                  }}
                                >
                                  Editar
                                </DropdownMenuItem>
                                {!isCompleted && task.status !== 'cancelled' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCompleteTask(task);
                                      }}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Completar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </RBACGuard>
                              <RBACGuard fallback={null} minRole="manager">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteTask(task);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </RBACGuard>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Pagina {meta.page} de {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={page <= 1}
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      disabled={page >= meta.totalPages}
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <TaskFormDialog
        open={isCreateOpen || !!editTask}
        task={editTask}
        onClose={() => {
          setIsCreateOpen(false);
          setEditTask(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteTaskDialog
        open={!!deleteTask}
        task={deleteTask}
        onClose={() => setDeleteTask(null)}
      />

      {/* Complete Dialog */}
      <CompleteTaskDialog
        open={!!completeTask}
        task={completeTask}
        onClose={() => setCompleteTask(null)}
      />
    </div>
  );
}
