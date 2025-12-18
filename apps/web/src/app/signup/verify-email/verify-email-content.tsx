'use client';

import * as React from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ArrowLeft, Mail } from 'lucide-react';

import { OTPInput } from '@/components/auth/ui/otp-input';
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useOnboardingStore } from '@/store/onboarding.store';

// ============================================
// OTP API Functions
// ============================================

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api/v1';

interface SendOTPResponse {
  success: boolean;
  message: string;
  expiresAt?: string;
  otpCode?: string; // Only in dev mode
}

interface VerifyOTPResponse {
  success: boolean;
  message: string;
  remainingAttempts: number;
}

interface OTPStatusResponse {
  canRequest: boolean;
  waitSeconds: number;
}

async function sendOTP(email: string): Promise<SendOTPResponse> {
  const response = await fetch(`${API_BASE}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose: 'signup_verification' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al enviar el código');
  }

  return response.json();
}

async function verifyOTP(email: string, otpCode: string): Promise<VerifyOTPResponse> {
  const response = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otpCode, purpose: 'signup_verification' }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Código incorrecto',
      remainingAttempts: data.remainingAttempts ?? 0,
    };
  }

  return data;
}

async function resendOTP(email: string): Promise<SendOTPResponse> {
  const response = await fetch(`${API_BASE}/auth/otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, purpose: 'signup_verification' }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al reenviar el código');
  }

  return response.json();
}

async function getOTPStatus(email: string): Promise<OTPStatusResponse> {
  const response = await fetch(`${API_BASE}/auth/otp/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    return { canRequest: true, waitSeconds: 0 };
  }

  return response.json();
}

// ============================================
// Verify Email Content Component
// ============================================

export function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, updateData, completeStep, setStep } = useOnboardingStore();

  // Get email from URL params or store
  const emailFromParams = searchParams.get('email');
  const email = emailFromParams || data.email || '';

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  const [success, setSuccess] = React.useState(false);
  const [expiresIn, setExpiresIn] = React.useState(600); // 10 minutes default
  const [canResend, setCanResend] = React.useState(true);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [remainingAttempts, setRemainingAttempts] = React.useState<number | undefined>();
  const [otpSent, setOtpSent] = React.useState(false);

  // Send OTP on mount
  React.useEffect(() => {
    if (email && !otpSent) {
      handleSendOTP();
    }
  }, [email]);

  const handleSendOTP = async () => {
    if (!email) return;

    try {
      const status = await getOTPStatus(email);
      if (!status.canRequest && status.waitSeconds > 0) {
        setResendCooldown(status.waitSeconds);
        setOtpSent(true);
        return;
      }

      const result = await sendOTP(email);
      if (result.success && result.expiresAt) {
        const expiresAt = new Date(result.expiresAt);
        const now = new Date();
        const seconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setExpiresIn(seconds);
      }
      setOtpSent(true);

      // Log OTP in dev mode for testing
      if (result.otpCode) {
        console.log('[DEV] OTP Code:', result.otpCode);
      }
    } catch (err) {
      console.error('Error sending OTP:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al enviar el código');
      setError(true);
    }
  };

  const handleVerify = async (otp: string) => {
    if (!email) return;

    setLoading(true);
    setError(false);
    setErrorMessage('');

    try {
      const result = await verifyOTP(email, otp);

      if (result.success) {
        setSuccess(true);
        setRemainingAttempts(undefined);

        // Update onboarding store
        updateData({ emailVerified: true });
        completeStep('signup');

        // Redirect to next step after brief delay
        setTimeout(() => {
          setStep('create-business');
          router.push('/onboarding/create-business');
        }, 1500);
      } else {
        setError(true);
        setErrorMessage(result.message);
        setRemainingAttempts(result.remainingAttempts);
      }
    } catch (err) {
      setError(true);
      setErrorMessage(err instanceof Error ? err.message : 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setError(false);
    setErrorMessage('');
    setRemainingAttempts(undefined);

    try {
      const result = await resendOTP(email);
      if (result.success && result.expiresAt) {
        const expiresAt = new Date(result.expiresAt);
        const now = new Date();
        const seconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
        setExpiresIn(seconds);
      }
      setResendCooldown(60);

      // Log OTP in dev mode for testing
      if (result.otpCode) {
        console.log('[DEV] New OTP Code:', result.otpCode);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Error al reenviar el código');
      setError(true);
    }
  };

  const handleGoBack = () => {
    router.push('/signup');
  };

  // Mask email for display
  const maskedEmail = React.useMemo(() => {
    if (!email) return '';
    const parts = email.split('@');
    const local = parts[0];
    const domain = parts[1];
    if (!local || !domain) return email;
    const masked = local.length > 2
      ? local.slice(0, 2) + '***'
      : local[0] + '***';
    return `${masked}@${domain}`;
  }, [email]);

  // If no email, redirect back to signup
  if (!email) {
    return (
      <OnboardingLayout showProgress={false} showSteps={false}>
        <div className="flex min-h-[80vh] items-center justify-center">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CardTitle>Email no encontrado</CardTitle>
              <CardDescription>
                Por favor, completa el registro primero.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/signup')}>
                Ir a Registro
              </Button>
            </CardContent>
          </Card>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout showProgress={false} showSteps={false}>
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {/* Email icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <CardTitle className="text-2xl">Verifica tu email</CardTitle>
            <CardDescription className="mt-2">
              Enviamos un código de 6 dígitos a{' '}
              <span className="font-medium text-foreground">{maskedEmail}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* OTP Input */}
            <OTPInput
              autoFocus
              canResend={canResend}
              error={error}
              errorMessage={errorMessage}
              expiresIn={expiresIn}
              loading={loading}
              remainingAttempts={remainingAttempts}
              resendCooldown={resendCooldown}
              success={success}
              onComplete={handleVerify}
              onResend={handleResend}
            />

            {/* Helpful text */}
            <div className="space-y-2 text-center text-sm text-muted-foreground">
              <p>
                Revisa tu bandeja de entrada y spam.
              </p>
              <p>
                El código expira en 10 minutos.
              </p>
            </div>

            {/* Back button */}
            <Button
              className="w-full gap-2"
              disabled={loading || success}
              variant="ghost"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Usar otro email
            </Button>
          </CardContent>
        </Card>
      </div>
    </OnboardingLayout>
  );
}
