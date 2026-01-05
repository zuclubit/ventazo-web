/**
 * Calendar Components - Barrel Export
 *
 * @module app/calendar/components
 */

// Sprint 2: Connection Components
export { CalendarProviderCard } from './CalendarProviderCard';
export { ConnectedCalendarCard } from './ConnectedCalendarCard';
export { CalendarSettingsSheet } from './CalendarSettingsSheet';

// Sprint 3: Calendar View Components
export { CalendarGrid, type CalendarGridRef, type CalendarViewType } from './CalendarGrid';
export { CalendarToolbar } from './CalendarToolbar';
export { EventDetailSheet } from './EventDetailSheet';
export { EventFormSheet } from './EventFormSheet';

// Sprint 5: Hardening Components
export { UserSearchCombobox, type SelectedUser } from './UserSearchCombobox';
export { CRMEntitySelector, type CRMEntityType } from './CRMEntitySelector';
export { TimezoneSelector } from './TimezoneSelector';
export { SyncStatusBadge, SyncStatusIndicator } from './SyncStatusBadge';

// Sprint 6: Real-time & Sync Components
export {
  CalendarSyncIndicator,
  SyncStatusDot,
  type CalendarSyncIndicatorProps,
} from './CalendarSyncIndicator';

// Sprint 6: Modern UI Components (matching email module v4.0)
export { CalendarIconSidebar, type CalendarIconSidebarProps } from './CalendarIconSidebar';
export { CalendarHeader, type CalendarHeaderProps } from './CalendarHeader';

// Loading States
export {
  CalendarSkeleton,
  CalendarHeaderSkeleton,
  CalendarToolbarSkeleton,
  CalendarGridSkeleton,
  CalendarEmptyStateSkeleton,
} from './CalendarSkeleton';
