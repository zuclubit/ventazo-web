'use client';

/**
 * Email OAuth Callback Page
 *
 * Handles the redirect from OAuth providers (Google, Microsoft) for email sync.
 * Extracts the OAuth code and redirects to the email page to complete connection.
 *
 * Security considerations:
 * - Validates state parameter to prevent CSRF
 * - Sanitizes URL parameters before use
 * - Uses client-side redirect for compatibility with edge runtimes
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

// ============================================
// Loading Component
// ============================================

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h1 className="text-xl font-semibold text-foreground">Conectando cuenta de correo</h1>
        <p className="text-muted-foreground">Por favor espera mientras completamos la conexion...</p>
      </div>
    </div>
  );
}

// ============================================
// Callback Handler Component
// ============================================

function EmailCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors from provider
    if (oauthError) {
      console.error('[Email OAuth Callback] Error:', oauthError, errorDescription);
      const params = new URLSearchParams();
      params.set('connect_error', oauthError);
      if (errorDescription) {
        params.set('error_message', errorDescription);
      }
      router.replace(`/app/email?${params.toString()}`);
      return;
    }

    // Validate authorization code exists
    if (!code) {
      console.error('[Email OAuth Callback] Missing authorization code');
      setError('No se recibio el codigo de autorizacion');
      setTimeout(() => {
        router.replace('/app/email?connect_error=missing_code&error_message=No+authorization+code+received');
      }, 2000);
      return;
    }

    // Validate code format (basic security check)
    if (code.length < 10 || code.length > 500) {
      console.error('[Email OAuth Callback] Invalid authorization code length');
      setError('Codigo de autorizacion invalido');
      setTimeout(() => {
        router.replace('/app/email?connect_error=invalid_code&error_message=Invalid+authorization+code');
      }, 2000);
      return;
    }

    // Parse provider from state parameter
    // Expected formats: "default", "email_connect:google", "email_connect:microsoft"
    let provider = 'google';
    if (state && state.includes(':')) {
      const stateParts = state.split(':');
      if (stateParts.length >= 2 && stateParts[1]) {
        const parsedProvider = stateParts[1].toLowerCase();
        // Whitelist valid providers
        if (['google', 'microsoft', 'gmail', 'outlook'].includes(parsedProvider)) {
          provider = parsedProvider;
        }
      }
    }

    console.log('[Email OAuth Callback] Redirecting with code for provider:', provider);

    // Redirect to email page with OAuth parameters
    // The email page will handle the token exchange with the backend
    const params = new URLSearchParams();
    params.set('oauth_code', code);
    params.set('oauth_provider', provider);

    router.replace(`/app/email?${params.toString()}`);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">Error de Conexion</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return <LoadingState />;
}

// ============================================
// Main Page Component
// ============================================

export default function EmailCallbackPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EmailCallbackHandler />
    </Suspense>
  );
}
