// ============================================
// API Client - Secure BFF Architecture
// All requests proxied through Next.js API routes
// Tokens handled server-side (never exposed to client)
// ============================================

import { type z } from 'zod';

// ============================================
// Configuration
// ============================================

// Use local proxy for all API calls (BFF pattern)
// The proxy handles authentication and forwards to backend
const API_PROXY_URL = '/api/proxy';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_STATUS_CODES = [408, 500, 502, 503, 504];

// ============================================
// Error Types
// ============================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
    public code?: string
  ) {
    super(ApiError.formatMessage(status, statusText, data));
    this.name = 'ApiError';
  }

  static formatMessage(
    status: number,
    statusText: string,
    data?: unknown
  ): string {
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message: unknown }).message);
    }
    return `API Error: ${status} ${statusText}`;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isRetryable(): boolean {
    return RETRY_STATUS_CODES.includes(this.status);
  }
}

export class NetworkError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = cause;
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================
// Types
// ============================================

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  tenantId?: string;
  skipAuth?: boolean;
  skipTenant?: boolean;
  retries?: number;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Request interceptor type
type RequestInterceptor = (
  url: string,
  config: RequestInit
) => Promise<{ url: string; config: RequestInit }>;

// Response interceptor type
type ResponseInterceptor = (response: Response) => Promise<Response>;

// Error interceptor type
type ErrorInterceptor = (error: ApiError) => Promise<void>;

// ============================================
// Helpers
// ============================================

/**
 * Build URL with query parameters
 * Routes all requests through the BFF proxy
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  // Remove leading slash from endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Build proxy URL - use relative URL for SSR compatibility
  const fullUrl = `${API_PROXY_URL}/${cleanEndpoint}`;

  // For client-side, we can use URL with origin
  // For SSR, we need to handle differently
  if (typeof window !== 'undefined') {
    const url = new URL(fullUrl, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  // For SSR, just return the path with query string
  let result = fullUrl;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      result += `?${queryString}`;
    }
  }
  return result;
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  return Math.min(RETRY_DELAY_MS * Math.pow(2, attempt), 30000);
}

// ============================================
// Interceptors Storage
// ============================================

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

// ============================================
// Add Interceptors
// ============================================

export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor);
}

export function addErrorInterceptor(interceptor: ErrorInterceptor): void {
  errorInterceptors.push(interceptor);
}

// ============================================
// Default Error Interceptor (401 handling)
// ============================================

// Flag to prevent redirect loops
let isRedirecting = false;

addErrorInterceptor(async (error) => {
  if (error.isUnauthorized && !isRedirecting) {
    isRedirecting = true;

    // Redirect to login if in browser
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;

      // Clear the session cookie via API route before redirecting
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore errors - we'll redirect anyway
      }

      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&error=session_expired`;
    }

    // Reset flag after a delay
    setTimeout(() => {
      isRedirecting = false;
    }, 5000);
  }
});

// ============================================
// Tenant ID Getter (for request interceptor)
// ============================================

let getTenantIdFromStore: (() => string | null) | null = null;

/**
 * Register the tenant store getter for the request interceptor.
 * Called from providers.tsx on app initialization.
 */
export function registerTenantGetter(getter: () => string | null): void {
  getTenantIdFromStore = getter;
}

// ============================================
// Core Fetch Function
// ============================================

async function fetchWithInterceptors<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    params,
    tenantId,
    skipAuth = false,
    skipTenant = false,
    retries = MAX_RETRIES,
    timeout = 30000,
    headers: customHeaders,
    ...fetchConfig
  } = config;

  let url = buildUrl(endpoint, params);

  // Build headers - simplified since proxy handles auth
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Add tenant header if specified (proxy will use it or fall back to session)
  if (!skipTenant && tenantId) {
    headers['x-tenant-id'] = tenantId;
  } else if (!skipTenant && getTenantIdFromStore) {
    const storeTenantId = getTenantIdFromStore();
    if (storeTenantId) {
      headers['x-tenant-id'] = storeTenantId;
    }
  }

  let requestConfig: RequestInit = {
    ...fetchConfig,
    headers,
    credentials: 'include', // Important: include cookies for session
  };

  // Run request interceptors
  for (const interceptor of requestInterceptors) {
    const result = await interceptor(url, requestConfig);
    url = result.url;
    requestConfig = result.config;
  }

  // Retry logic
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Run response interceptors
      let processedResponse = response;
      for (const interceptor of responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      // Handle non-2xx responses
      if (!processedResponse.ok) {
        let errorData: unknown;
        try {
          errorData = await processedResponse.json();
        } catch {
          try {
            errorData = await processedResponse.text();
          } catch {
            errorData = undefined;
          }
        }

        const apiError = new ApiError(
          processedResponse.status,
          processedResponse.statusText,
          errorData,
          typeof errorData === 'object' && errorData && 'code' in errorData
            ? String((errorData as { code: unknown }).code)
            : undefined
        );

        // Run error interceptors
        for (const interceptor of errorInterceptors) {
          await interceptor(apiError);
        }

        // Retry if retryable
        if (apiError.isRetryable && attempt < retries) {
          const delay = getBackoffDelay(attempt);
          console.warn(
            `Request failed with ${processedResponse.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
          );
          await sleep(delay);
          continue;
        }

        throw apiError;
      }

      // Handle empty responses
      if (processedResponse.status === 204) {
        return {} as T;
      }

      // Parse JSON response
      const data = await processedResponse.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort/timeout
      if (lastError.name === 'AbortError') {
        throw new NetworkError('Request timeout', lastError);
      }

      // Retry on network errors
      if (attempt < retries) {
        const delay = getBackoffDelay(attempt);
        console.warn(
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw new NetworkError('Network request failed after retries', lastError ?? undefined);
}

// ============================================
// API Client Factory
// ============================================

export interface ApiClientInstance {
  get: <T>(endpoint: string, config?: RequestConfig) => Promise<T>;
  getBlob: (endpoint: string, config?: RequestConfig) => Promise<Blob>;
  post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  postBlob: (endpoint: string, data?: unknown, config?: RequestConfig) => Promise<Blob>;
  put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  patch: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  delete: <T>(endpoint: string, config?: RequestConfig) => Promise<T>;
}

export function createApiClient(defaultTenantId?: string): ApiClientInstance {
  const getTenantId = (config?: RequestConfig): string | undefined => {
    return config?.tenantId ?? defaultTenantId;
  };

  return {
    get: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'GET',
        tenantId: getTenantId(config),
      }),

    getBlob: async (endpoint: string, config?: RequestConfig): Promise<Blob> => {
      const {
        params,
        tenantId,
        skipTenant = false,
        timeout = 60000, // Longer timeout for PDF generation
        headers: customHeaders,
        ...fetchConfig
      } = config || {};

      const url = buildUrl(endpoint, params);
      const headers: Record<string, string> = {
        Accept: 'application/pdf,application/octet-stream,*/*',
        ...(customHeaders as Record<string, string>),
      };

      // Add tenant header
      const resolvedTenantId = tenantId ?? defaultTenantId;
      if (!skipTenant && resolvedTenantId) {
        headers['x-tenant-id'] = resolvedTenantId;
      } else if (!skipTenant && getTenantIdFromStore) {
        const storeTenantId = getTenantIdFromStore();
        if (storeTenantId) {
          headers['x-tenant-id'] = storeTenantId;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchConfig,
          method: 'GET',
          headers,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData: unknown;
          try {
            errorData = await response.json();
          } catch {
            errorData = await response.text().catch(() => undefined);
          }
          throw new ApiError(response.status, response.statusText, errorData);
        }

        return await response.blob();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof ApiError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Request timeout', error);
        }
        throw new NetworkError('Failed to fetch blob', error instanceof Error ? error : undefined);
      }
    },

    post: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    postBlob: async (
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<Blob> => {
      const {
        params,
        tenantId,
        skipTenant = false,
        timeout = 60000, // Longer timeout for PDF generation
        headers: customHeaders,
        ...fetchConfig
      } = config || {};

      const url = buildUrl(endpoint, params);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/pdf,application/octet-stream,*/*',
        ...(customHeaders as Record<string, string>),
      };

      // Add tenant header
      const resolvedTenantId = tenantId ?? defaultTenantId;
      if (!skipTenant && resolvedTenantId) {
        headers['x-tenant-id'] = resolvedTenantId;
      } else if (!skipTenant && getTenantIdFromStore) {
        const storeTenantId = getTenantIdFromStore();
        if (storeTenantId) {
          headers['x-tenant-id'] = storeTenantId;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchConfig,
          method: 'POST',
          headers,
          body: data ? JSON.stringify(data) : undefined,
          credentials: 'include',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData: unknown;
          try {
            errorData = await response.json();
          } catch {
            errorData = await response.text().catch(() => undefined);
          }
          throw new ApiError(response.status, response.statusText, errorData);
        }

        return await response.blob();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof ApiError) throw error;
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Request timeout', error);
        }
        throw new NetworkError('Failed to fetch blob', error instanceof Error ? error : undefined);
      }
    },

    put: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    patch: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    delete: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'DELETE',
        tenantId: getTenantId(config),
      }),
  };
}

// ============================================
// Default Client Instance
// ============================================

export const apiClient = createApiClient();

// ============================================
// Query Keys Factory
// ============================================

export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    tenants: ['auth', 'tenants'] as const,
    session: ['auth', 'session'] as const,
  },
  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    stats: () => [...queryKeys.leads.all, 'stats'] as const,
    activities: (id: string) =>
      [...queryKeys.leads.detail(id), 'activities'] as const,
  },
  // Opportunities
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.opportunities.lists(), filters] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.opportunities.details(), id] as const,
  },
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    lists: () => [...queryKeys.pipelines.all, 'list'] as const,
    details: () => [...queryKeys.pipelines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pipelines.details(), id] as const,
    stages: (id: string) =>
      [...queryKeys.pipelines.detail(id), 'stages'] as const,
  },
  // Teams
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    details: () => [...queryKeys.teams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.teams.details(), id] as const,
    members: (id: string) =>
      [...queryKeys.teams.detail(id), 'members'] as const,
  },
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
  },
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    reports: () => [...queryKeys.analytics.all, 'reports'] as const,
    report: (id: string) => [...queryKeys.analytics.reports(), id] as const,
  },
} as const;

// ============================================
// Exports
// ============================================

// Legacy export for backwards compatibility
export const API_BASE_URL = API_PROXY_URL;

// For direct backend access (use only in server components/actions)
export const BACKEND_URL = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
