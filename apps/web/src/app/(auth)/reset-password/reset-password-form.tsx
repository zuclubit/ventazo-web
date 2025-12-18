'use client';

/**
 * Reset Password Form Component
 *
 * Password reset form with useSearchParams.
 * Wrapped in Suspense by the parent page.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  GuestGuard,
  AuthLayout,
  AuthCard,
  AuthAlert,
  PasswordInput,
  AuthSubmitButton,
  PasswordStrengthIndicator,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/context';
import { resetPasswordAction } from '@/lib/session/actions';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isValidToken, setIsValidToken] = React.useState<boolean | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [token, setToken] = React.useState<string | null>(null);

  // Dynamic Zod schema with i18n messages
  const resetPasswordSchema = React.useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(8, t.auth.errors.passwordMinLength)
          .regex(/[a-z]/, t.auth.errors.passwordNeedsLowercase)
          .regex(/[A-Z]/, t.auth.errors.passwordNeedsUppercase)
          .regex(/\d/, t.auth.errors.passwordNeedsNumber)
          .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, t.auth.errors.passwordNeedsSpecial),
        confirmPassword: z
          .string()
          .min(1, t.auth.errors.passwordRequired),
      }).refine((data) => data.password === data.confirmPassword, {
        message: t.auth.errors.passwordMismatch,
        path: ['confirmPassword'],
      }),
    [t]
  );

  type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Check if we have a valid token from the reset link
  React.useEffect(() => {
    const checkToken = async () => {
      try {
        // Check URL hash for access_token (Supabase style)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        // Also check query params for token
        const tokenFromQuery = searchParams.get('token');

        if ((type === 'recovery' && accessToken) || tokenFromQuery) {
          const extractedToken = accessToken || tokenFromQuery;
          setToken(extractedToken);
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
          setError(t.auth.errors.sessionExpired);
        }
      } catch {
        setIsValidToken(false);
        setError(t.auth.errors.unknownError);
      }
    };

    void checkToken();
  }, [searchParams, t]);

  // Form submission using Server Action
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError(t.auth.errors.sessionExpired);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await resetPasswordAction(token, data.password);

      if (result.success) {
        setIsSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=password_reset');
        }, 3000);
      } else {
        setError(result.error || t.auth.errors.unknownError);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(t.auth.errors.unknownError);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking token
  if (isValidToken === null) {
    return (
      <GuestGuard>
        <AuthLayout variant="gradient" showFooter>
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">
                {t.auth.loading.verifyingToken}
              </p>
            </CardContent>
          </Card>
        </AuthLayout>
      </GuestGuard>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <GuestGuard>
        <AuthLayout variant="gradient" showFooter>
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{t.auth.errors.sessionExpired}</CardTitle>
              <CardDescription>
                {t.auth.errors.sessionExpired}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {error || t.auth.errors.sessionExpired}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button asChild className="w-full">
                <Link href="/forgot-password">
                  {t.auth.forgotPassword.submitButton}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t.auth.forgotPassword.backToLogin}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </AuthLayout>
      </GuestGuard>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <GuestGuard>
        <AuthLayout variant="gradient" showFooter>
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{t.auth.resetPassword.successTitle}</CardTitle>
              <CardDescription>
                {t.auth.resetPassword.successMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t.auth.resetPassword.successMessage}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/login">
                  {t.auth.login.submitButton}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </AuthLayout>
      </GuestGuard>
    );
  }

  return (
    <GuestGuard>
      <AuthLayout variant="gradient" showFooter>
        <AuthCard
          title={t.auth.resetPassword.title}
          subtitle={t.auth.resetPassword.subtitle}
          showLogo
          logoProps={{ size: 'lg', withGlow: true }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <AuthAlert type="error" title={error} />
            )}

            {/* Password Field */}
            <div className="space-y-2">
              <PasswordInput
                id="password"
                label={t.auth.resetPassword.passwordLabel}
                placeholder={t.auth.resetPassword.passwordPlaceholder}
                autoComplete="new-password"
                disabled={isLoading}
                error={errors.password?.message}
                showLabel={t.auth.validation.showPassword}
                hideLabel={t.auth.validation.hidePassword}
                {...register('password')}
              />
              {/* Password Strength Indicator */}
              {password && (
                <PasswordStrengthIndicator
                  password={password}
                  labels={{
                    weak: t.auth.validation.passwordStrength.weak,
                    fair: t.auth.validation.passwordStrength.fair,
                    good: t.auth.validation.passwordStrength.good,
                    strong: t.auth.validation.passwordStrength.strong,
                  }}
                />
              )}
            </div>

            {/* Confirm Password Field */}
            <PasswordInput
              id="confirmPassword"
              label={t.auth.resetPassword.confirmPasswordLabel}
              placeholder={t.auth.resetPassword.confirmPasswordPlaceholder}
              autoComplete="new-password"
              disabled={isLoading}
              error={errors.confirmPassword?.message}
              showLabel={t.auth.validation.showPassword}
              hideLabel={t.auth.validation.hidePassword}
              {...register('confirmPassword')}
            />

            {/* Submit Button */}
            <div className="pt-2">
              <AuthSubmitButton
                isLoading={isLoading}
                loadingText={t.auth.loading.updatingPassword}
              >
                {t.auth.resetPassword.submitButton}
              </AuthSubmitButton>
            </div>

            {/* Back to Login */}
            <div className="text-center text-sm">
              <Link
                href="/login"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                {t.auth.forgotPassword.backToLogin}
              </Link>
            </div>
          </form>
        </AuthCard>
      </AuthLayout>
    </GuestGuard>
  );
}
