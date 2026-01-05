'use client';

/**
 * CustomerCard - Premium Customer Card Component v1.1
 *
 * Design based on LeadCardV3 with customer-specific features:
 * - Health score indicator (prominent)
 * - Tier badge with gradient
 * - MRR/Revenue display
 * - Renewal date warning
 * - Quick actions (WhatsApp, Call, Email)
 *
 * Features:
 * - DnD Kit integration for Kanban
 * - React.memo for performance
 * - WCAG 2.1 AA compliant (44px touch targets)
 * - CSS variables for dynamic theming
 *
 * @version 1.1.0
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
 * @module components/CustomerCard
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2,
  Clock,
  GripVertical,
  AlertTriangle,
  Calendar,
  DollarSign,
  MoreHorizontal,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { Customer, CustomerStatus } from '@/lib/customers';
import { STATUS_LABELS } from '@/lib/customers';
import { cn } from '@/lib/utils';
import { CARD_TOKENS } from '@/components/cards';

import { CustomerHealthIndicator } from './CustomerHealthIndicator';
import { CustomerTierBadge } from './CustomerTierBadge';
import { CustomerQuickActions } from './CustomerQuickActions';
import { useCustomerHealth, useCustomerTheme } from '../hooks';

// ============================================
// Types
// ============================================

export interface CustomerCardProps {
  /** Customer data */
  customer: Customer;
  /** Is currently being dragged */
  isDragging?: boolean;
  /** Is the drag overlay */
  isOverlay?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Edit handler */
  onEdit?: () => void;
  /** Delete handler */
  onDelete?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Constants
// ============================================

const STATUS_STYLES: Record<CustomerStatus, { bg: string; text: string; border: string }> = {
  active: {
    bg: 'bg-[var(--health-excellent-bg)]',
    text: 'text-[var(--health-excellent)]',
    border: 'border-[var(--health-excellent-border)]',
  },
  inactive: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
  at_risk: {
    bg: 'bg-[var(--health-at-risk-bg)]',
    text: 'text-[var(--health-at-risk)]',
    border: 'border-[var(--health-at-risk-border)]',
  },
  churned: {
    bg: 'bg-[var(--health-critical-bg)]',
    text: 'text-[var(--health-critical)]',
    border: 'border-[var(--health-critical-border)]',
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

function getRenewalUrgency(renewalDate: string | undefined): 'urgent' | 'warning' | 'notice' | null {
  if (!renewalDate) return null;
  try {
    const days = differenceInDays(new Date(renewalDate), new Date());
    if (days < 0) return 'urgent'; // Past due
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'warning';
    if (days <= 90) return 'notice';
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Sub-Components
// ============================================

/**
 * Status Badge
 */
const StatusBadge = React.memo(function StatusBadge({ status }: { status: CustomerStatus }) {
  const styles = STATUS_STYLES[status];

  return (
    <span
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
      {STATUS_LABELS[status]}
    </span>
  );
});

/**
 * MRR Badge
 */
const MRRBadge = React.memo(function MRRBadge({
  mrr,
  trend,
}: {
  mrr: number | null | undefined;
  trend?: 'up' | 'down' | 'stable';
}) {
  // Guard against undefined/null values
  if (!mrr || mrr <= 0) return null;

  return (
    <span
      className={cn(
        'mrr-badge',
        'inline-flex items-center gap-1',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'text-[10px] font-semibold',
        'bg-[var(--status-success-bg)] text-[var(--status-success)]'
      )}
    >
      <DollarSign className="h-2.5 w-2.5" />
      <span>{formatCurrency(mrr)}/mo</span>
      {trend === 'up' && <TrendingUp className="h-2 w-2 text-[var(--status-success)]" />}
    </span>
  );
});

/**
 * Renewal Badge
 */
const RenewalBadge = React.memo(function RenewalBadge({
  renewalDate,
}: {
  renewalDate: string | undefined;
}) {
  const urgency = getRenewalUrgency(renewalDate);
  if (!urgency) return null;

  const urgencyStyles = {
    urgent: 'renewal-badge-urgent bg-[var(--status-error-bg)] text-[var(--status-error)] animate-pulse',
    warning: 'renewal-badge-warning bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
    notice: 'renewal-badge-notice bg-[var(--status-info-bg)] text-[var(--status-info)]',
  };

  const urgencyLabels = {
    urgent: 'Renovar urgente',
    warning: 'Renovar pronto',
    notice: 'Renovar',
  };

  const daysText = renewalDate
    ? formatDistanceToNow(new Date(renewalDate), { addSuffix: false, locale: es })
    : '';

  return (
    <span
      className={cn(
        'renewal-badge',
        'inline-flex items-center gap-1',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'text-[10px] font-medium',
        urgencyStyles[urgency]
      )}
    >
      <RefreshCw className="h-2.5 w-2.5" />
      <span>{urgencyLabels[urgency]}</span>
      {daysText && <span className="opacity-70">({daysText})</span>}
    </span>
  );
});

// ============================================
// Main Component
// ============================================

export const CustomerCard = React.memo(function CustomerCard({
  customer,
  isDragging = false,
  isOverlay = false,
  onClick,
  onEdit,
  onDelete,
  className,
}: CustomerCardProps) {
  // DnD Kit sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: customer.id,
    data: { type: 'customer', customer },
  });

  // Hooks
  const { calculateHealth } = useCustomerHealth();
  const { lifecycle } = useCustomerTheme();

  // Derived state
  const isCurrentlyDragging = isDragging || isSortableDragging;
  const healthResult = calculateHealth(customer);
  const isAtRisk = customer.status === 'at_risk';
  const isCritical = healthResult.level === 'critical';

  // Display name
  const displayName = customer.companyName || customer.displayName || customer.fullName || 'Sin nombre';

  // Transform style for DnD
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
  };

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
          'customer-card-ventazo',
          'group relative',
          'p-3',
          CARD_TOKENS.radius.card,
          'border',
          CARD_TOKENS.transition.fast,
          // Background - Theme-aware using shadcn tokens
          'bg-card border-border/50',
          // Shadow - Enhanced for dark mode
          'shadow-sm dark:shadow-lg dark:shadow-black/20',
          // Hover - Interactive card states from CARD_TOKENS
          CARD_TOKENS.card.interactive,
          // At risk accent using CSS variables
          isAtRisk && 'border-l-2 border-l-[var(--status-warning)]',
          isCritical && 'border-l-2 border-l-[var(--status-error)]',
          // Dragging
          isCurrentlyDragging && CARD_TOKENS.card.dragging,
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
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {/* Health indicator on avatar */}
            {isCritical && (
              <div className="absolute -top-1 -right-1 p-0.5 bg-[var(--status-error)] rounded-full shadow-lg shadow-[var(--status-error)]/30">
                <AlertTriangle className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + Health Row */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px] text-foreground truncate flex-1">
                {displayName}
              </span>
              <CustomerHealthIndicator
                score={healthResult.score}
                size="sm"
                variant="badge"
              />
            </div>

            {/* Tier + MRR Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <CustomerTierBadge tier={customer.tier} size="xs" variant="gradient" />
              <MRRBadge mrr={customer.mrr} />
              <RenewalBadge renewalDate={customer.renewalDate || customer.contractEndDate} />
            </div>

            {/* Contact Info Row */}
            {(customer.email || customer.industry) && (
              <div className="flex items-center gap-2">
                {customer.industry && (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <Building2 className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                    <span className="text-[12px] text-muted-foreground truncate">
                      {customer.industry}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status + Time Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={customer.status} />
              {customer.updatedAt && (
                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(customer.updatedAt)}
                </span>
              )}
            </div>

            {/* Primary Concern Warning */}
            {healthResult.primaryConcern && (
              <div className="flex items-center gap-1 text-[10px] text-[var(--status-warning)]">
                <AlertTriangle className="h-3 w-3" />
                <span>{healthResult.primaryConcern}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <CustomerQuickActions
              customer={customer}
              size="sm"
              variant="icon"
              orientation="vertical"
            />

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  'flex items-center justify-center',
                  CARD_TOKENS.touchTarget.buttonSm,
                  CARD_TOKENS.radius.cardSm,
                  'text-muted-foreground hover:bg-muted',
                  CARD_TOKENS.transition.micro,
                  CARD_TOKENS.focus.ring
                )}>
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit} className="py-2">
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2">
                  Ver Detalles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="py-2 text-[var(--health-critical)]">
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================
// Overlay for Drag Preview
// ============================================

export function CustomerCardOverlay({ customer }: { customer: Customer }) {
  return (
    <div style={{ width: 'clamp(280px, 80vw, 320px)' }} className="cursor-grabbing">
      <CustomerCard customer={customer} isOverlay />
    </div>
  );
}

// ============================================
// Skeleton for Loading State
// ============================================

export function CustomerCardSkeleton() {
  return (
    <div className={cn('p-3 border bg-card border-border/50', CARD_TOKENS.radius.card)}>
      <div className="flex items-start gap-3">
        {/* Avatar skeleton */}
        <div className={cn('h-10 w-10 rounded-full bg-muted animate-pulse')} />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-32 bg-muted animate-pulse', CARD_TOKENS.radius.internal)} />
            <div className={cn('h-5 w-8 bg-muted animate-pulse', CARD_TOKENS.radius.badge)} />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('h-4 w-16 bg-muted animate-pulse', CARD_TOKENS.radius.badge)} />
            <div className={cn('h-4 w-20 bg-muted animate-pulse', CARD_TOKENS.radius.badge)} />
          </div>
          <div className={cn('h-3 w-24 bg-muted animate-pulse', CARD_TOKENS.radius.internal)} />
        </div>

        {/* Actions skeleton */}
        <div className="flex flex-col gap-1">
          <div className={cn('h-7 w-7 bg-muted animate-pulse', CARD_TOKENS.radius.cardSm)} />
          <div className={cn('h-7 w-7 bg-muted animate-pulse', CARD_TOKENS.radius.cardSm)} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default CustomerCard;
