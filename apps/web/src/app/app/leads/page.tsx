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
import { useRouter } from 'next/navigation';
import { Plus, LayoutList, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
  LeadsKPIBar,
  type KPIFilterType,
} from './components';

// Hooks
import { useKanbanTheme } from './hooks';

// ============================================
// Leads Page Component - Kanban View
// ============================================

export default function LeadsPage() {
  const router = useRouter();

  // Initialize dynamic Kanban theming (applies CSS variables)
  useKanbanTheme();

  // Fetch pipeline data
  const {
    data: pipelineData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = usePipelineView();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // KPI filter state
  const [kpiFilter, setKpiFilter] = React.useState<KPIFilterType | null>(null);

  // Derived values
  const columns = pipelineData?.stages ?? [];
  const totalLeads = pipelineData?.totalLeads ?? 0;
  const isEmpty = columns.length === 0 || columns.every((c) => c.leads.length === 0);

  // Filtered columns based on KPI filter
  const filteredColumns = React.useMemo(() => {
    if (!kpiFilter || kpiFilter === 'all') return columns;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return columns.map((col) => ({
      ...col,
      leads: col.leads.filter((lead) => {
        switch (kpiFilter) {
          case 'new': {
            const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
            return createdAt && createdAt >= oneWeekAgo;
          }
          case 'hot':
            return lead.score >= 70;
          case 'follow-up': {
            if (!lead.nextFollowUpAt) return false;
            const followUpDate = new Date(lead.nextFollowUpAt);
            return followUpDate <= today;
          }
          default:
            return true;
        }
      }),
    }));
  }, [columns, kpiFilter]);

  // Handlers
  const handleLeadClick = (lead: Lead) => setSelectedLead(lead);
  const handleLeadEdit = (lead: Lead) => setEditLead(lead);
  const handleLeadDelete = (lead: Lead) => setDeleteLead(lead);
  const handleLeadConvert = (lead: Lead) => setConvertLead(lead);
  const handleClosePreview = () => setSelectedLead(null);
  const handleRefresh = () => refetch();

  // Subtitle based on state
  const subtitle = isLoading
    ? 'Cargando...'
    : error
      ? 'Error al cargar'
      : `${totalLeads} leads en pipeline`;

  return (
    <PageContainer variant="full-bleed">
      {/* Header - Fixed height, never scrolls */}
      <PageContainer.Header bordered>
        <PageContainer.HeaderRow>
          <PageContainer.Title subtitle={subtitle}>
            Leads
          </PageContainer.Title>

          <PageContainer.Actions>
            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefetching}
              className="h-8 w-8 sm:h-9 sm:w-9"
              aria-label="Actualizar"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
              />
            </Button>

            {/* List View Button - Hidden on mobile */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/app/leads/list')}
              className="hidden sm:flex h-8 sm:h-9"
            >
              <LayoutList className="h-4 w-4 sm:mr-2" />
              <span className="hidden md:inline">Vista Lista</span>
            </Button>

            {/* New Lead Button */}
            <RBACGuard fallback={null} minRole="sales_rep">
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="ventazo-button h-8 sm:h-9 px-2.5 sm:px-3"
                size="sm"
              >
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Nuevo</span>
              </Button>
            </RBACGuard>
          </PageContainer.Actions>
        </PageContainer.HeaderRow>
      </PageContainer.Header>

      {/* KPI Dashboard - Above Kanban */}
      {!isLoading && !error && columns.length > 0 && (
        <div className="shrink-0 py-3 border-b border-border/50 bg-background/50 backdrop-blur-sm">
          <LeadsKPIBar
            columns={columns}
            activeFilter={kpiFilter}
            onFilterChange={setKpiFilter}
          />
        </div>
      )}

      {/* Body: Content + Optional Sidebar */}
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
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          ) : isEmpty ? (
            <div className="flex items-center justify-center h-full p-4">
              <LeadsEmptyState
                onAddLead={() => setIsCreateOpen(true)}
                onConnectWhatsApp={() => router.push('/app/settings/integrations')}
                onImport={() => console.log('Import leads')}
              />
            </div>
          ) : (
            <KanbanBoard
              columns={filteredColumns}
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

      {/* Mobile FAB - Visible only on mobile/tablet */}
      <RBACGuard fallback={null} minRole="sales_rep">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="mobile-fab"
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
