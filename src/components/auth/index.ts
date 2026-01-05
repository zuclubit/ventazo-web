// ============================================
// Auth Components Exports - FASE 2
// ============================================

// Guards & Providers
export {
  AuthProvider,
  AuthGuard,
  GuestGuard,
} from './auth-provider';

export {
  PermissionGuard,
  usePermissions,
  withPermission,
  type PermissionGuardProps,
} from './permission-guard';

// UI Components
export {
  BrandLogo,
  AuthLayout,
  AuthCard,
  AuthAlert,
  PasswordInput,
  AuthFooterLinks,
  AuthSubmitButton,
  PasswordStrengthIndicator,
  // Skeletons
  AuthFormSkeleton,
  AuthCardSkeleton,
  AuthPageSkeleton,
  RegisterFormSkeleton,
  InputFieldSkeleton,
  ButtonSkeleton,
  LoadingSpinner,
  FullPageLoading,
} from './ui';

// UI Types
export type {
  LogoSize,
  LogoVariant,
  BrandLogoProps,
  AuthLayoutProps,
  AuthCardProps,
  AlertType,
  AuthAlertProps,
} from './ui';
