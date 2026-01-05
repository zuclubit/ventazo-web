/**
 * Quote Components - Public API
 *
 * @module components
 */

// Base Components
export { QuoteStatusBadge } from './QuoteStatusBadge';
export { QuoteCard, QuoteCardSkeleton } from './QuoteCard';
export { QuotesEmptyState } from './QuotesEmptyState';

// V3 Components
export {
  QuoteCardV3,
  QuoteCardV3Skeleton,
  QuoteCardV3Overlay,
  type QuoteCardV3Props,
} from './QuoteCardV3';
export { QuotesKPICards, type QuotesKPICardsProps } from './QuotesKPICards';
export { QuotesToolbar, type QuotesToolbarProps, type QuoteViewMode, type DateRangeFilter } from './QuotesToolbar';

// Detail Sheet
export { QuoteDetailSheet, type QuoteDetailSheetProps } from './QuoteDetailSheet';

// Create/Edit Sheet
export { QuoteCreateSheet, type QuoteCreateSheetProps } from './QuoteCreateSheet';

// Send Dialog
export { QuoteSendDialog, type QuoteSendDialogProps } from './QuoteSendDialog';

// Line Items Editor
export { LineItemsEditor, type LineItemsEditorProps, type LineItem } from './LineItemsEditor';

// List View
export { QuotesListView, type QuotesListViewProps } from './QuotesListView';

// Kanban Components
export { QuoteKanbanBoard, type QuoteKanbanBoardProps } from './kanban';
export { QuoteKanbanColumn, type QuoteKanbanColumnProps } from './kanban';

// PDF Actions with Template Selection
export { QuotePdfActions } from './QuotePdfActions';

// Quick Actions (Mobile-optimized)
export { QuoteQuickActions } from './QuoteQuickActions';
