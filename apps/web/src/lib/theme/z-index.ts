/**
 * Z-Index System - Ventazo Design System 2025
 *
 * Centralized z-index tokens following industry best practices for 2025-2026.
 * This system ensures proper stacking order across all UI layers.
 *
 * Architecture:
 * - Semantic naming for clarity
 * - Clear hierarchy with defined gaps for flexibility
 * - Mobile-first considerations (bottom bar, sheets, etc.)
 * - Accessibility: overlays always above navigation
 *
 * Layer Stack (bottom to top):
 * 1. Base content (auto/0)
 * 2. Sticky elements (10-19)
 * 3. Dropdowns/Popovers (20-29)
 * 4. Fixed navigation (30-39)
 * 5. Floating actions (40-49)
 * 6. Modal overlays (50-59)
 * 7. Modal content (60-69)
 * 8. Alert dialogs (70-79)
 * 9. Toasts/Notifications (80-89)
 * 10. Global overlays (90-99)
 * 11. Dev tools (100+)
 *
 * @module lib/theme/z-index
 * @version 1.0.0
 */

export const zIndex = {
  // ============================================
  // Base Layer (0-9)
  // ============================================
  /** Default stacking context */
  base: 0,
  /** Slightly elevated content */
  raised: 1,

  // ============================================
  // Sticky Elements (10-19)
  // ============================================
  /** Sticky table headers, list headers */
  sticky: 10,
  /** Sticky sidebar headers */
  stickyHeader: 15,

  // ============================================
  // Dropdowns & Popovers (20-29)
  // ============================================
  /** Dropdown menus, select menus */
  dropdown: 20,
  /** Popovers, tooltips */
  popover: 25,
  /** Autocomplete suggestions */
  autocomplete: 28,

  // ============================================
  // Fixed Navigation (30-39)
  // ============================================
  /** Desktop sidebar */
  sidebar: 30,
  /** Mobile bottom navigation bar */
  bottomBar: 35,
  /** Fixed header/app bar */
  appBar: 38,

  // ============================================
  // Floating Actions (40-49)
  // ============================================
  /** Floating action buttons (FAB) */
  fab: 40,
  /** Floating panels, mini-players */
  floatingPanel: 45,

  // ============================================
  // Modal Overlays (50-59)
  // ============================================
  /** Sheet/drawer overlay (backdrop) */
  sheetOverlay: 50,
  /** Modal overlay (backdrop) */
  modalOverlay: 55,

  // ============================================
  // Modal Content (60-69)
  // ============================================
  /** Sheet/drawer content */
  sheet: 60,
  /** Standard modal content */
  modal: 65,

  // ============================================
  // Alert Dialogs (70-79)
  // ============================================
  /** Alert dialog overlay */
  alertOverlay: 70,
  /** Alert dialog content */
  alert: 75,

  // ============================================
  // Toasts & Notifications (80-89)
  // ============================================
  /** Toast notifications */
  toast: 80,
  /** Priority notifications */
  notification: 85,

  // ============================================
  // Global Overlays (90-99)
  // ============================================
  /** Global search/command palette overlay */
  globalSearchOverlay: 90,
  /** Global search/command palette content */
  globalSearch: 95,

  // ============================================
  // Dev Tools (100+)
  // ============================================
  /** Debug overlays, dev tools */
  devTools: 100,
} as const;

/**
 * Tailwind CSS class names for z-index values
 * Use these for consistent styling across components
 */
export const zIndexClasses = {
  // Base
  base: 'z-0',
  raised: 'z-[1]',

  // Sticky
  sticky: 'z-10',
  stickyHeader: 'z-[15]',

  // Dropdowns
  dropdown: 'z-20',
  popover: 'z-[25]',
  autocomplete: 'z-[28]',

  // Navigation
  sidebar: 'z-30',
  bottomBar: 'z-[35]',
  appBar: 'z-[38]',

  // Floating
  fab: 'z-40',
  floatingPanel: 'z-[45]',

  // Modal overlays
  sheetOverlay: 'z-50',
  modalOverlay: 'z-[55]',

  // Modal content
  sheet: 'z-[60]',
  modal: 'z-[65]',

  // Alerts
  alertOverlay: 'z-[70]',
  alert: 'z-[75]',

  // Toasts
  toast: 'z-[80]',
  notification: 'z-[85]',

  // Global overlays
  globalSearchOverlay: 'z-[90]',
  globalSearch: 'z-[95]',

  // Dev
  devTools: 'z-[100]',
} as const;

/**
 * Type for z-index token names
 */
export type ZIndexToken = keyof typeof zIndex;

/**
 * Type for z-index class names
 */
export type ZIndexClass = keyof typeof zIndexClasses;

/**
 * Get the z-index value for a token
 */
export function getZIndex(token: ZIndexToken): number {
  return zIndex[token];
}

/**
 * Get the Tailwind class for a z-index token
 */
export function getZIndexClass(token: ZIndexToken): string {
  return zIndexClasses[token];
}
