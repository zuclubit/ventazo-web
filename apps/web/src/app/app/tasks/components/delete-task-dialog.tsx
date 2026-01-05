'use client';

import { Loader2, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useDeleteTask, type Task } from '@/lib/tasks';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface DeleteTaskDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DeleteTaskDialog({ task, open, onClose }: DeleteTaskDialogProps) {
  const { toast } = useToast();
  const deleteTask = useDeleteTask();

  const handleDelete = async () => {
    if (!task) return;

    try {
      await deleteTask.mutateAsync(task.id);
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea ha sido eliminada exitosamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea.',
        variant: 'destructive',
      });
    }
  };

  if (!task) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-[90vw] sm:max-w-lg mx-4 sm:mx-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar Tarea
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Estas seguro de que deseas eliminar la tarea{' '}
            <span className="font-medium text-foreground break-words">&quot;{task.title}&quot;</span>?
            <br />
            <br />
            Esta accion no se puede deshacer. Se eliminaran todos los comentarios
            y el historial de actividad asociados a esta tarea.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">
            Cancelar
          </AlertDialogCancel>
          <Button
            disabled={deleteTask.isPending}
            variant="destructive"
            onClick={handleDelete}
            className={cn('w-full sm:w-auto min-h-[44px]')}
          >
            {deleteTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
