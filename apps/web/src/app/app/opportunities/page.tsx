'use client';

/**
 * Opportunities Page - Redesigned
 *
 * Kanban-first view homologated with Leads page design:
 * - KPI Dashboard with glassmorphism
 * - Kanban board as primary view
 * - Right sidebar preview panel (desktop) / Sheet (mobile)
 * - Responsive multi-device experience
 *
 * Based on leads module architecture and design patterns.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Search,
  List,
  Kanban,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMediaQuery } from '@/hooks/use-media-query';
import { RBACGuard } from '@/lib/auth';
import {
  usePipelineStages,
  type Opportunity,
  type OpportunityStatus,
  type OpportunityPriority,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_PRIORITY,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/lib/opportunities';
import { cn } from '@/lib/utils';

// Local components
import {
  OpportunitiesKPIDashboard,
  OpportunityKanbanBoard,
  OpportunityPreviewPanel,
  OpportunitiesEmptyState,
  OpportunitiesPageSkeleton,
  type OpportunityKPIFilter,
} from './components';
import { useOpportunityKanban, useWinLostDialog } from './hooks';
import { OpportunityFormDialog } from './components/opportunity-form-dialog';
import { WinLostDialog } from './components/win-lost-dialog';

// ============================================
// View Toggle Component
// ============================================

type ViewMode = 'kanban' | 'list';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg p-1 bg-muted/30">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 px-3 rounded-md',
          mode === 'kanban' && 'bg-background shadow-sm'
        )}
        onClick={() => onChange('kanban')}
      >
        <Kanban className="h-4 w-4 mr-1.5" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 px-3 rounded-md',
          mode === 'list' && 'bg-background shadow-sm'
        )}
        onClick={() => onChange('list')}
      >
        <List className="h-4 w-4 mr-1.5" />
        <span className="hidden sm:inline">Lista</span>
      </Button>
    </div>
  );
}

// ============================================
// Filter Chips Component
// ============================================

interface FilterChipsProps {
  statusFilter: OpportunityStatus | 'all';
  priorityFilter: OpportunityPriority | 'all';
  stageFilter: string;
  searchTerm: string;
  onClearStatus: () => void;
  onClearPriority: () => void;
  onClearStage: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}

function FilterChips({
  statusFilter,
  priorityFilter,
  stageFilter,
  searchTerm,
  onClearStatus,
  onClearPriority,
  onClearStage,
  onClearSearch,
  onClearAll,
}: FilterChipsProps) {
  const hasFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    stageFilter !== 'all' ||
    searchTerm.trim().length > 0;

  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filtros:</span>

      {searchTerm.trim() && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Busqueda: "{searchTerm}"
          <button
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            onClick={onClearSearch}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {statusFilter !== 'all' && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Estado: {STATUS_LABELS[statusFilter]}
          <button
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            onClick={onClearStatus}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {priorityFilter !== 'all' && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Prioridad: {PRIORITY_LABELS[priorityFilter]}
          <button
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            onClick={onClearPriority}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {stageFilter !== 'all' && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Etapa activa
          <button
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            onClick={onClearStage}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-muted-foreground hover:text-foreground"
        onClick={onClearAll}
      >
        Limpiar todo
      </Button>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function OpportunitiesPage() {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  // ============================================
  // State
  // ============================================

  // View mode
  const [viewMode, setViewMode] = React.useState<ViewMode>('kanban');

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<OpportunityStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<OpportunityPriority | 'all'>('all');
  const [stageFilter, setStageFilter] = React.useState<string>('all');
  const [kpiFilter, setKpiFilter] = React.useState<OpportunityKPIFilter>('all');

  // Selected opportunity for preview
  const [selectedOpportunity, setSelectedOpportunity] = React.useState<Opportunity | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editOpportunity, setEditOpportunity] = React.useState<Opportunity | null>(null);

  // Win/Lost dialog
  const winLostDialog = useWinLostDialog();

  // ============================================
  // Data
  // ============================================

  // Pipeline stages
  const { data: stages } = usePipelineStages();

  // Kanban data
  const {
    columns,
    isLoading,
    isMoving,
    totalOpportunities,
    totalAmount,
    totalForecast,
    wonAmount,
    lostAmount,
    moveToStage,
    refetchPipeline,
  } = useOpportunityKanban();

  // Calculate won/lost counts
  const wonCount = React.useMemo(() => {
    return columns.reduce((acc, col) => {
      return acc + col.opportunities.filter((o) => o.status === 'won').length;
    }, 0);
  }, [columns]);

  const lostCount = React.useMemo(() => {
    return columns.reduce((acc, col) => {
      return acc + col.opportunities.filter((o) => o.status === 'lost').length;
    }, 0);
  }, [columns]);

  // ============================================
  // Handlers
  // ============================================

  const handleOpportunityClick = React.useCallback((opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsPreviewOpen(true);
  }, []);

  const handleOpportunityView = React.useCallback((opportunity: Opportunity) => {
    router.push(`/app/opportunities/${opportunity.id}`);
  }, [router]);

  const handleOpportunityEdit = React.useCallback((opportunity: Opportunity) => {
    setEditOpportunity(opportunity);
  }, []);

  const handleOpportunityWin = React.useCallback((opportunity: Opportunity) => {
    winLostDialog.openWinDialog(opportunity);
  }, [winLostDialog]);

  const handleOpportunityLost = React.useCallback((opportunity: Opportunity) => {
    winLostDialog.openLostDialog(opportunity);
  }, [winLostDialog]);

  const handleAddOpportunity = React.useCallback((_stageId: string) => {
    // Could pre-select stage in form
    setIsCreateOpen(true);
  }, []);

  const handleClosePreview = React.useCallback(() => {
    setIsPreviewOpen(false);
    // Delay clearing selection to allow animation
    setTimeout(() => setSelectedOpportunity(null), 200);
  }, []);

  const handleKPIFilterChange = React.useCallback((filter: OpportunityKPIFilter) => {
    setKpiFilter(filter);
    // Map KPI filter to status filter
    if (filter === 'all') {
      setStatusFilter('all');
    } else if (filter === 'open') {
      setStatusFilter('open');
    } else if (filter === 'won') {
      setStatusFilter('won');
    } else if (filter === 'lost') {
      setStatusFilter('lost');
    }
  }, []);

  const clearAllFilters = React.useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setStageFilter('all');
    setKpiFilter('all');
  }, []);

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return <OpportunitiesPageSkeleton />;
  }

  // ============================================
  // Empty State
  // ============================================

  const hasNoOpportunities = columns.every((col) => col.opportunities.length === 0);

  if (hasNoOpportunities && !searchTerm && statusFilter === 'all') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 md:px-6 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Oportunidades</h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tus oportunidades de venta
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 overflow-auto">
          <OpportunitiesEmptyState
            onCreateFromLead={() => router.push('/app/leads')}
            onCreateManually={() => setIsCreateOpen(true)}
            onImport={() => {/* TODO: implement import */}}
            onViewLeads={() => router.push('/app/leads')}
          />
        </div>

        {/* Create Dialog */}
        <OpportunityFormDialog
          open={isCreateOpen}
          opportunity={null}
          onClose={() => setIsCreateOpen(false)}
        />
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 md:px-6 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Oportunidades</h1>
            <p className="text-sm text-muted-foreground">
              {totalOpportunities} oportunidades en pipeline
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <ViewToggle mode={viewMode} onChange={setViewMode} />

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPipeline()}
              disabled={isMoving}
            >
              <RefreshCw className={cn('h-4 w-4', isMoving && 'animate-spin')} />
              <span className="ml-2 hidden sm:inline">Actualizar</span>
            </Button>

            <RBACGuard fallback={null} minRole="sales_rep">
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">Nueva Oportunidad</span>
              </Button>
            </RBACGuard>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="flex-shrink-0 px-4 py-4 md:px-6">
        <OpportunitiesKPIDashboard
          pipelineTotal={totalAmount}
          totalCount={totalOpportunities}
          forecastValue={totalForecast}
          wonAmount={wonAmount}
          wonCount={wonCount}
          lostAmount={lostAmount}
          lostCount={lostCount}
          activeFilter={kpiFilter}
          onFilterChange={handleKPIFilterChange}
        />
      </div>

      {/* Filters Bar */}
      <div className="flex-shrink-0 px-4 md:px-6 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar oportunidades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as OpportunityStatus | 'all')}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {OPPORTUNITY_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as OpportunityPriority | 'all')}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {OPPORTUNITY_PRIORITY.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {stages && stages.length > 0 && (
              <Select
                value={stageFilter}
                onValueChange={setStageFilter}
              >
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las etapas</SelectItem>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="mt-3">
          <FilterChips
            statusFilter={statusFilter}
            priorityFilter={priorityFilter}
            stageFilter={stageFilter}
            searchTerm={searchTerm}
            onClearStatus={() => setStatusFilter('all')}
            onClearPriority={() => setPriorityFilter('all')}
            onClearStage={() => setStageFilter('all')}
            onClearSearch={() => setSearchTerm('')}
            onClearAll={clearAllFilters}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <div
          className={cn(
            'flex-1 overflow-auto px-4 md:px-6',
            // Adjust width when preview is open on desktop
            !isMobile && selectedOpportunity && isPreviewOpen && 'pr-0'
          )}
        >
          {viewMode === 'kanban' ? (
            <OpportunityKanbanBoard
              columns={columns}
              isLoading={isLoading}
              isMoving={isMoving}
              onMoveToStage={moveToStage}
              onOpportunityClick={handleOpportunityClick}
              onOpportunityEdit={handleOpportunityEdit}
              onOpportunityWin={handleOpportunityWin}
              onOpportunityLost={handleOpportunityLost}
              onOpportunityView={handleOpportunityView}
              onAddOpportunity={handleAddOpportunity}
            />
          ) : (
            // List view - redirect to old list
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Vista de lista en desarrollo
                </p>
                <Button
                  variant="outline"
                  onClick={() => setViewMode('kanban')}
                >
                  Volver a Kanban
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel (Desktop only) */}
        {!isMobile && selectedOpportunity && isPreviewOpen && (
          <OpportunityPreviewPanel
            opportunity={selectedOpportunity}
            isOpen={isPreviewOpen}
            onClose={handleClosePreview}
            onEdit={handleOpportunityEdit}
            onWin={handleOpportunityWin}
            onLost={handleOpportunityLost}
          />
        )}
      </div>

      {/* Preview Panel (Mobile - Sheet) */}
      {isMobile && (
        <OpportunityPreviewPanel
          opportunity={selectedOpportunity}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
          onEdit={handleOpportunityEdit}
          onWin={handleOpportunityWin}
          onLost={handleOpportunityLost}
        />
      )}

      {/* Dialogs */}
      <OpportunityFormDialog
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
    </div>
  );
}
