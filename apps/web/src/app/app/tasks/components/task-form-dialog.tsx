'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sanitizeTaskData, sanitizeTags } from '@/lib/security/form-sanitizer';
import {
  useCreateTask,
  useUpdateTask,
  type Task,
  TASK_TYPE,
  TASK_PRIORITY,
  TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/lib/tasks';
import { cn } from '@/lib/utils';

// ============================================
// Form Schema
// ============================================

const taskFormSchema = z.object({
  title: z.string().min(2, 'El titulo debe tener al menos 2 caracteres').max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(TASK_TYPE),
  priority: z.enum(TASK_PRIORITY),
  dueDate: z.date().optional().nullable(),
  reminderAt: z.date().optional().nullable(),
  tags: z.string().optional(), // Comma-separated
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

// ============================================
// Props
// ============================================

interface TaskFormDialogProps {
  task?: Task | null;
  open: boolean;
  onClose: () => void;
  // Optional: pre-fill related entity
  leadId?: string;
  customerId?: string;
  opportunityId?: string;
}

// ============================================
// Component
// ============================================

export function TaskFormDialog({
  task,
  open,
  onClose,
  leadId,
  customerId,
  opportunityId,
}: TaskFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!task;

  // Mutations
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  // Form
  const form = useForm<TaskFormValues>({
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
    if (task) {
      form.reset({
        title: task.title,
        description: task.description ?? '',
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
        tags: task.tags?.join(', ') ?? '',
      });
    } else {
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
  }, [task, form]);

  // Submit handler
  const onSubmit = async (values: TaskFormValues) => {
    // Sanitize all input data before sending to API (XSS prevention)
    const sanitizedValues = sanitizeTaskData(values as Record<string, unknown>) as TaskFormValues;
    const rawTags = sanitizedValues.tags
      ? sanitizedValues.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const sanitizedTagsArray = sanitizeTags(rawTags);

    const payload = {
      title: sanitizedValues.title,
      description: sanitizedValues.description || undefined,
      type: sanitizedValues.type,
      priority: sanitizedValues.priority,
      dueDate: sanitizedValues.dueDate?.toISOString(),
      reminderAt: sanitizedValues.reminderAt?.toISOString(),
      tags: sanitizedTagsArray,
      // Include related entity if provided
      ...(leadId && { leadId }),
      ...(customerId && { customerId }),
      ...(opportunityId && { opportunityId }),
    };

    try {
      if (isEditing && task) {
        await updateTask.mutateAsync({
          taskId: task.id,
          data: payload,
        });
        toast({
          title: 'Tarea actualizada',
          description: 'La tarea ha sido actualizada exitosamente.',
        });
      } else {
        await createTask.mutateAsync(payload);
        toast({
          title: 'Tarea creada',
          description: 'La nueva tarea ha sido creada exitosamente.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: isEditing
          ? 'No se pudo actualizar la tarea.'
          : 'No se pudo crear la tarea.',
        variant: 'destructive',
      });
    }
  };

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la informacion de la tarea.'
              : 'Crea una nueva tarea o actividad.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Llamar a cliente para seguimiento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder="Descripcion detallada de la tarea..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_TYPE.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TASK_PRIORITY.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due Date & Reminder Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Due Date */}
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            variant="outline"
                          >
                            {field.value ? (
                              format(field.value, "d 'de' MMMM 'de' yyyy", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          initialFocus
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reminder */}
              <FormField
                control={form.control}
                name="reminderAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Recordatorio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            variant="outline"
                          >
                            {field.value ? (
                              format(field.value, "d 'de' MMMM 'de' yyyy", { locale: es })
                            ) : (
                              <span>Sin recordatorio</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <Calendar
                          initialFocus
                          mode="single"
                          selected={field.value ?? undefined}
                          onSelect={field.onChange}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Recibiras un recordatorio en esta fecha
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: importante, cliente-vip, urgente (separadas por coma)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Separa las etiquetas con comas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
