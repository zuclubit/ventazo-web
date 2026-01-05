/**
 * Tasks Module Components
 *
 * Centralized exports for the tasks management module.
 * Includes Sheet components, Kanban components, empty states, and dialogs.
 *
 * @version 2.0.0 - Added Sheet components for homologated modal behavior
 */

// Empty State
export { TasksEmptyState } from './TasksEmptyState';
export type { TasksEmptyStateProps } from './TasksEmptyState';

// Skeleton Loading States
export { TaskKanbanBoardSkeleton } from './TasksSkeleton';

// Sheet Components (New - Homologated with Quotes module)
export { TaskDetailSheet } from './TaskDetailSheet';
export type { TaskDetailSheetProps } from './TaskDetailSheet';
export { TaskCreateSheet } from './TaskCreateSheet';
export type { TaskCreateSheetProps } from './TaskCreateSheet';

// Dialogs (Legacy - kept for backwards compatibility)
export { TaskFormDialog } from './task-form-dialog';
export { DeleteTaskDialog } from './delete-task-dialog';
export { CompleteTaskDialog } from './complete-task-dialog';

// Kanban Components
export { TaskKanbanBoard } from './kanban';
