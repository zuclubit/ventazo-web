/**
 * Leads Module Components
 *
 * Redesigned components for the leads management module.
 * Features glassmorphism styling, quick actions, and AI integration.
 */

// Score Indicator
export { LeadScoreIndicator, LeadScoreBar } from './LeadScoreIndicator';
export type { LeadScoreIndicatorProps, LeadScoreBarProps } from './LeadScoreIndicator';

// Quick Actions
export { QuickActionsBar, QuickActionsDropdown } from './QuickActionsBar';
export type { QuickActionsBarProps, QuickActionsDropdownProps, QuickActionType } from './QuickActionsBar';

// KPI Cards
export { SmartKPICard, KPICardGrid } from './SmartKPICard';
export type { SmartKPICardProps, KPICardGridProps } from './SmartKPICard';

// Lead Card
export { LeadCard } from './LeadCard';
export type { LeadCardProps } from './LeadCard';

// Lead Card V3 - AI Score Prominence Design
export { LeadCardV3, LeadCardV3Skeleton, LeadCardV3Overlay } from './LeadCardV3';
export type { LeadCardV3Props, CardVariant, ScoreLevel, ActionVariant } from './LeadCardV3';

// KPI Dashboard
export { LeadsKPIDashboard } from './LeadsKPIDashboard';
export type { LeadsKPIDashboardProps, LeadsFilter } from './LeadsKPIDashboard';

// Preview Panel
export { LeadPreviewPanel } from './LeadPreviewPanel';
export type { LeadPreviewPanelProps } from './LeadPreviewPanel';

// Filters
export { LeadFiltersBar, defaultFilters } from './LeadFiltersBar';
export type { LeadFiltersBarProps, LeadFilters } from './LeadFiltersBar';

// Empty State
export { LeadsEmptyState } from './LeadsEmptyState';
export type { LeadsEmptyStateProps } from './LeadsEmptyState';

// Skeleton Loading States
export {
  KPICardsSkeleton,
  LeadCardSkeleton,
  LeadListSkeleton,
  FiltersBarSkeleton,
  LeadsPageSkeleton,
  LeadsHeaderSkeleton,
} from './LeadsSkeleton';

// Lead Form Sheet (Responsive Side Panel)
export { LeadFormSheet } from './LeadFormSheet';
export type { LeadFormSheetProps } from './LeadFormSheet';

// Re-export existing dialog components for convenience
export { LeadFormDialog } from './lead-form-dialog';
export { DeleteLeadDialog } from './delete-lead-dialog';
export { ConvertLeadDialog } from './convert-lead-dialog';

// Kanban Components
export {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  KanbanColumnHeader,
  KanbanEmptyColumn,
  KanbanSkeleton,
} from './kanban';

// KPI Bar (Pipeline Dashboard)
export { LeadsKPIBar } from './LeadsKPIBar';
export type { LeadsKPIBarProps, KPIFilterType } from './LeadsKPIBar';
