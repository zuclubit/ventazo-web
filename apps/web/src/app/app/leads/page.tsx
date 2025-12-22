'use client';

/**
 * Leads Page - Kanban View (v2.0)
 *
 * Redesigned with bulletproof layout architecture.
 * Uses PageContainer pattern for consistent containment.
 *
 * Layout Structure:
 * PageContainer (flex-col, flex-1, min-h-0)
 *   ├── Header (shrink-0)
 *   └── Body (flex-1, min-h-0)
 *       ├── Content scroll="horizontal" (flex-1, min-h-0, overflow-x-auto)
 *       │   └── KanbanBoard (inline-flex, h-full)
 *       │       └── KanbanColumn[] (flex-col, h-full, shrink-0)
 *       │           ├── Header (shrink-0)
 *       │           └── Cards (flex-1, min-h-0, overflow-y-auto)
 *       └── Sidebar (optional, hidden on mobile)
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
import { usePipelineView, type Lead } from '@/lib/leads';

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
import { useKanbanTheme } from './hooks';

// ============================================
// Leads Page Component - Kanban View
// ============================================

export default function LeadsPage() {
  // Initialize dynamic Kanban theming (applies CSS variables)
  useKanbanTheme();

  // Fetch pipeline data
  const {
    data: pipelineData,
    isLoading,
    error,
    refetch,
  } = usePipelineView();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // Derived values
  const columns = pipelineData?.stages ?? [];
  const isEmpty = columns.length === 0 || columns.every((c) => c.leads.length === 0);

  // Handlers
  const handleLeadClick = (lead: Lead) => setSelectedLead(lead);
  const handleLeadEdit = (lead: Lead) => setEditLead(lead);
  const handleLeadDelete = (lead: Lead) => setDeleteLead(lead);
  const handleLeadConvert = (lead: Lead) => setConvertLead(lead);
  const handleClosePreview = () => setSelectedLead(null);
  const handleRefresh = () => refetch();

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
          refetch();
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
