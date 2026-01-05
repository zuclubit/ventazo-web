// ============================================
// Auth Store - FASE 2
// Zustand store for authentication state
// ============================================

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  type AuthUser,
  type AuthTokens,
  type TenantMembership,
  type Permission,
  type UserRole,
  ROLE_HIERARCHY,
  login as authLogin,
  logout as authLogout,
  restoreSession,
  switchTenant as authSwitchTenant,
} from '@/lib/auth';

// ============================================
// Types
// ============================================

interface AuthState {
  // State
  user: AuthUser | null;
  tokens: AuthTokens | null;
  tenants: TenantMembership[];
  currentTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  login: (
    email: string,
    password: string,
    tenantId?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: (tenantId?: string) => Promise<void>;
  switchTenant: (tenantId: string) => Promise<boolean>;
  clearError: () => void;

  // Permission helpers
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (role: UserRole) => boolean;
  isAtLeastRole: (role: UserRole) => boolean;
}

// ============================================
// Store
// ============================================

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    // Initial state
    user: null,
    tokens: null,
    tenants: [],
    currentTenantId: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: false,
    error: null,

    // ============================================
    // Actions
    // ============================================

    /**
     * Login with email/password
     */
    login: async (email, password, tenantId) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const result = await authLogin({ email, password }, tenantId);

        set((state) => {
          state.user = result.user;
          state.tokens = result.tokens;
          state.tenants = result.tenants;
          state.currentTenantId = result.user.tenantId;
          state.isAuthenticated = true;
          state.isLoading = false;
          state.error = null;
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Login failed';

        set((state) => {
          state.user = null;
          state.tokens = null;
          state.tenants = [];
          state.currentTenantId = null;
          state.isAuthenticated = false;
          state.isLoading = false;
          state.error = message;
        });

        return false;
      }
    },

    /**
     * Logout
     */
    logout: async () => {
      set((state) => {
        state.isLoading = true;
      });

      try {
        await authLogout();
      } finally {
        set((state) => {
          state.user = null;
          state.tokens = null;
          state.tenants = [];
          state.currentTenantId = null;
          state.isAuthenticated = false;
          state.isLoading = false;
          state.error = null;
        });
      }
    },

    /**
     * Initialize auth state (restore session)
     */
    initialize: async (tenantId) => {
      // Skip if already initialized
      if (get().isInitialized) return;

      set((state) => {
        state.isLoading = true;
      });

      try {
        const result = await restoreSession(tenantId);

        if (result) {
          set((state) => {
            state.user = result.user;
            state.tokens = result.tokens;
            state.tenants = result.tenants;
            state.currentTenantId = result.user.tenantId;
            state.isAuthenticated = true;
          });
        }
      } catch (error) {
        console.warn('Auth initialization failed:', error);
      } finally {
        set((state) => {
          state.isLoading = false;
          state.isInitialized = true;
        });
      }
    },

    /**
     * Switch to a different tenant
     */
    switchTenant: async (tenantId) => {
      const { tokens, tenants } = get();

      // Verify user has access to this tenant
      const membership = tenants.find((t) => t.tenantId === tenantId);
      if (!membership || !membership.isActive) {
        set((state) => {
          state.error = 'No access to this tenant';
        });
        return false;
      }

      if (!tokens?.accessToken) {
        set((state) => {
          state.error = 'Not authenticated';
        });
        return false;
      }

      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const user = await authSwitchTenant(tenantId, tokens.accessToken);

        set((state) => {
          state.user = user;
          state.currentTenantId = tenantId;
          state.isLoading = false;
        });

        return true;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to switch tenant';

        set((state) => {
          state.isLoading = false;
          state.error = message;
        });

        return false;
      }
    },

    /**
     * Clear error
     */
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    // ============================================
    // Permission Helpers
    // ============================================

    /**
     * Check if user has a specific permission
     */
    hasPermission: (permission) => {
      const { user } = get();
      if (!user) return false;
      return user.permissions.includes(permission);
    },

    /**
     * Check if user has any of the permissions
     */
    hasAnyPermission: (permissions) => {
      const { user } = get();
      if (!user) return false;
      return permissions.some((p) => user.permissions.includes(p));
    },

    /**
     * Check if user has all of the permissions
     */
    hasAllPermissions: (permissions) => {
      const { user } = get();
      if (!user) return false;
      return permissions.every((p) => user.permissions.includes(p));
    },

    /**
     * Check if user has a specific role
     */
    hasRole: (role) => {
      const { user } = get();
      if (!user) return false;
      return user.role === role;
    },

    /**
     * Check if user has at least the specified role level
     */
    isAtLeastRole: (minimumRole) => {
      const { user } = get();
      if (!user) return false;

      const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role);
      const minimumRoleIndex = ROLE_HIERARCHY.indexOf(minimumRole);

      return userRoleIndex >= minimumRoleIndex;
    },
  }))
);

// ============================================
// Selectors (for better performance)
// ============================================

export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.isAuthenticated);
export const useIsAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useIsAuthInitialized = () =>
  useAuthStore((state) => state.isInitialized);
export const useAuthError = () => useAuthStore((state) => state.error);
export const useCurrentTenantId = () =>
  useAuthStore((state) => state.currentTenantId);
export const useTenants = () => useAuthStore((state) => state.tenants);
export const useAccessToken = () =>
  useAuthStore((state) => state.tokens?.accessToken ?? null);

// Permission selectors
export const useHasPermission = (permission: Permission) =>
  useAuthStore((state) => state.hasPermission(permission));
export const useHasAnyPermission = (permissions: Permission[]) =>
  useAuthStore((state) => state.hasAnyPermission(permissions));
export const useIsAtLeastRole = (role: UserRole) =>
  useAuthStore((state) => state.isAtLeastRole(role));
