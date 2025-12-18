'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_TYPE_LABELS, useDeleteService, type Service } from '@/lib/services';

interface DeleteServiceDialogProps {
  service: Service | null;
  open: boolean;
  onClose: () => void;
}

export function DeleteServiceDialog({ service, open, onClose }: DeleteServiceDialogProps) {
  const { toast } = useToast();
  const deleteService = useDeleteService();

  const handleDelete = async () => {
    if (!service) return;

    try {
      await deleteService.mutateAsync(service.id);
      toast({
        title: 'Servicio eliminado',
        description: 'El servicio ha sido eliminado correctamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el servicio.',
        variant: 'destructive',
      });
    }
  };

  if (!service) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            ¿Eliminar servicio?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el{' '}
            <strong>{SERVICE_TYPE_LABELS[service.service_type].toLowerCase()}</strong>{' '}
            <strong>&quot;{service.name}&quot;</strong> y todos sus datos asociados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteService.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteService.isPending}
            onClick={handleDelete}
          >
            {deleteService.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
