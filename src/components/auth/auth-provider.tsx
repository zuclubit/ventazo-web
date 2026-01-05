'use client';

/**
 * Auth Provider Component - Unified Authentication
 *
 * This is the SINGLE source of truth for authentication state in the app.
 *
 * Architecture:
 * - Session stored in encrypted httpOnly cookie (server-side)
 * - This provider fetches user data via Server Action on mount
 * - Syncs with Zustand store for permission checks
 * - No client-side token storage (secure)
 * - AUTOMATIC SESSION REFRESH via useSessionRefresh hook
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 * @see middleware.ts for server-side auto-refresh
 */

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SplashScreen } from '@/components/common/splash-screen';
import { getCurrentUser, logoutAction } from '@/lib/session/actions';
import { useAuthStore } from '@/store/auth.store';
import { useSessionRefresh } from '@/hooks/use-session-refresh';
import type { Permission, UserRole } from '@/lib/auth/types';
import { ROLE_PERMISSIONS } from '@/lib/auth/types';

// ============================================
// Types
// ============================================

interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: Permission[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// ============================================
// Helpers
// ============================================

/**
 * Get permissions for a role
 */
function getPermissionsForRole(role: string): Permission[] {
  const normalizedRole = role.toLowerCase() as keyof typeof ROLE_PERMISSIONS;
  return [...(ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.viewer)];
}

// ============================================
// Context
// ============================================

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function useAuthContext() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// Auth Provider Component
// ============================================

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Get Zustand store setters for syncing
  const setStoreState = useAuthStore.setState;

  // Fetch user data and sync with store
  const fetchUser = React.useCallback(async () => {
    try {
      const userData = await getCurrentUser();

      if (userData) {
        const authUser: AuthUser = {
          id: userData.userId,
          email: userData.email,
          tenantId: userData.tenantId,
          role: userData.role,
          permissions: getPermissionsForRole(userData.role),
        };

        setUser(authUser);

        // Sync with Zustand store for permission guards
        setStoreState({
          user: {
            id: authUser.id,
            email: authUser.email,
            tenantId: authUser.tenantId,
            role: authUser.role as UserRole,
            permissions: authUser.permissions,
            isActive: true,
            createdAt: new Date().toISOString(),
          },
          isAuthenticated: true,
          isInitialized: true,
          isLoading: false,
          currentTenantId: authUser.tenantId,
        });
      } else {
        setUser(null);

        // Clear Zustand store
        setStoreState({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
          isLoading: false,
          tokens: null,
          tenants: [],
          currentTenantId: null,
        });
      }
    } catch (error) {
      console.warn('[AuthProvider] Failed to fetch user:', error);
      setUser(null);

      // Clear store on error
      setStoreState({
        user: null,
        isAuthenticated: false,
        isInitialized: true,
        isLoading: false,
        tokens: null,
        tenants: [],
        currentTenantId: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, [setStoreState]);

  // Logout handler
  const handleLogout = React.useCallback(async () => {
    try {
      await logoutAction();
    } catch (error) {
      // logoutAction redirects, so errors here are expected
      console.warn('[AuthProvider] Logout redirect:', error);
    }
  }, []);

  // Fetch user on mount
  React.useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ============================================
  // Session Auto-Refresh
  // ============================================

  /**
   * Handle session expiration from the refresh hook
   * Clears local state and redirects to login
   */
  const handleSessionExpired = React.useCallback(() => {
    console.log('[AuthProvider] Session expired, clearing state...');

    setUser(null);
    setStoreState({
      user: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
      tokens: null,
      tenants: [],
      currentTenantId: null,
    });

    // Note: The hook will handle the redirect
  }, [setStoreState]);

  /**
   * Handle successful refresh - re-fetch user data to sync state
   */
  const handleRefreshSuccess = React.useCallback(() => {
    console.log('[AuthProvider] Session refreshed successfully');
    // Optionally re-fetch user to ensure data is in sync
    // fetchUser();
  }, []);

  /**
   * Handle refresh errors
   */
  const handleRefreshError = React.useCallback((error: Error) => {
    console.error('[AuthProvider] Session refresh error:', error.message);
  }, []);

  // Activate automatic session refresh
  // This hook monitors the session and refreshes tokens proactively
  useSessionRefresh({
    enabled: !!user, // Only refresh when user is authenticated
    onSessionExpired: handleSessionExpired,
    onRefreshSuccess: handleRefreshSuccess,
    onRefreshError: handleRefreshError,
    checkInterval: 2 * 60 * 1000, // Check every 2 minutes
  });

  // Context value
  const value = React.useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      refresh: fetchUser,
      logout: handleLogout,
    }),
    [user, isLoading, fetchUser, handleLogout]
  );

  // Show loading screen while checking auth
  if (isLoading) {
    return <SplashScreen message="Cargando..." variant="branded" />;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Auth Guard Component
// ============================================

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Requires authentication to render children
 * Redirects to login if not authenticated
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthContext();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return fallback || <SplashScreen message="Verificando sesion..." variant="branded" />;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}

// ============================================
// Guest Guard Component (for login/register pages)
// ============================================

interface GuestGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Prevents authenticated users from accessing guest-only pages
 * Redirects to app if already authenticated
 */
export function GuestGuard({ children, redirectTo = '/app' }: GuestGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthContext();

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isLoading, isAuthenticated, redirectTo, router]);

  if (isLoading) {
    return <SplashScreen message="Verificando sesion..." variant="branded" />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// ============================================
// Hook for easy auth access
// ============================================

/**
 * Hook to access auth context
 * Use this in components that need auth state
 */
export function useAuth() {
  return useAuthContext();
}
