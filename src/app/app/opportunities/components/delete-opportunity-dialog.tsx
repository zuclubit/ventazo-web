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
import {
  useDeleteOpportunity,
  type Opportunity,
  formatCurrency,
} from '@/lib/opportunities';

// ============================================
// Props
// ============================================

interface DeleteOpportunityDialogProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DeleteOpportunityDialog({
  opportunity,
  open,
  onClose,
}: DeleteOpportunityDialogProps) {
  const { toast } = useToast();
  const deleteOpportunity = useDeleteOpportunity();

  const handleDelete = async () => {
    if (!opportunity) return;

    try {
      await deleteOpportunity.mutateAsync(opportunity.id);
      toast({
        title: 'Oportunidad eliminada',
        description: 'La oportunidad ha sido eliminada exitosamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la oportunidad.',
        variant: 'destructive',
      });
    }
  };

  if (!opportunity) return null;

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Oportunidad
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Esta accion no se puede deshacer. Se eliminara permanentemente la
              oportunidad y toda su informacion asociada.
            </p>
            <div className="mt-4 rounded-md bg-muted p-3">
              <p className="font-medium">{opportunity.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(opportunity.amount, opportunity.currency)}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteOpportunity.isPending}
            onClick={handleDelete}
          >
            {deleteOpportunity.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
