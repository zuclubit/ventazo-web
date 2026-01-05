'use client';

/**
 * Customers Page - Lifecycle Kanban View (v2.0)
 *
 * Redesigned with bulletproof layout architecture.
 * Uses PageContainer pattern for consistent containment.
 *
 * Layout Structure:
 * PageContainer (flex-col, flex-1, min-h-0)
 *   └── Body (flex-1, min-h-0)
 *       └── Content scroll="horizontal" (flex-1, min-h-0, overflow-x-auto)
 *           └── CustomerKanbanBoard (inline-flex, h-full)
 *               └── CustomerKanbanColumn[] (flex-col, h-full, shrink-0)
 *
 * Lifecycle Stages:
 * PROSPECT → ONBOARDING → ACTIVE → AT_RISK → RENEWAL → CHURNED
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
import { useCustomers, type Customer } from '@/lib/customers';

// Components
import {
  CustomerKanbanBoard,
  useCustomerLifecycleColumns,
  CustomerKanbanSkeleton,
  CustomersEmptyState,
  CustomerFormSheet,
  DeleteCustomerDialog,
  CustomerDetailSheet,
} from './components';

// Hooks
import { useCustomerTheme } from './hooks';

// ============================================
// Customers Page Component - Lifecycle Kanban View
// ============================================

export default function CustomersPage() {
  // Initialize dynamic theming (applies CSS variables)
  useCustomerTheme();

  // Fetch customers data
  // Note: Backend limits to 100 max per request
  // For Kanban view, we use max limit and rely on pagination if needed
  const {
    data: customersData,
    isLoading,
    error,
    refetch,
  } = useCustomers({
    limit: 100, // Backend max limit is 100
  });

  // Transform customers to lifecycle columns
  const customers = customersData?.data ?? [];
  const columns = useCustomerLifecycleColumns(customers);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = React.useState<Customer | null>(null);

  // Preview panel state (for detail sheet)
  const [previewCustomer, setPreviewCustomer] = React.useState<Customer | null>(null);

  // Derived values
  const isEmpty = customers.length === 0;

  // Handlers
  const handleCustomerClick = (customer: Customer) => setPreviewCustomer(customer);
  const handleCustomerEdit = (customer: Customer) => setEditCustomer(customer);
  const handleCustomerDelete = (customer: Customer) => setDeleteCustomer(customer);
  const handleClosePreview = () => setPreviewCustomer(null);
  const handleAddCustomer = (stageId?: string) => {
    // Could pre-set the status based on stageId if needed
    setIsCreateOpen(true);
  };
  const handleRefresh = () => refetch();

  return (
    <PageContainer variant="full-bleed">
      {/* Body: Full height Kanban */}
      <PageContainer.Body>
        {/*
          Main Content Area
          CRITICAL: scroll="horizontal" enables horizontal scroll
          The CustomerKanbanBoard will be h-full inside this container
        */}
        <PageContainer.Content scroll="horizontal" padding="none">
          {isLoading ? (
            <CustomerKanbanSkeleton columns={6} />
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full px-4">
              <p className="text-destructive text-center mb-4">
                Error al cargar los clientes
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
              <CustomersEmptyState
                onAddCustomer={() => setIsCreateOpen(true)}
              />
            </div>
          ) : (
            <CustomerKanbanBoard
              columns={columns}
              onCustomerClick={handleCustomerClick}
              onCustomerEdit={handleCustomerEdit}
              onCustomerDelete={handleCustomerDelete}
              onAddCustomer={handleAddCustomer}
            />
          )}
        </PageContainer.Content>
      </PageContainer.Body>

      {/* Customer Detail Sheet - Unified View/Edit */}
      <CustomerDetailSheet
        customer={previewCustomer}
        open={!!previewCustomer}
        onClose={handleClosePreview}
        onSuccess={() => {
          refetch();
          setPreviewCustomer(null);
        }}
        onDelete={() => {
          if (previewCustomer) handleCustomerDelete(previewCustomer);
          setPreviewCustomer(null);
        }}
      />

      {/* FAB - Floating Action Button for creating customers */}
      <RBACGuard fallback={null} minRole="sales_rep">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="customers-fab"
          aria-label="Nuevo Cliente"
        >
          <Plus className="h-6 w-6" />
        </button>
      </RBACGuard>

      {/* Create/Edit Sheet */}
      <CustomerFormSheet
        customer={editCustomer}
        open={isCreateOpen || !!editCustomer}
        onClose={() => {
          setIsCreateOpen(false);
          setEditCustomer(null);
        }}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        customer={deleteCustomer}
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
      />
    </PageContainer>
  );
}
