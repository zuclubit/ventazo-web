// ============================================
// Cookie Manager for Auth Tokens
// Client-side cookie operations for auth persistence
// With cross-tab synchronization support
// ============================================

// Cookie names (must match middleware.ts)
export const ACCESS_TOKEN_COOKIE = 'zcrm_access_token';
export const REFRESH_TOKEN_COOKIE = 'zcrm_refresh_token';

// Storage key for cross-tab sync
const LOGOUT_SYNC_KEY = 'zcrm_logout_event';
const AUTH_SYNC_KEY = 'zcrm_auth_event';

// Event types for cross-tab communication
export type AuthSyncEvent = 'logout' | 'login' | 'refresh';

// Callback type for auth change listeners
type AuthChangeCallback = (event: AuthSyncEvent) => void;

// Store callbacks
let authChangeCallbacks: AuthChangeCallback[] = [];

/**
 * Set a cookie with the given options
 */
function setCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    path?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  const {
    maxAge = 3600,
    path = '/',
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'lax',
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookieString += `; path=${path}`;
  cookieString += `; max-age=${maxAge}`;
  cookieString += `; samesite=${sameSite}`;

  if (secure) {
    cookieString += '; secure';
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === encodeURIComponent(name)) {
      return decodeURIComponent(cookieValue || '');
    }
  }
  return null;
}

/**
 * Delete a cookie
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`;
}

/**
 * Store auth tokens in cookies
 */
export function setAuthCookies(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): void {
  if (typeof document === 'undefined') return;

  // Access token - shorter lived (1 hour)
  setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    maxAge: tokens.expiresIn || 3600,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Refresh token - longer lived (7 days)
  setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  // Notify other tabs about login/refresh
  broadcastAuthEvent('login');
}

/**
 * Get auth tokens from cookies
 */
export function getAuthCookies(): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  return {
    accessToken: getCookie(ACCESS_TOKEN_COOKIE),
    refreshToken: getCookie(REFRESH_TOKEN_COOKIE),
  };
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(): void {
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);

  // Notify other tabs about logout
  broadcastAuthEvent('logout');
}

/**
 * Check if auth cookies exist
 */
export function hasAuthCookies(): boolean {
  const { accessToken, refreshToken } = getAuthCookies();
  return !!(accessToken || refreshToken);
}

// ============================================
// Cross-Tab Synchronization
// ============================================

/**
 * Broadcast auth event to other tabs using localStorage
 */
function broadcastAuthEvent(event: AuthSyncEvent): void {
  if (typeof localStorage === 'undefined') return;

  try {
    // Use timestamp to ensure event is always "new" even for same event type
    const eventData = JSON.stringify({
      event,
      timestamp: Date.now(),
    });

    localStorage.setItem(AUTH_SYNC_KEY, eventData);

    // Clean up immediately (we only need the event to trigger)
    // This is a common pattern for cross-tab communication
    setTimeout(() => {
      localStorage.removeItem(AUTH_SYNC_KEY);
    }, 100);
  } catch (error) {
    // localStorage might not be available in some contexts
    console.warn('[CookieManager] Failed to broadcast auth event:', error);
  }
}

/**
 * Subscribe to auth changes across tabs
 * Returns an unsubscribe function
 */
export function subscribeToAuthChanges(callback: AuthChangeCallback): () => void {
  authChangeCallbacks.push(callback);

  // Return unsubscribe function
  return () => {
    authChangeCallbacks = authChangeCallbacks.filter((cb) => cb !== callback);
  };
}

/**
 * Initialize cross-tab sync listener
 * Call this once when the app initializes
 */
export function initCrossTabSync(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorageChange = (event: StorageEvent) => {
    // Only respond to our auth sync key
    if (event.key !== AUTH_SYNC_KEY || !event.newValue) {
      return;
    }

    try {
      const { event: authEvent } = JSON.parse(event.newValue) as { event: AuthSyncEvent; timestamp: number };

      // Notify all subscribers
      authChangeCallbacks.forEach((callback) => {
        try {
          callback(authEvent);
        } catch (error) {
          console.error('[CookieManager] Error in auth change callback:', error);
        }
      });
    } catch (error) {
      console.warn('[CookieManager] Failed to parse auth sync event:', error);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

// ============================================
// Token Validation Helpers
// ============================================

/**
 * Parse JWT payload (without validation)
 * Used for reading expiry and other claims
 */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    if (!payload) return null;
    // Handle URL-safe base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * Includes a buffer of 30 seconds
 */
export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return now >= (payload['exp'] - bufferSeconds);
}

/**
 * Get token expiry timestamp
 */
export function getTokenExpiry(token: string): number | null {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload['exp'] !== 'number') {
    return null;
  }
  return payload['exp'];
}
