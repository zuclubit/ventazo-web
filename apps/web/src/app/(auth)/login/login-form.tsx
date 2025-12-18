'use client';

/**
 * Login Form Component
 *
 * Handles the actual login form logic with useSearchParams.
 * Wrapped in Suspense by the parent page.
 */

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Mail } from 'lucide-react';

import {
  AuthLayout,
  AuthCard,
  AuthAlert,
  AuthFormField,
  PasswordInput,
  AuthFooterLinks,
  AuthSubmitButton,
  SSOButtons,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

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

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();

  // Local state
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isResending, setIsResending] = React.useState(false);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  // URL params
  // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
  const redirectTo = searchParams.get('redirect') || '/app/dashboard';
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

  // Form submission using API Route (better cookie support in Cloudflare Workers)
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      console.log('[LoginForm] ====== LOGIN STARTED ======');
      console.log('[LoginForm] Email:', data.email);

      // Call the API Route - this sets the session cookie in the response
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
        credentials: 'include', // Important: include cookies in request/response
      });

      const result = await response.json();
      console.log('[LoginForm] API Response:', JSON.stringify(result));

      if (result.success) {
        // Determine final redirect URL
        const finalRedirect = result.redirectTo || redirectTo;
        console.log('[LoginForm] SUCCESS! Redirecting to:', finalRedirect);

        // Use window.location for a full browser navigation
        // The cookie was set in the API response, so it will be included
        window.location.href = finalRedirect;

        // Keep loading state - the page will refresh
        return;
      } else {
        console.log('[LoginForm] LOGIN FAILED:', result.error);
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      console.error('[LoginForm] EXCEPTION:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error de conexión: ${errorMessage}`);
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
      const API_URL = process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
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

  // Handle SSO error
  const handleSSOError = (err: Error) => {
    setError(err.message || 'Error al conectar con el proveedor');
  };

  // Map error to i18n message
  const errorInfo = mapErrorToI18n(error, urlError, t);

  return (
    <AuthLayout variant="premium" showFooter showHero>
      <AuthCard
        title={t.auth.login.title}
        subtitle={t.auth.login.subtitle}
        showLogo={false}
        maxWidth="md"
        variant="premium"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                onDismiss={() => setError(null)}
              />
              {/* Resend Confirmation Button */}
              {errorInfo.isEmailNotConfirmed && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 rounded-xl backdrop-blur-md bg-white/[0.03] border border-white/[0.08] text-[#0EB58C] hover:bg-white/[0.06] hover:text-white transition-all"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                >
                  {isResending ? t.auth.loading.sendingEmail : t.auth.errors.resendConfirmation}
                </Button>
              )}
            </div>
          )}

          {/* SSO Buttons - Google & Microsoft */}
          <SSOButtons
            mode="login"
            variant="premium"
            redirectTo={redirectTo}
            onError={handleSSOError}
            showDivider
          />

          {/* Email Field */}
          <AuthFormField
            label={t.auth.login.emailLabel}
            type="email"
            autoComplete="email"
            disabled={isLoading}
            placeholder={t.auth.login.emailPlaceholder}
            error={errors.email?.message}
            startIcon={<Mail className="h-4 w-4" />}
            size="lg"
            variant="premium"
            {...register('email')}
          />

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
            variant="premium"
            size="lg"
            showIcon
            {...register('password')}
          />

          {/* Submit Button */}
          <div className="pt-2">
            <AuthSubmitButton
              isLoading={isLoading}
              loadingText={t.auth.loading.authenticating}
              className="gradient-button w-full h-12 rounded-xl text-base font-semibold"
            >
              {t.auth.login.submitButton}
            </AuthSubmitButton>
          </div>

          {/* Register Link */}
          <AuthFooterLinks
            text={t.auth.login.noAccount}
            linkText={t.auth.login.registerLink}
            href="/register"
            className="text-[#7A8F8F] [&_a]:text-[#0EB58C] [&_a:hover]:text-[#0CA57D]"
          />
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
