'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useCompleteTask, type Task } from '@/lib/tasks';

// ============================================
// Form Schema
// ============================================

const completeTaskSchema = z.object({
  outcome: z.string().max(5000).optional(),
  createFollowUp: z.boolean().default(false),
  followUpTitle: z.string().max(500).optional(),
});

type CompleteTaskFormValues = z.infer<typeof completeTaskSchema>;

// ============================================
// Props
// ============================================

interface CompleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function CompleteTaskDialog({ task, open, onClose }: CompleteTaskDialogProps) {
  const { toast } = useToast();
  const completeTask = useCompleteTask();

  const form = useForm<CompleteTaskFormValues>({
    resolver: zodResolver(completeTaskSchema),
    defaultValues: {
      outcome: '',
      createFollowUp: false,
      followUpTitle: '',
    },
  });

  const watchCreateFollowUp = form.watch('createFollowUp');

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        outcome: '',
        createFollowUp: false,
        followUpTitle: '',
      });
    }
  }, [open, form]);

  const onSubmit = async (values: CompleteTaskFormValues) => {
    if (!task) return;

    try {
      await completeTask.mutateAsync({
        taskId: task.id,
        data: {
          outcome: values.outcome || undefined,
          createFollowUp: values.createFollowUp,
          followUpTitle: values.followUpTitle || undefined,
        },
      });
      toast({
        title: 'Tarea completada',
        description: values.createFollowUp
          ? 'La tarea ha sido completada y se creo una tarea de seguimiento.'
          : 'La tarea ha sido completada exitosamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo completar la tarea.',
        variant: 'destructive',
      });
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Completar Tarea
          </DialogTitle>
          <DialogDescription>
            Marca la tarea como completada y registra el resultado.
          </DialogDescription>
        </DialogHeader>

        {/* Task Info */}
        <div className="rounded-md bg-muted p-4">
          <p className="font-medium">{task.title}</p>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Outcome */}
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder="Describe el resultado o notas de la tarea completada..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Create Follow-up */}
            <FormField
              control={form.control}
              name="createFollowUp"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Crear tarea de seguimiento</FormLabel>
                    <FormDescription>
                      Crea automaticamente una nueva tarea relacionada
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Follow-up Title (shown if createFollowUp is true) */}
            {watchCreateFollowUp && (
              <FormField
                control={form.control}
                name="followUpTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titulo de la tarea de seguimiento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Seguimiento a cliente..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                disabled={completeTask.isPending}
                type="submit"
              >
                {completeTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle className="mr-2 h-4 w-4" />
                Completar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
