'use client';

import * as React from 'react';

import { AlertTriangle, Loader2 } from 'lucide-react';

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

// ============================================
// Types
// ============================================

export interface DeleteEntityDialogProps<T> {
  /** The entity to delete (null when dialog is closed) */
  entity: T | null;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Async function to perform the delete operation */
  onDelete: (entity: T) => Promise<void>;
  /** Title for the dialog (e.g., "Eliminar Lead") */
  title: string;
  /** Description explaining what will be deleted */
  description: string | React.ReactNode;
  /** Text for the delete button (default: "Eliminar") */
  deleteButtonText?: string;
  /** Text shown while deleting (default: "Eliminando...") */
  deletingText?: string;
  /** Optional preview content to show the entity details */
  preview?: React.ReactNode;
  /** Whether the delete operation is pending */
  isPending?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * Generic delete confirmation dialog for any entity type.
 *
 * @example
 * ```tsx
 * <DeleteEntityDialog
 *   entity={selectedLead}
 *   open={isDeleteOpen}
 *   onClose={() => setIsDeleteOpen(false)}
 *   onDelete={async (lead) => {
 *     await deleteLead.mutateAsync(lead.id);
 *     toast({ title: 'Lead eliminado' });
 *   }}
 *   title="Eliminar Lead"
 *   description="Esta accion no se puede deshacer. El lead sera eliminado permanentemente."
 *   isPending={deleteLead.isPending}
 *   preview={
 *     <div className="rounded-md border p-4">
 *       <p className="font-medium">{selectedLead?.fullName}</p>
 *       <p className="text-sm text-muted-foreground">{selectedLead?.email}</p>
 *     </div>
 *   }
 * />
 * ```
 */
export function DeleteEntityDialog<T>({
  entity,
  open,
  onClose,
  onDelete,
  title,
  description,
  deleteButtonText = 'Eliminar',
  deletingText = 'Eliminando...',
  preview,
  isPending = false,
}: DeleteEntityDialogProps<T>) {
  const [internalPending, setInternalPending] = React.useState(false);
  const isLoading = isPending || internalPending;

  const handleDelete = async () => {
    if (!entity) return;

    setInternalPending(true);
    try {
      await onDelete(entity);
      onClose();
    } catch (error) {
      // Error handling should be done in the onDelete callback
      console.error('Delete operation failed:', error);
    } finally {
      setInternalPending(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isLoading) {
      onClose();
    }
  };

  if (!entity) return null;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {preview}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <Button
            disabled={isLoading}
            variant="destructive"
            onClick={handleDelete}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {deletingText}
              </>
            ) : (
              deleteButtonText
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
