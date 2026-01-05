'use client';

/**
 * useOptimisticDelete - Optimistic deletion with undo capability
 *
 * Implements the same pattern as Drag & Drop stage transitions:
 * 1. Immediate visual removal (optimistic)
 * 2. Undo toast with 5 second window
 * 3. API call after undo window expires
 * 4. Rollback on error
 *
 * @module leads/hooks/useOptimisticDelete
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Undo2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { useDeleteLead, leadKeys, type Lead, type PipelineView } from '@/lib/leads';

const UNDO_WINDOW_MS = 5000;

interface PendingDelete {
  leadId: string;
  lead: Lead;
  previousData: PipelineView | undefined;
}

export function useOptimisticDelete() {
  const queryClient = useQueryClient();
  const { toast, dismiss } = useToast();
  const deleteLead = useDeleteLead();

  // Track pending deletes and timeouts
  const undoTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingDeleteRef = React.useRef<PendingDelete | null>(null);
  const toastIdRef = React.useRef<string | null>(null);

  /**
   * Delete a lead with optimistic removal and undo capability
   */
  const deleteWithUndo = React.useCallback(
    (lead: Lead, onComplete?: () => void) => {
      // 1. Cancel any pending delete from previous action
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        // Execute the previous pending delete immediately
        if (pendingDeleteRef.current) {
          deleteLead.mutate(pendingDeleteRef.current.leadId);
        }
      }

      // Dismiss previous undo toast if exists
      if (toastIdRef.current) {
        dismiss(toastIdRef.current);
      }

      // 2. Capture previous state for rollback
      const previousData = queryClient.getQueryData<PipelineView>(
        leadKeys.pipelineView()
      );

      // 3. Optimistic removal - remove from cache immediately
      queryClient.setQueryData<PipelineView>(
        leadKeys.pipelineView(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col) => ({
              ...col,
              leads: col.leads.filter((l) => l.id !== lead.id),
            })),
          };
        }
      );

      // 4. Store for potential undo
      pendingDeleteRef.current = {
        leadId: lead.id,
        lead,
        previousData,
      };

      // 5. Notify completion (close dialog immediately)
      // Use requestAnimationFrame to ensure the dialog closes AFTER
      // the cache update completes - fixes Radix Dialog timing issue
      if (onComplete) {
        requestAnimationFrame(() => {
          onComplete();
        });
      }

      // 6. Show undo toast
      const { id } = toast({
        title: 'Lead eliminado',
        description: `${lead.fullName} fue eliminado`,
        duration: UNDO_WINDOW_MS + 500, // Slightly longer than undo window
        action: (
          <ToastAction
            altText="Deshacer eliminación"
            onClick={() => {
              // Cancel the pending delete
              if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
                undoTimeoutRef.current = null;
              }

              // Restore previous data
              if (pendingDeleteRef.current?.previousData) {
                queryClient.setQueryData(
                  leadKeys.pipelineView(),
                  pendingDeleteRef.current.previousData
                );
              }

              pendingDeleteRef.current = null;

              toast({
                title: 'Eliminación cancelada',
                description: `${lead.fullName} fue restaurado`,
              });
            }}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            Deshacer
          </ToastAction>
        ),
      });

      toastIdRef.current = id;

      // 7. Schedule actual API delete after undo window
      undoTimeoutRef.current = setTimeout(async () => {
        undoTimeoutRef.current = null;

        if (!pendingDeleteRef.current) {
          // Already undone
          return;
        }

        try {
          await deleteLead.mutateAsync(lead.id);
          pendingDeleteRef.current = null;
        } catch (error) {
          // Rollback on API error
          if (pendingDeleteRef.current?.previousData) {
            queryClient.setQueryData(
              leadKeys.pipelineView(),
              pendingDeleteRef.current.previousData
            );
          }
          pendingDeleteRef.current = null;

          toast({
            title: 'Error al eliminar',
            description:
              error instanceof Error
                ? error.message
                : 'No se pudo eliminar el lead. Intenta de nuevo.',
            variant: 'destructive',
          });
        }
      }, UNDO_WINDOW_MS);
    },
    [queryClient, deleteLead, toast, dismiss]
  );

  /**
   * Force delete immediately without undo (for bulk operations)
   */
  const deleteImmediately = React.useCallback(
    async (leadId: string) => {
      // Cancel any pending delete for this lead
      if (
        pendingDeleteRef.current &&
        pendingDeleteRef.current.leadId === leadId
      ) {
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
          undoTimeoutRef.current = null;
        }
        pendingDeleteRef.current = null;
      }

      await deleteLead.mutateAsync(leadId);
    },
    [deleteLead]
  );

  // Cleanup on unmount - execute pending deletes
  React.useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      // If there's a pending delete when unmounting, execute it
      if (pendingDeleteRef.current) {
        deleteLead.mutate(pendingDeleteRef.current.leadId);
        pendingDeleteRef.current = null;
      }
    };
  }, [deleteLead]);

  return {
    deleteWithUndo,
    deleteImmediately,
    isPending: deleteLead.isPending,
  };
}

export default useOptimisticDelete;
