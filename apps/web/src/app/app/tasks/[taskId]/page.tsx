'use client';

import * as React from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  ExternalLink,
  Loader2,
  MessageSquare,
  Minus,
  MoreHorizontal,
  RefreshCw,
  Send,
  Trash2,
  User,
  XCircle,
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import {
  ACTIVITY_COLORS,
  ACTIVITY_LABELS,
  ENTITY_TYPE_LABELS,
  formatDaysUntilDue,
  getDueDateColor,
  getEntityInfo,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
  useCancelTask,
  useCompleteTask,
  useReopenTask,
  useTaskCommentsManagement,
  useTaskDetail,
  type TaskPriority,
} from '@/lib/tasks';

import { CompleteTaskDialog } from '../components/complete-task-dialog';
import { DeleteTaskDialog } from '../components/delete-task-dialog';
import { TaskFormDialog } from '../components/task-form-dialog';

// ============================================
// Task Detail Page
// ============================================

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const taskId = params['taskId'] as string;

  // Tab state
  const [activeTab, setActiveTab] = React.useState('overview');

  // Dialog states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = React.useState(false);

  // Comment state
  const [newComment, setNewComment] = React.useState('');

  // Data
  const {
    task,
    isTaskLoading,
    taskError,
    comments,
    isCommentsLoading,
    activity,
    isActivityLoading,
    refetchTask,
  } = useTaskDetail(taskId);

  // Comments management
  const {
    addCommentAsync,
    isAdding: isAddingComment,
    deleteCommentAsync,
  } = useTaskCommentsManagement(taskId);

  // Task actions
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();

  // Handle quick complete
  const handleQuickComplete = async () => {
    try {
      await completeTask.mutateAsync({ taskId });
      toast({
        title: 'Tarea completada',
        description: 'La tarea ha sido marcada como completada.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo completar la tarea.',
        variant: 'destructive',
      });
    }
  };

  // Handle cancel
  const handleCancel = async () => {
    try {
      await cancelTask.mutateAsync({ taskId, data: { reason: 'Cancelada por usuario' } });
      toast({
        title: 'Tarea cancelada',
        description: 'La tarea ha sido cancelada.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la tarea.',
        variant: 'destructive',
      });
    }
  };

  // Handle reopen
  const handleReopen = async () => {
    try {
      await reopenTask.mutateAsync(taskId);
      toast({
        title: 'Tarea reabierta',
        description: 'La tarea ha sido reabierta.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo reabrir la tarea.',
        variant: 'destructive',
      });
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentAsync({ content: newComment.trim() });
      setNewComment('');
      toast({
        title: 'Comentario agregado',
        description: 'Tu comentario ha sido agregado.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el comentario.',
        variant: 'destructive',
      });
    }
  };

  // Handle delete comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentAsync(commentId);
      toast({
        title: 'Comentario eliminado',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el comentario.',
        variant: 'destructive',
      });
    }
  };

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
      month: 'long',
      year: 'numeric',
    });
  };

  // Format time ago
  const formatTimeAgo = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: es,
    });
  };

  // Get priority icon
  const getPriorityIcon = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <ArrowUp className="h-4 w-4" />;
      case 'low':
        return <ArrowDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  // Loading state
  if (isTaskLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (taskError || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <XCircle className="h-12 w-12 text-destructive/50" />
        <h2 className="mt-4 text-lg font-semibold">Tarea no encontrada</h2>
        <p className="text-muted-foreground">La tarea que buscas no existe o fue eliminada.</p>
        <Button className="mt-4" onClick={() => router.push('/app/tasks')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a tareas
        </Button>
      </div>
    );
  }

  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const entityInfo = getEntityInfo(task);

  return (
    <div className="space-y-6 p-6">
      {/* Back button & Header */}
      <div className="flex items-center gap-4">
        <Button size="icon" variant="ghost" onClick={() => router.push('/app/tasks')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className={`text-2xl font-bold tracking-tight ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {task.title}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={STATUS_COLORS[task.status]}>
              {STATUS_LABELS[task.status]}
            </Badge>
            <Badge className={TYPE_COLORS[task.type]}>
              {TYPE_LABELS[task.type]}
            </Badge>
            <Badge className={PRIORITY_COLORS[task.priority]}>
              {getPriorityIcon(task.priority)}
              <span className="ml-1">{PRIORITY_LABELS[task.priority]}</span>
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => refetchTask()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Quick actions */}
          {!isCompleted && !isCancelled && (
            <RBACGuard fallback={null} minRole="sales_rep">
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={completeTask.isPending}
                onClick={handleQuickComplete}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Completar
              </Button>
            </RBACGuard>
          )}

          {(isCompleted || isCancelled) && (
            <RBACGuard fallback={null} minRole="sales_rep">
              <Button
                disabled={reopenTask.isPending}
                variant="outline"
                onClick={handleReopen}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reabrir
              </Button>
            </RBACGuard>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <RBACGuard fallback={null} minRole="sales_rep">
                <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                {!isCompleted && !isCancelled && (
                  <>
                    <DropdownMenuItem
                      className="text-green-600"
                      onClick={() => setIsCompleteOpen(true)}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completar con notas
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-orange-600"
                      onClick={handleCancel}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar
                    </DropdownMenuItem>
                  </>
                )}
              </RBACGuard>
              <RBACGuard fallback={null} minRole="manager">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </RBACGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencimiento</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${getDueDateColor(task.dueDate, isCompleted)}`}>
              {task.dueDate ? formatDaysUntilDue(task.dueDate) : 'Sin fecha'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(task.dueDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asignado a</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {task.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {getInitials(task.assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{task.assignee.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Sin asignar</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Creada</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {formatTimeAgo(task.createdAt)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(task.createdAt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relacionado</CardTitle>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {entityInfo ? (
              <Link
                className="text-blue-600 hover:underline flex items-center gap-1"
                href={entityInfo.path}
              >
                <Badge className="text-xs" variant="outline">
                  {ENTITY_TYPE_LABELS[entityInfo.type]}
                </Badge>
                <span className="truncate">{entityInfo.name}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground">Ninguno</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Detalles</TabsTrigger>
          <TabsTrigger value="comments">
            Comentarios ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            Actividad ({activity.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Descripcion</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <p className="whitespace-pre-wrap">{task.description}</p>
              ) : (
                <p className="text-muted-foreground italic">Sin descripcion</p>
              )}
            </CardContent>
          </Card>

          {task.outcome && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Resultado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{task.outcome}</p>
                {task.completedAt && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Completada el {formatDate(task.completedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Etiquetas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent className="space-y-4" value="comments">
          {/* Add Comment */}
          <Card>
            <CardHeader>
              <CardTitle>Agregar Comentario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Escribe un comentario..."
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  disabled={!newComment.trim() || isAddingComment}
                  onClick={handleAddComment}
                >
                  {isAddingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comments List */}
          {isCommentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">Sin comentarios</p>
                <p className="text-sm text-muted-foreground">
                  Se el primero en agregar un comentario
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.author ? getInitials(comment.author.name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {comment.author?.name ?? 'Usuario'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.createdAt)}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="h-6 w-6"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent className="space-y-4" value="activity">
          {isActivityLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activity.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">Sin actividad</p>
                <p className="text-sm text-muted-foreground">
                  El historial de actividad aparecera aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Actividad</CardTitle>
                <CardDescription>
                  Todos los cambios y acciones realizadas en esta tarea
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                  <div className="space-y-6">
                    {activity.map((entry) => (
                      <div key={entry.id} className="relative flex gap-4 pl-10">
                        {/* Timeline dot */}
                        <div className="absolute left-[9px] w-3 h-3 rounded-full bg-background border-2 border-primary" />

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className={ACTIVITY_COLORS[entry.action] || 'bg-gray-100'}>
                              {ACTIVITY_LABELS[entry.action] || entry.action}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(entry.createdAt)}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {entry.description}
                            </p>
                          )}
                          {entry.user && (
                            <p className="text-xs text-muted-foreground mt-1">
                              por {entry.user.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TaskFormDialog
        open={isEditOpen}
        task={task}
        onClose={() => setIsEditOpen(false)}
      />

      <DeleteTaskDialog
        open={isDeleteOpen}
        task={task}
        onClose={() => {
          setIsDeleteOpen(false);
          router.push('/app/tasks');
        }}
      />

      <CompleteTaskDialog
        open={isCompleteOpen}
        task={task}
        onClose={() => setIsCompleteOpen(false)}
      />
    </div>
  );
}
