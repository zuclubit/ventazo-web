'use client';

/**
 * Opportunities Page - Pipeline Kanban View (v2.0)
 *
 * Redesigned with bulletproof layout architecture.
 * Homologated with Leads module design patterns.
 * Uses PageContainer pattern for consistent containment.
 *
 * Layout Structure:
 * PageContainer (flex-col, flex-1, min-h-0)
 *   └── Body (flex-1, min-h-0)
 *       └── Content scroll="horizontal" (flex-1, min-h-0, overflow-x-auto)
 *           └── OpportunityKanbanBoard (inline-flex, h-full)
 *               └── OpportunityKanbanColumn[] (flex-col, h-full, shrink-0)
 *
 * Pipeline Stages (from backend):
 * Dynamic stages based on tenant configuration
 *
 * Responsive behavior:
 * - Mobile: Horizontal scroll, bottom Sheet for preview
 * - Tablet: Scrollable columns, side panel
 * - Desktop: All columns visible, right panel
 */

import * as React from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { RBACGuard } from '@/lib/auth';
import { type Opportunity } from '@/lib/opportunities';
import { useToast } from '@/hooks/use-toast';

// Components
import {
  OpportunityKanbanBoard,
  OpportunityKanbanBoardSkeleton,
  OpportunitiesEmptyState,
  OpportunityDetailSheet,
  OpportunityFormSheet,
} from './components';
import { WinLostDialog } from './components/win-lost-dialog';
import { DeleteOpportunityDialog } from './components/delete-opportunity-dialog';

// Hooks
import {
  useOpportunityKanban,
  useWinLostDialog,
  useOpportunityTheme,
} from './hooks';

// ============================================
// Opportunities Page Component - Pipeline Kanban View
// ============================================

export default function OpportunitiesPage() {
  // Initialize dynamic pipeline theming (applies CSS variables)
  useOpportunityTheme();

  // Toast hook for user feedback
  const { toast } = useToast();

  // Dialog states (defined first so they can be used in callbacks)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editOpportunity, setEditOpportunity] = React.useState<Opportunity | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = React.useState<Opportunity | null>(null);
  const [deleteOpportunity, setDeleteOpportunity] = React.useState<Opportunity | null>(null);

  // Win/Lost dialog (defined before useOpportunityKanban so callback can use it)
  const winLostDialog = useWinLostDialog();

  // Pipeline Kanban data with enhanced state management
  const {
    columns,
    isLoading,
    isMoving,
    isOpportunityMoving,
    canMoveToStage,
    moveToStage,
    refetchPipeline,
  } = useOpportunityKanban({
    onMoveSuccess: (_opportunityId, _targetStageId) => {
      // Show success toast to user
      toast({
        title: 'Oportunidad movida',
        description: 'La oportunidad se movió exitosamente a la nueva etapa.',
      });
    },
    onMoveError: (error, _opportunityId) => {
      // Show error toast to user
      toast({
        title: 'Error al mover',
        description: error instanceof Error ? error.message : 'No se pudo mover la oportunidad. Intenta de nuevo.',
        variant: 'destructive',
      });
    },
    onTerminalStageAttempt: (opportunity, stageType) => {
      // Open appropriate dialog when user tries to drag to won/lost stage
      if (stageType === 'won') {
        winLostDialog.openWinDialog(opportunity);
      } else if (stageType === 'lost') {
        winLostDialog.openLostDialog(opportunity);
      }
    },
  });

  // Derived values
  const isEmpty = columns.length === 0 || columns.every((col) => col.opportunities.length === 0);

  // Handlers
  const handleOpportunityClick = React.useCallback((opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
  }, []);

  const handleOpportunityEdit = React.useCallback((opportunity: Opportunity) => {
    setEditOpportunity(opportunity);
  }, []);

  const handleOpportunityWin = React.useCallback((opportunity: Opportunity) => {
    winLostDialog.openWinDialog(opportunity);
  }, [winLostDialog]);

  const handleOpportunityLost = React.useCallback((opportunity: Opportunity) => {
    winLostDialog.openLostDialog(opportunity);
  }, [winLostDialog]);

  const handleClosePreview = React.useCallback(() => {
    setSelectedOpportunity(null);
  }, []);

  const handleAddOpportunity = React.useCallback((_stageId?: string) => {
    // Could pre-select stage in form
    setIsCreateOpen(true);
  }, []);

  const handleRefresh = React.useCallback(() => {
    refetchPipeline();
  }, [refetchPipeline]);

  return (
    <PageContainer variant="full-bleed">
      {/* Body: Full height Kanban */}
      <PageContainer.Body>
        {/*
          Main Content Area
          CRITICAL: scroll="horizontal" enables horizontal scroll
          The OpportunityKanbanBoard will be h-full inside this container
        */}
        <PageContainer.Content scroll="horizontal" padding="none">
          {isLoading ? (
            <OpportunityKanbanBoardSkeleton />
          ) : isEmpty ? (
            <div className="flex items-center justify-center h-full p-4">
              <OpportunitiesEmptyState
                onCreateManually={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            <OpportunityKanbanBoard
              columns={columns}
              isLoading={isLoading}
              isMoving={isMoving}
              canMoveToStage={canMoveToStage}
              isOpportunityMoving={isOpportunityMoving}
              onMoveToStage={moveToStage}
              onOpportunityClick={handleOpportunityClick}
              onOpportunityEdit={handleOpportunityEdit}
              onOpportunityWin={handleOpportunityWin}
              onOpportunityLost={handleOpportunityLost}
              onAddOpportunity={handleAddOpportunity}
            />
          )}
        </PageContainer.Content>
      </PageContainer.Body>

      {/* Opportunity Detail Sheet - Unified View/Edit */}
      <OpportunityDetailSheet
        opportunity={selectedOpportunity}
        open={!!selectedOpportunity}
        onClose={handleClosePreview}
        onSuccess={() => {
          refetchPipeline();
          setSelectedOpportunity(null);
        }}
        onDelete={() => {
          // Open delete confirmation dialog
          if (selectedOpportunity) {
            setDeleteOpportunity(selectedOpportunity);
          }
          setSelectedOpportunity(null);
        }}
        onWin={() => {
          if (selectedOpportunity) handleOpportunityWin(selectedOpportunity);
          setSelectedOpportunity(null);
        }}
        onLost={() => {
          if (selectedOpportunity) handleOpportunityLost(selectedOpportunity);
          setSelectedOpportunity(null);
        }}
      />

      {/* FAB - Floating Action Button for creating opportunities */}
      <RBACGuard fallback={null} minRole="sales_rep">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="opportunities-fab"
          aria-label="Nueva Oportunidad"
        >
          <Plus className="h-6 w-6" />
        </button>
      </RBACGuard>

      {/* Dialogs */}
      <OpportunityFormSheet
        open={isCreateOpen || !!editOpportunity}
        opportunity={editOpportunity}
        onClose={() => {
          setIsCreateOpen(false);
          setEditOpportunity(null);
        }}
      />

      <WinLostDialog
        open={winLostDialog.isOpen}
        opportunity={winLostDialog.opportunity}
        action={winLostDialog.action}
        onClose={winLostDialog.closeDialog}
      />

      <DeleteOpportunityDialog
        open={!!deleteOpportunity}
        opportunity={deleteOpportunity}
        onClose={() => {
          setDeleteOpportunity(null);
          refetchPipeline();
        }}
      />
    </PageContainer>
  );
}
