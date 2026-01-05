/**
 * Leads Module Hooks
 * @module app/leads/hooks
 *
 * Comprehensive dynamic theming system for Kanban board v4.0
 * All colors are controlled via CSS variables for tenant customization
 *
 * v2.0 - Homologated with Opportunities module patterns
 * v2.1 - Added optimistic mutation hooks (P0/P1 fixes)
 *
 * @see docs/LEAD_KANBAN_ACTIONS_AUDIT.md
 * @see docs/REMEDIATION_PLAN.md
 */

// Re-export from useKanbanTheme.tsx (JSX required for Provider component)
export {
  useKanbanTheme,
  useKanbanThemeContext,
  useKanbanThemeOptional,
  KanbanThemeProvider,
  // Color utility exports
  hexToRgb,
  hexToRgba,
  getLuminance,
  getOptimalTextColor,
  lightenColor,
  darkenColor,
  blendColors,
  rgbToHsl,
} from './useKanbanTheme';

export type {
  KanbanTheme,
  StageColorConfig,
  ScoreTheme,
  CardTheme,
  ActionTheme,
} from './useKanbanTheme';

// Re-export from useLeadsKanban.ts (Homologated with Opportunities)
export {
  useLeadsKanban,
  useLeadSelection,
} from './useLeadsKanban';

export type {
  UseLeadsKanbanOptions,
  UseLeadsKanbanReturn,
  StageTransitionValidation,
} from './useLeadsKanban';

// ============================================
// Optimistic Mutation Hooks (P0/P1 Fixes)
// ============================================

/**
 * useOptimisticDelete - Optimistic delete with undo capability
 * P0 Fix: Card disappears immediately, 5s undo window, API call after
 */
export { useOptimisticDelete } from './useOptimisticDelete';

/**
 * useOptimisticCreate - Optimistic create with temp ID
 * P1 Fix: Card appears immediately with pulsing style, form closes instantly
 */
export { useOptimisticCreate } from './useOptimisticCreate';

/**
 * useOptimisticEdit - Optimistic edit with rollback
 * P1 Fix: Changes appear immediately, view mode switches instantly
 */
export { useOptimisticEdit } from './useOptimisticEdit';
