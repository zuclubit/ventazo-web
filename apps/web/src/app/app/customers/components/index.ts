/**
 * Customer Components
 * @module components
 *
 * Complete component library for Customer Lifecycle Kanban.
 */

// ============================================
// Kanban System
// ============================================

export {
  CustomerKanbanBoard,
  useCustomerLifecycleColumns,
  CustomerKanbanColumn,
  CustomerKanbanColumnHeader,
  CustomerKanbanEmptyColumn,
  CustomerKanbanSkeleton,
} from './kanban';

export type {
  CustomerKanbanBoardProps,
  CustomerKanbanColumnProps,
  CustomerKanbanColumnHeaderProps,
  CustomerKanbanEmptyColumnProps,
  CustomerKanbanSkeletonProps,
  LifecycleColumn,
} from './kanban';

// ============================================
// Card System
// ============================================

export { CustomerCard, CustomerCardOverlay, CustomerCardSkeleton } from './CustomerCard';
export type { CustomerCardProps } from './CustomerCard';

// ============================================
// Indicators & Badges
// ============================================

export { CustomerHealthIndicator, CustomerHealthBadge } from './CustomerHealthIndicator';
export type { CustomerHealthIndicatorProps, CustomerHealthBadgeProps } from './CustomerHealthIndicator';

export { CustomerTierBadge, TierSelector } from './CustomerTierBadge';
export type { CustomerTierBadgeProps, TierSelectorProps } from './CustomerTierBadge';

// ============================================
// Actions
// ============================================

export { CustomerQuickActions, WebsiteButton } from './CustomerQuickActions';
export type { CustomerQuickActionsProps, WebsiteButtonProps } from './CustomerQuickActions';

// ============================================
// Empty State
// ============================================

export { CustomersEmptyState } from './CustomersEmptyState';
export type { CustomersEmptyStateProps } from './CustomersEmptyState';

// ============================================
// Detail Sheet
// ============================================

export { CustomerDetailSheet } from './CustomerDetailSheet';
export type { CustomerDetailSheetProps } from './CustomerDetailSheet';

// ============================================
// Form Sheet (v1.0 - 2025 World-Class, homologated with LeadFormSheet)
// ============================================

export { CustomerFormSheet } from './CustomerFormSheet';
export type { CustomerFormSheetProps } from './CustomerFormSheet';

// ============================================
// Existing Components (keep for backwards compatibility)
// ============================================

export { DeleteCustomerDialog } from './delete-customer-dialog';

// Legacy Dialog (deprecated - use CustomerFormSheet instead)
export { CustomerFormDialog } from './customer-form-dialog';
