'use client';

/**
 * useQuotesKanban Hook - v1.0 (Following Leads/Opportunities Pattern)
 *
 * Custom hook for quote Kanban management:
 * - Organizes quotes by status into columns
 * - Status movement with optimistic updates and validation
 * - Status transition validation (terminal states: accepted/rejected)
 * - Per-quote loading states
 * - Retry logic with exponential backoff
 * - Undo capability for recent moves
 *
 * Architecture mirrors useLeadsKanban for consistency.
 * Clean Architecture: Frontend presentation logic only.
 * Backend handles business rules validation.
 *
 * @version 1.0.0
 * @module hooks/useQuotesKanban
 */

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  useQuotes,
  useUpdateQuote,
  quoteKeys,
  type Quote,
  type QuoteStatus,
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_COLORS,
} from '@/lib/quotes';

// ============================================
// Constants
// ============================================

/** Maximum retry attempts for failed moves */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY = 1000;

/** Time window for undo capability (ms) */
const UNDO_WINDOW_MS = 5000;

// ============================================
// Column Configuration
// ============================================

export interface QuoteColumn {
  id: QuoteStatus;
  label: string;
  color: string;
  colorHex: string;
  quotes: Quote[];
  count: number;
  totalValue: number;
}

/**
 * Kanban columns configuration for quotes
 * Ordered by workflow progression
 */
export const QUOTE_KANBAN_COLUMNS: Array<{
  id: QuoteStatus;
  label: string;
  colorHex: string;
}> = [
  { id: 'draft', label: 'Borrador', colorHex: 'var(--quote-status-draft, #64748B)' },
  { id: 'pending_review', label: 'En Revisión', colorHex: 'var(--quote-status-pending, #F59E0B)' },
  { id: 'sent', label: 'Enviada', colorHex: 'var(--quote-status-sent, #3B82F6)' },
  { id: 'viewed', label: 'Vista', colorHex: 'var(--quote-status-viewed, #8B5CF6)' },
  { id: 'accepted', label: 'Aceptada', colorHex: 'var(--quote-status-accepted, #10B981)' },
  { id: 'rejected', label: 'Rechazada', colorHex: 'var(--quote-status-rejected, #EF4444)' },
];

/**
 * Valid status transitions
 * Key = source status, Value = array of valid target statuses
 */
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['pending_review', 'sent', 'expired'],
  pending_review: ['draft', 'sent', 'expired'],
  sent: ['viewed', 'accepted', 'rejected', 'expired', 'revised'],
  viewed: ['accepted', 'rejected', 'expired', 'revised'],
  accepted: [], // Terminal state
  rejected: [], // Terminal state
  expired: ['revised'], // Can only be revised
  revised: ['draft', 'sent'], // Revised can go back to draft or sent
};

/** Terminal statuses (no drag out allowed) */
const TERMINAL_STATUSES: QuoteStatus[] = ['accepted', 'rejected'];

// ============================================
// Types
// ============================================

export interface UseQuotesKanbanOptions {
  /** Callback when a move is successful */
  onMoveSuccess?: (quoteId: string, targetStatus: QuoteStatus) => void;
  /** Callback when a move fails */
  onMoveError?: (error: Error, quoteId: string) => void;
  /** Callback when trying to move to a terminal status */
  onTerminalStatusAttempt?: (quote: Quote, statusType: 'accepted' | 'rejected') => void;
  /** Enable undo capability for recent moves */
  enableUndo?: boolean;
}

export interface UseQuotesKanbanReturn {
  /** Kanban columns with quotes organized by status */
  columns: QuoteColumn[];
  /** All quotes (flat list) */
  quotes: Quote[];
  /** Whether the data is loading */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether any move operation is in progress */
  isMoving: boolean;
  /** Set of quote IDs currently being moved */
  movingQuoteIds: Set<string>;
  /** Check if a specific quote is being moved */
  isQuoteMoving: (quoteId: string) => boolean;
  /** Total quotes count */
  totalQuotes: number;
  /** Total value of all quotes */
  totalValue: number;
  /** Move quote to a new status */
  moveToStatus: (quoteId: string, targetStatus: QuoteStatus) => void;
  /** Validate if a status transition is allowed */
  canMoveToStatus: (quoteId: string, targetStatus: QuoteStatus) => StatusTransitionValidation;
  /** Get validation message for a status transition */
  getTransitionMessage: (quoteId: string, targetStatus: QuoteStatus) => string | null;
  /** Undo last move (if within undo window) */
  undoLastMove: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Refetch quotes data */
  refetch: () => void;
}

export interface StatusTransitionValidation {
  /** Whether the transition is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Suggested action if not allowed */
  suggestedAction?: 'use_accept_dialog' | 'use_reject_dialog' | 'revise_first' | 'already_there';
}

interface UndoState {
  quoteId: string;
  sourceStatus: QuoteStatus;
  targetStatus: QuoteStatus;
  timestamp: number;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate delay for exponential backoff
 */
function getRetryDelay(attempt: number): number {
  return BASE_RETRY_DELAY * Math.pow(2, attempt);
}

/**
 * Wait for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a status is terminal (accepted/rejected)
 */
function isTerminalStatus(status: QuoteStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Get terminal status type
 */
function getTerminalStatusType(status: QuoteStatus): 'accepted' | 'rejected' | null {
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected') return 'rejected';
  return null;
}

/**
 * Validate status transition rules
 */
function validateStatusTransition(
  quote: Quote | undefined,
  sourceStatus: QuoteStatus | undefined,
  targetStatus: QuoteStatus | undefined
): StatusTransitionValidation {
  if (!quote || !sourceStatus || !targetStatus) {
    return { allowed: false, reason: 'Datos incompletos para validar transición' };
  }

  // Same status - no move needed
  if (sourceStatus === targetStatus) {
    return {
      allowed: false,
      reason: 'La cotización ya está en este estado',
      suggestedAction: 'already_there',
    };
  }

  // Check if quote is in a terminal state
  if (isTerminalStatus(quote.status)) {
    return {
      allowed: false,
      reason: `La cotización está ${quote.status === 'accepted' ? 'aceptada' : 'rechazada'}. Crea una revisión para modificarla.`,
      suggestedAction: 'revise_first',
    };
  }

  // Cannot drag to accepted - must use accept dialog
  if (targetStatus === 'accepted') {
    return {
      allowed: false,
      reason: 'Usa el botón "Aceptar" para marcar como aceptada',
      suggestedAction: 'use_accept_dialog',
    };
  }

  // Cannot drag to rejected - must use reject dialog
  if (targetStatus === 'rejected') {
    return {
      allowed: false,
      reason: 'Usa el botón "Rechazar" para marcar como rechazada',
      suggestedAction: 'use_reject_dialog',
    };
  }

  // Check if transition is valid according to workflow
  const validTargets = VALID_TRANSITIONS[sourceStatus] || [];
  if (!validTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `No se puede mover directamente de "${QUOTE_STATUS_LABELS[sourceStatus]}" a "${QUOTE_STATUS_LABELS[targetStatus]}"`,
    };
  }

  // Transition is allowed
  return { allowed: true };
}

// ============================================
// Hook Implementation
// ============================================

export function useQuotesKanban(
  options: UseQuotesKanbanOptions = {}
): UseQuotesKanbanReturn {
  const {
    onMoveSuccess,
    onMoveError,
    onTerminalStatusAttempt,
    enableUndo = true,
  } = options;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch quotes with backend max limit (100)
  // For Kanban, we typically want all quotes visible
  // TODO: Implement pagination if quotes exceed 100
  const {
    data: quotesData,
    isLoading,
    error,
    refetch,
  } = useQuotes({ limit: 100 });

  // Update mutation
  const updateQuoteMutation = useUpdateQuote();

  // Per-quote loading states
  const [movingIds, setMovingIds] = React.useState<Set<string>>(new Set());

  // Undo state
  const [undoState, setUndoState] = React.useState<UndoState | null>(null);

  // Extract quotes from response
  const quotes = quotesData?.data ?? [];

  // Organize quotes into columns
  const columns = React.useMemo<QuoteColumn[]>(() => {
    return QUOTE_KANBAN_COLUMNS.map((columnConfig) => {
      const columnQuotes = quotes.filter((q) => q.status === columnConfig.id);
      const totalValue = columnQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

      return {
        id: columnConfig.id,
        label: columnConfig.label,
        color: QUOTE_STATUS_COLORS[columnConfig.id],
        colorHex: columnConfig.colorHex,
        quotes: columnQuotes,
        count: columnQuotes.length,
        totalValue,
      };
    });
  }, [quotes]);

  // Calculate totals
  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);

  // Clear undo state after window expires
  React.useEffect(() => {
    if (!undoState) return;

    const timeout = setTimeout(() => {
      setUndoState(null);
    }, UNDO_WINDOW_MS);

    return () => clearTimeout(timeout);
  }, [undoState]);

  // Find quote by ID
  const findQuoteById = React.useCallback(
    (quoteId: string): Quote | undefined => {
      return quotes.find((q) => q.id === quoteId);
    },
    [quotes]
  );

  // Find column by quote ID
  const findColumnByQuoteId = React.useCallback(
    (quoteId: string): QuoteColumn | undefined => {
      return columns.find((column) =>
        column.quotes.some((q) => q.id === quoteId)
      );
    },
    [columns]
  );

  // Validate status transition
  const canMoveToStatus = React.useCallback(
    (quoteId: string, targetStatus: QuoteStatus): StatusTransitionValidation => {
      const quote = findQuoteById(quoteId);
      const currentColumn = findColumnByQuoteId(quoteId);

      return validateStatusTransition(
        quote,
        currentColumn?.id,
        targetStatus
      );
    },
    [findQuoteById, findColumnByQuoteId]
  );

  // Get transition message
  const getTransitionMessage = React.useCallback(
    (quoteId: string, targetStatus: QuoteStatus): string | null => {
      const validation = canMoveToStatus(quoteId, targetStatus);
      return validation.allowed ? null : (validation.reason ?? 'Transición no permitida');
    },
    [canMoveToStatus]
  );

  // Check if a specific quote is being moved
  const isQuoteMoving = React.useCallback(
    (quoteId: string): boolean => {
      return movingIds.has(quoteId);
    },
    [movingIds]
  );

  // Move to status with retry logic
  const moveToStatusWithRetry = React.useCallback(
    async (
      quoteId: string,
      targetStatus: QuoteStatus,
      attempt: number = 0
    ): Promise<void> => {
      try {
        // Note: Status updates require special handling via dedicated endpoints
        // For drag & drop, we use the generic update with status cast
        // TODO: Create dedicated updateStatus endpoint on backend
        await updateQuoteMutation.mutateAsync({
          quoteId,
          data: { status: targetStatus } as unknown as Parameters<typeof updateQuoteMutation.mutateAsync>[0]['data'],
        });
      } catch (error) {
        // Check if we should retry
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          await wait(delay);
          return moveToStatusWithRetry(quoteId, targetStatus, attempt + 1);
        }
        throw error;
      }
    },
    [updateQuoteMutation]
  );

  // Move to status handler with optimistic update
  const moveToStatus = React.useCallback(
    async (quoteId: string, targetStatus: QuoteStatus) => {
      // Find current quote
      const quote = findQuoteById(quoteId);
      const currentColumn = findColumnByQuoteId(quoteId);

      if (!quote || !currentColumn) return;

      // If same status, do nothing
      if (currentColumn.id === targetStatus) return;

      // Validate transition
      const validation = canMoveToStatus(quoteId, targetStatus);
      if (!validation.allowed) {
        // If attempting to move to terminal status, trigger callback
        if (validation.suggestedAction === 'use_accept_dialog' || validation.suggestedAction === 'use_reject_dialog') {
          const statusType = getTerminalStatusType(targetStatus);
          if (statusType) {
            onTerminalStatusAttempt?.(quote, statusType);
          }
        }

        // Don't show toast for "already there" - it's obvious
        if (validation.suggestedAction !== 'already_there') {
          toast({
            title: 'Acción no permitida',
            description: validation.reason,
            variant: 'destructive',
          });
        }
        return;
      }

      // Store source for undo
      const sourceStatus = currentColumn.id;

      // Mark as moving
      setMovingIds((prev) => new Set(prev).add(quoteId));

      // Optimistic update
      queryClient.setQueryData(
        quoteKeys.list({ limit: 500 }),
        (old: { data: Quote[]; meta: unknown } | undefined) => {
          if (!old) return old;

          const newQuotes = old.data.map((q) => {
            if (q.id === quoteId) {
              return { ...q, status: targetStatus };
            }
            return q;
          });

          return { ...old, data: newQuotes };
        }
      );

      // Find target column for toast message
      const targetColumn = QUOTE_KANBAN_COLUMNS.find((c) => c.id === targetStatus);

      // Call API with retry
      try {
        await moveToStatusWithRetry(quoteId, targetStatus);

        // Store undo state
        if (enableUndo) {
          setUndoState({
            quoteId,
            sourceStatus,
            targetStatus,
            timestamp: Date.now(),
          });
        }

        toast({
          title: 'Cotización movida',
          description: `Movida a "${targetColumn?.label || targetStatus}" exitosamente.`,
        });

        onMoveSuccess?.(quoteId, targetStatus);
      } catch (error) {
        // Rollback on error
        await queryClient.invalidateQueries({
          queryKey: quoteKeys.lists(),
        });

        const errorMessage =
          error instanceof Error ? error.message : 'Error desconocido';

        toast({
          title: 'Error al mover cotización',
          description: errorMessage,
          variant: 'destructive',
        });

        onMoveError?.(
          error instanceof Error ? error : new Error(errorMessage),
          quoteId
        );
      } finally {
        // Remove from moving set
        setMovingIds((prev) => {
          const next = new Set(prev);
          next.delete(quoteId);
          return next;
        });
      }
    },
    [
      findQuoteById,
      findColumnByQuoteId,
      canMoveToStatus,
      onTerminalStatusAttempt,
      toast,
      queryClient,
      moveToStatusWithRetry,
      enableUndo,
      onMoveSuccess,
      onMoveError,
    ]
  );

  // Undo last move
  const undoLastMove = React.useCallback(async () => {
    if (!undoState) return;

    const { quoteId, sourceStatus, timestamp } = undoState;

    // Check if still within undo window
    if (Date.now() - timestamp > UNDO_WINDOW_MS) {
      setUndoState(null);
      toast({
        title: 'No se puede deshacer',
        description: 'El tiempo para deshacer ha expirado.',
        variant: 'destructive',
      });
      return;
    }

    // Clear undo state immediately
    setUndoState(null);

    // Move back to source status
    await moveToStatus(quoteId, sourceStatus);

    toast({
      title: 'Movimiento deshecho',
      description: 'La cotización ha sido restaurada a su estado anterior.',
    });
  }, [undoState, moveToStatus, toast]);

  return {
    columns,
    quotes,
    isLoading,
    error: error as Error | null,
    isMoving: updateQuoteMutation.isPending || movingIds.size > 0,
    movingQuoteIds: movingIds,
    isQuoteMoving,
    totalQuotes,
    totalValue,
    moveToStatus,
    canMoveToStatus,
    getTransitionMessage,
    undoLastMove,
    canUndo: undoState !== null && Date.now() - undoState.timestamp < UNDO_WINDOW_MS,
    refetch,
  };
}

// ============================================
// Quote Selection Hook (for bulk operations)
// ============================================

export function useQuoteSelection() {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = React.useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedCount: selectedIds.size,
    hasSelection: selectedIds.size > 0,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
  };
}

export default useQuotesKanban;
