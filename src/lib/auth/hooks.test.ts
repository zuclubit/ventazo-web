// ============================================
// Auth Hooks Tests - FASE 5.11
// Unit tests for authentication hooks
// ============================================

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock user type
interface MockUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
  tenantId: string;
  avatarUrl?: string;
}

// Mock tokens type
interface MockTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Mock zustand stores
const mockAuthStore: {
  user: MockUser | null;
  tokens: MockTokens | null;
  tenants: unknown[];
  currentTenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  switchTenant: ReturnType<typeof vi.fn>;
  initialize: ReturnType<typeof vi.fn>;
} = {
  user: null,
  tokens: null,
  tenants: [],
  currentTenantId: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: true,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  switchTenant: vi.fn(),
  initialize: vi.fn(),
};

vi.mock('@/store', () => ({
  useAuthStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockAuthStore);
    }
    return mockAuthStore;
  }),
  useTenantStore: vi.fn((selector) => {
    const tenantStore = {
      currentTenant: null,
      settings: {},
      hasFeature: vi.fn(() => false),
      clearTenant: vi.fn(),
    };
    if (typeof selector === 'function') {
      return selector(tenantStore);
    }
    return tenantStore;
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/app/dashboard',
}));

// Import hooks after mocks
import {
  useSession,
  useCurrentUser,
  useAuthStatus,
  useAccessToken,
} from './hooks';

describe('Auth Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSession', () => {
    it('returns session data from store', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current).toEqual({
        user: null,
        tokens: null,
        tenants: [],
        currentTenantId: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    });

    it('returns authenticated session when user exists', () => {
      mockAuthStore.user = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'admin',
        permissions: ['LEAD_READ'],
        tenantId: 'tenant-1',
      };
      mockAuthStore.isAuthenticated = true;

      const { result } = renderHook(() => useSession());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('useCurrentUser', () => {
    it('returns null when not authenticated', () => {
      mockAuthStore.user = null;

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current).toBeNull();
    });

    it('returns user data when authenticated', () => {
      mockAuthStore.user = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'admin',
        permissions: ['LEAD_READ', 'LEAD_CREATE'],
        tenantId: 'tenant-1',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const { result } = renderHook(() => useCurrentUser());

      expect(result.current).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'admin',
        permissions: ['LEAD_READ', 'LEAD_CREATE'],
        tenantId: 'tenant-1',
        avatarUrl: 'https://example.com/avatar.jpg',
        tenantName: undefined,
      });
    });
  });

  describe('useAuthStatus', () => {
    it('returns correct auth status', () => {
      mockAuthStore.isAuthenticated = true;
      mockAuthStore.isInitialized = true;
      mockAuthStore.isLoading = false;
      mockAuthStore.error = null;

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current).toEqual({
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
        error: null,
        isReady: true,
      });
    });

    it('returns not ready when loading', () => {
      mockAuthStore.isLoading = true;
      mockAuthStore.isInitialized = true;

      const { result } = renderHook(() => useAuthStatus());

      expect(result.current.isReady).toBe(false);
    });
  });

  describe('useAccessToken', () => {
    it('returns null when no tokens', () => {
      mockAuthStore.tokens = null;

      const { result } = renderHook(() => useAccessToken());

      expect(result.current).toBeNull();
    });

    it('returns access token when available', () => {
      mockAuthStore.tokens = {
        accessToken: 'test-token-123',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() / 1000 + 3600,
      };

      const { result } = renderHook(() => useAccessToken());

      expect(result.current).toBe('test-token-123');
    });
  });
});
