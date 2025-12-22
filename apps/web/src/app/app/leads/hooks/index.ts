/**
 * Leads Module Hooks
 * @module app/leads/hooks
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
} from './useKanbanTheme';
