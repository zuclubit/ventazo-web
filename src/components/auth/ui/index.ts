/**
 * Auth UI Components
 *
 * Reusable UI components for authentication pages.
 * Follows clean architecture with modular, composable patterns.
 *
 * @module auth/ui
 */

// ============================================
// Components
// ============================================

export { BrandLogo } from './brand-logo';
export { AuthLayout } from './auth-layout';
export { AuthCard } from './auth-card';
export { AuthAlert } from './auth-alert';
export { PasswordInput } from './password-input';
export { AuthFooterLinks } from './auth-footer-links';
export { AuthSubmitButton } from './auth-submit-button';
export { PasswordStrengthIndicator } from './password-strength-indicator';
export {
  AuthFormSkeleton,
  AuthCardSkeleton,
  AuthPageSkeleton,
  RegisterFormSkeleton,
  InputFieldSkeleton,
  ButtonSkeleton,
  LoadingSpinner,
  FullPageLoading,
} from './auth-skeleton';

// ============================================
// Types
// ============================================

export type {
  // Logo Types
  LogoSize,
  LogoVariant,
  BrandLogoProps,
  // Layout Types
  AuthLayoutProps,
  // Card Types
  AuthCardProps,
  // Alert Types
  AlertType,
  AuthAlertProps,
  // Form Types
  AuthFormFieldProps,
  PasswordFieldProps,
  // Footer Types
  AuthFooterLink,
  AuthFooterProps,
  // Divider Types
  AuthDividerProps,
  // Social Auth Types
  SocialProvider,
  SocialAuthButtonProps,
} from './types';
