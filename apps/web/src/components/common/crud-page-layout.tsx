'use client';

import * as React from 'react';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================
// Page Header Component
// ============================================

export interface CRUDPageHeaderProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Action buttons (e.g., "New Item" button) */
  actions?: React.ReactNode;
  /** Additional header content */
  children?: React.ReactNode;
}

/**
 * Standard page header for CRUD pages
 */
export function CRUDPageHeader({
  title,
  description,
  actions,
  children,
}: CRUDPageHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
      <Separator />
    </>
  );
}

// ============================================
// Stats Card Component
// ============================================

export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: React.ReactNode;
  /** Icon for the card */
  icon: LucideIcon;
  /** Icon color class */
  iconColor?: string;
  /** Value color class */
  valueColor?: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Whether loading */
  isLoading?: boolean;
}

/**
 * Individual stat card
 */
export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  valueColor,
  subtitle,
  isLoading,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', valueColor)}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            value
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Stats Grid Component
// ============================================

export interface StatsGridProps {
  /** Array of stat card configurations */
  stats: StatCardProps[];
  /** Number of columns (default: 4) */
  columns?: 2 | 3 | 4 | 5;
}

/**
 * Grid of stat cards
 */
export function StatsGrid({ stats, columns = 4 }: StatsGridProps) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
  };

  return (
    <div className={cn('grid gap-4', colsClass[columns])}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// ============================================
// Filter Bar Component
// ============================================

export interface FilterBarProps {
  /** Search value */
  searchValue?: string;
  /** Search change handler */
  onSearchChange?: (value: string) => void;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Filter components (Select, etc.) */
  filters?: React.ReactNode;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Whether loading */
  isLoading?: boolean;
  /** Additional content after filters */
  children?: React.ReactNode;
}

/**
 * Standard filter bar with search, filters, and refresh
 */
export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters,
  onRefresh,
  isLoading,
  children,
}: FilterBarProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          {onSearchChange && (
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {filters}

          {onRefresh && (
            <Button
              disabled={isLoading}
              size="icon"
              variant="outline"
              onClick={onRefresh}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// ============================================
// Data Table Card Component
// ============================================

export interface DataTableCardProps {
  /** Card title */
  title: string;
  /** Card description (e.g., "X items found") */
  description?: string;
  /** Whether loading */
  isLoading?: boolean;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Table or content */
  children: React.ReactNode;
  /** Whether data is empty */
  isEmpty?: boolean;
}

/**
 * Card wrapper for data tables
 */
export function DataTableCard({
  title,
  description,
  isLoading,
  emptyState,
  children,
  isEmpty,
}: DataTableCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty && emptyState ? (
          emptyState
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Empty State Component
// ============================================

export interface TableEmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description: string;
  /** Action button */
  action?: React.ReactNode;
}

/**
 * Empty state for tables
 */
export function TableEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: TableEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <p className="mt-4 text-lg font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================
// Pagination Component
// ============================================

export interface PaginationControlsProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Whether loading */
  isLoading?: boolean;
}

/**
 * Pagination controls for tables
 */
export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  isLoading,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t pt-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          disabled={page <= 1 || isLoading}
          size="sm"
          variant="outline"
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          disabled={page >= totalPages || isLoading}
          size="sm"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// CRUD Page Layout (Full Layout)
// ============================================

export interface CRUDPageLayoutProps {
  /** Children components */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Main layout wrapper for CRUD pages.
 * Provides consistent spacing and structure.
 *
 * @example
 * ```tsx
 * <CRUDPageLayout>
 *   <CRUDPageHeader
 *     title="Leads"
 *     description="Gestiona tus prospectos"
 *     actions={
 *       <Button onClick={() => setIsCreateOpen(true)}>
 *         <Plus className="mr-2 h-4 w-4" />
 *         Nuevo Lead
 *       </Button>
 *     }
 *   />
 *
 *   <StatsGrid stats={[...]} />
 *
 *   <FilterBar
 *     searchValue={searchTerm}
 *     onSearchChange={setSearchTerm}
 *     searchPlaceholder="Buscar leads..."
 *     filters={<>Select components</>}
 *     onRefresh={refetch}
 *   />
 *
 *   <DataTableCard
 *     title="Listado de Leads"
 *     description={`${total} leads encontrados`}
 *     isLoading={isLoading}
 *     isEmpty={leads.length === 0}
 *     emptyState={
 *       <TableEmptyState
 *         icon={Users}
 *         title="Sin leads"
 *         description="No se encontraron leads"
 *         action={<Button>Crear lead</Button>}
 *       />
 *     }
 *   >
 *     <Table>...</Table>
 *     <PaginationControls
 *       page={page}
 *       totalPages={meta.totalPages}
 *       onPageChange={setPage}
 *     />
 *   </DataTableCard>
 * </CRUDPageLayout>
 * ```
 */
export function CRUDPageLayout({ children, className }: CRUDPageLayoutProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      {children}
    </div>
  );
}

// ============================================
// Hooks for Common CRUD Operations
// ============================================

/**
 * Hook for managing debounced search
 */
export function useDebouncedSearch(delay = 300) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), delay);
    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
  };
}

/**
 * Hook for managing pagination with filter reset
 */
export function usePagination(deps: React.DependencyList = []) {
  const [page, setPage] = React.useState(1);

  // Reset to page 1 when dependencies change
  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { page, setPage };
}

/**
 * Hook for managing CRUD dialog states
 */
export function useCRUDDialogs<T>() {
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editItem, setEditItem] = React.useState<T | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<T | null>(null);

  const openCreate = React.useCallback(() => setIsCreateOpen(true), []);
  const closeCreate = React.useCallback(() => setIsCreateOpen(false), []);

  const openEdit = React.useCallback((item: T) => setEditItem(item), []);
  const closeEdit = React.useCallback(() => setEditItem(null), []);

  const openDelete = React.useCallback((item: T) => setDeleteItem(item), []);
  const closeDelete = React.useCallback(() => setDeleteItem(null), []);

  const closeAll = React.useCallback(() => {
    setIsCreateOpen(false);
    setEditItem(null);
    setDeleteItem(null);
  }, []);

  return {
    // Create dialog
    isCreateOpen,
    openCreate,
    closeCreate,
    // Edit dialog
    editItem,
    openEdit,
    closeEdit,
    // Delete dialog
    deleteItem,
    openDelete,
    closeDelete,
    // Combined form dialog state
    isFormOpen: isCreateOpen || !!editItem,
    closeForm: () => {
      setIsCreateOpen(false);
      setEditItem(null);
    },
    // Utilities
    closeAll,
  };
}
