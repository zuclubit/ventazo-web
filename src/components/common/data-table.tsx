// ============================================
// Enhanced Data Table - FASE 5.11
// Consistent data table with sorting, filtering, and selection
// ============================================

'use client';

import * as React from 'react';

import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MoreHorizontal,
  Search,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { NoResultsEmpty } from './empty-state';
import { TableSkeleton } from './loading-state';

// ============================================
// Types
// ============================================

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableAction<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  actions?: DataTableAction<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  striped?: boolean;
}

// ============================================
// Data Table Component
// ============================================

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  emptyState,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  sortKey,
  sortOrder,
  onSort,
  actions,
  onRowClick,
  className,
  stickyHeader = false,
  compact = false,
  striped = false,
}: DataTableProps<T>) {
  const allKeys = data.map(keyExtractor);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedKeys.includes(key));
  const someSelected = selectedKeys.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(allKeys);
    }
  };

  const handleSelectOne = (key: string) => {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key));
    } else {
      onSelectionChange?.([...selectedKeys, key]);
    }
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ChevronsUpDown className="ml-1 h-4 w-4" />;
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  if (isLoading) {
    return <TableSkeleton columns={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)} rows={5} />;
  }

  if (data.length === 0) {
    return emptyState || <NoResultsEmpty size="lg" variant="dashed" />;
  }

  const cellPadding = compact ? 'py-2 px-3' : 'py-3 px-4';

  return (
    <div className={cn('overflow-auto rounded-md border', className)}>
      <Table>
        <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-background z-10')}>
          <TableRow>
            {selectable && (
              <TableHead className={cn('w-12', cellPadding)}>
                <Checkbox
                  aria-label="Seleccionar todos"
                  checked={someSelected ? 'indeterminate' : allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  cellPadding,
                  column.width && `w-[${column.width}]`,
                  column.align === 'center' && 'text-center',
                  column.align === 'right' && 'text-right',
                  column.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                  column.className
                )}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div
                  className={cn(
                    'flex items-center',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}
                >
                  {column.header}
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className={cn('w-12', cellPadding)} />
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => {
            const key = keyExtractor(item);
            const isSelected = selectedKeys.includes(key);

            return (
              <TableRow
                key={key}
                className={cn(
                  onRowClick && 'cursor-pointer',
                  isSelected && 'bg-primary/5',
                  striped && index % 2 === 1 && 'bg-muted/50'
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {selectable && (
                  <TableCell className={cellPadding} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Seleccionar fila ${index + 1}`}
                      checked={isSelected}
                      onCheckedChange={() => handleSelectOne(key)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(
                      cellPadding,
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                  >
                    {column.render
                      ? column.render(item, index)
                      : (item as Record<string, unknown>)[column.key] as React.ReactNode}
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell className={cellPadding} onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Acciones</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, actionIndex) => {
                          if (action.hidden?.(item)) return null;
                          const Icon = action.icon;

                          return (
                            <React.Fragment key={action.label}>
                              {actionIndex > 0 && action.variant === 'destructive' && (
                                <DropdownMenuSeparator />
                              )}
                              <DropdownMenuItem
                                className={cn(
                                  action.variant === 'destructive' && 'text-destructive focus:text-destructive'
                                )}
                                disabled={action.disabled?.(item)}
                                onClick={() => action.onClick(item)}
                              >
                                {Icon && <Icon className="mr-2 h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            </React.Fragment>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================
// Table Toolbar
// ============================================

interface TableToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filterCount?: number;
  onClearFilters?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function TableToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filterCount = 0,
  onClearFilters,
  children,
  className,
}: TableToolbarProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center mb-4', className)}>
      {onSearchChange && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <Button
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              size="icon"
              variant="ghost"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {filterCount > 0 && onClearFilters && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            <X className="mr-1 h-4 w-4" />
            Limpiar ({filterCount})
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}

// ============================================
// Bulk Actions Bar
// ============================================

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  children,
  className,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg mb-4',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onClearSelection}>
          <X className="mr-1 h-4 w-4" />
          Cancelar
        </Button>
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? 'elemento seleccionado' : 'elementos seleccionados'}
        </span>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

// ============================================
// Pagination
// ============================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mt-4',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Mostrando {start} a {end} de {totalItems} resultados
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            disabled={currentPage === 1}
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>
          <span className="px-3 text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            disabled={currentPage === totalPages}
            size="sm"
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
