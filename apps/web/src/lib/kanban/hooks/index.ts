// ============================================
// Kanban Hooks - Enterprise CRM Module
// Version: 2.0.0
// ============================================

export { useWIPLimits, getWIPStatusClasses } from './use-wip-limits';
export type { UseWIPLimitsOptions, UseWIPLimitsReturn, WIPOverride } from './use-wip-limits';

export { useKanbanKeyboard } from './use-kanban-keyboard';
export type { UseKanbanKeyboardOptions, UseKanbanKeyboardReturn } from './use-kanban-keyboard';

export { useKanbanAnnouncements, KanbanLiveRegion } from './use-kanban-announcements';
export type { UseKanbanAnnouncementsOptions, UseKanbanAnnouncementsReturn, LiveRegionProps } from './use-kanban-announcements';

export { useKanbanBoard } from './use-kanban-board';
export type { UseKanbanBoardOptions, UseKanbanBoardReturn } from './use-kanban-board';

// API Hooks - Backend Integration
export {
  useKanbanMoveApi,
  useKanbanUndoApi,
  useKanbanRedoApi,
  useKanbanConfigApi,
  useUpdateKanbanConfigApi,
  useKanbanItemHistoryApi,
  useKanbanBoardHistoryApi,
  useKanbanLockApi,
  useKanbanMetricsApi,
} from './use-kanban-api';
export type { UseKanbanMoveApiOptions } from './use-kanban-api';
