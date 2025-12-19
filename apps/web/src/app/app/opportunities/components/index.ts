/**
 * Opportunities Components Index
 *
 * Central export point for all opportunity components.
 * Follows clean architecture patterns from leads module.
 */

// ============================================
// Kanban Components
// ============================================

export {
  OpportunityKanbanCard,
  OpportunityKanbanColumn,
  OpportunityKanbanBoard,
} from './kanban';
export type {
  OpportunityKanbanCardProps,
  OpportunityKanbanColumnProps,
  OpportunityKanbanBoardProps,
} from './kanban';

// ============================================
// Indicator Components
// ============================================

export {
  OpportunityProbabilityIndicator,
  OpportunityProbabilityBar,
} from './OpportunityProbabilityIndicator';
export type {
  OpportunityProbabilityIndicatorProps,
  OpportunityProbabilityBarProps,
} from './OpportunityProbabilityIndicator';

// ============================================
// Dashboard Components
// ============================================

export { OpportunitiesKPIDashboard } from './OpportunitiesKPIDashboard';
export type {
  OpportunitiesKPIDashboardProps,
  OpportunityKPIFilter,
} from './OpportunitiesKPIDashboard';

// ============================================
// Preview & Detail Components
// ============================================

export { OpportunityPreviewPanel } from './OpportunityPreviewPanel';
export type { OpportunityPreviewPanelProps } from './OpportunityPreviewPanel';

// ============================================
// Empty State Components
// ============================================

export { OpportunitiesEmptyState } from './OpportunitiesEmptyState';
export type { OpportunitiesEmptyStateProps } from './OpportunitiesEmptyState';

// ============================================
// Skeleton Components
// ============================================

export {
  OpportunityKPICardSkeleton,
  OpportunitiesKPIDashboardSkeleton,
  OpportunityKanbanCardSkeleton,
  OpportunityKanbanColumnSkeleton,
  OpportunityKanbanBoardSkeleton,
  OpportunityPreviewPanelSkeleton,
  OpportunitiesPageSkeleton,
} from './OpportunitiesSkeleton';

// ============================================
// Form Components (existing)
// ============================================

export { OpportunityFormDialog } from './opportunity-form-dialog';
export { WinLostDialog } from './win-lost-dialog';
