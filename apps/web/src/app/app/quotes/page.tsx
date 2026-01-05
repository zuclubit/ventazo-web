'use client';

/**
 * Quotes Page - Kanban View (v2.0 - Homologated with Leads/Opportunities)
 *
 * Redesigned with bulletproof layout architecture.
 * Uses PageContainer pattern for consistent containment.
 * Homologated with Leads/Opportunities module patterns.
 *
 * Layout Structure:
 * PageContainer (flex-col, flex-1, min-h-0)
 *   └── Body (flex-1, min-h-0)
 *       └── QuotesToolbar (shrink-0)
 *       └── Content scroll="horizontal" (flex-1, min-h-0, overflow-x-auto)
 *           └── QuoteKanbanBoard (inline-flex, h-full)
 *               └── QuoteKanbanColumn[] (flex-col, h-full, shrink-0)
 *
 * Features:
 * - Kanban as default view with drag & drop
 * - Grid and List views available
 * - Status transition validation
 * - Per-quote loading states
 * - Quick actions (send, duplicate, accept/reject)
 *
 * @version 2.0.0
 */

import * as React from 'react';
import { Plus, Loader2, FileText, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useQuoteMutations, useQuotesManagement } from '@/lib/quotes';
import type { Quote, QuoteStatus, QuotesQueryParams } from '@/lib/quotes/types';
import { useToast } from '@/hooks/use-toast';

// Components
import {
  QuoteKanbanBoard,
  QuoteDetailSheet,
  QuoteCreateSheet,
  QuotesEmptyState,
  QuoteCardV3Skeleton,
  QuoteCardV3,
  QuotesToolbar,
  QuotesListView,
  type QuoteViewMode,
  type DateRangeFilter,
} from './components';

// Hooks
import {
  useQuotesKanban,
  useQuoteTheme,
} from './hooks';

// ============================================
// Kanban Skeleton Component
// ============================================

function QuotesKanbanSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="inline-flex flex-nowrap h-full min-h-0 items-stretch gap-3 sm:gap-4 lg:gap-5 px-3 sm:px-4 lg:px-5 pb-3">
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div
          key={colIndex}
          className="flex flex-col h-full shrink-0 grow-0 w-[260px] sm:w-[280px] lg:w-[300px] bg-muted/50 rounded-xl border border-border/50"
        >
          {/* Header skeleton */}
          <div className="px-3 py-2.5 bg-card/80 backdrop-blur-md border-b border-border/50 rounded-t-xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20 animate-pulse" />
                <div className="w-20 h-4 rounded bg-muted-foreground/20 animate-pulse" />
              </div>
              <div className="w-8 h-5 rounded-full bg-muted-foreground/20 animate-pulse" />
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="flex-1 p-2.5 sm:p-3 space-y-2.5 sm:space-y-3 overflow-hidden">
            {Array.from({ length: 2 + colIndex % 2 }).map((_, cardIndex) => (
              <QuoteCardV3Skeleton key={cardIndex} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Grid View Component
// ============================================

interface QuotesGridProps {
  quotes: Quote[];
  isLoading?: boolean;
  onQuoteClick?: (quote: Quote) => void;
  onQuoteSend?: (quote: Quote) => void;
  onQuoteAccept?: (quote: Quote) => void;
  onQuoteReject?: (quote: Quote) => void;
  onQuoteDuplicate?: (quote: Quote) => void;
}

function QuotesGrid({
  quotes,
  isLoading,
  onQuoteClick,
  onQuoteSend,
  onQuoteAccept,
  onQuoteReject,
  onQuoteDuplicate,
}: QuotesGridProps) {
  if (isLoading) {
    return (
      <div className={cn(
        // Responsive grid with proper breakpoints
        'grid',
        'grid-cols-1',           // 1 column on mobile
        'sm:grid-cols-2',        // 2 columns on tablets
        'lg:grid-cols-3',        // 3 columns on desktop
        'xl:grid-cols-4',        // 4 columns on wide screens
        '2xl:grid-cols-5',       // 5 columns on ultra-wide
        // Responsive gaps
        'gap-3 sm:gap-4 lg:gap-5',
        // Responsive padding
        'p-3 sm:p-4 lg:p-5'
      )}>
        {Array.from({ length: 8 }).map((_, i) => (
          <QuoteCardV3Skeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      // Responsive grid with proper breakpoints
      'grid',
      'grid-cols-1',           // 1 column on mobile
      'sm:grid-cols-2',        // 2 columns on tablets
      'lg:grid-cols-3',        // 3 columns on desktop
      'xl:grid-cols-4',        // 4 columns on wide screens
      '2xl:grid-cols-5',       // 5 columns on ultra-wide
      // Responsive gaps
      'gap-3 sm:gap-4 lg:gap-5',
      // Responsive padding
      'p-3 sm:p-4 lg:p-5'
    )}>
      {quotes.map((quote) => (
        <QuoteCardV3
          key={quote.id}
          quote={quote}
          variant="standard"
          draggable={false}  // No drag in Grid view
          onClick={() => onQuoteClick?.(quote)}
          onSend={() => onQuoteSend?.(quote)}
          onAccept={() => onQuoteAccept?.(quote)}
          onReject={() => onQuoteReject?.(quote)}
          onDuplicate={() => onQuoteDuplicate?.(quote)}
        />
      ))}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function QuotesPage() {
  // Initialize dynamic theming
  useQuoteTheme();

  // Toast hook
  const { toast } = useToast();

  // View mode state
  const [viewMode, setViewMode] = React.useState<QuoteViewMode>('kanban');

  // Filter states
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<QuoteStatus | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = React.useState<DateRangeFilter>('all');
  const [expiringFilter, setExpiringFilter] = React.useState(false);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedQuote, setSelectedQuote] = React.useState<Quote | null>(null);
  const [deleteQuote, setDeleteQuote] = React.useState<Quote | null>(null);

  // Build query params for list/grid view
  const queryParams: QuotesQueryParams = React.useMemo(() => ({
    searchTerm: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }), [searchTerm, statusFilter]);

  // Data fetching for grid/list views
  const { quotes, stats, isLoading: isLoadingList, error: listError, refetchQuotes } = useQuotesManagement(queryParams);

  // Quote mutations
  const mutations = useQuoteMutations();

  // Kanban data with enhanced state management
  const {
    columns,
    isLoading: isLoadingKanban,
    error: kanbanError,
    isMoving,
    isQuoteMoving,
    canMoveToStatus,
    moveToStatus,
    refetch: refetchKanban,
  } = useQuotesKanban({
    onMoveSuccess: (_quoteId, targetStatus) => {
      toast({
        title: 'Cotizacion movida',
        description: `La cotizacion se movio a "${targetStatus}" exitosamente.`,
      });
    },
    onMoveError: (error, _quoteId) => {
      toast({
        title: 'Error al mover',
        description: error instanceof Error ? error.message : 'No se pudo mover la cotizacion.',
        variant: 'destructive',
      });
    },
  });

  // Derived values
  const isLoading = viewMode === 'kanban' ? isLoadingKanban : isLoadingList;
  const error = viewMode === 'kanban' ? kanbanError : listError;
  const isEmpty = viewMode === 'kanban'
    ? columns.length === 0 || columns.every((c) => c.quotes.length === 0)
    : quotes.length === 0;

  // Handlers
  const handleQuoteClick = React.useCallback((quote: Quote) => {
    setSelectedQuote(quote);
  }, []);

  const handleQuoteSend = React.useCallback(async (quote: Quote) => {
    try {
      await mutations.send({ quoteId: quote.id, data: {} });
      toast({ title: 'Exito', description: 'Cotizacion enviada exitosamente' });
      if (viewMode === 'kanban') {
        refetchKanban();
      } else {
        refetchQuotes();
      }
    } catch {
      toast({ title: 'Error', description: 'Error al enviar la cotizacion', variant: 'destructive' });
    }
  }, [mutations, toast, viewMode, refetchKanban, refetchQuotes]);

  const handleQuoteAccept = React.useCallback(async (quote: Quote) => {
    try {
      await mutations.accept({ quoteId: quote.id, data: {} });
      toast({ title: 'Exito', description: 'Cotizacion aceptada' });
      if (viewMode === 'kanban') {
        refetchKanban();
      } else {
        refetchQuotes();
      }
    } catch {
      toast({ title: 'Error', description: 'Error al aceptar la cotizacion', variant: 'destructive' });
    }
  }, [mutations, toast, viewMode, refetchKanban, refetchQuotes]);

  const handleQuoteReject = React.useCallback(async (quote: Quote) => {
    try {
      await mutations.reject({ quoteId: quote.id, data: {} });
      toast({ title: 'Cotizacion rechazada', description: 'La cotizacion ha sido rechazada.' });
      if (viewMode === 'kanban') {
        refetchKanban();
      } else {
        refetchQuotes();
      }
    } catch {
      toast({ title: 'Error', description: 'Error al rechazar la cotizacion', variant: 'destructive' });
    }
  }, [mutations, toast, viewMode, refetchKanban, refetchQuotes]);

  const handleQuoteDuplicate = React.useCallback(async (quote: Quote) => {
    try {
      await mutations.duplicate(quote.id);
      toast({ title: 'Exito', description: 'Cotizacion duplicada' });
      if (viewMode === 'kanban') {
        refetchKanban();
      } else {
        refetchQuotes();
      }
    } catch {
      toast({ title: 'Error', description: 'Error al duplicar la cotizacion', variant: 'destructive' });
    }
  }, [mutations, toast, viewMode, refetchKanban, refetchQuotes]);

  const handleClosePreview = React.useCallback(() => {
    setSelectedQuote(null);
  }, []);

  const handleRefresh = React.useCallback(() => {
    if (viewMode === 'kanban') {
      refetchKanban();
    } else {
      refetchQuotes();
    }
  }, [viewMode, refetchKanban, refetchQuotes]);

  const handleCreateQuote = React.useCallback(() => {
    setIsCreateOpen(true);
  }, []);

  const handleCreateSuccess = React.useCallback((quote: Quote) => {
    setIsCreateOpen(false);
    handleRefresh();
  }, [handleRefresh]);

  // Error state
  if (error) {
    return (
      <PageContainer variant="full-bleed">
        <PageContainer.Body>
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold mb-2 text-foreground">Error al cargar cotizaciones</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Ocurrio un error inesperado'}
            </p>
            <Button onClick={handleRefresh}>Reintentar</Button>
          </div>
        </PageContainer.Body>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="full-bleed">
      {/* Body: Full height content */}
      <PageContainer.Body>
        {/*
          CRITICAL: Wrap toolbar + content in flex-col container
          PageContainer.Body uses flex-row for sidebar support.
          We need a column layout for toolbar (top) + content (fill remaining).
        */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden">
          {/* Toolbar - shrink-0 keeps fixed height */}
          <div className="shrink-0 px-4 py-3 border-b border-border/40">
            <QuotesToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              dateRangeFilter={dateRangeFilter}
              onDateRangeFilterChange={setDateRangeFilter}
              expiringFilter={expiringFilter}
              onExpiringFilterChange={setExpiringFilter}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Main Content Area - flex-1 fills remaining height */}
          {viewMode === 'kanban' ? (
            <PageContainer.Content scroll="horizontal" padding="none">
              {isLoading ? (
                <QuotesKanbanSkeleton columns={5} />
              ) : isEmpty ? (
                <div className="flex items-center justify-center h-full p-4">
                  <QuotesEmptyState
                    onCreateQuote={handleCreateQuote}
                    variant="default"
                  />
                </div>
              ) : (
                <QuoteKanbanBoard
                  columns={columns}
                  isLoading={isLoading}
                  isMoving={isMoving}
                  canMoveToStatus={canMoveToStatus}
                  isQuoteMoving={isQuoteMoving}
                  onMoveToStatus={moveToStatus}
                  onQuoteClick={handleQuoteClick}
                  onQuoteSend={handleQuoteSend}
                  onQuoteAccept={handleQuoteAccept}
                  onQuoteReject={handleQuoteReject}
                  onQuoteDuplicate={handleQuoteDuplicate}
                />
              )}
            </PageContainer.Content>
          ) : viewMode === 'list' ? (
            <PageContainer.Content scroll="vertical" padding="none">
              {isEmpty && !isLoading ? (
                <div className="flex items-center justify-center h-full p-4">
                  <QuotesEmptyState
                    onCreateQuote={handleCreateQuote}
                    variant={searchTerm ? 'search' : 'default'}
                    searchTerm={searchTerm}
                    onClearFilters={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateRangeFilter('all');
                      setExpiringFilter(false);
                    }}
                  />
                </div>
              ) : (
                <div className="p-4">
                  <QuotesListView
                    quotes={quotes}
                    isLoading={isLoading}
                    onQuoteClick={handleQuoteClick}
                    onQuoteSend={handleQuoteSend}
                    onQuoteAccept={handleQuoteAccept}
                    onQuoteReject={handleQuoteReject}
                    onQuoteDuplicate={handleQuoteDuplicate}
                  />
                </div>
              )}
            </PageContainer.Content>
          ) : (
            <PageContainer.Content scroll="vertical" padding="none">
              {isEmpty && !isLoading ? (
                <div className="flex items-center justify-center h-full p-4">
                  <QuotesEmptyState
                    onCreateQuote={handleCreateQuote}
                    variant={searchTerm ? 'search' : 'default'}
                    searchTerm={searchTerm}
                    onClearFilters={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateRangeFilter('all');
                      setExpiringFilter(false);
                    }}
                  />
                </div>
              ) : (
                <QuotesGrid
                  quotes={quotes}
                  isLoading={isLoading}
                  onQuoteClick={handleQuoteClick}
                  onQuoteSend={handleQuoteSend}
                  onQuoteAccept={handleQuoteAccept}
                  onQuoteReject={handleQuoteReject}
                  onQuoteDuplicate={handleQuoteDuplicate}
                />
              )}
            </PageContainer.Content>
          )}
        </div>
      </PageContainer.Body>

      {/* Quote Detail Sheet */}
      <QuoteDetailSheet
        quote={selectedQuote}
        open={!!selectedQuote}
        onClose={handleClosePreview}
        onSend={handleQuoteSend}
        onAccept={handleQuoteAccept}
        onReject={handleQuoteReject}
        onDuplicate={handleQuoteDuplicate}
        onDownloadPdf={async (quote) => {
          try {
            const blob = await mutations.generatePdf(quote.id);
            return blob;
          } catch (error) {
            console.error('Error generating PDF:', error);
            toast({
              title: 'Error',
              description: 'No se pudo generar el PDF. Intenta de nuevo.',
              variant: 'destructive',
            });
            return undefined;
          }
        }}
        onDelete={async (quote) => {
          try {
            await mutations.delete(quote.id);
            toast({ title: 'Cotizacion eliminada', description: 'La cotizacion ha sido eliminada.' });
            handleRefresh();
            setSelectedQuote(null);
          } catch {
            toast({ title: 'Error', description: 'Error al eliminar la cotizacion', variant: 'destructive' });
          }
        }}
        onSuccess={() => {
          handleRefresh();
          setSelectedQuote(null);
        }}
      />

      {/* Quote Create Sheet */}
      <QuoteCreateSheet
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* FAB for creating quotes - uses quotes-fab class for proper mobile positioning */}
      <button
        onClick={handleCreateQuote}
        className="quotes-fab"
        aria-label="Nueva Cotizacion"
      >
        <Plus className="h-6 w-6" />
      </button>
    </PageContainer>
  );
}
