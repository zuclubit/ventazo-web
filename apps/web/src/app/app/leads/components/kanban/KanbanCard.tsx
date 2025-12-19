'use client';

/**
 * KanbanCard Component
 *
 * Draggable card wrapper that uses @dnd-kit's useSortable hook.
 * Responsive design with optimized touch targets for mobile.
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, Clock, GripVertical } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Lead } from '@/lib/leads';
import { LeadStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/leads';
import { LeadScoreIndicator } from '../LeadScoreIndicator';
import { QuickActionsBar } from '../QuickActionsBar';

export interface KanbanCardProps {
  /** Lead data */
  lead: Lead;
  /** Whether the card is being dragged */
  isDragging?: boolean;
  /** Whether this is the dragged overlay item */
  isOverlay?: boolean;
  /** Click handler to select the lead */
  onClick?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Convert handler */
  onConvert?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// Helpers
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Sin actividad';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return 'Sin actividad';
  }
}

export function KanbanCard({
  lead,
  isDragging = false,
  isOverlay = false,
  onClick,
  onEdit,
  onDelete,
  onConvert,
  className,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'lead',
      lead,
    },
  });

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const isHotLead = lead.score >= 80;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging && !isOverlay ? 0.5 : 1,
  };

  // Status badge component
  const StatusBadge = () => {
    const colorClasses = STATUS_COLORS[lead.status] || STATUS_COLORS[LeadStatus.NEW];
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-2xs sm:text-xs font-medium px-1.5 sm:px-2 py-0',
          colorClasses
        )}
      >
        {STATUS_LABELS[lead.status] || lead.status}
      </Badge>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isCurrentlyDragging && !isOverlay && 'z-0',
        isOverlay && [
          'cursor-grabbing',
          'ring-2 ring-primary/50',
          'shadow-xl shadow-primary/20',
          'rotate-2 scale-105',
        ],
        className
      )}
    >
      <Card
        {...attributes}
        {...listeners}
        className={cn(
          'group relative overflow-hidden',
          'transition-all duration-200',
          'border bg-card/90 backdrop-blur-sm',
          // Responsive hover states (disabled on touch)
          'hover:border-primary/20 hover:shadow-md',
          '@supports (hover: hover) { hover:-translate-y-0.5 }',
          // Hot lead indicator
          isHotLead && 'border-l-2 border-l-orange-500',
          // Cursor states
          isCurrentlyDragging ? 'cursor-grabbing' : 'cursor-grab',
          // Active state for better touch feedback
          'active:scale-[0.98] active:shadow-inner'
        )}
        onClick={!isOverlay && !isCurrentlyDragging ? onClick : undefined}
      >
        <div className="p-2.5 sm:p-3">
          {/* Main Content Row */}
          <div className="flex items-start gap-2 sm:gap-2.5">
            {/* Drag Handle - Hidden on mobile, visible on hover for desktop */}
            <div className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>

            {/* Avatar - Responsive size */}
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-1 ring-background">
              <AvatarFallback className="text-xs sm:text-sm bg-primary/10 text-primary font-medium">
                {getInitials(lead.fullName)}
              </AvatarFallback>
            </Avatar>

            {/* Info - Flex grow */}
            <div className="flex-1 min-w-0">
              {/* Name and Score Row */}
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-medium text-sm sm:text-base truncate">
                  {lead.fullName}
                </span>
                <LeadScoreIndicator
                  score={lead.score}
                  size="sm"
                  variant="badge"
                  showLabel={false}
                />
              </div>

              {/* Company - if exists */}
              {lead.companyName && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {lead.companyName}
                  </span>
                </div>
              )}

              {/* Status and Time Row */}
              <div className="flex items-center justify-between gap-2 mt-1.5 sm:mt-2">
                <StatusBadge />
                <div className="flex items-center gap-1 text-2xs sm:text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[80px] sm:max-w-none">
                    {formatRelativeTime(lead.lastActivityAt || lead.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - Show on hover for desktop, always visible on mobile */}
          <div
            className={cn(
              'mt-2 pt-2 border-t border-border/50',
              // Desktop: show on hover
              'sm:opacity-0 sm:group-hover:opacity-100',
              // Mobile: always visible
              'opacity-100',
              'transition-opacity duration-200'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <QuickActionsBar
              lead={lead}
              size="sm"
              variant="icons-only"
              stopPropagation={true}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Static card for drag overlay
 * Doesn't use useSortable - just a visual clone
 */
export function KanbanCardOverlay({ lead }: { lead: Lead }) {
  const isHotLead = lead.score >= 80;

  return (
    <div className="cursor-grabbing rotate-2 scale-105 w-[280px] sm:w-72 lg:w-80">
      <Card
        className={cn(
          'ring-2 ring-primary/50 shadow-xl shadow-primary/20',
          'border bg-card/95 backdrop-blur-sm',
          isHotLead && 'border-l-2 border-l-orange-500'
        )}
      >
        <div className="p-2.5 sm:p-3">
          <div className="flex items-start gap-2 sm:gap-2.5">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <AvatarFallback className="text-xs sm:text-sm bg-primary/10 text-primary font-medium">
                {getInitials(lead.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-medium text-sm sm:text-base truncate">
                  {lead.fullName}
                </span>
                <LeadScoreIndicator
                  score={lead.score}
                  size="sm"
                  variant="badge"
                  showLabel={false}
                />
              </div>
              {lead.companyName && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {lead.companyName}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
