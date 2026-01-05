'use client';

/**
 * Session Refresh Hook
 *
 * Proactively monitors and refreshes the user's session to prevent
 * unexpected logouts and session expiration errors.
 *
 * Features:
 * - Periodic session health checks
 * - Automatic token refresh before expiration
 * - Visibility-based refresh (when user returns to tab)
 * - Focus-based refresh (when window regains focus)
 * - Graceful error handling with callbacks
 *
 * This hook works in conjunction with the middleware auto-refresh
 * to provide a seamless authentication experience.
 *
 * @see middleware.ts for server-side token refresh
 * @see session/actions.ts for server actions
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { refreshSessionAction, getCurrentUser } from '@/lib/session/actions';

// ============================================
// Configuration
// ============================================

/**
 * Interval between session health checks (2 minutes)
 * This is less frequent than the middleware check since
 * the middleware handles most refresh scenarios
 */
const REFRESH_CHECK_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Minimum time between refresh attempts to prevent flooding (30 seconds)
 */
const MIN_REFRESH_INTERVAL_MS = 30 * 1000;

/**
 * Initial delay before first refresh check (5 seconds)
 * Gives time for the session to be fully established after auth
 */
const INITIAL_CHECK_DELAY_MS = 5 * 1000;

// ============================================
// Types
// ============================================

export interface UseSessionRefreshOptions {
  /**
   * Callback when session expires or becomes invalid
   * Default: redirects to login page
   */
  onSessionExpired?: () => void;

  /**
   * Callback when token refresh fails
   * Default: logs error to console
   */
  onRefreshError?: (error: Error) => void;

  /**
   * Callback when token is successfully refreshed
   * Useful for updating UI or logging
   */
  onRefreshSuccess?: () => void;

  /**
   * Whether to enable automatic refresh
   * Default: true
   */
  enabled?: boolean;

  /**
   * Custom check interval in milliseconds
   * Default: REFRESH_CHECK_INTERVAL_MS (2 minutes)
   */
  checkInterval?: number;
}

export interface UseSessionRefreshReturn {
  /**
   * Manually trigger a session refresh
   * Returns true if refresh was successful
   */
  refresh: () => Promise<boolean>;

  /**
   * Whether a refresh is currently in progress
   */
  isRefreshing: boolean;

  /**
   * Last successful refresh timestamp
   */
  lastRefresh: number | null;
}

// ============================================
// Hook Implementation
// ============================================

export function useSessionRefresh(
  options: UseSessionRefreshOptions = {}
): UseSessionRefreshReturn {
  const {
    onSessionExpired,
    onRefreshError,
    onRefreshSuccess,
    enabled = true,
    checkInterval = REFRESH_CHECK_INTERVAL_MS,
  } = options;

  const router = useRouter();

  // Refs to track state without causing re-renders
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const consecutiveFailuresRef = useRef(0);
  const initialCheckDoneRef = useRef(false);

  /**
   * Core refresh function
   * Checks session validity and refreshes if needed
   */
  const checkAndRefresh = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent refreshes
    if (isRefreshingRef.current) {
      return false;
    }

    // Prevent refresh flooding
    const now = Date.now();
    if (
      lastRefreshRef.current &&
      now - lastRefreshRef.current < MIN_REFRESH_INTERVAL_MS
    ) {
      return true; // Assume session is still valid
    }

    try {
      isRefreshingRef.current = true;

      // First, check if session exists
      const user = await getCurrentUser();

      if (!user) {
        consecutiveFailuresRef.current += 1;
        console.warn(
          `[useSessionRefresh] No valid session found (attempt ${consecutiveFailuresRef.current})`
        );

        // Only trigger session expired after 2 consecutive failures
        // This prevents false positives due to race conditions
        if (consecutiveFailuresRef.current >= 2 && mountedRef.current) {
          console.log('[useSessionRefresh] Multiple failures, session is invalid');
          if (onSessionExpired) {
            onSessionExpired();
          } else {
            // Default behavior: redirect to login
            router.push('/login?error=session_expired');
          }
        }

        return false;
      }

      // Reset failure counter on success
      consecutiveFailuresRef.current = 0;

      // Attempt to refresh the session
      // The server action will check if refresh is actually needed
      const refreshed = await refreshSessionAction();

      if (!refreshed) {
        consecutiveFailuresRef.current += 1;
        console.warn(
          `[useSessionRefresh] Session refresh failed (attempt ${consecutiveFailuresRef.current})`
        );

        // Only trigger session expired after 2 consecutive failures
        if (consecutiveFailuresRef.current >= 2 && mountedRef.current) {
          console.log('[useSessionRefresh] Multiple refresh failures, session is invalid');
          if (onSessionExpired) {
            onSessionExpired();
          } else {
            router.push('/login?error=session_expired');
          }
        }

        return false;
      }

      // Refresh successful
      lastRefreshRef.current = Date.now();
      consecutiveFailuresRef.current = 0;
      initialCheckDoneRef.current = true;

      if (mountedRef.current && onRefreshSuccess) {
        onRefreshSuccess();
      }

      return true;
    } catch (error) {
      console.error('[useSessionRefresh] Error:', error);

      if (mountedRef.current && onRefreshError) {
        onRefreshError(error instanceof Error ? error : new Error(String(error)));
      }

      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [router, onSessionExpired, onRefreshError, onRefreshSuccess]);

  /**
   * Handle visibility change (user returns to tab)
   */
  const handleVisibilityChange = useCallback(() => {
    // Only check if initial check has been done successfully
    if (document.visibilityState === 'visible' && initialCheckDoneRef.current) {
      console.log('[useSessionRefresh] Tab became visible, checking session...');
      checkAndRefresh();
    }
  }, [checkAndRefresh]);

  /**
   * Handle window focus (user clicks on window)
   */
  const handleFocus = useCallback(() => {
    // Only check if initial check has been done successfully
    if (initialCheckDoneRef.current) {
      console.log('[useSessionRefresh] Window focused, checking session...');
      checkAndRefresh();
    }
  }, [checkAndRefresh]);

  /**
   * Setup and cleanup effects
   */
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled) {
      return;
    }

    // Delay initial check to allow session to stabilize after auth redirect
    // This prevents false "session expired" errors right after login
    const initialTimeout = setTimeout(() => {
      if (mountedRef.current) {
        console.log('[useSessionRefresh] Running initial session check...');
        checkAndRefresh();
      }
    }, INITIAL_CHECK_DELAY_MS);

    // Setup periodic check interval (starts after initial delay)
    intervalRef.current = setInterval(checkAndRefresh, checkInterval);

    // Setup visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Setup focus listener
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      mountedRef.current = false;

      clearTimeout(initialTimeout);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, checkInterval, checkAndRefresh, handleVisibilityChange, handleFocus]);

  return {
    refresh: checkAndRefresh,
    isRefreshing: isRefreshingRef.current,
    lastRefresh: lastRefreshRef.current,
  };
}

/**
 * Default export for convenience
 */
export default useSessionRefresh;
