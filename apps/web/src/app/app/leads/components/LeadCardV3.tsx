'use client';

/**
 * LeadCardV3 - Premium CRM Card Component
 *
 * @description Enterprise-grade lead card with full accessibility,
 * responsive design, i18n support, and optimized performance.
 *
 * @features
 * - WCAG 2.1 AA compliant (keyboard nav, ARIA, focus management)
 * - 44px minimum touch targets (WCAG 2.5.5)
 * - Memoized for optimal re-render performance
 * - Theme-aware (light/dark mode) with proper contrast
 * - Responsive breakpoints (mobile-first)
 * - Drag & drop ready (dnd-kit integration)
 * - Secure URL handling (XSS prevention)
 * - Full i18n internationalization support
 *
 * @version 3.3.0
 * @author Zuclubit Team
 * @phase FASE 6 - Integrated with CARD_TOKENS Design System
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Building2,
  Clock,
  MessageCircle,
  Phone,
  Mail,
  Globe,
  AlertTriangle,
  Flame,
  Loader2,
  GripVertical,
} from 'lucide-react';

import type { Lead, LeadSource } from '@/lib/leads';
import { LeadStatus, STATUS_LABELS } from '@/lib/leads';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { decodeHtmlEntities } from '@/lib/security';
import { CARD_TOKENS, getCardInteractiveClasses } from '@/components/cards';

// ============================================
// Types & Interfaces
// ============================================

export type CardVariant = 'compact' | 'standard' | 'expanded';
export type ScoreLevel = 'hot' | 'warm' | 'cold';
export type ActionVariant = 'whatsapp' | 'call' | 'email';

export interface LeadCardV3Props {
  /** Lead data object */
  lead: Lead;
  /** Card size variant */
  variant?: CardVariant;
  /** Whether the card is currently selected */
  isSelected?: boolean;
  /** External dragging state */
  isDragging?: boolean;
  /** Whether this is the drag overlay */
  isOverlay?: boolean;
  /** Whether this card is currently being moved (stage transition in progress) */
  isMoving?: boolean;
  /** Enable drag functionality */
  draggable?: boolean;
  /** Click handler for card selection */
  onClick?: () => void;
  /** Custom WhatsApp action handler */
  onWhatsApp?: () => void;
  /** Custom call action handler */
  onCall?: () => void;
  /** Custom email action handler */
  onEmail?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Optional stage name to display instead of status (for Kanban view) */
  stageName?: string;
  /** Optional stage color for badge styling */
  stageColor?: string;
}

interface ActionButtonProps {
  /** Lucide icon component */
  icon: typeof MessageCircle;
  /** Click handler */
  onClick: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Button variant for styling */
  variant: ActionVariant;
  /** Accessible label */
  ariaLabel: string;
}

interface ScoreIndicatorProps {
  /** Score value (0-100) */
  score: number;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Translated level labels */
  levelLabels: {
    hot: string;
    warm: string;
    cold: string;
  };
}

interface StatusBadgeProps {
  /** Lead status */
  status: LeadStatus;
  /** Optional stage name to display instead of status */
  stageName?: string;
  /** Optional stage color for custom styling */
  stageColor?: string;
}

interface ChannelInfo {
  icon: typeof MessageCircle;
  label: string;
  color: string;
}

// ============================================
// Design Tokens (Extended from CARD_TOKENS)
// ============================================

/**
 * Extended tokens that complement CARD_TOKENS with LeadCard-specific values.
 * Base tokens (touchTarget, radius, transition, focus) come from CARD_TOKENS.
 */
const DESIGN_TOKENS = {
  // Touch target - Delegate to CARD_TOKENS
  touchTarget: CARD_TOKENS.touchTarget,

  // Border radius - Extend CARD_TOKENS with score-specific radius
  radius: {
    ...CARD_TOKENS.radius,
    sm: CARD_TOKENS.radius.internal,
    md: CARD_TOKENS.radius.cardSm,
    lg: CARD_TOKENS.radius.card,
    xl: CARD_TOKENS.radius.cardLg,
    score: 'rounded-[var(--score-radius)]', // Lead-specific
  },

  // Transition - Delegate to CARD_TOKENS
  transition: CARD_TOKENS.transition,

  // Focus ring - Delegate to CARD_TOKENS
  focusRing: CARD_TOKENS.focus.ring,

  // Typography colors - Theme aware with proper contrast (using CSS vars)
  text: {
    primary: 'text-[var(--text-primary)]',
    secondary: 'text-[var(--text-secondary)]',
    muted: 'text-[var(--text-muted)]',
    icon: 'text-slate-400 dark:text-slate-500',
    accent: 'text-[var(--text-accent)]',
  },

  // Card using CSS Variables
  card: {
    base: 'kanban-card-ventazo',
    padding: CARD_TOKENS.padding.md,
    gap: 'gap-[var(--card-gap)]',
  },
} as const;

/**
 * Status styles using CSS variables for FULL dynamic theming v4.0
 * Key statuses (new, won, lost) use tenant-aware semantic colors
 * Other statuses use fixed semantic colors for clarity
 */
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  new: {
    bg: 'bg-[var(--status-info-bg)]',
    text: 'text-[var(--status-info-text)]',
    border: 'border-[var(--status-info-border)]',
  },
  contacted: {
    bg: 'bg-[var(--status-warning-bg)]',
    text: 'text-[var(--status-warning-text)]',
    border: 'border-[var(--status-warning-border)]',
  },
  in_progress: {
    bg: 'bg-[var(--score-hot-bg)]',
    text: 'text-[var(--score-hot)]',
    border: 'border-[var(--score-hot-border)]',
  },
  qualified: {
    bg: 'bg-violet-500/15 dark:bg-violet-500/25',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-300 dark:border-violet-500/40',
  },
  proposal: {
    // Use tenant primary for proposal stage
    bg: 'bg-[rgba(var(--tenant-primary-rgb),0.15)]',
    text: 'text-[var(--tenant-primary)]',
    border: 'border-[var(--tenant-primary-glow)]',
  },
  negotiation: {
    bg: 'bg-pink-500/15 dark:bg-pink-500/25',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-300 dark:border-pink-500/40',
  },
  won: {
    // Use tenant accent for success/won
    bg: 'bg-[var(--status-success-bg)]',
    text: 'text-[var(--status-success-text)]',
    border: 'border-[var(--status-success-border)]',
  },
  lost: {
    bg: 'bg-[var(--status-error-bg)]',
    text: 'text-[var(--status-error-text)]',
    border: 'border-[var(--status-error-border)]',
  },
};

// Score styles using CSS variables for premium Ventazo theming
const SCORE_STYLES: Record<ScoreLevel, { className: string }> = {
  hot: {
    // Premium class with CSS variable gradients and glows
    className: 'score-badge-premium hot',
  },
  warm: {
    className: 'score-badge-premium warm',
  },
  cold: {
    className: 'score-badge-premium cold',
  },
};

// Action button styles using premium CSS classes
const ACTION_STYLES: Record<ActionVariant, string> = {
  whatsapp: 'action-btn-premium whatsapp',
  call: 'action-btn-premium call',
  email: 'action-btn-premium email',
};

// Channel map with i18n keys - Uses CSS variables for dynamic colors
const CHANNEL_KEYS: Record<string, { icon: typeof MessageCircle; key: string; color: string }> = {
  whatsapp: { icon: MessageCircle, key: 'whatsapp', color: 'text-[var(--channel-whatsapp)]' },
  social: { icon: MessageCircle, key: 'social', color: 'text-[var(--channel-social)]' },
  email: { icon: Mail, key: 'email', color: 'text-[var(--channel-email)]' },
  referral: { icon: Mail, key: 'referral', color: 'text-[var(--channel-referral)]' },
  phone: { icon: Phone, key: 'phone', color: 'text-[var(--channel-phone)]' },
  manual: { icon: Phone, key: 'manual', color: 'text-muted-foreground' },
  website: { icon: Globe, key: 'website', color: 'text-[var(--channel-website)]' },
  ad: { icon: Globe, key: 'ad', color: 'text-[var(--channel-ad)]' },
  organic: { icon: Globe, key: 'organic', color: 'text-[var(--channel-organic)]' },
};

const DEFAULT_CHANNEL_KEY = { icon: Globe, key: 'website', color: 'text-muted-foreground' };

// ============================================
// Utility Functions (Pure, Memoizable)
// ============================================

/**
 * Extract initials from name safely
 */
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '??';

  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';

  if (words.length === 1) {
    const firstWord = words[0];
    return firstWord ? firstWord.slice(0, 2).toUpperCase() : '??';
  }

  return words
    .slice(0, 2)
    .map((word) => (word && word.length > 0 ? word[0] : ''))
    .join('')
    .toUpperCase() || '??';
}

/**
 * Format date to compact relative time
 */
function formatCompactTime(dateStr: string | undefined): { value: number; unit: string } | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    const now = Date.now();
    const diffMs = now - date.getTime();

    if (diffMs < 0) return { value: 0, unit: 'upcoming' };

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    const weeks = Math.floor(days / 7);

    if (minutes < 60) return { value: minutes, unit: 'minutes' };
    if (hours < 24) return { value: hours, unit: 'hours' };
    if (days < 7) return { value: days, unit: 'days' };
    if (weeks < 4) return { value: weeks, unit: 'weeks' };

    return { value: Math.floor(days / 30), unit: 'months' };
  } catch {
    return null;
  }
}

/**
 * Determine score level based on thresholds
 */
function getScoreLevel(score: number): ScoreLevel {
  const clampedScore = Math.max(0, Math.min(100, score));
  if (clampedScore >= 70) return 'hot';
  if (clampedScore >= 40) return 'warm';
  return 'cold';
}

/**
 * Get channel information from source
 */
function getChannelKey(source: LeadSource | string | undefined): typeof DEFAULT_CHANNEL_KEY {
  if (!source) return DEFAULT_CHANNEL_KEY;
  return CHANNEL_KEYS[source.toLowerCase()] ?? DEFAULT_CHANNEL_KEY;
}

/**
 * Normalize phone number for WhatsApp URL
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) return '';
  if (!cleaned.startsWith('+')) {
    const withoutLeadingZero = cleaned.replace(/^0+/, '');
    return `+52${withoutLeadingZero}`;
  }
  return cleaned;
}

/**
 * Sanitize email for mailto URL
 */
function sanitizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '';
  return encodeURIComponent(trimmed);
}

/**
 * Check if date is overdue
 */
function isDateOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

// ============================================
// Sub-Components (Memoized)
// ============================================

/**
 * Score Indicator - Premium Ventazo 2025 design
 * Large, prominent score badge with temperature-based styling
 */
const ScoreIndicator = React.memo<ScoreIndicatorProps>(function ScoreIndicator({
  score,
  size = 'md',
  levelLabels,
}) {
  const level = getScoreLevel(score);
  const styles = SCORE_STYLES[level];
  const isHot = score >= 75;
  const levelLabel = levelLabels[level];

  // Use larger sizes for premium appearance
  const sizeClasses = size === 'sm'
    ? 'w-[var(--score-size-sm)] h-[var(--score-size-sm)] text-sm'
    : 'w-[var(--score-size-md)] h-[var(--score-size-md)] text-lg';

  return (
    <div
      role="img"
      aria-label={`${score} - ${levelLabel}`}
      className={cn(
        styles.className,
        sizeClasses,
        // Entry animation for score pop effect
        'animate-score-pop',
        // Subtle pulse for hot leads
        isHot && 'animate-pulse-soft'
      )}
    >
      {isHot && (
        <Flame
          className="h-3.5 w-3.5 text-white/90 -mb-0.5 animate-flame-flicker"
          aria-hidden="true"
        />
      )}
      <span className="font-bold tabular-nums">
        {score}
      </span>
    </div>
  );
});

/**
 * Compute stage badge style with luminance-aware contrast
 * Uses sophisticated color calculations for proper dark/light mode support
 */
function computeStageBadgeStyle(stageColor: string): React.CSSProperties {
  // Parse hex color
  const hex = stageColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance
  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  // Adjust text color based on luminance for proper contrast
  const isDarkColor = luminance < 0.4;
  const textColor = isDarkColor
    ? stageColor // Keep original for dark colors
    : `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`; // Darken for light colors

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
    color: textColor,
    // Subtle inner highlight for depth
    boxShadow: `inset 0 1px 0 rgba(${r}, ${g}, ${b}, 0.1)`,
  };
}

/**
 * Status Badge - Lead status indicator v3.0
 * Supports dynamic pipeline stage colors with luminance-aware contrast
 * Integrates with tenant theming system
 */
const StatusBadge = React.memo<StatusBadgeProps>(function StatusBadge({
  status,
  stageName,
  stageColor
}) {
  const defaultStyle = {
    bg: 'bg-slate-100 dark:bg-slate-700/60',
    text: 'text-slate-700 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-600/50',
  };

  // If stageName is provided (Kanban view), use dynamic styling based on stageColor
  const useCustomStyle = Boolean(stageName && stageColor);

  // Calculate styles based on stage color or status
  const styles = useCustomStyle
    ? defaultStyle // Will be overridden by inline style
    : (STATUS_STYLES[status] ?? defaultStyle);

  // Display stage name if provided, otherwise fall back to status label
  const label = stageName || STATUS_LABELS[status] || status;

  // Dynamic style with luminance-aware contrast
  const customStyle: React.CSSProperties = useCustomStyle && stageColor
    ? computeStageBadgeStyle(stageColor)
    : {};

  return (
    <span
      role="status"
      style={customStyle}
      className={cn(
        'inline-flex items-center',
        'px-2 py-0.5',
        'rounded-md border',
        'text-[11px] font-semibold',
        'select-none',
        'transition-colors duration-150',
        !useCustomStyle && styles.bg,
        !useCustomStyle && styles.text,
        !useCustomStyle && styles.border
      )}
    >
      {label}
    </span>
  );
});

/**
 * Quick Action Button - Premium Ventazo 2025 design
 * Touch-friendly with WCAG 2.5.5 compliant 44px targets
 */
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

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
      e.preventDefault();
      if (!disabled) onClick();
    }
  }, [onClick, disabled]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      className={cn(
        // Use premium action button class with variant
        ACTION_STYLES[variant],
        // Override with WCAG compliant touch targets
        DESIGN_TOKENS.touchTarget.button,
        // Focus ring for accessibility
        DESIGN_TOKENS.focusRing,
        // Disabled state
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

export const LeadCardV3 = React.memo<LeadCardV3Props>(function LeadCardV3({
  lead,
  variant = 'standard',
  isSelected = false,
  isDragging = false,
  isOverlay = false,
  isMoving = false,
  draggable = true,
  onClick,
  onWhatsApp,
  onCall,
  onEmail,
  className,
  stageName,
  stageColor,
}) {
  // i18n - Direct object access pattern
  const { t } = useI18n();
  const cardT = t.leads.card;

  // DnD Kit integration
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
    disabled: !draggable,
  });

  // Mobile detection for drag handle optimization
  // On mobile (<1024px), only drag handle initiates drag to allow scroll
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Computed values (memoized)
  const isCurrentlyDragging = isDragging || isSortableDragging;

  const { hasPhone, hasEmail, normalizedPhone, sanitizedEmail } = React.useMemo(() => {
    const phone = lead.phone?.trim() ?? '';
    const email = lead.email?.trim() ?? '';
    return {
      hasPhone: phone.length > 0,
      hasEmail: email.length > 0,
      normalizedPhone: phone ? normalizePhone(phone) : '',
      sanitizedEmail: email ? sanitizeEmail(email) : '',
    };
  }, [lead.phone, lead.email]);

  const channelKey = React.useMemo(() => getChannelKey(lead.source), [lead.source]);
  const isOverdue = React.useMemo(() => isDateOverdue(lead.nextFollowUpAt), [lead.nextFollowUpAt]);
  // Decode HTML entities in names for proper display
  const decodedFullName = React.useMemo(
    () => decodeHtmlEntities(lead.fullName || ''),
    [lead.fullName]
  );
  const decodedCompanyName = React.useMemo(
    () => decodeHtmlEntities(lead.companyName || ''),
    [lead.companyName]
  );
  const initials = React.useMemo(() => getInitials(decodedFullName), [decodedFullName]);
  const timeInfo = React.useMemo(() => formatCompactTime(lead.lastActivityAt), [lead.lastActivityAt]);

  // Get translated channel label
  const channelLabel = cardT.channels[channelKey.key as keyof typeof cardT.channels] ?? channelKey.key;
  const ChannelIcon = channelKey.icon;

  // Format relative time with translation
  const relativeTimeText = React.useMemo(() => {
    if (!timeInfo) return null;
    if (timeInfo.unit === 'upcoming') return cardT.time.upcoming;
    const timeKey = timeInfo.unit as keyof typeof cardT.time;
    const template = cardT.time[timeKey] ?? '';
    return template.replace('{{count}}', String(timeInfo.value));
  }, [timeInfo, cardT.time]);

  // Score level labels
  const scoreLevelLabels = React.useMemo(() => ({
    hot: cardT.scoreHot,
    warm: cardT.scoreWarm,
    cold: cardT.scoreCold,
  }), [cardT]);

  // Style computation
  const style: React.CSSProperties = React.useMemo(() => {
    if (!draggable) return {};
    return {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isCurrentlyDragging && !isOverlay ? 0.4 : 1,
    };
  }, [draggable, transform, transition, isCurrentlyDragging, isOverlay]);

  // Event handlers (memoized)
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
    if (!isOverlay && !isCurrentlyDragging && onClick) {
      onClick();
    }
  }, [isOverlay, isCurrentlyDragging, onClick]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      handleCardClick();
    }
  }, [onClick, handleCardClick]);

  // Translated action labels
  const actionLabels = React.useMemo(() => ({
    whatsapp: hasPhone ? cardT.actions.whatsapp : cardT.actions.whatsappDisabled,
    call: hasPhone ? cardT.actions.call : cardT.actions.callDisabled,
    email: hasEmail ? cardT.actions.email : cardT.actions.emailDisabled,
  }), [hasPhone, hasEmail, cardT.actions]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // Relative for drag handle positioning
        'relative',
        // Mobile: allow scroll, only drag handle blocks touch
        // Desktop: full card can initiate drag
        isMobile ? '' : 'touch-none',
        isCurrentlyDragging && !isOverlay && 'z-0',
        className
      )}
      // Desktop: full card is draggable
      // Mobile: card wrapper doesn't have drag listeners (handle does)
      {...(draggable && !isMobile ? attributes : {})}
      {...(draggable && !isMobile ? listeners : {})}
    >
      {/* Mobile Drag Handle - Touch-friendly, always visible */}
      {isMobile && draggable && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-7 z-10',
            'flex items-center justify-center',
            'touch-none cursor-grab active:cursor-grabbing',
            'bg-gradient-to-r from-slate-100/90 to-transparent dark:from-slate-800/90 dark:to-transparent',
            'rounded-l-xl',
            'transition-all duration-200',
            isCurrentlyDragging ? 'opacity-100 bg-slate-200/90 dark:bg-slate-700/90' : 'opacity-70 hover:opacity-100'
          )}
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para mover"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/60" />
        </div>
      )}

      <article
        role="button"
        tabIndex={onClick ? 0 : undefined}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        aria-selected={isSelected}
        aria-label={`${decodedFullName || cardT.noName}${decodedCompanyName ? `, ${decodedCompanyName}` : ''}, ${cardT.score}: ${lead.score}`}
        className={cn(
          // VENTAZO 2025: Premium card class from CSS utilities
          DESIGN_TOKENS.card.base,
          // Use the group for hover states
          'group',
          // Entry animation
          'animate-card-enter',
          // Relative for moving overlay
          'relative',

          // Mobile: Add left padding for drag handle
          isMobile && draggable && 'pl-8',

          // Focus for keyboard navigation
          DESIGN_TOKENS.focusRing,

          // Selected state - Primary glow effect
          isSelected && 'is-selected',

          // Dragging state
          isCurrentlyDragging && 'is-dragging',

          // Moving state (stage transition in progress) - Homologated with Opportunities
          isMoving && 'opacity-70 pointer-events-none ring-2 ring-blue-400/50',

          // Cursor - different for mobile (pointer) vs desktop (grab)
          draggable
            ? (isCurrentlyDragging ? 'cursor-grabbing' : (isMobile ? 'cursor-pointer' : 'cursor-grab'))
            : (onClick ? 'cursor-pointer' : 'cursor-default')
        )}
      >
        {/* Moving indicator overlay - Homologated with OpportunityKanbanCard */}
        {isMoving && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px] z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">Moviendo...</span>
            </div>
          </div>
        )}

        {/* ============================
            HEADER: Score + Avatar + Name + Actions
            ============================ */}
        <header className="flex items-center gap-3">
          {/* Score Indicator - Large & Prominent */}
          <ScoreIndicator
            score={lead.score}
            size={variant === 'compact' ? 'sm' : 'md'}
            levelLabels={scoreLevelLabels}
          />

          {/* Avatar - Premium rounded style */}
          <div
            aria-hidden="true"
            className="avatar-premium"
          >
            {initials}
          </div>

          {/* Name & Company - Flex grow to take space */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'text-[14px] font-semibold truncate leading-tight',
              DESIGN_TOKENS.text.primary
            )}>
              {decodedFullName || cardT.noName}
            </h3>
            {decodedCompanyName && (
              <p className={cn(
                'flex items-center gap-1 text-[12px] truncate',
                DESIGN_TOKENS.text.secondary
              )}>
                <Building2
                  className={cn('h-3 w-3 shrink-0', DESIGN_TOKENS.text.icon)}
                  aria-hidden="true"
                />
                <span className="truncate">{decodedCompanyName}</span>
              </p>
            )}
          </div>

          {/* Quick Actions - Right aligned */}
          <nav
            aria-label={cardT.actions.quickActions}
            className={cn(
              'action-group-premium',
              // Subtle appearance that becomes more prominent on hover
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
              ariaLabel={actionLabels.whatsapp}
            />
            <ActionButton
              icon={Phone}
              onClick={handleCall}
              disabled={!hasPhone}
              variant="call"
              ariaLabel={actionLabels.call}
            />
            {variant !== 'compact' && (
              <ActionButton
                icon={Mail}
                onClick={handleEmail}
                disabled={!hasEmail}
                variant="email"
                ariaLabel={actionLabels.email}
              />
            )}
          </nav>
        </header>

        {/* ============================
            BODY: Status + Tags
            ============================ */}
        <div className="flex items-center gap-2 flex-wrap mt-3 pl-[calc(var(--score-size-md)+0.75rem)]">
          <StatusBadge
            status={lead.status}
            stageName={stageName}
            stageColor={stageColor}
          />

          {/* Overdue Indicator - Prominent warning */}
          {isOverdue && (
            <span
              role="alert"
              className="overdue-badge-premium"
            >
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {cardT.overdue}
            </span>
          )}
        </div>

        {/* ============================
            FOOTER: Time + Channel
            ============================ */}
        <footer className="meta-row-premium mt-2 pl-[calc(var(--score-size-md)+0.75rem)]">
          {/* Channel Badge */}
          <span className="channel-badge-premium">
            <ChannelIcon className="h-2.5 w-2.5" aria-hidden="true" />
            {channelLabel}
          </span>

          {/* Last Activity Time */}
          {relativeTimeText && (
            <span
              className="time-badge-premium"
              title={lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleString() : undefined}
            >
              <Clock className="h-3 w-3 opacity-70" aria-hidden="true" />
              <time dateTime={lead.lastActivityAt}>{relativeTimeText}</time>
            </span>
          )}
        </footer>
      </article>
    </div>
  );
});

LeadCardV3.displayName = 'LeadCardV3';

// ============================================
// Skeleton Component
// ============================================

export const LeadCardV3Skeleton = React.memo<{ variant?: CardVariant }>(
  function LeadCardV3Skeleton({ variant = 'standard' }) {
    const { t } = useI18n();
    const cardT = t.leads.card;

    const scoreSize = variant === 'compact'
      ? 'w-[var(--score-size-sm)] h-[var(--score-size-sm)]'
      : 'w-[var(--score-size-md)] h-[var(--score-size-md)]';

    return (
      <div
        role="status"
        aria-label={cardT.loading}
        className={cn(
          // Use premium card base styles
          'kanban-card-ventazo',
          'space-y-3'
        )}
      >
        {/* HEADER skeleton */}
        <div className="flex items-center gap-3">
          {/* Score skeleton */}
          <div
            className={cn(
              scoreSize,
              DESIGN_TOKENS.radius.score,
              'bg-muted',
              'animate-shimmer'
            )}
            aria-hidden="true"
          />

          {/* Avatar skeleton */}
          <div
            className={cn(
              'w-9 h-9',
              DESIGN_TOKENS.radius.md,
              'bg-muted',
              'animate-shimmer'
            )}
            style={{ animationDelay: '100ms' }}
            aria-hidden="true"
          />

          {/* Name skeleton */}
          <div className="flex-1 space-y-1.5">
            <div
              className={cn(
                'h-4 w-3/4 animate-shimmer',
                CARD_TOKENS.radius.internal,
                'bg-muted'
              )}
              style={{ animationDelay: '200ms' }}
              aria-hidden="true"
            />
            <div
              className={cn(
                'h-3 w-1/2 animate-shimmer',
                CARD_TOKENS.radius.internal,
                'bg-muted'
              )}
              style={{ animationDelay: '300ms' }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* BODY skeleton */}
        <div className="flex gap-2 pl-[calc(var(--score-size-md)+0.75rem)]">
          <div
            className={cn(
              'h-5 w-16 animate-shimmer',
              CARD_TOKENS.radius.badge,
              'bg-muted'
            )}
            style={{ animationDelay: '400ms' }}
            aria-hidden="true"
          />
        </div>

        {/* FOOTER skeleton */}
        <div className="flex gap-2 pl-[calc(var(--score-size-md)+0.75rem)]">
          <div
            className={cn(
              'h-4 w-12 animate-shimmer',
              CARD_TOKENS.radius.badge,
              'bg-muted'
            )}
            style={{ animationDelay: '500ms' }}
            aria-hidden="true"
          />
          <div
            className={cn(
              'h-4 w-16 animate-shimmer',
              CARD_TOKENS.radius.badge,
              'bg-muted'
            )}
            style={{ animationDelay: '600ms' }}
            aria-hidden="true"
          />
        </div>

        <span className="sr-only">{cardT.loadingInfo}</span>
      </div>
    );
  }
);

LeadCardV3Skeleton.displayName = 'LeadCardV3Skeleton';

// ============================================
// Overlay Component (for DnD)
// ============================================

export const LeadCardV3Overlay = React.memo<{ lead: Lead }>(
  function LeadCardV3Overlay({ lead }) {
    return (
      <div
        style={{
          width: 'clamp(280px, 80vw, 340px)',
          pointerEvents: 'none',
        }}
        className="cursor-grabbing"
        aria-hidden="true"
      >
        <LeadCardV3
          lead={lead}
          draggable={false}
          isOverlay
        />
      </div>
    );
  }
);

LeadCardV3Overlay.displayName = 'LeadCardV3Overlay';
