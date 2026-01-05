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
import { useDeleteCustomer, type Customer } from '@/lib/customers';

// ============================================
// Props
// ============================================

interface DeleteCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DeleteCustomerDialog({ customer, open, onClose }: DeleteCustomerDialogProps) {
  const { toast } = useToast();
  const deleteCustomer = useDeleteCustomer();

  const handleDelete = async () => {
    if (!customer) return;

    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast({
        title: 'Cliente eliminado',
        description: 'El cliente ha sido eliminado correctamente.',
      });
      onClose();
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo eliminar el cliente.',
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
            Eliminar Cliente
          </DialogTitle>
          <DialogDescription>
            Esta accion no se puede deshacer. El cliente y todos sus datos asociados
            seran eliminados permanentemente.
          </DialogDescription>
        </DialogHeader>

        {customer && (
          <div className="rounded-md border p-4">
            <p className="font-medium">{customer.companyName}</p>
            <p className="text-sm text-muted-foreground">{customer.email}</p>
          </div>
        )}

        <DialogFooter>
          <Button
            disabled={deleteCustomer.isPending}
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            disabled={deleteCustomer.isPending}
            variant="destructive"
            onClick={handleDelete}
          >
            {deleteCustomer.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar Cliente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
