/**
 * K6 Authentication Utilities
 * Handles login, token management, and authenticated requests
 */

import http from 'k6/http';
import { check, fail } from 'k6';
import { getEnv, endpoints, testUsers } from '../config/environments.js';

// Token storage (per VU)
let accessToken = null;
let refreshToken = null;
let tenantId = null;

/**
 * Perform login and store tokens
 */
export function login(userIndex = 0) {
  const env = getEnv();
  const user = testUsers[userIndex % testUsers.length];

  const payload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'login' },
  };

  const response = http.post(
    `${env.baseUrl}${endpoints.login}`,
    payload,
    params
  );

  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'login has access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken || body.access_token;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    console.error(`Login failed: ${response.status} - ${response.body}`);
    fail('Login failed');
  }

  try {
    const body = JSON.parse(response.body);
    accessToken = body.accessToken || body.access_token;
    refreshToken = body.refreshToken || body.refresh_token;
    tenantId = body.tenantId || body.tenant_id || env.tenantId;
  } catch (e) {
    fail(`Failed to parse login response: ${e}`);
  }

  return response;
}

/**
 * Refresh access token
 */
export function refreshAccessToken() {
  const env = getEnv();

  if (!refreshToken) {
    fail('No refresh token available');
  }

  const payload = JSON.stringify({
    refreshToken: refreshToken,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { endpoint: 'refresh' },
  };

  const response = http.post(
    `${env.baseUrl}${endpoints.refresh}`,
    payload,
    params
  );

  const success = check(response, {
    'refresh successful': (r) => r.status === 200,
  });

  if (success) {
    try {
      const body = JSON.parse(response.body);
      accessToken = body.accessToken || body.access_token;
      if (body.refreshToken || body.refresh_token) {
        refreshToken = body.refreshToken || body.refresh_token;
      }
    } catch (e) {
      console.error(`Failed to parse refresh response: ${e}`);
    }
  }

  return response;
}

/**
 * Get current auth headers
 */
export function getAuthHeaders() {
  const env = getEnv();
  return {
    Authorization: `Bearer ${accessToken}`,
    'x-tenant-id': tenantId || env.tenantId,
    'Content-Type': 'application/json',
  };
}

/**
 * Make authenticated GET request
 */
export function authGet(path, params = {}) {
  const env = getEnv();
  const url = `${env.baseUrl}${path}`;

  const requestParams = {
    headers: {
      ...getAuthHeaders(),
      ...(params.headers || {}),
    },
    tags: params.tags || {},
  };

  return http.get(url, requestParams);
}

/**
 * Make authenticated POST request
 */
export function authPost(path, body, params = {}) {
  const env = getEnv();
  const url = `${env.baseUrl}${path}`;

  const requestParams = {
    headers: {
      ...getAuthHeaders(),
      ...(params.headers || {}),
    },
    tags: params.tags || {},
  };

  const payload = typeof body === 'string' ? body : JSON.stringify(body);

  return http.post(url, payload, requestParams);
}

/**
 * Make authenticated PUT request
 */
export function authPut(path, body, params = {}) {
  const env = getEnv();
  const url = `${env.baseUrl}${path}`;

  const requestParams = {
    headers: {
      ...getAuthHeaders(),
      ...(params.headers || {}),
    },
    tags: params.tags || {},
  };

  const payload = typeof body === 'string' ? body : JSON.stringify(body);

  return http.put(url, payload, requestParams);
}

/**
 * Make authenticated DELETE request
 */
export function authDelete(path, params = {}) {
  const env = getEnv();
  const url = `${env.baseUrl}${path}`;

  const requestParams = {
    headers: {
      ...getAuthHeaders(),
      ...(params.headers || {}),
    },
    tags: params.tags || {},
  };

  return http.del(url, null, requestParams);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return accessToken !== null;
}

/**
 * Clear authentication state
 */
export function clearAuth() {
  accessToken = null;
  refreshToken = null;
  tenantId = null;
}

/**
 * Get current tenant ID
 */
export function getTenantId() {
  return tenantId;
}

/**
 * Get access token (for debugging)
 */
export function getAccessToken() {
  return accessToken;
}
