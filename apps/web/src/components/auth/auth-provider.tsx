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

type OnboardingStatus = 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';

interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: string;
  permissions: Permission[];
}

interface OnboardingState {
  status: OnboardingStatus;
  currentStep: string;
  requiresOnboarding: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True after the first auth check is complete (prevents SplashScreen on navigation) */
  hasInitialized: boolean;
  /** Onboarding state for proper navigation */
  onboarding: OnboardingState | null;
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
  const [onboarding, setOnboarding] = React.useState<OnboardingState | null>(null);
  // Track if we've done the initial auth check (prevents SplashScreen on navigation)
  const [hasInitialized, setHasInitialized] = React.useState(false);

  // Get Zustand store setters for syncing - use stable references
  const setStoreState = React.useRef(useAuthStore.setState).current;
  const setTenant = React.useRef(useTenantStore.getState().setTenant).current;
  const clearTenant = React.useRef(useTenantStore.getState().clearTenant).current;

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

        // Set onboarding state from session data
        setOnboarding({
          status: userData.onboardingStatus,
          currentStep: userData.onboardingStep,
          requiresOnboarding: userData.requiresOnboarding,
        });

        // Debug log for troubleshooting
        console.log('[AuthProvider] User loaded with onboarding:', {
          userId: userData.userId,
          tenantId: userData.tenantId,
          onboardingStatus: userData.onboardingStatus,
          requiresOnboarding: userData.requiresOnboarding,
        });

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
        setOnboarding(null);
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
      setOnboarding(null);
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
      setHasInitialized(true);
    }
  }, []); // Empty deps - refs are stable

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
      hasInitialized,
      onboarding,
      refresh: fetchUser,
      logout: handleLogout,
    }),
    [user, isLoading, hasInitialized, onboarding, fetchUser, handleLogout]
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
 *
 * SPA OPTIMIZATION: After initial auth check completes, navigation between
 * protected routes renders children immediately (no SplashScreen).
 * This creates the native app feel where the shell persists.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, hasInitialized } = useAuthContext();

  React.useEffect(() => {
    // Only redirect after initial check is complete
    if (hasInitialized && !isAuthenticated) {
      const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [hasInitialized, isAuthenticated, pathname, router]);

  // FIRST LOAD: Show splash screen only during initial auth check
  // This happens once when the app first loads
  if (!hasInitialized && isLoading) {
    return fallback || <SplashScreen message="Verificando sesion..." variant="branded" />;
  }

  // NAVIGATION: After initialization, if user is authenticated, render immediately
  // This is the key to SPA-like navigation - no splash on route changes
  if (hasInitialized && isAuthenticated) {
    return <>{children}</>;
  }

  // Waiting for redirect to login (don't flash content)
  if (hasInitialized && !isAuthenticated) {
    return fallback || null;
  }

  // Edge case: still loading but already initialized (refresh scenario)
  // Show children if we have a cached auth state, splash otherwise
  return isAuthenticated ? <>{children}</> : (fallback || null);
}

// ============================================
// Guest Guard Component (for login/register pages)
// ============================================

interface GuestGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Get the correct redirect URL based on user's onboarding state
 * Implements the routing logic:
 * - If requires onboarding → appropriate onboarding step
 * - If has tenant and completed onboarding → /app/dashboard
 * - If no tenant → /onboarding/create-business
 *
 * SECURITY: This function is used by GuestGuard to redirect authenticated users
 * from guest-only pages (login, register) to their appropriate destination.
 */
function getOnboardingAwareRedirect(
  onboarding: OnboardingState | null,
  tenantId: string | undefined,
  fallback: string
): string {
  const hasTenant = !!tenantId;

  // If no onboarding state but has tenant, assume completed (legacy/safe default)
  // This prevents incorrect redirects to onboarding for established users
  if (!onboarding) {
    return hasTenant ? fallback : '/onboarding/create-business';
  }

  const { requiresOnboarding, status, currentStep } = onboarding;

  // CRITICAL: If user has tenant and doesn't explicitly require onboarding,
  // always send them to the app, not onboarding
  if (hasTenant && !requiresOnboarding) {
    return fallback;
  }

  // If user requires onboarding, redirect to the appropriate step
  if (requiresOnboarding && status !== 'completed') {
    switch (currentStep) {
      case 'signup':
      case 'create-business':
        return '/onboarding/create-business';
      case 'branding':
      case 'modules':
      case 'business-hours':
        return '/onboarding/setup';
      case 'invite-team':
        return '/onboarding/invite-team';
      case 'complete':
        return '/onboarding/complete';
      default:
        // If no tenant, start from create-business
        // If has tenant, continue with setup
        return hasTenant ? '/onboarding/setup' : '/onboarding/create-business';
    }
  }

  // User has completed onboarding
  // NOTE: We use /app/dashboard instead of /app due to OpenNext routing bug
  if (hasTenant) {
    return fallback;
  }

  // Fallback: No tenant but doesn't require onboarding (edge case)
  return '/onboarding/create-business';
}

/**
 * Prevents authenticated users from accessing guest-only pages
 * Redirects to app or onboarding based on user state
 *
 * SPA OPTIMIZATION: Uses hasInitialized to prevent splash screen from
 * appearing after the initial auth check is complete. Once initialized,
 * we show children immediately while redirect happens in background.
 */
export function GuestGuard({ children, redirectTo }: GuestGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hasInitialized, onboarding } = useAuthContext();

  React.useEffect(() => {
    // Only redirect after initial check is complete
    if (hasInitialized && isAuthenticated) {
      // Compute the correct redirect based on onboarding state
      const destination = redirectTo || getOnboardingAwareRedirect(
        onboarding,
        user?.tenantId,
        '/app/dashboard'
      );

      console.log('[GuestGuard] Authenticated user detected, redirecting to:', destination);
      router.push(destination);
    }
  }, [hasInitialized, isAuthenticated, onboarding, user?.tenantId, redirectTo, router]);

  // FIRST LOAD ONLY: Show splash screen during initial auth check
  // After hasInitialized is true, never show splash again
  if (!hasInitialized && isLoading) {
    return <SplashScreen message="Verificando sesion..." variant="branded" />;
  }

  // After initialization, if authenticated, wait for redirect (don't flash content)
  if (hasInitialized && isAuthenticated) {
    return null;
  }

  // User is not authenticated, show the guest content (login/register forms)
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
