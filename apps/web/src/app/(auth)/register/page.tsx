'use client';

/**
 * Register Page
 *
 * Premium 2025 registration page with split-screen layout.
 * Features glassmorphism design, SSO OAuth, and multi-language support.
 *
 * Architecture:
 * 1. SSO buttons for Google/Microsoft OAuth
 * 2. Email registration via Server Action
 * 3. Real-time form validation with Zod
 * 4. Password strength indicator
 *
 * Design Features:
 * - Premium dark glassmorphism theme
 * - Split-screen layout (hero + form)
 * - Smooth micro-interactions
 * - Mobile-first responsive
 *
 * @module app/(auth)/register/page
 */

import * as React from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Mail, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  GuestGuard,
  AuthLayout,
  AuthCard,
  AuthAlert,
  AuthFormField,
  PasswordInput,
  AuthFooterLinks,
  AuthSubmitButton,
  PasswordStrengthIndicator,
  SSOButtons,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Handle SSO error
  const handleSSOError = (err: Error) => {
    setError(err.message || 'Error al conectar con el proveedor');
  };

  // Success state - Premium glass styling
  if (success) {
    return (
      <GuestGuard>
        <AuthLayout variant="premium" showFooter showHero>
          <Card className="w-full max-w-md text-center backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl">
            <CardHeader className="space-y-4 pb-2">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                {t.auth.forgotPassword.successTitle}
              </CardTitle>
              <CardDescription className="text-[#94A3AB] text-base">
                {t.auth.errors.emailNotConfirmedDescription}
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center pb-6 pt-4">
              <Button
                asChild
                size="lg"
                className="gradient-button rounded-xl h-12 px-8 font-semibold"
              >
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
      <AuthLayout variant="premium" showFooter showHero>
        <AuthCard
          title={t.auth.register.title}
          subtitle={t.auth.register.subtitle}
          showLogo={false}
          maxWidth="md"
          variant="premium"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error Alert */}
            {error && (
              <AuthAlert
                type="error"
                title={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* SSO Buttons - Google & Microsoft */}
            <SSOButtons
              mode="signup"
              variant="premium"
              redirectTo="/onboarding/create-business"
              onError={handleSSOError}
              showDivider
            />

            {/* Name Field */}
            <AuthFormField
              label={t.auth.register.nameLabel}
              type="text"
              autoComplete="name"
              disabled={isLoading}
              placeholder={t.auth.register.namePlaceholder}
              error={errors.fullName?.message}
              startIcon={<User className="h-4 w-4" />}
              size="lg"
              variant="premium"
              {...register('fullName')}
            />

            {/* Email Field */}
            <AuthFormField
              label={t.auth.register.emailLabel}
              type="email"
              autoComplete="email"
              disabled={isLoading}
              placeholder={t.auth.register.emailPlaceholder}
              error={errors.email?.message}
              startIcon={<Mail className="h-4 w-4" />}
              size="lg"
              variant="premium"
              {...register('email')}
            />

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
                variant="premium"
                size="lg"
                showIcon
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
              variant="premium"
              size="lg"
              showIcon
              {...register('confirmPassword')}
            />

            {/* Submit Button */}
            <div className="pt-2">
              <AuthSubmitButton
                isLoading={isLoading}
                loadingText={t.auth.loading.creatingAccount}
                className="gradient-button w-full h-12 rounded-xl text-base font-semibold"
              >
                {t.auth.register.submitButton}
              </AuthSubmitButton>
            </div>

            {/* Login Link */}
            <AuthFooterLinks
              text={t.auth.register.hasAccount}
              linkText={t.auth.register.loginLink}
              href="/login"
              className="text-[#7A8F8F] [&_a]:text-[#0EB58C] [&_a:hover]:text-[#0CA57D]"
            />
          </form>
        </AuthCard>
      </AuthLayout>
    </GuestGuard>
  );
}
