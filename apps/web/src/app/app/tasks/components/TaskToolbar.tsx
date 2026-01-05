'use client';

/**
 * TaskToolbar - Minimal toolbar for tasks page
 *
 * - Search always visible (240px)
 * - Filters collapsed by default
 * - Active filter chips inline
 * - View toggle: Kanban | Lista
 */

import * as React from 'react';
import {
  ChevronDown,
  Filter,
  Kanban,
  List,
  Search,
  X,
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
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_TYPE,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  type TaskStatus,
  type TaskPriority,
  type TaskType,
  type TaskViewMode,
} from '@/lib/tasks/types';

// ============================================
// Types
// ============================================

export interface TaskToolbarProps {
  // View
  viewMode: TaskViewMode;
  onViewModeChange: (mode: TaskViewMode) => void;
  // Search
  searchTerm: string;
  onSearchChange: (term: string) => void;
  // Filters
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  priorityFilter: TaskPriority | 'all';
  onPriorityFilterChange: (priority: TaskPriority | 'all') => void;
  typeFilter: TaskType | 'all';
  onTypeFilterChange: (type: TaskType | 'all') => void;
  overdueFilter: boolean;
  onOverdueFilterChange: (overdue: boolean) => void;
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
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

// ============================================
// Main Component
// ============================================

export function TaskToolbar({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  typeFilter,
  onTypeFilterChange,
  overdueFilter,
  onOverdueFilterChange,
  className,
}: TaskToolbarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    typeFilter !== 'all',
    overdueFilter,
  ].filter(Boolean).length;

  // Build active filter chips
  const activeFilters: { label: string; onRemove: () => void }[] = [];
  if (statusFilter !== 'all') {
    activeFilters.push({
      label: STATUS_LABELS[statusFilter],
      onRemove: () => onStatusFilterChange('all'),
    });
  }
  if (priorityFilter !== 'all') {
    activeFilters.push({
      label: PRIORITY_LABELS[priorityFilter],
      onRemove: () => onPriorityFilterChange('all'),
    });
  }
  if (typeFilter !== 'all') {
    activeFilters.push({
      label: TYPE_LABELS[typeFilter],
      onRemove: () => onTypeFilterChange('all'),
    });
  }
  if (overdueFilter) {
    activeFilters.push({
      label: 'Vencidas',
      onRemove: () => onOverdueFilterChange(false),
    });
  }

  const handleViewChange = (value: string) => {
    if (value === 'list' || value === 'kanban') {
      onViewModeChange(value);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main row: Search + Filters toggle + View toggle */}
      {/* Stack on mobile, row on tablet+ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search - responsive width */}
        <div className="relative w-full sm:w-[200px] md:w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-10 sm:h-9 text-sm min-h-[44px] sm:min-h-0"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Controls row - always horizontal */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Filters toggle */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 sm:h-9 gap-2 min-h-[44px] sm:min-h-0',
                  activeFilterCount > 0 && 'border-primary/50'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Filtros</span>
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

          {/* Active filter chips - inline, hidden on mobile when many */}
          {activeFilters.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {activeFilters.slice(0, 3).map((filter, index) => (
                <FilterChip key={index} label={filter.label} onRemove={filter.onRemove} />
              ))}
              {activeFilters.length > 3 && (
                <span className="text-xs text-muted-foreground">+{activeFilters.length - 3}</span>
              )}
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
              value="list"
              aria-label="Vista de lista"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-2.5 h-9 sm:h-8 text-xs gap-1 sm:gap-1.5 min-w-[44px] sm:min-w-0"
            >
              <List className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="kanban"
              aria-label="Vista Kanban"
              className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-2 sm:px-2.5 h-9 sm:h-8 text-xs gap-1 sm:gap-1.5 min-w-[44px] sm:min-w-0"
            >
              <Kanban className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Active filter chips - visible only on mobile */}
      {activeFilters.length > 0 && (
        <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
          {activeFilters.map((filter, index) => (
            <FilterChip key={index} label={filter.label} onRemove={filter.onRemove} />
          ))}
        </div>
      )}

      {/* Collapsible filters row */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleContent>
          {/* Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 pt-2 pb-1">
            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusFilterChange(value as TaskStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-8 text-xs min-h-[44px] sm:min-h-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {TASK_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select
              value={priorityFilter}
              onValueChange={(value) => onPriorityFilterChange(value as TaskPriority | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-10 sm:h-8 text-xs min-h-[44px] sm:min-h-0">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {TASK_PRIORITY.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type */}
            <Select
              value={typeFilter}
              onValueChange={(value) => onTypeFilterChange(value as TaskType | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[130px] h-10 sm:h-8 text-xs min-h-[44px] sm:min-h-0">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TASK_TYPE.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Overdue toggle */}
            <Button
              size="sm"
              variant={overdueFilter ? 'default' : 'outline'}
              className={cn(
                'h-10 sm:h-8 text-xs min-h-[44px] sm:min-h-0',
                overdueFilter && 'bg-[var(--urgency-overdue)] hover:bg-[var(--urgency-overdue)]/90 border-[var(--urgency-overdue)]'
              )}
              onClick={() => onOverdueFilterChange(!overdueFilter)}
            >
              Solo Vencidas
            </Button>

            {/* Clear all filters - full width on mobile */}
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="col-span-2 sm:col-span-1 h-10 sm:h-8 text-xs text-muted-foreground min-h-[44px] sm:min-h-0"
                onClick={() => {
                  onStatusFilterChange('all');
                  onPriorityFilterChange('all');
                  onTypeFilterChange('all');
                  onOverdueFilterChange(false);
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

export default TaskToolbar;
