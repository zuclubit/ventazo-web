'use client';

/**
 * QuotesToolbar - Minimal toolbar for quotes page
 *
 * Features:
 * - Search always visible (240px)
 * - Filters collapsed by default
 * - Active filter chips inline
 * - View toggle: Kanban | Lista | Grid
 * - Expiring soon filter
 *
 * @version 1.0.0
 * @module components/QuotesToolbar
 */

import * as React from 'react';
import {
  ChevronDown,
  Filter,
  Kanban,
  LayoutGrid,
  List,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  type QuoteStatus,
  QUOTE_STATUS_LABELS,
} from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

/** View mode for quotes display */
export type QuoteViewMode = 'kanban' | 'list' | 'grid';

/** Date range filter options */
export type DateRangeFilter = 'all' | 'today' | 'this_week' | 'this_month' | 'this_quarter';

/** Statuses available in quotes */
const QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'pending_review',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'revised',
];

/** Date range labels */
const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  all: 'Todas las fechas',
  today: 'Hoy',
  this_week: 'Esta semana',
  this_month: 'Este mes',
  this_quarter: 'Este trimestre',
};

export interface QuotesToolbarProps {
  // View
  viewMode: QuoteViewMode;
  onViewModeChange: (mode: QuoteViewMode) => void;
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  // Filters
  statusFilter: QuoteStatus | 'all';
  onStatusFilterChange: (status: QuoteStatus | 'all') => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeFilterChange: (range: DateRangeFilter) => void;
  expiringFilter: boolean;
  onExpiringFilterChange: (expiring: boolean) => void;
  // Actions
  onRefresh?: () => void;
  className?: string;
}

// ============================================
// Filter Chip Component
// ============================================

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  variant?: 'default' | 'warning';
}

function FilterChip({ label, onRemove, variant = 'default' }: FilterChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
        variant === 'warning'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
          : 'bg-primary/10 text-primary'
      )}
    >
      {variant === 'warning' && <AlertTriangle className="h-2.5 w-2.5" />}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'rounded-full p-0.5 transition-colors',
          variant === 'warning'
            ? 'hover:bg-amber-200 dark:hover:bg-amber-800'
            : 'hover:bg-primary/20'
        )}
        aria-label={`Quitar filtro: ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function QuotesToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRangeFilter,
  onDateRangeFilterChange,
  expiringFilter,
  onExpiringFilterChange,
  className,
}: QuotesToolbarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'all',
    dateRangeFilter !== 'all',
    expiringFilter,
  ].filter(Boolean).length;

  // Build active filter chips
  const activeFilters: { label: string; onRemove: () => void; variant?: 'default' | 'warning' }[] = [];

  if (statusFilter !== 'all') {
    activeFilters.push({
      label: QUOTE_STATUS_LABELS[statusFilter],
      onRemove: () => onStatusFilterChange('all'),
    });
  }

  if (dateRangeFilter !== 'all') {
    activeFilters.push({
      label: DATE_RANGE_LABELS[dateRangeFilter],
      onRemove: () => onDateRangeFilterChange('all'),
    });
  }

  if (expiringFilter) {
    activeFilters.push({
      label: 'Por vencer',
      onRemove: () => onExpiringFilterChange(false),
      variant: 'warning',
    });
  }

  const handleViewChange = (value: string) => {
    if (value === 'list' || value === 'kanban' || value === 'grid') {
      onViewModeChange(value);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main row: Search + Filters toggle + View toggle */}
      <div className="flex items-center gap-3">
        {/* Search - always visible */}
        <div className="relative w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Buscar cotizaciones..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filters toggle */}
        <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2',
                activeFilterCount > 0 && 'border-primary/50'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isFiltersOpen && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Active filter chips - inline */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeFilters.map((filter, index) => (
              <FilterChip
                key={index}
                label={filter.label}
                onRemove={filter.onRemove}
                variant={filter.variant}
              />
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={handleViewChange}
          className="bg-muted/50 p-0.5 rounded-md"
        >
          <ToggleGroupItem
            value="kanban"
            aria-label="Vista Kanban"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2.5 h-8 text-xs gap-1.5"
          >
            <Kanban className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label="Vista de lista"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2.5 h-8 text-xs gap-1.5"
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="grid"
            aria-label="Vista de cuadrícula"
            className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2.5 h-8 text-xs gap-1.5"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Grid</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Collapsible filters row */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          <div className="flex items-center gap-3 pt-2 pb-1 flex-wrap">
            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusFilterChange(value as QuoteStatus | 'all')}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {QUOTE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {QUOTE_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <Select
              value={dateRangeFilter}
              onValueChange={(value) => onDateRangeFilterChange(value as DateRangeFilter)}
            >
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Expiring soon toggle */}
            <Button
              size="sm"
              variant={expiringFilter ? 'default' : 'outline'}
              className={cn(
                'h-8 text-xs gap-1.5',
                expiringFilter && 'bg-amber-500 hover:bg-amber-600 border-amber-500 text-white'
              )}
              onClick={() => onExpiringFilterChange(!expiringFilter)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Por Vencer
            </Button>

            {/* Clear all filters */}
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  onStatusFilterChange('all');
                  onDateRangeFilterChange('all');
                  onExpiringFilterChange(false);
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default QuotesToolbar;
