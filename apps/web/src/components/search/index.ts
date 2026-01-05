/**
 * Search Components - Ventazo Design System 2025
 *
 * Modular, responsive search system with:
 * - Bottom sheet on mobile (slides from bottom)
 * - Centered modal on desktop
 * - Clean architecture with reusable primitives
 *
 * @module components/search
 */

// Main component
export { GlobalSearchDialog } from './GlobalSearchDialog';

// Primitives (for custom implementations)
export { SearchInput } from './primitives/SearchInput';
export { SearchFilters } from './primitives/SearchFilters';
export { SearchResults } from './primitives/SearchResults';
export { SearchResultItem } from './primitives/SearchResultItem';
export { SearchEmptyState } from './primitives/SearchEmptyState';
export { SearchRecentList } from './primitives/SearchRecentList';
export { SearchFooter } from './primitives/SearchFooter';

// Hooks
export { useSearchUI, useIsBottomSheet, useViewportType } from './hooks/useSearchUI';

// Types
export type {
  SearchUIConfig,
  SearchVariant,
  SearchSize,
  EntityFilter,
  SearchDialogProps,
  SearchInputProps,
  SearchFiltersProps,
  SearchResultsProps,
  SearchResultItemProps,
  SearchEmptyStateProps,
  SearchRecentListProps,
  SearchFooterProps,
} from './types';
