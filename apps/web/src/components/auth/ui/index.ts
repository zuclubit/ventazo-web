/**
 * Auth UI Components
 *
 * Reusable UI components for authentication pages.
 * Follows clean architecture with modular, composable patterns.
 *
 * Best Practices 2025:
 * - Split-screen layouts
 * - Responsive design
 * - Dynamic theming
 * - WCAG accessibility
 *
 * @module auth/ui
 */

// ============================================
// Layout Components
// ============================================

export { AuthLayout } from './auth-layout';
export { AuthHero } from './auth-hero';
export { AuthCard } from './auth-card';

// ============================================
// Form Components
// ============================================

export { AuthFormField } from './auth-form-field';
export { PasswordInput } from './password-input';
export { PasswordStrengthIndicator } from './password-strength-indicator';
export { AuthSubmitButton } from './auth-submit-button';

// ============================================
// Feedback Components
// ============================================

export { AuthAlert } from './auth-alert';

// ============================================
// Branding Components
// ============================================

export { BrandLogo } from './brand-logo';

// ============================================
// Navigation Components
// ============================================

export { AuthFooterLinks } from './auth-footer-links';

// ============================================
// Skeleton Components
// ============================================

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
