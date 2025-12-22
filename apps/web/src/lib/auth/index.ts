// ============================================
// Auth Module Exports - Backend Integration
// All authentication goes through the backend API
// ============================================

// Types
export * from './types';

// Token Manager
export {
  setTokens,
  getTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
  isTokenExpired,
  hasValidTokens,
  getValidAccessToken,
  parseJwt,
} from './token-manager';

// Cookie Manager
export {
  setAuthCookies,
  getAuthCookies,
  clearAuthCookies,
  hasAuthCookies,
  initCrossTabSync,
  subscribeToAuthChanges as subscribeToCrossTabAuth,
  parseJwtPayload,
  isTokenExpired as isCookieTokenExpired,
  getTokenExpiry,
} from './cookie-manager';
export type { AuthSyncEvent } from './cookie-manager';

// Auth Service (Backend API)
export {
  login,
  register,
  logout,
  restoreSession,
  switchTenant,
  subscribeToAuthChanges,
  requestPasswordReset,
  resendConfirmationEmail,
  updatePassword,
  fetchTenantDetails,
} from './auth-service';

// Auth Hooks
export {
  useSession,
  useCurrentUser,
  useAuth,
  useRequireAuth,
  useTenantContext,
  useAuthStatus,
  useLogout,
  useAccessToken,
  useTokenRefresh,
} from './hooks';
export type { SessionData, CurrentUser, AuthActions } from './hooks';

// RBAC
export * from './rbac';
export type { PermissionsResult, RBACGuardProps } from './rbac';
