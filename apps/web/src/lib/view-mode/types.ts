/**
 * ViewMode Types - Ventazo Design System 2025
 *
 * @description Standardized view mode definitions for CRM modules.
 *
 * @version 1.0.0
 */

// ============================================
// View Mode Types
// ============================================

/**
 * Standard view modes available across modules
 */
export type ViewMode = 'list' | 'grid' | 'compact' | 'kanban';

/**
 * Module-specific view modes (some modules don't support all modes)
 */
export type LeadViewMode = 'list' | 'grid' | 'kanban';
export type OpportunityViewMode = 'list' | 'grid' | 'kanban';
export type CustomerViewMode = 'list' | 'grid';
export type TaskViewMode = 'list' | 'kanban';
export type QuoteViewMode = 'list' | 'grid';

/**
 * View mode configuration for a module
 */
export interface ViewModeConfig {
  /** Current view mode */
  mode: ViewMode;
  /** Available modes for this module */
  availableModes: ViewMode[];
  /** Default mode */
  defaultMode: ViewMode;
  /** LocalStorage key */
  storageKey: string;
}

/**
 * View mode hook return type
 */
export interface UseViewModeReturn<T extends ViewMode = ViewMode> {
  /** Current view mode */
  viewMode: T;
  /** Set view mode */
  setViewMode: (mode: T) => void;
  /** Available modes */
  availableModes: T[];
  /** Check if a mode is active */
  isMode: (mode: T) => boolean;
  /** Reset to default mode */
  resetMode: () => void;
}

// ============================================
// View Mode Display Config
// ============================================

/**
 * Display configuration for each view mode
 */
export interface ViewModeDisplayConfig {
  /** Icon name (for lucide-react) */
  icon: 'List' | 'LayoutGrid' | 'Columns' | 'AlignJustify';
  /** Label in Spanish */
  label: string;
  /** Description */
  description: string;
}

export const VIEW_MODE_DISPLAY: Record<ViewMode, ViewModeDisplayConfig> = {
  list: {
    icon: 'List',
    label: 'Lista',
    description: 'Vista de lista detallada',
  },
  grid: {
    icon: 'LayoutGrid',
    label: 'Cuadrícula',
    description: 'Vista de tarjetas en cuadrícula',
  },
  compact: {
    icon: 'AlignJustify',
    label: 'Compacta',
    description: 'Vista compacta con más elementos',
  },
  kanban: {
    icon: 'Columns',
    label: 'Kanban',
    description: 'Vista de tablero Kanban',
  },
};

// ============================================
// Module View Mode Presets
// ============================================

/**
 * Predefined view mode configurations per module
 */
export const MODULE_VIEW_MODES = {
  leads: {
    availableModes: ['kanban', 'list', 'grid'] as LeadViewMode[],
    defaultMode: 'kanban' as LeadViewMode,
    storageKey: 'leads-view-mode',
  },
  opportunities: {
    availableModes: ['kanban', 'list', 'grid'] as OpportunityViewMode[],
    defaultMode: 'kanban' as OpportunityViewMode,
    storageKey: 'opportunities-view-mode',
  },
  customers: {
    availableModes: ['list', 'grid'] as CustomerViewMode[],
    defaultMode: 'list' as CustomerViewMode,
    storageKey: 'customers-view-mode',
  },
  tasks: {
    availableModes: ['kanban', 'list'] as TaskViewMode[],
    defaultMode: 'kanban' as TaskViewMode,
    storageKey: 'tasks-view-mode',
  },
  quotes: {
    availableModes: ['list', 'grid'] as QuoteViewMode[],
    defaultMode: 'list' as QuoteViewMode,
    storageKey: 'quotes-view-mode',
  },
} as const;

export type ModuleName = keyof typeof MODULE_VIEW_MODES;
