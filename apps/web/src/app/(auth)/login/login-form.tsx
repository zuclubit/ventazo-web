'use client';

/**
 * Login Form Component - SSO Only
 *
 * Single Sign-On authentication via Zuclubit SSO.
 * All users authenticate through the centralized SSO system.
 *
 * Flow:
 * 1. User clicks "Iniciar sesion con Zuclubit"
 * 2. Redirects to SSO authorization endpoint
 * 3. SSO authenticates user
 * 4. SSO redirects back to /api/auth/callback/zuclubit-sso
 * 5. Callback exchanges code for tokens and creates session
 */

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import {
  AuthLayout,
  AuthCard,
  AuthAlert,
} from '@/components/auth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

// ============================================
// SSO Configuration
// ============================================

const SSO_CONFIG = {
  issuerUrl: process.env['NEXT_PUBLIC_SSO_ISSUER_URL'] || 'https://sso.zuclubit.com',
  clientId: process.env['NEXT_PUBLIC_SSO_CLIENT_ID'] || 'ventazo',
};

/**
 * Build SSO authorization URL
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
  });

  return `${SSO_CONFIG.issuerUrl}/oauth/authorize?${params.toString()}`;
}

// ============================================
// Error Message Mapper
// ============================================

function getErrorMessage(error: string | null): string | null {
  if (!error) return null;

  const errorMap: Record<string, string> = {
    'session_expired': 'Tu sesion ha expirado. Por favor inicia sesion nuevamente.',
    'access_denied': 'Acceso denegado. Contacta al administrador.',
    'token_exchange_failed': 'Error al procesar la autenticacion. Intenta de nuevo.',
    'missing_code': 'Error de autenticacion. Intenta de nuevo.',
    'invalid_state': 'Sesion invalida. Intenta de nuevo.',
  };

  return errorMap[error] || 'Error de autenticacion. Intenta de nuevo.';
}

// ============================================
// Component
// ============================================

export function LoginForm() {
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const [isLoading, setIsLoading] = React.useState(false);

  // NOTE: We use /app/dashboard instead of /app due to OpenNext routing
  const redirectTo = searchParams.get('redirect') || '/app/dashboard';
  const urlError = searchParams.get('error');

  const handleSSOLogin = React.useCallback(() => {
    setIsLoading(true);
    const authUrl = buildSSOAuthUrl(redirectTo);
    window.location.href = authUrl;
  }, [redirectTo]);

  const errorMessage = getErrorMessage(urlError);

  return (
    <AuthLayout variant="premium" showFooter showHero>
      <AuthCard
        title={t.auth.login.title}
        subtitle="Accede con tu cuenta de Zuclubit"
        showLogo={false}
        maxWidth="md"
        variant="premium"
      >
        <div className="space-y-6">
          {/* Error Alert */}
          {errorMessage && (
            <AuthAlert type="error" title={errorMessage} />
          )}

          {/* SSO Login Button */}
          <Button
            type="button"
            className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200"
            onClick={handleSSOLogin}
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
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Iniciar sesion con Zuclubit
              </span>
            )}
          </Button>

          {/* Info text */}
          <p className="text-center text-sm text-muted-foreground">
            Seras redirigido al sistema de autenticacion centralizado de Zuclubit
          </p>

          {/* Help link */}
          <div className="text-center">
            <a
              href="https://sso.zuclubit.com/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              No tienes cuenta? Registrate en Zuclubit
            </a>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
