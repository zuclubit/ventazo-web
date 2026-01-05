/**
 * Opportunities Hooks Index
 *
 * Central export point for all opportunity hooks.
 */

export {
  useOpportunityKanban,
  useWinLostDialog,
  useOpportunitySelection,
} from './useOpportunityKanban';
export type {
  UseOpportunityKanbanOptions,
  UseOpportunityKanbanReturn,
  WinLostDialogState,
} from './useOpportunityKanban';

// Theme Hook
export {
  useOpportunityTheme,
  OpportunityThemeProvider,
  useOpportunityThemeContext,
} from './useOpportunityTheme';
export type {
  OpportunityTheme,
  ProbabilityTheme,
  OpportunityCardTheme,
  PipelineStageConfig,
} from './useOpportunityTheme';
