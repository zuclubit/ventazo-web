'use client';

/**
 * Forgot Password Page
 *
 * Password recovery request using Server Actions.
 *
 * Features:
 * - Server Action for password reset request
 * - Multi-language support (i18n)
 * - Real-time form validation with Zod
 * - Security: Always shows success to not reveal if email exists
 * - Accessible form controls
 */

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  GuestGuard,
  AuthLayout,
  AuthCard,
  AuthAlert,
  AuthSubmitButton,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { requestPasswordResetAction } from '@/lib/session/actions';

// ============================================
// Component
// ============================================

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Dynamic Zod schema with i18n messages
  const forgotPasswordSchema = React.useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t.auth.errors.emailRequired)
          .email(t.auth.errors.emailInvalid),
      }),
    [t]
  );

  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Form submission using Server Action
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await requestPasswordResetAction(data.email);
      // Always show success (security: don't reveal if email exists)
      setIsSuccess(true);
    } catch {
      // Always show success
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <GuestGuard>
        <AuthLayout variant="gradient" showFooter>
          <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">{t.auth.forgotPassword.successTitle}</CardTitle>
              <CardDescription>
                {t.auth.forgotPassword.successMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  {t.auth.forgotPassword.successMessage}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t.auth.forgotPassword.backToLogin}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsSuccess(false);
                    setError(null);
                  }}
                >
                  {t.auth.forgotPassword.submitButton}
                </Button>
              </div>
            </CardContent>
          </Card>
        </AuthLayout>
      </GuestGuard>
    );
  }

  return (
    <GuestGuard>
      <AuthLayout variant="gradient" showFooter>
        <AuthCard
          title={t.auth.forgotPassword.title}
          subtitle={t.auth.forgotPassword.subtitle}
          showLogo
          logoProps={{ size: 'lg', withGlow: true }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <AuthAlert type="error" title={error} />
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t.auth.forgotPassword.emailLabel}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  disabled={isLoading}
                  placeholder={t.auth.forgotPassword.emailPlaceholder}
                  className={`pl-9 ${errors.email ? 'border-destructive' : ''}`}
                  aria-invalid={!!errors.email}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <AuthSubmitButton
                isLoading={isLoading}
                loadingText={t.auth.loading.sendingEmail}
              >
                {t.auth.forgotPassword.submitButton}
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
