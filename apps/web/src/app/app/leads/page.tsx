'use client';

/**
 * Leads Page - Kanban View (v3.0 - Homologated with Opportunities)
 *
 * Redesigned with bulletproof layout architecture.
 * Uses PageContainer pattern for consistent containment.
 * Homologated with Opportunities module patterns.
 *
 * v3.0 Features (Homologated with Opportunities):
 * - Stage transition validation with visual feedback
 * - Per-lead loading states
 * - Terminal stage handling (won/lost via convert dialog)
 * - Retry logic with exponential backoff
 * - Undo capability for recent moves
 *
 * Layout Structure:
 * PageContainer (flex-col, flex-1, min-h-0)
 *   └── Body (flex-1, min-h-0)
 *       └── Content scroll="horizontal" (flex-1, min-h-0, overflow-x-auto)
 *           └── KanbanBoard (inline-flex, h-full)
 *               └── KanbanColumn[] (flex-col, h-full, shrink-0)
 *
 * @version 3.0.0
 */

import * as React from 'react';
import { Plus } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { RBACGuard } from '@/lib/auth';
import { type Lead } from '@/lib/leads';

// Components
import {
  KanbanBoard,
  KanbanSkeleton,
  LeadsEmptyState,
  LeadFormSheet,
  LeadDetailSheet,
  DeleteLeadDialog,
  ConvertLeadDialog,
} from './components';

// Hooks
import { useKanbanTheme, useLeadsKanban } from './hooks';

// ============================================
// Leads Page Component - Kanban View
// ============================================

export default function LeadsPage() {
  // Initialize dynamic Kanban theming (applies CSS variables)
  useKanbanTheme();

  // Dialog states (defined first so they can be used in callbacks)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // Pipeline Kanban data with enhanced state management (homologated with Opportunities)
  const {
    columns,
    isLoading,
    error,
    isMoving,
    isLeadMoving,
    canMoveToStage,
    moveToStage,
    refetchPipeline,
  } = useLeadsKanban({
    onMoveSuccess: (leadId, targetStageId) => {
      // Optionally refresh or handle success
      console.log(`Lead ${leadId} moved to ${targetStageId}`);
    },
    onMoveError: (err, leadId) => {
      console.error(`Failed to move lead ${leadId}:`, err);
    },
    onTerminalStageAttempt: (lead, stageType) => {
      // Open convert dialog when user tries to drag to won/lost stage
      if (stageType === 'won') {
        setConvertLead(lead);
      }
      // For 'lost', we could add a "Mark as Lost" dialog in the future
    },
  });

  // Derived values
  const isEmpty = columns.length === 0 || columns.every((c) => c.leads.length === 0);

  // Handlers
  const handleLeadClick = React.useCallback((lead: Lead) => setSelectedLead(lead), []);
  const handleLeadEdit = React.useCallback((lead: Lead) => setEditLead(lead), []);
  const handleLeadDelete = React.useCallback((lead: Lead) => setDeleteLead(lead), []);
  const handleLeadConvert = React.useCallback((lead: Lead) => setConvertLead(lead), []);
  const handleClosePreview = React.useCallback(() => setSelectedLead(null), []);
  const handleRefresh = React.useCallback(() => refetchPipeline(), [refetchPipeline]);

  return (
    <PageContainer variant="full-bleed">
      {/* Body: Full height Kanban */}
      <PageContainer.Body>
        {/*
          Main Content Area
          CRITICAL: scroll="horizontal" enables horizontal scroll
          The KanbanBoard will be h-full inside this container
        */}
        <PageContainer.Content scroll="horizontal" padding="none">
          {isLoading ? (
            <KanbanSkeleton columns={5} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <p className="text-destructive text-center mb-4">
                Error al cargar el pipeline
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
              >
                Reintentar
              </button>
            </div>
          ) : isEmpty ? (
            <div className="flex items-center justify-center h-full p-4">
              <LeadsEmptyState
                onAddLead={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            <KanbanBoard
              columns={columns}
              isLoading={isLoading}
              isMoving={isMoving}
              canMoveToStage={canMoveToStage}
              isLeadMoving={isLeadMoving}
              onMoveToStage={moveToStage}
              onLeadClick={handleLeadClick}
              onLeadEdit={handleLeadEdit}
              onLeadDelete={handleLeadDelete}
              onLeadConvert={handleLeadConvert}
            />
          )}
        </PageContainer.Content>

      </PageContainer.Body>

      {/* Lead Detail Sheet - Unified View/Edit */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onClose={handleClosePreview}
        onSuccess={() => {
          refetchPipeline();
          setSelectedLead(null);
        }}
        onDelete={() => {
          if (selectedLead) handleLeadDelete(selectedLead);
          setSelectedLead(null);
        }}
        onConvert={() => {
          if (selectedLead) handleLeadConvert(selectedLead);
          setSelectedLead(null);
        }}
      />

      {/* FAB - Floating Action Button for creating leads */}
      <RBACGuard fallback={null} minRole="sales_rep">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="leads-fab"
          aria-label="Nuevo Lead"
        >
          <Plus className="h-6 w-6" />
        </button>
      </RBACGuard>

      {/* Dialogs */}
      <LeadFormSheet
        lead={editLead}
        open={isCreateOpen || !!editLead}
        onClose={() => {
          setIsCreateOpen(false);
          setEditLead(null);
        }}
      />
      <DeleteLeadDialog
        lead={deleteLead}
        open={!!deleteLead}
        onClose={() => setDeleteLead(null)}
      />
      <ConvertLeadDialog
        lead={convertLead}
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
      />
    </PageContainer>
  );
}
