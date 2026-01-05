'use client';

/**
 * Unified Kanban Boards Page
 *
 * Single page to manage all Kanban boards:
 * - Leads (7 stages)
 * - Opportunities (6 stages)
 * - Customers (4 stages)
 *
 * Features:
 * - Tab-based navigation between entity types
 * - URL state sync for entity type
 * - Full drag & drop with stage validation
 * - Entity-specific actions and dialogs
 * - Inline add button in header (all screen sizes)
 *
 * @version 1.4.0 - Removed FAB, header button on all screens
 */

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  Columns3,
  Plus,
  Target,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout';
import { RBACGuard } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Entity types
import { type Lead } from '@/lib/leads';
import { type Opportunity } from '@/lib/opportunities';
import { type Customer } from '@/lib/customers';

// Leads components & hooks
import {
  KanbanBoard as LeadsKanbanBoard,
  KanbanSkeleton as LeadsKanbanSkeleton,
  LeadsEmptyState,
  LeadFormSheet,
  LeadDetailSheet,
  DeleteLeadDialog,
  ConvertLeadDialog,
} from '../leads/components';
import { useKanbanTheme, useLeadsKanban } from '../leads/hooks';

// Opportunities components & hooks
import {
  OpportunityKanbanBoard,
  OpportunityKanbanBoardSkeleton,
  OpportunitiesEmptyState,
  OpportunityDetailSheet,
  OpportunityFormSheet,
} from '../opportunities/components';
import { WinLostDialog } from '../opportunities/components/win-lost-dialog';
import { DeleteOpportunityDialog } from '../opportunities/components/delete-opportunity-dialog';
import { useOpportunityKanban, useWinLostDialog, useOpportunityTheme } from '../opportunities/hooks';

// Customers components & hooks
import {
  CustomerKanbanBoard,
  CustomerKanbanSkeleton,
  CustomersEmptyState,
  CustomerDetailSheet,
  useCustomerLifecycleColumns,
} from '../customers/components';
import { useCustomerManagement } from '@/lib/customers';

// ============================================
// Types
// ============================================

type EntityType = 'leads' | 'opportunities' | 'customers';

interface TabConfig {
  id: EntityType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'leads', label: 'Leads', icon: Users, description: '7 etapas de pipeline' },
  { id: 'opportunities', label: 'Oportunidades', icon: Target, description: '6 etapas de ventas' },
  { id: 'customers', label: 'Clientes', icon: Building2, description: '4 estados de cliente' },
];

// ============================================
// Leads Kanban Tab
// ============================================

interface LeadsTabProps {
  /** Callback to open create dialog - passed from parent for header button */
  onOpenCreate?: () => void;
  /** Reference to set the open create function */
  setOpenCreate?: (fn: () => void) => void;
}

function LeadsTab({ setOpenCreate }: LeadsTabProps) {
  useKanbanTheme();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  // Expose the create function to parent
  // IMPORTANT: Must wrap in () => fn for useState setter (otherwise React calls it as updater)
  const openCreateDialog = React.useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  React.useEffect(() => {
    if (setOpenCreate) {
      setOpenCreate(() => openCreateDialog);
    }
  }, [setOpenCreate, openCreateDialog]);

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
    onTerminalStageAttempt: (lead, stageType) => {
      if (stageType === 'won') setConvertLead(lead);
    },
  });

  const isEmpty = columns.length === 0 || columns.every((c) => c.leads.length === 0);

  return (
    <>
      {/* Content */}
      {isLoading ? (
        <LeadsKanbanSkeleton columns={5} />
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-destructive mb-4">Error al cargar leads</p>
          <Button variant="outline" onClick={() => refetchPipeline()}>Reintentar</Button>
        </div>
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-full p-4">
          <LeadsEmptyState onAddLead={() => setIsCreateOpen(true)} />
        </div>
      ) : (
        <LeadsKanbanBoard
          columns={columns}
          isMoving={isMoving}
          canMoveToStage={canMoveToStage}
          isLeadMoving={isLeadMoving}
          onMoveToStage={moveToStage}
          onLeadClick={setSelectedLead}
          onLeadEdit={setEditLead}
          onLeadDelete={setDeleteLead}
          onLeadConvert={setConvertLead}
        />
      )}

      {/* Dialogs */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onSuccess={() => { refetchPipeline(); setSelectedLead(null); }}
        onDelete={() => { if (selectedLead) setDeleteLead(selectedLead); setSelectedLead(null); }}
        onConvert={() => { if (selectedLead) setConvertLead(selectedLead); setSelectedLead(null); }}
      />
      <LeadFormSheet lead={editLead} open={isCreateOpen || !!editLead} onClose={() => { setIsCreateOpen(false); setEditLead(null); }} />
      <DeleteLeadDialog lead={deleteLead} open={!!deleteLead} onClose={() => setDeleteLead(null)} />
      <ConvertLeadDialog lead={convertLead} open={!!convertLead} onClose={() => setConvertLead(null)} />
    </>
  );
}

// ============================================
// Opportunities Kanban Tab
// ============================================

interface OpportunitiesTabProps {
  setOpenCreate?: (fn: () => void) => void;
}

function OpportunitiesTab({ setOpenCreate }: OpportunitiesTabProps) {
  useOpportunityTheme();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editOpportunity, setEditOpportunity] = React.useState<Opportunity | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = React.useState<Opportunity | null>(null);
  const [deleteOpportunity, setDeleteOpportunity] = React.useState<Opportunity | null>(null);

  const winLostDialog = useWinLostDialog();

  // Expose the create function to parent
  // IMPORTANT: Must wrap in () => fn for useState setter (otherwise React calls it as updater)
  const openCreateDialog = React.useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  React.useEffect(() => {
    if (setOpenCreate) {
      setOpenCreate(() => openCreateDialog);
    }
  }, [setOpenCreate, openCreateDialog]);

  const {
    columns,
    isLoading,
    isMoving,
    isOpportunityMoving,
    canMoveToStage,
    moveToStage,
    refetchPipeline,
  } = useOpportunityKanban({
    onMoveSuccess: () => toast({ title: 'Oportunidad movida' }),
    onMoveError: (err) => toast({ title: 'Error', description: String(err), variant: 'destructive' }),
    onTerminalStageAttempt: (opp, type) => {
      if (type === 'won') winLostDialog.openWinDialog(opp);
      else if (type === 'lost') winLostDialog.openLostDialog(opp);
    },
  });

  const isEmpty = columns.length === 0 || columns.every((c) => c.opportunities.length === 0);

  return (
    <>
      {isLoading ? (
        <OpportunityKanbanBoardSkeleton />
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-full p-4">
          <OpportunitiesEmptyState onCreateManually={() => setIsCreateOpen(true)} />
        </div>
      ) : (
        <OpportunityKanbanBoard
          columns={columns}
          isMoving={isMoving}
          canMoveToStage={canMoveToStage}
          isOpportunityMoving={isOpportunityMoving}
          onMoveToStage={moveToStage}
          onOpportunityClick={setSelectedOpportunity}
          onOpportunityEdit={setEditOpportunity}
          onOpportunityWin={(opp) => winLostDialog.openWinDialog(opp)}
          onOpportunityLost={(opp) => winLostDialog.openLostDialog(opp)}
          onAddOpportunity={() => setIsCreateOpen(true)}
        />
      )}

      <OpportunityDetailSheet
        opportunity={selectedOpportunity}
        open={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
        onSuccess={() => { refetchPipeline(); setSelectedOpportunity(null); }}
        onDelete={() => { if (selectedOpportunity) setDeleteOpportunity(selectedOpportunity); setSelectedOpportunity(null); }}
        onWin={() => { if (selectedOpportunity) winLostDialog.openWinDialog(selectedOpportunity); setSelectedOpportunity(null); }}
        onLost={() => { if (selectedOpportunity) winLostDialog.openLostDialog(selectedOpportunity); setSelectedOpportunity(null); }}
      />
      <OpportunityFormSheet open={isCreateOpen || !!editOpportunity} opportunity={editOpportunity} onClose={() => { setIsCreateOpen(false); setEditOpportunity(null); }} />
      <WinLostDialog open={winLostDialog.isOpen} opportunity={winLostDialog.opportunity} action={winLostDialog.action} onClose={winLostDialog.closeDialog} />
      <DeleteOpportunityDialog open={!!deleteOpportunity} opportunity={deleteOpportunity} onClose={() => { setDeleteOpportunity(null); refetchPipeline(); }} />
    </>
  );
}

// ============================================
// Customers Kanban Tab
// ============================================

function CustomersTab() {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = React.useState<Customer | null>(null);

  // Fetch customers
  const { customers, isLoading, refetchCustomers } = useCustomerManagement({ limit: 100 });

  // Transform to lifecycle columns
  const columns = useCustomerLifecycleColumns(customers);

  const isEmpty = columns.length === 0 || columns.every((c) => c.customers.length === 0);

  return (
    <>
      {isLoading ? (
        <CustomerKanbanSkeleton columns={4} />
      ) : isEmpty ? (
        <div className="flex items-center justify-center h-full p-4">
          <CustomersEmptyState />
        </div>
      ) : (
        <CustomerKanbanBoard
          columns={columns}
          isLoading={isLoading}
          onCustomerClick={setSelectedCustomer}
          onCustomerEdit={setEditCustomer}
          onCustomerDelete={setDeleteCustomer}
        />
      )}

      <CustomerDetailSheet
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSuccess={() => { refetchCustomers(); setSelectedCustomer(null); }}
      />
    </>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function UnifiedKanbanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get entity type from URL or default to leads
  const entityParam = searchParams.get('entity') as EntityType | null;
  const [activeTab, setActiveTab] = React.useState<EntityType>(
    entityParam && TABS.some((t) => t.id === entityParam) ? entityParam : 'leads'
  );

  // Create function reference - updated by child tabs
  const [openCreateFn, setOpenCreateFn] = React.useState<(() => void) | null>(null);

  // Sync URL with tab
  const handleTabChange = (value: string) => {
    const newTab = value as EntityType;
    setActiveTab(newTab);
    setOpenCreateFn(null); // Reset when tab changes
    router.push(`/app/kanban?entity=${newTab}`, { scroll: false });
  };

  // Sync tab with URL on mount/change
  React.useEffect(() => {
    if (entityParam && TABS.some((t) => t.id === entityParam)) {
      setActiveTab(entityParam);
    }
  }, [entityParam]);

  // Get current tab config for dynamic labels
  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0] ?? {
    id: 'leads' as const,
    label: 'Leads',
    description: 'Gestiona tus leads',
    icon: null,
  };

  // Get add button label based on active tab
  const getAddLabel = () => {
    switch (activeTab) {
      case 'leads': return 'Nuevo Lead';
      case 'opportunities': return 'Nueva Oportunidad';
      case 'customers': return 'Nuevo Cliente';
      default: return 'Nuevo';
    }
  };

  return (
    <PageContainer variant="full-bleed">
      {/* Optimized Header - Compact with inline actions */}
      <PageContainer.Header bordered className="!py-2 sm:!py-2.5">
        {/* Row 1: Title + Action Button */}
        <PageContainer.HeaderRow className="mb-2 sm:mb-2.5">
          {/* Title with icon */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
              <Columns3 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="page-title text-base sm:text-lg truncate">Tablero Kanban</h1>
              <p className="page-subtitle text-xs hidden sm:block truncate">
                {currentTab.description}
              </p>
            </div>
          </div>

          {/* Add Button - Visible on all screen sizes */}
          <RBACGuard fallback={null} minRole="sales_rep">
            {activeTab !== 'customers' && (
              <Button
                size="sm"
                onClick={() => openCreateFn?.()}
                className={cn(
                  'gap-1.5 h-8 px-2.5 sm:px-3',
                  'bg-primary hover:bg-primary/90 text-primary-foreground',
                  'shadow-sm shrink-0'
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{getAddLabel()}</span>
              </Button>
            )}
          </RBACGuard>
        </PageContainer.HeaderRow>

        {/* Row 2: Entity Type Tabs - Compact */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-9 p-0.5 bg-muted/50 w-full max-w-md">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex-1 h-8',
                  'flex items-center justify-center gap-1.5',
                  'text-xs sm:text-sm font-medium',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm',
                  'transition-all duration-150'
                )}
              >
                <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageContainer.Header>

      {/* Kanban Board Content */}
      <PageContainer.Body>
        <PageContainer.Content scroll="horizontal" padding="none" className="relative">
          {activeTab === 'leads' && <LeadsTab setOpenCreate={setOpenCreateFn} />}
          {activeTab === 'opportunities' && <OpportunitiesTab setOpenCreate={setOpenCreateFn} />}
          {activeTab === 'customers' && <CustomersTab />}
        </PageContainer.Content>
      </PageContainer.Body>
    </PageContainer>
  );
}
