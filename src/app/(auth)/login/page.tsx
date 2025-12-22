'use client';

/**
 * Login Page
 *
 * Authentication page using Server Actions for secure login.
 * Session is managed via encrypted httpOnly cookies.
 *
 * Architecture:
 * 1. Form submission calls Server Action (loginAction)
 * 2. Server Action authenticates with backend API
 * 3. Server Action creates encrypted session cookie
 * 4. Client redirects to app on success
 */

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  AuthLayout,
  AuthCard,
  AuthAlert,
  PasswordInput,
  AuthFooterLinks,
  AuthSubmitButton,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { loginAction } from '@/lib/session/actions';

// ============================================
// Types
// ============================================

interface ErrorInfo {
  title: string;
  description?: string;
  hint?: string;
  isEmailNotConfirmed?: boolean;
}

// ============================================
// Error Message Mapper
// ============================================

function mapErrorToI18n(
  error: string | null,
  urlError: string | null,
  t: ReturnType<typeof useI18n>['t']
): ErrorInfo | null {
  if (error) {
    const errorLower = error.toLowerCase();

    // Email not confirmed
    if (errorLower.includes('email_not_confirmed') || errorLower.includes('email not confirmed')) {
      return {
        title: t.auth.errors.emailNotConfirmed,
        description: t.auth.errors.emailNotConfirmedDescription,
        hint: t.auth.errors.emailNotConfirmedHint,
        isEmailNotConfirmed: true,
      };
    }

    // Invalid credentials
    if (errorLower.includes('invalid') || errorLower.includes('credenciales')) {
      return { title: t.auth.errors.invalidCredentials };
    }

    // User not found
    if (errorLower.includes('user not found')) {
      return { title: t.auth.errors.userNotFound };
    }

    // Rate limiting
    if (errorLower.includes('too many') || errorLower.includes('rate limit')) {
      return { title: t.auth.errors.tooManyAttempts };
    }

    // Network error
    if (errorLower.includes('network') || errorLower.includes('conexión')) {
      return { title: t.auth.errors.networkError };
    }

    // Default: show original error
    return { title: error };
  }

  // URL-based errors
  if (urlError === 'session_expired') {
    return { title: t.auth.errors.sessionExpired };
  }
  if (urlError === 'access_denied') {
    return { title: t.auth.errors.accessDenied };
  }

  return null;
}

// ============================================
// Component
// ============================================

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Local state
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  // URL params
  const redirectTo = searchParams.get('redirect') || '/app';
  const urlError = searchParams.get('error');

  // Dynamic Zod schema with i18n messages
  const loginSchema = React.useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t.auth.errors.emailRequired)
          .email(t.auth.errors.emailInvalid),
        password: z
          .string()
          .min(1, t.auth.errors.passwordRequired)
          .min(6, t.auth.errors.passwordMinLength),
      }),
    [t]
  );

  type LoginFormData = z.infer<typeof loginSchema>;

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Form submission using Server Action
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const result = await loginAction(data.email, data.password);

      if (result.success) {
        // Redirect to app or specified redirect URL
        // Use window.location for full page reload to ensure middleware runs
        window.location.href = result.redirectTo || redirectTo;
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Error de conexión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend confirmation email
  const handleResendConfirmation = async () => {
    const email = getValues('email');
    if (!email) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
      await fetch(`${API_URL}/api/v1/auth/resend-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendSuccess(true);
    } catch {
      // Always show success to not reveal email status
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  // Map error to i18n message
  const errorInfo = mapErrorToI18n(error, urlError, t);

  return (
    <AuthLayout variant="gradient" showFooter>
      <AuthCard
        title={t.auth.login.title}
        subtitle={t.auth.login.subtitle}
        showLogo
        logoProps={{ size: 'lg', withGlow: true }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Success message for resend */}
          {resendSuccess && (
            <AuthAlert
              type="success"
              title={t.auth.errors.resendConfirmationSuccess}
            />
          )}

          {/* Error Alert */}
          {errorInfo && !resendSuccess && (
            <div className="space-y-3">
              <AuthAlert
                type="error"
                title={errorInfo.title}
                description={errorInfo.description}
                hint={errorInfo.hint}
              />
              {/* Resend Confirmation Button */}
              {errorInfo.isEmailNotConfirmed && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                >
                  {isResending ? t.auth.loading.sendingEmail : t.auth.errors.resendConfirmation}
                </Button>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {t.auth.login.emailLabel}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isLoading}
              placeholder={t.auth.login.emailPlaceholder}
              className={errors.email ? 'border-destructive' : ''}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <PasswordInput
            id="password"
            label={t.auth.login.passwordLabel}
            placeholder={t.auth.login.passwordPlaceholder}
            autoComplete="current-password"
            disabled={isLoading}
            error={errors.password?.message}
            showLabel={t.auth.validation.showPassword}
            hideLabel={t.auth.validation.hidePassword}
            forgotPasswordLabel={t.auth.login.forgotPassword}
            forgotPasswordHref="/forgot-password"
            {...register('password')}
          />

          {/* Submit Button */}
          <div className="pt-2">
            <AuthSubmitButton
              isLoading={isLoading}
              loadingText={t.auth.loading.authenticating}
            >
              {t.auth.login.submitButton}
            </AuthSubmitButton>
          </div>

          {/* Register Link */}
          <AuthFooterLinks
            text={t.auth.login.noAccount}
            linkText={t.auth.login.registerLink}
            href="/register"
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
