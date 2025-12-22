'use client';

/**
 * KanbanCard - Clean Design System 2025
 *
 * Design Principles:
 * - Clean, light backgrounds with subtle borders
 * - Consistent typography scale
 * - 44px touch targets
 * - Soft shadows and harmonious colors
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2,
  Clock,
  GripVertical,
  Flame,
  MessageCircle,
  Phone,
  MoreHorizontal,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Lead } from '@/lib/leads';
import { LeadStatus, STATUS_LABELS } from '@/lib/leads';
import { cn } from '@/lib/utils';

import { LeadSourceIcon } from '../LeadSourceBadge';
import { UrgencyBanner } from '../LeadUrgencyIndicator';

// ============================================
// Types
// ============================================

export interface KanbanCardProps {
  lead: Lead;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onConvert?: () => void;
  className?: string;
}

// ============================================
// Design Tokens
// ============================================

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  new: {
    bg: 'bg-blue-500/15 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-500/30'
  },
  contacted: {
    bg: 'bg-amber-500/15 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-500/30'
  },
  qualified: {
    bg: 'bg-violet-500/15 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-500/30'
  },
  proposal: {
    bg: 'bg-teal-500/15 dark:bg-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-500/30'
  },
  won: {
    bg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-500/30'
  },
  lost: {
    bg: 'bg-red-500/15 dark:bg-red-500/20',
    text: 'text-red-500 dark:text-red-400',
    border: 'border-red-200 dark:border-red-500/30'
  },
};

// ============================================
// Helpers
// ============================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatRelativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.startsWith('52') || cleaned.startsWith('1')
      ? '+' + cleaned
      : '+52' + cleaned;
  }
  return cleaned;
}

function getScoreLevel(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ============================================
// Score Badge
// ============================================

function ScoreBadge({ score }: { score: number }) {
  const level = getScoreLevel(score);
  const isHot = score >= 70;

  const styles = {
    hot: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30',
    warm: 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 shadow-amber-400/25',
    cold: 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5',
        'px-2 py-0.5 rounded-full',
        'text-xs font-bold tabular-nums',
        'shadow-sm',
        styles[level]
      )}
    >
      {score}
      {isHot && <Flame className="h-3 w-3" />}
    </span>
  );
}

// ============================================
// Status Badge
// ============================================

function StatusBadge({ status }: { status: LeadStatus }) {
  const defaultStyle = {
    bg: 'bg-slate-500/20',
    text: 'text-slate-300',
    border: 'border-slate-500/30'
  };
  const styles = STATUS_STYLES[status] ?? defaultStyle;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5',
        'rounded-md border',
        'text-[10px] font-medium',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ============================================
// Action Button
// ============================================

function ActionButton({
  icon: Icon,
  onClick,
  disabled,
  className,
  label,
}: {
  icon: typeof MessageCircle;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex items-center justify-center',
        'w-9 h-9 rounded-lg',
        'text-muted-foreground',
        'transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        !disabled && 'hover:scale-105 active:scale-95',
        disabled && 'opacity-30 cursor-not-allowed',
        className
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

// ============================================
// Main Component
// ============================================

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
    data: { type: 'lead', lead },
  });

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const isHotLead = lead.score >= 70;
  const hasPhone = !!lead.phone?.trim();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
  };

  // Handlers
  const handleWhatsApp = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPhone) {
      window.open(`https://wa.me/${normalizePhone(lead.phone!).replace('+', '')}`, '_blank');
    }
  }, [lead.phone, hasPhone]);

  const handleCall = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasPhone) {
      window.location.href = `tel:${lead.phone}`;
    }
  }, [lead.phone, hasPhone]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isCurrentlyDragging && !isOverlay && 'z-0',
        isOverlay && 'shadow-2xl',
        className
      )}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={!isOverlay && !isCurrentlyDragging ? onClick : undefined}
        className={cn(
          // Base
          'group relative',
          'p-3',
          'rounded-xl border',
          'transition-all duration-200',
          // Background - Theme-aware
          'bg-white dark:bg-slate-800/90',
          'border-slate-200/80 dark:border-slate-700/60',
          // Shadow - Enhanced for dark mode
          'shadow-sm dark:shadow-lg dark:shadow-black/20',
          // Hover
          'hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-black/30',
          'hover:border-slate-300 dark:hover:border-slate-600',
          'hover:-translate-y-0.5',
          // Hot lead accent
          isHotLead && 'border-l-2 border-l-orange-500',
          // Dragging
          isCurrentlyDragging && 'shadow-xl dark:shadow-2xl rotate-1 scale-[1.02]',
          // Cursor
          isCurrentlyDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {/* Drag Handle - Desktop only */}
        <div className="hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity absolute left-1 top-1/2 -translate-y-1/2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
              <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-sm font-semibold">
                {getInitials(lead.fullName)}
              </AvatarFallback>
            </Avatar>
            {isHotLead && (
              <div className="absolute -top-1 -right-1 p-0.5 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full shadow-lg shadow-orange-500/30">
                <Flame className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + Score Row */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px] text-foreground truncate flex-1">
                {lead.fullName}
              </span>
              <ScoreBadge score={lead.score} />
            </div>

            {/* Company + Source Row */}
            {(lead.companyName || lead.source) && (
              <div className="flex items-center gap-2">
                {lead.companyName && (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <Building2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-muted-foreground truncate">
                      {lead.companyName}
                    </span>
                  </div>
                )}
                {lead.source && (
                  <LeadSourceIcon source={lead.source} className="shrink-0" />
                )}
              </div>
            )}

            {/* Status + Time Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={lead.status} />
              {lead.lastActivityAt && (
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(lead.lastActivityAt)}
                </span>
              )}
            </div>

            {/* Urgency Banner */}
            <UrgencyBanner
              nextFollowUpAt={lead.nextFollowUpAt}
              lastActivityAt={lead.lastActivityAt}
              createdAt={lead.createdAt}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <ActionButton
              icon={MessageCircle}
              onClick={handleWhatsApp}
              disabled={!hasPhone}
              label="WhatsApp"
              className="hover:bg-[var(--whatsapp)]/15 dark:hover:bg-[var(--whatsapp)]/20 hover:text-[var(--whatsapp)]"
            />
            <ActionButton
              icon={Phone}
              onClick={handleCall}
              disabled={!hasPhone}
              label="Llamar"
              className="hover:bg-[var(--tenant-accent)]/15 dark:hover:bg-[var(--tenant-accent)]/20 hover:text-[var(--tenant-accent)]"
            />

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit} className="py-2">
                  Editar
                </DropdownMenuItem>
                {lead.status === LeadStatus.QUALIFIED && onConvert && (
                  <DropdownMenuItem onClick={onConvert} className="py-2 text-[var(--tenant-primary)]">
                    Convertir
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="py-2 text-red-500 dark:text-red-400">
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Overlay
// ============================================

export function KanbanCardOverlay({ lead }: { lead: Lead }) {
  return (
    <div style={{ width: 'clamp(280px, 80vw, 320px)' }} className="cursor-grabbing">
      <KanbanCard lead={lead} isOverlay />
    </div>
  );
}
