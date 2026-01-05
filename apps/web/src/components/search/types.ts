/**
 * Search Types - Ventazo Design System 2025
 *
 * Type definitions for the modular search system
 *
 * @module components/search/types
 */

import type { SearchResultItem as SearchResultItemType } from '@/lib/search';

// ============================================
// Component Variants
// ============================================

/** Search dialog variant based on viewport */
export type SearchVariant = 'bottom-sheet' | 'modal';

/** Search input size */
export type SearchSize = 'sm' | 'md' | 'lg';

/** Entity filter type */
export type EntityFilter = 'all' | 'lead' | 'customer' | 'opportunity' | 'task' | 'contact';

// ============================================
// Configuration Types
// ============================================

/** Search UI configuration */
export interface SearchUIConfig {
  /** Current variant (auto-detected based on viewport) */
  variant: SearchVariant;
  /** Is mobile viewport */
  isMobile: boolean;
  /** Is tablet viewport */
  isTablet: boolean;
  /** Is desktop viewport */
  isDesktop: boolean;
  /** Animation duration in ms */
  animationDuration: number;
  /** Touch target size */
  touchTargetSize: 'default' | 'large';
}

/** Search dialog props */
export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  locale?: 'es' | 'en';
}

// ============================================
// Primitive Component Props
// ============================================

/** Search input props */
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  isLoading?: boolean;
  placeholder?: string;
  size?: SearchSize;
  autoFocus?: boolean;
  showKeyboardHint?: boolean;
  accentColor?: string;
}

/** Search filters props */
export interface SearchFiltersProps {
  activeFilter: EntityFilter;
  onFilterChange: (filter: EntityFilter) => void;
  locale?: 'es' | 'en';
  accentColor?: string;
}

/** Search results props */
export interface SearchResultsProps {
  results: SearchResultItemType[];
  selectedIndex: number;
  onSelect: (result: SearchResultItemType) => void;
  onHover: (index: number) => void;
  totalResults: number;
  executionTimeMs: number;
  isLoading: boolean;
  locale?: 'es' | 'en';
  accentColor?: string;
}

/** Search result item props */
export interface SearchResultItemProps {
  result: SearchResultItemType;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  locale?: 'es' | 'en';
  accentColor?: string;
}

/** Search empty state props */
export interface SearchEmptyStateProps {
  query: string;
  onSuggestionClick: (suggestion: string) => void;
  locale?: 'es' | 'en';
  accentColor?: string;
}

/** Search recent list props */
export interface SearchRecentListProps {
  searches: Array<{
    id: string;
    query: string;
    resultCount: number;
    searchedAt: Date;
  }>;
  onSelect: (search: { query: string }) => void;
  locale?: 'es' | 'en';
}

/** Search footer props */
export interface SearchFooterProps {
  locale?: 'es' | 'en';
}

// ============================================
// Entity Configuration
// ============================================

/** Entity filter config */
export interface EntityFilterConfig {
  id: EntityFilter;
  labelEs: string;
  labelEn: string;
  icon: string;
  color: string;
}

/** Entity display info */
export interface EntityDisplayInfo {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
}

// ============================================
// Animation Types
// ============================================

/** Bottom sheet animation state */
export type BottomSheetState = 'closed' | 'opening' | 'open' | 'closing';

/** Modal animation state */
export type ModalState = 'closed' | 'opening' | 'open' | 'closing';
