/**
 * Quotes Module Hooks
 *
 * Custom hooks for quote Kanban management, theming, and state.
 *
 * @module quotes/hooks
 */

// Kanban management
export {
  useQuotesKanban,
  useQuoteSelection,
  type UseQuotesKanbanOptions,
  type UseQuotesKanbanReturn,
  type StatusTransitionValidation,
  type QuoteColumn,
  QUOTE_KANBAN_COLUMNS,
} from './useQuotesKanban';

// Theming
export {
  useQuoteTheme,
  useQuoteThemeContext,
  useQuoteThemeOptional,
  QuoteThemeProvider,
  type QuoteTheme,
  type StatusColorConfig,
  type QuoteCardTheme,
  type UrgencyTheme,
} from './useQuoteTheme';
