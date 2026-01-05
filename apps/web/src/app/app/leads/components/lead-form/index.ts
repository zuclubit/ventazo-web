/**
 * Lead Form Components
 *
 * Modular, reusable components for lead creation and editing.
 *
 * @module leads/components/lead-form
 */

// Form Field Components
export {
  FormField,
  InputWithIcon,
  TextareaWithCounter,
  type FormFieldProps,
  type InputWithIconProps,
  type TextareaWithCounterProps,
} from './form-field';

// Status Pills Components
export {
  StatusPills,
  LEAD_STATUS_OPTIONS,
  type StatusOption,
  type StatusPillsProps,
} from './status-pills';

// Quick Actions Components
export {
  QuickActions,
  createLeadQuickActions,
  type QuickAction,
  type MoreAction,
  type QuickActionsProps,
  type CreateLeadActionsParams,
} from './quick-actions';

// Lead Header Components
export {
  LeadHeader,
  type LeadHeaderProps,
} from './lead-header';

// Form Sections Components
export {
  FormSection,
  FormSections,
  InfoGrid,
  ActivityItem,
  NotesSection,
  type FormSectionProps,
  type FormSectionsProps,
  type InfoGridItem,
  type InfoGridProps,
  type ActivityItemProps,
  type NotesSectionProps,
} from './form-sections';
