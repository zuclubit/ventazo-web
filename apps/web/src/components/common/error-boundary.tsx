'use client';

// ============================================
// Error Boundary Component - FASE 5.11
// Global error handling and recovery
// ============================================

import * as React from 'react';

import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================
// Types
// ============================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

// ============================================
// Error Boundary Class Component
// ============================================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log to a service like Sentry
    // logErrorToService(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/app/dashboard';
  };

  handleReload = (): void => {
    window.location.reload();
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Algo salió mal</CardTitle>
              <CardDescription>
                Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {this.props.showDetails && this.state.error && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Bug className="h-4 w-4" />
                    Detalles del error
                  </div>
                  <pre className="overflow-auto text-xs text-muted-foreground">
                    {this.state.error.message}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-muted-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="default" onClick={this.handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Intentar de nuevo
              </Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={this.handleGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Ir al inicio
              </Button>
              <Button className="w-full sm:w-auto" variant="ghost" onClick={this.handleReload}>
                Recargar página
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================
// Functional Error Fallback Component
// ============================================

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps): JSX.Element {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div>
        <h3 className="text-lg font-semibold">Error</h3>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button size="sm" onClick={resetError}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}

// ============================================
// Inline Error Display
// ============================================

interface InlineErrorProps {
  error: Error | string;
  onRetry?: () => void;
}

export function InlineError({ error, onRetry }: InlineErrorProps): JSX.Element {
  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button className="h-auto px-2 py-1" size="sm" variant="ghost" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

// ============================================
// Query Error Handler
// ============================================

interface QueryErrorHandlerProps {
  error: Error | null;
  refetch?: () => void;
  children: React.ReactNode;
}

export function QueryErrorHandler({ error, refetch, children }: QueryErrorHandlerProps): JSX.Element {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div className="text-center">
          <p className="font-medium">Error al cargar datos</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        {refetch && (
          <Button size="sm" variant="outline" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================
// Suspense Error Boundary
// ============================================

interface SuspenseErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function SuspenseErrorBoundary({
  children,
  fallback,
  errorFallback,
}: SuspenseErrorBoundaryProps): JSX.Element {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <React.Suspense fallback={fallback}>{children}</React.Suspense>
    </ErrorBoundary>
  );
}

// ============================================
// Route Error Boundary
// ============================================

export function RouteErrorBoundary({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <ErrorBoundary
      showDetails={process.env.NODE_ENV === 'development'}
      onError={(error, errorInfo) => {
        // Log route errors
        console.error('Route Error:', error);
        console.error('Component Stack:', errorInfo.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
