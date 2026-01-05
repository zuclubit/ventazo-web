'use client';

/**
 * QuoteCard - Premium CRM Quote Card Component v2.0 (Responsive & Modular)
 *
 * Displays quote information in a card format with:
 * - Quote number and title
 * - Client information (lead/customer)
 * - Financial summary (subtotal, discount, tax, total)
 * - Status badge
 * - Quick actions (view, send, download PDF)
 *
 * Features:
 * - Fully responsive (mobile-first design)
 * - Touch-friendly interactions (44px minimum targets)
 * - Multi-platform support (iOS, Android, Desktop)
 * - Uses design tokens for consistent theming
 *
 * @version 2.0.0
 */

import * as React from 'react';
import {
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
  Send,
  Download,
  Eye,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { touchTargets } from '@/lib/theme/tokens';
import type { Quote } from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

export interface QuoteCardProps {
  quote: Quote;
  isSelected?: boolean;
  onClick?: () => void;
  onSend?: () => void;
  onDownloadPdf?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewPublic?: () => void;
  className?: string;
}

// ============================================
// Utilities
// ============================================

/**
 * Format currency amount
 * Note: Backend stores values in cents, so we divide by 100
 */
function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
}

// ============================================
// Component
// ============================================

export const QuoteCard = React.memo(function QuoteCard({
  quote,
  isSelected = false,
  onClick,
  onSend,
  onDownloadPdf,
  onDuplicate,
  onEdit,
  onDelete,
  onViewPublic,
  className,
}: QuoteCardProps) {
  const clientName = quote.customerName || quote.leadName || 'Sin cliente';
  const expiringSoon = isExpiringSoon(quote.expiryDate);
  const canSend = quote.status === 'draft' || quote.status === 'revised';
  const hasPublicUrl = Boolean(quote.publicUrl);

  const handleCardClick = React.useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
    [onClick]
  );

  return (
    <article
      role="button"
      tabIndex={onClick ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-selected={isSelected}
      aria-label={`Cotizacion ${quote.quoteNumber}: ${quote.title}`}
      className={cn(
        // Base card styles - Premium Ventazo design
        'relative group',
        'rounded-xl border bg-card',
        'p-3 sm:p-4 md:p-5', // Responsive padding
        'transition-all duration-200',
        // Touch-friendly on mobile
        'active:scale-[0.99] sm:active:scale-100',
        // Hover state
        'hover:shadow-md hover:border-primary/20',
        // Focus state
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
        // Selected state
        isSelected && 'ring-2 ring-primary border-primary/30 bg-primary/5',
        // Cursor
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      {/* Header: Quote Number + Status + Menu */}
      <header className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Icon - Responsive sizing */}
          <div className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground block">
              {quote.quoteNumber}
            </span>
            <h3 className="text-xs sm:text-sm font-semibold truncate text-foreground">
              {quote.title}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <QuoteStatusBadge status={quote.status} size="sm" />

          {/* Actions Menu - Touch-friendly sizing */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  touchTargets.iconButton, // WCAG compliant sizing
                  // Always visible on mobile (no hover), fade in on desktop
                  'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                  'transition-opacity'
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Mas opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-44">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit} className={touchTargets.comfortable}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {canSend && onSend && (
                <DropdownMenuItem onClick={onSend} className={touchTargets.comfortable}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </DropdownMenuItem>
              )}
              {onDownloadPdf && (
                <DropdownMenuItem onClick={onDownloadPdf} className={touchTargets.comfortable}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </DropdownMenuItem>
              )}
              {hasPublicUrl && onViewPublic && (
                <DropdownMenuItem onClick={onViewPublic} className={touchTargets.comfortable}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver enlace publico
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate} className={touchTargets.comfortable}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className={cn(
                      'text-destructive focus:text-destructive',
                      touchTargets.comfortable
                    )}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Client Info - Responsive text sizing */}
      <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-muted-foreground">
        {quote.customerId ? (
          <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
        ) : (
          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
        )}
        <span className="truncate">{clientName}</span>
      </div>

      {/* Financial Summary - Responsive padding and text */}
      <div className="flex items-center justify-between gap-3 sm:gap-4 py-2.5 sm:py-3 px-2.5 sm:px-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-[10px] sm:text-xs">Total</span>
        </div>
        <span className="text-base sm:text-lg font-bold text-foreground">
          {formatCurrency(quote.total, quote.currency)}
        </span>
      </div>

      {/* Footer: Dates + Quick Actions - Responsive layout */}
      <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mt-3 pt-3 border-t border-border/50">
        {/* Date info - Stack on mobile, row on desktop */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            {formatDate(quote.issueDate)}
          </span>
          {quote.expiryDate && (
            <span
              className={cn(
                'flex items-center gap-1',
                expiringSoon && 'text-[var(--quote-urgency-warning-text)] font-medium'
              )}
            >
              <span className="hidden xs:inline">Vence:</span> {formatDate(quote.expiryDate)}
            </span>
          )}
        </div>

        {/* Quick Actions - Always visible on mobile, hover on desktop */}
        <div className={cn(
          'flex items-center gap-1',
          // On mobile: always visible, aligned to the right
          // On desktop: fade in on hover
          'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          'transition-opacity justify-end sm:justify-start'
        )}>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 sm:h-7 sm:w-auto sm:px-2', // Square on mobile, compact on desktop
              touchTargets.min // Ensure 44px touch target
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="sr-only">Ver detalles</span>
          </Button>
          {canSend && onSend && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-8 sm:h-7 sm:w-auto sm:px-2',
                touchTargets.min
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSend();
              }}
            >
              <Send className="h-3.5 w-3.5" />
              <span className="sr-only">Enviar cotizacion</span>
            </Button>
          )}
        </div>
      </footer>

      {/* Version Indicator */}
      {quote.version > 1 && (
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--quote-revised-bg)] text-[var(--quote-revised-text)]">
          v{quote.version}
        </div>
      )}
    </article>
  );
});

QuoteCard.displayName = 'QuoteCard';

// ============================================
// Skeleton
// ============================================

export const QuoteCardSkeleton = React.memo(function QuoteCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-3 sm:p-4 md:p-5 animate-pulse">
      {/* Header - Responsive sizing */}
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-muted" />
          <div className="space-y-1.5">
            <div className="h-2.5 sm:h-3 w-14 sm:w-16 rounded bg-muted" />
            <div className="h-3.5 sm:h-4 w-24 sm:w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="h-5 w-14 sm:w-16 rounded bg-muted" />
      </div>

      {/* Client - Responsive */}
      <div className="h-3.5 sm:h-4 w-20 sm:w-24 rounded bg-muted mb-3" />

      {/* Total - Responsive padding */}
      <div className="py-2.5 sm:py-3 px-2.5 sm:px-3 rounded-lg bg-muted/50">
        <div className="h-5 sm:h-6 w-24 sm:w-28 rounded bg-muted mx-auto" />
      </div>

      {/* Footer - Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mt-3 pt-3 border-t border-border/50">
        <div className="h-2.5 sm:h-3 w-16 sm:w-20 rounded bg-muted" />
        <div className="h-2.5 sm:h-3 w-20 sm:w-24 rounded bg-muted" />
      </div>
    </div>
  );
});

QuoteCardSkeleton.displayName = 'QuoteCardSkeleton';
