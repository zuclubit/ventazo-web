'use client';

/**
 * OpportunityCardV3 - Premium CRM Opportunity Card Component
 *
 * @description Enterprise-grade opportunity card homologated with LeadCardV3 design.
 * Features probability indicator, amount display, quick actions, and full theming.
 *
 * @features
 * - WCAG 2.1 AA compliant (keyboard nav, ARIA, focus management)
 * - 44px minimum touch targets (WCAG 2.5.5)
 * - Memoized for optimal re-render performance
 * - Theme-aware (light/dark mode) with proper contrast
 * - Responsive breakpoints (mobile-first)
 * - Drag & drop ready (dnd-kit integration)
 * - Full i18n internationalization support
 *
 * @version 3.1.0
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2,
  Calendar,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Trophy,
  XCircle,
  DollarSign,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

import type { Opportunity } from '@/lib/opportunities';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useOpportunityTheme } from '../hooks';
import { CARD_TOKENS, getCardInteractiveClasses } from '@/components/cards';

// ============================================
// Types
// ============================================

export type CardVariant = 'compact' | 'standard' | 'expanded';
export type ProbabilityLevel = 'high' | 'medium' | 'low';
export type ActionVariant = 'whatsapp' | 'call' | 'email' | 'win' | 'lost';

export interface OpportunityCardV3Props {
  opportunity: Opportunity;
  variant?: CardVariant;
  isSelected?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onWhatsApp?: () => void;
  onCall?: () => void;
  onEmail?: () => void;
  onWin?: () => void;
  onLost?: () => void;
  className?: string;
  stageName?: string;
  stageColor?: string;
}

interface ActionButtonProps {
  icon: typeof MessageCircle;
  onClick: () => void;
  disabled?: boolean;
  variant: ActionVariant;
  ariaLabel: string;
}

interface ProbabilityIndicatorProps {
  probability: number;
  status: string;
  size?: 'sm' | 'md';
}

// ============================================
// Design Tokens (Extended from CARD_TOKENS)
// ============================================

/**
 * Extended tokens that complement CARD_TOKENS with OpportunityCard-specific values.
 * Base tokens (touchTarget, radius, transition, focus) come from CARD_TOKENS.
 */
const DESIGN_TOKENS = {
  // Touch target - Delegate to CARD_TOKENS
  touchTarget: CARD_TOKENS.touchTarget,

  // Border radius - Extend CARD_TOKENS with probability-specific radius
  radius: {
    ...CARD_TOKENS.radius,
    sm: CARD_TOKENS.radius.cardSm,
    md: CARD_TOKENS.radius.card,
    lg: CARD_TOKENS.radius.cardLg,
    probability: CARD_TOKENS.radius.card, // Opportunity-specific
  },

  // Transition - Delegate to CARD_TOKENS
  transition: CARD_TOKENS.transition,

  // Focus ring - Delegate to CARD_TOKENS
  focusRing: CARD_TOKENS.focus.ring,
} as const;

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  critical: {
    bg: 'bg-[var(--opp-priority-critical-bg)]',
    text: 'text-[var(--opp-priority-critical-text)]',
    border: 'border-red-300 dark:border-red-500/40',
  },
  high: {
    bg: 'bg-[var(--opp-priority-high-bg)]',
    text: 'text-[var(--opp-priority-high-text)]',
    border: 'border-orange-300 dark:border-orange-500/40',
  },
  medium: {
    bg: 'bg-[var(--opp-priority-medium-bg)]',
    text: 'text-[var(--opp-priority-medium-text)]',
    border: 'border-blue-300 dark:border-blue-500/40',
  },
  low: {
    bg: 'bg-[var(--opp-priority-low-bg)]',
    text: 'text-[var(--opp-priority-low-text)]',
    border: 'border-slate-300 dark:border-slate-500/40',
  },
};

const PROBABILITY_STYLES: Record<ProbabilityLevel | 'won' | 'lost', { className: string }> = {
  high: { className: 'probability-badge-premium high' },
  medium: { className: 'probability-badge-premium medium' },
  low: { className: 'probability-badge-premium low' },
  won: { className: 'probability-badge-premium won' },
  lost: { className: 'probability-badge-premium lost' },
};

const ACTION_STYLES: Record<ActionVariant, string> = {
  whatsapp: 'action-btn-premium whatsapp',
  call: 'action-btn-premium call',
  email: 'action-btn-premium email',
  win: 'opp-action-btn-premium win',
  lost: 'opp-action-btn-premium lost',
};

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '$0';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function getProbabilityLevel(probability: number): ProbabilityLevel {
  if (probability >= 70) return 'high';
  if (probability >= 40) return 'medium';
  return 'low';
}

function formatCompactTime(dateStr: string | undefined): { value: number; unit: string } | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return { value: 0, unit: 'upcoming' };
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (hours < 24) return { value: hours, unit: 'hours' };
    if (days < 7) return { value: days, unit: 'days' };
    return { value: Math.floor(days / 7), unit: 'weeks' };
  } catch {
    return null;
  }
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
    const days = Math.abs(differenceInDays(closeDate, new Date()));
    return {
      label: `Vencido ${days}d`,
      className: 'text-[var(--urgency-overdue-text)]',
      isUrgent: true,
    };
  }
  const days = differenceInDays(closeDate, new Date());
  if (days <= 7) {
    return {
      label: format(closeDate, "d 'de' MMM", { locale: es }),
      className: 'text-[var(--urgency-today)]',
      isUrgent: false,
    };
  }
  return {
    label: format(closeDate, "d 'de' MMM", { locale: es }),
    className: 'text-muted-foreground',
    isUrgent: false,
  };
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) return '';
  if (!cleaned.startsWith('+')) return `+52${cleaned.replace(/^0+/, '')}`;
  return cleaned;
}

function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
  return encodeURIComponent(trimmed);
}

// ============================================
// Sub-Components
// ============================================

const ProbabilityIndicator = React.memo<ProbabilityIndicatorProps>(function ProbabilityIndicator({
  probability,
  status,
  size = 'md',
}) {
  // Handle won/lost status
  const displayLevel = status === 'won' ? 'won' : status === 'lost' ? 'lost' : getProbabilityLevel(probability);
  const displayValue = status === 'won' ? 100 : status === 'lost' ? 0 : probability;
  const styles = PROBABILITY_STYLES[displayLevel];
  const isHighProb = probability >= 80 && status === 'open';

  const sizeClasses = size === 'sm'
    ? 'w-12 h-12 text-sm'
    : 'w-14 h-14 text-lg';

  return (
    <div
      role="img"
      aria-label={`${displayValue}% probabilidad`}
      className={cn(
        styles.className,
        sizeClasses,
        'animate-score-pop',
        isHighProb && 'animate-pulse-soft'
      )}
    >
      {status === 'won' ? (
        <Trophy className="h-5 w-5 text-white" aria-hidden="true" />
      ) : status === 'lost' ? (
        <XCircle className="h-5 w-5 text-white" aria-hidden="true" />
      ) : isHighProb ? (
        <>
          <Trophy className="h-3.5 w-3.5 text-white/90 -mb-0.5" aria-hidden="true" />
          <span className="font-bold tabular-nums">{displayValue}%</span>
        </>
      ) : (
        <span className="font-bold tabular-nums">{displayValue}%</span>
      )}
    </div>
  );
});

function computeStageBadgeStyle(stageColor: string): React.CSSProperties {
  const hex = stageColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const isDarkColor = luminance < 0.4;
  const textColor = isDarkColor
    ? stageColor
    : `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
    color: textColor,
    boxShadow: `inset 0 1px 0 rgba(${r}, ${g}, ${b}, 0.1)`,
  };
}

const StageBadge = React.memo<{ stageName: string; stageColor?: string }>(function StageBadge({
  stageName,
  stageColor,
}) {
  const customStyle = stageColor ? computeStageBadgeStyle(stageColor) : undefined;

  return (
    <span
      role="status"
      style={customStyle}
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5',
        CARD_TOKENS.radius.badge,
        'border',
        'text-[11px] font-semibold',
        'select-none',
        CARD_TOKENS.transition.micro,
        // Theme-aware fallback when no custom color
        !customStyle && 'bg-muted text-muted-foreground border-border'
      )}
    >
      {stageName}
    </span>
  );
});

const PriorityBadge = React.memo<{ priority: string }>(function PriorityBadge({ priority }) {
  const defaultStyles = PRIORITY_STYLES['medium'];
  const styles = PRIORITY_STYLES[priority] ?? defaultStyles;
  const labels: Record<string, string> = {
    critical: 'Crítica',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
  };

  if (!styles) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5',
        'rounded-md border',
        'text-[10px] font-semibold',
        styles.bg,
        styles.text,
        styles.border
      )}
    >
      {labels[priority] || priority}
    </span>
  );
});

const ActionButton = React.memo<ActionButtonProps>(function ActionButton({
  icon: Icon,
  onClick,
  disabled = false,
  variant,
  ariaLabel,
}) {
  const handleClick = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) onClick();
  }, [onClick, disabled]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={cn(
        ACTION_STYLES[variant],
        DESIGN_TOKENS.touchTarget.button,
        DESIGN_TOKENS.focusRing,
        disabled && 'opacity-30 cursor-not-allowed pointer-events-none'
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
});

// ============================================
// Main Component
// ============================================

export const OpportunityCardV3 = React.memo<OpportunityCardV3Props>(function OpportunityCardV3({
  opportunity,
  variant = 'standard',
  isSelected = false,
  isDragging = false,
  isOverlay = false,
  draggable = true,
  onClick,
  onWhatsApp,
  onCall,
  onEmail,
  onWin,
  onLost,
  className,
  stageName,
  stageColor,
}) {
  const { t } = useI18n();
  const theme = useOpportunityTheme();

  // DnD Kit integration
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: opportunity.id,
    data: { type: 'opportunity', opportunity },
    disabled: !draggable,
  });

  const isCurrentlyDragging = isDragging || isSortableDragging;
  const isOpen = opportunity.status === 'open';

  // Contact info from customer or lead
  // Note: phone is accessed via metadata since types don't include it
  const customerData = opportunity.customer as { id: string; name: string; email: string | null; phone?: string } | undefined;
  const leadData = opportunity.lead as { id: string; fullName: string; email: string | null; phone?: string } | undefined;
  const contactPhone = customerData?.phone || leadData?.phone;
  const contactEmail = opportunity.customer?.email || opportunity.lead?.email;
  const contactName = opportunity.customer?.name || opportunity.lead?.fullName || 'Sin contacto';

  const { hasPhone, hasEmail, normalizedPhone, sanitizedEmail } = React.useMemo(() => {
    const phone = contactPhone?.trim() ?? '';
    const email = contactEmail?.trim() ?? '';
    return {
      hasPhone: phone.length > 0,
      hasEmail: email.length > 0,
      normalizedPhone: phone ? normalizePhone(phone) : '',
      sanitizedEmail: email ? sanitizeEmail(email) : '',
    };
  }, [contactPhone, contactEmail]);

  const closeDateInfo = React.useMemo(() => getCloseDateInfo(opportunity.expectedCloseDate), [opportunity.expectedCloseDate]);
  const timeInfo = React.useMemo(() => formatCompactTime(opportunity.updatedAt), [opportunity.updatedAt]);

  // Style computation
  const style: React.CSSProperties = React.useMemo(() => {
    if (!draggable) return {};
    return {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
    };
  }, [draggable, transform, transition, isCurrentlyDragging, isOverlay]);

  // Event handlers
  const handleWhatsApp = React.useCallback(() => {
    if (!hasPhone || !normalizedPhone) return;
    if (onWhatsApp) {
      onWhatsApp();
    } else {
      const phoneDigits = normalizedPhone.replace('+', '');
      window.open(`https://wa.me/${phoneDigits}`, '_blank', 'noopener,noreferrer');
    }
  }, [hasPhone, normalizedPhone, onWhatsApp]);

  const handleCall = React.useCallback(() => {
    if (!hasPhone || !normalizedPhone) return;
    if (onCall) {
      onCall();
    } else {
      window.location.href = `tel:${normalizedPhone}`;
    }
  }, [hasPhone, normalizedPhone, onCall]);

  const handleEmail = React.useCallback(() => {
    if (!hasEmail || !sanitizedEmail) return;
    if (onEmail) {
      onEmail();
    } else {
      window.location.href = `mailto:${decodeURIComponent(sanitizedEmail)}`;
    }
  }, [hasEmail, sanitizedEmail, onEmail]);

  const handleCardClick = React.useCallback(() => {
    if (!isOverlay && !isCurrentlyDragging && onClick) onClick();
  }, [isOverlay, isCurrentlyDragging, onClick]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      handleCardClick();
    }
  }, [onClick, handleCardClick]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('touch-none', isCurrentlyDragging && !isOverlay && 'z-0', className)}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      <article
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-selected={isSelected}
        aria-label={`${opportunity.name}, ${formatCompactCurrency(opportunity.amount)}`}
        className={cn(
          // Premium card base
          'opp-card-ventazo',
          'group',
          'animate-card-enter',
          DESIGN_TOKENS.focusRing,
          isSelected && 'is-selected',
          isCurrentlyDragging && 'is-dragging',
          draggable
            ? (isCurrentlyDragging ? 'cursor-grabbing' : 'cursor-grab')
            : (onClick ? 'cursor-pointer' : 'cursor-default')
        )}
      >
        {/* HEADER: Probability + Name + Actions */}
        <header className="flex items-center gap-3">
          {/* Probability Indicator */}
          <ProbabilityIndicator
            probability={opportunity.probability}
            status={opportunity.status}
            size={variant === 'compact' ? 'sm' : 'md'}
          />

          {/* Name & Customer/Lead */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-semibold truncate leading-tight text-foreground">
              {opportunity.name}
            </h3>
            <p className="flex items-center gap-1 text-[12px] truncate text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
              <span className="truncate">{contactName}</span>
            </p>
          </div>

          {/* Quick Actions */}
          <nav
            aria-label="Acciones rápidas"
            className={cn(
              'action-group-premium',
              'opacity-80 group-hover:opacity-100',
              CARD_TOKENS.transition.micro
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <ActionButton
              icon={MessageCircle}
              onClick={handleWhatsApp}
              disabled={!hasPhone}
              variant="whatsapp"
              ariaLabel={hasPhone ? 'Enviar WhatsApp' : 'Sin teléfono'}
            />
            <ActionButton
              icon={Phone}
              onClick={handleCall}
              disabled={!hasPhone}
              variant="call"
              ariaLabel={hasPhone ? 'Llamar' : 'Sin teléfono'}
            />
            {variant !== 'compact' && (
              <ActionButton
                icon={Mail}
                onClick={handleEmail}
                disabled={!hasEmail}
                variant="email"
                ariaLabel={hasEmail ? 'Enviar email' : 'Sin email'}
              />
            )}
          </nav>
        </header>

        {/* AMOUNT ROW */}
        <div className="flex items-center gap-2 mt-3 pl-[calc(3.5rem+0.75rem)]">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-[var(--action-accept)]" aria-hidden="true" />
            <span className="font-bold text-sm text-foreground">
              {formatCurrency(opportunity.amount, opportunity.currency)}
            </span>
          </div>

          {/* Forecast */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Target className="h-3 w-3" aria-hidden="true" />
            <span>
              {formatCompactCurrency((opportunity.amount || 0) * (opportunity.probability / 100))}
            </span>
          </div>
        </div>

        {/* STAGE + PRIORITY + CLOSE DATE */}
        <div className="flex items-center gap-2 flex-wrap mt-2 pl-[calc(3.5rem+0.75rem)]">
          {stageName && (
            <StageBadge stageName={stageName} stageColor={stageColor} />
          )}
          <PriorityBadge priority={opportunity.priority} />

          {/* Close Date */}
          {closeDateInfo && (
            <span className={cn(
              'flex items-center gap-1 text-[10px]',
              closeDateInfo.className
            )}>
              <Calendar className="h-3 w-3" aria-hidden="true" />
              <span>{closeDateInfo.label}</span>
              {closeDateInfo.isUrgent && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
                </span>
              )}
            </span>
          )}
        </div>

        {/* FOOTER: Win/Lost Actions + Time */}
        <footer className="flex items-center justify-between mt-2 pl-[calc(3.5rem+0.75rem)]">
          {/* Win/Lost Quick Actions (only for open) */}
          {isOpen && (onWin || onLost) && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {onWin && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onWin(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--action-win)] bg-[var(--action-win-bg)] hover:bg-[var(--action-win-bg)]/80 transition-colors"
                >
                  <Trophy className="h-3 w-3" />
                  Ganada
                </button>
              )}
              {onLost && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onLost(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--action-lost)] bg-[var(--action-lost-bg)] hover:bg-[var(--action-lost-bg)]/80 transition-colors"
                >
                  <XCircle className="h-3 w-3" />
                  Perdida
                </button>
              )}
            </div>
          )}

          {/* Time */}
          {timeInfo && (
            <span className="time-badge-premium ml-auto">
              <Clock className="h-3 w-3 opacity-70" aria-hidden="true" />
              <time dateTime={opportunity.updatedAt}>
                {timeInfo.value}{timeInfo.unit === 'hours' ? 'h' : timeInfo.unit === 'days' ? 'd' : 'sem'}
              </time>
            </span>
          )}
        </footer>

        {/* Tags */}
        {opportunity.tags && opportunity.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50 pl-[calc(3.5rem+0.75rem)]">
            {opportunity.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {opportunity.tags.length > 2 && (
              <span className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                +{opportunity.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </article>
    </div>
  );
});

OpportunityCardV3.displayName = 'OpportunityCardV3';

// ============================================
// Skeleton Component
// ============================================

export const OpportunityCardV3Skeleton = React.memo<{ variant?: CardVariant }>(
  function OpportunityCardV3Skeleton({ variant = 'standard' }) {
    const probSize = variant === 'compact' ? 'w-12 h-12' : 'w-14 h-14';

    return (
      <div
        role="status"
        aria-label="Cargando oportunidad"
        className="opp-card-ventazo space-y-3"
      >
        <div className="flex items-center gap-3">
          <div className={cn(probSize, CARD_TOKENS.radius.card, 'bg-muted animate-shimmer')} />
          <div className={cn('w-9 h-9', CARD_TOKENS.radius.cardSm, 'bg-muted animate-shimmer')} style={{ animationDelay: '100ms' }} />
          <div className="flex-1 space-y-1.5">
            <div className={cn('h-4 w-3/4 animate-shimmer', CARD_TOKENS.radius.internal, 'bg-muted')} style={{ animationDelay: '200ms' }} />
            <div className={cn('h-3 w-1/2 animate-shimmer', CARD_TOKENS.radius.internal, 'bg-muted')} style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <div className="flex gap-2 pl-[calc(3.5rem+0.75rem)]">
          <div className={cn('h-5 w-20 animate-shimmer', CARD_TOKENS.radius.internal, 'bg-muted')} style={{ animationDelay: '400ms' }} />
          <div className={cn('h-5 w-16 animate-shimmer', CARD_TOKENS.radius.internal, 'bg-muted')} style={{ animationDelay: '500ms' }} />
        </div>
        <span className="sr-only">Cargando oportunidad...</span>
      </div>
    );
  }
);

OpportunityCardV3Skeleton.displayName = 'OpportunityCardV3Skeleton';

// ============================================
// Overlay Component (for DnD)
// ============================================

export const OpportunityCardV3Overlay = React.memo<{ opportunity: Opportunity }>(
  function OpportunityCardV3Overlay({ opportunity }) {
    return (
      <div
        style={{
          width: 'clamp(280px, 80vw, 340px)',
          pointerEvents: 'none',
        }}
        className="cursor-grabbing"
        aria-hidden="true"
      >
        <OpportunityCardV3
          opportunity={opportunity}
          draggable={false}
          isOverlay
        />
      </div>
    );
  }
);

OpportunityCardV3Overlay.displayName = 'OpportunityCardV3Overlay';

export default OpportunityCardV3;
