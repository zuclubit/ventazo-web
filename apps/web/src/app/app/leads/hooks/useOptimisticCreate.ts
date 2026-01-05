'use client';

/**
 * useOptimisticCreate - Optimistic lead creation
 *
 * Implements the same pattern as Drag & Drop stage transitions:
 * 1. Immediate visual appearance (optimistic with temp ID)
 * 2. Form closes instantly
 * 3. API call in background
 * 4. Replace temp with real ID on success
 * 5. Remove on error with toast notification
 *
 * @module leads/hooks/useOptimisticCreate
 * @see docs/LEAD_KANBAN_ACTIONS_AUDIT.md
 * @see docs/REMEDIATION_PLAN.md
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import {
  useCreateLead,
  leadKeys,
  LeadStatus,
  LeadSource,
  type Lead,
  type PipelineView,
  type CreateLeadRequest,
} from '@/lib/leads';

// Extend Lead type to include optimistic flag
interface OptimisticLead extends Lead {
  isOptimistic?: boolean;
}

export function useOptimisticCreate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createLead = useCreateLead();

  /**
   * Create a lead with optimistic appearance
   * @param data - Lead data to create
   * @param targetStageId - Optional stage ID (defaults to first column)
   * @param onComplete - Callback when form should close (called immediately)
   */
  const createWithOptimistic = React.useCallback(
    async (
      data: CreateLeadRequest,
      targetStageId?: string,
      onComplete?: () => void
    ) => {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // 1. Create temporary lead object with optimistic flag
      const tempLead: OptimisticLead = {
        id: tempId,
        tenantId: '', // Will be set by server
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        website: data.website,
        industry: data.industry,
        source: data.source || LeadSource.MANUAL,
        status: LeadStatus.NEW,
        score: 0,
        scoreCategory: 'cold',
        stageId: targetStageId,
        tags: data.tags || [],
        notes: data.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        customFields: data.customFields || {},
        isFollowUpOverdue: false,
        isOptimistic: true, // Flag for visual feedback (pulsing border)
      };

      // 2. Optimistic append to target column (or first column)
      queryClient.setQueryData<PipelineView>(leadKeys.pipelineView(), (old) => {
        if (!old) return old;
        return {
          ...old,
          stages: old.stages.map((col, idx) => {
            const isTarget = targetStageId ? col.stage.id === targetStageId : idx === 0;
            if (isTarget) {
              return {
                ...col,
                leads: [tempLead as Lead, ...col.leads],
                count: col.count + 1,
              };
            }
            return col;
          }),
          totalLeads: old.totalLeads + 1,
        };
      });

      // 3. Close form immediately (optimistic UX)
      onComplete?.();

      // 4. Call API in background
      try {
        const realLead = await createLead.mutateAsync(data);

        // 5. Replace temp with real lead (remove optimistic flag)
        queryClient.setQueryData<PipelineView>(leadKeys.pipelineView(), (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col) => ({
              ...col,
              leads: col.leads.map((l) =>
                l.id === tempId ? { ...realLead } : l
              ),
            })),
          };
        });

        toast({
          title: 'Lead creado',
          description: `${realLead.fullName} agregado exitosamente`,
        });

        return realLead;
      } catch (error) {
        // 6. Remove temp on error
        queryClient.setQueryData<PipelineView>(leadKeys.pipelineView(), (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col) => ({
              ...col,
              leads: col.leads.filter((l) => l.id !== tempId),
              count: col.leads.filter((l) => l.id !== tempId).length,
            })),
            totalLeads: old.totalLeads - 1,
          };
        });

        toast({
          title: 'Error al crear lead',
          description:
            error instanceof Error ? error.message : 'No se pudo crear el lead',
          variant: 'destructive',
        });

        throw error; // Re-throw to handle in form if needed
      }
    },
    [queryClient, createLead, toast]
  );

  return {
    createWithOptimistic,
    isPending: createLead.isPending,
  };
}

export default useOptimisticCreate;
