'use client';

/**
 * CustomerKanbanColumnHeader - Column Header Component v1.0
 *
 * Displays lifecycle stage name, customer count, and optional actions.
 * Uses CSS variables for dynamic theming.
 *
 * @module components/kanban/CustomerKanbanColumnHeader
 */

import * as React from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LifecycleStageConfig } from '../../hooks';

// ============================================
// Types
// ============================================

export interface CustomerKanbanColumnHeaderProps {
  /** Lifecycle stage configuration */
  stage: LifecycleStageConfig;
  /** Number of customers in this column */
  count: number;
  /** Total value (MRR) in this column */
  totalValue?: number;
  /** Whether this column is the current drop target */
  isOver?: boolean;
  /** Handler for adding a customer to this stage */
  onAddCustomer?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function formatCurrency(amount: number | null | undefined): string {
  // Guard against undefined/null values
  if (amount == null || isNaN(amount)) {
    return '$0';
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// ============================================
// Component
// ============================================

export const CustomerKanbanColumnHeader = React.memo(function CustomerKanbanColumnHeader({
  stage,
  count,
  totalValue,
  isOver = false,
  onAddCustomer,
  className,
}: CustomerKanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-3 py-2',
        'border-b border-border/60',
        'bg-background/50',
        'backdrop-blur-sm',
        'transition-all duration-200',
        isOver && 'bg-[var(--customer-drop-bg)]',
        className
      )}
    >
      {/* Left side: Stage info */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Color indicator */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />

        {/* Stage name */}
        <h3 className="font-semibold text-sm text-foreground truncate">
          {stage.label}
        </h3>

        {/* Count badge */}
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'min-w-[1.5rem] h-5 px-1.5',
            'rounded-full',
            'text-[10px] font-bold tabular-nums',
            'transition-colors duration-200'
          )}
          style={{
            backgroundColor: stage.bg,
            color: stage.textColor,
          }}
        >
          {count}
        </span>
      </div>

      {/* Right side: Value + Actions */}
      <div className="flex items-center gap-2">
        {/* Total MRR in column */}
        {totalValue !== undefined && totalValue > 0 && (
          <span className="text-[10px] font-medium text-muted-foreground">
            {formatCurrency(totalValue)}
          </span>
        )}

        {/* Add button */}
        {onAddCustomer && (
          <button
            type="button"
            onClick={onAddCustomer}
            aria-label={`Agregar cliente a ${stage.label}`}
            className={cn(
              'flex items-center justify-center',
              'w-6 h-6 rounded-md',
              'text-muted-foreground',
              'hover:bg-muted',
              'hover:text-foreground',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Más opciones"
              className={cn(
                'flex items-center justify-center',
                'w-6 h-6 rounded-md',
                'text-muted-foreground',
                'hover:bg-muted',
                'hover:text-foreground',
                'transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="text-xs">
              Colapsar columna
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Ordenar por nombre
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Ordenar por salud
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Ordenar por MRR
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

export default CustomerKanbanColumnHeader;
