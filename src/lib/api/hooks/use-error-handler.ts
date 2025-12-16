// ============================================
// Error Handler Hook - FASE 5.11
// Standardized error handling utilities
// ============================================

'use client';

import * as React from 'react';

import { toast } from '@/hooks/use-toast';

import { ApiError, NetworkError } from '../api-client';

// ============================================
// Types
// ============================================

export interface ErrorMessages {
  default?: string;
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
  validation?: string;
  network?: string;
  server?: string;
}

export interface UseErrorHandlerOptions {
  showToast?: boolean;
  messages?: ErrorMessages;
  onUnauthorized?: () => void;
  onForbidden?: () => void;
  onNotFound?: () => void;
  onValidation?: (errors: unknown) => void;
  onNetwork?: () => void;
  onServer?: () => void;
}

// ============================================
// Default Messages (Spanish)
// ============================================

const DEFAULT_MESSAGES: Required<ErrorMessages> = {
  default: 'Ha ocurrido un error inesperado',
  unauthorized: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
  forbidden: 'No tienes permisos para realizar esta acción',
  notFound: 'El recurso solicitado no existe',
  validation: 'Los datos proporcionados no son válidos',
  network: 'Error de conexión. Verifica tu conexión a internet',
  server: 'Error del servidor. Por favor, intenta más tarde',
};

// ============================================
// Helper Functions
// ============================================

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown, messages?: ErrorMessages): string {
  const msgs = { ...DEFAULT_MESSAGES, ...messages };

  if (error instanceof ApiError) {
    if (error.isUnauthorized) return msgs.unauthorized;
    if (error.isForbidden) return msgs.forbidden;
    if (error.isNotFound) return msgs.notFound;
    if (error.isValidationError) return msgs.validation;
    if (error.isServerError) return msgs.server;

    // Try to get message from error data
    if (error.data && typeof error.data === 'object') {
      const data = error.data as Record<string, unknown>;
      if (typeof data['message'] === 'string') {
        return data['message'];
      }
      if (typeof data['error'] === 'string') {
        return data['error'];
      }
    }

    return error.message || msgs.default;
  }

  if (error instanceof NetworkError) {
    return msgs.network;
  }

  if (error instanceof Error) {
    return error.message || msgs.default;
  }

  if (typeof error === 'string') {
    return error;
  }

  return msgs.default;
}

/**
 * Check if an error is a specific type
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.isUnauthorized || error.isForbidden);
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.isNotFound;
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && error.isValidationError;
}

export function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.isServerError;
}

// ============================================
// Error Handler Hook
// ============================================

/**
 * Hook for standardized error handling across the application
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    showToast = true,
    messages,
    onUnauthorized,
    onForbidden,
    onNotFound,
    onValidation,
    onNetwork,
    onServer,
  } = options;

  const msgs = React.useMemo(
    () => ({ ...DEFAULT_MESSAGES, ...messages }),
    [messages]
  );

  const handleError = React.useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || getErrorMessage(error, msgs);

      // Call specific handlers
      if (error instanceof ApiError) {
        if (error.isUnauthorized) {
          onUnauthorized?.();
        } else if (error.isForbidden) {
          onForbidden?.();
        } else if (error.isNotFound) {
          onNotFound?.();
        } else if (error.isValidationError) {
          onValidation?.(error.data);
        } else if (error.isServerError) {
          onServer?.();
        }
      } else if (error instanceof NetworkError) {
        onNetwork?.();
      }

      // Show toast notification
      if (showToast) {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }

      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error handled:', error);
      }

      return message;
    },
    [msgs, showToast, onUnauthorized, onForbidden, onNotFound, onValidation, onNetwork, onServer]
  );

  return {
    handleError,
    getErrorMessage: (error: unknown) => getErrorMessage(error, msgs),
  };
}

// ============================================
// Query Error Handler Hook
// ============================================

interface UseQueryErrorHandlerOptions extends UseErrorHandlerOptions {
  refetch?: () => void;
}

/**
 * Hook specifically for handling TanStack Query errors
 */
export function useQueryErrorHandler(
  error: Error | null,
  options: UseQueryErrorHandlerOptions = {}
) {
  const { refetch, ...errorOptions } = options;
  const { handleError, getErrorMessage } = useErrorHandler(errorOptions);

  // Handle error when it changes
  React.useEffect(() => {
    if (error) {
      handleError(error);
    }
  }, [error, handleError]);

  return {
    hasError: !!error,
    errorMessage: error ? getErrorMessage(error) : null,
    isAuthError: error ? isAuthError(error) : false,
    isNotFound: error ? isNotFoundError(error) : false,
    isNetworkError: error ? isNetworkError(error) : false,
    isServerError: error ? isServerError(error) : false,
    retry: refetch,
  };
}

// ============================================
// Mutation Error Handler Hook
// ============================================

interface UseMutationErrorHandlerOptions extends UseErrorHandlerOptions {
  successMessage?: string;
  showSuccessToast?: boolean;
}

/**
 * Hook specifically for handling mutation errors with success handling
 */
export function useMutationHandler(options: UseMutationErrorHandlerOptions = {}) {
  const {
    successMessage = 'Operación completada exitosamente',
    showSuccessToast = true,
    showToast = true,
    ...errorOptions
  } = options;

  const { handleError, getErrorMessage } = useErrorHandler({
    ...errorOptions,
    showToast,
  });

  const handleSuccess = React.useCallback(
    (message?: string) => {
      if (showSuccessToast) {
        toast({
          title: 'Exito',
          description: message || successMessage,
        });
      }
    },
    [showSuccessToast, successMessage]
  );

  const handleMutationError = React.useCallback(
    (error: unknown, customMessage?: string) => {
      return handleError(error, customMessage);
    },
    [handleError]
  );

  return {
    handleSuccess,
    handleError: handleMutationError,
    getErrorMessage,
  };
}

// ============================================
// Form Error Handler Hook
// ============================================

interface ValidationErrorData {
  field?: string;
  message: string;
  code?: string;
}

interface UseFormErrorHandlerOptions {
  setError?: (field: string, error: { type: string; message: string }) => void;
}

/**
 * Hook for handling form validation errors from API
 */
export function useFormErrorHandler(options: UseFormErrorHandlerOptions = {}) {
  const { setError } = options;
  const { handleError: baseHandleError } = useErrorHandler({ showToast: false });

  const handleFormError = React.useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.isValidationError && error.data) {
        const data = error.data as Record<string, unknown>;

        // Handle array of validation errors
        if (Array.isArray(data['errors'])) {
          const validationErrors = data['errors'] as ValidationErrorData[];

          validationErrors.forEach((err) => {
            if (err.field && setError) {
              setError(err.field, {
                type: 'server',
                message: err.message,
              });
            }
          });

          // Show first error as toast
          if (validationErrors.length > 0 && validationErrors[0]) {
            toast({
              title: 'Error de validacion',
              description: validationErrors[0].message,
              variant: 'destructive',
            });
          }

          return;
        }

        // Handle single validation error
        if (typeof data['message'] === 'string') {
          toast({
            title: 'Error',
            description: data['message'],
            variant: 'destructive',
          });
          return;
        }
      }

      // Fallback to base error handler
      baseHandleError(error);
    },
    [setError, baseHandleError]
  );

  return {
    handleFormError,
  };
}

// ============================================
// Exports
// ============================================

export {
  DEFAULT_MESSAGES,
};
