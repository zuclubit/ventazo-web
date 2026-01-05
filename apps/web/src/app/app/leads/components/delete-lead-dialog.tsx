'use client';

import * as React from 'react';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Lead } from '@/lib/leads';
import { useOptimisticDelete } from '../hooks/useOptimisticDelete';

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

/**
 * DeleteLeadDialog - Optimistic delete with undo capability
 *
 * P0 Fix: Uses optimistic delete pattern from useLeadsKanban.ts
 * - Dialog closes immediately on confirm
 * - Card is removed from view instantly (optimistic)
 * - Undo toast appears with 5 second window
 * - API call happens after undo window expires
 * - Rollback on API error
 *
 * @see docs/LEAD_KANBAN_ACTIONS_AUDIT.md
 * @see docs/REMEDIATION_PLAN.md
 */
export function DeleteLeadDialog({ lead, open, onClose }: DeleteLeadDialogProps) {
  const { deleteWithUndo, isPending } = useOptimisticDelete();

  const handleDelete = () => {
    if (!lead) return;
    // deleteWithUndo handles:
    // 1. Optimistic removal from cache
    // 2. Calls onClose immediately (dialog closes)
    // 3. Shows undo toast with 5s window
    // 4. Schedules API delete after undo window
    // 5. Rollback on error
    deleteWithUndo(lead, onClose);
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
            El lead sera eliminado. Tendras 5 segundos para deshacer esta accion.
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
            disabled={isPending}
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            variant="destructive"
            onClick={handleDelete}
          >
            Eliminar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
