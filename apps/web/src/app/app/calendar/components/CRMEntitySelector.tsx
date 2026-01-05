'use client';

/**
 * CRMEntitySelector Component - Sprint 5
 *
 * Combobox for searching and selecting CRM entities (leads, customers, opportunities, tasks).
 * Used in EventFormSheet for linking events to CRM records.
 *
 * @module app/calendar/components/CRMEntitySelector
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search, X, User, Building2, Target, CheckSquare } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useLeads } from '@/lib/leads';
import { useCustomers } from '@/lib/customers';
import { useOpportunities } from '@/lib/opportunities';
import { useTasks } from '@/lib/tasks';
import { useDebouncedValue } from '@/lib/performance';

// ============================================
// Types
// ============================================

export type CRMEntityType = 'lead' | 'customer' | 'opportunity' | 'task';

interface CRMEntity {
  id: string;
  name: string;
  subtitle?: string;
}

interface CRMEntitySelectorProps {
  entityType: CRMEntityType;
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Entity Type Config
// ============================================

const ENTITY_CONFIG: Record<CRMEntityType, {
  icon: typeof User;
  label: string;
  colorVar: string;
}> = {
  lead: {
    icon: User,
    label: 'Lead',
    colorVar: 'var(--cal-event-lead, #8B5CF6)',
  },
  customer: {
    icon: Building2,
    label: 'Cliente',
    colorVar: 'var(--cal-event-customer, #10B981)',
  },
  opportunity: {
    icon: Target,
    label: 'Oportunidad',
    colorVar: 'var(--cal-event-opportunity, #F59E0B)',
  },
  task: {
    icon: CheckSquare,
    label: 'Tarea',
    colorVar: 'var(--cal-event-task, #3B82F6)',
  },
};

// ============================================
// CRMEntitySelector Component
// ============================================

export function CRMEntitySelector({
  entityType,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: CRMEntitySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 300);

  const config = ENTITY_CONFIG[entityType];
  const Icon = config.icon;

  // Fetch entities based on type
  const leadsQuery = useLeads(
    entityType === 'lead' ? { searchTerm: debouncedSearch || undefined, limit: 10 } : { limit: 0 }
  );
  const customersQuery = useCustomers(
    entityType === 'customer' ? { searchTerm: debouncedSearch || undefined, limit: 10 } : { limit: 0 }
  );
  const opportunitiesQuery = useOpportunities(
    entityType === 'opportunity' ? { searchTerm: debouncedSearch || undefined, limit: 10 } : { limit: 0 }
  );
  const tasksQuery = useTasks(
    entityType === 'task' ? { searchTerm: debouncedSearch || undefined, limit: 10 } : { limit: 0 }
  );

  // Get entities based on type
  const entities: CRMEntity[] = React.useMemo(() => {
    switch (entityType) {
      case 'lead':
        return (leadsQuery.data?.data ?? []).map((lead) => ({
          id: lead.id,
          name: lead.companyName || lead.fullName,
          subtitle: lead.email,
        }));
      case 'customer':
        return (customersQuery.data?.data ?? []).map((customer) => ({
          id: customer.id,
          name: customer.companyName,
          subtitle: customer.email,
        }));
      case 'opportunity':
        return (opportunitiesQuery.data?.data ?? []).map((opp) => ({
          id: opp.id,
          name: opp.name,
          subtitle: opp.amount ? `$${opp.amount.toLocaleString()}` : undefined,
        }));
      case 'task':
        return (tasksQuery.data?.data ?? []).map((task) => ({
          id: task.id,
          name: task.title,
          subtitle: task.status,
        }));
      default:
        return [];
    }
  }, [entityType, leadsQuery.data, customersQuery.data, opportunitiesQuery.data, tasksQuery.data]);

  const isLoading = entityType === 'lead' ? leadsQuery.isLoading
    : entityType === 'customer' ? customersQuery.isLoading
    : entityType === 'opportunity' ? opportunitiesQuery.isLoading
    : tasksQuery.isLoading;

  // Find selected entity
  const selectedEntity = entities.find((e) => e.id === value);

  const handleSelect = (id: string) => {
    onChange(id);
    setSearchValue('');
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Seleccionar ${config.label}`}
            className="w-full justify-between"
            disabled={disabled}
          >
            {value && selectedEntity ? (
              <span className="flex items-center gap-2 truncate">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedEntity.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Search className="h-4 w-4" />
                {placeholder ?? `Buscar ${config.label.toLowerCase()}...`}
              </span>
            )}
            <div className="flex items-center gap-1">
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="hover:text-destructive p-0.5 rounded"
                  aria-label="Limpiar selección"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Escribe para buscar ${config.label.toLowerCase()}...`}
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              {isLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoading && entities.length === 0 && (
                <CommandEmpty>
                  {searchValue ? `No se encontraron ${config.label.toLowerCase()}s.` : 'Escribe para buscar.'}
                </CommandEmpty>
              )}
              {!isLoading && entities.length > 0 && (
                <CommandGroup heading={`${config.label}s`}>
                  {entities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={entity.id}
                      onSelect={() => handleSelect(entity.id)}
                      className="flex items-center gap-3 py-2"
                    >
                      <div
                        className="p-1.5 rounded"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${config.colorVar} 15%, transparent)`,
                          color: config.colorVar,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entity.name}</p>
                        {entity.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">
                            {entity.subtitle}
                          </p>
                        )}
                      </div>
                      {entity.id === value && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Badge */}
      {value && selectedEntity && (
        <Badge
          variant="outline"
          className="text-xs border-current"
          style={{
            backgroundColor: `color-mix(in srgb, ${config.colorVar} 15%, transparent)`,
            color: config.colorVar,
          }}
        >
          <Icon className="h-3 w-3 mr-1" />
          {selectedEntity.name}
        </Badge>
      )}
    </div>
  );
}

export default CRMEntitySelector;
