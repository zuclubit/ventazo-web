'use client';

/**
 * Card Utilities - Ventazo Design System 2025
 *
 * @description Shared utilities, constants, and patterns for all card components.
 * Provides consistent styling tokens, interaction patterns, and accessibility helpers.
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ============================================
// Design Tokens (Shared across all cards)
// ============================================

/**
 * Centralized design tokens for card components.
 * Use these instead of hardcoding values.
 */
export const CARD_TOKENS = {
  // Touch target sizes (WCAG 2.5.5)
  touchTarget: {
    min: 'min-h-[44px] min-w-[44px]',
    button: 'h-11 w-11',
    buttonSm: 'h-9 w-9',
    icon: 'h-4 w-4',
  },

  // Border radius (semantic names)
  radius: {
    card: 'rounded-[var(--card-radius-md)]',
    cardSm: 'rounded-[var(--card-radius-sm)]',
    cardLg: 'rounded-[var(--card-radius-lg)]',
    internal: 'rounded-[var(--card-radius-internal)]',
    badge: 'rounded-[var(--radius-badge)]',
    button: 'rounded-[var(--radius-button)]',
  },

  // Transitions
  transition: {
    micro: 'transition-all duration-[var(--transition-micro)]',
    fast: 'transition-all duration-[var(--transition-fast)]',
    normal: 'transition-all duration-[var(--transition-normal)]',
    slow: 'transition-all duration-[var(--transition-slow)]',
  },

  // Focus states (WCAG compliant)
  focus: {
    ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tenant-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    visible: 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  },

  // Card backgrounds and borders
  card: {
    base: 'bg-card border border-border/50',
    elevated: 'bg-card shadow-[var(--card-shadow-elevated)]',
    interactive: 'hover:shadow-[var(--card-shadow-hover)] hover:border-[color-mix(in_srgb,var(--tenant-primary)_30%,transparent)] hover:-translate-y-0.5',
    dragging: 'shadow-[var(--card-shadow-dragging)] border-[var(--tenant-primary)] rotate-2 scale-105 z-50',
    selected: 'ring-2 ring-[var(--tenant-primary)] ring-offset-2 ring-offset-background',
  },

  // Padding scale
  padding: {
    sm: 'p-[var(--card-padding-sm)]',
    md: 'p-[var(--card-padding-md)]',
    lg: 'p-[var(--card-padding-lg)]',
  },

  // Text styles
  text: {
    title: 'font-medium text-sm text-foreground',
    titleLg: 'font-semibold text-base text-foreground',
    subtitle: 'text-xs text-muted-foreground',
    meta: 'text-[11px] text-muted-foreground',
    value: 'text-2xl font-bold tracking-tight tabular-nums text-foreground',
  },

  // Gap/spacing
  gap: {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  },
} as const;

// ============================================
// Card States Hook
// ============================================

export interface UseCardStatesProps {
  isLoading?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
}

export interface UseCardStatesReturn {
  containerClasses: string;
  isInteractive: boolean;
  ariaProps: {
    'aria-busy'?: boolean;
    'aria-disabled'?: boolean;
    'aria-selected'?: boolean;
  };
}

/**
 * Hook to manage card state classes and ARIA attributes
 */
export function useCardStates({
  isLoading = false,
  isSelected = false,
  isDisabled = false,
  isDragging = false,
  isOverlay = false,
}: UseCardStatesProps): UseCardStatesReturn {
  const containerClasses = cn(
    isDragging && CARD_TOKENS.card.dragging,
    isSelected && CARD_TOKENS.card.selected,
    isDisabled && 'opacity-50 pointer-events-none',
    isLoading && 'opacity-70',
    isOverlay && 'shadow-[var(--card-shadow-elevated)]'
  );

  return {
    containerClasses,
    isInteractive: !isDisabled && !isLoading,
    ariaProps: {
      'aria-busy': isLoading || undefined,
      'aria-disabled': isDisabled || undefined,
      'aria-selected': isSelected || undefined,
    },
  };
}

// ============================================
// Loading Overlay Component
// ============================================

export interface LoadingOverlayProps {
  isVisible: boolean;
  className?: string;
}

export function CardLoadingOverlay({ isVisible, className }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 flex items-center justify-center',
        'bg-background/50 rounded-[inherit] z-10',
        className
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-[var(--tenant-primary)]" />
    </div>
  );
}

// ============================================
// Card Action Button
// ============================================

export interface CardActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  showOnHover?: boolean;
}

const actionVariantStyles = {
  default: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  primary: 'text-muted-foreground hover:text-[var(--tenant-primary)] hover:bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)]',
  success: 'text-muted-foreground hover:text-[var(--action-complete)] hover:bg-[var(--action-complete-bg)]',
  warning: 'text-muted-foreground hover:text-[var(--urgency-today)] hover:bg-[var(--urgency-today-bg)]',
  danger: 'text-muted-foreground hover:text-[var(--action-reject)] hover:bg-[var(--action-reject-bg)]',
};

const actionSizeStyles = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
};

export const CardActionButton = React.forwardRef<HTMLButtonElement, CardActionButtonProps>(
  ({ icon: Icon, label, variant = 'default', size = 'sm', showOnHover = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-md',
          CARD_TOKENS.transition.fast,
          CARD_TOKENS.focus.ring,
          actionSizeStyles[size],
          actionVariantStyles[variant],
          showOnHover && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          className
        )}
        aria-label={label}
        {...props}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }
);

CardActionButton.displayName = 'CardActionButton';

// ============================================
// Card Badge Component
// ============================================

export interface CardBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const badgeVariantStyles = {
  default: 'bg-muted text-muted-foreground border-border',
  primary: 'bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)] text-[var(--tenant-primary)] border-[color-mix(in_srgb,var(--tenant-primary)_30%,transparent)]',
  success: 'bg-[var(--status-completed-bg)] text-[var(--status-completed)] border-[var(--status-completed-border)]',
  warning: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending-border)]',
  danger: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)] border-[var(--status-cancelled-border)]',
  info: 'bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)] border-[var(--status-in-progress-border)]',
};

const badgeSizeStyles = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export function CardBadge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: CardBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        badgeVariantStyles[variant],
        badgeSizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// ============================================
// Card Avatar
// ============================================

export interface CardAvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarSizeStyles = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export function CardAvatar({ name, src, size = 'md', className }: CardAvatarProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn(
        'relative shrink-0 rounded-full overflow-hidden',
        'ring-2 ring-background shadow-sm',
        'bg-muted flex items-center justify-center font-medium',
        avatarSizeStyles[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-muted-foreground">{initials}</span>
      )}
    </div>
  );
}

// ============================================
// Utility: getCardInteractiveClasses
// ============================================

export function getCardInteractiveClasses(isClickable: boolean): string {
  if (!isClickable) return '';

  return cn(
    'cursor-pointer',
    CARD_TOKENS.card.interactive,
    CARD_TOKENS.focus.ring
  );
}

// ============================================
// Utility: formatCardValue
// ============================================

export function formatCardValue(
  amount: number,
  options: {
    currency?: string;
    locale?: string;
    compact?: boolean;
  } = {}
): string {
  const { currency = 'USD', locale = 'en-US', compact = false } = options;

  if (compact) {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// Utility: getScoreLevel
// ============================================

export type ScoreLevel = 'hot' | 'warm' | 'cold';

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

export const SCORE_STYLES: Record<ScoreLevel, string> = {
  hot: 'bg-[var(--score-hot-gradient)] text-white shadow-[var(--score-hot-shadow)]',
  warm: 'bg-[var(--score-warm-gradient)] text-white shadow-[var(--score-warm-shadow)]',
  cold: 'bg-[var(--score-cold-gradient)] text-slate-700 dark:text-white shadow-[var(--score-cold-shadow)]',
};
