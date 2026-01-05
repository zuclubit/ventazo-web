// ============================================
// Token Manager - FASE 2
// Secure token storage and management
// NEVER stores tokens in localStorage for security
// Uses in-memory storage + secure refresh mechanism
// ============================================

import type { AuthTokens } from './types';

// In-memory token storage (secure - cleared on page reload)
let accessToken: string | null = null;
let refreshToken: string | null = null;
let expiresAt: number | null = null;

// Token refresh callback
let refreshCallback: (() => Promise<AuthTokens | null>) | null = null;

// Refresh lock to prevent concurrent refreshes
let isRefreshing = false;
let refreshPromise: Promise<AuthTokens | null> | null = null;

// Buffer time before expiry to trigger refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Set tokens in memory
 */
export function setTokens(tokens: AuthTokens | null): void {
  if (tokens) {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    expiresAt = tokens.expiresAt;
  } else {
    clearTokens();
  }
}

/**
 * Get current access token
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Get current refresh token
 */
export function getRefreshToken(): string | null {
  return refreshToken;
}

/**
 * Get all tokens (for refresh callback)
 */
export function getTokens(): { accessToken: string; refreshToken: string; expiresAt: number; expiresIn: number } | null {
  if (!accessToken || !refreshToken || !expiresAt) return null;
  return {
    accessToken,
    refreshToken,
    expiresAt,
    expiresIn: expiresAt - Math.floor(Date.now() / 1000),
  };
}

/**
 * Clear all tokens from memory
 */
export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  expiresAt = null;
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(): boolean {
  if (!expiresAt) return true;
  return Date.now() >= expiresAt * 1000 - REFRESH_BUFFER_MS;
}

/**
 * Check if we have valid tokens
 */
export function hasValidTokens(): boolean {
  return !!accessToken && !isTokenExpired();
}

/**
 * Set the refresh callback function
 */
export function setRefreshCallback(
  callback: (() => Promise<AuthTokens | null>) | null
): void {
  refreshCallback = callback;
}

/**
 * Attempt to refresh the access token
 * Uses lock to prevent concurrent refreshes
 */
export async function refreshAccessToken(): Promise<AuthTokens | null> {
  // If already refreshing, wait for existing refresh
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Check if we have a refresh callback
  if (!refreshCallback) {
    console.warn('No refresh callback set');
    return null;
  }

  // Check if we have a refresh token
  if (!refreshToken) {
    console.warn('No refresh token available');
    return null;
  }

  // Start refresh
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const tokens = await refreshCallback();
      if (tokens) {
        setTokens(tokens);
        return tokens;
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(): Promise<string | null> {
  // If token is valid, return it
  if (hasValidTokens()) {
    return accessToken;
  }

  // Try to refresh
  const tokens = await refreshAccessToken();
  return tokens?.accessToken ?? null;
}

/**
 * Parse JWT to extract payload (without verification)
 * Only for reading claims - NEVER trust for security decisions
 */
export function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Get token expiry time from JWT
 */
export function getTokenExpiry(token: string): number | null {
  const payload = parseJwt(token);
  if (!payload || typeof payload['exp'] !== 'number') return null;
  return payload['exp'];
}
