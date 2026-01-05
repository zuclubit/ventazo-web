'use client';

/**
 * useViewMode Hook - Ventazo Design System 2025
 *
 * @description Centralized hook for managing view modes with localStorage persistence.
 *
 * @features
 * - Module-specific view mode management
 * - LocalStorage persistence
 * - SSR-safe with hydration handling
 * - Type-safe per module
 *
 * @example
 * ```tsx
 * // In leads page
 * const { viewMode, setViewMode, isMode } = useViewMode('leads');
 *
 * // In tasks page
 * const { viewMode, setViewMode } = useViewMode('tasks');
 * ```
 *
 * @version 1.0.0
 */

import * as React from 'react';
import {
  MODULE_VIEW_MODES,
  type ModuleName,
  type ViewMode,
  type UseViewModeReturn,
  type LeadViewMode,
  type OpportunityViewMode,
  type CustomerViewMode,
  type TaskViewMode,
  type QuoteViewMode,
} from './types';

// ============================================
// Type-safe Module View Mode Map
// ============================================

type ModuleViewModeMap = {
  leads: LeadViewMode;
  opportunities: OpportunityViewMode;
  customers: CustomerViewMode;
  tasks: TaskViewMode;
  quotes: QuoteViewMode;
};

// ============================================
// Storage Utilities
// ============================================

function getStoredViewMode<T extends ViewMode>(
  key: string,
  availableModes: readonly T[],
  defaultMode: T
): T {
  if (typeof window === 'undefined') {
    return defaultMode;
  }

  try {
    const stored = localStorage.getItem(key);
    if (stored && availableModes.includes(stored as T)) {
      return stored as T;
    }
  } catch {
    // localStorage not available
  }

  return defaultMode;
}

function setStoredViewMode(key: string, mode: ViewMode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, mode);
  } catch {
    // localStorage not available
  }
}

// ============================================
// useViewMode Hook
// ============================================

/**
 * Hook for managing view mode state with persistence
 *
 * @param module - Module name (leads, opportunities, customers, tasks, quotes)
 * @returns View mode state and helpers
 */
export function useViewMode<M extends ModuleName>(
  module: M
): UseViewModeReturn<ModuleViewModeMap[M]> {
  type ModeType = ModuleViewModeMap[M];

  const config = MODULE_VIEW_MODES[module];
  const { availableModes, defaultMode, storageKey } = config;

  // State with lazy initialization
  const [viewMode, setViewModeState] = React.useState<ModeType>(() =>
    getStoredViewMode(storageKey, availableModes as readonly ModeType[], defaultMode as ModeType)
  );

  // Hydration flag
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Handle hydration
  React.useEffect(() => {
    const stored = getStoredViewMode(
      storageKey,
      availableModes as readonly ModeType[],
      defaultMode as ModeType
    );
    setViewModeState(stored);
    setIsHydrated(true);
  }, [storageKey, availableModes, defaultMode]);

  // Set view mode with persistence
  const setViewMode = React.useCallback(
    (mode: ModeType) => {
      if (!availableModes.includes(mode as never)) {
        console.warn(`Invalid view mode "${mode}" for module "${module}"`);
        return;
      }

      setViewModeState(mode);
      setStoredViewMode(storageKey, mode);
    },
    [storageKey, availableModes, module]
  );

  // Check if mode is active
  const isMode = React.useCallback(
    (mode: ModeType) => viewMode === mode,
    [viewMode]
  );

  // Reset to default
  const resetMode = React.useCallback(() => {
    setViewMode(defaultMode as ModeType);
  }, [setViewMode, defaultMode]);

  // Return consistent type during SSR
  const effectiveMode = isHydrated ? viewMode : (defaultMode as ModeType);

  return {
    viewMode: effectiveMode,
    setViewMode,
    availableModes: availableModes as ModeType[],
    isMode,
    resetMode,
  };
}

// ============================================
// Convenience Hooks (Type-safe per module)
// ============================================

/**
 * Hook for leads view mode
 */
export function useLeadsViewMode() {
  return useViewMode('leads');
}

/**
 * Hook for opportunities view mode
 */
export function useOpportunitiesViewMode() {
  return useViewMode('opportunities');
}

/**
 * Hook for customers view mode
 */
export function useCustomersViewMode() {
  return useViewMode('customers');
}

/**
 * Hook for tasks view mode
 */
export function useTasksViewMode() {
  return useViewMode('tasks');
}

/**
 * Hook for quotes view mode
 */
export function useQuotesViewMode() {
  return useViewMode('quotes');
}
