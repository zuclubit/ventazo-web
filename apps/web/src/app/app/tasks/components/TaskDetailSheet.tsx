'use client';

/**
 * TaskDetailSheet - Enterprise Task Detail Panel (v3.0)
 *
 * Full-featured task detail panel inspired by Salesforce, HubSpot, and modern CRM patterns.
 * Includes tabbed interface with Details, Comments, and Activity Timeline.
 *
 * Features:
 * - Responsive: Right-side panel with fluid width (mobile-first approach)
 * - Homologated with LeadDetailSheet for consistent UX
 * - Tabbed navigation: Details / Comments / Activity
 * - Real-time comments with @mentions support
 * - Activity timeline with visual indicators
 * - Complete task lifecycle actions
 * - Outcome tracking for completed tasks
 * - Related entity linking
 * - Recurrence display
 * - Safe-area handling for mobile devices
 *
 * Design References:
 * - Dribbble: Task Management App patterns
 * - Wrike: Activity Feed design
 * - Todoist/Asana: Comments and collaboration
 *
 * @version 3.0.0
 * @module tasks/components/TaskDetailSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  FileText,
  Flag,
  History,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Send,
  Tag,
  Target,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { sanitizeTaskData, sanitizeTags } from '@/lib/security/form-sanitizer';
import { CommentSection } from '@/components/comments';
import { AttachmentSection } from '@/components/ui/attachment-section';
import type { Task, TaskType, TaskPriority, TaskStatus, TaskComment, TaskActivity, TaskActivityAction } from '@/lib/tasks/types';
import {
  TASK_TYPE,
  TASK_PRIORITY,
  TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  ACTIVITY_LABELS,
  RECURRENCE_LABELS,
  isTaskOverdue,
  getDaysUntilDue,
  getEntityInfo,
} from '@/lib/tasks/types';
import {
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useCancelTask,
  useReopenTask,
  useTaskComments,
  useAddTaskComment,
  useDeleteTaskComment,
  useTaskActivity,
} from '@/lib/tasks/hooks';

// ============================================
// Types & Schema
// ============================================

type DetailMode = 'view' | 'edit';
type TabValue = 'details' | 'comments' | 'activity';

export interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  defaultMode?: DetailMode;
  defaultTab?: TabValue;
  isLoading?: boolean;
}

const taskFormSchema = z.object({
  title: z.string().min(2, 'El titulo debe tener al menos 2 caracteres').max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPE),
  priority: z.enum(TASK_PRIORITY),
  dueDate: z.date().optional().nullable(),
  reminderAt: z.date().optional().nullable(),
  tags: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

// ============================================
// Status & Priority Configuration
// ============================================

/**
 * STATUS_CONFIG - Uses CSS variables for dynamic theming
 * Variables defined in globals.css under TASKS MODULE section
 * Automatically adapts to light/dark mode via CSS variable overrides
 */
const STATUS_CONFIG: Record<TaskStatus, {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: typeof Clock;
}> = {
  pending: {
    color: 'var(--task-status-pending)',
    bgColor: 'bg-[var(--task-status-pending-bg)]',
    textColor: 'text-[var(--task-status-pending-text)]',
    borderColor: 'border-[var(--task-status-pending-border)]',
    icon: Clock,
  },
  in_progress: {
    color: 'var(--task-status-in-progress)',
    bgColor: 'bg-[var(--task-status-in-progress-bg)]',
    textColor: 'text-[var(--task-status-in-progress-text)]',
    borderColor: 'border-[var(--task-status-in-progress-border)]',
    icon: Play,
  },
  completed: {
    color: 'var(--task-status-completed)',
    bgColor: 'bg-[var(--task-status-completed-bg)]',
    textColor: 'text-[var(--task-status-completed-text)]',
    borderColor: 'border-[var(--task-status-completed-border)]',
    icon: CheckCircle,
  },
  cancelled: {
    color: 'var(--task-status-cancelled)',
    bgColor: 'bg-[var(--task-status-cancelled-bg)]',
    textColor: 'text-[var(--task-status-cancelled-text)]',
    borderColor: 'border-[var(--task-status-cancelled-border)]',
    icon: XCircle,
  },
  deferred: {
    color: 'var(--task-status-deferred)',
    bgColor: 'bg-[var(--task-status-deferred-bg)]',
    textColor: 'text-[var(--task-status-deferred-text)]',
    borderColor: 'border-[var(--task-status-deferred-border)]',
    icon: Pause,
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, {
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  low: {
    color: 'var(--task-priority-low)',
    bgColor: 'bg-[var(--task-priority-low-bg)]',
    textColor: 'text-[var(--task-priority-low-text)]',
  },
  medium: {
    color: 'var(--task-priority-medium)',
    bgColor: 'bg-[var(--task-priority-medium-bg)]',
    textColor: 'text-[var(--task-priority-medium-text)]',
  },
  high: {
    color: 'var(--task-priority-high)',
    bgColor: 'bg-[var(--task-priority-high-bg)]',
    textColor: 'text-[var(--task-priority-high-text)]',
  },
  urgent: {
    color: 'var(--task-priority-urgent)',
    bgColor: 'bg-[var(--task-priority-urgent-bg)]',
    textColor: 'text-[var(--task-priority-urgent-text)]',
  },
};

const TYPE_CONFIG: Record<TaskType, { icon: typeof Clock; color: string }> = {
  task: { icon: CheckCircle, color: 'text-muted-foreground' },
  call: { icon: Phone, color: 'text-[var(--task-type-call)]' },
  email: { icon: Mail, color: 'text-[var(--task-type-email)]' },
  meeting: { icon: Users, color: 'text-[var(--task-type-meeting)]' },
  follow_up: { icon: RefreshCw, color: 'text-[var(--task-type-follow-up)]' },
  demo: { icon: Target, color: 'text-[var(--task-type-demo)]' },
  proposal: { icon: FileText, color: 'text-[var(--task-type-proposal)]' },
  other: { icon: MoreHorizontal, color: 'text-muted-foreground' },
};

const ACTIVITY_ICON_CONFIG: Record<TaskActivityAction, { icon: typeof Clock; color: string }> = {
  created: { icon: Plus, color: 'text-[var(--task-activity-created)] bg-[var(--task-activity-created-bg)]' },
  updated: { icon: Edit3, color: 'text-[var(--task-activity-updated)] bg-[var(--task-activity-updated-bg)]' },
  completed: { icon: CheckCircle, color: 'text-[var(--task-activity-completed)] bg-[var(--task-activity-completed-bg)]' },
  cancelled: { icon: XCircle, color: 'text-[var(--task-activity-cancelled)] bg-[var(--task-activity-cancelled-bg)]' },
  deferred: { icon: Pause, color: 'text-[var(--task-activity-deferred)] bg-[var(--task-activity-deferred-bg)]' },
  reassigned: { icon: Users, color: 'text-[var(--task-activity-reassigned)] bg-[var(--task-activity-reassigned-bg)]' },
  status_changed: { icon: RefreshCw, color: 'text-[var(--task-activity-status-changed)] bg-[var(--task-activity-status-changed-bg)]' },
  priority_changed: { icon: Flag, color: 'text-[var(--task-activity-priority-changed)] bg-[var(--task-activity-priority-changed-bg)]' },
  due_date_changed: { icon: Calendar, color: 'text-[var(--task-activity-due-date-changed)] bg-[var(--task-activity-due-date-changed-bg)]' },
  comment_added: { icon: MessageCircle, color: 'text-muted-foreground bg-muted' },
  comment_updated: { icon: Edit3, color: 'text-muted-foreground bg-muted' },
  comment_deleted: { icon: Trash2, color: 'text-muted-foreground bg-muted' },
};

// ============================================
// Helper Functions
// ============================================

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Sin fecha';
  try {
    return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return 'Fecha invalida';
  }
}

function formatShortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Sin fecha';
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: es });
  } catch {
    return 'Fecha invalida';
  }
}

function formatRelativeDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), "d MMM yyyy 'a las' HH:mm", { locale: es });
  } catch {
    return '';
  }
}

function getInitials(name: string | undefined | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// Animation Variants
// ============================================

const modeTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
};

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.15 },
};

// ============================================
// Sub-Components
// ============================================

/** Status Badge */
const TaskStatusBadge = React.memo(function TaskStatusBadge({
  status,
  size = 'default',
}: {
  status: TaskStatus;
  size?: 'sm' | 'default';
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      className={cn(
        'gap-1.5 border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-2.5 py-1'
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {STATUS_LABELS[status]}
    </Badge>
  );
});

/** Priority Badge */
const TaskPriorityBadge = React.memo(function TaskPriorityBadge({
  priority,
  size = 'default',
}: {
  priority: TaskPriority;
  size?: 'sm' | 'default';
}) {
  const config = PRIORITY_CONFIG[priority];

  return (
    <Badge
      className={cn(
        'gap-1.5',
        config.bgColor,
        config.textColor,
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'px-2.5 py-1'
      )}
    >
      <Flag className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
});

/** Type Badge */
const TaskTypeBadge = React.memo(function TaskTypeBadge({
  type,
}: {
  type: TaskType;
}) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-sm', config.color)}>
      <Icon className="h-4 w-4" />
      <span>{TYPE_LABELS[type]}</span>
    </div>
  );
});

/** Info Card */
const InfoCard = React.memo(function InfoCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = 'default',
  className,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  className?: string;
}) {
  const variantStyles = {
    default: 'bg-muted/50 border-transparent',
    warning: 'bg-[var(--task-status-pending-bg)] border-[var(--task-status-pending-border)]',
    danger: 'bg-[var(--task-status-cancelled-bg)] border-[var(--task-status-cancelled-border)]',
    success: 'bg-[var(--task-status-completed-bg)] border-[var(--task-status-completed-border)]',
  };

  const iconStyles = {
    default: 'text-muted-foreground bg-background',
    warning: 'text-[var(--task-status-pending-text)] bg-[var(--task-status-pending-bg)]',
    danger: 'text-[var(--task-status-cancelled-text)] bg-[var(--task-status-cancelled-bg)]',
    success: 'text-[var(--task-status-completed-text)] bg-[var(--task-status-completed-bg)]',
  };

  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border', variantStyles[variant], className)}>
      <div className={cn('p-2 rounded-lg', iconStyles[variant])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
        {subValue && (
          <p className={cn(
            'text-xs',
            variant === 'danger' ? 'text-[var(--task-status-cancelled-text)]' :
            variant === 'warning' ? 'text-[var(--task-status-pending-text)]' :
            variant === 'success' ? 'text-[var(--task-status-completed-text)]' :
            'text-muted-foreground'
          )}>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
});

/** Section Header */
const SectionHeader = React.memo(function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon?: typeof Clock;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {action}
    </div>
  );
});

/** Comment Item */
const CommentItem = React.memo(function CommentItem({
  comment,
  onDelete,
  isDeleting,
}: {
  comment: TaskComment;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  return (
    <motion.div
      className="flex gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
      {...fadeIn}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={comment.author?.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {getInitials(comment.author?.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium truncate">
            {comment.author?.name ?? 'Usuario'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(comment.createdAt)}
            </span>
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-[var(--task-status-cancelled-text)]"
                onClick={onDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </motion.div>
  );
});

/** Activity Item */
const ActivityItem = React.memo(function ActivityItem({
  activity,
}: {
  activity: TaskActivity;
}) {
  const config = ACTIVITY_ICON_CONFIG[activity.action] ?? ACTIVITY_ICON_CONFIG.updated;
  const Icon = config.icon;

  // Format changes for display
  const formatChanges = () => {
    if (!activity.changes) return null;

    const changeEntries = Object.entries(activity.changes);
    if (changeEntries.length === 0) return null;

    return (
      <div className="mt-1 text-xs text-muted-foreground">
        {changeEntries.map(([field, change]) => (
          <div key={field} className="flex items-center gap-1">
            <span className="font-medium capitalize">{field}:</span>
            <span className="line-through text-[var(--task-status-cancelled-text)] opacity-70">{String(change.from ?? 'vacío')}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-[var(--task-status-completed-text)]">{String(change.to ?? 'vacío')}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex gap-3 pb-4 relative">
      {/* Timeline line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-[2px] bg-border" />

      {/* Icon */}
      <div className={cn('relative z-10 p-1.5 rounded-full shrink-0', config.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {activity.user?.name ?? 'Sistema'}
          </span>
          <span className="text-sm text-muted-foreground">
            {ACTIVITY_LABELS[activity.action] ?? activity.action}
          </span>
        </div>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {activity.description}
          </p>
        )}
        {formatChanges()}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDateTime(activity.createdAt)}
        </p>
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export function TaskDetailSheet({
  task,
  open,
  onClose,
  onSuccess,
  onDelete,
  defaultMode = 'view',
  defaultTab = 'details',
  isLoading = false,
}: TaskDetailSheetProps) {
  const { toast } = useToast();
  const [mode, setMode] = React.useState<DetailMode>(defaultMode);
  const [activeTab, setActiveTab] = React.useState<TabValue>(defaultTab);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');

  // Data hooks
  const { data: commentsData, isLoading: isCommentsLoading } = useTaskComments(
    task?.id ?? '',
    { limit: 50 }
  );
  const { data: activityData, isLoading: isActivityLoading } = useTaskActivity(
    task?.id ?? '',
    { limit: 50 }
  );

  // Mutations
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const reopenTask = useReopenTask();
  const addComment = useAddTaskComment();
  const deleteComment = useDeleteTaskComment();

  // Form setup
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'task',
      priority: 'medium',
      dueDate: null,
      reminderAt: null,
      tags: '',
    },
  });

  // Reset form when task changes
  React.useEffect(() => {
    if (task && open) {
      form.reset({
        title: task.title,
        description: task.description ?? '',
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
        tags: task.tags?.join(', ') ?? '',
      });
      setMode(defaultMode);
      setActiveTab(defaultTab);
      setNewComment('');
    }
  }, [task, open, form, defaultMode, defaultTab]);

  // Computed values
  const comments = commentsData?.data ?? [];
  const activities = activityData?.data ?? [];
  const overdue = task ? isTaskOverdue(task) : false;
  const daysUntilDue = task?.dueDate ? getDaysUntilDue(task.dueDate) : null;
  const entityInfo = task ? getEntityInfo(task) : null;
  const canComplete = task?.status === 'pending' || task?.status === 'in_progress';
  const canCancel = task?.status === 'pending' || task?.status === 'in_progress';
  const canReopen = task?.status === 'completed' || task?.status === 'cancelled';
  const isPending = updateTask.isPending || deleteTask.isPending ||
    completeTask.isPending || cancelTask.isPending || reopenTask.isPending;

  // Handlers
  const handleSave = async (data: TaskFormData) => {
    if (!task) return;

    const sanitizedData = sanitizeTaskData(data as Record<string, unknown>) as TaskFormData;
    const rawTags = sanitizedData.tags
      ? sanitizedData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const sanitizedTagsArray = sanitizeTags(rawTags);

    try {
      const updatedTask = await updateTask.mutateAsync({
        taskId: task.id,
        data: {
          title: sanitizedData.title,
          description: sanitizedData.description || undefined,
          type: sanitizedData.type,
          priority: sanitizedData.priority,
          dueDate: sanitizedData.dueDate?.toISOString(),
          reminderAt: sanitizedData.reminderAt?.toISOString(),
          tags: sanitizedTagsArray,
        },
      });

      toast({
        title: 'Tarea actualizada',
        description: 'Los cambios han sido guardados exitosamente.',
      });

      setMode('view');
      onSuccess?.(updatedTask);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea.',
        variant: 'destructive',
      });
    }
  };

  const handleComplete = async () => {
    if (!task) return;

    try {
      const updatedTask = await completeTask.mutateAsync({ taskId: task.id });
      toast({
        title: 'Tarea completada',
        description: 'La tarea ha sido marcada como completada.',
      });
      onSuccess?.(updatedTask);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo completar la tarea.',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    if (!task) return;

    try {
      const updatedTask = await cancelTask.mutateAsync({ taskId: task.id });
      toast({
        title: 'Tarea cancelada',
        description: 'La tarea ha sido cancelada.',
      });
      onSuccess?.(updatedTask);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la tarea.',
        variant: 'destructive',
      });
    }
  };

  const handleReopen = async () => {
    if (!task) return;

    try {
      const updatedTask = await reopenTask.mutateAsync(task.id);
      toast({
        title: 'Tarea reabierta',
        description: 'La tarea ha sido reabierta.',
      });
      onSuccess?.(updatedTask);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo reabrir la tarea.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      await deleteTask.mutateAsync(task.id);
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea ha sido eliminada permanentemente.',
      });
      onDelete?.(task);
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    try {
      await addComment.mutateAsync({
        taskId: task.id,
        data: { content: newComment.trim() },
      });
      setNewComment('');
      toast({
        title: 'Comentario agregado',
        description: 'Tu comentario ha sido publicado.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el comentario.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;

    try {
      await deleteComment.mutateAsync({ taskId: task.id, commentId });
      toast({
        title: 'Comentario eliminado',
        description: 'El comentario ha sido eliminado.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el comentario.',
        variant: 'destructive',
      });
    }
  };

  // ============================================
  // View Mode - Details Tab Content
  // ============================================

  const DetailsContent = React.useMemo(() => {
    if (!task) return null;

    const dueDateVariant = overdue ? 'danger' : daysUntilDue !== null && daysUntilDue <= 3 ? 'warning' : 'default';

    return (
      <div className="space-y-6">
        {/* Description */}
        {task.description && (
          <div>
            <SectionHeader title="Descripcion" />
            <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
              {task.description}
            </p>
          </div>
        )}

        {/* Dates Grid */}
        <div>
          <SectionHeader icon={Calendar} title="Fechas" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoCard
              icon={Calendar}
              label="Fecha de Vencimiento"
              value={formatDate(task.dueDate)}
              subValue={task.dueDate ? formatRelativeDate(task.dueDate) : undefined}
              variant={dueDateVariant}
            />
            {task.reminderAt && (
              <InfoCard
                icon={Bell}
                label="Recordatorio"
                value={formatDate(task.reminderAt)}
                subValue={formatRelativeDate(task.reminderAt)}
              />
            )}
          </div>
        </div>

        {/* Outcome (for completed tasks) */}
        {task.status === 'completed' && task.outcome && (
          <div>
            <SectionHeader icon={CheckCircle} title="Resultado" />
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">
                {task.outcome}
              </p>
              {task.completedAt && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                  Completado: {formatDate(task.completedAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recurrence */}
        {task.isRecurring && task.recurrenceRule && (
          <div>
            <SectionHeader icon={Repeat} title="Recurrencia" />
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {RECURRENCE_LABELS[task.recurrenceRule.frequency] ?? task.recurrenceRule.frequency}
                {task.recurrenceRule.interval && task.recurrenceRule.interval > 1 && (
                  <> (cada {task.recurrenceRule.interval})</>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Related Entity */}
        {entityInfo && (
          <div>
            <SectionHeader icon={Building2} title="Relacionado con" />
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3 hover:bg-muted/70 transition-colors cursor-pointer">
              {entityInfo.type === 'lead' && <Target className="h-5 w-5 text-blue-500" />}
              {entityInfo.type === 'customer' && <Building2 className="h-5 w-5 text-emerald-500" />}
              {entityInfo.type === 'opportunity' && <ArrowRight className="h-5 w-5 text-purple-500" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entityInfo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entityInfo.type === 'lead' ? 'Lead' :
                   entityInfo.type === 'customer' ? 'Cliente' : 'Oportunidad'}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div>
            <SectionHeader icon={User} title="Asignado a" />
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={task.assignee.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(task.assignee.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.assignee.name}</p>
                <p className="text-xs text-muted-foreground truncate">{task.assignee.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div>
            <SectionHeader icon={Tag} title="Etiquetas" />
            <div className="flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        <div>
          <SectionHeader icon={Paperclip} title="Documentos Adjuntos" />
          <AttachmentSection
            entityType="task"
            entityId={task.id}
            title=""
            description="Archivos, capturas de pantalla y documentos relacionados"
            category="document"
            accessLevel="team"
            view="list"
            showUploader
            showList
          />
        </div>

        {/* Metadata */}
        <Separator />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>ID: {task.id}</p>
          <p>Creado: {formatDateTime(task.createdAt)}</p>
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <p>Actualizado: {formatDateTime(task.updatedAt)}</p>
          )}
          {task.creator && <p>Creado por: {task.creator.name}</p>}
        </div>
      </div>
    );
  }, [task, overdue, daysUntilDue, entityInfo]);

  // ============================================
  // View Mode
  // ============================================

  const ViewMode = React.useCallback(() => {
    if (!task) return null;

    return (
      <motion.div
        key="view"
        className="flex flex-col h-full"
        {...modeTransition}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} size="sm" />
              </div>
              <h2 className="text-lg font-semibold text-foreground line-clamp-2">
                {task.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <TaskTypeBadge type={task.type} />
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMode('edit')}
                      disabled={isPending}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isPending}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setMode('edit')}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Overdue Indicator - SUBTLE per Design System Audit 2026
            Reduced visual noise: small inline indicator instead of full-width banner
            Uses semantic --due-* tokens from globals.css */}
        {overdue && (
          <div className="shrink-0 px-6 py-2 bg-[var(--due-overdue-bg)] border-b border-[var(--due-overdue-border)]">
            <div className="flex items-center gap-2 text-[var(--due-overdue-text)]">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                Vencida hace {Math.abs(daysUntilDue ?? 0)} {Math.abs(daysUntilDue ?? 0) === 1 ? 'día' : 'días'}
              </span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-6 pt-2 border-b">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="details" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Detalles
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comentarios
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {comments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs gap-1.5">
                <History className="h-3.5 w-3.5" />
                Actividad
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {DetailsContent}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="comments" className="flex-1 m-0 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 overflow-auto">
              <CommentSection
                entityType="task"
                entityId={task.id}
                allowReplies
                allowReactions
                allowMentions
                allowMarkdown
                title=""
                placeholder="Escribe un comentario sobre esta tarea..."
                emptyMessage="No hay comentarios aun. Se el primero en comentar."
                maxHeight="100%"
              />
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {isActivityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No hay actividad registrada</p>
                  </div>
                ) : (
                  <div className="relative">
                    {activities.map((activity, index) => (
                      <ActivityItem
                        key={activity.id}
                        activity={activity}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className={cn(
          'shrink-0 px-6 pt-4 border-t bg-background',
          // Mobile: account for bottom bar (64px) + safe area + padding
          'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
          // Desktop: normal padding (no bottom bar)
          'sm:pb-4'
        )}>
          <div className="flex items-center justify-between gap-3">
            {/* Left Actions */}
            <div className="flex items-center gap-2">
              {canComplete && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleComplete}
                  disabled={isPending}
                  className="gap-2 bg-[var(--task-status-completed)] hover:opacity-90"
                >
                  {completeTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Completar
                </Button>
              )}
              {canReopen && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReopen}
                  disabled={isPending}
                  className="gap-2"
                >
                  {reopenTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Reabrir
                </Button>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="gap-2 text-[var(--task-status-pending)] hover:bg-[var(--task-status-pending-bg)]"
                >
                  {cancelTask.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Cancelar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-2 text-[var(--task-status-cancelled)] hover:bg-[var(--task-status-cancelled-bg)]"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }, [task, mode, overdue, daysUntilDue, activeTab, comments, activities, isPending, isDeleting, newComment, DetailsContent, isCommentsLoading, isActivityLoading]);

  // ============================================
  // Edit Mode
  // ============================================

  const EditMode = React.useCallback(() => {
    if (!task) return null;

    return (
      <motion.div
        key="edit"
        className="flex flex-col h-full"
        {...modeTransition}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Editar Tarea
              </h2>
              <p className="text-sm text-muted-foreground">
                Modifica los detalles de la tarea
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMode('view')}
              disabled={updateTask.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <ScrollArea className="flex-1">
          <form
            id="task-edit-form"
            className="p-6 space-y-6"
            onSubmit={form.handleSubmit(handleSave)}
          >
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Controller
                name="title"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="title"
                    placeholder="Ej: Llamar a cliente para seguimiento"
                    {...field}
                  />
                )}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-[var(--destructive)]">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripcion</Label>
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => (
                  <Textarea
                    id="description"
                    placeholder="Descripcion detallada de la tarea..."
                    rows={4}
                    className="resize-none"
                    {...field}
                  />
                )}
              />
            </div>

            {/* Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPE.map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              {React.createElement(TYPE_CONFIG[type].icon, {
                                className: cn('h-4 w-4', TYPE_CONFIG[type].color),
                              })}
                              {TYPE_LABELS[type]}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Controller
                  name="priority"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_PRIORITY.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Due Date & Reminder */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Vencimiento</Label>
                <Controller
                  name="dueDate"
                  control={form.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(field.value, "d 'de' MMMM", { locale: es })
                            : 'Seleccionar fecha'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Recordatorio</Label>
                <Controller
                  name="reminderAt"
                  control={form.control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          {field.value
                            ? format(field.value, "d 'de' MMMM", { locale: es })
                            : 'Sin recordatorio'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Etiquetas
              </Label>
              <Controller
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="tags"
                    placeholder="Ej: importante, cliente-vip, urgente (separadas por coma)"
                    {...field}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Separa las etiquetas con comas
              </p>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Documentos Adjuntos
              </Label>
              <AttachmentSection
                entityType="task"
                entityId={task.id}
                title=""
                description=""
                category="document"
                accessLevel="team"
                view="compact"
                compact
              />
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className={cn(
          'shrink-0 px-6 pt-4 border-t bg-background',
          // Mobile: account for bottom bar (64px) + safe area + padding
          'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
          // Desktop: normal padding (no bottom bar)
          'sm:pb-4'
        )}>
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode('view')}
              disabled={updateTask.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="task-edit-form"
              disabled={updateTask.isPending}
            >
              {updateTask.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }, [task, form, updateTask.isPending]);

  // ============================================
  // Render
  // ============================================

  if (!task && !isLoading) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        accessibleTitle={task?.title || 'Detalle de tarea'}
        className={cn(
          // Layout
          'flex flex-col p-0 gap-0',
          // Visual
          'backdrop-blur-xl bg-background/95',
          // Responsive width - mobile full, tablet/desktop fixed
          'w-full max-w-full',
          'sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
          'md:w-[480px] lg:w-[540px]',
          // Transition
          'transition-all duration-300'
        )}
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {mode === 'view' ? <ViewMode /> : <EditMode />}
          </AnimatePresence>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default TaskDetailSheet;
