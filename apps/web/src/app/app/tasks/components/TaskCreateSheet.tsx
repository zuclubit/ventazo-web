'use client';

/**
 * TaskCreateSheet - Create Task Side Panel (v1.0)
 *
 * Enterprise-grade component for creating new tasks.
 * Follows the same patterns as QuoteCreateSheet for consistency.
 *
 * Features:
 * - Responsive: Bottom sheet on mobile, right panel on desktop
 * - Full form with validation
 * - Related entity pre-fill support
 * - Smooth animations
 *
 * @version 1.0.0
 * @module tasks/components/TaskCreateSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Bell,
  Calendar,
  Loader2,
  Plus,
  Tag,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { sanitizeTaskData, sanitizeTags } from '@/lib/security/form-sanitizer';
import type { Task } from '@/lib/tasks/types';
import {
  TASK_TYPE,
  TASK_PRIORITY,
  TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/lib/tasks/types';
import { useCreateTask } from '@/lib/tasks/hooks';

// ============================================
// Types & Schema
// ============================================

export interface TaskCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (task: Task) => void;
  // Optional: pre-fill related entity
  leadId?: string;
  leadName?: string;
  customerId?: string;
  customerName?: string;
  opportunityId?: string;
  opportunityName?: string;
}

const taskCreateSchema = z.object({
  title: z.string().min(2, 'El titulo debe tener al menos 2 caracteres').max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPE),
  priority: z.enum(TASK_PRIORITY),
  dueDate: z.date().optional().nullable(),
  reminderAt: z.date().optional().nullable(),
  tags: z.string().optional(),
});

type TaskCreateFormData = z.infer<typeof taskCreateSchema>;

// ============================================
// Component
// ============================================

export function TaskCreateSheet({
  open,
  onClose,
  onSuccess,
  leadId,
  leadName,
  customerId,
  customerName,
  opportunityId,
  opportunityName,
}: TaskCreateSheetProps) {
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const createTask = useCreateTask();

  // Determine related entity info for display
  const relatedEntityInfo = React.useMemo(() => {
    if (leadId && leadName) return { type: 'Lead', name: leadName };
    if (customerId && customerName) return { type: 'Cliente', name: customerName };
    if (opportunityId && opportunityName) return { type: 'Oportunidad', name: opportunityName };
    return null;
  }, [leadId, leadName, customerId, customerName, opportunityId, opportunityName]);

  // Form setup
  const form = useForm<TaskCreateFormData>({
    resolver: zodResolver(taskCreateSchema),
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

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: '',
        description: '',
        type: 'task',
        priority: 'medium',
        dueDate: null,
        reminderAt: null,
        tags: '',
      });
    }
  }, [open, form]);

  // Handle submit
  const handleSubmit = async (data: TaskCreateFormData) => {
    const sanitizedData = sanitizeTaskData(data as Record<string, unknown>) as TaskCreateFormData;
    const rawTags = sanitizedData.tags
      ? sanitizedData.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const sanitizedTagsArray = sanitizeTags(rawTags);

    const payload = {
      title: sanitizedData.title,
      description: sanitizedData.description || undefined,
      type: sanitizedData.type,
      priority: sanitizedData.priority,
      dueDate: sanitizedData.dueDate?.toISOString(),
      reminderAt: sanitizedData.reminderAt?.toISOString(),
      tags: sanitizedTagsArray,
      // Include related entity if provided
      ...(leadId && { leadId }),
      ...(customerId && { customerId }),
      ...(opportunityId && { opportunityId }),
    };

    try {
      const newTask = await createTask.mutateAsync(payload);

      toast({
        title: 'Tarea creada',
        description: 'La nueva tarea ha sido creada exitosamente.',
      });

      onSuccess?.(newTask);
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo crear la tarea.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        size="lg"
        mobileFullScreen={isMobile}
        hideCloseButton
        accessibleTitle="Nueva tarea"
        showDragHandle={isMobile}
        className={cn(
          'p-0 flex flex-col',
          isMobile ? 'h-[92vh] rounded-t-2xl' : 'w-full sm:w-[440px] md:w-[500px]'
        )}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-lg font-semibold">
                  Nueva Tarea
                </SheetTitle>
                <SheetDescription className="text-sm">
                  {relatedEntityInfo
                    ? `Para ${relatedEntityInfo.type}: ${relatedEntityInfo.name}`
                    : 'Crea una nueva tarea o actividad'}
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={createTask.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <ScrollArea className="flex-1">
          <form
            id="task-create-form"
            className="p-6 space-y-6"
            onSubmit={form.handleSubmit(handleSubmit)}
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
                <p className="text-sm text-red-500">
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
                    rows={3}
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
                            {TYPE_LABELS[type]}
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
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createTask.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="task-create-form"
              disabled={createTask.isPending}
              className="gap-2"
            >
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Crear Tarea
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default TaskCreateSheet;
