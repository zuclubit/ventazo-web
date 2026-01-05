/**
 * ViewMode Module - Ventazo Design System 2025
 *
 * @description Centralized view mode management system for CRM modules.
 *
 * @exports
 * - Types: ViewMode, ModuleName, UseViewModeReturn
 * - Hooks: useViewMode, useLeadsViewMode, useTasksViewMode, etc.
 * - Components: ViewModeToggle, ViewModeButton
 * - Layouts: ViewModeLayout, GridLayout, ListLayout, KanbanLayout
 * - Constants: VIEW_MODE_DISPLAY, MODULE_VIEW_MODES
 *
 * @example
 * ```tsx
 * import { useLeadsViewMode, ViewModeToggle, ViewModeLayout } from '@/lib/view-mode';
 *
 * function LeadsPage() {
 *   const { viewMode, setViewMode, availableModes } = useLeadsViewMode();
 *
 *   return (
 *     <>
 *       <ViewModeToggle
 *         value={viewMode}
 *         modes={availableModes}
 *         onChange={setViewMode}
 *       />
 *       <ViewModeLayout mode={viewMode}>
 *         {leads.map(lead => <LeadCard key={lead.id} {...lead} />)}
 *       </ViewModeLayout>
 *     </>
 *   );
 * }
 * ```
 *
 * @version 1.0.0
 */

// Types
export {
  type ViewMode,
  type LeadViewMode,
  type OpportunityViewMode,
  type CustomerViewMode,
  type TaskViewMode,
  type QuoteViewMode,
  type ViewModeConfig,
  type UseViewModeReturn,
  type ViewModeDisplayConfig,
  type ModuleName,
  VIEW_MODE_DISPLAY,
  MODULE_VIEW_MODES,
} from './types';

// Hooks
export {
  useViewMode,
  useLeadsViewMode,
  useOpportunitiesViewMode,
  useCustomersViewMode,
  useTasksViewMode,
  useQuotesViewMode,
} from './use-view-mode';

// Components
export {
  ViewModeToggle,
  ViewModeButton,
  type ViewModeToggleProps,
  type ViewModeButtonProps,
} from './view-mode-toggle';

// Layouts
export {
  ViewModeLayout,
  GridLayout,
  ListLayout,
  CompactLayout,
  KanbanLayout,
  KanbanColumn,
  getLayoutClassNames,
  type ViewModeLayoutProps,
  type GridLayoutProps,
  type ListLayoutProps,
  type KanbanLayoutProps,
  type KanbanColumnProps,
} from './view-mode-layouts';
