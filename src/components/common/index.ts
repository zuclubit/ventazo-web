// ============================================
// Common Components - FASE 5.11
// Reusable components for consistent UX
// ============================================

// Empty States
export {
  EmptyState,
  NoDataEmpty,
  NoResultsEmpty,
  ErrorEmpty,
  type EmptyStateProps,
} from './empty-state';

// Loading States
export {
  Spinner,
  LoadingOverlay,
  PageLoading,
  InlineLoading,
  CardSkeleton,
  TableSkeleton,
  StatsGridSkeleton,
  ListSkeleton,
  ChartSkeleton,
  FormSkeleton,
  PipelineSkeleton,
} from './loading-state';

// Splash Screen
export { SplashScreen } from './splash-screen';

// Feedback Components
export {
  AlertBanner,
  StatusIndicator,
  ProgressSteps,
  ConfirmationContent,
  TooltipContentWrapper,
} from './feedback';

// Page Components
export {
  PageHeader,
  PageSection,
  PageContainer,
  StatsCard,
  StatsGrid,
} from './page-header';

// Data Table
export {
  DataTable,
  TableToolbar,
  BulkActionsBar,
  Pagination,
  type Column,
  type DataTableAction,
  type DataTableProps,
} from './data-table';

// Error Handling
export {
  ErrorBoundary,
  ErrorFallback,
  InlineError,
  QueryErrorHandler,
  SuspenseErrorBoundary,
  RouteErrorBoundary,
} from './error-boundary';

// Dialog Components
export {
  DeleteEntityDialog,
  type DeleteEntityDialogProps,
} from './delete-entity-dialog';

export {
  FormDialog,
  FormDialogTrigger,
  type FormDialogProps,
  type FormDialogTriggerProps,
} from './form-dialog';

export {
  ConfirmDialog,
  useConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogVariant,
  type UseConfirmDialogOptions,
} from './confirm-dialog';

// CRUD Page Layout Components
export {
  CRUDPageLayout,
  CRUDPageHeader,
  StatCard as CRUDStatCard,
  StatsGrid as CRUDStatsGrid,
  FilterBar,
  DataTableCard,
  TableEmptyState,
  PaginationControls,
  useDebouncedSearch,
  usePagination,
  useCRUDDialogs,
  type CRUDPageLayoutProps,
  type CRUDPageHeaderProps,
  type StatCardProps as CRUDStatCardProps,
  type StatsGridProps as CRUDStatsGridProps,
  type FilterBarProps,
  type DataTableCardProps,
  type TableEmptyStateProps,
  type PaginationControlsProps,
} from './crud-page-layout';

// Form Field Components
export {
  TextField,
  NumberField,
  TextareaField,
  SelectField,
  SwitchField,
  CurrencyField,
  FormSection,
  FormRow,
  FullWidth,
  type TextFieldProps,
  type NumberFieldProps,
  type TextareaFieldProps,
  type SelectFieldProps,
  type SelectOption,
  type SwitchFieldProps,
  type CurrencyFieldProps,
  type FormSectionProps,
  type FormRowProps,
  type FullWidthProps,
} from './form-fields';

// Phone Input Components
export {
  PhoneInput,
  SimplePhoneInput,
  getPhoneRegex,
  getPhoneLength,
  buildFullPhoneNumber,
  parsePhoneNumber,
  type PhoneInputProps,
  type PhoneValue,
  type SimplePhoneInputProps,
} from './phone-input';

// Country & Timezone Fields
export {
  CountrySelectField,
  TimezoneSelectField,
  CountryTimezoneFields,
  getTimezonesForCountry,
  getDefaultTimezone,
  getCountryFromTimezone,
  detectUserTimezone,
  detectCountryFromBrowserTimezone,
  useAutoDetectLocation,
  type CountrySelectFieldProps,
  type TimezoneSelectFieldProps,
  type CountryTimezoneFieldsProps,
  type CountryData,
  type TimezoneData,
  type UseAutoDetectLocationReturn,
} from './country-timezone-fields';
