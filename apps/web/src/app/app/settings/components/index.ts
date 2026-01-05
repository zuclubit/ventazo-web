// Settings Components - Ventazo CRM
export { SettingsCategoryCard } from './SettingsCategoryCard';
export { SettingsGrid } from './SettingsGrid';
export { SettingsSectionGrid } from './SettingsSectionGrid';
export { SettingsHeader } from './SettingsHeader';
export { SettingsSearch } from './SettingsSearch';
export { SettingsBreadcrumb } from './SettingsBreadcrumb';
export { SettingsEmptySearch } from './SettingsEmptySearch';

// Skeletons for CLS prevention
export {
  ProfilePageSkeleton,
  TeamPageSkeleton,
  ActivityPageSkeleton,
  NotificationsPageSkeleton,
  PipelinePageSkeleton,
  MessagingTemplatesPageSkeleton,
  MessagingTemplatesGridSkeleton,
  SettingsFormSkeleton,
  SettingsSkeletons,
} from './SettingsSkeletons';

// Configuration
export {
  SETTINGS_SECTIONS,
  ADMIN_SECTIONS,
  SETTINGS_CATEGORIES,
  SEARCHABLE_ITEMS,
  settingsCategoryColors,
  getCategoryById,
  getCategoryByHref,
  getColorConfig,
  searchSettings,
  type SettingsItem,
  type SettingsSection,
  type SettingsCategory,
  type SettingsCategoryColor,
  type SearchableItem,
} from './settings-config';
