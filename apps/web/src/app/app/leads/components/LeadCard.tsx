'use client';

/**
 * LeadCard Component
 *
 * Reusable lead card for list, pipeline, and preview contexts.
 * Features: Score indicator, quick actions, bulk selection, glassmorphism styling.
 */

import * as React from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  type Lead,
  LeadStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
} from '@/lib/leads';

import { LeadScoreIndicator } from './LeadScoreIndicator';
import { QuickActionsBar } from './QuickActionsBar';

// ============================================
// Types
// ============================================

export interface LeadCardProps {
  /** Lead data */
  lead: Lead;
  /** Card variant */
  variant?: 'compact' | 'default' | 'expanded';
  /** Is selected (for preview panel) */
  selected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Selection state for bulk actions */
  isChecked?: boolean;
  /** Checkbox change handler */
  onCheckedChange?: (checked: boolean) => void;
  /** Show checkbox for bulk selection */
  showCheckbox?: boolean;
  /** Show quick actions */
  showQuickActions?: boolean;
  /** Show drag handle (for pipeline) */
  showDragHandle?: boolean;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Convert handler */
  onConvert?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

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
    const date = new Date(dateStr);
    const distance = formatDistanceToNow(date, { addSuffix: true, locale: es });
    return distance;
  } catch {
    return 'Sin actividad';
  }
}

// ============================================
// Status Badge Component
// ============================================

function StatusBadge({ status }: { status: LeadStatus }) {
  const colorClasses = STATUS_COLORS[status] || STATUS_COLORS[LeadStatus.NEW];

  return (
    <Badge variant="outline" className={cn('text-xs font-medium', colorClasses)}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

// ============================================
// Tag Display Component
// ============================================

function TagsDisplay({ tags, max = 2 }: { tags: string[]; max?: number }) {
  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, max);
  const remainingCount = tags.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-2xs px-1.5 py-0 h-5 bg-muted/50"
        >
          {tag}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge
          variant="outline"
          className="text-2xs px-1.5 py-0 h-5 text-muted-foreground"
        >
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

// ============================================
// Compact Variant
// ============================================

function CompactLeadCard({
  lead,
  selected,
  onClick,
  isChecked,
  onCheckedChange,
  showCheckbox,
  showDragHandle,
  className,
}: LeadCardProps) {
  const isHotLead = lead.score >= 80;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200',
        'border bg-card/80 backdrop-blur-sm',
        'hover:border-primary/20 hover:shadow-md',
        selected && 'border-primary/40 bg-primary/5 ring-1 ring-primary/20',
        isHotLead && 'border-l-2 border-l-orange-500',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag Handle */}
        {showDragHandle && (
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 cursor-grab" />
        )}

        {/* Checkbox */}
        {showCheckbox && (
          <Checkbox
            checked={isChecked}
            onCheckedChange={onCheckedChange}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}

        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(lead.fullName)}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{lead.fullName}</span>
            <LeadScoreIndicator score={lead.score} size="sm" variant="badge" showLabel={false} />
          </div>
          {lead.companyName && (
            <p className="text-xs text-muted-foreground truncate">{lead.companyName}</p>
          )}
        </div>

        {/* Status */}
        <StatusBadge status={lead.status} />
      </div>
    </Card>
  );
}

// ============================================
// Default Variant
// ============================================

function DefaultLeadCard({
  lead,
  selected,
  onClick,
  isChecked,
  onCheckedChange,
  showCheckbox,
  showQuickActions = true,
  onEdit,
  onDelete,
  onConvert,
  className,
}: LeadCardProps) {
  const isHotLead = lead.score >= 80;
  const canConvert = lead.status === LeadStatus.QUALIFIED;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'border bg-card/80 backdrop-blur-sm',
        'hover:border-[#14B8A6]/20 hover:shadow-lg hover:-translate-y-0.5',
        selected && 'border-primary/40 bg-primary/5 ring-2 ring-primary/20',
        isHotLead && 'border-l-4 border-l-orange-500',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          {showCheckbox && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={onCheckedChange}
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 mt-1"
            />
          )}

          {/* Avatar */}
          <Avatar className="h-10 w-10 shrink-0 ring-2 ring-background">
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {getInitials(lead.fullName)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{lead.fullName}</h3>
                  <StatusBadge status={lead.status} />
                </div>
                {lead.companyName && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {lead.companyName}
                    </span>
                  </div>
                )}
              </div>

              {/* Score */}
              <LeadScoreIndicator score={lead.score} size="sm" showLabel={false} />
            </div>

            {/* Meta Row */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {/* Last Activity */}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(lead.lastActivityAt || lead.updatedAt)}</span>
              </div>

              {/* Source */}
              <Badge variant="outline" className="text-2xs">
                {SOURCE_LABELS[lead.source] || lead.source}
              </Badge>
            </div>

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="mt-2">
                <TagsDisplay tags={lead.tags} />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-start gap-1 shrink-0">
            {/* Quick Actions (visible on hover or always) */}
            {showQuickActions && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <QuickActionsBar lead={lead} size="sm" />
              </div>
            )}

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {canConvert && onConvert && (
                  <DropdownMenuItem onClick={onConvert} className="text-primary">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Convertir a Cliente
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Expanded Variant (for preview panel)
// ============================================

function ExpandedLeadCard({
  lead,
  showQuickActions = true,
  onEdit,
  onDelete,
  onConvert,
  className,
}: LeadCardProps) {
  const canConvert = lead.status === LeadStatus.QUALIFIED;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 ring-2 ring-primary/20">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
            {getInitials(lead.fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate">{lead.fullName}</h2>
          {lead.companyName && (
            <p className="text-sm text-muted-foreground">{lead.companyName}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <StatusBadge status={lead.status} />
            <Badge variant="outline" className="text-xs">
              {SOURCE_LABELS[lead.source] || lead.source}
            </Badge>
          </div>
        </div>

        <LeadScoreIndicator score={lead.score} size="lg" />
      </div>

      {/* Quick Actions */}
      {showQuickActions && (
        <QuickActionsBar lead={lead} variant="stacked" />
      )}

      {/* Contact Info */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Contacto
        </h4>
        {lead.email && (
          <p className="text-sm">
            <span className="text-muted-foreground">Email:</span>{' '}
            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
              {lead.email}
            </a>
          </p>
        )}
        {lead.phone && (
          <p className="text-sm">
            <span className="text-muted-foreground">Tel:</span>{' '}
            <a href={`tel:${lead.phone}`} className="hover:underline">
              {lead.phone}
            </a>
          </p>
        )}
        {lead.website && (
          <p className="text-sm">
            <span className="text-muted-foreground">Web:</span>{' '}
            <a
              href={lead.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {lead.website.replace(/^https?:\/\//, '')}
            </a>
          </p>
        )}
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>Creado {formatRelativeTime(lead.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Actualizado {formatRelativeTime(lead.updatedAt)}</span>
        </div>
      </div>

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Etiquetas
          </h4>
          <TagsDisplay tags={lead.tags} max={10} />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
        {canConvert && onConvert && (
          <Button size="sm" onClick={onConvert} className="flex-1 ventazo-button">
            <UserCheck className="mr-2 h-4 w-4" />
            Convertir
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadCard(props: LeadCardProps) {
  const { variant = 'default' } = props;

  switch (variant) {
    case 'compact':
      return <CompactLeadCard {...props} />;
    case 'expanded':
      return <ExpandedLeadCard {...props} />;
    default:
      return <DefaultLeadCard {...props} />;
  }
}
