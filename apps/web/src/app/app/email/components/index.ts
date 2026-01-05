/**
 * Email Module Components
 *
 * Barrel exports for email-related components.
 *
 * v2.0 - Modern Email Design Components
 * - New icon sidebar, header, grouped list
 * - Category badges and enhanced list items
 * - Full dynamic theming support
 */

// ============================================
// Original Components (Legacy)
// ============================================
export { EmailSidebar, type EmailSidebarProps } from './EmailSidebar';
export { EmailList, type EmailListProps } from './EmailList';
export { EmailListItem, type EmailListItemProps } from './EmailListItem';
export { EmailDetail, type EmailDetailProps } from './EmailDetail';
export { EmailComposer, type EmailComposerProps } from './EmailComposer';
export { ConnectEmailCard, type ConnectEmailCardProps } from './ConnectEmailCard';
export { EmailEmptyState, type EmailEmptyStateProps, type EmailEmptyStateVariant } from './EmailEmptyState';

// ============================================
// Modern Design Components (v2)
// ============================================

// Icon Sidebar - Minimal vertical navigation
export { EmailIconSidebar, type EmailIconSidebarProps } from './EmailIconSidebar';

// Header - Search bar, Ask AI, Compose button
export { EmailHeader, type EmailHeaderProps } from './EmailHeader';

// Category Badge - Design, Product, Management, Newsletter
export {
  EmailCategoryBadge,
  type EmailCategoryBadgeProps,
  type EmailCategoryType,
  parseCategoryFromLabels,
} from './EmailCategoryBadge';

// List Item V2 - Enhanced with avatars, badges, animations
export { EmailListItemV2, type EmailListItemV2Props } from './EmailListItemV2';

// Grouped List - Collapsible categories with counts
export { EmailGroupedList, type EmailGroupedListProps } from './EmailGroupedList';

// Folder Nav - Right-side folder navigation
export { EmailFolderNav, type EmailFolderNavProps } from './EmailFolderNav';

// Table Row - Horizontal table-like row for email display
export { EmailTableRow, type EmailTableRowProps } from './EmailTableRow';

// Table List - Email list with inline section headers
export { EmailTableList, type EmailTableListProps } from './EmailTableList';

// ============================================
// Split View Components (v2.1)
// ============================================

// Reading Pane - Standard email reading pane with toolbar and FAB
export { EmailReadingPane, type EmailReadingPaneProps } from './EmailReadingPane';

// Compact List - Optimized for split view layouts (320-450px width)
export { EmailListCompact, type EmailListCompactProps } from './EmailListCompact';

// Icon Nav Right - Minimal icon-only navigation for right side (v2.2)
export { EmailIconNavRight, type EmailIconNavRightProps } from './EmailIconNavRight';

// Floating Dock - Apple Liquid Glass inspired centered navigation (v2.3)
export { EmailFloatingDock, type EmailFloatingDockProps } from './EmailFloatingDock';
