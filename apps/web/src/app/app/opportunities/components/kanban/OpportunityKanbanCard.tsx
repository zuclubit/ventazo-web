'use client';

/**
 * OpportunityKanbanCard Component
 *
 * Kanban card for opportunities with:
 * - Amount and probability display
 * - Quick actions (edit, win, lost)
 * - Priority badge
 * - Expected close date
 * - Tags display
 *
 * Homologated with LeadKanbanCard design patterns.
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  DollarSign,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Trophy,
  XCircle,
  Edit2,
  Eye,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { touchTargets } from '@/lib/theme/tokens';
import type { Opportunity } from '@/lib/opportunities';
import { OpportunityProbabilityIndicator } from '../OpportunityProbabilityIndicator';

// ============================================
// Types
// ============================================

export interface OpportunityKanbanCardProps {
  /** Opportunity data */
  opportunity: Opportunity;
  /** Whether the card is in a dragging overlay */
  isOverlay?: boolean;
  /** Whether the card is being moved (API call in progress) */
  isMoving?: boolean;
  /** Handler when card is clicked */
  onClick?: (opportunity: Opportunity) => void;
  /** Handler for edit action */
  onEdit?: (opportunity: Opportunity) => void;
  /** Handler for mark as won */
  onWin?: (opportunity: Opportunity) => void;
  /** Handler for mark as lost */
  onLost?: (opportunity: Opportunity) => void;
  /** Handler for view details */
  onView?: (opportunity: Opportunity) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Priority Badge Config
// ============================================

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: {
    label: 'Baja',
    className: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)] border-[var(--priority-low-border)]',
  },
  medium: {
    label: 'Media',
    className: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border-[var(--priority-medium-border)]',
  },
  high: {
    label: 'Alta',
    className: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)] border-[var(--priority-high-border)]',
  },
  critical: {
    label: 'Critica',
    className: 'bg-[var(--priority-critical-bg)] text-[var(--priority-critical)] border-[var(--priority-critical-border)]',
  },
};

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

function getCloseDateInfo(date: Date | string | null | undefined) {
  if (!date) return null;

  const closeDate = typeof date === 'string' ? new Date(date) : date;

  if (isToday(closeDate)) {
    return { label: 'Hoy', className: 'text-[var(--urgency-today)]', isUrgent: true };
  }

  if (isTomorrow(closeDate)) {
    return { label: 'Mañana', className: 'text-[var(--urgency-tomorrow)]', isUrgent: true };
  }

  if (isPast(closeDate)) {
    return {
      label: `Vencido ${formatDistanceToNow(closeDate, { addSuffix: false, locale: es })}`,
      className: 'text-[var(--urgency-overdue-text)]',
      isUrgent: true,
    };
  }

  return {
    label: format(closeDate, "d 'de' MMM", { locale: es }),
    className: 'text-muted-foreground',
    isUrgent: false,
  };
}

// ============================================
// Main Component
// ============================================

export function OpportunityKanbanCard({
  opportunity,
  isOverlay = false,
  isMoving = false,
  onClick,
  onEdit,
  onWin,
  onLost,
  onView,
  className,
}: OpportunityKanbanCardProps) {
  // DnD Kit sortable hook
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity.id,
    data: {
      type: 'opportunity',
      opportunity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const defaultPriority = { label: 'Media', className: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border-[var(--priority-medium-border)]' };
  const priority = priorityConfig[opportunity.priority] ?? defaultPriority;
  const closeDateInfo = getCloseDateInfo(opportunity.expectedCloseDate);
  const isOpen = opportunity.status === 'open';

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when dragging or clicking on action buttons
    if (isDragging) return;
    onClick?.(opportunity);
  };

  // Handle action clicks with stopPropagation
  const handleAction = (
    action: 'edit' | 'win' | 'lost' | 'view',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    switch (action) {
      case 'edit':
        onEdit?.(opportunity);
        break;
      case 'win':
        onWin?.(opportunity);
        break;
      case 'lost':
        onLost?.(opportunity);
        break;
      case 'view':
        onView?.(opportunity);
        break;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative rounded-xl border bg-card p-3',
        'transition-all duration-200',
        'hover:shadow-md hover:border-primary/20',
        'active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/30',
        isOverlay && 'shadow-xl rotate-3',
        isMoving && 'opacity-70 pointer-events-none ring-2 ring-[var(--action-send)]/50',
        className
      )}
      onClick={handleClick}
    >
      {/* Moving indicator overlay */}
      {isMoving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px] z-10">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--action-send-bg)] text-[var(--action-send)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">Moviendo...</span>
          </div>
        </div>
      )}
      {/* Drag Handle + Header */}
      <div className="flex items-start gap-2 mb-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'flex-shrink-0 mt-1 cursor-grab',
            'text-muted-foreground/40 hover:text-muted-foreground',
            'transition-colors',
            'touch-none'
          )}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Title & Customer */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground">
            {opportunity.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {opportunity.customer?.name || opportunity.lead?.fullName || 'Sin cliente asignado'}
          </p>
        </div>

        {/* Actions Menu - Touch-friendly */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                touchTargets.iconButton, // WCAG compliant sizing
                'rounded-full',
                // Always visible on mobile (no hover), fade in on desktop
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                'transition-opacity'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Opciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-44">
            <DropdownMenuItem onClick={(e) => handleAction('view', e)} className={touchTargets.comfortable}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleAction('edit', e)} className={touchTargets.comfortable}>
              <Edit2 className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {isOpen && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(
                    'text-[var(--action-win)] focus:text-[var(--action-win)]',
                    touchTargets.comfortable
                  )}
                  onClick={(e) => handleAction('win', e)}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Marcar Ganada
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(
                    'text-[var(--action-lost)] focus:text-[var(--action-lost)]',
                    touchTargets.comfortable
                  )}
                  onClick={(e) => handleAction('lost', e)}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Marcar Perdida
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Amount & Probability Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-[var(--action-accept)]" />
          <span className="font-bold text-sm">
            {formatCurrency(opportunity.amount, opportunity.currency)}
          </span>
        </div>
        <OpportunityProbabilityIndicator
          probability={opportunity.probability}
          size="sm"
          variant="badge"
          showLabel={false}
        />
      </div>

      {/* Probability Bar */}
      <div className="mb-3">
        <OpportunityProbabilityIndicator
          probability={opportunity.probability}
          variant="bar"
          className="h-1.5"
        />
      </div>

      {/* Footer: Priority + Close Date */}
      <div className="flex items-center justify-between">
        {/* Priority Badge */}
        <Badge
          variant="secondary"
          className={cn('text-xs px-2 py-0', priority.className)}
        >
          {priority.label}
        </Badge>

        {/* Close Date */}
        {closeDateInfo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    closeDateInfo.className
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span>{closeDateInfo.label}</span>
                  {closeDateInfo.isUrgent && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Fecha de cierre esperada
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Tags (if any) */}
      {opportunity.tags && opportunity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
          {opportunity.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {opportunity.tags.length > 2 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              +{opportunity.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
