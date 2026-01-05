'use client';

/**
 * useOptimisticEdit - Optimistic lead editing
 *
 * Implements the same pattern as Drag & Drop stage transitions:
 * 1. Immediate visual update (optimistic)
 * 2. Form switches to view mode instantly
 * 3. API call in background
 * 4. Confirm with real data on success
 * 5. Rollback on error with toast notification
 *
 * @module leads/hooks/useOptimisticEdit
 * @see docs/LEAD_KANBAN_ACTIONS_AUDIT.md
 * @see docs/REMEDIATION_PLAN.md
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import {
  useUpdateLead,
  leadKeys,
  type Lead,
  type PipelineView,
  type UpdateLeadRequest,
} from '@/lib/leads';

export function useOptimisticEdit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateLead = useUpdateLead();

  /**
   * Update a lead with optimistic UI
   * @param leadId - ID of the lead to update
   * @param data - Updated lead data
   * @param onComplete - Callback with updated lead (called immediately with optimistic data)
   */
  const updateWithOptimistic = React.useCallback(
    async (
      leadId: string,
      data: UpdateLeadRequest,
      onComplete?: (updatedLead: Lead) => void
    ) => {
      // 1. Capture previous state for rollback
      const previousData = queryClient.getQueryData<PipelineView>(
        leadKeys.pipelineView()
      );

      // Find current lead
      let currentLead: Lead | undefined;
      previousData?.stages.forEach((col) => {
        const found = col.leads.find((l) => l.id === leadId);
        if (found) currentLead = found;
      });

      if (!currentLead) {
        toast({
          title: 'Error',
          description: 'Lead no encontrado',
          variant: 'destructive',
        });
        return;
      }

      // 2. Create optimistic lead with updated fields
      const optimisticLead: Lead = {
        ...currentLead,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // 3. Optimistic update - apply changes immediately
      queryClient.setQueryData<PipelineView>(leadKeys.pipelineView(), (old) => {
        if (!old) return old;
        return {
          ...old,
          stages: old.stages.map((col) => ({
            ...col,
            leads: col.leads.map((l) => (l.id === leadId ? optimisticLead : l)),
          })),
        };
      });

      // 4. Notify completion immediately (switch to view mode with optimistic data)
      onComplete?.(optimisticLead);

      // 5. Call API in background
      try {
        const realLead = await updateLead.mutateAsync({ leadId, data });

        // 6. Update with real data from server
        queryClient.setQueryData<PipelineView>(leadKeys.pipelineView(), (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col) => ({
              ...col,
              leads: col.leads.map((l) => (l.id === leadId ? realLead : l)),
            })),
          };
        });

        toast({
          title: 'Lead actualizado',
          description: 'Los cambios fueron guardados',
        });

        return realLead;
      } catch (error) {
        // 7. Rollback on error
        queryClient.setQueryData(leadKeys.pipelineView(), previousData);

        toast({
          title: 'Error al actualizar',
          description:
            error instanceof Error
              ? error.message
              : 'No se pudieron guardar los cambios',
          variant: 'destructive',
        });

        throw error;
      }
    },
    [queryClient, updateLead, toast]
  );

  return {
    updateWithOptimistic,
    isPending: updateLead.isPending,
  };
}

export default useOptimisticEdit;
