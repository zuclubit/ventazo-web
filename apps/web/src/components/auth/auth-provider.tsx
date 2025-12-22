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
 * - Syncs with TenantStore for tenant-aware components
 * - No client-side token storage (secure)
 * - NON-BLOCKING: Renders children immediately while auth loads in background
 *
 * @see https://nextjs.org/docs/app/guides/authentication
 */

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SplashScreen } from '@/components/common/splash-screen';
import { getCurrentUser, logoutAction, getTenantDetailsAction } from '@/lib/session/actions';
import { useAuthStore } from '@/store/auth.store';
import { useTenantStore } from '@/store/tenant.store';
import type { Permission, UserRole, PlanTier } from '@/lib/auth/types';
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
  const setTenant = useTenantStore((state) => state.setTenant);
  const clearTenant = useTenantStore((state) => state.clearTenant);

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

        // Fetch and set tenant details if user has a tenant
        if (authUser.tenantId) {
          try {
            const tenantDetails = await getTenantDetailsAction();
            if (tenantDetails) {
              setTenant({
                id: tenantDetails.id,
                name: tenantDetails.name,
                slug: tenantDetails.slug,
                plan: tenantDetails.plan as PlanTier,
                isActive: tenantDetails.isActive,
                settings: tenantDetails.settings,
                // Pass metadata with branding for dynamic colors/logo
                metadata: tenantDetails.branding
                  ? { branding: tenantDetails.branding }
                  : undefined,
                createdAt: tenantDetails.createdAt,
              });
            }
          } catch (tenantError) {
            console.warn('[AuthProvider] Failed to fetch tenant details:', tenantError);
            // Set minimal tenant so app can function
            setTenant({
              id: authUser.tenantId,
              name: 'Mi Negocio',
              slug: 'mi-negocio',
              plan: 'free' as PlanTier,
              isActive: true,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } else {
        setUser(null);
        clearTenant();

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
      clearTenant();

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
  }, [setStoreState, setTenant, clearTenant]);

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

  // NON-BLOCKING: Always render children immediately
  // The AuthGuard and GuestGuard components handle loading states for protected routes
  // This allows public pages (landing, login, register) to render without waiting
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
// NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
export function GuestGuard({ children, redirectTo = '/app/dashboard' }: GuestGuardProps) {
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
