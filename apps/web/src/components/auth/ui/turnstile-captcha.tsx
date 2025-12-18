'use client';

import * as React from 'react';

import Script from 'next/script';

import { cn } from '@/lib/utils';

/**
 * Cloudflare Turnstile CAPTCHA Component
 * Bot protection for signup and login forms (P0.2)
 *
 * Docs: https://developers.cloudflare.com/turnstile/
 */

// Turnstile widget appearance
export type TurnstileTheme = 'light' | 'dark' | 'auto';
export type TurnstileSize = 'normal' | 'compact';

export interface TurnstileCaptchaProps {
  /** Cloudflare Turnstile site key */
  siteKey: string;
  /** Callback when verification succeeds */
  onVerify: (token: string) => void;
  /** Callback when verification fails or expires */
  onError?: (error: Error) => void;
  /** Callback when token expires */
  onExpire?: () => void;
  /** Callback before interactive challenge */
  onBeforeInteractive?: () => void;
  /** Callback after interactive challenge */
  onAfterInteractive?: () => void;
  /** Theme */
  theme?: TurnstileTheme;
  /** Size */
  size?: TurnstileSize;
  /** Accessibility label */
  ariaLabel?: string;
  /** CSS class name */
  className?: string;
  /** Action name for analytics */
  action?: string;
  /** Additional cData */
  cData?: string;
  /** Retry on failure */
  retry?: 'auto' | 'never';
  /** Retry interval in ms */
  retryInterval?: number;
  /** Appearance style */
  appearance?: 'always' | 'execute' | 'interaction-only';
  /** Refresh expired token */
  refreshExpired?: 'auto' | 'manual' | 'never';
  /** Whether to auto-reset on error */
  resetOnError?: boolean;
}

// Turnstile response types
interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: (error: Error) => void;
  'before-interactive-callback'?: () => void;
  'after-interactive-callback'?: () => void;
  theme?: TurnstileTheme;
  size?: TurnstileSize;
  tabindex?: number;
  action?: string;
  cData?: string;
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  appearance?: 'always' | 'execute' | 'interaction-only';
  'refresh-expired'?: 'auto' | 'manual' | 'never';
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement | string, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
      isExpired: (widgetId?: string) => boolean;
    };
    onTurnstileLoad?: () => void;
  }
}

export function TurnstileCaptcha({
  siteKey,
  onVerify,
  onError,
  onExpire,
  onBeforeInteractive,
  onAfterInteractive,
  theme = 'auto',
  size = 'normal',
  ariaLabel = 'Verificación de seguridad',
  className,
  action,
  cData,
  retry = 'auto',
  retryInterval = 8000,
  appearance = 'always',
  refreshExpired = 'auto',
  resetOnError = true,
}: TurnstileCaptchaProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = React.useState(false);
  const [isRendered, setIsRendered] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Render widget when script loads
  const renderWidget = React.useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetIdRef.current) {
      return;
    }

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          setError(null);
          onVerify(token);
        },
        'expired-callback': () => {
          onExpire?.();
        },
        'error-callback': (err: Error) => {
          const errorMsg = err?.message || 'Verification failed';
          setError(errorMsg);
          onError?.(err);

          if (resetOnError && widgetIdRef.current) {
            setTimeout(() => {
              window.turnstile?.reset(widgetIdRef.current!);
            }, 2000);
          }
        },
        'before-interactive-callback': onBeforeInteractive,
        'after-interactive-callback': onAfterInteractive,
        theme,
        size,
        action,
        cData,
        retry,
        'retry-interval': retryInterval,
        appearance,
        'refresh-expired': refreshExpired,
      });

      widgetIdRef.current = widgetId;
      setIsRendered(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to render captcha';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    }
  }, [
    siteKey,
    onVerify,
    onExpire,
    onError,
    onBeforeInteractive,
    onAfterInteractive,
    theme,
    size,
    action,
    cData,
    retry,
    retryInterval,
    appearance,
    refreshExpired,
    resetOnError,
  ]);

  // Handle script load
  const handleScriptLoad = React.useCallback(() => {
    setScriptLoaded(true);
    // Delay render slightly to ensure Turnstile is fully initialized
    setTimeout(renderWidget, 100);
  }, [renderWidget]);

  // Setup global callback
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.onTurnstileLoad = handleScriptLoad;
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.onTurnstileLoad = undefined;
      }
    };
  }, [handleScriptLoad]);

  // Render when script is already loaded
  React.useEffect(() => {
    if (window.turnstile && !isRendered) {
      renderWidget();
    }
  }, [scriptLoaded, renderWidget, isRendered]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  // Manual reset function
  const reset = React.useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setError(null);
    }
  }, []);

  // Get current response
  const getResponse = React.useCallback((): string | undefined => {
    if (widgetIdRef.current && window.turnstile) {
      return window.turnstile.getResponse(widgetIdRef.current);
    }
    return undefined;
  }, []);

  // Expose methods via ref
  React.useImperativeHandle(
    React.useRef({ reset, getResponse }),
    () => ({ reset, getResponse }),
    [reset, getResponse]
  );

  return (
    <>
      {/* Turnstile Script */}
      <Script
        async
        defer
        id="cf-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad"
        strategy="afterInteractive"
      />

      {/* Widget Container */}
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <div
          ref={containerRef}
          aria-label={ariaLabel}
          className="cf-turnstile"
          role="group"
        />

        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive text-center">
            Error de verificación. Por favor intenta de nuevo.
          </p>
        )}
      </div>
    </>
  );
}

// Hook for using Turnstile imperatively
export function useTurnstile(siteKey: string) {
  const [token, setToken] = React.useState<string | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleVerify = React.useCallback((newToken: string) => {
    setToken(newToken);
    setIsVerified(true);
    setIsLoading(false);
    setError(null);
  }, []);

  const handleError = React.useCallback((err: Error) => {
    setError(err.message);
    setIsLoading(false);
    setIsVerified(false);
  }, []);

  const handleExpire = React.useCallback(() => {
    setToken(null);
    setIsVerified(false);
  }, []);

  const reset = React.useCallback(() => {
    setToken(null);
    setIsVerified(false);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    token,
    isVerified,
    isLoading,
    error,
    handleVerify,
    handleError,
    handleExpire,
    reset,
    siteKey,
  };
}

// Export type for ref
export type TurnstileRef = {
  reset: () => void;
  getResponse: () => string | undefined;
};
