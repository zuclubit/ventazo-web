'use client';

/**
 * Leads Page - Redesigned
 *
 * Features:
 * - Hybrid list + preview layout (Gmail-style)
 * - Smart KPI dashboard with clickable filters
 * - Quick actions (WhatsApp, Call, Email)
 * - Glassmorphism styling matching landing page
 * - Mobile responsive with Sheet for preview
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  ChevronLeft,
  ChevronRight,
  Kanban,
  Loader2,
  Plus,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { RBACGuard } from '@/lib/auth';
import {
  useLeadsManagement,
  LeadStatus,
  LeadSource,
  type Lead,
} from '@/lib/leads';

// New redesigned components
import {
  LeadCard,
  LeadsKPIDashboard,
  LeadPreviewPanel,
  LeadFiltersBar,
  LeadsEmptyState,
  LeadFormDialog,
  DeleteLeadDialog,
  ConvertLeadDialog,
  defaultFilters,
  type LeadFilters,
  type LeadsFilter,
} from './components';

// ============================================
// Types
// ============================================

type ViewMode = 'list' | 'compact';

// ============================================
// Leads Page Component
// ============================================

export default function LeadsPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 1024px)');

  // View mode
  const [viewMode, setViewMode] = React.useState<ViewMode>('list');

  // Filters state
  const [filters, setFilters] = React.useState<LeadFilters>(defaultFilters);
  const [kpiFilter, setKpiFilter] = React.useState<LeadsFilter>('all');

  // Pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.searchTerm), 300);
    return () => clearTimeout(timer);
  }, [filters.searchTerm]);

  // Selected lead for preview
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);

  // Data fetching
  const {
    leads,
    meta,
    statistics,
    isLoading,
    isStatsLoading,
    refetchLeads,
  } = useLeadsManagement({
    page,
    limit: pageSize,
    searchTerm: debouncedSearch || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
    source: filters.source !== 'all' ? filters.source : undefined,
    minScore: filters.minScore > 0 ? filters.minScore : undefined,
    maxScore: filters.maxScore < 100 ? filters.maxScore : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Apply KPI filter client-side
  const filteredLeads = React.useMemo(() => {
    if (kpiFilter === 'all') return leads;

    return leads.filter((lead) => {
      switch (kpiFilter) {
        case 'hot':
          return lead.score >= 80;
        case 'no-contact': {
          const lastActivity = lead.lastActivityAt || lead.updatedAt;
          const hoursSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60);
          return hoursSince > 48;
        }
        case 'converted':
          return lead.status === LeadStatus.CONVERTED;
        default:
          return true;
      }
    });
  }, [leads, kpiFilter]);

  // Selected lead object
  const selectedLead = React.useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.status, filters.source, filters.minScore, filters.maxScore]);

  // Handlers
  const handleKPIFilterChange = (filter: LeadsFilter) => {
    setKpiFilter(filter);
    setPage(1);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
  };

  const handleClosePreview = () => {
    setSelectedLeadId(null);
  };

  const handleEditFromPreview = () => {
    if (selectedLead) {
      setEditLead(selectedLead);
    }
  };

  const handleDeleteFromPreview = () => {
    if (selectedLead) {
      setDeleteLead(selectedLead);
    }
  };

  const handleConvertFromPreview = () => {
    if (selectedLead) {
      setConvertLead(selectedLead);
    }
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setKpiFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = React.useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.status !== 'all' ||
      filters.source !== 'all' ||
      filters.minScore > 0 ||
      filters.maxScore < 100 ||
      filters.tags.length > 0 ||
      kpiFilter !== 'all'
    );
  }, [filters, kpiFilter]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Header */}
        <div className="shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tus prospectos y convierte oportunidades
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
                className="hidden sm:flex"
              >
                <ToggleGroupItem value="list" aria-label="Vista lista">
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="compact" aria-label="Vista compacta">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <Separator orientation="vertical" className="h-6 hidden sm:block" />

              {/* Pipeline Button */}
              <Button variant="outline" onClick={() => router.push('/app/leads/pipeline')}>
                <Kanban className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </Button>

              {/* New Lead Button */}
              <RBACGuard fallback={null} minRole="sales_rep">
                <Button onClick={() => setIsCreateOpen(true)} className="ventazo-button">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Nuevo Lead</span>
                </Button>
              </RBACGuard>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto px-6 pb-6 space-y-5">
          {/* KPI Dashboard */}
          <LeadsKPIDashboard
            statistics={statistics}
            leads={leads}
            isLoading={isStatsLoading}
            onFilterChange={handleKPIFilterChange}
            activeFilter={kpiFilter}
          />

          {/* Filters Bar */}
          <LeadFiltersBar
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={() => refetchLeads()}
            isRefreshing={isLoading}
          />

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            hasActiveFilters ? (
              <LeadsEmptyState
                variant="search"
                searchTerm={filters.searchTerm}
                onClearFilters={handleClearFilters}
              />
            ) : (
              <LeadsEmptyState
                onAddLead={() => setIsCreateOpen(true)}
                onConnectWhatsApp={() => router.push('/app/settings/integrations')}
                onImport={() => {
                  // TODO: Open import dialog
                  console.log('Import leads');
                }}
              />
            )
          ) : (
            <>
              {/* Lead Cards */}
              <div className="space-y-2">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    variant={viewMode === 'compact' ? 'compact' : 'default'}
                    selected={selectedLeadId === lead.id}
                    onClick={() => handleLeadClick(lead)}
                    showQuickActions={viewMode === 'list'}
                    onEdit={() => setEditLead(lead)}
                    onDelete={() => setDeleteLead(lead)}
                    onConvert={() => setConvertLead(lead)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {filteredLeads.length} de {meta.total} leads
                    {' '}• Página {meta.page} de {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview Panel (Desktop) */}
      {!isMobile && selectedLead && (
        <LeadPreviewPanel
          lead={selectedLead}
          onClose={handleClosePreview}
          onEdit={handleEditFromPreview}
          onDelete={handleDeleteFromPreview}
          onConvert={handleConvertFromPreview}
          isMobile={false}
        />
      )}

      {/* Preview Panel (Mobile - Sheet) */}
      {isMobile && (
        <LeadPreviewPanel
          lead={selectedLead}
          onClose={handleClosePreview}
          onEdit={handleEditFromPreview}
          onDelete={handleDeleteFromPreview}
          onConvert={handleConvertFromPreview}
          isMobile={true}
        />
      )}

      {/* Create/Edit Dialog */}
      <LeadFormDialog
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
