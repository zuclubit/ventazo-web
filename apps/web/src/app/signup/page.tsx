'use client';

/**
 * Signup Page - SSO Only
 *
 * Single Sign-On registration via Zuclubit SSO.
 * All users register through the centralized SSO system.
 *
 * @module app/signup/page
 */

import * as React from 'react';
import Link from 'next/link';

import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// ============================================
// SSO Configuration
// ============================================

const SSO_CONFIG = {
  issuerUrl: process.env['NEXT_PUBLIC_SSO_ISSUER_URL'] || 'https://sso.zuclubit.com',
  clientId: process.env['NEXT_PUBLIC_SSO_CLIENT_ID'] || 'ventazo',
};

/**
 * Build SSO authorization URL for registration
 */
function buildSSOAuthUrl(redirectTo: string): string {
  const state = btoa(JSON.stringify({ redirect: redirectTo, ts: Date.now() }));

  const callbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback/zuclubit-sso`
    : 'http://localhost:3000/api/auth/callback/zuclubit-sso';

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SSO_CONFIG.clientId,
    redirect_uri: callbackUrl,
    scope: 'openid profile email offline_access crm:read crm:write',
    state,
    // Hint to SSO to show registration form
    prompt: 'create',
  });

  return `${SSO_CONFIG.issuerUrl}/oauth/authorize?${params.toString()}`;
}

// ============================================
// Signup Page
// ============================================

export default function SignupPage() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSSOSignup = React.useCallback(() => {
    setIsLoading(true);
    const authUrl = buildSSOAuthUrl('/onboarding/create-business');
    window.location.href = authUrl;
  }, []);

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

          <CardContent className="space-y-6">
            {/* SSO Signup Button */}
            <Button
              type="button"
              className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200"
              onClick={handleSSOSignup}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Redirigiendo...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Registrarse con Zuclubit
                </span>
              )}
            </Button>

            {/* Info text */}
            <p className="text-center text-sm text-muted-foreground">
              Seras redirigido al sistema de registro centralizado de Zuclubit
            </p>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link className="font-medium text-primary hover:underline" href="/login">
                Inicia sesion
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              Al continuar, aceptas los{' '}
              <Link className="underline hover:text-foreground" href="/terms">
                Terminos
              </Link>{' '}
              y{' '}
              <Link className="underline hover:text-foreground" href="/privacy">
                Privacidad
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </OnboardingLayout>
  );
}
