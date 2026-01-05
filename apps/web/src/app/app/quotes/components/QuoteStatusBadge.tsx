'use client';

/**
 * QuoteStatusBadge - Status indicator for quotes
 *
 * Displays the current status of a quote with appropriate colors
 * and icons based on the quote lifecycle.
 */

import * as React from 'react';
import {
  FileEdit,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/lib/quotes/types';
import { QUOTE_STATUS_LABELS } from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

export interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

// ============================================
// Status Configuration
// ============================================

/**
 * STATUS_CONFIG - Uses CSS variables for dynamic theming
 * Variables defined in globals.css under QUOTES MODULE section
 * Automatically adapts to light/dark mode via CSS variable overrides
 */
const STATUS_CONFIG: Record<QuoteStatus, {
  icon: React.ElementType;
  bg: string;
  text: string;
  border: string;
}> = {
  draft: {
    icon: FileEdit,
    bg: 'bg-[var(--quote-draft-bg)]',
    text: 'text-[var(--quote-draft-text)]',
    border: 'border-[var(--quote-draft-border)]',
  },
  pending_review: {
    icon: Clock,
    bg: 'bg-[var(--quote-pending-bg)]',
    text: 'text-[var(--quote-pending-text)]',
    border: 'border-[var(--quote-pending-border)]',
  },
  sent: {
    icon: Send,
    bg: 'bg-[var(--quote-sent-bg)]',
    text: 'text-[var(--quote-sent-text)]',
    border: 'border-[var(--quote-sent-border)]',
  },
  viewed: {
    icon: Eye,
    bg: 'bg-[var(--quote-viewed-bg)]',
    text: 'text-[var(--quote-viewed-text)]',
    border: 'border-[var(--quote-viewed-border)]',
  },
  accepted: {
    icon: CheckCircle2,
    bg: 'bg-[var(--quote-accepted-bg)]',
    text: 'text-[var(--quote-accepted-text)]',
    border: 'border-[var(--quote-accepted-border)]',
  },
  rejected: {
    icon: XCircle,
    bg: 'bg-[var(--quote-rejected-bg)]',
    text: 'text-[var(--quote-rejected-text)]',
    border: 'border-[var(--quote-rejected-border)]',
  },
  expired: {
    icon: AlertTriangle,
    bg: 'bg-[var(--quote-expired-bg)]',
    text: 'text-[var(--quote-expired-text)]',
    border: 'border-[var(--quote-expired-border)]',
  },
  revised: {
    icon: RefreshCw,
    bg: 'bg-[var(--quote-revised-bg)]',
    text: 'text-[var(--quote-revised-text)]',
    border: 'border-[var(--quote-revised-border)]',
  },
};

// ============================================
// Component
// ============================================

export const QuoteStatusBadge = React.memo(function QuoteStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: QuoteStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const label = QUOTE_STATUS_LABELS[status];

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px] gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        'transition-colors duration-150',
        sizeClasses[size],
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(iconSizes[size], 'shrink-0')} aria-hidden="true" />
      )}
      {label}
    </span>
  );
});

QuoteStatusBadge.displayName = 'QuoteStatusBadge';
