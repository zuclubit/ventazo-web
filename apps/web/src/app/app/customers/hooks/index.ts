/**
 * Customers Module Hooks
 * @module app/customers/hooks
 *
 * Comprehensive hook system for Customer Lifecycle Kanban v1.0
 * Includes theming, health calculation, and drag-drop orchestration
 */

// ============================================
// Theme Hooks
// ============================================

export {
  useCustomerTheme,
  useCustomerThemeContext,
  useCustomerThemeOptional,
  CustomerThemeProvider,
  // Color utilities
  hexToRgb,
  hexToRgba,
  getLuminance,
  getOptimalTextColor,
  lightenColor,
  darkenColor,
} from './useCustomerTheme';

export type {
  CustomerTheme,
  CustomerCardTheme,
  CustomerActionTheme,
  LifecycleStageConfig,
  TierTheme,
  HealthTheme,
} from './useCustomerTheme';

// ============================================
// Health Calculation Hooks
// ============================================

export {
  useCustomerHealth,
} from './useCustomerHealth';

export type {
  HealthLevel,
  HealthFactors,
  CustomerHealthResult,
  CustomerHealthHook,
} from './useCustomerHealth';

// ============================================
// Drag and Drop Hooks
// ============================================

export {
  useCustomerKanbanDragDrop,
} from './useCustomerKanbanDragDrop';

export type {
  UseCustomerKanbanDragDropOptions,
  UseCustomerKanbanDragDropReturn,
} from './useCustomerKanbanDragDrop';
