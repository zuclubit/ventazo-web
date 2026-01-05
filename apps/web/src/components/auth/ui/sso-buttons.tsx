'use client';

/**
 * SSO Buttons Component
 *
 * Premium 2025 social login buttons with glass styling.
 * Supports Google and Microsoft OAuth via Supabase.
 *
 * Design Features:
 * - Glassmorphism styling for dark mode
 * - Proper brand colors for provider icons
 * - Smooth hover animations
 * - Loading states with spinner
 *
 * @module components/auth/ui/sso-buttons
 */

import * as React from 'react';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase';

// ============================================
// Icons with Official Brand Colors
// ============================================

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M1 1h10v10H1V1z" fill="#F25022" />
      <path d="M13 1h10v10H13V1z" fill="#7FBA00" />
      <path d="M1 13h10v10H1V13z" fill="#00A4EF" />
      <path d="M13 13h10v10H13V13z" fill="#FFB900" />
    </svg>
  );
}

// ============================================
// Types
// ============================================

export type SSOProvider = 'google' | 'azure';

export interface SSOButtonsProps {
  /** Callback after successful sign-in */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Redirect URL after authentication */
  redirectTo?: string;
  /** Whether to show labels */
  showLabels?: boolean;
  /** CSS class name */
  className?: string;
  /** Mode: signup or login */
  mode?: 'signup' | 'login';
  /** Disabled state */
  disabled?: boolean;
  /** Show divider between buttons */
  showDivider?: boolean;
  /** Use premium glass styling */
  variant?: 'default' | 'glass' | 'premium';
}

// ============================================
// Premium Divider Component - Ventazo Brand
// ============================================

function PremiumDivider({ text, variant }: { text: string; variant?: 'default' | 'glass' | 'premium' }) {
  const isPremium = variant === 'premium' || variant === 'glass';

  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span
          className={cn(
            'w-full h-px',
            isPremium
              ? 'bg-gradient-to-r from-transparent via-[rgba(14,181,140,0.2)] to-transparent'
              : 'bg-[#E6E6E6]'
          )}
        />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span
          className={cn(
            'px-4',
            isPremium
              ? 'bg-transparent text-[#7A8F8F]'
              : 'bg-white text-[#7A8F8F]'
          )}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Main SSO Buttons Component
// ============================================

export function SSOButtons({
  onSuccess,
  onError,
  redirectTo = '/onboarding/create-business',
  showLabels = true,
  className,
  mode = 'signup',
  disabled = false,
  showDivider = true,
  variant = 'default',
}: SSOButtonsProps) {
  const [loadingProvider, setLoadingProvider] = React.useState<SSOProvider | null>(null);
  const isPremium = variant === 'premium' || variant === 'glass';

  const handleSSO = async (provider: SSOProvider) => {
    if (loadingProvider || disabled) return;

    setLoadingProvider(provider);

    try {
      const supabase = createBrowserClient();

      // Determine the OAuth provider name for Supabase
      const oauthProvider = provider === 'azure' ? 'azure' : 'google';

      // Get the callback URL
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: oauthProvider,
        options: {
          redirectTo: `${callbackUrl}?redirect=${encodeURIComponent(redirectTo)}`,
          queryParams: provider === 'azure' ? {
            prompt: 'select_account',
          } : {},
        },
      });

      if (error) {
        throw error;
      }

      onSuccess?.();
    } catch (error) {
      console.error(`SSO ${provider} error:`, error);
      onError?.(error instanceof Error ? error : new Error('Error de autenticación'));
    } finally {
      setLoadingProvider(null);
    }
  };

  const actionText = mode === 'signup' ? 'Registrarse' : 'Iniciar sesión';

  // Premium glass button styles - Ventazo Brand
  const premiumButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-12 px-4 rounded-xl font-medium',
    'backdrop-blur-md',
    'bg-[rgba(0,60,59,0.4)]',
    'border border-[rgba(255,255,255,0.1)]',
    'text-white',
    'transition-all duration-300',
    'hover:bg-[rgba(0,80,78,0.5)] hover:border-[rgba(14,181,140,0.3)]',
    'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(14,181,140,0.15)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
    'focus:outline-none focus:ring-2 focus:ring-[#0EB58C] focus:ring-offset-2 focus:ring-offset-transparent'
  );

  // Default button styles
  const defaultButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-12 px-4 rounded-xl font-medium',
    'bg-white border border-[#E6E6E6]',
    'text-[#1C1C1E]',
    'transition-all duration-300',
    'hover:bg-[#F5F5F5] hover:border-[#0EB58C]/30',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-[#0EB58C] focus:ring-offset-2'
  );

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Google Button */}
      <button
        className={isPremium ? premiumButtonStyles : defaultButtonStyles}
        disabled={disabled || loadingProvider !== null}
        type="button"
        onClick={() => handleSSO('google')}
      >
        {loadingProvider === 'google' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <GoogleIcon className="h-5 w-5 shrink-0" />
        )}
        {showLabels && (
          <span className="text-[#E8ECEC]">
            {actionText} con Google
          </span>
        )}
      </button>

      {/* Microsoft Button */}
      <button
        className={isPremium ? premiumButtonStyles : defaultButtonStyles}
        disabled={disabled || loadingProvider !== null}
        type="button"
        onClick={() => handleSSO('azure')}
      >
        {loadingProvider === 'azure' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MicrosoftIcon className="h-5 w-5 shrink-0" />
        )}
        {showLabels && (
          <span className="text-[#E8ECEC]">
            {actionText} con Microsoft
          </span>
        )}
      </button>

      {/* Divider */}
      {showDivider && (
        <PremiumDivider
          text="o continúa con email"
          variant={variant}
        />
      )}
    </div>
  );
}

// ============================================
// Individual Google Sign-In Button
// ============================================

export interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: 'signup' | 'login';
  variant?: 'default' | 'glass' | 'premium';
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  redirectTo,
  showLabel = true,
  disabled = false,
  className,
  mode = 'signup',
  variant = 'default',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const isPremium = variant === 'premium' || variant === 'glass';

  const handleClick = async () => {
    if (loading || disabled) return;

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo
            ? `${callbackUrl}?redirect=${encodeURIComponent(redirectTo)}`
            : callbackUrl,
        },
      });

      if (error) throw error;
      onSuccess?.();
    } catch (error) {
      console.error('Google SSO error:', error);
      onError?.(error instanceof Error ? error : new Error('Error de autenticación'));
    } finally {
      setLoading(false);
    }
  };

  const actionText = mode === 'signup' ? 'Registrarse' : 'Iniciar sesión';

  // Premium glass button styles
  const premiumButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-12 px-4 rounded-xl font-medium',
    'backdrop-blur-md',
    'bg-[rgba(10,40,40,0.4)]',
    'border border-[rgba(255,255,255,0.08)]',
    'text-white',
    'transition-all duration-300',
    'hover:bg-[rgba(20,60,60,0.5)] hover:border-[rgba(255,255,255,0.15)]',
    'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:ring-offset-2 focus:ring-offset-transparent',
    className
  );

  const defaultButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-11 px-4 rounded-md font-medium',
    'bg-background border border-input',
    'text-foreground',
    'transition-colors duration-200',
    'hover:bg-accent hover:text-accent-foreground',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    className
  );

  return (
    <button
      className={isPremium ? premiumButtonStyles : defaultButtonStyles}
      disabled={disabled || loading}
      type="button"
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5 shrink-0" />
      )}
      {showLabel && (
        <span className="text-[#E8ECEC]">
          {actionText} con Google
        </span>
      )}
    </button>
  );
}

// ============================================
// Individual Microsoft Sign-In Button
// ============================================

export interface MicrosoftSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
  mode?: 'signup' | 'login';
  variant?: 'default' | 'glass' | 'premium';
}

export function MicrosoftSignInButton({
  onSuccess,
  onError,
  redirectTo,
  showLabel = true,
  disabled = false,
  className,
  mode = 'signup',
  variant = 'default',
}: MicrosoftSignInButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const isPremium = variant === 'premium' || variant === 'glass';

  const handleClick = async () => {
    if (loading || disabled) return;

    setLoading(true);

    try {
      const supabase = createBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectTo
            ? `${callbackUrl}?redirect=${encodeURIComponent(redirectTo)}`
            : callbackUrl,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
      onSuccess?.();
    } catch (error) {
      console.error('Microsoft SSO error:', error);
      onError?.(error instanceof Error ? error : new Error('Error de autenticación'));
    } finally {
      setLoading(false);
    }
  };

  const actionText = mode === 'signup' ? 'Registrarse' : 'Iniciar sesión';

  // Premium glass button styles
  const premiumButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-12 px-4 rounded-xl font-medium',
    'backdrop-blur-md',
    'bg-[rgba(10,40,40,0.4)]',
    'border border-[rgba(255,255,255,0.08)]',
    'text-white',
    'transition-all duration-300',
    'hover:bg-[rgba(20,60,60,0.5)] hover:border-[rgba(255,255,255,0.15)]',
    'hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:ring-offset-2 focus:ring-offset-transparent',
    className
  );

  const defaultButtonStyles = cn(
    'inline-flex items-center justify-center gap-3',
    'w-full h-11 px-4 rounded-md font-medium',
    'bg-background border border-input',
    'text-foreground',
    'transition-colors duration-200',
    'hover:bg-accent hover:text-accent-foreground',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    className
  );

  return (
    <button
      className={isPremium ? premiumButtonStyles : defaultButtonStyles}
      disabled={disabled || loading}
      type="button"
      onClick={handleClick}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <MicrosoftIcon className="h-5 w-5 shrink-0" />
      )}
      {showLabel && (
        <span className="text-[#E8ECEC]">
          {actionText} con Microsoft
        </span>
      )}
    </button>
  );
}

// ============================================
// Display Names
// ============================================

SSOButtons.displayName = 'SSOButtons';
GoogleSignInButton.displayName = 'GoogleSignInButton';
MicrosoftSignInButton.displayName = 'MicrosoftSignInButton';
