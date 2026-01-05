'use client';

/**
 * KanbanCard - Clean Design System 2025
 *
 * Design Principles:
 * - Clean, light backgrounds with subtle borders
 * - Consistent typography scale
 * - 44px touch targets
 * - Soft shadows and harmonious colors
 *
 * Mobile Scroll Optimization (v2.0):
 * - Drag handle only on mobile (prevents scroll conflicts)
 * - Full card draggable on desktop
 * - touch-action CSS for proper scroll behavior
 *
 * @version 2.1.0
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
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
import { useMobileDetection } from '@/hooks/use-mobile-detection';

// Extended Lead type for optimistic updates
interface OptimisticLead extends Lead {
  isOptimistic?: boolean;
}
import { decodeHtmlEntities } from '@/lib/security';
import { CARD_TOKENS } from '@/components/cards';

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
// Design Tokens - Dynamic Theming v3.0
// ============================================

/**
 * Status styles using CSS variables for FULL dynamic theming v4.0
 * All colors are controlled via CSS variables set by useKanbanTheme
 * This ensures consistent theming across the entire Kanban board
 */
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  new: {
    bg: 'bg-[var(--status-info-bg)]',
    text: 'text-[var(--status-info-text)]',
    border: 'border-[var(--status-info-border)]'
  },
  contacted: {
    bg: 'bg-[var(--status-warning-bg)]',
    text: 'text-[var(--status-warning-text)]',
    border: 'border-[var(--status-warning-border)]'
  },
  qualified: {
    bg: 'bg-violet-500/15 dark:bg-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-500/30'
  },
  proposal: {
    // Use tenant primary color for proposal stage
    bg: 'bg-[rgba(var(--tenant-primary-rgb),0.15)]',
    text: 'text-[var(--tenant-primary)]',
    border: 'border-[var(--tenant-primary-glow)]'
  },
  negotiation: {
    bg: 'bg-pink-500/15 dark:bg-pink-500/20',
    text: 'text-pink-600 dark:text-pink-400',
    border: 'border-pink-200 dark:border-pink-500/30'
  },
  won: {
    // Use tenant accent for won deals (success state)
    bg: 'bg-[var(--status-success-bg)]',
    text: 'text-[var(--status-success-text)]',
    border: 'border-[var(--status-success-border)]'
  },
  lost: {
    bg: 'bg-[var(--status-error-bg)]',
    text: 'text-[var(--status-error-text)]',
    border: 'border-[var(--status-error-border)]'
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

/**
 * ScoreBadge - Dynamic temperature-based score indicator v3.0
 * Uses CSS variables for dynamic theming
 */
function ScoreBadge({ score }: { score: number }) {
  const level = getScoreLevel(score);
  const isHot = score >= 70;

  // Labels for accessibility
  const levelLabels = {
    hot: 'Caliente',
    warm: 'Tibio',
    cold: 'Frío',
  };

  // Use CSS classes that reference CSS variables for dynamic theming
  const levelClasses = {
    hot: 'score-badge-premium hot',
    warm: 'score-badge-premium warm',
    cold: 'score-badge-premium cold',
  };

  return (
    <span
      role="img"
      aria-label={`Score: ${score} - ${levelLabels[level]}`}
      className={cn(
        'inline-flex items-center justify-center gap-0.5',
        'min-w-[2rem] h-6 px-2 rounded-full',
        'text-xs font-bold tabular-nums',
        'transition-all duration-200',
        levelClasses[level]
      )}
    >
      {score}
      {isHot && <Flame className="h-3 w-3 animate-pulse" aria-hidden="true" />}
    </span>
  );
}

// ============================================
// Status Badge
// ============================================

function StatusBadge({ status }: { status: LeadStatus }) {
  // Theme-aware default using muted tokens
  const defaultStyle = {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border'
  };
  const styles = STATUS_STYLES[status] ?? defaultStyle;
  const label = STATUS_LABELS[status] || status;

  return (
    <span
      role="status"
      aria-label={`Estado del lead: ${label}`}
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'border',
        'text-[10px] font-medium',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {label}
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
        CARD_TOKENS.touchTarget.buttonSm,
        CARD_TOKENS.radius.cardSm,
        'text-muted-foreground',
        CARD_TOKENS.transition.micro,
        CARD_TOKENS.focus.ring,
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

  // Use centralized mobile detection (P0-1 optimization)
  // Before: Each card had its own resize listener
  // After: Single listener at app level via MobileDetectionProvider
  const { isMobile } = useMobileDetection();

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const isHotLead = lead.score >= 70;
  const hasPhone = !!lead.phone?.trim();

  // Check for optimistic flag (P1 Fix: visual feedback for pending operations)
  const isOptimistic = (lead as OptimisticLead).isOptimistic === true;

  // Decode HTML entities in names for proper display
  const decodedFullName = React.useMemo(
    () => decodeHtmlEntities(lead.fullName || ''),
    [lead.fullName]
  );
  const decodedCompanyName = React.useMemo(
    () => decodeHtmlEntities(lead.companyName || ''),
    [lead.companyName]
  );

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
        // Mobile: allow scroll, only drag handle blocks touch
        // Desktop: full card can initiate drag
        'lg:touch-none',
        isCurrentlyDragging && !isOverlay && 'z-0',
        isOverlay && 'shadow-2xl',
        className
      )}
    >
      <div
        // Desktop: full card is draggable
        // Mobile: card is clickable, drag handle is separate
        {...(!isMobile ? { ...attributes, ...listeners } : {})}
        onClick={!isOverlay && !isCurrentlyDragging ? onClick : undefined}
        className={cn(
          // Base
          'group relative',
          'p-3',
          CARD_TOKENS.radius.card,
          'border',
          CARD_TOKENS.transition.fast,
          // Background & Border - Theme-aware using shadcn tokens
          'bg-card border-border/50',
          // Shadow - Enhanced for dark mode
          'shadow-sm dark:shadow-lg dark:shadow-black/20',
          // Hover - Interactive card states from CARD_TOKENS
          CARD_TOKENS.card.interactive,
          // Hot lead accent
          isHotLead && 'border-l-2 border-l-[var(--score-hot)]',
          // Optimistic state (P1 Fix: visual feedback for pending create)
          isOptimistic && 'opacity-70 animate-pulse border-dashed border-primary/50',
          // Dragging
          isCurrentlyDragging && CARD_TOKENS.card.dragging,
          // Cursor - different for mobile vs desktop
          isCurrentlyDragging ? 'cursor-grabbing' : 'lg:cursor-grab cursor-pointer'
        )}
      >
        {/* Mobile Drag Handle - Always visible, touch-none */}
        <div
          className={cn(
            'lg:hidden', // Only on mobile/tablet
            'absolute left-0 top-0 bottom-0 w-8',
            'flex items-center justify-center',
            'touch-none cursor-grab active:cursor-grabbing',
            'bg-gradient-to-r from-muted to-transparent',
            'rounded-l-xl',
            'transition-opacity duration-200',
            isCurrentlyDragging ? 'opacity-100' : 'opacity-60'
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
        </div>

        {/* Drag Handle - Desktop only (visual indicator on hover) */}
        <div className="hidden lg:flex opacity-0 group-hover:opacity-100 transition-opacity absolute left-1 top-1/2 -translate-y-1/2">
          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
        </div>

        {/* Content - offset on mobile to account for drag handle */}
        <div className="flex items-start gap-3 ml-6 lg:ml-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                {getInitials(decodedFullName)}
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
                {decodedFullName}
              </span>
              <ScoreBadge score={lead.score} />
            </div>

            {/* Company + Source Row */}
            {(decodedCompanyName || lead.source) && (
              <div className="flex items-center gap-2">
                {decodedCompanyName && (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <Building2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-muted-foreground truncate">
                      {decodedCompanyName}
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
              className="hover:bg-[var(--action-whatsapp-bg-hover)] hover:text-[var(--action-whatsapp-text)] hover:border-[var(--action-whatsapp-border)]"
            />
            <ActionButton
              icon={Phone}
              onClick={handleCall}
              disabled={!hasPhone}
              label="Llamar"
              className="hover:bg-[var(--action-call-bg-hover)] hover:text-[var(--action-call-text)] hover:border-[var(--action-call-border)]"
            />

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Más opciones"
                  className={cn(
                    'flex items-center justify-center',
                    CARD_TOKENS.touchTarget.buttonSm,
                    CARD_TOKENS.radius.cardSm,
                    'text-muted-foreground hover:bg-muted',
                    CARD_TOKENS.transition.micro,
                    CARD_TOKENS.focus.ring
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit} className="py-2">
                  Editar
                </DropdownMenuItem>
                {lead.status === LeadStatus.QUALIFIED && onConvert && (
                  <DropdownMenuItem onClick={onConvert} className="py-2 text-[var(--status-success-text)]">
                    Convertir
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="py-2 text-[var(--status-error-text)]">
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
