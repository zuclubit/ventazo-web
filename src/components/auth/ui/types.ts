/**
 * Auth UI Component Types
 *
 * Type definitions for the modular auth UI system.
 * Follows clean architecture principles with clear interfaces.
 */

import type { ReactNode } from 'react';

// ============================================
// Brand Logo Types
// ============================================

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type LogoVariant = 'default' | 'light' | 'dark' | 'minimal';

export interface BrandLogoProps {
  /** Size variant */
  size?: LogoSize;
  /** Visual variant */
  variant?: LogoVariant;
  /** Show brand text */
  showText?: boolean;
  /** Custom brand text (defaults to "Ventazo") */
  text?: string;
  /** Show "by Zuclubit" attribution */
  showAttribution?: boolean;
  /** Link destination */
  href?: string;
  /** Additional CSS classes */
  className?: string;
  /** Enable glow effect */
  withGlow?: boolean;
  /** Enable hover animation */
  animated?: boolean;
}

// ============================================
// Auth Layout Types
// ============================================

export interface AuthLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Background variant */
  variant?: 'gradient' | 'solid' | 'pattern';
  /** Show footer with terms/privacy links */
  showFooter?: boolean;
  /** Custom footer content */
  footer?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Auth Card Types
// ============================================

export interface AuthCardProps {
  /** Card content */
  children: ReactNode;
  /** Card title */
  title?: string;
  /** Card subtitle/description */
  subtitle?: string;
  /** Show logo above card */
  showLogo?: boolean;
  /** Logo props when shown */
  logoProps?: Partial<BrandLogoProps>;
  /** Card max width */
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Auth Alert Types
// ============================================

export type AlertType = 'error' | 'warning' | 'success' | 'info';

export interface AuthAlertProps {
  /** Alert type/severity */
  type: AlertType;
  /** Main title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional hint text (shown below description for email alerts) */
  hint?: string;
  /** Custom icon (overrides default) */
  icon?: ReactNode;
  /** Dismiss callback */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Auth Form Types
// ============================================

export interface AuthFormFieldProps {
  /** Field label */
  label: string;
  /** Field name for form registration */
  name: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'tel';
  /** Placeholder text */
  placeholder?: string;
  /** Error message */
  error?: string;
  /** Is field disabled */
  disabled?: boolean;
  /** Auto-complete attribute */
  autoComplete?: string;
  /** Additional CSS classes */
  className?: string;
}

export interface PasswordFieldProps extends Omit<AuthFormFieldProps, 'type'> {
  /** Show password strength indicator */
  showStrength?: boolean;
  /** Password strength level (0-4) */
  strengthLevel?: number;
  /** Strength label text */
  strengthLabel?: string;
  /** Toggle visibility labels */
  showLabel?: string;
  hideLabel?: string;
}

// ============================================
// Auth Footer Types
// ============================================

export interface AuthFooterLink {
  label: string;
  href: string;
}

export interface AuthFooterProps {
  /** Terms link */
  termsLink?: AuthFooterLink;
  /** Privacy link */
  privacyLink?: AuthFooterLink;
  /** Prefix text (e.g., "By signing in, you agree to our") */
  prefixText?: string;
  /** Connector text (e.g., "and") */
  connectorText?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Auth Divider Types
// ============================================

export interface AuthDividerProps {
  /** Divider text */
  text?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Social Auth Types
// ============================================

export type SocialProvider = 'google' | 'github' | 'microsoft' | 'apple';

export interface SocialAuthButtonProps {
  /** Social provider */
  provider: SocialProvider;
  /** Button label */
  label?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}
