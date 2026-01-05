'use client';

/**
 * QuotesListView - Table/List View Component
 *
 * Premium styled table view for quotes with sorting, selection,
 * and quick actions. Uses semantic colors and design tokens.
 *
 * Features:
 * - Sortable columns
 * - Row selection
 * - Quick action buttons
 * - Responsive design
 * - Status badges with proper colors
 * - Skeleton loading states
 *
 * @version 1.0.0
 */

import * as React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  Send,
  Copy,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  FileText,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Quote, QuoteStatus } from '@/lib/quotes/types';
import { QUOTE_STATUS_LABELS } from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

type SortField = 'quoteNumber' | 'title' | 'customerName' | 'total' | 'status' | 'expiryDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export interface QuotesListViewProps {
  quotes: Quote[];
  isLoading?: boolean;
  onQuoteClick?: (quote: Quote) => void;
  onQuoteSend?: (quote: Quote) => void;
  onQuoteAccept?: (quote: Quote) => void;
  onQuoteReject?: (quote: Quote) => void;
  onQuoteDuplicate?: (quote: Quote) => void;
  onQuoteDelete?: (quote: Quote) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: QuoteStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<QuoteStatus, { icon: React.ElementType; className: string }> = {
    draft: {
      icon: FileText,
      className: 'bg-muted text-muted-foreground border-border',
    },
    pending_review: {
      icon: Clock,
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    sent: {
      icon: Send,
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    },
    viewed: {
      icon: Eye,
      className: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    },
    accepted: {
      icon: CheckCircle2,
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    rejected: {
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    },
    expired: {
      icon: AlertTriangle,
      className: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/30',
    },
    revised: {
      icon: FileText,
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    },
  };

  const { icon: Icon, className } = config[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {QUOTE_STATUS_LABELS[status]}
    </Badge>
  );
}

// ============================================
// Urgency Indicator
// ============================================

interface UrgencyIndicatorProps {
  expiryDate?: string;
  status: QuoteStatus;
}

function UrgencyIndicator({ expiryDate, status }: UrgencyIndicatorProps) {
  if (!expiryDate || status === 'accepted' || status === 'rejected' || status === 'expired') {
    return null;
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        Expirada
      </Badge>
    );
  }

  if (daysUntilExpiry <= 3) {
    return (
      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
        {daysUntilExpiry === 0 ? 'Hoy' : `${daysUntilExpiry}d`}
      </Badge>
    );
  }

  if (daysUntilExpiry <= 7) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
        {daysUntilExpiry}d
      </Badge>
    );
  }

  return null;
}

// ============================================
// Sort Header Component
// ============================================

interface SortableHeaderProps {
  field: SortField;
  label: string;
  currentSort: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortableHeader({
  field,
  label,
  currentSort,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(field)}
      className={cn(
        'h-8 -ml-3 px-3 font-medium text-muted-foreground hover:text-foreground',
        isActive && 'text-foreground',
        className
      )}
    >
      {label}
      {isActive ? (
        direction === 'asc' ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5" />
        ) : (
          <ArrowDown className="ml-2 h-3.5 w-3.5" />
        )
      ) : (
        <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-50" />
      )}
    </Button>
  );
}

// ============================================
// Table Row Component
// ============================================

interface QuoteRowProps {
  quote: Quote;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onQuoteClick?: (quote: Quote) => void;
  onQuoteSend?: (quote: Quote) => void;
  onQuoteAccept?: (quote: Quote) => void;
  onQuoteReject?: (quote: Quote) => void;
  onQuoteDuplicate?: (quote: Quote) => void;
  onQuoteDelete?: (quote: Quote) => void;
}

function QuoteRow({
  quote,
  isSelected,
  onSelect,
  onQuoteClick,
  onQuoteSend,
  onQuoteAccept,
  onQuoteReject,
  onQuoteDuplicate,
  onQuoteDelete,
}: QuoteRowProps) {
  const canSend = quote.status === 'draft' || quote.status === 'pending_review';
  const canAccept = quote.status === 'sent' || quote.status === 'viewed';
  const canReject = quote.status === 'sent' || quote.status === 'viewed';

  // Note: Backend stores values in cents, so we divide by 100
  const formatCurrency = (amount: number, currency = 'MXN') => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <TableRow
      className={cn(
        'group cursor-pointer transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-muted/80'
      )}
      onClick={() => onQuoteClick?.(quote)}
    >
      {/* Selection Checkbox */}
      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(quote.id, checked as boolean)}
          aria-label={`Seleccionar cotizacion ${quote.quoteNumber}`}
        />
      </TableCell>

      {/* Quote Number */}
      <TableCell className="font-mono text-sm text-muted-foreground">
        {quote.quoteNumber}
      </TableCell>

      {/* Title & Customer */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground line-clamp-1">
            {quote.title}
          </span>
          {(quote.customerName || quote.leadName) && (
            <span className="text-xs text-muted-foreground line-clamp-1">
              {quote.customerName || quote.leadName}
            </span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusBadge status={quote.status} />
      </TableCell>

      {/* Total */}
      <TableCell className="text-right font-semibold tabular-nums">
        {formatCurrency(quote.total, quote.currency)}
      </TableCell>

      {/* Expiry Date */}
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {formatDate(quote.expiryDate)}
          </span>
          <UrgencyIndicator expiryDate={quote.expiryDate} status={quote.status} />
        </div>
      </TableCell>

      {/* Created */}
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(quote.createdAt)}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onQuoteClick?.(quote)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            {canSend && (
              <DropdownMenuItem onClick={() => onQuoteSend?.(quote)}>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onQuoteDuplicate?.(quote)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canAccept && (
              <DropdownMenuItem onClick={() => onQuoteAccept?.(quote)}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
                Marcar aceptada
              </DropdownMenuItem>
            )}
            {canReject && (
              <DropdownMenuItem onClick={() => onQuoteReject?.(quote)}>
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                Marcar rechazada
              </DropdownMenuItem>
            )}
            {(canAccept || canReject) && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={() => onQuoteDelete?.(quote)}
              className="text-destructive focus:text-destructive"
            >
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============================================
// Skeleton Row
// ============================================

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell className="w-12">
        <Skeleton className="h-4 w-4" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24 ml-auto" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell className="w-12">
        <Skeleton className="h-8 w-8 rounded" />
      </TableCell>
    </TableRow>
  );
}

// ============================================
// Main Component
// ============================================

export function QuotesListView({
  quotes,
  isLoading,
  onQuoteClick,
  onQuoteSend,
  onQuoteAccept,
  onQuoteReject,
  onQuoteDuplicate,
  onQuoteDelete,
  selectedIds = [],
  onSelectionChange,
}: QuotesListViewProps) {
  // Sort state
  const [sortField, setSortField] = React.useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  // Handle sort
  const handleSort = React.useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  // Handle selection
  const handleSelect = React.useCallback(
    (id: string, checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange([...selectedIds, id]);
      } else {
        onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
      }
    },
    [selectedIds, onSelectionChange]
  );

  const handleSelectAll = React.useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange(quotes.map((q) => q.id));
      } else {
        onSelectionChange([]);
      }
    },
    [quotes, onSelectionChange]
  );

  // Sort quotes
  const sortedQuotes = React.useMemo(() => {
    const sorted = [...quotes].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'quoteNumber':
          comparison = a.quoteNumber.localeCompare(b.quoteNumber);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'customerName':
          comparison = (a.customerName || a.leadName || '').localeCompare(
            b.customerName || b.leadName || ''
          );
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'expiryDate':
          comparison = new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime();
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [quotes, sortField, sortDirection]);

  const allSelected = quotes.length > 0 && selectedIds.length === quotes.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < quotes.length;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>No.</TableHead>
              <TableHead>Titulo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={someSelected ? 'indeterminate' : allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Seleccionar todas"
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="quoteNumber"
                label="No."
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="title"
                label="Titulo"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="status"
                label="Estado"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="text-right">
              <SortableHeader
                field="total"
                label="Total"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
                className="justify-end"
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="expiryDate"
                label="Vence"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                field="createdAt"
                label="Creada"
                currentSort={sortField}
                direction={sortDirection}
                onSort={handleSort}
              />
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedQuotes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                No hay cotizaciones para mostrar
              </TableCell>
            </TableRow>
          ) : (
            sortedQuotes.map((quote) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                isSelected={selectedIds.includes(quote.id)}
                onSelect={handleSelect}
                onQuoteClick={onQuoteClick}
                onQuoteSend={onQuoteSend}
                onQuoteAccept={onQuoteAccept}
                onQuoteReject={onQuoteReject}
                onQuoteDuplicate={onQuoteDuplicate}
                onQuoteDelete={onQuoteDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

QuotesListView.displayName = 'QuotesListView';
