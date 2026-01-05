'use client';

/**
 * Signup Page - Simplified
 *
 * Streamlined registration with minimal fields:
 * - Name (first + last in one row)
 * - Email
 * - Password (with show/hide, no confirm field)
 *
 * @module app/signup/page
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { SSOButtons } from '@/components/auth/ui/sso-buttons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signupUser } from '@/lib/onboarding';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// Validation Schema - Simplified
// ============================================

const signupSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  lastName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres'),
});

type SignupFormData = z.infer<typeof signupSchema>;

// ============================================
// Signup Page
// ============================================

export default function SignupPage() {
  const router = useRouter();
  const { updateData } = useOnboardingStore();

  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { userId } = await signupUser(data);

      updateData({
        userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        emailVerified: false,
      });

      router.push(`/signup/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la cuenta';

      if (message.includes('already registered')) {
        setSubmitError('Este email ya está registrado. ¿Quieres iniciar sesión?');
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingLayout showProgress={false} showSteps={false}>
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ventazo-600 to-ventazo-700 text-2xl font-bold text-white shadow-lg">
              V
            </div>
            <CardTitle className="text-2xl">Crea tu cuenta</CardTitle>
            <CardDescription>
              Comienza gratis en menos de 2 minutos
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* SSO Buttons */}
              <SSOButtons
                disabled={isSubmitting}
                mode="signup"
                redirectTo="/onboarding/create-business"
                showDivider
              />

              {/* Error message */}
              {submitError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              {/* Name fields - compact row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    autoComplete="given-name"
                    disabled={isSubmitting}
                    {...register('firstName')}
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    placeholder="Pérez"
                    autoComplete="family-name"
                    disabled={isSubmitting}
                    {...register('lastName')}
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="juan@ejemplo.com"
                  type="email"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('email')}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Password - with show/hide toggle (no confirm needed) */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    placeholder="Mínimo 8 caracteres"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                    {...register('password')}
                    className={cn('pr-10', errors.password ? 'border-destructive' : '')}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full" disabled={isSubmitting} size="lg" type="submit">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  'Crear cuenta gratis'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <Link className="font-medium text-primary hover:underline" href="/login">
                  Inicia sesión
                </Link>
              </p>

              <p className="text-center text-xs text-muted-foreground">
                Al continuar, aceptas los{' '}
                <Link className="underline hover:text-foreground" href="/terms">
                  Términos
                </Link>{' '}
                y{' '}
                <Link className="underline hover:text-foreground" href="/privacy">
                  Privacidad
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </OnboardingLayout>
  );
}
