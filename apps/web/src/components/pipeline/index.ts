/**
 * Pipeline Components - Unified Design System
 *
 * Centralized components for all pipeline/kanban views:
 * - Leads Pipeline
 * - Opportunities Pipeline
 * - Customers Lifecycle
 *
 * @module components/pipeline
 */

// Design Tokens
export * from './tokens';

// Components
export { PipelineColumn } from './PipelineColumn';
export type { PipelineColumnProps, PipelineStage } from './PipelineColumn';

export {
  PipelineColumnHeader,
  PipelineColumnHeaderCompact,
} from './PipelineColumnHeader';
export type { PipelineColumnHeaderProps } from './PipelineColumnHeader';

export {
  PipelineColumnEmptyState,
  PipelineColumnEmptyStateCompact,
} from './PipelineColumnEmptyState';
export type {
  PipelineColumnEmptyStateProps,
  PipelineType,
} from './PipelineColumnEmptyState';
