'use client';

import * as React from 'react';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDeleteLead, type Lead } from '@/lib/leads';

// ============================================
// Props
// ============================================

interface DeleteLeadDialogProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DeleteLeadDialog({ lead, open, onClose }: DeleteLeadDialogProps) {
  const { toast } = useToast();
  const deleteLead = useDeleteLead();

  const handleDelete = async () => {
    if (!lead) return;

    try {
      await deleteLead.mutateAsync(lead.id);
      toast({
        title: 'Lead eliminado',
        description: 'El lead ha sido eliminado correctamente.',
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el lead.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar Lead
          </DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. El lead y todos sus datos asociados
            (notas, actividad) seran eliminados permanentemente.
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="rounded-md border p-4">
            <p className="font-medium">{lead.fullName}</p>
            <p className="text-sm text-muted-foreground">{lead.email}</p>
            {lead.companyName && (
              <p className="text-sm text-muted-foreground">{lead.companyName}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={deleteLead.isPending}
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            disabled={deleteLead.isPending}
            variant="destructive"
            onClick={handleDelete}
          >
            {deleteLead.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar Lead'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
