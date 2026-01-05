// ============================================
// Store Exports - FASE 2
// ============================================

// Auth Store
export {
  useAuthStore,
  useUser,
  useIsAuthenticated,
  useIsAuthLoading,
  useIsAuthInitialized,
  useAuthError,
  useCurrentTenantId,
  useTenants,
  useAccessToken,
  useHasPermission,
  useHasAnyPermission,
  useIsAtLeastRole,
} from './auth.store';

// Tenant Store
export {
  useTenantStore,
  useCurrentTenant,
  useTenantSettings,
  useTenantFeatures,
  useHasFeature,
  useCurrency,
  useLocale,
  useTimezone,
  useCachedBranding,
  type TenantSettings,
  type TenantFeatures,
} from './tenant.store';

// UI Store
export {
  useUIStore,
  useSidebar,
  useIsSidebarCollapsed,
  useTheme,
  useIsCommandPaletteOpen,
  useToasts,
  useIsMobileMenuOpen,
  useToast,
  type Theme,
  type Toast,
} from './ui.store';
