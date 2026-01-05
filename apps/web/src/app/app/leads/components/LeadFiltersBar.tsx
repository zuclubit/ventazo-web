'use client';

/**
 * LeadFiltersBar Component
 *
 * Advanced filters with visual chips for active filters.
 * Supports: search, status, source, score range, tags.
 */

import * as React from 'react';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  SlidersHorizontal,
  RefreshCw,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  LeadStatus,
  LeadSource,
  STATUS_LABELS,
  SOURCE_LABELS,
} from '@/lib/leads';

// ============================================
// Types
// ============================================

export interface LeadFilters {
  searchTerm: string;
  status: LeadStatus | 'all';
  source: LeadSource | 'all';
  minScore: number;
  maxScore: number;
  tags: string[];
}

export interface LeadFiltersBarProps {
  /** Current filter values */
  filters: LeadFilters;
  /** Filter change handler */
  onFiltersChange: (filters: LeadFilters) => void;
  /** Refresh handler */
  onRefresh?: () => void;
  /** Is refreshing */
  isRefreshing?: boolean;
  /** Available tags for filter */
  availableTags?: string[];
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Default Filters
// ============================================

export const defaultFilters: LeadFilters = {
  searchTerm: '',
  status: 'all',
  source: 'all',
  minScore: 0,
  maxScore: 100,
  tags: [],
};

// ============================================
// Filter Chip Component
// ============================================

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1 bg-primary/10 text-primary hover:bg-primary/20"
    >
      <span className="text-xs">
        {label}: <span className="font-semibold">{value}</span>
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadFiltersBar({
  filters,
  onFiltersChange,
  onRefresh,
  isRefreshing = false,
  availableTags = [],
  className,
}: LeadFiltersBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  // Update individual filter
  const updateFilter = <K extends keyof LeadFilters>(
    key: K,
    value: LeadFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  // Count active filters
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.status !== 'all') count++;
    if (filters.source !== 'all') count++;
    if (filters.minScore > 0 || filters.maxScore < 100) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Get active filter chips
  const getActiveChips = (): { key: string; label: string; value: string; onRemove: () => void }[] => {
    const chips: { key: string; label: string; value: string; onRemove: () => void }[] = [];

    if (filters.status !== 'all') {
      chips.push({
        key: 'status',
        label: 'Estado',
        value: STATUS_LABELS[filters.status] || filters.status,
        onRemove: () => updateFilter('status', 'all'),
      });
    }

    if (filters.source !== 'all') {
      chips.push({
        key: 'source',
        label: 'Fuente',
        value: SOURCE_LABELS[filters.source] || filters.source,
        onRemove: () => updateFilter('source', 'all'),
      });
    }

    if (filters.minScore > 0 || filters.maxScore < 100) {
      chips.push({
        key: 'score',
        label: 'Score',
        value: `${filters.minScore}-${filters.maxScore}`,
        onRemove: () => {
          updateFilter('minScore', 0);
          updateFilter('maxScore', 100);
        },
      });
    }

    filters.tags.forEach((tag) => {
      chips.push({
        key: `tag-${tag}`,
        label: 'Etiqueta',
        value: tag,
        onRemove: () => updateFilter('tags', filters.tags.filter((t) => t !== tag)),
      });
    });

    return chips;
  };

  const activeChips = getActiveChips();

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads, empresas, teléfonos..."
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            className="pl-9 h-9"
          />
          {filters.searchTerm && (
            <button
              onClick={() => updateFilter('searchTerm', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status}
          onValueChange={(value) => updateFilter('status', value as LeadStatus | 'all')}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select
          value={filters.source}
          onValueChange={(value) => updateFilter('source', value as LeadSource | 'all')}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las fuentes</SelectItem>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters */}
        <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Más filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-2xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filtros Avanzados</h4>

              {/* Score Range */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Score: {filters.minScore} - {filters.maxScore}
                </Label>
                <Slider
                  value={[filters.minScore, filters.maxScore]}
                  onValueChange={(values) => {
                    updateFilter('minScore', values[0] ?? 0);
                    updateFilter('maxScore', values[1] ?? 100);
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="py-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 (Frío)</span>
                  <span>50 (Tibio)</span>
                  <span>100 (Caliente)</span>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Etiquetas</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => {
                      const isSelected = filters.tags.includes(tag);
                      return (
                        <Badge
                          key={tag}
                          variant={isSelected ? 'default' : 'outline'}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isSelected && 'bg-primary'
                          )}
                          onClick={() => {
                            if (isSelected) {
                              updateFilter('tags', filters.tags.filter((t) => t !== tag));
                            } else {
                              updateFilter('tags', [...filters.tags, tag]);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  disabled={activeFilterCount === 0}
                >
                  Limpiar todo
                </Button>
                <Button size="sm" onClick={() => setIsAdvancedOpen(false)}>
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Filtros activos:</span>
          {activeChips.map((chip) => (
            <FilterChip
              key={chip.key}
              label={chip.label}
              value={chip.value}
              onRemove={chip.onRemove}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Limpiar todo
          </Button>
        </div>
      )}
    </div>
  );
}
