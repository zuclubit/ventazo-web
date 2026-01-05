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

// New unified detail sheet (matches LeadDetailSheet pattern)
export { OpportunityDetailSheet } from './OpportunityDetailSheet';
export type { OpportunityDetailSheetProps } from './OpportunityDetailSheet';

// ============================================
// Card Components (V3 - Premium Design)
// ============================================

export { OpportunityCardV3, OpportunityCardV3Skeleton, OpportunityCardV3Overlay } from './OpportunityCardV3';
export type { OpportunityCardV3Props } from './OpportunityCardV3';

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
// Form Components
// ============================================

// Premium Sheet (v1.0 - 2025 World-Class, homologated with LeadFormSheet)
export { OpportunityFormSheet } from './opportunity-form-sheet';
export type { OpportunityFormSheetProps } from './opportunity-form-sheet';

// Legacy Dialog (deprecated - use OpportunityFormSheet instead)
export { OpportunityFormDialog } from './opportunity-form-dialog';

export { WinLostDialog } from './win-lost-dialog';
