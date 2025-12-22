'use client';

/**
 * Register Page
 *
 * User registration using Server Actions for secure server-side processing.
 *
 * Features:
 * - Server Action for registration (registerAction)
 * - Multi-language support (i18n)
 * - Real-time form validation with Zod
 * - Password strength indicator
 * - Accessible form controls
 */

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  GuestGuard,
  AuthLayout,
  AuthCard,
  AuthAlert,
  PasswordInput,
  AuthFooterLinks,
  AuthSubmitButton,
  PasswordStrengthIndicator,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { registerAction } from '@/lib/session/actions';

// ============================================
// Component
// ============================================

export default function RegisterPage() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Dynamic Zod schema with i18n messages
  const registerSchema = React.useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .min(1, t.auth.errors.nameRequired)
          .min(2, t.auth.errors.nameRequired)
          .max(100, t.auth.errors.nameRequired),
        email: z
          .string()
          .min(1, t.auth.errors.emailRequired)
          .email(t.auth.errors.emailInvalid),
        password: z
          .string()
          .min(1, t.auth.errors.passwordRequired)
          .min(8, t.auth.errors.passwordMinLength)
          .regex(/[a-z]/, t.auth.errors.passwordNeedsLowercase)
          .regex(/[A-Z]/, t.auth.errors.passwordNeedsUppercase)
          .regex(/\d/, t.auth.errors.passwordNeedsNumber)
          .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, t.auth.errors.passwordNeedsSpecial),
        confirmPassword: z.string().min(1, t.auth.errors.passwordRequired),
      }).refine((data) => data.password === data.confirmPassword, {
        message: t.auth.errors.passwordMismatch,
        path: ['confirmPassword'],
      }),
    [t]
  );

  type RegisterFormData = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Form submission using Server Action
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await registerAction(
        data.email,
        data.password,
        data.fullName
      );

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || t.auth.errors.unknownError);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(t.auth.errors.unknownError);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <GuestGuard>
        <AuthLayout variant="gradient" showFooter>
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">{t.auth.forgotPassword.successTitle}</CardTitle>
              <CardDescription>
                {t.auth.errors.emailNotConfirmedDescription}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button asChild>
                <Link href="/login">{t.auth.login.submitButton}</Link>
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
          title={t.auth.register.title}
          subtitle={t.auth.register.subtitle}
          showLogo
          logoProps={{ size: 'lg', withGlow: true }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <AuthAlert type="error" title={error} />
            )}

            {/* Name Field */}
            <div className="space-y-2">
              <label
                htmlFor="fullName"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t.auth.register.nameLabel}
              </label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                disabled={isLoading}
                placeholder={t.auth.register.namePlaceholder}
                className={errors.fullName ? 'border-destructive' : ''}
                aria-invalid={!!errors.fullName}
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t.auth.register.emailLabel}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isLoading}
                placeholder={t.auth.register.emailPlaceholder}
                className={errors.email ? 'border-destructive' : ''}
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <PasswordInput
                id="password"
                label={t.auth.register.passwordLabel}
                placeholder={t.auth.register.passwordPlaceholder}
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
              label={t.auth.register.confirmPasswordLabel}
              placeholder={t.auth.register.confirmPasswordPlaceholder}
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
                loadingText={t.auth.loading.creatingAccount}
              >
                {t.auth.register.submitButton}
              </AuthSubmitButton>
            </div>

            {/* Login Link */}
            <AuthFooterLinks
              text={t.auth.register.hasAccount}
              linkText={t.auth.register.loginLink}
              href="/login"
            />
          </form>
        </AuthCard>
      </AuthLayout>
    </GuestGuard>
  );
}
