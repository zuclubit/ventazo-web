/**
 * Modular Sheet Components - Ventazo Design System 2025
 *
 * A collection of reusable, modular components for building
 * consistent sheet/modal panels across the application.
 *
 * Features:
 * - Glassmorphism styling
 * - Full dark/light theme support
 * - Mobile-aware with bottom bar padding
 * - 44px touch targets
 * - Dynamic tenant color system
 * - Accessible with ARIA labels
 *
 * @version 1.0.0
 * @module components/sheets
 */

// Header
export {
  SheetHeader,
  type SheetHeaderProps,
} from './sheet-header';

// Body
export {
  SheetBody,
  SheetBodySection,
  type SheetBodyProps,
  type SheetBodySectionProps,
} from './sheet-body';

// Footer
export {
  SheetFooter,
  TotalsSummary,
  type SheetFooterProps,
  type SheetFooterAction,
  type TotalsSummaryProps,
} from './sheet-footer';

// Content Components
export {
  SheetSection,
  SheetInfoCard,
  SheetInfoGrid,
  SheetAlertCard,
  SheetEmptyState,
  type SheetSectionProps,
  type SheetInfoCardProps,
  type SheetInfoGridProps,
  type SheetAlertCardProps,
  type SheetEmptyStateProps,
} from './sheet-content-components';

// Quick Actions
export {
  SheetQuickActions,
  createEmailAction,
  createPhoneAction,
  createWhatsAppAction,
  createWebsiteAction,
  createCalendarAction,
  type SheetQuickActionsProps,
  type QuickAction,
} from './sheet-quick-actions';
