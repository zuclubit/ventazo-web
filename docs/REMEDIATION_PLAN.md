# Remediation Plan - Lead Kanban Actions

**Date:** 2025-12-30
**Sprint:** CRM-2025-Q1-S1
**Owner:** Engineering Team
**Estimated Effort:** 10 hours total

---

## Priority Matrix

| Priority | Issue | Effort | Impact | ROI |
|----------|-------|--------|--------|-----|
| P0-1 | Optimistic Delete + Undo | 2h | Very High | **Excellent** |
| P0-2 | Optimistic Create | 2h | High | **Excellent** |
| P1-1 | Optimistic Edit | 2h | High | **Good** |
| P2-1 | Form skeleton for stages | 1h | Medium | Good |
| P2-2 | Column pre-selection | 1h | Medium | Good |
| P2-3 | Soft-delete infrastructure | 4h | Medium | Medium |

---

## Phase 1: P0 Fixes (Day 1)

### Task 1.1: Optimistic Delete with Undo

**File:** `apps/web/src/app/app/leads/hooks/useOptimisticDelete.ts` (new)

**Implementation:**

```typescript
'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDeleteLead, leadKeys, type Lead, type PipelineView } from '@/lib/leads';
import { ToastAction } from '@/components/ui/toast';

const UNDO_WINDOW_MS = 5000;

export function useOptimisticDelete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteLead = useDeleteLead();
  const undoTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const pendingDeleteRef = React.useRef<{
    leadId: string;
    previousData: PipelineView | undefined;
  } | null>(null);

  const deleteWithUndo = React.useCallback(
    async (lead: Lead, onComplete?: () => void) => {
      // 1. Cancel any pending delete
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // 2. Capture previous state
      const previousData = queryClient.getQueryData<PipelineView>(
        leadKeys.pipelineView()
      );

      // 3. Optimistic removal with fade animation
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
      pendingDeleteRef.current = { leadId: lead.id, previousData };

      // 5. Notify completion (close dialog)
      onComplete?.();

      // 6. Show undo toast
      toast({
        title: 'Lead eliminado',
        description: `${lead.fullName} fue eliminado`,
        duration: UNDO_WINDOW_MS,
        action: (
          <ToastAction
            altText="Deshacer eliminación"
            onClick={() => {
              // Cancel the delete
              if (undoTimeoutRef.current) {
                clearTimeout(undoTimeoutRef.current);
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
            Deshacer
          </ToastAction>
        ),
      });

      // 7. Schedule actual delete after undo window
      undoTimeoutRef.current = setTimeout(async () => {
        try {
          await deleteLead.mutateAsync(lead.id);
          pendingDeleteRef.current = null;
        } catch (error) {
          // Rollback on error
          if (pendingDeleteRef.current?.previousData) {
            queryClient.setQueryData(
              leadKeys.pipelineView(),
              pendingDeleteRef.current.previousData
            );
          }
          pendingDeleteRef.current = null;
          toast({
            title: 'Error al eliminar',
            description: error instanceof Error ? error.message : 'No se pudo eliminar el lead',
            variant: 'destructive',
          });
        }
      }, UNDO_WINDOW_MS);
    },
    [queryClient, deleteLead, toast]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  return {
    deleteWithUndo,
    isPending: deleteLead.isPending,
  };
}
```

**File:** `apps/web/src/app/app/leads/components/delete-lead-dialog.tsx` (modified)

**Changes:**

```typescript
// Add import
import { useOptimisticDelete } from '../hooks/useOptimisticDelete';

// Replace useDeleteLead with useOptimisticDelete
export function DeleteLeadDialog({ lead, open, onClose }: DeleteLeadDialogProps) {
  const { deleteWithUndo, isPending } = useOptimisticDelete();

  const handleDelete = () => {
    if (!lead) return;
    deleteWithUndo(lead, onClose);
  };

  // Rest of component stays the same, but button is no longer async
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      {/* ... */}
      <Button
        disabled={isPending}
        variant="destructive"
        onClick={handleDelete}  // No longer async
      >
        Eliminar Lead
      </Button>
    </Dialog>
  );
}
```

---

### Task 1.2: Optimistic Create

**File:** `apps/web/src/app/app/leads/hooks/useOptimisticCreate.ts` (new)

**Implementation:**

```typescript
'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useCreateLead, leadKeys, type Lead, type PipelineView, type CreateLeadRequest } from '@/lib/leads';

export function useOptimisticCreate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createLead = useCreateLead();

  const createWithOptimistic = React.useCallback(
    async (data: CreateLeadRequest, targetStageId?: string, onComplete?: () => void) => {
      const tempId = `temp-${Date.now()}`;

      // Create temporary lead object
      const tempLead: Lead = {
        id: tempId,
        tenantId: '', // Will be set by server
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        companyName: data.companyName || null,
        jobTitle: data.jobTitle || null,
        website: data.website || null,
        industry: data.industry || null,
        source: data.source || 'manual',
        status: 'new',
        score: 0,
        stageId: targetStageId || null,
        tags: data.tags || [],
        notes: data.notes || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOptimistic: true, // Flag for styling
      } as Lead;

      // 1. Optimistic append to target column (or first column)
      queryClient.setQueryData<PipelineView>(
        leadKeys.pipelineView(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col, idx) => {
              const isTarget = targetStageId
                ? col.id === targetStageId
                : idx === 0;
              if (isTarget) {
                return {
                  ...col,
                  leads: [tempLead, ...col.leads],
                };
              }
              return col;
            }),
          };
        }
      );

      // 2. Close form immediately
      onComplete?.();

      // 3. Call API
      try {
        const realLead = await createLead.mutateAsync(data);

        // 4. Replace temp with real lead
        queryClient.setQueryData<PipelineView>(
          leadKeys.pipelineView(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              stages: old.stages.map((col) => ({
                ...col,
                leads: col.leads.map((l) =>
                  l.id === tempId ? { ...realLead, isOptimistic: false } : l
                ),
              })),
            };
          }
        );

        toast({
          title: 'Lead creado',
          description: `${realLead.fullName} agregado exitosamente`,
        });
      } catch (error) {
        // 5. Remove temp on error
        queryClient.setQueryData<PipelineView>(
          leadKeys.pipelineView(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              stages: old.stages.map((col) => ({
                ...col,
                leads: col.leads.filter((l) => l.id !== tempId),
              })),
            };
          }
        );

        toast({
          title: 'Error al crear lead',
          description: error instanceof Error ? error.message : 'No se pudo crear el lead',
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
```

---

## Phase 2: P1 Fixes (Day 2)

### Task 2.1: Optimistic Edit

**File:** `apps/web/src/app/app/leads/hooks/useOptimisticEdit.ts` (new)

```typescript
'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useUpdateLead, leadKeys, type Lead, type PipelineView, type UpdateLeadRequest } from '@/lib/leads';

export function useOptimisticEdit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateLead = useUpdateLead();

  const updateWithOptimistic = React.useCallback(
    async (
      leadId: string,
      data: UpdateLeadRequest,
      onComplete?: (updatedLead: Lead) => void
    ) => {
      // 1. Capture previous state
      const previousData = queryClient.getQueryData<PipelineView>(
        leadKeys.pipelineView()
      );

      // Find current lead
      let currentLead: Lead | undefined;
      previousData?.stages.forEach((col) => {
        const found = col.leads.find((l) => l.id === leadId);
        if (found) currentLead = found;
      });

      if (!currentLead) return;

      // 2. Create optimistic lead
      const optimisticLead: Lead = {
        ...currentLead,
        ...data,
        updatedAt: new Date().toISOString(),
      };

      // 3. Optimistic update
      queryClient.setQueryData<PipelineView>(
        leadKeys.pipelineView(),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            stages: old.stages.map((col) => ({
              ...col,
              leads: col.leads.map((l) =>
                l.id === leadId ? optimisticLead : l
              ),
            })),
          };
        }
      );

      // 4. Notify completion (switch to view mode)
      onComplete?.(optimisticLead);

      // 5. Call API
      try {
        const realLead = await updateLead.mutateAsync({ leadId, data });

        // 6. Update with real data
        queryClient.setQueryData<PipelineView>(
          leadKeys.pipelineView(),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              stages: old.stages.map((col) => ({
                ...col,
                leads: col.leads.map((l) =>
                  l.id === leadId ? realLead : l
                ),
              })),
            };
          }
        );

        toast({
          title: 'Lead actualizado',
          description: 'Los cambios fueron guardados',
        });
      } catch (error) {
        // 7. Rollback on error
        queryClient.setQueryData(leadKeys.pipelineView(), previousData);

        toast({
          title: 'Error al actualizar',
          description: error instanceof Error ? error.message : 'No se pudieron guardar los cambios',
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
```

---

## Phase 3: P2 Fixes (Day 3)

### Task 3.1: Export Hooks

**File:** `apps/web/src/app/app/leads/hooks/index.ts` (modified)

```typescript
// Add exports
export { useOptimisticDelete } from './useOptimisticDelete';
export { useOptimisticCreate } from './useOptimisticCreate';
export { useOptimisticEdit } from './useOptimisticEdit';
```

### Task 3.2: Add Optimistic Card Styling

**File:** `apps/web/src/app/app/leads/components/kanban/KanbanCard.tsx`

Add support for optimistic state visual feedback:

```typescript
// In KanbanCard props
export interface KanbanCardProps {
  lead: Lead;
  // ... existing props
}

// In component body, check for optimistic flag
const isOptimistic = (lead as any).isOptimistic === true;

// Apply styling
<div
  className={cn(
    // ... existing classes
    isOptimistic && 'opacity-70 animate-pulse border-dashed'
  )}
>
```

---

## Testing Checklist

### Delete Action

- [ ] Card fades out immediately on delete confirm
- [ ] Undo toast appears with 5s duration
- [ ] Clicking "Deshacer" restores the card
- [ ] After 5s, API delete is called
- [ ] On API error, card is restored with error toast
- [ ] Multiple rapid deletes work correctly

### Create Action

- [ ] Card appears immediately with optimistic styling
- [ ] Form closes immediately on submit
- [ ] On API success, card styling normalizes
- [ ] On API error, card is removed with error toast
- [ ] Multiple rapid creates work correctly

### Edit Action

- [ ] Changes reflect immediately in view mode
- [ ] Sheet switches to view mode immediately on save
- [ ] On API success, data is confirmed
- [ ] On API error, changes are reverted with error toast

---

## Rollback Plan

If issues are detected in production:

1. **Feature Flag**: Add `NEXT_PUBLIC_OPTIMISTIC_ACTIONS=false` env var
2. **Conditional Import**: Check flag before using optimistic hooks
3. **Fallback**: Use original non-optimistic mutations

```typescript
const useDelete = process.env.NEXT_PUBLIC_OPTIMISTIC_ACTIONS === 'true'
  ? useOptimisticDelete
  : () => {
      const deleteLead = useDeleteLead();
      return { deleteWithUndo: deleteLead.mutateAsync, isPending: deleteLead.isPending };
    };
```

---

## Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Delete perceived latency | ~400ms | <50ms | Lighthouse + RUM |
| Create perceived latency | ~700ms | <50ms | Lighthouse + RUM |
| Edit perceived latency | ~500ms | <50ms | Lighthouse + RUM |
| Undo usage rate | 0% | Track | Analytics event |
| Error rollback success | N/A | 100% | Error tracking |

---

## Timeline

| Day | Tasks | Deliverables |
|-----|-------|--------------|
| Day 1 AM | Task 1.1: Optimistic Delete | Hook + Dialog integration |
| Day 1 PM | Task 1.2: Optimistic Create | Hook + Form integration |
| Day 2 AM | Task 2.1: Optimistic Edit | Hook + Sheet integration |
| Day 2 PM | Testing & QA | All test cases pass |
| Day 3 | P2 improvements | Skeletons, pre-selection |

---

*Remediation Plan for Ventazo CRM Lead Kanban*
