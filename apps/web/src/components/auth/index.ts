// ============================================
// Auth Components Exports - FASE 2
// ============================================

// Guards & Providers
export {
  AuthProvider,
  AuthGuard,
  GuestGuard,
  useAuth,
  useAuthContext,
} from './auth-provider';

export {
  PermissionGuard,
  usePermissions,
  withPermission,
  type PermissionGuardProps,
} from './permission-guard';

// UI Components - Layout
export {
  AuthLayout,
  AuthHero,
  AuthCard,
} from './ui';

// UI Components - Forms
export {
  AuthFormField,
  PasswordInput,
  PasswordStrengthIndicator,
  AuthSubmitButton,
} from './ui';

// UI Components - Feedback & Branding
export {
  AuthAlert,
  BrandLogo,
  AuthFooterLinks,
} from './ui';

// UI Components - Skeletons
export {
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
