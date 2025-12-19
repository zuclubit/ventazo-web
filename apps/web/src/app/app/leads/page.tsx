'use client';

/**
 * Leads Page - Kanban View
 *
 * Redesigned as a Kanban board for visual pipeline management.
 * Fully responsive:
 * - Mobile: Horizontal snap scrolling, bottom Sheet for preview
 * - Tablet: Scrollable columns, side panel for preview
 * - Desktop: All columns visible, right panel for preview
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, LayoutList, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RBACGuard } from '@/lib/auth';
import { usePipelineView, type Lead } from '@/lib/leads';

// Components
import {
  KanbanBoard,
  KanbanSkeleton,
  LeadsEmptyState,
  LeadFormSheet,
  DeleteLeadDialog,
  ConvertLeadDialog,
  LeadPreviewPanel,
} from './components';

// ============================================
// Leads Page Component - Kanban View
// ============================================

export default function LeadsPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 1023px)');

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

  // Derived values
  const columns = pipelineData?.stages ?? [];
  const totalLeads = pipelineData?.totalLeads ?? 0;
  const isEmpty = columns.length === 0 || columns.every((c) => c.leads.length === 0);

  // Handlers
  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLeadEdit = (lead: Lead) => {
    setEditLead(lead);
  };

  const handleLeadDelete = (lead: Lead) => {
    setDeleteLead(lead);
  };

  const handleLeadConvert = (lead: Lead) => {
    setConvertLead(lead);
  };

  const handleClosePreview = () => {
    setSelectedLead(null);
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Responsive */}
        <div className="shrink-0 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 md:pb-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2">
            {/* Title Section */}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">
                Leads
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {isLoading ? (
                  'Cargando...'
                ) : error ? (
                  'Error al cargar'
                ) : (
                  <>
                    <span className="font-medium">{totalLeads}</span> leads en pipeline
                  </>
                )}
              </p>
            </div>

            {/* Actions Section */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Refresh Button - Icon only on mobile */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="h-8 w-8 sm:h-9 sm:w-9"
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
            </div>
          </div>
        </div>

        {/* Kanban Board - Responsive Container */}
        <div className="flex-1 overflow-hidden py-3 sm:py-4 md:py-6 px-0 sm:px-4 md:px-6">
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
          ) : isEmpty && !isLoading ? (
            <div className="px-4 sm:px-0">
              <LeadsEmptyState
                onAddLead={() => setIsCreateOpen(true)}
                onConnectWhatsApp={() => router.push('/app/settings/integrations')}
                onImport={() => {
                  // TODO: Open import dialog
                  console.log('Import leads');
                }}
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
        </div>
      </div>

      {/* Preview Panel - Desktop (lg+) */}
      {!isMobile && selectedLead && (
        <LeadPreviewPanel
          lead={selectedLead}
          onClose={handleClosePreview}
          onEdit={() => handleLeadEdit(selectedLead)}
          onDelete={() => handleLeadDelete(selectedLead)}
          onConvert={() => handleLeadConvert(selectedLead)}
          isMobile={false}
        />
      )}

      {/* Preview Sheet - Mobile/Tablet */}
      {isMobile && (
        <Sheet open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <SheetContent
            side="bottom"
            className="h-[85vh] rounded-t-2xl px-0"
          >
            <SheetHeader className="px-4 pb-2 border-b">
              <SheetTitle className="text-left">Detalle del Lead</SheetTitle>
            </SheetHeader>
            <div className="overflow-y-auto h-full pb-safe">
              {selectedLead && (
                <LeadPreviewPanel
                  lead={selectedLead}
                  onClose={handleClosePreview}
                  onEdit={() => {
                    handleLeadEdit(selectedLead);
                    setSelectedLead(null);
                  }}
                  onDelete={() => {
                    handleLeadDelete(selectedLead);
                    setSelectedLead(null);
                  }}
                  onConvert={() => {
                    handleLeadConvert(selectedLead);
                    setSelectedLead(null);
                  }}
                  isMobile={true}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Create/Edit Sheet */}
      <LeadFormSheet
        lead={editLead}
        open={isCreateOpen || !!editLead}
        onClose={() => {
          setIsCreateOpen(false);
          setEditLead(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteLeadDialog
        lead={deleteLead}
        open={!!deleteLead}
        onClose={() => setDeleteLead(null)}
      />

      {/* Convert Dialog */}
      <ConvertLeadDialog
        lead={convertLead}
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
      />
    </div>
  );
}
