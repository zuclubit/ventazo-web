'use client';

/**
 * OpportunityKanbanColumn Component
 *
 * Kanban column for opportunities with:
 * - Stage header with color and count
 * - Amount totals (value + forecast)
 * - Droppable area for opportunities
 * - Empty state
 *
 * Homologated with LeadKanbanColumn design patterns.
 */

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, DollarSign, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Opportunity, OpportunityPipelineStage } from '@/lib/opportunities';
import { OpportunityKanbanCard } from './OpportunityKanbanCard';

// ============================================
// Types
// ============================================

export interface OpportunityKanbanColumnProps {
  /** Stage data */
  stage: OpportunityPipelineStage;
  /** Opportunities in this column */
  opportunities: Opportunity[];
  /** Total amount for this stage */
  totalAmount: number;
  /** Weighted forecast for this stage */
  totalForecast: number;
  /** Whether this column is being dragged over */
  isOver?: boolean;
  /** Handler when opportunity card is clicked */
  onOpportunityClick?: (opportunity: Opportunity) => void;
  /** Handler for edit opportunity */
  onOpportunityEdit?: (opportunity: Opportunity) => void;
  /** Handler for mark as won */
  onOpportunityWin?: (opportunity: Opportunity) => void;
  /** Handler for mark as lost */
  onOpportunityLost?: (opportunity: Opportunity) => void;
  /** Handler for view opportunity */
  onOpportunityView?: (opportunity: Opportunity) => void;
  /** Handler for adding new opportunity to this stage */
  onAddOpportunity?: (stageId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

// ============================================
// Column Header
// ============================================

interface ColumnHeaderProps {
  stage: OpportunityPipelineStage;
  count: number;
  totalAmount: number;
  totalForecast: number;
  onAddClick?: () => void;
}

function ColumnHeader({
  stage,
  count,
  totalAmount,
  totalForecast,
  onAddClick,
}: ColumnHeaderProps) {
  return (
    <div className="flex-shrink-0">
      {/* Stage Title Bar */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl"
        style={{
          backgroundColor: `${stage.color}15`,
          borderBottom: `3px solid ${stage.color}`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full shadow-sm"
            style={{ backgroundColor: stage.color }}
          />
          <span className="font-semibold text-sm text-foreground">
            {stage.label}
          </span>
          <Badge
            variant="secondary"
            className="h-5 min-w-[1.25rem] px-1.5 text-xs font-medium"
          >
            {count}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {stage.probability}%
          </span>
          {onAddClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-background/50"
              onClick={onAddClick}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-card/50 backdrop-blur-sm border-b border-border/50 px-3 py-2">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Total:</span>
            <span className="font-medium text-foreground">
              {formatCompactCurrency(totalAmount)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-primary">
              {formatCompactCurrency(totalForecast)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Empty State
// ============================================

interface EmptyStateProps {
  stageName: string;
  onAddClick?: () => void;
}

function EmptyState({ stageName, onAddClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
        <Target className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Sin oportunidades en {stageName}
      </p>
      {onAddClick && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-7"
          onClick={onAddClick}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OpportunityKanbanColumn({
  stage,
  opportunities,
  totalAmount,
  totalForecast,
  isOver = false,
  onOpportunityClick,
  onOpportunityEdit,
  onOpportunityWin,
  onOpportunityLost,
  onOpportunityView,
  onAddOpportunity,
  className,
}: OpportunityKanbanColumnProps) {
  // DnD Kit droppable hook
  const { setNodeRef, isOver: dndIsOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'column',
      stage,
    },
  });

  // Combine internal and external isOver states
  const isDropTarget = isOver || dndIsOver;

  // Get opportunity IDs for sortable context
  const opportunityIds = React.useMemo(
    () => opportunities.map((opp) => opp.id),
    [opportunities]
  );

  const handleAddClick = () => {
    onAddOpportunity?.(stage.id);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border bg-muted/30',
        'min-w-[300px] max-w-[300px]',
        'transition-all duration-200',
        isDropTarget && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        className
      )}
      style={{
        height: 'calc(100vh - 260px)',
        minHeight: '400px',
      }}
    >
      {/* Column Header */}
      <ColumnHeader
        stage={stage}
        count={opportunities.length}
        totalAmount={totalAmount}
        totalForecast={totalForecast}
        onAddClick={handleAddClick}
      />

      {/* Cards Container */}
      <ScrollArea className="flex-1">
        <SortableContext
          items={opportunityIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="p-2 space-y-2">
            {opportunities.length > 0 ? (
              opportunities.map((opportunity) => (
                <OpportunityKanbanCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  onClick={onOpportunityClick}
                  onEdit={onOpportunityEdit}
                  onWin={onOpportunityWin}
                  onLost={onOpportunityLost}
                  onView={onOpportunityView}
                />
              ))
            ) : (
              <EmptyState
                stageName={stage.label}
                onAddClick={handleAddClick}
              />
            )}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Drop Indicator */}
      {isDropTarget && (
        <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
      )}
    </div>
  );
}
