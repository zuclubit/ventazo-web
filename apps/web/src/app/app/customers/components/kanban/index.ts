/**
 * Customer Kanban Components
 * @module components/kanban
 *
 * Kanban board system for Customer Lifecycle management.
 * Stages: PROSPECT → ONBOARDING → ACTIVE → AT_RISK → RENEWAL → CHURNED
 */

// Board
export { CustomerKanbanBoard, useCustomerLifecycleColumns } from './CustomerKanbanBoard';
export type { CustomerKanbanBoardProps, UseCustomerLifecycleColumnsOptions } from './CustomerKanbanBoard';

// Column
export { CustomerKanbanColumn } from './CustomerKanbanColumn';
export type { CustomerKanbanColumnProps, LifecycleColumn } from './CustomerKanbanColumn';

// Column Header
export { CustomerKanbanColumnHeader } from './CustomerKanbanColumnHeader';
export type { CustomerKanbanColumnHeaderProps } from './CustomerKanbanColumnHeader';

// Empty Column
export { CustomerKanbanEmptyColumn } from './CustomerKanbanEmptyColumn';
export type { CustomerKanbanEmptyColumnProps } from './CustomerKanbanEmptyColumn';

// Skeleton
export { CustomerKanbanSkeleton } from './CustomerKanbanSkeleton';
export type { CustomerKanbanSkeletonProps } from './CustomerKanbanSkeleton';
