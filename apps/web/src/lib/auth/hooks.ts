// ============================================
// Auth Hooks - FASE 5.10
// React hooks for authentication state
// ============================================

'use client';

import * as React from 'react';

import { useRouter, usePathname } from 'next/navigation';

import { useAuthStore, useTenantStore } from '@/store';

import type { Permission, UserRole } from './types';

// ============================================
// useSession Hook
// ============================================

export interface SessionData {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  tokens: ReturnType<typeof useAuthStore.getState>['tokens'];
  tenants: ReturnType<typeof useAuthStore.getState>['tenants'];
  currentTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

/**
 * Hook to get current session data
 */
export function useSession(): SessionData {
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const tenants = useAuthStore((state) => state.tenants);
  const currentTenantId = useAuthStore((state) => state.currentTenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  return {
    user,
    tokens,
    tenants,
    currentTenantId,
    isAuthenticated,
    isLoading,
    isInitialized,
  };
}

// ============================================
// useCurrentUser Hook
// ============================================

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  permissions: Permission[];
  tenantId: string;
  tenantName?: string;
}

/**
 * Hook to get current user data
 * Returns null if not authenticated
 */
export function useCurrentUser(): CurrentUser | null {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
    permissions: user.permissions,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
  };
}

// ============================================
// useAuth Hook - Combined Auth Operations
// ============================================

export interface AuthActions {
  login: (email: string, password: string, tenantId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

/**
 * Hook for authentication actions
 */
export function useAuth(): SessionData & AuthActions {
  const session = useSession();
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const switchTenant = useAuthStore((state) => state.switchTenant);
  const initialize = useAuthStore((state) => state.initialize);

  const refreshSession = React.useCallback(async () => {
    await initialize();
  }, [initialize]);

  return {
    ...session,
    login,
    logout,
    switchTenant,
    refreshSession,
  };
}

// ============================================
// useRequireAuth Hook
// ============================================

interface UseRequireAuthOptions {
  redirectTo?: string;
  requiredRole?: UserRole;
  requiredPermission?: Permission;
}

/**
 * Hook that requires authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(options: UseRequireAuthOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized, user } = useSession();
  const { redirectTo = '/login' } = options;

  React.useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      const loginUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
    }
  }, [isInitialized, isAuthenticated, pathname, router, redirectTo]);

  // Check role requirement
  const hasRequiredRole = React.useMemo(() => {
    if (!options.requiredRole || !user) return true;
    const roleHierarchy: UserRole[] = ['viewer', 'sales_rep', 'manager', 'admin', 'owner'];
    const userLevel = roleHierarchy.indexOf(user.role);
    const requiredLevel = roleHierarchy.indexOf(options.requiredRole);
    return userLevel >= requiredLevel;
  }, [options.requiredRole, user]);

  // Check permission requirement
  const hasRequiredPermission = React.useMemo(() => {
    if (!options.requiredPermission || !user) return true;
    return user.permissions.includes(options.requiredPermission);
  }, [options.requiredPermission, user]);

  return {
    isLoading: !isInitialized,
    isAuthorized: isAuthenticated && hasRequiredRole && hasRequiredPermission,
    user,
  };
}

// ============================================
// useTenantContext Hook
// ============================================

/**
 * Hook to get tenant context with safe defaults
 */
export function useTenantContext() {
  const currentTenantId = useAuthStore((state) => state.currentTenantId);
  const tenants = useAuthStore((state) => state.tenants);
  const switchTenant = useAuthStore((state) => state.switchTenant);
  const tenant = useTenantStore((state) => state.currentTenant);
  const settings = useTenantStore((state) => state.settings);
  const hasFeature = useTenantStore((state) => state.hasFeature);

  const currentTenant = React.useMemo(() => {
    return tenants.find((t) => t.tenantId === currentTenantId)?.tenant ?? null;
  }, [tenants, currentTenantId]);

  return {
    tenant: tenant ?? currentTenant,
    tenantId: currentTenantId,
    tenants,
    settings,
    hasFeature,
    switchTenant,
    isMultiTenant: tenants.length > 1,
  };
}

// ============================================
// useAuthStatus Hook
// ============================================

/**
 * Simple hook for auth status checks
 */
export function useAuthStatus() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  return {
    isAuthenticated,
    isInitialized,
    isLoading,
    error,
    isReady: isInitialized && !isLoading,
  };
}

// ============================================
// useLogout Hook
// ============================================

/**
 * Hook for logout with redirect
 */
export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const clearTenant = useTenantStore((state) => state.clearTenant);

  const handleLogout = React.useCallback(
    async (redirectTo = '/login') => {
      await logout();
      clearTenant();
      router.push(redirectTo);
    },
    [logout, clearTenant, router]
  );

  return handleLogout;
}

// ============================================
// useAccessToken Hook
// ============================================

/**
 * Hook to get current access token
 */
export function useAccessToken(): string | null {
  return useAuthStore((state) => state.tokens?.accessToken ?? null);
}

// ============================================
// useRefreshToken Hook
// ============================================

/**
 * Hook to handle token refresh
 */
export function useTokenRefresh() {
  const tokens = useAuthStore((state) => state.tokens);
  const initialize = useAuthStore((state) => state.initialize);

  const needsRefresh = React.useMemo(() => {
    if (!tokens) return false;
    // Refresh if token expires in less than 5 minutes
    const fiveMinutes = 5 * 60;
    return tokens.expiresAt - Math.floor(Date.now() / 1000) < fiveMinutes;
  }, [tokens]);

  const refresh = React.useCallback(async () => {
    await initialize();
  }, [initialize]);

  return {
    needsRefresh,
    refresh,
    expiresAt: tokens?.expiresAt,
  };
}
